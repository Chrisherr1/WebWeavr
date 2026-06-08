// Fetches historical URLs from the Wayback Machine CDX API.
// Also flags URLs that match patterns common to sensitive or interesting endpoints.

const INTERESTING_PATTERN = /admin|api|backup|config|\.env|\.git|login|upload|internal|dev|staging/i;

export default async function wayback(domain) {
  // collapse=urlkey deduplicates URLs that differ only by query string
  const url = 'https://web.archive.org/cdx/search/cdx?url=*.' + domain + '/*&output=json&fl=original,statuscode,timestamp&collapse=urlkey&limit=100';

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
    }
  });

  if (!res.ok) {
    throw new Error('Wayback returned ' + res.status);
  }

  const json = await res.json();

  if (!json.length) {
    return { urls: [], count: 0 };
  }

  // First row is the field header — skip it
  const rows = json.slice(1);

  const urls = [];
  for (const row of rows) {
    urls.push({ url: row[0], status: row[1], timestamp: row[2] });
  }

  // Flag URLs that suggest admin panels, dev environments, or exposed config files
  const interesting = [];
  for (const url of urls) {
    if (INTERESTING_PATTERN.test(url.url)) {
      interesting.push(url);
    }
  }

  return { urls: urls, count: urls.length, interesting: interesting };
}
