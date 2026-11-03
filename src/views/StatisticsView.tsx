import React, { useMemo, useState } from 'react';
import {
  Award,
  BarChart3,
  Briefcase,
  CheckCircle2,
  Download,
  Filter,
  GraduationCap,
  HeartHandshake,
  Layers,
  PieChart,
  Printer,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react';
import {
  ApbdesItem,
  Citizen,
  HamletName,
  VillageHamlet,
  VillageSiteConfig,
} from '../types/village';
import { buildCsvContent, computeDemographicSummary } from '../utils/villageLogic';

interface StatisticsViewProps {
  citizens: Citizen[];
  apbdes: ApbdesItem[];
  siteConfig: VillageSiteConfig;
  hamlets?: VillageHamlet[];
}

export const StatisticsView: React.FC<StatisticsViewProps> = ({
  citizens,
  apbdes,
  siteConfig,
  hamlets = [],
}) => {
  const [selectedHamlet, setSelectedHamlet] = useState<HamletName | 'Semua Dusun'>('Semua Dusun');
  const currentYear = new Date().getFullYear();

  const hamletNames = useMemo(() => {
    const names = new Set<string>();
    hamlets.forEach((h) => {
      if (h.name) names.add(h.name);
    });
    citizens.forEach((c) => {
      if (c.dusun) names.add(c.dusun);
    });
    return Array.from(names);
  }, [hamlets, citizens]);

  const demo = useMemo(
    () => computeDemographicSummary(citizens, selectedHamlet, hamletNames),
    [citizens, selectedHamlet, hamletNames]
  );

  const pendapatanItems = apbdes.filter((i) => i.category === 'Pendapatan');
  const belanjaItems = apbdes.filter((i) => i.category === 'Belanja');
  const totalPendapatanAnggaran = pendapatanItems.reduce((acc, cur) => acc + cur.anggaran, 0);
  const totalPendapatanRealisasi = pendapatanItems.reduce((acc, cur) => acc + cur.realisasi, 0);
  const totalBelanjaAnggaran = belanjaItems.reduce((acc, cur) => acc + cur.anggaran, 0);
  const totalBelanjaRealisasi = belanjaItems.reduce((acc, cur) => acc + cur.realisasi, 0);
  const pendapatanPct =
    totalPendapatanAnggaran > 0
      ? Math.round((totalPendapatanRealisasi / totalPendapatanAnggaran) * 100)
      : 0;
  const belanjaPct =
    totalBelanjaAnggaran > 0
      ? Math.round((totalBelanjaRealisasi / totalBelanjaAnggaran) * 100)
      : 0;
  const silpaRealisasi = totalPendapatanRealisasi - totalBelanjaRealisasi;

  const formatRupiah = (val: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);

  const handleExportCsv = () => {
    const filtered =
      selectedHamlet === 'Semua Dusun'
        ? citizens
        : citizens.filter((c) => c.dusun === selectedHamlet);

    const headers = [
      'NIK',
      'No KK',
      'Nama Lengkap',
      'Jenis Kelamin',
      'Usia',
      'Dusun',
      'RT/RW',
      'Pendidikan',
      'Pekerjaan',
      'Status Bantuan',
      'Verifikasi Dukcapil',
    ];

    const rows = filtered.map((c) => [
      c.nik,
      c.kk,
      c.name,
      c.gender,
      c.age,
      c.dusun,
      `RT ${c.rt}/RW ${c.rw}`,
      c.education,
      c.occupation,
      c.aidStatus,
      c.verifiedDukcapil ? 'Terverifikasi' : 'Belum',
    ]);

    const csv = buildCsvContent(headers, rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const cleanVillage = siteConfig.villageName.toLowerCase().replace(/\s+/g, '_');
    link.href = url;
    link.download = `statistik_kependudukan_${cleanVillage}_${currentYear}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const malePercent =
    demo.totalPopulation > 0 ? Math.round((demo.maleCount / demo.totalPopulation) * 100) : 50;
  const femalePercent = 100 - malePercent;

  return (
    <div className="space-y-10">
      {/* Header & Filter */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>Dasbor Analitik Kependudukan & Realisasi APBDes • {siteConfig.villageName}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
            Statistik Demografi, Indeks Desa Membangun & Transparansi Anggaran
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Data teragregasi secara real-time dari basis data kependudukan dan keuangan resmi Pemerintah {siteConfig.villageName}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 print:hidden">
          <div className="inline-flex items-center space-x-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 px-3.5 py-2 rounded-xl text-xs">
            <Filter className="w-4 h-4 text-emerald-600" />
            <select
              value={selectedHamlet}
              onChange={(e) => setSelectedHamlet(e.target.value)}
              aria-label="Filter Wilayah Dusun"
              className="bg-transparent font-bold text-gray-800 dark:text-gray-200 focus:outline-none cursor-pointer"
            >
              <option value="Semua Dusun">Semua Wilayah Dusun ({citizens.length} Warga)</option>
              {hamletNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExportCsv}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor CSV / Excel</span>
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:border-emerald-500 text-gray-700 dark:text-gray-200 text-xs font-bold transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-emerald-600" />
            <span>Cetak Laporan PDF</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Total Penduduk</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-2 font-mono">
            {demo.totalPopulation.toLocaleString('id-ID')}
          </p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
            {demo.verifiedPercentage}% Terverifikasi NIK
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Kepala Keluarga (KK)</span>
            <ShieldCheck className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-2 font-mono">
            {demo.totalFamilies.toLocaleString('id-ID')}
          </p>
          <p className="text-[11px] text-gray-500 mt-1">Kartu Keluarga aktif</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Rasio Laki-laki / Perempuan</span>
            <PieChart className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-2 font-mono">
            {demo.maleCount} L <span className="text-gray-400">/</span> {demo.femaleCount} P
          </p>
          <p className="text-[11px] text-gray-500 mt-1">
            {malePercent}% Pria • {femalePercent}% Wanita
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Penerima Bantuan Sosial</span>
            <HeartHandshake className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-2 font-mono">
            {demo.aidRecipientsCount}
          </p>
          <p className="text-[11px] text-gray-500 mt-1">KPM Terdata DTKS & BLT DD</p>
        </div>
      </div>

      {/* APBDes & IDM Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Transparansi Keuangan Desa
              </span>
              <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">
                Realisasi APBDes {siteConfig.villageName} Tahun Anggaran {apbdes[0]?.year || currentYear}
              </h2>
            </div>
            <Wallet className="w-5 h-5 text-emerald-600" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50">
              <span className="text-gray-500 dark:text-gray-400">Realisasi Pendapatan Desa</span>
              <p className="text-base font-extrabold text-emerald-700 dark:text-emerald-300 font-mono mt-1">
                {formatRupiah(totalPendapatanRealisasi)}
              </p>
              <span className="text-[11px] text-gray-500">
                {pendapatanPct}% dari Pagu {formatRupiah(totalPendapatanAnggaran)}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
              <span className="text-gray-500 dark:text-gray-400">Realisasi Belanja Desa</span>
              <p className="text-base font-extrabold text-blue-700 dark:text-blue-300 font-mono mt-1">
                {formatRupiah(totalBelanjaRealisasi)}
              </p>
              <span className="text-[11px] text-gray-500">
                {belanjaPct}% Terserap dari {formatRupiah(totalBelanjaAnggaran)}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50">
              <span className="text-gray-500 dark:text-gray-400">Surplus / SiLPA Berjalan</span>
              <p className="text-base font-extrabold text-amber-700 dark:text-amber-300 font-mono mt-1">
                {formatRupiah(silpaRealisasi)}
              </p>
              <span className="text-[11px] text-gray-500">Kas Rekening Desa Terverifikasi</span>
            </div>
          </div>

          <div className="space-y-3">
            {apbdes.map((item) => {
              const pct = item.anggaran > 0 ? Math.round((item.realisasi / item.anggaran) * 100) : 0;
              return (
                <div key={item.id} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      [{item.category}] {item.subCategory}
                    </span>
                    <span className="font-mono font-bold text-gray-900 dark:text-white">
                      {formatRupiah(item.realisasi)} / {formatRupiah(item.anggaran)} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        item.category === 'Pendapatan' ? 'bg-emerald-600' : 'bg-blue-600'
                      }`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* IDM & SDGs Card */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Status Kemandirian
              </span>
              <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">
                Indeks Desa Membangun (IDM)
              </h3>
            </div>
            <Award className="w-5 h-5 text-amber-500" />
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-900 to-teal-900 text-white space-y-1">
            <span className="text-xs text-emerald-200">Klasifikasi Kemendesa PDTT ({siteConfig.idmTargetYear})</span>
            <p className="text-2xl font-extrabold">{siteConfig.idmStatus}</p>
            <p className="text-sm font-mono text-emerald-300">
              Skor Komposit IDM: {Number(siteConfig.idmScore).toFixed(4)}
            </p>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-slate-800">
              <span className="text-gray-600 dark:text-gray-400">Skor Capaian SDGs Desa</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {siteConfig.sdgsScore} / 100
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-slate-800">
              <span className="text-gray-600 dark:text-gray-400">Penduduk Usia Produktif (15-64 Thn)</span>
              <span className="font-mono font-bold text-gray-900 dark:text-white">
                {demo.productiveAgeCount} Jiwa
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-slate-800">
              <span className="text-gray-600 dark:text-gray-400">Anak & Usia Sekolah (&lt;15 Thn)</span>
              <span className="font-mono font-bold text-gray-900 dark:text-white">
                {demo.childrenCount} Jiwa
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-slate-800">
              <span className="text-gray-600 dark:text-gray-400">Warga Lanjut Usia (65+ Thn)</span>
              <span className="font-mono font-bold text-gray-900 dark:text-white">
                {demo.elderlyCount} Jiwa
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600 dark:text-gray-400">Cakupan Wilayah Administratif</span>
              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                {siteConfig.dusunCount} Dusun • {siteConfig.rwCount} RW • {siteConfig.rtCount} RT
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Age Brackets & Distribution per Dusun */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">
                Piramida Kelompok Usia Penduduk
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Distribusi penduduk berdasarkan kelompok umur dan jenis kelamin
              </p>
            </div>
            <PieChart className="w-5 h-5 text-emerald-600" />
          </div>

          <div className="space-y-4">
            {demo.byAgeBracket.map((bracket) => {
              const pct =
                demo.totalPopulation > 0
                  ? Math.round((bracket.total / demo.totalPopulation) * 100)
                  : 0;
              return (
                <div key={bracket.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-800 dark:text-gray-200">{bracket.label}</span>
                    <span className="font-mono text-gray-600 dark:text-gray-400">
                      <strong className="text-emerald-700 dark:text-emerald-400">{bracket.total} Jiwa</strong> ({bracket.male} L / {bracket.female} P • {pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Distribusi per Dusun */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">
                Sebaran Populasi per Dusun
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Proporsi penduduk aktif di setiap wilayah dusun
              </p>
            </div>
            <Layers className="w-5 h-5 text-emerald-600" />
          </div>

          <div className="space-y-3">
            {Object.entries(demo.byHamlet).map(([dusunName, count]) => {
              const pct =
                demo.totalPopulation > 0 ? Math.round((count / demo.totalPopulation) * 100) : 0;
              return (
                <div
                  key={dusunName}
                  className="p-3.5 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800"
                >
                  <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                    <span className="text-gray-900 dark:text-white">{dusunName}</span>
                    <span className="font-mono text-emerald-700 dark:text-emerald-400">
                      {count} Jiwa ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Education & Occupation Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            <GraduationCap className="w-4 h-4" />
            <span>Kualifikasi Pendidikan</span>
          </div>
          <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">
            Tingkat Pendidikan Terakhir Warga
          </h3>
          <div className="space-y-2.5">
            {Object.entries(demo.byEducation).map(([edu, count]) => (
              <div
                key={edu}
                className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-slate-800 text-xs"
              >
                <span className="font-medium text-gray-700 dark:text-gray-300">{edu}</span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  {count} Jiwa
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            <Briefcase className="w-4 h-4" />
            <span>Struktur Mata Pencaharian</span>
          </div>
          <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">
            Profesi & Pekerjaan Utama Penduduk
          </h3>
          <div className="space-y-2.5">
            {Object.entries(demo.byOccupation).map(([job, count]) => (
              <div
                key={job}
                className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-slate-800 text-xs"
              >
                <span className="font-medium text-gray-700 dark:text-gray-300">{job}</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  {count} Jiwa
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Verified Data Integrity Note */}
      <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200">
        <div className="flex items-center space-x-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Seluruh grafik demografi dan realisasi anggaran di atas dihitung langsung dari state database {siteConfig.villageName} dan dapat diperbarui melalui CMS Admin.
          </span>
        </div>
        <span className="font-mono font-bold hidden sm:inline">TA {currentYear}</span>
      </div>
    </div>
  );
};
