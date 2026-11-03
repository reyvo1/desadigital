import React, { Component, Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { Navbar, NavTab } from './components/Navbar';
import { Footer } from './components/Footer';

const HomeView = lazy(() => import('./views/HomeView').then((m) => ({ default: m.HomeView })));
const ProfileView = lazy(() => import('./views/ProfileView').then((m) => ({ default: m.ProfileView })));
const ServicesView = lazy(() => import('./views/ServicesView').then((m) => ({ default: m.ServicesView })));
const GalleryView = lazy(() => import('./views/GalleryView').then((m) => ({ default: m.GalleryView })));
const StatisticsView = lazy(() => import('./views/StatisticsView').then((m) => ({ default: m.StatisticsView })));
const MapView = lazy(() => import('./views/MapView').then((m) => ({ default: m.MapView })));
const MarketView = lazy(() => import('./views/MarketView').then((m) => ({ default: m.MarketView })));
const ContactView = lazy(() => import('./views/ContactView').then((m) => ({ default: m.ContactView })));
const AdminDashboardView = lazy(() =>
  import('./views/AdminDashboardView').then((m) => ({ default: m.AdminDashboardView }))
);
const TenantManagementView = lazy(() =>
  import('./components/TenantManagementView').then((m) => ({ default: m.TenantManagementView }))
);
const MarketSubmissionAdminView = lazy(() =>
  import('./components/MarketSubmissionAdminView').then((m) => ({ default: m.MarketSubmissionAdminView }))
);
const TenantOnboardingModal = lazy(() =>
  import('./components/TenantOnboardingModal').then((m) => ({ default: m.TenantOnboardingModal }))
);

import { LetterRequestModal } from './components/LetterRequestModal';
import { LetterTrackingModal } from './components/LetterTrackingModal';
import { OfficialLetterView } from './components/OfficialLetterView';
import {
  WhatsAppLogEntry,
  WhatsAppSimulatorModal,
} from './components/WhatsAppSimulatorModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { CitizenPortalModal } from './components/CitizenPortalModal';
import { LiveChatWidget } from './components/LiveChatWidget';
import { QrVerificationModal } from './components/QrVerificationModal';
import { AccessibilityToolbar } from './components/AccessibilityToolbar';

import {
  AdminUser,
  ApbdesItem,
  AuditLog,
  ChatMessage,
  Citizen,
  CitizenAspiration,
  GalleryItem,
  LetterRequest,
  LetterTypeCode,
  LetterTypeInfo,
  MapFacility,
  MarketProduct,
  MediaAsset,
  PopulationMutationItem,
  VillageAgenda,
  VillageAssetItem,
  VillageDatabase,
  VillageHamlet,
  VillageInstitution,
  VillageMailLog,
  VillageNews,
  VillageOfficial,
  VillagePotential,
  VillageProject,
  VillageRegulation,
  VillageSiteConfig,
} from './types/village';
import {
  INITIAL_AGENDAS,
  INITIAL_APBDES,
  INITIAL_ASPIRATIONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_CHAT_MESSAGES,
  INITIAL_CITIZENS,
  INITIAL_FACILITIES,
  INITIAL_GALLERY,
  INITIAL_HAMLETS,
  INITIAL_INSTITUTIONS,
  INITIAL_LETTER_REQUESTS,
  INITIAL_MAIL_LOGS,
  INITIAL_MEDIA_ASSETS,
  INITIAL_NEWS,
  INITIAL_OFFICIALS,
  INITIAL_POPULATION_MUTATIONS,
  INITIAL_POTENTIALS,
  INITIAL_PROJECTS,
  INITIAL_PRODUCTS,
  INITIAL_REGULATIONS,
  INITIAL_SITE_CONFIG,
  INITIAL_VILLAGE_ASSETS,
  LETTER_TYPES,
} from './data/mockData';
import { SupportedLanguage } from './utils/i18n';
import { AlertTriangle, MessageSquare, RefreshCw, X } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class AppErrorBoundary extends Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error?.message || 'Terjadi kesalahan komponen.' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-6 border border-red-200 dark:border-red-900/50 shadow-xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
              Gangguan Tampilan Modul
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {this.state.errorMessage}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, errorMessage: '' })}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center space-x-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Muat Ulang Modul</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('beranda');
  const [lang, setLang] = useState<SupportedLanguage>('id');
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [citizenUser, setCitizenUser] = useState<{ nik: string; name: string; kk: string; dusun: string } | null>(null);
  const [citizenToken, setCitizenToken] = useState<string>(() => localStorage.getItem('sid_desa_citizen_token') || '');
  const [adminToken, setAdminToken] = useState<string>(() => {
    try {
      return localStorage.getItem('sid_desa_admin_token') || '';
    } catch {
      return '';
    }
  });

  // Full Dynamic State with Backend Database + Generic localStorage Persistence
  const [siteConfig, setSiteConfigState] = useState<VillageSiteConfig>(() =>
    loadFromStorage('sid_desa_site_config_v3', INITIAL_SITE_CONFIG)
  );
  const [citizens, setCitizensState] = useState<Citizen[]>(() =>
    loadFromStorage('sid_desa_citizens_v3', INITIAL_CITIZENS)
  );
  const [requests, setRequestsState] = useState<LetterRequest[]>(() =>
    loadFromStorage('sid_desa_requests_v3', INITIAL_LETTER_REQUESTS)
  );
  const [agendas, setAgendasState] = useState<VillageAgenda[]>(() =>
    loadFromStorage('sid_desa_agendas_v3', INITIAL_AGENDAS)
  );
  const [apbdes, setApbdesState] = useState<ApbdesItem[]>(() =>
    loadFromStorage('sid_desa_apbdes_v3', INITIAL_APBDES)
  );
  const [news, setNewsState] = useState<VillageNews[]>(() =>
    loadFromStorage('sid_desa_news_v3', INITIAL_NEWS)
  );
  const [gallery, setGalleryState] = useState<GalleryItem[]>(() =>
    loadFromStorage('sid_desa_gallery_v3', INITIAL_GALLERY)
  );
  const [products, setProductsState] = useState<MarketProduct[]>(() =>
    loadFromStorage('sid_desa_products_v3', INITIAL_PRODUCTS)
  );
  const [officials, setOfficialsState] = useState<VillageOfficial[]>(() =>
    loadFromStorage('sid_desa_officials_v3', INITIAL_OFFICIALS)
  );
  const [regulations, setRegulationsState] = useState<VillageRegulation[]>(() =>
    loadFromStorage('sid_desa_regulations_v3', INITIAL_REGULATIONS)
  );
  const [aspirations, setAspirationsState] = useState<CitizenAspiration[]>(() =>
    loadFromStorage('sid_desa_aspirations_v3', INITIAL_ASPIRATIONS)
  );
  const [potentials, setPotentialsState] = useState<VillagePotential[]>(() =>
    loadFromStorage('sid_desa_potentials_v3', INITIAL_POTENTIALS)
  );
  const [projects, setProjectsState] = useState<VillageProject[]>(() =>
    loadFromStorage('sid_desa_projects_v3', INITIAL_PROJECTS)
  );
  const [institutions, setInstitutionsState] = useState<VillageInstitution[]>(() =>
    loadFromStorage('sid_desa_institutions_v3', INITIAL_INSTITUTIONS)
  );
  const [hamlets, setHamletsState] = useState<VillageHamlet[]>(() =>
    loadFromStorage('sid_desa_hamlets_v3', INITIAL_HAMLETS)
  );
  const [facilities, setFacilitiesState] = useState<MapFacility[]>(() =>
    loadFromStorage('sid_desa_facilities_v3', INITIAL_FACILITIES)
  );
  const [letterTypes, setLetterTypesState] = useState<LetterTypeInfo[]>(() =>
    loadFromStorage('sid_desa_letter_types_v3', LETTER_TYPES)
  );
  const [adminUsers, setAdminUsersState] = useState<AdminUser[]>(() =>
    loadFromStorage('sid_desa_admin_users_v3', [])
  );
  const [mediaAssets, setMediaAssetsState] = useState<MediaAsset[]>(() =>
    loadFromStorage('sid_desa_media_assets_v3', INITIAL_MEDIA_ASSETS)
  );
  const [auditLogs, setAuditLogsState] = useState<AuditLog[]>(() =>
    loadFromStorage('sid_desa_audit_logs_v3', INITIAL_AUDIT_LOGS)
  );
  const [chatMessages, setChatMessagesState] = useState<ChatMessage[]>(() =>
    loadFromStorage('sid_desa_chat_messages_v3', INITIAL_CHAT_MESSAGES)
  );
  const [incomingOutboxLetters, setIncomingOutboxLettersState] = useState<VillageMailLog[]>(() =>
    loadFromStorage('sid_desa_mail_logs_v4', INITIAL_MAIL_LOGS)
  );
  const [villageAssets, setVillageAssetsState] = useState<VillageAssetItem[]>(() =>
    loadFromStorage('sid_desa_village_assets_v4', INITIAL_VILLAGE_ASSETS)
  );
  const [populationMutations, setPopulationMutationsState] = useState<PopulationMutationItem[]>(() =>
    loadFromStorage('sid_desa_population_mutations_v4', INITIAL_POPULATION_MUTATIONS)
  );

  // Sync helper to backend server (/api/db/:domain) + localStorage
  const syncDomain = useCallback(
    async (domain: keyof VillageDatabase, storageKey: string, data: unknown) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(data));
      } catch {}
      const token = adminToken || localStorage.getItem('sid_desa_admin_token') || '';
      if (!token) return;
      try {
        // Ambil versi terbaru untuk If-Match (hindari 409 terus-menerus karena pengajuan publik menaikkan versi)
        let version: string | null = null;
        try {
          const vr = await fetch('/api/db');
          if (vr.ok) {
            const vd = await vr.json();
            version = vd?.version != null ? String(vd.version) : null;
          }
        } catch {}
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        };
        if (version) headers['If-Match'] = version;
        const res = await fetch(`/api/db/${domain}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ data }),
        });
        if (res.status === 409) {
          // Muat ulang data terbaru, jangan kehilangan perubahan diam-diam
          console.warn('Konflik versi (409). Memuat ulang data terbaru.');
          window.location.reload();
        }
      } catch {
        // Offline / static fallback remains in localStorage
      }
    },
    [adminToken]
  );

  const setSiteConfig = useCallback(
    (val: VillageSiteConfig) => {
      setSiteConfigState(val);
      syncDomain('siteConfig', 'sid_desa_site_config_v3', val);
    },
    [syncDomain]
  );

  const setCitizens = useCallback(
    (val: Citizen[]) => {
      setCitizensState(val);
      syncDomain('citizens', 'sid_desa_citizens_v3', val);
    },
    [syncDomain]
  );

  const setRequests = useCallback(
    (val: LetterRequest[]) => {
      setRequestsState(val);
      syncDomain('requests', 'sid_desa_requests_v3', val);
    },
    [syncDomain]
  );

  const setAgendas = useCallback(
    (val: VillageAgenda[]) => {
      setAgendasState(val);
      syncDomain('agendas', 'sid_desa_agendas_v3', val);
    },
    [syncDomain]
  );

  const setApbdes = useCallback(
    (val: ApbdesItem[]) => {
      setApbdesState(val);
      syncDomain('apbdes', 'sid_desa_apbdes_v3', val);
    },
    [syncDomain]
  );

  const setNews = useCallback(
    (val: VillageNews[]) => {
      setNewsState(val);
      syncDomain('news', 'sid_desa_news_v3', val);
    },
    [syncDomain]
  );

  const setGallery = useCallback(
    (val: GalleryItem[]) => {
      setGalleryState(val);
      syncDomain('gallery', 'sid_desa_gallery_v3', val);
    },
    [syncDomain]
  );

  const setProducts = useCallback(
    (val: MarketProduct[]) => {
      setProductsState(val);
      syncDomain('products', 'sid_desa_products_v3', val);
    },
    [syncDomain]
  );

  const setOfficials = useCallback(
    (val: VillageOfficial[]) => {
      setOfficialsState(val);
      syncDomain('officials', 'sid_desa_officials_v3', val);
    },
    [syncDomain]
  );

  const setRegulations = useCallback(
    (val: VillageRegulation[]) => {
      setRegulationsState(val);
      syncDomain('regulations', 'sid_desa_regulations_v3', val);
    },
    [syncDomain]
  );

  const setAspirations = useCallback(
    (val: CitizenAspiration[]) => {
      setAspirationsState(val);
      const token = adminToken || localStorage.getItem('sid_desa_admin_token') || '';
      if (token) {
        syncDomain('aspirations', 'sid_desa_aspirations_v3', val);
      } else if (val.length > 0) {
        try {
          localStorage.setItem('sid_desa_aspirations_v3', JSON.stringify(val));
        } catch {}
        fetch('/api/public/aspirations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ aspiration: val[0] }),
        }).catch(() => {});
      }
    },
    [adminToken, syncDomain]
  );

  const setPotentials = useCallback(
    (val: VillagePotential[]) => {
      setPotentialsState(val);
      syncDomain('potentials', 'sid_desa_potentials_v3', val);
    },
    [syncDomain]
  );

  const setProjects = useCallback(
    (val: VillageProject[]) => {
      setProjectsState(val);
      syncDomain('projects', 'sid_desa_projects_v3', val);
    },
    [syncDomain]
  );

  const setInstitutions = useCallback(
    (val: VillageInstitution[]) => {
      setInstitutionsState(val);
      syncDomain('institutions', 'sid_desa_institutions_v3', val);
    },
    [syncDomain]
  );

  const setHamlets = useCallback(
    (val: VillageHamlet[]) => {
      setHamletsState(val);
      syncDomain('hamlets', 'sid_desa_hamlets_v3', val);
    },
    [syncDomain]
  );

  const setFacilities = useCallback(
    (val: MapFacility[]) => {
      setFacilitiesState(val);
      syncDomain('facilities', 'sid_desa_facilities_v3', val);
    },
    [syncDomain]
  );

  const setLetterTypes = useCallback(
    (val: LetterTypeInfo[]) => {
      setLetterTypesState(val);
      syncDomain('letterTypes', 'sid_desa_letter_types_v3', val);
    },
    [syncDomain]
  );

  const setAdminUsers = useCallback(
    (val: AdminUser[]) => {
      setAdminUsersState(val);
      syncDomain('adminUsers', 'sid_desa_admin_users_v3', val);
    },
    [syncDomain]
  );

  const setMediaAssets = useCallback(
    (val: MediaAsset[]) => {
      setMediaAssetsState(val);
      syncDomain('mediaAssets', 'sid_desa_media_assets_v3', val);
    },
    [syncDomain]
  );

  const setAuditLogs = useCallback(
    (val: AuditLog[]) => {
      setAuditLogsState(val);
      syncDomain('auditLogs', 'sid_desa_audit_logs_v3', val);
    },
    [syncDomain]
  );

  const setChatMessages = useCallback(
    (val: ChatMessage[]) => {
      setChatMessagesState(val);
      syncDomain('chatMessages', 'sid_desa_chat_messages_v3', val);
    },
    [syncDomain]
  );

  const setIncomingOutboxLetters = useCallback(
    (val: VillageMailLog[]) => {
      setIncomingOutboxLettersState(val);
      syncDomain('incomingOutboxLetters', 'sid_desa_mail_logs_v4', val);
    },
    [syncDomain]
  );

  const setVillageAssets = useCallback(
    (val: VillageAssetItem[]) => {
      setVillageAssetsState(val);
      syncDomain('villageAssets', 'sid_desa_village_assets_v4', val);
    },
    [syncDomain]
  );

  const setPopulationMutations = useCallback(
    (val: PopulationMutationItem[]) => {
      setPopulationMutationsState(val);
      syncDomain('populationMutations', 'sid_desa_population_mutations_v4', val);
    },
    [syncDomain]
  );

  // Fetch initial state from Backend Server Database (/api/db) on mount
  useEffect(() => {
    let mounted = true;
    fetch('/api/db')
      .then((res) => (res.ok ? res.json() : null))
      .then((db: VillageDatabase | null) => {
        if (!mounted || !db) return;
        if (db.siteConfig) setSiteConfigState(db.siteConfig);
        if (db.citizens) setCitizensState(db.citizens);
        if (db.requests) setRequestsState(db.requests);
        if (db.agendas) setAgendasState(db.agendas);
        if (db.apbdes) setApbdesState(db.apbdes);
        if (db.news) setNewsState(db.news);
        if (db.gallery) setGalleryState(db.gallery);
        if (db.products) setProductsState(db.products);
        if (db.officials) setOfficialsState(db.officials);
        if (db.regulations) setRegulationsState(db.regulations);
        if (db.aspirations) setAspirationsState(db.aspirations);
        if (db.potentials) setPotentialsState(db.potentials);
        if (db.projects) setProjectsState(db.projects);
        if (db.institutions) setInstitutionsState(db.institutions);
        if (db.hamlets) setHamletsState(db.hamlets);
        if (db.facilities) setFacilitiesState(db.facilities);
        if (db.letterTypes) setLetterTypesState(db.letterTypes);
        if (db.adminUsers) setAdminUsersState(db.adminUsers);
        if (db.mediaAssets) setMediaAssetsState(db.mediaAssets);
        if (db.auditLogs) setAuditLogsState(db.auditLogs);
        if (db.chatMessages) setChatMessagesState(db.chatMessages);
        if (db.incomingOutboxLetters) setIncomingOutboxLettersState(db.incomingOutboxLetters);
        if (db.villageAssets) setVillageAssetsState(db.villageAssets);
        if (db.populationMutations) setPopulationMutationsState(db.populationMutations);
      })
      .catch(() => {
        // Fallback to localStorage state if server is unreachable
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Modals & Notification Logs
  const [isLetterModalOpen, setIsLetterModalOpen] = useState(false);
  const [preselectedCode, setPreselectedCode] = useState<LetterTypeCode | undefined>(undefined);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [trackingPrefillCode, setTrackingPrefillCode] = useState<string>('');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isCitizenModalOpen, setIsCitizenModalOpen] = useState(false);
const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);

  useEffect(() => {
    if (!citizenToken) return;
    fetch('/api/citizen/me', { headers: { Authorization: `Bearer ${citizenToken}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.citizen) {
          setCitizenUser({ nik: data.citizen.nik, name: data.citizen.name, kk: data.citizen.kk, dusun: data.citizen.dusun });
        } else {
          setCitizenToken('');
          try { localStorage.removeItem('sid_desa_citizen_token'); } catch {}
        }
      })
      .catch(() => {});
  }, [citizenToken]);
  const [viewingOfficialLetter, setViewingOfficialLetter] = useState<LetterRequest | null>(null);
  const [isQrVerifyModalOpen, setIsQrVerifyModalOpen] = useState(false);
  const [qrVerifyTargetRequest, setQrVerifyTargetRequest] = useState<LetterRequest | null>(null);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(2);

  // Accessibility (Senior & Disability Friendly Mode) State
  const [fontSizeScale, setFontSizeScale] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [highContrast, setHighContrast] = useState<boolean>(false);

  const [whatsappLogs, setWhatsappLogs] = useState<WhatsAppLogEntry[]>(() =>
    INITIAL_LETTER_REQUESTS.filter((r) => r.lastWhatsappMessage).map((r) => ({
      id: `wa-init-${r.id}`,
      timestamp: r.updatedAt,
      recipientName: r.citizenName,
      recipientPhone: r.whatsapp,
      trackingCode: r.trackingCode,
      statusLabel: r.status,
      message: r.lastWhatsappMessage || '',
    }))
  );

  const [notificationToast, setNotificationToast] = useState<{
    title: string;
    message: string;
    type: 'success' | 'info' | 'wa';
  } | null>(null);

  // Support ?tab=... deep links & verify existing admin session token
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab') as NavTab | null;
    const ssoToken = params.get('sso_token');
    if (ssoToken) {
      setAdminToken(ssoToken);
      try { localStorage.setItem('sid_desa_admin_token', ssoToken); } catch {}
      // Clean URL
      params.delete('sso_token');
      const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
      window.history.replaceState({}, '', newUrl);
    }
    if (
      tabParam &&
      ['beranda', 'profil', 'layanan', 'galeri', 'statistik', 'peta', 'lapak', 'kontak'].includes(
        tabParam
      )
    ) {
      setActiveTab(tabParam);
    }

    const storedToken = localStorage.getItem('sid_desa_admin_token');
    if (storedToken) {
      fetch('/api/auth/session', {
        headers: { Authorization: `Bearer ${storedToken}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (json?.authenticated && json?.user) {
            setAdminUser(json.user);
            setAdminToken(storedToken);
            if (tabParam === 'admin') {
              setActiveTab('admin');
            }
          } else {
            localStorage.removeItem('sid_desa_admin_token');
            setAdminToken('');
          }
        })
        .catch(() => {});
    }
  }, []);

  // Sync dark mode class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Sync Accessibility attributes (Font Size Scale & High Contrast)
  useEffect(() => {
    document.documentElement.setAttribute('data-a11y-scale', fontSizeScale);
    document.documentElement.setAttribute(
      'data-a11y-contrast',
      highContrast ? 'high' : 'normal'
    );
  }, [fontSizeScale, highContrast]);

  // Dynamic document title from siteConfig
  useEffect(() => {
    document.title = `Portal Resmi ${siteConfig.villageName} — ${siteConfig.subDistrict}, ${siteConfig.district}`;
  }, [siteConfig.villageName, siteConfig.subDistrict, siteConfig.district]);

  const showToast = (
    title: string,
    message: string,
    type: 'success' | 'info' | 'wa' = 'success'
  ) => {
    setNotificationToast({ title, message, type });
    setTimeout(() => {
      setNotificationToast(null);
    }, 4500);
  };

  const handleResetAllToDefault = async () => {
    setSiteConfig(INITIAL_SITE_CONFIG);
    setCitizens(INITIAL_CITIZENS);
    setRequests(INITIAL_LETTER_REQUESTS);
    setAgendas(INITIAL_AGENDAS);
    setApbdes(INITIAL_APBDES);
    setNews(INITIAL_NEWS);
    setGallery(INITIAL_GALLERY);
    setProducts(INITIAL_PRODUCTS);
    setOfficials(INITIAL_OFFICIALS);
    setRegulations(INITIAL_REGULATIONS);
    setAspirations(INITIAL_ASPIRATIONS);
    setPotentials(INITIAL_POTENTIALS);
    setProjects(INITIAL_PROJECTS);
    setInstitutions(INITIAL_INSTITUTIONS);
    setHamlets(INITIAL_HAMLETS);
    setFacilities(INITIAL_FACILITIES);
    setLetterTypes(LETTER_TYPES);
    setAdminUsers([]);
    setMediaAssets(INITIAL_MEDIA_ASSETS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setChatMessages(INITIAL_CHAT_MESSAGES);
    setIncomingOutboxLetters(INITIAL_MAIL_LOGS);
    setVillageAssets(INITIAL_VILLAGE_ASSETS);
    setPopulationMutations(INITIAL_POPULATION_MUTATIONS);

    try {
      const token = adminToken || localStorage.getItem('sid_desa_admin_token') || '';
      await fetch('/api/db/reset', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {}

    showToast(
      'Database Direset ke Standar Awal',
      `Seluruh konten dan konfigurasi ${INITIAL_SITE_CONFIG.villageName} telah dikembalikan ke pengaturan awal.`,
      'info'
    );
  };

  const handleOpenLetterModal = (code?: LetterTypeCode) => {
    setPreselectedCode(code);
    setIsLetterModalOpen(true);
  };

  const handleRecordWhatsApp = (req: LetterRequest, waMessage: string) => {
    const newEntry: WhatsAppLogEntry = {
      id: `wa-${Date.now()}`,
      timestamp: req.updatedAt,
      recipientName: req.citizenName,
      recipientPhone: req.whatsapp,
      trackingCode: req.trackingCode,
      statusLabel: req.status,
      message: waMessage,
    };
    setWhatsappLogs((prev) => [newEntry, ...prev]);
    setUnreadNotificationsCount((n) => n + 1);
  };

  const handleSubmitNewRequest = (newRequest: LetterRequest, waMessage: string) => {
    setRequests([newRequest, ...requests]);
    const token = adminToken || localStorage.getItem('sid_desa_admin_token') || '';
    if (!token) {
      fetch('/api/public/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request: newRequest }),
      }).catch(() => {});
    }
    handleRecordWhatsApp(newRequest, waMessage);
    showToast(
      'Permohonan Surat Berhasil Terkirim!',
      `Kode Tiket ${newRequest.trackingCode} diterbitkan & notifikasi WhatsApp dikirim ke ${newRequest.whatsapp}.`,
      'wa'
    );
  };

  return (
    <div
      data-village-theme={siteConfig.primaryThemeColor || 'emerald'}
      data-village-font={siteConfig.fontFamily || 'plus-jakarta'}
      className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200"
    >
      {/* Toast Notification */}
      {notificationToast && (
        <div className="fixed top-20 right-4 z-50 max-w-sm w-full bg-emerald-950 text-white p-4 rounded-2xl shadow-2xl border border-emerald-500/40 flex items-start space-x-3">
          <div className="p-2 bg-emerald-600 rounded-xl text-white shrink-0">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="flex-1 text-xs">
            <h5 className="font-bold text-sm text-emerald-200">{notificationToast.title}</h5>
            <p className="mt-0.5 text-emerald-100">{notificationToast.message}</p>
          </div>
          <button
            onClick={() => setNotificationToast(null)}
            className="text-white/60 hover:text-white p-1 cursor-pointer"
            aria-label="Tutup notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Navigation & Running Text Marquee */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'admin' && !adminUser) {
            setIsLoginModalOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
        lang={lang}
        onChangeLang={setLang}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        adminUser={adminUser}
        onOpenAdminLogin={() => setIsLoginModalOpen(true)}
        onOpenCitizenLogin={() => setIsCitizenModalOpen(true)}
        onLogoutAdmin={() => {
          const token = adminToken || localStorage.getItem('sid_desa_admin_token') || '';
          if (token) {
            fetch('/api/auth/logout', {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
            }).catch(() => {});
          }
          try {
            localStorage.removeItem('sid_desa_admin_token');
          } catch {}
          setAdminToken('');
          setAdminUser(null);
          setActiveTab('beranda');
          showToast('Sesi Berakhir', 'Anda telah keluar dari Dashboard Perangkat Desa.', 'info');
        }}
        onOpenTrackModal={() => {
          setTrackingPrefillCode('');
          setIsTrackingModalOpen(true);
        }}
        unreadNotificationsCount={unreadNotificationsCount}
        onOpenNotifications={() => {
          setUnreadNotificationsCount(0);
          setIsWhatsAppModalOpen(true);
        }}
        siteConfig={siteConfig}
      />

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AppErrorBoundary>
          <Suspense
            fallback={
              <div className="min-h-[40vh] flex items-center justify-center">
                <div className="flex items-center space-x-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Memuat halaman...</span>
                </div>
              </div>
            }
          >
        {activeTab === 'beranda' && (
          <HomeView
            lang={lang}
            citizens={citizens}
            requests={requests}
            news={news}
            gallery={gallery}
            products={products}
            agendas={agendas}
            apbdes={apbdes}
            potentials={potentials}
            projects={projects}
            letterTypes={letterTypes}
            siteConfig={siteConfig}
            onSelectTab={(tab) => {
              if (tab === 'admin' && !adminUser) {
                setIsLoginModalOpen(true);
              } else {
                setActiveTab(tab);
              }
            }}
            onOpenLetterModal={handleOpenLetterModal}
            onOpenTrackModal={() => {
              setTrackingPrefillCode('');
              setIsTrackingModalOpen(true);
            }}
            onOpenQrVerifyModal={(req) => {
              setQrVerifyTargetRequest(req || null);
              setIsQrVerifyModalOpen(true);
            }}
          />
        )}

        {activeTab === 'profil' && (
          <ProfileView
            siteConfig={siteConfig}
            officials={officials}
            regulations={regulations}
            potentials={potentials}
            projects={projects}
            institutions={institutions}
            hamlets={hamlets}
          />
        )}

        {activeTab === 'layanan' && (
          <ServicesView
            requests={requests}
            citizens={citizens}
            letterTypes={letterTypes}
            siteConfig={siteConfig}
            regulations={regulations}
            villageAssets={villageAssets}
            incomingOutboxLetters={incomingOutboxLetters}
            populationMutations={populationMutations}
            agendas={agendas}
            onOpenRequestModal={(type) => handleOpenLetterModal(type)}
            onOpenTrackModal={(prefillCode) => {
              setTrackingPrefillCode(prefillCode || '');
              setIsTrackingModalOpen(true);
            }}
            onPreviewOfficialLetter={(req) => setViewingOfficialLetter(req)}
            onOpenQrVerifyModal={(req) => {
              setQrVerifyTargetRequest(req || null);
              setIsQrVerifyModalOpen(true);
            }}
            onInstantIssueLetter={handleSubmitNewRequest}
          />
        )}

        {activeTab === 'galeri' && (
          <GalleryView gallery={gallery} siteConfig={siteConfig} />
        )}

        {activeTab === 'statistik' && (
          <StatisticsView
            citizens={citizens}
            apbdes={apbdes}
            siteConfig={siteConfig}
            hamlets={hamlets}
          />
        )}

        {activeTab === 'peta' && (
          <MapView
            facilities={facilities}
            siteConfig={siteConfig}
            hamlets={hamlets}
          />
        )}

        {activeTab === 'lapak' && (
          <MarketView
            products={products}
            siteConfig={siteConfig}
            onOrderCreated={(newOrder) => {
              const updatedOrders = [newOrder, ...(siteConfig.marketOrders || [])];
              setSiteConfigState({ ...siteConfig, marketOrders: updatedOrders });
              showToast(
                'Pesanan Kolektif UMKM Tercatat!',
                `Kode Pesanan ${newOrder.orderCode} (${newOrder.items.length} produk) tersimpan di server.`,
                'wa'
              );
            }}
          />
        )}

        {activeTab === 'kontak' && (
          <ContactView
            aspirations={aspirations}
            onUpdateAspirations={setAspirations}
            siteConfig={siteConfig}
            hamlets={hamlets}
          />
        )}

        {activeTab === 'admin' && adminUser && adminUser.isPlatformAdmin && (
          <Suspense fallback={<div className="text-xs text-gray-500 p-4">Memuat...</div>}>
            <TenantManagementView
              adminToken={adminToken}
              onShowToast={(title, msg) => showToast(title, msg, 'success')}
            />
          </Suspense>
        )}

        {activeTab === 'admin' && adminUser && !adminUser.isPlatformAdmin && (
          <>
            <AdminDashboardView
            currentUser={adminUser}
            requests={requests}
            onUpdateRequests={setRequests}
            citizens={citizens}
            onUpdateCitizens={setCitizens}
            agendas={agendas}
            onUpdateAgendas={setAgendas}
            siteConfig={siteConfig}
            onUpdateSiteConfig={setSiteConfig}
            apbdes={apbdes}
            onUpdateApbdes={setApbdes}
            news={news}
            onUpdateNews={setNews}
            gallery={gallery}
            onUpdateGallery={setGallery}
            products={products}
            onUpdateProducts={setProducts}
            officials={officials}
            onUpdateOfficials={setOfficials}
            regulations={regulations}
            onUpdateRegulations={setRegulations}
            aspirations={aspirations}
            onUpdateAspirations={setAspirations}
            potentials={potentials}
            onUpdatePotentials={setPotentials}
            projects={projects}
            onUpdateProjects={setProjects}
            institutions={institutions}
            onUpdateInstitutions={setInstitutions}
            hamlets={hamlets}
            onUpdateHamlets={setHamlets}
            facilities={facilities}
            onUpdateFacilities={setFacilities}
            letterTypes={letterTypes}
            onUpdateLetterTypes={setLetterTypes}
            adminUsers={adminUsers}
            onUpdateAdminUsers={setAdminUsers}
            mediaAssets={mediaAssets}
            onUpdateMediaAssets={setMediaAssets}
            auditLogs={auditLogs}
            onUpdateAuditLogs={setAuditLogs}
            chatMessages={chatMessages}
            onUpdateChatMessages={setChatMessages}
            incomingOutboxLetters={incomingOutboxLetters}
            onUpdateIncomingOutboxLetters={setIncomingOutboxLetters}
            villageAssets={villageAssets}
            onUpdateVillageAssets={setVillageAssets}
            populationMutations={populationMutations}
            onUpdatePopulationMutations={setPopulationMutations}
            onResetAllToDefault={handleResetAllToDefault}
            onShowToast={(title, msg) => showToast(title, msg, 'success')}
            onViewLetter={(req) => setViewingOfficialLetter(req)}
            onRecordWhatsAppNotification={handleRecordWhatsApp}
          />
          <Suspense fallback={<div className="text-xs text-gray-500 p-4">Memuat...</div>}>
            <MarketSubmissionAdminView
              adminToken={adminToken}
              onShowToast={(title, msg) => showToast(title, msg, 'success')}
            />
          </Suspense>
          </>
        )}
          </Suspense>
        </AppErrorBoundary>
      </main>

      {/* Footer */}
      <Footer
        onSelectTab={(tab) => {
          if (tab === 'admin' && !adminUser) {
            setIsLoginModalOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
        onOpenAdminLogin={() => setIsLoginModalOpen(true)}
        onOpenOnboarding={() => setIsOnboardingModalOpen(true)}
        siteConfig={siteConfig}
      />

      {/* Floating Live Chat, AI Desa & WhatsApp/Telegram API Widget */}
      <LiveChatWidget
        siteConfig={siteConfig}
        chatMessages={chatMessages}
        onUpdateChatMessages={setChatMessages}
      />

      {/* 1. Modal Pengajuan Surat Online */}
      <LetterRequestModal
        isOpen={isLetterModalOpen}
        onClose={() => setIsLetterModalOpen(false)}
        preselectedType={preselectedCode}
        citizens={citizens}
        existingRequestsCount={requests.length}
        onSubmitRequest={handleSubmitNewRequest}
        letterTypes={letterTypes}
        siteConfig={siteConfig}
        hamlets={hamlets}
      />

      {/* 2. Modal Lacak Status Surat */}
      {isTrackingModalOpen && (
        <LetterTrackingModal
          requests={requests}
          initialSearchCode={trackingPrefillCode}
          onClose={() => setIsTrackingModalOpen(false)}
          onViewLetter={(req) => {
            setIsTrackingModalOpen(false);
            setViewingOfficialLetter(req);
          }}
        />
      )}

      {/* 3. Modal Dokumen Resmi Ber-QR Code */}
      <OfficialLetterView
        request={viewingOfficialLetter}
        citizen={
          viewingOfficialLetter
            ? citizens.find((c) => c.nik === viewingOfficialLetter.nik)
            : undefined
        }
        siteConfig={siteConfig}
        letterTypes={letterTypes}
        officials={officials}
        onClose={() => setViewingOfficialLetter(null)}
        onVerifyQr={(req) => {
          setQrVerifyTargetRequest(req);
          setIsQrVerifyModalOpen(true);
        }}
      />

      {/* 3B. Halaman Verifikasi QR Code Tanda Tangan Elektronik (TTE) Resmi */}
      <QrVerificationModal
        isOpen={isQrVerifyModalOpen}
        onClose={() => setIsQrVerifyModalOpen(false)}
        initialRequest={qrVerifyTargetRequest}
        allRequests={requests}
        siteConfig={siteConfig}
      />

      {/* 3C. Toolbar Aksesibilitas Ramah Lansia & Disabilitas (Perbesar Huruf, Kontras Tinggi, TTS Bahasa Indonesia) */}
      <AccessibilityToolbar
        siteConfig={siteConfig}
        news={news}
        fontSizeScale={fontSizeScale}
        onChangeFontSize={setFontSizeScale}
        highContrast={highContrast}
        onToggleHighContrast={() => setHighContrast(!highContrast)}
      />

      {/* 4. Modal Riwayat Notifikasi WhatsApp */}
      <WhatsAppSimulatorModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        logs={whatsappLogs}
        siteConfig={siteConfig}
      />

      {/* 5. Modal Login Perangkat Desa */}
      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        adminUsers={adminUsers}
        siteConfig={siteConfig}
        onLoginSuccess={(user, token) => {
          if (token) {
            setAdminToken(token);
            try {
              localStorage.setItem('sid_desa_admin_token', token);
            } catch {}
          }
          setAdminUser(user);
          setIsLoginModalOpen(false);
          setActiveTab('admin');
          showToast(
            'Otentikasi Berhasil',
            `Selamat bertugas, ${user.fullName} (${user.role}).`,
            'success'
          );
        }}
      />

      <Suspense fallback={null}>
        <TenantOnboardingModal
          isOpen={isOnboardingModalOpen}
          onClose={() => setIsOnboardingModalOpen(false)}
          onShowToast={(title, msg) => showToast(title, msg, 'success')}
        />
      </Suspense>

      <CitizenPortalModal
        isOpen={isCitizenModalOpen}
        onClose={() => setIsCitizenModalOpen(false)}
        citizen={citizenUser}
        token={citizenToken}
        onLogin={async (nik, password) => {
          const res = await fetch('/api/citizen/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nik, password }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error || 'Login warga gagal.');
          setCitizenUser(data.user);
          setCitizenToken(data.token);
          try { localStorage.setItem('sid_desa_citizen_token', data.token); } catch {}
        }}
        onLogout={() => {
          const token = citizenToken || localStorage.getItem('sid_desa_citizen_token') || '';
          if (token) {
            fetch('/api/citizen/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
          }
          setCitizenUser(null);
          setCitizenToken('');
          try { localStorage.removeItem('sid_desa_citizen_token'); } catch {}
        }}
        onOpenLetterModal={() => setIsLetterModalOpen(true)}
        onCitizenUpdated={(c) => setCitizenUser(c)}
      />
    </div>
  );
}
