import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const res = await pool.query('SELECT data FROM village_database WHERE id=1');
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
current.siteConfig.defaults = { ...(current.siteConfig.defaults || {}), ...seed };
await pool.query('UPDATE village_database SET data=$1, version=version+1, last_updated=NOW() WHERE id=1', [current]);
console.log('Patched defaults');
await pool.end();
