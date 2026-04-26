// Queries the CertSpotter API for TLS certificate issuances matching the domain.
// Extracts unique subdomains from the dns_names field of each certificate.
export default async function certspotter(domain) {
  const url = 'https://certspotter.com/api/v1/issuances?domain=' + domain + '&include_subdomains=true&expand=dns_names';
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    throw new Error('CertSpotter returned ' + res.status);
  }
  const json = await res.json();
  const names = json.flatMap(function (cert) {
    return cert.dns_names || [];
  }).filter(function (name) {
    return name.endsWith(domain) && !name.includes('*');
  }).map(function (name) {
    return name.trim().toLowerCase();
  });
  const subdomains = [...new Set(names)].sort();
  return { subdomains: subdomains, count: subdomains.length };
}
