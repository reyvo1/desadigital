# Product Requirements Document (PRD)
## Sistem Informasi Desa (SID) Terpadu & Layanan Mandiri Digital — Desa Sumber Makmur

| Informasi Dokumen | Detail |
| :--- | :--- |
| **Nama Produk** | Portal Digital & Sistem Informasi Desa (SID) Desa Sumber Makmur |
| **Wilayah Administratif** | Desa Sumber Makmur, Kec. Sukamaju, Kab. Malang, Jawa Timur (Kode Kemendagri: `35.07.18.2004`) |
| **Versi Dokumen** | 3.0 (Production-Grade PostgreSQL 24 Tabel, RBAC Multi-Tier, Zod Schema, Security Hardened) |
| **Status Implementasi** | Selesai & Terverifikasi End-to-End (100% fitur aktif & teruji otomatis) |

---

## 1. Ringkasan Eksekutif & Tujuan Produk

Portal Digital **Desa Sumber Makmur** adalah Sistem Informasi Desa (SID) *full-stack* yang mengintegrasikan:
1. **Transparansi Publik**: Profil desa, struktur perangkat SOTK, lembaga kemasyarakatan, produk hukum (Perdes/SK), serta visualisasi realisasi APBDes & e-Monitoring proyek fisik desa.
2. **Pelayanan Administrasi Mandiri**: Pengajuan 6 jenis surat pengantar secara daring dengan verifikasi NIK otomatis, pelacakan status surat *real-time* (5 tahapan), serta pencetakan surat resmi ber-kop Garuda/Logo Desa dan QR verifikasi.
3. **Pemberdayaan Ekonomi & Partisipasi Warga**: Katalog Pasar UMKM Desa terintegrasi WhatsApp penjual, saluran Pengaduan/Aspirasi publik, dan *Live Chat* Balai Desa.
4. **Backoffice Tata Kelola Pemerintahan Desa (Permendagri No. 47 Tahun 2016)**: Dashboard terproteksi RBAC multi-peran dengan CMS 16 koleksi, Buku Administrasi Desa (Buku Ekspedisi Surat Masuk/Keluar, Buku Inventaris Aset, Buku Mutasi Penduduk), Kalender Kerja Perangkat, dan Pustaka Media terpusat.

---

## 2. Persona Pengguna & Matriks Hak Akses (RBAC)

| Persona / Role | Username Akun | Role Tier Server | Hak Akses Utama |
| :--- | :--- | :--- | :--- |
| **Warga & Pengunjung Publik** | Tanpa Login | `public` | Membaca seluruh informasi publik, mencari NIK, mengajukan surat mandiri, melacak kode surat, mengirim aspirasi, dan menghubungi UMKM. |
| **Sekretaris Desa (Super Admin)** | `admin` | `super_admin` | Akses penuh ke seluruh **24 domain**, pengaturan identitas desa (`siteConfig`), manajemen akun perangkat (`adminUsers`), serta aksi sistem **Reset Database**, **Backup**, dan **Restore Database**. |
| **Kepala Desa (Pimpinan)** | `kades` | `kades` | Persetujuan/tanda tangan surat, pengelolaan APBDes (`apbdes`), proyek pembangunan (`projects`), perangkat (`officials`), regulasi (`regulations`), lembaga (`institutions`), dusun (`hamlets`), aset desa (`villageAssets`), dan unduh **Backup Database**. |
| **Kasi Pelayanan (Operator Loket)** | `pelayanan` | `operator` | Pemrosesan permohonan surat (`requests`), pemutakhiran data warga (`citizens`), mutasi penduduk (`populationMutations`), buku ekspedisi (`incomingOutboxLetters`), berita (`news`), galeri (`gallery`), UMKM (`products`), agenda (`agendas`), aspirasi (`aspirations`), dan unggah media (`mediaAssets`). Ditolak (`403`) pada endpoint `adminUsers`, `siteConfig`, `apbdes`, `reset`, dan `restore`. |

---

## 3. Spesifikasi Fungsional Berdasarkan Modul

### 3.1. Modul Publik (9 Halaman + Layanan Mandiri)
1. **Beranda (`HomeView`)**: Hero interaktif, pengumuman berjalan (*marquee*), ringkasan statistik warga & APBDes, akses cepat pengajuan/lacak surat, sambutan Kepala Desa, agenda terdekat, berita terbaru, dan sorotan UMKM.
2. **Profil Desa (`ProfileView`)**: Sejarah desa, visi & misi, bagan organisasi perangkat desa, daftar 6 lembaga desa, potensi unggulan, dan unduhan dokumen Peraturan Desa (Perdes) format PDF resmi.
3. **Statistik & APBDes (`StatisticsView`)**: Grafik komposisi penduduk (gender, usia, pendidikan, pekerjaan, sebaran dusun), rincian realisasi Pendapatan vs Belanja APBDes 2026, serta kartu progres proyek pembangunan fisik desa.
4. **Layanan Surat Mandiri (`ServicesView` + `LetterRequestModal` + `LetterTrackingModal`)**:
   - Auto-fill data warga berdasarkan pencarian NIK 16 digit.
   - Pengajuan surat menghasilkan nomor pelacakan unik (`REQ-2026-XXX`).
   - Pelacakan status 5 tahap dan pratinjau dokumen cetak (`OfficialLetterView`).
5. **Pasar UMKM Desa (`MarketView`)**: Filter kategori produk lokal, modal rincian produk, dan pemesanan langsung via WhatsApp penjual.
6. **Peta Digital Desa (`MapView`)**: Peta SVG interaktif batas wilayah 4 dusun dan titik lokasi fasilitas publik (pemerintahan, kesehatan, pendidikan, ibadah, ekonomi) dengan penghitung jarak Haversine.
7. **Galeri & Dokumentasi (`GalleryView`)**: Dokumentasi visual kegiatan desa dengan filter kategori dan *lightbox*.
8. **Kontak & Pengaduan Warga (`ContactView`)**: Formulir pengiriman aspirasi/pengaduan masyarakat dan daftar transparansi tindak lanjut pemerintah desa.

### 3.2. Modul Backoffice Admin (`AdminDashboardView` — Code-Split per Tab)
1. **Autentikasi, Rotasi Token & Pemulihan Kata Sandi (`AdminLoginModal`)**:
   - Login menggunakan verifikasi hash `scrypt` di server (`POST /api/auth/login`).
   - Fitur **"Lupa Kata Sandi?"** 2-langkah: verifikasi identitas `username` + `NIP` (`POST /api/auth/reset-request`) diikuti konfirmasi token 8 karakter dan pembuatan kata sandi baru (`POST /api/auth/reset-confirm`).
   - Rotasi sesi token berkala (`POST /api/auth/rotate`).
2. **Tab Layanan & Operasi Harian**: Antrean surat masuk warga, perubahan status tahapan surat, cetak surat resmi, dan balasan pengaduan warga.
3. **Tab Kependudukan (NIK)**: Tabel buku induk penduduk, filter per dusun, dan ekspor CSV.
4. **Tab Buku Administrasi Desa (`VillageAdministrationBooksView` — Lazy Chunk)**: Buku Ekspedisi Surat Masuk/Keluar, Buku Inventaris Aset Desa, dan Buku Mutasi Penduduk.
5. **Tab Kalender Kerja (`VillageCalendarView` — Lazy Chunk)**: Kalender bulanan interaktif agenda balai desa.
6. **Tab Analitik Eksekutif (`VillageAnalyticsCharts` — Lazy Chunk)**: Tren pengajuan surat, waktu penyelesaian rata-rata (SLA), dan serapan anggaran per bidang.
7. **Tab Pustaka Media (`MediaGalleryPicker` — Lazy Chunk)**: Manajemen unggah/hapus aset foto terpusat (`POST /api/media`, `DELETE /api/media/:id`).
8. **Tab CMS Master Data (`VillageCMSView` — Lazy Chunk)**: Formulir CRUD tervalidasi Zod untuk seluruh koleksi data desa serta panel **Backup & Restore JSON** end-to-end.

---

## 4. Arsitektur Data PostgreSQL (24 Tabel Modul + 5 Tabel Sistem)

- **Single Source of Truth**: Di lingkungan produksi (`NODE_ENV=production`), aplikasi mewajibkan koneksi PostgreSQL (`DATABASE_URL`) dan mematikan fallback file JSON lokal untuk mencegah *data drift*.
- **Skema Ter-normalisasi + JSONB**:
  - **24 Tabel Modul**: `site_config`, `hamlets`, `letter_types`, `facilities`, `admin_users`, `citizens`, `letter_requests`, `agendas`, `apbdes`, `news`, `gallery`, `products`, `officials`, `regulations`, `aspirations`, `potentials`, `projects`, `institutions`, `media_assets`, `audit_logs`, `chat_messages`, `incoming_outbox_letters`, `village_assets`, `population_mutations`.
  - **Foreign Keys**: `citizens.hamlet_id -> hamlets.id` dan `letter_requests.letter_type_code -> letter_types.code`.
  - **54 Indeks**: Indeks B-Tree pada kolom pencarian utama (`nik`, `tracking_code`, `category`, `status`, `date`, `year`) serta indeks GIN (`idx_citizens_data_gin`, `idx_letter_requests_data_gin`) pada dokumen JSONB.
  - **5 Tabel Sistem**: `schema_migrations`, `village_database`, `rate_limits`, `auth_sessions`, `password_reset_tokens`.

---

## 5. Persyaratan Non-Fungsional (Keamanan, Performa & Kualitas)

1. **Validasi Input Ketat (Zod)**: Seluruh payload API divalidasi menggunakan skema Zod (`src/utils/validationSchemas.ts`) sebelum menyentuh database; payload cacat langsung ditolak dengan status `400 Bad Request` beserta daftar field yang bermasalah.
2. **Keamanan HTTP & Rate Limiting Persisten**:
   - Header `Content-Security-Policy` (CSP) dan `Strict-Transport-Security` (HSTS) aktif di semua respons.
   - Pembatasan laju (*rate limiting*) disimpan secara persisten di Redis (`REDIS_URL`) atau tabel PostgreSQL `rate_limits` untuk lingkungan multi-instance.
3. **Kinerja Bundle Frontend**:
   - Pemecahan kode (*code-splitting*) per tab menggunakan `React.lazy` dan `manualChunks` memastikan setiap modul admin dimuat sesuai kebutuhan (*on-demand*).
4. **Pengujian Otomatis**:
   - **Unit Test (`src/utils/villageLogic.test.ts`)**: Menguji fungsi kalkulasi murni.
   - **Integration Test (`src/utils/integration.test.ts`)**: Menguji migrasi PostgreSQL 24 tabel, Foreign Keys, Indexes, idempotensi, rollback transaksi `BEGIN/COMMIT/ROLLBACK`, RBAC, validasi Zod, dan siklus Backup/Restore.
   - **Smoke Test E2E (`scripts/smoke.mjs`)**: Menguji 9 skenario penuh terhadap server HTTP aktif.
