// Queries Shodan's InternetDB for open ports, CVEs, CPEs, and hostnames per IP.
// First resolves the domain to IPs via Cloudflare DoH, then looks up each IP.

async function resolveIPs(domain) {
  const res = await fetch('https://cloudflare-dns.com/dns-query?name=' + domain + '&type=A', {
    headers: { Accept: 'application/dns-json' }
  });
  if (!res.ok) {
    throw new Error('Cloudflare DoH returned ' + res.status);
  }
  const json = await res.json();
  return (json.Answer || []).filter(function (r) {
    return r.type === 1;
  }).map(function (r) {
    return r.data;
  });
}

export default async function internetdb(domain) {
  const ips = await resolveIPs(domain);
  if (!ips.length) {
    return { ips: [], results: [] };
  }

  const settled = await Promise.allSettled(
    ips.map(async function (ip) {
      const res = await fetch('https://internetdb.shodan.io/' + ip);
      // 404 means no data on that IP, which is a valid response
      if (!res.ok && res.status !== 404) {
        throw new Error('InternetDB returned ' + res.status);
      }
      if (res.status === 404) {
        return { ip: ip, ports: [], vulns: [], cpes: [], hostnames: [], tags: [] };
      }
      const json = await res.json();
      return {
        ip:        ip,
        ports:     json.ports     || [],
        vulns:     json.vulns     || [],
        cpes:      json.cpes      || [],
        hostnames: json.hostnames || [],
        tags:      json.tags      || []
      };
    })
  );

  if (settled.every(function (r) { return r.status === 'rejected'; })) {
    throw new Error('All InternetDB lookups failed');
  }

  return {
    ips: ips,
    results: settled.filter(function (r) {
      return r.status === 'fulfilled';
    }).map(function (r) {
      return r.value;
    })
  };
}
