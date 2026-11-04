// scripts/security-prod.mjs
import 'dotenv/config';
import { spawn } from 'node:child_process';
const PORT = process.env.PROD_PORT || '3010';
const BASE = `http://127.0.0.1:${PORT}`;
const nik = process.env.TEST_CITIZEN_NIK || '3201100000000000';

const env = {
  ...process.env,
  NODE_ENV: process.env.FORCE_DEV === '1' ? 'development' : 'production',
  PORT,
  APP_URL: `http://127.0.0.1:${PORT}`,
};

const server = spawn('npm', ['run', 'dev'], { env, stdio: 'pipe', shell: true });
let ready = false;
for (let i = 0; i < 60; i++) {
  await new Promise((r) => setTimeout(r, 1000));
  try {
    const res = await fetch(`${BASE}/api/health`);
    if (res.ok) { ready = true; break; }
  } catch {}
}
if (!ready) {
  server.kill();
  console.error('[FAIL] production server did not start');
  process.exit(1);
}

let exitCode = 0;
try {
  const res = await fetch(`${BASE}/api/citizen/otp/request`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nik }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 200 && Object.prototype.hasOwnProperty.call(data, 'otp')) {
    console.error('[FAIL] OTP field leaked in production response');
    exitCode = 1;
  } else if (res.status === 200) {
    console.log('[OK] OTP not leaked in production response');
  } else {
    console.error(`[FAIL] unexpected status ${res.status}`);
    exitCode = 1;
  }
} catch (e) {
  console.error('[FAIL]', e.message);
  exitCode = 1;
}

server.kill();
process.exit(exitCode);