// Queries the CommonCrawl index for URLs crawled under the target domain.
// Also flags URLs that match patterns common to sensitive or interesting endpoints.

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
};

const INTERESTING_PATTERN = /admin|api|backup|config|\.env|\.git|login|upload|internal|dev|staging/i;

export default async function commoncrawl(domain) {
  // Fetch the list of available indexes and pick the most recent one
  const collRes = await fetch('https://index.commoncrawl.org/collinfo.json', { headers: HEADERS });

  if (!collRes.ok) {
    throw new Error('CommonCrawl collinfo returned ' + collRes.status);
  }

  const collections = await collRes.json();
  const latestIndex = collections[0].id;

  // Query the latest index for all URLs under the target domain
  const indexUrl = 'https://index.commoncrawl.org/' + latestIndex + '-index?url=*.' + domain + '&output=json&limit=100';
  const res = await fetch(indexUrl, { headers: HEADERS });

  if (res.status === 404) {
    // 404 means the domain simply isn't in this index — not an error
    return { urls: [], count: 0, interesting: [] };
  }

  if (!res.ok) {
    throw new Error('CommonCrawl returned ' + res.status);
  }

  // Response is newline-delimited JSON, not a JSON array
  const text = await res.text();
  const lines = text.trim().split('\n');

  const records = [];
  for (const line of lines) {
    if (!line.length) {
      continue;
    }
    try {
      records.push(JSON.parse(line));
    } catch (err) {
      // Skip malformed lines
    }
  }

  // Deduplicate URLs
  const seen = new Set();
  const urls = [];
  for (const record of records) {
    if (!seen.has(record.url)) {
      seen.add(record.url);
      urls.push(record.url);
    }
  }

  // Flag URLs that suggest admin panels, dev environments, or exposed config files
  const interesting = [];
  for (const url of urls) {
    if (INTERESTING_PATTERN.test(url)) {
      interesting.push(url);
    }
  }

  return { urls: urls, count: urls.length, interesting: interesting };
}
