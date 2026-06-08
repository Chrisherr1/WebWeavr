import { API_BASE, MODULE_META, setTotalModules, setCompleted, setScanData, setScanDomain, setScanDataKey, incrementCompleted, scanData, scanDomain, completed, totalModules } from './state.js';
import { statusText } from './helpers.js';
import { renderBody, renderPipeline } from './render.js';
import { buildExportPayload, downloadJson } from './export.js';

// DOM references — elements that are read or updated throughout the scan lifecycle
const input         = document.getElementById('domain-input');
const btn           = document.getElementById('scan-btn');
const progress      = document.getElementById('progress');
const progressFill  = document.getElementById('progress-fill');
const progressLabel = document.getElementById('progress-label');
const results       = document.getElementById('results');
const exportBar     = document.getElementById('export-bar');
const exportBtn     = document.getElementById('export-btn');

exportBtn.addEventListener('click', function () {
  const output = buildExportPayload(scanData);
  downloadJson(output, scanDomain + '-recon.json');
});

btn.addEventListener('click', startScan);
input.addEventListener('keydown', function (event) {
  if (event.key === 'Enter') {
    startScan();
  }
});

// Exposed on window so the inline onclick in appendCard can call it from HTML
window.toggleCard = toggleCard;

// Entry point — triggered when the user clicks Scan or presses Enter
async function startScan() {
  const domain = normalizeDomain(input.value);
  if (!domain) {
    return;
  }

  input.value = domain;
  resetScanUi(domain);

  // Tracks which group headers have already been rendered so we don't duplicate them
  const groupsStarted = new Set();

  const handlers = {
    start: function (payload) {
      setTotalModules(payload.total);
      progressLabel.textContent = 'Scanning ' + payload.domain + '…';

      const intro = document.createElement('p');
      intro.className = 'scan-intro';

      const introLabel  = document.createTextNode('Scanning ');
      const introDomain = document.createElement('span');
      introDomain.className   = 'scan-domain';
      introDomain.textContent = payload.domain;
      intro.appendChild(introLabel);
      intro.appendChild(introDomain);

      const pipeline = document.createElement('div');
      pipeline.id        = 'pipeline-section';
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
      incrementCompleted();
      updateProgress();
      updateCard(payload.id, 'done', payload.data);
      setScanDataKey(payload.id, payload.data);
    },

    module_error: function (payload) {
      incrementCompleted();
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
      exportBar.classList.remove('hidden');
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

    await readSseStream(res.body.getReader(), handlers);
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

// Strips protocol and path from whatever the user typed, returning a bare hostname
function normalizeDomain(raw) {
  let domain = raw.trim().toLowerCase();
  domain = domain.replace(/^https?:\/\//, '');
  domain = domain.replace(/\/.*$/, '');
  return domain;
}

// Resets all UI state back to a clean slate before a new scan starts
function resetScanUi(domain) {
  results.innerHTML = '';
  setCompleted(0);
  setTotalModules(0);
  setScanData({});
  setScanDomain(domain);
  exportBar.classList.add('hidden');
  progressFill.style.width = '0%';
  progress.classList.remove('hidden');
  btn.disabled = true;
}

// Reads the SSE response stream to completion, firing the matching handler for each event received
async function readSseStream(reader, handlers) {
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

      const { eventName, dataLine } = parseSseBlock(block);

      if (handlers[eventName]) {
        let payload = null;
        if (dataLine) {
          payload = JSON.parse(dataLine);
        }
        handlers[eventName](payload);
      }
    }
  }
}

// Parses a single SSE block (the text between two blank lines) into its event name and data string
function parseSseBlock(block) {
  let eventName = 'message';
  let dataLine  = '';

  const sseLines = block.split('\n');
  for (const sseLine of sseLines) {
    if (sseLine.startsWith('event:')) {
      eventName = sseLine.slice(6).trim();
    } else if (sseLine.startsWith('data:')) {
      dataLine += sseLine.slice(5).trim();
    }
  }

  return { eventName, dataLine };
}

// Renders a group header above a set of module cards
function appendGroupHeader(id, label) {
  const el = document.createElement('div');
  el.className   = 'group-header';
  el.id          = 'group-' + id;
  el.textContent = label;
  results.appendChild(el);
}

// Creates and appends a new module card in its initial loading state
function appendCard(id, status, data) {
  const meta = MODULE_META[id] || { label: id, source: '', desc: '' };
  const card = document.createElement('div');
  card.className = 'card status-' + status;
  card.id        = 'card-' + id;
  card.innerHTML = ''
    + '<div class="card-header" onclick="toggleCard(\'' + id + '\')">'
    +   '<div class="card-header-left">'
    +     '<span class="card-title">' + meta.label + '</span>'
    +     '<span class="card-desc">'  + meta.desc  + '</span>'
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

// Updates an existing card with its result data once the module completes or errors
function updateCard(id, status, data) {
  const card     = document.getElementById('card-'   + id);
  const statusEl = document.getElementById('status-' + id);
  const bodyEl   = document.getElementById('body-'   + id);
  if (card) {
    card.className = 'card status-' + status;
  }
  if (statusEl) {
    statusEl.className   = 'card-status ' + status;
    statusEl.textContent = statusText(status);
  }
  if (bodyEl) {
    bodyEl.innerHTML = renderBody(id, data);
    bodyEl.classList.remove('collapsed');
  }
}

// Updates the progress bar based on how many modules have completed
function updateProgress() {
  let pct = 0;
  if (totalModules) {
    pct = Math.round((completed / totalModules) * 100);
  }
  progressFill.style.width = pct + '%';
}

// Toggles a card body open or closed when the user clicks the card header
function toggleCard(id) {
  document.getElementById('body-' + id).classList.toggle('collapsed');
}
