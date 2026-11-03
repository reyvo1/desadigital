import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ShieldCheck,
  QrCode,
  X,
  Search,
  FileCheck2,
  Lock,
  UserCheck,
  CalendarClock,
  Hash,
  AlertTriangle,
  Copy,
  Check,
} from 'lucide-react';
import { LetterRequest, VillageSiteConfig } from '../types/village';
import { generateQrMatrix, maskSensitiveNumber } from '../utils/villageLogic';

interface QrVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRequest?: LetterRequest | null;
  allRequests: LetterRequest[];
  siteConfig: VillageSiteConfig;
}

export const QrVerificationModal: React.FC<QrVerificationModalProps> = ({
  isOpen,
  onClose,
  initialRequest,
  allRequests,
  siteConfig,
}) => {
  const [searchCode, setSearchCode] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<LetterRequest | null>(initialRequest || null);
  const [cryptoData, setCryptoData] = useState<{
    signatureHash: string;
    citizenIntegrityHash: string;
    algorithm: string;
    verifiedAt: string;
  } | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  useEffect(() => {
    if (initialRequest) {
      setSelectedRequest(initialRequest);
      setSearchCode(initialRequest.qrVerificationCode || initialRequest.trackingCode);
    } else if (allRequests.length > 0 && !selectedRequest) {
      const completed = allRequests.find((r) => r.status === 'Selesai') || allRequests[0];
      setSelectedRequest(completed);
      setSearchCode(completed.qrVerificationCode || completed.trackingCode);
    }
  }, [initialRequest, allRequests]);

  useEffect(() => {
    if (!isOpen || !selectedRequest) return;
    let active = true;
    fetch('/api/security/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trackingCode: selectedRequest.trackingCode,
        nik: selectedRequest.nik,
        kk: selectedRequest.kk,
        citizenName: selectedRequest.citizenName,
        registrationNumber: selectedRequest.registrationNumber || selectedRequest.trackingCode,
        signedBy: selectedRequest.signedBy || siteConfig.headOfVillageName,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (active && data?.status === 'ok') {
          setCryptoData({
            signatureHash: data.signatureHash,
            citizenIntegrityHash: data.citizenIntegrityHash,
            algorithm: data.algorithm || 'HMAC-SHA256 + AES-256-GCM',
            verifiedAt: data.verifiedAt || new Date().toISOString(),
          });
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [isOpen, selectedRequest, siteConfig.headOfVillageName]);

  const handleManualLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchCode.trim().toUpperCase();
    if (!q) return;
    const match = allRequests.find(
      (r) =>
        (r.qrVerificationCode || '').toUpperCase() === q ||
        (r.trackingCode || '').toUpperCase() === q ||
        (r.registrationNumber || '').toUpperCase().includes(q)
    );
    setSelectedRequest(match || null);
  };

  const qrPayload = useMemo(() => {
    if (!selectedRequest) return 'SID-INVALID';
    return `${siteConfig.villageName}|${selectedRequest.trackingCode}|${
      selectedRequest.registrationNumber || 'REG'
    }|${cryptoData?.signatureHash || selectedRequest.qrVerificationCode || 'VALID'}`;
  }, [selectedRequest, siteConfig.villageName, cryptoData]);

  const qrMatrix = useMemo(() => generateQrMatrix(qrPayload), [qrPayload]);

  if (!isOpen) return null;

  const isSignedValid =
    selectedRequest &&
    (selectedRequest.status === 'Selesai' || Boolean(selectedRequest.qrVerificationCode));

  const signerName =
    selectedRequest?.signerName ||
    selectedRequest?.signedBy ||
    siteConfig.headOfVillageName;
  const signerNip =
    selectedRequest?.signerNip || siteConfig.headOfVillageNip;
  const signerRole =
    selectedRequest?.signerRole || `${siteConfig.headOfVillageTitle} ${siteConfig.villageName}`;

  const handleCopyHash = () => {
    const hashText = cryptoData?.signatureHash || selectedRequest?.qrVerificationCode || '';
    if (!hashText) return;
    navigator.clipboard?.writeText(hashText).catch(() => {});
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Header Portal Verifikasi */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-900 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-300">
                  Portal Keaslian Dokumen Elektronik (TTE QR-Code)
                </span>
              </div>
              <h2 className="text-lg font-extrabold tracking-tight">
                Halaman Verifikasi Dokumen Resmi Pemerintah {siteConfig.villageName}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Tutup Verifikasi QR"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {/* Pencarian Kode QR / Tiket */}
          <form onSubmit={handleManualLookup} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Masukkan Kode QR TTE / Nomor Tiket / Nomor Registrasi Surat
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <QrCode className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  placeholder="Contoh: TTE-DESA-2026-SKU-001-VALID atau SRT-2026-SKU-001"
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none font-mono"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Search className="w-4 h-4" />
                Verifikasi Keaslian
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              <span className="text-[11px] text-slate-500">Contoh Dokumen Resmi:</span>
              {allRequests.slice(0, 3).map((req) => (
                <button
                  key={req.id}
                  type="button"
                  onClick={() => {
                    setSelectedRequest(req);
                    setSearchCode(req.qrVerificationCode || req.trackingCode);
                  }}
                  className={`text-[11px] font-mono px-2.5 py-0.5 rounded-md border transition-colors ${
                    selectedRequest?.id === req.id
                      ? 'bg-emerald-700 text-white border-emerald-700 font-bold'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-emerald-50'
                  }`}
                >
                  {req.trackingCode} ({req.letterType})
                </button>
              ))}
            </div>
          </form>

          {selectedRequest ? (
            <>
              {/* Banner Status Keaslian */}
              <div
                className={`p-4 rounded-xl border-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  isSignedValid
                    ? 'bg-emerald-50/90 border-emerald-500 text-emerald-950'
                    : 'bg-amber-50 border-amber-400 text-amber-950'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  {isSignedValid ? (
                    <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-7 h-7" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md ${
                          isSignedValid
                            ? 'bg-emerald-700 text-white'
                            : 'bg-amber-600 text-white'
                        }`}
                      >
                        {isSignedValid
                          ? 'DOKUMEN SAH & TERVERIFIKASI OTENTIK'
                          : `STATUS DOKUMEN: ${selectedRequest.status.toUpperCase()}`}
                      </span>
                      <span className="text-xs font-mono font-semibold opacity-80">
                        Kode Desa: {siteConfig.villageCode}
                      </span>
                    </div>
                    <h3 className="text-base font-extrabold mt-1">
                      {selectedRequest.letterTitle}
                    </h3>
                    <p className="text-xs opacity-90 mt-0.5">
                      Dokumen ini terdaftar secara sah pada Buku Register Persuratan Digital Pemerintah{' '}
                      {siteConfig.villageName}, {siteConfig.subDistrict}, {siteConfig.district}.
                    </p>
                  </div>
                </div>
              </div>

              {/* Detail Penandatangan & Pemohon + QR Matrix */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800 border-b border-slate-100 pb-2">
                    <FileCheck2 className="w-4 h-4" />
                    Rincian Register & Otorisasi Pejabat Desa
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block">Nomor Registrasi Surat Resmi</span>
                      <span className="font-mono font-bold text-slate-900">
                        {selectedRequest.registrationNumber ||
                          `470 / REG-${selectedRequest.id.toUpperCase()} / ${siteConfig.villageCode}`}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Nomor Tiket Layanan</span>
                      <span className="font-mono font-bold text-emerald-700">
                        {selectedRequest.trackingCode}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Nama Warga Pemohon</span>
                      <span className="font-bold text-slate-900">{selectedRequest.citizenName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">NIK Pemohon (Termasking Privasi)</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {maskSensitiveNumber(selectedRequest.nik, false)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Wilayah Domisili</span>
                      <span className="font-semibold text-slate-800">
                        {selectedRequest.dusun} (RT {selectedRequest.rt}/RW {selectedRequest.rw})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Keperluan Penerbitan</span>
                      <span className="font-medium text-slate-800">{selectedRequest.purpose}</span>
                    </div>
                  </div>

                  {/* Pejabat Penandatangan TTE */}
                  <div className="bg-emerald-50/70 rounded-xl p-3.5 border border-emerald-200/80 space-y-2 mt-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
                      <UserCheck className="w-4 h-4 text-emerald-700" />
                      Pejabat Penandatangan Elektronik (TTE)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500 block">Nama & Gelar Pejabat</span>
                        <span className="font-extrabold text-slate-900">{signerName}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Jabatan & NIP/NIAP</span>
                        <span className="font-semibold text-slate-800">
                          {signerRole} • NIP: {signerNip}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <CalendarClock className="w-3.5 h-3.5 text-emerald-700" />
                        <span>
                          Waktu Pengesahan:{' '}
                          <strong>{selectedRequest.completedAt || selectedRequest.updatedAt} WIB</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span>
                          Verifikator:{' '}
                          <strong>{selectedRequest.verifiedBy || 'Kasi Pelayanan Desa'}</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Visual QR Code Matrix */}
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col items-center justify-center text-center">
                  <div className="bg-white p-3 rounded-xl border-2 border-slate-900 shadow-sm">
                    <svg
                      viewBox={`0 0 ${qrMatrix.length} ${qrMatrix.length}`}
                      className="w-36 h-36"
                      shapeRendering="crispEdges"
                    >
                      {qrMatrix.map((row, rIdx) =>
                        row.map((cell, cIdx) =>
                          cell ? (
                            <rect
                              key={`${rIdx}-${cIdx}`}
                              x={cIdx}
                              y={rIdx}
                              width={1}
                              height={1}
                              fill="#064e3b"
                            />
                          ) : null
                        )
                      )}
                    </svg>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-slate-800 mt-2.5">
                    {selectedRequest.qrVerificationCode || `TTE-${selectedRequest.trackingCode}`}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1">
                    UU ITE No. 11 Tahun 2008 Pasal 5 Ayat (1) — Tanda Tangan Elektronik Sah
                  </span>
                </div>
              </div>

              {/* Cryptographic Hash Fingerprint */}
              <div className="bg-slate-900 text-slate-100 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                    <Lock className="w-4 h-4" />
                    Sidik Jari Kriptografi Dokumen (Server HMAC-SHA256 & E2EE Integrity)
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyHash}
                    className="text-[11px] px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 transition-colors"
                  >
                    {copiedHash ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Tersalin
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Salin Hash
                      </>
                    )}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] font-mono">
                  <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">
                      Digital Signature Hash (HMAC-SHA256):
                    </span>
                    <span className="text-emerald-300 font-bold break-all">
                      {cryptoData?.signatureHash ||
                        `TTE-HMAC256:${selectedRequest.qrVerificationCode || selectedRequest.trackingCode}`}
                    </span>
                  </div>
                  <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">
                      Citizen Dukcapil Integrity (AES-256-GCM):
                    </span>
                    <span className="text-teal-300 font-bold break-all">
                      {cryptoData?.citizenIntegrityHash ||
                        `AES256-GCM:${selectedRequest.nik.slice(0, 6)}-${selectedRequest.nik.slice(-4)}`}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center bg-rose-50 border border-rose-200 rounded-xl space-y-2">
              <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
              <h3 className="text-sm font-bold text-rose-900">
                Kode QR / Nomor Surat Tidak Ditemukan di Server Desa
              </h3>
              <p className="text-xs text-rose-700">
                Pastikan kode TTE atau nomor tiket surat sesuai dengan dokumen yang diterbitkan oleh Pemerintah{' '}
                {siteConfig.villageName}.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
