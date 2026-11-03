import React from 'react';
import { CheckCircle2, Download, Printer, ShieldCheck, X } from 'lucide-react';
import {
  Citizen,
  LetterRequest,
  LetterTypeInfo,
  VillageOfficial,
  VillageSiteConfig,
} from '../types/village';
import {
  generateOfficialLetterNumber,
  generateQrMatrix,
  renderDynamicLetterBody,
} from '../utils/villageLogic';

interface OfficialLetterViewProps {
  request: LetterRequest | null;
  citizen?: Citizen;
  siteConfig: VillageSiteConfig;
  letterTypes?: LetterTypeInfo[];
  officials?: VillageOfficial[];
  onClose: () => void;
  onVerifyQr?: (request: LetterRequest) => void;
}

export const OfficialLetterView: React.FC<OfficialLetterViewProps> = ({
  request,
  citizen,
  siteConfig,
  letterTypes = [],
  officials = [],
  onClose,
  onVerifyQr,
}) => {
  if (!request) return null;

  const handlePrint = () => {
    window.print();
  };

  const currentYear = new Date().getFullYear();
  const matchedLetterType = letterTypes.find((lt) => lt.code === request.letterType);

  const officialNumber =
    request.registrationNumber ||
    generateOfficialLetterNumber(
      request.letterType,
      1,
      new Date().getMonth(),
      currentYear,
      siteConfig.villageCode,
      matchedLetterType?.classificationCode
    );

  const verificationPayload =
    request.qrVerificationCode ||
    request.registrationNumber ||
    `${siteConfig.villageCode}|${request.trackingCode}|${request.nik}`;
  const qrMatrix = generateQrMatrix(verificationPayload);

  const {
    openingParagraph,
    statementParagraph,
    closingParagraph,
    structuredCustomFields,
  } = renderDynamicLetterBody(request, citizen, siteConfig, matchedLetterType);

  // Resolve dynamic signer (Kepala Desa vs Sekretaris Desa a.n. Kepala Desa)
  const sekdesOfficial = officials.find(
    (o) =>
      o.role.toLowerCase().includes('sekretaris') ||
      (o.position && o.position.toLowerCase().includes('sekretaris'))
  );

  const isSekdesSigner = request.signerRole === 'Sekretaris Desa (a.n. Kepala Desa)';
  const displaySignerTitle = isSekdesSigner
    ? `a.n. ${siteConfig.headOfVillageTitle} ${siteConfig.villageName}\nSekretaris Desa`
    : `${siteConfig.headOfVillageTitle} ${siteConfig.villageName}`;

  const displaySignerName =
    request.signerName ||
    (isSekdesSigner && sekdesOfficial ? sekdesOfficial.name : siteConfig.headOfVillageName);

  const displaySignerNip =
    request.signerNip ||
    (isSekdesSigner && sekdesOfficial ? sekdesOfficial.nip : siteConfig.headOfVillageNip);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white text-gray-900 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden my-8 border border-gray-200">
        {/* Top Action Bar (Hidden when printing) */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm">
                Dokumen Resmi {request.letterTitle} (TTE QR-Code)
              </h3>
              <p className="text-[11px] text-gray-300">
                Tiket: {request.trackingCode} • Kode Arsip:{' '}
                {matchedLetterType?.classificationCode || '470'} • Status: {request.status}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {onVerifyQr && (
              <button
                type="button"
                onClick={() => onVerifyQr(request)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Verifikasi QR TTE</span>
              </button>
            )}
            <button
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-300 hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Tutup pratinjau surat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Official Letter Sheet */}
        <div className="p-8 sm:p-12 bg-white text-gray-900 font-serif">
          {/* Kop Surat Pemerintah Desa Dinamis */}
          <div className="border-b-4 border-double border-gray-900 pb-4 mb-6 flex items-center justify-between gap-4">
            {siteConfig.logoUrl ? (
              <div className="w-20 h-20 rounded-xl border border-gray-300 flex items-center justify-center p-1 shrink-0 bg-white overflow-hidden">
                <img
                  src={siteConfig.logoUrl}
                  alt={`Logo ${siteConfig.villageName}`}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-xl border-2 border-gray-900 flex flex-col items-center justify-center font-sans font-extrabold text-center shrink-0 bg-emerald-50 text-emerald-950">
                <span className="text-[10px] tracking-tighter">PEMDES</span>
                <span className="text-lg leading-none">
                  {siteConfig.logoSymbolText || siteConfig.villageName.slice(0, 3).toUpperCase()}
                </span>
              </div>
            )}
            <div className="text-center flex-1">
              <p className="text-xs sm:text-sm font-bold uppercase tracking-widest">
                PEMERINTAH {siteConfig.district.toUpperCase()}
              </p>
              <p className="text-xs sm:text-sm font-bold uppercase tracking-widest">
                {siteConfig.subDistrict.toUpperCase()}
              </p>
              <h1 className="text-lg sm:text-2xl font-extrabold uppercase tracking-wide mt-0.5">
                PEMERINTAH {siteConfig.villageName.toUpperCase()}
              </h1>
              <p className="text-[11px] font-sans text-gray-600 mt-1">
                {siteConfig.officeAddress}, Kode Pos {siteConfig.postalCode} • Telp:{' '}
                {siteConfig.officePhone} • Email: {siteConfig.officeEmail}
              </p>
            </div>
          </div>

          {/* Judul & Nomor Surat */}
          <div className="text-center mb-6">
            <h2 className="text-base sm:text-lg font-bold underline uppercase tracking-wide">
              {request.letterTitle}
            </h2>
            <p className="text-xs sm:text-sm font-sans font-semibold mt-1">
              Nomor: {officialNumber}
            </p>
          </div>

          {/* Isi Pembuka Dinamis */}
          <p className="text-xs sm:text-sm leading-relaxed mb-4 text-justify">
            {openingParagraph}
          </p>

          {/* Tabel Data Pemohon */}
          <div className="pl-2 sm:pl-6 mb-5 space-y-1.5 text-xs sm:text-sm">
            <div className="grid grid-cols-12">
              <span className="col-span-4 font-semibold">Nama Lengkap</span>
              <span className="col-span-8 font-bold">: {request.citizenName}</span>
            </div>
            <div className="grid grid-cols-12">
              <span className="col-span-4 font-semibold">NIK (Terverifikasi)</span>
              <span className="col-span-8 font-mono">: {request.nik}</span>
            </div>
            <div className="grid grid-cols-12">
              <span className="col-span-4 font-semibold">Nomor Kartu Keluarga</span>
              <span className="col-span-8 font-mono">: {request.kk}</span>
            </div>
            {citizen && (
              <>
                <div className="grid grid-cols-12">
                  <span className="col-span-4 font-semibold">Tempat / Tgl Lahir</span>
                  <span className="col-span-8">
                    : {citizen.birthPlace}, {citizen.birthDate} ({citizen.age} Tahun)
                  </span>
                </div>
                <div className="grid grid-cols-12">
                  <span className="col-span-4 font-semibold">Jenis Kelamin / Agama</span>
                  <span className="col-span-8">
                    : {citizen.gender} / {citizen.religion}
                  </span>
                </div>
                <div className="grid grid-cols-12">
                  <span className="col-span-4 font-semibold">Status Perkawinan</span>
                  <span className="col-span-8">: {citizen.maritalStatus}</span>
                </div>
                <div className="grid grid-cols-12">
                  <span className="col-span-4 font-semibold">Pekerjaan</span>
                  <span className="col-span-8">: {citizen.occupation}</span>
                </div>
              </>
            )}
            <div className="grid grid-cols-12">
              <span className="col-span-4 font-semibold">Alamat Domisili</span>
              <span className="col-span-8">
                : {citizen?.address || request.dusun}, RT {request.rt} / RW {request.rw},{' '}
                {request.dusun}, {siteConfig.villageName}
              </span>
            </div>
            <div className="grid grid-cols-12">
              <span className="col-span-4 font-semibold">Keperluan Surat</span>
              <span className="col-span-8 font-semibold">: {request.purpose}</span>
            </div>
          </div>

          {/* Data Spesifik Jenis Surat (Custom Fields Dinamis) */}
          {structuredCustomFields.length > 0 && (
            <div className="mb-5 p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-1.5 text-xs sm:text-sm">
              <p className="font-sans text-[11px] font-bold uppercase tracking-wider text-emerald-900 border-b border-gray-200 pb-1 mb-2">
                Rincian Data Keterangan Khusus ({request.letterType})
              </p>
              {structuredCustomFields.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12">
                  <span className="col-span-4 font-semibold text-gray-700">{item.label}</span>
                  <span className="col-span-8 font-bold text-gray-900">: {item.value}</span>
                </div>
              ))}
            </div>
          )}

          {request.extraNotes && structuredCustomFields.length === 0 && (
            <div className="pl-2 sm:pl-6 mb-4 text-xs sm:text-sm grid grid-cols-12">
              <span className="col-span-4 font-semibold">Keterangan Tambahan</span>
              <span className="col-span-8">: {request.extraNotes}</span>
            </div>
          )}

          {/* Paragraf Isi Keterangan Spesifik Jenis Surat (Mail-Merge Dinamis) */}
          <p className="text-xs sm:text-sm leading-relaxed mb-4 text-justify">
            {statementParagraph}
          </p>

          {/* Paragraf Penutup Dinamis */}
          <p className="text-xs sm:text-sm leading-relaxed mb-8 text-justify">
            {closingParagraph}
          </p>

          {/* Tanda Tangan & QR Code TTE */}
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 pt-4 border-t border-gray-200">
            <div className="font-sans text-[11px] text-gray-600 space-y-1 max-w-xs">
              <div className="inline-flex items-center space-x-1 text-emerald-700 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Terverifikasi Tanda Tangan Elektronik (TTE)</span>
              </div>
              <p>
                Dokumen ini telah ditandatangani secara elektronik sesuai UU ITE Nomor 11 Tahun
                2008. Pindai matriks QR di samping untuk memvalidasi kode keaslian:
              </p>
              <p className="font-mono text-[10px] text-gray-800 bg-gray-100 px-2 py-1 rounded">
                HASH: {verificationPayload}
              </p>
            </div>

            <div className="text-center font-sans sm:min-w-[240px]">
              <p className="text-xs text-gray-700">
                {siteConfig.villageName},{' '}
                {request.completedAt?.slice(0, 10) || request.updatedAt.slice(0, 10)}
              </p>
              <p className="text-xs font-bold uppercase text-gray-900 mb-2 whitespace-pre-line">
                {displaySignerTitle}
              </p>

              {/* Real Deterministic 21x21 QR Code SVG (Clickable for TTE Verification) */}
              <button
                type="button"
                onClick={() => onVerifyQr && onVerifyQr(request)}
                title="Klik untuk membuka Halaman Verifikasi Dokumen Resmi Pemerintah Desa (TTE QR-Code)"
                className="mx-auto w-28 h-28 border-2 border-emerald-700 hover:border-emerald-500 rounded-xl p-2 bg-white hover:bg-emerald-50/40 flex flex-col items-center justify-center mb-2 shadow-xs transition-all cursor-pointer group"
              >
                <svg
                  viewBox="0 0 21 21"
                  className="w-20 h-20 group-hover:scale-105 transition-transform"
                  shapeRendering="crispEdges"
                  aria-label={`QR Code Verifikasi ${verificationPayload}`}
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
                <span className="text-[8px] font-bold text-emerald-800 uppercase tracking-wider mt-0.5">
                  KLIK VERIFIKASI TTE
                </span>
              </button>

              <p className="text-xs sm:text-sm font-extrabold underline text-gray-900">
                {displaySignerName}
              </p>
              <p className="text-[11px] text-gray-600">NIP. {displaySignerNip}</p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600 print:hidden">
          <span>
            Diterbitkan oleh Sistem Informasi {siteConfig.villageName} • Kategori:{' '}
            {matchedLetterType?.category || 'Administrasi Desa'}
          </span>
          <button
            onClick={handlePrint}
            className="inline-flex items-center space-x-1 text-emerald-700 font-bold hover:underline cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh Salinan Resmi (PDF)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

