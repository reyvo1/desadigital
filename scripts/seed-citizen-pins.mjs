import { Pool } from 'pg';
import crypto from 'node:crypto';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

const res = await pool.query('SELECT data FROM citizens');
let updated = 0;
for (const row of res.rows) {
  const c = row.data;
  if (!c.passwordHash) {
    const pin = (c.nik || '').slice(-4) || '1234';
    c.passwordHash = hashPassword(pin);
    await pool.query('UPDATE citizens SET data=$1 WHERE nik=$2', [c, c.nik]);
    updated++;
  }
}
console.log('Updated citizens with passwordHash:', updated);
await pool.end();
