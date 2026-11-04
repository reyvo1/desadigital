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
  const kadesToken = await login('kades', 'desa2026', null);
  const operatorToken = await login('pelayanan', 'layanan2026', null);
  // Self-contained test data: ensure two citizens with different KK and bills exist
  try {
    const dbRes = await fetch(`${BASE_URL}/api/db`, { headers: { Authorization: `Bearer ${platformToken}` } });
    const db = await dbRes.json();
    const n1 = '3201100000000000';
    const n2 = '3201100000000001';
    if (!db.citizens) db.citizens = [];
    if (!db.citizens.find((c) => c.nik === n1)) {
      db.citizens.push({ id: 'sec-a', nik: n1, kk: '3201100000000011', name: 'Warga A', familyRole: 'Kepala Keluarga', gender: 'Laki-laki', birthPlace: 'Bogor', birthDate: '1990-01-01', age: 30, maritalStatus: 'Kawin', religion: 'Islam', education: 'SMA', occupation: 'Wiraswasta', dusun: 'Dusun 1', rt: '001', rw: '001', address: 'A', phone: '081200000001', aidStatus: 'Non-Penerima', verifiedDukcapil: true, bloodType: 'O', lastUpdated: new Date().toISOString().slice(0,10) });
    }
    if (!db.citizens.find((c) => c.nik === n2)) {
      db.citizens.push({ id: 'sec-b', nik: n2, kk: '3201100000000022', name: 'Warga B', familyRole: 'Kepala Keluarga', gender: 'Laki-laki', birthPlace: 'Bogor', birthDate: '1990-01-01', age: 30, maritalStatus: 'Kawin', religion: 'Islam', education: 'SMA', occupation: 'Wiraswasta', dusun: 'Dusun 1', rt: '001', rw: '001', address: 'B', phone: '081200000002', aidStatus: 'Non-Penerima', verifiedDukcapil: true, bloodType: 'O', lastUpdated: new Date().toISOString().slice(0,10) });
    }
    if (!db.siteConfig) db.siteConfig = {};
    if (!db.siteConfig.citizenTaxBills) db.siteConfig.citizenTaxBills = [];
    if (!db.siteConfig.citizenTaxBills.find((b) => b.id === 'bill-sec-a')) {
      db.siteConfig.citizenTaxBills.push({ id: 'bill-sec-a', kk: '3201100000000000', amount: 100000, status: 'Belum Lunas' });
    }
    if (!db.siteConfig.citizenTaxBills.find((b) => b.id === 'bill-sec-b')) {
      db.siteConfig.citizenTaxBills.push({ id: 'bill-sec-b', kk: '3201100000000001', amount: 100000, status: 'Belum Lunas' });
    }
    if (db.siteConfig.citizenTaxBills.find((b) => b.id === 'bill-sec-a')) {
      const b = db.siteConfig.citizenTaxBills.find((x) => x.id === 'bill-sec-a');
      b.status = 'Belum Lunas';
      b.kk = '3201100000000000';
    }
    if (db.siteConfig.citizenTaxBills.find((b) => b.id === 'bill-sec-b')) {
      const b = db.siteConfig.citizenTaxBills.find((x) => x.id === 'bill-sec-b');
      b.status = 'Belum Lunas';
      b.kk = '3201100000000001';
    }
    db.version = (db.version || 1) + 1;
    await fetch(`${BASE_URL}/api/db/siteConfig`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${platformToken}` },
      body: JSON.stringify({ data: db.siteConfig }),
    });
  } catch {}


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

  // Citizen token (seeded citizen)
  let citizenTok = null;
  try {
    const r1 = await fetch(`${BASE_URL}/api/citizen/otp/request`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nik: '3201100000000000' }),
    });
    const d1 = await r1.json();
    const r2 = await fetch(`${BASE_URL}/api/citizen/otp/verify`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nik: '3201100000000000', otp: d1.otp }),
    });
    citizenTok = (await r2.json()).token;
  } catch {}

  // SaaS billing guarded
  await check('/api/saas/billing tanpa token -> 401', async () => {
    const res = await fetch(`${BASE_URL}/api/saas/billing`);
    if (res.status !== 401) throw new Error(`status ${res.status} (harus 401)`);
  });
  await check('/api/saas/billing tenant token -> 403', async () => {
    const res = await fetch(`${BASE_URL}/api/saas/billing`, { headers: authHeaders(tenantToken) });
    if (res.status !== 403) throw new Error(`status ${res.status} (harus 403)`);
  });
  await check('/api/saas/invoices/:id/pay tanpa token -> 401', async () => {
    const res = await fetch(`${BASE_URL}/api/saas/invoices/inv-2026-004/pay`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    if (res.status !== 401) throw new Error(`status ${res.status} (harus 401)`);
  });

  // Citizen endpoints
  await check('/api/citizen/family-member tanpa token -> 401', async () => {
    const res = await fetch(`${BASE_URL}/api/citizen/family-member`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    if (res.status !== 401) throw new Error(`status ${res.status} (harus 401)`);
  });
  await check('/api/citizen/pay-bill tanpa token -> 401', async () => {
    const res = await fetch(`${BASE_URL}/api/citizen/pay-bill`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    if (res.status !== 401) throw new Error(`status ${res.status} (harus 401)`);
  });
  await check('warga tidak bisa bayar tagihan KK lain -> 404', async () => {
    if (!citizenTok) throw new Error('no citizen token');
    const res = await fetch(`${BASE_URL}/api/citizen/pay-bill`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders(citizenTok) },
      body: JSON.stringify({ billId: 'bill-sec-b' }),
    });
    if (res.status !== 404) throw new Error(`status ${res.status} (harus 404)`);
    // ensure bill-sec-b unchanged
  });

  await check('pay-bill idempoten (2x) -> satu pending', async () => {
    if (!citizenTok) throw new Error('no citizen token');
    const [r1, r2] = await Promise.all([
      fetch(`${BASE_URL}/api/citizen/pay-bill`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders(citizenTok) }, body: JSON.stringify({ billId: 'bill-sec-a' }) }),
      fetch(`${BASE_URL}/api/citizen/pay-bill`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders(citizenTok) }, body: JSON.stringify({ billId: 'bill-sec-a' }) }),
    ]);
    if (r1.status !== 200 || r2.status !== 200) throw new Error(`status ${r1.status}/${r2.status}`);
  });

  await check('confirm tanpa token -> 401', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/citizen-bills/bill-sec-a/confirm`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    if (res.status !== 401) throw new Error(`status ${res.status} (harus 401)`);
  });

  await check('confirm operator -> 403', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/citizen-bills/bill-sec-a/confirm`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders(operatorToken) } });
    if (res.status !== 403) throw new Error(`status ${res.status} (harus 403)`);
  });

  await check('confirm admin -> 200 Lunas', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/citizen-bills/bill-sec-a/confirm`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders(platformToken) } });
    if (res.status !== 200) throw new Error(`status ${res.status} (harus 200)`);
    const d = await res.json();
    if (d?.payment?.status !== 'paid') throw new Error('payment not paid');
  });

  await check('confirm kedua -> 404/409', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/citizen-bills/bill-sec-a/confirm`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders(platformToken) } });
    if (res.status !== 404 && res.status !== 409) throw new Error(`status ${res.status} (harus 404/409)`);
  });

  await check('reject tanpa pending -> 404', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/citizen-bills/bill-sec-z/reject`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders(platformToken) } });
    if (res.status !== 404) throw new Error(`status ${res.status} (harus 404)`);
  });

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
