// src/modules/bgp.js

// Fetches ASN and prefix information from BGP.he.net for a given domain
export default async function bgp(domain) {
  const url = 'https://bgp.he.net/dns/' + domain + '#_dns';
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Spyder/1.0; passive recon tool)' }
  });
  const data = await res.text();
  const asnMatches = [...data.matchAll(/AS(\d+)/g)].map(function (m) { return 'AS' + m[1]; });
  const prefixMatches = [...data.matchAll(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2})/g)].map(function (m) { return m[1]; });
  const asns = [...new Set(asnMatches)].slice(0, 10);
  const prefixes = [...new Set(prefixMatches)].slice(0, 20);
  return { asns: asns, prefixes: prefixes, source: 'https://bgp.he.net/dns/' + domain };
}
