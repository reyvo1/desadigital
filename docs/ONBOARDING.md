# Onboarding Tenant SaaS — SID Desa

Dokumen ini menjelaskan alur onboarding tenant baru pada platform SaaS SID Desa.

## 1. Prasyarat
- PostgreSQL aktif dan `DATABASE_URL` terkonfigurasi.
- Server berjalan (`npm run dev` / `NODE_ENV=production npm start`).
- Login super admin: `admin` / (password dari env `DEFAULT_ADMIN_PASSWORD`, ganti setelah seeding).

## 2. Membuat Tenant Baru
1. Login sebagai super admin (`admin`).
2. Buka tab **Manajemen Tenant (SaaS)** di Dashboard Admin.
3. Isi form **Buat Tenant Baru**: ID (mis. `desa4`), Slug (mis. `desa4`), Nama Desa.
4. Klik **Buat Tenant**. Sistem akan:
   - Menyisipkan baris ke tabel `tenants`.
   - Membuat berkas `data/village-db-<id>.json` dari seed awal.
   - Menyediakan subdomain `<id>.app.com` (routing via host/subdomain).

Alternatif API:
```
POST /api/tenants
Authorization: Bearer <admin-token>
Content-Type: application/json
{ "id": "desa4", "slug": "desa4", "name": "Desa Contoh" }
```

## 3. Konfigurasi Billing / Paket
1. Pada panel **Billing & Subscription**, pilih paket (Free/Basic/Pro/Enterprise) atau atur limit manual.
2. Klik **Simpan Billing** atau gunakan tombol upgrade cepat.
3. Kuota request bulanan ditegakkan otomatis (HTTP 429 jika terlampaui).

Endpoint:
```
GET  /api/subscription
PUT  /api/subscription
```
Respons menyertakan `usage` (bulan, jumlah request, limit, persentase).

## 4. Konfigurasi Notifikasi Per Tenant
1. Pada panel **Notifikasi Per Tenant (Email/WhatsApp)**, aktifkan kanal dan isi penerima.
2. Pilih event: notif status surat, notif aspirasi warga.
3. Klik **Simpan Notifikasi**.

Endpoint:
```
GET  /api/notifications
PUT  /api/notifications
```

## 5. Akses Data Tenant
- Routing tenant berdasarkan subdomain (`desa4.localhost:3000`) atau query `?tenant=desa4`.
- Semua data (24 tabel domain + siteConfig) terisolasi per `tenant_id`.
- Backup/restore per tenant mengikuti tenant aktif.

## 6. Verifikasi
- `npm run lint`
- `npm test` (20/20)
- `npm run build`
- `npm run smoke` (9/9)
- Cek `GET /api/health` dan `GET /api/db/catalog` (24 tabel domain).

## 7. Catatan
- Jangan import schema fresh pada DB produksi yang sudah terisi.
- Migrasi idempoten (001..008) aman dijalankan berulang.
- Perubahan limit notifikasi/billing hanya berlaku untuk tenant aktif.
