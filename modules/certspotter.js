// Queries the CertSpotter API for TLS certificate issuances matching the domain.
// Extracts unique subdomains from the dns_names field of each certificate.

const HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
};

export default async function certspotter(domain) {
  const url = 'https://api.certspotter.com/v1/issuances?domain=' + domain + '&include_subdomains=true&expand=dns_names';
  const res = await fetch(url, { headers: HEADERS });

  if (!res.ok) {
    throw new Error('CertSpotter returned ' + res.status);
  }

  const json = await res.json();

  // Pull all dns_names out of every certificate
  const allNames = [];
  for (const cert of json) {
    const names = cert.dns_names || [];
    for (const name of names) {
      allNames.push(name);
    }
  }

  // Keep only names that belong to the target domain, drop wildcards, then normalise
  const normalised = [];
  for (const name of allNames) {
    if (name.endsWith(domain) && !name.includes('*')) {
      normalised.push(name.trim().toLowerCase());
    }
  }

  const subdomains = [...new Set(normalised)].sort();

  return { subdomains: subdomains, count: subdomains.length };
}
