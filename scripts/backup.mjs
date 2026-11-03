import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DB_FILE = path.join(ROOT_DIR, 'data', 'village-db.json');
const BACKUP_DIR = path.join(ROOT_DIR, 'data', 'backups');

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

if (!fs.existsSync(DB_FILE)) {
  console.error('[Backup] File data/village-db.json belum ditemukan.');
  process.exit(1);
}

const now = new Date();
const stamp = now.toISOString().replace(/[:.]/g, '-');
const targetFile = path.join(BACKUP_DIR, `village-db-${stamp}.json`);

fs.copyFileSync(DB_FILE, targetFile);
console.log(`[Backup] Snapshot database berhasil disimpan ke: ${targetFile}`);

// Retensi: simpan maksimal 10 snapshot terakhir
const files = fs
  .readdirSync(BACKUP_DIR)
  .filter((f) => f.startsWith('village-db-') && f.endsWith('.json'))
  .map((f) => ({
    name: f,
    fullPath: path.join(BACKUP_DIR, f),
    mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs,
  }))
  .sort((a, b) => b.mtime - a.mtime);

if (files.length > 10) {
  for (const old of files.slice(10)) {
    fs.unlinkSync(old.fullPath);
    console.log(`[Backup] Menghapus snapshot lama (>10): ${old.name}`);
  }
}
