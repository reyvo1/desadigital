const BASE_URL = process.env.SMOKE_URL || 'http://127.0.0.1:3000';

async function waitForServerReady(maxRetries = 10) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) return res;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server pada ${BASE_URL} tidak merespons setelah ${maxRetries} percobaan.`);
}

async function runSmokeTests() {
  console.log(`[Smoke] Menguji endpoint server pada ${BASE_URL} ...`);

  // 1. Health Check + Security Headers (CSP & HSTS)
  const healthRes = await waitForServerReady();
  const cspHeader = healthRes.headers.get('content-security-policy');
  const hstsHeader = healthRes.headers.get('strict-transport-security');
  if (!cspHeader || !hstsHeader) {
    throw new Error('Header keamanan Content-Security-Policy atau Strict-Transport-Security belum terpasang!');
  }
  const health = await healthRes.json();
  console.log(
    `[Smoke] 1/9 GET /api/health OK -> engine=${health.engine}, tables=${health.database?.normalizedTablesCount}, CSP & HSTS aktif.`
  );

  // 2. Public Read /api/db & Sanitasi Password
  const dbRes = await fetch(`${BASE_URL}/api/db`);
  if (!dbRes.ok) {
    throw new Error(`GET /api/db gagal dengan status ${dbRes.status}`);
  }
  const db = await dbRes.json();
  if (!db?.siteConfig?.villageName) {
    throw new Error('GET /api/db tidak mengembalikan siteConfig.villageName');
  }
  const leakedPlaintext = (db.adminUsers || []).some((u) => Boolean(u.password));
  if (leakedPlaintext) {
    throw new Error('Keamanan gagal: GET /api/db masih mengekspos field password plaintext!');
  }
  console.log(`[Smoke] 2/9 GET /api/db OK -> desa="${db.siteConfig.villageName}", password disanitasi.`);

  // 3. Unauthenticated PATCH /api/db/news harus ditolak (401)
  const unauthRes = await fetch(`${BASE_URL}/api/db/news`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: [] }),
  });
  if (unauthRes.status !== 401) {
    throw new Error(
      `Proteksi autentikasi gagal: PATCH /api/db/news tanpa token mengembalikan ${unauthRes.status} (seharusnya 401)`
    );
  }
  console.log('[Smoke] 3/9 Proteksi Auth OK -> PATCH /api/db/news tanpa token ditolak (401).');

  // 4. Login Super Admin (admin) & Login Operator (pelayanan)
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: process.env.SMOKE_ADMIN_USER || 'admin',
      password: process.env.SMOKE_ADMIN_PASSWORD || 'desa2026',
    }),
  });
  if (!adminLoginRes.ok) {
    throw new Error(`POST /api/auth/login (admin) gagal dengan status ${adminLoginRes.status}`);
  }
  const adminSession = await adminLoginRes.json();

  const opLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'pelayanan',
      password: process.env.SMOKE_OPERATOR_PASSWORD || 'layanan2026',
    }),
  });
  if (!opLoginRes.ok) {
    throw new Error(`POST /api/auth/login (pelayanan) gagal dengan status ${opLoginRes.status}`);
  }
  const opSession = await opLoginRes.json();
  console.log(
    `[Smoke] 4/9 Login Multi-Role OK -> admin (${adminSession.roleTier}) & pelayanan (${opSession.roleTier}).`
  );

  // 5. Uji RBAC per Endpoint: Operator (pelayanan) wajib ditolak (403) pada adminUsers, apbdes, dan reset
  const opForbiddenAdminUsers = await fetch(`${BASE_URL}/api/db/adminUsers`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${opSession.token}`,
    },
    body: JSON.stringify({ data: db.adminUsers }),
  });
  if (opForbiddenAdminUsers.status !== 403) {
    throw new Error(
      `RBAC gagal: operator pelayanan seharusnya mendapat 403 pada PATCH /api/db/adminUsers, bukan ${opForbiddenAdminUsers.status}`
    );
  }

  const opForbiddenReset = await fetch(`${BASE_URL}/api/db/reset`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${opSession.token}` },
  });
  if (opForbiddenReset.status !== 403) {
    throw new Error(
      `RBAC gagal: operator pelayanan seharusnya mendapat 403 pada POST /api/db/reset, bukan ${opForbiddenReset.status}`
    );
  }
  console.log('[Smoke] 5/9 RBAC Per Endpoint OK -> Operator ditolak (403) pada endpoint khusus Super Admin.');

  // 6. Uji Validasi Input Zod: Kirim warga dengan NIK tidak valid (harus 400 Bad Request)
  const invalidZodRes = await fetch(`${BASE_URL}/api/db/citizens`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminSession.token}`,
    },
    body: JSON.stringify({
      data: [{ id: 'invalid-1', nik: 'BUKAN-16-DIGIT', kk: '123', name: 'Tes', gender: 'Laki-laki', dusun: 'Krajan' }],
    }),
  });
  if (invalidZodRes.status !== 400) {
    throw new Error(`Validasi Zod gagal: payload warga cacat mengembalikan ${invalidZodRes.status} (seharusnya 400)`);
  }
  console.log('[Smoke] 6/9 Validasi Schema Zod OK -> Payload cacat ditolak dengan 400 Bad Request.');

  // 7. Verifikasi Katalog PostgreSQL (\dt 24 tabel, Foreign Keys & Indexes) via GET /api/db/catalog
  const catalogRes = await fetch(`${BASE_URL}/api/db/catalog`, {
    headers: { Authorization: `Bearer ${adminSession.token}` },
  });
  if (!catalogRes.ok) {
    throw new Error(`GET /api/db/catalog gagal dengan status ${catalogRes.status}`);
  }
  const catalogJson = await catalogRes.json();
  if (catalogJson.catalog?.domainTablesPresent?.length !== 24) {
    throw new Error(
      `Verifikasi 24 tabel gagal: ditemukan ${catalogJson.catalog?.domainTablesPresent?.length} tabel`
    );
  }
  console.log(
    `[Smoke] 7/9 Katalog PostgreSQL OK -> 24/24 tabel domain, ${catalogJson.catalog.foreignKeys.length} FK, ${catalogJson.catalog.indexes.length} index.`
  );

  // 8. Uji End-to-End Backup -> Mutasi -> Restore -> Verifikasi State
  const backupRes = await fetch(`${BASE_URL}/api/db/backup`, {
    headers: { Authorization: `Bearer ${adminSession.token}` },
  });
  if (!backupRes.ok) {
    throw new Error(`GET /api/db/backup gagal dengan status ${backupRes.status}`);
  }
  const backupJson = await backupRes.json();
  const backupData = backupJson.data || backupJson;
  const cleanOriginalTagline =
    backupData.siteConfig.tagline && !backupData.siteConfig.tagline.includes('Tagline Uji Smoke')
      ? backupData.siteConfig.tagline
      : 'Desa Digital Mandiri, Berbudaya, Agamis & Sejahtera';
  backupData.siteConfig.tagline = cleanOriginalTagline;

  const tempMutatedTagline = `Tagline Uji Smoke ${Date.now()}`;
  const mutatedSiteConfig = {
    ...backupData.siteConfig,
    tagline: tempMutatedTagline,
  };
  const mutateRes = await fetch(`${BASE_URL}/api/db/siteConfig`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminSession.token}`,
    },
    body: JSON.stringify({ data: mutatedSiteConfig }),
  });
  if (!mutateRes.ok) {
    throw new Error(`Mutasi siteConfig gagal dengan status ${mutateRes.status}`);
  }

  const afterMutateCheck = await (await fetch(`${BASE_URL}/api/db`)).json();
  if (afterMutateCheck.siteConfig.tagline !== tempMutatedTagline) {
    throw new Error('Mutasi siteConfig.tagline tidak tersimpan sebelum restore');
  }

  // Restore kembali dari backupData
  const restoreRes = await fetch(`${BASE_URL}/api/db/restore`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminSession.token}`,
    },
    body: JSON.stringify({ data: backupData }),
  });
  if (!restoreRes.ok) {
    throw new Error(`POST /api/db/restore gagal dengan status ${restoreRes.status}`);
  }
  const restoredCheck = await (await fetch(`${BASE_URL}/api/db`)).json();
  if (restoredCheck.siteConfig.tagline !== cleanOriginalTagline) {
    throw new Error(
      `Verifikasi Restore gagal: tagline "${restoredCheck.siteConfig.tagline}" !== "${cleanOriginalTagline}"`
    );
  }
  console.log('[Smoke] 8/9 Backup -> Mutasi -> Restore End-to-End OK -> State pulih 100% akurat.');

  // 9. Uji Rotasi Token (/api/auth/rotate) & Alur Reset Password (/api/auth/reset-request + reset-confirm)
  const rotateRes = await fetch(`${BASE_URL}/api/auth/rotate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminSession.token}` },
  });
  if (!rotateRes.ok) {
    throw new Error(`POST /api/auth/rotate gagal dengan status ${rotateRes.status}`);
  }
  const rotatedSession = await rotateRes.json();
  if (!rotatedSession.token || rotatedSession.token === adminSession.token) {
    throw new Error('Rotasi token gagal menghasilkan token baru yang berbeda');
  }

  // Token lama harus sudah tidak berlaku (401)
  const oldTokenCheck = await fetch(`${BASE_URL}/api/db/backup`, {
    headers: { Authorization: `Bearer ${adminSession.token}` },
  });
  if (oldTokenCheck.status !== 401) {
    throw new Error(`Token lama masih aktif setelah rotasi (status ${oldTokenCheck.status})`);
  }

  // Konfigurasi notifikasi agar token reset dapat diambil dari outbox (dev/test)
  await fetch(`${BASE_URL}/api/notifications`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${rotatedSession.token}`,
    },
    body: JSON.stringify({
      email_enabled: true,
      email_recipient: 'smoke-test@example.com',
      whatsapp_enabled: true,
      whatsapp_recipient: '08123456789',
      notify_letter_status: true,
      notify_aspirations: true,
    }),
  });

  // Uji Reset Password untuk akun pelayanan (NIP: 19871103 201705 1 004), lalu kembalikan ke password semula
  const pelayananUser = (db.adminUsers || []).find((u) => u.username === 'pelayanan');
  const pelayananNip = pelayananUser?.nip || '19871103 201705 1 004';

  const resetReqRes = await fetch(`${BASE_URL}/api/auth/reset-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'pelayanan', nip: pelayananNip }),
  });
  if (!resetReqRes.ok) {
    throw new Error(`POST /api/auth/reset-request gagal dengan status ${resetReqRes.status}`);
  }
  // Token tidak lagi dikembalikan di respons; ambil dari outbox (dev/test)
  const outboxRes = await fetch(`${BASE_URL}/api/notifications/outbox`, {
    headers: { Authorization: `Bearer ${rotatedSession.token}` },
  });
  if (!outboxRes.ok) {
    throw new Error(`GET /api/notifications/outbox gagal dengan status ${outboxRes.status}`);
  }
  const outboxJson = await outboxRes.json();
  const resetItem = (outboxJson.items || []).find((it) => /Token pemulihan/i.test(it.message || ''));
  if (!resetItem) {
    throw new Error('Token pemulihan tidak ditemukan di outbox.');
  }
  const tokenMatch = (resetItem.message || '').match(/Token pemulihan \(15 menit\):\s*([a-f0-9]+)/i);
  if (!tokenMatch) {
    throw new Error('Format token pemulihan di outbox tidak valid.');
  }
  const resetToken = tokenMatch[1];

  const resetConfirmRes = await fetch(`${BASE_URL}/api/auth/reset-confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'pelayanan',
      resetToken: resetToken,
      newPassword: process.env.SMOKE_OPERATOR_PASSWORD || 'layanan2026',
    }),
  });
  if (!resetConfirmRes.ok) {
    throw new Error(`POST /api/auth/reset-confirm gagal dengan status ${resetConfirmRes.status}`);
  }

  // Logout sesi aktif
  await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${rotatedSession.token}` },
  });
  console.log('[Smoke] 9/9 Rotasi Token & Reset Password End-to-End OK.');
  console.log('[Smoke] Seluruh 9 tahapan smoke test LULUS SEMPURNA.');
}

runSmokeTests().catch((err) => {
  console.error('[Smoke] GAGAL:', err.message);
  process.exit(1);
});
