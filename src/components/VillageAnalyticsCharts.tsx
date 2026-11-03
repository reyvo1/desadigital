import React, { useMemo, useState } from 'react';
import {
  ApbdesItem,
  ChatMessage,
  Citizen,
  LetterRequest,
  VillageSiteConfig,
} from '../types/village';
import { computeOmnichannelAnalytics } from '../utils/villageLogic';
import {
  Activity,
  BarChart3,
  Bot,
  FileCheck2,
  MessageSquare,
  PieChart as PieChartIcon,
  TrendingUp,
  Users,
} from 'lucide-react';

interface VillageAnalyticsChartsProps {
  siteConfig: VillageSiteConfig;
  chatMessages: ChatMessage[];
  requests: LetterRequest[];
  apbdes: ApbdesItem[];
  citizens: Citizen[];
  defaultView?: 'all' | 'omnichannel' | 'persuratan' | 'apbdes_bansos';
}

export const VillageAnalyticsCharts: React.FC<VillageAnalyticsChartsProps> = ({
  siteConfig,
  chatMessages,
  requests,
  apbdes,
  citizens,
  defaultView = 'all',
}) => {
  const [chartTab, setChartTab] = useState<'all' | 'omnichannel' | 'persuratan' | 'apbdes_bansos'>(
    defaultView
  );

  const analytics = useMemo(
    () => computeOmnichannelAnalytics(chatMessages, requests, apbdes, citizens),
    [chatMessages, requests, apbdes, citizens]
  );

  const formatIDRCompact = (num: number) => {
    if (num >= 1_000_000_000) {
      return `Rp ${(num / 1_000_000_000).toFixed(2)} M`;
    }
    if (num >= 1_000_000) {
      return `Rp ${(num / 1_000_000).toFixed(0)} Jt`;
    }
    return `Rp ${num.toLocaleString('id-ID')}`;
  };

  // Helper to build SVG Donut segments
  const buildDonutSegments = (
    items: { label: string; count: number; color: string }[],
    radius = 54
  ) => {
    const circumference = 2 * Math.PI * radius;
    const total = items.reduce((acc, i) => acc + i.count, 0) || 1;
    let cumulativeFraction = 0;

    return items.map((item) => {
      const fraction = item.count / total;
      const strokeDasharray = `${fraction * circumference} ${circumference}`;
      const strokeDashoffset = -cumulativeFraction * circumference;
      cumulativeFraction += fraction;
      return {
        ...item,
        fraction,
        percent: Math.round(fraction * 100),
        strokeDasharray,
        strokeDashoffset,
      };
    });
  };

  const channelSegments = useMemo(
    () => buildDonutSegments(analytics.byChannel),
    [analytics.byChannel]
  );

  const roleSegments = useMemo(() => buildDonutSegments(analytics.byRole), [analytics.byRole]);

  const maxLetterTypeCount = useMemo(
    () => Math.max(1, ...analytics.letterByType.map((t) => t.count)),
    [analytics.letterByType]
  );

  const maxDusunPop = useMemo(
    () => Math.max(1, ...analytics.dusunBansosSeries.map((d) => d.population)),
    [analytics.dusunBansosSeries]
  );

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-sm p-6 space-y-6 text-xs">
      {/* Header & Filter Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-800 pb-4">
        <div className="flex items-start space-x-3">
          <div className="p-3 rounded-2xl bg-emerald-600 text-white shadow-xs shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-extrabold text-[10px] uppercase">
                Visualisasi Data Real-Time
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 font-mono text-[10px] font-bold">
                Bot AI: @{siteConfig.telegramBotUsername || 'pemdes_sukamaju_bot'}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-white mt-1">
              Grafik Analitik Terpadu {siteConfig.villageName} (Telegram AI, Persuratan TTE & APBDes)
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Seluruh grafik di bawah dihitung secara dinamis dari database aktif ({analytics.totalMessages} pesan chat/bot, {requests.length} tiket surat, {citizens.length} penduduk).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: 'Semua Grafik' },
            { id: 'omnichannel', label: 'Grafik Telegram AI & Live Chat' },
            { id: 'persuratan', label: 'Grafik Layanan Surat TTE' },
            { id: 'apbdes_bansos', label: 'Grafik APBDes & Bansos Dusun' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setChartTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                chartTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 1: OMNICHANNEL LIVE CHAT, WHATSAPP & TELEGRAM AI BOT CHARTS */}
      {(chartTab === 'all' || chartTab === 'omnichannel') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Chart 1A: Donut Chart Distribusi Kanal Komunikasi */}
          <div className="lg:col-span-4 p-5 rounded-2xl bg-gray-50/80 dark:bg-slate-800/50 border border-gray-200/80 dark:border-slate-700/80 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-sky-700 dark:text-sky-400">
                  Grafik Donut Kanal Komunikasi
                </span>
                <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">
                  Proporsi Trafik Pesan per Kanal
                </h4>
              </div>
              <PieChartIcon className="w-4 h-4 text-sky-600" />
            </div>

            <div className="flex items-center justify-center gap-4 py-2">
              <div className="relative w-28 h-28 shrink-0">
                <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
                  <circle
                    cx="70"
                    cy="70"
                    r="54"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="16"
                    className="text-gray-200 dark:text-slate-700"
                  />
                  {channelSegments.map((seg) => (
                    <circle
                      key={seg.label}
                      cx="70"
                      cy="70"
                      r="54"
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth="16"
                      strokeDasharray={seg.strokeDasharray}
                      strokeDashoffset={seg.strokeDashoffset}
                      strokeLinecap="butt"
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-black font-mono text-gray-900 dark:text-white">
                    {analytics.totalMessages}
                  </span>
                  <span className="text-[9px] font-bold text-gray-500 uppercase">Total Pesan</span>
                </div>
              </div>

              <div className="space-y-2.5 flex-1 min-w-0">
                {analytics.byChannel.map((ch) => (
                  <div key={ch.channel} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="flex items-center space-x-1.5 font-bold text-gray-700 dark:text-gray-200 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                          style={{ backgroundColor: ch.color }}
                        />
                        <span className="truncate">{ch.label}</span>
                      </span>
                      <span className="font-mono font-extrabold text-gray-900 dark:text-white whitespace-nowrap shrink-0">
                        {ch.count} ({ch.percent}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${ch.percent}%`, backgroundColor: ch.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-gray-200/70 dark:border-slate-700 flex items-center justify-between text-[11px] text-gray-500">
              <span>Integrasi Bot API & Webhook:</span>
              <span className="font-mono font-bold text-sky-700 dark:text-sky-300">
                {analytics.telegramStats.totalTelegram} Transaksi Telegram
              </span>
            </div>
          </div>

          {/* Chart 1B: Donut & Gauge Performa Asisten AI Desa vs Admin */}
          <div className="lg:col-span-4 p-5 rounded-2xl bg-gray-50/80 dark:bg-slate-800/50 border border-gray-200/80 dark:border-slate-700/80 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-teal-700 dark:text-teal-400">
                  Grafik Otomatisasi AI Desa
                </span>
                <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">
                  Rasio Respons AI (`gemini-3.8-flash`) vs Perangkat
                </h4>
              </div>
              <Bot className="w-4 h-4 text-teal-600" />
            </div>

            <div className="flex items-center justify-center gap-4 py-2">
              <div className="relative w-28 h-28 shrink-0">
                <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
                  <circle
                    cx="70"
                    cy="70"
                    r="54"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="16"
                    className="text-gray-200 dark:text-slate-700"
                  />
                  {roleSegments.map((seg) => (
                    <circle
                      key={seg.label}
                      cx="70"
                      cy="70"
                      r="54"
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth="16"
                      strokeDasharray={seg.strokeDasharray}
                      strokeDashoffset={seg.strokeDashoffset}
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-lg font-black font-mono text-teal-600 dark:text-teal-400">
                    {analytics.telegramStats.aiAutomationRatePercent}%
                  </span>
                  <span className="text-[8px] font-bold text-gray-500 uppercase leading-tight px-2">
                    Auto-Reply AI
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 flex-1 min-w-0">
                {analytics.byRole.map((r) => (
                  <div key={r.role} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="flex items-center space-x-1.5 font-bold text-gray-700 dark:text-gray-200 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                          style={{ backgroundColor: r.color }}
                        />
                        <span className="truncate">{r.label}</span>
                      </span>
                      <span className="font-mono font-extrabold text-gray-900 dark:text-white whitespace-nowrap shrink-0">
                        {r.count} ({r.percent}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${r.percent}%`, backgroundColor: r.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-gray-200/70 dark:border-slate-700 flex items-center justify-between text-[11px]">
              <span className="text-gray-500">Status Auto-Reply AI Telegram:</span>
              <span
                className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                  siteConfig.telegramAiAutoReply !== false
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}
              >
                {siteConfig.telegramAiAutoReply !== false
                  ? 'Aktif Otomatis (/webhook + /ai)'
                  : 'Manual (/ai Saja)'}
              </span>
            </div>
          </div>

          {/* Chart 1C: Vertical SVG Bar Chart Perbandingan Aktivitas Telegram Bot & AI */}
          <div className="lg:col-span-4 p-5 rounded-2xl bg-gray-50/80 dark:bg-slate-800/50 border border-gray-200/80 dark:border-slate-700/80 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400">
                  Grafik Batang Interaksi Bot
                </span>
                <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">
                  Rincian Interaksi Telegram & AI Desa
                </h4>
              </div>
              <MessageSquare className="w-4 h-4 text-emerald-600" />
            </div>

            <div className="h-36 flex items-end justify-around gap-3 pt-4 px-2 border-b border-gray-200 dark:border-slate-700">
              {[
                {
                  label: 'Pesan Warga (TG)',
                  value: analytics.telegramStats.citizenInquiries,
                  color: '#0284c7',
                },
                {
                  label: 'Dijawab AI (TG)',
                  value: analytics.telegramStats.aiReplies,
                  color: '#0d9488',
                },
                {
                  label: 'Balasan Admin',
                  value: analytics.telegramStats.adminReplies,
                  color: '#2563eb',
                },
                {
                  label: 'Notifikasi WA',
                  value: analytics.byChannel.find((c) => c.channel === 'whatsapp')?.count || 0,
                  color: '#16a34a',
                },
              ].map((bar) => {
                const maxVal = Math.max(
                  1,
                  analytics.telegramStats.citizenInquiries,
                  analytics.telegramStats.aiReplies,
                  analytics.telegramStats.adminReplies,
                  analytics.byChannel.find((c) => c.channel === 'whatsapp')?.count || 0
                );
                const heightPct = Math.max(14, Math.round((bar.value / maxVal) * 100));
                return (
                  <div
                    key={bar.label}
                    className="flex flex-col items-center flex-1 h-full justify-end group"
                  >
                    <span className="font-mono font-extrabold text-[11px] text-gray-900 dark:text-white mb-1">
                      {bar.value}
                    </span>
                    <div
                      className="w-full max-w-[40px] rounded-t-xl transition-all duration-500 shadow-xs"
                      style={{
                        height: `${heightPct}%`,
                        backgroundColor: bar.color,
                      }}
                    />
                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mt-1.5 text-center leading-tight">
                      {bar.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-[11px] text-gray-500">
              <span>Perintah Bot Didukung:</span>
              <span className="font-mono text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">
                /start • /status • /ai • /layanan
              </span>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: GRAFIK LAYANAN PERSURATAN TTE & KATEGORI SURAT */}
      {(chartTab === 'all' || chartTab === 'persuratan') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 7: Horizontal Bar Chart Volume Permohonan per Jenis Surat */}
          <div className="lg:col-span-7 p-5 rounded-2xl bg-gray-50/80 dark:bg-slate-800/50 border border-gray-200/80 dark:border-slate-700/80 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400">
                  Grafik Distribusi Jenis Surat
                </span>
                <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">
                  Volume Permohonan & Penerbitan TTE per Jenis Surat ({requests.length} Berkas)
                </h4>
              </div>
              <FileCheck2 className="w-4 h-4 text-emerald-600" />
            </div>

            <div className="space-y-3">
              {analytics.letterByType.slice(0, 6).map((item) => {
                const widthPct = Math.max(10, Math.round((item.count / maxLetterTypeCount) * 100));
                const completedPct =
                  item.count > 0 ? Math.round((item.completed / item.count) * 100) : 0;
                return (
                  <div key={item.code} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono font-bold text-[10px]">
                          {item.code}
                        </span>
                        <span className="font-bold text-gray-800 dark:text-gray-200 truncate max-w-xs">
                          {item.title}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-gray-700 dark:text-gray-300">
                        {item.count} Surat ({item.completed} Selesai TTE)
                      </span>
                    </div>
                    <div className="w-full h-3 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                      <div
                        className="bg-emerald-600 h-full rounded-l-full transition-all duration-500"
                        style={{ width: `${widthPct}%` }}
                        title={`Total: ${item.count} (${completedPct}% selesai)`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right 5: Status Penyelesaian Dokumen Surat */}
          <div className="lg:col-span-5 p-5 rounded-2xl bg-gray-50/80 dark:bg-slate-800/50 border border-gray-200/80 dark:border-slate-700/80 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-blue-700 dark:text-blue-400">
                  Grafik Status Verifikasi & TTE
                </span>
                <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">
                  Proporsi Tahapan Penyelesaian Surat Warga
                </h4>
              </div>
              <Activity className="w-4 h-4 text-blue-600" />
            </div>

            <div className="space-y-3">
              {analytics.letterByStatus.map((st) => (
                <div key={st.status} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center space-x-2 font-bold text-gray-700 dark:text-gray-200">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{ backgroundColor: st.color }}
                      />
                      <span>{st.status}</span>
                    </span>
                    <span className="font-mono font-extrabold text-gray-900 dark:text-white">
                      {st.count} ({st.percent}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(st.count > 0 ? 6 : 0, st.percent)}%`,
                        backgroundColor: st.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-slate-800 border border-emerald-200 dark:border-slate-700 flex items-center justify-between">
              <span className="font-bold text-emerald-900 dark:text-emerald-300">
                Dokumen Terbit Ber-QR Code TTE:
              </span>
              <span className="font-mono font-black text-sm text-emerald-700 dark:text-emerald-400">
                {requests.filter((r) => r.status === 'Selesai').length} / {requests.length} Surat
              </span>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: GRAFIK REALISASI APBDES & DEMOGRAFI KPM BANSOS PER DUSUN */}
      {(chartTab === 'all' || chartTab === 'apbdes_bansos') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 7: Grafik Pagu vs Realisasi APBDes */}
          <div className="lg:col-span-7 p-5 rounded-2xl bg-gray-50/80 dark:bg-slate-800/50 border border-gray-200/80 dark:border-slate-700/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400">
                  Grafik Realisasi Anggaran APBDes
                </span>
                <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">
                  Perbandingan Pagu Anggaran vs Realisasi Keuangan Desa ({analytics.apbdesSummary.absorptionPercent}% Terserap)
                </h4>
              </div>
              <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700">
                <span className="text-[10px] text-gray-500 uppercase font-bold">
                  Realisasi Pendapatan Desa
                </span>
                <p className="font-mono font-extrabold text-sm text-emerald-700 dark:text-emerald-400 mt-0.5">
                  {formatIDRCompact(analytics.apbdesSummary.totalRevenueRealized)}
                </p>
                <p className="text-[10px] text-gray-400 font-mono">
                  Pagu: {formatIDRCompact(analytics.apbdesSummary.totalRevenueBudget)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700">
                <span className="text-[10px] text-gray-500 uppercase font-bold">
                  Realisasi Belanja & Pembangunan
                </span>
                <p className="font-mono font-extrabold text-sm text-blue-700 dark:text-blue-400 mt-0.5">
                  {formatIDRCompact(analytics.apbdesSummary.totalExpenseRealized)}
                </p>
                <p className="text-[10px] text-gray-400 font-mono">
                  Pagu: {formatIDRCompact(analytics.apbdesSummary.totalExpenseBudget)}
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {analytics.apbdesSummary.items.slice(0, 5).map((item, idx) => (
                <div key={`${item.label}-${idx}`} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-gray-800 dark:text-gray-200 truncate max-w-xs">
                      [{item.category}] {item.label}
                    </span>
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {formatIDRCompact(item.realized)} / {formatIDRCompact(item.budget)} ({item.percent}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        item.category === 'Pendapatan' ? 'bg-emerald-600' : 'bg-blue-600'
                      }`}
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right 5: Grafik Demografi & KPM Bansos per Dusun */}
          <div className="lg:col-span-5 p-5 rounded-2xl bg-gray-50/80 dark:bg-slate-800/50 border border-gray-200/80 dark:border-slate-700/80 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400">
                  Grafik Demografi & KPM Bansos
                </span>
                <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">
                  Sebaran Penduduk & Penerima Bansos per Dusun
                </h4>
              </div>
              <Users className="w-4 h-4 text-amber-600" />
            </div>

            <div className="space-y-3.5">
              {analytics.dusunBansosSeries.map((d) => {
                const popWidth = Math.max(15, Math.round((d.population / maxDusunPop) * 100));
                return (
                  <div key={d.dusun} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-gray-900 dark:text-white">{d.dusun}</span>
                      <span className="font-mono text-[11px] text-gray-600 dark:text-gray-300">
                        <strong>{d.population}</strong> Warga •{' '}
                        <strong className="text-emerald-700 dark:text-emerald-400">
                          {d.aidRecipients} KPM Bansos ({d.aidPercent}%)
                        </strong>
                      </span>
                    </div>
                    <div className="w-full h-3.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                      <div
                        className="bg-emerald-600 h-full"
                        style={{ width: `${(d.aidRecipients / Math.max(1, maxDusunPop)) * 100}%` }}
                        title={`Penerima Bansos: ${d.aidRecipients} warga`}
                      />
                      <div
                        className="bg-sky-500 h-full"
                        style={{
                          width: `${Math.max(
                            4,
                            popWidth - (d.aidRecipients / Math.max(1, maxDusunPop)) * 100
                          )}%`,
                        }}
                        title={`Non-Penerima: ${d.nonRecipients} warga`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-slate-700 text-[11px]">
              <div className="flex items-center space-x-3">
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                  <span>Penerima KPM Bansos</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" />
                  <span>Warga Non-Penerima</span>
                </span>
              </div>
              <span className="font-mono font-bold text-gray-700 dark:text-gray-300">
                Total: {citizens.length} Jiwa
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
