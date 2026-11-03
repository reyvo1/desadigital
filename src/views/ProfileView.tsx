import React, { useState } from 'react';
import {
  Award,
  BookOpen,
  Building2,
  CheckCircle2,
  Compass,
  Download,
  FileSpreadsheet,
  HardHat,
  History,
  Landmark,
  MapPin,
  Phone,
  Scale,
  ShieldCheck,
  Sprout,
  Target,
  Users,
} from 'lucide-react';
import {
  VillageHamlet,
  VillageInstitution,
  VillageOfficial,
  VillagePotential,
  VillageProject,
  VillageRegulation,
  VillageSiteConfig,
} from '../types/village';

const FALLBACK_SVG_URI = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500"><rect width="800" height="500" fill="#064e3b"/><circle cx="650" cy="120" r="70" fill="#fbbf24" fill-opacity="0.7"/><text x="50" y="420" font-family="Arial, sans-serif" font-weight="bold" font-size="28" fill="#ffffff">Profil Pemerintah Desa</text></svg>`
)}`;

interface ProfileViewProps {
  siteConfig: VillageSiteConfig;
  officials: VillageOfficial[];
  regulations: VillageRegulation[];
  potentials: VillagePotential[];
  projects?: VillageProject[];
  institutions: VillageInstitution[];
  hamlets: VillageHamlet[];
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  siteConfig,
  officials,
  regulations,
  potentials,
  projects = [],
  institutions,
  hamlets,
}) => {
  const [selectedRegulationCategory, setSelectedRegulationCategory] = useState<string>('Semua');
  const [downloadedRegId, setDownloadedRegId] = useState<string | null>(null);

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    if (target.src !== FALLBACK_SVG_URI) {
      target.src = FALLBACK_SVG_URI;
    }
  };

  const formatRupiah = (val: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);

  const regulationCategories = Array.from(
    new Set([
      'Semua',
      'Peraturan Desa (Perdes)',
      'Peraturan Kepala Desa (Perkades)',
      'SK Kepala Desa',
      'Dokumen RPJMDes / RKPDes',
      ...regulations.map((r) => r.category),
    ])
  );

  const filteredRegulations =
    selectedRegulationCategory === 'Semua'
      ? regulations
      : regulations.filter((r) => r.category === selectedRegulationCategory);

  const handleDownloadRegulation = (reg: VillageRegulation) => {
    setDownloadedRegId(reg.id);
    const content = [
      `DOKUMEN RESMI PRODUK HUKUM & PPID ${siteConfig.villageName.toUpperCase()}`,
      `====================================================================`,
      `Nomor Dokumen : ${reg.number}`,
      `Judul         : ${reg.title}`,
      `Kategori      : ${reg.category}`,
      `Tanggal Terbit: ${reg.dateIssued || reg.date}`,
      `--------------------------------------------------------------------`,
      `Ringkasan Pokok Materi:`,
      reg.summary,
      ``,
      `Diterbitkan secara resmi oleh Sekretariat Pemerintah ${siteConfig.villageName}`,
      `${siteConfig.subDistrict}, ${siteConfig.district}, ${siteConfig.province}`,
    ].join('\r\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reg.number.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
        <div className="max-w-3xl space-y-3 relative z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/15 text-emerald-200 text-xs font-semibold">
            <Building2 className="w-3.5 h-3.5" />
            <span>Profil Resmi Pemerintahan & Kewilayahan Desa</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Pemerintah {siteConfig.villageName}, {siteConfig.subDistrict}
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
            {siteConfig.tagline} — {siteConfig.district}, Provinsi {siteConfig.province} (Kode Desa Kemendagri: {siteConfig.villageCode}).
          </p>
        </div>
      </div>

      {/*Sambutan Kepala Desa & Indeks Desa Membangun */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-gray-200/80 dark:border-slate-700 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-4 flex flex-col items-center text-center p-5 rounded-2xl bg-emerald-50/70 dark:bg-slate-900 border border-emerald-100 dark:border-slate-700">
          <img
            src={siteConfig.headOfVillagePhotoUrl}
            alt={siteConfig.headOfVillageName}
            onError={handleImgError}
            className="w-32 h-32 rounded-2xl object-cover ring-4 ring-emerald-500/30 shadow-md mb-3"
          />
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold uppercase">
            {siteConfig.headOfVillageTitle}
          </span>
          <h3 className="font-extrabold text-base text-gray-900 dark:text-white mt-1.5">
            {siteConfig.headOfVillageName}
          </h3>
          <p className="text-xs text-gray-500 font-mono">{siteConfig.headOfVillageNip}</p>
        </div>

        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
            <Award className="w-4 h-4" />
            <span>Sambutan Resmi Kepala Desa & Capaian IDM</span>
          </div>
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">
            Mewujudkan Tata Kelola Desa Digital yang Bersih, Melayani, dan Mandiri
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed italic bg-gray-50 dark:bg-slate-900/60 p-4 rounded-2xl border-l-4 border-emerald-600">
            "{siteConfig.headOfVillageWelcome}"
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200/60 dark:border-slate-700">
              <span className="text-[11px] text-gray-500 block">Skor IDM ({siteConfig.idmTargetYear})</span>
              <span className="font-extrabold text-base text-emerald-700 dark:text-emerald-400">
                {siteConfig.idmScore.toFixed(4)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200/60 dark:border-slate-700">
              <span className="text-[11px] text-gray-500 block">Status Desa</span>
              <span className="font-extrabold text-base text-gray-900 dark:text-white">
                {siteConfig.idmStatus}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200/60 dark:border-slate-700">
              <span className="text-[11px] text-gray-500 block">Skor SDGs Desa</span>
              <span className="font-extrabold text-base text-emerald-700 dark:text-emerald-400">
                {siteConfig.sdgsScore} / 100
              </span>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200/60 dark:border-slate-700">
              <span className="text-[11px] text-gray-500 block">Cakupan Wilayah</span>
              <span className="font-extrabold text-base text-gray-900 dark:text-white">
                {siteConfig.dusunCount} Dusun ({siteConfig.rtCount} RT)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Visi, Misi & Sejarah Desa */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200/80 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
            <History className="w-5 h-5" />
            <h2 className="font-extrabold text-lg text-gray-900 dark:text-white">
              Sejarah & Geografis {siteConfig.villageName}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {siteConfig.historyText}
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-slate-900 border border-emerald-100 dark:border-slate-700">
              <span className="text-[11px] text-gray-500 dark:text-gray-400">Luas Wilayah</span>
              <p className="font-extrabold text-sm text-gray-900 dark:text-white mt-0.5">
                {siteConfig.areaSizeKm2}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-slate-900 border border-emerald-100 dark:border-slate-700">
              <span className="text-[11px] text-gray-500 dark:text-gray-400">Ketinggian & Suhu</span>
              <p className="font-extrabold text-sm text-gray-900 dark:text-white mt-0.5">
                {siteConfig.altitudeMdpl} ({siteConfig.avgTempLabel.split(' ')[0]})
              </p>
            </div>
          </div>

          {/* Batas Wilayah */}
          <div className="pt-2 border-t border-gray-100 dark:border-slate-700 space-y-2 text-xs">
            <p className="font-bold text-gray-800 dark:text-gray-200 flex items-center space-x-1.5">
              <Compass className="w-4 h-4 text-emerald-600" />
              <span>Batas Administratif Wilayah Desa:</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-900">
                <span className="text-gray-400 block">Utara:</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{siteConfig.boundaries.north}</span>
              </div>
              <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-900">
                <span className="text-gray-400 block">Selatan:</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{siteConfig.boundaries.south}</span>
              </div>
              <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-900">
                <span className="text-gray-400 block">Timur:</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{siteConfig.boundaries.east}</span>
              </div>
              <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-900">
                <span className="text-gray-400 block">Barat:</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{siteConfig.boundaries.west}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200/80 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
            <Target className="w-5 h-5" />
            <h2 className="font-extrabold text-lg text-gray-900 dark:text-white">
              Visi & Misi Pembangunan Desa
            </h2>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/40 border border-emerald-200 dark:border-emerald-800/70">
            <span className="text-[11px] font-bold uppercase text-emerald-700 dark:text-emerald-400">
              Visi Utama {siteConfig.villageName}
            </span>
            <p className="font-bold text-sm sm:text-base text-gray-900 dark:text-white mt-1">
              “{siteConfig.visionText}”
            </p>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
              Misi Strategis Pemerintahan Desa:
            </span>
            <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
              {siteConfig.missions.map((mission, idx) => (
                <li key={idx} className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{mission}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Wilayah Administratif Dusun (Dynamic from Database) */}
      <section className="space-y-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Pembagian Wilayah Kewilayahan Desa
          </span>
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">
            Profil Wilayah Dusun ({hamlets.length} Dusun)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {hamlets.map((hm) => (
            <div
              key={hm.id}
              className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-gray-200/80 dark:border-slate-700 shadow-sm flex flex-col justify-between"
            >
              <div>
                {hm.imageUrl && (
                  <img
                    src={hm.imageUrl}
                    alt={hm.name}
                    onError={handleImgError}
                    className="w-full h-40 object-cover"
                  />
                )}
                <div className="p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                      {hm.rtCount} RT / {hm.rwCount} RW • Luas {hm.areaHa}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                    {hm.name}
                  </h3>
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    Kepala Dusun: {hm.headName} ({hm.headPhone || hm.phone})
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                    {hm.description}
                  </p>
                </div>
              </div>

              <div className="px-5 py-3 bg-gray-50 dark:bg-slate-900/60 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between text-xs">
                <span className="text-gray-500">Populasi Wilayah:</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {hm.populationCount} Jiwa ({hm.familyCount} KK)
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Struktur Organisasi dan Tata Kerja (SOTK) */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Struktur Organisasi & Tata Kerja (SOTK)
            </span>
            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">
              Aparatur & Perangkat {siteConfig.villageName}
            </h2>
          </div>
          <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Siap Melayani Masyarakat dengan Integritas</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {officials.map((off) => (
            <div
              key={off.id}
              className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-200/80 dark:border-slate-700 shadow-sm flex items-start space-x-4 hover:border-emerald-400 transition-colors"
            >
              <img
                src={off.photoUrl}
                alt={off.name}
                onError={handleImgError}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500 shrink-0"
              />
              <div className="space-y-1 min-w-0">
                <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold uppercase">
                  {off.role || off.position}
                </span>
                <h3 className="font-bold text-gray-900 dark:text-white text-sm truncate">
                  {off.name}
                </h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                  {off.nip}
                </p>
                {off.motto && (
                  <p className="text-[11px] italic text-gray-600 dark:text-gray-300 line-clamp-2">
                    "{off.motto}"
                  </p>
                )}
                <div className="pt-1 flex items-center space-x-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                  <Phone className="w-3 h-3" />
                  <span>{off.phone}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Lembaga Kemasyarakatan Desa (LKD) - Dynamic from Database */}
      <section className="space-y-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center space-x-1.5">
            <Landmark className="w-4 h-4" />
            <span>Mitra Pembangunan & Pemberdayaan Warga</span>
          </span>
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">
            Lembaga Kemasyarakatan Desa / LKD ({institutions.length} Lembaga)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {institutions.map((inst) => (
            <div
              key={inst.id}
              className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-200/80 dark:border-slate-700 shadow-sm flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  {inst.logoUrl ? (
                    <img
                      src={inst.logoUrl}
                      alt={inst.abbreviation}
                      onError={handleImgError}
                      className="w-12 h-12 rounded-xl object-contain bg-emerald-50 dark:bg-slate-900 p-1.5 border border-emerald-200 dark:border-slate-700 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                      {inst.abbreviation}
                    </div>
                  )}
                  <div>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-[10px]">
                      {inst.abbreviation}
                    </span>
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white mt-0.5">
                      {inst.name}
                    </h3>
                  </div>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  {inst.description || inst.roleDescription}
                </p>
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-slate-700 text-[11px] space-y-1 text-gray-500 dark:text-gray-400">
                <div className="flex items-center justify-between">
                  <span>Ketua / Pimpinan:</span>
                  <span className="font-bold text-gray-900 dark:text-white">{inst.leaderName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Jumlah Pengurus:</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    {inst.memberCount} Orang
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Dasar Hukum:</span>
                  <span className="font-mono text-[10px]">{inst.skNumber}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Realisasi Proyek Pembangunan Fisik Desa (Projects) */}
      {projects.length > 0 && (
        <section className="space-y-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center space-x-1.5">
              <HardHat className="w-4 h-4 text-amber-500" />
              <span>Realisasi Fisik Infrastruktur Desa</span>
            </span>
            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">
              Daftar Proyek Pembangunan {siteConfig.villageName} ({projects.length} Kegiatan)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {projects.map((prj) => (
              <div
                key={prj.id}
                className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-gray-200/80 dark:border-slate-700 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <img
                    src={prj.imageUrl}
                    alt={prj.title}
                    onError={handleImgError}
                    className="w-full h-40 object-cover"
                  />
                  <div className="p-4 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">
                        {prj.sourceFund || prj.fundingSource}
                      </span>
                      <span className="font-extrabold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                        {prj.progressPercent}% ({prj.status})
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white">{prj.title}</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                      {prj.description}
                    </p>
                  </div>
                </div>
                <div className="px-4 py-3 bg-gray-50 dark:bg-slate-900/60 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between text-xs">
                  <span className="text-gray-500 truncate">{prj.location}</span>
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 shrink-0 ml-2">
                    {formatRupiah(prj.budget)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Potensi Unggulan Desa (Dynamic from Database) */}
      <section className="space-y-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center space-x-1.5">
            <Sprout className="w-4 h-4" />
            <span>Sumber Daya Ekonomi & Komoditas Unggulan</span>
          </span>
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">
            Potensi Unggulan {siteConfig.villageName} ({potentials.length} Sektor)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {potentials.map((pot) => (
            <div
              key={pot.id}
              className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-gray-200/80 dark:border-slate-700 shadow-sm flex flex-col justify-between"
            >
              <div>
                <img
                  src={pot.imageUrl}
                  alt={pot.title}
                  onError={handleImgError}
                  className="w-full h-36 object-cover"
                />
                <div className="p-4 space-y-1.5">
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">
                    {pot.category}
                  </span>
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">{pot.title}</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-3">
                    {pot.description}
                  </p>
                </div>
              </div>
              <div className="px-4 py-3 bg-gray-50 dark:bg-slate-900/60 border-t border-gray-100 dark:border-slate-700 text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Kapasitas:</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">
                    {pot.economicValue || pot.highlightStat}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Pengelola:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[140px]">
                    {pot.manager}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Produk Hukum Desa & Dokumen PPID */}
      <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-gray-200/80 dark:border-slate-700 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-700 pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center space-x-1.5">
              <Scale className="w-4 h-4" />
              <span>Transparansi Regulasi & Keterbukaan Informasi Publik (PPID)</span>
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white mt-0.5">
              Produk Hukum & Dokumen Resmi {siteConfig.villageName}
            </h2>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {regulationCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedRegulationCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  selectedRegulationCategory === cat
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 dark:bg-slate-900 text-gray-700 dark:text-gray-300 hover:bg-emerald-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRegulations.map((reg) => (
            <div
              key={reg.id}
              className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-900/70 border border-gray-200/80 dark:border-slate-700 flex flex-col justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                    {reg.category}
                  </span>
                  <span className="text-gray-500">Diterbitkan: {reg.dateIssued || reg.date}</span>
                </div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                  {reg.number} — {reg.title}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  {reg.summary}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-200/70 dark:border-slate-700 text-xs">
                <span className="text-[11px] text-gray-500 flex items-center space-x-1">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    Ukuran: {reg.fileSize} • {reg.downloadCount + (downloadedRegId === reg.id ? 1 : 0)}x Diunduh
                  </span>
                </span>
                <button
                  onClick={() => handleDownloadRegulation(reg)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Dokumen</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
