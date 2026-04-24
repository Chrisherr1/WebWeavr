// Queries the CommonCrawl index for URLs crawled under the target domain.
// Also flags URLs that match patterns common to sensitive or interesting endpoints.
export default async function commoncrawl(domain) {
  const url = 'https://index.commoncrawl.org/CC-MAIN-2024-10-index?url=*.' + domain + '&output=json&limit=100';
  const res = await fetch(url);
  // Response is newline-delimited JSON, not a JSON array
  const text = await res.text();
  const lines = text.trim().split('\n').filter(function (line) {
    return line.length > 0;
  });
  const records = lines.map(function (line) {
    try {
      return JSON.parse(line);
    } catch (err) {
      return null;
    }
  }).filter(function (record) {
    return record !== null;
  });

  const urls = [...new Set(records.map(function (r) { return r.url; }))];
  // Flag URLs that suggest admin panels, dev environments, or exposed config files
  const interesting = urls.filter(function (u) {
    return /admin|api|backup|config|\.env|\.git|login|upload|internal|dev|staging/i.test(u);
  });
  return { urls: urls, count: urls.length, interesting: interesting };
}
