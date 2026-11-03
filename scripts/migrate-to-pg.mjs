import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import {
  inspectPgCatalog,
  runSqlMigrations,
  syncFullDatabaseToPg,
} from '../src/db/migrator.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DB_FILE = path.join(ROOT_DIR, 'data', 'village-db.json');
const MIGRATIONS_DIR = path.join(ROOT_DIR, 'migrations');
const PGLITE_DIR = path.join(ROOT_DIR, 'data', 'pgdata');

async function acquireSqlClient() {
  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
    try {
      const pool = new pg.Pool({
        connectionString: dbUrl,
        connectionTimeoutMillis: 2500,
      });
      const client = await pool.connect();
      return {
        engine: 'pg-native',
        client,
        close: async () => {
          client.release();
          await pool.end();
        },
      };
    } catch (err) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          `[Migrate-PG] Gagal terhubung ke PostgreSQL produksi (${dbUrl}): ${err.message}`
        );
      }
      console.warn(
        `[Migrate-PG] PostgreSQL daemon di ${dbUrl} tidak merespons (${err.message}). Menggunakan mesin PostgreSQL 16 embedded (PGlite) di ${PGLITE_DIR}.`
      );
    }
  }

  fs.mkdirSync(PGLITE_DIR, { recursive: true });
  const pglite = new PGlite(PGLITE_DIR);
  await pglite.waitReady;
  return {
    engine: 'pglite-postgres16',
    client: {
      query: (sql, params) => pglite.query(sql, params),
      exec: (sql) => pglite.exec(sql),
    },
    close: async () => {
      await pglite.close();
    },
  };
}

async function main() {
  if (!fs.existsSync(DB_FILE)) {
    console.error(`[Migrate-PG] File sumber ${DB_FILE} tidak ditemukan.`);
    process.exit(1);
  }

  const rawDb = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  const conn = await acquireSqlClient();

  try {
    console.log(`[Migrate-PG] Engine aktif: ${conn.engine}`);

    // Pass 1: Run versioned SQL migrations & sync 24 tables in BEGIN...COMMIT
    const migPass1 = await runSqlMigrations(conn.client, MIGRATIONS_DIR);
    console.log(
      `[Migrate-PG] Pass 1 Migrations -> Applied: [${migPass1.applied.join(', ')}], Skipped: [${migPass1.skipped.join(', ')}]`
    );

    const syncPass1 = await syncFullDatabaseToPg(conn.client, rawDb);
    console.log(
      `[Migrate-PG] Pass 1 Data Sync -> ${syncPass1.tablesSynced} tabel modul disinkronkan (${syncPass1.totalRows} total baris).`
    );

    const catalog1 = await inspectPgCatalog(conn.client);

    // Pass 2: Re-run migrations & data sync to verify 100% idempotency (zero duplicates)
    const migPass2 = await runSqlMigrations(conn.client, MIGRATIONS_DIR);
    const syncPass2 = await syncFullDatabaseToPg(conn.client, rawDb);
    const catalog2 = await inspectPgCatalog(conn.client);

    if (migPass2.applied.length !== 0 || migPass2.skipped.length !== migPass2.total) {
      throw new Error(
        `Idempotency check gagal pada schema_migrations: applied=${migPass2.applied.length}`
      );
    }

    for (const tbl of catalog1.domainTablesPresent) {
      if (catalog1.rowCounts[tbl] !== catalog2.rowCounts[tbl]) {
        throw new Error(
          `Duplikasi terdeteksi pada tabel ${tbl}: sebelum=${catalog1.rowCounts[tbl]}, sesudah=${catalog2.rowCounts[tbl]}`
        );
      }
    }

    console.log('\n====================================================================');
    console.log('VERIFIKASI KATALOG POSTGRESQL (\\dt, Foreign Keys, Indexes & Idempotency)');
    console.log('====================================================================');
    console.log(
      `1. Tabel Domain (24/24 Hadir): ${catalog2.domainTablesPresent.length}/24 (Missing: ${catalog2.domainTablesMissing.length})`
    );
    console.log(`   Daftar \\dt (${catalog2.publicTables.length} tabel public):`);
    console.log(`   ${catalog2.publicTables.join(', ')}`);
    console.log(`\n2. Foreign Keys (${catalog2.foreignKeys.length} aktif):`);
    for (const fk of catalog2.foreignKeys) {
      console.log(`   - ${fk.table_name}.${fk.constraint_name}: ${fk.definition}`);
    }
    console.log(`\n3. Indexes (${catalog2.indexes.length} indeks B-Tree/GIN/Unique aktif):`);
    console.log(
      `   Contoh: ${catalog2.indexes
        .slice(0, 10)
        .map((i) => i.indexname)
        .join(', ')} ...`
    );
    console.log(`\n4. Riwayat schema_migrations (${catalog2.migrationsApplied.length} versi):`);
    for (const m of catalog2.migrationsApplied) {
      console.log(`   - v${m.version}: ${m.name} (sha256: ${m.checksum.slice(0, 12)}...)`);
    }
    console.log(
      `\n5. Uji Idempotensi (Pass 1 vs Pass 2): LULUS (${syncPass2.totalRows} baris, 0 duplikasi)`
    );
    console.log('====================================================================\n');
  } finally {
    await conn.close();
  }
}

main().catch((err) => {
  console.error('[Migrate-PG] Error:', err);
  process.exit(1);
});
