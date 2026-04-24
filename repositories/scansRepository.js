import pool from '../config/db.js';

export async function insertScan(ip, domain, status) {
  await pool.execute(
    'INSERT INTO scans (ip, domain, status) VALUES (?, ?, ?)',
    [ip, domain, status]
  );
}

export async function findScans({ ip, domain }) {
  let query = 'SELECT * FROM scans';
  
  const params = [];
  const conditions = [];

  if (ip) {
    conditions.push('ip = ?');
    params.push(ip);
  }

  if (domain) {
    conditions.push('domain = ?');
    params.push(domain);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY created_at DESC LIMIT 500';

  const [rows] = await pool.execute(query, params);
  return rows;
}
