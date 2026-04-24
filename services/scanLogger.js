import { insertScan } from '../repositories/scansRepository.js';

export async function logScan(ip, domain, status) {
  await insertScan(ip, domain, status);
}
