export type SupportedLanguage = 'id' | 'en';

export interface LanguageOption {
  code: SupportedLanguage;
  label: string;
  flag: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'id', label: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

export interface TranslationDictionary {
  nav: {
    home: string;
    profile: string;
    services: string;
    gallery: string;
    statistics: string;
    map: string;
    market: string;
    contact: string;
    adminDashboard: string;
    adminLogin: string;
    logout: string;
    trackLetter: string;
  };
  hero: {
    badge: string;
    title: string;
    subtitle: string;
    ctaLetter: string;
    ctaTrack: string;
    ctaStats: string;
    dukcapilConnected: string;
    e2eEncrypted: string;
    whatsappActive: string;
  };
  common: {
    searchPlaceholder: string;
    exportPdf: string;
    exportExcel: string;
    darkMode: string;
    lightMode: string;
    verified: string;
    processingTime: string;
  };
}

export const TRANSLATIONS: Record<SupportedLanguage, TranslationDictionary> = {
  id: {
    nav: {
      home: 'Beranda',
      profile: 'Profil Desa',
      services: 'Layanan Surat',
      gallery: 'Galeri',
      statistics: 'Statistik',
      map: 'Peta Desa',
      market: 'Lapak UMKM',
      contact: 'Kontak & PPID',
      adminDashboard: 'Dasbor Admin',
      adminLogin: 'Login Perangkat',
      logout: 'Keluar',
      trackLetter: 'Lacak Surat',
    },
    hero: {
      badge: 'Sistem Informasi Desa (SID) Terintegrasi',
      title: 'Pelayanan Publik Digital, Transparan & Melayani Warga',
      subtitle:
        'Akses layanan surat pengantar online dengan notifikasi WhatsApp otomatis, transparansi APBDes real-time, data kependudukan terintegrasi, dan Lapak UMKM warga.',
      ctaLetter: 'Ajukan Surat Online',
      ctaTrack: 'Cek Status Permohonan',
      ctaStats: 'Lihat Statistik Desa',
      dukcapilConnected: 'Basis Data Kependudukan Terpadu',
      e2eEncrypted: 'Proteksi Data Kependudukan',
      whatsappActive: 'Notifikasi WhatsApp Otomatis',
    },
    common: {
      searchPlaceholder: 'Cari NIK, Nama Warga, atau Nomor Tiket...',
      exportPdf: 'Ekspor Laporan PDF',
      exportExcel: 'Ekspor Data Excel (CSV)',
      darkMode: 'Mode Malam',
      lightMode: 'Mode Terang',
      verified: 'Terverifikasi',
      processingTime: 'Estimasi Selesai',
    },
  },
  en: {
    nav: {
      home: 'Home',
      profile: 'Village Profile',
      services: 'Online Letters',
      gallery: 'Gallery',
      statistics: 'Demographics',
      map: 'Village Map',
      market: 'Village Market',
      contact: 'Contact & PPID',
      adminDashboard: 'Admin Portal',
      adminLogin: 'Staff Login',
      logout: 'Sign Out',
      trackLetter: 'Track Request',
    },
    hero: {
      badge: 'Integrated Smart Village Information System',
      title: 'Transparent, Fast & Citizen-Centric Digital Public Services',
      subtitle:
        'Submit official village letters online with automated WhatsApp notifications, inspect real-time village budget transparency, demographic analytics, and local MSME products.',
      ctaLetter: 'Request Official Letter',
      ctaTrack: 'Track Application Status',
      ctaStats: 'Explore Demographics',
      dukcapilConnected: 'Integrated Civil Registry',
      e2eEncrypted: 'Protected Citizen Records',
      whatsappActive: 'Automated WhatsApp Gateway',
    },
    common: {
      searchPlaceholder: 'Search Citizen ID (NIK), Name, or Ticket Code...',
      exportPdf: 'Export PDF Report',
      exportExcel: 'Export Excel (CSV)',
      darkMode: 'Dark Mode',
      lightMode: 'Light Mode',
      verified: 'Verified',
      processingTime: 'Estimated SLA',
    },
  },
};
