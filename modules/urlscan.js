// Queries URLScan.io for recent scans of the target domain.
// Extracts detected technologies, subdomains seen in scan results, and recent scan metadata.
export default async function urlscan(domain) {
  const url = 'https://urlscan.io/api/v1/search/?q=domain:' + domain + '&size=10';
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const json = await res.json();
    const results = json.results || [];
    if (!results.length) {
      return { technologies: [], subdomains: [], scans: [] };
    }

    const techSet = new Set();
    const subdomainSet = new Set();

    results.forEach(function (r) {
      if (r.page && r.page.domain && r.page.domain.endsWith(domain)) {
        subdomainSet.add(r.page.domain);
      }
      // Technologies are stored as task tags in URLScan results
      const tags = (r.task && r.task.tags) ? r.task.tags : [];
      tags.forEach(function (t) {
        techSet.add(t);
      });
    });

    // Return a summary of the 5 most recent scans
    const scans = results.slice(0, 5).map(function (r) {
      return {
        url:    r.page ? r.page.url    : null,
        ip:     r.page ? r.page.ip     : null,
        server: r.page ? r.page.server : null,
        date:   r.task ? r.task.time   : null
      };
    });

    return {
      technologies: [...techSet],
      subdomains: [...subdomainSet].sort(),
      scans: scans
    };
  } catch (err) {
    return { technologies: [], subdomains: [], scans: [], note: 'No data returned' };
  }
}
