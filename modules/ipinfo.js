// Queries IPInfo for org, location, and hostname data per IP.
// First resolves the domain to IPs via Cloudflare DoH, then looks up each IP.

async function resolveIPs(domain) {
  const url = 'https://cloudflare-dns.com/dns-query?name=' + domain + '&type=A';
  const res = await fetch(url, { headers: { Accept: 'application/dns-json' } });

  if (!res.ok) {
    throw new Error('Cloudflare DoH returned ' + res.status);
  }

  const json = await res.json();
  const answers = json.Answer || [];
  const ips = [];
  for (const answer of answers) {
    if (answer.type === 1) {
      ips.push(answer.data);
    }
  }
  return ips;
}

async function lookupIP(ip) {
  const res = await fetch('https://ipinfo.io/' + ip + '/json');

  if (!res.ok) {
    throw new Error('IPInfo returned ' + res.status);
  }

  const json = await res.json();

  return {
    ip:       ip,
    hostname: json.hostname,
    org:      json.org,
    city:     json.city,
    region:   json.region,
    country:  json.country
  };
}

export default async function ipinfo(domain) {
  const ips = await resolveIPs(domain);

  if (!ips.length) {
    return { ips: [], results: [] };
  }

  const promises = [];
  for (const ip of ips) {
    promises.push(lookupIP(ip));
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
    throw new Error('All IPInfo lookups failed');
  }

  const results = [];
  for (const settledResult of settled) {
    if (settledResult.status === 'fulfilled') {
      results.push(settledResult.value);
    }
  }

  return { ips, results };
}
