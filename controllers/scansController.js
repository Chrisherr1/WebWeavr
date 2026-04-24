import pool from '../config/db.js';

export async function getScans(req, res) {
  const { ip, domain } = req.query;

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
  res.json(rows);
}
