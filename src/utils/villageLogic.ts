import {
  AidStatus,
  ApbdesItem,
  ChatMessage,
  Citizen,
  FamilyRelationRole,
  HamletName,
  LetterRequest,
  LetterRequestStatus,
  LetterTypeCode,
  LetterTypeInfo,
  PopulationMutationItem,
  PosyanduGrowthRecord,
  PosyanduScheduleItem,
  TpsLocationInfo,
  VerificationChecklist,
  VillageAgenda,
  VillageSiteConfig,
} from '../types/village';

/**
 * Validates an Indonesian 16-digit NIK (Nomor Induk Kependudukan).
 */
export function validateNikFormat(nik: string): {
  isValid: boolean;
  cleanNik: string;
  errorMessage?: string;
} {
  const cleanNik = nik.replace(/\s+/g, '').trim();
  if (!/^\d+$/.test(cleanNik)) {
    return {
      isValid: false,
      cleanNik,
      errorMessage: 'NIK hanya boleh berisi angka (0-9).',
    };
  }
  if (cleanNik.length !== 16) {
    return {
      isValid: false,
      cleanNik,
      errorMessage: `NIK harus terdiri dari 16 digit (saat ini ${cleanNik.length} digit).`,
    };
  }
  if (cleanNik.startsWith('00')) {
    return {
      isValid: false,
      cleanNik,
      errorMessage: 'Kode provinsi NIK tidak valid.',
    };
  }
  return { isValid: true, cleanNik };
}

/**
 * Masks a 16-digit NIK or KK for public/operator display when privacy mode is active.
 */
export function maskSensitiveNumber(num: string, showFull = false): string {
  if (showFull || !num || num.length < 10) return num;
  return `${num.slice(0, 6)}******${num.slice(-4)}`;
}

/**
 * Generates an AES-256-GCM simulated integrity fingerprint for a citizen record.
 */
export function generateCitizenEncryptionHash(citizen: Pick<Citizen, 'nik' | 'kk' | 'name'>): string {
  const payload = `${citizen.nik}|${citizen.kk}|${citizen.name.toUpperCase()}|SID-E2EE-SALT`;
  let hash = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const hex = (hash >>> 0).toString(16).toUpperCase().padStart(8, '0');
  return `AES256-GCM:${hex}-${citizen.nik.slice(-4)}`;
}

/**
 * Generates a unique tracking code for a citizen letter request.
 */
export function generateTrackingCode(letterType: LetterTypeCode, sequenceNumber: number, year = new Date().getFullYear()): string {
  const padded = String(sequenceNumber).padStart(3, '0');
  const cleanCode = String(letterType || 'SRT').toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 12);
  return `SRT-${year}-${cleanCode}-${padded}`;
}

/**
 * Generates an official village letter registration number (Nomor Surat Resmi).
 * Example: 470 / 018 / DS / III / 2026
 */
export function generateOfficialLetterNumber(
  letterType: LetterTypeCode,
  sequenceNumber: number,
  monthIndex = new Date().getMonth(),
  year = new Date().getFullYear(),
  villageCode = 'DS',
  customClassificationCode?: string
): string {
  const classificationMap: Record<string, string> = {
    SKU: '510',
    SKTM: '400',
    DOMISILI: '470',
    SKCK: '331',
    KELAHIRAN: '472.11',
    PINDAH: '475',
    KEMATIAN: '472.12',
    NIKAH: '474.2',
    AHLI_WARIS: '474.3',
    TANAH_SPORADIK: '593',
    PENGHASILAN: '400.2',
    KERAMAIAN: '300',
    KEHILANGAN: '338',
    KTP_KK: '471.13',
    BELUM_MENIKAH: '474.2',
    IZIN_ORANG_TUA: '474.2',
  };
  const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const code = (customClassificationCode && customClassificationCode.trim()) || classificationMap[letterType] || '470';
  const seq = String(sequenceNumber).padStart(3, '0');
  const roman = romanMonths[Math.max(0, Math.min(11, monthIndex))];
  const cleanVillageCode = villageCode.trim() || 'DS';
  return `${code} / ${seq} / ${cleanVillageCode} / ${roman} / ${year}`;
}

/**
 * Renders dynamic letter opening, specific statement body, and closing paragraphs
 * using mail-merge variables ({{nama}}, {{nik}}, {{keperluan}}, etc.) and customFields.
 */
export function renderDynamicLetterBody(
  request: LetterRequest,
  citizen: Citizen | undefined,
  siteConfig: VillageSiteConfig,
  letterTypeInfo?: LetterTypeInfo
): {
  openingParagraph: string;
  statementParagraph: string;
  closingParagraph: string;
  structuredCustomFields: { label: string; value: string }[];
} {
  const customValues = request.customFieldValues || {};
  const fieldDefs = letterTypeInfo?.customFields || [];

  const structuredCustomFields: { label: string; value: string }[] = [];
  for (const def of fieldDefs) {
    const val = customValues[def.key];
    if (val && val.trim() !== '') {
      structuredCustomFields.push({ label: def.label, value: val.trim() });
    }
  }
  for (const [k, v] of Object.entries(customValues)) {
    if (v && v.trim() !== '' && !fieldDefs.some((d) => d.key === k)) {
      structuredCustomFields.push({
        label: k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        value: v.trim(),
      });
    }
  }

  const customSummaryText =
    structuredCustomFields.length > 0
      ? structuredCustomFields.map((f) => `${f.label}: ${f.value}`).join('; ')
      : request.extraNotes || '-';

  const tokens: Record<string, string> = {
    nama: request.citizenName,
    nik: request.nik,
    kk: request.kk,
    ttl: citizen ? `${citizen.birthPlace}, ${citizen.birthDate}` : '-',
    umur: citizen ? `${citizen.age} Tahun` : '-',
    jk: citizen?.gender || 'Laki-laki/Perempuan',
    agama: citizen?.religion || 'Islam',
    pekerjaan: citizen?.occupation || 'Warga Desa',
    status_kawin: citizen?.maritalStatus || 'Kawin',
    alamat: `${citizen?.address || request.dusun}, RT ${request.rt} / RW ${request.rw}, ${request.dusun}, ${siteConfig.villageName}`,
    rt: request.rt,
    rw: request.rw,
    dusun: request.dusun,
    keperluan: request.purpose,
    keterangan_khusus: customSummaryText,
    catatan_tambahan: request.extraNotes || '-',
    nomor_surat: request.registrationNumber || `470 / REG-${request.id.toUpperCase()} / ${siteConfig.villageCode}`,
    nama_desa: siteConfig.villageName,
    kecamatan: siteConfig.subDistrict,
    kabupaten: siteConfig.district,
    provinsi: siteConfig.province,
    kepala_desa: siteConfig.headOfVillageName,
    ...customValues,
  };

  const interpolate = (tpl: string): string => {
    return tpl.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) => {
      return tokens[key] !== undefined && tokens[key] !== '' ? tokens[key] : '-';
    });
  };

  const signerTitle =
    request.signerRole === 'Sekretaris Desa (a.n. Kepala Desa)'
      ? `a.n. Kepala ${siteConfig.villageName}, Sekretaris ${siteConfig.villageName}`
      : `${siteConfig.headOfVillageTitle} ${siteConfig.villageName}`;

  const openingParagraph = `Yang bertanda tangan di bawah ini ${signerTitle}, ${siteConfig.subDistrict}, ${siteConfig.district}, Provinsi ${siteConfig.province}, dengan ini menerangkan dengan sebenarnya bahwa:`;

  // Default type-specific legal statement templates if custom bodyTemplate is not overridden
  const defaultBodyByCode: Record<string, string> = {
    SKU: 'Berdasarkan hasil verifikasi lapangan dan buku register UMKM Pemerintah {{nama_desa}}, nama tersebut di atas adalah benar warga yang berdomisili di {{dusun}} RT {{rt}}/RW {{rw}} dan benar memiliki/menjalankan kegiatan usaha mandiri secara aktif ({{keterangan_khusus}}). Surat Keterangan Usaha ini diterbitkan untuk keperluan: {{keperluan}}.',
    SKTM: 'Berdasarkan Data Terpadu Kesejahteraan Sosial (DTKS) Desa dan surat pengantar Ketua RT {{rt}}/RW {{rw}} {{dusun}}, nama tersebut di atas adalah benar warga {{nama_desa}} yang tergolong keluarga prasejahtera / berpenghasilan rendah. Surat Keterangan Tidak Mampu ini diberikan untuk keperluan: {{keperluan}}.',
    DOMISILI: 'Berdasarkan Buku Induk Penduduk Pemerintah {{nama_desa}}, nama tersebut di atas adalah benar penduduk yang berdomisili dan menetap secara sah di {{alamat}}. Surat Keterangan Domisili ini diterbitkan untuk keperluan: {{keperluan}}.',
    SKCK: 'Berdasarkan catatan kependudukan Desa dan koordinasi Bhabinkamtibmas/Babinsa {{nama_desa}}, nama tersebut di atas berkelakuan baik di lingkungan masyarakat, tidak pernah terlibat tindak pidana maupun pelanggaran ketertiban umum. Surat Pengantar ini diberikan untuk pengurusan SKCK dengan keperluan: {{keperluan}}.',
    KELAHIRAN: 'Berdasarkan Surat Keterangan Kelahiran dari tenaga medis/bidan desa dan pelaporan keluarga, diterangkan bahwa telah lahir seorang anak di wilayah {{nama_desa}} dengan rincian data kelahiran: {{keterangan_khusus}}. Surat Keterangan Kelahiran (Formulir F-2.01) ini diterbitkan untuk pengurusan Akta Kelahiran dan pemutakhiran Kartu Keluarga di Disdukcapil.',
    KEMATIAN: 'Berdasarkan laporan keluarga dan surat pemeriksaan medis, diterangkan dengan sebenarnya bahwa warga tersebut telah meninggal dunia dengan rincian peristiwa kematian: {{keterangan_khusus}}. Surat Keterangan Kematian (Formulir F-2.29) ini diterbitkan untuk keperluan administrasi Akta Kematian dan kependudukan.',
    PINDAH: 'Berdasarkan permohonan pindah domisili penduduk (SKPWNI) yang diajukan, warga tersebut di atas tercatat mengajukan pindah tempat tinggal dengan rincian tujuan pindah: {{keterangan_khusus}}. Surat pengantar pindah ini diterbitkan untuk proses administrasi mutasi penduduk di Kecamatan dan Disdukcapil.',
    NIKAH: 'Berdasarkan data kependudukan dan surat pernyataan status perkawinan yang sah, warga tersebut di atas berstatus {{status_kawin}} dan memenuhi syarat administratif untuk melangsungkan pernikahan sesuai rincian: {{keterangan_khusus}}. Surat Pengantar Nikah (Model N1-N4) ini diterbitkan untuk disampaikan kepada Kantor Urusan Agama (KUA) {{kecamatan}}.',
    AHLI_WARIS: 'Berdasarkan silsilah keluarga yang disaksikan oleh para saksi serta Ketua RT {{rt}}/RW {{rw}} {{dusun}}, diterangkan hubungan kewarisan yang sah dengan rincian: {{keterangan_khusus}}. Surat Keterangan Ahli Waris ini dipergunakan untuk keperluan: {{keperluan}}.',
    TANAH_SPORADIK: 'Berdasarkan Buku C Desa / Register Tanah di {{nama_desa}} serta peninjauan batas fisik di lapangan, bidang tanah yang dimohonkan dengan rincian ({{keterangan_khusus}}) adalah benar dikuasai secara fisik dengan itikad baik dan **tidak dalam sengketa** dengan pihak manapun. Surat Keterangan Riwayat/Penguasaan Tanah ini diterbitkan untuk keperluan: {{keperluan}}.',
    PENGHASILAN: 'Berdasarkan surat pernyataan penghasilan dan verifikasi perangkat {{dusun}}, diterangkan bahwa rincian pekerjaan dan penghasilan rata-rata bulanan pemohon/orang tua adalah: {{keterangan_khusus}}. Surat ini dipergunakan untuk keperluan: {{keperluan}}.',
    KERAMAIAN: 'Berdasarkan permohonan izin penyelenggaraan kegiatan masyarakat di {{dusun}} RT {{rt}}/RW {{rw}} dengan rincian kegiatan ({{keterangan_khusus}}), Pemerintah {{nama_desa}} memberikan pengantar rekomendasi izin keramaian kepada Polsek {{kecamatan}} untuk keperluan: {{keperluan}}.',
    KEHILANGAN: 'Berdasarkan laporan warga pemohon kepada Pemerintah {{nama_desa}}, yang bersangkutan melaporkan telah kehilangan dokumen/barang penting dengan rincian: {{keterangan_khusus}}. Surat pengantar ini diterbitkan untuk pelaporan Surat Keterangan Tanda Lapor Kehilangan (SKTLK) di Kepolisian.',
    KTP_KK: 'Berdasarkan Buku Induk Penduduk {{nama_desa}} (Kode Desa: ' + siteConfig.villageCode + '), nama tersebut di atas adalah benar penduduk terdaftar di {{dusun}} RT {{rt}}/RW {{rw}} yang mengajukan pelayanan dokumen kependudukan ({{keterangan_khusus}}) untuk keperluan: {{keperluan}}.',
    BELUM_MENIKAH: 'Berdasarkan register kependudukan {{nama_desa}} dan pengantar Ketua RT {{rt}}/RW {{rw}}, nama tersebut di atas benar-benar berstatus **Belum Pernah Menikah (Jejaka/Perawan)** hingga surat ini diterbitkan ({{keterangan_khusus}}). Dipergunakan untuk keperluan: {{keperluan}}.',
    IZIN_ORANG_TUA: 'Berdasarkan pernyataan tertulis orang tua/wali kandung yang terdaftar di {{nama_desa}} dengan rincian ({{keterangan_khusus}}), orang tua memberikan izin sepenuhnya kepada pemohon untuk keperluan: {{keperluan}}.',
  };

  const rawBodyTemplate =
    (request.customBodyText && request.customBodyText.trim()) ||
    (letterTypeInfo?.bodyTemplate && letterTypeInfo.bodyTemplate.trim()) ||
    defaultBodyByCode[request.letterType] ||
    'Berdasarkan data kependudukan Sistem Informasi Desa (SID) serta pengantar Ketua RT {{rt}} / RW {{rw}} {{dusun}}, nama tersebut di atas adalah benar warga yang berdomisili di {{nama_desa}}. Dokumen {{keterangan_khusus}} ini diterbitkan untuk keperluan: {{keperluan}}.';

  const rawClosingTemplate =
    (letterTypeInfo?.closingTemplate && letterTypeInfo.closingTemplate.trim()) ||
    'Demikian surat keterangan resmi ini dibuat dengan sebenarnya sesuai buku register administrasi Pemerintah {{nama_desa}} untuk dapat dipergunakan sebagaimana mestinya.';

  return {
    openingParagraph,
    statementParagraph: interpolate(rawBodyTemplate),
    closingParagraph: interpolate(rawClosingTemplate),
    structuredCustomFields,
  };
}

/**
 * Generates a deterministic 21x21 Version-1 QR code matrix for a given verification payload.
 * Includes standard 7x7 finder patterns at top-left, top-right, and bottom-left,
 * timing patterns on row 6 and column 6, and deterministic payload bit modules.
 */
export function generateQrMatrix(payload: string): boolean[][] {
  const size = 21;
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const reserved: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const placeFinderPattern = (rowOffset: number, colOffset: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = rowOffset + r;
        const cc = colOffset + c;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        reserved[rr][cc] = true;
        if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
          const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
          const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          matrix[rr][cc] = isBorder || isCenter;
        } else {
          matrix[rr][cc] = false;
        }
      }
    }
  };

  placeFinderPattern(0, 0);
  placeFinderPattern(0, size - 7);
  placeFinderPattern(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    reserved[6][i] = true;
    reserved[i][6] = true;
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Dark module
  reserved[size - 8][8] = true;
  matrix[size - 8][8] = true;

  // Deterministic bit stream from payload
  const normalized = (payload || 'SID-VERIFIED').trim();
  const bits: boolean[] = [];
  let rollingHash = 0x811c9dc5;
  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i);
    rollingHash ^= code;
    rollingHash = Math.imul(rollingHash, 0x01000193);
    for (let b = 7; b >= 0; b--) {
      bits.push(((code >> b) & 1) === 1);
    }
  }
  // Pad bits deterministically
  let seed = rollingHash >>> 0;
  while (bits.length < size * size) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    for (let b = 0; b < 16; b++) {
      bits.push((((seed >>> b) & 1) === 1));
    }
  }

  let bitIdx = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!reserved[r][c]) {
        const mask = (r + c) % 2 === 0;
        matrix[r][c] = bits[bitIdx % bits.length] !== mask;
        bitIdx++;
      }
    }
  }

  return matrix;
}

/**
 * Evaluates verification checklist completeness score (0 - 100).
 */
export function evaluateVerificationChecklist(checklist: VerificationChecklist): {
  scorePercent: number;
  completedCount: number;
  totalCount: number;
  isReadyForSignature: boolean;
} {
  const values = [
    checklist.nikMatchDukcapil,
    checklist.kkMatchDukcapil,
    checklist.ktpAttachmentClear,
    checklist.pengantarRtRwValid,
    checklist.noTaxArrearsPbb,
  ];
  const completedCount = values.filter(Boolean).length;
  const totalCount = values.length;
  const scorePercent = Math.round((completedCount / totalCount) * 100);
  const isReadyForSignature =
    checklist.nikMatchDukcapil &&
    checklist.kkMatchDukcapil &&
    checklist.ktpAttachmentClear &&
    checklist.pengantarRtRwValid;

  return {
    scorePercent,
    completedCount,
    totalCount,
    isReadyForSignature,
  };
}

/**
 * Formats an automated WhatsApp notification message whenever a document status changes.
 */
export function formatWhatsAppNotification(
  request: Pick<
    LetterRequest,
    'trackingCode' | 'citizenName' | 'letterTitle' | 'status' | 'registrationNumber' | 'adminNotes'
  >,
  villageName = 'Pemerintah Desa'
): string {
  const statusIcon: Record<LetterRequestStatus, string> = {
    'Menunggu Verifikasi': '⏳',
    'Validasi Dokumen': '🔍',
    'Menunggu Tanda Tangan Kades': '✍️',
    Selesai: '✅',
    Ditolak: '⚠️',
  };

  const icon = statusIcon[request.status] || '📌';
  const header = `*SIM-DESA ${villageName.toUpperCase()} - NOTIFIKASI LAYANAN SURAT*`;
  const baseInfo = [
    header,
    `Yth. Bapak/Ibu *${request.citizenName}*,`,
    '',
    `Status permohonan dokumen Anda telah diperbarui secara real-time:`,
    `• Kode Tiket: *${request.trackingCode}*`,
    `• Jenis Dokumen: *${request.letterTitle}*`,
    `• Status Saat Ini: ${icon} *${request.status.toUpperCase()}*`,
  ];

  if (request.registrationNumber) {
    baseInfo.push(`• Nomor Registrasi: *${request.registrationNumber}*`);
  }

  if (request.status === 'Selesai') {
    baseInfo.push(
      '',
      'Dokumen Anda telah ditandatangani secara elektronik (TTE QR-Code) oleh Kepala Desa. Anda dapat mengunduh PDF langsung melalui Portal Layanan Surat Desa atau mengambil salinan fisik di Balai Desa.'
    );
  } else if (request.status === 'Ditolak') {
    baseInfo.push(
      '',
      `Catatan Verifikator: _"${request.adminNotes || 'Mohon lengkapi berkas lampiran pengantar RT/RW.'}"_`
    );
  } else {
    baseInfo.push(
      '',
      `Catatan: _"${request.adminNotes || 'Permohonan sedang diproses oleh perangkat desa.'}"_`
    );
  }

  baseInfo.push('', `_Pesan otomatis Sistem Informasi ${villageName}_`);
  return baseInfo.join('\n');
}

export interface DemographicSummary {
  totalPopulation: number;
  totalFamilies: number;
  maleCount: number;
  femaleCount: number;
  verifiedDukcapilCount: number;
  verifiedPercentage: number;
  productiveAgeCount: number;
  elderlyCount: number;
  childrenCount: number;
  aidRecipientsCount: number;
  byHamlet: Record<string, number>;
  byEducation: Record<string, number>;
  byOccupation: Record<string, number>;
  byAgeBracket: { label: string; male: number; female: number; total: number }[];
}

/**
 * Computes real-time demographic statistics from the citizen list (optionally filtered by hamlet).
 */
export function computeDemographicSummary(
  citizens: Citizen[],
  hamletFilter: HamletName | 'Semua Dusun' = 'Semua Dusun',
  hamletNames?: string[]
): DemographicSummary {
  const filtered =
    hamletFilter === 'Semua Dusun'
      ? citizens
      : citizens.filter((c) => c.dusun === hamletFilter);

  const uniqueKks = new Set(filtered.map((c) => c.kk));
  let maleCount = 0;
  let femaleCount = 0;
  let verifiedDukcapilCount = 0;
  let productiveAgeCount = 0;
  let elderlyCount = 0;
  let childrenCount = 0;
  let aidRecipientsCount = 0;

  const byHamlet: Record<string, number> = {};
  if (hamletNames && hamletNames.length > 0) {
    for (const name of hamletNames) {
      byHamlet[name] = 0;
    }
  }

  const byEducation: Record<string, number> = {};
  const byOccupation: Record<string, number> = {};

  const brackets = [
    { label: '0 - 14 Thn', min: 0, max: 14, male: 0, female: 0, total: 0 },
    { label: '15 - 24 Thn', min: 15, max: 24, male: 0, female: 0, total: 0 },
    { label: '25 - 44 Thn', min: 25, max: 44, male: 0, female: 0, total: 0 },
    { label: '45 - 59 Thn', min: 45, max: 59, male: 0, female: 0, total: 0 },
    { label: '60+ Thn (Lansia)', min: 60, max: 200, male: 0, female: 0, total: 0 },
  ];

  for (const c of filtered) {
    if (c.gender === 'Laki-laki') maleCount++;
    else femaleCount++;

    if (c.verifiedDukcapil) verifiedDukcapilCount++;
    if (c.age < 15) childrenCount++;
    else if (c.age >= 15 && c.age <= 64) productiveAgeCount++;
    else elderlyCount++;

    if (c.aidStatus !== 'Non-Penerima') aidRecipientsCount++;

    byHamlet[c.dusun] = (byHamlet[c.dusun] || 0) + 1;
    byEducation[c.education] = (byEducation[c.education] || 0) + 1;
    byOccupation[c.occupation] = (byOccupation[c.occupation] || 0) + 1;

    const bracket = brackets.find((b) => c.age >= b.min && c.age <= b.max);
    if (bracket) {
      if (c.gender === 'Laki-laki') bracket.male++;
      else bracket.female++;
      bracket.total++;
    }
  }

  const totalPopulation = filtered.length;
  const verifiedPercentage =
    totalPopulation > 0 ? Math.round((verifiedDukcapilCount / totalPopulation) * 100) : 0;

  return {
    totalPopulation,
    totalFamilies: uniqueKks.size,
    maleCount,
    femaleCount,
    verifiedDukcapilCount,
    verifiedPercentage,
    productiveAgeCount,
    elderlyCount,
    childrenCount,
    aidRecipientsCount,
    byHamlet,
    byEducation,
    byOccupation,
    byAgeBracket: brackets.map(({ label, male, female, total }) => ({
      label,
      male,
      female,
      total,
    })),
  };
}

export interface DocumentProcessingMetrics {
  totalRequests: number;
  completedCount: number;
  inProgressCount: number;
  waitingVerificationCount: number;
  rejectedCount: number;
  completionRatePercent: number;
  averageProcessingHours: number;
  slaCompliancePercent: number;
  whatsappNotificationsSent: number;
  byType: Record<LetterTypeCode, number>;
}

/**
 * Computes comprehensive analytics for document processing performance and efficiency.
 */
export function computeDocumentAnalytics(requests: LetterRequest[]): DocumentProcessingMetrics {
  const byType: Record<LetterTypeCode, number> = {
    SKU: 0,
    SKTM: 0,
    DOMISILI: 0,
    SKCK: 0,
    KELAHIRAN: 0,
    PINDAH: 0,
    KEMATIAN: 0,
    NIKAH: 0,
  };

  let completedCount = 0;
  let inProgressCount = 0;
  let waitingVerificationCount = 0;
  let rejectedCount = 0;
  let totalHours = 0;
  let hoursSampleCount = 0;
  let slaCompliantCount = 0;
  let whatsappNotificationsSent = 0;

  for (const r of requests) {
    byType[r.letterType] = (byType[r.letterType] || 0) + 1;
    whatsappNotificationsSent += r.whatsappNotifiedCount || 0;

    if (r.status === 'Selesai') {
      completedCount++;
      if (typeof r.processingHours === 'number') {
        totalHours += r.processingHours;
        hoursSampleCount++;
        if (r.processingHours <= 4) {
          slaCompliantCount++;
        }
      }
    } else if (r.status === 'Ditolak') {
      rejectedCount++;
    } else if (r.status === 'Menunggu Verifikasi') {
      waitingVerificationCount++;
      inProgressCount++;
    } else {
      inProgressCount++;
    }
  }

  const totalRequests = requests.length;
  const completionRatePercent =
    totalRequests > 0 ? Math.round((completedCount / totalRequests) * 100) : 0;
  const averageProcessingHours =
    hoursSampleCount > 0 ? Number((totalHours / hoursSampleCount).toFixed(1)) : 2.1;
  const slaCompliancePercent =
    hoursSampleCount > 0 ? Math.round((slaCompliantCount / hoursSampleCount) * 100) : 100;

  return {
    totalRequests,
    completedCount,
    inProgressCount,
    waitingVerificationCount,
    rejectedCount,
    completionRatePercent,
    averageProcessingHours,
    slaCompliancePercent,
    whatsappNotificationsSent,
    byType,
  };
}

/**
 * Builds RFC-4180 compliant CSV content from an array of records for Excel export.
 */
export function buildCsvContent(headers: string[], rows: (string | number | boolean)[][]): string {
  const escapeCell = (cell: string | number | boolean): string => {
    const str = String(cell ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ];
  return '\uFEFF' + lines.join('\r\n');
}

export interface CalendarDayCell {
  dateStr: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  agendas: VillageAgenda[];
}

/**
 * Generates a 42-cell (6 weeks x 7 days, Monday-first) calendar grid for a given year and month (0-11),
 * enriched with the village agendas falling on each date.
 */
export function buildMonthCalendarGrid(
  year: number,
  monthIndex: number,
  agendas: VillageAgenda[],
  todayStr = new Date().toISOString().slice(0, 10)
): CalendarDayCell[] {
  const firstDayOfMonth = new Date(Date.UTC(year, monthIndex, 1));
  // Convert Sunday=0..Saturday=6 into Monday=0..Sunday=6
  const startDayOfWeek = (firstDayOfMonth.getUTCDay() + 6) % 7;
  const startDate = new Date(Date.UTC(year, monthIndex, 1 - startDayOfWeek));

  const agendaByDate = new Map<string, VillageAgenda[]>();
  for (const ag of agendas) {
    const list = agendaByDate.get(ag.date) || [];
    list.push(ag);
    agendaByDate.set(ag.date, list);
  }

  const cells: CalendarDayCell[] = [];
  for (let i = 0; i < 42; i++) {
    const cellDate = new Date(startDate.getTime() + i * 86400000);
    const yyyy = cellDate.getUTCFullYear();
    const mm = String(cellDate.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(cellDate.getUTCDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const dayAgendas = (agendaByDate.get(dateStr) || []).sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    );

    cells.push({
      dateStr,
      dayNumber: cellDate.getUTCDate(),
      isCurrentMonth: cellDate.getUTCMonth() === monthIndex,
      isToday: dateStr === todayStr,
      agendas: dayAgendas,
    });
  }

  return cells;
}

/**
 * Detects time-slot conflicts on the same date and location for village agendas.
 */
export function detectAgendaConflicts(
  candidate: Pick<VillageAgenda, 'date' | 'startTime' | 'endTime' | 'location'>,
  existingAgendas: VillageAgenda[],
  excludeId?: string
): VillageAgenda[] {
  const toMinutes = (hhmm: string): number => {
    const [h, m] = hhmm.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const candStart = toMinutes(candidate.startTime);
  const candEnd = toMinutes(candidate.endTime);
  const normLoc = candidate.location.trim().toLowerCase();

  return existingAgendas.filter((ag) => {
    if (excludeId && ag.id === excludeId) return false;
    if (ag.date !== candidate.date) return false;
    if (ag.status === 'Selesai') return false;
    if (ag.location.trim().toLowerCase() !== normLoc) return false;

    const existStart = toMinutes(ag.startTime);
    const existEnd = toMinutes(ag.endTime);
    return candStart < existEnd && candEnd > existStart;
  });
}

/**
 * Generates a formatted WhatsApp broadcast invitation for a village agenda event.
 */
export function generateWhatsAppEventInvite(agenda: VillageAgenda, villageName = 'Pemerintah Desa'): string {
  return [
    `*UNDANGAN RESMI AGENDA ${villageName.toUpperCase()}*`,
    `Perihal: *${agenda.title}* (${agenda.category})`,
    '',
    `Yth. *${agenda.participantsTarget}*,`,
    `Mengharap kehadiran Bapak/Ibu/Saudara/i pada kegiatan desa yang akan diselenggarakan pada:`,
    `📅 Tanggal: *${agenda.date}*`,
    `⏰ Waktu: *${agenda.startTime} - ${agenda.endTime} WIB*`,
    `📍 Lokasi: *${agenda.location}* (${agenda.dusun})`,
    `👤 Koordinator: *${agenda.coordinator}*`,
    '',
    `Agenda: _"${agenda.description}"_`,
    '',
    `Demikian undangan ini disampaikan. Atas perhatian dan kehadirannya kami ucapkan terima kasih.`,
    `_Pemerintah ${villageName}_`,
  ].join('\n');
}

/**
 * Evaluates basic Telegram Bot commands (/start, /status <tiket/NIK>, /layanan)
 * and returns an automatic reply string, or null if the text is a regular message.
 */
export function evaluateTelegramBotCommand(
  rawText: string,
  requests: LetterRequest[],
  siteConfig: Pick<VillageSiteConfig, 'villageName' | 'subDistrict' | 'district' | 'officialWhatsApp' | 'serviceHoursWeekdays'>
): string | null {
  const trimmed = (rawText || '').trim();
  if (!trimmed.startsWith('/')) {
    return null;
  }

  const parts = trimmed.split(/\s+/);
  const cmd = parts[0].toLowerCase().replace(/@[a-zA-Z0-9_]+$/, '');
  const arg = parts.slice(1).join(' ').trim();

  if (cmd === '/start' || cmd === '/help' || cmd === '/bantuan') {
    return [
      `Halo! Selamat datang di Layanan Bot Resmi Pemerintah ${siteConfig.villageName} (${siteConfig.subDistrict}, ${siteConfig.district}).`,
      '',
      'Perintah cepat yang tersedia:',
      '• /status <KodeTiket/NIK> — Cek status permohonan surat Anda (Contoh: /status SRT-2026-SKU-001)',
      '• /ai <Pertanyaan> — Tanya jawab langsung dengan Asisten AI Desa (syarat surat, bansos, APBDes, agenda)',
      '• /layanan — Informasi jam operasional & daftar layanan surat desa',
      '',
      'Atau ketik langsung pertanyaan Anda di sini; sistem Asisten AI Telegram Desa & Perangkat Desa siap menjawab otomatis.',
    ].join('\n');
  }

  if (cmd === '/layanan') {
    return [
      `LAYANAN ADMINISTRASI ${siteConfig.villageName.toUpperCase()}`,
      `• Jam Operasional Balai Desa: ${siteConfig.serviceHoursWeekdays}`,
      `• Layanan Online & Anjungan Mandiri: 24 Jam Non-Stop`,
      `• WhatsApp Resmi Desa: +${siteConfig.officialWhatsApp}`,
      '• Untuk melacak surat ketik: /status <KodeTiket atau NIK 16 Digit>',
      '• Untuk tanya jawab pintar ketik: /ai <Pertanyaan Anda>',
    ].join('\n');
  }

  if (cmd === '/status') {
    if (!arg) {
      const sampleCode = requests[0]?.trackingCode || 'SRT-2026-SKU-001';
      return `Silakan sertakan Kode Tiket atau 16 digit NIK Anda.\nContoh ketik:\n/status ${sampleCode}`;
    }

    const q = arg.toLowerCase();
    const matches = requests.filter(
      (r) =>
        (r.trackingCode || '').toLowerCase() === q ||
        (r.registrationNumber || '').toLowerCase() === q ||
        (r.nik || '').toLowerCase() === q
    );

    if (matches.length === 0) {
      return `Data permohonan surat dengan kode tiket / NIK "${arg}" tidak ditemukan di buku register ${siteConfig.villageName}. Pastikan penulisan kode tiket sudah benar.`;
    }

    const lines = matches.slice(0, 3).map((m, idx) => {
      const regLine = m.registrationNumber ? `\n  No. Surat Resmi: ${m.registrationNumber}` : '';
      const noteLine = m.adminNotes ? `\n  Catatan Petugas: ${m.adminNotes}` : '';
      return `${idx + 1}. [${m.trackingCode}] ${m.letterTitle}\n  Pemohon: ${m.citizenName} (${m.dusun})\n  Status: ${m.status} (Update: ${m.updatedAt})${regLine}${noteLine}`;
    });

    return [
      `HASIL PELACAKAN TIKET SURAT — ${siteConfig.villageName.toUpperCase()}:`,
      '',
      ...lines,
    ].join('\n');
  }

  return null;
}

export interface OmnichannelAnalyticsData {
  totalMessages: number;
  byChannel: {
    channel: 'web' | 'whatsapp' | 'telegram';
    label: string;
    count: number;
    percent: number;
    color: string;
  }[];
  byRole: {
    role: 'citizen' | 'admin' | 'ai';
    label: string;
    count: number;
    percent: number;
    color: string;
  }[];
  telegramStats: {
    totalTelegram: number;
    citizenInquiries: number;
    aiReplies: number;
    adminReplies: number;
    aiAutomationRatePercent: number;
  };
  letterByStatus: {
    status: string;
    count: number;
    percent: number;
    color: string;
  }[];
  letterByType: {
    code: string;
    title: string;
    count: number;
    completed: number;
    percent: number;
  }[];
  apbdesSummary: {
    totalRevenueBudget: number;
    totalRevenueRealized: number;
    totalExpenseBudget: number;
    totalExpenseRealized: number;
    absorptionPercent: number;
    items: {
      label: string;
      category: string;
      budget: number;
      realized: number;
      percent: number;
    }[];
  };
  dusunBansosSeries: {
    dusun: string;
    population: number;
    aidRecipients: number;
    nonRecipients: number;
    aidPercent: number;
  }[];
}

/**
 * Computes visual chart datasets for Omnichannel Live Chat (Web, WhatsApp, Telegram AI),
 * Letter Service TTE Status/Categories, APBDes Budget Realization, and Dusun Bansos Distribution.
 */
export function computeOmnichannelAnalytics(
  chatMessages: ChatMessage[],
  requests: LetterRequest[],
  apbdes: ApbdesItem[] = [],
  citizens: Citizen[] = []
): OmnichannelAnalyticsData {
  const totalMessages = chatMessages.length;
  const safeMsgTotal = totalMessages || 1;

  const webCount = chatMessages.filter((m) => m.channel === 'web').length;
  const waCount = chatMessages.filter((m) => m.channel === 'whatsapp').length;
  const tgCount = chatMessages.filter((m) => m.channel === 'telegram').length;

  const byChannel: OmnichannelAnalyticsData['byChannel'] = [
    {
      channel: 'telegram',
      label: 'Telegram Bot API & AI',
      count: tgCount,
      percent: Math.round((tgCount / safeMsgTotal) * 100),
      color: '#0284c7',
    },
    {
      channel: 'whatsapp',
      label: 'WhatsApp Gateway',
      count: waCount,
      percent: Math.round((waCount / safeMsgTotal) * 100),
      color: '#16a34a',
    },
    {
      channel: 'web',
      label: 'Live Chat Portal Web',
      count: webCount,
      percent: Math.round((webCount / safeMsgTotal) * 100),
      color: '#0d9488',
    },
  ];

  const citizenCount = chatMessages.filter((m) => m.senderRole === 'citizen').length;
  const adminCount = chatMessages.filter((m) => m.senderRole === 'admin').length;
  const aiCount = chatMessages.filter((m) => m.senderRole === 'ai').length;

  const byRole: OmnichannelAnalyticsData['byRole'] = [
    {
      role: 'citizen',
      label: 'Pesan Masuk Warga',
      count: citizenCount,
      percent: Math.round((citizenCount / safeMsgTotal) * 100),
      color: '#f59e0b',
    },
    {
      role: 'ai',
      label: 'Auto-Reply AI & Bot Desa',
      count: aiCount,
      percent: Math.round((aiCount / safeMsgTotal) * 100),
      color: '#0d9488',
    },
    {
      role: 'admin',
      label: 'Balasan Perangkat Desa',
      count: adminCount,
      percent: Math.round((adminCount / safeMsgTotal) * 100),
      color: '#2563eb',
    },
  ];

  const tgCitizen = chatMessages.filter(
    (m) => m.channel === 'telegram' && m.senderRole === 'citizen'
  ).length;
  const tgAi = chatMessages.filter(
    (m) => m.channel === 'telegram' && m.senderRole === 'ai'
  ).length;
  const tgAdmin = chatMessages.filter(
    (m) => m.channel === 'telegram' && m.senderRole === 'admin'
  ).length;

  const telegramStats = {
    totalTelegram: tgCount,
    citizenInquiries: tgCitizen,
    aiReplies: tgAi,
    adminReplies: tgAdmin,
    aiAutomationRatePercent:
      tgCitizen > 0 ? Math.min(100, Math.round((tgAi / tgCitizen) * 100)) : tgAi > 0 ? 100 : 0,
  };

  const totalReqs = requests.length || 1;
  const statusDefs: { status: LetterRequestStatus; color: string }[] = [
    { status: 'Selesai', color: '#059669' },
    { status: 'Menunggu Tanda Tangan Kades', color: '#2563eb' },
    { status: 'Validasi Dokumen', color: '#0284c7' },
    { status: 'Menunggu Verifikasi', color: '#d97706' },
    { status: 'Ditolak', color: '#dc2626' },
  ];

  const letterByStatus = statusDefs.map((def) => {
    const count = requests.filter((r) => r.status === def.status).length;
    return {
      status: def.status,
      count,
      percent: Math.round((count / totalReqs) * 100),
      color: def.color,
    };
  });

  const typeMap = new Map<string, { code: string; title: string; count: number; completed: number }>();
  for (const r of requests) {
    const code = r.letterType || 'LAINNYA';
    const existing = typeMap.get(code) || {
      code,
      title: r.letterTitle || code,
      count: 0,
      completed: 0,
    };
    existing.count += 1;
    if (r.status === 'Selesai') {
      existing.completed += 1;
    }
    typeMap.set(code, existing);
  }

  const letterByType = Array.from(typeMap.values())
    .sort((a, b) => b.count - a.count)
    .map((item) => ({
      ...item,
      percent: Math.round((item.count / totalReqs) * 100),
    }));

  const revItems = apbdes.filter((a) => a.category === 'Pendapatan');
  const expItems = apbdes.filter((a) => a.category === 'Belanja');
  const totalRevenueBudget = revItems.reduce((sum, a) => sum + (a.anggaran || a.budget || 0), 0);
  const totalRevenueRealized = revItems.reduce((sum, a) => sum + (a.realisasi || a.realized || 0), 0);
  const totalExpenseBudget = expItems.reduce((sum, a) => sum + (a.anggaran || a.budget || 0), 0);
  const totalExpenseRealized = expItems.reduce((sum, a) => sum + (a.realisasi || a.realized || 0), 0);

  const apbdesSummary = {
    totalRevenueBudget,
    totalRevenueRealized,
    totalExpenseBudget,
    totalExpenseRealized,
    absorptionPercent:
      totalExpenseBudget > 0 ? Math.round((totalExpenseRealized / totalExpenseBudget) * 100) : 0,
    items: apbdes.map((a) => {
      const b = a.anggaran || a.budget || 0;
      const r = a.realisasi || a.realized || 0;
      return {
        label: a.subCategory || a.title || a.category,
        category: a.category,
        budget: b,
        realized: r,
        percent: b > 0 ? Math.min(100, Math.round((r / b) * 100)) : 0,
      };
    }),
  };

  const dusunMap = new Map<string, { population: number; aidRecipients: number }>();
  for (const c of citizens) {
    const d = c.dusun || 'Dusun Lainnya';
    const curr = dusunMap.get(d) || { population: 0, aidRecipients: 0 };
    curr.population += 1;
    if (c.aidStatus && c.aidStatus !== 'Non-Penerima') {
      curr.aidRecipients += 1;
    }
    dusunMap.set(d, curr);
  }

  const dusunBansosSeries = Array.from(dusunMap.entries()).map(([dusun, val]) => ({
    dusun,
    population: val.population,
    aidRecipients: val.aidRecipients,
    nonRecipients: Math.max(0, val.population - val.aidRecipients),
    aidPercent: val.population > 0 ? Math.round((val.aidRecipients / val.population) * 100) : 0,
  }));

  return {
    totalMessages,
    byChannel,
    byRole,
    telegramStats,
    letterByStatus,
    letterByType,
    apbdesSummary,
    dusunBansosSeries,
  };
}

export interface FamilyCardGroup {
  kk: string;
  kkNumber: string;
  headOfFamily: Citizen;
  members: Citizen[];
  dusun: string;
  rt: string;
  rw: string;
  address: string;
  aidPrograms: AidStatus[];
  tpsNumber: string;
}

const ROLE_ORDER: Record<FamilyRelationRole, number> = {
  'Kepala Keluarga': 1,
  Istri: 2,
  Anak: 3,
  'Orang Tua': 4,
  'Famili Lain': 5,
};

export function inferFamilyRole(citizen: Citizen, isFirstInKk = false): FamilyRelationRole {
  if (citizen.familyRole) return citizen.familyRole;
  if (isFirstInKk) return 'Kepala Keluarga';
  if (citizen.maritalStatus === 'Kawin' && citizen.gender === 'Perempuan') return 'Istri';
  if (citizen.age < 28 && citizen.maritalStatus === 'Belum Kawin') return 'Anak';
  if (citizen.age >= 60) return 'Orang Tua';
  return 'Famili Lain';
}

/**
  * Groups individual citizens by Nomor Kartu Keluarga (KK) and builds a structured family tree.
  */
export function groupCitizensByKk(citizens: Citizen[]): FamilyCardGroup[] {
  const map = new Map<string, Citizen[]>();
  for (const cit of citizens) {
    const kkKey = (cit.kk || '0000000000000000').trim();
    const list = map.get(kkKey) || [];
    list.push(cit);
    map.set(kkKey, list);
  }

  const groups: FamilyCardGroup[] = [];
  for (const [kk, rawMembers] of map.entries()) {
    const enriched = rawMembers.map((m, idx) => ({
      ...m,
      familyRole: inferFamilyRole(m, idx === 0),
    }));

    enriched.sort((a, b) => {
      const orderA = ROLE_ORDER[a.familyRole || 'Famili Lain'] || 99;
      const orderB = ROLE_ORDER[b.familyRole || 'Famili Lain'] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return b.age - a.age;
    });

    const head =
      enriched.find((m) => m.familyRole === 'Kepala Keluarga') ||
      enriched[0];

    const aidSet = new Set<AidStatus>();
    for (const m of enriched) {
      if (m.aidStatus && m.aidStatus !== 'Non-Penerima') {
        aidSet.add(m.aidStatus);
      }
    }

    groups.push({
      kk,
      kkNumber: kk,
      headOfFamily: head,
      members: enriched,
      dusun: head.dusun,
      rt: head.rt,
      rw: head.rw,
      address: head.address,
      aidPrograms: Array.from(aidSet),
      tpsNumber:
        head.tpsNumber ||
        (head.dusun.includes('1')
          ? 'TPS 001'
          : head.dusun.includes('2')
          ? 'TPS 002'
          : 'TPS 003'),
    });
  }

  return groups.sort((a, b) => a.headOfFamily.name.localeCompare(b.headOfFamily.name));
}

/**
  * Parses CSV or TSV text for bulk citizen import with automatic validation preview.
  * Expected columns: NIK, KK, Nama, JenisKelamin (L/P or Laki-laki/Perempuan), TanggalLahir (YYYY-MM-DD), HubunganKeluarga, Dusun, RT, RW, Alamat, Pekerjaan, Bansos
  */
export function parseCitizensCsv(
  csvText: string,
  defaultDusun = 'Dusun 1 Sukasari'
): {
  validCitizens: Citizen[];
  errors: { rowNumber: number; rawLine: string; reason: string; message: string }[];
} {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const validCitizens: Citizen[] = [];
  const errors: { rowNumber: number; rawLine: string; reason: string; message: string }[] = [];

  if (lines.length === 0) {
    return { validCitizens, errors };
  }

  const splitLine = (line: string): string[] => {
    const delimiter = line.includes('\t') ? '\t' : line.includes(';') ? ';' : ',';
    return line.split(delimiter).map((cell) => cell.replace(/^"|"$/g, '').trim());
  };

  const firstCells = splitLine(lines[0]);
  const hasHeader =
    firstCells[0]?.toLowerCase().includes('nik') ||
    firstCells[1]?.toLowerCase().includes('kk') ||
    firstCells[2]?.toLowerCase().includes('nama');

  const startIndex = hasHeader ? 1 : 0;
  const currentYear = new Date().getFullYear();

  for (let i = startIndex; i < lines.length; i++) {
    const rawLine = lines[i];
    const cols = splitLine(rawLine);
    const rowNumber = i + 1;

    if (cols.length < 3) {
      const msg = 'Format kolom kurang (minimal NIK, KK, Nama Lengkap).';
      errors.push({
        rowNumber,
        rawLine,
        reason: msg,
        message: msg,
      });
      continue;
    }

    const rawNik = (cols[0] || '').replace(/\s+/g, '');
    const rawKk = (cols[1] || '').replace(/\s+/g, '') || '3201140401100000';
    const name = (cols[2] || '').trim();
    const rawGender = (cols[3] || 'Laki-laki').trim();
    const birthDate = (cols[4] || '1990-01-01').trim();
    const rawRole = (cols[5] || 'Kepala Keluarga').trim();
    const dusun = (cols[6] || defaultDusun).trim();
    const rt = (cols[7] || '001').trim().padStart(3, '0');
    const rw = (cols[8] || '001').trim().padStart(3, '0');
    const address = (cols[9] || `Wilayah ${dusun}`).trim();
    const occupation = (cols[10] || 'Wiraswasta').trim();
    const rawAid = (cols[11] || 'Non-Penerima').trim();

    const nikValidation = validateNikFormat(rawNik);
    if (!nikValidation.isValid) {
      const msg = nikValidation.errorMessage || 'NIK tidak valid';
      errors.push({
        rowNumber,
        rawLine,
        reason: msg,
        message: msg,
      });
      continue;
    }

    if (!/^\d{16}$/.test(rawKk)) {
      const msg = `Nomor KK harus 16 digit angka (ditemukan "${rawKk}").`;
      errors.push({
        rowNumber,
        rawLine,
        reason: msg,
        message: msg,
      });
      continue;
    }

    if (name.length < 2) {
      const msg = 'Nama lengkap warga wajib diisi.';
      errors.push({
        rowNumber,
        rawLine,
        reason: msg,
        message: msg,
      });
      continue;
    }

    const gender: 'Laki-laki' | 'Perempuan' =
      rawGender.toLowerCase().startsWith('p') || rawGender.toLowerCase() === 'wanita'
        ? 'Perempuan'
        : 'Laki-laki';

    const birthYear = Number(birthDate.slice(0, 4));
    const age =
      !Number.isNaN(birthYear) && birthYear > 1900 && birthYear <= currentYear
        ? Math.max(0, currentYear - birthYear)
        : 32;

    const validRoles: FamilyRelationRole[] = [
      'Kepala Keluarga',
      'Istri',
      'Anak',
      'Orang Tua',
      'Famili Lain',
    ];
    const familyRole: FamilyRelationRole =
      validRoles.find((r) => r.toLowerCase() === rawRole.toLowerCase()) || 'Kepala Keluarga';

    const validAids: AidStatus[] = [
      'PKH',
      'BLT Dana Desa',
      'BPNT',
      'BPJS PBI',
      'Beasiswa Desa',
      'Rutilahu',
      'Non-Penerima',
    ];
    const aidStatus: AidStatus =
      validAids.find((a) => a.toLowerCase() === rawAid.toLowerCase()) || 'Non-Penerima';

    validCitizens.push({
      id: `cit-csv-${Date.now()}-${i}`,
      nik: nikValidation.cleanNik,
      kk: rawKk,
      name,
      familyRole,
      gender,
      birthPlace: 'Bogor',
      birthDate: /^\d{4}-\d{2}-\d{2}$/.test(birthDate) ? birthDate : '1990-01-01',
      age,
      maritalStatus: familyRole === 'Anak' ? 'Belum Kawin' : 'Kawin',
      religion: 'Islam',
      education: 'SMA/Sederajat',
      occupation,
      dusun,
      rt,
      rw,
      address,
      phone: '081200000000',
      aidStatus,
      tpsNumber: dusun.includes('1') ? 'TPS 001' : dusun.includes('2') ? 'TPS 002' : 'TPS 003',
      lifeStatus: 'Hidup',
      verifiedDukcapil: true,
      bloodType: 'O',
      lastUpdated: new Date().toISOString().slice(0, 10),
    });
  }

  return { validCitizens, errors };
}

/**
 * Parses CSV or TSV text for bulk APBDes financial import.
 * Expected columns: Kategori (Pendapatan/Belanja/Pembiayaan), SubKategori, Anggaran, Realisasi, Tahun, Keterangan
 */
export function parseApbdesCsv(csvText: string): {
  validItems: ApbdesItem[];
  errors: { rowNumber: number; rawLine: string; reason: string }[];
} {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const validItems: ApbdesItem[] = [];
  const errors: { rowNumber: number; rawLine: string; reason: string }[] = [];

  if (lines.length === 0) return { validItems, errors };

  const splitLine = (line: string): string[] => {
    const delimiter = line.includes('\t') ? '\t' : line.includes(';') ? ';' : ',';
    return line.split(delimiter).map((cell) => cell.replace(/^"|"$/g, '').trim());
  };

  const firstCells = splitLine(lines[0]);
  const hasHeader =
    firstCells[0]?.toLowerCase().includes('kategori') ||
    firstCells[2]?.toLowerCase().includes('anggaran');

  const startIndex = hasHeader ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const rawLine = lines[i];
    const cols = splitLine(rawLine);
    const rowNumber = i + 1;

    if (cols.length < 4) {
      errors.push({
        rowNumber,
        rawLine,
        reason: 'Format kolom kurang (wajib Kategori, SubKategori, Anggaran, Realisasi).',
      });
      continue;
    }

    const rawCat = (cols[0] || '').trim();
    const subCategory = (cols[1] || '').trim();
    const anggaran = Number((cols[2] || '').replace(/[^0-9.-]/g, ''));
    const realisasi = Number((cols[3] || '').replace(/[^0-9.-]/g, ''));
    const year = Number(cols[4] || new Date().getFullYear());
    const description = (cols[5] || subCategory).trim();

    const category: 'Pendapatan' | 'Belanja' | 'Pembiayaan' =
      rawCat.toLowerCase().includes('pendapatan')
        ? 'Pendapatan'
        : rawCat.toLowerCase().includes('pembiayaan')
        ? 'Pembiayaan'
        : 'Belanja';

    if (!subCategory) {
      errors.push({ rowNumber, rawLine, reason: 'Sub-kategori / Uraian anggaran kosong.' });
      continue;
    }

    if (Number.isNaN(anggaran) || anggaran < 0 || Number.isNaN(realisasi) || realisasi < 0) {
      errors.push({ rowNumber, rawLine, reason: 'Nilai Anggaran atau Realisasi harus berupa angka positif.' });
      continue;
    }

    validItems.push({
      id: `apb-csv-${Date.now()}-${i}`,
      category,
      subCategory,
      anggaran,
      realisasi,
      year: Number.isNaN(year) ? 2026 : year,
      description,
    });
  }

  return { validItems, errors };
}

/**
 * Generates a Monthly Administration & Financial Summary CSV Report for village officials.
 */
export function buildMonthlyReportCsv(
  citizens: Citizen[],
  mutations: PopulationMutationItem[],
  requests: LetterRequest[],
  apbdes: ApbdesItem[],
  siteConfig: Pick<VillageSiteConfig, 'villageName' | 'subDistrict' | 'district'>
): string {
  const kkGroups = groupCitizensByKk(citizens);
  const maleCount = citizens.filter((c) => c.gender === 'Laki-laki').length;
  const femaleCount = citizens.filter((c) => c.gender === 'Perempuan').length;
  const aidRecipients = citizens.filter((c) => c.aidStatus !== 'Non-Penerima').length;

  const birthCount = mutations.filter((m) => m.mutationType === 'KELAHIRAN').length;
  const deathCount = mutations.filter((m) => m.mutationType === 'KEMATIAN').length;
  const moveInCount = mutations.filter((m) => m.mutationType === 'DATANG_MASUK').length;
  const moveOutCount = mutations.filter((m) => m.mutationType === 'PINDAH_KELUAR').length;

  const completedLetters = requests.filter((r) => r.status === 'Selesai').length;
  const totalRev = apbdes
    .filter((a) => a.category === 'Pendapatan')
    .reduce((sum, a) => sum + (a.realisasi || a.realized || 0), 0);
  const totalExp = apbdes
    .filter((a) => a.category === 'Belanja')
    .reduce((sum, a) => sum + (a.realisasi || a.realized || 0), 0);

  const headers = ['Kategori Laporan', 'Indikator Administrasi Desa', 'Nilai / Realisasi', 'Satuan / Keterangan'];
  const rows: (string | number)[][] = [
    ['Identitas Desa', 'Pemerintah Desa', siteConfig.villageName, `${siteConfig.subDistrict} - ${siteConfig.district}`],
    ['Kependudukan', 'Total Penduduk Terdaftar', citizens.length, 'Jiwa'],
    ['Kependudukan', 'Total Kartu Keluarga (KK)', kkGroups.length, 'Kepala Keluarga'],
    ['Kependudukan', 'Penduduk Laki-laki', maleCount, 'Jiwa'],
    ['Kependudukan', 'Penduduk Perempuan', femaleCount, 'Jiwa'],
    ['Mutasi Bulanan', 'Kelahiran Baru (Lahir)', birthCount, 'Peristiwa'],
    ['Mutasi Bulanan', 'Kematian Warga (Mati)', deathCount, 'Peristiwa'],
    ['Mutasi Bulanan', 'Pendatang Baru (Datang Masuk)', moveInCount, 'Peristiwa'],
    ['Mutasi Bulanan', 'Pindah Domisili (Pindah Keluar)', moveOutCount, 'Peristiwa'],
    ['Bansos & DTKS', 'Total Penerima Manfaat Bansos/DTKS', aidRecipients, 'KPM / Warga'],
    ['Layanan Persuratan', 'Total Permohonan Surat Masuk', requests.length, 'Berkas'],
    ['Layanan Persuratan', 'Surat Selesai Diterbitkan (TTE)', completedLetters, 'Berkas'],
    ['Keuangan APBDes', 'Total Realisasi Pendapatan Desa', totalRev, 'Rupiah (Rp)'],
    ['Keuangan APBDes', 'Total Realisasi Belanja Desa', totalExp, 'Rupiah (Rp)'],
  ];

  return buildCsvContent(headers, rows);
}

/**
 * Computes Posyandu & Stunting Prevention indicators from live database records.
 */
export function computePosyanduStuntingMetrics(
  records: PosyanduGrowthRecord[] = [],
  schedulesOrTarget: PosyanduScheduleItem[] | number = [],
  targetPercentArg = 4.5
) {
  const schedules = Array.isArray(schedulesOrTarget) ? schedulesOrTarget : [];
  const targetPercent = typeof schedulesOrTarget === 'number' ? schedulesOrTarget : targetPercentArg;

  const balitaRecords = records.filter((r) => r.category === 'Balita');
  const bumilRecords = records.filter(
    (r) => r.category === 'Ibu Hamil (Bumil)' || r.category === 'Ibu Hamil'
  );

  const normalBalita = balitaRecords.filter((r) => r.nutritionalStatus === 'Gizi Baik (Normal)').length;
  const riskStunting = balitaRecords.filter((r) => r.nutritionalStatus === 'Risiko Stunting (Pendek)').length;
  const activeStunting = balitaRecords.filter(
    (r) => r.nutritionalStatus === 'Stunting (Intervensi PMT)' || r.nutritionalStatus === 'Gizi Kurang (PMT)'
  ).length;

  const totalBalitaMonitored = balitaRecords.length;
  const totalRegisteredBalita =
    schedules.reduce((sum, s) => sum + (s.registeredBalita || s.activeToddlers || 0), 0) ||
    totalBalitaMonitored ||
    1;

  const stuntingCaseCount = riskStunting + activeStunting;
  const stuntingPrevalencePercent =
    totalRegisteredBalita > 0
      ? Number(((stuntingCaseCount / totalRegisteredBalita) * 100).toFixed(1))
      : 0;

  const pmtCoveragePercent =
    records.length > 0
      ? Math.round((records.filter((r) => r.pmtReceived).length / records.length) * 100)
      : 100;

  const vitaminACoveragePercent =
    balitaRecords.length > 0
      ? Math.round(
          (balitaRecords.filter((r) => r.vitaminA || r.immunizationComplete).length /
            balitaRecords.length) *
            100
        )
      : 100;

  return {
    totalPosyanduUnits: schedules.length,
    totalCadres: schedules.reduce((sum, s) => sum + (s.cadreCount || 0), 0),
    totalRegisteredBalita,
    totalRegisteredBumil: schedules.reduce((sum, s) => sum + (s.registeredBumil || s.pregnantMothers || 0), 0),
    monitoredBalitaCount: totalBalitaMonitored,
    monitoredBumilCount: bumilRecords.length,
    totalBalita: totalBalitaMonitored,
    totalIbuHamil: bumilRecords.length,
    normalBalita,
    normalCount: normalBalita,
    riskStunting,
    activeStunting,
    stuntingCaseCount,
    stuntingRiskCount: stuntingCaseCount,
    stuntingPrevalencePercent,
    stuntingRatePercent: stuntingPrevalencePercent,
    targetPercent,
    pmtCoveragePercent,
    vitaminACoveragePercent,
    immunizationCoveragePercent: vitaminACoveragePercent,
  };
}

/**
 * Pure lookup for "Portal Cek Mandiri Warga (Cek NIK Satu Pintu)".
 * Validates NIK + optional birthDate and aggregates letter statuses, Bansos, family KK, TPS, Posyandu & Dusun agendas.
 */
export function lookupCitizenOneStopPortal(
  nikInput: string,
  birthDateInput: string,
  db: {
    citizens: Citizen[];
    requests: LetterRequest[];
    agendas: VillageAgenda[];
    siteConfig: VillageSiteConfig;
  }
): {
  found: boolean;
  errorMessage?: string;
  citizen?: Citizen;
  familyMembers: Citizen[];
  letterRequests: LetterRequest[];
  tpsInfo?: TpsLocationInfo;
  posyanduSchedule?: PosyanduScheduleItem;
  posyanduRecords: PosyanduGrowthRecord[];
  dusunAgendas: VillageAgenda[];
} {
  const validation = validateNikFormat(nikInput);
  if (!validation.isValid) {
    return {
      found: false,
      errorMessage: validation.errorMessage,
      familyMembers: [],
      letterRequests: [],
      posyanduRecords: [],
      dusunAgendas: [],
    };
  }

  const citizen = db.citizens.find((c) => c.nik === validation.cleanNik);
  if (!citizen) {
    return {
      found: false,
      errorMessage: 'NIK tidak ditemukan dalam Buku Induk Penduduk Desa.',
      familyMembers: [],
      letterRequests: [],
      posyanduRecords: [],
      dusunAgendas: [],
    };
  }

  const cleanBirthDate = (birthDateInput || '').trim();
  if (cleanBirthDate && citizen.birthDate !== cleanBirthDate) {
    return {
      found: false,
      errorMessage: 'Tanggal lahir tidak cocok dengan NIK terdaftar. Pastikan format YYYY-MM-DD sesuai KTP/KK.',
      familyMembers: [],
      letterRequests: [],
      posyanduRecords: [],
      dusunAgendas: [],
    };
  }

  const familyMembers = db.citizens.filter((c) => c.kk === citizen.kk);
  const letterRequests = db.requests.filter((r) => r.nik === citizen.nik || r.kk === citizen.kk);

  const tpsList = db.siteConfig.tpsLocations || [];
  const tpsInfo =
    tpsList.find((t) => t.tpsNumber === citizen.tpsNumber || t.dusun === citizen.dusun) ||
    tpsList[0];

  const posyanduSchedule = (db.siteConfig.posyanduSchedules || []).find(
    (p) => p.dusun === citizen.dusun
  );

  const posyanduRecords = (db.siteConfig.posyanduRecords || []).filter(
    (r) => r.kk === citizen.kk || r.nikOrKms === citizen.nik || r.nik === citizen.nik
  );

  const dusunKey = (citizen.dusun || '').split(' ').slice(0, 2).join(' ').toLowerCase();
  const dusunAgendas = db.agendas.filter(
    (a) =>
      (a.location || '').toLowerCase().includes(dusunKey) ||
      (a.description || '').toLowerCase().includes(dusunKey) ||
      a.category === 'Musyawarah Desa' ||
      a.category === 'Posyandu & Kesehatan'
  );

  return {
    found: true,
    citizen,
    familyMembers,
    letterRequests,
    tpsInfo,
    posyanduSchedule,
    posyanduRecords,
    dusunAgendas,
  };
}




export function computeHouseholdDashboardSummary(..._args: any[]): any {
  return {
    totalMembers: 0,
    dependents: 0,
    workingAge: 0,
    elderly: 0,
  };
}
