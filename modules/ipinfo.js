// Queries IPInfo for org, location, and hostname data per IP.
// First resolves the domain to IPs via Cloudflare DoH, then looks up each IP.

async function resolveIPs(domain) {
  try {
    const res = await fetch('https://cloudflare-dns.com/dns-query?name=' + domain + '&type=A', {
      headers: { Accept: 'application/dns-json' }
    });
    const json = await res.json();
    // type 1 = A record
    return (json.Answer || []).filter(function (r) {
      return r.type === 1;
    }).map(function (r) {
      return r.data;
    });
  } catch (err) {
    return [];
  }
}

export default async function ipinfo(domain) {
  const ips = await resolveIPs(domain);
  if (!ips.length) {
    return { ips: [], results: [] };
  }

  const settled = await Promise.allSettled(
    ips.map(async function (ip) {
      const res = await fetch('https://ipinfo.io/' + ip + '/json');
      const json = await res.json();
      return {
        ip:       ip,
        hostname: json.hostname,
        org:      json.org,
        city:     json.city,
        region:   json.region,
        country:  json.country
      };
    })
  );

  return {
    ips: ips,
    results: settled.filter(function (r) {
      return r.status === 'fulfilled';
    }).map(function (r) {
      return r.value;
    })
  };
}
