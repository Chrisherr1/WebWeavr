import { GROUPS, ALL_MODULES } from '../config/modules.js';
import { aggregate } from '../pipeline/aggregate.js';
import { resolve } from '../pipeline/resolve.js';
import { enrich } from '../pipeline/enrich.js';



// send() is an SSE helper — each call pushes a named event to the client
export async function runScan(domain, send) {
  const groups = GROUPS.map(function (g) {
    return { id: g.id, label: g.label, total: g.modules.length };
  });

  send('start', { domain: domain, total: ALL_MODULES.length, groups: groups });

  const moduleResults = {};

  await Promise.allSettled(

    ALL_MODULES.map(async function (mod) {
      send('module_start', { id: mod.id, label: mod.label, group: mod.group, groupLabel: mod.groupLabel });

      try {
        const result = await mod.fn(domain);
        moduleResults[mod.id] = result;
        send('module_done', { id: mod.id, label: mod.label, group: mod.group, groupLabel: mod.groupLabel, data: result });
      } catch (err) {
        send('module_error', { id: mod.id, label: mod.label, group: mod.group, groupLabel: mod.groupLabel, error: err.message });
      }
    })
  );

  send('pipeline_start', { domain: domain });
  const allSubdomains = aggregate(moduleResults, domain);
  const liveHosts = await resolve(allSubdomains);
  const enriched = await enrich(liveHosts, moduleResults);

  send('pipeline_done', {
    subdomains: { all: allSubdomains, count: allSubdomains.length },
    live: { hosts: enriched, count: enriched.length }
  });

  send('complete', { domain: domain });
}
