// Enriches live hosts with org, location, open ports, and known CVEs.
// Reuses data already fetched by the ipinfo and internetdb modules — only fetches
// fresh data for IPs that weren't covered during the initial module run.
export async function enrich(liveHosts, moduleResults) {
  // Build lookup maps from existing module data to avoid redundant API calls
  const ipInfoMap = {};
  const ipinfoResults = (moduleResults.ipinfo && moduleResults.ipinfo.results) ? moduleResults.ipinfo.results : [];
  ipinfoResults.forEach(function (r) {
    ipInfoMap[r.ip] = r;
  });

  const internetdbMap = {};
  const internetdbResults = (moduleResults.internetdb && moduleResults.internetdb.results) ? moduleResults.internetdb.results : [];
  internetdbResults.forEach(function (r) {
    internetdbMap[r.ip] = r;
  });

  // Find IPs from live hosts that weren't already looked up during the module phase
  const covered = new Set([...Object.keys(ipInfoMap), ...Object.keys(internetdbMap)]);
  const allIPs = liveHosts.flatMap(function (h) { return h.ips; });
  const newIPs = [...new Set(allIPs.filter(function (ip) { return !covered.has(ip); }))];

  // Fetch missing IPs from both sources in parallel
  await Promise.allSettled(
    newIPs.flatMap(function (ip) {
      return [
        (async function () {
          try {
            const res = await fetch('https://ipinfo.io/' + ip + '/json');
            const j = await res.json();
            ipInfoMap[ip] = { ip: ip, org: j.org, city: j.city, region: j.region, country: j.country, hostname: j.hostname };
          } catch (err) {}
        })(),
        (async function () {
          try {
            const res = await fetch('https://internetdb.shodan.io/' + ip);
            const j = await res.json();
            internetdbMap[ip] = { ip: ip, ports: j.ports || [], vulns: j.vulns || [] };
          } catch (err) {}
        })()
      ];
    })
  );

  // Attach enrichment data to each live host
  return liveHosts.map(function (host) {
    return {
      subdomain: host.subdomain,
      ips: host.ips.map(function (ip) {
        return {
          ip: ip,
          org:     ipInfoMap[ip] ? ipInfoMap[ip].org     : null,
          city:    ipInfoMap[ip] ? ipInfoMap[ip].city    : null,
          country: ipInfoMap[ip] ? ipInfoMap[ip].country : null,
          ports:   internetdbMap[ip] ? internetdbMap[ip].ports : [],
          vulns:   internetdbMap[ip] ? internetdbMap[ip].vulns : []
        };
      })
    };
  });
}
