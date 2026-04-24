import pool from '../config/db.js';

export async function logScan(ip, domain, status) {
  await pool.execute(
    'INSERT INTO scans (ip, domain, status) VALUES (?, ?, ?)',
    [ip, domain, status]
  );
}
