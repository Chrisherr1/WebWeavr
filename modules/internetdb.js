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
  const ips = [];
  for (const answer of (json.Answer || [])) {
    if (answer.type === 1) {
      ips.push(answer.data);
    }
  }
  return ips;
}

export default async function internetdb(domain) {
  const ips = await resolveIPs(domain);
  if (!ips.length) {
    return { ips: [], results: [] };
  }

  const promises = [];
  for (const ip of ips) {
    promises.push(async function (targetIp) {
      const res = await fetch('https://internetdb.shodan.io/' + targetIp);
      // 404 means no data on that IP, which is a valid response
      if (!res.ok && res.status !== 404) {
        throw new Error('InternetDB returned ' + res.status);
      }
      if (res.status === 404) {
        return { ip: targetIp, ports: [], vulns: [], cpes: [], hostnames: [], tags: [] };
      }
      const json = await res.json();
      return {
        ip:        targetIp,
        ports:     json.ports     || [],
        vulns:     json.vulns     || [],
        cpes:      json.cpes      || [],
        hostnames: json.hostnames || [],
        tags:      json.tags      || []
      };
    }(ip));
  }
  const settled = await Promise.allSettled(promises);

  let allFailed = true;
  for (const settledResult of settled) {
    if (settledResult.status !== 'rejected') {
      allFailed = false;
      break;
    }
  }

  if (allFailed) {
    throw new Error('All InternetDB lookups failed');
  }

  const results = [];
  for (const settledResult of settled) {
    if (settledResult.status === 'fulfilled') {
      results.push(settledResult.value);
    }
  }

  return { ips: ips, results: results };
}
