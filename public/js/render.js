import { isCDN, row, section, tags, urlList } from './helpers.js';

// Routes rendering to the correct function based on module id
export function renderBody(id, data) {
  if (!data) {
    return '<span class="empty">Loading…</span>';
  }
  if (data.error) {
    return '<span style="color:var(--error)">' + data.error + '</span>';
  }
  if (id === 'whois')       { return renderWhois(data); }
  if (id === 'dns')         { return renderDns(data); }
  if (id === 'bgp')         { return renderBgp(data); }
  if (id === 'crtsh')       { return renderSubdomains(data, 'crt.sh',      'permanent record — staging, dev, and internal names often slip in'); }
  if (id === 'certspotter') { return renderSubdomains(data, 'CertSpotter', 'independent index — catches certs crt.sh sometimes misses'); }
  if (id === 'urlscan')     { return renderUrlscan(data); }
  if (id === 'wayback')     { return renderUrls(data, 'Wayback Machine'); }
  if (id === 'commoncrawl') { return renderUrls(data, 'CommonCrawl'); }
  if (id === 'ipinfo')      { return renderIpinfo(data); }
  if (id === 'internetdb')  { return renderInternetdb(data); }
  return '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
}

// Renders WHOIS / RDAP registration data
function renderWhois(data) {
  let registered = null;
  let updated    = null;
  let expiry     = null;

  if (data.registered) { registered = new Date(data.registered).toLocaleDateString(); }
  if (data.updated)    { updated    = new Date(data.updated).toLocaleDateString(); }
  if (data.expiry)     { expiry     = new Date(data.expiry).toLocaleDateString(); }

  let dnssecHtml = '';
  if (data.dnssec) {
    let dnssecStatus = '';
    if (data.dnssec.delegationSigned) {
      dnssecStatus = 'Fully signed';
    } else if (data.dnssec.zoneSigned) {
      dnssecStatus = 'Zone signed, delegation missing — chain of trust is broken';
    } else {
      dnssecStatus = 'Not signed';
    }
    dnssecHtml = row('DNSSEC', dnssecStatus, 'unsigned domains are vulnerable to DNS cache poisoning');
  }

  let registrarContactHtml = '';
  if (data.registrarContact) {
    registrarContactHtml = section('Registrar Contact');
    if (data.registrarContact.email) registrarContactHtml += row('Abuse Email', data.registrarContact.email);
    if (data.registrarContact.phone) registrarContactHtml += row('Abuse Phone', data.registrarContact.phone);
  }

  let contactHtml = '';
  if (data.contact) {
    contactHtml = section('Registrant Contact');
    if (data.contact.name)  contactHtml += row('Name',  data.contact.name);
    if (data.contact.org)   contactHtml += row('Org',   data.contact.org);
    if (data.contact.email) contactHtml += row('Email', data.contact.email);
  }

  let transferred = null;
  if (data.transferred) {
    transferred = new Date(data.transferred).toLocaleDateString();
  }

  let registrarHtml = null;
  if (data.registrarUrl) {
    const registrarLabel = data.registrar || data.registrarUrl;
    registrarHtml = '<a href="' + data.registrarUrl + '" target="_blank" style="color:var(--accent)">' + registrarLabel + '</a>';
  } else {
    registrarHtml = data.registrar || null;
  }

  return ''
    + row('Registrar',          registrarHtml,          'privacy proxy = harder to attribute')
    + row('IANA Registrar ID',  data.ianaRegistrarId,   'numeric ID assigned by IANA to every accredited registrar')
    + row('Registry Domain ID', data.registryDomainId,  'internal ID assigned by the registry')
    + row('Registered',         registered,             'newly registered domains are higher risk')
    + row('Updated',            updated,                'recent changes may signal infra shift')
    + row('Transferred',        transferred,            'recent transfer may indicate a sale or hijack')
    + row('Expires',            expiry,                 'expiring soon = potential takeover risk')
    + dnssecHtml
    + section('Nameservers', 'reveals DNS provider — Cloudflare, Route53, self-hosted')
    + tags(data.nameservers)
    + section('Status')
    + tags(data.status)
    + registrarContactHtml
    + contactHtml;
}

// Renders DNS records grouped by type
function renderDns(data) {
  function formatRecords(records) {
    if (!records || !records.length) {
      return '<span class="empty">None</span>';
    }
    const parts = [];
    for (const record of records) {
      parts.push('<span class="tag">' + record.value + '</span>');
    }
    return parts.join('');
  }

  return ''
    + section('A Records',    'direct server IPs — identifies hosting provider or CDN') + formatRecords(data.A)
    + section('AAAA Records', 'IPv6 — indicates modern infra or dual-stack')            + formatRecords(data.AAAA)
    + section('MX Records',   'email provider — Google, Microsoft, Proofpoint')         + formatRecords(data.MX)
    + section('NS Records',   'who controls DNS — changes here can redirect everything')+ formatRecords(data.NS)
    + section('TXT Records',  'SPF/DKIM/DMARC config, domain verification tokens')     + formatRecords(data.TXT)
    + section('CNAME Records','aliases to third-party services — check for takeover')   + formatRecords(data.CNAME);
}

// Renders BGP / ASN data with a link to the source
function renderBgp(data) {
  let sourceLink = '';
  if (data.source) {
    const sourceAnchor = '<a href="' + data.source + '" target="_blank" style="color:var(--accent)">' + data.source + '</a>';
    sourceLink = '<div style="margin-top:10px">' + row('Source', sourceAnchor) + '</div>';
  }

  return ''
    + section('ASNs',        'autonomous system — identifies the hosting org or ISP') + tags(data.asns)
    + section('IP Prefixes', 'routed IP ranges — useful for scoping network exposure') + tags(data.prefixes)
    + sourceLink;
}

// Renders a subdomain list from CT log sources
function renderSubdomains(data, source, hint) {
  let noteHtml = '';
  if (data.note) {
    noteHtml = '<div class="empty" style="margin-top:6px">' + data.note + '</div>';
  }

  return ''
    + row('Found', data.count + ' <span class="count-badge">' + source + '</span>')
    + noteHtml
    + section('Subdomains', hint)
    + '<div class="url-list">' + urlList(data.subdomains, function (subdomain) { return subdomain; }) + '</div>';
}

// Renders URLScan technologies, subdomains, and recent scan metadata
function renderUrlscan(data) {
  return ''
    + section('Technologies', 'fingerprints the stack — frameworks, CDN, analytics, security tools')
    + tags(data.technologies)
    + section('Subdomains Seen', 'domains captured during live browser-based scans')
    + tags(data.subdomains)
    + section('Recent Scans', 'what the site exposed at scan time')
    + '<div class="url-list">' + urlList(data.scans, function (scan) {
        return scan.url + ' <span style="color:var(--text-dim)">[' + (scan.server || '') + ']</span>';
      }) + '</div>';
}

// Renders archived or crawled URLs from Wayback Machine or CommonCrawl
function renderUrls(data, source) {
  let allHint = '';
  if (source === 'Wayback Machine') {
    allHint = 'full historical endpoint map';
  } else {
    allHint = 'publicly crawled pages';
  }

  let interestingHtml = '';
  if (data.interesting && data.interesting.length) {
    interestingHtml = ''
      + section('Interesting Paths', 'admin panels, API endpoints, backup files — may still be live')
      + '<div class="url-list">' + urlList(data.interesting, function (urlEntry) {
          let urlText = '';
          if (typeof urlEntry === 'string') {
            urlText = urlEntry;
          } else {
            urlText = urlEntry.url;
          }
          return urlText;
        }, 'interesting') + '</div>';
  }

  const visibleUrls = (data.urls || []).slice(0, 100);

  return ''
    + row('URLs indexed', data.count + ' <span class="count-badge">' + source + '</span>')
    + interestingHtml
    + section('All URLs', allHint)
    + '<div class="url-list">' + urlList(visibleUrls, function (urlEntry) {
        let urlText = '';
        if (typeof urlEntry === 'string') {
          urlText = urlEntry;
        } else {
          urlText = urlEntry.url;
        }
        return urlText;
      }) + '</div>';
}

// Renders Shodan InternetDB data — open ports, CVEs, hostnames per IP
function renderInternetdb(data) {
  if (!data.results || !data.results.length) {
    return '<span class="empty">No IPs resolved</span>';
  }

  const divider = '<div style="margin-top:8px;border-top:1px solid var(--border)"></div>';

  const blocks = [];
  for (const ipResult of data.results) {
    let vulnsHtml = '';
    if (ipResult.vulns.length) {
      vulnsHtml = '<span style="color:var(--error)">' + ipResult.vulns.join(', ') + '</span>';
    } else {
      vulnsHtml = '<span style="color:var(--ok)">None known</span>';
    }

    let hostnamesHtml = '';
    if (ipResult.hostnames.length) {
      hostnamesHtml = section('Hostnames') + tags(ipResult.hostnames);
    }

    let openPorts = '';
    if (ipResult.ports.length) {
      openPorts = ipResult.ports.join(', ');
    } else {
      openPorts = '—';
    }

    let tagsRow = '';
    if (ipResult.tags.length) {
      tagsRow = row('Tags', ipResult.tags.join(', '));
    }

    blocks.push(''
      + section(ipResult.ip)
      + row('Open Ports', openPorts, 'detected by Shodan pre-scan')
      + row('CVEs', vulnsHtml, 'known vulnerabilities associated with this IP')
      + tagsRow
      + hostnamesHtml
    );
  }

  return blocks.join(divider);
}

// Renders IPInfo data — org, location, and hostname per IP
function renderIpinfo(data) {
  if (!data.results || !data.results.length) {
    return '<span class="empty">No IPs resolved</span>';
  }

  const divider = '<div style="margin-top:8px;border-top:1px solid var(--border)"></div>';

  const blocks = [];
  for (const ipResult of data.results) {
    const locationParts = [];
    if (ipResult.city)    locationParts.push(ipResult.city);
    if (ipResult.region)  locationParts.push(ipResult.region);
    if (ipResult.country) locationParts.push(ipResult.country);
    const location = locationParts.join(', ') || '—';

    let hostnameRow = '';
    if (ipResult.hostname) {
      hostnameRow = row('Hostname', ipResult.hostname);
    }

    blocks.push(''
      + section(ipResult.ip)
      + row('Org',      ipResult.org || '—', 'hosting provider or ISP')
      + row('Location', location)
      + hostnameRow
    );
  }

  return blocks.join(divider);
}

// Renders the Surface Summary pipeline — live hosts with enrichment, plus all subdomains
export function renderPipeline(subdomains, live) {
  const header = ''
    + '<div class="pipeline-header">'
    +   '<span class="pipeline-title">Surface Summary</span>'
    +   '<span class="pipeline-counts">' + subdomains.count + ' subdomains · ' + live.count + ' live</span>'
    + '</div>';

  let liveHtml = '';
  if (live.count > 0) {
    const hostParts = [];
    for (const host of live.hosts) {
      const ipParts = [];
      for (const ipEntry of host.ips) {
        let cdnBadge = '';
        if (isCDN(ipEntry.org)) {
          cdnBadge = '<span class="cdn-badge">CDN</span>';
        }

        let orgText = '';
        if (ipEntry.org) {
          orgText = ipEntry.org;
          if (ipEntry.city)       orgText += ', ' + ipEntry.city;
          if (ipEntry.country)    orgText += ', ' + ipEntry.country;
          if (isCDN(ipEntry.org)) orgText += ' — origin masked';
        }

        let orgHtml = '';
        if (orgText) {
          orgHtml = '<span class="host-meta">' + orgText + '</span>';
        }

        let portsHtml = '';
        if (ipEntry.ports.length) {
          portsHtml = '<div class="host-detail">Ports: <span class="host-ports">' + ipEntry.ports.join(', ') + '</span></div>';
        }

        let vulnsHtml = '';
        if (ipEntry.vulns.length) {
          vulnsHtml = '<div class="host-detail">CVEs: <span style="color:var(--error)">' + ipEntry.vulns.join(', ') + '</span></div>';
        }

        ipParts.push(''
          + '<div class="host-ip-row">'
          +   '<span class="host-ip">' + ipEntry.ip + '</span>'
          +   cdnBadge
          +   orgHtml
          + '</div>'
          + portsHtml
          + vulnsHtml
        );
      }

      hostParts.push('<div class="host-block"><div class="host-name">' + host.subdomain + '</div>' + ipParts.join('') + '</div>');
    }

    liveHtml = section('Live Hosts', 'confirmed DNS — enriched with location, ports, and CVEs') + hostParts.join('');
  } else {
    liveHtml = '<div class="empty" style="margin-top:8px">No live hosts confirmed</div>';
  }

  let allHtml = '';
  if (subdomains.count > 0) {
    allHtml = section('All Subdomains', 'deduplicated across all sources')
      + '<div class="url-list">' + urlList(subdomains.all, function (subdomain) { return subdomain; }) + '</div>';
  }

  return header + liveHtml + allHtml;
}
