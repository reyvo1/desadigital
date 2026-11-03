import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { PGlite } from '@electric-sql/pglite';
import { createInitialDatabase } from '../data/mockData';
const initialVillageDatabase = createInitialDatabase();
import {
  ALL_24_DOMAIN_TABLES,
  SqlClientAdapter,
  inspectPgCatalog,
  runSqlMigrations,
  syncFullDatabaseToPg,
  syncSingleDomainToPg,
} from '../db/migrator';
import {
  CitizenItemSchema,
  ApbdesItemSchema,
  LoginPayloadSchema,
  PasswordResetRequestSchema,
  PasswordResetConfirmSchema,
  FullVillageDatabaseSchema,
  DOMAIN_ZOD_SCHEMAS,
  resolveAdminRoleTier,
  canModifyDomain,
  canExecuteSystemAction,
} from './validationSchemas';

function createInMemoryPgAdapter(pg: PGlite): SqlClientAdapter {
  return {
    async query<T = any>(sql: string, params?: any[]) {
      const res = await pg.query<T>(sql, params);
      return { rows: res.rows, rowCount: res.affectedRows ?? res.rows.length };
    },
    async exec(sql: string) {
      await pg.exec(sql);
    },
  };
}

describe('Integrasi PostgreSQL 24 Tabel, Migrasi Idempoten, Transaksi, RBAC & Zod', () => {
  it('1. Menjalankan migrasi berversi (001..006), memverifikasi 24 tabel (\\dt), Foreign Keys, Indexes & Idempotensi', async () => {
    const pg = new PGlite();
    const adapter = createInMemoryPgAdapter(pg);
    const migrationsDir = path.resolve(process.cwd(), 'migrations');

    // Pass 1: jalankan migrasi & sinkronisasi penuh
    const pass1Mig = await runSqlMigrations(adapter, migrationsDir);
    assert.equal(pass1Mig.applied.length, 15);
    assert.equal(pass1Mig.skipped.length, 0);

    const pass1Sync = await syncFullDatabaseToPg(adapter, initialVillageDatabase);
    assert.equal(pass1Sync.tablesSynced, 24);
    assert.ok(pass1Sync.totalRows > 100);

    const catalog1 = await inspectPgCatalog(adapter);
    assert.equal(catalog1.domainTablesPresent.length, 24);
    assert.equal(catalog1.domainTablesMissing.length, 0);
    assert.deepEqual(
      [...catalog1.domainTablesPresent].sort(),
      [...ALL_24_DOMAIN_TABLES].sort()
    );

    // Verifikasi Foreign Keys nyata pada katalog PostgreSQL
    const fkNames = catalog1.foreignKeys.map((fk) => fk.constraint_name);
    assert.ok(fkNames.includes('fk_citizens_hamlet'), 'FK citizens -> hamlets wajib ada');
    assert.ok(
      fkNames.includes('fk_letter_requests_letter_type'),
      'FK letter_requests -> letter_types wajib ada'
    );

    // Verifikasi Indexes nyata pada katalog PostgreSQL
    const idxNames = catalog1.indexes.map((i) => i.indexname);
    assert.ok(idxNames.includes('idx_citizens_nik'));
    assert.ok(idxNames.includes('idx_letter_requests_tracking_code'));
    assert.ok(idxNames.includes('idx_citizens_data_gin'));

    // Pass 2: jalankan ulang migrasi & sinkronisasi untuk menguji idempotensi (0 duplikasi)
    const pass2Mig = await runSqlMigrations(adapter, migrationsDir);
    assert.equal(pass2Mig.applied.length, 0, 'Migrasi ke-2 harus skip semua file yang sudah tercatat');
    assert.equal(pass2Mig.skipped.length, 15);

    const pass2Sync = await syncFullDatabaseToPg(adapter, initialVillageDatabase);
    assert.equal(pass2Sync.totalRows, pass1Sync.totalRows, 'Jumlah baris tidak boleh bertambah/duplikat');

    const catalog2 = await inspectPgCatalog(adapter);
    assert.deepEqual(catalog2.rowCounts, catalog1.rowCounts);

    await pg.close();
  });

  it('2. Menjamin transaksi multi-tabel (BEGIN / COMMIT / ROLLBACK) bersih saat terjadi kegagalan', async () => {
    const pg = new PGlite();
    const adapter = createInMemoryPgAdapter(pg);
    const migrationsDir = path.resolve(process.cwd(), 'migrations');
    await runSqlMigrations(adapter, migrationsDir);
    await syncFullDatabaseToPg(adapter, initialVillageDatabase);

    const beforeCountRes = await adapter.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM hamlets;`
    );
    const initialHamletCount = Number(beforeCountRes.rows[0].count);

    // Simulasikan transaksi multi-tabel yang gagal di tengah jalan
    await adapter.query('BEGIN');
    let rolledBack = false;
    try {
      await adapter.query(
        `INSERT INTO hamlets (id, name, data, updated_at) VALUES ('dsn-temp', 'Dusun Transaksi Gagal', '{}'::jsonb, NOW());`
      );
      // Query sengaja dibuat error (kolom tidak ada) untuk memicu ROLLBACK
      await adapter.query(`INSERT INTO citizens (id, kolom_tidak_ada) VALUES ('err', 'err');`);
      await adapter.query('COMMIT');
    } catch {
      await adapter.query('ROLLBACK');
      rolledBack = true;
    }

    assert.equal(rolledBack, true);

    const afterCountRes = await adapter.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM hamlets;`
    );
    assert.equal(
      Number(afterCountRes.rows[0].count),
      initialHamletCount,
      'ROLLBACK wajib membatalkan seluruh perubahan di tabel hamlets'
    );

    await pg.close();
  });

  it('3. Memverifikasi Backup, Mutasi Domain, dan Restore End-to-End pada PostgreSQL', async () => {
    const pg = new PGlite();
    const adapter = createInMemoryPgAdapter(pg);
    const migrationsDir = path.resolve(process.cwd(), 'migrations');
    await runSqlMigrations(adapter, migrationsDir);
    await syncFullDatabaseToPg(adapter, initialVillageDatabase);

    // Ambil snapshot backup dari tabel utama village_database
    const backupRes = await adapter.query<{ data: typeof initialVillageDatabase }>(
      `SELECT data FROM village_database WHERE id = 1;`
    );
    const backupSnapshot = structuredClone(backupRes.rows[0].data);
    const originalTagline = backupSnapshot.siteConfig.tagline;
    const originalNewsCount = backupSnapshot.news.length;

    // Lakukan mutasi pada siteConfig dan news
    const mutatedDb = structuredClone(backupSnapshot);
    mutatedDb.siteConfig.tagline = 'Tagline Mutasi Sementara';
    mutatedDb.news = mutatedDb.news.slice(0, 1);

    await syncSingleDomainToPg(adapter, 'siteConfig', mutatedDb.siteConfig, mutatedDb);
    await syncSingleDomainToPg(adapter, 'news', mutatedDb.news, mutatedDb);

    const mutatedNewsRowCount = await adapter.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM news;`
    );
    assert.equal(Number(mutatedNewsRowCount.rows[0].count), 1);

    // Jalankan Restore end-to-end dari backupSnapshot
    await syncFullDatabaseToPg(adapter, backupSnapshot);

    // Verifikasi baik tabel JSONB maupun tabel ter-normalisasi kembali seperti semula
    const restoredSiteRes = await adapter.query<{ data: { tagline: string } }>(
      `SELECT data FROM site_config WHERE id = 'singleton';`
    );
    assert.equal(restoredSiteRes.rows[0].data.tagline, originalTagline);

    const restoredNewsCount = await adapter.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM news;`
    );
    assert.equal(Number(restoredNewsCount.rows[0].count), originalNewsCount);

    await pg.close();
  });

  it('4. Membedakan hak akses RBAC per endpoint & modul (super_admin vs kades vs operator)', () => {
    const superTier = resolveAdminRoleTier({ username: 'admin', role: 'Sekretaris Desa (Super Admin)' });
    const kadesTier = resolveAdminRoleTier({ username: 'kades', role: 'Kepala Desa' });
    const operatorTier = resolveAdminRoleTier({ username: 'pelayanan', role: 'Kasi Pelayanan' });

    assert.equal(superTier, 'super_admin');
    assert.equal(kadesTier, 'kades');
    assert.equal(operatorTier, 'operator');

    // Super Admin memiliki akses penuh ke seluruh domain & aksi sistem
    assert.equal(canModifyDomain(superTier, 'adminUsers'), true);
    assert.equal(canModifyDomain(superTier, 'siteConfig'), true);
    assert.equal(canModifyDomain(superTier, 'apbdes'), true);
    assert.equal(canExecuteSystemAction(superTier, 'reset_db'), true);
    assert.equal(canExecuteSystemAction(superTier, 'restore_db'), true);

    // Kepala Desa dapat mengelola APBDes & Pembangunan serta mengunduh Backup, tetapi tidak dapat mengubah daftar akun admin atau mereset DB
    assert.equal(canModifyDomain(kadesTier, 'apbdes'), true);
    assert.equal(canModifyDomain(kadesTier, 'projects'), true);
    assert.equal(canModifyDomain(kadesTier, 'adminUsers'), false);
    assert.equal(canModifyDomain(kadesTier, 'siteConfig'), false);
    assert.equal(canExecuteSystemAction(kadesTier, 'backup_db'), true);
    assert.equal(canExecuteSystemAction(kadesTier, 'reset_db'), false);

    // Operator Pelayanan hanya dapat mengelola domain operasional warga/layanan/berita, dan ditolak pada APBDes/adminUsers/reset/restore
    assert.equal(canModifyDomain(operatorTier, 'requests'), true);
    assert.equal(canModifyDomain(operatorTier, 'citizens'), true);
    assert.equal(canModifyDomain(operatorTier, 'news'), true);
    assert.equal(canModifyDomain(operatorTier, 'adminUsers'), false);
    assert.equal(canModifyDomain(operatorTier, 'siteConfig'), false);
    assert.equal(canModifyDomain(operatorTier, 'apbdes'), false);
    assert.equal(canExecuteSystemAction(operatorTier, 'reset_db'), false);
    assert.equal(canExecuteSystemAction(operatorTier, 'restore_db'), false);
    assert.equal(canExecuteSystemAction(operatorTier, 'backup_db'), false);
    assert.equal(canExecuteSystemAction(operatorTier, 'media_write'), true);
  });

  it('5. Memvalidasi seluruh skema payload dengan Zod (menerima data valid & menolak payload cacat)', () => {
    // Validasi seluruh initialVillageDatabase terhadap FullVillageDatabaseSchema & 24 DOMAIN_ZOD_SCHEMAS
    const fullCheck = FullVillageDatabaseSchema.safeParse(initialVillageDatabase);
    assert.equal(fullCheck.success, true, 'initialVillageDatabase harus valid terhadap FullVillageDatabaseSchema');

    for (const [domain, schema] of Object.entries(DOMAIN_ZOD_SCHEMAS)) {
      const domainData = initialVillageDatabase[domain as keyof typeof DOMAIN_ZOD_SCHEMAS];
      const parsed = schema.safeParse(domainData);
      assert.equal(parsed.success, true, `Domain ${domain} harus lolos validasi Zod`);
    }

    // Tolak NIK warga yang bukan 16 digit angka
    const badCitizen = CitizenItemSchema.safeParse({
      id: 'w-99',
      nik: '12345ABC',
      kk: '5102030001',
      name: 'Warga Uji',
      gender: 'Laki-laki',
      dusun: 'Dusun Krajan',
    });
    assert.equal(badCitizen.success, false);

    // Tolak APBDes dengan anggaran negatif
    const badApbdes = ApbdesItemSchema.safeParse({
      id: 'apb-99',
      category: 'Belanja',
      subCategory: 'Pembangunan',
      anggaran: -500000,
      realisasi: 0,
    });
    assert.equal(badApbdes.success, false);

    // Validasi payload Login & Reset Password
    assert.equal(LoginPayloadSchema.safeParse({ username: 'admin', password: '12' }).success, false);
    assert.equal(
      PasswordResetRequestSchema.safeParse({ username: 'admin', nip: '19880412 201503 1 002' }).success,
      true
    );
    assert.equal(
      PasswordResetConfirmSchema.safeParse({
        username: 'admin',
        resetToken: 'RST-123456',
        newPassword: 'passwordBaru2026',
      }).success,
      true
    );
  });

  it('6. Memverifikasi isolasi multi-tenant (SaaS): tabel tenants/subscriptions/usage_counters, composite PK (tenant_id, id), dan seed subscription per tenant', async () => {
    const pg = new PGlite();
    const adapter = createInMemoryPgAdapter(pg);
    const migrationsDir = path.resolve(process.cwd(), 'migrations');
    await runSqlMigrations(adapter, migrationsDir);

    // Tabel SaaS wajib ada
    for (const t of ['tenants', 'subscriptions', 'usage_counters']) {
      const r = await adapter.query<{ exists: boolean }>(
        `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1) AS exists`,
        [t]
      );
      assert.equal(r.rows[0].exists, true, `Tabel ${t} harus ada`);
    }

    // Composite primary key pada tabel domain (citizens) harus mencakup tenant_id
    const pk = await adapter.query<{ column_name: string }>(
      `SELECT a.attname AS column_name
       FROM pg_index i
       JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
       WHERE i.indrelid = 'citizens'::regclass AND i.indisprimary
       ORDER BY array_position(i.indkey, a.attnum)`
    );
    const pkCols = pk.rows.map((r) => r.column_name);
    assert.ok(pkCols.includes('tenant_id'), 'PK citizens harus mencakup tenant_id');
    assert.ok(pkCols.includes('id'), 'PK citizens harus mencakup id');

    // Seed dua tenant dan subscription terpisah
    await adapter.query(`INSERT INTO tenants (id, slug, name, status) VALUES ('desa-a','desa-a','Desa A','active')`);
    await adapter.query(`INSERT INTO tenants (id, slug, name, status) VALUES ('desa-b','desa-b','Desa B','active')`);
    await adapter.query(`INSERT INTO subscriptions (tenant_id, plan, status) VALUES ('desa-a','pro','active')`);
    await adapter.query(`INSERT INTO subscriptions (tenant_id, plan, status) VALUES ('desa-b','free','active')`);

    const subA = await adapter.query<{ plan: string }>(`SELECT plan FROM subscriptions WHERE tenant_id='desa-a'`);
    const subB = await adapter.query<{ plan: string }>(`SELECT plan FROM subscriptions WHERE tenant_id='desa-b'`);
    assert.equal(subA.rows[0].plan, 'pro');
    assert.equal(subB.rows[0].plan, 'free');

    // Usage counter terpisah per tenant/bulan
    await adapter.query(`INSERT INTO usage_counters (tenant_id, month, request_count) VALUES ('desa-a','2026-11',5)`);
    await adapter.query(`INSERT INTO usage_counters (tenant_id, month, request_count) VALUES ('desa-b','2026-11',2)`);
    const uA = await adapter.query<{ request_count: number }>(`SELECT request_count FROM usage_counters WHERE tenant_id='desa-a' AND month='2026-11'`);
    const uB = await adapter.query<{ request_count: number }>(`SELECT request_count FROM usage_counters WHERE tenant_id='desa-b' AND month='2026-11'`);
    assert.equal(Number(uA.rows[0].request_count), 5);
    assert.equal(Number(uB.rows[0].request_count), 2);

    await pg.close();
  });
});
