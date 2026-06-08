// Enriches live hosts with org, location, open ports, and known CVEs.
// Reuses data already fetched by the ipinfo and internetdb modules — only fetches
// fresh data for IPs that weren't covered during the initial module run.

function buildIpInfoMap(moduleResults) {
  const map = {};
  let results = [];
  if (moduleResults.ipinfo && moduleResults.ipinfo.results) {
    results = moduleResults.ipinfo.results;
  }
  for (const ipResult of results) {
    map[ipResult.ip] = ipResult;
  }
  return map;
}

function buildInternetDbMap(moduleResults) {
  const map = {};
  let results = [];
  if (moduleResults.internetdb && moduleResults.internetdb.results) {
    results = moduleResults.internetdb.results;
  }
  for (const ipResult of results) {
    map[ipResult.ip] = ipResult;
  }
  return map;
}

function findUncoveredIPs(liveHosts, ipInfoMap, internetdbMap) {
  const covered = new Set([...Object.keys(ipInfoMap), ...Object.keys(internetdbMap)]);
  const seen = new Set();
  const uncovered = [];

  for (const host of liveHosts) {
    for (const ip of host.ips) {
      if (!covered.has(ip) && !seen.has(ip)) {
        seen.add(ip);
        uncovered.push(ip);
      }
    }
  }

  return uncovered;
}

async function fetchIpInfo(ip, ipInfoMap) {
  try {
    const res  = await fetch('https://ipinfo.io/' + ip + '/json');
    const json = await res.json();
    ipInfoMap[ip] = {
      ip:       ip,
      org:      json.org,
      city:     json.city,
      region:   json.region,
      country:  json.country,
      hostname: json.hostname
    };
  } catch (err) {
    // Best effort — leave the IP uncovered if the request fails
  }
}

async function fetchInternetDb(ip, internetdbMap) {
  try {
    const res  = await fetch('https://internetdb.shodan.io/' + ip);
    const json = await res.json();
    internetdbMap[ip] = {
      ip:    ip,
      ports: json.ports || [],
      vulns: json.vulns || []
    };
  } catch (err) {
    // Best effort — leave the IP uncovered if the request fails
  }
}

export async function enrich(liveHosts, moduleResults) {
  const ipInfoMap     = buildIpInfoMap(moduleResults);
  const internetdbMap = buildInternetDbMap(moduleResults);

  // Find IPs from live hosts that weren't already looked up during the module phase
  const uncoveredIPs = findUncoveredIPs(liveHosts, ipInfoMap, internetdbMap);

  // Fetch missing IPs from both sources in parallel
  const fetches = [];
  for (const ip of uncoveredIPs) {
    fetches.push(fetchIpInfo(ip, ipInfoMap));
    fetches.push(fetchInternetDb(ip, internetdbMap));
  }
  await Promise.allSettled(fetches);

  // Attach enrichment data to each live host
  const enrichedHosts = [];
  for (const host of liveHosts) {
    const enrichedIPs = [];
    for (const ip of host.ips) {
      const info = ipInfoMap[ip];
      const db   = internetdbMap[ip];

      let org     = null;
      let city    = null;
      let country = null;
      let ports   = [];
      let vulns   = [];

      if (info) {
        org     = info.org;
        city    = info.city;
        country = info.country;
      }
      if (db) {
        ports = db.ports;
        vulns = db.vulns;
      }

      enrichedIPs.push({ ip, org, city, country, ports, vulns });
    }
    enrichedHosts.push({ subdomain: host.subdomain, ips: enrichedIPs });
  }
  return enrichedHosts;
}
