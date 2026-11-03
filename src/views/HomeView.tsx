import React from 'react';
import {
  ArrowRight,
  Award,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck2,
  FileText,
  HardHat,
  Landmark,
  MapPin,
  MessageSquare,
  PhoneCall,
  QrCode,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  Vote,
  Wallet,
} from 'lucide-react';
import {
  ApbdesItem,
  Citizen,
  GalleryItem,
  LetterRequest,
  LetterTypeCode,
  LetterTypeInfo,
  MarketProduct,
  VillageAgenda,
  VillageNews,
  VillagePotential,
  VillageProject,
  VillageSiteConfig,
} from '../types/village';
import { SupportedLanguage, TRANSLATIONS } from '../utils/i18n';
import {
  computeDemographicSummary,
  computeDocumentAnalytics,
  lookupCitizenOneStopPortal,
} from '../utils/villageLogic';
import { NavTab } from '../components/Navbar';

const FALLBACK_SVG_URI = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500"><rect width="800" height="500" fill="#064e3b"/><circle cx="650" cy="120" r="70" fill="#fbbf24" fill-opacity="0.7"/><text x="50" y="420" font-family="Arial, sans-serif" font-weight="bold" font-size="28" fill="#ffffff">Dokumentasi Desa</text></svg>`
)}`;

interface HomeViewProps {
  lang: SupportedLanguage;
  citizens: Citizen[];
  requests: LetterRequest[];
  news: VillageNews[];
  gallery: GalleryItem[];
  products: MarketProduct[];
  agendas: VillageAgenda[];
  apbdes: ApbdesItem[];
  potentials: VillagePotential[];
  projects: VillageProject[];
  letterTypes?: LetterTypeInfo[];
  siteConfig: VillageSiteConfig;
  onSelectTab: (tab: NavTab) => void;
  onOpenLetterModal: (type?: LetterTypeCode) => void;
  onOpenTrackModal: () => void;
  onOpenQrVerifyModal?: (request?: LetterRequest) => void;
  onPreviewOfficialLetter?: (request: LetterRequest) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  lang,
  citizens,
  requests,
  news,
  gallery,
  products,
  agendas,
  apbdes,
  potentials,
  projects,
  letterTypes = [],
  siteConfig,
  onSelectTab,
  onOpenLetterModal,
  onOpenTrackModal,
  onOpenQrVerifyModal,
  onPreviewOfficialLetter,
}) => {
  const t = TRANSLATIONS[lang];
  const demo = computeDemographicSummary(citizens);
  const docMetrics = computeDocumentAnalytics(requests);
  const currentYear = new Date().getFullYear();

  const [homeNik, setHomeNik] = React.useState(citizens[0]?.nik || '3201141205820001');
  const [homeBirthDate, setHomeBirthDate] = React.useState(citizens[0]?.birthDate || '1982-05-12');
  const [showHomePortalResult, setShowHomePortalResult] = React.useState(false);

  const homePortalResult = React.useMemo(
    () =>
      lookupCitizenOneStopPortal(homeNik, homeBirthDate, {
        citizens,
        requests,
        agendas,
        siteConfig,
      }),
    [homeNik, homeBirthDate, citizens, requests, agendas, siteConfig]
  );

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    if (target.src !== FALLBACK_SVG_URI) {
      target.src = FALLBACK_SVG_URI;
    }
  };

  // Calculate APBDes summary
  const pendapatanItems = apbdes.filter((i) => i.category === 'Pendapatan');
  const belanjaItems = apbdes.filter((i) => i.category === 'Belanja');
  const totalPendapatanAnggaran = pendapatanItems.reduce((acc, cur) => acc + cur.anggaran, 0);
  const totalPendapatanRealisasi = pendapatanItems.reduce((acc, cur) => acc + cur.realisasi, 0);
  const totalBelanjaAnggaran = belanjaItems.reduce((acc, cur) => acc + cur.anggaran, 0);
  const totalBelanjaRealisasi = belanjaItems.reduce((acc, cur) => acc + cur.realisasi, 0);
  const serapanPersen =
    totalBelanjaAnggaran > 0
      ? Math.round((totalBelanjaRealisasi / totalBelanjaAnggaran) * 100)
      : 94;

  const formatRupiah = (num: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);

  const quickServices: {
    code: LetterTypeCode;
    title: string;
    desc: string;
    sla: string;
  }[] =
    letterTypes.length > 0
      ? letterTypes.slice(0, 4).map((lt) => ({
          code: lt.code,
          title: lt.name,
          desc: lt.shortDesc,
          sla: `Selesai ~${lt.estimatedHours} Jam`,
        }))
      : [
          {
            code: 'SKU',
            title: 'Surat Keterangan Usaha (SKU)',
            desc: 'Pengajuan modal KUR Bank & izin usaha mikro UMKM warga.',
            sla: 'Selesai ~2 Jam',
          },
          {
            code: 'SKTM',
            title: 'Surat Keterangan Tidak Mampu',
            desc: 'Pengantar beasiswa sekolah, KIP, dan keringanan layanan medis.',
            sla: 'Selesai ~2 Jam',
          },
          {
            code: 'DOMISILI',
            title: 'Surat Keterangan Domisili',
            desc: 'Bukti tempat tinggal resmi warga & domisili lembaga desa.',
            sla: 'Selesai ~1.5 Jam',
          },
          {
            code: 'SKCK',
            title: 'Surat Pengantar SKCK',
            desc: 'Pengantar resmi desa untuk penerbitan SKCK di Kepolisian.',
            sla: 'Selesai ~1.5 Jam',
          },
        ];

  const upcomingAgendas = agendas
    .filter((a) => a.status !== 'Selesai')
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  return (
    <div className="space-y-14">
      {/* Hero Section */}
      <section className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 text-white shadow-2xl border border-emerald-800/60">
        <div
          className="absolute inset-0 opacity-25 bg-cover bg-center mix-blend-overlay transition-all duration-700"
          style={{
            backgroundImage: `url('${siteConfig.heroImageUrl || FALLBACK_SVG_URI}')`,
          }}
        />
        <div className="relative max-w-7xl mx-auto px-6 py-12 sm:px-10 sm:py-16 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{siteConfig.heroBadge || t.hero.badge}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
              {siteConfig.heroTitle || t.hero.title}
            </h1>

            <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed max-w-2xl pr-0 sm:pr-12">
              {siteConfig.heroSubtitle || t.hero.subtitle}
            </p>

            {/* Primary CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => onOpenLetterModal('SKU')}
                className="inline-flex items-center space-x-2 px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg shadow-amber-400/20 transition-all cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>{t.hero.ctaLetter}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onOpenTrackModal}
                className="inline-flex items-center space-x-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs sm:text-sm backdrop-blur-sm transition-all cursor-pointer"
              >
                <FileCheck2 className="w-4 h-4 text-emerald-300" />
                <span>{t.hero.ctaTrack}</span>
              </button>

              <button
                onClick={() => onSelectTab('statistik')}
                className="inline-flex items-center space-x-2 px-4 py-3 rounded-xl bg-emerald-800/70 hover:bg-emerald-800 border border-emerald-600/50 text-emerald-100 font-semibold text-xs sm:text-sm transition-all cursor-pointer"
              >
                <BarChart3 className="w-4 h-4 text-emerald-300" />
                <span>{t.hero.ctaStats}</span>
              </button>

              {onOpenQrVerifyModal && (
                <button
                  onClick={() => onOpenQrVerifyModal()}
                  className="inline-flex items-center space-x-2 px-4 py-3 rounded-xl bg-teal-600/40 hover:bg-teal-600/60 border border-teal-400/40 text-white font-bold text-xs sm:text-sm transition-all cursor-pointer"
                >
                  <QrCode className="w-4 h-4 text-amber-300" />
                  <span>Verifikasi QR TTE</span>
                </button>
              )}
            </div>

            {/* Trust & Security Indicators */}
            <div className="pt-4 border-t border-emerald-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-emerald-200">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{t.hero.dukcapilConnected}</span>
              </div>
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-amber-300 shrink-0" />
                <span>{t.hero.e2eEncrypted}</span>
              </div>
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{t.hero.whatsappActive}</span>
              </div>
            </div>
          </div>

          {/* Right Live Village Summary Card */}
          <div className="lg:col-span-5 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/15 space-y-5">
            <div className="flex items-center justify-between border-b border-white/15 pb-3">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-emerald-300 font-bold">
                  Status Real-Time {siteConfig.villageName}
                </span>
                <h2 className="text-lg font-extrabold text-white">Ringkasan Eksekutif SID</h2>
              </div>
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold">
                <Award className="w-3.5 h-3.5 text-amber-300" />
                <span>{siteConfig.idmStatus}</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-950/40 border border-white/10">
                <div className="flex items-center justify-between text-emerald-300 mb-1">
                  <span className="text-xs font-medium">Populasi Terdaftar</span>
                  <Users className="w-4 h-4" />
                </div>
                <p className="text-2xl font-extrabold text-white">{demo.totalPopulation} Jiwa</p>
                <p className="text-[11px] text-emerald-200/80 mt-0.5">
                  {demo.totalFamilies} KK • {demo.verifiedPercentage}% Terverifikasi
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/40 border border-white/10">
                <div className="flex items-center justify-between text-amber-300 mb-1">
                  <span className="text-xs font-medium">Indeks Desa (IDM)</span>
                  <Award className="w-4 h-4" />
                </div>
                <p className="text-2xl font-extrabold text-white">{siteConfig.idmScore.toFixed(4)}</p>
                <p className="text-[11px] text-emerald-200/80 mt-0.5">
                  SDGs Desa: {siteConfig.sdgsScore} Poin
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/40 border border-white/10">
                <div className="flex items-center justify-between text-emerald-300 mb-1">
                  <span className="text-xs font-medium">Waktu Proses Surat</span>
                  <Clock className="w-4 h-4" />
                </div>
                <p className="text-2xl font-extrabold text-white">
                  {docMetrics.averageProcessingHours} Jam
                </p>
                <p className="text-[11px] text-emerald-200/80 mt-0.5">
                  Kepatuhan SLA: {docMetrics.slaCompliancePercent}%
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/40 border border-white/10">
                <div className="flex items-center justify-between text-emerald-300 mb-1">
                  <span className="text-xs font-medium">Serapan APBDes</span>
                  <Wallet className="w-4 h-4" />
                </div>
                <p className="text-2xl font-extrabold text-white">{serapanPersen}%</p>
                <p className="text-[11px] text-emerald-200/80 mt-0.5">
                  Transparan & Terpublikasi
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-700/60 flex items-center justify-between text-xs">
              <span className="text-emerald-200">Ingin mengelola tampilan & konten desa?</span>
              <button
                onClick={() => onSelectTab('profil')}
                className="font-bold text-amber-300 hover:underline cursor-pointer"
              >
                Lihat Profil Desa →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Portal Cek Mandiri Warga ("Cek NIK Satu Pintu") di Halaman Utama */}
      <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border-2 border-emerald-500/30 shadow-md space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              <UserCheck className="w-4 h-4" />
              <span>Portal Cek Mandiri Warga ("Cek NIK Satu Pintu")</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white">
              Cek Status Surat, Penerima Bansos, Lokasi TPS & Jadwal Posyandu Dusun
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Cukup masukkan 16 digit NIK dan Tanggal Lahir Anda untuk mengakses seluruh informasi layanan warga secara transparan dari database server desa.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {citizens.slice(0, 3).map((cit) => (
              <button
                key={cit.id}
                type="button"
                onClick={() => {
                  setHomeNik(cit.nik);
                  setHomeBirthDate(cit.birthDate || '1982-05-12');
                  setShowHomePortalResult(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-slate-900 border border-emerald-200 dark:border-slate-700 text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 cursor-pointer"
              >
                Coba NIK: {(cit.name || 'Warga').split(' ')[0]} ({cit.aidStatus || 'Non-Penerima'})
              </button>
            ))}
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setShowHomePortalResult(true);
          }}
          className="grid grid-cols-1 sm:grid-cols-12 gap-3"
        >
          <div className="sm:col-span-5">
            <input
              type="text"
              maxLength={16}
              value={homeNik}
              onChange={(e) => setHomeNik(e.target.value)}
              placeholder="Masukkan 16 Digit NIK KTP-el..."
              aria-label="NIK 16 Digit"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono font-bold"
            />
          </div>
          <div className="sm:col-span-4">
            <input
              type="date"
              value={homeBirthDate}
              onChange={(e) => setHomeBirthDate(e.target.value)}
              aria-label="Tanggal Lahir"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
            />
          </div>
          <div className="sm:col-span-3">
            <button
              type="submit"
              className="w-full h-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>Cek NIK Satu Pintu</span>
            </button>
          </div>
        </form>

        {showHomePortalResult && (
          <div className="pt-2">
            {homePortalResult.found && homePortalResult.citizen ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-emerald-50/60 dark:bg-slate-900 p-4 rounded-2xl border border-emerald-200 dark:border-slate-700 text-xs">
                <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-emerald-700">
                    1. Profil & Status Bansos DTKS
                  </span>
                  <p className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {homePortalResult.citizen.name} ({homePortalResult.citizen.familyRole || 'KK'})
                  </p>
                  <p className="text-slate-600 dark:text-slate-300">
                    No. KK: <span className="font-mono">{homePortalResult.citizen.kk}</span> ({homePortalResult.familyMembers.length} Anggota)
                  </p>
                  <div className="pt-1">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[11px]">
                      Bansos: {homePortalResult.citizen.aidStatus}
                    </span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-emerald-700">
                    2. Status Permohonan Surat ({homePortalResult.letterRequests.length})
                  </span>
                  {homePortalResult.letterRequests.length === 0 ? (
                    <p className="text-slate-500">Belum ada permohonan surat aktif.</p>
                  ) : (
                    homePortalResult.letterRequests.slice(0, 2).map((r) => (
                      <div key={r.id} className="flex items-center justify-between pt-1">
                        <div>
                          <span className="font-mono font-bold text-emerald-700 block">
                            {r.trackingCode}
                          </span>
                          <span className="text-[11px] text-slate-600">{r.letterTitle}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            {r.status}
                          </span>
                          {r.status === 'Selesai' && onPreviewOfficialLetter && (
                            <button
                              type="button"
                              onClick={() => onPreviewOfficialLetter(r)}
                              className="px-2 py-0.5 rounded bg-emerald-700 text-white text-[10px] font-bold"
                            >
                              PDF
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-emerald-700 flex items-center gap-1">
                    <Vote className="w-3.5 h-3.5" />
                    3. Lokasi TPS & Posyandu Dusun
                  </span>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {homePortalResult.tpsInfo?.tpsNumber || 'TPS 001'} — {homePortalResult.tpsInfo?.locationName || 'Balai Desa'}
                  </p>
                  {homePortalResult.posyanduSchedule && (
                    <p className="text-[11px] text-teal-800 font-semibold">
                      {homePortalResult.posyanduSchedule.posyanduName}: {homePortalResult.posyanduSchedule.scheduleDay}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700">
                {homePortalResult.errorMessage || 'Data NIK tidak ditemukan.'}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Sambutan Kepala Desa & Indeks Desa Membangun (IDM) */}
      <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-gray-200/80 dark:border-slate-700 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col items-center text-center sm:text-left lg:text-center gap-4 bg-gradient-to-b from-emerald-50 to-teal-50/50 dark:from-slate-900 dark:to-slate-900/60 p-6 rounded-2xl border border-emerald-100 dark:border-slate-700">
            <img
              src={siteConfig.headOfVillagePhotoUrl}
              alt={siteConfig.headOfVillageName}
              onError={handleImgError}
              className="w-28 h-28 rounded-2xl object-cover ring-4 ring-emerald-500/30 shadow-lg shrink-0"
            />
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider">
                Sambutan {siteConfig.headOfVillageTitle}
              </span>
              <h3 className="font-extrabold text-base sm:text-lg text-gray-900 dark:text-white mt-1">
                {siteConfig.headOfVillageName}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                {siteConfig.headOfVillageNip}
              </p>
              <div className="mt-3 flex flex-wrap justify-center sm:justify-start lg:justify-center gap-2 text-[11px]">
                <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-emerald-200 dark:border-slate-700 font-bold text-emerald-700 dark:text-emerald-400">
                  Kode Desa: {siteConfig.villageCode}
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-4">
            <div className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <Landmark className="w-4 h-4" />
              <span>Komitmen Pelayanan Publik & Transparansi Pemerintahan {siteConfig.villageName}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white">
              "{siteConfig.tagline}"
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed italic bg-gray-50 dark:bg-slate-900/60 p-4 rounded-2xl border-l-4 border-emerald-600">
              "{siteConfig.headOfVillageWelcome}"
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-slate-900 border border-emerald-100 dark:border-slate-700">
                <span className="text-[11px] text-gray-500 dark:text-gray-400 block">Status Kemendesa</span>
                <span className="font-extrabold text-sm text-emerald-700 dark:text-emerald-400">
                  {siteConfig.idmStatus}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-slate-900 border border-emerald-100 dark:border-slate-700">
                <span className="text-[11px] text-gray-500 dark:text-gray-400 block">Luas Wilayah</span>
                <span className="font-extrabold text-sm text-gray-900 dark:text-white">
                  {siteConfig.areaSizeKm2}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-slate-900 border border-emerald-100 dark:border-slate-700">
                <span className="text-[11px] text-gray-500 dark:text-gray-400 block">Wilayah Administratif</span>
                <span className="font-extrabold text-sm text-gray-900 dark:text-white">
                  {siteConfig.dusunCount} Dusun • {siteConfig.rwCount} RW • {siteConfig.rtCount} RT
                </span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-slate-900 border border-emerald-100 dark:border-slate-700">
                <span className="text-[11px] text-gray-500 dark:text-gray-400 block">Biaya Layanan Surat</span>
                <span className="font-extrabold text-sm text-emerald-700 dark:text-emerald-400">
                  Rp 0 (100% Gratis)
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Online Letter Services */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Pelayanan Administrasi Digital Terpadu
            </span>
            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">
              Layanan Surat Menyurat Online & Verifikasi Dokumen
            </h2>
          </div>
          <button
            onClick={() => onSelectTab('layanan')}
            className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
          >
            <span>Lihat Semua 8 Jenis Layanan Surat</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickServices.map((srv) => (
            <div
              key={srv.code}
              className="group bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-200/80 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono font-bold text-xs">
                    {srv.code}
                  </span>
                  <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-emerald-600" />
                    <span>{srv.sla}</span>
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-sm group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {srv.title}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  {srv.desc}
                </p>
              </div>

              <button
                onClick={() => onOpenLetterModal(srv.code)}
                className="mt-4 w-full py-2 rounded-xl bg-emerald-50 dark:bg-slate-700/80 group-hover:bg-emerald-600 text-emerald-800 dark:text-emerald-300 group-hover:text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Ajukan Sekarang →
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Transparansi APBDes Real-Time & Jadwal Kegiatan Desa */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* APBDes Transparency Widget */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-gray-200/80 dark:border-slate-700 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-slate-700 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center space-x-1.5">
                <Wallet className="w-4 h-4" />
                <span>Transparansi Keuangan Siskeudes</span>
              </span>
              <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mt-0.5">
                Realisasi APBDes {siteConfig.villageName} TA {currentYear}
              </h3>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-extrabold">
              Serapan Anggaran: {serapanPersen}%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-slate-900 border border-emerald-200/70 dark:border-slate-700">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                Total Pendapatan Desa (Realisasi)
              </span>
              <p className="text-lg sm:text-xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-1">
                {formatRupiah(totalPendapatanRealisasi)}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Target Anggaran: {formatRupiah(totalPendapatanAnggaran)}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-slate-900 border border-amber-200/70 dark:border-slate-700">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                Total Belanja Pembangunan (Realisasi)
              </span>
              <p className="text-lg sm:text-xl font-extrabold text-amber-700 dark:text-amber-400 mt-1">
                {formatRupiah(totalBelanjaRealisasi)}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Pagu Anggaran: {formatRupiah(totalBelanjaAnggaran)}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
              Rincian Pos Pendapatan & Belanja Utama Desa:
            </p>
            {apbdes.slice(0, 5).map((item) => {
              const pct = item.anggaran > 0 ? Math.min(100, Math.round((item.realisasi / item.anggaran) * 100)) : 0;
              return (
                <div key={item.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-800 dark:text-gray-200 truncate pr-2">
                      <span
                        className={`inline-block w-2 h-2 rounded-full mr-1.5 ${
                          item.category === 'Pendapatan' ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                      />
                      {item.subCategory}
                    </span>
                    <span className="font-mono font-bold text-gray-900 dark:text-white shrink-0">
                      {formatRupiah(item.realisasi)} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        item.category === 'Pendapatan' ? 'bg-emerald-600' : 'bg-amber-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Village Agendas (Synced with Admin Calendar) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-gray-200/80 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center space-x-1.5">
                <Calendar className="w-4 h-4" />
                <span>Jadwal Kegiatan & Musyawarah</span>
              </span>
              <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mt-0.5">
                Agenda {siteConfig.villageName} Terdekat
              </h3>
            </div>
          </div>

          <div className="space-y-3">
            {upcomingAgendas.map((ag) => (
              <div
                key={ag.id}
                className="p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-900/70 border border-gray-200/70 dark:border-slate-700 flex items-start space-x-3.5"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex flex-col items-center justify-center shrink-0 font-bold shadow-xs">
                  <span className="text-[10px] uppercase opacity-80">TGL</span>
                  <span className="text-base leading-none">{ag.date.slice(-2)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                      {ag.category}
                    </span>
                    <span className="text-[11px] font-semibold text-gray-500">
                      {ag.startTime} WIB
                    </span>
                  </div>
                  <h4 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white mt-1 line-clamp-1">
                    {ag.title}
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center space-x-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span className="truncate">
                      {ag.location} ({ag.dusun})
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Emergency Hotline Quick Card */}
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-rose-900 dark:text-rose-200">
                  {siteConfig.emergencyContacts.ambulanceName}
                </p>
                <p className="text-xs font-mono font-bold text-rose-700 dark:text-rose-300">
                  {siteConfig.emergencyContacts.ambulancePhone} • Bidan: {siteConfig.emergencyContacts.midwifePhone}
                </p>
              </div>
            </div>
            <button
              onClick={() => onSelectTab('kontak')}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold shrink-0 cursor-pointer"
            >
              Darurat
            </button>
          </div>
        </div>
      </section>

      {/* Public Information & News + Highlighted UMKM Market */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Public Information & Village News */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Keterbukaan Informasi Publik (PPID)
              </span>
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">
                Kabar & Pengumuman Resmi Desa
              </h2>
            </div>
            <button
              onClick={() => onSelectTab('profil')}
              className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              Selengkapnya →
            </button>
          </div>

          <div className="space-y-3">
            {news.map((item) => (
              <article
                key={item.id}
                className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-200/80 dark:border-slate-700 flex flex-col sm:flex-row gap-4 hover:border-emerald-400 transition-colors"
              >
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  onError={handleImgError}
                  className="w-full sm:w-40 h-32 rounded-xl object-cover shrink-0"
                />
                <div className="flex flex-col justify-between flex-1">
                  <div>
                    <div className="flex items-center space-x-2 text-[11px]">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                        {item.category}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-500 dark:text-gray-400">{item.date}</span>
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm mt-1.5 line-clamp-2">
                      {item.title}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                      {item.excerpt || item.summary}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 mt-2 pt-2 border-t border-gray-100 dark:border-slate-700/60">
                    <span>Oleh: {item.author}</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      Baca {item.readTime || '3 Menit'}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* Highlighted Village Market Products */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Ekonomi Kerakyatan BUMDes
              </span>
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">
                Produk Unggulan Lapak Desa
              </h2>
            </div>
            <button
              onClick={() => onSelectTab('lapak')}
              className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              Ke Lapak UMKM →
            </button>
          </div>

          <div className="space-y-3">
            {products.slice(0, 3).map((prod) => (
              <div
                key={prod.id}
                className="bg-white dark:bg-slate-800 rounded-2xl p-3.5 border border-gray-200/80 dark:border-slate-700 flex items-center space-x-3.5 hover:border-emerald-400 transition-colors"
              >
                <img
                  src={prod.imageUrl}
                  alt={prod.name}
                  onError={handleImgError}
                  className="w-20 h-20 rounded-xl object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                    {prod.category}
                  </span>
                  <h4 className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm truncate mt-1">
                    {prod.name}
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                    {prod.sellerName || prod.producerName} • {prod.dusun}
                  </p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="font-extrabold text-sm text-emerald-700 dark:text-emerald-400">
                      Rp {prod.price.toLocaleString('id-ID')}{' '}
                      <span className="text-[10px] font-normal text-gray-500">/ {prod.unit}</span>
                    </span>
                    <button
                      onClick={() => onSelectTab('lapak')}
                      className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Pesan</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* E-Pembangunan (Realisasi Proyek Fisik Desa) */}
      {projects.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center space-x-1.5">
                <HardHat className="w-4 h-4 text-amber-500" />
                <span>Transparansi E-Pembangunan Infrastruktur Desa</span>
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white">
                Progres Fisik & Realisasi Kegiatan Pembangunan
              </h2>
            </div>
            <button
              onClick={() => onSelectTab('profil')}
              className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              Lihat Detail Pembangunan & Potensi →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {projects.slice(0, 3).map((prj) => (
              <div
                key={prj.id}
                className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-gray-200/80 dark:border-slate-700 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={prj.imageUrl}
                      alt={prj.title}
                      onError={handleImgError}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-slate-950/80 text-emerald-300 text-[10px] font-bold backdrop-blur-xs">
                      {prj.sourceFund || prj.fundingSource}
                    </span>
                    <span className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-extrabold shadow">
                      Fisik: {prj.progressPercent}%
                    </span>
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-center space-x-1 text-[11px] text-gray-500 dark:text-gray-400">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{prj.location}</span>
                    </div>
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white leading-snug">
                      {prj.title}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                      {prj.description}
                    </p>
                  </div>
                </div>

                <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Anggaran:</span>
                    <span className="font-mono font-extrabold text-emerald-700 dark:text-emerald-400">
                      {formatRupiah(prj.budget)}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full"
                      style={{ width: `${prj.progressPercent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-gray-500">
                    <span>Pelaksana: {prj.executor}</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                      {prj.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Highlighted Potensi Unggulan Desa */}
      {potentials.length > 0 && (
        <section className="bg-gradient-to-br from-emerald-900 via-emerald-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-emerald-800/80 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center space-x-1.5">
                <TrendingUp className="w-4 h-4" />
                <span>Kekayaan Sumber Daya Alam & Ekonomi Kreatif</span>
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-0.5">
                Potensi Unggulan {siteConfig.villageName}
              </h2>
            </div>
            <button
              onClick={() => onSelectTab('profil')}
              className="text-xs font-bold text-amber-300 hover:underline cursor-pointer self-start sm:self-auto"
            >
              Jelajahi Profil & Potensi Desa →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {potentials.slice(0, 3).map((pot) => (
              <div
                key={pot.id}
                className="rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15 overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <img
                    src={pot.imageUrl}
                    alt={pot.title}
                    onError={handleImgError}
                    className="w-full h-40 object-cover"
                  />
                  <div className="p-4 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-400 text-slate-950">
                      {pot.category}
                    </span>
                    <h3 className="font-bold text-base text-white pt-1">{pot.title}</h3>
                    <p className="text-xs text-emerald-100/85 line-clamp-2 leading-relaxed">
                      {pot.description}
                    </p>
                  </div>
                </div>
                <div className="px-4 py-3 bg-slate-950/40 border-t border-white/10 flex items-center justify-between text-xs">
                  <span className="text-emerald-200 truncate">{pot.location}</span>
                  <span className="font-mono font-bold text-amber-300 shrink-0 ml-2">
                    {pot.economicValue}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Gallery Preview Strip */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Dokumentasi Kegiatan Masyarakat
            </span>
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">
              Galeri Aktivitas & Pembangunan {siteConfig.villageName}
            </h2>
          </div>
          <button
            onClick={() => onSelectTab('galeri')}
            className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
          >
            Lihat Semua Galeri →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {gallery.slice(0, 3).map((g) => (
            <div
              key={g.id}
              onClick={() => onSelectTab('galeri')}
              className="group relative rounded-2xl overflow-hidden h-56 border border-gray-200 dark:border-slate-700 cursor-pointer"
            >
              <img
                src={g.imageUrl}
                alt={g.title}
                onError={handleImgError}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent p-4 flex flex-col justify-end text-white">
                <span className="inline-block w-fit text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-600 mb-1.5">
                  {g.category}
                </span>
                <h4 className="font-bold text-sm leading-snug">{g.title}</h4>
                <p className="text-[11px] text-gray-300 mt-0.5">
                  {g.date} • {g.location}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
