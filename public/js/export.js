import { scanDomain } from './state.js';

// Shapes the raw scan data into a clean, deduplicated JSON payload for export
export function buildExportPayload(data) {
  // Combine subdomains from all sources and deduplicate
  const allSubdomains = [];
  if (data.crtsh       && data.crtsh.subdomains)       allSubdomains.push(...data.crtsh.subdomains);
  if (data.certspotter && data.certspotter.subdomains)  allSubdomains.push(...data.certspotter.subdomains);
  if (data.urlscan     && data.urlscan.subdomains)      allSubdomains.push(...data.urlscan.subdomains);
  const subdomains = [...new Set(allSubdomains)].sort();

  // Combine interesting URLs from Wayback and CommonCrawl and deduplicate
  const allInteresting = [];
  if (data.wayback && data.wayback.interesting) {
    for (const urlEntry of data.wayback.interesting) {
      allInteresting.push(urlEntry.url || urlEntry);
    }
  }
  if (data.commoncrawl && data.commoncrawl.interesting) {
    for (const urlEntry of data.commoncrawl.interesting) {
      allInteresting.push(urlEntry.url || urlEntry);
    }
  }
  const interestingUrls = [...new Set(allInteresting)];

  // Build a merged IP list from IPInfo and InternetDB
  const ipMap  = {};
  const ipList = [];

  let ipinfoResults = [];
  if (data.ipinfo && data.ipinfo.results) {
    ipinfoResults = data.ipinfo.results;
  }
  for (const ipResult of ipinfoResults) {
    let location = null;
    if (ipResult.city && ipResult.country) {
      location = ipResult.city + ', ' + ipResult.country;
    } else if (ipResult.country) {
      location = ipResult.country;
    }
    const entry = { ip: ipResult.ip, org: ipResult.org || null, location: location, ports: [], vulns: [], hostnames: [] };
    ipMap[ipResult.ip] = entry;
    ipList.push(entry);
  }

  let internetdbResults = [];
  if (data.internetdb && data.internetdb.results) {
    internetdbResults = data.internetdb.results;
  }
  for (const dbResult of internetdbResults) {
    if (ipMap[dbResult.ip]) {
      ipMap[dbResult.ip].ports     = dbResult.ports     || [];
      ipMap[dbResult.ip].vulns     = dbResult.vulns     || [];
      ipMap[dbResult.ip].hostnames = dbResult.hostnames || [];
    }
  }

  // Build registration block from WHOIS data if available
  let registration = null;
  if (data.whois) {
    registration = {
      registrar:   data.whois.registrar   || null,
      registered:  data.whois.registered  || null,
      expires:     data.whois.expiry      || null,
      updated:     data.whois.updated     || null,
      nameservers: data.whois.nameservers || [],
      status:      data.whois.status      || [],
      dnssec:      data.whois.dnssec      || null,
    };
  }

  // Build DNS block — extract plain values from each record object
  let dns = null;
  if (data.dns) {
    const aRecords    = data.dns.A    || [];
    const aaaaRecords = data.dns.AAAA || [];
    const mxRecords   = data.dns.MX   || [];
    const nsRecords   = data.dns.NS   || [];
    const txtRecords  = data.dns.TXT  || [];

    const ips         = [];
    const ipv6        = [];
    const mail        = [];
    const nameservers = [];
    const txt         = [];

    for (const record of aRecords)    { ips.push(record.value); }
    for (const record of aaaaRecords) { ipv6.push(record.value); }
    for (const record of mxRecords)   { mail.push(record.value); }
    for (const record of nsRecords)   { nameservers.push(record.value); }
    for (const record of txtRecords)  { txt.push(record.value); }

    dns = { ips, ipv6, mail, nameservers, txt };
  }

  let network = null;
  if (data.bgp) {
    network = {
      asns:     data.bgp.asns     || [],
      prefixes: data.bgp.prefixes || [],
    };
  }

  let technologies = [];
  if (data.urlscan && data.urlscan.technologies) {
    technologies = data.urlscan.technologies;
  }

  return {
    domain:           scanDomain,
    scanned_at:       new Date().toISOString(),
    registration:     registration,
    dns:              dns,
    network:          network,
    ips:              ipList,
    subdomains:       subdomains,
    technologies:     technologies,
    interesting_urls: interestingUrls,
  };
}

// Serialises an object to JSON and triggers a file download in the browser
export function downloadJson(data, filename) {
  const json        = JSON.stringify(data, null, 2);
  const blob        = new Blob([json], { type: 'application/json' });
  const downloadUrl = URL.createObjectURL(blob);

  const anchor    = document.createElement('a');
  anchor.href     = downloadUrl;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(downloadUrl);
}
