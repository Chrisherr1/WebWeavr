import { GROUPS, ALL_MODULES } from '../config/modules.js';
import { aggregate } from '../pipeline/aggregate.js';
import { resolve } from '../pipeline/resolve.js';
import { enrich } from '../pipeline/enrich.js';

const MODULE_TIMEOUT_MS = 15000;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise(function (_, reject) {
      setTimeout(function () {
        reject(new Error('Module timed out after ' + ms + 'ms'));
      }, ms);
    })
  ]);
}

// send() is an SSE helper — each call pushes a named event to the client
export async function runScan(domain, send, signal) {
  const groups = GROUPS.map(function (g) {
    return { id: g.id, label: g.label, total: g.modules.length };
  });

  send('start', { domain: domain, total: ALL_MODULES.length, groups: groups });

  const moduleResults = {};

  for (const mod of ALL_MODULES) {
    if (signal && signal.aborted) {
      break;
    }
    send('module_start', { id: mod.id, label: mod.label, group: mod.group, groupLabel: mod.groupLabel });

    try {
      const result = await withTimeout(mod.fn(domain), MODULE_TIMEOUT_MS);
      moduleResults[mod.id] = result;
      send('module_done', { id: mod.id, label: mod.label, group: mod.group, groupLabel: mod.groupLabel, data: result });
    } catch (err) {
      send('module_error', { id: mod.id, label: mod.label, group: mod.group, groupLabel: mod.groupLabel, error: err.message });
    }
  }

  if (signal && signal.aborted) {
    return;
  }

  send('pipeline_start', { domain: domain });
  const allSubdomains = aggregate(moduleResults, domain);
  const liveHosts = await resolve(allSubdomains);
  const enriched = await enrich(liveHosts, moduleResults);

  if (signal && signal.aborted) {
    return;
  }

  send('pipeline_done', {
    subdomains: { all: allSubdomains, count: allSubdomains.length },
    live: { hosts: enriched, count: enriched.length }
  });

  send('complete', { domain: domain });
}
