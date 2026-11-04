import React, { useMemo, useState } from 'react';
import {
  Baby,
  Calendar,
  CheckCircle2,
  CreditCard,
  Download,
  FileCheck2,
  FilePlus2,
  FileText,
  HeartPulse,
  Home,
  LogOut,
  MapPin,
  MessageSquarePlus,
  Phone,
  Printer,
  QrCode,
  Receipt,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  Vote,
} from 'lucide-react';
import {
  Citizen,
  CitizenAspiration,
  CitizenSessionUser,
  FamilyRelationRole,
  LetterRequest,
  LetterTypeCode,
  LetterTypeInfo,
  PopulationMutationItem,
  VillageAgenda,
  VillageSiteConfig,
} from '../types/village';
import { addFamilyMember, getBills, payBill } from '../utils/citizenApi';
import {
  computeHouseholdDashboardSummary,
  formatWhatsAppNotification,
  generateCitizenEncryptionHash,
  generateTrackingCode,
} from '../utils/villageLogic';

interface CitizenPortalViewProps {
  sessionUser: CitizenSessionUser;
  token?: string;
  citizens: Citizen[];
  onUpdateCitizens: (citizens: Citizen[]) => void;
  requests: LetterRequest[];
  onSubmitNewRequest: (newReq: LetterRequest, waMessage: string) => void;
  letterTypes: LetterTypeInfo[];
  agendas: VillageAgenda[];
  aspirations: CitizenAspiration[];
  onUpdateAspirations: (aspirations: CitizenAspiration[]) => void;
  populationMutations: PopulationMutationItem[];
  onUpdatePopulationMutations: (mutations: PopulationMutationItem[]) => void;
  siteConfig: VillageSiteConfig;
  onUpdateSiteConfig: (config: VillageSiteConfig) => void;
  onPreviewOfficialLetter: (req: LetterRequest) => void;
  onOpenQrVerifyModal: (req?: LetterRequest) => void;
  onLogoutCitizen: () => void;
  onShowToast: (title: string, message: string) => void;
}

type CitizenPortalSubTab =
  | 'kk_digital'
  | 'surat_keluarga'
  | 'bansos_kesehatan'
  | 'tagihan_pbb'
  | 'aspirasi_keluarga';

export const CitizenPortalView: React.FC<CitizenPortalViewProps> = ({
  sessionUser,
  token,
  citizens,
  onUpdateCitizens,
  requests,
  onSubmitNewRequest,
  letterTypes,
  agendas,
  aspirations,
  onUpdateAspirations,
  populationMutations,
  onUpdatePopulationMutations,
  siteConfig,
  onUpdateSiteConfig,
  onPreviewOfficialLetter,
  onOpenQrVerifyModal,
  onLogoutCitizen,
  onShowToast,
}) => {
  const [subTab, setSubTab] = useState<CitizenPortalSubTab>('kk_digital');

  // State for 1-Click Family Member Letter Submission
  const [selectedMemberNik, setSelectedMemberNik] = useState<string>(sessionUser.nik);
  const [selectedLetterCode, setSelectedLetterCode] = useState<LetterTypeCode>('SKU');
  const [letterPurpose, setLetterPurpose] = useState<string>('');
  const [letterExtraNotes, setLetterExtraNotes] = useState<string>('');
  const [customValues, setCustomValues] = useState<Record<string, string>>({});

  // State for Reporting New Family Member (Kelahiran / Datang Masuk)
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [newMemberNik, setNewMemberNik] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<FamilyRelationRole>('Anak');
  const [newMemberGender, setNewMemberGender] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
  const [newMemberBirthPlace, setNewMemberBirthPlace] = useState('Bogor');
  const [newMemberBirthDate, setNewMemberBirthDate] = useState('2026-03-15');
  const [newMemberMutationType, setNewMemberMutationType] = useState<'KELAHIRAN' | 'DATANG_MASUK'>('KELAHIRAN');
  const [memberFormError, setMemberFormError] = useState<string | null>(null);

  // State for Updating Family WhatsApp Phone
  const [familyPhoneInput, setFamilyPhoneInput] = useState(sessionUser.phone || '');
  const [isEditingPhone, setIsEditingPhone] = useState(false);

  // State for Verified Household Aspiration
  const [aspirationCategory, setAspirationCategory] = useState('Infrastruktur & Jalan Desa');
  const [aspirationSubject, setAspirationSubject] = useState('');
  const [aspirationMessage, setAspirationMessage] = useState('');

  const summary = useMemo(() => {
    return computeHouseholdDashboardSummary(sessionUser.kk, {
      citizens,
      requests,
      agendas,
      aspirations,
      siteConfig,
    });
  }, [sessionUser.kk, citizens, requests, agendas, aspirations, siteConfig]);

  const activeLetterType = useMemo(
    () => letterTypes.find((lt) => lt.code === selectedLetterCode) || letterTypes[0],
    [letterTypes, selectedLetterCode]
  );

  if (!summary) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 text-center space-y-4">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Data Kartu Keluarga ({sessionUser.kk}) tidak ditemukan.
        </p>
        <button
          onClick={onLogoutCitizen}
          className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
        >
          Keluar Sesi Warga
        </button>
      </div>
    );
  }

  const { familyGroup, familyRequests, taxBills, unpaidTaxTotalRupiah } = summary;
  const head = familyGroup.headOfFamily;

  const handleQuickApplyForMember = (member: Citizen, code: LetterTypeCode = 'SKU') => {
    setSelectedMemberNik(member.nik);
    setSelectedLetterCode(code);
    setSubTab('surat_keluarga');
  };

  const handleUpdateFamilyPhone = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = familyPhoneInput.trim();
    if (cleanPhone.length < 8) return;
    const updated = citizens.map((c) =>
      c.kk === familyGroup.kk && c.nik === head.nik ? { ...c, phone: cleanPhone } : c
    );
    onUpdateCitizens(updated);
    setIsEditingPhone(false);
    onShowToast(
      'Kontak Keluarga Diperbarui',
      `Nomor WhatsApp Kepala Keluarga (${head.name}) berhasil diperbarui ke ${cleanPhone}.`
    );
  };

  const handleAddFamilyMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMemberFormError(null);
    const cleanNik = newMemberNik.replace(/\s+/g, '').trim();
    if (!/^\d{16}$/.test(cleanNik)) {
      setMemberFormError('NIK anggota keluarga baru wajib terdiri dari 16 digit angka.');
      return;
    }
    if (citizens.some((c) => c.nik === cleanNik)) {
      setMemberFormError('NIK tersebut sudah terdaftar dalam Buku Induk Penduduk Desa.');
      return;
    }
    if (newMemberName.trim().length < 2) {
      setMemberFormError('Nama lengkap anggota keluarga wajib diisi.');
      return;
    }

    const { ok, status, data } = await addFamilyMember({
        nik: cleanNik,
        name: newMemberName.trim(),
        familyRole: newMemberRole,
        gender: newMemberGender,
        birthPlace: newMemberBirthPlace.trim() || 'Bogor',
        birthDate: newMemberBirthDate,
        mutationType: newMemberMutationType,
        phone: head.phone,
      }, token || '');
      if (status === 401) { setMemberFormError('Sesi berakhir, silakan masuk kembali.'); return; }
      if (!ok) { setMemberFormError(data?.error || 'Gagal menambah anggota.'); return; }
      if (data?.citizen) {
        onUpdateCitizens(data.citizens);
        onUpdatePopulationMutations(data.populationMutations);
        setShowAddMemberForm(false);
        setNewMemberNik('');
        setNewMemberName('');
        onShowToast(
          'Anggota Kartu Keluarga Ditambahkan!',
          `${data.citizen.name} berhasil ditambahkan ke KK ${familyGroup.kk} & tercatat di Buku Mutasi Penduduk.`
        );
        return;
      }

  };

  const handleOneClickLetterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!letterPurpose.trim()) return;
    const applicant =
      familyGroup.members.find((m: any) => m.nik === selectedMemberNik) || head;
    const typeInfo =
      letterTypes.find((lt) => lt.code === selectedLetterCode) || letterTypes[0];

    const trackingCode = generateTrackingCode(selectedLetterCode, requests.length + 1);
    const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');

    const newReq: LetterRequest = {
      id: `req-kk-${Date.now()}`,
      trackingCode,
      nik: applicant.nik,
      citizenName: applicant.name,
      kk: familyGroup.kk,
      dusun: applicant.dusun,
      rt: applicant.rt,
      rw: applicant.rw,
      whatsapp: applicant.phone || head.phone || '081287654321',
      letterType: typeInfo.code,
      letterTitle: typeInfo.name,
      purpose: letterPurpose.trim(),
      extraNotes:
        letterExtraNotes.trim() ||
        `Diajukan melalui Portal Mandiri Kepala Keluarga (${head.name} - KK ${familyGroup.kk})`,
      customFieldValues: customValues,
      attachmentName: `KK_Digital_Terverifikasi_${familyGroup.kk}.pdf`,
      status: 'Menunggu Verifikasi',
      createdAt: nowStr,
      updatedAt: nowStr,
      whatsappNotifiedCount: 1,
      checklist: {
        nikMatchDukcapil: true,
        kkMatchDukcapil: true,
        ktpAttachmentClear: true,
        pengantarRtRwValid: true,
        noTaxArrearsPbb: unpaidTaxTotalRupiah === 0,
      },
    };

    const waMsg = formatWhatsAppNotification(newReq, siteConfig.villageName);
    newReq.lastWhatsappMessage = waMsg;
    onSubmitNewRequest(newReq, waMsg);
    setLetterPurpose('');
    setLetterExtraNotes('');
    setCustomValues({});
  };

  const handlePayTaxBill = async (billId: string) => {
    const { ok, status, data } = await payBill(billId, token || '');
    if (status === 401) { onShowToast('Sesi berakhir', 'Silakan masuk kembali.'); return; }
    if (status === 409) { onShowToast('Tagihan sudah lunas', 'Tagihan ini sudah dibayar.'); return; }
    if (status === 503 || !ok) { onShowToast('Layanan tidak tersedia', 'Coba lagi nanti.'); return; }
    // reload bills from server
    const billsRes = await getBills(token || '');
    if (billsRes.ok && billsRes.data?.bills) {
      const updated = (siteConfig.citizenTaxBills || []).map((b: any) => {
        const serverBill = billsRes.data.bills.find((x: any) => x.id === b.id);
        return serverBill ? { ...b, ...serverBill } : b;
      });
      onUpdateSiteConfig({ ...siteConfig, citizenTaxBills: updated });
    }
    onShowToast('Pembayaran dicatat', 'Menunggu konfirmasi petugas.');
  };

  const handleSubmitHouseholdAspiration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aspirationSubject.trim() || !aspirationMessage.trim()) return;

    const newAsp: CitizenAspiration = {
      id: `asp-kk-${Date.now()}`,
      ticketNumber: `ASP-KK-${new Date().getFullYear()}-${String(aspirations.length + 1).padStart(3, '0')}`,
      senderName: head.name,
      citizenName: head.name,
      dusun: familyGroup.dusun,
      whatsapp: head.phone,
      category: aspirationCategory,
      subject: aspirationSubject.trim(),
      title: aspirationSubject.trim(),
      message: aspirationMessage.trim(),
      content: aspirationMessage.trim(),
      status: 'Ditindaklanjuti',
      createdAt: new Date().toISOString().slice(0, 10),
      responseNote:
        'Laporan terverifikasi dari Portal Kepala Keluarga (KK). Telah diteruskan otomatis ke Kepala Dusun & Kasi Pelayanan.',
      isPublic: true,
    };

    onUpdateAspirations([newAsp, ...aspirations]);
    setAspirationSubject('');
    setAspirationMessage('');
    onShowToast(
      'Aspirasi Keluarga Terkirim',
      `Tiket ${newAsp.ticketNumber} atas nama KK ${head.name} telah diterima perangkat desa.`
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Executive Household Header */}
      <section className="bg-slate-900 dark:bg-slate-950 text-white rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-400 font-semibold">
              <span>Portal Layanan Mandiri Kepala Keluarga</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">No. KK: {familyGroup.kk}</span>
              <span aria-hidden="true">·</span>
              <span>Terverifikasi Dukcapil {siteConfig.villageName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Keluarga {head.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              {familyGroup.address}, RT {familyGroup.rt} / RW {familyGroup.rw}, {familyGroup.dusun},{' '}
              {siteConfig.villageName}, {siteConfig.subDistrict}, {siteConfig.district}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setSubTab('surat_keluarga')}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center space-x-2 transition-colors cursor-pointer"
            >
              <FilePlus2 className="w-4 h-4" />
              <span>Ajukan Surat Keluarga (1-Klik)</span>
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold inline-flex items-center space-x-2 border border-slate-700 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak KK Digital</span>
            </button>
            <button
              onClick={onLogoutCitizen}
              className="px-3.5 py-2.5 rounded-xl bg-red-950/80 hover:bg-red-900 text-red-200 text-xs font-semibold inline-flex items-center space-x-1.5 border border-red-800/60 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar</span>
            </button>
          </div>
        </div>

        {/* 4 Key Household Metrics Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800">
          <div>
            <p className="text-xs text-slate-400">Anggota Kartu Keluarga</p>
            <p className="text-xl font-extrabold text-white tabular-nums mt-0.5">
              {familyGroup.members.length} Jiwa
            </p>
            <p className="text-[11px] text-emerald-400 mt-0.5">
              {summary.votingEligibleMembers.length} Wajib KTP / Pemilih ({familyGroup.tpsNumber})
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Status Bansos / DTKS Keluarga</p>
            <p className="text-xl font-extrabold text-white mt-0.5">
              {familyGroup.aidPrograms.length > 0
                ? familyGroup.aidPrograms.join(' & ')
                : 'Keluarga Mandiri'}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {head.aidStage || 'Terdaftar Basis Data Terpadu Desa'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Dokumen & Surat Keluarga</p>
            <p className="text-xl font-extrabold text-white tabular-nums mt-0.5">
              {familyRequests.length} Berkas
            </p>
            <p className="text-[11px] text-emerald-400 mt-0.5 tabular-nums">
              {summary.completedLettersCount} Selesai TTE · {summary.pendingLettersCount} Diproses
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Tagihan PBB-P2 & Iuran Desa</p>
            <p className="text-xl font-extrabold text-white tabular-nums mt-0.5">
              Rp {unpaidTaxTotalRupiah.toLocaleString('id-ID')}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {unpaidTaxTotalRupiah === 0
                ? 'Seluruh Tagihan Lunas'
                : `${taxBills.filter((b: any) => b.status === 'Belum Bayar').length} Tagihan Belum Dibayar`}
            </p>
          </div>
        </div>
      </section>

      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
        {[
          { id: 'kk_digital', label: 'Kartu Keluarga (KK) Digital', icon: Users },
          {
            id: 'surat_keluarga',
            label: `Layanan Surat Keluarga (${familyRequests.length})`,
            icon: FileText,
          },
          {
            id: 'bansos_kesehatan',
            label: 'Bansos DTKS, Posyandu & TPS',
            icon: HeartPulse,
          },
          {
            id: 'tagihan_pbb',
            label: `Pajak PBB-P2 & Iuran (${taxBills.length})`,
            icon: Receipt,
          },
          {
            id: 'aspirasi_keluarga',
            label: 'Pengaduan & Aspirasi KK',
            icon: MessageSquarePlus,
          },
        ].map((item) => {
          const Icon = item.icon;
          const active = subTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setSubTab(item.id as CitizenPortalSubTab)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold inline-flex items-center space-x-2 transition-colors whitespace-nowrap cursor-pointer ${
                active
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: KARTU KELUARGA (KK) DIGITAL & ANGGOTA KELUARGA */}
      {subTab === 'kk_digital' && (
        <div className="space-y-6">
          {/* Official Digital Family Card Container */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50/70 dark:bg-slate-800/40">
              <div>
                <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>SALINAN RESMI KARTU KELUARGA DIGITAL</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">Kode Desa: {siteConfig.villageCode}</span>
                </div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white font-mono tabular-nums mt-0.5">
                  No. KK: {familyGroup.kk}
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowAddMemberForm(!showAddMemberForm)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center space-x-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Lapor Tambah Anggota KK (Lahir / Datang)</span>
                </button>
                <button
                  onClick={() => setIsEditingPhone(!isEditingPhone)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center space-x-1.5 cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>WA: {head.phone}</span>
                </button>
              </div>
            </div>

            {/* Optional Edit WhatsApp Bar */}
            {isEditingPhone && (
              <form
                onSubmit={handleUpdateFamilyPhone}
                className="px-6 py-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 border-b border-emerald-200 dark:border-emerald-900/50 flex flex-wrap items-center gap-3"
              >
                <label
                  htmlFor="kk-phone-input"
                  className="text-xs font-bold text-slate-800 dark:text-slate-200"
                >
                  Nomor WhatsApp Aktif Kepala Keluarga (Untuk Notifikasi Surat TTE):
                </label>
                <input
                  id="kk-phone-input"
                  type="text"
                  value={familyPhoneInput}
                  onChange={(e) => setFamilyPhoneInput(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono tabular-nums text-slate-900 dark:text-white"
                  required
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                >
                  Simpan Nomor WA
                </button>
              </form>
            )}

            {/* Add New Family Member Form (Birth / Incoming) */}
            {showAddMemberForm && (
              <form
                onSubmit={handleAddFamilyMemberSubmit}
                className="p-6 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Formulir Pelaporan Anggota Keluarga Baru (Kelahiran / Pindah Masuk)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Otomatis memperbarui daftar anggota KK {familyGroup.kk} dan mencatat ke Buku Mutasi Penduduk Desa.
                    </p>
                  </div>
                </div>

                {memberFormError && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
                    {memberFormError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label
                      htmlFor="new-member-nik"
                      className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                    >
                      NIK Anggota Baru / NIK Sementara (16 Digit)
                    </label>
                    <input
                      id="new-member-nik"
                      type="text"
                      maxLength={16}
                      value={newMemberNik}
                      onChange={(e) => setNewMemberNik(e.target.value)}
                      placeholder="Contoh: 3201141503260004"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono tabular-nums"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="new-member-name"
                      className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Nama Lengkap Sesuai Akta / KTP
                    </label>
                    <input
                      id="new-member-name"
                      type="text"
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      placeholder="Contoh: Zahra Aulia Subarjo"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="new-member-role"
                      className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Status Hubungan Dalam Keluarga (SHDK)
                    </label>
                    <select
                      id="new-member-role"
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value as FamilyRelationRole)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    >
                      <option value="Anak">Anak</option>
                      <option value="Istri">Istri</option>
                      <option value="Orang Tua">Orang Tua</option>
                      <option value="Famili Lain">Famili Lain</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="new-member-gender"
                      className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Jenis Kelamin
                    </label>
                    <select
                      id="new-member-gender"
                      value={newMemberGender}
                      onChange={(e) =>
                        setNewMemberGender(e.target.value as 'Laki-laki' | 'Perempuan')
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    >
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="new-member-birthdate"
                      className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Tanggal Lahir
                    </label>
                    <input
                      id="new-member-birthdate"
                      type="date"
                      value={newMemberBirthDate}
                      onChange={(e) => setNewMemberBirthDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono tabular-nums"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="new-member-mutation"
                      className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Jenis Peristiwa Kependudukan
                    </label>
                    <select
                      id="new-member-mutation"
                      value={newMemberMutationType}
                      onChange={(e) =>
                        setNewMemberMutationType(
                          e.target.value as 'KELAHIRAN' | 'DATANG_MASUK'
                        )
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    >
                      <option value="KELAHIRAN">Kelahiran Bayi Baru (F-2.01)</option>
                      <option value="DATANG_MASUK">Pindah Masuk Anggota Keluarga (SKPWNI)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddMemberForm(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                  >
                    Simpan Anggota Baru ke KK
                  </button>
                </div>
              </form>
            )}

            {/* Family Members High-Density Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
                    <th className="py-3 px-4">No</th>
                    <th className="py-3 px-4">Nama Lengkap & SHDK</th>
                    <th className="py-3 px-4">NIK (16 Digit)</th>
                    <th className="py-3 px-4">L/P</th>
                    <th className="py-3 px-4">Tempat, Tgl Lahir (Umur)</th>
                    <th className="py-3 px-4">Pendidikan & Pekerjaan</th>
                    <th className="py-3 px-4">Program Bansos</th>
                    <th className="py-3 px-4 text-right">Layanan Cepat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {familyGroup.members.map((member: any, index: number) => (
                    <tr
                      key={member.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono tabular-nums text-slate-500">
                        {index + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {member.name}
                        </div>
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                          {member.familyRole || 'Anggota Keluarga'} · {member.maritalStatus}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {member.nik}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        {member.gender}
                      </td>
                      <td className="py-3.5 px-4 tabular-nums text-slate-600 dark:text-slate-300">
                        {member.birthPlace}, {member.birthDate} ({member.age} Thn)
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        <div>{member.occupation}</div>
                        <div className="text-[11px] text-slate-400">{member.education}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-xs font-semibold ${
                            member.aidStatus !== 'Non-Penerima'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {member.aidStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleQuickApplyForMember(member, 'DOMISILI')}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 text-white text-[11px] font-semibold whitespace-nowrap cursor-pointer"
                        >
                          Ajukan Surat
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* KK Integrity Footer */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-mono tabular-nums">
                  Hash Integritas KK: {generateCitizenEncryptionHash(head)}
                </span>
              </div>
              <div>
                Kepala {siteConfig.villageName}: <strong>{siteConfig.headOfVillageName}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LAYANAN SURAT KELUARGA 1-KLIK & RIWAYAT SURAT KK */}
      {subTab === 'surat_keluarga' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: 1-Click Household Letter Application Form */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Pengajuan Surat Cepat (Auto-Fill Anggota KK)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pilih anggota keluarga dari KK {familyGroup.kk}; data NIK, alamat, dan RT/RW terisi otomatis.
              </p>
            </div>

            <form onSubmit={handleOneClickLetterSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="kk-member-select"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Pilih Anggota Keluarga Pemohon
                </label>
                <select
                  id="kk-member-select"
                  value={selectedMemberNik}
                  onChange={(e) => setSelectedMemberNik(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                >
                  {familyGroup.members.map((m: any) => (
                    <option key={m.id} value={m.nik}>
                      {m.name} ({m.familyRole}) — NIK: {m.nik}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="kk-letter-type-select"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Jenis Surat Resmi Desa (16 Layanan TTE)
                </label>
                <select
                  id="kk-letter-type-select"
                  value={selectedLetterCode}
                  onChange={(e) => {
                    setSelectedLetterCode(e.target.value);
                    setCustomValues({});
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                >
                  {letterTypes.map((lt) => (
                    <option key={lt.code} value={lt.code}>
                      [{lt.code}] {lt.name} (SLA {lt.estimatedHours} Jam)
                    </option>
                  ))}
                </select>
              </div>

              {activeLetterType?.customFields && activeLetterType.customFields.length > 0 && (
                <div className="space-y-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Rincian Khusus {activeLetterType.name}:
                  </p>
                  {activeLetterType.customFields.map((field) => (
                    <div key={field.key}>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        {field.label}
                      </label>
                      <input
                        type="text"
                        value={customValues[field.key] || ''}
                        onChange={(e) =>
                          setCustomValues({ ...customValues, [field.key]: e.target.value })
                        }
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                        required={field.required}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label
                  htmlFor="kk-letter-purpose"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Keperluan Pembuatan Surat
                </label>
                <input
                  id="kk-letter-purpose"
                  type="text"
                  value={letterPurpose}
                  onChange={(e) => setLetterPurpose(e.target.value)}
                  placeholder="Contoh: Persyaratan Administrasi Bank / Beasiswa Sekolah"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="kk-letter-notes"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Keterangan Tambahan (Opsional)
                </label>
                <input
                  id="kk-letter-notes"
                  type="text"
                  value={letterExtraNotes}
                  onChange={(e) => setLetterExtraNotes(e.target.value)}
                  placeholder="Catatan tambahan untuk perangkat desa"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-xs cursor-pointer"
              >
                <FilePlus2 className="w-4 h-4" />
                <span>Terbitkan Permohonan Surat Keluarga</span>
              </button>
            </form>
          </div>

          {/* Right: Household Letter History & TTE Download */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Riwayat Surat Seluruh Anggota KK ({familyRequests.length})
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Pantau status verifikasi dan unduh dokumen resmi ber-QR Code TTE Kepala Desa.
                </p>
              </div>
            </div>

            {familyRequests.length === 0 ? (
              <div className="p-8 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center space-y-2">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Belum ada riwayat pengajuan surat pada Kartu Keluarga ini.
                </p>
                <p className="text-[11px] text-slate-400">
                  Gunakan formulir di sebelah kiri untuk mengajukan surat pengantar bagi anggota keluarga Anda.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {familyRequests.map((req: any) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-300 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-mono font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                          {req.trackingCode}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {req.status}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="text-slate-400 tabular-nums">{req.createdAt}</span>
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        {req.letterTitle}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Pemohon: <strong>{req.citizenName}</strong> (NIK: {req.nik}) · Keperluan:{' '}
                        {req.purpose}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onPreviewOfficialLetter(req)}
                        className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center space-x-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Buka / Cetak PDF</span>
                      </button>
                      <button
                        onClick={() => onOpenQrVerifyModal(req)}
                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                        title="Verifikasi QR TTE"
                        aria-label={`Verifikasi QR ${req.trackingCode}`}
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: BANSOS DTKS, POSYANDU & TPS KELUARGA */}
      {subTab === 'bansos_kesehatan' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card 1: Status DTKS & Bantuan Sosial Keluarga */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Bantuan Sosial & DTKS Keluarga
                </h3>
                <p className="text-[11px] text-slate-500">Status KPM per Anggota KK</p>
              </div>
            </div>

            <div className="space-y-2.5">
              {familyGroup.members.map((m: any) => (
                <div
                  key={m.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{m.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {m.familyRole} · {m.aidStage || 'Verifikasi Musdessus'}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-bold ${
                      m.aidStatus !== 'Non-Penerima'
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {m.aidStatus}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Posyandu & Tumbuh Kembang Anak / Bumil */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 flex items-center justify-center">
                <Baby className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  KMS Posyandu & Kesehatan Keluarga
                </h3>
                <p className="text-[11px] text-slate-500">
                  {summary.posyanduSchedule?.posyanduName || `Posyandu ${familyGroup.dusun}`}
                </p>
              </div>
            </div>

            {summary.posyanduSchedule && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  Jadwal Posyandu Berikutnya: {summary.posyanduSchedule.nextDate}
                </p>
                <p className="text-[11px] text-slate-500">
                  Lokasi: {summary.posyanduSchedule.location} · Bidan:{' '}
                  {summary.posyanduSchedule.midwifeName}
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                  Menu PMT: {summary.posyanduSchedule.pmtMenu}
                </p>
              </div>
            )}

            {summary.posyanduRecords.length === 0 ? (
              <p className="text-xs text-slate-500">
                Tidak ada catatan balita/ibu hamil aktif pada Kartu Keluarga ini.
              </p>
            ) : (
              <div className="space-y-2.5">
                {summary.posyanduRecords.map((rec: any) => (
                  <div
                    key={rec.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1"
                  >
                    <p className="font-bold text-slate-900 dark:text-white">
                      {rec.childOrMotherName}
                    </p>
                    <p className="text-[11px] text-slate-500 tabular-nums">
                      BB: {rec.weightKg} kg · TB: {rec.heightCm} cm · Status:{' '}
                      <strong className="text-emerald-700 dark:text-emerald-400">
                        {rec.nutritionalStatus}
                      </strong>
                    </p>
                    <p className="text-[11px] text-slate-400">{rec.notes}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 3: Hak Pilih DPT & Lokasi TPS Keluarga */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                <Vote className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Lokasi TPS & Daftar Pemilih Tetap (DPT)
                </h3>
                <p className="text-[11px] text-slate-500">
                  {summary.tpsInfo?.tpsNumber || familyGroup.tpsNumber} — {familyGroup.dusun}
                </p>
              </div>
            </div>

            {summary.tpsInfo && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                <p className="font-bold text-slate-900 dark:text-white">
                  {summary.tpsInfo.tpsNumber}: {summary.tpsInfo.locationName}
                </p>
                <p className="text-[11px] text-slate-500">{summary.tpsInfo.rtRwScope}</p>
                <p className="text-[11px] text-slate-500">{summary.tpsInfo.scheduleInfo}</p>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Anggota Keluarga Pemilih Aktif ({summary.votingEligibleMembers.length} Orang):
              </p>
              {summary.votingEligibleMembers.map((v: any) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between text-xs py-2 border-b border-slate-100 dark:border-slate-800"
                >
                  <span className="font-medium text-slate-800 dark:text-slate-200">{v.name}</span>
                  <span className="font-mono tabular-nums text-[11px] text-emerald-700 dark:text-emerald-400">
                    {v.age} Thn · Terdaftar DPT
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PAJAK PBB-P2 & IURAN DESA KELUARGA */}
      {subTab === 'tagihan_pbb' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                SPPT Pajak Bumi & Bangunan (PBB-P2), PAMSIMAS & Retribusi Lingkungan
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pembayaran lunas PBB-P2 terhubung langsung dengan syarat verifikasi pengajuan surat desa.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500">Total Belum Dibayar: </span>
              <span className="text-sm font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
                Rp {unpaidTaxTotalRupiah.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {taxBills.map((bill: any) => (
              <div
                key={bill.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {bill.category} ({bill.year})
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums text-slate-500">{bill.nopOrCode}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{bill.locationLabel}</p>
                  <p className="text-[11px] text-slate-400 tabular-nums">
                    Jatuh Tempo: {bill.dueDate}
                    {bill.paidAt ? ` · Dibayar: ${bill.paidAt} (${bill.receiptCode})` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-extrabold font-mono tabular-nums text-slate-900 dark:text-white">
                      Rp {bill.amountRupiah.toLocaleString('id-ID')}
                    </p>
                    <p
                      className={`text-[11px] font-bold ${
                        bill.status === 'Lunas'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {bill.status}
                    </p>
                  </div>

                  {bill.status === 'Belum Bayar' ? (
                    <button
                      onClick={() => handlePayTaxBill(bill.id)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center space-x-1.5 cursor-pointer"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Bayar Lunas (QRIS Desa)</span>
                    </button>
                  ) : (
                    <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold inline-flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Kwitansi Aktif</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: PENGADUAN & ASPIRASI WARGA TERVERIFIKASI KK */}
      {subTab === 'aspirasi_keluarga' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleSubmitHouseholdAspiration}
            className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-4"
          >
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Kirim Aspirasi / Laporan Kepala Keluarga
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Laporan dari akun KK terverifikasi mendapat prioritas tindak lanjut langsung dari Kepala Dusun & Perangkat Desa.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kategori Laporan / Usulan Musrenbang
              </label>
              <select
                value={aspirationCategory}
                onChange={(e) => setAspirationCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              >
                <option value="Infrastruktur & Jalan Desa">Infrastruktur & Jalan Desa</option>
                <option value="Layanan Administrasi & Bansos">Layanan Administrasi & Bansos</option>
                <option value="Penerangan Jalan & Keamanan RT">Penerangan Jalan & Keamanan RT</option>
                <option value="Air Bersih & Irigasi Pertanian">Air Bersih & Irigasi Pertanian</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="kk-asp-subject"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
              >
                Judul Aspirasi / Lokasi Kejadian
              </label>
              <input
                id="kk-asp-subject"
                type="text"
                value={aspirationSubject}
                onChange={(e) => setAspirationSubject(e.target.value)}
                placeholder="Contoh: Usulan Perbaikan Drainase RT 001"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                required
              />
            </div>

            <div>
              <label
                htmlFor="kk-asp-message"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
              >
                Uraian Lengkap Laporan Warga
              </label>
              <textarea
                id="kk-asp-message"
                rows={4}
                value={aspirationMessage}
                onChange={(e) => setAspirationMessage(e.target.value)}
                placeholder="Tuliskan rincian kondisi lapangan atau usulan keluarga Anda..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
            >
              Kirim Aspirasi Resmi Keluarga
            </button>
          </form>

          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              Tindak Lanjut Aspirasi Warga & Lingkungan ({aspirations.length})
            </h2>
            <div className="space-y-3">
              {aspirations.slice(0, 5).map((asp) => (
                <div
                  key={asp.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {asp.ticketNumber} · {asp.category}
                    </span>
                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                      {asp.status}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {asp.subject || asp.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {asp.message || asp.content}
                  </p>
                  {asp.responseNote && (
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 pt-1">
                      Tanggapan Pemdes: {asp.responseNote}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
