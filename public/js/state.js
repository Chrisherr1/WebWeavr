// API base URL — same origin in both dev and production
export let API_BASE = '';

// Display name, data source, and tooltip description for each scan module
export const MODULE_META = {
  whois:       { label: 'WHOIS / RDAP',  source: 'RDAP / IANA',           desc: 'Registrar, registration date, expiry, and nameservers — who registered it and when' },
  dns:         { label: 'DNS Records',   source: 'Cloudflare DoH',        desc: 'A, MX, TXT, NS, and CNAME records — IPs they resolve to, mail providers, SPF/DKIM config' },
  bgp:         { label: 'BGP / ASN',     source: 'bgp.he.net',            desc: 'Autonomous system numbers and IP prefixes — which ISPs and data centers host them' },
  ipinfo:      { label: 'IPInfo',        source: 'ipinfo.io',             desc: 'ASN, org, and location for each IP — confirms which ranges belong to the target' },
  internetdb:  { label: 'InternetDB',    source: 'internetdb.shodan.io',  desc: 'Open ports, services, and CVEs for resolved IPs — pre-scanned by Shodan, no active probing' },
  crtsh:       { label: 'crt.sh',        source: 'crt.sh',                desc: 'Every subdomain that has ever appeared in a public TLS certificate — nothing gets deleted' },
  certspotter: { label: 'CertSpotter',   source: 'certspotter.com',       desc: 'Independent CT index — catches certs that crt.sh sometimes misses' },
  wayback:     { label: 'Wayback',       source: 'web.archive.org',       desc: 'Archived URLs — old endpoints, admin paths, APIs, and files that may no longer be visible' },
  commoncrawl: { label: 'CommonCrawl',   source: 'index.commoncrawl.org', desc: 'Web crawl index — publicly linked pages and paths discovered by crawlers' },
  urlscan:     { label: 'URLScan',       source: 'urlscan.io',            desc: 'Browser-based scans — detected technologies, CDN, server headers, and what the site exposed' },
};

// Org name substrings used to detect whether an IP belongs to a CDN rather than the origin server
export const CDN_ORGS = [
  'cloudflare', 'fastly', 'akamai', 'sucuri', 'incapsula', 'imperva',
  'cloudfront', 'amazon', 'google', 'microsoft', 'azure', 'vercel',
  'netlify', 'stackpath', 'limelight', 'edgio', 'bunny', 'cdn77', 'keycdn'
];

// Scan state — reset at the start of each scan, read by event handlers and render functions
export let totalModules = 0;
export let completed    = 0;
export let scanData     = {};
export let scanDomain   = '';

// Setters — used by app.js to update scan state across modules
export function setTotalModules(val) { totalModules = val; }
export function setCompleted(val)    { completed = val; }
export function setScanData(val)     { scanData = val; }
export function setScanDomain(val)   { scanDomain = val; }
export function incrementCompleted() { completed++; }
export function setScanDataKey(key, val) { scanData[key] = val; }
