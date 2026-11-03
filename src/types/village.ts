export type HamletName = string;

export type Gender = 'Laki-laki' | 'Perempuan';

export type Religion = 'Islam' | 'Kristen' | 'Katolik' | 'Hindu' | 'Buddha' | 'Konghucu';

export type EducationLevel =
  | 'Tidak/Belum Sekolah'
  | 'SD/Sederajat'
  | 'SMP/Sederajat'
  | 'SMA/Sederajat'
  | 'Diploma (D1-D3)'
  | 'Sarjana (S1)'
  | 'Pascasarjana (S2/S3)';

export type OccupationType =
  | 'Petani / Pekebun'
  | 'Pedagang / UMKM'
  | 'Karyawan Swasta'
  | 'PNS / TNI / Polri'
  | 'Wiraswasta'
  | 'Guru / Tenaga Pendidik'
  | 'Bidan / Tenaga Medis'
  | 'Pelajar / Mahasiswa'
  | 'Mengurus Rumah Tangga'
  | 'Belum / Tidak Bekerja'
  | string;

export type AidStatus =
  | 'PKH'
  | 'BLT Dana Desa'
  | 'BPNT'
  | 'BPJS PBI'
  | 'Beasiswa Desa'
  | 'Rutilahu'
  | 'Non-Penerima'
  | string;

export type FamilyRelationRole =
  | 'Kepala Keluarga'
  | 'Istri'
  | 'Anak'
  | 'Orang Tua'
  | 'Famili Lain';

export interface Citizen {
  id: string;
  nik: string;
  name: string;
  kk: string;
  gender: Gender;
  birthPlace: string;
  birthDate: string; // YYYY-MM-DD
  age: number;
  maritalStatus: 'Belum Kawin' | 'Kawin' | 'Cerai Hidup' | 'Cerai Mati';
  religion: Religion;
  education: EducationLevel;
  occupation: OccupationType;
  dusun: HamletName;
  rt: string;
  rw: string;
  address: string;
  phone: string;
  aidStatus: AidStatus;
  aidStage?: string;
  aidAmount?: number;
  familyRole?: FamilyRelationRole;
  lifeStatus?: 'Hidup' | 'Aktif' | 'Meninggal' | 'Pindah Keluar';
  tpsNumber?: string;
  verifiedDukcapil: boolean;
  bloodType: 'A' | 'B' | 'AB' | 'O' | '-';
  lastUpdated: string;
  photoUrl?: string;
  passwordHash?: string;
}

export type LetterTypeCode =
  | 'SKU'
  | 'SKTM'
  | 'DOMISILI'
  | 'SKCK'
  | 'KELAHIRAN'
  | 'PINDAH'
  | 'KEMATIAN'
  | 'NIKAH'
  | 'AHLI_WARIS'
  | 'TANAH_SPORADIK'
  | 'PENGHASILAN'
  | 'KERAMAIAN'
  | 'KEHILANGAN'
  | 'KTP_KK'
  | 'BELUM_MENIKAH'
  | 'IZIN_ORANG_TUA'
  | string;

export type LetterCategoryName =
  | 'Layanan Umum & Sosial'
  | 'Administrasi Kependudukan (Dukcapil)'
  | 'Pernikahan / KUA (N1-N4)'
  | 'Ekonomi, Pertanahan & Waris';

export interface LetterCustomFieldDef {
  key: string;
  label: string;
  placeholder: string;
  required?: boolean;
}

export interface LetterTypeInfo {
  code: LetterTypeCode;
  name: string;
  category?: LetterCategoryName;
  classificationCode?: string;
  shortDesc: string;
  estimatedHours: number;
  requirements: string[];
  customFields?: LetterCustomFieldDef[];
  bodyTemplate?: string;
  closingTemplate?: string;
  defaultSignerRole?: 'Kepala Desa' | 'Sekretaris Desa (a.n. Kepala Desa)';
}

export type LetterRequestStatus =
  | 'Menunggu Verifikasi'
  | 'Validasi Dokumen'
  | 'Menunggu Tanda Tangan Kades'
  | 'Selesai'
  | 'Ditolak';

export interface VerificationChecklist {
  nikMatchDukcapil: boolean;
  kkMatchDukcapil: boolean;
  ktpAttachmentClear: boolean;
  pengantarRtRwValid: boolean;
  noTaxArrearsPbb: boolean;
}

export interface LetterRequest {
  id: string;
  trackingCode: string;
  registrationNumber?: string;
  nik: string;
  citizenName: string;
  kk: string;
  dusun: HamletName;
  rt: string;
  rw: string;
  whatsapp: string;
  letterType: LetterTypeCode;
  letterTitle: string;
  purpose: string;
  extraNotes?: string;
  customFieldValues?: Record<string, string>;
  customBodyText?: string;
  signerRole?: 'Kepala Desa' | 'Sekretaris Desa (a.n. Kepala Desa)';
  signerName?: string;
  signerNip?: string;
  attachmentName: string;
  attachmentDataUrl?: string;
  status: LetterRequestStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  processingHours?: number;
  adminNotes?: string;
  verifiedBy?: string;
  signedBy?: string;
  qrVerificationCode?: string;
  whatsappNotifiedCount: number;
  lastWhatsappMessage?: string;
  checklist: VerificationChecklist;
}

export interface GalleryItem {
  id: string;
  title: string;
  category: string;
  date: string;
  location: string;
  imageUrl: string;
  description: string;
  participantsCount: number;
}

export interface MarketProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  sellerName: string;
  producerName?: string;
  dusun: HamletName;
  whatsapp: string;
  rating: number;
  soldCount: number;
  stock?: number;
  imageUrl: string;
  description: string;
  isOrganicOrLocal: boolean;
  badge?: string;
}

export interface MarketShippingRate {
  id: string;
  label: string;
  dusunScope?: string;
  cost?: number;
  costRupiah?: number;
  estimatedTime: string;
}

export interface MarketCollectiveOrderItem {
  productId: string;
  productName: string;
  sellerName: string;
  sellerWhatsapp?: string;
  unit: string;
  price?: number;
  unitPrice?: number;
  quantity: number;
}

export interface MarketCollectiveOrder {
  id: string;
  orderCode: string;
  buyerName: string;
  buyerPhone: string;
  buyerDusun: string;
  buyerAddress?: string;
  shippingMethodId?: string;
  shippingLabel?: string;
  shippingMethodLabel?: string;
  shippingCost: number;
  subtotal: number;
  totalAmount: number;
  items: MarketCollectiveOrderItem[];
  notes?: string;
  status: 'Pesanan Baru' | 'Menunggu Konfirmasi' | 'Diproses BUMDes' | 'Selesai';
  createdAt: string;
}

export interface MapFacility {
  id: string;
  name: string;
  category: string;
  dusun: HamletName;
  address: string;
  coordinates: string;
  lat: number;
  lng: number;
  xPercent: number;
  yPercent: number;
  description: string;
  operatingHours: string;
  contactPerson: string;
  phone: string;
  imageUrl?: string;
}

export interface VillageNews {
  id: string;
  title: string;
  category: string;
  date: string;
  author: string;
  excerpt: string;
  summary?: string;
  content?: string;
  imageUrl: string;
  readTime: string;
}

export interface VillageOfficial {
  id: string;
  name: string;
  role: string;
  position?: string;
  nip: string;
  education: string;
  dusunArea?: string;
  phone: string;
  email?: string;
  motto?: string;
  photoUrl: string;
  tenurePeriod: string;
}

export type AgendaCategory =
  | 'Musyawarah Desa'
  | 'Gotong Royong'
  | 'Posyandu & Kesehatan'
  | 'Rapat Perangkat'
  | 'Budaya & Keagamaan'
  | 'Pelatihan UMKM';

export type AgendaStatus = 'Terjadwal' | 'Berlangsung' | 'Selesai';

export interface VillageAgenda {
  id: string;
  title: string;
  category: AgendaCategory;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  location: string;
  dusun: HamletName | 'Seluruh Desa';
  coordinator: string;
  coordinatorPhone: string;
  participantsTarget: string;
  expectedCount: number;
  description: string;
  status: AgendaStatus;
  isRoutine: boolean;
  routineFrequency?: 'Mingguan' | 'Bulanan' | 'Triwulan' | 'Tahunan';
  whatsappBroadcastSent: boolean;
  bannerUrl?: string;
}

export interface ApbdesItem {
  id: string;
  category: 'Pendapatan' | 'Belanja' | 'Pembiayaan';
  subCategory: string;
  title?: string;
  anggaran: number;
  budget?: number;
  realisasi: number;
  realized?: number;
  year: number;
  description: string;
}

export interface VillageRegulation {
  id: string;
  number: string;
  title: string;
  category: string;
  year: number;
  dateIssued: string;
  date?: string;
  summary: string;
  downloadCount: number;
  fileSize: string;
}

export interface CitizenAspiration {
  id: string;
  ticketNumber: string;
  senderName: string;
  citizenName?: string;
  dusun: string;
  whatsapp: string;
  category: string;
  subject: string;
  title?: string;
  message: string;
  content?: string;
  status: 'Menunggu' | 'Ditindaklanjuti' | 'Selesai' | 'Diterima' | 'Ditinjau Perangkat' | 'Sedang Dikerjakan';
  createdAt: string;
  date?: string;
  responseNote?: string;
  adminResponse?: string;
  isPublic: boolean;
  photoUrl?: string;
}

export interface VillagePotential {
  id: string;
  title: string;
  category: string;
  description: string;
  economicValue: string;
  highlightStat?: string;
  location: string;
  manager: string;
  imageUrl: string;
}

export interface VillageProject {
  id: string;
  title: string;
  location: string;
  dusun?: string;
  budget: number;
  realized?: number;
  progressPercent: number;
  sourceFund: string;
  fundingSource?: string;
  fiscalYear: number;
  executor: string;
  status: 'Perencanaan' | 'Sedang Dikerjakan' | 'Selesai 100%';
  imageUrl: string;
  beforeImageUrl?: string;
  description: string;
  beneficiaries?: string;
  updatedAt?: string;
}

export interface VillageInstitution {
  id: string;
  name: string;
  abbreviation: string;
  leaderName: string;
  memberCount: number;
  description: string;
  roleDescription?: string;
  skNumber: string;
  phone: string;
  contactPhone?: string;
  officeRoom?: string;
  logoUrl?: string;
  keyPrograms?: string[];
}

export interface VillageHamlet {
  id: string;
  name: string;
  headName: string;
  headPhone: string;
  phone?: string;
  rtCount: number;
  rwCount: number;
  populationCount: number;
  familyCount: number;
  areaHa: string;
  keyCommodity?: string;
  description: string;
  imageUrl: string;
}

export interface MediaAsset {
  id: string;
  name: string;
  category: 'logo' | 'hero' | 'kades' | 'perangkat' | 'berita' | 'galeri' | 'umkm' | 'pembangunan' | 'potensi' | 'dusun' | 'peta' | 'lembaga' | 'lainnya';
  dataUrl: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface PosyanduScheduleItem {
  id: string;
  posyanduName: string;
  dusun: HamletName;
  scheduleDay?: string;
  scheduleDayLabel?: string;
  nextDate: string; // YYYY-MM-DD
  startTime?: string;
  endTime?: string;
  timeRange?: string;
  location: string;
  midwifeName: string;
  midwifePhone?: string;
  cadreLeader?: string;
  cadreCount?: number;
  registeredBalitaCount?: number;
  registeredBalita?: number;
  activeToddlers?: number;
  registeredBumilCount?: number;
  registeredBumil?: number;
  pregnantMothers?: number;
  targetServices?: string;
  pmtMenu?: string;
}

export type NutritionalStatus =
  | 'Gizi Baik (Normal)'
  | 'Risiko Stunting (Pendek)'
  | 'Stunting (Perlu Intervensi PMT)'
  | 'Stunting (Intervensi PMT)'
  | 'Gizi Kurang (Bawah Garis Merah)'
  | 'Gizi Kurang (PMT)'
  | 'Gizi Lebih'
  | 'Ibu Hamil Sehat'
  | 'Ibu Hamil Risiko KEK'
  | string;

export interface PosyanduGrowthRecord {
  id: string;
  childOrMotherName: string;
  nik?: string;
  nikOrKms?: string;
  kk?: string;
  parentName?: string;
  parentOrSpouseName?: string;
  dusun: HamletName;
  rtRw?: string;
  category: 'Balita' | 'Ibu Hamil' | 'Ibu Hamil (Bumil)' | string;
  ageMonths: number;
  weightKg: number;
  heightCm: number;
  headCircumferenceCm?: number;
  nutritionalStatus: NutritionalStatus;
  immunizationComplete?: boolean;
  vitaminAAndImmunizationComplete?: boolean;
  immunizationStatus?: string;
  pmtReceived: boolean;
  vitaminAReceived?: boolean;
  vitaminA?: boolean;
  checkupDate?: string;
  recordedAt?: string;
  notes?: string;
}

export interface TpsLocationInfo {
  tpsNumber: string;
  dusun: HamletName;
  rtScope?: string;
  rtRwScope?: string;
  locationName: string;
  address?: string;
  dptCount?: number;
  voterCount?: number;
  scheduleInfo?: string;
}

export type PrimaryThemePalette = 'emerald' | 'teal' | 'green' | 'blue' | 'maroon' | 'gold';
export type WebsiteFontFamily = 'plus-jakarta' | 'outfit' | 'manrope' | 'public-sans' | 'serif-editorial';
export type HeroBannerLayout = 'split' | 'centered' | 'editorial';

export interface VillageSiteConfig {
  villageName: string;
  villageCode: string;
  subDistrict: string;
  district: string;
  province: string;
  postalCode: string;
  tagline: string;
  runningText: string;
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string;
  logoUrl: string;
  logoSymbolText: string;
  primaryThemeColor: PrimaryThemePalette;
  accentColor: string;
  fontFamily?: WebsiteFontFamily;
  heroBannerLayout?: HeroBannerLayout;
  headOfVillageName: string;
  headOfVillageTitle: string;
  headOfVillageNip: string;
  headOfVillagePhotoUrl: string;
  headOfVillageWelcome: string;
  visionText: string;
  missions: string[];
  historyText: string;
  areaSizeKm2: string;
  altitudeMdpl: string;
  topographyLabel: string;
  rainfallLabel: string;
  avgTempLabel: string;
  dusunCount: number;
  rwCount: number;
  rtCount: number;
  boundaries: {
    north: string;
    south: string;
    east: string;
    west: string;
  };
  idmScore: number;
  idmStatus: 'Desa Mandiri' | 'Desa Maju' | 'Desa Berkembang';
  idmTargetYear: string;
  sdgsScore: number;
  officeAddress: string;
  officePhone: string;
  officeEmail: string;
  officialWhatsApp: string;
  serviceHoursWeekdays: string;
  serviceHoursWeekend: string;
  mapEmbedCoordinates: string;
  socialMedia: {
    instagram: string;
    facebook: string;
    youtube: string;
    tiktok?: string;
    telegram?: string;
  };
  telegramBotUsername?: string;
  telegramDefaultChatId?: string;
  telegramAiAutoReply?: boolean;
  telegramAiPersona?: string;
  liveChatGreeting?: string;
  emergencyContacts: {
    ambulanceName: string;
    ambulancePhone: string;
    midwifeName: string;
    midwifePhone: string;
    securityName: string;
    securityPhone: string;
  };
  galleryCategories?: string[];
  marketCategories?: string[];
  facilityCategories?: string[];
  aspirationCategories?: string[];
  aidPrograms?: string[];
  marketShippingRates?: MarketShippingRate[];
  marketOrders?: MarketCollectiveOrder[];
  posyanduSchedules?: PosyanduScheduleItem[];
  posyanduRecords?: PosyanduGrowthRecord[];
  tpsLocations?: TpsLocationInfo[];
  stuntingTargetPercent?: number;
  aiModel?: string;
  defaultClassificationCode?: string;
  facilityCategoryColors?: Record<string, string>;
  defaults?: VillageSiteDefaults;
}

export interface VillageSiteDefaults {
  rt: string;
  rw: string;
  birthPlace: string;
  kk: string;
  dusun: string;
  readTime: string;
  sellerLabel: string;
  extraNotes: string;
  trackingCodeExample: string;
  letterCategory: string;
  senderName: string;
  telegramRecipientName: string;
  whatsappRecipientName: string;
  description: string;
  author: string;
  unit: string;
  manager: string;
  nip: string;
  abbreviation: string;
  areaHa: string;
  fileSize: string;
  contactPerson: string;
  economicValue: string;
  highlightStat: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  senderName: string;
  senderPhone: string;
  senderRole: 'citizen' | 'admin' | 'ai';
  channel: 'web' | 'whatsapp' | 'telegram';
  message: string;
  timestamp: string;
  isRead: boolean;
  externalUrl?: string;
  telegramChatId?: string;
  telegramMessageId?: number;
}

export type DispositionStage =
  | 'Operator'
  | 'Sekdes'
  | 'Kepala Desa'
  | 'Kaur/Kasi'
  | 'Selesai Arsip';

export interface DispositionChainStep {
  id?: string;
  stage?: DispositionStage;
  fromStage?: DispositionStage;
  toStage?: DispositionStage;
  actorName: string;
  note?: string;
  instruction?: string;
  timestamp: string;
  status?: 'Selesai' | 'Proses' | 'Menunggu' | 'Aktif';
  followUpNote?: string;
}

export interface VillageMailLog {
  id: string;
  bookType: 'SURAT_MASUK' | 'SURAT_KELUAR';
  agendaNumber: string;
  letterNumber: string;
  letterDate: string;
  receivedOrSentDate: string;
  senderOrRecipient: string;
  subject: string;
  classificationCode: string;
  dispositionTo?: string;
  dispositionInstruction?: string;
  dispositionStatus?: 'Menunggu Disposisi' | 'Didisposisikan' | 'Ditindaklanjuti' | 'Selesai Arsip';
  currentStage?: DispositionStage;
  dispositionChain?: DispositionChainStep[];
  followUpNotes?: string;
  attachmentName?: string;
  attachmentDataUrl?: string;
  summary: string;
}

export interface VillageAssetItem {
  id: string;
  assetCode: string;
  name: string;
  category:
    | 'Tanah Kas Desa (TKD)'
    | 'Bangunan & Gedung'
    | 'Kendaraan Dinas / Siaga'
    | 'Peralatan & Mesin Digital'
    | 'Infrastruktur Desa';
  acquisitionYear: number;
  sourceFund: 'Dana Desa (APBN)' | 'ADD / APBD' | 'PADes / Kekayaan Asli Desa' | 'Hibah Provinsi/Pusat';
  valueRupiah: number;
  condition: 'Baik' | 'Rusak Ringan' | 'Perlu Perawatan';
  location: string;
  quantityLabel: string;
  managerName: string;
}

export interface PopulationMutationItem {
  id: string;
  nik: string;
  kk?: string;
  citizenName: string;
  mutationType: 'KELAHIRAN' | 'KEMATIAN' | 'PINDAH_KELUAR' | 'DATANG_MASUK';
  date: string;
  dusun: string;
  rtRw: string;
  relatedLetterCode?: string;
  notes: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  module:
    | 'Kependudukan'
    | 'Persuratan'
    | 'Keamanan'
    | 'CMS Website'
    | 'Kalender'
    | 'Integrasi API'
    | 'Live Chat'
    | 'Buku Administrasi Desa';
  encryptionHash: string;
  status: 'Sukses' | 'Peringatan';
}

export interface AdminUser {
  username: string;
  password?: string;
  passwordHash?: string;
  fullName: string;
  role: string;
  nip: string;
  isPlatformAdmin?: boolean;
}

export interface VillageDatabase {
  version: number;
  lastUpdated: string;
  siteConfig: VillageSiteConfig;
  citizens: Citizen[];
  requests: LetterRequest[];
  agendas: VillageAgenda[];
  apbdes: ApbdesItem[];
  news: VillageNews[];
  gallery: GalleryItem[];
  products: MarketProduct[];
  officials: VillageOfficial[];
  regulations: VillageRegulation[];
  aspirations: CitizenAspiration[];
  facilities: MapFacility[];
  potentials: VillagePotential[];
  projects: VillageProject[];
  institutions: VillageInstitution[];
  hamlets: VillageHamlet[];
  letterTypes: LetterTypeInfo[];
  mediaAssets: MediaAsset[];
  adminUsers?: AdminUser[];
  auditLogs?: AuditLog[];
  chatMessages?: ChatMessage[];
  incomingOutboxLetters?: VillageMailLog[];
  villageAssets?: VillageAssetItem[];
  populationMutations?: PopulationMutationItem[];
}


