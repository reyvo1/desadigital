// scripts/uat-full.mjs
// End-to-end UAT + light stress simulation against a running server.
const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';
let failures = 0;

function ok(cond, msg) {
  if (!cond) { failures++; console.error('FAIL:', msg); }
  else console.log('PASS:', msg);
}

async function j(res) { try { return await res.json(); } catch { return {}; } }

async function main() {
  // 1. Health
  let res = await fetch(`${BASE}/api/health`);
  let data = await j(res);
  ok(res.ok && data.status === 'ok', 'health');

  // 2. Admin login
  res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'desa2026' }),
  });
  data = await j(res);
  const adminToken = data.token;
  ok(res.ok && adminToken, 'admin login');

  // 3. Citizen OTP login
  const nik = '3201100000000000';
  res = await fetch(`${BASE}/api/citizen/otp/request`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nik }),
  });
  data = await j(res);
  const otp = data.otp;
  ok(res.ok && otp, 'citizen otp request');

  res = await fetch(`${BASE}/api/citizen/otp/verify`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nik, otp }),
  });
  data = await j(res);
  const citizenToken = data.token;
  ok(res.ok && citizenToken, 'citizen otp verify');

  // 4. Citizen family-member add
  const newNik = '3201' + String(Date.now()).slice(-12);
  res = await fetch(`${BASE}/api/citizen/family-member`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${citizenToken}` },
    body: JSON.stringify({ nik: newNik, name: 'UAT Anggota' }),
  });
  data = await j(res);
  ok(res.ok, 'citizen family-member add');

  // 5. SaaS billing overview
  res = await fetch(`${BASE}/api/saas/billing`);
  data = await j(res);
  ok(res.ok && Array.isArray(data.plans) && data.plans.length > 0, 'saas billing overview');

  // 6. SaaS invoice pay (platform admin)
  const invId = 'inv-2026-004';
  res = await fetch(`${BASE}/api/saas/invoices/${invId}/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ sp2dNumber: 'SP2D-UAT', paymentChannel: 'UAT', verifiedBy: 'UAT' }),
  });
  data = await j(res);
  ok(res.ok, 'saas invoice pay');

  // 7. AI chat (monthly quota)
  res = await fetch(`${BASE}/api/ai/chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'Halo' }),
  });
  data = await j(res);
  ok(res.ok && data.reply, 'ai chat');

  // 8. Stress: concurrent health + ai chat
  const stressN = 20;
  const tasks = [];
  for (let i = 0; i < stressN; i++) {
    tasks.push(fetch(`${BASE}/api/health`).then((r) => r.ok));
    tasks.push(fetch(`${BASE}/api/ai/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'stress' }),
    }).then((r) => r.status === 200 || r.status === 429));
  }
  const results = await Promise.all(tasks);
  ok(results.every(Boolean), `stress ${stressN * 2} requests`);

  console.log(`\nUAT done. Failures: ${failures}`);
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });