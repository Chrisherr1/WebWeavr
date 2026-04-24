// Fetches subdomains from Anubis (jonlu.ca) — a passive DNS dataset.
export default async function anubis(domain) {
  const url = 'https://jonlu.ca/anubis/subdomains/' + domain;
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
