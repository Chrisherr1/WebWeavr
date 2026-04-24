// Queries the CertSpotter API for TLS certificate issuances matching the domain.
// Extracts unique subdomains from the dns_names field of each certificate.
export default async function certspotter(domain) {
  const url = 'https://certspotter.com/api/v1/issuances?domain=' + domain + '&include_subdomains=true&expand=dns_names';
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const json = await res.json();
    const names = json.flatMap(function (cert) {
      return cert.dns_names || [];
    }).filter(function (name) {
      // Exclude wildcards — they can't be resolved directly
      return name.endsWith(domain) && !name.includes('*');
    }).map(function (name) {
      return name.trim().toLowerCase();
    });
    const subdomains = [...new Set(names)].sort();
    return { subdomains: subdomains, count: subdomains.length };
  } catch (err) {
    return { subdomains: [], count: 0, note: 'No data returned' };
  }
}
