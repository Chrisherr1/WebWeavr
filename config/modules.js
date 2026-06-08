import whois from '../modules/whois.js';
import dns from '../modules/dns.js';
import bgp from '../modules/bgp.js'; 
import crtsh from '../modules/crtsh.js';
import certspotter from '../modules/certspotter.js';
import urlscan from '../modules/urlscan.js';
import wayback from '../modules/wayback.js';
import commoncrawl from '../modules/commoncrawl.js';
import ipinfo from '../modules/ipinfo.js';
import internetdb from '../modules/internetdb.js';

export const GROUPS = [
  {
    id: 'identity',
    label: 'Identity',
    modules: [
      { id: 'whois', label: 'WHOIS / RDAP', fn: whois },
    ]
  },
  {
    id: 'infrastructure',
    label: 'Infrastructure',
    modules: [
      { id: 'dns',        label: 'DNS Records', fn: dns },
      { id: 'bgp',        label: 'BGP / ASN',   fn: bgp },
      { id: 'ipinfo',     label: 'IPInfo',      fn: ipinfo },
      { id: 'internetdb', label: 'InternetDB',  fn: internetdb },
    ]
  },
  {
    id: 'subdomains',
    label: 'Subdomains',
    modules: [
      { id: 'crtsh',       label: 'crt.sh',     fn: crtsh },
      { id: 'certspotter', label: 'CertSpotter', fn: certspotter },
    ]
  },
  {
    id: 'exposure',
    label: 'Historical Exposure',
    modules: [
      { id: 'wayback',     label: 'Wayback Machine', fn: wayback },
      { id: 'commoncrawl', label: 'CommonCrawl',     fn: commoncrawl },
      { id: 'urlscan',     label: 'URLScan',         fn: urlscan },
    ]
  },
];

// Flatten all groups into a single list, attaching group id and label to each module entry
const allModules = [];
for (const group of GROUPS) {
  for (const moduleEntry of group.modules) {
    allModules.push(Object.assign({}, moduleEntry, { group: group.id, groupLabel: group.label }));
  }
}
export const ALL_MODULES = allModules;
