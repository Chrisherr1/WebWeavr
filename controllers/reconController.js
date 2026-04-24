import { isValidDomain } from '../utils/domain.js';
import { createSender } from '../utils/sse.js';
import { runScan } from '../services/reconService.js';


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

  try {
    await runScan(domain, send);
  } catch (err) {
    send('error', { error: err.message });
  }

  res.end();
}
