// Queries crt.sh for certificates issued for subdomains of the target domain.
// crt.sh aggregates Certificate Transparency logs, making it a reliable passive source.
export default async function crtsh(domain) {

  const url = 'https://crt.sh/?q=' + domain + '&output=json';

  const controller = new AbortController();
  const timeout = setTimeout(function () { controller.abort(); }, 30000);

  let res;
  try {
    res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36' }, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new Error('crt.sh returned ' + res.status);
  }
  
  const json = await res.json();
  const names = json.flatMap(function (cert) {
    return cert.name_value.split('\n');
  }).filter(function (name) {
    return name.endsWith(domain) && !name.includes('*');
  }).map(function (name) {
    return name.trim().toLowerCase();
  });
  const subdomains = [...new Set(names)].sort();
  return { subdomains: subdomains, count: subdomains.length };
}
