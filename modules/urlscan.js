// Queries URLScan.io for recent scans of the target domain.
// Extracts detected technologies, subdomains seen in scan results, and recent scan metadata.

const HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
};

export default async function urlscan(domain) {
  const url = 'https://urlscan.io/api/v1/search/?q=domain:' + domain + '&size=10';
  const res = await fetch(url, { headers: HEADERS });

  if (!res.ok) {
    throw new Error('URLScan returned ' + res.status);
  }

  const json = await res.json();
  const results = json.results || [];

  if (!results.length) {
    return { technologies: [], subdomains: [], scans: [] };
  }

  const techSet = new Set();
  const subdomainSet = new Set();

  for (const scanResult of results) {
    // Collect subdomains seen during scans
    if (scanResult.page && scanResult.page.domain && scanResult.page.domain.endsWith(domain)) {
      subdomainSet.add(scanResult.page.domain);
    }

    // Technologies are stored as task tags in URLScan results
    let taskTags = [];
    if (scanResult.task && scanResult.task.tags) {
      taskTags = scanResult.task.tags;
    }
    for (const tag of taskTags) {
      techSet.add(tag);
    }
  }

  // Summarise the 5 most recent scans
  const recentScans = results.slice(0, 5);
  const scans = [];
  for (const scan of recentScans) {
    let scanUrl    = null;
    let scanIp     = null;
    let scanServer = null;
    let scanDate   = null;

    if (scan.page) {
      scanUrl    = scan.page.url;
      scanIp     = scan.page.ip;
      scanServer = scan.page.server;
    }
    if (scan.task) {
      scanDate = scan.task.time;
    }

    scans.push({
      url:    scanUrl,
      ip:     scanIp,
      server: scanServer,
      date:   scanDate,
    });
  }

  return {
    technologies: [...techSet],
    subdomains:   [...subdomainSet].sort(),
    scans:        scans
  };
}
