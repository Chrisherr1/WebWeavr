// Fetches DNS records using Cloudflare's DNS-over-HTTPS API.
// All record types are queried in parallel to keep latency low.

async function query(domain, type) {
  try {
    const url = 'https://cloudflare-dns.com/dns-query?name=' + domain + '&type=' + type;
    const res = await fetch(url, { headers: { Accept: 'application/dns-json' } });
    const json = await res.json();
    return (json.Answer || []).map(function (r) {
      return { type: r.type, value: r.data, ttl: r.TTL };
    });
  } catch (err) {
    return [];
  }
}

export default async function dns(domain) {
  const [A, AAAA, MX, TXT, NS, CNAME] = await Promise.all([
    query(domain, 'A'),
    query(domain, 'AAAA'),
    query(domain, 'MX'),
    query(domain, 'TXT'),
    query(domain, 'NS'),
    query(domain, 'CNAME'),
  ]);
  return { A, AAAA, MX, TXT, NS, CNAME };
}
