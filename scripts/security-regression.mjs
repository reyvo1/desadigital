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
  const platformToken = await login('admin', 'desa2026', null);
  const tenantToken = await login('admin', 'desa2026', 'desabaru');

  await check('Platform admin dapat akses /api/tenants', async () => {
    const res = await fetch(`${BASE_URL}/api/tenants`, { headers: { Authorization: `Bearer ${platformToken}` } });
    if (res.status !== 200) throw new Error(`status ${res.status}`);
  });

  await check('Tenant admin ditolak /api/tenants', async () => {
    const res = await fetch(`${BASE_URL}/api/tenants?tenant=desabaru`, { headers: { Authorization: `Bearer ${tenantToken}` } });
    if (res.status !== 403) throw new Error(`status ${res.status} (harus 403)`);
  });

  await check('Tenant admin akses tenant sendiri OK', async () => {
    const res = await fetch(`${BASE_URL}/api/db/backup?tenant=desabaru`, { headers: { Authorization: `Bearer ${tenantToken}` } });
    if (res.status !== 200) throw new Error(`status ${res.status}`);
  });

  await check('Tenant admin cross-tenant (default) ditolak', async () => {
    const res = await fetch(`${BASE_URL}/api/db/backup`, { headers: { Authorization: `Bearer ${tenantToken}` } });
    if (res.status !== 403) throw new Error(`status ${res.status} (harus 403)`);
  });

  await check('Tenant admin cross-tenant (query param) ditolak', async () => {
    const res = await fetch(`${BASE_URL}/api/db/backup?tenant=default`, { headers: { Authorization: `Bearer ${tenantToken}` } });
    if (res.status !== 403) throw new Error(`status ${res.status} (harus 403)`);
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
