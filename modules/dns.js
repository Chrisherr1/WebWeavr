// Fetches DNS records using Cloudflare's DNS-over-HTTPS API.
// All record types are queried in parallel to keep latency low.

async function query(domain, type) {
  const url = 'https://cloudflare-dns.com/dns-query?name=' + domain + '&type=' + type;
  const res = await fetch(url, { headers: { Accept: 'application/dns-json' } });
  if (!res.ok) {
    throw new Error('Cloudflare DoH returned ' + res.status);
  }
  const json = await res.json();
  return (json.Answer || []).map(function (r) {
    return { type: r.type, value: r.data, ttl: r.TTL };
  });
}

export default async function dns(domain) {
  const settled = await Promise.allSettled([
    query(domain, 'A'),
    query(domain, 'AAAA'),
    query(domain, 'MX'),
    query(domain, 'TXT'),
    query(domain, 'NS'),
    query(domain, 'CNAME'),
  ]);
  if (settled.every(function (r) { return r.status === 'rejected'; })) {
    throw new Error('All DNS queries failed');
  }
  const [A, AAAA, MX, TXT, NS, CNAME] = settled.map(function (r) {
    return r.status === 'fulfilled' ? r.value : [];
  });
  return { A, AAAA, MX, TXT, NS, CNAME };
}
