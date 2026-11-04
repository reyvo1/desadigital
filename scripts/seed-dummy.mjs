import fs from 'node:fs';
// scripts/seed-dummy.mjs
const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';
const N_CITIZENS = Number(process.env.SEED_CITIZENS || 1200);

async function j(res) { try { return await res.json(); } catch { return {}; } }

async function main() {
  let res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'desa2026' }),
  });
  const data = await j(res);
  const token = data.token;
  if (!token) { console.error('admin login failed'); process.exit(1); }

  res = await fetch(`${BASE}/api/db`);
  const db = await j(res);
  const localDb = JSON.parse(fs.readFileSync('data/village-db.json', 'utf-8'));
  const adminUsers = localDb.adminUsers;

  const citizens = [];
  for (let i = 0; i < N_CITIZENS; i++) {
    const nik = `3201${String(100000000000 + i).slice(-12)}`;
    const kk = `3201${String(100000000000 + Math.floor(i / 4)).slice(-12)}`;
    citizens.push({
      id: `cit-${i}`, nik, kk, name: `Warga Dummy ${i}`,
      familyRole: i % 4 === 0 ? 'Kepala Keluarga' : 'Anak',
      gender: i % 2 === 0 ? 'Laki-laki' : 'Perempuan',
      birthPlace: 'Bogor', birthDate: '1990-01-01', age: 30 + (i % 20),
      maritalStatus: 'Kawin', religion: 'Islam', education: 'SMA', occupation: 'Wiraswasta',
      dusun: `Dusun ${(i % 5) + 1}`,
      rt: String((i % 10) + 1).padStart(3, '0'),
      rw: String((i % 3) + 1).padStart(3, '0'),
      address: `Alamat ${i}`,
      phone: `0812${String(10000000 + i).slice(-8)}`,
      aidStatus: 'Non-Penerima', verifiedDukcapil: true, bloodType: 'O',
      lastUpdated: new Date().toISOString().slice(0, 10),
    });
  }
  db.citizens = citizens;

  const requests = [];
  for (let i = 0; i < 300; i++) {
    requests.push({
      id: `req-${i}`, trackingCode: `TRK-${i}`,
      nik: citizens[i % citizens.length].nik,
      citizenName: citizens[i % citizens.length].name,
      letterType: 'SKU', letterTitle: 'Surat Keterangan Usaha',
      purpose: 'Keperluan administrasi', status: 'Menunggu',
      createdAt: new Date().toISOString(),
    });
  }
  db.requests = requests;

  const aspirations = [];
  for (let i = 0; i < 100; i++) {
    aspirations.push({ id: `asp-${i}`, name: `Warga ${i}`, message: `Aspirasi dummy ${i}`, status: 'Menunggu', createdAt: new Date().toISOString() });
  }
  db.aspirations = aspirations;
  db.siteConfig = db.siteConfig || {};
  db.siteConfig.aiQuotaMonthly = 1000000;
  db.siteConfig.aiUsedMonthly = 0;

  db.adminUsers = adminUsers;
  db.version = (db.version || 1) + 1;

  const putRes = await fetch(`${BASE}/api/db`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(db),
  });
  const putData = await j(putRes);
  if (!putRes.ok) {
    console.error('seed PUT failed:', putData.error);
    if (Array.isArray(putData.issues)) for (const x of putData.issues.slice(0, 10)) console.error('issue path:', x.path);
    process.exit(1);
  }
  console.log(`Seeded ${citizens.length} citizens, ${requests.length} requests, ${aspirations.length} aspirations.`);
}

main().catch((e) => { console.error(e); process.exit(1); });