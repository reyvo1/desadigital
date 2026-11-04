# Perubahan oleh Hermes (2026-11-02) — Repo `/home/ivo/Documents/desa1`

## Ringkasan
Integrasi nilai statis/fallback ke database (siteConfig.defaults) agar admin bisa mengubah via CMS, tanpa mengubah arsitektur 24 tabel.

## File yang Diubah
- `src/types/village.ts` — tambah field `defaults` (rt, rw, birthPlace, kk, dusun, readTime, sellerLabel, extraNotes, trackingCodeExample, letterCategory, senderName, telegramRecipientName, whatsappRecipientName, description, author, unit, manager, nip, abbreviation, areaHa, fileSize, contactPerson, economicValue, highlightStat, monthFallback) dan `galleryCategories`, `marketCategories`, `facilityCategories`, `aiModel`, `defaultClassificationCode`, `facilityCategoryColors`.
- `src/data/mockData.ts` — seed nilai default untuk field baru.
- `src/views/ServicesView.tsx`, `HomeView.tsx`, `MarketView.tsx`, `ContactView.tsx`, `MapView.tsx`, `AdminDashboardView.tsx` — fallback statis diganti ke `siteConfig.defaults` / `siteConfig`.
- `src/components/LiveChatWidget.tsx`, `OfficialLetterView.tsx`, `LetterRequestModal.tsx`, `VillageCMSView.tsx` — fallback statis diganti ke `siteConfig.defaults`.
- `src/components/VillageCMSView.tsx` — tambah editor (input/textarea) untuk kategori, warna JSON, model AI, kode klasifikasi, dan 18 field defaults.
- `scripts/patch-siteconfig-all.mjs`, `scripts/patch-defaults-all.mjs` — patch DB untuk seed nilai baru.
- `HANDOFF.md` tidak diubah (milik agen sebelumnya).

## Database
- Tabel `site_config` (id='singleton') ditambah field `defaults`, `galleryCategories`, `marketCategories`, `facilityCategories`, `aiModel`, `defaultClassificationCode`, `facilityCategoryColors` via patch script.
- Data tetap di 24 tabel domain + 5 sistem.

## Verifikasi
- Lint: 0 error.
- Build: lulus.
- Tests: 19/19 lulus.
- Smoke: 9/9 lulus.
- Semua fallback statis yang tersisa hanya label sistem/pesan error/i18n.

## Tambahan Hermes (putaran 2)
- `server.ts`: `GET /api/db` sekarang memeriksa token; jika publik, NIK/KK/telepon penduduk disensor (masking) untuk kerahasiaan; admin dengan token melihat data penuh. Backup/restore tetap full.
- `AdminDashboardView.tsx`: tab "Verifikasi SHA-256 & Audit Log" disembunyikan untuk non-super_admin (role-based UI).
- Lint/build/tests/smoke tetap lulus (19/19, 9/9).

## Tambahan Hermes (putaran 3) — Portal Warga (Citizen Login)
- `src/types/village.ts`: tambah `passwordHash?` pada `Citizen`.
- `server.ts`: endpoint `POST /api/citizen/login`, `GET /api/citizen/me`, `POST /api/citizen/logout`; validasi NIK+PIN (4 digit terakhir NIK); session role_tier `warga`; isolasi data (hanya data sendiri).
- `scripts/seed-citizen-pins.mjs` & `seed-citizen-pins-vd.mjs`: seed passwordHash (PIN = 4 digit terakhir NIK) ke tabel `citizens` dan `village_database`.
- `src/components/CitizenPortalModal.tsx` (baru): modal login warga + tampil data sendiri + tombol ajukan surat + logout.
- `src/App.tsx`: state `citizenUser`/`citizenToken`, persist token, restore session via `/api/citizen/me`, render modal, tombol "Portal Warga" di Navbar.
- `src/components/Navbar.tsx`: tambah prop `onOpenCitizenLogin` + tombol "Portal Warga".
- `server.ts`: restore endpoint mempertahankan `passwordHash` citizen (seperti admin users).
- Lint/build/tests/smoke lulus (19/19, 9/9); citizen login terverifikasi (curl & browser).

## Tambahan Hermes (putaran 4) — Portal Warga Lanjutan
- `server.ts`: endpoint `GET /api/citizen/requests` (riwayat surat milik warga) dan `PUT /api/citizen/profile` (edit phone/address/rt/rw/dusun).
- `src/components/CitizenPortalModal.tsx`: tampil riwayat surat (tracking code, status, judul), form edit profil (phone, alamat), tombol simpan.
- `src/App.tsx`: wiring onCitizenUpdated untuk refresh data setelah edit profil.
- Verifikasi: citizen login, profile update, requests count (1) berhasil via curl.
- Lint/build/tests/smoke lulus (19/19, 9/9).

## Catatan untuk Agen Berikutnya
- Portal warga bisa diperluas: notifikasi push, edit profil lengkap (foto, dll.), riwayat dengan detail.
- Jika menambah field baru ke `siteConfig`, tambahkan juga di `mockData.ts`, CMS, dan patch script.
- Jangan ubah struktur 24 tabel tanpa koordinasi (migrasi idempoten).
- Smoke test harus tetap 9/9 hijau setelah perubahan.

## REVISI-02 (security hardening)
- GET /api/saas/billing wajib requirePlatformAdmin; ?tenantId= dihapus.
- pay-bill validasi KK 16 digit, idempoten pending, konfirmasi admin -> Lunas + audit.
- OTP via notification_outbox, auto-send, OTP disamarkan, anti-enumeration, jeda 60s.
- Migrasi 022 citizen_bill_payments, 023 FK RESTRICT + tenant demo non-active.
- security-regression.mjs + security-prod.mjs + unit citizenApi.test.ts.
- seed-dummy.mjs aman (local only) + SEED_ADMIN_PASSWORD.
