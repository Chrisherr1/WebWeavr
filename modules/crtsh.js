// Queries crt.sh for certificates issued for subdomains of the target domain.
// crt.sh aggregates Certificate Transparency logs, making it a reliable passive source.
export default async function crtsh(domain) {
  const url = 'https://crt.sh/?q=%25.' + domain + '&output=json';
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
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
