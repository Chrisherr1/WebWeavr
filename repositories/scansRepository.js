import pool from '../config/db.js';

export async function insertScan(ip, domain, status) {
  await pool.execute(
    'INSERT INTO scans (ip, domain, status) VALUES (?, ?, ?)',
    [ip, domain, status]
  );
}
