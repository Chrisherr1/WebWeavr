// Scrapes BGP.he.net for ASN and IP prefix data associated with the domain.
// Uses regex to extract ASNs and CIDR prefixes from the HTML response.
export default async function bgp(domain) {
  const url = 'https://bgp.he.net/dns/' + domain + '#_dns';
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WebWeavr/1.0; passive recon tool)' }
  });
  if (!res.ok) {
    throw new Error('BGP.he.net returned ' + res.status);
  }
  const data = await res.text();
  const asnMatches = [...data.matchAll(/AS(\d+)/g)].map(function (m) { return 'AS' + m[1]; });
  const prefixMatches = [...data.matchAll(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2})/g)].map(function (m) { return m[1]; });
  // Cap results to avoid noise from unrelated matches on busy pages
  const asns = [...new Set(asnMatches)].slice(0, 10);
  const prefixes = [...new Set(prefixMatches)].slice(0, 20);
  return { asns: asns, prefixes: prefixes, source: 'https://bgp.he.net/dns/' + domain };
}
