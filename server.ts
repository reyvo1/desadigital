import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { lookup } from 'node:dns/promises';
import net from 'net';
import { fileURLToPath } from 'url';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createServer as createViteServer } from 'vite';
import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';
import { GoogleGenAI } from '@google/genai';
import { createInitialDatabase, INITIAL_SITE_CONFIG } from './src/data/mockData';
import {
  AdminUser,
  ChatMessage,
  CitizenAspiration,
  LetterRequest,
  MarketCollectiveOrder,
  MediaAsset,
  VillageDatabase,
} from './src/types/village';
import { evaluateTelegramBotCommand, lookupCitizenOneStopPortal } from './src/utils/villageLogic';
import {
  ALL_24_DOMAIN_TABLES,
  DOMAIN_TO_TABLE_MAP as MIGRATOR_DOMAIN_MAP,
  SqlClientAdapter,
  inspectPgCatalog,
  runSqlMigrations,
  syncFullDatabaseToPg,
  syncSingleDomainToPg,
} from './src/db/migrator';
import {
  AdminRoleTier,
  DOMAIN_ZOD_SCHEMAS,
  FullVillageDatabaseSchema,
  LoginPayloadSchema,
  MediaUploadPayloadSchema,
  PasswordResetConfirmSchema,
  PasswordResetRequestSchema,
  PublicAspirationSubmissionSchema,
  PublicRequestSubmissionSchema,
  canExecuteSystemAction,
  canModifyDomain,
  resolveAdminRoleTier,
} from './src/utils/validationSchemas';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const DB_FILE_PATH = path.join(DATA_DIR, 'village-db.json');
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const PGLITE_DIR = path.join(DATA_DIR, 'pgdata-server');

// ============================================================================
// 1. PASSWORD HASHING (SCRYPT) & SESSION TOKEN MANAGEMENT (8 HOURS, RBAC)
// ============================================================================
const SCRYPT_PREFIX = 'scrypt$';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

export function hashPasswordScrypt(plainPassword: string): string {
  if (plainPassword.startsWith(SCRYPT_PREFIX)) {
    return plainPassword;
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(plainPassword, salt, 64).toString('hex');
  return `${SCRYPT_PREFIX}${salt}$${derived}`;
}

export function verifyPasswordScrypt(plainPassword: string, storedHash?: string, legacyPlain?: string): boolean {
  if (storedHash && storedHash.startsWith(SCRYPT_PREFIX)) {
    const parts = storedHash.split('$');
    if (parts.length === 3) {
      const [, salt, keyHex] = parts;
      const derived = crypto.scryptSync(plainPassword, salt, 64);
      const keyBuf = Buffer.from(keyHex, 'hex');
      if (derived.length === keyBuf.length && crypto.timingSafeEqual(derived, keyBuf)) {
        return true;
      }
    }
    return false;
  }
  if (legacyPlain) {
    return plainPassword === legacyPlain;
  }
  return false;
}

function hashTokenSha256(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export interface ActiveSession {
  token: string;
  tokenHash: string;
  username: string;
  fullName: string;
  role: string;
  roleTier: AdminRoleTier;
  nip: string;
  tenantId?: string;
  isPlatformAdmin?: boolean;
  createdAt: number;
  expiresAt: number;
  rotatedFrom?: string;
}

const activeSessions = new Map<string, ActiveSession>();
const passwordResetStore = new Map<
  string,
  { tokenHash: string; username: string; expiresAt: number; used: boolean }
>();

const ssoStateStore = new Map<string, { tenantId: string; createdAt: number }>();

function cleanExpiredSessions(): void {
  const now = Date.now();
  for (const [token, session] of activeSessions.entries()) {
    if (session.expiresAt <= now) {
      activeSessions.delete(token);
    }
  }
}

function isAdminRole(role: string): boolean {
  const r = (role || '').toLowerCase();
  return (
    r.includes('admin') ||
    r.includes('super') ||
    r.includes('kepala desa') ||
    r.includes('sekretaris') ||
    r.includes('operator') ||
    r.includes('kasi') ||
    r.includes('kaur')
  );
}

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return null;
}

async function resolveSessionFromToken(token: string): Promise<ActiveSession | null> {
  cleanExpiredSessions();
  const cached = activeSessions.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    return cached;
  }
  if (pgAdapter) {
    try {
      const tHash = hashTokenSha256(token);
      const res = await pgAdapter.query<{
        username: string;
        role_tier: AdminRoleTier;
        user_data: any;
        expires_at: string;
        tenant_id: string | null;
      }>(
        `SELECT username, role_tier, user_data, expires_at, tenant_id
         FROM auth_sessions
         WHERE token_hash = $1 AND expires_at > NOW()
         LIMIT 1;`,
        [tHash]
      );
      if (res.rows.length > 0) {
        const row = res.rows[0];
        const uData = typeof row.user_data === 'string' ? JSON.parse(row.user_data) : row.user_data;
        const resolvedTenantId = row.tenant_id || uData.tenantId || null;
        if (!resolvedTenantId) {
          return null;
        }
        const restored: ActiveSession = {
          token,
          tokenHash: tHash,
          username: row.username,
          fullName: uData.fullName || row.username,
          role: uData.role || 'Operator SID',
          roleTier: row.role_tier || resolveAdminRoleTier({ username: row.username, role: uData.role || '' }),
          nip: uData.nip || '-',
          isPlatformAdmin: uData.isPlatformAdmin === true,
          tenantId: resolvedTenantId,
          createdAt: Date.now(),
          expiresAt: new Date(row.expires_at).getTime(),
        };
        activeSessions.set(token, restored);
        return restored;
      }
    } catch {}
  }
  return null;
}

async function persistSessionToPg(session: ActiveSession): Promise<void> {
  if (!pgAdapter) return;
  try {
    await pgAdapter.query(
      `INSERT INTO auth_sessions (token_hash, username, role_tier, user_data, expires_at, rotated_from, created_at, tenant_id)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6, NOW(), $7)
       ON CONFLICT (token_hash) DO UPDATE SET expires_at = EXCLUDED.expires_at, tenant_id = EXCLUDED.tenant_id;`,
      [
        session.tokenHash,
        session.username,
        session.roleTier,
        JSON.stringify({
          username: session.username,
          fullName: session.fullName,
          role: session.role,
          nip: session.nip,
          isPlatformAdmin: session.isPlatformAdmin,
          tenantId: session.tenantId,
        }),
        new Date(session.expiresAt).toISOString(),
        session.rotatedFrom || null,
        session.tenantId || 'default',
      ]
    );
  } catch {}
}

async function deleteSessionFromPg(token: string): Promise<void> {
  if (!pgAdapter) return;
  try {
    await pgAdapter.query(`DELETE FROM auth_sessions WHERE token_hash = $1;`, [hashTokenSha256(token)]);
  } catch {}
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({
      status: 'error',
      error: 'Unauthorized: Token otorisasi (Authorization: Bearer <token>) wajib disertakan.',
    });
    return;
  }
  resolveSessionFromToken(token)
    .then((session) => {
      if (!session || session.expiresAt <= Date.now()) {
        activeSessions.delete(token);
        res.status(401).json({
          status: 'error',
          error:
            'Unauthorized: Sesi perangkat desa tidak valid atau telah kedaluwarsa (8 jam). Silakan login kembali.',
        });
        return;
      }
      if (!isAdminRole(session.role)) {
        res.status(403).json({
          status: 'error',
          error: 'Forbidden: Hak akses peran tidak mencukupi untuk mengubah database desa.',
        });
        return;
      }
      const currentTenantId = tenantStorage.getStore() || 'default';
      if (!session.isPlatformAdmin && (session.tenantId || 'default') !== currentTenantId) {
        res.status(403).json({
          status: 'error',
          error: 'Forbidden: Sesi tidak valid untuk tenant ini.',
        });
        return;
      }
      (req as any).adminSession = session;
      (req as any).adminRoleTier = session.roleTier;
      next();
    })
    .catch(() => {
      res.status(401).json({ status: 'error', error: 'Unauthorized: Gagal memvalidasi sesi.' });
    });
}

function requirePlatformAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ status: 'error', error: 'Unauthorized: Token wajib disertakan.' });
    return;
  }
  resolveSessionFromToken(token)
    .then((session) => {
      if (!session || session.expiresAt <= Date.now()) {
        res.status(401).json({ status: 'error', error: 'Unauthorized: Sesi tidak valid atau kedaluwarsa.' });
        return;
      }
      if (!isAdminRole(session.role)) {
        res.status(403).json({ status: 'error', error: 'Forbidden: Hak akses tidak mencukupi.' });
        return;
      }
      if (!session.isPlatformAdmin || (session.tenantId || 'default') !== 'default') {
        res.status(403).json({ status: 'error', error: 'Forbidden: Hanya platform super admin yang diizinkan.' });
        return;
      }
      (req as any).adminSession = session;
      (req as any).adminRoleTier = session.roleTier;
      next();
    })
    .catch(() => {
      res.status(401).json({ status: 'error', error: 'Unauthorized: Gagal memvalidasi sesi.' });
    });
}
// ============================================================================
interface RateBucket {
  count: number;
  resetAt: number;
}

const memoryRateBuckets = new Map<string, RateBucket>();

function getClientIp(req: Request): string {
  if (req.ip) return req.ip;
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

async function incrementRedisRateBucket(
  bucketKey: string,
  windowMs: number
): Promise<{ count: number; resetAt: number } | null> {
  const redisUrl = (process.env.REDIS_URL || '').trim();
  if (!redisUrl) return null;
  try {
    const parsed = new URL(redisUrl);
    const host = parsed.hostname || '127.0.0.1';
    const port = Number(parsed.port) || 6379;
    const ttlSeconds = Math.ceil(windowMs / 1000);

    return await new Promise((resolve) => {
      const socket = net.createConnection({ host, port, timeout: 600 }, () => {
        const cmd = `*2\r\n$4\r\nINCR\r\n$${Buffer.byteLength(bucketKey)}\r\n${bucketKey}\r\n`;
        socket.write(cmd);
      });
      socket.once('data', (buf) => {
        const reply = buf.toString('utf-8');
        const match = reply.match(/:(\d+)/);
        const count = match ? Number(match[1]) : 1;
        if (count === 1) {
          const expireCmd = `*3\r\n$6\r\nEXPIRE\r\n$${Buffer.byteLength(bucketKey)}\r\n${bucketKey}\r\n$${String(ttlSeconds).length}\r\n${ttlSeconds}\r\n`;
          socket.write(expireCmd);
        }
        socket.end();
        resolve({ count, resetAt: Date.now() + windowMs });
      });
      socket.on('error', () => resolve(null));
      socket.on('timeout', () => {
        socket.destroy();
        resolve(null);
      });
    });
  } catch {
    return null;
  }
}

async function checkPersistentRateLimit(
  prefix: 'api' | 'login',
  ip: string,
  windowMs: number,
  maxAllowed: number
): Promise<{ allowed: boolean; count: number }> {
  const bucketKey = `${prefix}:${ip}`;
  const now = Date.now();

  // 1. Try Redis if REDIS_URL is configured
  const redisResult = await incrementRedisRateBucket(bucketKey, windowMs);
  if (redisResult) {
    return { allowed: redisResult.count <= maxAllowed, count: redisResult.count };
  }

  // 2. Try PostgreSQL rate_limits table (persistent across multi-instance & restarts)
  if (pgAdapter) {
    try {
      const nextResetIso = new Date(now + windowMs).toISOString();
      const res = await pgAdapter.query<{ count: number }>(
        `INSERT INTO rate_limits (bucket_key, count, reset_at, updated_at)
         VALUES ($1, 1, $2::timestamptz, NOW())
         ON CONFLICT (bucket_key) DO UPDATE SET
           count = CASE WHEN rate_limits.reset_at <= NOW() THEN 1 ELSE rate_limits.count + 1 END,
           reset_at = CASE WHEN rate_limits.reset_at <= NOW() THEN $2::timestamptz ELSE rate_limits.reset_at END,
           updated_at = NOW()
         RETURNING count;`,
        [bucketKey, nextResetIso]
      );
      const count = Number(res.rows[0]?.count || 1);
      return { allowed: count <= maxAllowed, count };
    } catch {
      // Fallback to in-memory only if PG query fails
    }
  }

  // 3. In-memory fallback (dev only)
  const existing = memoryRateBuckets.get(bucketKey);
  if (!existing || existing.resetAt <= now) {
    memoryRateBuckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return { allowed: true, count: 1 };
  }
  existing.count += 1;
  return { allowed: existing.count <= maxAllowed, count: existing.count };
}

function strictRateLimiter(max: number, windowMs: number = 60 * 1000): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    const ip = getClientIp(req);
    checkPersistentRateLimit('api', `${ip}:strict`, windowMs, max)
      .then(({ allowed }) => {
        if (!allowed) {
          res.status(429).json({ error: 'Terlalu banyak permintaan. Coba lagi nanti.' });
          return;
        }
        next();
      })
      .catch(() => next());
  };
}

function apiRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const ip = getClientIp(req);
  checkPersistentRateLimit('api', ip, 60 * 1000, 300)
    .then(({ allowed }) => {
      if (!allowed) {
        res.status(429).json({
          status: 'error',
          error:
            'Terlalu banyak permintaan API (batas 300 request/menit). Silakan coba beberapa saat lagi.',
        });
        return;
      }
      next();
    })
    .catch(() => next());
}

async function resetRateLimitBucket(prefix: 'api' | 'login', ip: string): Promise<void> {
  const bucketKey = `${prefix}:${ip}`;
  memoryRateBuckets.delete(bucketKey);
  if (pgAdapter) {
    try {
      await pgAdapter.query(`DELETE FROM rate_limits WHERE bucket_key = $1;`, [bucketKey]);
    } catch {}
  }
}

function loginRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const ip = getClientIp(req);
  checkPersistentRateLimit('login', ip, 15 * 60 * 1000, 25)
    .then(({ allowed }) => {
      if (!allowed) {
        res.status(429).json({
          status: 'error',
          error:
            'Terlalu banyak percobaan login (maksimal 25 kali per 15 menit). Silakan tunggu 15 menit.',
        });
        return;
      }
      next();
    })
    .catch(() => next());
}

// ============================================================================
// 3. POSTGRESQL SINGLE SOURCE OF TRUTH + VERSIONED MIGRATIONS + 24 TABLES
// ============================================================================
export const DOMAIN_TO_TABLE_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(MIGRATOR_DOMAIN_MAP).map(([k, v]) => [k, v.table])
);

let pgPool: pg.Pool | null = null;
let pgliteInstance: PGlite | null = null;
let pgAdapter: SqlClientAdapter | null = null;
const tenantStorage = new AsyncLocalStorage<string>();
let pgAvailable = false;
let pgEngineLabel = 'uninitialized';
let pgLastError: string | null = null;
const cachedDbMemory = new Map<string, VillageDatabase>();

async function initPostgres(initialDb: VillageDatabase): Promise<void> {
  const isProd = process.env.NODE_ENV === 'production';
  const dbUrl = (process.env.DATABASE_URL || '').trim();

  // 1. Try native pg.Pool when DATABASE_URL is postgresql://
  if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
    try {
      const pool = new Pool({
        connectionString: dbUrl,
        connectionTimeoutMillis: 2500,
      });
      const testClient = await pool.connect();
      testClient.release();

      pgPool = pool;
      pgAdapter = {
        query: async <T = any>(sql: string, params?: any[]) => {
          const res = await pool.query(sql, params);
          return { rows: res.rows as T[], rowCount: res.rowCount };
        },
        exec: async (sql) => {
          const client = await pool.connect();
          try {
            await client.query(sql);
          } finally {
            client.release();
          }
        },
      };
      pgEngineLabel = 'PostgreSQL Native Pool (Single Source of Truth)';
      pgAvailable = true;
    } catch (err: any) {
      pgLastError = err?.message || 'PostgreSQL connection failed';
      if (isProd) {
        throw new Error(
          `[CRITICAL] NODE_ENV=production mewajibkan koneksi PostgreSQL aktif sebagai Single Source of Truth! Gagal terhubung ke DATABASE_URL: ${pgLastError}`
        );
      }
    }
  } else if (isProd) {
    throw new Error(
      '[CRITICAL] NODE_ENV=production mewajibkan variabel DATABASE_URL PostgreSQL yang valid!'
    );
  }

  // 2. If not connected to external daemon in dev/test, boot embedded PostgreSQL 16 (PGlite)
  if (!pgAdapter) {
    try {
      fs.mkdirSync(PGLITE_DIR, { recursive: true });
      pgliteInstance = new PGlite(PGLITE_DIR);
      await pgliteInstance.waitReady;
      pgAdapter = {
        query: (sql, params) => pgliteInstance!.query(sql, params),
        exec: async (sql) => {
          await pgliteInstance!.exec(sql);
        },
      };
      pgEngineLabel = 'PostgreSQL 16 Embedded (PGlite + 24 Normalized Tables)';
      pgAvailable = true;
      pgLastError = null;
    } catch (err: any) {
      pgAvailable = false;
      pgLastError = err?.message || 'PGlite initialization failed';
    }
  }

  if (pgAdapter) {
    // Run versioned SQL migrations (001, 002, 003) idempotently
    const migStatus = await runSqlMigrations(pgAdapter, MIGRATIONS_DIR);
    console.log(
      `[DB] Migrations verified (${migStatus.total} total, ${migStatus.applied.length} applied, ${migStatus.skipped.length} skipped).`
    );

    // Check if village_database already has authoritative state
    const existing = await pgAdapter.query<{ data: VillageDatabase }>(
      `SELECT data FROM village_database WHERE tenant_id = 'default' LIMIT 1;`
    );
    if (existing.rows.length > 0 && existing.rows[0].data) {
      const pgDb = existing.rows[0].data;
      if ((pgDb.version || 0) >= (initialDb.version || 0)) {
        if (!isProd) {
          fs.writeFileSync(DB_FILE_PATH, JSON.stringify(pgDb, null, 2), 'utf-8');
        }
        const enrichedPgDb = !isProd ? ensureDatabase() : { ...initialDb, ...pgDb, siteConfig: { ...initialDb.siteConfig, ...pgDb.siteConfig } };
        cachedDbMemory.set('default', enrichedPgDb);
        await syncFullDatabaseToPg(pgAdapter, enrichedPgDb, 'default');
        return;
      }
    }

    await syncFullDatabaseToPg(pgAdapter, initialDb, 'default');
    cachedDbMemory.set('default', initialDb);
    console.log(`[DB] ${pgEngineLabel} initialized with 24 normalized tables.`);
  }
}

function normalizeAdminUsers(users: AdminUser[]): { users: AdminUser[]; migrated: boolean } {
  let migrated = false;
  const normalized = (users || []).map((u) => {
    const copy: AdminUser = { ...u };
    if (copy.password && !copy.password.startsWith(SCRYPT_PREFIX)) {
      copy.passwordHash = hashPasswordScrypt(copy.password);
      delete copy.password;
      migrated = true;
    } else if (copy.password && copy.password.startsWith(SCRYPT_PREFIX)) {
      copy.passwordHash = copy.password;
      delete copy.password;
      migrated = true;
    } else if (!copy.passwordHash) {
      const fallbackPwd = (process.env.DEFAULT_ADMIN_PASSWORD || 'desa2026').trim();
      copy.passwordHash = hashPasswordScrypt(fallbackPwd);
      delete copy.password;
      migrated = true;
    }
    return copy;
  });
  return { users: normalized, migrated };
}

function sanitizeDbForClient(db: VillageDatabase, authed: boolean = false): VillageDatabase {
  const sanitizedUsers = authed
    ? (db.adminUsers || []).map((u) => ({
        username: u.username,
        fullName: u.fullName,
        role: u.role,
        nip: u.nip,
        passwordHash: u.passwordHash ? '[SCRYPT_PROTECTED]' : undefined,
      }))
    : [];
  const citizens = (db.citizens || []).map((c) => {
    const { passwordHash, ...rest } = c as any;
    if (authed) return rest;
    // Mask sensitive fields for public access
    return {
      ...rest,
      nik: c.nik ? c.nik.slice(0, 4) + '********' + c.nik.slice(-4) : c.nik,
      kk: c.kk ? c.kk.slice(0, 4) + '********' + c.kk.slice(-4) : c.kk,
      phone: c.phone ? '********' : c.phone,
    };
  });
  return {
    ...db,
    adminUsers: sanitizedUsers,
    citizens,
    // Public view: strip sensitive/internal domains
    requests: authed ? db.requests : [],
    populationMutations: authed ? db.populationMutations : [],
    auditLogs: authed ? db.auditLogs : [],
    chatMessages: authed ? db.chatMessages : [],
    incomingOutboxLetters: authed ? db.incomingOutboxLetters : [],
    villageAssets: authed ? db.villageAssets : [],
    mediaAssets: authed ? [] : [], // media served via /api/media with auth
    siteConfig: authed ? db.siteConfig : { ...db.siteConfig, marketOrders: [] },
  };
}

export function ensureDatabase(): VillageDatabase {
  const tenantId = tenantStorage.getStore() || 'default';
  const cached = cachedDbMemory.get(tenantId);
  if (cached) return cached;

  const tenantFile = path.join(DATA_DIR, `village-db-${tenantId}.json`);

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const initial = createInitialDatabase();
  const normInitial = normalizeAdminUsers(initial.adminUsers || []);
  initial.adminUsers = normInitial.users;

  if (!fs.existsSync(tenantFile)) {
    if (tenantId === 'default' && fs.existsSync(DB_FILE_PATH)) {
      try {
        const legacy = JSON.parse(fs.readFileSync(DB_FILE_PATH, 'utf-8')) as VillageDatabase;
        fs.writeFileSync(tenantFile, JSON.stringify(legacy, null, 2), 'utf-8');
        return legacy;
      } catch {}
    }
    fs.writeFileSync(tenantFile, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }

  try {
    const raw = fs.readFileSync(tenantFile, 'utf-8');
    const parsed = JSON.parse(raw) as VillageDatabase;
    let mutated = false;

    if ((parsed.version || 0) < 8) {
      parsed.version = 8;
      mutated = true;
    }

    if (!parsed.siteConfig) {
      parsed.siteConfig = { ...INITIAL_SITE_CONFIG };
      mutated = true;
    } else {
      const cfg = parsed.siteConfig as Record<string, any>;
      if (!cfg.district && cfg.regency) { cfg.district = cfg.regency; mutated = true; }
      if (!cfg.headOfVillageName && cfg.kadesName) { cfg.headOfVillageName = cfg.kadesName; mutated = true; }
      if (!cfg.headOfVillageTitle && cfg.kadesTitle) { cfg.headOfVillageTitle = cfg.kadesTitle; mutated = true; }
      if (!cfg.headOfVillageNip && cfg.kadesNip) { cfg.headOfVillageNip = cfg.kadesNip; mutated = true; }
      if (!cfg.headOfVillagePhotoUrl && cfg.kadesPhotoUrl) { cfg.headOfVillagePhotoUrl = cfg.kadesPhotoUrl; mutated = true; }
      if (!cfg.headOfVillageWelcome && cfg.kadesWelcomeMessage) { cfg.headOfVillageWelcome = cfg.kadesWelcomeMessage; mutated = true; }
      if (!cfg.visionText && cfg.vision) { cfg.visionText = cfg.vision; mutated = true; }
      if (!cfg.officeEmail && cfg.officialEmail) { cfg.officeEmail = cfg.officialEmail; mutated = true; }
      if (!cfg.boundaries && cfg.borders) { cfg.boundaries = cfg.borders; mutated = true; }
      parsed.siteConfig = { ...INITIAL_SITE_CONFIG, ...parsed.siteConfig };
      if (!cfg.socialMedia?.telegram) {
        parsed.siteConfig.socialMedia = { ...INITIAL_SITE_CONFIG.socialMedia, ...parsed.siteConfig.socialMedia };
      }
      if (!parsed.siteConfig.galleryCategories) parsed.siteConfig.galleryCategories = INITIAL_SITE_CONFIG.galleryCategories;
      if (!parsed.siteConfig.marketCategories) parsed.siteConfig.marketCategories = INITIAL_SITE_CONFIG.marketCategories;
      if (!parsed.siteConfig.facilityCategories) parsed.siteConfig.facilityCategories = INITIAL_SITE_CONFIG.facilityCategories;
      if (!parsed.siteConfig.aiModel) parsed.siteConfig.aiModel = INITIAL_SITE_CONFIG.aiModel;
      if (!parsed.siteConfig.defaultClassificationCode) parsed.siteConfig.defaultClassificationCode = INITIAL_SITE_CONFIG.defaultClassificationCode;
      if (!parsed.siteConfig.facilityCategoryColors) parsed.siteConfig.facilityCategoryColors = INITIAL_SITE_CONFIG.facilityCategoryColors;
      if (!parsed.siteConfig.defaults) parsed.siteConfig.defaults = INITIAL_SITE_CONFIG.defaults;
    }

    if (!Array.isArray(parsed.citizens) || parsed.citizens.length === 0) {
      parsed.citizens = initial.citizens;
      mutated = true;
    }
    // hardenAdminUsers removed (not critical for Fase 1)

    if (mutated) {
      fs.writeFileSync(tenantFile, JSON.stringify(parsed, null, 2), 'utf-8');
    }
    return parsed;
  } catch {
    fs.writeFileSync(tenantFile, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
}

export async function saveDatabase(db: VillageDatabase, changedDomain?: string): Promise<void> {
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd && !pgAvailable) {
    throw new Error(
      '[CRITICAL] Menolak penulisan ke file JSON pada mode production (PostgreSQL Single Source of Truth tidak tersedia).'
    );
  }

  db.lastUpdated = new Date().toISOString();
  const norm = normalizeAdminUsers(db.adminUsers || []);
  db.adminUsers = norm.users;
  const tenantId = tenantStorage.getStore() || 'default';

  // Write-through: PG first
  if (pgAvailable && pgAdapter) {
    try {
      if (changedDomain && changedDomain in MIGRATOR_DOMAIN_MAP) {
        await syncSingleDomainToPg(
          pgAdapter,
          changedDomain as keyof Omit<VillageDatabase, 'version' | 'lastUpdated'>,
          (db as any)[changedDomain],
          db,
          tenantId
        );
      } else {
        await syncFullDatabaseToPg(pgAdapter, db, tenantId);
      }
    } catch (err: any) {
      pgLastError = err?.message || 'Transaction error';
      throw new Error(`[CRITICAL] Gagal menulis ke PostgreSQL: ${pgLastError}`);
    }
  }

  // Only update cache/file after PG success
  cachedDbMemory.set(tenantId, db);

  if (!isProd) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tenantFile = path.join(DATA_DIR, `village-db-${tenantId}.json`);
    fs.writeFileSync(tenantFile, JSON.stringify(db, null, 2), 'utf-8');
  }
}

function createBackupSnapshot(label = 'manual'): { filename: string; path: string; sizeBytes: number; createdAt: string } {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  const db = ensureDatabase();
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `village-backup-${label}-${ts}.json`;
  const targetPath = path.join(BACKUP_DIR, filename);
  const raw = JSON.stringify(db, null, 2);
  fs.writeFileSync(targetPath, raw, 'utf-8');
  return {
    filename,
    path: targetPath,
    sizeBytes: Buffer.byteLength(raw, 'utf-8'),
    createdAt: new Date().toISOString(),
  };
}

function formatNowTimestamp(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;
}

function buildLocalGroundedAnswer(prompt: string, db: VillageDatabase): string {
  const q = prompt.toLowerCase();
  const cfg = db.siteConfig;
  const defaultClassCode = cfg.defaultClassificationCode || '470';

  const ticketMatch = prompt.match(/([A-Z]{2,6}-\d{4}(?:-[A-Z0-9_]{2,12})?-\d{3,5})/i);
  if (ticketMatch) {
    const code = ticketMatch[1].toUpperCase();
    const found = db.requests.find((r) => (r.trackingCode || '').toUpperCase() === code);
    if (found) {
      return `Status Permohonan Tiket *${found.trackingCode}* atas nama *${found.citizenName}* (${found.letterTitle}): **${found.status}** (Diperbarui: ${found.updatedAt}). ${
        found.registrationNumber ? `Nomor Registrasi Surat Resmi: ${found.registrationNumber}.` : ''
      } ${found.adminNotes || ''}`;
    }
    return `Kode tiket *${code}* belum ditemukan di buku register persuratan ${cfg.villageName}. Pastikan kode tiket sesuai atau ajukan permohonan baru di menu Layanan Surat.`;
  }

  if (
    q.includes('bansos') ||
    q.includes('blt') ||
    q.includes('pkh') ||
    q.includes('bpnt') ||
    q.includes('bantuan')
  ) {
    const kpmList = db.citizens.filter((c) => c.aidStatus && c.aidStatus !== 'Non-Penerima');
    const summaryByAid = kpmList.reduce<Record<string, number>>((acc, c) => {
      acc[c.aidStatus] = (acc[c.aidStatus] || 0) + 1;
      return acc;
    }, {});
    const breakdown = Object.entries(summaryByAid)
      .map(([k, v]) => `• **${k}**: ${v} Keluarga Penerima Manfaat (KPM)`)
      .join('\n');
    return `Informasi Transparansi Bantuan Sosial (DTKS) Pemerintah ${cfg.villageName}:\nTotal Penerima Aktif: **${kpmList.length} KPM** dari ${db.citizens.length} penduduk terdaftar.\n${breakdown}\n\nWarga dapat mengecek status penerima per NIK secara mandiri di menu **Layanan Surat -> Cek Penerima Bansos** atau melalui Anjungan Mandiri Balai Desa.`;
  }

  if (
    q.includes('syarat') ||
    q.includes('surat') ||
    q.includes('sku') ||
    q.includes('sktm') ||
    q.includes('domisili') ||
    q.includes('skck') ||
    q.includes('nikah') ||
    q.includes('waris') ||
    q.includes('tanah') ||
    q.includes('lahir') ||
    q.includes('pindah')
  ) {
    const specific = db.letterTypes.find(
      (lt) =>
        q.includes((lt.code || '').toLowerCase()) ||
        q.includes((lt.name || '').toLowerCase().split('(')[0].trim())
    );
    if (specific) {
      return `Informasi Layanan **${specific.name} (${specific.code})** — Pemerintah ${cfg.villageName}:\n• **Kode Klasifikasi**: ${specific.classificationCode || defaultClassCode}\n• **Estimasi Selesai (SLA)**: ${specific.estimatedHours} jam kerja\n• **Persyaratan Berkas**: ${(specific.requirements || []).join(', ')}\n• **Keterangan**: ${specific.shortDesc}\n\nSilakan ajukan secara online 24 jam di menu **Layanan Surat** atau melalui Anjungan Layanan Mandiri.`;
    }

    const lines = db.letterTypes
      .slice(0, 8)
      .map(
        (lt) =>
          `• **${lt.name} (${lt.code})** — Estimasi ${lt.estimatedHours} jam kerja. Syarat: ${(lt.requirements || []).join(', ')}.`
      )
      .join('\n');
    return `Pemerintah ${cfg.villageName} melayani **${db.letterTypes.length} jenis surat resmi ber-QR Code TTE**:\n${lines}\n\nUntuk mengajukan surat atau melacak status tiket, gunakan menu **Layanan Surat** atau ketik \`/status KODE_TIKET\` di Bot Telegram (@${cfg.telegramBotUsername || 'pemdes_sukamaju_bot'}).`;
  }

  if (q.includes('apbdes') || q.includes('anggaran') || q.includes('dana desa')) {
    const totalRev = db.apbdes
      .filter((a) => a.category === 'Pendapatan')
      .reduce((acc, item) => acc + item.realisasi, 0);
    const totalExp = db.apbdes
      .filter((a) => a.category === 'Belanja')
      .reduce((acc, item) => acc + item.realisasi, 0);
    const fmt = (n: number) =>
      new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
    return `Transparansi APBDes Pemerintah ${cfg.villageName}:\n• Total Realisasi Pendapatan: **${fmt(totalRev)}**\n• Total Realisasi Belanja & Pembangunan: **${fmt(totalExp)}**\n• Jumlah Proyek Fisik Aktif/Selesai: **${db.projects.length} proyek**.\nDetail grafik lengkap dapat dilihat pada menu **Statistik & APBDes**.`;
  }

  if (q.includes('umkm') || q.includes('produk') || q.includes('lapak') || q.includes('beli')) {
    const topProducts = db.products
      .slice(0, 4)
      .map((p) => `• **${p.name}** (Rp ${p.price.toLocaleString('id-ID')} / ${p.unit}) — Penjual: ${p.sellerName}`)
      .join('\n');
    return `Lapak UMKM ${cfg.villageName} menyediakan ${db.products.length} produk unggulan warga:\n${topProducts}\n\nPemesanan langsung terhubung ke WhatsApp penjual di menu **Lapak UMKM**.`;
  }

  if (q.includes('jadwal') || q.includes('agenda') || q.includes('kegiatan') || q.includes('rapat') || q.includes('posyandu')) {
    const nextAgendas = db.agendas
      .slice(0, 3)
      .map((a) => `• **${a.title}** (${a.date}, ${a.startTime}-${a.endTime} WIB di ${a.location})`)
      .join('\n');
    return `Agenda & Kegiatan Terdekat di ${cfg.villageName}:\n${nextAgendas}`;
  }

  if (q.includes('jam') || q.includes('buka') || q.includes('alamat') || q.includes('kontak') || q.includes('darurat') || q.includes('ambulans')) {
    return `Informasi Layanan Balai ${cfg.villageName}:\n• **Alamat**: ${cfg.officeAddress}, ${cfg.subDistrict}, ${cfg.district}\n• **Jam Kerja**: ${cfg.serviceHoursWeekdays} | ${cfg.serviceHoursWeekend}\n• **WhatsApp Resmi**: +${cfg.officialWhatsApp}\n• **Bot Telegram AI**: @${cfg.telegramBotUsername || 'pemdes_sukamaju_bot'} (${cfg.socialMedia.telegram || '-'})\n• **Darurat Ambulans 24 Jam**: ${cfg.emergencyContacts.ambulancePhone} (${cfg.emergencyContacts.ambulanceName})`;
  }

  return `Halo warga ${cfg.villageName}! Saya Asisten AI Pemerintah ${cfg.villageName} (${cfg.headOfVillageTitle || 'Kepala Desa'}: ${cfg.headOfVillageName}). Saat ini sistem melayani **${db.citizens.length} data penduduk**, **${db.letterTypes.length} jenis surat TTE**, **${db.products.length} produk UMKM**, dan **${db.agendas.length} agenda kegiatan desa**. Silakan tanyakan syarat surat (SKU, SKTM, Pengantar Nikah N1-N4, Ahli Waris, Sporadik Tanah, Kelahiran), cek status penerima Bansos, lacak tiket surat (\`/status KODE_TIKET\`), atau jadwal kegiatan desa.`;
}

async function generateVillageAiAnswer(prompt: string, db: VillageDatabase): Promise<{ reply: string; provider: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  const cfg = db.siteConfig;
  const activeModel = cfg.aiModel || 'gemini-3.8-flash';

  if (apiKey && apiKey.trim() !== '') {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const personaInstruction =
        cfg.telegramAiPersona ||
        'Ramah, solutif, menggunakan Bahasa Indonesia baku pemerintahan desa yang sopan, serta menyertakan syarat berkas, jam layanan, atau status kode tiket surat warga secara akurat.';

      const kpmCount = db.citizens.filter((c) => c.aidStatus && c.aidStatus !== 'Non-Penerima').length;
      const systemInstruction = `Anda adalah Asisten AI Resmi Pemerintah ${cfg.villageName}, ${cfg.subDistrict}, ${cfg.district}, Provinsi ${cfg.province} yang terintegrasi dengan Portal Web & Bot Telegram Resmi (@${cfg.telegramBotUsername || 'pemdes_sukamaju_bot'}).
Instruksi Persona AI: ${personaInstruction}
${cfg.headOfVillageTitle || 'Kepala Desa'}: ${cfg.headOfVillageName} (NIP: ${cfg.headOfVillageNip}).
Alamat Balai Desa: ${cfg.officeAddress}.
Jam Pelayanan: ${cfg.serviceHoursWeekdays} | ${cfg.serviceHoursWeekend}.
WhatsApp Resmi: +${cfg.officialWhatsApp}, Telegram: ${cfg.socialMedia.telegram || '-'} (@${cfg.telegramBotUsername || 'pemdes_sukamaju_bot'}).
Kontak Darurat: Ambulans ${cfg.emergencyContacts.ambulancePhone}, Bidan ${cfg.emergencyContacts.midwifePhone}, Linmas ${cfg.emergencyContacts.securityPhone}.
Data Kependudukan & Bansos: ${db.citizens.length} warga terdaftar, ${kpmCount} KPM penerima Bantuan Sosial (PKH, BLT Dana Desa, BPNT, BPJS PBI).
Layanan Surat Online (${db.letterTypes.length} jenis): ${db.letterTypes.map((l) => `${l.code} (${l.name} - SLA ${l.estimatedHours} jam, syarat: ${(l.requirements || []).join(', ')})`).join('; ')}.
Permohonan Surat Tercatat: ${db.requests.map((r) => `${r.trackingCode} a.n ${r.citizenName} (${r.letterTitle}): ${r.status}${r.registrationNumber ? ` [No: ${r.registrationNumber}]` : ''}`).join('; ')}.
Agenda Desa: ${db.agendas.map((a) => `${a.title} pada ${a.date} pukul ${a.startTime} di ${a.location}`).join('; ')}.
Produk UMKM (${db.products.length}): ${db.products.map((p) => `${p.name} Rp${p.price}/${p.unit}`).join('; ')}.
Jawablah dengan sopan, ringkas, akurat dalam Bahasa Indonesia berdasarkan data nyata desa di atas.`;

      const response = await ai.models.generateContent({
        model: activeModel,
        contents: prompt,
        config: {
          systemInstruction,
        },
      });

      if (response.text && response.text.trim()) {
        return { reply: response.text.trim(), provider: activeModel };
      }
    } catch {
      // Fall through to grounded database response
    }
  }

  return {
    reply: buildLocalGroundedAnswer(prompt, db),
    provider: 'sid-knowledge-engine',
  };
}

async function getCitizenByNik(nik: string): Promise<any | null> {
  const tenantId = tenantStorage.getStore() || 'default';
  if (!pgAdapter) {
    const db = await ensureDatabase();
    return (db.citizens || []).find((c) => c.nik === nik) || null;
  }
  try {
    const res = await pgAdapter.query<{ data: any }>('SELECT data FROM citizens WHERE tenant_id = $1 AND nik = $2 LIMIT 1;', [tenantId, nik]);
    if (res.rows.length === 0) return null;
    return res.rows[0].data;
  } catch {
    return null;
  }
}

function hasEmailProvider(): boolean {
  const p = (process.env.EMAIL_PROVIDER || '').toLowerCase();
  if (p === 'sendgrid' && process.env.SENDGRID_API_KEY) return true;
  if (p === 'resend' && process.env.RESEND_API_KEY) return true;
  if (p === 'mailgun' && process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) return true;
  if (p === 'webhook' && process.env.NOTIFICATION_WEBHOOK_URL) return true;
  if (process.env.NOTIFICATION_WEBHOOK_URL) return true;
  return false;
}

function hasWhatsAppProvider(): boolean {
  const p = (process.env.WHATSAPP_PROVIDER || '').toLowerCase();
  if (p === 'twilio' && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM) return true;
  if (p === 'meta' && process.env.META_WHATSAPP_TOKEN && process.env.META_WHATSAPP_PHONE_NUMBER_ID) return true;
  if (p === 'webhook' && process.env.NOTIFICATION_WEBHOOK_URL) return true;
  if (process.env.NOTIFICATION_WEBHOOK_URL) return true;
  return false;
}

async function dispatchEmail(item: any): Promise<void> {
  const p = (process.env.EMAIL_PROVIDER || '').toLowerCase();
  const webhookUrl = (process.env.NOTIFICATION_WEBHOOK_URL || '').trim();
  if (p === 'sendgrid' && process.env.SENDGRID_API_KEY) {
    const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: item.recipient }] }],
        from: { email: process.env.EMAIL_FROM || 'noreply@example.com' },
        subject: item.subject || 'Notification',
        content: [{ type: 'text/plain', value: item.message }],
      }),
    });
    if (!resp.ok) throw new Error(`SendGrid HTTP ${resp.status}`);
    return;
  }
  if (p === 'resend' && process.env.RESEND_API_KEY) {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'noreply@example.com',
        to: [item.recipient],
        subject: item.subject || 'Notification',
        text: item.message,
      }),
    });
    if (!resp.ok) throw new Error(`Resend HTTP ${resp.status}`);
    return;
  }
  if (p === 'mailgun' && process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
    const form = new URLSearchParams();
    form.set('from', process.env.EMAIL_FROM || `noreply@${process.env.MAILGUN_DOMAIN}`);
    form.set('to', item.recipient);
    form.set('subject', item.subject || 'Notification');
    form.set('text', item.message);
    const resp = await fetch(`https://api.mailgun.net/v3/${process.env.MAILGUN_DOMAIN}/messages`, {
      method: 'POST',
      headers: { Authorization: `Basic ${Buffer.from('api:' + process.env.MAILGUN_API_KEY).toString('base64')}` },
      body: form,
    });
    if (!resp.ok) throw new Error(`Mailgun HTTP ${resp.status}`);
    return;
  }
  if (webhookUrl) {
    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: item.tenant_id, channel: 'email', recipient: item.recipient, subject: item.subject, message: item.message }),
    });
    if (!resp.ok) throw new Error(`Webhook HTTP ${resp.status}`);
    return;
  }
  throw new Error('No email provider configured');
}

async function dispatchWhatsApp(item: any): Promise<void> {
  const p = (process.env.WHATSAPP_PROVIDER || '').toLowerCase();
  const webhookUrl = (process.env.NOTIFICATION_WEBHOOK_URL || '').trim();
  if (p === 'twilio' && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM) {
    const form = new URLSearchParams();
    form.set('To', `whatsapp:${item.recipient}`);
    form.set('From', `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`);
    form.set('Body', item.message);
    const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: `Basic ${Buffer.from(process.env.TWILIO_ACCOUNT_SID + ':' + process.env.TWILIO_AUTH_TOKEN).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });
    if (!resp.ok) throw new Error(`Twilio HTTP ${resp.status}`);
    return;
  }
  if (p === 'meta' && process.env.META_WHATSAPP_TOKEN && process.env.META_WHATSAPP_PHONE_NUMBER_ID) {
    const resp = await fetch(`https://graph.facebook.com/v18.0/${process.env.META_WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.META_WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: item.recipient.replace(/\D/g, ''),
        type: 'text',
        text: { body: item.message },
      }),
    });
    if (!resp.ok) throw new Error(`Meta WhatsApp HTTP ${resp.status}`);
    return;
  }
  if (webhookUrl) {
    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: item.tenant_id, channel: 'whatsapp', recipient: item.recipient, message: item.message }),
    });
    if (!resp.ok) throw new Error(`Webhook HTTP ${resp.status}`);
    return;
  }
  throw new Error('No WhatsApp provider configured');
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);

  // Metrics (observability)
  const metrics = {
    requests: 0,
    errors: 0,
    totalDurationMs: 0,
    byStatus: new Map<string, number>(),
  };

  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      metrics.requests += 1;
      metrics.totalDurationMs += Date.now() - start;
      if (res.statusCode >= 400) metrics.errors += 1;
      const key = String(res.statusCode);
      metrics.byStatus.set(key, (metrics.byStatus.get(key) || 0) + 1);
    });
    next();
  });

  app.get('/metrics', async (_req, res) => {
    const lines: string[] = [];
    lines.push('# HELP http_requests_total Total HTTP requests');
    lines.push('# TYPE http_requests_total counter');
    lines.push(`http_requests_total ${metrics.requests}`);
    lines.push('# HELP http_errors_total Total HTTP errors (>=400)');
    lines.push('# TYPE http_errors_total counter');
    lines.push(`http_errors_total ${metrics.errors}`);
    lines.push('# HELP http_request_duration_ms_sum Sum of request durations in ms');
    lines.push('# TYPE http_request_duration_ms_sum counter');
    lines.push(`http_request_duration_ms_sum ${metrics.totalDurationMs}`);
    lines.push('# HELP http_responses_by_status Responses by HTTP status');
    lines.push('# TYPE http_responses_by_status counter');
    for (const [status, count] of metrics.byStatus.entries()) {
      lines.push(`http_responses_by_status{status="${status}"} ${count}`);
    }
    res.type('text/plain').send(lines.join('\n') + '\n');
  });

  // Hardening: request id + timeout
  app.use((req, res, next) => {
    const rid = (req.headers['x-request-id'] as string) || Math.random().toString(36).slice(2);
    res.setHeader('X-Request-Id', rid);
    (req as any).requestId = rid;
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({ error: 'Request timeout.' });
      }
    }, 30000);
    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));
    next();
  });
  const PORT = Number(process.env.PORT) || 3000;
  const startedAt = Date.now();

  // Initialize database & optional PostgreSQL connection on boot
  const bootDb = ensureDatabase();
  await initPostgres(bootDb);

  // Security Headers & Strict CORS (Restricted to APP_URL / localhost / run.app)
  app.use((req, res, next) => {
    const allowedAppUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
    const origin = req.headers.origin || '';
    const isAllowedOrigin =
      !origin ||
      origin === allowedAppUrl ||
      (process.env.NODE_ENV !== 'production' && (
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        origin.startsWith('http://192.168.')
      ));

    if (isAllowedOrigin) {
      res.setHeader('Access-Control-Allow-Origin', origin || allowedAppUrl);
    } else {
      res.setHeader('Access-Control-Allow-Origin', allowedAppUrl);
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Telegram-Bot-Api-Secret-Token');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    );
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https: ws: wss:; frame-ancestors 'self';"
    );

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  // Tenant resolution middleware (SaaS Fase 1) — must run before all /api routes
  app.use((req, res, next) => {
    const host = (req.headers.host || '').split(':')[0];
    const parts = host.split('.');
    let tenantId = 'default';
    const isProd = process.env.NODE_ENV === 'production';
    if (!isProd && req.query && req.query.tenant) {
      const raw = String(req.query.tenant);
      if (/^[a-zA-Z0-9_-]+$/.test(raw)) tenantId = raw;
    } else if (parts.length >= 2 && parts[parts.length - 1] === 'localhost' && parts[0] !== 'localhost') {
      tenantId = parts[0];
    } else if (parts.length >= 3 && parts[0] !== 'www' && !/^\d+$/.test(parts[0])) {
      tenantId = parts[0];
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(tenantId)) tenantId = 'default';
    if (tenantId !== 'default' && pgAdapter) {
      pgAdapter.query('SELECT status FROM tenants WHERE id = $1', [tenantId])
        .then((r) => {
          const row = r.rows && r.rows[0];
          if (!row) {
            res.status(404).json({ status: 'error', error: 'Tenant tidak ditemukan.' });
            return;
          }
          if (row.status !== 'active') {
            res.status(403).json({ status: 'error', error: 'Tenant suspended.' });
            return;
          }
          tenantStorage.run(tenantId, () => next());
        })
        .catch(() => { res.status(404).json({ status: 'error', error: 'Tenant tidak ditemukan.' }); });
      return;
    }
    tenantStorage.run(tenantId, () => next());
  });

  // Usage tracking + limit enforcement (Fase 2)
  app.use('/api', async (req, res, next) => {
    if (req.path === '/health') return next();
    const tenantId = tenantStorage.getStore() || 'default';
    if (!pgAdapter) return next();
    try {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const r = await pgAdapter.query(
        `INSERT INTO usage_counters (tenant_id, month, request_count, updated_at)
         VALUES ($1, $2, 1, NOW())
         ON CONFLICT (tenant_id, month) DO UPDATE SET request_count = usage_counters.request_count + 1, updated_at = NOW()
         RETURNING request_count`,
        [tenantId, month]
      );
      const currentCount = r.rows?.[0]?.request_count ?? 0;

      // Enforce limit only for non-auth endpoints
      if (!req.path.startsWith('/auth')) {
        const sub = await pgAdapter.query('SELECT max_requests_per_month FROM subscriptions WHERE tenant_id = $1 LIMIT 1', [tenantId]);
        const limit = sub.rows?.[0]?.max_requests_per_month ?? 1000;
        if (currentCount > limit) {
          return res.status(429).json({ error: 'Kuota request bulanan terlampaui. Upgrade paket untuk melanjutkan.', current: currentCount, limit });
        }
      }
    } catch {
      // ignore tracking errors
    }
    next();
  });

  // Request Logger for API calls
  app.use('/api', (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - start;
      console.log(`[API] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
    });
    next();
  });

  app.use('/api', apiRateLimiter);
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // ==========================================================================
  // 0. HEALTH, AUTH, TOKEN ROTATION & PASSWORD RESET ENDPOINTS
  // ==========================================================================
  const trackCodeAttempts = new Map<string, { count: number; reset: number }>();
  app.get('/api/public/track-letter', strictRateLimiter(20), async (req, res) => {
    const code = String(req.query.code || '').trim();
    if (!code) {
      return res.status(400).json({ status: 'error', error: 'Kode lacak wajib diisi.' });
    }
    // per-code rate limit
    const now = Date.now();
    const ca = trackCodeAttempts.get(code) || { count: 0, reset: now + 60000 };
    if (now > ca.reset) { ca.count = 0; ca.reset = now + 60000; }
    ca.count += 1;
    trackCodeAttempts.set(code, ca);
    if (ca.count > 10) {
      return res.status(429).json({ status: 'error', error: 'Terlalu banyak percobaan untuk kode ini.' });
    }
    const db = ensureDatabase();
    const found = (db.requests || []).find((r: any) =>
      String(r.trackingCode || '').toLowerCase() === code.toLowerCase() ||
      String(r.registrationNumber || '').toLowerCase() === code.toLowerCase()
    );
    if (!found) {
      return res.status(404).json({ status: 'error', error: 'Kode lacak tidak ditemukan.' });
    }
    res.json({
      status: 'ok',
      tracking: {
        status: found.status,
        letterTitle: found.letterTitle,
        createdAt: found.createdAt,
        citizenName: found.citizenName ? String(found.citizenName).split(' ')[0] + ' ***' : null,
      },
    });
  });
  app.get('/api/health', async (_req, res) => {
    const tenantId = tenantStorage.getStore() || 'default';
    const db = cachedDbMemory.get(tenantId) || ensureDatabase();
    const alerts: string[] = [];
    if (metrics.errors > 0 && metrics.requests > 0 && metrics.errors / metrics.requests > 0.1) {
      alerts.push('High error rate detected');
    }
    const alertWebhook = (process.env.ALERT_WEBHOOK_URL || '').trim();
    if (alerts.length > 0 && alertWebhook) {
      // fire-and-forget
      fetch(alertWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alerts, timestamp: new Date().toISOString(), service: 'desa-saas' }),
      }).catch(() => {});
    }
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      engine: pgEngineLabel,
      dbVersion: db.version,
      alerts,
      database: {
        engine: pgEngineLabel,
        postgresConnected: pgAvailable,
        singleSourceOfTruth: process.env.NODE_ENV === 'production' ? 'postgres-strict' : 'postgres-with-dev-seed',
        version: db.version,
        lastUpdated: db.lastUpdated,
        normalizedTablesCount: ALL_24_DOMAIN_TABLES.length,
      },
    });
  });

  app.post('/api/auth/login', loginRateLimiter, async (req, res) => {
    const parsed = LoginPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        status: 'error',
        error: parsed.error.issues[0]?.message || 'Payload login tidak valid.',
        issues: parsed.error.issues,
      });
      return;
    }

    const username = parsed.data.username.toLowerCase();
    const password = parsed.data.password;

    const db = ensureDatabase();
    const matched = (db.adminUsers || []).find((u) => u.username.toLowerCase() === username);

    if (!matched || matched.status === 'pending' || !verifyPasswordScrypt(password, matched.passwordHash, matched.password)) {
      res.status(401).json({
        status: 'error',
        error: 'Username atau kata sandi perangkat desa tidak sesuai.',
      });
      return;
    }

    // Reset failed login counter for this IP after valid credentials
    await resetRateLimitBucket('login', getClientIp(req));

    cleanExpiredSessions();
    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const tenantId = tenantStorage.getStore() || 'default';
    const isPlatformAdmin = tenantId === 'default' && matched.username.toLowerCase() === 'admin';
    const roleTier = resolveAdminRoleTier(matched);
    const session: ActiveSession = {
      token,
      tokenHash: hashTokenSha256(token),
      username: matched.username,
      fullName: matched.fullName,
      role: matched.role,
      roleTier,
      nip: matched.nip || '',
      isPlatformAdmin,
      tenantId,
      createdAt: now,
      expiresAt: now + SESSION_TTL_MS,
    };
    activeSessions.set(token, session);
    await persistSessionToPg(session);
    recordAudit('login', matched.username, `Login sukses tier=${roleTier} tenant=${tenantId}`);

    res.json({
      status: 'ok',
      token,
      roleTier,
      expiresAt: new Date(session.expiresAt).toISOString(),
      user: {
        username: matched.username,
        fullName: matched.fullName,
        role: matched.role,
        nip: matched.nip || '',
        isPlatformAdmin,
        mustChangePassword: matched.mustChangePassword || false,
        },
    });
  });

  // Token Rotation: Issues a fresh 8h token and invalidates the old token
  app.post('/api/auth/rotate', requireAdmin, async (req, res) => {
    const currentSession = (req as any).adminSession as ActiveSession;
    const oldToken = currentSession.token;

    activeSessions.delete(oldToken);
    await deleteSessionFromPg(oldToken);

    const newToken = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const rotatedSession: ActiveSession = {
      ...currentSession,
      token: newToken,
      tokenHash: hashTokenSha256(newToken),
      createdAt: now,
      expiresAt: now + SESSION_TTL_MS,
      rotatedFrom: currentSession.tokenHash,
    };
    activeSessions.set(newToken, rotatedSession);
    await persistSessionToPg(rotatedSession);

    res.json({
      status: 'ok',
      token: newToken,
      roleTier: rotatedSession.roleTier,
      expiresAt: new Date(rotatedSession.expiresAt).toISOString(),
      user: {
        username: rotatedSession.username,
        fullName: rotatedSession.fullName,
        role: rotatedSession.role,
        nip: rotatedSession.nip,
      },
    });
  });

  // Password Reset Step 1: Request 15-minute reset token after verifying username + NIP
  app.post('/api/auth/reset-request', loginRateLimiter, async (req, res) => {
    const parsed = PasswordResetRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        status: 'error',
        error: parsed.error.issues[0]?.message || 'Data permintaan reset tidak valid.',
        issues: parsed.error.issues,
      });
      return;
    }

    const { username, nip } = parsed.data;
    const db = ensureDatabase();
    const matched = (db.adminUsers || []).find(
      (u) =>
        u.username.toLowerCase() === username.toLowerCase() &&
        (u.nip || '').replace(/\s+/g, '') === nip.replace(/\s+/g, '')
    );

    // Respons generik (cegah enumerasi), tidak pernah memuat token
    const genericResponse = () =>
      res.status(202).json({
        status: 'ok',
        message: 'Jika data cocok, instruksi pemulihan akan dikirim melalui kanal terdaftar.',
      });

    if (!matched) {
      // Jangan bedakan respons; tambahkan delay kecil untuk mencegah timing attack
      await new Promise((r) => setTimeout(r, 200));
      return genericResponse();
    }

    const resetToken = crypto.randomBytes(32).toString('hex'); // 256-bit
    const tokenHash = hashTokenSha256(resetToken);
    const expiresAt = Date.now() + RESET_TOKEN_TTL_MS;

    passwordResetStore.set(tokenHash, {
      tokenHash,
      username: matched.username.toLowerCase(),
      expiresAt,
      used: false,
    });

    if (pgAdapter) {
      try {
        await pgAdapter.query(
          `INSERT INTO password_reset_tokens (token_hash, username, expires_at, used, created_at)
           VALUES ($1, $2, $3, FALSE, NOW());`,
          [tokenHash, matched.username.toLowerCase(), new Date(expiresAt).toISOString()]
        );
      } catch {}
    }

    // Kirim token via outbox jika kanal notifikasi terkonfigurasi
    const tenantId = tenantStorage.getStore() || 'default';
    if (pgAdapter) {
      try {
        const sRes = await pgAdapter.query('SELECT * FROM tenant_notification_settings WHERE tenant_id = $1 LIMIT 1', [tenantId]);
        const settings = sRes.rows?.[0];
        if (settings?.email_enabled && settings.email_recipient) {
          await pgAdapter.query(
            `INSERT INTO notification_outbox (tenant_id, channel, recipient, subject, message, status) VALUES ($1,'email',$2,$3,$4,'pending')`,
            [tenantId, settings.email_recipient, 'Token Reset Sandi', `Token pemulihan (15 menit): ${resetToken}`]
          );
        }
        if (settings?.whatsapp_enabled && settings.whatsapp_recipient) {
          await pgAdapter.query(
            `INSERT INTO notification_outbox (tenant_id, channel, recipient, subject, message, status) VALUES ($1,'whatsapp',$2,NULL,$3,'pending')`,
            [tenantId, settings.whatsapp_recipient, `Token pemulihan (15 menit): ${resetToken}`]
          );
        }
      } catch {}
    }

    // Hanya di dev: log token ke console server (tidak ke respons)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV RESET TOKEN] user=${matched.username} token=${resetToken}`);
    }

    return genericResponse();
  });

  // Password Reset Step 2: Confirm reset token & update scrypt passwordHash
  app.post('/api/auth/reset-confirm', loginRateLimiter, async (req, res) => {
    const parsed = PasswordResetConfirmSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        status: 'error',
        error: parsed.error.issues[0]?.message || 'Payload konfirmasi reset tidak valid.',
        issues: parsed.error.issues,
      });
      return;
    }

    const { username, resetToken, newPassword } = parsed.data;
    const tokenHash = hashTokenSha256(resetToken);
    const uname = username.toLowerCase();

    let validReset = false;
    const memEntry = passwordResetStore.get(tokenHash);
    if (memEntry && !memEntry.used && memEntry.username === uname && memEntry.expiresAt > Date.now()) {
      validReset = true;
      memEntry.used = true;
    } else if (pgAdapter) {
      try {
        const pgRes = await pgAdapter.query<{ username: string }>(
          `UPDATE password_reset_tokens
           SET used = TRUE
           WHERE token_hash = $1 AND username = $2 AND used = FALSE AND expires_at > NOW()
           RETURNING username;`,
          [tokenHash, uname]
        );
        if (pgRes.rows.length > 0) {
          validReset = true;
        }
      } catch {}
    }

    if (!validReset) {
      res.status(400).json({
        status: 'error',
        error: 'Token pemulihan tidak valid, sudah digunakan, atau telah kedaluwarsa.',
      });
      return;
    }

    const db = ensureDatabase();
    const adminUsersList = db.adminUsers || [];
    const userIdx = adminUsersList.findIndex((u) => u.username.toLowerCase() === uname);
    if (userIdx === -1) {
      res.status(404).json({ status: 'error', error: 'Akun perangkat tidak ditemukan.' });
      return;
    }

    adminUsersList[userIdx] = {
      ...adminUsersList[userIdx],
      passwordHash: hashPasswordScrypt(newPassword),
    };
    delete adminUsersList[userIdx].password;
    db.adminUsers = adminUsersList;
    db.version = (db.version || 8) + 1;
    await saveDatabase(db, 'adminUsers');

    // Revoke all existing active sessions for this user
    for (const [tok, sess] of activeSessions.entries()) {
      if (sess.username.toLowerCase() === uname) {
        activeSessions.delete(tok);
      }
    }
    if (pgAdapter) {
      try {
        const resetTenantId = tenantStorage.getStore() || 'default';
        await pgAdapter.query(`DELETE FROM auth_sessions WHERE username = $1 AND (tenant_id = $2 OR tenant_id IS NULL);`, [uname, resetTenantId]);
      } catch {}
    }

    recordAudit('password_reset', uname, 'Password reset confirmed');

    res.json({
      status: 'ok',
      message: 'Kata sandi berhasil diperbarui dengan enkripsi Scrypt dan sesi lama telah dicabut.',
    });
  });

  app.post('/api/auth/logout', async (req, res) => {
    const token = extractBearerToken(req);
    if (token) {
      activeSessions.delete(token);
      await deleteSessionFromPg(token);
    }
    res.json({ status: 'ok', message: 'Sesi berhasil diakhiri.' });
  });

  app.post('/api/citizen/login', loginRateLimiter, async (req, res) => {
    res.status(410).json({ status: 'error', error: 'Portal Warga dinonaktifkan sementara untuk perbaikan keamanan.' });
    return;
  });

  const citizenOtpStore = new Map<string, { otp: string; expires: number; attempts: number }>();

  app.post('/api/citizen/otp/request', loginRateLimiter, async (req, res) => {
    const nik = String(req.body?.nik || '').trim();
    if (!/^\d{16}$/.test(nik)) return res.status(400).json({ status: 'error', error: 'NIK harus 16 digit.' });
    const citizen = await getCitizenByNik(nik);
    if (!citizen) return res.status(404).json({ status: 'error', error: 'Data warga tidak ditemukan.' });
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    citizenOtpStore.set(nik, { otp, expires: Date.now() + 5 * 60 * 1000, attempts: 0 });
    res.json({ status: 'ok', message: 'OTP dikirim (dev: lihat otp).', ...(process.env.NODE_ENV !== 'production' ? { otp } : {}) });
  });

  app.post('/api/citizen/otp/verify', loginRateLimiter, async (req, res) => {
    const nik = String(req.body?.nik || '').trim();
    const otp = String(req.body?.otp || '').trim();
    const entry = citizenOtpStore.get(nik);
    if (!entry || Date.now() > entry.expires) return res.status(401).json({ status: 'error', error: 'OTP tidak valid atau kadaluarsa.' });
    entry.attempts += 1;
    if (entry.attempts > 5) { citizenOtpStore.delete(nik); return res.status(429).json({ status: 'error', error: 'Terlalu banyak percobaan.' }); }
    if (entry.otp !== otp) return res.status(401).json({ status: 'error', error: 'OTP salah.' });
    citizenOtpStore.delete(nik);
    const citizen = await getCitizenByNik(nik);
    if (!citizen) return res.status(404).json({ status: 'error', error: 'Data warga tidak ditemukan.' });
    const token = crypto.randomBytes(32).toString('hex');
    const session = {
      token,
      tokenHash: hashTokenSha256(token),
      username: nik,
      fullName: (citizen as any).fullName || (citizen as any).name || 'Warga',
      role: 'Warga',
      roleTier: 'warga' as any,
      nip: '',
      tenantId: tenantStorage.getStore() || 'default',
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_TTL_MS,
    };
    activeSessions.set(token, session);
    await persistSessionToPg(session);
    res.json({ status: 'ok', token, user: { username: nik, fullName: session.fullName, roleTier: 'warga' } });
  });

  app.get('/api/citizen/me', async (req, res) => {
    const token = extractBearerToken(req);
    if (!token) {
      res.status(401).json({ status: 'error', error: 'Autentikasi warga diperlukan.' });
      return;
    }
    const session = await resolveSessionFromToken(token);
    if (!session || session.roleTier !== 'warga' || (session.tenantId || 'default') !== (tenantStorage.getStore() || 'default')) {
      res.status(401).json({ status: 'error', error: 'Sesi warga tidak valid.' });
      return;
    }
    const citizen = await getCitizenByNik(session.username);
    if (!citizen) {
      res.status(404).json({ status: 'error', error: 'Data warga tidak ditemukan.' });
      return;
    }
    const { passwordHash, ...safeCitizen } = citizen;
    res.json({ status: 'ok', citizen: safeCitizen });
  });

  app.get('/api/citizen/requests', async (req, res) => {
    const token = extractBearerToken(req);
    if (!token) {
      res.status(401).json({ status: 'error', error: 'Autentikasi warga diperlukan.' });
      return;
    }
    const session = await resolveSessionFromToken(token);
    if (!session || session.roleTier !== 'warga' || (session.tenantId || 'default') !== (tenantStorage.getStore() || 'default')) {
      res.status(401).json({ status: 'error', error: 'Sesi warga tidak valid.' });
      return;
    }
    const db = await ensureDatabase();
    const requests = (db.requests || []).filter((r: any) => r.nik === session.username);
    res.json({ status: 'ok', requests });
  });

  app.put('/api/citizen/profile', async (req, res) => {
    const token = extractBearerToken(req);
    if (!token) {
      res.status(401).json({ status: 'error', error: 'Autentikasi warga diperlukan.' });
      return;
    }
    const session = await resolveSessionFromToken(token);
    if (!session || session.roleTier !== 'warga' || (session.tenantId || 'default') !== (tenantStorage.getStore() || 'default')) {
      res.status(401).json({ status: 'error', error: 'Sesi warga tidak valid.' });
      return;
    }
    const db = await ensureDatabase();
    const idx = (db.citizens || []).findIndex((c: any) => c.nik === session.username);
    if (idx === -1) {
      res.status(404).json({ status: 'error', error: 'Data warga tidak ditemukan.' });
      return;
    }
    const allowed = ['phone', 'address', 'rt', 'rw', 'dusun'];
    for (const key of allowed) {
      if (req.body?.[key] !== undefined) {
        (db.citizens[idx] as any)[key] = req.body[key];
      }
    }
    db.citizens[idx].lastUpdated = new Date().toISOString();
    await saveDatabase(db);
    res.json({ status: 'ok', citizen: db.citizens[idx] });
  });

  app.post('/api/citizen/logout', async (req, res) => {
    const token = extractBearerToken(req);
    if (token) {
      activeSessions.delete(token);
      await deleteSessionFromPg(token);
    }
    res.json({ status: 'ok', message: 'Sesi warga diakhiri.' });
  });

  app.get('/api/auth/session', async (req, res) => {
    const token = extractBearerToken(req);
    if (!token) {
      res.status(401).json({ status: 'error', authenticated: false });
      return;
    }
    const s = await resolveSessionFromToken(token);
    if (!s) {
      res.status(401).json({ status: 'error', authenticated: false });
      return;
    }
    res.json({
      status: 'ok',
      authenticated: true,
      roleTier: s.roleTier,
      expiresAt: new Date(s.expiresAt).toISOString(),
      user: {
        username: s.username,
        fullName: s.fullName,
        role: s.role,
        nip: s.nip,
        isPlatformAdmin: s.isPlatformAdmin === true,
      },
    });
  });

  app.get('/api/db', async (req, res) => {
    const db = await ensureDatabase();
    const token = extractBearerToken(req);
    const session = token ? await resolveSessionFromToken(token) : null;
    const authed = !!session;
    res.json(sanitizeDbForClient(db, authed));
  });

  // Protected: Live PostgreSQL Catalog Introspection (\dt, Foreign Keys, Indexes, Migrations)
  app.get('/api/db/catalog', requireAdmin, async (_req, res) => {
    if (!pgAdapter) {
      res.status(503).json({ status: 'error', error: 'PostgreSQL engine tidak tersedia.' });
      return;
    }
    try {
      const catalog = await inspectPgCatalog(pgAdapter);
      res.json({
        status: 'ok',
        engine: pgEngineLabel,
        domainTablesCount: catalog.domainTablesPresent.length,
        catalog,
      });
    } catch (err: any) {
      res.status(500).json({ status: 'error', error: err?.message || 'Gagal membaca katalog PG.' });
    }
  });

  // Public citizen submission endpoints (validated with Zod)
  app.post('/api/public/requests', async (req, res) => {
    const parsed = PublicRequestSubmissionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        status: 'error',
        error: parsed.error.issues[0]?.message || 'Data permohonan surat tidak valid.',
        issues: parsed.error.issues,
      });
      return;
    }
    const incoming = parsed.data.request as unknown as LetterRequest;
    const db = ensureDatabase();
    const serverReq: LetterRequest = {
      ...incoming,
      id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      trackingCode: `TRK-${crypto.randomBytes(8).toString('hex').toUpperCase()}`,
      status: 'Menunggu Verifikasi',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      registrationNumber: undefined,
      signedBy: undefined,
      completedAt: undefined,
      qrVerificationCode: undefined,
    } as any;
    db.requests = [serverReq, ...(db.requests || [])];
    db.version = (db.version || 8) + 1;
    await saveDatabase(db, 'requests');
    recordAudit('public_request', 'warga', `Permohonan surat ${serverReq.trackingCode}`);
    res.json({ status: 'ok', request: serverReq, version: db.version });
  });

  app.post('/api/public/aspirations', async (req, res) => {
    const parsed = PublicAspirationSubmissionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        status: 'error',
        error: parsed.error.issues[0]?.message || 'Data aspirasi warga tidak valid.',
        issues: parsed.error.issues,
      });
      return;
    }
    const newAsp = parsed.data.aspiration as unknown as CitizenAspiration;
    const db = ensureDatabase();
    db.aspirations = [newAsp, ...(db.aspirations || []).filter((a) => a.id !== newAsp.id)];
    db.version = (db.version || 8) + 1;
    await saveDatabase(db, 'aspirations');
    res.json({ status: 'ok', aspiration: newAsp, version: db.version });
  });

  // Public: Portal Cek Mandiri Warga ("Cek NIK Satu Pintu") — Live Server Database Lookup
  app.post('/api/public/cek-nik', async (req, res) => {
    res.status(410).json({ status: 'error', error: 'Fitur Cek NIK Satu Pintu dimatikan untuk keamanan. Hubungi petugas desa.' });
    return;
  });

  // Public: Pasar UMKM Desa Collective Shopping Cart Checkout (Persisted in Server DB)
  app.post('/api/public/market-orders', async (req, res) => {
    const orderInput = req.body?.order as MarketCollectiveOrder | undefined;
    if (
      !orderInput ||
      !orderInput.buyerName ||
      !orderInput.buyerPhone ||
      !Array.isArray(orderInput.items) ||
      orderInput.items.length === 0
    ) {
      res.status(400).json({
        status: 'error',
        error: 'Data pesanan kolektif UMKM tidak lengkap (wajib nama pembeli, nomor WA, dan daftar produk).',
      });
      return;
    }

    const db = ensureDatabase();
    // Validate & recompute from server-side product prices
    const qtyByProd = new Map<string, number>();
    let subtotal = 0;
    for (const item of orderInput.items) {
      const qty = Number(item.quantity);
      if (!Number.isInteger(qty) || qty < 1) {
        return res.status(400).json({ status: 'error', error: 'Kuantitas item harus bilangan bulat >= 1.' });
      }
      const prod = (db.products || []).find((p: any) => p.id === item.productId);
      if (!prod) {
        return res.status(400).json({ status: 'error', error: `Produk ${item.productId} tidak ditemukan.` });
      }
      if ((prod.stock || 0) < qty) {
        return res.status(400).json({ status: 'error', error: `Stok ${prod.name} tidak mencukupi.` });
      }
      qtyByProd.set(item.productId, (qtyByProd.get(item.productId) || 0) + qty);
      subtotal += Number(prod.price) * qty;
    }
    const shippingCost = Number(orderInput.shippingCost) || 0;
    const totalAmount = subtotal + shippingCost;

    const existingOrders = db.siteConfig.marketOrders || [];
    const seq = existingOrders.length + 1;
    const newOrder: MarketCollectiveOrder = {
      id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      orderCode: `INV-UMKM-2026-${String(seq).padStart(3, '0')}`,
      buyerName: String(orderInput.buyerName).trim(),
      buyerPhone: String(orderInput.buyerPhone).trim(),
      buyerDusun: String(orderInput.buyerDusun || db.siteConfig.defaults?.dusun || 'Dusun 1 Sukasari').trim(),
      shippingMethodLabel: String(orderInput.shippingMethodLabel || 'Ambil di BUMDes').trim(),
      shippingCost,
      items: orderInput.items.map((it: any) => ({ ...it, quantity: Number(it.quantity) })),
      subtotal,
      totalAmount,
      notes: orderInput.notes ? String(orderInput.notes).trim() : '',
      status: 'Menunggu Konfirmasi',
      createdAt: formatNowTimestamp(),
    };

    db.siteConfig.marketOrders = [newOrder, ...existingOrders];

    // Also increment soldCount on matched products in db.products
    db.products = (db.products || []).map((prod: any) => {
      const addQty = qtyByProd.get(prod.id);
      if (!addQty) return prod;
      return {
        ...prod,
        soldCount: (prod.soldCount || 0) + addQty,
        stock: Math.max(0, (prod.stock || 0) - addQty),
      };
    });

    db.version = (db.version || 8) + 1;
    await saveDatabase(db);
    recordAudit('public_market_order', 'warga', `Pesanan ${newOrder.orderCode}`);

    res.json({
      status: 'ok',
      order: newOrder,
      version: db.version,
    });
  });

  // Protected (Super Admin only): Replace entire database
  app.put('/api/db', requireAdmin, async (req, res) => {
    const tier = (req as any).adminRoleTier as AdminRoleTier;
    if (!canExecuteSystemAction(tier, 'full_put_db')) {
      res.status(403).json({
        status: 'error',
        error: `Forbidden: Peran '${tier}' tidak diizinkan menimpa seluruh database (khusus super_admin).`,
      });
      return;
    }

    const parsed = FullVillageDatabaseSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        status: 'error',
        error: parsed.error.issues[0]?.message || 'Payload database tidak valid menurut skema Zod.',
        issues: parsed.error.issues,
      });
      return;
    }

    const currentDb = ensureDatabase();
    const updatedDb: VillageDatabase = {
      ...currentDb,
      ...(parsed.data as any),
      version: (currentDb.version || 8) + 1,
      lastUpdated: new Date().toISOString(),
    };
    await saveDatabase(updatedDb);
    recordAudit('full_put_db', 'admin', 'Full DB replace');
    res.json({ status: 'ok', lastUpdated: updatedDb.lastUpdated, version: updatedDb.version });
  });

  // Protected (RBAC per domain + Zod schema validation): Update a specific domain collection
  app.patch('/api/db/:domain', requireAdmin, async (req, res) => {
    const { domain } = req.params;
    const payload = req.body?.data;
    const tier = (req as any).adminRoleTier as AdminRoleTier;

    if (payload === undefined || payload === null) {
      res.status(400).json({ error: 'Payload "data" wajib disertakan pada permintaan PATCH.' });
      return;
    }

    if (!(domain in DOMAIN_ZOD_SCHEMAS)) {
      res.status(400).json({ error: `Domain '${domain}' tidak dikenali di database.` });
      return;
    }

    const typedDomain = domain as keyof Omit<VillageDatabase, 'version' | 'lastUpdated'>;

    // Operator cannot approve/sign letters (status Selesai / signedBy)
    if (typedDomain === 'requests' && tier === 'operator') {
      const items = Array.isArray(payload) ? payload : [payload];
      for (const it of items) {
        if (it && (it.status === 'Selesai' || it.signedBy || it.registrationNumber)) {
          return res.status(403).json({ status: 'error', error: 'Forbidden: Operator tidak boleh menyetujui/menandatangani surat.' });
        }
      }
    }

    // RBAC Check per domain
    if (!canModifyDomain(tier, typedDomain)) {
      res.status(403).json({
        status: 'error',
        error: `Forbidden: Peran '${tier}' tidak memiliki otorisasi untuk mengubah domain '${domain}'.`,
      });
      return;
    }

    // Zod Schema Validation per domain
    const schema = DOMAIN_ZOD_SCHEMAS[typedDomain];
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      res.status(400).json({
        status: 'error',
        error: `Validasi Zod gagal pada domain '${domain}': ${parsed.error.issues[0]?.message}`,
        issues: parsed.error.issues,
      });
      return;
    }

    const currentDb = ensureDatabase();
    const previousRequestsForNotify = [...(currentDb.requests || [])];

    // Concurrency check (If-Match version)
    const ifMatch = req.headers['if-match'];
    if (ifMatch && String(ifMatch).replace(/"/g, '') !== String(currentDb.version)) {
      return res.status(409).json({ status: 'error', error: 'Conflict: data telah berubah. Muat ulang dan coba lagi.', currentVersion: currentDb.version });
    }

    if (typedDomain === 'siteConfig') {
      currentDb.siteConfig = { ...currentDb.siteConfig, ...(parsed.data as any) };
    } else if (typedDomain === 'adminUsers') {
      const existingByUser = new Map(
        (currentDb.adminUsers || []).map((u) => [u.username.toLowerCase(), u])
      );
      const hashedUsers: AdminUser[] = (parsed.data as AdminUser[]).map((incoming) => {
        const prev = existingByUser.get((incoming.username || '').toLowerCase());
        const rawPwd = (incoming.password || '').trim();
        let passwordHash = prev?.passwordHash;
        if (rawPwd && rawPwd !== '[SCRYPT_PROTECTED]') {
          passwordHash = hashPasswordScrypt(rawPwd);
        } else if (!passwordHash) {
          passwordHash = hashPasswordScrypt(crypto.randomBytes(16).toString('hex'));
        }
        return {
          username: incoming.username.trim().toLowerCase(),
          fullName: incoming.fullName,
          role: incoming.role,
          nip: incoming.nip || currentDb.siteConfig.defaults?.nip || '-',
          passwordHash,
        };
      });
      currentDb.adminUsers = hashedUsers;
    } else {
      (currentDb as unknown as Record<string, unknown>)[typedDomain] = parsed.data;
    }

    // Notification automation: enqueue notifications when letter request status changes
    if (typedDomain === 'requests' && pgAdapter) {
      const tenantId = tenantStorage.getStore() || 'default';
      const oldRequests = previousRequestsForNotify;
      const newRequests = (parsed.data as any[]) || [];
      const oldMap = new Map(oldRequests.map((r) => [r.id, r]));
      try {
        const sRes = await pgAdapter.query('SELECT * FROM tenant_notification_settings WHERE tenant_id = $1 LIMIT 1', [tenantId]);
        const settings = sRes.rows?.[0];
        if (settings?.notify_letter_status) {
          for (const nr of newRequests) {
            const or = oldMap.get(nr.id);
            if (or && or.status !== nr.status) {
              const msg = `Status surat ${nr.trackingCode || nr.id} berubah: ${or.status} -> ${nr.status}.`;
              if (settings.email_enabled && settings.email_recipient) {
                await pgAdapter.query(
                  `INSERT INTO notification_outbox (tenant_id, channel, recipient, subject, message, status) VALUES ($1,'email',$2,$3,$4,'pending')`,
                  [tenantId, settings.email_recipient, `Status Surat ${nr.trackingCode || nr.id}`, msg]
                );
              }
              if (settings.whatsapp_enabled && settings.whatsapp_recipient) {
                await pgAdapter.query(
                  `INSERT INTO notification_outbox (tenant_id, channel, recipient, subject, message, status) VALUES ($1,'whatsapp',$2,NULL,$3,'pending')`,
                  [tenantId, settings.whatsapp_recipient, msg]
                );
              }
            }
          }
        }
      } catch {}
    }

    currentDb.version = (currentDb.version || 8) + 1;
    await saveDatabase(currentDb, typedDomain);
    recordAudit(`patch_${typedDomain}`, 'admin', `PATCH domain ${typedDomain}`);

    res.json({
      status: 'ok',
      domain: typedDomain,
      table: DOMAIN_TO_TABLE_MAP[typedDomain] || typedDomain,
      version: currentDb.version,
      lastUpdated: currentDb.lastUpdated,
    });
  });

  // Tenant provisioning (SaaS Fase 1)
  app.post('/api/tenants', requirePlatformAdmin, async (req, res) => {
    try {
      const { id, slug, name } = req.body || {};
      if (!id || !slug || !name) {
        return res.status(400).json({ error: 'id, slug, name required' });
      }
      if (pgAdapter) {
        await pgAdapter.query(
          'INSERT INTO tenants (id, slug, name, status) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
          [id, slug, name, 'active']
        );
      }
      const tenantFile = path.join(DATA_DIR, `village-db-${id}.json`);
      if (!fs.existsSync(tenantFile)) {
        const initial = createInitialDatabase();
        // Kosongkan data demo
        initial.citizens = [];
        initial.news = [];
        initial.requests = [];
        initial.agendas = [];
        initial.gallery = [];
        initial.products = [];
        initial.aspirations = [];
        initial.potentials = [];
        initial.projects = [];
        // Satu akun super_admin dengan sandi acak sekali pakai
        const oneTimePassword = crypto.randomBytes(12).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
        const hashed = hashPasswordScrypt(oneTimePassword);
        initial.adminUsers = [{
          id: `admin-${id}`,
          username: 'admin',
          fullName: `Administrator ${name}`,
          role: 'Sekretaris Desa / Super Admin SID',
          nip: '',
          passwordHash: hashed,
          mustChangePassword: true,
        } as any];
        const normInitial = normalizeAdminUsers(initial.adminUsers || []);
        initial.adminUsers = normInitial.users;
        fs.writeFileSync(tenantFile, JSON.stringify(initial, null, 2), 'utf-8');
        if (pgAdapter) {
          try {
            await pgAdapter.query(
              `INSERT INTO village_database (tenant_id, data, updated_at)
               VALUES ($1, $2::jsonb, NOW())
               ON CONFLICT (tenant_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();`,
              [id, JSON.stringify(initial)]
            );
          } catch (e) {
            console.error('tenant village_database sync failed:', (e as any)?.message);
          }
        }
        cachedDbMemory.set(id, initial);
        res.json({ status: 'ok', tenant: { id, slug, name }, oneTimePassword });
        return;
      }
      res.json({ status: 'ok', tenant: { id, slug, name } });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to create tenant' });
    }
  });

  app.get('/api/tenants', requirePlatformAdmin, async (_req, res) => {
    try {
      if (pgAdapter) {
        const r = await pgAdapter.query('SELECT * FROM tenants ORDER BY created_at DESC');
        return res.json({ tenants: r.rows || [] });
      }
      res.json({ tenants: [{ id: 'default', slug: 'default', name: 'Desa Sukamaju (Default)', status: 'active' }] });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to list tenants' });
    }
  });

  // Billing & Subscription (Fase 2)
  app.get('/api/subscription', requireAdmin, async (req, res) => {
    try {
      const tenantId = tenantStorage.getStore() || 'default';
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      let subscription: any = { tenant_id: tenantId, plan: 'free', status: 'active', max_users: 10, max_storage_mb: 100, max_requests_per_month: 1000 };
      let usageCount = 0;
      if (pgAdapter) {
        const r = await pgAdapter.query('SELECT * FROM subscriptions WHERE tenant_id = $1 LIMIT 1', [tenantId]);
        if (r.rows && r.rows.length > 0) {
          subscription = r.rows[0];
        } else {
          // Ensure a subscription row exists for this tenant (idempotent seed)
          await pgAdapter.query(
            `INSERT INTO subscriptions (tenant_id, plan, status) VALUES ($1, 'free', 'active') ON CONFLICT (tenant_id) DO NOTHING`,
            [tenantId]
          );
          const r2 = await pgAdapter.query('SELECT * FROM subscriptions WHERE tenant_id = $1 LIMIT 1', [tenantId]);
          if (r2.rows && r2.rows.length > 0) subscription = r2.rows[0];
        }
        const u = await pgAdapter.query('SELECT request_count FROM usage_counters WHERE tenant_id = $1 AND month = $2 LIMIT 1', [tenantId, month]);
        usageCount = u.rows?.[0]?.request_count ?? 0;
      }
      const limit = subscription.max_requests_per_month ?? 1000;
      res.json({
        subscription,
        usage: {
          month,
          request_count: usageCount,
          limit,
          percentage: limit > 0 ? Math.min(100, Math.round((usageCount / limit) * 100)) : 0,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to fetch subscription' });
    }
  });

  app.put('/api/subscription', requireAdmin, async (req, res) => {
    const tier = (req as any).adminRoleTier as AdminRoleTier;
    if (tier !== 'super_admin') {
      return res.status(403).json({ status: 'error', error: 'Forbidden: Hanya super_admin yang dapat mengubah billing.' });
    }
    try {
      const tenantId = tenantStorage.getStore() || 'default';
      const { plan, status, max_users, max_storage_mb, max_requests_per_month } = req.body || {};
      const validPlans = ['free', 'basic', 'pro', 'enterprise'];
      if (plan && !validPlans.includes(plan)) {
        return res.status(400).json({ error: `Plan tidak valid. Pilihan: ${validPlans.join(', ')}` });
      }
      if (pgAdapter) {
        await pgAdapter.query(
          `INSERT INTO subscriptions (tenant_id, plan, status, max_users, max_storage_mb, max_requests_per_month, updated_at)
           VALUES ($1, COALESCE($2, 'free'), COALESCE($3, 'active'), COALESCE($4, 10), COALESCE($5, 100), COALESCE($6, 1000), NOW())
           ON CONFLICT (tenant_id) DO UPDATE SET
             plan = COALESCE($2, subscriptions.plan),
             status = COALESCE($3, subscriptions.status),
             max_users = COALESCE($4, subscriptions.max_users),
             max_storage_mb = COALESCE($5, subscriptions.max_storage_mb),
             max_requests_per_month = COALESCE($6, subscriptions.max_requests_per_month),
             updated_at = NOW()`,
          [tenantId, plan || null, status || null, max_users || null, max_storage_mb || null, max_requests_per_month || null]
        );
      }
      // Return updated subscription + usage for UI
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      let updated: any = { tenant_id: tenantId, plan: plan || 'free', status: status || 'active', max_users: max_users || 10, max_storage_mb: max_storage_mb || 100, max_requests_per_month: max_requests_per_month || 1000 };
      let usageCount = 0;
      if (pgAdapter) {
        const r = await pgAdapter.query('SELECT * FROM subscriptions WHERE tenant_id = $1 LIMIT 1', [tenantId]);
        if (r.rows && r.rows.length > 0) updated = r.rows[0];
        const u = await pgAdapter.query('SELECT request_count FROM usage_counters WHERE tenant_id = $1 AND month = $2 LIMIT 1', [tenantId, month]);
        usageCount = u.rows?.[0]?.request_count ?? 0;
      }
      const limit = updated.max_requests_per_month ?? 1000;
      recordAudit('subscription_update', (req as any).adminSession?.username || 'admin', `plan=${updated.plan} status=${updated.status}`);
      res.json({
        status: 'ok',
        subscription: updated,
        usage: { month, request_count: usageCount, limit, percentage: limit > 0 ? Math.min(100, Math.round((usageCount / limit) * 100)) : 0 },
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to update subscription' });
    }
  });

  // Tenant notification settings (Fase 3)
  app.get('/api/notifications', requireAdmin, async (req, res) => {
    try {
      const tenantId = tenantStorage.getStore() || 'default';
      if (pgAdapter) {
        const r = await pgAdapter.query('SELECT * FROM tenant_notification_settings WHERE tenant_id = $1 LIMIT 1', [tenantId]);
        if (r.rows && r.rows.length > 0) {
          return res.json({ settings: r.rows[0] });
        }
        // Seed default row
        await pgAdapter.query(
          `INSERT INTO tenant_notification_settings (tenant_id) VALUES ($1) ON CONFLICT (tenant_id) DO NOTHING`,
          [tenantId]
        );
        const r2 = await pgAdapter.query('SELECT * FROM tenant_notification_settings WHERE tenant_id = $1 LIMIT 1', [tenantId]);
        if (r2.rows && r2.rows.length > 0) {
          return res.json({ settings: r2.rows[0] });
        }
      }
      res.json({
        settings: {
          tenant_id: tenantId,
          email_enabled: false,
          email_recipient: null,
          whatsapp_enabled: true,
          whatsapp_recipient: null,
          notify_letter_status: true,
          notify_aspirations: true,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to fetch notification settings' });
    }
  });

  app.put('/api/notifications', requireAdmin, async (req, res) => {
    const tier = (req as any).adminRoleTier as AdminRoleTier;
    if (tier !== 'super_admin') {
      return res.status(403).json({ status: 'error', error: 'Forbidden: Hanya super_admin yang dapat mengubah notifikasi.' });
    }
    try {
      const tenantId = tenantStorage.getStore() || 'default';
      const {
        email_enabled,
        email_recipient,
        whatsapp_enabled,
        whatsapp_recipient,
        notify_letter_status,
        notify_aspirations,
      } = req.body || {};
      if (pgAdapter) {
        await pgAdapter.query(
          `INSERT INTO tenant_notification_settings
             (tenant_id, email_enabled, email_recipient, whatsapp_enabled, whatsapp_recipient, notify_letter_status, notify_aspirations, updated_at)
           VALUES ($1, COALESCE($2, false), $3, COALESCE($4, true), $5, COALESCE($6, true), COALESCE($7, true), NOW())
           ON CONFLICT (tenant_id) DO UPDATE SET
             email_enabled = COALESCE($2, tenant_notification_settings.email_enabled),
             email_recipient = COALESCE($3, tenant_notification_settings.email_recipient),
             whatsapp_enabled = COALESCE($4, tenant_notification_settings.whatsapp_enabled),
             whatsapp_recipient = COALESCE($5, tenant_notification_settings.whatsapp_recipient),
             notify_letter_status = COALESCE($6, tenant_notification_settings.notify_letter_status),
             notify_aspirations = COALESCE($7, tenant_notification_settings.notify_aspirations),
             updated_at = NOW()`,
          [
            tenantId,
            typeof email_enabled === 'boolean' ? email_enabled : null,
            email_recipient || null,
            typeof whatsapp_enabled === 'boolean' ? whatsapp_enabled : null,
            whatsapp_recipient || null,
            typeof notify_letter_status === 'boolean' ? notify_letter_status : null,
            typeof notify_aspirations === 'boolean' ? notify_aspirations : null,
          ]
        );
      }
      // Return updated
      let settings: any = {
        tenant_id: tenantId,
        email_enabled: !!email_enabled,
        email_recipient: email_recipient || null,
        whatsapp_enabled: whatsapp_enabled !== false,
        whatsapp_recipient: whatsapp_recipient || null,
        notify_letter_status: notify_letter_status !== false,
        notify_aspirations: notify_aspirations !== false,
      };
      if (pgAdapter) {
        const r = await pgAdapter.query('SELECT * FROM tenant_notification_settings WHERE tenant_id = $1 LIMIT 1', [tenantId]);
        if (r.rows && r.rows.length > 0) settings = r.rows[0];
      }
      res.json({ status: 'ok', settings });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to update notification settings' });
    }
  });

  // Tenant SSO settings (Fase 3 scaffold)
  app.get('/api/sso', requireAdmin, async (req, res) => {
    try {
      const tenantId = tenantStorage.getStore() || 'default';
      if (pgAdapter) {
        const r = await pgAdapter.query('SELECT * FROM tenant_sso_settings WHERE tenant_id = $1 LIMIT 1', [tenantId]);
        if (r.rows && r.rows.length > 0) {
          const row = { ...r.rows[0] };
          const hasSecret = !!row.client_secret;
          delete row.client_secret;
          row.hasSecret = hasSecret;
          return res.json({ settings: row });
        }
        await pgAdapter.query(`INSERT INTO tenant_sso_settings (tenant_id) VALUES ($1) ON CONFLICT (tenant_id) DO NOTHING`, [tenantId]);
        const r2 = await pgAdapter.query('SELECT * FROM tenant_sso_settings WHERE tenant_id = $1 LIMIT 1', [tenantId]);
        if (r2.rows && r2.rows.length > 0) {
          const row = { ...r2.rows[0] };
          const hasSecret = !!row.client_secret;
          delete row.client_secret;
          row.hasSecret = hasSecret;
          return res.json({ settings: row });
        }
      }
      res.json({
        settings: {
          tenant_id: tenantId,
          enabled: false,
          provider: null,
          issuer_url: null,
          client_id: null,
          hasSecret: false,
          redirect_uri: null,
          scopes: null,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to fetch SSO settings' });
    }
  });

  app.put('/api/sso', requireAdmin, async (req, res) => {
    const tier = (req as any).adminRoleTier as AdminRoleTier;
    if (tier !== 'super_admin') {
      return res.status(403).json({ status: 'error', error: 'Forbidden: Hanya super_admin yang dapat mengubah SSO.' });
    }
    try {
      const tenantId = tenantStorage.getStore() || 'default';
      const { enabled, provider, issuer_url, client_id, client_secret, redirect_uri, scopes } = req.body || {};
      const incomingSecret = (client_secret && client_secret !== '[SCRYPT_PROTECTED]' && String(client_secret).trim() !== '') ? client_secret : null;
      // Validate issuer_url: reject private IPs / metadata endpoints
      if (issuer_url) {
        try {
          const u = new URL(String(issuer_url));
          const host = u.hostname.toLowerCase();
          if (!['http:', 'https:'].includes(u.protocol)) throw new Error('protocol');
          if (process.env.NODE_ENV === 'production' && u.protocol !== 'https:') throw new Error('https');
          if (host === 'localhost' || host === '127.0.0.1' || host === '169.254.169.254' || host.startsWith('10.') || host.startsWith('192.168.') || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) {
            return res.status(400).json({ status: 'error', error: 'issuer_url tidak boleh mengarah ke IP privat/metadata.' });
          }
          // DNS rebinding guard: resolve and reject private IPs
          try {
            const resolved = await lookup(host);
            const ip = resolved?.address || '';
            if (ip === '127.0.0.1' || ip === '169.254.169.254' || ip.startsWith('10.') || ip.startsWith('192.168.') || /^172\.(1[6-9]|2\d|3[01])\./.test(ip)) {
              return res.status(400).json({ status: 'error', error: 'issuer_url resolve ke IP privat/metadata.' });
            }
          } catch {}
        } catch {
          return res.status(400).json({ status: 'error', error: 'issuer_url tidak valid.' });
        }
      }
      if (pgAdapter) {
        await pgAdapter.query(
          `INSERT INTO tenant_sso_settings
             (tenant_id, enabled, provider, issuer_url, client_id, client_secret, redirect_uri, scopes, updated_at)
           VALUES ($1, COALESCE($2, false), $3, $4, $5, $6, $7, $8, NOW())
           ON CONFLICT (tenant_id) DO UPDATE SET
             enabled = COALESCE($2, tenant_sso_settings.enabled),
             provider = COALESCE($3, tenant_sso_settings.provider),
             issuer_url = COALESCE($4, tenant_sso_settings.issuer_url),
             client_id = COALESCE($5, tenant_sso_settings.client_id),
             client_secret = COALESCE($6, tenant_sso_settings.client_secret),
             redirect_uri = COALESCE($7, tenant_sso_settings.redirect_uri),
             scopes = COALESCE($8, tenant_sso_settings.scopes),
             updated_at = NOW()`,
          [
            tenantId,
            typeof enabled === 'boolean' ? enabled : null,
            provider || null,
            issuer_url || null,
            client_id || null,
            incomingSecret,
            redirect_uri || null,
            scopes || null,
          ]
        );
      }
      let settings: any = {
        tenant_id: tenantId,
        enabled: !!enabled,
        provider: provider || null,
        issuer_url: issuer_url || null,
        client_id: client_id || null,
        client_secret: client_secret || null,
        redirect_uri: redirect_uri || null,
        scopes: scopes || null,
      };
      if (pgAdapter) {
        const r = await pgAdapter.query('SELECT * FROM tenant_sso_settings WHERE tenant_id = $1 LIMIT 1', [tenantId]);
        if (r.rows && r.rows.length > 0) settings = r.rows[0];
      }
      res.json({ status: 'ok', settings });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to update SSO settings' });
    }
  });

  // Tenant self-service onboarding requests (Fase 4)
  app.post('/api/tenant-requests', async (req, res) => {
    try {
      const { requested_tenant_id, village_name, slug, contact_name, contact_email, contact_phone, notes } = req.body || {};
      if (!village_name || !slug || !contact_name || !contact_email) {
        return res.status(400).json({ error: 'village_name, slug, contact_name, contact_email wajib diisi.' });
      }
      if (pgAdapter) {
        const r = await pgAdapter.query(
          `INSERT INTO tenant_onboarding_requests
             (requested_tenant_id, village_name, slug, contact_name, contact_email, contact_phone, notes, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'pending')
           RETURNING *`,
          [requested_tenant_id || slug, village_name, slug, contact_name, contact_email, contact_phone || null, notes || null]
        );
        return res.status(201).json({ status: 'ok', request: r.rows?.[0] });
      }
      res.status(201).json({ status: 'ok', request: { village_name, slug, contact_name, contact_email, status: 'pending' } });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to create onboarding request' });
    }
  });

  app.get('/api/tenant-requests', requirePlatformAdmin, async (_req, res) => {
    try {
      if (pgAdapter) {
        const r = await pgAdapter.query('SELECT * FROM tenant_onboarding_requests ORDER BY created_at DESC');
        return res.json({ requests: r.rows || [] });
      }
      res.json({ requests: [] });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to list onboarding requests' });
    }
  });

  app.put('/api/tenant-requests/:id', requirePlatformAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { action } = req.body || {}; // 'approve' | 'reject'
      if (!pgAdapter) return res.status(503).json({ error: 'PostgreSQL tidak tersedia.' });
      const r = await pgAdapter.query('SELECT * FROM tenant_onboarding_requests WHERE id = $1 LIMIT 1', [id]);
      if (!r.rows || r.rows.length === 0) return res.status(404).json({ error: 'Request tidak ditemukan.' });
      const request = r.rows[0];
      if (action === 'reject') {
        await pgAdapter.query(`UPDATE tenant_onboarding_requests SET status='rejected', updated_at=NOW() WHERE id=$1`, [id]);
        return res.json({ status: 'ok', result: 'rejected' });
      }
      if (action !== 'approve') {
        return res.status(400).json({ error: 'action harus approve atau reject.' });
      }
      // Approve: create tenant + subscription + seed file
      const tenantId = request.requested_tenant_id || request.slug;
      await pgAdapter.query(
        `INSERT INTO tenants (id, slug, name, status) VALUES ($1,$2,$3,'active') ON CONFLICT (id) DO NOTHING`,
        [tenantId, request.slug, request.village_name]
      );
      await pgAdapter.query(
        `INSERT INTO subscriptions (tenant_id, plan, status) VALUES ($1,'free','active') ON CONFLICT (tenant_id) DO NOTHING`,
        [tenantId]
      );
      const tenantFile = path.join(DATA_DIR, `village-db-${tenantId}.json`);
      if (!fs.existsSync(tenantFile)) {
        const initial = createInitialDatabase();
        const normInitial = normalizeAdminUsers(initial.adminUsers || []);
        initial.adminUsers = normInitial.users;
        fs.writeFileSync(tenantFile, JSON.stringify(initial, null, 2), 'utf-8');
      }
      await pgAdapter.query(
        `UPDATE tenant_onboarding_requests SET status='approved', approved_tenant_id=$2, updated_at=NOW() WHERE id=$1`,
        [id, tenantId]
      );
      res.json({ status: 'ok', result: 'approved', tenant_id: tenantId });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to update onboarding request' });
    }
  });

  // Notification delivery outbox + gateway (Fase 4 scaffold)
  app.get('/api/notifications/outbox', requireAdmin, async (req, res) => {
    try {
      const tenantId = tenantStorage.getStore() || 'default';
      if (!pgAdapter) return res.json({ items: [] });
      const r = await pgAdapter.query('SELECT * FROM notification_outbox WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 100', [tenantId]);
      res.json({ items: r.rows || [] });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to list outbox' });
    }
  });

  app.post('/api/notifications/send', requireAdmin, async (req, res) => {
    const tier = (req as any).adminRoleTier as AdminRoleTier;
    if (tier !== 'super_admin') {
      return res.status(403).json({ status: 'error', error: 'Forbidden: Hanya super_admin yang dapat mengirim notifikasi.' });
    }
    try {
      const tenantId = tenantStorage.getStore() || 'default';
      const { channel, message, subject } = req.body || {};
      if (!channel || !['email', 'whatsapp'].includes(channel)) {
        return res.status(400).json({ error: 'channel harus email atau whatsapp.' });
      }
      if (!message) return res.status(400).json({ error: 'message wajib diisi.' });
      if (!pgAdapter) return res.status(503).json({ error: 'PostgreSQL tidak tersedia.' });

      // Resolve recipient from tenant settings
      const s = await pgAdapter.query('SELECT * FROM tenant_notification_settings WHERE tenant_id = $1 LIMIT 1', [tenantId]);
      const settings = s.rows?.[0];
      const recipient = channel === 'email' ? settings?.email_recipient : settings?.whatsapp_recipient;
      const enabled = channel === 'email' ? settings?.email_enabled : settings?.whatsapp_enabled;
      if (!enabled) return res.status(400).json({ error: `Kanal ${channel} tidak aktif untuk tenant ini.` });
      if (!recipient) return res.status(400).json({ error: `Penerima ${channel} belum diisi.` });

      const r = await pgAdapter.query(
        `INSERT INTO notification_outbox (tenant_id, channel, recipient, subject, message, status)
         VALUES ($1,$2,$3,$4,$5,'pending') RETURNING *`,
        [tenantId, channel, recipient, subject || null, message]
      );
      res.status(201).json({ status: 'ok', item: r.rows?.[0] });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to enqueue notification' });
    }
  });

  app.post('/api/notifications/dispatch', requireAdmin, async (req, res) => {
    const tier = (req as any).adminRoleTier as AdminRoleTier;
    if (tier !== 'super_admin') {
      return res.status(403).json({ status: 'error', error: 'Forbidden: Hanya super_admin yang dapat dispatch notifikasi.' });
    }
    try {
      const tenantId = tenantStorage.getStore() || 'default';
      if (!pgAdapter) return res.status(503).json({ error: 'PostgreSQL tidak tersedia.' });
      const pending = await pgAdapter.query(
        `SELECT * FROM notification_outbox WHERE tenant_id = $1 AND status = 'pending' ORDER BY created_at ASC LIMIT 50`,
        [tenantId]
      );
      let sent = 0;
      let failed = 0;
      let logged = 0;
      for (const item of pending.rows || []) {
        try {
          await pgAdapter.query(`UPDATE notification_outbox SET attempts = attempts + 1 WHERE id = $1`, [item.id]);
          const configured = item.channel === 'email' ? hasEmailProvider() : hasWhatsAppProvider();
          if (configured) {
            if (item.channel === 'email') await dispatchEmail(item);
            else await dispatchWhatsApp(item);
            await pgAdapter.query(`UPDATE notification_outbox SET status='sent', sent_at=NOW() WHERE id=$1`, [item.id]);
            sent++;
          } else {
            await pgAdapter.query(`UPDATE notification_outbox SET status='logged', sent_at=NOW() WHERE id=$1`, [item.id]);
            logged++;
          }
        } catch (err: any) {
          await pgAdapter.query(`UPDATE notification_outbox SET status='failed', last_error=$2 WHERE id=$1`, [item.id, err?.message || 'dispatch error']);
          failed++;
        }
      }
      res.json({ status: 'ok', processed: (pending.rows || []).length, sent, failed, logged, gateway: (process.env.NOTIFICATION_WEBHOOK_URL || process.env.EMAIL_PROVIDER || process.env.WHATSAPP_PROVIDER) ? 'configured' : 'none (logged)' });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to dispatch notifications' });
    }
  });

  // SSO redirect/callback scaffold (Fase 4)
  app.get('/api/sso/login', async (req, res) => {
    try {
      const tenantId = tenantStorage.getStore() || 'default';
      if (!pgAdapter) return res.status(503).json({ error: 'PostgreSQL tidak tersedia.' });
      const r = await pgAdapter.query('SELECT * FROM tenant_sso_settings WHERE tenant_id = $1 LIMIT 1', [tenantId]);
      const s = r.rows?.[0];
      if (!s || !s.enabled || !s.issuer_url || !s.client_id) {
        return res.status(400).json({ error: 'SSO belum dikonfigurasi/aktif untuk tenant ini.' });
      }
      const state = Math.random().toString(36).slice(2) + Date.now().toString(36);
      ssoStateStore.set(state, { tenantId, createdAt: Date.now() });
      // cleanup expired
      for (const [k, v] of ssoStateStore.entries()) {
        if (Date.now() - v.createdAt > 5 * 60 * 1000) ssoStateStore.delete(k);
      }
      const authUrl = new URL('/authorize', s.issuer_url.replace(/\/$/, ''));
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('client_id', s.client_id);
      authUrl.searchParams.set('redirect_uri', s.redirect_uri || `${req.protocol}://${req.get('host')}/api/sso/callback`);
      authUrl.searchParams.set('scope', s.scopes || 'openid profile email');
      authUrl.searchParams.set('state', state);
      // Store state in a short-lived cookie-less query is not secure; production should use signed state. Scaffold only.
      res.redirect(authUrl.toString());
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to initiate SSO login' });
    }
  });

  app.get('/api/sso/callback', async (req, res) => {
    try {
      const { code, state, error } = req.query || {};
      if (error) return res.status(400).send(`SSO error: ${error}`);
      if (!code) return res.status(400).send('Missing authorization code.');
      const tenantId = tenantStorage.getStore() || 'default';
      // Verify state
      const stateEntry = state ? ssoStateStore.get(String(state)) : undefined;
      if (!stateEntry || stateEntry.tenantId !== tenantId || Date.now() - stateEntry.createdAt > 5 * 60 * 1000) {
        return res.status(400).send('Invalid or expired state.');
      }
      ssoStateStore.delete(String(state));
      // Load SSO settings
      let settings: any = null;
      if (pgAdapter) {
        const r = await pgAdapter.query('SELECT * FROM tenant_sso_settings WHERE tenant_id = $1 LIMIT 1', [tenantId]);
        settings = r.rows?.[0];
      }
      if (!settings || !settings.enabled || !settings.issuer_url || !settings.client_id) {
        return res.status(400).send('SSO not configured/enabled for this tenant.');
      }

      const issuer = String(settings.issuer_url).replace(/\/$/, '');
      const redirectUri = settings.redirect_uri || `${req.protocol}://${req.get('host')}/api/sso/callback`;

      // Token exchange
      const tokenResp = await fetch(`${issuer}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: String(code),
          redirect_uri: redirectUri,
          client_id: settings.client_id,
          client_secret: settings.client_secret || '',
        }),
      });
      if (!tokenResp.ok) {
        const txt = await tokenResp.text();
        return res.status(400).send(`Token exchange failed: ${txt}`);
      }
      const tokenData = await tokenResp.json();
      const accessToken = tokenData.access_token;
      if (!accessToken) return res.status(400).send('No access_token from IdP.');

      // Userinfo
      const uiResp = await fetch(`${issuer}/userinfo`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const userinfo = uiResp.ok ? await uiResp.json() : {};
      const username = String(userinfo.preferred_username || userinfo.email || userinfo.sub || 'sso_user').toLowerCase();
      const fullName = String(userinfo.name || username);

      // Find or create admin user in tenant
      const db = ensureDatabase();
      let matched = (db.adminUsers || []).find((u) => u.username.toLowerCase() === username);
      if (!matched) {
        matched = {
          id: `sso-${Date.now()}`,
          username,
          fullName,
          role: 'Menunggu Persetujuan (SSO)',
          passwordHash: hashPasswordScrypt('sso-idp-managed'),
          nip: userinfo.sub || 'SSO-IDP',
          status: 'pending',
        } as any;
        db.adminUsers = [...(db.adminUsers || []), matched as any];
        await saveDatabase(db, 'adminUsers');
        return res.status(202).send('Akun SSO dibuat, menunggu persetujuan administrator.');
      }
      const matchedUser = matched!;

      // Issue local session
      cleanExpiredSessions();
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const now = Date.now();
      const roleTier = resolveAdminRoleTier(matchedUser);
      const isPlatformAdmin = (tenantStorage.getStore() || 'default') === 'default' && matchedUser.username.toLowerCase() === 'admin';
      const session: ActiveSession = {
        token: sessionToken,
        tokenHash: hashTokenSha256(sessionToken),
        username: matchedUser.username,
        fullName: matchedUser.fullName,
        role: matchedUser.role,
        roleTier,
        nip: matchedUser.nip || '',
        isPlatformAdmin,
        tenantId: tenantStorage.getStore() || 'default',
        createdAt: now,
        expiresAt: now + SESSION_TTL_MS,
      };
      activeSessions.set(sessionToken, session);
      await persistSessionToPg(session);

      // Redirect to app with token
      res.redirect(`/?sso_token=${encodeURIComponent(sessionToken)}`);
    } catch (err: any) {
      res.status(500).send(err?.message || 'SSO callback error');
    }
  });

  // SSO simulation with dummy data (for testing without real IdP)
  app.post('/api/sso/simulate', requireAdmin, async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({ status: 'error', error: 'Not found.' });
    }
    const tier = (req as any).adminRoleTier as AdminRoleTier;
    if (tier !== 'super_admin') {
      return res.status(403).json({ status: 'error', error: 'Forbidden: Hanya super_admin yang diizinkan.' });
    }
    try {
      const { username, fullName, role } = req.body || {};
      const uname = (username || 'ssoadmin').toLowerCase();
      const fname = fullName || 'SSO Dummy User';
      const r = role || 'Sekretaris Desa (Super Admin)';
      const db = ensureDatabase();
      let matched = (db.adminUsers || []).find((u) => u.username.toLowerCase() === uname);
      if (!matched) {
        matched = {
          id: `sso-${Date.now()}`,
          username: uname,
          fullName: fname,
          role: r,
          passwordHash: hashPasswordScrypt('sso-dummy-password'),
          nip: 'SSO-DUMMY',
        } as any;
        db.adminUsers = [...(db.adminUsers || []), matched as AdminUser];
        await saveDatabase(db, 'adminUsers');
      }
      const matchedUser = matched!;
      const simTenantId = tenantStorage.getStore() || 'default';
      const isPlatformAdmin = simTenantId === 'default' && matchedUser.username.toLowerCase() === 'admin';
      cleanExpiredSessions();
      const token = crypto.randomBytes(32).toString('hex');
      const now = Date.now();
      const roleTier = resolveAdminRoleTier(matchedUser);
      const session: ActiveSession = {
        token,
        tokenHash: hashTokenSha256(token),
        username: matchedUser.username,
        fullName: matchedUser.fullName,
        role: matchedUser.role,
        roleTier,
        nip: matchedUser.nip || '',
        isPlatformAdmin,
        createdAt: now,
        expiresAt: now + SESSION_TTL_MS,
      };
      activeSessions.set(token, session);
      await persistSessionToPg(session);
      res.json({
        status: 'ok',
        simulated: true,
        token,
        roleTier,
        expiresAt: new Date(session.expiresAt).toISOString(),
        user: { username: matchedUser.username, fullName: matchedUser.fullName, role: matchedUser.role, nip: matchedUser.nip || '', isPlatformAdmin },
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'SSO simulation failed' });
    }
  });

  // Mock IdP endpoints for local SSO testing
  app.get('/api/sso/mock/authorize', async (req, res) => {
    if (process.env.NODE_ENV === 'production') return res.status(404).send('Not found.');
    const redirectUri = String(req.query.redirect_uri || '');
    const state = String(req.query.state || '');
    if (!redirectUri) return res.status(400).send('redirect_uri required');
    const url = new URL(redirectUri);
    url.searchParams.set('code', 'mock_code_dummy');
    url.searchParams.set('state', state);
    res.redirect(url.toString());
  });

  app.post('/api/sso/mock/token', async (_req, res) => {
    if (process.env.NODE_ENV === 'production') return res.status(404).json({ error: 'Not found.' });
    res.json({ access_token: 'mock_access_token', token_type: 'Bearer', expires_in: 3600, id_token: 'mock_id_token' });
  });

  app.get('/api/sso/mock/userinfo', async (_req, res) => {
    if (process.env.NODE_ENV === 'production') return res.status(404).json({ error: 'Not found.' });
    res.json({ sub: 'mock-user', email: 'sso@desa.id', name: 'SSO Dummy User', preferred_username: 'ssoadmin' });
  });

  // Market product self-service submissions (Fase feature)
  app.post('/api/market-submissions', async (req, res) => {
    try {
      const tenantId = tenantStorage.getStore() || 'default';
      const { name, category, price, unit, seller_name, producer_name, dusun, whatsapp, stock, image_url, description, is_organic_or_local } = req.body || {};
      if (!name || !category || !price || !unit || !seller_name || !dusun || !whatsapp) {
        return res.status(400).json({ error: 'name, category, price, unit, seller_name, dusun, whatsapp wajib diisi.' });
      }
      if (!pgAdapter) return res.status(503).json({ error: 'PostgreSQL tidak tersedia.' });
      const r = await pgAdapter.query(
        `INSERT INTO market_product_submissions
           (tenant_id, name, category, price, unit, seller_name, producer_name, dusun, whatsapp, stock, image_url, description, is_organic_or_local, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'pending')
         RETURNING *`,
        [tenantId, name, category, Number(price), unit, seller_name, producer_name || null, dusun, whatsapp, Number(stock) || 0, image_url || null, description || null, is_organic_or_local !== false]
      );
      res.status(201).json({ status: 'ok', submission: r.rows?.[0] });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to create market submission' });
    }
  });

  app.get('/api/market-submissions', requireAdmin, async (req, res) => {
    try {
      const tenantId = tenantStorage.getStore() || 'default';
      if (!pgAdapter) return res.json({ submissions: [] });
      const r = await pgAdapter.query('SELECT * FROM market_product_submissions WHERE tenant_id = $1 ORDER BY created_at DESC', [tenantId]);
      res.json({ submissions: r.rows || [] });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to list market submissions' });
    }
  });

  app.put('/api/market-submissions/:id', requireAdmin, async (req, res) => {
    const tier = (req as any).adminRoleTier as AdminRoleTier;
    if (!canModifyDomain(tier, 'products')) {
      return res.status(403).json({ status: 'error', error: 'Forbidden: Tidak berhak memoderasi produk.' });
    }
    try {
      const tenantId = tenantStorage.getStore() || 'default';
      const { id } = req.params;
      const { action } = req.body || {};
      if (!pgAdapter) return res.status(503).json({ error: 'PostgreSQL tidak tersedia.' });
      const r = await pgAdapter.query('SELECT * FROM market_product_submissions WHERE id = $1 AND tenant_id = $2 LIMIT 1', [id, tenantId]);
      if (!r.rows || r.rows.length === 0) return res.status(404).json({ error: 'Submission tidak ditemukan.' });
      const sub = r.rows[0];
      if (action === 'reject') {
        await pgAdapter.query(`UPDATE market_product_submissions SET status='rejected', updated_at=NOW() WHERE id=$1`, [id]);
        return res.json({ status: 'ok', result: 'rejected' });
      }
      if (action !== 'approve') {
        return res.status(400).json({ error: 'action harus approve atau reject.' });
      }
      // Approve: add product to village DB
      const productId = `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const db = ensureDatabase();
      const newProduct = {
        id: productId,
        name: sub.name,
        category: sub.category,
        price: Number(sub.price),
        unit: sub.unit,
        sellerName: sub.seller_name,
        producerName: sub.producer_name || sub.seller_name,
        dusun: sub.dusun,
        whatsapp: sub.whatsapp,
        rating: 5,
        soldCount: 0,
        stock: Number(sub.stock) || 0,
        imageUrl: sub.image_url || '',
        description: sub.description || '',
        isOrganicOrLocal: !!sub.is_organic_or_local,
      };
      db.products = [newProduct, ...(db.products || [])];
      await saveDatabase(db, 'products');
      await pgAdapter.query(`UPDATE market_product_submissions SET status='approved', approved_product_id=$2, updated_at=NOW() WHERE id=$1`, [id, productId]);
      recordAudit('market_submission_approve', 'admin', `Submission ${id} approved`);
      res.json({ status: 'ok', result: 'approved', product_id: productId });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to process market submission' });
    }
  });

  // Analytics (village-level)
  app.get('/api/analytics', requireAdmin, async (req, res) => {
    try {
      const db = ensureDatabase();
      const tenantId = tenantStorage.getStore() || 'default';
      let usage = { month: '', request_count: 0, limit: 1000 };
      if (pgAdapter) {
        const now = new Date();
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const u = await pgAdapter.query('SELECT request_count FROM usage_counters WHERE tenant_id = $1 AND month = $2 LIMIT 1', [tenantId, month]);
        const s = await pgAdapter.query('SELECT max_requests_per_month FROM subscriptions WHERE tenant_id = $1 LIMIT 1', [tenantId]);
        usage = { month, request_count: u.rows?.[0]?.request_count ?? 0, limit: s.rows?.[0]?.max_requests_per_month ?? 1000 };
      }
      const statusCounts: Record<string, number> = {};
      for (const r of db.requests || []) {
        statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
      }
      res.json({
        status: 'ok',
        analytics: {
          citizens: (db.citizens || []).length,
          requests: (db.requests || []).length,
          requestStatus: statusCounts,
          products: (db.products || []).length,
          aspirations: (db.aspirations || []).length,
          news: (db.news || []).length,
          gallery: (db.gallery || []).length,
          hamlets: (db.hamlets || []).length,
          usage,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to compute analytics' });
    }
  });

  // Platform analytics (super admin)
  app.get('/api/platform/analytics', requirePlatformAdmin, async (_req, res) => {
    try {
      if (!pgAdapter) return res.json({ tenants: [], totals: {} });
      const tenantsRes = await pgAdapter.query('SELECT * FROM tenants ORDER BY created_at DESC');
      const tenants = tenantsRes.rows || [];
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const enriched = [];
      let totalRequests = 0;
      let totalTenants = tenants.length;
      for (const t of tenants) {
        const s = await pgAdapter.query('SELECT plan, status, max_requests_per_month FROM subscriptions WHERE tenant_id = $1 LIMIT 1', [t.id]);
        const u = await pgAdapter.query('SELECT request_count FROM usage_counters WHERE tenant_id = $1 AND month = $2 LIMIT 1', [t.id, month]);
        const sub = s.rows?.[0] || { plan: 'free', status: 'active', max_requests_per_month: 1000 };
        const usage = u.rows?.[0]?.request_count ?? 0;
        totalRequests += usage;
        enriched.push({ tenant: t, subscription: sub, usage: { month, request_count: usage, limit: sub.max_requests_per_month } });
      }
      res.json({ status: 'ok', month, totals: { tenants: totalTenants, requests: totalRequests }, tenants: enriched });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to compute platform analytics' });
    }
  });

  // Payment transactions (scaffold)
  app.get('/api/payments', requireAdmin, async (req, res) => {
    try {
      const tenantId = tenantStorage.getStore() || 'default';
      if (!pgAdapter) return res.json({ payments: [] });
      const r = await pgAdapter.query('SELECT * FROM payment_transactions WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 100', [tenantId]);
      res.json({ payments: r.rows || [] });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to list payments' });
    }
  });

  app.post('/api/payments/create', requireAdmin, async (req, res) => {
    const tier = (req as any).adminRoleTier as AdminRoleTier;
    if (tier !== 'super_admin') {
      return res.status(403).json({ status: 'error', error: 'Forbidden: Hanya super_admin yang dapat membuat pembayaran.' });
    }
    try {
      const tenantId = tenantStorage.getStore() || 'default';
      const { plan, amount } = req.body || {};
      if (!plan || !amount) return res.status(400).json({ error: 'plan dan amount wajib diisi.' });
      if (!pgAdapter) return res.status(503).json({ error: 'PostgreSQL tidak tersedia.' });
      const provider = (process.env.PAYMENT_PROVIDER || 'mock').toLowerCase();
      const externalId = `pay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const checkoutUrl = provider === 'mock' ? `http://localhost:3000/pay/mock/${externalId}` : null;
      const r = await pgAdapter.query(
        `INSERT INTO payment_transactions (tenant_id, plan, amount, provider, status, external_id, checkout_url)
         VALUES ($1,$2,$3,$4,'pending',$5,$6) RETURNING *`,
        [tenantId, plan, Number(amount), provider, externalId, checkoutUrl]
      );
      res.status(201).json({ status: 'ok', payment: r.rows?.[0], provider });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to create payment' });
    }
  });

  // Audit log helper (server-side)
  const recordAudit = async (action: string, actor: string, detail: string) => {
    try {
      const db = ensureDatabase();
      const entry = {
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        actor: actor,
        role: 'system',
        action,
        module: 'Keamanan' as any,
        encryptionHash: crypto.createHash('sha256').update(detail).digest('hex'),
        status: 'Sukses' as const,
      };
      db.auditLogs = [entry, ...(db.auditLogs || [])].slice(0, 200);
      await saveDatabase(db, 'auditLogs');
    } catch {}
  };
  app.get('/api/db/backup', requireAdmin, async (req, res) => {
    const tier = (req as any).adminRoleTier as AdminRoleTier;
    if (!canExecuteSystemAction(tier, 'backup_db')) {
      res.status(403).json({
        status: 'error',
        error: `Forbidden: Peran '${tier}' tidak diizinkan mengunduh snapshot backup database.`,
      });
      return;
    }
    const snap = createBackupSnapshot('api');
    const db = ensureDatabase();
    res.json({
      status: 'ok',
      backup: snap,
      data: sanitizeDbForClient(db, true),
    });
  });

  app.post('/api/db/backup', requireAdmin, async (req, res) => {
    const tier = (req as any).adminRoleTier as AdminRoleTier;
    if (!canExecuteSystemAction(tier, 'backup_db')) {
      res.status(403).json({
        status: 'error',
        error: `Forbidden: Peran '${tier}' tidak diizinkan membuat snapshot backup.`,
      });
      return;
    }
    const snap = createBackupSnapshot('manual');
    res.json({
      status: 'ok',
      backup: snap,
    });
  });

  app.post('/api/db/restore', requireAdmin, async (req, res) => {
    const tier = (req as any).adminRoleTier as AdminRoleTier;
    if (!canExecuteSystemAction(tier, 'restore_db')) {
      res.status(403).json({
        status: 'error',
        error: `Forbidden: Hanya 'super_admin' yang diizinkan memulihkan (restore) database.`,
      });
      return;
    }

    const incomingData = req.body?.data;
    const parsed = FullVillageDatabaseSchema.safeParse(incomingData);
    if (!parsed.success) {
      res.status(400).json({
        status: 'error',
        error: `Payload data restore tidak valid: ${parsed.error.issues[0]?.message}`,
        issues: parsed.error.issues,
      });
      return;
    }

    const preRestoreBackup = createBackupSnapshot('pre-restore');
    const currentDb = ensureDatabase();
    const validData = parsed.data as unknown as VillageDatabase;

    // Preserve existing passwordHashes if incoming backup was sanitized ([SCRYPT_PROTECTED])
    const existingByUser = new Map(
      (currentDb.adminUsers || []).map((u) => [u.username.toLowerCase(), u])
    );
    const restoredUsers: AdminUser[] = (validData.adminUsers || []).map((u) => {
      const prev = existingByUser.get(u.username.toLowerCase());
      const hasValidScrypt = u.passwordHash && u.passwordHash.startsWith(SCRYPT_PREFIX);
      return {
        ...u,
        passwordHash: hasValidScrypt
          ? u.passwordHash
          : prev?.passwordHash || hashPasswordScrypt(u.password || 'desa2026'),
      };
    });

    // Preserve citizen passwordHashes if incoming backup lacks them
    const existingCitizenByNik = new Map(
      (currentDb.citizens || []).map((c) => [c.nik, c])
    );
    const restoredCitizens = (validData.citizens || []).map((c) => {
      const prev = existingCitizenByNik.get(c.nik);
      const hasValidScrypt = c.passwordHash && c.passwordHash.startsWith(SCRYPT_PREFIX);
      return {
        ...c,
        passwordHash: hasValidScrypt ? c.passwordHash : prev?.passwordHash || c.passwordHash,
      };
    });

    const restored: VillageDatabase = {
      ...currentDb,
      ...validData,
      adminUsers: restoredUsers,
      citizens: restoredCitizens,
      version: (currentDb.version || 8) + 1,
      lastUpdated: new Date().toISOString(),
    };
    await saveDatabase(restored);
    recordAudit('restore_db', 'admin', 'Database restored');
    res.json({
      status: 'ok',
      preRestoreBackup,
      version: restored.version,
      lastUpdated: restored.lastUpdated,
    });
  });

  // 4. Protected: Upload Media Asset directly into Database (Validated with Zod)
  app.post('/api/media', requireAdmin, async (req, res) => {
    const parsed = MediaUploadPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        status: 'error',
        error: parsed.error.issues[0]?.message || 'Data gambar tidak valid.',
        issues: parsed.error.issues,
      });
      return;
    }

    const { name, category, dataUrl, mimeType } = parsed.data;
    const currentDb = ensureDatabase();
    const newAsset: MediaAsset = {
      id: `media-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name,
      category,
      dataUrl,
      mimeType,
      sizeBytes: Math.round((dataUrl.length * 3) / 4),
      createdAt: new Date().toISOString().split('T')[0],
    };

    currentDb.mediaAssets = [newAsset, ...(currentDb.mediaAssets || []).slice(0, 60)];
    await saveDatabase(currentDb, 'mediaAssets');

    res.json({ status: 'ok', asset: newAsset });
  });

  // 5. Protected: Delete Media Asset from Database
  app.delete('/api/media/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const currentDb = ensureDatabase();
    currentDb.mediaAssets = (currentDb.mediaAssets || []).filter((m) => m.id !== id);
    await saveDatabase(currentDb, 'mediaAssets');
    res.json({ status: 'ok', deletedId: id });
  });

  // 6. Live Chat Messages Endpoint (GET / POST / DELETE)
  app.get('/api/chat', async (_req, res) => {
    res.status(401).json({ status: 'error', error: 'Endpoint publik dihapus. Gunakan admin panel.' });
  });

  app.post('/api/chat', async (req, res) => {
    const db = ensureDatabase();
    const defaultSender = db.siteConfig.defaults?.senderName || 'Warga Desa';
    const {
      sessionId = 'warga-publik',
      senderName = defaultSender,
      senderPhone = '-',
      channel = 'web',
      message = '',
      askAi = false,
    } = req.body || {};
    // Public chat can never impersonate admin; force citizen
    const senderRole = 'citizen';

    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: 'Pesan chat tidak boleh kosong.' });
      return;
    }

    const timestamp = formatNowTimestamp();

    const userMsg: ChatMessage = {
      id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sessionId,
      senderName: senderName.trim() || defaultSender,
      senderPhone: senderPhone.trim() || '-',
      senderRole,
      channel,
      message: message.trim(),
      timestamp,
      isRead: false,
    };

    const updatedMessages = [...(db.chatMessages || []), userMsg];
    let aiMessage: ChatMessage | null = null;

    if (askAi && senderRole === 'citizen') {
      const aiResult = await generateVillageAiAnswer(message.trim(), db);
      aiMessage = {
        id: `chat-ai-${Date.now() + 1}`,
        sessionId,
        senderName: `Asisten Digital ${db.siteConfig.villageName}`,
        senderPhone: db.siteConfig.officialWhatsApp,
        senderRole: 'ai',
        channel,
        message: aiResult.reply,
        timestamp: formatNowTimestamp(),
        isRead: true,
      };
      updatedMessages.push(aiMessage);
    }

    db.chatMessages = updatedMessages;
    await saveDatabase(db, 'chatMessages');

    res.json({
      status: 'ok',
      userMessage: userMsg,
      aiMessage,
      messages: db.chatMessages,
    });
  });

  app.delete('/api/chat/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const db = ensureDatabase();
    db.chatMessages = (db.chatMessages || []).filter((m) => m.id !== id);
    await saveDatabase(db, 'chatMessages');
    res.json({ status: 'ok', deletedId: id, messages: db.chatMessages });
  });

  // 7. Server-Side Gemini AI Assistant & Official Draft Generator
  app.post('/api/ai/chat', strictRateLimiter(10), async (req, res) => {
    const { prompt = '' } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'Prompt pertanyaan wajib diisi.' });
      return;
    }
    const db = ensureDatabase();
    const result = await generateVillageAiAnswer(prompt, db);
    res.json({
      status: 'ok',
      reply: result.reply,
      provider: result.provider,
    });
  });

  app.post('/api/ai/draft', requireAdmin, async (req, res) => {
    const { topic = '', type = 'pengumuman' } = req.body || {};
    const db = ensureDatabase();
    const cfg = db.siteConfig;
    const activeModel = cfg.aiModel || 'gemini-3.8-flash';

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim() !== '') {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        });
        const prompt = `Buatkan draf resmi ${type} untuk Pemerintah ${cfg.villageName}, ${cfg.subDistrict}, ${cfg.district} (${cfg.headOfVillageTitle || 'Kepala Desa'}: ${cfg.headOfVillageName}) tentang topik: "${topic}". Gunakan bahasa baku pemerintahan desa yang jelas, sopan, dan siap dipublikasikan.`;
        const response = await ai.models.generateContent({
          model: activeModel,
          contents: prompt,
        });
        if (response.text) {
          res.json({
            status: 'ok',
            draft: response.text.trim(),
            provider: activeModel,
          });
          return;
        }
      } catch {
        // Fallback below
      }
    }

    const fallbackDraft = `PEMERINTAH ${cfg.district.toUpperCase()} — ${cfg.subDistrict.toUpperCase()}\nPEMERINTAH ${cfg.villageName.toUpperCase()}\nAlamat: ${cfg.officeAddress}\n\nPENGUMUMAN RESMI: ${topic.toUpperCase() || 'INFORMASI LAYANAN MASYARAKAT'}\n\nDiberitahukan kepada seluruh warga masyarakat ${cfg.villageName} bahwa Pemerintah Desa melaksanakan agenda/layanan terkait "${topic || 'Peningkatan Pelayanan Publik Desa'}". Warga dapat mengakses layanan mandiri secara online 24 jam melalui Portal SID ${cfg.villageName} atau menghubungi layanan resmi WhatsApp (+${cfg.officialWhatsApp}) dan Telegram (${cfg.socialMedia.telegram || 't.me/pemdes_sukamaju'}).\n\nDemikian pengumuman ini disampaikan untuk menjadi maklum.\n\n${cfg.headOfVillageTitle || 'Kepala Desa'} ${cfg.villageName},\n${cfg.headOfVillageName}\nNIP. ${cfg.headOfVillageNip}`;

    res.json({
      status: 'ok',
      draft: fallbackDraft,
      provider: 'sid-template-engine',
    });
  });

  // 8. Real WhatsApp & Telegram Dispatch / Gateway Endpoints
  app.post('/api/integrations/whatsapp', requireAdmin, async (req, res) => {
    const db = ensureDatabase();
    const defaultWaRecipient = db.siteConfig.defaults?.whatsappRecipientName || 'Warga';
    const { phone = '', recipientName = defaultWaRecipient, message = '' } = req.body || {};
    const cleanPhone = String(phone || db.siteConfig.officialWhatsApp).replace(/\D/g, '');
    const normalizedPhone = cleanPhone.startsWith('0')
      ? `62${cleanPhone.slice(1)}`
      : cleanPhone.startsWith('62')
      ? cleanPhone
      : `62${cleanPhone}`;

    const waUrl = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;

    const chatEntry: ChatMessage = {
      id: `chat-wa-${Date.now()}`,
      sessionId: `wa-${normalizedPhone}`,
      senderName: `Gateway WA Pemdes -> ${recipientName}`,
      senderPhone: normalizedPhone,
      senderRole: 'admin',
      channel: 'whatsapp',
      message,
      timestamp: formatNowTimestamp(),
      isRead: true,
      externalUrl: waUrl,
    };
    db.chatMessages = [...(db.chatMessages || []), chatEntry];
    await saveDatabase(db, 'chatMessages');

    res.json({
      status: 'ok',
      channel: 'whatsapp',
      normalizedPhone,
      waUrl,
      chatEntry,
      messages: db.chatMessages,
    });
  });

  app.post('/api/integrations/telegram', requireAdmin, async (req, res) => {
    const db = ensureDatabase();
    const defaultTgRecipient = db.siteConfig.defaults?.telegramRecipientName || 'Warga Telegram';
    const rawChatId = String(req.body?.chatId || '').trim();
    const recipientName = String(req.body?.recipientName || '').trim() || defaultTgRecipient;
    const message = String(req.body?.message || '').trim();

    if (!message) {
      res.status(400).json({
        status: 'error',
        error: 'Isi pesan Telegram tidak boleh kosong.',
      });
      return;
    }

    const botToken = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
    if (!botToken) {
      res.status(400).json({
        status: 'error',
        configured: false,
        error:
          'TELEGRAM_BOT_TOKEN belum dikonfigurasi pada environment server (.env). Tambahkan TELEGRAM_BOT_TOKEN di environment server untuk mengirim pesan via Bot API.',
      });
      return;
    }

    if (!rawChatId) {
      res.status(400).json({
        status: 'error',
        configured: true,
        error:
          'Target chatId pengirim Telegram wajib diisi. Pilih pesan warga dari Telegram di Kotak Masuk atau masukkan Chat ID numerik / @channel.',
      });
      return;
    }

    try {
      const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: rawChatId,
          text: message,
        }),
      });
      const tgData = (await tgRes.json().catch(() => ({}))) as {
        ok?: boolean;
        description?: string;
        error_code?: number;
        result?: { message_id?: number };
      };

      if (!tgRes.ok || !tgData.ok) {
        res.status(400).json({
          status: 'error',
          configured: true,
          telegramErrorCode: tgData.error_code || tgRes.status,
          error: `Gagal mengirim pesan melalui Telegram Bot API (chat_id: ${rawChatId}): ${
            tgData.description || tgRes.statusText || 'Respons tidak valid dari Telegram.'
          }`,
        });
        return;
      }

      const chatEntry: ChatMessage = {
        id: `chat-tg-out-${Date.now()}`,
        sessionId: `tg-${rawChatId}`,
        senderName: `Admin Pemdes -> ${recipientName}`,
        senderPhone: `@${db.siteConfig.telegramBotUsername || 'pemdes_bot'}`,
        senderRole: 'admin',
        channel: 'telegram',
        message,
        timestamp: formatNowTimestamp(),
        isRead: true,
        telegramChatId: rawChatId,
        telegramMessageId: tgData.result?.message_id,
      };
      db.chatMessages = [...(db.chatMessages || []), chatEntry];
      await saveDatabase(db, 'chatMessages');

      res.json({
        status: 'ok',
        channel: 'telegram',
        botApiDispatched: true,
        chatId: rawChatId,
        telegramMessageId: tgData.result?.message_id,
        chatEntry,
        messages: db.chatMessages,
      });
    } catch (err: any) {
      res.status(502).json({
        status: 'error',
        configured: true,
        error: `Koneksi ke server Telegram Bot API gagal: ${err?.message || 'Network error'}`,
      });
    }
  });

  // 8b. Telegram Webhook Receiver
  app.post('/api/telegram/webhook', async (req, res) => {
    const expectedSecret = (process.env.TELEGRAM_WEBHOOK_SECRET || '').trim();
    const providedSecret = String(req.headers['x-telegram-bot-api-secret-token'] || '').trim();

    if (expectedSecret && providedSecret !== expectedSecret) {
      res.status(401).json({
        status: 'error',
        error: 'Unauthorized: Header X-Telegram-Bot-Api-Secret-Token tidak sesuai dengan TELEGRAM_WEBHOOK_SECRET.',
      });
      return;
    }

    const update = req.body || {};
    const tgMsg = update.message || update.edited_message || update.channel_post;

    if (!tgMsg || !tgMsg.chat) {
      res.status(200).json({
        ok: true,
        status: 'ignored',
        reason: 'Payload update Telegram tidak berisi objek message/chat.',
      });
      return;
    }

    const chatId = String(tgMsg.chat.id ?? '').trim();
    const text = String(tgMsg.text || tgMsg.caption || '').trim();
    if (!chatId || !text) {
      res.status(200).json({
        ok: true,
        status: 'ignored',
        reason: 'Pesan tidak memiliki chatId atau teks.',
      });
      return;
    }

    const fromFirst = tgMsg.from?.first_name || '';
    const fromLast = tgMsg.from?.last_name || '';
    const fullName = [fromFirst, fromLast].filter(Boolean).join(' ').trim();
    const username = tgMsg.from?.username ? `@${tgMsg.from.username}` : '';
    const db = ensureDatabase();
    const defaultTgName = db.siteConfig.defaults?.telegramRecipientName || 'Warga Telegram';
    const senderName = fullName || tgMsg.chat?.title || username || `${defaultTgName} (${chatId})`;

    const incomingEntry: ChatMessage = {
      id: `chat-tg-in-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sessionId: `tg-${chatId}`,
      senderName,
      senderPhone: username || `ChatID:${chatId}`,
      senderRole: 'citizen',
      channel: 'telegram',
      message: text,
      timestamp: formatNowTimestamp(),
      isRead: false,
      telegramChatId: chatId,
      telegramMessageId: typeof tgMsg.message_id === 'number' ? tgMsg.message_id : undefined,
    };

    const updatedMessages: ChatMessage[] = [...(db.chatMessages || []), incomingEntry];
    const commandReplyText = evaluateTelegramBotCommand(text, db.requests, db.siteConfig);
    let autoReplyEntry: ChatMessage | null = null;
    let botApiReplySent = false;
    let aiProviderUsed: string | null = null;

    const isExplicitAiCommand = /^\/ai(@[a-zA-Z0-9_]+)?(\s+|$)/i.test(text);
    const shouldAutoReplyWithAi =
      !commandReplyText &&
      (isExplicitAiCommand ||
        req.body?.forceAi === true ||
        db.siteConfig.telegramAiAutoReply !== false);

    let finalReplyText: string | null = commandReplyText;
    let replySenderName = `Bot Layanan ${db.siteConfig.villageName}`;

    if (!finalReplyText && shouldAutoReplyWithAi) {
      const cleanedPrompt = isExplicitAiCommand
        ? text.replace(/^\/ai(@[a-zA-Z0-9_]+)?\s*/i, '').trim() ||
          'Informasi layanan surat dan jam operasional desa'
        : text;
      const aiRes = await generateVillageAiAnswer(cleanedPrompt, db);
      finalReplyText = aiRes.reply;
      aiProviderUsed = aiRes.provider;
      replySenderName = `Asisten AI Telegram ${db.siteConfig.villageName} (${aiRes.provider})`;
    }

    if (finalReplyText) {
      const botToken = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
      let sentMsgId: number | undefined;
      if (botToken) {
        try {
          const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: finalReplyText,
            }),
          });
          const tgData = (await tgRes.json().catch(() => ({}))) as {
            ok?: boolean;
            result?: { message_id?: number };
          };
          if (tgRes.ok && tgData.ok) {
            botApiReplySent = true;
            sentMsgId = tgData.result?.message_id;
          }
        } catch {
          botApiReplySent = false;
        }
      }

      autoReplyEntry = {
        id: `chat-tg-bot-${Date.now() + 1}`,
        sessionId: `tg-${chatId}`,
        senderName: replySenderName,
        senderPhone: `@${db.siteConfig.telegramBotUsername || 'pemdes_bot'}`,
        senderRole: 'ai',
        channel: 'telegram',
        message: finalReplyText,
        timestamp: formatNowTimestamp(),
        isRead: true,
        telegramChatId: chatId,
        telegramMessageId: sentMsgId,
      };
      updatedMessages.push(autoReplyEntry);
    }

    db.chatMessages = updatedMessages;
    await saveDatabase(db, 'chatMessages');

    res.status(200).json({
      ok: true,
      status: 'ok',
      chatId,
      savedMessage: incomingEntry,
      commandReply: autoReplyEntry,
      aiProvider: aiProviderUsed,
      botApiReplySent,
      messages: db.chatMessages,
    });
  });

  // 8b-2. Generate & Send AI Reply directly to a Telegram Chat ID
  app.post('/api/telegram/ai-reply', requireAdmin, async (req, res) => {
    const db = ensureDatabase();
    const rawChatId = String(
      req.body?.chatId || db.siteConfig.telegramDefaultChatId || '619283745'
    ).trim();
    const defaultTgName = db.siteConfig.defaults?.telegramRecipientName || 'Warga Telegram';
    const recipientName = String(req.body?.recipientName || defaultTgName).trim();
    const prompt = String(
      req.body?.prompt || 'Jelaskan syarat layanan surat online dan jam pelayanan desa'
    ).trim();

    if (!rawChatId) {
      res.status(400).json({
        status: 'error',
        error: 'Target chatId Telegram wajib diisi.',
      });
      return;
    }

    const aiRes = await generateVillageAiAnswer(prompt, db);
    const botToken = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
    let botApiDispatched = false;
    let sentMsgId: number | undefined;
    let botApiError: string | null = null;

    if (botToken) {
      try {
        const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: rawChatId,
            text: aiRes.reply,
          }),
        });
        const tgData = (await tgRes.json().catch(() => ({}))) as {
          ok?: boolean;
          description?: string;
          result?: { message_id?: number };
        };
        if (tgRes.ok && tgData.ok) {
          botApiDispatched = true;
          sentMsgId = tgData.result?.message_id;
        } else {
          botApiError = tgData.description || tgRes.statusText || 'Telegram API error';
        }
      } catch (err: any) {
        botApiError = err?.message || 'Network error';
      }
    }

    const aiChatEntry: ChatMessage = {
      id: `chat-tg-ai-${Date.now()}`,
      sessionId: `tg-${rawChatId}`,
      senderName: `Asisten AI Telegram -> ${recipientName} (${aiRes.provider})`,
      senderPhone: `@${db.siteConfig.telegramBotUsername || 'pemdes_bot'}`,
      senderRole: 'ai',
      channel: 'telegram',
      message: aiRes.reply,
      timestamp: formatNowTimestamp(),
      isRead: true,
      telegramChatId: rawChatId,
      telegramMessageId: sentMsgId,
    };

    db.chatMessages = [...(db.chatMessages || []), aiChatEntry];
    await saveDatabase(db, 'chatMessages');

    res.json({
      status: 'ok',
      chatId: rawChatId,
      provider: aiRes.provider,
      reply: aiRes.reply,
      botTokenConfigured: Boolean(botToken),
      botApiDispatched,
      botApiError,
      chatEntry: aiChatEntry,
      messages: db.chatMessages,
    });
  });

  // 8c. Register Telegram Webhook URL via Bot API
  app.post('/api/telegram/set-webhook', requireAdmin, async (req, res) => {
    const botToken = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
    if (!botToken) {
      res.status(400).json({
        status: 'error',
        configured: false,
        error:
          'TELEGRAM_BOT_TOKEN belum dikonfigurasi pada environment server (.env). Set variabel TELEGRAM_BOT_TOKEN terlebih dahulu sebelum menekan Set Webhook.',
      });
      return;
    }

    const baseAppUrl = (
      process.env.APP_URL || `${req.protocol}://${req.get('host')}`
    ).replace(/\/$/, '');
    const webhookUrl =
      String(req.body?.webhookUrl || '').trim() || `${baseAppUrl}/api/telegram/webhook`;
    const secretToken = (process.env.TELEGRAM_WEBHOOK_SECRET || '').trim();

    try {
      const payload: Record<string, string> = { url: webhookUrl };
      if (secretToken) {
        payload.secret_token = secretToken;
      }

      const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const tgData = (await tgRes.json().catch(() => ({}))) as {
        ok?: boolean;
        description?: string;
        error_code?: number;
      };

      if (!tgRes.ok || !tgData.ok) {
        res.status(400).json({
          status: 'error',
          configured: true,
          webhookUrl,
          error: `Telegram menolak pendaftaran setWebhook (${webhookUrl}): ${
            tgData.description || tgRes.statusText || 'Unknown error'
          }`,
        });
        return;
      }

      res.json({
        status: 'ok',
        configured: true,
        webhookUrl,
        secretTokenConfigured: Boolean(secretToken),
        description: tgData.description || 'Webhook was set',
      });
    } catch (err: any) {
      res.status(502).json({
        status: 'error',
        configured: true,
        webhookUrl,
        error: `Gagal menghubungi Telegram Bot API untuk setWebhook: ${
          err?.message || 'Network error'
        }`,
      });
    }
  });

  // 9. Real System Diagnostics, Integration Status & Cryptographic SHA-256 Verification
  app.get('/api/integrations/status', async (req, res) => {
    const startNs = process.hrtime.bigint();
    const db = ensureDatabase();
    const rawJson = JSON.stringify(db);
    const dbHash = crypto.createHash('sha256').update(rawJson).digest('hex');
    const elapsedMs = Number(process.hrtime.bigint() - startNs) / 1_000_000;

    const stat = fs.existsSync(DB_FILE_PATH) ? fs.statSync(DB_FILE_PATH) : null;

    const telegramTokenConfigured = Boolean(
      process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN.trim() !== ''
    );
    const telegramSecretConfigured = Boolean(
      process.env.TELEGRAM_WEBHOOK_SECRET && process.env.TELEGRAM_WEBHOOK_SECRET.trim() !== ''
    );

    const tgMessagesWithChatId = [...(db.chatMessages || [])]
      .reverse()
      .filter((m) => m.channel === 'telegram' && m.telegramChatId);
    const lastCitizenTgMsg =
      tgMessagesWithChatId.find((m) => m.senderRole === 'citizen') || tgMessagesWithChatId[0];

    const baseAppUrl = (
      process.env.APP_URL || `${req.protocol}://${req.get('host')}`
    ).replace(/\/$/, '');

    res.json({
      status: 'ok',
      checkedAt: new Date().toISOString(),
      database: {
        engine: pgAvailable
          ? 'PostgreSQL (village_database JSONB + 24 Normalized Tables)'
          : 'PostgreSQL Hybrid / JSON Persistent Store (/data/village-db.json)',
        postgresConnected: pgAvailable,
        normalizedTables: Object.values(DOMAIN_TO_TABLE_MAP),
        version: db.version,
        lastUpdated: db.lastUpdated,
        sizeKb: stat ? Math.round(stat.size / 1024) : 0,
        readLatencyMs: Math.round(elapsedMs * 100) / 100,
        sha256Digest: dbHash,
        collectionsCount: Object.keys(DOMAIN_TO_TABLE_MAP).length,
        recordsTotal:
          db.citizens.length +
          db.requests.length +
          db.agendas.length +
          db.apbdes.length +
          db.news.length +
          db.gallery.length +
          db.products.length +
          db.officials.length +
          db.regulations.length +
          db.aspirations.length +
          db.facilities.length +
          db.potentials.length +
          db.projects.length +
          db.institutions.length +
          db.hamlets.length +
          db.mediaAssets.length +
          (db.chatMessages?.length || 0),
      },
      services: {
        geminiAi: {
          model: db.siteConfig.aiModel || 'gemini-3.8-flash',
          sdk: '@google/genai',
          configuredKey: Boolean(process.env.GEMINI_API_KEY),
          endpoint: '/api/ai/chat',
          statusLabel: process.env.GEMINI_API_KEY
            ? `Aktif (${db.siteConfig.aiModel || 'gemini-3.8-flash'} Configured)`
            : 'Siaga (Fallback Template Engine)',
        },
        whatsappGateway: {
          officialNumber: db.siteConfig.officialWhatsApp,
          endpoint: '/api/integrations/whatsapp',
          statusLabel: 'Aktif (Direct WA API & Log DB)',
        },
        telegramBridge: {
          channel: db.siteConfig.socialMedia.telegram || 't.me/pemdes_sukamaju',
          botUsername: db.siteConfig.telegramBotUsername || 'pemdes_sukamaju_bot',
          defaultChatId: db.siteConfig.telegramDefaultChatId || '619283745',
          aiAutoReply: db.siteConfig.telegramAiAutoReply !== false,
          aiPersona: db.siteConfig.telegramAiPersona || '',
          configuredToken: telegramTokenConfigured,
          configuredWebhookSecret: telegramSecretConfigured,
          lastChatId:
            lastCitizenTgMsg?.telegramChatId ||
            db.siteConfig.telegramDefaultChatId ||
            null,
          lastSenderName: lastCitizenTgMsg?.senderName || null,
          lastMessageAt: lastCitizenTgMsg?.timestamp || null,
          endpoint: '/api/integrations/telegram',
          aiReplyEndpoint: '/api/telegram/ai-reply',
          webhookEndpoint: '/api/telegram/webhook',
          setWebhookEndpoint: '/api/telegram/set-webhook',
          defaultWebhookUrl: `${baseAppUrl}/api/telegram/webhook`,
          statusLabel: telegramTokenConfigured
            ? 'Configured (TELEGRAM_BOT_TOKEN + AI Aktif)'
            : 'Siaga (Webhook + AI Aktif, TELEGRAM_BOT_TOKEN Belum Diset di .env)',
        },
        cryptoSignature: {
          algorithm: 'HMAC-SHA256 + Scrypt Auth (Node.js Crypto)',
          endpoint: '/api/security/verify',
          statusLabel: 'Aktif (Verifikasi TTE, Scrypt & RBAC Token)',
        },
      },
    });
  });

  app.post('/api/security/verify', async (req, res) => {
    const { query = '' } = req.body || {};
    const clean = String(query).trim();
    const db = ensureDatabase();
    const secret = process.env[`TENANT_${(tenantStorage.getStore() || 'default').toUpperCase()}_HMAC_SECRET`] || process.env.HMAC_SECRET_KEY || 'dev-insecure-hmac-key';

    const matchedRequest = db.requests.find(
      (r) =>
        r.trackingCode.toLowerCase() === clean.toLowerCase() ||
        (r.qrVerificationCode && r.qrVerificationCode.toLowerCase() === clean.toLowerCase()) ||
        (r.registrationNumber && r.registrationNumber.toLowerCase() === clean.toLowerCase())
    );

    if (matchedRequest) {
      const payloadString = `${matchedRequest.trackingCode}|${matchedRequest.nik}|${matchedRequest.status}|${db.siteConfig.villageCode}`;
      const sha256Signature = crypto
        .createHmac('sha256', secret)
        .update(payloadString)
        .digest('hex')
        .toUpperCase();

      res.json({
        verified: true,
        type: 'SURAT_RESMI_TTE',
        title: `${matchedRequest.letterTitle} (${matchedRequest.trackingCode})`,
        holderName: matchedRequest.citizenName,
        nikMasked: `${matchedRequest.nik.slice(0, 6)}******${matchedRequest.nik.slice(-4)}`,
        status: matchedRequest.status,
        registrationNumber: matchedRequest.registrationNumber || 'Belum Terbit Nomor',
        signedBy: matchedRequest.signedBy || db.siteConfig.headOfVillageName,
        updatedAt: matchedRequest.updatedAt,
        algorithm: 'HMAC-SHA256',
        cryptographicHash: sha256Signature,
      });
      return;
    }

    const matchedCitizen = db.citizens.find((c) => c.nik === clean);
    if (matchedCitizen) {
      const payloadString = `${matchedCitizen.nik}|${matchedCitizen.kk}|${matchedCitizen.name}|${db.siteConfig.villageCode}`;
      const sha256Signature = crypto
        .createHmac('sha256', secret)
        .update(payloadString)
        .digest('hex')
        .toUpperCase();

      res.json({
        verified: true,
        type: 'PENDUDUK_TERDAFTAR',
        title: `Data Kependudukan Terverifikasi (${matchedCitizen.dusun})`,
        holderName: matchedCitizen.name,
        nikMasked: `${matchedCitizen.nik.slice(0, 6)}******${matchedCitizen.nik.slice(-4)}`,
        status: matchedCitizen.verifiedDukcapil ? 'Terverifikasi Database Desa' : 'Dalam Pemutakhiran',
        registrationNumber: `KK: ${matchedCitizen.kk.slice(0, 6)}******${matchedCitizen.kk.slice(-4)}`,
        signedBy: `Database SID ${db.siteConfig.villageName}`,
        updatedAt: matchedCitizen.lastUpdated,
        algorithm: 'HMAC-SHA256',
        cryptographicHash: sha256Signature,
      });
      return;
    }

    res.json({
      verified: false,
      message: `Kode dokumen atau NIK "${clean}" tidak ditemukan pada buku register database ${db.siteConfig.villageName}.`,
    });
  });

  // 10. Protected (Super Admin only): Reset database to initial factory state
  app.post('/api/db/reset', requireAdmin, async (req, res) => {
    const tier = (req as any).adminRoleTier as AdminRoleTier;
    if (!canExecuteSystemAction(tier, 'reset_db')) {
      res.status(403).json({
        status: 'error',
        error: `Forbidden: Hanya 'super_admin' yang diizinkan mereset database desa ke kondisi awal.`,
      });
      return;
    }
    createBackupSnapshot('pre-reset');
    const fresh = createInitialDatabase();
    await saveDatabase(fresh);
    recordAudit('reset_db', 'admin', 'Database reset to factory');
    res.json({ status: 'ok', db: sanitizeDbForClient(fresh, true) });
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*all', async (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Auto-backup scheduler (optional)
  const autoBackupHours = Number(process.env.AUTO_BACKUP_HOURS || 0);
  if (autoBackupHours > 0) {
    const intervalMs = autoBackupHours * 60 * 60 * 1000;
    setInterval(() => {
      try {
        const snap = createBackupSnapshot('auto');
        console.log(`[AutoBackup] Snapshot created: ${snap?.filename || 'ok'}`);
      } catch (e: any) {
        console.error('[AutoBackup] Failed:', e?.message || e);
      }
    }, intervalMs).unref();
    console.log(`[AutoBackup] Scheduled every ${autoBackupHours} hour(s).`);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server Database & Portal Desa berjalan di http://0.0.0.0:${PORT}`);
  });

  const shutdown = (signal: string) => {
    console.log(`Received ${signal}, shutting down gracefully...`);
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer();
