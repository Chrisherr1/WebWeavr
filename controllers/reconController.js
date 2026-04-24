import { isValidDomain } from '../utils/domain.js';
import { createSender } from '../utils/sse.js';
import { runScan } from '../services/reconService.js';
import { logScan } from '../services/scanLogger.js';


/*
  Scans a domain for subdomains and other information.
 */

export async function scan(req, res) {
  const domain = req.query.domain;

  if (!domain || !isValidDomain(domain)) {
    return res.status(400).json({ error: 'Invalid domain.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = createSender(res);
  const ip = req.ip;

  try {
    await runScan(domain, send);
    await logScan(ip, domain, 'completed');
  } catch (err) {
    send('error', { error: err.message });
    await logScan(ip, domain, 'errored');
  }

  res.end();
}
