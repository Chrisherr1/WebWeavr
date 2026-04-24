// src/modules/anubis.js



// Fetches subdomains from Anubis for a given domain
export default async function anubis(domain) {
  // Anubis API endpoint for subdomain enumeration
  const url = 'https://jonlu.ca/anubis/subdomains/' + domain;
  // we try to fetch the data from Anubis and process it
  
  // if there's an error (like network issues or invalid response), we catch it and return an empty result with a note
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const json = await res.json();
    const list = Array.isArray(json) ? json : [];
    const subdomains = [...new Set(
      list.map(function (s) {
        return s.trim().toLowerCase();
      }).filter(function (s) {
        return s.endsWith(domain);
      })
    )].sort();
    return { subdomains: subdomains, count: subdomains.length };
  } catch (err) {
    return { subdomains: [], count: 0, note: 'No data returned' };
  }
}
