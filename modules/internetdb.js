async function resolveIPs(domain) {
  try {
    const res = await fetch('https://cloudflare-dns.com/dns-query?name=' + domain + '&type=A', {
      headers: { Accept: 'application/dns-json' }
    });
    const json = await res.json();
    return (json.Answer || []).filter(function (r) {
      return r.type === 1;
    }).map(function (r) {
      return r.data;
    });
  } catch (err) {
    return [];
  }
}

export default async function internetdb(domain) {
  const ips = await resolveIPs(domain);
  if (!ips.length) {
    return { ips: [], results: [] };
  }

  const settled = await Promise.allSettled(
    ips.map(async function (ip) {
      const res = await fetch('https://internetdb.shodan.io/' + ip);
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

  return {
    ips: ips,
    results: settled.filter(function (r) {
      return r.status === 'fulfilled';
    }).map(function (r) {
      return r.value;
    })
  };
}
