import { isValidDomain } from '../utils/domain.js';
import { createSender } from '../utils/sse.js';
import { runScan } from '../services/reconService.js';
import { logScan } from '../services/scanLogger.js';

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
  const controller = new AbortController();

  req.on('close', function () {
    controller.abort();
  });

  try {
    await runScan(domain, send, controller.signal);
    if (controller.signal.aborted) {
      await logScan(ip, domain, 'aborted');
    } else {
      await logScan(ip, domain, 'completed');
    }
  } catch (err) {
    send('error', { error: err.message });
    await logScan(ip, domain, 'errored');
  }

  res.end();
}
