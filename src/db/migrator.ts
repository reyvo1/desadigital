import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { VillageDatabase } from '../types/village';

export interface SqlQueryResult<T = any> {
  rows: T[];
  rowCount?: number | null;
}

export interface SqlClientAdapter {
  query<T = any>(sql: string, params?: any[]): Promise<SqlQueryResult<T>>;
  exec?(sql: string): Promise<void>;
  release?: () => void;
}

export interface DomainTableMetadata {
  table: string;
  idField?: string;
  isSingleton?: boolean;
  extraColumns?: {
    col: string;
    extract: (item: any, fullDb?: VillageDatabase) => any;
  }[];
}

// Ordered so parent FK tables (hamlets, letter_types) are synced before child tables (citizens, letter_requests)
export const ORDERED_DOMAIN_ENTRIES: [
  keyof Omit<VillageDatabase, 'version' | 'lastUpdated'>,
  DomainTableMetadata
][] = [
  ['siteConfig', { table: 'site_config', isSingleton: true }],
  [
    'hamlets',
    {
      table: 'hamlets',
      idField: 'id',
      extraColumns: [{ col: 'name', extract: (item) => item?.name || null }],
    },
  ],
  [
    'letterTypes',
    {
      table: 'letter_types',
      idField: 'code',
      extraColumns: [{ col: 'code', extract: (item) => item?.code || null }],
    },
  ],
  [
    'facilities',
    {
      table: 'facilities',
      idField: 'id',
      extraColumns: [
        { col: 'category', extract: (item) => item?.category || null },
        { col: 'hamlet_name', extract: (item) => item?.dusun || null },
      ],
    },
  ],
  [
    'adminUsers',
    {
      table: 'admin_users',
      idField: 'username',
      extraColumns: [
        { col: 'username', extract: (item) => item?.username || null },
        { col: 'role', extract: (item) => item?.role || null },
      ],
    },
  ],
  [
    'citizens',
    {
      table: 'citizens',
      idField: 'id',
      extraColumns: [
        { col: 'nik', extract: (item) => item?.nik || null },
        {
          col: 'hamlet_id',
          extract: (item, fullDb) => {
            if (!item?.dusun || !fullDb?.hamlets) return null;
            const matched = fullDb.hamlets.find(
              (h) => h.name.toLowerCase() === String(item.dusun).toLowerCase() || h.id === item.dusun
            );
            return matched ? matched.id : null;
          },
        },
      ],
    },
  ],
  [
    'requests',
    {
      table: 'letter_requests',
      idField: 'id',
      extraColumns: [
        { col: 'tracking_code', extract: (item) => item?.trackingCode || null },
        { col: 'citizen_nik', extract: (item) => item?.nik || null },
        {
          col: 'letter_type_code',
          extract: (item, fullDb) => {
            if (!item?.letterType) return null;
            if (!fullDb?.letterTypes) return item.letterType;
            const exists = fullDb.letterTypes.some((lt) => lt.code === item.letterType);
            return exists ? item.letterType : null;
          },
        },
        { col: 'status', extract: (item) => item?.status || null },
      ],
    },
  ],
  [
    'agendas',
    {
      table: 'agendas',
      idField: 'id',
      extraColumns: [{ col: 'date', extract: (item) => item?.date || null }],
    },
  ],
  [
    'apbdes',
    {
      table: 'apbdes',
      idField: 'id',
      extraColumns: [{ col: 'category', extract: (item) => item?.category || null }],
    },
  ],
  [
    'news',
    {
      table: 'news',
      idField: 'id',
      extraColumns: [{ col: 'category', extract: (item) => item?.category || null }],
    },
  ],
  [
    'gallery',
    {
      table: 'gallery',
      idField: 'id',
      extraColumns: [{ col: 'category', extract: (item) => item?.category || null }],
    },
  ],
  [
    'products',
    {
      table: 'products',
      idField: 'id',
      extraColumns: [{ col: 'category', extract: (item) => item?.category || null }],
    },
  ],
  [
    'officials',
    {
      table: 'officials',
      idField: 'id',
      extraColumns: [{ col: 'role', extract: (item) => item?.role || null }],
    },
  ],
  [
    'regulations',
    {
      table: 'regulations',
      idField: 'id',
      extraColumns: [
        {
          col: 'year',
          extract: (item) => (typeof item?.year === 'number' ? item.year : Number(item?.year) || null),
        },
      ],
    },
  ],
  [
    'aspirations',
    {
      table: 'aspirations',
      idField: 'id',
      extraColumns: [{ col: 'status', extract: (item) => item?.status || null }],
    },
  ],
  [
    'potentials',
    {
      table: 'potentials',
      idField: 'id',
      extraColumns: [{ col: 'category', extract: (item) => item?.category || null }],
    },
  ],
  [
    'projects',
    {
      table: 'projects',
      idField: 'id',
      extraColumns: [{ col: 'status', extract: (item) => item?.status || null }],
    },
  ],
  [
    'institutions',
    {
      table: 'institutions',
      idField: 'id',
      extraColumns: [{ col: 'abbreviation', extract: (item) => item?.abbreviation || null }],
    },
  ],
  [
    'mediaAssets',
    {
      table: 'media_assets',
      idField: 'id',
      extraColumns: [{ col: 'category', extract: (item) => item?.category || null }],
    },
  ],
  [
    'auditLogs',
    {
      table: 'audit_logs',
      idField: 'id',
      extraColumns: [{ col: 'module', extract: (item) => item?.module || null }],
    },
  ],
  [
    'chatMessages',
    {
      table: 'chat_messages',
      idField: 'id',
      extraColumns: [
        { col: 'session_id', extract: (item) => item?.sessionId || null },
        { col: 'channel', extract: (item) => item?.channel || null },
      ],
    },
  ],
  [
    'incomingOutboxLetters',
    {
      table: 'incoming_outbox_letters',
      idField: 'id',
      extraColumns: [{ col: 'mail_type', extract: (item) => item?.bookType || item?.mailType || null }],
    },
  ],
  [
    'villageAssets',
    {
      table: 'village_assets',
      idField: 'id',
      extraColumns: [{ col: 'condition', extract: (item) => item?.condition || null }],
    },
  ],
  [
    'populationMutations',
    {
      table: 'population_mutations',
      idField: 'id',
      extraColumns: [
        { col: 'mutation_type', extract: (item) => item?.mutationType || null },
        { col: 'citizen_nik', extract: (item) => item?.nik || item?.citizenNik || null },
      ],
    },
  ],
];

export const DOMAIN_TO_TABLE_MAP: Record<
  keyof Omit<VillageDatabase, 'version' | 'lastUpdated'>,
  DomainTableMetadata
> = Object.fromEntries(ORDERED_DOMAIN_ENTRIES) as any;

export const ALL_24_DOMAIN_TABLES = ORDERED_DOMAIN_ENTRIES.map(([, meta]) => meta.table);

async function execMultiStatementSql(client: SqlClientAdapter, sql: string): Promise<void> {
  if (typeof client.exec === 'function') {
    await client.exec(sql);
  } else {
    await client.query(sql);
  }
}

export async function runSqlMigrations(
  client: SqlClientAdapter,
  migrationsDir: string
): Promise<{ applied: string[]; skipped: string[]; total: number }> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const existingRes = await client.query<{ version: string; checksum: string }>(
    `SELECT version, checksum FROM schema_migrations ORDER BY version ASC;`
  );
  const existingMap = new Map(existingRes.rows.map((r) => [r.version, r.checksum]));

  const applied: string[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    const version = file.split('_')[0];
    const sqlContent = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    const checksum = crypto.createHash('sha256').update(sqlContent).digest('hex');

    if (existingMap.has(version)) {
      skipped.push(file);
      continue;
    }

    await client.query('BEGIN');
    try {
      await execMultiStatementSql(client, sqlContent);
      await client.query(
        `INSERT INTO schema_migrations (version, name, checksum, applied_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (version) DO UPDATE SET checksum = EXCLUDED.checksum, applied_at = NOW();`,
        [version, file, checksum]
      );
      await client.query('COMMIT');
      applied.push(file);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  }

  return { applied, skipped, total: files.length };
}

export async function syncDomainRowsWithinTx(
  client: SqlClientAdapter,
  domain: keyof Omit<VillageDatabase, 'version' | 'lastUpdated'>,
  domainData: unknown,
  fullDb?: VillageDatabase,
  tenantId: string = 'default'
): Promise<number> {
  const cfg = DOMAIN_TO_TABLE_MAP[domain];
  if (!cfg) return 0;

  if (cfg.isSingleton) {
    if (!domainData || typeof domainData !== 'object') return 0;
    await client.query(
      `INSERT INTO ${cfg.table} (tenant_id, id, data, updated_at)
       VALUES ($1, 'singleton', $2::jsonb, NOW())
       ON CONFLICT (tenant_id, id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();`,
      [tenantId, JSON.stringify(domainData)]
    );
    return 1;
  }

  if (!Array.isArray(domainData)) return 0;

  const extraCols = cfg.extraColumns || [];
  const keptIds: string[] = [];

  for (let i = 0; i < domainData.length; i++) {
    const item = domainData[i] as Record<string, unknown>;
    const rowId = String(
      (cfg.idField && item?.[cfg.idField]) || item?.id || `${String(domain)}-${i + 1}`
    );
    keptIds.push(rowId);

    const colNames = ['tenant_id', 'id', ...extraCols.map((c) => c.col), 'data', 'updated_at'];
    const placeholders = colNames.map((_, idx) =>
      idx === colNames.length - 2
        ? `$${idx + 1}::jsonb`
        : idx === colNames.length - 1
        ? 'NOW()'
        : `$${idx + 1}`
    );
    const updateAssignments = [
      ...extraCols.map((c) => `${c.col} = EXCLUDED.${c.col}`),
      'data = EXCLUDED.data',
      'updated_at = NOW()',
    ];

    const values = [
      tenantId,
      rowId,
      ...extraCols.map((c) => c.extract(item, fullDb)),
      JSON.stringify(item),
    ];

    await client.query(
      `INSERT INTO ${cfg.table} (${colNames.join(', ')})
       VALUES (${placeholders.join(', ')})
       ON CONFLICT (tenant_id, id) DO UPDATE SET ${updateAssignments.join(', ')};`,
      values
    );
  }

  if (keptIds.length === 0) {
    await client.query(`DELETE FROM ${cfg.table} WHERE tenant_id = $1;`, [tenantId]);
  } else {
    const params = keptIds.map((_, idx) => `$${idx + 2}`).join(', ');
    await client.query(`DELETE FROM ${cfg.table} WHERE tenant_id = $1 AND id NOT IN (${params});`, [tenantId, ...keptIds]);
  }

  return keptIds.length;
}

export async function syncFullDatabaseToPg(
  client: SqlClientAdapter,
  db: VillageDatabase,
  tenantId: string = 'default'
): Promise<{ tablesSynced: number; totalRows: number }> {
  await client.query('BEGIN');
  try {
    await client.query(
      `INSERT INTO village_database (tenant_id, data, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (tenant_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();`,
      [tenantId, JSON.stringify(db)]
    );

    let tablesSynced = 0;
    let totalRows = 0;

    for (const [domain] of ORDERED_DOMAIN_ENTRIES) {
      const count = await syncDomainRowsWithinTx(client, domain, db[domain], db, tenantId);
      tablesSynced += 1;
      totalRows += count;
    }

    await client.query('COMMIT');
    return { tablesSynced, totalRows };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

export async function syncSingleDomainToPg(
  client: SqlClientAdapter,
  domain: keyof Omit<VillageDatabase, 'version' | 'lastUpdated'>,
  domainData: unknown,
  fullDb: VillageDatabase,
  tenantId: string = 'default'
): Promise<void> {
  await client.query('BEGIN');
  try {
    await client.query(
      `INSERT INTO village_database (tenant_id, data, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (tenant_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();`,
      [tenantId, JSON.stringify(fullDb)]
    );
    await syncDomainRowsWithinTx(client, domain, domainData, fullDb, tenantId);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

export interface PgCatalogInspection {
  publicTables: string[];
  domainTablesPresent: string[];
  domainTablesMissing: string[];
  foreignKeys: { constraint_name: string; table_name: string; definition: string }[];
  indexes: { indexname: string; tablename: string }[];
  migrationsApplied: { version: string; name: string; checksum: string }[];
  rowCounts: Record<string, number>;
}

export async function inspectPgCatalog(client: SqlClientAdapter): Promise<PgCatalogInspection> {
  // \dt equivalent
  const tablesRes = await client.query<{ tablename: string }>(`
    SELECT tablename
    FROM pg_catalog.pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename ASC;
  `);
  const publicTables = tablesRes.rows.map((r) => r.tablename);

  const domainTablesPresent = ALL_24_DOMAIN_TABLES.filter((t) => publicTables.includes(t));
  const domainTablesMissing = ALL_24_DOMAIN_TABLES.filter((t) => !publicTables.includes(t));

  // Foreign keys check
  const fkRes = await client.query<{
    constraint_name: string;
    table_name: string;
    definition: string;
  }>(`
    SELECT
      con.conname AS constraint_name,
      rel.relname AS table_name,
      pg_get_constraintdef(con.oid) AS definition
    FROM pg_catalog.pg_constraint con
    JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid
    JOIN pg_catalog.pg_namespace nsp ON nsp.oid = con.connamespace
    WHERE nsp.nspname = 'public' AND con.contype = 'f'
    ORDER BY con.conname ASC;
  `);

  // Indexes check
  const idxRes = await client.query<{ indexname: string; tablename: string }>(`
    SELECT indexname, tablename
    FROM pg_catalog.pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename ASC, indexname ASC;
  `);

  const migRes = await client.query<{ version: string; name: string; checksum: string }>(`
    SELECT version, name, checksum
    FROM schema_migrations
    ORDER BY version ASC;
  `);

  const rowCounts: Record<string, number> = {};
  for (const tbl of domainTablesPresent) {
    const cnt = await client.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM ${tbl};`);
    rowCounts[tbl] = Number(cnt.rows[0]?.count || 0);
  }

  return {
    publicTables,
    domainTablesPresent,
    domainTablesMissing,
    foreignKeys: fkRes.rows,
    indexes: idxRes.rows,
    migrationsApplied: migRes.rows,
    rowCounts,
  };
}
