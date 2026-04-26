const API_BASE = location.hostname === 'webweavr.christianherrera.dev'
  ? 'https://api.webweavr.christianherrera.dev'
  : '';

const input = document.getElementById('domain-input');
const btn = document.getElementById('scan-btn');
const progress = document.getElementById('progress');
const progressFill = document.getElementById('progress-fill');
const progressLabel = document.getElementById('progress-label');
const results = document.getElementById('results');

let totalModules = 0;
let completed = 0;

const MODULE_META = {
  whois:       { label: 'WHOIS / RDAP',  source: 'RDAP / IANA',           desc: 'Registrar, registration date, expiry, and nameservers — who registered it and when' },
  dns:         { label: 'DNS Records',   source: 'Cloudflare DoH',        desc: 'A, MX, TXT, NS, and CNAME records — IPs they resolve to, mail providers, SPF/DKIM config' },
  bgp:         { label: 'BGP / ASN',     source: 'bgp.he.net',            desc: 'Autonomous system numbers and IP prefixes — which ISPs and data centers host them' },
  ipinfo:      { label: 'IPInfo',        source: 'ipinfo.io',             desc: 'ASN, org, and location for each IP — confirms which ranges belong to the target' },
  internetdb:  { label: 'InternetDB',    source: 'internetdb.shodan.io',  desc: 'Open ports, services, and CVEs for resolved IPs — pre-scanned by Shodan, no active probing' },
  crtsh:       { label: 'crt.sh',        source: 'crt.sh',                desc: 'Every subdomain that has ever appeared in a public TLS certificate — nothing gets deleted' },
  certspotter: { label: 'CertSpotter',   source: 'certspotter.com',       desc: 'Independent CT index — catches certs that crt.sh sometimes misses' },
  anubis:      { label: 'Anubis',        source: 'jonlu.ca',              desc: 'Lightweight CT aggregator — returns results when other sources are down' },
  wayback:     { label: 'Wayback',       source: 'web.archive.org',       desc: 'Archived URLs — old endpoints, admin paths, APIs, and files that may no longer be visible' },
  commoncrawl: { label: 'CommonCrawl',   source: 'index.commoncrawl.org', desc: 'Web crawl index — publicly linked pages and paths discovered by crawlers' },
  urlscan:     { label: 'URLScan',       source: 'urlscan.io',            desc: 'Browser-based scans — detected technologies, CDN, server headers, and what the site exposed' },
};

const CDN_ORGS = [
  'cloudflare', 'fastly', 'akamai', 'sucuri', 'incapsula', 'imperva',
  'cloudfront', 'amazon', 'google', 'microsoft', 'azure', 'vercel',
  'netlify', 'stackpath', 'limelight', 'edgio', 'bunny', 'cdn77', 'keycdn'
];

btn.addEventListener('click', startScan);
input.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') {
    startScan();
  }
});

async function startScan() {
  const domain = input.value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (!domain) {
    return;
  }

  input.value = domain;
  results.innerHTML = '';
  completed = 0;
  totalModules = 0;
  progressFill.style.width = '0%';
  progress.classList.remove('hidden');
  btn.disabled = true;

  const groupsStarted = new Set();
  const handlers = {
    start: function (payload) {
      totalModules = payload.total;
      progressLabel.textContent = 'Scanning ' + payload.domain + '…';
      const intro = document.createElement('p');
      intro.className = 'scan-intro';
      const introLabel = document.createTextNode('Scanning ');
      const introDomain = document.createElement('span');
      introDomain.className = 'scan-domain';
      introDomain.textContent = payload.domain;
      intro.appendChild(introLabel);
      intro.appendChild(introDomain);

      const pipeline = document.createElement('div');
      pipeline.id = 'pipeline-section';
      pipeline.className = 'pipeline-section hidden';

      results.innerHTML = '';
      results.appendChild(intro);
      results.appendChild(pipeline);
    },
    module_start: function (payload) {
      if (!groupsStarted.has(payload.group)) {
        groupsStarted.add(payload.group);
        appendGroupHeader(payload.group, payload.groupLabel);
      }
      appendCard(payload.id, 'loading', null);
    },
    module_done: function (payload) {
      completed++;
      updateProgress();
      updateCard(payload.id, 'done', payload.data);
    },
    module_error: function (payload) {
      completed++;
      updateProgress();
      updateCard(payload.id, 'error', { error: payload.error });
    },
    pipeline_start: function () {
      const el = document.getElementById('pipeline-section');
      el.classList.remove('hidden');
      el.innerHTML = '<div class="pipeline-header"><span class="pipeline-title">Surface Summary</span><span class="pipeline-status">Resolving…</span></div>';
      progressLabel.textContent = 'Resolving subdomains…';
    },
    pipeline_done: function (payload) {
      const el = document.getElementById('pipeline-section');
      if (el) {
        el.innerHTML = renderPipeline(payload.subdomains, payload.live);
      }
    },
    complete: function () {
      progressFill.style.width = '100%';
      progressLabel.textContent = 'Scan complete.';
    }
  };

  try {
    const res = await fetch(API_BASE + '/api/recon?domain=' + encodeURIComponent(domain));

    if (res.status === 429) {
      progressLabel.textContent = 'Rate limit reached. Try again in 15 minutes.';
      btn.disabled = false;
      return;
    }

    if (!res.ok) {
      progressLabel.textContent = 'Server error (' + res.status + ').';
      btn.disabled = false;
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });

      let boundary;
      while ((boundary = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);

        let eventName = 'message';
        let dataLine = '';
        block.split('\n').forEach(function (line) {
          if (line.startsWith('event:')) {
            eventName = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            dataLine += line.slice(5).trim();
          }
        });

        if (handlers[eventName]) {
          const payload = dataLine ? JSON.parse(dataLine) : null;
          handlers[eventName](payload);
        }
      }
    }
  } catch (err) {
    if (completed > 0) {
      progressLabel.textContent = 'Scan ended early — showing partial results (' + completed + ' modules completed).';
    } else {
      progressLabel.textContent = 'Connection error.';
    }
  } finally {
    btn.disabled = false;
  }
}

function updateProgress() {
  const pct = totalModules ? Math.round((completed / totalModules) * 100) : 0;
  progressFill.style.width = pct + '%';
}

function appendGroupHeader(id, label) {
  const el = document.createElement('div');
  el.className = 'group-header';
  el.id = 'group-' + id;
  el.textContent = label;
  results.appendChild(el);
}

function appendCard(id, status, data) {
  const meta = MODULE_META[id] || { label: id, source: '', desc: '' };
  const card = document.createElement('div');
  card.className = 'card status-' + status;
  card.id = 'card-' + id;
  card.innerHTML = ''
    + '<div class="card-header" onclick="toggleCard(\'' + id + '\')">'
    +   '<div class="card-header-left">'
    +     '<span class="card-title">' + meta.label + '</span>'
    +     '<span class="card-desc">' + meta.desc + '</span>'
    +   '</div>'
    +   '<div class="card-header-right">'
    +     '<span class="card-source">' + meta.source + '</span>'
    +     '<span class="card-status ' + status + '" id="status-' + id + '">' + statusText(status) + '</span>'
    +   '</div>'
    + '</div>'
    + '<div class="card-body collapsed" id="body-' + id + '">'
    +   renderBody(id, data)
    + '</div>';
  results.appendChild(card);
}

function updateCard(id, status, data) {
  const card = document.getElementById('card-' + id);
  const statusEl = document.getElementById('status-' + id);
  const bodyEl = document.getElementById('body-' + id);
  if (card) {
    card.className = 'card status-' + status;
  }
  if (statusEl) {
    statusEl.className = 'card-status ' + status;
    statusEl.textContent = statusText(status);
  }
  if (bodyEl) {
    bodyEl.innerHTML = renderBody(id, data);
    bodyEl.classList.remove('collapsed');
  }
}

function toggleCard(id) {
  document.getElementById('body-' + id).classList.toggle('collapsed');
}

function statusText(s) {
  if (s === 'loading') { return 'Running…'; }
  if (s === 'done')    { return 'Done'; }
  if (s === 'error')   { return 'Provider Down'; }
  return '';
}

function isCDN(org) {
  if (!org) {
    return false;
  }
  const lower = org.toLowerCase();
  return CDN_ORGS.some(function (cdn) { return lower.includes(cdn); });
}

function row(label, value, hint) {
  const hintHtml = hint ? '<span class="row-hint">' + hint + '</span>' : '';
  const valueHtml = value || '<span class="empty">—</span>';
  return '<div class="row"><span class="label">' + label + hintHtml + '</span><span class="value">' + valueHtml + '</span></div>';
}

function section(title, hint) {
  const hintHtml = hint ? '<span class="section-hint">' + hint + '</span>' : '';
  return '<div class="section-label">' + title + hintHtml + '</div>';
}

function tags(arr, cls) {
  const className = cls || '';
  if (!arr || !arr.length) {
    return '<span class="empty">None found</span>';
  }
  return arr.map(function (v) {
    return '<span class="tag ' + className + '">' + v + '</span>';
  }).join('');
}

function urlList(items, keyFn, cls) {
  const className = cls || '';
  if (!items || !items.length) {
    return '<div class="empty">None found</div>';
  }
  return items.map(function (i) {
    return '<div class="url-item ' + className + '">' + keyFn(i) + '</div>';
  }).join('');
}

function renderBody(id, data) {
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
  if (id === 'anubis')      { return renderSubdomains(data, 'Anubis',      'aggregated CT data — useful redundancy source'); }
  if (id === 'urlscan')     { return renderUrlscan(data); }
  if (id === 'wayback')     { return renderUrls(data, 'Wayback Machine'); }
  if (id === 'commoncrawl') { return renderUrls(data, 'CommonCrawl'); }
  if (id === 'internetdb')  { return renderInternetdb(data); }
  if (id === 'ipinfo')      { return renderIpinfo(data); }
  return '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
}

function renderWhois(d) {
  const registered = d.registered ? new Date(d.registered).toLocaleDateString() : null;
  const updated    = d.updated    ? new Date(d.updated).toLocaleDateString()    : null;
  const expiry     = d.expiry     ? new Date(d.expiry).toLocaleDateString()     : null;
  return ''
    + row('Registrar',  d.registrar, 'privacy proxy = harder to attribute')
    + row('Registered', registered,  'newly registered domains are higher risk')
    + row('Updated',    updated,     'recent changes may signal infra shift')
    + row('Expires',    expiry,      'expiring soon = potential takeover risk')
    + section('Nameservers', 'reveals DNS provider — Cloudflare, Route53, self-hosted')
    + tags(d.nameservers)
    + section('Status')
    + tags(d.status);
}

function renderDns(d) {
  function fmt(records) {
    if (!records || !records.length) {
      return '<span class="empty">None</span>';
    }
    return records.map(function (r) {
      return '<span class="tag">' + r.value + '</span>';
    }).join('');
  }
  return ''
    + section('A Records',    'direct server IPs — identifies hosting provider or CDN') + fmt(d.A)
    + section('AAAA Records', 'IPv6 — indicates modern infra or dual-stack')            + fmt(d.AAAA)
    + section('MX Records',   'email provider — Google, Microsoft, Proofpoint')         + fmt(d.MX)
    + section('NS Records',   'who controls DNS — changes here can redirect everything')+ fmt(d.NS)
    + section('TXT Records',  'SPF/DKIM/DMARC config, domain verification tokens')     + fmt(d.TXT)
    + section('CNAME Records','aliases to third-party services — check for takeover')   + fmt(d.CNAME);
}

function renderBgp(d) {
  const sourceLink = d.source
    ? '<div style="margin-top:10px">' + row('Source', '<a href="' + d.source + '" target="_blank" style="color:var(--accent)">' + d.source + '</a>') + '</div>'
    : '';
  return ''
    + section('ASNs',       'autonomous system — identifies the hosting org or ISP') + tags(d.asns)
    + section('IP Prefixes','routed IP ranges — useful for scoping network exposure') + tags(d.prefixes)
    + sourceLink;
}

function renderSubdomains(d, source, hint) {
  const noteHtml = d.note ? '<div class="empty" style="margin-top:6px">' + d.note + '</div>' : '';
  return ''
    + row('Found', d.count + ' <span class="count-badge">' + source + '</span>')
    + noteHtml
    + section('Subdomains', hint)
    + '<div class="url-list">' + urlList(d.subdomains, function (s) { return s; }) + '</div>';
}

function renderUrlscan(d) {
  return ''
    + section('Technologies', 'fingerprints the stack — frameworks, CDN, analytics, security tools')
    + tags(d.technologies)
    + section('Subdomains Seen', 'domains captured during live browser-based scans')
    + tags(d.subdomains)
    + section('Recent Scans', 'what the site exposed at scan time')
    + '<div class="url-list">' + urlList(d.scans, function (s) {
        return s.url + ' <span style="color:var(--text-dim)">[' + (s.server || '') + ']</span>';
      }) + '</div>';
}

function renderUrls(d, source) {
  const allHint = source === 'Wayback Machine' ? 'full historical endpoint map' : 'publicly crawled pages';
  const interestingHtml = (d.interesting && d.interesting.length) ? ''
    + section('Interesting Paths', 'admin panels, API endpoints, backup files — may still be live')
    + '<div class="url-list">' + urlList(d.interesting, function (u) { return typeof u === 'string' ? u : u.url; }, 'interesting') + '</div>'
    : '';
  return ''
    + row('URLs indexed', d.count + ' <span class="count-badge">' + source + '</span>')
    + interestingHtml
    + section('All URLs', allHint)
    + '<div class="url-list">' + urlList((d.urls || []).slice(0, 100), function (u) { return typeof u === 'string' ? u : u.url; }) + '</div>';
}

function renderInternetdb(d) {
  if (!d.results || !d.results.length) {
    return '<span class="empty">No IPs resolved</span>';
  }
  const divider = '<div style="margin-top:8px;border-top:1px solid var(--border)"></div>';
  return d.results.map(function (r) {
    const vulnsHtml = r.vulns.length
      ? '<span style="color:var(--error)">' + r.vulns.join(', ') + '</span>'
      : '<span style="color:var(--ok)">None known</span>';
    const hostnamesHtml = r.hostnames.length
      ? section('Hostnames') + tags(r.hostnames)
      : '';
    return ''
      + section(r.ip)
      + row('Open Ports', r.ports.length ? r.ports.join(', ') : '—', 'detected by Shodan pre-scan')
      + row('CVEs', vulnsHtml, 'known vulnerabilities associated with this IP')
      + (r.tags.length ? row('Tags', r.tags.join(', ')) : '')
      + hostnamesHtml;
  }).join(divider);
}

function renderIpinfo(d) {
  if (!d.results || !d.results.length) {
    return '<span class="empty">No IPs resolved</span>';
  }
  const divider = '<div style="margin-top:8px;border-top:1px solid var(--border)"></div>';
  return d.results.map(function (r) {
    const location = [r.city, r.region, r.country].filter(Boolean).join(', ') || '—';
    return ''
      + section(r.ip)
      + row('Org',      r.org || '—', 'hosting provider or ISP')
      + row('Location', location)
      + (r.hostname ? row('Hostname', r.hostname) : '');
  }).join(divider);
}

function renderPipeline(subdomains, live) {
  const header = ''
    + '<div class="pipeline-header">'
    +   '<span class="pipeline-title">Surface Summary</span>'
    +   '<span class="pipeline-counts">' + subdomains.count + ' subdomains · ' + live.count + ' live</span>'
    + '</div>';

  const liveHtml = live.count > 0
    ? section('Live Hosts', 'confirmed DNS — enriched with location, ports, and CVEs')
      + live.hosts.map(function (h) {
          const ipsHtml = h.ips.map(function (ip) {
            const cdnBadge = isCDN(ip.org) ? '<span class="cdn-badge">CDN</span>' : '';
            const orgText  = ip.org
              ? ip.org + (ip.city ? ', ' + ip.city : '') + (ip.country ? ', ' + ip.country : '') + (isCDN(ip.org) ? ' — origin masked' : '')
              : '';
            const orgHtml    = orgText ? '<span class="host-meta">' + orgText + '</span>' : '';
            const portsHtml  = ip.ports.length ? '<div class="host-detail">Ports: <span class="host-ports">' + ip.ports.join(', ') + '</span></div>' : '';
            const vulnsHtml  = ip.vulns.length ? '<div class="host-detail">CVEs: <span style="color:var(--error)">' + ip.vulns.join(', ') + '</span></div>' : '';
            return ''
              + '<div class="host-ip-row">'
              +   '<span class="host-ip">' + ip.ip + '</span>'
              +   cdnBadge
              +   orgHtml
              + '</div>'
              + portsHtml
              + vulnsHtml;
          }).join('');
          return '<div class="host-block"><div class="host-name">' + h.subdomain + '</div>' + ipsHtml + '</div>';
        }).join('')
    : '<div class="empty" style="margin-top:8px">No live hosts confirmed</div>';

  const allHtml = subdomains.count > 0
    ? section('All Subdomains', 'deduplicated across all sources')
      + '<div class="url-list">' + urlList(subdomains.all, function (s) { return s; }) + '</div>'
    : '';

  return header + liveHtml + allHtml;
}
