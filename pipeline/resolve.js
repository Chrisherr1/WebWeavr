// DNS-resolves each subdomain using Cloudflare's DNS-over-HTTPS API.
// Returns only subdomains that have at least one A record (live hosts).
export async function resolve(subdomains) {
  const settled = await Promise.allSettled(
    subdomains.map(async function (subdomain) {
      const res = await fetch('https://cloudflare-dns.com/dns-query?name=' + subdomain + '&type=A', {
        headers: { Accept: 'application/dns-json' }
      });
      const json = await res.json();
      // type 1 = A record
      const answers = (json.Answer || []).filter(function (r) {
        return r.type === 1;
      });
      if (!answers.length) {
        return null;
      }
      return {
        subdomain: subdomain,
        ips: answers.map(function (r) { return r.data; })
      };
    })
  );

  // Drop any subdomains that failed to resolve or returned no A records
  return settled
    .filter(function (r) { return r.status === 'fulfilled' && r.value !== null; })
    .map(function (r) { return r.value; });
}
