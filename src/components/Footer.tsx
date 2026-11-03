import React from 'react';
import { Clock, Globe, Mail, MapPin, Phone, ShieldCheck, Siren } from 'lucide-react';
import { NavTab } from './Navbar';
import { VillageSiteConfig } from '../types/village';

interface FooterProps {
  onSelectTab: (tab: NavTab) => void;
  onOpenAdminLogin: () => void;
  onOpenOnboarding?: () => void;
  siteConfig: VillageSiteConfig;
}

export const Footer: React.FC<FooterProps> = ({ onSelectTab, onOpenAdminLogin, onOpenOnboarding, siteConfig }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-emerald-950 text-emerald-100 border-t border-emerald-900 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Col 1: Village Identity */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              {siteConfig.logoUrl ? (
                <div className="w-11 h-11 rounded-xl bg-white/10 p-1 flex items-center justify-center border border-emerald-700 overflow-hidden shrink-0">
                  <img
                    src={siteConfig.logoUrl}
                    alt={`Logo ${siteConfig.villageName}`}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-extrabold text-lg shrink-0">
                  {siteConfig.logoSymbolText || siteConfig.villageName.charAt(0)}
                </div>
              )}
              <div>
                <h3 className="font-bold text-white text-base">Pemerintah {siteConfig.villageName}</h3>
                <p className="text-xs text-emerald-300">
                  {siteConfig.subDistrict}, {siteConfig.district}
                </p>
              </div>
            </div>
            <p className="text-xs text-emerald-200/80 leading-relaxed">
              {siteConfig.tagline}. Sistem Informasi Desa (SID) terintegrasi layanan persuratan mandiri TTE QR-Code, transparansi APBDes, dan Lapak UMKM warga.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-emerald-300">
              <span className="inline-flex items-center space-x-1 bg-emerald-900/80 px-2.5 py-1 rounded-md">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Kode Desa: {siteConfig.villageCode}</span>
              </span>
              <span className="inline-flex items-center space-x-1 bg-emerald-900/80 px-2.5 py-1 rounded-md">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span>IDM: {siteConfig.idmStatus} ({siteConfig.idmScore.toFixed(4)})</span>
              </span>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div>
            <h4 className="font-bold text-white text-sm mb-3">Menu Portal Desa</h4>
            <ul className="space-y-2 text-xs text-emerald-200/90">
              <li>
                <button onClick={() => onSelectTab('profil')} className="hover:text-white transition-colors cursor-pointer">
                  • Profil, Visi Misi & SOTK Perangkat
                </button>
              </li>
              <li>
                <button onClick={() => onSelectTab('layanan')} className="hover:text-white transition-colors cursor-pointer">
                  • Layanan Surat Pengantar Online (24 Jam)
                </button>
              </li>
              <li>
                <button onClick={() => onSelectTab('statistik')} className="hover:text-white transition-colors cursor-pointer">
                  • Statistik Penduduk Real-Time & Ekspor Data
                </button>
              </li>
              <li>
                <button onClick={() => onSelectTab('lapak')} className="hover:text-white transition-colors cursor-pointer">
                  • Lapak UMKM & Produk Unggulan Desa
                </button>
              </li>
              <li>
                <button onClick={() => onSelectTab('peta')} className="hover:text-white transition-colors cursor-pointer">
                  • Peta Digital Fasilitas & Batas Dusun
                </button>
              </li>
              <li>
                <button onClick={onOpenAdminLogin} className="text-amber-300 hover:text-amber-200 font-semibold transition-colors cursor-pointer">
                  • Portal Login Perangkat & Admin CMS Desa
                </button>
              </li>
              {onOpenOnboarding && (
                <li>
                  <button onClick={onOpenOnboarding} className="text-teal-300 hover:text-teal-200 font-semibold transition-colors cursor-pointer">
                    • Daftar Desa (SaaS Onboarding)
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* Col 3: Emergency Contacts */}
          <div>
            <h4 className="font-bold text-white text-sm mb-3 flex items-center space-x-1.5">
              <Siren className="w-4 h-4 text-rose-400" />
              <span>Kontak Siaga & Darurat Desa</span>
            </h4>
            <ul className="space-y-2.5 text-xs text-emerald-200/90">
              <li className="p-2 rounded-lg bg-emerald-900/50 border border-emerald-800/70">
                <p className="text-[11px] text-emerald-300 font-semibold">{siteConfig.emergencyContacts.ambulanceName}</p>
                <p className="font-mono font-bold text-white">{siteConfig.emergencyContacts.ambulancePhone}</p>
              </li>
              <li className="p-2 rounded-lg bg-emerald-900/50 border border-emerald-800/70">
                <p className="text-[11px] text-emerald-300 font-semibold">{siteConfig.emergencyContacts.midwifeName}</p>
                <p className="font-mono font-bold text-white">{siteConfig.emergencyContacts.midwifePhone}</p>
              </li>
              <li className="p-2 rounded-lg bg-emerald-900/50 border border-emerald-800/70">
                <p className="text-[11px] text-emerald-300 font-semibold">{siteConfig.emergencyContacts.securityName}</p>
                <p className="font-mono font-bold text-white">{siteConfig.emergencyContacts.securityPhone}</p>
              </li>
            </ul>
          </div>

          {/* Col 4: Contact & Address */}
          <div>
            <h4 className="font-bold text-white text-sm mb-3">Balai Desa & Jam Pelayanan</h4>
            <ul className="space-y-2.5 text-xs text-emerald-200/90">
              <li className="flex items-start space-x-2">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  {siteConfig.officeAddress}, {siteConfig.subDistrict}, {siteConfig.district}, {siteConfig.province} {siteConfig.postalCode}
                </span>
              </li>
              <li className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{siteConfig.officePhone} / WA: +{siteConfig.officialWhatsApp}</span>
              </li>
              <li className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{siteConfig.officeEmail}</span>
              </li>
              <li className="flex items-start space-x-2">
                <Clock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p>{siteConfig.serviceHoursWeekdays}</p>
                  <p className="text-emerald-300">{siteConfig.serviceHoursWeekend}</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-emerald-900 flex flex-col sm:flex-row items-center justify-between text-xs text-emerald-300/80 gap-4">
          <p>© {currentYear} Pemerintah {siteConfig.villageName} — Sistem Informasi Desa (SID) Terintegrasi.</p>
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <a
              href={`https://wa.me/${siteConfig.officialWhatsApp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-lg bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 font-semibold transition"
            >
              WA: +{siteConfig.officialWhatsApp}
            </a>
            {siteConfig.socialMedia.telegram && (
              <a
                href={
                  siteConfig.socialMedia.telegram.startsWith('http')
                    ? siteConfig.socialMedia.telegram
                    : `https://${siteConfig.socialMedia.telegram.replace(/^@/, 't.me/')}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-lg bg-sky-900/70 hover:bg-sky-800 text-sky-200 font-semibold transition"
              >
                Telegram: {siteConfig.socialMedia.telegram}
              </a>
            )}
            <a
              href={`https://facebook.com/${encodeURIComponent(siteConfig.socialMedia.facebook)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-lg bg-blue-950/80 hover:bg-blue-900 text-blue-200 font-semibold transition"
            >
              FB: {siteConfig.socialMedia.facebook}
            </a>
            <a
              href={`https://youtube.com/results?search_query=${encodeURIComponent(siteConfig.socialMedia.youtube)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-200 font-semibold transition"
            >
              YouTube: {siteConfig.socialMedia.youtube}
            </a>
            <a
              href={`https://instagram.com/${siteConfig.socialMedia.instagram.replace(/^@/, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-lg bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 font-semibold transition"
            >
              IG: {siteConfig.socialMedia.instagram}
            </a>
            {siteConfig.socialMedia.tiktok && (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-900/60 text-emerald-200">
                TikTok: {siteConfig.socialMedia.tiktok}
              </span>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};
