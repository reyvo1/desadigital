import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  Siren,
} from 'lucide-react';
import {
  CitizenAspiration,
  VillageHamlet,
  VillageSiteConfig,
} from '../types/village';
import { ImageUploadField } from '../components/ImageUploadField';

interface ContactViewProps {
  aspirations: CitizenAspiration[];
  onUpdateAspirations: (items: CitizenAspiration[]) => void;
  siteConfig: VillageSiteConfig;
  hamlets?: VillageHamlet[];
}

export const ContactView: React.FC<ContactViewProps> = ({
  aspirations,
  onUpdateAspirations,
  siteConfig,
  hamlets = [],
}) => {
  const hamletOptions = useMemo(() => {
    const names = hamlets.map((h) => h.name).filter(Boolean);
    if (names.length > 0) return names;
    return ['Wilayah Dusun I', 'Wilayah Dusun II', 'Wilayah Dusun III'];
  }, [hamlets]);

  const aspirationCategoryOptions = useMemo(() => {
    const base =
      siteConfig.aspirationCategories && siteConfig.aspirationCategories.length > 0
        ? siteConfig.aspirationCategories
        : ['Infrastruktur', 'Pelayanan Publik', 'Kebersihan', 'Sosial', 'Keamanan'];
    const fromItems = aspirations.map((a) => a.category).filter(Boolean);
    return Array.from(new Set([...base, ...fromItems]));
  }, [siteConfig.aspirationCategories, aspirations]);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dusun, setDusun] = useState<string>(hamletOptions[0] || '');
  const [category, setCategory] = useState<string>(aspirationCategoryOptions[0] || 'Infrastruktur');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [submittedTicket, setSubmittedTicket] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !title.trim() || !content.trim()) {
      setErrorMsg('Harap lengkapi seluruh kolom wajib pada formulir aspirasi.');
      return;
    }
    setErrorMsg(null);

    const ticket = `ASP-${currentYear}-${Math.floor(100 + Math.random() * 900)}`;
    const todayStr = new Date().toISOString().slice(0, 10);

    const newAsp: CitizenAspiration = {
      id: `asp-${Date.now()}`,
      ticketNumber: ticket,
      senderName: name.trim(),
      citizenName: name.trim(),
      dusun: dusun || hamletOptions[0] || 'Desa',
      whatsapp: phone.trim(),
      category,
      subject: title.trim(),
      title: title.trim(),
      message: content.trim(),
      content: content.trim(),
      photoUrl: photoUrl || undefined,
      status: 'Menunggu',
      createdAt: todayStr,
      date: todayStr,
      isPublic: true,
    };

    onUpdateAspirations([newAsp, ...aspirations]);
    setSubmittedTicket(ticket);
    setName('');
    setPhone('');
    setTitle('');
    setContent('');
    setPhotoUrl('');
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="max-w-3xl space-y-2">
        <div className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
          <MessageSquare className="w-4 h-4" />
          <span>Kanal Aspirasi, Pengaduan Masyarakat & Kontak Resmi</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
          Layanan Pengaduan & Kontak Pemerintah {siteConfig.villageName}
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Sampaikan aspirasi pembangunan, laporan fasilitas umum, atau saran pelayanan publik secara transparan kepada Pemerintah {siteConfig.villageName}.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Pengaduan (Col 7) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-5">
          <div>
            <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">
              Formulir Aspirasi & Pengaduan Warga Online
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Laporan yang Anda kirimkan langsung tercatat di database desa dan ditindaklanjuti oleh perangkat terkait.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl flex items-center space-x-2 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {submittedTicket && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-start space-x-3 text-xs text-emerald-900 dark:text-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Aspirasi Berhasil Tersimpan di Database Desa!</p>
                <p className="mt-0.5">
                  Nomor Tiket Pengaduan: <strong className="font-mono">{submittedTicket}</strong>. Terima kasih atas partisipasi Anda dalam memajukan {siteConfig.villageName}.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Nama Lengkap Pelapor <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama sesuai KTP"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Nomor WhatsApp Aktif <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0812xxxxxxx"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Wilayah Dusun
                </label>
                <select
                  value={dusun}
                  onChange={(e) => setDusun(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  {hamletOptions.map((hName) => (
                    <option key={hName} value={hName}>
                      {hName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Kategori Aspirasi / Laporan
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  {aspirationCategoryOptions.map((catOpt) => (
                    <option key={catOpt} value={catOpt}>
                      {catOpt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Subjek / Judul Laporan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Usulan Perbaikan Drainase RT 02"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Isi Aspirasi / Detail Lokasi <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Uraikan lokasi detail, kondisi di lapangan, serta usulan tindak lanjut..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                required
              />
            </div>

            <ImageUploadField
              label="Lampiran Foto Dokumentasi Lapangan (Opsional)"
              value={photoUrl}
              onChange={setPhotoUrl}
              category="lainnya"
              helperText="Foto otomatis dikonversi dan disimpan ke database desa"
            />

            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Kirim Aspirasi Resmi</span>
            </button>
          </form>
        </div>

        {/* Info Kontak & Aspirasi Terkini (Col 5) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
              Kantor Pelayanan Pemerintah {siteConfig.villageName}
            </h3>
            <div className="space-y-3 text-xs text-gray-600 dark:text-gray-300">
              <div className="flex items-start space-x-3">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  {siteConfig.officeAddress}, {siteConfig.subDistrict}, {siteConfig.district}, {siteConfig.province} ({siteConfig.postalCode})
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <Phone className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Telepon: <strong>{siteConfig.officePhone}</strong> • WA Layanan: <strong>{siteConfig.officialWhatsApp}</strong>
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <Mail className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{siteConfig.officeEmail}</span>
              </div>
              <div className="flex items-start space-x-3 pt-2 border-t border-gray-100 dark:border-slate-800">
                <Clock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">Jam Pelayanan Loket Balai Desa:</p>
                  <p>{siteConfig.serviceHoursWeekdays}</p>
                  <p>{siteConfig.serviceHoursWeekend}</p>
                </div>
              </div>
            </div>

            {/* Kanal Resmi Media Sosial & Live Chat API (WA / Telegram / FB / YouTube) */}
            <div className="pt-3 border-t border-gray-100 dark:border-slate-800 space-y-2 text-xs">
              <p className="font-bold text-gray-900 dark:text-white">
                Kanal Resmi Media Sosial & Live Chat Desa:
              </p>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <a
                  href={`https://wa.me/${siteConfig.officialWhatsApp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 font-bold flex items-center justify-between hover:bg-green-100 transition"
                >
                  <span>WhatsApp Layanan</span>
                  <span className="font-mono text-[10px]">+{siteConfig.officialWhatsApp}</span>
                </a>
                <a
                  href={
                    (siteConfig.socialMedia.telegram || 't.me/pemdes_sukamaju').startsWith('http')
                      ? siteConfig.socialMedia.telegram
                      : `https://${(siteConfig.socialMedia.telegram || 't.me/pemdes_sukamaju').replace(/^@/, 't.me/')}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300 font-bold flex items-center justify-between hover:bg-sky-100 transition"
                >
                  <span>Telegram Desa</span>
                  <span className="font-mono text-[10px] truncate max-w-[95px]">
                    {siteConfig.socialMedia.telegram || 't.me/pemdes_sukamaju'}
                  </span>
                </a>
                <a
                  href={`https://facebook.com/${encodeURIComponent(siteConfig.socialMedia.facebook)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 font-bold flex items-center justify-between hover:bg-blue-100 transition"
                >
                  <span>Facebook Resmi</span>
                  <span className="text-[10px] truncate max-w-[95px]">
                    {siteConfig.socialMedia.facebook}
                  </span>
                </a>
                <a
                  href={`https://youtube.com/results?search_query=${encodeURIComponent(siteConfig.socialMedia.youtube)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 font-bold flex items-center justify-between hover:bg-rose-100 transition"
                >
                  <span>YouTube TV Desa</span>
                  <span className="text-[10px] truncate max-w-[95px]">
                    {siteConfig.socialMedia.youtube}
                  </span>
                </a>
              </div>
            </div>

            {/* Emergency Contacts */}
            <div className="pt-3 border-t border-gray-100 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex items-center space-x-1.5 font-bold text-rose-600 dark:text-rose-400">
                <Siren className="w-4 h-4" />
                <span>Kontak Darurat Siaga Desa 24 Jam</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5 text-[11px]">
                <div className="flex justify-between p-2 rounded-lg bg-rose-50/70 dark:bg-rose-950/30">
                  <span className="font-semibold">{siteConfig.emergencyContacts.ambulanceName}</span>
                  <span className="font-mono font-bold text-rose-700 dark:text-rose-300">
                    {siteConfig.emergencyContacts.ambulancePhone}
                  </span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30">
                  <span className="font-semibold">{siteConfig.emergencyContacts.midwifeName}</span>
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                    {siteConfig.emergencyContacts.midwifePhone}
                  </span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-blue-50/70 dark:bg-blue-950/30">
                  <span className="font-semibold">{siteConfig.emergencyContacts.securityName}</span>
                  <span className="font-mono font-bold text-blue-700 dark:text-blue-300">
                    {siteConfig.emergencyContacts.securityPhone}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Daftar Aspirasi & Tindak Lanjut */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-3">
            <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">
              Transparansi Tindak Lanjut Aspirasi Warga ({aspirations.length})
            </h4>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {aspirations.map((asp) => {
                const sender = asp.senderName || asp.citizenName || 'Warga';
                const heading = asp.subject || asp.title || 'Aspirasi Warga';
                const body = asp.message || asp.content || '';
                const reply = asp.responseNote || asp.adminResponse;
                return (
                  <div
                    key={asp.id}
                    className="p-3.5 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-100 dark:border-slate-800 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {asp.ticketNumber} • {sender} ({asp.dusun})
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-[10px]">
                        {asp.status}
                      </span>
                    </div>
                    <p className="font-bold text-gray-900 dark:text-white">{heading}</p>
                    <p className="text-gray-600 dark:text-gray-300 text-[11px] leading-relaxed">
                      {body}
                    </p>
                    {asp.photoUrl && (
                      <img
                        src={asp.photoUrl}
                        alt={heading}
                        className="w-full h-28 object-cover rounded-lg mt-1"
                      />
                    )}
                    {reply && (
                      <div className="mt-1.5 pt-1.5 border-t border-gray-200 dark:border-slate-700 text-[11px] text-emerald-700 dark:text-emerald-300">
                        <strong>Tanggapan Resmi Pemdes:</strong> {reply}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
