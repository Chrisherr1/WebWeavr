import { findScans } from '../repositories/scansRepository.js';

export async function getScans(req, res) {
  const { ip, domain } = req.query;
  const rows = await findScans({ ip, domain });
  res.json(rows);
}
