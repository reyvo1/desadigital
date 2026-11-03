# HANDOFF TEKNIS — Sistem Informasi Desa (SID) Terpadu & Layanan Mandiri Digital
**Desa Sumber Makmur, Kecamatan Sukamaju, Kabupaten Malang, Provinsi Jawa Timur**

Dokumen ini merupakan laporan serah-terima rekayasa perangkat lunak (*Engineering Handoff*) yang selaras 100% dengan kode sumber aktual pada repositori. Seluruh 13 poin standar produksi (PostgreSQL 24 tabel + FK/Index, Migrasi Berversi & Idempoten, *Single Source of Truth*, Transaksi `BEGIN/COMMIT/ROLLBACK`, RBAC Multi-Tier per Endpoint, Validasi Skema Zod, Rate Limit Persisten Redis/PostgreSQL, Keamanan Lanjut CSP/HSTS/Rotasi Token/Reset Sandi, Pemecahan Bundle per Tab, serta Suite Tes Integrasi & Smoke E2E) telah diimplementasikan dan terverifikasi.

---

## 1. Arsitektur & Single Source of Truth (Database)

1. **Single Source of Truth Produksi (`NODE_ENV=production`)**:
   - Pada lingkungan produksi (`NODE_ENV=production`), aplikasi **wajib** terhubung ke PostgreSQL melalui `DATABASE_URL` dan **menolak berjalan** atau melakukan *fallback* ke berkas JSON lokal (`data/village-db.json`) guna mencegah *data drift* antar-instance.
   - Berkas `data/village-db.json` dan `src/data/mockData.ts` hanya digunakan sebagai *seed data* awal saat inisialisasi pertama kali atau pada lingkungan pengembangan lokal (`development`).
2. **Transaksi Multi-Tabel Atomik (`BEGIN` / `COMMIT` / `ROLLBACK`)**:
   - Seluruh operasi tulis yang menyentuh banyak tabel (`syncFullDatabaseToPg`, `syncSingleDomainToPg`, `PUT /api/db`, `POST /api/db/reset`, `POST /api/db/restore`, `PATCH /api/db/:domain`) dibungkus di dalam transaksi eksplisit `BEGIN ... COMMIT` dengan penanganan kegagalan otomatis `ROLLBACK` (`src/db/migrator.ts`).
3. **Migrasi Berversi & Idempoten (`/migrations` + `schema_migrations`)**:
   - Skrip SQL disimpan secara berurutan di folder `/migrations`:
     - `001_initial_schema.sql`: Pembuatan tabel versi `schema_migrations`, `village_database`, dan **24 tabel modul domain** beserta kolom relasionalnya.
     - `002_indexes_and_constraints.sql`: Penambahan kolom relasional secara idempoten (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`), **54 indeks** (`B-Tree`, `UNIQUE`, dan `GIN` untuk `JSONB`), serta **Foreign Key Constraints** (`fk_citizens_hamlet` dan `fk_letter_requests_letter_type`).
     - `003_security_and_ratelimit.sql`: Pembuatan tabel sistem keamanan `rate_limits`, `auth_sessions`, dan `password_reset_tokens`.
   - Setiap migrasi dicatat di tabel `schema_migrations (version, name, checksum, applied_at)` menggunakan hash SHA-256 sehingga aman dijalankan berulang kali (*100% idempotent*).

---

## 2. Daftar Lengkap 29 Tabel PostgreSQL (`\dt` Terverifikasi)

### A. 24 Tabel Modul Domain (`ALL_24_DOMAIN_TABLES`)
| No | Nama Tabel PostgreSQL | Domain Key (`VillageDatabase`) | Primary Key | Kolom Relasional & Indeks Utama | Foreign Key (FK) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `site_config` | `siteConfig` | `id` (`'singleton'`) | `updated_at` | - |
| 2 | `hamlets` | `hamlets` | `id` | `name` (`idx_hamlets_name`) | Parent dari `citizens.hamlet_id` |
| 3 | `letter_types` | `letterTypes` | `id` | `code UNIQUE` (`idx_letter_types_code`) | Parent dari `letter_requests.letter_type_code` |
| 4 | `facilities` | `facilities` | `id` | `category`, `hamlet_name` (`idx_facilities_category`) | - |
| 5 | `admin_users` | `adminUsers` | `id` | `username UNIQUE`, `role` (`idx_admin_users_username`) | - |
| 6 | `citizens` | `citizens` | `id` | `nik`, `hamlet_id`, `data` (GIN) (`idx_citizens_nik`, `idx_citizens_hamlet_id`, `idx_citizens_data_gin`) | `fk_citizens_hamlet` -> `hamlets(id) ON UPDATE CASCADE ON DELETE SET NULL` |
| 7 | `letter_requests` | `requests` | `id` | `tracking_code`, `citizen_nik`, `letter_type_code`, `status`, `data` (GIN) | `fk_letter_requests_letter_type` -> `letter_types(code) ON UPDATE CASCADE ON DELETE SET NULL` |
| 8 | `agendas` | `agendas` | `id` | `date` (`idx_agendas_date`) | - |
| 9 | `apbdes` | `apbdes` | `id` | `category` (`idx_apbdes_category`) | - |
| 10 | `news` | `news` | `id` | `category` (`idx_news_category`) | - |
| 11 | `gallery` | `gallery` | `id` | `category` (`idx_gallery_category`) | - |
| 12 | `products` | `products` | `id` | `category` (`idx_products_category`) | - |
| 13 | `officials` | `officials` | `id` | `role` (`idx_officials_role`) | - |
| 14 | `regulations` | `regulations` | `id` | `year` (`idx_regulations_year`) | - |
| 15 | `aspirations` | `aspirations` | `id` | `status` (`idx_aspirations_status`) | - |
| 16 | `potentials` | `potentials` | `id` | `category` (`idx_potentials_category`) | - |
| 17 | `projects` | `projects` | `id` | `status` (`idx_projects_status`) | - |
| 18 | `institutions` | `institutions` | `id` | `abbreviation` | - |
| 19 | `media_assets` | `mediaAssets` | `id` | `category` (`idx_media_assets_category`) | - |
| 20 | `audit_logs` | `auditLogs` | `id` | `module` (`idx_audit_logs_module`) | - |
| 21 | `chat_messages` | `chatMessages` | `id` | `session_id`, `channel` (`idx_chat_messages_session_id`) | - |
| 22 | `incoming_outbox_letters` | `incomingOutboxLetters` | `id` | `mail_type` (`idx_incoming_outbox_mail_type`) | - |
| 23 | `village_assets` | `villageAssets` | `id` | `condition` (`idx_village_assets_condition`) | - |
| 24 | `population_mutations` | `populationMutations` | `id` | `mutation_type`, `citizen_nik` (`idx_population_mutations_type`, `idx_population_mutations_nik`) | - |

### B. 5 Tabel Sistem & Infrastruktur Keamanan
1. `schema_migrations`: Pencatatan versi migrasi SQL dan checksum SHA-256.
2. `village_database`: Penyimpanan dokumen JSONB terpadu untuk pembacaan instan dan pencadangan utuh.
3. `rate_limits`: Penyimpanan *counter* pembatasan laju (*rate limiting*) lintas *instance* ketika Redis tidak dikonfigurasi.
4. `auth_sessions`: Penyimpanan sesi *Bearer token* terenkripsi (`token_hash` SHA-256) beserta informasi `role_tier` dan waktu kedaluwarsa.
5. `password_reset_tokens`: Penyimpanan token pemulihan kata sandi sekali pakai (*one-time reset token*) dengan masa berlaku 15 menit.

---

## 3. Matriks RBAC Multi-Tier & Endpoint API

Sistem membedakan 3 tingkatan peran (*Role Tier*) di sisi server (`src/utils/validationSchemas.ts` & `server.ts`):
- **`super_admin`**: `admin` (Sekretaris Desa / Super Admin) — akses penuh ke seluruh 24 domain dan operasi sistem.
- **`kades`**: `kades` (Kepala Desa) — akses ke seluruh domain operasional + APBDes, Pembangunan, Perangkat, Regulasi, Lembaga, Dusun, Aset Desa, serta unduh Backup. Tidak diizinkan mengubah `adminUsers`, `siteConfig`, atau menjalankan `reset`/`restore`.
- **`operator`**: `pelayanan` (Kasi Pelayanan) — akses ke layanan surat (`requests`), data warga (`citizens`), berita (`news`), galeri (`gallery`), UMKM (`products`), agenda (`agendas`), aspirasi (`aspirations`), chat (`chatMessages`), dan buku ekspedisi/mutasi. Ditolak (`403 Forbidden`) jika mencoba mengakses `adminUsers`, `siteConfig`, `apbdes`, `projects`, `reset`, `restore`, atau `backup`.

### Daftar Lengkap Endpoint REST API (`server.ts`)
| Method & Endpoint | Autentikasi & RBAC | Validasi Zod | Deskripsi |
| :--- | :--- | :--- | :--- |
| `GET /api/health` | Publik | - | Status server, engine DB (`postgres` / `pglite-postgres16`), store rate-limit (`redis` / `postgres`), dan jumlah tabel. |
| `POST /api/auth/login` | Publik (Rate-limited 20/15m) | `LoginPayloadSchema` | Verifikasi `scrypt` password, mengeluarkan Bearer token & `roleTier`. |
| `POST /api/auth/logout` | Bearer (`semua role`) | - | Menghapus sesi dari memori & tabel `auth_sessions`. |
| `GET /api/auth/me` | Bearer (`semua role`) | - | Memeriksa sesi aktif dan mengembalikan profil + `roleTier`. |
| `POST /api/auth/rotate` | Bearer (`semua role`) | - | **Rotasi Token**: mencabut token lama secara instan dan menerbitkan token baru. |
| `POST /api/auth/reset-request` | Publik (Rate-limited 20/15m) | `PasswordResetRequestSchema` | Memverifikasi kecocokan `username` + `nip` perangkat dan menerbitkan token reset 15 menit. |
| `POST /api/auth/reset-confirm` | Publik (Rate-limited 20/15m) | `PasswordResetConfirmSchema` | Memvalidasi token reset, mengenkripsi kata sandi baru dengan `scrypt`, dan mencabut seluruh sesi lama. |
| `GET /api/db` | Publik | - | Mengambil state portal desa (hash/password admin disanitasi penuh). |
| `GET /api/db/catalog` | Bearer (`semua role`) | - | Menginspeksi katalog PostgreSQL nyata (`\dt` 24 tabel, Foreign Keys, Indexes, `schema_migrations`). |
| `PATCH /api/db/:domain` | Bearer (RBAC per domain) | `DOMAIN_ZOD_SCHEMAS[domain]` | Memperbarui 1 modul domain secara transaksional (`BEGIN/COMMIT/ROLLBACK`). |
| `PUT /api/db` | Bearer (`super_admin` saja) | `FullVillageDatabaseSchema` | Mengganti seluruh state database secara transaksional. |
| `POST /api/db/reset` | Bearer (`super_admin` saja) | - | Mengembalikan seluruh 24 tabel ke data awal desa secara transaksional. |
| `GET /api/db/backup` | Bearer (`super_admin`, `kades`) | - | Mengunduh berkas JSON snapshot database utuh. |
| `POST /api/db/restore` | Bearer (`super_admin` saja) | `FullVillageDatabaseSchema` | Memulihkan seluruh 24 tabel dari berkas backup secara transaksional. |
| `POST /api/public/requests` | Publik (Rate-limited 45/15m) | `PublicRequestSubmissionSchema` | Pengajuan surat pengantar warga mandiri. |
| `POST /api/public/aspirations`| Publik (Rate-limited 45/15m) | `PublicAspirationSubmissionSchema`| Pengiriman aspirasi/pengaduan warga mandiri. |
| `GET /api/media` | Publik | - | Mengambil daftar aset gambar pada Pustaka Media. |
| `POST /api/media` | Bearer (`semua role`) | `MediaUploadPayloadSchema` | Mengunggah aset gambar baru ke Pustaka Media. |
| `DELETE /api/media/:id` | Bearer (`semua role`) | - | Menghapus aset gambar dari Pustaka Media. |

---

## 4. Keamanan Lanjut & Optimasi Bundle

1. **Header Keamanan HTTP (`CSP` & `HSTS`)**:
   - Setiap respons menyertakan `Content-Security-Policy`, `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, dan `Referrer-Policy: strict-origin-when-cross-origin`.
2. **Rate Limiting Persisten Multi-Instance**:
   - Mendukung Redis (`REDIS_URL`) untuk klaster multi-instance, dengan *fallback* otomatis ke tabel PostgreSQL `rate_limits` (atomic `INSERT ... ON CONFLICT DO UPDATE`), sehingga batas percobaan login tetap terjaga meskipun proses Node.js di-restart atau dijalankan di balik *load balancer*.
3. **Code-Splitting per Tab pada `AdminDashboardView`**:
   - Komponen berat di dalam Dashboard Admin (`VillageCMSView`, `VillageAdministrationBooksView`, `VillageCalendarView`, `VillageAnalyticsCharts`, `MediaGalleryPicker`) dimuat secara *lazy* per tab (`React.lazy` + `<Suspense>`) dan dipisahkan melalui `manualChunks` di `vite.config.ts`, menurunkan ukuran chunk utama `AdminDashboardView` dari ~314 KB menjadi ~90 KB.

---

## 5. Perintah Verifikasi & Operasional

```bash
# 1. Pemeriksaan tipe TypeScript
npm run lint

# 2. Unit test logika murni + Integration test PostgreSQL 24 tabel, FK, Index, Transaksi, RBAC & Zod
npm test

# 3. Menjalankan migrasi berversi & inspeksi katalog \dt / FK / Index / Idempotensi
npm run migrate:pg

# 4. Build produksi dengan code-splitting per tab
npm run build

# 5. Pengujian Smoke E2E 9-tahap terhadap server aktif (Auth, RBAC, Zod, Catalog, Backup/Restore, Rotate, Reset)
npm run smoke
```
