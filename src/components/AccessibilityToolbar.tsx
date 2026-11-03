import React, { useEffect, useState } from 'react';
import {
  Accessibility,
  Volume2,
  VolumeX,
  Type,
  Contrast,
  RotateCcw,
  X,
} from 'lucide-react';
import { VillageNews, VillageSiteConfig } from '../types/village';

interface AccessibilityToolbarProps {
  siteConfig: VillageSiteConfig;
  news: VillageNews[];
  fontSizeScale: 'normal' | 'large' | 'xlarge';
  onChangeFontSize: (scale: 'normal' | 'large' | 'xlarge') => void;
  highContrast: boolean;
  onToggleHighContrast: () => void;
}

export const AccessibilityToolbar: React.FC<AccessibilityToolbarProps> = ({
  siteConfig,
  news,
  fontSizeScale,
  onChangeFontSize,
  highContrast,
  onToggleHighContrast,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechStatus, setSpeechStatus] = useState('');

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const buildVillageAudioScript = (): string => {
    const latestNews = (news || [])
      .slice(0, 3)
      .map((n, idx) => `Berita ${idx + 1}: ${n.title}. ${n.excerpt || ''}`)
      .join(' ');

    return `Selamat datang di Portal Resmi Pemerintah ${siteConfig.villageName}, ${siteConfig.subDistrict}, ${siteConfig.district}. Pengumuman Desa: ${siteConfig.runningText}. ${siteConfig.heroSubtitle}. Berikut berita desa terbaru: ${latestNews}`;
  };

  const handleSpeakAnnouncementAndNews = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSpeechStatus('Browser perangkat ini belum mendukung fitur suara otomatis.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setSpeechStatus('Pembacaan suara dihentikan.');
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(buildVillageAudioScript());
    utterance.lang = 'id-ID';
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const indoVoice = voices.find(
      (v) => v.lang.toLowerCase().includes('id') || v.name.toLowerCase().includes('indonesia')
    );
    if (indoVoice) {
      utterance.voice = indoVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setSpeechStatus('Sedang membacakan pengumuman & berita desa (Bahasa Indonesia)...');
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeechStatus('Selesai membacakan informasi desa.');
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeechStatus('Pembacaan suara selesai.');
    };

    setIsSpeaking(true);
    setSpeechStatus('Membacakan pengumuman & berita desa...');
    window.speechSynthesis.speak(utterance);
  };

  const handleResetAccessibility = () => {
    onChangeFontSize('normal');
    if (highContrast) onToggleHighContrast();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSpeechStatus('');
  };

  return (
    <div className="fixed bottom-5 left-5 z-40 print:hidden">
      {isOpen ? (
        <div className="bg-white text-slate-900 rounded-2xl shadow-2xl border-2 border-emerald-700 w-80 p-4 space-y-3.5 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center">
                <Accessibility className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                  Aksesibilitas Lansia & Warga
                </h3>
                <p className="text-[11px] text-slate-500">
                  Perbesar Huruf, Kontras & Baca Suara
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              aria-label="Tutup Panel Aksesibilitas"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Pengaturan Ukuran Huruf */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
              <Type className="w-3.5 h-3.5 text-emerald-700" />
              Ukuran Teks Halaman (Ramah Lansia)
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'normal', label: '100% Normal' },
                  { id: 'large', label: '112% Besar' },
                  { id: 'xlarge', label: '125% Lansia' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChangeFontSize(opt.id)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                    fontSizeScale === opt.id
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mode Kontras Tinggi */}
          <div>
            <button
              type="button"
              onClick={onToggleHighContrast}
              className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
                highContrast
                  ? 'bg-slate-950 text-amber-300 border-amber-400'
                  : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span className="flex items-center gap-2">
                <Contrast className="w-4 h-4 text-emerald-700" />
                Mode Kontras Tinggi (Teks Tajam)
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-extrabold ${
                  highContrast ? 'bg-amber-400 text-slate-950' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {highContrast ? 'AKTIF' : 'NONAKTIF'}
              </span>
            </button>
          </div>

          {/* Baca Suara Otomatis (TTS Bahasa Indonesia) */}
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={handleSpeakAnnouncementAndNews}
              className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${
                isSpeaking
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white'
              }`}
            >
              {isSpeaking ? (
                <>
                  <VolumeX className="w-4 h-4" />
                  Hentikan Baca Suara (Stop TTS)
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4" />
                  Baca Suara Pengumuman & Berita (id-ID)
                </>
              )}
            </button>
            {speechStatus && (
              <p className="text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                {speechStatus}
              </p>
            )}
          </div>

          {/* Reset */}
          <div className="pt-1 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={handleResetAccessibility}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Kembalikan Pengaturan Awal
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-emerald-900 hover:bg-emerald-800 text-white shadow-lg border border-emerald-400/40 text-xs font-bold transition-all"
          title="Mode Aksesibilitas Ramah Lansia & Disabilitas (Perbesar Huruf, Kontras Tinggi, Baca Suara)"
        >
          <Accessibility className="w-4 h-4 text-amber-300" />
          <span className="hidden sm:inline">Aksesibilitas Lansia</span>
        </button>
      )}
    </div>
  );
};
