# Panduan Deployment Produksi (Production Runbook)
## Sistem Informasi Desa (SID) — Desa Sumber Makmur

Dokumen ini menjelaskan langkah-langkah deployment aplikasi ke lingkungan produksi dengan PostgreSQL sebagai *Single Source of Truth*, Redis (opsional) untuk *rate-limit* klaster, serta konfigurasi Reverse Proxy (Nginx/Caddy) dengan HSTS dan CSP.

---

## 1. Variabel Lingkungan (`.env`)

Salin `.env.example` menjadi `.env` dan sesuaikan nilainya:

```dotenv
PORT=3000
NODE_ENV=production

# WAJIB pada NODE_ENV=production (Single Source of Truth — mencegah fallback JSON)
DATABASE_URL=postgresql://postgres:password_kuat@db.internal:5432/sid_sumber_makmur

# OPSIONAL: Redis untuk rate-limiting multi-instance (jika kosong, otomatis memakai tabel PostgreSQL rate_limits)
REDIS_URL=redis://redis.internal:6379

# Kredensial awal perangkat desa saat seeding pertama kali
DEFAULT_ADMIN_PASSWORD=GantiDenganPasswordKuat2026!
```

> **Catatan Penting Single Source of Truth**: Ketika `NODE_ENV=production` diaktifkan, server **wajib** memiliki `DATABASE_URL` yang dapat diakses. Jika koneksi PostgreSQL gagal pada mode produksi, server akan menghentikan proses startup (*fail-fast*) dan tidak akan menulis ke `data/village-db.json` agar tidak terjadi perbedaan data (*drift*) antar-instance.

---

## 2. Menjalankan Migrasi Database Berversi

Seluruh skema SQL berada di direktori `/migrations`:
- `001_initial_schema.sql`
- `002_indexes_and_constraints.sql`
- `003_security_and_ratelimit.sql`

Jalankan perintah berikut sebelum menjalankan server produksi atau saat melakukan *upgrade* versi:

```bash
npm run migrate:pg
```

Perintah ini:
1. Membuat tabel `schema_migrations` jika belum ada.
2. Mengeksekusi file migrasi baru di dalam transaksi `BEGIN ... COMMIT` dan mencatat checksum SHA-256.
3. Menyinkronkan data awal ke **24 tabel domain** secara idempoten.
4. Menampilkan laporan verifikasi katalog PostgreSQL (`\dt` 29 tabel, 2 Foreign Keys, 54 Indexes, dan uji idempotensi 0 duplikasi).

---

## 3. Build & Menjalankan Server Produksi

```bash
# 1. Instal dependensi
npm ci

# 2. Jalankan pemeriksaan tipe & seluruh suite pengujian
npm run lint
npm test

# 3. Kompilasi aset frontend ter-split ke dist/
npm run build

# 4. Jalankan server Express + API produksi
NODE_ENV=production npm start
```

---

## 4. Konfigurasi Reverse Proxy (Nginx) dengan HSTS & TLS

Aplikasi sudah mengirimkan header `Content-Security-Policy` dan `Strict-Transport-Security` langsung dari `server.ts`. Jika ditempatkan di balik Nginx sebagai *TLS termination proxy*, gunakan konfigurasi berikut:

```nginx
server {
    listen 443 ssl http2;
    server_name desasumbermakmur.id www.desasumbermakmur.id;

    ssl_certificate     /etc/letsencrypt/live/desasumbermakmur.id/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/desasumbermakmur.id/privkey.pem;

    # HSTS & Security Headers pada level Reverse Proxy
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;

    client_max_body_size 15M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 5. Prosedur Backup & Restore End-to-End

1. **Melalui Dashboard Admin**:
   - Login sebagai **Super Admin (`admin`)**.
   - Buka tab **CMS Master Data**, lalu klik **Backup JSON** (`GET /api/db/backup`) untuk mengunduh berkas `.json` utuh.
   - Untuk memulihkan kondisi, klik **Restore JSON** (`POST /api/db/restore`) dan pilih berkas backup. Seluruh 24 tabel PostgreSQL akan diperbarui dalam satu transaksi atomik (`BEGIN ... COMMIT`).
2. **Melalui CLI (`pg_dump` & Smoke Test)**:
   - Gunakan `pg_dump "$DATABASE_URL" > backup_sid.sql` untuk pencadangan level PostgreSQL.
   - Jalankan `npm run smoke` kapan saja untuk memverifikasi alur *Backup -> Mutasi -> Restore -> Verifikasi State* secara otomatis.
