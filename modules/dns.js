// Fetches DNS records using Cloudflare's DNS-over-HTTPS API.
// All record types are queried in parallel to keep latency low.

async function query(domain, type) {
  const url = 'https://cloudflare-dns.com/dns-query?name=' + domain + '&type=' + type;
  const res = await fetch(url, { headers: { Accept: 'application/dns-json' } });

  if (!res.ok) {
    throw new Error('Cloudflare DoH returned ' + res.status);
  }

  const json = await res.json();
  const answers = json.Answer || [];

  const records = [];
  for (const answer of answers) {
    records.push({ type: answer.type, value: answer.data, ttl: answer.TTL });
  }
  return records;
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

  let allFailed = true;
  for (const settledResult of settled) {
    if (settledResult.status !== 'rejected') {
      allFailed = false;
      break;
    }
  }

  if (allFailed) {
    throw new Error('All DNS queries failed');
  }

  const values = [];
  for (const settledResult of settled) {
    if (settledResult.status === 'fulfilled') {
      values.push(settledResult.value);
    } else {
      values.push([]);
    }
  }

  const [A, AAAA, MX, TXT, NS, CNAME] = values;

  return { A, AAAA, MX, TXT, NS, CNAME };
}
