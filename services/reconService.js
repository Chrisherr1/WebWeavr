import { GROUPS, ALL_MODULES } from '../config/modules.js';
import { aggregate } from '../pipeline/aggregate.js';
import { resolve } from '../pipeline/resolve.js';
import { enrich } from '../pipeline/enrich.js';



/*
  runScan is the main function that orchestrates the execution of all recon modules for a given domain.
  It takes a domain and sends a series of events back to the caller to update the UI on the progress of the scan.
  The function first sends a 'start' event with the total number of modules and groups.
  Then it runs all modules in parallel using Promise.allSettled, sending 'module_start', 'module_done', and 'module_error' events as each module executes.
  After all modules have completed, it sends a 'pipeline_start' event, aggregates the results to find all unique subdomains, resolves which ones are live, enriches the live hosts with additional data, and finally sends a 'pipeline_done' event with the final results before sending a 'complete' event.

*/
export async function runScan(domain, send) {
  const groups = GROUPS.map(function (g) {
    return { id: g.id, label: g.label, total: g.modules.length };
  });

  send('start', { domain: domain, total: ALL_MODULES.length, groups: groups });

  const moduleResults = {};

  // we use Promise.allSettled to run all modules in parallel and wait for them to complete, regardless of success or failure
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
