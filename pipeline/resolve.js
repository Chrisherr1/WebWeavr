// DNS-resolves each subdomain using Cloudflare's DNS-over-HTTPS API.
// Returns only subdomains that have at least one A record (live hosts).

async function resolveSubdomain(subdomain) {
  const url = 'https://cloudflare-dns.com/dns-query?name=' + subdomain + '&type=A';
  const res = await fetch(url, { headers: { Accept: 'application/dns-json' } });
  const json = await res.json();

  // type 1 = A record
  const aRecords = [];
  for (const answer of (json.Answer || [])) {
    if (answer.type === 1) {
      aRecords.push(answer);
    }
  }

  if (!aRecords.length) {
    return null;
  }

  const ips = [];
  for (const answer of aRecords) {
    ips.push(answer.data);
  }

  return { subdomain: subdomain, ips: ips };
}

export async function resolve(subdomains) {
  const promises = [];
  for (const subdomain of subdomains) {
    promises.push(resolveSubdomain(subdomain));
  }
  const settled = await Promise.allSettled(promises);

  // Keep only subdomains that resolved to at least one IP
  const liveHosts = [];
  for (const result of settled) {
    if (result.status === 'fulfilled' && result.value !== null) {
      liveHosts.push(result.value);
    }
  }

  return liveHosts;
}
