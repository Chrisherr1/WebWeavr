import whois from '../modules/whois.js';
import dns from '../modules/dns.js';
import bgp from '../modules/bgp.js'; 
import crtsh from '../modules/crtsh.js';
import certspotter from '../modules/certspotter.js';
import anubis from '../modules/anubis.js';
import urlscan from '../modules/urlscan.js';
import wayback from '../modules/wayback.js';
import commoncrawl from '../modules/commoncrawl.js';
import internetdb from '../modules/internetdb.js';
import ipinfo from '../modules/ipinfo.js';

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
      { id: 'anubis',      label: 'Anubis',      fn: anubis },
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

export const ALL_MODULES = GROUPS.flatMap(function (g) {
  return g.modules.map(function (m) {
    return Object.assign({}, m, { group: g.id, groupLabel: g.label });
  });
});
