export async function resolve(subdomains) {
  const settled = await Promise.allSettled(
    subdomains.map(async function (subdomain) {
      const res = await fetch('https://cloudflare-dns.com/dns-query?name=' + subdomain + '&type=A', {
        headers: { Accept: 'application/dns-json' }
      });
      const json = await res.json();
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

  return settled
    .filter(function (r) { return r.status === 'fulfilled' && r.value !== null; })
    .map(function (r) { return r.value; });
}
