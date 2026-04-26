// Fetches subdomains from Anubis (jonlu.ca) — a passive DNS dataset.
export default async function anubis(domain) {
  const url = 'https://jonlu.ca/anubis/subdomains/' + domain;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    throw new Error('Anubis returned ' + res.status);
  }
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
}
