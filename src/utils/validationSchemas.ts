import { z } from 'zod';
import { AdminUser, VillageDatabase } from '../types/village';

// ============================================================================
// 1. RBAC ROLE TIER RESOLUTION & PERMISSION MATRIX
// ============================================================================

export type AdminRoleTier = 'super_admin' | 'kades' | 'operator' | 'warga';

export function resolveAdminRoleTier(user: Pick<AdminUser, 'username' | 'role'>): AdminRoleTier {
  const uname = (user.username || '').toLowerCase().trim();
  const role = (user.role || '').toLowerCase();

  if (
    uname === 'admin' ||
    role.includes('super admin') ||
    role.includes('sekretaris desa') ||
    role.includes('administrator')
  ) {
    return 'super_admin';
  }

  if (uname === 'kades' || role.includes('kepala desa')) {
    return 'kades';
  }

  return 'operator';
}

const SUPER_ADMIN_ONLY_DOMAINS: (keyof VillageDatabase)[] = ['adminUsers', 'siteConfig'];

const KADES_OR_SUPER_DOMAINS: (keyof VillageDatabase)[] = [
  'apbdes',
  'projects',
  'officials',
  'regulations',
  'institutions',
  'hamlets',
  'villageAssets',
];

export function canModifyDomain(tier: AdminRoleTier, domain: keyof VillageDatabase): boolean {
  if (tier === 'super_admin') return true;
  if (SUPER_ADMIN_ONLY_DOMAINS.includes(domain)) return false;
  if (tier === 'kades') return true;
  // tier === 'operator' (Kasi Pelayanan / Kaur Umum / Operator Loket)
  if (KADES_OR_SUPER_DOMAINS.includes(domain)) return false;
  return true;
}

export function canExecuteSystemAction(
  tier: AdminRoleTier,
  action: 'reset_db' | 'restore_db' | 'full_put_db' | 'backup_db' | 'media_write'
): boolean {
  if (tier === 'super_admin') return true;
  if (tier === 'kades') {
    return action === 'backup_db' || action === 'media_write';
  }
  // operator
  return action === 'media_write';
}

// ============================================================================
// 2. ZOD SCHEMAS FOR AUTH, PUBLIC SUBMISSIONS & MEDIA
// ============================================================================

export const LoginPayloadSchema = z.object({
  username: z.string().trim().min(2, 'Username minimal 2 karakter').max(64),
  password: z.string().min(8, 'Password minimal 8 karakter').max(128),
});

export const PasswordResetRequestSchema = z.object({
  username: z.string().trim().min(2, 'Username wajib diisi').max(64),
  nip: z.string().trim().min(1, 'NIP / Identitas perangkat wajib diisi').max(64),
});

export const PasswordResetConfirmSchema = z.object({
  username: z.string().trim().min(2).max(64),
  resetToken: z.string().trim().min(6, 'Token reset tidak valid').max(128),
  newPassword: z
    .string()
    .min(10, 'Kata sandi baru minimal 10 karakter')
    .max(128),
});

export const MediaUploadPayloadSchema = z.object({
  name: z.string().trim().min(1, 'Nama aset wajib diisi').max(200),
  category: z
    .enum(['logo', 'hero', 'galeri', 'berita', 'umkm', 'pembangunan', 'kades', 'perangkat', 'lainnya'])
    .optional()
    .default('lainnya'),
  mimeType: z.string().trim().min(3).max(100).optional().default('image/png'),
  dataUrl: z
    .string()
    .min(16, 'Data gambar tidak valid')
    .refine((val) => val.startsWith('data:image/') || val.startsWith('http') || val.startsWith('/'), {
      message: 'dataUrl harus berupa Data URL image atau URL valid',
    }),
});

// ============================================================================
// 3. ZOD SCHEMAS FOR ALL 24 VILLAGE DATABASE DOMAINS
// ============================================================================

export const CitizenItemSchema = z
  .object({
    id: z.string().min(1),
    nik: z.string().regex(/^\d{16}$/, 'NIK harus 16 digit angka'),
    kk: z.string().min(6).optional(),
    noKK: z.string().min(6).optional(),
    name: z.string().min(1).optional(),
    nama: z.string().min(1).optional(),
    gender: z.enum(['Laki-laki', 'Perempuan', 'L', 'P']).optional(),
    jenisKelamin: z.enum(['Laki-laki', 'Perempuan', 'L', 'P']).optional(),
    dusun: z.string().min(1),
  })
  .passthrough();

export const LetterRequestItemSchema = z
  .object({
    id: z.string().min(1),
    trackingCode: z.string().min(3).optional(),
    registrationNumber: z.string().min(3).optional(),
    letterType: z.string().min(1).optional(),
    letterTypeCode: z.string().min(1).optional(),
    letterTitle: z.string().min(1).optional(),
    letterTypeName: z.string().min(1).optional(),
    nik: z.string().regex(/^\d{16}$/, 'NIK pemohon harus 16 digit angka'),
    citizenName: z.string().min(1).optional(),
    applicantName: z.string().min(1).optional(),
    whatsapp: z.string().min(6).optional(),
    applicantPhone: z.string().min(6).optional(),
    purpose: z.string().min(1),
    status: z.string().min(2),
  })
  .passthrough();

export const SiteConfigSchema = z
  .object({
    villageName: z.string().min(2),
    subDistrict: z.string().min(2),
    district: z.string().min(2).optional(),
    regency: z.string().min(2).optional(),
    province: z.string().min(2),
    villageCode: z.string().min(2),
    headOfVillageName: z.string().min(2).optional(),
    kadesName: z.string().min(2).optional(),
  })
  .passthrough();

export const HamletItemSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    headName: z.string().min(1).optional(),
  })
  .passthrough();

export const FacilityItemSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    category: z.string().min(1),
  })
  .passthrough();

export const LetterTypeItemSchema = z
  .object({
    code: z.string().min(1),
    name: z.string().min(1),
    estimatedHours: z.number().nonnegative().optional(),
    requirements: z.array(z.string()).optional(),
  })
  .passthrough();

export const AdminUserItemSchema = z
  .object({
    username: z.string().trim().min(2),
    fullName: z.string().trim().min(2),
    role: z.string().trim().min(2),
    nip: z.string().min(1).optional(),
    password: z.string().optional(),
    passwordHash: z.string().optional(),
  })
  .passthrough();

export const AgendaItemSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    date: z.string().min(4),
  })
  .passthrough();

export const ApbdesItemSchema = z
  .object({
    id: z.string().min(1),
    category: z.enum(['Pendapatan', 'Belanja', 'Pembiayaan']),
    subCategory: z.string().min(1).optional(),
    title: z.string().min(1).optional(),
    anggaran: z.number().nonnegative().optional(),
    budget: z.number().nonnegative().optional(),
    realisasi: z.number().nonnegative().optional(),
    realized: z.number().nonnegative().optional(),
  })
  .passthrough();

export const NewsItemSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    category: z.string().min(1),
  })
  .passthrough();

export const GalleryItemSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    category: z.string().min(1),
  })
  .passthrough();

export const ProductItemSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    category: z.string().min(1),
    price: z.number().nonnegative(),
  })
  .passthrough();

export const OfficialItemSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    role: z.string().min(1).optional(),
    position: z.string().min(1).optional(),
  })
  .passthrough();

export const RegulationItemSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    year: z.union([z.number().int(), z.string()]).optional(),
  })
  .passthrough();

export const AspirationItemSchema = z
  .object({
    id: z.string().min(1),
    senderName: z.string().min(1).optional(),
    citizenName: z.string().min(1).optional(),
    subject: z.string().min(1).optional(),
    title: z.string().min(1).optional(),
    message: z.string().min(1).optional(),
    content: z.string().min(1).optional(),
  })
  .passthrough();

export const PotentialItemSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    category: z.string().min(1),
  })
  .passthrough();

export const ProjectItemSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    budget: z.number().nonnegative(),
  })
  .passthrough();

export const InstitutionItemSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    abbreviation: z.string().min(1),
  })
  .passthrough();

export const MediaAssetItemSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    category: z.string().min(1).optional(),
    domain: z.string().min(1).optional(),
    dataUrl: z.string().min(5),
  })
  .passthrough();

export const AuditLogItemSchema = z
  .object({
    id: z.string().min(1),
    actor: z.string().min(1),
    action: z.string().min(1),
  })
  .passthrough();

export const ChatMessageItemSchema = z
  .object({
    id: z.string().min(1),
    sessionId: z.string().min(1),
    senderName: z.string().min(1),
    message: z.string().min(1),
  })
  .passthrough();

export const MailLogItemSchema = z
  .object({
    id: z.string().min(1),
    bookType: z.enum(['SURAT_MASUK', 'SURAT_KELUAR']).optional(),
    mailType: z.enum(['Surat Masuk', 'Surat Keluar']).optional(),
    subject: z.string().min(1),
  })
  .passthrough();

export const VillageAssetItemSchema = z
  .object({
    id: z.string().min(1),
    assetCode: z.string().min(1),
    name: z.string().min(1).optional(),
    assetName: z.string().min(1).optional(),
  })
  .passthrough();

export const PopulationMutationItemSchema = z
  .object({
    id: z.string().min(1),
    nik: z.string().min(6).optional(),
    citizenNik: z.string().min(6).optional(),
    citizenName: z.string().min(1),
    mutationType: z.enum([
      'KELAHIRAN',
      'KEMATIAN',
      'PINDAH_KELUAR',
      'DATANG_MASUK',
      'Kelahiran',
      'Kematian',
      'Pindah Keluar',
      'Datang Masuk',
    ]),
  })
  .passthrough();

export const DOMAIN_ZOD_SCHEMAS: Record<keyof Omit<VillageDatabase, 'version' | 'lastUpdated'>, z.ZodTypeAny> = {
  siteConfig: SiteConfigSchema,
  citizens: z.array(CitizenItemSchema),
  requests: z.array(LetterRequestItemSchema),
  agendas: z.array(AgendaItemSchema),
  apbdes: z.array(ApbdesItemSchema),
  news: z.array(NewsItemSchema),
  gallery: z.array(GalleryItemSchema),
  products: z.array(ProductItemSchema),
  officials: z.array(OfficialItemSchema),
  regulations: z.array(RegulationItemSchema),
  aspirations: z.array(AspirationItemSchema),
  potentials: z.array(PotentialItemSchema),
  projects: z.array(ProjectItemSchema),
  institutions: z.array(InstitutionItemSchema),
  hamlets: z.array(HamletItemSchema),
  facilities: z.array(FacilityItemSchema),
  letterTypes: z.array(LetterTypeItemSchema),
  adminUsers: z.array(AdminUserItemSchema),
  mediaAssets: z.array(MediaAssetItemSchema),
  auditLogs: z.array(AuditLogItemSchema),
  chatMessages: z.array(ChatMessageItemSchema),
  incomingOutboxLetters: z.array(MailLogItemSchema),
  villageAssets: z.array(VillageAssetItemSchema),
  populationMutations: z.array(PopulationMutationItemSchema),
};

export const PublicRequestSubmissionSchema = z.object({
  request: LetterRequestItemSchema,
});

export const PublicAspirationSubmissionSchema = z.object({
  aspiration: AspirationItemSchema,
});

export const FullVillageDatabaseSchema = z
  .object({
    version: z.number().optional(),
    lastUpdated: z.string().optional(),
    siteConfig: SiteConfigSchema,
    citizens: z.array(CitizenItemSchema),
    requests: z.array(LetterRequestItemSchema),
    agendas: z.array(AgendaItemSchema),
    apbdes: z.array(ApbdesItemSchema),
    news: z.array(NewsItemSchema),
    gallery: z.array(GalleryItemSchema),
    products: z.array(ProductItemSchema),
    officials: z.array(OfficialItemSchema),
    regulations: z.array(RegulationItemSchema),
    aspirations: z.array(AspirationItemSchema),
    potentials: z.array(PotentialItemSchema),
    projects: z.array(ProjectItemSchema),
    institutions: z.array(InstitutionItemSchema),
    hamlets: z.array(HamletItemSchema),
    facilities: z.array(FacilityItemSchema),
    letterTypes: z.array(LetterTypeItemSchema),
    adminUsers: z.array(AdminUserItemSchema).optional(),
    mediaAssets: z.array(MediaAssetItemSchema).optional(),
    auditLogs: z.array(AuditLogItemSchema).optional(),
    chatMessages: z.array(ChatMessageItemSchema).optional(),
    incomingOutboxLetters: z.array(MailLogItemSchema).optional(),
    villageAssets: z.array(VillageAssetItemSchema).optional(),
    populationMutations: z.array(PopulationMutationItemSchema).optional(),
  })
  .passthrough();
