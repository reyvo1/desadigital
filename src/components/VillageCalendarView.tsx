import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit3,
  MapPin,
  MessageSquare,
  Plus,
  Repeat,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  AgendaCategory,
  AgendaStatus,
  HamletName,
  VillageAgenda,
  VillageHamlet,
  VillageSiteConfig,
} from '../types/village';
import {
  buildMonthCalendarGrid,
  detectAgendaConflicts,
  generateWhatsAppEventInvite,
} from '../utils/villageLogic';

interface VillageCalendarViewProps {
  agendas: VillageAgenda[];
  onAddAgenda: (agenda: VillageAgenda, sendWaBroadcast: boolean) => void;
  onUpdateAgenda: (agenda: VillageAgenda, sendWaBroadcast: boolean) => void;
  onDeleteAgenda: (id: string) => void;
  onBroadcastAgendaWa: (agenda: VillageAgenda) => void;
  siteConfig?: VillageSiteConfig;
  hamlets?: VillageHamlet[];
}

const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const DAY_HEADERS_ID = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

const CATEGORY_COLORS: Record<
  AgendaCategory,
  { badge: string; dot: string; border: string }
> = {
  'Musyawarah Desa': {
    badge: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300',
    dot: 'bg-emerald-600',
    border: 'border-emerald-300 dark:border-emerald-800',
  },
  'Gotong Royong': {
    badge: 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300',
    dot: 'bg-amber-500',
    border: 'border-amber-300 dark:border-amber-800',
  },
  'Posyandu & Kesehatan': {
    badge: 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300',
    dot: 'bg-rose-500',
    border: 'border-rose-300 dark:border-rose-800',
  },
  'Rapat Perangkat': {
    badge: 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300',
    dot: 'bg-blue-600',
    border: 'border-blue-300 dark:border-blue-800',
  },
  'Budaya & Keagamaan': {
    badge: 'bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300',
    dot: 'bg-purple-600',
    border: 'border-purple-300 dark:border-purple-800',
  },
  'Pelatihan UMKM': {
    badge: 'bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300',
    dot: 'bg-teal-600',
    border: 'border-teal-300 dark:border-teal-800',
  },
};

export const VillageCalendarView: React.FC<VillageCalendarViewProps> = ({
  agendas,
  onAddAgenda,
  onUpdateAgenda,
  onDeleteAgenda,
  onBroadcastAgendaWa,
  siteConfig,
  hamlets = [],
}) => {
  const villageName = siteConfig?.villageName || 'Pemerintah Desa';
  const defaultLocation = `Aula Kantor ${villageName}`;

  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(2); // 2 = Maret
  const [selectedDateStr, setSelectedDateStr] = useState<string>('2026-03-18');
  const [categoryFilter, setCategoryFilter] = useState<AgendaCategory | 'Semua Kategori'>(
    'Semua Kategori'
  );
  const [dusunFilter, setDusunFilter] = useState<HamletName | 'Seluruh Desa' | 'Semua Wilayah'>(
    'Semua Wilayah'
  );

  // Modal Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgenda, setEditingAgenda] = useState<VillageAgenda | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<AgendaCategory>('Musyawarah Desa');
  const [date, setDate] = useState('2026-03-18');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:30');
  const [location, setLocation] = useState(defaultLocation);
  const [dusun, setDusun] = useState<HamletName | 'Seluruh Desa'>('Seluruh Desa');
  const [coordinator, setCoordinator] = useState('Asep Saepudin, S.Kom (Sekdes)');
  const [coordinatorPhone, setCoordinatorPhone] = useState('081210000002');
  const [participantsTarget, setParticipantsTarget] = useState(
    'Perangkat Desa, BPD, Ketua RT/RW & Tokoh Warga'
  );
  const [expectedCount, setExpectedCount] = useState(40);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<AgendaStatus>('Terjadwal');
  const [isRoutine, setIsRoutine] = useState(false);
  const [routineFrequency, setRoutineFrequency] = useState<
    'Mingguan' | 'Bulanan' | 'Triwulan' | 'Tahunan'
  >('Bulanan');
  const [sendWaOnSave, setSendWaOnSave] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const availableHamlets = useMemo(() => {
    const names = new Set<string>(hamlets.map((h) => h.name));
    for (const ag of agendas) {
      if (ag.dusun && ag.dusun !== 'Seluruh Desa') {
        names.add(ag.dusun);
      }
    }
    return Array.from(names);
  }, [hamlets, agendas]);

  const filteredAgendas = useMemo(() => {
    return agendas.filter((ag) => {
      const matchCat = categoryFilter === 'Semua Kategori' || ag.category === categoryFilter;
      const matchDusun = dusunFilter === 'Semua Wilayah' || ag.dusun === dusunFilter;
      return matchCat && matchDusun;
    });
  }, [agendas, categoryFilter, dusunFilter]);

  const calendarCells = useMemo(
    () => buildMonthCalendarGrid(currentYear, currentMonth, filteredAgendas, '2026-03-18'),
    [currentYear, currentMonth, filteredAgendas]
  );

  const selectedDayAgendas = useMemo(
    () =>
      filteredAgendas
        .filter((ag) => ag.date === selectedDateStr)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [filteredAgendas, selectedDateStr]
  );

  const detectedConflicts = useMemo(
    () =>
      detectAgendaConflicts(
        { date, startTime, endTime, location },
        agendas,
        editingAgenda?.id
      ),
    [date, startTime, endTime, location, agendas, editingAgenda]
  );

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const openCreateModal = (prefillDate?: string) => {
    setEditingAgenda(null);
    setFormError(null);
    setTitle('');
    setCategory('Rapat Perangkat');
    setDate(prefillDate || selectedDateStr || '2026-03-18');
    setStartTime('09:00');
    setEndTime('11:30');
    setLocation(defaultLocation);
    setDusun('Seluruh Desa');
    setCoordinator('Asep Saepudin, S.Kom (Sekdes)');
    setCoordinatorPhone('081210000002');
    setParticipantsTarget('Perangkat Desa, Ketua RT/RW & Tokoh Masyarakat');
    setExpectedCount(45);
    setDescription('');
    setStatus('Terjadwal');
    setIsRoutine(false);
    setRoutineFrequency('Bulanan');
    setSendWaOnSave(true);
    setIsModalOpen(true);
  };

  const openEditModal = (ag: VillageAgenda) => {
    setEditingAgenda(ag);
    setFormError(null);
    setTitle(ag.title);
    setCategory(ag.category);
    setDate(ag.date);
    setStartTime(ag.startTime);
    setEndTime(ag.endTime);
    setLocation(ag.location);
    setDusun(ag.dusun);
    setCoordinator(ag.coordinator);
    setCoordinatorPhone(ag.coordinatorPhone);
    setParticipantsTarget(ag.participantsTarget);
    setExpectedCount(ag.expectedCount);
    setDescription(ag.description);
    setStatus(ag.status);
    setIsRoutine(ag.isRoutine);
    setRoutineFrequency(ag.routineFrequency || 'Bulanan');
    setSendWaOnSave(false);
    setIsModalOpen(true);
  };

  const applyQuickTemplate = (
    tpl: 'rakor' | 'posyandu' | 'jumat_bersih' | 'musdes'
  ) => {
    setFormError(null);
    if (tpl === 'rakor') {
      setTitle('Rapat Koordinasi Mingguan Perangkat & Evaluasi Layanan Desa');
      setCategory('Rapat Perangkat');
      setStartTime('08:30');
      setEndTime('11:00');
      setLocation('Ruang Rapat Utama Kantor Desa');
      setDusun('Seluruh Desa');
      setParticipantsTarget('Sekdes, Kasi, Kaur & Kepala Dusun');
      setExpectedCount(18);
      setIsRoutine(true);
      setRoutineFrequency('Mingguan');
      setDescription(
        'Evaluasi kinerja pelayanan surat online, verifikasi data warga, dan progres penyerapan anggaran kegiatan desa.'
      );
    } else if (tpl === 'posyandu') {
      setTitle('Posyandu Balita, Pemeriksaan Ibu Hamil & Senam Lansia');
      setCategory('Posyandu & Kesehatan');
      setStartTime('08:00');
      setEndTime('11:30');
      setLocation('Poskesdes & Balai Posyandu Melati');
      setDusun(availableHamlets[0] || 'Seluruh Desa');
      setParticipantsTarget('Ibu Hamil, Balita & Warga Lansia');
      setExpectedCount(75);
      setIsRoutine(true);
      setRoutineFrequency('Bulanan');
      setDescription(
        'Penimbangan rutin balita, pemberian paket PMT cegah stunting, imunisasi dasar, dan cek kesehatan lansia.'
      );
    } else if (tpl === 'jumat_bersih') {
      setTitle('Gotong Royong Jumat Bersih & Pemeliharaan Drainase Dusun');
      setCategory('Gotong Royong');
      setStartTime('07:00');
      setEndTime('10:00');
      setLocation('Jalan Poros Desa & Saluran Irigasi');
      setDusun(availableHamlets[1] || availableHamlets[0] || 'Seluruh Desa');
      setParticipantsTarget('Warga RT/RW, Karang Taruna & Linmas');
      setExpectedCount(100);
      setIsRoutine(true);
      setRoutineFrequency('Mingguan');
      setDescription(
        'Kerja bakti membersihkan saluran drainase, pemangkasan rumput bahu jalan, dan pemilahan sampah organik.'
      );
    } else if (tpl === 'musdes') {
      setTitle('Musyawarah Desa (Musdes) Evaluasi Program Pembangunan & BUMDes');
      setCategory('Musyawarah Desa');
      setStartTime('09:00');
      setEndTime('12:30');
      setLocation(`Aula Serbaguna Balai ${villageName}`);
      setDusun('Seluruh Desa');
      setParticipantsTarget('Pemdes, BPD, LPMD, Tokoh Masyarakat & Perwakilan Perempuan');
      setExpectedCount(65);
      setIsRoutine(false);
      setDescription(
        'Musyawarah mufakat pembahasan laporan realisasi fisik Dana Desa dan rencana kerja tindak lanjut.'
      );
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !location.trim() || !date) return;
    if (startTime >= endTime) {
      setFormError('Jam selesai harus lebih besar dari jam mulai.');
      return;
    }

    const payload: VillageAgenda = {
      id: editingAgenda ? editingAgenda.id : `ag-${Date.now()}`,
      title: title.trim(),
      category,
      date,
      startTime,
      endTime,
      location: location.trim(),
      dusun,
      coordinator: coordinator.trim() || 'Sekretariat Desa',
      coordinatorPhone: coordinatorPhone.trim() || '081210000002',
      participantsTarget: participantsTarget.trim() || 'Warga Desa',
      expectedCount: Number(expectedCount) || 25,
      description: description.trim() || 'Kegiatan resmi terjadwal Pemerintah Desa.',
      status,
      isRoutine,
      routineFrequency: isRoutine ? routineFrequency : undefined,
      whatsappBroadcastSent:
        sendWaOnSave || Boolean(editingAgenda?.whatsappBroadcastSent),
    };

    if (editingAgenda) {
      onUpdateAgenda(payload, sendWaOnSave);
    } else {
      onAddAgenda(payload, sendWaOnSave);
    }
    setSelectedDateStr(date);
    setIsModalOpen(false);
  };

  // Summary counts
  const totalScheduled = agendas.filter((a) => a.status === 'Terjadwal').length;
  const totalRoutine = agendas.filter((a) => a.isRoutine).length;
  const totalBroadcasted = agendas.filter((a) => a.whatsappBroadcastSent).length;

  return (
    <div className="space-y-6">
      {/* Top Summary Banner & Quick Actions */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-200/80 dark:border-slate-700 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold mb-1.5">
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Manajemen Kalender Rapat Perangkat & Kegiatan Rutin Warga</span>
          </div>
          <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">
            Kalender Agenda Terpadu {villageName}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Jadwalkan rapat perangkat, Posyandu, Musrenbangdes, atau kerja bakti rutin disertai deteksi bentrok ruangan & undangan WhatsApp otomatis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center space-x-3 px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-xs">
            <div>
              <span className="text-gray-400 block text-[10px]">Agenda Aktif</span>
              <span className="font-extrabold text-gray-900 dark:text-white">
                {totalScheduled} Jadwal
              </span>
            </div>
            <div className="h-6 w-px bg-gray-200 dark:bg-slate-700" />
            <div>
              <span className="text-gray-400 block text-[10px]">Kegiatan Rutin</span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                {totalRoutine} Rutin
              </span>
            </div>
            <div className="h-6 w-px bg-gray-200 dark:bg-slate-700" />
            <div>
              <span className="text-gray-400 block text-[10px]">Undangan WA</span>
              <span className="font-extrabold text-teal-600 dark:text-teal-400">
                {totalBroadcasted} Terkirim
              </span>
            </div>
          </div>

          <button
            onClick={() => openCreateModal()}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Jadwalkan Rapat / Kegiatan Baru</span>
          </button>
        </div>
      </div>

      {/* Filter Bar & Month Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-200/80 dark:border-slate-700 shadow-sm">
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 cursor-pointer"
            title="Bulan Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="min-w-[160px] text-center">
            <h4 className="font-extrabold text-sm sm:text-base text-gray-900 dark:text-white">
              {MONTH_NAMES_ID[currentMonth]} {currentYear}
            </h4>
          </div>
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 cursor-pointer"
            title="Bulan Berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setCurrentYear(2026);
              setCurrentMonth(2);
              setSelectedDateStr('2026-03-18');
            }}
            className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 cursor-pointer"
          >
            Hari Ini (18 Mar)
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as AgendaCategory | 'Semua Kategori')}
            aria-label="Filter Kategori Agenda"
            className="px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-xs font-semibold text-gray-800 dark:text-gray-200"
          >
            <option value="Semua Kategori">Semua Kategori Kegiatan</option>
            <option value="Rapat Perangkat">Rapat Perangkat</option>
            <option value="Musyawarah Desa">Musyawarah Desa</option>
            <option value="Posyandu & Kesehatan">Posyandu & Kesehatan</option>
            <option value="Gotong Royong">Gotong Royong</option>
            <option value="Pelatihan UMKM">Pelatihan UMKM</option>
            <option value="Budaya & Keagamaan">Budaya & Keagamaan</option>
          </select>

          <select
            value={dusunFilter}
            onChange={(e) =>
              setDusunFilter(e.target.value as HamletName | 'Seluruh Desa' | 'Semua Wilayah')
            }
            aria-label="Filter Wilayah Dusun"
            className="px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-xs font-semibold text-gray-800 dark:text-gray-200"
          >
            <option value="Semua Wilayah">Semua Wilayah / Dusun</option>
            <option value="Seluruh Desa">Seluruh Desa (Terpusat)</option>
            {availableHamlets.map((hm) => (
              <option key={hm} value={hm}>
                {hm}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Left 7-Column Month Calendar, Right Selected Date & Upcoming Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 7-Column Interactive Calendar */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/80 dark:border-slate-700 shadow-sm overflow-hidden">
          {/* Day of Week Header */}
          <div className="grid grid-cols-7 bg-gray-50 dark:bg-slate-900/80 border-b border-gray-200 dark:border-slate-700">
            {DAY_HEADERS_ID.map((day) => (
              <div
                key={day}
                className="py-2.5 text-center text-[11px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                {day}
              </div>
            ))}
          </div>

          {/* 42 Day Cells */}
          <div className="grid grid-cols-7 divide-x divide-y divide-gray-100 dark:divide-slate-700/70">
            {calendarCells.map((cell) => {
              const isSelected = cell.dateStr === selectedDateStr;
              return (
                <div
                  key={cell.dateStr}
                  onClick={() => setSelectedDateStr(cell.dateStr)}
                  className={`min-h-[92px] sm:min-h-[112px] p-1.5 sm:p-2 transition-colors cursor-pointer flex flex-col justify-between ${
                    !cell.isCurrentMonth
                      ? 'bg-gray-50/60 dark:bg-slate-900/40 text-gray-400 dark:text-slate-600'
                      : 'bg-white dark:bg-slate-800 text-gray-900 dark:text-white'
                  } ${
                    isSelected
                      ? 'ring-2 ring-inset ring-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/30'
                      : 'hover:bg-gray-50 dark:hover:bg-slate-700/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                        cell.isToday
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : isSelected
                          ? 'text-emerald-700 dark:text-emerald-300 font-extrabold'
                          : ''
                      }`}
                    >
                      {cell.dayNumber}
                    </span>
                    {cell.agendas.length > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                        {cell.agendas.length}
                      </span>
                    )}
                  </div>

                  {/* Event Pills Inside Cell */}
                  <div className="space-y-1 mt-1 overflow-hidden">
                    {cell.agendas.slice(0, 2).map((ag) => {
                      const style = CATEGORY_COLORS[ag.category];
                      return (
                        <div
                          key={ag.id}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold truncate flex items-center space-x-1 ${style.badge}`}
                          title={`${ag.startTime} - ${ag.title}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
                          <span className="truncate">
                            {ag.startTime} {ag.title}
                          </span>
                        </div>
                      );
                    })}
                    {cell.agendas.length > 2 && (
                      <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 pl-1">
                        +{cell.agendas.length - 2} kegiatan lainnya
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Panel: Selected Date Schedule & Actions */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-200/80 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700 pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Jadwal Tanggal Terpilih
                </span>
                <h4 className="font-extrabold text-base text-gray-900 dark:text-white">
                  {selectedDateStr}
                </h4>
              </div>
              <button
                onClick={() => openCreateModal(selectedDateStr)}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah di Tgl Ini</span>
              </button>
            </div>

            {selectedDayAgendas.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <CalendarIcon className="w-8 h-8 text-gray-400 mx-auto" />
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                  Belum ada rapat atau kegiatan terjadwal pada tanggal {selectedDateStr}.
                </p>
                <button
                  onClick={() => openCreateModal(selectedDateStr)}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  + Buat Jadwal Rapat / Kegiatan Baru
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDayAgendas.map((ag) => {
                  const style = CATEGORY_COLORS[ag.category];
                  return (
                    <div
                      key={ag.id}
                      className={`p-4 rounded-2xl border ${style.border} bg-gray-50/70 dark:bg-slate-900/60 space-y-2.5`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${style.badge}`}>
                          {ag.category}
                        </span>
                        <div className="flex items-center space-x-1">
                          {ag.isRoutine && (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 text-[10px] font-bold">
                              <Repeat className="w-2.5 h-2.5" />
                              <span>Rutin {ag.routineFrequency}</span>
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              ag.status === 'Selesai'
                                ? 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300'
                                : ag.status === 'Berlangsung'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                            }`}
                          >
                            {ag.status}
                          </span>
                        </div>
                      </div>

                      <h5 className="font-bold text-sm text-gray-900 dark:text-white leading-snug">
                        {ag.title}
                      </h5>

                      <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
                        <div className="flex items-center space-x-1.5">
                          <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="font-semibold">
                            {ag.startTime} - {ag.endTime} WIB
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>
                            {ag.location} ({ag.dusun})
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>
                            {ag.participantsTarget} (~{ag.expectedCount} orang)
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                        {ag.description}
                      </p>

                      {confirmDeleteId === ag.id ? (
                        <div className="pt-2 border-t border-red-200 dark:border-red-900/60 flex items-center justify-between gap-2 bg-red-50/70 dark:bg-red-950/30 p-2 rounded-xl">
                          <span className="text-[11px] font-bold text-red-700 dark:text-red-300">
                            Hapus agenda ini?
                          </span>
                          <div className="flex items-center space-x-1.5">
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 text-[11px] font-semibold border border-gray-200 dark:border-slate-700 cursor-pointer"
                            >
                              Batal
                            </button>
                            <button
                              onClick={() => {
                                onDeleteAgenda(ag.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-[11px] font-bold hover:bg-red-700 cursor-pointer"
                            >
                              Ya, Hapus
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="pt-2 border-t border-gray-200/70 dark:border-slate-700 flex items-center justify-between gap-2">
                          <button
                            onClick={() => onBroadcastAgendaWa(ag)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-colors cursor-pointer"
                            title="Kirim Undangan Rapat/Kegiatan via WhatsApp Gateway"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>
                              {ag.whatsappBroadcastSent
                                ? 'Kirim Ulang WA'
                                : 'Broadcast Undangan WA'}
                            </span>
                          </button>

                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => openEditModal(ag)}
                              className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-200 cursor-pointer"
                              title="Ubah Jadwal"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(ag.id)}
                              className="p-1.5 rounded-lg border border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 cursor-pointer"
                              title="Hapus Agenda"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* All Upcoming Village Agendas List */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-200/80 dark:border-slate-700 shadow-sm space-y-3">
            <h4 className="font-bold text-gray-900 dark:text-white text-sm">
              Daftar Seluruh Agenda Desa ({filteredAgendas.length})
            </h4>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {filteredAgendas
                .slice()
                .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))
                .map((ag) => (
                  <button
                    key={ag.id}
                    onClick={() => {
                      const [yyyy, mm] = ag.date.split('-').map(Number);
                      if (yyyy && mm) {
                        setCurrentYear(yyyy);
                        setCurrentMonth(mm - 1);
                      }
                      setSelectedDateStr(ag.date);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      selectedDateStr === ag.date
                        ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40'
                        : 'border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/40'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 dark:text-white truncate">
                        {ag.title}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        {ag.date} • {ag.startTime} WIB • {ag.location}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 shrink-0">
                      {ag.dusun === 'Seluruh Desa' ? 'Desa' : ag.dusun.split(' ')[1] || ag.dusun}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Agenda Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-emerald-100 dark:border-slate-800 shadow-2xl overflow-hidden my-8">
            <div className="bg-gradient-to-r from-emerald-800 to-teal-800 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <CalendarIcon className="w-5 h-5 text-emerald-300" />
                <div>
                  <h3 className="font-bold text-base">
                    {editingAgenda
                      ? 'Ubah Jadwal Rapat / Kegiatan Desa'
                      : 'Jadwalkan Rapat Perangkat / Kegiatan Rutin Warga'}
                  </h3>
                  <p className="text-xs text-emerald-200">
                    Dilengkapi pengecekan bentrok ruangan otomatis & broadcast undangan WhatsApp
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-6 space-y-4">
              {/* Quick Templates for Village Officials */}
              {!editingAgenda && (
                <div className="p-3 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70">
                  <span className="block text-[11px] font-bold text-emerald-900 dark:text-emerald-300 mb-1.5">
                    Template Cepat Kegiatan Rutin Desa (Klik untuk Isi Otomatis):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => applyQuickTemplate('rakor')}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-emerald-200 dark:border-slate-700 text-[11px] font-semibold text-gray-700 dark:text-gray-200 hover:border-emerald-500 cursor-pointer"
                    >
                      📋 Rapat Mingguan Perangkat
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQuickTemplate('posyandu')}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-emerald-200 dark:border-slate-700 text-[11px] font-semibold text-gray-700 dark:text-gray-200 hover:border-emerald-500 cursor-pointer"
                    >
                      🩺 Posyandu & Lansia Bulanan
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQuickTemplate('jumat_bersih')}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-emerald-200 dark:border-slate-700 text-[11px] font-semibold text-gray-700 dark:text-gray-200 hover:border-emerald-500 cursor-pointer"
                    >
                      🧹 Kerja Bakti Jumat Bersih
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQuickTemplate('musdes')}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-emerald-200 dark:border-slate-700 text-[11px] font-semibold text-gray-700 dark:text-gray-200 hover:border-emerald-500 cursor-pointer"
                    >
                      🏛️ Musyawarah Desa (Musdes)
                    </button>
                  </div>
                </div>
              )}

              {formError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-800 flex items-center space-x-2 text-xs text-red-800 dark:text-red-300 font-semibold">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Room / Time Conflict Alert */}
              {detectedConflicts.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 flex items-start space-x-2.5 text-xs text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">
                      Peringatan Bentrok Jadwal & Ruangan ({location}):
                    </p>
                    <p className="text-[11px] mt-0.5">
                      Terdapat agenda lain di lokasi & jam yang beririsan:{' '}
                      <strong>
                        {detectedConflicts
                          .map((c) => `${c.title} (${c.startTime}-${c.endTime})`)
                          .join(', ')}
                      </strong>
                      .
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Nama Rapat / Kegiatan Desa *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: Rapat Koordinasi Perangkat Desa..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Kategori Agenda
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as AgendaCategory)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white"
                  >
                    <option value="Rapat Perangkat">Rapat Perangkat</option>
                    <option value="Musyawarah Desa">Musyawarah Desa</option>
                    <option value="Posyandu & Kesehatan">Posyandu & Kesehatan</option>
                    <option value="Gotong Royong">Gotong Royong</option>
                    <option value="Pelatihan UMKM">Pelatihan UMKM</option>
                    <option value="Budaya & Keagamaan">Budaya & Keagamaan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Tanggal Pelaksanaan *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Jam Mulai (WIB)
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Jam Selesai (WIB)
                  </label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Lokasi / Ruangan Kegiatan *
                  </label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Contoh: Aula Balai Desa / Posyandu Melati"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Cakupan Wilayah Dusun
                  </label>
                  <select
                    value={dusun}
                    onChange={(e) => setDusun(e.target.value as HamletName | 'Seluruh Desa')}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white"
                  >
                    <option value="Seluruh Desa">Seluruh Desa (Terpusat)</option>
                    {availableHamlets.map((hm) => (
                      <option key={hm} value={hm}>
                        {hm}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Penanggung Jawab / Koordinator
                  </label>
                  <input
                    type="text"
                    value={coordinator}
                    onChange={(e) => setCoordinator(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Sasaran Peserta Undangan
                  </label>
                  <input
                    type="text"
                    value={participantsTarget}
                    onChange={(e) => setParticipantsTarget(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Estimasi Peserta (Orang)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={expectedCount}
                    onChange={(e) => setExpectedCount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center bg-gray-50 dark:bg-slate-800/70 p-3 rounded-xl border border-gray-200 dark:border-slate-700">
                <label className="flex items-center space-x-2 text-xs font-bold text-gray-800 dark:text-gray-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRoutine}
                    onChange={(e) => setIsRoutine(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Jadwal Kegiatan Rutin</span>
                </label>

                {isRoutine ? (
                  <div>
                    <select
                      value={routineFrequency}
                      onChange={(e) =>
                        setRoutineFrequency(
                          e.target.value as 'Mingguan' | 'Bulanan' | 'Triwulan' | 'Tahunan'
                        )
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-gray-800 dark:text-gray-200"
                    >
                      <option value="Mingguan">Rutin Mingguan</option>
                      <option value="Bulanan">Rutin Bulanan</option>
                      <option value="Triwulan">Rutin Triwulan</option>
                      <option value="Tahunan">Rutin Tahunan</option>
                    </select>
                  </div>
                ) : (
                  <div className="text-[11px] text-gray-400">Kegiatan Insidental / Sekali</div>
                )}

                <div>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as AgendaStatus)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-gray-800 dark:text-gray-200"
                  >
                    <option value="Terjadwal">Status: Terjadwal</option>
                    <option value="Berlangsung">Status: Berlangsung</option>
                    <option value="Selesai">Status: Selesai</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Rincian Pembahasan / Catatan Agenda
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tuliskan pokok bahasan rapat atau perlengkapan yang perlu dibawa warga..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white"
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70 flex items-center justify-between">
                <label className="flex items-center space-x-2 text-xs font-bold text-emerald-900 dark:text-emerald-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendWaOnSave}
                    onChange={(e) => setSendWaOnSave(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Kirim Broadcast Undangan WhatsApp Otomatis ke Peserta & Perangkat</span>
                </label>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              </div>

              {sendWaOnSave && title && (
                <div className="p-3 rounded-xl bg-slate-900 text-emerald-100 text-[11px] font-mono">
                  <p className="font-sans font-bold text-emerald-400 mb-1">
                    Pratinjau Pesan Undangan WhatsApp:
                  </p>
                  <pre className="whitespace-pre-wrap leading-relaxed">
                    {generateWhatsAppEventInvite(
                      {
                        id: 'preview',
                        title,
                        category,
                        date,
                        startTime,
                        endTime,
                        location,
                        dusun,
                        coordinator,
                        coordinatorPhone,
                        participantsTarget,
                        expectedCount,
                        description: description || 'Agenda resmi desa.',
                        status,
                        isRoutine,
                        whatsappBroadcastSent: true,
                      },
                      villageName
                    )}
                  </pre>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-slate-700 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  {editingAgenda ? 'Simpan Perubahan Jadwal' : 'Simpan Jadwal ke Kalender Desa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
