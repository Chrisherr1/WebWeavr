// Collects and deduplicates subdomains from all module results into a single sorted list.
// Each source type returns data in a different shape, so each is handled separately.
export function aggregate(results, domain) {
  const subdomains = new Set();

  // These sources return a flat subdomains array directly
  const directSources = ['crtsh', 'certspotter', 'anubis', 'urlscan'];
  for (const id of directSources) {
    const sourceSubdomains = (results[id] && results[id].subdomains) ? results[id].subdomains : [];
    sourceSubdomains.forEach(function (s) {
      subdomains.add(s);
    });
  }

  // These sources return URL strings — extract the hostname and validate it belongs to the target domain
  const urlSources = ['wayback', 'commoncrawl'];
  for (const id of urlSources) {
    const sourceUrls = (results[id] && results[id].urls) ? results[id].urls : [];
    sourceUrls.forEach(function (u) {
      try {
        const hostname = new URL(u.url || u).hostname.toLowerCase();
        if (hostname.endsWith('.' + domain) || hostname === domain) {
          subdomains.add(hostname);
        }
      } catch (err) {}
    });
  }

  // InternetDB returns hostnames per IP — filter to only those matching the target domain
  const internetdbResults = (results.internetdb && results.internetdb.results) ? results.internetdb.results : [];
  internetdbResults.forEach(function (r) {
    const hostnames = r.hostnames || [];
    hostnames.forEach(function (h) {
      if (h.endsWith('.' + domain) || h === domain) {
        subdomains.add(h.toLowerCase());
      }
    });
  });

  // IPInfo returns a hostname per IP — same domain check applies
  const ipinfoResults = (results.ipinfo && results.ipinfo.results) ? results.ipinfo.results : [];
  ipinfoResults.forEach(function (r) {
    if (r.hostname && (r.hostname.endsWith('.' + domain) || r.hostname === domain)) {
      subdomains.add(r.hostname.toLowerCase());
    }
  });

  return [...subdomains].sort();
}
