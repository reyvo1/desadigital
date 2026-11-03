import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const res = await pool.query("SELECT data FROM site_config WHERE id = 'singleton'");
const current = res.rows[0].data;
const seed = {
  rt: '001', rw: '001', birthPlace: 'Bogor', kk: '3201140908120099',
  dusun: 'Dusun 1', readTime: '3 Menit', sellerLabel: 'Pelapak UMKM',
  extraNotes: 'Diterbitkan melalui Anjungan Layanan Mandiri Desa',
  trackingCodeExample: 'SRT-2026-SKU-001',
  letterCategory: 'Layanan Umum & Sosial',
  senderName: 'Warga',
  telegramRecipientName: 'Warga Telegram',
  whatsappRecipientName: 'Warga Pemohon',
  description: 'Alokasi anggaran desa tahun berjalan.',
  author: 'Admin Desa',
  unit: 'Pcs',
  manager: 'BUMDes',
  nip: '-',
  abbreviation: 'LKD',
  areaHa: '100 Ha',
  fileSize: '1.2 MB (PDF)',
  contactPerson: 'Pengelola Fasilitas Desa',
  economicValue: 'Potensi Unggulan Desa',
  highlightStat: 'Potensi Unggulan Desa',
  monthFallback: 'Maret',
};
current.defaults = { ...(current.defaults || {}), ...seed };
// also ensure categories/colors/model/code
if (!current.galleryCategories) current.galleryCategories = ['Semua', 'Gotong Royong', 'Pembangunan', 'Budaya & Seni', 'UMKM & Panen', 'Pemerintahan'];
if (!current.marketCategories) current.marketCategories = ['Semua', 'Hasil Bumi', 'Kuliner Olahan', 'Kerajinan Tangan', 'Pupuk & Bibit'];
if (!current.facilityCategories) current.facilityCategories = ['Semua', 'Pemerintahan', 'Kesehatan', 'Pendidikan', 'Ibadah', 'Ekonomi', 'Wisata & Olahraga'];
if (!current.aiModel) current.aiModel = 'gemini-3.8-flash';
if (!current.defaultClassificationCode) current.defaultClassificationCode = '470';
if (!current.facilityCategoryColors) current.facilityCategoryColors = {
  'Pemerintahan': '#047857', 'Kesehatan': '#e11d48', 'Pendidikan': '#2563eb',
  'Ibadah': '#7c3aed', 'Ekonomi': '#d97706', 'Ekonomi & BUMDes': '#d97706',
  'Wisata & Olahraga': '#0891b2', 'Wisata & Ruang Terbuka': '#0891b2',
};
await pool.query("UPDATE site_config SET data=$1, updated_at=NOW() WHERE id='singleton'", [current]);
console.log('Patched site_config');
await pool.end();
