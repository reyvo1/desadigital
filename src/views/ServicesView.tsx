import React, { useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck,
  FileSearch,
  FileText,
  Landmark,
  MessageSquare,
  MonitorSmartphone,
  Printer,
  QrCode,
  Scale,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserCheck,
  Users,
  Vote,
} from 'lucide-react';
import {
  Citizen,
  LetterRequest,
  LetterTypeCode,
  LetterTypeInfo,
  PopulationMutationItem,
  VillageAgenda,
  VillageAssetItem,
  VillageMailLog,
  VillageRegulation,
  VillageSiteConfig,
} from '../types/village';
import {
  computeDocumentAnalytics,
  computePosyanduStuntingMetrics,
  formatWhatsAppNotification,
  generateOfficialLetterNumber,
  generateTrackingCode,
  lookupCitizenOneStopPortal,
  maskSensitiveNumber,
  validateNikFormat,
} from '../utils/villageLogic';

interface ServicesViewProps {
  requests: LetterRequest[];
  citizens: Citizen[];
  letterTypes: LetterTypeInfo[];
  siteConfig?: VillageSiteConfig;
  regulations?: VillageRegulation[];
  villageAssets?: VillageAssetItem[];
  incomingOutboxLetters?: VillageMailLog[];
  populationMutations?: PopulationMutationItem[];
  agendas?: VillageAgenda[];
  onOpenRequestModal: (type: LetterTypeCode) => void;
  onOpenTrackModal: (prefillCode?: string) => void;
  onPreviewOfficialLetter: (request: LetterRequest) => void;
  onInstantIssueLetter?: (newRequest: LetterRequest, waMessage: string) => void;
  onOpenQrVerifyModal?: (request?: LetterRequest) => void;
}

export const ServicesView: React.FC<ServicesViewProps> = ({
  requests,
  citizens,
  letterTypes,
  siteConfig,
  regulations = [],
  villageAssets = [],
  incomingOutboxLetters = [],
  populationMutations = [],
  agendas = [],
  onOpenRequestModal,
  onOpenTrackModal,
  onPreviewOfficialLetter,
  onInstantIssueLetter,
  onOpenQrVerifyModal,
}) => {
  const [activeSubView, setActiveSubView] = useState<
    'katalog' | 'cek_nik' | 'anjungan' | 'bansos' | 'posyandu' | 'jdih_aset'
  >('katalog');

  // Portal Cek Mandiri Warga ("Cek NIK Satu Pintu") State
  const [portalNik, setPortalNik] = useState(citizens[0]?.nik || '3201141205820001');
  const [portalBirthDate, setPortalBirthDate] = useState(citizens[0]?.birthDate || '1982-05-12');
  const [portalServerResult, setPortalServerResult] = useState<ReturnType<typeof lookupCitizenOneStopPortal> | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const [categoryFilter, setCategoryFilter] = useState<string>('SEMUA');
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Self-Service Kiosk (Anjungan Mandiri Balai Desa) State
  const [kioskNik, setKioskNik] = useState('');
  const [kioskSelectedType, setKioskSelectedType] = useState<LetterTypeCode>(
    letterTypes[0]?.code || 'SKU'
  );
  const [kioskPurpose, setKioskPurpose] = useState('');
  const [kioskCustomValues, setKioskCustomValues] = useState<Record<string, string>>({});
  const [kioskError, setKioskError] = useState<string | null>(null);

  // Bansos Checker State
  const [bansosSearch, setBansosSearch] = useState('');
  const [bansosProgramFilter, setBansosProgramFilter] = useState<string>('SEMUA');
  const [bansosNikInput, setBansosNikInput] = useState<string>(citizens[0]?.nik || '');
  const [bansosNikChecked, setBansosNikChecked] = useState<boolean>(true);

  const metrics = computeDocumentAnalytics(requests);
  const activeLetterTypes = letterTypes;
  const villageName = siteConfig?.villageName || 'Pemerintah Desa';
  const villageCode = siteConfig?.villageCode || '32.01.14.2005';

  const categories = useMemo(() => {
    const set = new Set<string>();
    activeLetterTypes.forEach((lt) => {
      if (lt.category) set.add(lt.category);
    });
    return ['SEMUA', ...Array.from(set)];
  }, [activeLetterTypes]);

  const filteredLetterTypes = useMemo(() => {
    return activeLetterTypes.filter((lt) => {
      const matchCat =
        categoryFilter === 'SEMUA' || (lt.category || 'Layanan Umum & Sosial') === categoryFilter;
      const q = catalogSearch.toLowerCase();
      const matchSearch =
        !q ||
        (lt.name || '').toLowerCase().includes(q) ||
        (lt.code || '').toLowerCase().includes(q) ||
        (lt.shortDesc || '').toLowerCase().includes(q) ||
        (lt.classificationCode && lt.classificationCode.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [activeLetterTypes, categoryFilter, catalogSearch]);

  const filteredRequests = requests.filter(
    (r) =>
      (r.trackingCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.citizenName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.letterTitle || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Kiosk Citizen Match
  const kioskMatchedCitizen = useMemo(() => {
    const clean = kioskNik.replace(/\s+/g, '').trim();
    if (clean.length !== 16) return null;
    return citizens.find((c) => c.nik === clean) || null;
  }, [kioskNik, citizens]);

  const kioskLetterTypeInfo = useMemo(() => {
    return (
      activeLetterTypes.find((lt) => lt.code === kioskSelectedType) || activeLetterTypes[0]
    );
  }, [activeLetterTypes, kioskSelectedType]);

  const handleKioskInstantIssue = (e: React.FormEvent) => {
    e.preventDefault();
    setKioskError(null);
    const val = validateNikFormat(kioskNik);
    if (!val.isValid) {
      setKioskError(val.errorMessage || 'NIK harus 16 digit.');
      return;
    }
    if (!kioskMatchedCitizen) {
      setKioskError(
        'NIK belum terdaftar di Buku Induk Penduduk Desa. Silakan gunakan tombol Pengajuan Reguler atau pilih warga terdaftar di bawah.'
      );
      return;
    }
    if (!kioskPurpose.trim()) {
      setKioskError('Keperluan penggunaan surat wajib diisi.');
      return;
    }

    const now = new Date();
    const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(
      2,
      '0'
    )}:${String(now.getMinutes()).padStart(2, '0')}`;

    const seq = requests.length + 1;
    const trackingCode = generateTrackingCode(kioskSelectedType, seq, now.getFullYear());
    const regNum = generateOfficialLetterNumber(
      kioskSelectedType,
      seq,
      now.getMonth(),
      now.getFullYear(),
      villageCode,
      kioskLetterTypeInfo?.classificationCode
    );

    const customSummaryParts: string[] = [];
    for (const def of kioskLetterTypeInfo?.customFields || []) {
      const v = (kioskCustomValues[def.key] || '').trim();
      if (v) customSummaryParts.push(`${def.label}: ${v}`);
    }

    const instantReq: LetterRequest = {
      id: `req-kiosk-${Date.now()}`,
      trackingCode,
      registrationNumber: regNum,
      nik: kioskMatchedCitizen.nik,
      citizenName: kioskMatchedCitizen.name,
      kk: kioskMatchedCitizen.kk,
      dusun: kioskMatchedCitizen.dusun,
      rt: kioskMatchedCitizen.rt,
      rw: kioskMatchedCitizen.rw,
      whatsapp: kioskMatchedCitizen.phone,
      letterType: kioskSelectedType,
      letterTitle: kioskLetterTypeInfo?.name || `Surat Keterangan (${kioskSelectedType})`,
      purpose: kioskPurpose.trim(),
      extraNotes: customSummaryParts.join(' | ') || 'Diterbitkan melalui Anjungan Layanan Mandiri Desa',
      customFieldValues:
        Object.keys(kioskCustomValues).length > 0 ? kioskCustomValues : undefined,
      signerRole: kioskLetterTypeInfo?.defaultSignerRole || 'Kepala Desa',
      attachmentName: 'Terverifikasi_NIK_Buku_Induk_Penduduk.pdf',
      status: 'Selesai',
      createdAt: nowStr,
      updatedAt: nowStr,
      completedAt: nowStr,
      processingHours: 0.1,
      adminNotes: 'Terverifikasi otomatis melalui Anjungan Layanan Mandiri Balai Desa (TTE QR-Code).',
      verifiedBy: 'Mesin Anjungan Mandiri SID',
      signedBy: siteConfig?.headOfVillageName || 'Kepala Desa',
      qrVerificationCode: `TTE-${villageCode}-${trackingCode}`,
      whatsappNotifiedCount: 1,
      checklist: {
        nikMatchDukcapil: true,
        kkMatchDukcapil: true,
        ktpAttachmentClear: true,
        pengantarRtRwValid: true,
        noTaxArrearsPbb: true,
      },
    };

    const waMsg = formatWhatsAppNotification(
      {
        trackingCode: instantReq.trackingCode,
        citizenName: instantReq.citizenName,
        letterTitle: instantReq.letterTitle,
        status: 'Selesai',
        registrationNumber: regNum,
        adminNotes: instantReq.adminNotes,
      },
      villageName
    );
    instantReq.lastWhatsappMessage = waMsg;

    if (onInstantIssueLetter) {
      onInstantIssueLetter(instantReq, waMsg);
    }
    onPreviewOfficialLetter(instantReq);
  };

  // Bansos Filtered List
  const bansosCitizens = useMemo(() => {
    return citizens.filter((c) => {
      const matchProg =
        bansosProgramFilter === 'SEMUA'
          ? c.aidStatus !== 'Non-Penerima'
          : bansosProgramFilter === 'SEMUA_WARGA'
          ? true
          : c.aidStatus === bansosProgramFilter;
      const q = bansosSearch.toLowerCase().trim();
      const matchQuery =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.nik.includes(q) ||
        c.kk.includes(q) ||
        c.dusun.toLowerCase().includes(q);
      return matchProg && matchQuery;
    });
  }, [citizens, bansosProgramFilter, bansosSearch]);

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 rounded-3xl p-8 text-white shadow-xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/15 text-emerald-200 text-xs font-semibold">
            <FileCheck className="w-3.5 h-3.5" />
            <span>
              Standar Permendagri No. 47/2016 • {activeLetterTypes.length} Jenis Layanan Surat TTE
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold">
            Pusat Layanan Surat-Menyurat & Administrasi {villageName}
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
            Terbitkan dan ajukan segala jenis surat keterangan desa (Umum, Kependudukan F-2.01/F-2.29,
            Pengantar Nikah N1-N4, SKU, Riwayat Tanah Sporadik, Ahli Waris) dengan auto-fill NIK Buku Induk Penduduk, Anjungan Mandiri, serta transparansi Bansos & JDIH Desa.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 shrink-0">
          <button
            onClick={() => onOpenRequestModal(activeLetterTypes[0]?.code || 'SKU')}
            className="px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg transition-all cursor-pointer flex items-center space-x-2"
          >
            <Send className="w-4 h-4" />
            <span>Buat Pengajuan Surat Baru</span>
          </button>
          <button
            onClick={() => onOpenTrackModal()}
            className="px-5 py-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center space-x-2"
          >
            <FileSearch className="w-4 h-4" />
            <span>Lacak Tiket Permohonan</span>
          </button>
          {onOpenQrVerifyModal && (
            <button
              onClick={() => onOpenQrVerifyModal()}
              className="px-4 py-3 rounded-xl bg-teal-500/30 hover:bg-teal-500/45 border border-teal-300/40 text-white font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center space-x-2"
            >
              <QrCode className="w-4 h-4 text-amber-300" />
              <span>Verifikasi QR TTE</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-Navigation Pills for Services Domain */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveSubView('katalog')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition cursor-pointer ${
            activeSubView === 'katalog'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-700 hover:border-emerald-500'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Katalog Surat ({activeLetterTypes.length}) & Antrean</span>
        </button>

        <button
          onClick={() => setActiveSubView('cek_nik')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition cursor-pointer ${
            activeSubView === 'cek_nik'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-700 hover:border-emerald-500'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Cek NIK Satu Pintu (Surat, Bansos, TPS & Dusun)</span>
        </button>

        <button
          onClick={() => setActiveSubView('anjungan')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition cursor-pointer ${
            activeSubView === 'anjungan'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-700 hover:border-emerald-500'
          }`}
        >
          <MonitorSmartphone className="w-4 h-4" />
          <span>Anjungan Mandiri (Cetak Instan)</span>
        </button>

        <button
          onClick={() => setActiveSubView('bansos')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition cursor-pointer ${
            activeSubView === 'bansos'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-700 hover:border-emerald-500'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Cek Penerima Bansos & DTKS</span>
        </button>

        <button
          onClick={() => setActiveSubView('posyandu')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition cursor-pointer ${
            activeSubView === 'posyandu'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-700 hover:border-emerald-500'
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          <span>Posyandu, Balita & Stunting Desa</span>
        </button>

        <button
          onClick={() => setActiveSubView('jdih_aset')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition cursor-pointer ${
            activeSubView === 'jdih_aset'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-700 hover:border-emerald-500'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Buku Administrasi, JDIH & Aset</span>
        </button>
      </div>

      {/* Document Processing Performance Metrics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-200/80 dark:border-slate-700 shadow-sm">
          <span className="text-xs text-gray-500 dark:text-gray-400">Total Permohonan & Terbit</span>
          <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">
            {metrics.totalRequests} Dokumen
          </p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
            {metrics.completedCount} Selesai TTE • {metrics.inProgressCount} Diproses
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-200/80 dark:border-slate-700 shadow-sm">
          <span className="text-xs text-gray-500 dark:text-gray-400">Jenis Layanan Surat Aktif</span>
          <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-1">
            {activeLetterTypes.length} Jenis Surat
          </p>
          <span className="text-[11px] text-gray-500">Kode Klasifikasi Kemendagri</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-200/80 dark:border-slate-700 shadow-sm">
          <span className="text-xs text-gray-500 dark:text-gray-400">Database Induk Penduduk</span>
          <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">
            {citizens.length} Warga
          </p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
            Auto-Fill Biodata 16 Digit NIK
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-200/80 dark:border-slate-700 shadow-sm">
          <span className="text-xs text-gray-500 dark:text-gray-400">Notifikasi WhatsApp Terkirim</span>
          <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-1">
            {metrics.whatsappNotificationsSent} Pesan
          </p>
          <span className="text-[11px] text-gray-500">Pembaruan Status Otomatis</span>
        </div>
      </div>

      {/* SUBVIEW 1: KATALOG SEGALA JENIS SURAT & ANTREAN */}
      {activeSubView === 'katalog' && (
        <>
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">
                  Katalog Lengkap Layanan Surat Keterangan Desa ({filteredLetterTypes.length} dari{' '}
                  {activeLetterTypes.length} Jenis)
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Seluruh format surat dan kolom isian bersifat dinamis (dapat ditambah/diubah oleh Admin Desa).
                </p>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-2.5" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Cari nama surat, kode (SKU, N1, F-2.01)..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Category Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    categoryFilter === cat
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-700 hover:border-emerald-500'
                  }`}
                >
                  {cat === 'SEMUA' ? `Semua Kategori (${activeLetterTypes.length})` : cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredLetterTypes.map((lt) => (
                <div
                  key={lt.code}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-200/80 dark:border-slate-700 hover:border-emerald-500 transition-all flex flex-col justify-between shadow-sm"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono font-bold text-xs">
                        {lt.code}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300">
                        Arsip: {lt.classificationCode || '470'}
                      </span>
                    </div>

                    {lt.category && (
                      <span className="inline-block text-[10px] font-bold text-teal-700 dark:text-teal-400">
                        {lt.category}
                      </span>
                    )}

                    <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-snug">
                      {lt.name}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                      {lt.shortDesc}
                    </p>

                    {lt.customFields && lt.customFields.length > 0 && (
                      <div className="pt-1.5">
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 block mb-1">
                          Isian Khusus ({lt.customFields.length} Kolom):
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {lt.customFields.map((cf) => (
                            <span
                              key={cf.key}
                              className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-slate-900 border border-emerald-200/70 dark:border-slate-700 text-[10px] text-gray-700 dark:text-gray-300"
                            >
                              {cf.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-2 border-t border-gray-100 dark:border-slate-700/70">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase text-gray-400 mb-1">
                        <span>Syarat Dokumen:</span>
                        <span className="flex items-center space-x-1 text-emerald-600">
                          <Clock className="w-3 h-3" />
                          <span>~{lt.estimatedHours} Jam</span>
                        </span>
                      </div>
                      <ul className="space-y-1">
                        {lt.requirements.map((req, i) => (
                          <li
                            key={i}
                            className="text-[11px] text-gray-600 dark:text-gray-300 flex items-center space-x-1.5"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-4 pt-2 flex gap-2">
                    <button
                      onClick={() => onOpenRequestModal(lt.code)}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Ajukan Online</span>
                    </button>
                    <button
                      onClick={() => {
                        setKioskSelectedType(lt.code);
                        setKioskCustomValues({});
                        setActiveSubView('anjungan');
                      }}
                      title="Buka di Mode Anjungan Mandiri"
                      className="px-3 py-2.5 rounded-xl border border-emerald-200 dark:border-slate-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-slate-700 text-xs font-bold cursor-pointer"
                    >
                      Kiosk
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Queue & Status Tracker Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200/80 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-lg text-gray-900 dark:text-white">
                  Daftar Antrean & Register Penerbitan Surat Warga (Real-Time)
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Surat berstatus "Selesai" telah dilengkapi Nomor Registrasi & TTE QR-Code dan dapat langsung dicetak/diunduh PDF.
                </p>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari Nomor Tiket atau Nama..."
                className="px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:w-64"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 uppercase text-[11px]">
                    <th className="py-3 px-3">Kode Tiket / No. Surat</th>
                    <th className="py-3 px-3">Pemohon & Wilayah</th>
                    <th className="py-3 px-3">Jenis Surat & Keperluan</th>
                    <th className="py-3 px-3">Waktu Pengajuan</th>
                    <th className="py-3 px-3">Status Proses</th>
                    <th className="py-3 px-3">Notifikasi WA</th>
                    <th className="py-3 px-3 text-right">Aksi Dokumen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
                  {filteredRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-700/30">
                      <td className="py-3 px-3">
                        <p className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          {req.trackingCode}
                        </p>
                        {req.registrationNumber && (
                          <p className="font-mono text-[10px] text-gray-500">
                            No: {req.registrationNumber}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-bold text-gray-900 dark:text-white">{req.citizenName}</p>
                        <p className="text-[11px] text-gray-500">
                          {req.dusun} (RT {req.rt}/{req.rw})
                        </p>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-gray-800 dark:text-gray-200">
                          {req.letterTitle}
                        </span>
                        <p className="text-[11px] text-gray-500 truncate max-w-xs">{req.purpose}</p>
                      </td>
                      <td className="py-3 px-3 text-gray-500">{req.createdAt}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            req.status === 'Selesai'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                              : req.status === 'Ditolak'
                              ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center space-x-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{req.whatsappNotifiedCount}x Terkirim</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right space-x-1.5">
                        <button
                          onClick={() => onOpenTrackModal(req.trackingCode)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 font-semibold cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Lacak</span>
                        </button>
                        {req.status === 'Selesai' && (
                          <button
                            onClick={() => onPreviewOfficialLetter(req)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Cetak Surat</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-2 flex items-center justify-between text-[11px] text-gray-500">
              <span className="inline-flex items-center space-x-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>Seluruh dokumen dilengkapi QR-Code Tanda Tangan Elektronik (TTE) Kepala Desa</span>
              </span>
            </div>
          </div>
        </>
      )}

      {/* SUBVIEW 2: ANJUNGAN LAYANAN MANDIRI BALAI DESA (KIOSK MODE) */}
      {activeSubView === 'anjungan' && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border-2 border-emerald-500/40 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-slate-700 pb-5">
            <div className="flex items-start space-x-3.5">
              <div className="p-3 rounded-2xl bg-emerald-600 text-white shrink-0">
                <MonitorSmartphone className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Mode Layar Sentuh Balai Desa (Self-Service Kiosk)
                </span>
                <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">
                  Anjungan Layanan Mandiri Cetak Surat Instan {villageName}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Masukkan 16 digit NIK yang terdaftar pada Buku Induk Penduduk Desa untuk memvalidasi biodata otomatis dan menerbitkan surat keterangan ber-QR TTE secara instan.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {citizens.slice(0, 4).map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => {
                    setKioskNik(c.nik);
                    setKioskError(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-slate-900 border border-emerald-200 dark:border-slate-700 text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 cursor-pointer"
                >
                  Simulasi Tap KTP: {c.name.split(' ')[0]} ({c.nik.slice(0, 6)}...)
                </button>
              ))}
            </div>
          </div>

          {kioskError && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 font-semibold">
              {kioskError}
            </div>
          )}

          <form onSubmit={handleKioskInstantIssue} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left column: NIK verification & Citizen Biodata Card */}
            <div className="lg:col-span-5 space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-gray-800 dark:text-gray-200 mb-1.5">
                  1. Ketik / Tempel NIK KTP-el (16 Digit) *
                </label>
                <input
                  type="text"
                  maxLength={16}
                  value={kioskNik}
                  onChange={(e) => {
                    setKioskNik(e.target.value);
                    setKioskError(null);
                  }}
                  placeholder="Ketik 16 Digit NIK Warga Terdaftar..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-emerald-500/60 bg-gray-50 dark:bg-slate-900 text-sm font-mono font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              {kioskMatchedCitizen ? (
                <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-emerald-200/70 dark:border-emerald-800 pb-2">
                    <span className="font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center space-x-1.5">
                      <UserCheck className="w-4 h-4" />
                      <span>Biodata Buku Induk Penduduk Terverifikasi</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold">
                      AKTIF
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 pt-1">
                    <span className="text-gray-500">Nama Lengkap:</span>
                    <span className="col-span-2 font-bold text-gray-900 dark:text-white">
                      {kioskMatchedCitizen.name}
                    </span>
                    <span className="text-gray-500">NIK / No. KK:</span>
                    <span className="col-span-2 font-mono text-gray-800 dark:text-gray-200">
                      {kioskMatchedCitizen.nik} / {maskSensitiveNumber(kioskMatchedCitizen.kk, false)}
                    </span>
                    <span className="text-gray-500">Tempat, Tgl Lahir:</span>
                    <span className="col-span-2 text-gray-800 dark:text-gray-200">
                      {kioskMatchedCitizen.birthPlace}, {kioskMatchedCitizen.birthDate} ({kioskMatchedCitizen.age} Thn)
                    </span>
                    <span className="text-gray-500">Pekerjaan:</span>
                    <span className="col-span-2 text-gray-800 dark:text-gray-200">
                      {kioskMatchedCitizen.occupation}
                    </span>
                    <span className="text-gray-500">Alamat Dusun:</span>
                    <span className="col-span-2 text-gray-800 dark:text-gray-200">
                      {kioskMatchedCitizen.address}, RT {kioskMatchedCitizen.rt}/RW {kioskMatchedCitizen.rw} ({kioskMatchedCitizen.dusun})
                    </span>
                    <span className="text-gray-500">Status Bansos:</span>
                    <span className="col-span-2 font-semibold text-emerald-700 dark:text-emerald-400">
                      {kioskMatchedCitizen.aidStatus}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-dashed border-gray-300 dark:border-slate-700 text-xs text-gray-500 space-y-1">
                  <p className="font-bold text-gray-700 dark:text-gray-300">
                    Menunggu Input NIK 16 Digit...
                  </p>
                  <p>
                    Klik salah satu tombol <strong>Simulasi Tap KTP</strong> di kanan atas untuk menguji pengisian otomatis dari Buku Induk Penduduk.
                  </p>
                </div>
              )}
            </div>

            {/* Right column: Select Letter Type, Dynamic Fields & Instant Issue */}
            <div className="lg:col-span-7 space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-gray-800 dark:text-gray-200 mb-1.5">
                  2. Pilih Jenis Surat yang Akan Diterbitkan ({activeLetterTypes.length} Jenis Tersedia) *
                </label>
                <select
                  value={kioskSelectedType}
                  onChange={(e) => {
                    setKioskSelectedType(e.target.value);
                    setKioskCustomValues({});
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {activeLetterTypes.map((lt) => (
                    <option key={lt.code} value={lt.code}>
                      [{lt.code}] {lt.name} — Kode Arsip {lt.classificationCode || '470'}
                    </option>
                  ))}
                </select>
              </div>

              {kioskLetterTypeInfo?.customFields && kioskLetterTypeInfo.customFields.length > 0 && (
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 space-y-3">
                  <p className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300">
                    3. Isi Rincian Data Khusus {kioskLetterTypeInfo.name}:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {kioskLetterTypeInfo.customFields.map((field) => (
                      <div key={field.key}>
                        <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                          {field.label} {field.required ? '*' : ''}
                        </label>
                        <input
                          type="text"
                          required={Boolean(field.required)}
                          value={kioskCustomValues[field.key] || ''}
                          onChange={(e) =>
                            setKioskCustomValues((prev) => ({
                              ...prev,
                              [field.key]: e.target.value,
                            }))
                          }
                          placeholder={field.placeholder}
                          className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-extrabold text-gray-800 dark:text-gray-200 mb-1.5">
                  Keperluan Penggunaan Surat *
                </label>
                <input
                  type="text"
                  required
                  value={kioskPurpose}
                  onChange={(e) => setKioskPurpose(e.target.value)}
                  placeholder="Contoh: Persyaratan Administrasi Bank / KUA / Disdukcapil / Beasiswa..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-gray-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                <span className="text-[11px] text-gray-500 flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Otomatis menerbitkan Nomor Registrasi & TTE QR-Code Kepala Desa</span>
                </span>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-emerald-600/20 flex items-center space-x-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Terbitkan & Cetak Surat Mandiri Sekarang</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* SUBVIEW: PORTAL CEK MANDIRI WARGA ("CEK NIK SATU PINTU") */}
      {activeSubView === 'cek_nik' && (() => {
        const localPortalResult = lookupCitizenOneStopPortal(portalNik, portalBirthDate, {
          citizens,
          requests,
          agendas,
          siteConfig: siteConfig || ({} as VillageSiteConfig),
        });
        const portalData = portalServerResult || localPortalResult;

        const handleServerLookup = async (e: React.FormEvent) => {
          e.preventDefault();
          setPortalLoading(true);
          try {
            const res = await fetch('/api/public/cek-nik', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ nik: portalNik, birthDate: portalBirthDate }),
            });
            const data = await res.json();
            if (res.ok && data?.found) {
              setPortalServerResult(data);
            } else {
              setPortalServerResult({
                found: false,
                errorMessage: data?.error || 'Data warga tidak ditemukan.',
                familyMembers: [],
                letterRequests: [],
                posyanduRecords: [],
                dusunAgendas: [],
              });
            }
          } catch {
            setPortalServerResult(localPortalResult);
          } finally {
            setPortalLoading(false);
          }
        };

        return (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border-2 border-emerald-500/40 shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-slate-700 pb-5">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Layanan Terpadu Satu Pintu Berbasis Database Server
                </span>
                <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">
                  Portal Cek Mandiri Warga ("Cek NIK Satu Pintu") {villageName}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Masukkan <strong>16 Digit NIK</strong> dan <strong>Tanggal Lahir</strong> untuk mengecek status permohonan surat, kepesertaan Bantuan Sosial (DTKS), lokasi TPS / Hak Pilih, serta jadwal Posyandu & kegiatan di Dusun Anda.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {citizens.slice(0, 4).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setPortalNik(c.nik);
                      setPortalBirthDate(c.birthDate);
                      setPortalServerResult(null);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      portalNik === c.nik
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-emerald-50 dark:bg-slate-900 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-slate-700'
                    }`}
                  >
                    Warga: {c.name.split(' ')[0]} ({c.dusun.split(' ').slice(0, 2).join(' ')})
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleServerLookup} className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="sm:col-span-5">
                <label className="block text-[11px] font-extrabold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Nomor Induk Kependudukan (16 Digit NIK) *
                </label>
                <input
                  type="text"
                  maxLength={16}
                  required
                  value={portalNik}
                  onChange={(e) => {
                    setPortalNik(e.target.value);
                    setPortalServerResult(null);
                  }}
                  placeholder="Contoh: 3201141205820001"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold"
                />
              </div>
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-extrabold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Tanggal Lahir (Verifikasi Privasi)
                </label>
                <input
                  type="date"
                  value={portalBirthDate}
                  onChange={(e) => {
                    setPortalBirthDate(e.target.value);
                    setPortalServerResult(null);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                />
              </div>
              <div className="sm:col-span-3 flex items-end">
                <button
                  type="submit"
                  disabled={portalLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  <span>{portalLoading ? 'Mengecek Server...' : 'Cek Data Satu Pintu'}</span>
                </button>
              </div>
            </form>

            {!portalData.found || !portalData.citizen ? (
              <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 text-center space-y-1">
                <p className="text-sm font-extrabold text-rose-800 dark:text-rose-200">
                  {portalData.errorMessage || 'Data NIK tidak ditemukan.'}
                </p>
                <p className="text-xs text-rose-600 dark:text-rose-300">
                  Pastikan 16 digit NIK dan Tanggal Lahir sesuai dengan KTP-el / Kartu Keluarga yang terdaftar di Buku Induk Penduduk.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Profil Warga & Silsilah Kartu Keluarga (KK) */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2.5">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      1. Biodata & Silsilah Kartu Keluarga (No. KK: {portalData.citizen.kk})
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      {portalData.familyMembers.length} Anggota KK
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500 block">Nama Lengkap:</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">
                        {portalData.citizen.name}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Hubungan dalam KK:</span>
                      <span className="font-bold text-emerald-700">
                        {portalData.citizen.familyRole || 'Kepala Keluarga'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Domisili Dusun:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {portalData.citizen.dusun} (RT {portalData.citizen.rt}/RW {portalData.citizen.rw})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Pekerjaan / Usia:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {portalData.citizen.occupation} ({portalData.citizen.age} Thn)
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-200/70 space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-500 block">
                      Daftar Anggota Keluarga Satu KK:
                    </span>
                    {portalData.familyMembers.map((fm) => (
                      <div
                        key={fm.id}
                        className="flex items-center justify-between text-xs bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700"
                      >
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white">{fm.name}</span>
                          <span className="text-[11px] text-slate-500 ml-1.5">
                            ({fm.familyRole || 'Anggota'} • {fm.age} Thn)
                          </span>
                        </div>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800">
                          {fm.aidStatus}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Status Penerima Bantuan Sosial (DTKS) */}
                <div className="p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2.5">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                      <Award className="w-4 h-4" />
                      2. Status Kepesertaan Bantuan Sosial & DTKS
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                        portalData.citizen.aidStatus !== 'Non-Penerima'
                          ? 'bg-emerald-700 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {portalData.citizen.aidStatus}
                    </span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                      {portalData.citizen.aidStatus !== 'Non-Penerima' ? (
                        <>
                          Warga terdaftar sebagai Keluarga Penerima Manfaat (KPM) program{' '}
                          <strong>{portalData.citizen.aidStatus}</strong> berdasarkan Berita Acara Musdessus.
                        </>
                      ) : (
                        <>
                          NIK ini tercatat sebagai <strong>Non-Penerima</strong> bantuan langsung individu, namun dapat mengecek kepesertaan anggota KK lainnya di bawah.
                        </>
                      )}
                    </p>
                    {portalData.citizen.aidStage && (
                      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-emerald-200 flex items-center justify-between">
                        <div>
                          <span className="text-[11px] text-slate-500 block">Tahap Penyaluran Aktif:</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {portalData.citizen.aidStage}
                          </span>
                        </div>
                        {portalData.citizen.aidAmount ? (
                          <div className="text-right">
                            <span className="text-[11px] text-slate-500 block">Nominal Bantuan:</span>
                            <span className="font-mono font-extrabold text-emerald-700">
                              Rp {portalData.citizen.aidAmount.toLocaleString('id-ID')}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Status Permohonan Surat Warga */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4" />
                      3. Riwayat & Status Permohonan Surat ({portalData.letterRequests.length})
                    </span>
                  </div>
                  {portalData.letterRequests.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      Belum ada riwayat pengajuan surat untuk NIK/KK ini.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {portalData.letterRequests.map((req) => (
                        <div
                          key={req.id}
                          className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-emerald-700">
                                {req.trackingCode}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                {req.status}
                              </span>
                            </div>
                            <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                              {req.letterTitle} ({req.citizenName})
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {req.status === 'Selesai' && (
                              <button
                                type="button"
                                onClick={() => onPreviewOfficialLetter(req)}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-bold"
                              >
                                Cetak PDF
                              </button>
                            )}
                            {onOpenQrVerifyModal && (
                              <button
                                type="button"
                                onClick={() => onOpenQrVerifyModal(req)}
                                className="px-2.5 py-1.5 rounded-lg border border-emerald-600 text-emerald-700 text-[11px] font-bold"
                              >
                                Cek TTE
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. Informasi TPS Hak Pilih, Posyandu & Kegiatan Dusun */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                      <Vote className="w-4 h-4" />
                      4. Informasi TPS Hak Pilih, Posyandu & Jadwal Dusun
                    </span>
                  </div>
                  <div className="space-y-2.5 text-xs">
                    {portalData.tpsInfo && (
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-emerald-800">
                            Lokasi Hak Pilih: {portalData.tpsInfo.tpsNumber}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            DPT: {portalData.tpsInfo.voterCount} Pemilih
                          </span>
                        </div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                          {portalData.tpsInfo.locationName} ({portalData.tpsInfo.rtRwScope})
                        </p>
                      </div>
                    )}

                    {portalData.posyanduSchedule && (
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200">
                        <span className="font-extrabold text-teal-800 block">
                          {portalData.posyanduSchedule.posyanduName} — {portalData.posyanduSchedule.scheduleDay}
                        </span>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Lokasi: {portalData.posyanduSchedule.location} • Bidan: {portalData.posyanduSchedule.midwifeName} • Menu PMT: {portalData.posyanduSchedule.pmtMenu}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* SUBVIEW 3: CEK TRANSPARANSI PENERIMA BANTUAN SOSIAL (BANSOS DTKS / BLT-DD / PKH / BEASISWA / RUTILAHU) */}
      {activeSubView === 'bansos' && (() => {
        const cleanNik = bansosNikInput.replace(/\D/g, '').trim();
        const matchedBansosCitizen =
          cleanNik.length === 16 ? citizens.find((c) => c.nik === cleanNik) || null : null;
        const householdMembers = matchedBansosCitizen
          ? citizens.filter((c) => c.kk === matchedBansosCitizen.kk)
          : [];
        const householdRecipients = householdMembers.filter((m) => m.aidStatus !== 'Non-Penerima');

        return (
          <div className="space-y-6">
            {/* KARTU UTAMA: CEK STATUS KEPESERTAAN BANSOS MANDIRI VIA 16 DIGIT NIK (AMAN & PRIVASI TERLINDUNGI) */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border-2 border-emerald-500/40 shadow-xl space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-slate-700 pb-5">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                    Verifikasi Kepesertaan Bantuan Sosial Desa Secara Aman (Privasi Terlindungi)
                  </span>
                  <h2 className="text-xl font-extrabold text-gray-900 dark:text-white mt-0.5">
                    Cek Bansos Mandiri via NIK — {villageName}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Masukkan <strong>16 Digit NIK</strong> Anda untuk mengecek status kepesertaan pada program bantuan sosial desa (BLT Dana Desa, PKH, BPNT, BPJS PBI, Beasiswa Desa, Rutilahu) beserta rincian tahap pencairan dan status satu Kartu Keluarga (KK) secara aman.
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {citizens.slice(0, 4).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setBansosNikInput(c.nik);
                        setBansosNikChecked(true);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        bansosNikInput === c.nik
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-emerald-50 dark:bg-slate-900 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-slate-700'
                      }`}
                    >
                      Contoh NIK: {c.name.split(' ')[0]} ({c.aidStatus})
                    </button>
                  ))}
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setBansosNikChecked(true);
                }}
                className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700"
              >
                <div className="sm:col-span-9">
                  <label className="block text-[11px] font-extrabold uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Masukkan 16 Digit Nomor Induk Kependudukan (NIK KTP-el / KIA) *
                  </label>
                  <input
                    type="text"
                    maxLength={16}
                    required
                    value={bansosNikInput}
                    onChange={(e) => {
                      setBansosNikInput(e.target.value);
                      setBansosNikChecked(true);
                    }}
                    placeholder="Ketik 16 digit NIK Anda (contoh: 3201141205820001)..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div className="sm:col-span-3 flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                  >
                    <Search className="w-4 h-4" />
                    <span>Cek Status Bansos</span>
                  </button>
                </div>
              </form>

              {bansosNikChecked && (
                <div>
                  {cleanNik.length !== 16 ? (
                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-xs text-amber-800 dark:text-amber-200 font-semibold">
                      Silakan masukkan tepat <strong>16 digit angka NIK</strong> sesuai KTP-el atau Kartu Keluarga untuk melihat status kepesertaan bantuan sosial Anda secara aman.
                    </div>
                  ) : !matchedBansosCitizen ? (
                    <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-center space-y-1">
                      <p className="text-sm font-extrabold text-rose-800 dark:text-rose-200">
                        NIK {cleanNik} Tidak Ditemukan dalam Database Kependudukan & DTKS Desa
                      </p>
                      <p className="text-xs text-rose-600 dark:text-rose-300">
                        Pastikan 16 digit NIK yang dimasukkan sudah benar atau hubungi Operator SID / Kasi Kesejahteraan di Balai Desa untuk pemutakhiran data DTKS.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                      {/* Status Individu */}
                      <div
                        className={`lg:col-span-7 p-5 rounded-2xl border space-y-4 ${
                          matchedBansosCitizen.aidStatus !== 'Non-Penerima'
                            ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/70 dark:border-slate-700 pb-3">
                          <div>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                              Hasil Verifikasi NIK Terenkripsi
                            </span>
                            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                              {matchedBansosCitizen.name} ({matchedBansosCitizen.familyRole || 'Kepala Keluarga'})
                            </h3>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                              matchedBansosCitizen.aidStatus !== 'Non-Penerima'
                                ? 'bg-emerald-700 text-white shadow-sm'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                            }`}
                          >
                            {matchedBansosCitizen.aidStatus !== 'Non-Penerima'
                              ? `TERDAFTAR: ${matchedBansosCitizen.aidStatus}`
                              : 'NON-PENERIMA INDIVIDU'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                          <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700">
                            <span className="text-[11px] text-slate-500 block">NIK Terverifikasi</span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              {matchedBansosCitizen.nik}
                            </span>
                          </div>
                          <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700">
                            <span className="text-[11px] text-slate-500 block">No. KK (Disamarkan)</span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              {maskSensitiveNumber(matchedBansosCitizen.kk, false)}
                            </span>
                          </div>
                          <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700">
                            <span className="text-[11px] text-slate-500 block">Wilayah Domisili</span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {matchedBansosCitizen.dusun} (RT {matchedBansosCitizen.rt}/{matchedBansosCitizen.rw})
                            </span>
                          </div>
                        </div>

                        {matchedBansosCitizen.aidStatus !== 'Non-Penerima' ? (
                          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <span className="text-[11px] text-slate-500 block">
                                Program & Tahap Pencairan Aktif:
                              </span>
                              <p className="text-sm font-extrabold text-emerald-800 dark:text-emerald-300">
                                {matchedBansosCitizen.aidStatus} —{' '}
                                {matchedBansosCitizen.aidStage || 'Tahap Berjalan 2026'}
                              </p>
                              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Tervalidasi Berita Acara Musyawarah Desa Khusus (Musdessus DTKS)
                              </span>
                            </div>
                            {matchedBansosCitizen.aidAmount ? (
                              <div className="sm:text-right shrink-0 bg-emerald-50 dark:bg-emerald-950/60 px-3.5 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800">
                                <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300 block">
                                  Nominal Bantuan
                                </span>
                                <span className="text-base font-mono font-extrabold text-emerald-800 dark:text-emerald-300">
                                  Rp {matchedBansosCitizen.aidAmount.toLocaleString('id-ID')}
                                </span>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                            NIK atas nama <strong>{matchedBansosCitizen.name}</strong> saat ini tercatat sebagai{' '}
                            <strong>Non-Penerima</strong> bantuan langsung individu. Lihat panel di samping untuk mengecek apakah ada anggota keluarga lain dalam satu Kartu Keluarga (KK) yang menerima bantuan.
                          </div>
                        )}
                      </div>

                      {/* Status Satu Kartu Keluarga (KK) */}
                      <div className="lg:col-span-5 p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2.5">
                          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                            Status Kepesertaan Satu KK ({householdMembers.length} Anggota)
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                            {householdRecipients.length} Penerima Aktif di KK Ini
                          </span>
                        </div>
                        <div className="space-y-2">
                          {householdMembers.map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                            >
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white">
                                  {member.name}
                                </p>
                                <p className="text-[11px] text-slate-500">
                                  {member.familyRole || 'Anggota KK'} • NIK:{' '}
                                  {maskSensitiveNumber(member.nik, member.nik === cleanNik)}
                                </p>
                              </div>
                              <div className="text-right">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    member.aidStatus !== 'Non-Penerima'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {member.aidStatus}
                                </span>
                                {member.aidAmount ? (
                                  <p className="font-mono text-[10px] font-bold text-emerald-700 mt-0.5">
                                    Rp {member.aidAmount.toLocaleString('id-ID')}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* TABEL TRANSPARANSI PUBLIK DTKS DESA (NIK DISAMARKAN DEMI KEAMANAN PRIVASI) */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-slate-700 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Keterbukaan Data Terpadu Kesejahteraan Sosial (DTKS Desa)
                  </span>
                  <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">
                    Daftar Transparansi Keluarga Penerima Manfaat (KPM) Bantuan Sosial {villageName}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Demi keamanan privasi warga, 6 digit tengah NIK pada daftar publik di bawah ini disamarkan secara otomatis kecuali Anda mengetikkan 16 digit NIK lengkap Anda pada kolom filter.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    'SEMUA',
                    ...(siteConfig?.aidPrograms && siteConfig.aidPrograms.length > 0
                      ? siteConfig.aidPrograms
                      : ['BLT Dana Desa', 'PKH', 'BPNT', 'BPJS PBI', 'Beasiswa Desa', 'Rutilahu']),
                    'SEMUA_WARGA',
                  ].map((prog) => (
                    <button
                      key={prog}
                      onClick={() => setBansosProgramFilter(prog)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                        bansosProgramFilter === prog
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-100 dark:bg-slate-900 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                      }`}
                    >
                      {prog === 'SEMUA'
                        ? 'Semua Penerima Bansos'
                        : prog === 'SEMUA_WARGA'
                        ? 'Seluruh Warga'
                        : prog}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={bansosSearch}
                  onChange={(e) => setBansosSearch(e.target.value)}
                  placeholder="Filter daftar penerima berdasarkan 16 Digit NIK, Nama Warga, atau Dusun..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-xs text-gray-900 dark:text-white"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-slate-700 text-gray-500 uppercase text-[11px]">
                      <th className="py-3 px-3">Nama Warga & Peran KK</th>
                      <th className="py-3 px-3">NIK (Disamarkan Privasi)</th>
                      <th className="py-3 px-3">Wilayah Dusun / RT-RW</th>
                      <th className="py-3 px-3">Program Bantuan Sosial</th>
                      <th className="py-3 px-3">Tahap & Nominal Bantuan</th>
                      <th className="py-3 px-3">Status Verifikasi Musdessus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
                    {bansosCitizens.map((c) => {
                      const isExactNikMatch =
                        bansosSearch.trim() === c.nik || cleanNik === c.nik;
                      return (
                        <tr key={c.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-700/30">
                          <td className="py-3 px-3">
                            <p className="font-bold text-gray-900 dark:text-white">{c.name}</p>
                            <p className="text-[11px] text-gray-500">
                              {c.familyRole || 'Kepala Keluarga'} • {c.occupation} ({c.age} Thn)
                            </p>
                          </td>
                          <td className="py-3 px-3 font-mono text-gray-600 dark:text-gray-300">
                            {maskSensitiveNumber(c.nik, isExactNikMatch)}
                          </td>
                          <td className="py-3 px-3">
                            {c.dusun} (RT {c.rt}/{c.rw})
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                c.aidStatus === 'Non-Penerima'
                                  ? 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'
                                  : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                              }`}
                            >
                              {c.aidStatus}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <p className="font-semibold text-gray-800 dark:text-gray-200">
                              {c.aidStage || (c.aidStatus !== 'Non-Penerima' ? 'Tahap Aktif 2026' : '-')}
                            </p>
                            {c.aidAmount ? (
                              <p className="font-mono text-[11px] text-emerald-700 font-bold">
                                Rp {c.aidAmount.toLocaleString('id-ID')}
                              </p>
                            ) : null}
                          </td>
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center space-x-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                              <Award className="w-3.5 h-3.5" />
                              <span>Tervalidasi Berita Acara Musdessus</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* SUBVIEW: POSYANDU, KESEHATAN IBU HAMIL/BALITA & PENCEGAHAN STUNTING DESA */}
      {activeSubView === 'posyandu' && (() => {
        const schedules = siteConfig?.posyanduSchedules || [];
        const records = siteConfig?.posyanduRecords || [];
        const stuntingMetrics = computePosyanduStuntingMetrics(
          records,
          schedules,
          siteConfig?.stuntingTargetPercent || 4.5
        );

        return (
          <div className="space-y-6">
            {/* Ringkasan Indikator Stunting & Kesehatan Desa */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-slate-700 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Program Prioritas Nasional Percepatan Penurunan Stunting Desa
                  </span>
                  <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">
                    Layanan Posyandu, Tumbuh Kembang Balita & Kesehatan Ibu Hamil {villageName}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Jadwal penimbangan bulanan per Dusun, pemberian Makanan Tambahan (PMT) protein hewani, serta grafik pemantauan gizi balita.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-slate-900 border border-emerald-200">
                  <span className="text-xs text-slate-600">Posyandu Aktif & Kader</span>
                  <p className="text-2xl font-extrabold text-emerald-800 mt-1">
                    {stuntingMetrics.totalPosyanduUnits} Posyandu
                  </p>
                  <span className="text-[11px] text-emerald-700 font-semibold">
                    {stuntingMetrics.totalCadres} Kader Kesehatan Terlatih
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-slate-900 border border-emerald-200">
                  <span className="text-xs text-slate-600">Sasaran Balita & Ibu Hamil</span>
                  <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                    {stuntingMetrics.totalRegisteredBalita} Balita
                  </p>
                  <span className="text-[11px] text-emerald-700 font-semibold">
                    {stuntingMetrics.totalRegisteredBumil} Ibu Hamil Terpantau Bidan Desa
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-slate-900 border border-amber-200">
                  <span className="text-xs text-slate-600">Prevalensi & Intervensi Stunting</span>
                  <p className="text-2xl font-extrabold text-amber-800 mt-1">
                    {stuntingMetrics.stuntingPrevalencePercent}% ({stuntingMetrics.stuntingCaseCount} Anak)
                  </p>
                  <span className="text-[11px] text-amber-700 font-semibold">
                    Target Desa Mandiri: &lt; {stuntingMetrics.targetPercent}%
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-teal-50 dark:bg-slate-900 border border-teal-200">
                  <span className="text-xs text-slate-600">Cakupan PMT & Vitamin A</span>
                  <p className="text-2xl font-extrabold text-teal-800 mt-1">
                    {stuntingMetrics.pmtCoveragePercent}% Terdistribusi
                  </p>
                  <span className="text-[11px] text-teal-700 font-semibold">
                    Vitamin A: {stuntingMetrics.vitaminACoveragePercent}% Balita
                  </span>
                </div>
              </div>

              {/* Jadwal Posyandu Per Dusun */}
              <div className="space-y-3">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Jadwal Pelayanan Posyandu Rutin per Dusun ({schedules.length} Posyandu)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {schedules.map((pos) => (
                    <div
                      key={pos.id}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          {pos.dusun}
                        </span>
                        <span className="font-mono text-[11px] text-emerald-700 font-bold">
                          Berikutnya: {pos.nextDate}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {pos.posyanduName}
                      </h4>
                      <p className="text-slate-600 dark:text-slate-300">
                        Jadwal: <strong>{pos.scheduleDay}</strong>
                      </p>
                      <p className="text-slate-600 dark:text-slate-300">
                        Lokasi: {pos.location} • Bidan: {pos.midwifeName}
                      </p>
                      <div className="pt-2 border-t border-slate-200 text-[11px] text-emerald-800 font-semibold">
                        Menu PMT: {pos.pmtMenu}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Grafik & Register Pemantauan Tumbuh Kembang Balita / Ibu Hamil */}
              <div className="space-y-3">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Register Pemantauan Tumbuh Kembang Balita & Kesehatan Ibu Hamil ({records.length} Catatan)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 uppercase text-[11px]">
                        <th className="py-2.5 px-3">Nama Balita / Ibu Hamil</th>
                        <th className="py-2.5 px-3">Kategori & Usia</th>
                        <th className="py-2.5 px-3">Dusun</th>
                        <th className="py-2.5 px-3">BB / TB</th>
                        <th className="py-2.5 px-3">Status Gizi / Stunting</th>
                        <th className="py-2.5 px-3">Imunisasi & Intervensi PMT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {records.map((rec) => (
                        <tr key={rec.id}>
                          <td className="py-2.5 px-3">
                            <p className="font-bold text-slate-900 dark:text-white">
                              {rec.childOrMotherName}
                            </p>
                            <p className="text-[11px] text-slate-500">Orang Tua/Suami: {rec.parentName}</p>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold">{rec.category}</span> • {rec.ageMonths} Bln
                          </td>
                          <td className="py-2.5 px-3">{rec.dusun}</td>
                          <td className="py-2.5 px-3 font-mono font-bold">
                            {rec.weightKg} kg / {rec.heightCm} cm
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                rec.nutritionalStatus === 'Gizi Baik (Normal)'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {rec.nutritionalStatus}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <p className="font-semibold text-slate-800">{rec.immunizationStatus}</p>
                            <p className="text-[11px] text-slate-500">{rec.notes}</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* SUBVIEW 4: BUKU ADMINISTRASI DESA, JDIH PRODUK HUKUM & INVENTARIS ASET DESA */}
      {activeSubView === 'jdih_aset' && (
        <div className="space-y-8">
          {/* JDIH Produk Hukum Desa */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center space-x-2.5">
              <Scale className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="font-extrabold text-lg text-gray-900 dark:text-white">
                  Jaringan Dokumentasi & Informasi Hukum (JDIH) {villageName} ({regulations.length} Regulasi)
                </h3>
                <p className="text-xs text-gray-500">
                  Buku Peraturan di Desa (Perdes), Peraturan Kepala Desa (Perkades), dan Keputusan Kepala Desa (SK Kades).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {regulations.map((reg) => (
                <div
                  key={reg.id}
                  className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="px-2.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                        {reg.category}
                      </span>
                      <span className="font-mono text-gray-500">{reg.number}</span>
                    </div>
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white mt-2">
                      {reg.title}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{reg.summary}</p>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-500 pt-2 border-t border-gray-200/70 dark:border-slate-800">
                    <span>Ditetapkan: {reg.dateIssued || reg.year}</span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                      Ukuran: {reg.fileSize} • {reg.downloadCount} Unduhan
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Buku Inventaris & Kekayaan / Tanah Kas Desa */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center space-x-2.5">
              <Landmark className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="font-extrabold text-lg text-gray-900 dark:text-white">
                  Buku Inventaris Kekayaan & Tanah Kas Desa (TKD) ({villageAssets.length} Aset)
                </h3>
                <p className="text-xs text-gray-500">
                  Publikasi transparansi aset desa sesuai Permendagri No. 47 Tahun 2016 & Permendagri No. 1 Tahun 2016 tentang Pengelolaan Aset Desa.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700 text-gray-500 uppercase text-[11px]">
                    <th className="py-3 px-3">Kode & Nama Aset Desa</th>
                    <th className="py-3 px-3">Kategori</th>
                    <th className="py-3 px-3">Volume & Lokasi</th>
                    <th className="py-3 px-3">Tahun / Sumber Dana</th>
                    <th className="py-3 px-3">Nilai Aset</th>
                    <th className="py-3 px-3">Kondisi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
                  {villageAssets.map((ast) => (
                    <tr key={ast.id}>
                      <td className="py-3 px-3">
                        <p className="font-mono text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
                          {ast.assetCode}
                        </p>
                        <p className="font-bold text-gray-900 dark:text-white">{ast.name}</p>
                      </td>
                      <td className="py-3 px-3">{ast.category}</td>
                      <td className="py-3 px-3">
                        <p className="font-semibold">{ast.quantityLabel}</p>
                        <p className="text-[11px] text-gray-500">{ast.location}</p>
                      </td>
                      <td className="py-3 px-3">
                        {ast.acquisitionYear} • {ast.sourceFund}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        Rp {ast.valueRupiah.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-[11px]">
                          {ast.condition}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ringkasan Buku Agenda Surat Masuk/Keluar & Mutasi Penduduk */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm space-y-3">
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                  Buku Agenda Surat Masuk & Keluar ({incomingOutboxLetters.length})
                </h3>
              </div>
              <div className="space-y-2.5">
                {incomingOutboxLetters.map((ml) => (
                  <div
                    key={ml.id}
                    className="p-3 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ml.bookType === 'SURAT_MASUK'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {ml.bookType === 'SURAT_MASUK' ? 'SURAT MASUK' : 'SURAT KELUAR'} •{' '}
                        {ml.agendaNumber}
                      </span>
                      <span className="font-mono text-[11px] text-gray-500">{ml.letterDate}</span>
                    </div>
                    <p className="font-bold text-gray-900 dark:text-white">{ml.subject}</p>
                    <p className="text-[11px] text-gray-500">
                      Instansi: {ml.senderOrRecipient} • Disposisi: {ml.dispositionTo || '-'} (
                      {ml.dispositionStatus || 'Terarsip'})
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm space-y-3">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                  Buku Mutasi Penduduk Desa ({populationMutations.length})
                </h3>
              </div>
              <div className="space-y-2.5">
                {populationMutations.map((mut) => (
                  <div
                    key={mut.id}
                    className="p-3 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                        {mut.mutationType}
                      </span>
                      <span className="font-mono text-[11px] text-gray-500">{mut.date}</span>
                    </div>
                    <p className="font-bold text-gray-900 dark:text-white">
                      {mut.citizenName} ({maskSensitiveNumber(mut.nik, false)})
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {mut.dusun} ({mut.rtRw}) • {mut.notes}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

