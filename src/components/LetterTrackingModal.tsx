import React, { useState } from 'react';
import { LetterRequest } from '../types/village';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  MessageSquare,
  Printer,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';

interface LetterTrackingModalProps {
  requests: LetterRequest[];
  initialSearchCode?: string;
  onClose: () => void;
  onViewLetter: (req: LetterRequest) => void;
}

export const LetterTrackingModal: React.FC<LetterTrackingModalProps> = ({
  requests,
  initialSearchCode = '',
  onClose,
  onViewLetter,
}) => {
  const [searchQuery, setSearchQuery] = useState(initialSearchCode);
  const [matchedRequest, setMatchedRequest] = useState<any | null>(null);
  const [hasSearched, setHasSearched] = useState(Boolean(initialSearchCode));

  const fetchTrack = async (q: string) => {
    if (!q.trim()) { setMatchedRequest(null); return; }
    try {
      const res = await fetch(`/api/public/track-letter?code=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      if (res.ok && data.status === 'ok') {
        setMatchedRequest({
          trackingCode: q.trim(),
          letterTitle: data.tracking.letterTitle,
          status: data.tracking.status,
          createdAt: data.tracking.createdAt,
          citizenName: data.tracking.citizenName,
        });
      } else {
        setMatchedRequest(null);
      }
    } catch {
      setMatchedRequest(null);
    }
  };

  React.useEffect(() => {
    if (initialSearchCode) {
      setHasSearched(true);
      fetchTrack(initialSearchCode);
    }
  }, [initialSearchCode]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSearched(true);
    fetchTrack(searchQuery);
  };

  const getStepState = (currentStatus: LetterRequest['status'], stepIndex: number) => {
    const sequence: LetterRequest['status'][] = [
      'Menunggu Verifikasi',
      'Validasi Dokumen',
      'Menunggu Tanda Tangan Kades',
      'Selesai',
    ];
    if (currentStatus === 'Ditolak') {
      if (stepIndex === 0) return 'completed';
      if (stepIndex === 1) return 'rejected';
      return 'pending';
    }
    const currentIndex = sequence.indexOf(currentStatus);
    if (currentIndex >= stepIndex) return 'completed';
    return 'pending';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-slate-800 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-emerald-800 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/20 rounded-2xl">
              <Search className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Lacak Status Surat & Verifikasi TTE</h3>
              <p className="text-xs text-emerald-100">
                Pantau progres administrasi dokumen secara transparan dan real-time
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-6 border-b border-gray-100 dark:border-slate-800 bg-emerald-50/40 dark:bg-slate-800/40">
          <form onSubmit={handleSearch} className="flex space-x-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ketik Kode Tiket (cth: SRT-2026-SKU-001) atau 16 Digit NIK..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
            />
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center space-x-2 shadow transition cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>Cari Surat</span>
            </button>
          </form>

          {/* Quick Presets */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <span>Tiket Terbaru:</span>
            {requests.slice(0, 3).map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setSearchQuery(r.trackingCode);
                  setMatchedRequest(r);
                  setHasSearched(true);
                }}
                className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-emerald-500 px-2.5 py-0.5 rounded-lg font-mono text-[11px] text-emerald-700 dark:text-emerald-400 cursor-pointer"
              >
                {r.trackingCode} ({r.status})
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {matchedRequest ? (
            <>
              <div className="bg-gray-50 dark:bg-slate-800/70 p-5 rounded-2xl border border-gray-200 dark:border-slate-700 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-mono">
                      {matchedRequest.trackingCode}
                    </span>
                    <h4 className="font-extrabold text-base text-gray-900 dark:text-white">
                      {matchedRequest.letterTitle}
                    </h4>
                  </div>
                  <div>
                    {matchedRequest.status === 'Selesai' ? (
                      <span className="bg-emerald-600 text-white text-xs px-3 py-1 rounded-full font-bold flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Selesai (Terbit TTE)</span>
                      </span>
                    ) : matchedRequest.status === 'Ditolak' ? (
                      <span className="bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 text-xs px-3 py-1 rounded-full font-bold flex items-center space-x-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Perlu Perbaikan</span>
                      </span>
                    ) : (
                      <span className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-xs px-3 py-1 rounded-full font-bold flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{matchedRequest.status}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-300 pt-2 border-t border-gray-200 dark:border-slate-700">
                  <div>
                    <span className="text-gray-400">Pemohon:</span>{' '}
                    <span className="font-semibold">{matchedRequest.citizenName}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">NIK:</span>{' '}
                    <span className="font-mono">{matchedRequest.nik}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">WhatsApp:</span>{' '}
                    <span className="font-mono text-emerald-600 font-semibold">
                      {matchedRequest.whatsapp}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Diajukan:</span>{' '}
                    <span>{matchedRequest.createdAt}</span>
                  </div>
                </div>

                {matchedRequest.registrationNumber && (
                  <div className="bg-emerald-100/70 dark:bg-emerald-950/60 p-2.5 rounded-xl text-xs font-mono text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
                    <span>
                      No. Surat Resmi: <strong>{matchedRequest.registrationNumber}</strong>
                    </span>
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </div>
                )}
              </div>

              {/* Progress Stepper Timeline */}
              <div className="space-y-3">
                <h5 className="font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Tahapan Pemrosesan Dokumen
                </h5>
                <div className="relative pl-6 border-l-2 border-gray-200 dark:border-slate-700 space-y-5">
                  {[
                    {
                      title: '1. Permohonan Diterima Loket Digital',
                      desc: `${matchedRequest.createdAt} — Terdaftar otomatis di sistem layanan mandiri.`,
                    },
                    {
                      title: '2. Validasi Berkas & Pencocokan NIK',
                      desc: matchedRequest.verifiedBy
                        ? `Diverifikasi oleh: ${matchedRequest.verifiedBy}`
                        : 'Pemeriksaan kecocokan NIK, KK, dan lampiran pengantar.',
                    },
                    {
                      title: '3. Otorisasi & Tanda Tangan Elektronik (TTE) Kepala Desa',
                      desc: matchedRequest.signedBy
                        ? `Ditandatangani secara elektronik oleh: ${matchedRequest.signedBy}`
                        : 'Penerbitan nomor registrasi surat resmi dan matriks QR Code.',
                    },
                    {
                      title: '4. Dokumen Selesai & Siap Dicetak',
                      desc: 'Warga dapat mencetak surat resmi ber-QR Code atau mengambil di Balai Desa.',
                    },
                  ].map((step, idx) => {
                    const st = getStepState(matchedRequest.status, idx);
                    return (
                      <div key={step.title} className="relative">
                        <div
                          className={`absolute -left-[31px] top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow ${
                            st === 'completed'
                              ? 'bg-emerald-600 text-white'
                              : st === 'rejected'
                              ? 'bg-red-600 text-white'
                              : 'bg-gray-300 dark:bg-slate-700 text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          {st === 'completed' ? '✓' : st === 'rejected' ? '✕' : idx + 1}
                        </div>
                        <div>
                          <h6 className="font-bold text-sm text-gray-900 dark:text-white">
                            {step.title}
                          </h6>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{step.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {matchedRequest.adminNotes && (
                <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-slate-800 border border-emerald-200/70 dark:border-slate-700 text-xs">
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 block mb-0.5">
                    Catatan Perangkat Desa:
                  </span>
                  <p className="text-gray-700 dark:text-gray-300">{matchedRequest.adminNotes}</p>
                </div>
              )}

              {matchedRequest.lastWhatsappMessage && (
                <div className="space-y-1.5">
                  <h5 className="font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center space-x-1">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Salinan Notifikasi WhatsApp Terakhir</span>
                  </h5>
                  <div className="bg-emerald-50/70 dark:bg-slate-800/50 p-3 rounded-xl border border-emerald-200/60 dark:border-slate-700 text-xs font-mono whitespace-pre-line text-gray-800 dark:text-gray-200">
                    {matchedRequest.lastWhatsappMessage}
                  </div>
                </div>
              )}

              {matchedRequest.status === 'Selesai' && (
                <div className="pt-2">
                  <button
                    onClick={() => onViewLetter(matchedRequest)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-2xl font-bold text-sm flex items-center justify-center space-x-2 shadow-lg transition cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Lihat & Cetak Surat Resmi Ber-QR Code</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-10 space-y-3">
              <div className="w-12 h-12 bg-gray-100 dark:bg-slate-800 text-gray-400 rounded-full flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {hasSearched
                  ? 'Kode Tiket atau NIK tidak ditemukan.'
                  : 'Masukkan kode tiket atau 16 digit NIK pemohon.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
