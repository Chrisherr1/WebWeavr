// Fetches historical URLs from the Wayback Machine CDX API.
// Also flags URLs that match patterns common to sensitive or interesting endpoints.
export default async function wayback(domain) {
  // collapse=urlkey deduplicates URLs that differ only by query string
  const url = 'https://web.archive.org/cdx/search/cdx?url=*.' + domain + '/*&output=json&fl=original,statuscode,timestamp&collapse=urlkey&limit=100';
  const res = await fetch(url);
  const json = await res.json();

  if (!json.length) {
    return { urls: [], count: 0 };
  }

  // First row is the field header — skip it
  const rows = json.slice(1);
  const urls = rows.map(function (row) {
    return { url: row[0], status: row[1], timestamp: row[2] };
  });

  // Flag URLs that suggest admin panels, dev environments, or exposed config files
  const interesting = urls.filter(function (u) {
    return /admin|api|backup|config|\.env|\.git|login|upload|internal|dev|staging/i.test(u.url);
  });

  return { urls: urls, count: urls.length, interesting: interesting };
}
