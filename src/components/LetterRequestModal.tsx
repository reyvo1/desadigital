import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileCheck,
  FileText,
  MessageSquare,
  Search,
  Send,
  ShieldCheck,
  Upload,
  UserCheck,
  X,
} from 'lucide-react';
import {
  Citizen,
  HamletName,
  LetterRequest,
  LetterTypeCode,
  LetterTypeInfo,
  VillageSiteConfig,
} from '../types/village';
import {
  formatWhatsAppNotification,
  generateTrackingCode,
  validateNikFormat,
} from '../utils/villageLogic';

interface LetterRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedType?: LetterTypeCode;
  citizens: Citizen[];
  existingRequestsCount: number;
  onSubmitRequest: (newRequest: LetterRequest, waMessage: string) => void;
  letterTypes: LetterTypeInfo[];
  siteConfig: VillageSiteConfig;
  hamlets?: { name: string }[];
}

export const LetterRequestModal: React.FC<LetterRequestModalProps> = ({
  isOpen,
  onClose,
  preselectedType = 'SKU',
  citizens,
  existingRequestsCount,
  onSubmitRequest,
  letterTypes,
  siteConfig,
  hamlets = [],
}) => {
  const activeLetterTypes = letterTypes;
  const [letterType, setLetterType] = useState<LetterTypeCode>(preselectedType);
  const [nik, setNik] = useState('');
  const [citizenName, setCitizenName] = useState('');
  const [kk, setKk] = useState('');
  const defaultHamlet =
    hamlets[0]?.name || citizens[0]?.dusun || siteConfig.defaults?.dusun || 'Dusun 1 Sukasari';
  const [dusun, setDusun] = useState<HamletName>(defaultHamlet);
  const [rt, setRt] = useState(siteConfig.defaults?.rt || '001');
  const [rw, setRw] = useState(siteConfig.defaults?.rw || '001');
  const [whatsapp, setWhatsapp] = useState('');
  const [purpose, setPurpose] = useState('');
  const [extraNotes, setExtraNotes] = useState('');
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [attachmentName, setAttachmentName] = useState('KTP_dan_KK_Terverifikasi.pdf');
  const [attachmentDataUrl, setAttachmentDataUrl] = useState<string | undefined>(undefined);
  const [matchedCitizen, setMatchedCitizen] = useState<Citizen | null>(null);
  const [nikError, setNikError] = useState<string | null>(null);
  const [submittedRequest, setSubmittedRequest] = useState<LetterRequest | null>(null);

  const availableHamlets = Array.from(
    new Set([
      ...hamlets.map((h) => h.name),
      ...citizens.map((c) => c.dusun),
    ])
  );

  useEffect(() => {
    if (preselectedType) {
      setLetterType(preselectedType);
      setCustomFieldValues({});
    }
  }, [preselectedType]);

  if (!isOpen) return null;

  const selectedTypeInfo =
    activeLetterTypes.find((t) => t.code === letterType) || activeLetterTypes[0];

  const handleNikLookup = (inputNik: string) => {
    setNik(inputNik);
    setNikError(null);
    const cleaned = inputNik.replace(/\s+/g, '');
    if (cleaned.length === 16) {
      const found = citizens.find((c) => c.nik === cleaned);
      if (found) {
        setMatchedCitizen(found);
        setCitizenName(found.name);
        setKk(found.kk);
        setDusun(found.dusun);
        setRt(found.rt);
        setRw(found.rw);
        setWhatsapp(found.phone);
      } else {
        setMatchedCitizen(null);
      }
    } else {
      setMatchedCitizen(null);
    }
  };

  const handleQuickFillSampleCitizen = (c: Citizen) => {
    setNik(c.nik);
    setMatchedCitizen(c);
    setCitizenName(c.name);
    setKk(c.kk);
    setDusun(c.dusun);
    setRt(c.rt);
    setRw(c.rw);
    setWhatsapp(c.phone);
    setNikError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateNikFormat(nik);
    if (!validation.isValid) {
      setNikError(validation.errorMessage || 'NIK tidak valid');
      return;
    }
    if (!citizenName.trim() || !purpose.trim() || !whatsapp.trim()) {
      setNikError('Mohon lengkapi nama pemohon, nomor WhatsApp aktif, dan keperluan surat.');
      return;
    }

    // Build summary of custom fields for extraNotes compatibility
    const customSummaryParts: string[] = [];
    for (const def of selectedTypeInfo?.customFields || []) {
      const val = (customFieldValues[def.key] || '').trim();
      if (val) {
        customSummaryParts.push(`${def.label}: ${val}`);
      }
    }
    const mergedNotes = [customSummaryParts.join(' | '), extraNotes.trim()]
      .filter(Boolean)
      .join(' — ');

    const seq = existingRequestsCount + 1;
    const trackingCode = generateTrackingCode(letterType, seq);
    const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');

    const newReq: LetterRequest = {
      id: `req-${Date.now()}`,
      trackingCode,
      nik: validation.cleanNik,
      citizenName: citizenName.trim(),
      kk: kk.trim() || siteConfig.defaults?.kk || '3201140401100000',
      dusun,
      rt,
      rw,
      whatsapp: whatsapp.trim(),
      letterType,
      letterTitle: selectedTypeInfo?.name || `Surat Keterangan (${letterType})`,
      purpose: purpose.trim(),
      extraNotes: mergedNotes || siteConfig.defaults?.extraNotes || undefined,
      customFieldValues: Object.keys(customFieldValues).length > 0 ? customFieldValues : undefined,
      signerRole:
        selectedTypeInfo?.defaultSignerRole ||
        (siteConfig.headOfVillageTitle as any) ||
        'Kepala Desa',
      attachmentName,
      attachmentDataUrl,
      status: 'Menunggu Verifikasi',
      createdAt: nowStr,
      updatedAt: nowStr,
      whatsappNotifiedCount: 1,
      checklist: {
        nikMatchDukcapil: Boolean(matchedCitizen),
        kkMatchDukcapil: Boolean(matchedCitizen),
        ktpAttachmentClear: true,
        pengantarRtRwValid: true,
        noTaxArrearsPbb: true,
      },
    };

    const waMsg = formatWhatsAppNotification(
      {
        trackingCode: newReq.trackingCode,
        citizenName: newReq.citizenName,
        letterTitle: newReq.letterTitle,
        status: newReq.status,
        adminNotes:
          'Permohonan Anda telah masuk ke antrean sistem verifikasi dokumen perangkat desa.',
      },
      siteConfig.villageName
    );

    newReq.lastWhatsappMessage = waMsg;
    setSubmittedRequest(newReq);
    onSubmitRequest(newReq, waMsg);
  };

  const handleResetAndClose = () => {
    setSubmittedRequest(null);
    setNik('');
    setCitizenName('');
    setKk('');
    setPurpose('');
    setExtraNotes('');
    setCustomFieldValues({});
    setMatchedCitizen(null);
    setNikError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 pt-8 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-emerald-100 dark:border-slate-800 shadow-2xl overflow-hidden mb-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center space-x-2.5">
            <FileText className="w-5 h-5 text-emerald-300" />
            <div>
              <h3 className="font-bold text-base">Layanan Pengajuan Surat Mandiri Online</h3>
              <p className="text-xs text-emerald-200">
                Terintegrasi Verifikasi NIK Kependudukan {siteConfig.villageName} & Notifikasi WhatsApp Otomatis
              </p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submittedRequest ? (
          <div className="p-6 space-y-5">
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-start space-x-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                  Permohonan Surat Berhasil Diterima Sistem!
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                  Simpan Kode Tiket di bawah ini untuk memantau progres verifikasi perangkat desa atau unduh surat setelah selesai.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 dark:bg-slate-800/70 p-4 rounded-xl border border-gray-200 dark:border-slate-700 text-xs">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Kode Tiket Pelacakan:</span>
                <p className="font-mono font-extrabold text-base text-emerald-700 dark:text-emerald-400 mt-0.5">
                  {submittedRequest.trackingCode}
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Status Saat Ini:</span>
                <p className="font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                  ⏳ {submittedRequest.status}
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Pemohon / NIK:</span>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {submittedRequest.citizenName} ({submittedRequest.nik})
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Notifikasi WhatsApp:</span>
                <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                  Terkirim ke {submittedRequest.whatsapp}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 text-emerald-100 text-xs font-mono space-y-1.5">
              <div className="flex items-center space-x-1.5 text-emerald-400 font-sans font-bold">
                <MessageSquare className="w-4 h-4" />
                <span>Salinan Pesan WhatsApp Otomatis yang Dikirim ke Warga:</span>
              </div>
              <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-emerald-100/90">
                {submittedRequest.lastWhatsappMessage}
              </pre>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleResetAndClose}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Selesai & Kembali ke Layanan
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Quick sample autofill bar */}
            <div className="p-3 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center space-x-1">
                  <Search className="w-3.5 h-3.5" />
                  <span>Uji Coba Cepat: Pilih NIK Warga Terdaftar (Auto-Fill Database)</span>
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {citizens.slice(0, 4).map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => handleQuickFillSampleCitizen(c)}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-emerald-200 dark:border-slate-700 text-[11px] font-medium text-gray-700 dark:text-gray-200 hover:border-emerald-500 transition-colors cursor-pointer"
                  >
                    {c.name} ({c.nik.slice(0, 6)}...{c.nik.slice(-4)})
                  </button>
                ))}
              </div>
            </div>

            {nikError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{nikError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Jenis Surat Keterangan *
                </label>
                <select
                  value={letterType}
                  onChange={(e) => {
                    setLetterType(e.target.value as LetterTypeCode);
                    setCustomFieldValues({});
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {activeLetterTypes.map((lt) => (
                    <option key={lt.code} value={lt.code}>
                      [{lt.code}] {lt.name} (~{lt.estimatedHours} Jam)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  NIK Pemohon (16 Digit) *
                </label>
                <input
                  type="text"
                  maxLength={16}
                  value={nik}
                  onChange={(e) => handleNikLookup(e.target.value)}
                  placeholder="Contoh: 3201141205820001"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
                {matchedCitizen && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center space-x-1">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Terverifikasi Database Penduduk: {matchedCitizen.name}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Nama Lengkap Sesuai KTP *
                </label>
                <input
                  type="text"
                  value={citizenName}
                  onChange={(e) => setCitizenName(e.target.value)}
                  placeholder="Nama Lengkap Pemohon"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Nomor WhatsApp Aktif (Untuk Notifikasi Otomatis) *
                </label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="0812xxxxxxxx"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Wilayah Dusun
                </label>
                <select
                  value={dusun}
                  onChange={(e) => setDusun(e.target.value as HamletName)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white"
                >
                  {availableHamlets.map((hmName) => (
                    <option key={hmName} value={hmName}>
                      {hmName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  RT / RW
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={rt}
                    onChange={(e) => setRt(e.target.value)}
                    placeholder="RT"
                    className="w-1/2 px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-center text-gray-900 dark:text-white"
                  />
                  <input
                    type="text"
                    value={rw}
                    onChange={(e) => setRw(e.target.value)}
                    placeholder="RW"
                    className="w-1/2 px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-center text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Nomor KK
                </label>
                <input
                  type="text"
                  value={kk}
                  onChange={(e) => setKk(e.target.value)}
                  placeholder="16 Digit Nomor KK"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Dynamic Custom Fields Specific to Selected Letter Type */}
            {selectedTypeInfo?.customFields && selectedTypeInfo.customFields.length > 0 && (
              <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-emerald-900 dark:text-emerald-300">
                    Data Khusus {selectedTypeInfo.name} ({selectedTypeInfo.code})
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                    Kode Klasifikasi: {selectedTypeInfo.classificationCode || '470'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedTypeInfo.customFields.map((field) => (
                    <div key={field.key}>
                      <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                        {field.label} {field.required ? '*' : ''}
                      </label>
                      <input
                        type="text"
                        required={Boolean(field.required)}
                        value={customFieldValues[field.key] || ''}
                        onChange={(e) =>
                          setCustomFieldValues((prev) => ({
                            ...prev,
                            [field.key]: e.target.value,
                          }))
                        }
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2 rounded-xl border border-emerald-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Keperluan Pengajuan Surat *
              </label>
              <textarea
                rows={2}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Contoh: Persyaratan pengajuan KUR Bank BRI / Beasiswa Pendidikan Anak / Administrasi KUA..."
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Catatan Tambahan Pemohon (Opsional)
                </label>
                <input
                  type="text"
                  value={extraNotes}
                  onChange={(e) => setExtraNotes(e.target.value)}
                  placeholder="Catatan tambahan untuk verifikator perangkat desa..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Unggah Berkas Lampiran (KTP / Pengantar RT)
                </label>
                <label className="flex items-center justify-between px-3 py-2 rounded-xl border border-dashed border-emerald-400 dark:border-emerald-700 bg-emerald-50/40 dark:bg-slate-800 cursor-pointer text-xs">
                  <span className="truncate text-emerald-800 dark:text-emerald-300 font-medium flex items-center space-x-1.5">
                    <FileCheck className="w-4 h-4 shrink-0" />
                    <span className="truncate">{attachmentName}</span>
                  </span>
                  <span className="inline-flex items-center space-x-1 text-[11px] bg-emerald-600 text-white px-2 py-0.5 rounded font-semibold shrink-0 ml-2">
                    <Upload className="w-3 h-3" />
                    <span>Pilih File</span>
                  </span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setAttachmentName(file.name);
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (typeof reader.result === 'string') {
                            setAttachmentDataUrl(reader.result);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Required documents info */}
            {selectedTypeInfo && (
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 flex items-center justify-between text-[11px] text-gray-600 dark:text-gray-300">
                <div>
                  <span className="font-bold text-gray-800 dark:text-gray-200">Syarat Verifikasi Dokumen: </span>
                  {selectedTypeInfo.requirements.join(' • ')}
                </div>
                <span className="inline-flex items-center space-x-1 text-emerald-700 dark:text-emerald-400 font-semibold shrink-0 ml-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Terenkripsi</span>
                </span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-4 py-2 rounded-xl border border-gray-300 dark:border-slate-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="inline-flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirim Permohonan & Aktifkan Notifikasi WA</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
