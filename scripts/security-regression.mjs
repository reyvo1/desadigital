import { spawn } from 'node:child_process';

const BASE_URL = process.env.SECURITY_URL || 'http://127.0.0.1:3000';

async function login(username, password, tenant) {
  const url = tenant ? `${BASE_URL}/api/auth/login?tenant=${tenant}` : `${BASE_URL}/api/auth/login`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error(`login ${username}/${tenant || 'default'} gagal: ${res.status}`);
  return (await res.json()).token;
}

async function check(label, fn) {
  try {
    await fn();
    console.log(`[OK] ${label}`);
  } catch (e) {
    console.error(`[FAIL] ${label}: ${e.message}`);
    process.exitCode = 1;
  }
}

async function main() {
  try {
    const pt = await login('admin', 'desa2026', null);
    await fetch(`${BASE_URL}/api/tenants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pt}` },
      body: JSON.stringify({ id: 'tenantb', slug: 'tenantb', name: 'Tenant B' }),
    });
  } catch {}

  const platformToken = await login('admin', 'desa2026', null);
  const tenantToken = await login('admin', 'desa2026', 'tenantb');
  const kadesToken = await login('kades', 'kades2026', null);
  const operatorToken = await login('pelayanan', 'layanan2026', null);

  const tiers = [
    { name: 'super_admin_platform', token: platformToken, tenant: null },
    { name: 'super_admin_tenantB', token: tenantToken, tenant: 'tenantb' },
    { name: 'kades', token: kadesToken, tenant: null },
    { name: 'operator', token: operatorToken, tenant: null },
    { name: 'warga', token: null, tenant: null },
    { name: 'anonim', token: null, tenant: null },
  ];

  const authHeaders = (t) => (t ? { Authorization: `Bearer ${t}` } : {});

  await check('Platform admin dapat akses /api/tenants', async () => {
    const res = await fetch(`${BASE_URL}/api/tenants`, { headers: authHeaders(platformToken) });
    if (res.status !== 200) throw new Error(`status ${res.status}`);
  });

  await check('Tenant admin ditolak /api/tenants', async () => {
    const res = await fetch(`${BASE_URL}/api/tenants?tenant=tenantb`, { headers: authHeaders(tenantToken) });
    if (res.status !== 403) throw new Error(`status ${res.status} (harus 403)`);
  });

  await check('Tenant admin akses tenant sendiri OK', async () => {
    const res = await fetch(`${BASE_URL}/api/db/backup?tenant=tenantb`, { headers: authHeaders(tenantToken) });
    if (res.status !== 200) throw new Error(`status ${res.status}`);
  });

  await check('Tenant admin cross-tenant (default) ditolak', async () => {
    const res = await fetch(`${BASE_URL}/api/db/backup`, { headers: authHeaders(tenantToken) });
    if (res.status !== 403) throw new Error(`status ${res.status} (harus 403)`);
  });

  await check('Tenant admin cross-tenant (query param) ditolak', async () => {
    const res = await fetch(`${BASE_URL}/api/db/backup?tenant=default`, { headers: authHeaders(tenantToken) });
    if (res.status !== 403) throw new Error(`status ${res.status} (harus 403)`);
  });

  for (const ep of ['/api/telegram/set-webhook','/api/integrations/telegram','/api/integrations/whatsapp','/api/telegram/ai-reply','/api/ai/draft']) {
    await check(`Anonim ${ep} -> 401`, async () => {
      const res = await fetch(`${BASE_URL}${ep}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      if (res.status !== 401) throw new Error(`status ${res.status} (harus 401)`);
    });
  }

  await check('POST /api/chat senderRole admin disimpan sebagai citizen', async () => {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'tes', senderRole: 'admin' }),
    });
    const data = await res.json();
    if (data.userMessage?.senderRole !== 'citizen') throw new Error(`senderRole=${data.userMessage?.senderRole}`);
  });

  await check('GET /api/chat publik -> 401', async () => {
    const res = await fetch(`${BASE_URL}/api/chat`);
    if (res.status !== 401) throw new Error(`status ${res.status} (harus 401)`);
  });

  await check('/api/public/track-letter tidak bocor nik/purpose', async () => {
    const res = await fetch(`${BASE_URL}/api/public/track-letter?code=NONEXISTENT`);
    const txt = await res.text();
    if (txt.includes('"nik"') || txt.includes('"purpose"')) throw new Error('bocor field sensitif');
  });

  const billingChecks = [
    { name: 'PUT /api/subscription', method: 'PUT', url: '/api/subscription', body: { plan: 'basic' } },
    { name: 'POST /api/payments/create', method: 'POST', url: '/api/payments/create', body: { plan: 'basic', amount: 1000 } },
    { name: 'PUT /api/sso', method: 'PUT', url: '/api/sso', body: { enabled: false } },
  ];
  for (const bc of billingChecks) {
    for (const t of tiers) {
      const expected = (t.name.startsWith('super_admin')) ? (bc.method === 'POST' ? 201 : 200) : 403;
      const exp = (t.token ? expected : 401);
      await check(`${bc.name} x ${t.name} -> ${exp}`, async () => {
        const res = await fetch(`${BASE_URL}${bc.url}${t.tenant ? '?tenant=' + t.tenant : ''}`, {
          method: bc.method,
          headers: { 'Content-Type': 'application/json', ...(t.token ? { Authorization: `Bearer ${t.token}` } : {}) },
          body: JSON.stringify(bc.body),
        });
        if (res.status !== exp) throw new Error(`status ${res.status} (harus ${exp})`);
      });
    }
  }

  if (process.exitCode) {
    console.error('Security regression: GAGAL');
  } else {
    console.log('Security regression: LULUS');
  }
}

main().catch((e) => {
  console.error('Security regression error:', e.message);
  process.exit(1);
});
