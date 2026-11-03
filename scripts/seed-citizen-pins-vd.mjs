import { Pool } from 'pg';
import crypto from 'node:crypto';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

const res = await pool.query('SELECT data FROM village_database WHERE id=1');
const db = res.rows[0].data;
let updated = 0;
for (const c of db.citizens || []) {
  if (!c.passwordHash) {
    c.passwordHash = hashPassword((c.nik || '').slice(-4) || '1234');
    updated++;
  }
}
await pool.query('UPDATE village_database SET data=$1, updated_at=NOW() WHERE id=1', [db]);
console.log('Updated village_database citizens with passwordHash:', updated);
await pool.end();
