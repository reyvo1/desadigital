import React, { useState } from 'react';
import {
  Bell,
  FileSearch,
  Globe,
  LogIn,
  LogOut,
  Menu,
  Moon,
  PhoneCall,
  ShieldCheck,
  Sun,
  User,
  X,
} from 'lucide-react';
import { LANGUAGE_OPTIONS, SupportedLanguage, TRANSLATIONS } from '../utils/i18n';
import { AdminUser, VillageSiteConfig } from '../types/village';

export type NavTab =
  | 'beranda'
  | 'profil'
  | 'layanan'
  | 'galeri'
  | 'statistik'
  | 'peta'
  | 'lapak'
  | 'kontak'
  | 'admin';

interface NavbarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  lang: SupportedLanguage;
  onChangeLang: (lang: SupportedLanguage) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  adminUser: AdminUser | null;
  onOpenAdminLogin: () => void;
  onOpenCitizenLogin: () => void;
  onLogoutAdmin: () => void;
  onOpenTrackModal: () => void;
  unreadNotificationsCount: number;
  onOpenNotifications: () => void;
  siteConfig: VillageSiteConfig;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  lang,
  onChangeLang,
  darkMode,
  onToggleDarkMode,
  adminUser,
  onOpenAdminLogin,
  onOpenCitizenLogin,
  onLogoutAdmin,
  onOpenTrackModal,
  unreadNotificationsCount,
  onOpenNotifications,
  siteConfig,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = TRANSLATIONS[lang];

  const navItems: { id: NavTab; label: string }[] = [
    { id: 'beranda', label: t.nav.home },
    { id: 'profil', label: t.nav.profile },
    { id: 'layanan', label: t.nav.services },
    { id: 'galeri', label: t.nav.gallery },
    { id: 'statistik', label: t.nav.statistics },
    { id: 'peta', label: t.nav.map },
    { id: 'lapak', label: t.nav.market },
    { id: 'kontak', label: t.nav.contact },
  ];

  const handleNavClick = (tab: NavTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  const tickerSegments = [
    `${siteConfig.villageName.toUpperCase()} (${siteConfig.subDistrict}, ${siteConfig.district})`,
    siteConfig.runningText,
    `Jam Layanan: ${siteConfig.serviceHoursWeekdays}`,
    `Status Kemendesa: ${siteConfig.idmStatus} (IDM ${siteConfig.idmScore.toFixed(4)})`,
    `Hotline Resmi: ${siteConfig.officePhone}`,
  ];

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-white/95 dark:bg-slate-900/95 border-b border-emerald-100 dark:border-slate-800 transition-colors">
      {/* Top Running Announcement Bar (Smooth Marquee) */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-emerald-50 text-xs py-2 px-4 border-b border-emerald-800/70 overflow-hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 shrink-0 bg-emerald-950/90 pr-3 z-10 border-r border-emerald-700/70">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-400 text-emerald-950 font-extrabold text-[10px] tracking-wider uppercase shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-950" />
              <span>INFO DESA</span>
            </span>
          </div>

          <div
            className="flex-1 min-w-0 overflow-hidden relative"
            style={{
              maskImage: 'linear-gradient(to right, transparent, black 4%, black 96%, transparent)',
              WebkitMaskImage:
                'linear-gradient(to right, transparent, black 4%, black 96%, transparent)',
            }}
          >
            <div className="animate-marquee items-center space-x-10">
              {[0, 1].map((dupIndex) => (
                <div key={dupIndex} className="flex items-center space-x-10 shrink-0">
                  {tickerSegments.map((seg, idx) => (
                    <span key={idx} className="inline-flex items-center space-x-2.5 text-emerald-100 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      <span>{seg}</span>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-3 shrink-0 pl-3 bg-teal-950/90 z-10 border-l border-emerald-700/70 text-[11px]">
            <span className="inline-flex items-center space-x-1 text-amber-300 font-semibold whitespace-nowrap">
              <PhoneCall className="w-3 h-3" />
              <span>{siteConfig.officePhone}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-5">
        <div className="flex items-center justify-between h-16 gap-1.5">
          {/* Brand Logo */}
          <button
            onClick={() => handleNavClick('beranda')}
            className="flex items-center space-x-2.5 text-left group focus:outline-none shrink-0 cursor-pointer"
          >
            {siteConfig.logoUrl ? (
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-slate-800 p-1 flex items-center justify-center shadow-sm border border-emerald-200 dark:border-slate-700 group-hover:scale-105 transition-transform overflow-hidden">
                <img
                  src={siteConfig.logoUrl}
                  alt={`Logo ${siteConfig.villageName}`}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform">
                <span className="text-lg tracking-tighter">
                  {siteConfig.logoSymbolText || siteConfig.villageName.charAt(0)}
                </span>
              </div>
            )}
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-sm sm:text-base text-gray-900 dark:text-white tracking-tight whitespace-nowrap">
                  {siteConfig.villageName}
                </span>
                <span className="hidden sm:inline-block text-[10px] font-bold uppercase px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded">
                  SID
                </span>
              </div>
              <p className="text-[10px] tracking-tight text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {siteConfig.subDistrict}, {siteConfig.district}
              </p>
            </div>
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden xl:flex items-center space-x-0.5 2xl:space-x-1 min-w-0">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`px-1.5 2xl:px-2.5 py-1.5 rounded-lg text-[10.5px] 2xl:text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-slate-800 hover:text-emerald-700 dark:hover:text-emerald-400'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
            {adminUser && (
              <button
                onClick={() => handleNavClick('admin')}
                className={`hidden 2xl:flex px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all items-center space-x-1 whitespace-nowrap cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-amber-100/80 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 hover:bg-amber-200'
                }`}
              >
                <span>{t.nav.adminDashboard}</span>
              </button>
            )}
          </nav>

          {/* Right Controls: Track Letter, WhatsApp Bell, Language, Dark Mode, Admin Login */}
          <div className="flex items-center space-x-1 2xl:space-x-1.5 shrink-0">
            <button
              onClick={onOpenTrackModal}
              className="hidden sm:inline-flex items-center space-x-1 px-2 2xl:px-2.5 py-1.5 rounded-lg text-[10.5px] 2xl:text-xs font-semibold border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors whitespace-nowrap cursor-pointer"
              title="Lacak Status Pengajuan Surat"
            >
              <FileSearch className="w-3.5 h-3.5" />
              <span>{t.nav.trackLetter}</span>
            </button>

            {/* Real-time Notification / WhatsApp Gateway Log Button */}
            <button
              onClick={onOpenNotifications}
              className="relative p-1.5 2xl:p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Log Notifikasi Real-Time & WhatsApp Gateway"
              aria-label="Notifikasi"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* Multi-language Selector (ID & EN only) */}
            <div className="relative flex items-center bg-gray-100 dark:bg-slate-800 rounded-lg px-1.5 py-1">
              <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mr-1" />
              <select
                value={lang}
                onChange={(e) => onChangeLang(e.target.value as SupportedLanguage)}
                aria-label="Pilih Bahasa"
                className="bg-transparent text-[10.5px] 2xl:text-xs font-semibold text-gray-700 dark:text-gray-200 focus:outline-none cursor-pointer"
              >
                {LANGUAGE_OPTIONS.map((opt) => (
                  <option key={opt.code} value={opt.code} className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">
                    {opt.flag} {opt.code.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={onToggleDarkMode}
              className="p-1.5 2xl:p-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={darkMode ? t.common.lightMode : t.common.darkMode}
              aria-label="Toggle Dark Mode"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Citizen Portal Login */}
            {!adminUser && (
              <button
                onClick={onOpenCitizenLogin}
                className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 dark:bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors cursor-pointer whitespace-nowrap"
              >
                <User className="w-3.5 h-3.5" />
                <span>Portal Warga</span>
              </button>
            )}

            {/* Admin Login / Profile Button */}
            {adminUser ? (
              <div className="hidden sm:flex items-center space-x-1">
                <button
                  onClick={() => handleNavClick('admin')}
                  className={`px-2 py-1.5 rounded-lg text-[10.5px] 2xl:text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === 'admin'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-emerald-700 text-white hover:bg-emerald-800'
                  }`}
                >
                  Admin: {adminUser.fullName.split(' ')[0]}
                </button>
                <button
                  onClick={onLogoutAdmin}
                  className="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                  title={t.nav.logout}
                  aria-label="Keluar dari Sesi Admin"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAdminLogin}
                className="hidden sm:inline-flex items-center space-x-1 px-2 2xl:px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white text-[11px] 2xl:text-xs font-semibold hover:bg-slate-800 dark:hover:bg-emerald-500 transition-colors whitespace-nowrap cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{t.nav.adminLogin}</span>
              </button>
            )}

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
              aria-label="Menu Navigasi"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-3 pb-5 space-y-2">
          <div className="grid grid-cols-2 gap-1.5">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`px-3 py-2.5 rounded-xl text-left text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-50 dark:bg-slate-800/70 text-gray-700 dark:text-gray-200'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-gray-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenTrackModal();
              }}
              className="flex-1 inline-flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300"
            >
              <FileSearch className="w-3.5 h-3.5" />
              <span>{t.nav.trackLetter}</span>
            </button>

            {adminUser ? (
              <>
                <button
                  onClick={() => handleNavClick('admin')}
                  className="flex-1 px-3 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold text-center"
                >
                  {t.nav.adminDashboard}
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onLogoutAdmin();
                  }}
                  className="px-3 py-2 rounded-xl bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 text-xs font-semibold"
                >
                  {t.nav.logout}
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAdminLogin();
                }}
                className="flex-1 inline-flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white text-xs font-semibold"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{t.nav.adminLogin}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
