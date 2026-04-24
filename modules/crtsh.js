export default async function crtsh(domain) {
  const url = 'https://crt.sh/?q=%25.' + domain + '&output=json';
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
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
  } catch (err) {
    return { subdomains: [], count: 0, note: 'No data returned' };
  }
}
