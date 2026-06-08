// Collects and deduplicates subdomains from all module results into a single sorted list.
// Each source type returns data in a different shape, so each is handled separately.

function belongsToDomain(hostname, domain) {
  return hostname === domain || hostname.endsWith('.' + domain);
}

export function aggregate(results, domain) {
  const subdomains = new Set();

  // These sources return a flat subdomains array directly
  const directSources = ['crtsh', 'certspotter', 'urlscan'];

  for (const id of directSources) {
    const source = results[id];
    let list = [];
    if (source && source.subdomains) {
      list = source.subdomains;
    }

    for (const subdomain of list) {
      subdomains.add(subdomain);
    }
  }

  // These sources return URL strings — extract the hostname and check it belongs to the target domain
  const urlSources = ['wayback', 'commoncrawl'];

  for (const id of urlSources) {
    const source = results[id];
    let list = [];
    if (source && source.urls) {
      list = source.urls;
    }

    for (const entry of list) {
      try {
        const rawUrl = entry.url || entry;
        const hostname = new URL(rawUrl).hostname.toLowerCase();

        if (belongsToDomain(hostname, domain)) {
          subdomains.add(hostname);
        }
      } catch (err) {
        // Skip malformed URLs
      }
    }
  }

  // InternetDB returns hostnames per IP — keep only those matching the target domain
  const internetdbSource = results.internetdb;
  let internetdbResults = [];
  if (internetdbSource && internetdbSource.results) {
    internetdbResults = internetdbSource.results;
  }

  for (const result of internetdbResults) {
    const hostnames = result.hostnames || [];
    for (const hostname of hostnames) {
      if (belongsToDomain(hostname, domain)) {
        subdomains.add(hostname.toLowerCase());
      }
    }
  }

  // IPInfo returns a hostname per IP — same domain check applies
  const ipinfoSource = results.ipinfo;
  let ipinfoResults = [];
  if (ipinfoSource && ipinfoSource.results) {
    ipinfoResults = ipinfoSource.results;
  }

  for (const result of ipinfoResults) {
    if (result.hostname && belongsToDomain(result.hostname, domain)) {
      subdomains.add(result.hostname.toLowerCase());
    }
  }

  return [...subdomains].sort();
}
