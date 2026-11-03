import React, { useState, useEffect } from 'react';
import {
  VillageSiteConfig,
  ApbdesItem,
  VillageNews,
  GalleryItem,
  MarketProduct,
  VillageOfficial,
  VillageRegulation,
  CitizenAspiration,
  VillagePotential,
  VillageProject,
  VillageInstitution,
  VillageHamlet,
  MapFacility,
  LetterTypeInfo,
  LetterTypeCode,
  AdminUser,
  MediaAsset,
} from '../types/village';
import { buildCsvContent, parseApbdesCsv } from '../utils/villageLogic';
import { ImageUploadField } from './ImageUploadField';
import { MediaGalleryPicker } from './MediaGalleryPicker';
import {
  Layout,
  UserCheck,
  Wallet,
  Newspaper,
  Store,
  Users,
  Scale,
  MessageSquare,
  Plus,
  Trash2,
  Edit,
  RotateCcw,
  Save,
  X,
  HardHat,
  Sprout,
  Landmark,
  MapPin,
  FileText,
  Database,
  KeyRound,
  Image as ImageIcon,
} from 'lucide-react';

function createLocalFallbackSvg(label: string): string {
  const safe = label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#064e3b"/>
        <stop offset="100%" stop-color="#059669"/>
      </linearGradient>
    </defs>
    <rect width="800" height="500" fill="url(#g)"/>
    <circle cx="650" cy="120" r="70" fill="#fbbf24" fill-opacity="0.75"/>
    <path d="M0 380 Q240 290 480 360 T800 320 L800 500 L0 500 Z" fill="#022c22" fill-opacity="0.45"/>
    <text x="50" y="420" font-family="Arial, sans-serif" font-weight="bold" font-size="28" fill="#ffffff">${safe}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const BUILTIN_LOGO_PRESETS: { name: string; dataUrl: string }[] = [
  {
    name: 'Lambang Padi & Kapas (Hijau Zamrud)',
    dataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
        <path d="M100 12 L175 42 V102 C175 148 142 178 100 192 C58 178 25 148 25 102 V42 L100 12 Z" fill="#059669" stroke="#fbbf24" stroke-width="6"/>
        <polygon points="100,44 106,60 123,60 109,70 114,86 100,76 86,86 91,70 77,60 94,60" fill="#fbbf24"/>
        <path d="M62 135 L100 88 L138 135 Z" fill="#34d399"/>
        <rect x="52" y="150" width="96" height="18" rx="9" fill="#fbbf24"/>
        <text x="100" y="163" text-anchor="middle" font-family="Arial, sans-serif" font-weight="bold" font-size="10" fill="#064e3b">DESA MANDIRI</text>
      </svg>
    `)}`,
  },
  {
    name: 'Perisai Agro Nusantara (Hijau Emas)',
    dataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="88" fill="#065f46" stroke="#f59e0b" stroke-width="8"/>
        <path d="M50 128 L85 75 L115 112 L135 85 L155 128 Z" fill="#10b981"/>
        <circle cx="135" cy="65" r="14" fill="#fbbf24"/>
        <text x="100" y="160" text-anchor="middle" font-family="Arial, sans-serif" font-weight="bold" font-size="13" fill="#ffffff">PEMERINTAH DESA</text>
      </svg>
    `)}`,
  },
];

function formatDateId(isoDate: string): string {
  const months = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  return `${String(d).padStart(2, '0')} ${months[m - 1] || 'Maret'} ${y}`;
}

interface VillageCMSViewProps {
  siteConfig: VillageSiteConfig;
  onUpdateSiteConfig: (cfg: VillageSiteConfig) => void;
  apbdes: ApbdesItem[];
  onUpdateApbdes: (items: ApbdesItem[]) => void;
  news: VillageNews[];
  onUpdateNews: (items: VillageNews[]) => void;
  gallery: GalleryItem[];
  onUpdateGallery: (items: GalleryItem[]) => void;
  products: MarketProduct[];
  onUpdateProducts: (items: MarketProduct[]) => void;
  officials: VillageOfficial[];
  onUpdateOfficials: (items: VillageOfficial[]) => void;
  regulations: VillageRegulation[];
  onUpdateRegulations: (items: VillageRegulation[]) => void;
  aspirations: CitizenAspiration[];
  onUpdateAspirations: (items: CitizenAspiration[]) => void;
  potentials: VillagePotential[];
  onUpdatePotentials: (items: VillagePotential[]) => void;
  projects: VillageProject[];
  onUpdateProjects: (items: VillageProject[]) => void;
  institutions: VillageInstitution[];
  onUpdateInstitutions: (items: VillageInstitution[]) => void;
  hamlets: VillageHamlet[];
  onUpdateHamlets: (items: VillageHamlet[]) => void;
  facilities: MapFacility[];
  onUpdateFacilities: (items: MapFacility[]) => void;
  letterTypes: LetterTypeInfo[];
  onUpdateLetterTypes: (items: LetterTypeInfo[]) => void;
  adminUsers?: AdminUser[];
  onUpdateAdminUsers?: (items: AdminUser[]) => void;
  mediaAssets?: MediaAsset[];
  onUpdateMediaAssets?: (items: MediaAsset[]) => void;
  onResetAllToDefault: () => void;
  onShowToast: (title: string, message: string) => void;
}

export const VillageCMSView: React.FC<VillageCMSViewProps> = ({
  siteConfig,
  onUpdateSiteConfig,
  apbdes,
  onUpdateApbdes,
  news,
  onUpdateNews,
  gallery,
  onUpdateGallery,
  products,
  onUpdateProducts,
  officials,
  onUpdateOfficials,
  regulations,
  onUpdateRegulations,
  aspirations,
  onUpdateAspirations,
  potentials,
  onUpdatePotentials,
  projects,
  onUpdateProjects,
  institutions,
  onUpdateInstitutions,
  hamlets,
  onUpdateHamlets,
  facilities,
  onUpdateFacilities,
  letterTypes,
  onUpdateLetterTypes,
  adminUsers = [],
  onUpdateAdminUsers,
  mediaAssets = [],
  onUpdateMediaAssets,
  onResetAllToDefault,
  onShowToast,
}) => {
  const [cmsSection, setCmsSection] = useState<
    | 'identitas'
    | 'profil'
    | 'apbdes_proyek'
    | 'berita'
    | 'galeri_lapak_potensi'
    | 'sotk_lkd_dusun'
    | 'hukum_surat_peta'
    | 'aspirasi'
    | 'admin_media'
  >('identitas');

  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  // Local editable copy of siteConfig
  const [draftConfig, setDraftConfig] = useState<VillageSiteConfig>(siteConfig);
  const [newMissionText, setNewMissionText] = useState('');

  useEffect(() => {
    setDraftConfig(siteConfig);
  }, [siteConfig]);

  const defaultHamletName = hamlets[0]?.name || siteConfig.defaults?.dusun || 'Dusun 1 Sukasari';

  // 1. APBDes CRUD Modal State + CSV Import Preview
  const [isApbModalOpen, setIsApbModalOpen] = useState(false);
  const [editingApb, setEditingApb] = useState<ApbdesItem | null>(null);
  const [apbCategory, setApbCategory] = useState<'Pendapatan' | 'Belanja'>('Pendapatan');
  const [apbSubCategory, setApbSubCategory] = useState('');
  const [apbAnggaran, setApbAnggaran] = useState('100000000');
  const [apbRealisasi, setApbRealisasi] = useState('90000000');
  const [apbDesc, setApbDesc] = useState('');
  const [apbCsvRaw, setApbCsvRaw] = useState('');
  const [apbCsvPreview, setApbCsvPreview] = useState<ReturnType<typeof parseApbdesCsv> | null>(null);
  const [showApbCsvPanel, setShowApbCsvPanel] = useState(false);

  // 2. Project (E-Pembangunan) CRUD Modal State
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<VillageProject | null>(null);
  const [prjTitle, setPrjTitle] = useState('');
  const [prjLocation, setPrjLocation] = useState(defaultHamletName);
  const [prjBudget, setPrjBudget] = useState('185000000');
  const [prjRealized, setPrjRealized] = useState('185000000');
  const [prjSource, setPrjSource] = useState<VillageProject['sourceFund']>('Dana Desa (DD)');
  const [prjProgress, setPrjProgress] = useState('100');
  const [prjStatus, setPrjStatus] = useState<VillageProject['status']>('Selesai 100%');
  const [prjExecutor, setPrjExecutor] = useState(`TPK ${siteConfig.villageName}`);
  const [prjDesc, setPrjDesc] = useState('');
  const [prjImageUrl, setPrjImageUrl] = useState('');

  // 3. News CRUD Modal State
  const [isNewsModalOpen, setIsNewsModalOpen] = useState(false);
  const [editingNews, setEditingNews] = useState<VillageNews | null>(null);
  const [newsTitle, setNewsTitle] = useState('');
  const [newsCategory, setNewsCategory] = useState('Pengumuman');
  const [newsAuthor, setNewsAuthor] = useState('Tim Humas Pemdes');
  const [newsSummary, setNewsSummary] = useState('');
  const [newsContent, setNewsContent] = useState('');
  const [newsImageUrl, setNewsImageUrl] = useState('');

  // 4. Gallery CRUD Modal State
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [editingGallery, setEditingGallery] = useState<GalleryItem | null>(null);
  const [galTitle, setGalTitle] = useState('');
  const [galCategory, setGalCategory] = useState('Gotong Royong');
  const [galLocation, setGalLocation] = useState(defaultHamletName);
  const [galDesc, setGalDesc] = useState('');
  const [galImageUrl, setGalImageUrl] = useState('');

  // 5. Product UMKM CRUD Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<MarketProduct | null>(null);
  const [prdName, setPrdName] = useState('');
  const [prdCategory, setPrdCategory] = useState('Hasil Bumi');
  const [prdPrice, setPrdPrice] = useState('50000');
  const [prdUnit, setPrdUnit] = useState('Kemasan 1 Kg');
  const [prdProducer, setPrdProducer] = useState(`BUMDes ${siteConfig.villageName}`);
  const [prdWa, setPrdWa] = useState(siteConfig.officialWhatsApp);
  const [prdStock, setPrdStock] = useState('50');
  const [prdDesc, setPrdDesc] = useState('');
  const [prdBadge, setPrdBadge] = useState('Produk Unggulan');
  const [prdImageUrl, setPrdImageUrl] = useState('');

  // 6. Potential CRUD Modal State
  const [isPotentialModalOpen, setIsPotentialModalOpen] = useState(false);
  const [editingPotential, setEditingPotential] = useState<VillagePotential | null>(null);
  const [potTitle, setPotTitle] = useState('');
  const [potCategory, setPotCategory] = useState('Pertanian & Perkebunan');
  const [potDesc, setPotDesc] = useState('');
  const [potEconomicVal, setPotEconomicVal] = useState('');
  const [potLocation, setPotLocation] = useState(defaultHamletName);
  const [potManager, setPotManager] = useState(`BUMDes ${siteConfig.villageName}`);
  const [potImageUrl, setPotImageUrl] = useState('');

  // 7. Official (SOTK) CRUD Modal State
  const [isOfficialModalOpen, setIsOfficialModalOpen] = useState(false);
  const [editingOfficial, setEditingOfficial] = useState<VillageOfficial | null>(null);
  const [offName, setOffName] = useState('');
  const [offPosition, setOffPosition] = useState('');
  const [offNip, setOffNip] = useState('');
  const [offPhone, setOffPhone] = useState('0812-8888-9900');
  const [offEmail, setOffEmail] = useState(siteConfig.officeEmail);
  const [offMotto, setOffMotto] = useState('Siap Melayani Masyarakat dengan Sepenuh Hati.');
  const [offPhotoUrl, setOffPhotoUrl] = useState('');

  // 8. Institution (LKD) CRUD Modal State
  const [isInstModalOpen, setIsInstModalOpen] = useState(false);
  const [editingInst, setEditingInst] = useState<VillageInstitution | null>(null);
  const [instName, setInstName] = useState('');
  const [instAbbr, setInstAbbr] = useState('');
  const [instLeader, setInstLeader] = useState('');
  const [instPhone, setInstPhone] = useState('0812-8800-1122');
  const [instMembers, setInstMembers] = useState('15');
  const [instSk, setInstSk] = useState(`SK Kades No. 141/10/${new Date().getFullYear()}`);
  const [instDesc, setInstDesc] = useState('');
  const [instLogoUrl, setInstLogoUrl] = useState('');

  // 9. Hamlet (Wilayah Dusun) CRUD Modal State
  const [isHamletModalOpen, setIsHamletModalOpen] = useState(false);
  const [editingHamlet, setEditingHamlet] = useState<VillageHamlet | null>(null);
  const [hmName, setHmName] = useState('');
  const [hmHeadName, setHmHeadName] = useState('');
  const [hmHeadPhone, setHmHeadPhone] = useState('0812-9000-1111');
  const [hmRtCount, setHmRtCount] = useState('5');
  const [hmRwCount, setHmRwCount] = useState('2');
  const [hmPopCount, setHmPopCount] = useState('90');
  const [hmFamCount, setHmFamCount] = useState('30');
  const [hmAreaHa, setHmAreaHa] = useState('120 Ha');
  const [hmDesc, setHmDesc] = useState('');
  const [hmImageUrl, setHmImageUrl] = useState('');

  // 10. Regulation (PPID) CRUD Modal State
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [editingReg, setEditingReg] = useState<VillageRegulation | null>(null);
  const [regTitle, setRegTitle] = useState('');
  const [regNumber, setRegNumber] = useState(`Perdes No. 02 Tahun ${new Date().getFullYear()}`);
  const [regCategory, setRegCategory] = useState('Peraturan Desa (Perdes)');
  const [regSummary, setRegSummary] = useState('');
  const [regFileSize, setRegFileSize] = useState('1.4 MB (PDF)');

  // 11. Letter Type CRUD Modal State
  const [isLetterTypeModalOpen, setIsLetterTypeModalOpen] = useState(false);
  const [editingLetterType, setEditingLetterType] = useState<LetterTypeInfo | null>(null);
  const [ltCode, setLtCode] = useState<LetterTypeCode>('SKU');
  const [ltName, setLtName] = useState('');
  const [ltShortDesc, setLtShortDesc] = useState('');
  const [ltSlaHours, setLtSlaHours] = useState('2');
  const [ltReqsText, setLtReqsText] = useState('Scan / Foto KTP Asli, Scan Kartu Keluarga (KK)');

  // 12. Map Facility CRUD Modal State
  const [isFacilityModalOpen, setIsFacilityModalOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState<MapFacility | null>(null);
  const [facName, setFacName] = useState('');
  const [facCategory, setFacCategory] = useState('Pemerintahan');
  const [facDesc, setFacDesc] = useState('');
  const [facAddress, setFacAddress] = useState('');
  const [facHours, setFacHours] = useState('08:00 - 16:00 WIB');
  const [facPhone, setFacPhone] = useState(siteConfig.officePhone);
  const [facLat, setFacLat] = useState('-6.6542');
  const [facLng, setFacLng] = useState('106.9035');
  const [facX, setFacX] = useState('50');
  const [facY, setFacY] = useState('45');
  const [facImageUrl, setFacImageUrl] = useState('');

  // 13. Admin User CRUD Modal State
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [editingAdminUser, setEditingAdminUser] = useState<AdminUser | null>(null);
  const [admUsername, setAdmUsername] = useState('');
  const [admPassword, setAdmPassword] = useState('');
  const [admFullName, setAdmFullName] = useState('');
  const [admRole, setAdmRole] = useState('Perangkat Desa / Operator SID');
  const [admNip, setAdmNip] = useState('');

  // Aspiration Response State
  const [respondingAspId, setRespondingAspId] = useState<string | null>(null);
  const [aspResponseText, setAspResponseText] = useState('');
  const [aspStatusSelect, setAspStatusSelect] = useState<CitizenAspiration['status']>('Ditindaklanjuti');

  const totalRevenueRealized = apbdes
    .filter((a) => a.category === 'Pendapatan')
    .reduce((sum, a) => sum + a.realisasi, 0);
  const totalExpenseRealized = apbdes
    .filter((a) => a.category === 'Belanja')
    .reduce((sum, a) => sum + a.realisasi, 0);
  const totalExpenseBudget = apbdes
    .filter((a) => a.category === 'Belanja')
    .reduce((sum, a) => sum + a.anggaran, 0);
  const absorptionPercentage =
    totalExpenseBudget > 0 ? Math.round((totalExpenseRealized / totalExpenseBudget) * 100) : 0;

  const formatRupiah = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  const handleSaveSiteConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSiteConfig(draftConfig);
    onShowToast(
      'Pengaturan & Identitas Desa Tersimpan!',
      'Perubahan Logo Desa, Hero Banner, Running Text, dan Profil langsung aktif di seluruh halaman publik.'
    );
  };

  // Save APBDes Item
  const handleSaveApbItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apbSubCategory.trim()) return;
    if (editingApb) {
      const updated = apbdes.map((item) =>
        item.id === editingApb.id
          ? {
              ...item,
              category: apbCategory,
              subCategory: apbSubCategory.trim(),
              anggaran: Number(apbAnggaran) || 0,
              realisasi: Number(apbRealisasi) || 0,
              description: apbDesc.trim(),
            }
          : item
      );
      onUpdateApbdes(updated);
      onShowToast('Pos APBDes Diperbarui', `Data anggaran "${apbSubCategory}" berhasil disimpan ke database.`);
    } else {
      const newItem: ApbdesItem = {
        id: `apb-${Date.now()}`,
        category: apbCategory,
        subCategory: apbSubCategory.trim(),
        anggaran: Number(apbAnggaran) || 0,
        realisasi: Number(apbRealisasi) || 0,
        year: new Date().getFullYear(),
        description: apbDesc.trim() || 'Alokasi anggaran desa tahun berjalan.',
      };
      onUpdateApbdes([...apbdes, newItem]);
      onShowToast('Pos APBDes Ditambahkan', `Rincian "${newItem.subCategory}" telah disimpan ke database.`);
    }
    setIsApbModalOpen(false);
    setEditingApb(null);
  };

  // Save Project (E-Pembangunan)
  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prjTitle.trim()) return;
    const payload: VillageProject = {
      id: editingProject ? editingProject.id : `prj-${Date.now()}`,
      title: prjTitle.trim(),
      location: prjLocation.trim(),
      dusun: prjLocation.trim(),
      budget: Number(prjBudget) || 0,
      realized: Number(prjRealized) || 0,
      sourceFund: prjSource,
      fundingSource: prjSource,
      fiscalYear: new Date().getFullYear(),
      progressPercent: Math.min(100, Math.max(0, Number(prjProgress) || 0)),
      status: prjStatus,
      executor: prjExecutor.trim() || `TPK ${siteConfig.villageName}`,
      description: prjDesc.trim(),
      imageUrl: prjImageUrl || createLocalFallbackSvg(prjTitle.trim()),
      updatedAt: formatDateId(new Date().toISOString().split('T')[0]),
    };

    if (editingProject) {
      onUpdateProjects(projects.map((p) => (p.id === editingProject.id ? payload : p)));
      onShowToast('Proyek Fisik Diperbarui', `Data proyek "${payload.title}" berhasil diperbarui di database.`);
    } else {
      onUpdateProjects([payload, ...projects]);
      onShowToast('Proyek Fisik Ditambahkan', `Proyek "${payload.title}" kini tampil di Beranda & Profil Desa.`);
    }
    setIsProjectModalOpen(false);
    setEditingProject(null);
  };

  // Save News
  const handleSaveNews = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsTitle.trim()) return;
    const todayFormatted = formatDateId(new Date().toISOString().split('T')[0]);
    if (editingNews) {
      const updated = news.map((n) =>
        n.id === editingNews.id
          ? {
              ...n,
              title: newsTitle.trim(),
              category: newsCategory,
              author: newsAuthor.trim(),
              excerpt: newsSummary.trim(),
              summary: newsSummary.trim(),
              content: newsContent.trim() || newsSummary.trim(),
              imageUrl: newsImageUrl.trim() || n.imageUrl,
            }
          : n
      );
      onUpdateNews(updated);
      onShowToast('Berita Diperbarui', `Artikel "${newsTitle}" berhasil diperbarui di database.`);
    } else {
      const newArticle: VillageNews = {
        id: `news-${Date.now()}`,
        title: newsTitle.trim(),
        category: newsCategory,
        date: todayFormatted,
        author: newsAuthor.trim() || 'Admin Desa',
        excerpt: newsSummary.trim(),
        summary: newsSummary.trim(),
        content: newsContent.trim() || newsSummary.trim(),
        imageUrl: newsImageUrl.trim() || createLocalFallbackSvg(newsTitle.trim()),
        readTime: '3 Menit',
      };
      onUpdateNews([newArticle, ...news]);
      onShowToast('Berita Baru Terbit!', `Artikel "${newArticle.title}" telah disimpan ke database.`);
    }
    setIsNewsModalOpen(false);
    setEditingNews(null);
  };

  // Save Gallery (Create + Edit)
  const handleSaveGallery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!galTitle.trim()) return;
    if (editingGallery) {
      const updated = gallery.map((g) =>
        g.id === editingGallery.id
          ? {
              ...g,
              title: galTitle.trim(),
              category: galCategory,
              location: galLocation.trim(),
              description: galDesc.trim(),
              imageUrl: galImageUrl || g.imageUrl,
            }
          : g
      );
      onUpdateGallery(updated);
      onShowToast('Foto Galeri Diperbarui', `Dokumentasi "${galTitle}" berhasil diperbarui di database.`);
    } else {
      const newGal: GalleryItem = {
        id: `gal-${Date.now()}`,
        title: galTitle.trim(),
        category: galCategory,
        date: formatDateId(new Date().toISOString().split('T')[0]),
        location: galLocation.trim() || siteConfig.villageName,
        description: galDesc.trim() || 'Dokumentasi kegiatan warga dan pembangunan desa.',
        imageUrl: galImageUrl || createLocalFallbackSvg(galTitle.trim()),
        participantsCount: 50,
      };
      onUpdateGallery([newGal, ...gallery]);
      onShowToast('Foto Galeri Ditambahkan', `Dokumentasi "${newGal.title}" berhasil disimpan ke database.`);
    }
    setIsGalleryModalOpen(false);
    setEditingGallery(null);
  };

  // Save Product UMKM (Create + Edit)
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prdName.trim()) return;
    if (editingProduct) {
      const updated = products.map((p) =>
        p.id === editingProduct.id
          ? {
              ...p,
              name: prdName.trim(),
              category: prdCategory,
              price: Number(prdPrice) || 25000,
              unit: prdUnit.trim(),
              sellerName: prdProducer.trim(),
              producerName: prdProducer.trim(),
              whatsapp: prdWa.trim(),
              stock: Number(prdStock) || 20,
              description: prdDesc.trim(),
              badge: prdBadge.trim() || undefined,
              imageUrl: prdImageUrl || p.imageUrl,
            }
          : p
      );
      onUpdateProducts(updated);
      onShowToast('Produk UMKM Diperbarui', `Produk "${prdName}" berhasil diperbarui di database.`);
    } else {
      const newPrd: MarketProduct = {
        id: `prd-${Date.now()}`,
        name: prdName.trim(),
        category: prdCategory,
        price: Number(prdPrice) || 25000,
        unit: prdUnit.trim() || 'Pcs',
        sellerName: prdProducer.trim() || 'UMKM Desa',
        producerName: prdProducer.trim() || 'UMKM Desa',
        dusun: defaultHamletName,
        whatsapp: prdWa.trim() || siteConfig.officialWhatsApp,
        imageUrl: prdImageUrl || createLocalFallbackSvg(prdName.trim()),
        rating: 5.0,
        soldCount: 12,
        stock: Number(prdStock) || 50,
        description: prdDesc.trim() || 'Produk unggulan warga desa berkualitas tinggi.',
        isOrganicOrLocal: true,
        badge: prdBadge.trim() || undefined,
      };
      onUpdateProducts([newPrd, ...products]);
      onShowToast('Produk UMKM Ditambahkan', `Produk "${newPrd.name}" kini tampil di Lapak Desa.`);
    }
    setIsProductModalOpen(false);
    setEditingProduct(null);
  };

  // Save Potential (Create + Edit)
  const handleSavePotential = (e: React.FormEvent) => {
    e.preventDefault();
    if (!potTitle.trim()) return;
    const payload: VillagePotential = {
      id: editingPotential ? editingPotential.id : `pot-${Date.now()}`,
      title: potTitle.trim(),
      category: potCategory,
      description: potDesc.trim(),
      economicValue: potEconomicVal.trim() || 'Potensi Unggulan Desa',
      highlightStat: potEconomicVal.trim() || 'Potensi Unggulan Desa',
      location: potLocation.trim() || siteConfig.villageName,
      manager: potManager.trim() || 'BUMDes',
      imageUrl: potImageUrl || createLocalFallbackSvg(potTitle.trim()),
    };
    if (editingPotential) {
      onUpdatePotentials(potentials.map((p) => (p.id === editingPotential.id ? payload : p)));
      onShowToast('Potensi Desa Diperbarui', `Potensi "${payload.title}" berhasil diperbarui di database.`);
    } else {
      onUpdatePotentials([...potentials, payload]);
      onShowToast('Potensi Desa Ditambahkan', `Potensi "${payload.title}" ditambahkan ke halaman Profil Desa.`);
    }
    setIsPotentialModalOpen(false);
    setEditingPotential(null);
  };

  // Save Official SOTK (Create + Edit)
  const handleSaveOfficial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!offName.trim() || !offPosition.trim()) return;
    if (editingOfficial) {
      const updated = officials.map((o) =>
        o.id === editingOfficial.id
          ? {
              ...o,
              name: offName.trim(),
              role: offPosition.trim(),
              position: offPosition.trim(),
              nip: offNip.trim() || o.nip,
              phone: offPhone.trim(),
              email: offEmail.trim(),
              motto: offMotto.trim(),
              photoUrl: offPhotoUrl || o.photoUrl,
            }
          : o
      );
      onUpdateOfficials(updated);
      onShowToast('Perangkat Desa Diperbarui', `Data "${offName}" berhasil diperbarui di database.`);
    } else {
      const newOff: VillageOfficial = {
        id: `off-${Date.now()}`,
        name: offName.trim(),
        role: offPosition.trim(),
        position: offPosition.trim(),
        nip: offNip.trim() || 'NIAP. -',
        education: 'S1',
        dusunArea: siteConfig.villageName,
        phone: offPhone.trim(),
        email: offEmail.trim(),
        photoUrl: offPhotoUrl || createLocalFallbackSvg(offName.trim()),
        tenurePeriod: 'Aktif',
        motto: offMotto.trim(),
      };
      onUpdateOfficials([...officials, newOff]);
      onShowToast('Perangkat Desa Ditambahkan', `${newOff.name} (${newOff.role}) ditambahkan ke Struktur SOTK.`);
    }
    setIsOfficialModalOpen(false);
    setEditingOfficial(null);
  };

  // Save Institution LKD (Create + Edit)
  const handleSaveInstitution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!instName.trim()) return;
    const payload: VillageInstitution = {
      id: editingInst ? editingInst.id : `inst-${Date.now()}`,
      name: instName.trim(),
      abbreviation: instAbbr.trim() || 'LKD',
      leaderName: instLeader.trim(),
      phone: instPhone.trim(),
      contactPhone: instPhone.trim(),
      memberCount: Number(instMembers) || 10,
      skNumber: instSk.trim(),
      description: instDesc.trim(),
      roleDescription: instDesc.trim(),
      logoUrl: instLogoUrl || draftConfig.logoUrl,
      keyPrograms: editingInst?.keyPrograms || ['Musyawarah & Pelayanan Warga', 'Pemberdayaan Masyarakat'],
    };
    if (editingInst) {
      onUpdateInstitutions(institutions.map((i) => (i.id === editingInst.id ? payload : i)));
      onShowToast('Lembaga Desa Diperbarui', `Data "${payload.name}" berhasil diperbarui di database.`);
    } else {
      onUpdateInstitutions([...institutions, payload]);
      onShowToast('Lembaga Desa Ditambahkan', `Lembaga "${payload.name}" ditambahkan ke Profil Desa.`);
    }
    setIsInstModalOpen(false);
    setEditingInst(null);
  };

  // Save Hamlet Dusun (Create + Edit)
  const handleSaveHamlet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hmName.trim()) return;
    const payload: VillageHamlet = {
      id: editingHamlet ? editingHamlet.id : `dusun-${Date.now()}`,
      name: hmName.trim(),
      headName: hmHeadName.trim(),
      headPhone: hmHeadPhone.trim(),
      phone: hmHeadPhone.trim(),
      rtCount: Number(hmRtCount) || 4,
      rwCount: Number(hmRwCount) || 2,
      populationCount: Number(hmPopCount) || 80,
      familyCount: Number(hmFamCount) || 25,
      areaHa: hmAreaHa.trim() || '100 Ha',
      description: hmDesc.trim(),
      imageUrl: hmImageUrl || createLocalFallbackSvg(hmName.trim()),
    };
    if (editingHamlet) {
      onUpdateHamlets(hamlets.map((h) => (h.id === editingHamlet.id ? payload : h)));
      onShowToast('Wilayah Dusun Diperbarui', `Data "${payload.name}" berhasil diperbarui di database.`);
    } else {
      onUpdateHamlets([...hamlets, payload]);
      onShowToast('Wilayah Dusun Ditambahkan', `Wilayah "${payload.name}" ditambahkan ke database.`);
    }
    setIsHamletModalOpen(false);
    setEditingHamlet(null);
  };

  // Save Regulation (Create + Edit)
  const handleSaveRegulation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regTitle.trim()) return;
    if (editingReg) {
      const updated = regulations.map((r) =>
        r.id === editingReg.id
          ? {
              ...r,
              title: regTitle.trim(),
              number: regNumber.trim(),
              category: regCategory,
              summary: regSummary.trim(),
              fileSize: regFileSize.trim() || '1.2 MB (PDF)',
            }
          : r
      );
      onUpdateRegulations(updated);
      onShowToast('Produk Hukum Diperbarui', `${regNumber} berhasil diperbarui di database.`);
    } else {
      const newReg: VillageRegulation = {
        id: `reg-${Date.now()}`,
        title: regTitle.trim(),
        number: regNumber.trim(),
        year: new Date().getFullYear(),
        category: regCategory,
        summary: regSummary.trim(),
        dateIssued: formatDateId(new Date().toISOString().split('T')[0]),
        downloadCount: 1,
        fileSize: regFileSize.trim() || '1.2 MB (PDF)',
      };
      onUpdateRegulations([newReg, ...regulations]);
      onShowToast('Produk Hukum Dipublikasikan', `${newReg.number} berhasil ditambahkan ke Direktori Hukum & PPID.`);
    }
    setIsRegModalOpen(false);
    setEditingReg(null);
  };

  // Save Letter Type (Create + Edit)
  const handleSaveLetterType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ltName.trim()) return;
    const reqs = ltReqsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const payload: LetterTypeInfo = {
      code: ltCode,
      name: ltName.trim(),
      shortDesc: ltShortDesc.trim(),
      estimatedHours: Number(ltSlaHours) || 2,
      requirements: reqs.length > 0 ? reqs : ['Scan KTP', 'Scan Kartu Keluarga'],
    };
    if (editingLetterType) {
      onUpdateLetterTypes(
        letterTypes.map((l) => (l.code === editingLetterType.code ? payload : l))
      );
      onShowToast('Layanan Surat Diperbarui', `Layanan "${payload.name}" berhasil diperbarui di database.`);
    } else {
      onUpdateLetterTypes([...letterTypes, payload]);
      onShowToast('Layanan Surat Ditambahkan', `Layanan "${payload.name}" berhasil ditambahkan.`);
    }
    setIsLetterTypeModalOpen(false);
    setEditingLetterType(null);
  };

  // Save Map Facility (Create + Edit)
  const handleSaveFacility = (e: React.FormEvent) => {
    e.preventDefault();
    if (!facName.trim()) return;
    const latNum = parseFloat(facLat) || -6.6542;
    const lngNum = parseFloat(facLng) || 106.9035;
    const payload: MapFacility = {
      id: editingFacility ? editingFacility.id : `fac-${Date.now()}`,
      name: facName.trim(),
      category: facCategory,
      dusun: editingFacility?.dusun || defaultHamletName,
      description: facDesc.trim(),
      address: facAddress.trim(),
      coordinates: `${latNum}, ${lngNum}`,
      operatingHours: facHours.trim(),
      contactPerson: editingFacility?.contactPerson || 'Pengelola Fasilitas Desa',
      phone: facPhone.trim() || siteConfig.officePhone,
      lat: latNum,
      lng: lngNum,
      xPercent: Math.min(92, Math.max(8, Number(facX) || 50)),
      yPercent: Math.min(92, Math.max(8, Number(facY) || 50)),
      imageUrl: facImageUrl || undefined,
    };
    if (editingFacility) {
      onUpdateFacilities(facilities.map((f) => (f.id === editingFacility.id ? payload : f)));
      onShowToast('Titik Peta Diperbarui', `Lokasi "${payload.name}" berhasil diperbarui di Peta Desa.`);
    } else {
      onUpdateFacilities([...facilities, payload]);
      onShowToast('Titik Peta Ditambahkan', `Lokasi "${payload.name}" ditambahkan ke Peta Geospasial.`);
    }
    setIsFacilityModalOpen(false);
    setEditingFacility(null);
  };

  // Save Admin User (Create + Edit - Scrypt hashed on server)
  const handleSaveAdminUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!admUsername.trim() || !admFullName.trim() || !onUpdateAdminUsers) return;
    const trimmedPwd = admPassword.trim();
    const payload: AdminUser = {
      username: admUsername.trim().toLowerCase(),
      ...(trimmedPwd ? { password: trimmedPwd } : {}),
      passwordHash: editingAdminUser?.passwordHash,
      fullName: admFullName.trim(),
      role: admRole.trim(),
      nip: admNip.trim() || siteConfig.defaults?.nip || '-',
    };
    if (editingAdminUser) {
      onUpdateAdminUsers(
        adminUsers.map((u) => (u.username === editingAdminUser.username ? payload : u))
      );
      onShowToast(
        'Akun Perangkat Diperbarui',
        `Akun "${payload.fullName}" berhasil diperbarui (kata sandi di-hash scrypt di server).`
      );
    } else {
      onUpdateAdminUsers([...adminUsers, { ...payload, password: trimmedPwd || '' }]);
      onShowToast(
        'Akun Perangkat Ditambahkan',
        `Akun login "${payload.username}" telah aktif dengan proteksi scrypt.`
      );
    }
    setIsAdminModalOpen(false);
    setEditingAdminUser(null);
    setAdmPassword('');
  };

  // Save Aspiration Response
  const handleSaveAspirationResponse = (aspId: string) => {
    const updated = aspirations.map((a) =>
      a.id === aspId
        ? {
            ...a,
            status: aspStatusSelect,
            responseNote: aspResponseText.trim() || a.responseNote,
            adminResponse: aspResponseText.trim() || a.adminResponse,
          }
        : a
    );
    onUpdateAspirations(updated);
    setRespondingAspId(null);
    setAspResponseText('');
    onShowToast('Tanggapan Dipublikasikan', 'Balasan resmi Pemerintah Desa kini tampil di halaman Kontak & Aspirasi.');
  };

  return (
    <div className="space-y-6">
      {/* Top CMS Banner */}
      <div className="bg-emerald-50 dark:bg-slate-800/90 p-6 rounded-3xl border border-emerald-200 dark:border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-emerald-600" />
            <h3 className="font-extrabold text-base sm:text-lg text-gray-900 dark:text-white">
              Pusat Kendali Website & Database Penuh (Full CRUD + Upload Foto/Logo ke Database)
            </h3>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Seluruh perubahan Logo Desa, Gambar Hero, Sambutan Kades, APBDes, E-Pembangunan, Berita, Galeri, UMKM, Potensi, SOTK, LKD, Wilayah Dusun, Produk Hukum, dan Peta otomatis tersimpan di Database Server (`/api/db`).
          </p>
        </div>

        <button
          onClick={() => setConfirmResetOpen(true)}
          className="bg-white dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-700 dark:text-gray-200 hover:text-red-600 border border-gray-300 dark:border-slate-600 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Database ke Default</span>
        </button>
      </div>

      {/* CMS Section Sub-Navigation */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: 'identitas', label: '1. Logo Desa, Hero & Identitas', icon: Layout },
          { key: 'profil', label: '2. Kades, Visi Misi, Sejarah & IDM', icon: UserCheck },
          { key: 'apbdes_proyek', label: `3. APBDes (${apbdes.length}) & Proyek (${projects.length})`, icon: Wallet },
          { key: 'berita', label: `4. Berita Desa (${news.length})`, icon: Newspaper },
          { key: 'galeri_lapak_potensi', label: `5. Galeri (${gallery.length}), UMKM (${products.length}) & Potensi (${potentials.length})`, icon: Store },
          { key: 'sotk_lkd_dusun', label: `6. Pamong (${officials.length}), LKD (${institutions.length}) & Dusun (${hamlets.length})`, icon: Users },
          { key: 'hukum_surat_peta', label: `7. Hukum (${regulations.length}), Surat (${letterTypes.length}) & Peta (${facilities.length})`, icon: Scale },
          { key: 'aspirasi', label: `8. Aspirasi Warga (${aspirations.length})`, icon: MessageSquare },
          { key: 'admin_media', label: `9. Akun Admin (${adminUsers.length}) & Media DB (${mediaAssets.length})`, icon: KeyRound },
        ].map((tab) => {
          const IconComponent = tab.icon;
          const active = cmsSection === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setCmsSection(tab.key as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer whitespace-nowrap ${
                active
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-700 hover:border-emerald-400'
              }`}
            >
              <IconComponent className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          SECTION 1: LOGO DESA, IDENTITAS RESMI, HERO BANNER & RUNNING TEXT
          ===================================================================== */}
      {cmsSection === 'identitas' && (
        <form
          onSubmit={handleSaveSiteConfig}
          className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-6 text-xs"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 dark:border-slate-700 pb-4 gap-3">
            <div>
              <h4 className="font-extrabold text-base text-gray-900 dark:text-white">
                Pengaturan Logo Resmi Desa, Hero Banner, Running Text & Identitas
              </h4>
              <p className="text-gray-500">
                Unggah file Logo Desa dari perangkat Anda — otomatis tersimpan di Database dan memperbarui Navbar, Footer, Kop Surat Resmi, & Login.
              </p>
            </div>
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center space-x-1.5 shadow cursor-pointer self-start sm:self-auto"
            >
              <Save className="w-4 h-4" />
              <span>Simpan ke Database</span>
            </button>
          </div>

          {/* LOGO DESA & HERO BACKGROUND UPLOAD TO DATABASE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-emerald-50/60 dark:bg-slate-900/60 p-5 rounded-2xl border border-emerald-200/80 dark:border-slate-700">
            <ImageUploadField
              label="Logo / Lambang Resmi Pemerintah Desa (Tampil di Navbar, Footer & Kop Surat)"
              value={draftConfig.logoUrl}
              onChange={(val) => setDraftConfig({ ...draftConfig, logoUrl: val })}
              category="logo"
              isLogo={true}
              presets={BUILTIN_LOGO_PRESETS}
              mediaAssets={mediaAssets}
              onUploadNewAsset={(asset) => onUpdateMediaAssets?.([asset, ...mediaAssets])}
              helperText="Pilih dari MediaGalleryPicker (`mediaAssets`) atau unggah PNG/SVG transparan"
            />

            <ImageUploadField
              label="Foto Latar Belakang Hero Beranda (Hero Image Banner)"
              value={draftConfig.heroImageUrl}
              onChange={(val) => setDraftConfig({ ...draftConfig, heroImageUrl: val })}
              category="hero"
              mediaAssets={mediaAssets}
              onUploadNewAsset={(asset) => onUpdateMediaAssets?.([asset, ...mediaAssets])}
              helperText="Pilih dari MediaGalleryPicker (`mediaAssets`) atau unggah foto panorama desa"
            />
          </div>

          {/* RUNNING TEXT PENGUMUMAN */}
          <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-slate-900/50 border border-amber-200 dark:border-slate-700 space-y-2">
            <label className="block font-bold text-gray-800 dark:text-gray-200">
              Teks Pengumuman Berjalan (Running Text Marquee di Atas Website)
            </label>
            <input
              type="text"
              value={draftConfig.runningText}
              onChange={(e) => setDraftConfig({ ...draftConfig, runningText: e.target.value })}
              placeholder="Ketik pengumuman penting yang berjalan di bagian paling atas halaman..."
              className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium"
            />
          </div>

          {/* IDENTITAS WILAYAH */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Nama Desa</label>
              <input
                type="text"
                value={draftConfig.villageName}
                onChange={(e) => setDraftConfig({ ...draftConfig, villageName: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Kecamatan</label>
              <input
                type="text"
                value={draftConfig.subDistrict}
                onChange={(e) => setDraftConfig({ ...draftConfig, subDistrict: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Kabupaten / Kota</label>
              <input
                type="text"
                value={draftConfig.district}
                onChange={(e) => setDraftConfig({ ...draftConfig, district: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Provinsi</label>
              <input
                type="text"
                value={draftConfig.province}
                onChange={(e) => setDraftConfig({ ...draftConfig, province: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Kode Kemendagri Desa</label>
              <input
                type="text"
                value={draftConfig.villageCode}
                onChange={(e) => setDraftConfig({ ...draftConfig, villageCode: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Kode Pos</label>
              <input
                type="text"
                value={draftConfig.postalCode}
                onChange={(e) => setDraftConfig({ ...draftConfig, postalCode: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Inisial / Simbol Logo</label>
              <input
                type="text"
                maxLength={3}
                value={draftConfig.logoSymbolText}
                onChange={(e) => setDraftConfig({ ...draftConfig, logoSymbolText: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Tagline Singkat Desa</label>
              <input
                type="text"
                value={draftConfig.tagline}
                onChange={(e) => setDraftConfig({ ...draftConfig, tagline: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
          </div>

          {/* CMS THEME BUILDER: SKEMA WARNA, FONT, & TATA LETAK HERO BANNER */}
          <div className="p-5 rounded-2xl bg-emerald-50/70 dark:bg-slate-900/70 border border-emerald-200 dark:border-slate-700 space-y-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">
                CMS Theme Builder Dinamis (Tanpa Menyentuh Kode)
              </span>
              <h5 className="font-extrabold text-sm text-gray-900 dark:text-white">
                Kustomisasi Skema Warna Utama, Tipografi Font & Tata Letak Banner Beranda
              </h5>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Skema Warna Utama Website (`primaryThemeColor`)
                </label>
                <select
                  value={draftConfig.primaryThemeColor}
                  onChange={(e) =>
                    setDraftConfig({
                      ...draftConfig,
                      primaryThemeColor: e.target.value as VillageSiteConfig['primaryThemeColor'],
                    })
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                >
                  <option value="emerald">Hijau Zamrud (Emerald Smart Village)</option>
                  <option value="teal">Hijau Toska (Teal Modern)</option>
                  <option value="green">Hijau Daun (Agro Nusantara)</option>
                  <option value="blue">Biru Pemerintahan (Gov Official Blue)</option>
                  <option value="maroon">Merah Marun Budaya (Heritage Maroon)</option>
                  <option value="gold">Emas Nusantara (Royal Gold)</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Gaya Huruf / Font Website (`fontFamily`)
                </label>
                <select
                  value={draftConfig.fontFamily || 'plus-jakarta'}
                  onChange={(e) =>
                    setDraftConfig({
                      ...draftConfig,
                      fontFamily: e.target.value as VillageSiteConfig['fontFamily'],
                    })
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                >
                  <option value="plus-jakarta">Plus Jakarta Sans (Standar Modern)</option>
                  <option value="outfit">Outfit Geometric (Tegas & Kontemporer)</option>
                  <option value="manrope">Manrope Clean (Bersih & Mudah Dibaca)</option>
                  <option value="public-sans">Public Sans (Portal Pemerintahan)</option>
                  <option value="serif-editorial">Editorial Serif (Klasik & Resmi)</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Tata Letak Hero Banner (`heroBannerLayout`)
                </label>
                <select
                  value={draftConfig.heroBannerLayout || 'split'}
                  onChange={(e) =>
                    setDraftConfig({
                      ...draftConfig,
                      heroBannerLayout: e.target.value as VillageSiteConfig['heroBannerLayout'],
                    })
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                >
                  <option value="split">Split 2 Kolom + Kartu Indikator</option>
                  <option value="centered">Centered Fokus Pencarian & Layanan</option>
                  <option value="editorial">Editorial Portal Pemerintahan</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Kode Warna Aksen (Hex)
                </label>
                <input
                  type="text"
                  value={draftConfig.accentColor}
                  onChange={(e) => setDraftConfig({ ...draftConfig, accentColor: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-slate-700">
            <h5 className="font-bold text-sm text-emerald-700 dark:text-emerald-400">Teks Hero Banner Halaman Utama (Beranda)</h5>
            <div>
              <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Teks Lencana Atas (Hero Badge)</label>
              <input
                type="text"
                value={draftConfig.heroBadge}
                onChange={(e) => setDraftConfig({ ...draftConfig, heroBadge: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Judul Utama Hero (Headline Website)</label>
              <input
                type="text"
                value={draftConfig.heroTitle}
                onChange={(e) => setDraftConfig({ ...draftConfig, heroTitle: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-sm"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Subjudul / Deskripsi Hero</label>
              <textarea
                rows={2}
                value={draftConfig.heroSubtitle}
                onChange={(e) => setDraftConfig({ ...draftConfig, heroSubtitle: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
          </div>

          {/* KONTAK RESMI, MEDIA SOSIAL & KONTAK DARURAT 24 JAM */}
          <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-slate-700">
            <h5 className="font-bold text-sm text-emerald-700 dark:text-emerald-400">Kontak Resmi, Media Sosial, Jam Pelayanan & Nomor Darurat</h5>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Nomor WhatsApp Layanan Desa</label>
                <input
                  type="text"
                  value={draftConfig.officialWhatsApp}
                  onChange={(e) => setDraftConfig({ ...draftConfig, officialWhatsApp: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Telepon Kantor Desa</label>
                <input
                  type="text"
                  value={draftConfig.officePhone}
                  onChange={(e) => setDraftConfig({ ...draftConfig, officePhone: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Email Resmi Desa</label>
                <input
                  type="email"
                  value={draftConfig.officeEmail}
                  onChange={(e) => setDraftConfig({ ...draftConfig, officeEmail: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Alamat Lengkap Kantor Balai Desa</label>
                <input
                  type="text"
                  value={draftConfig.officeAddress}
                  onChange={(e) => setDraftConfig({ ...draftConfig, officeAddress: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Jam Operasional Hari Kerja</label>
                <input
                  type="text"
                  value={draftConfig.serviceHoursWeekdays}
                  onChange={(e) => setDraftConfig({ ...draftConfig, serviceHoursWeekdays: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Jam Operasional Akhir Pekan</label>
                <input
                  type="text"
                  value={draftConfig.serviceHoursWeekend}
                  onChange={(e) => setDraftConfig({ ...draftConfig, serviceHoursWeekend: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
            </div>

            {/* Social Media & Live Chat Channels (Telegram, Facebook, YouTube, Instagram, TikTok) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Telegram Channel / Grup</label>
                <input
                  type="text"
                  value={draftConfig.socialMedia.telegram || ''}
                  onChange={(e) =>
                    setDraftConfig({
                      ...draftConfig,
                      socialMedia: { ...draftConfig.socialMedia, telegram: e.target.value },
                    })
                  }
                  placeholder="t.me/pemdes_sukamaju"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Facebook Resmi Desa</label>
                <input
                  type="text"
                  value={draftConfig.socialMedia.facebook}
                  onChange={(e) =>
                    setDraftConfig({
                      ...draftConfig,
                      socialMedia: { ...draftConfig.socialMedia, facebook: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">YouTube TV Desa</label>
                <input
                  type="text"
                  value={draftConfig.socialMedia.youtube}
                  onChange={(e) =>
                    setDraftConfig({
                      ...draftConfig,
                      socialMedia: { ...draftConfig.socialMedia, youtube: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Instagram Desa</label>
                <input
                  type="text"
                  value={draftConfig.socialMedia.instagram}
                  onChange={(e) =>
                    setDraftConfig({
                      ...draftConfig,
                      socialMedia: { ...draftConfig.socialMedia, instagram: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">TikTok Desa</label>
                <input
                  type="text"
                  value={draftConfig.socialMedia.tiktok || ''}
                  onChange={(e) =>
                    setDraftConfig({
                      ...draftConfig,
                      socialMedia: { ...draftConfig.socialMedia, tiktok: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-sky-50/60 dark:bg-slate-900/70 border border-sky-200 dark:border-slate-700 space-y-3 mt-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h5 className="font-extrabold text-xs text-sky-900 dark:text-sky-300">
                    Konfigurasi Bot Telegram Resmi, Token Server & Integrasi Asisten AI (`gemini-3.8-flash`)
                  </h5>
                  <p className="text-[11px] text-gray-500">
                    Atur username bot, Chat ID default, mode Auto-Reply AI Telegram, serta instruksi persona AI. Token Bot (`TELEGRAM_BOT_TOKEN`) dikelola aman di environment server (`.env`).
                  </p>
                </div>
                <label className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-sky-300 dark:border-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draftConfig.telegramAiAutoReply !== false}
                    onChange={(e) =>
                      setDraftConfig({
                        ...draftConfig,
                        telegramAiAutoReply: e.target.checked,
                      })
                    }
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-bold text-xs text-emerald-700 dark:text-emerald-400">
                    Auto-Reply AI Telegram Aktif
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Username Bot Telegram API
                  </label>
                  <input
                    type="text"
                    value={draftConfig.telegramBotUsername || ''}
                    onChange={(e) =>
                      setDraftConfig({
                        ...draftConfig,
                        telegramBotUsername: e.target.value.replace(/^@/, ''),
                      })
                    }
                    placeholder="pemdes_sukamaju_bot"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Default / Admin Telegram Chat ID
                  </label>
                  <input
                    type="text"
                    value={draftConfig.telegramDefaultChatId || ''}
                    onChange={(e) =>
                      setDraftConfig({
                        ...draftConfig,
                        telegramDefaultChatId: e.target.value,
                      })
                    }
                    placeholder="619283745"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Pesan Sambutan Otomatis Live Chat Warga
                  </label>
                  <input
                    type="text"
                    value={draftConfig.liveChatGreeting || ''}
                    onChange={(e) =>
                      setDraftConfig({
                        ...draftConfig,
                        liveChatGreeting: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Instruksi Persona & Basis Pengetahuan Asisten AI Telegram (`telegramAiPersona`)
                </label>
                <input
                  type="text"
                  value={draftConfig.telegramAiPersona || ''}
                  onChange={(e) =>
                    setDraftConfig({
                      ...draftConfig,
                      telegramAiPersona: e.target.value,
                    })
                  }
                  placeholder="Ramah, solutif, menggunakan Bahasa Indonesia baku pemerintahan desa yang sopan..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
            </div>

            {/* Emergency Contacts (Aligned with Footer & VillageSiteConfig) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-3 rounded-2xl bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-700 space-y-2">
                <label className="block font-bold text-gray-700 dark:text-gray-300">Layanan Ambulans Desa</label>
                <input
                  type="text"
                  value={draftConfig.emergencyContacts.ambulanceName}
                  onChange={(e) =>
                    setDraftConfig({
                      ...draftConfig,
                      emergencyContacts: { ...draftConfig.emergencyContacts, ambulanceName: e.target.value },
                    })
                  }
                  placeholder="Nama Unit Ambulans"
                  className="w-full px-3 py-1.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
                <input
                  type="text"
                  value={draftConfig.emergencyContacts.ambulancePhone}
                  onChange={(e) =>
                    setDraftConfig({
                      ...draftConfig,
                      emergencyContacts: { ...draftConfig.emergencyContacts, ambulancePhone: e.target.value },
                    })
                  }
                  placeholder="Nomor Telepon Ambulans"
                  className="w-full px-3 py-1.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                />
              </div>

              <div className="p-3 rounded-2xl bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-700 space-y-2">
                <label className="block font-bold text-gray-700 dark:text-gray-300">Bidan / Poskesdes Siaga</label>
                <input
                  type="text"
                  value={draftConfig.emergencyContacts.midwifeName}
                  onChange={(e) =>
                    setDraftConfig({
                      ...draftConfig,
                      emergencyContacts: { ...draftConfig.emergencyContacts, midwifeName: e.target.value },
                    })
                  }
                  placeholder="Nama Bidan Desa"
                  className="w-full px-3 py-1.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
                <input
                  type="text"
                  value={draftConfig.emergencyContacts.midwifePhone}
                  onChange={(e) =>
                    setDraftConfig({
                      ...draftConfig,
                      emergencyContacts: { ...draftConfig.emergencyContacts, midwifePhone: e.target.value },
                    })
                  }
                  placeholder="Nomor Telepon Bidan"
                  className="w-full px-3 py-1.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                />
              </div>

              <div className="p-3 rounded-2xl bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-700 space-y-2">
                <label className="block font-bold text-gray-700 dark:text-gray-300">Posko Keamanan / Bhabinkamtibmas</label>
                <input
                  type="text"
                  value={draftConfig.emergencyContacts.securityName}
                  onChange={(e) =>
                    setDraftConfig({
                      ...draftConfig,
                      emergencyContacts: { ...draftConfig.emergencyContacts, securityName: e.target.value },
                    })
                  }
                  placeholder="Nama Posko Keamanan"
                  className="w-full px-3 py-1.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
                <input
                  type="text"
                  value={draftConfig.emergencyContacts.securityPhone}
                  onChange={(e) =>
                    setDraftConfig({
                      ...draftConfig,
                      emergencyContacts: { ...draftConfig.emergencyContacts, securityPhone: e.target.value },
                    })
                  }
                  placeholder="Nomor Telepon Posko"
                  className="w-full px-3 py-1.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                />
              </div>
            </div>

            {/* DYNAMIC CONFIGURATION: AI MODEL, CLASSIFICATION CODE, CATEGORIES, COLORS & DEFAULTS */}
            <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-slate-900/70 border border-emerald-200 dark:border-slate-700 space-y-4 mt-3">
              <div>
                <h5 className="font-extrabold text-xs text-emerald-900 dark:text-emerald-300">
                  Konfigurasi Dinamis Database: Model AI, Kode Klasifikasi, Kategori, Warna Peta & Nilai Default
                </h5>
                <p className="text-[11px] text-gray-500">
                  Seluruh kategori filter, warna fasilitas peta, model AI, dan nilai default formulir dikelola secara dinamis dari database (`siteConfig`).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Model AI Desa (`aiModel`)
                  </label>
                  <input
                    type="text"
                    value={draftConfig.aiModel || 'gemini-3.8-flash'}
                    onChange={(e) =>
                      setDraftConfig({ ...draftConfig, aiModel: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Kode Klasifikasi Default (`defaultClassificationCode`)
                  </label>
                  <input
                    type="text"
                    value={draftConfig.defaultClassificationCode || '470'}
                    onChange={(e) =>
                      setDraftConfig({ ...draftConfig, defaultClassificationCode: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Default Wilayah Dusun (`defaults.dusun`)
                  </label>
                  <input
                    type="text"
                    value={draftConfig.defaults?.dusun || 'Dusun 1 Sukasari'}
                    onChange={(e) =>
                      setDraftConfig({
                        ...draftConfig,
                        defaults: { ...(draftConfig.defaults as any), dusun: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Default Tempat Lahir (`defaults.birthPlace`)
                  </label>
                  <input
                    type="text"
                    value={draftConfig.defaults?.birthPlace || 'Bogor'}
                    onChange={(e) =>
                      setDraftConfig({
                        ...draftConfig,
                        defaults: { ...(draftConfig.defaults as any), birthPlace: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Kategori Galeri (`galleryCategories` - Pisahkan Koma)
                  </label>
                  <input
                    type="text"
                    value={(draftConfig.galleryCategories || []).join(', ')}
                    onChange={(e) =>
                      setDraftConfig({
                        ...draftConfig,
                        galleryCategories: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Kategori Lapak UMKM (`marketCategories` - Pisahkan Koma)
                  </label>
                  <input
                    type="text"
                    value={(draftConfig.marketCategories || []).join(', ')}
                    onChange={(e) =>
                      setDraftConfig({
                        ...draftConfig,
                        marketCategories: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Kategori Fasilitas Peta (`facilityCategories` - Pisahkan Koma)
                  </label>
                  <input
                    type="text"
                    value={(draftConfig.facilityCategories || []).join(', ')}
                    onChange={(e) =>
                      setDraftConfig({
                        ...draftConfig,
                        facilityCategories: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Default RT / RW
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      value={draftConfig.defaults?.rt || '001'}
                      onChange={(e) =>
                        setDraftConfig({
                          ...draftConfig,
                          defaults: { ...(draftConfig.defaults as any), rt: e.target.value },
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                    />
                    <input
                      type="text"
                      value={draftConfig.defaults?.rw || '001'}
                      onChange={(e) =>
                        setDraftConfig({
                          ...draftConfig,
                          defaults: { ...(draftConfig.defaults as any), rw: e.target.value },
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Default Label Penjual UMKM (`sellerLabel`)
                  </label>
                  <input
                    type="text"
                    value={draftConfig.defaults?.sellerLabel || 'Pelapak UMKM Desa'}
                    onChange={(e) =>
                      setDraftConfig({
                        ...draftConfig,
                        defaults: { ...(draftConfig.defaults as any), sellerLabel: e.target.value },
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Default Penulis Berita (`author`)
                  </label>
                  <input
                    type="text"
                    value={draftConfig.defaults?.author || 'Tim Humas Pemdes'}
                    onChange={(e) =>
                      setDraftConfig({
                        ...draftConfig,
                        defaults: { ...(draftConfig.defaults as any), author: e.target.value },
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Default Pengelola Potensi (`manager`)
                  </label>
                  <input
                    type="text"
                    value={draftConfig.defaults?.manager || 'BUMDes Sukamaju Mandiri'}
                    onChange={(e) =>
                      setDraftConfig({
                        ...draftConfig,
                        defaults: { ...(draftConfig.defaults as any), manager: e.target.value },
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* =====================================================================
          SECTION 2: KEPALA DESA (FOTO DATABASE), VISI MISI, SEJARAH, GEOGRAFIS & IDM
          ===================================================================== */}
      {cmsSection === 'profil' && (
        <form
          onSubmit={handleSaveSiteConfig}
          className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-6 text-xs"
        >
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700 pb-4">
            <div>
              <h4 className="font-extrabold text-base text-gray-900 dark:text-white">
                Profil & Foto Kepala Desa, Visi Misi, Sejarah, Batas Geografis & Skor IDM
              </h4>
              <p className="text-gray-500">Seluruh data profil dan foto Kepala Desa disimpan langsung ke dalam Database.</p>
            </div>
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center space-x-1.5 shadow cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Profil & IDM ke Database</span>
            </button>
          </div>

          {/* Foto Kades & Biodata */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5">
              <ImageUploadField
                label="Foto Resmi Kepala Desa (Tersimpan di Database)"
                value={draftConfig.headOfVillagePhotoUrl}
                onChange={(val) => setDraftConfig({ ...draftConfig, headOfVillagePhotoUrl: val })}
                category="kades"
                helperText="Unggah foto resmi Kepala Desa berseragam PDU/Batik"
              />
            </div>

            <div className="lg:col-span-7 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Nama Lengkap Kepala Desa</label>
                  <input
                    type="text"
                    value={draftConfig.headOfVillageName}
                    onChange={(e) => setDraftConfig({ ...draftConfig, headOfVillageName: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Jabatan Resmi</label>
                  <input
                    type="text"
                    value={draftConfig.headOfVillageTitle}
                    onChange={(e) => setDraftConfig({ ...draftConfig, headOfVillageTitle: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">NIP / NIAP Kepala Desa (Untuk Kop TTE Surat)</label>
                  <input
                    type="text"
                    value={draftConfig.headOfVillageNip}
                    onChange={(e) => setDraftConfig({ ...draftConfig, headOfVillageNip: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Pesan Sambutan Kepala Desa di Beranda & Profil</label>
                <textarea
                  rows={3}
                  value={draftConfig.headOfVillageWelcome}
                  onChange={(e) => setDraftConfig({ ...draftConfig, headOfVillageWelcome: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Visi & Misi */}
          <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-slate-700">
            <div>
              <label className="block font-bold text-sm text-emerald-700 dark:text-emerald-400 mb-1">Visi Utama Pemerintah Desa</label>
              <input
                type="text"
                value={draftConfig.visionText}
                onChange={(e) => setDraftConfig({ ...draftConfig, visionText: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
              />
            </div>

            <label className="block font-bold text-sm text-emerald-700 dark:text-emerald-400 pt-2">
              Daftar Misi Pembangunan Desa ({draftConfig.missions.length} Butir - Full CRUD)
            </label>
            <div className="space-y-2">
              {draftConfig.missions.map((m, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={m}
                    onChange={(e) => {
                      const updated = [...draftConfig.missions];
                      updated[idx] = e.target.value;
                      setDraftConfig({ ...draftConfig, missions: updated });
                    }}
                    className="flex-1 px-3 py-1.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setDraftConfig({
                        ...draftConfig,
                        missions: draftConfig.missions.filter((_, i) => i !== idx),
                      });
                    }}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                    title="Hapus Misi"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={newMissionText}
                onChange={(e) => setNewMissionText(e.target.value)}
                placeholder="Tambah butir misi baru..."
                className="flex-1 px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newMissionText.trim()) return;
                  setDraftConfig({
                    ...draftConfig,
                    missions: [...draftConfig.missions, newMissionText.trim()],
                  });
                  setNewMissionText('');
                }}
                className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 px-4 py-2 rounded-xl font-bold cursor-pointer"
              >
                + Tambah Misi
              </button>
            </div>
          </div>

          {/* Sejarah Desa */}
          <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-slate-700">
            <label className="block font-bold text-sm text-emerald-700 dark:text-emerald-400">
              Narasi Sejarah & Asal-Usul Desa
            </label>
            <textarea
              rows={4}
              value={draftConfig.historyText}
              onChange={(e) => setDraftConfig({ ...draftConfig, historyText: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 leading-relaxed"
            />
          </div>

          {/* Batas Wilayah & Geografis */}
          <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-slate-700">
            <h5 className="font-bold text-sm text-emerald-700 dark:text-emerald-400">
              Batas Wilayah, Kondisi Geografis & Struktur Wilayah (Dusun / RW / RT)
            </h5>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Batas Utara</label>
                <input
                  type="text"
                  value={draftConfig.boundaries.north}
                  onChange={(e) =>
                    setDraftConfig({ ...draftConfig, boundaries: { ...draftConfig.boundaries, north: e.target.value } })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Batas Selatan</label>
                <input
                  type="text"
                  value={draftConfig.boundaries.south}
                  onChange={(e) =>
                    setDraftConfig({ ...draftConfig, boundaries: { ...draftConfig.boundaries, south: e.target.value } })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Batas Timur</label>
                <input
                  type="text"
                  value={draftConfig.boundaries.east}
                  onChange={(e) =>
                    setDraftConfig({ ...draftConfig, boundaries: { ...draftConfig.boundaries, east: e.target.value } })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Batas Barat</label>
                <input
                  type="text"
                  value={draftConfig.boundaries.west}
                  onChange={(e) =>
                    setDraftConfig({ ...draftConfig, boundaries: { ...draftConfig.boundaries, west: e.target.value } })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Luas Wilayah</label>
                <input
                  type="text"
                  value={draftConfig.areaSizeKm2}
                  onChange={(e) => setDraftConfig({ ...draftConfig, areaSizeKm2: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Ketinggian (mdpl)</label>
                <input
                  type="text"
                  value={draftConfig.altitudeMdpl}
                  onChange={(e) => setDraftConfig({ ...draftConfig, altitudeMdpl: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Topografi</label>
                <input
                  type="text"
                  value={draftConfig.topographyLabel}
                  onChange={(e) => setDraftConfig({ ...draftConfig, topographyLabel: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Curah Hujan</label>
                <input
                  type="text"
                  value={draftConfig.rainfallLabel}
                  onChange={(e) => setDraftConfig({ ...draftConfig, rainfallLabel: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Suhu Rata-rata</label>
                <input
                  type="text"
                  value={draftConfig.avgTempLabel}
                  onChange={(e) => setDraftConfig({ ...draftConfig, avgTempLabel: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Jumlah Dusun</label>
                <input
                  type="number"
                  value={draftConfig.dusunCount}
                  onChange={(e) => setDraftConfig({ ...draftConfig, dusunCount: Number(e.target.value) || 1 })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Jumlah RW</label>
                <input
                  type="number"
                  value={draftConfig.rwCount}
                  onChange={(e) => setDraftConfig({ ...draftConfig, rwCount: Number(e.target.value) || 1 })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Jumlah RT</label>
                <input
                  type="number"
                  value={draftConfig.rtCount}
                  onChange={(e) => setDraftConfig({ ...draftConfig, rtCount: Number(e.target.value) || 1 })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Koordinat Peta Desa</label>
                <input
                  type="text"
                  value={draftConfig.mapEmbedCoordinates}
                  onChange={(e) => setDraftConfig({ ...draftConfig, mapEmbedCoordinates: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                />
              </div>
            </div>
          </div>

          {/* IDM & SDGs Section */}
          <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-slate-700">
            <h5 className="font-bold text-sm text-emerald-700 dark:text-emerald-400">
              Indeks Desa Membangun (IDM) Kemendesa PDTT & Capaian SDGs Desa
            </h5>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Skor IDM (0.0000 - 1.0000)</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  max="1"
                  value={draftConfig.idmScore}
                  onChange={(e) => setDraftConfig({ ...draftConfig, idmScore: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Status Kemendesa</label>
                <select
                  value={draftConfig.idmStatus}
                  onChange={(e) =>
                    setDraftConfig({
                      ...draftConfig,
                      idmStatus: e.target.value as VillageSiteConfig['idmStatus'],
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                >
                  <option value="Desa Mandiri">Desa Mandiri</option>
                  <option value="Desa Maju">Desa Maju</option>
                  <option value="Desa Berkembang">Desa Berkembang</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Tahun Target IDM</label>
                <input
                  type="text"
                  value={draftConfig.idmTargetYear}
                  onChange={(e) => setDraftConfig({ ...draftConfig, idmTargetYear: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Skor SDGs Desa (0-100)</label>
                <input
                  type="number"
                  step="0.01"
                  value={draftConfig.sdgsScore}
                  onChange={(e) => setDraftConfig({ ...draftConfig, sdgsScore: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                />
              </div>
            </div>
          </div>
        </form>
      )}

      {/* =====================================================================
          SECTION 3: APBDES & E-PEMBANGUNAN PROYEK FISIK (FULL CRUD + FOTO)
          ===================================================================== */}
      {cmsSection === 'apbdes_proyek' && (
        <div className="space-y-8">
          {/* APBDes CRUD */}
          <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h4 className="font-extrabold text-base text-gray-900 dark:text-white">
                  Transparansi Anggaran APBDes ({apbdes.length} Pos Anggaran)
                </h4>
                <p className="text-xs text-gray-500">
                  Pendapatan Terealisasi: <strong className="text-emerald-600">{formatRupiah(totalRevenueRealized)}</strong> ·
                  Belanja: <strong className="text-blue-600">{formatRupiah(totalExpenseRealized)}</strong> ({absorptionPercentage}%)
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowApbCsvPanel(!showApbCsvPanel)}
                  className="bg-blue-50 dark:bg-slate-700 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-slate-600 px-3.5 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                >
                  {showApbCsvPanel ? 'Tutup Import CSV' : 'Import / Export CSV APBDes'}
                </button>
                <button
                  onClick={() => {
                    setEditingApb(null);
                    setApbCategory('Pendapatan');
                    setApbSubCategory('');
                    setApbAnggaran('150000000');
                    setApbRealisasi('140000000');
                    setApbDesc('');
                    setIsApbModalOpen(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Pos APBDes</span>
                </button>
              </div>
            </div>

            {showApbCsvPanel && (
              <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-slate-900/70 border border-blue-200 dark:border-slate-700 space-y-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h5 className="font-extrabold text-sm text-gray-900 dark:text-white">
                      Import & Export Massal CSV / Excel Keuangan APBDes
                    </h5>
                    <p className="text-gray-500">
                      Format Kolom: <code>Kategori,SubKategori,Anggaran,Realisasi,Tahun,Deskripsi</code>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const sample = [
                          'Kategori,SubKategori,Anggaran,Realisasi,Tahun,Deskripsi',
                          'Belanja,Belanja Pemberdayaan Posyandu & Stunting,145000000,138000000,2026,PMT Balita & Insentif Kader Posyandu',
                        ].join('\n');
                        setApbCsvRaw(sample);
                        setApbCsvPreview(parseApbdesCsv(sample));
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-blue-200 text-blue-700 font-bold cursor-pointer"
                    >
                      Contoh CSV APBDes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const csv = buildCsvContent(
                          ['Kategori', 'SubKategori', 'Anggaran', 'Realisasi', 'Tahun', 'Deskripsi'],
                          apbdes.map((a) => [
                            a.category,
                            a.subCategory,
                            a.anggaran,
                            a.realisasi,
                            a.year || 2026,
                            a.description,
                          ])
                        );
                        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `apbdes_${siteConfig.villageName.toLowerCase().replace(/\s+/g, '_')}.csv`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold cursor-pointer"
                    >
                      Export CSV APBDes
                    </button>
                  </div>
                </div>
                <textarea
                  rows={3}
                  value={apbCsvRaw}
                  onChange={(e) => {
                    setApbCsvRaw(e.target.value);
                    setApbCsvPreview(parseApbdesCsv(e.target.value));
                  }}
                  placeholder="Kategori,SubKategori,Anggaran,Realisasi,Tahun,Deskripsi"
                  className="w-full p-3 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-[11px]"
                />
                {apbCsvPreview && (
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-700">
                      Valid: {apbCsvPreview.validItems.length} Pos • Error: {apbCsvPreview.errors.length}
                    </span>
                    {apbCsvPreview.validItems.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateApbdes([...apbdes, ...apbCsvPreview.validItems]);
                          onShowToast(
                            'Import CSV APBDes Berhasil!',
                            `${apbCsvPreview.validItems.length} pos anggaran berhasil disimpan ke database.`
                          );
                          setApbCsvRaw('');
                          setApbCsvPreview(null);
                          setShowApbCsvPanel(false);
                        }}
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white font-bold cursor-pointer"
                      >
                        Simpan {apbCsvPreview.validItems.length} Pos APBDes ke Database
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {apbdes.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-700/40 border border-gray-200/80 dark:border-slate-700 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        item.category === 'Pendapatan'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      }`}
                    >
                      {item.category}
                    </span>
                    <p className="font-bold text-gray-900 dark:text-white mt-1">{item.subCategory}</p>
                    <p className="text-gray-500 font-mono text-[11px]">
                      Pagu: {formatRupiah(item.anggaran)} | Realisasi: {formatRupiah(item.realisasi)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => {
                        setEditingApb(item);
                        setApbCategory(item.category === 'Belanja' ? 'Belanja' : 'Pendapatan');
                        setApbSubCategory(item.subCategory);
                        setApbAnggaran(String(item.anggaran));
                        setApbRealisasi(String(item.realisasi));
                        setApbDesc(item.description);
                        setIsApbModalOpen(true);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                      title="Edit Pos APBDes"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        onUpdateApbdes(apbdes.filter((x) => x.id !== item.id));
                        onShowToast('Pos Dihapus', `Pos "${item.subCategory}" telah dihapus dari database.`);
                      }}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                      title="Hapus"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* E-PEMBANGUNAN / PROYEK FISIK DESA CRUD */}
          <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h4 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center space-x-2">
                  <HardHat className="w-5 h-5 text-amber-500" />
                  <span>E-Pembangunan & Realisasi Proyek Fisik Desa ({projects.length} Proyek)</span>
                </h4>
                <p className="text-xs text-gray-500">
                  Kelola daftar pembangunan infrastruktur desa beserta foto dokumentasi progresnya di database.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingProject(null);
                  setPrjTitle('');
                  setPrjLocation(defaultHamletName);
                  setPrjBudget('150000000');
                  setPrjRealized('150000000');
                  setPrjSource('Dana Desa (DD)');
                  setPrjProgress('100');
                  setPrjStatus('Selesai 100%');
                  setPrjExecutor(`TPK ${siteConfig.villageName}`);
                  setPrjDesc('');
                  setPrjImageUrl('');
                  setIsProjectModalOpen(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Proyek Pembangunan</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((prj) => (
                <div
                  key={prj.id}
                  className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-700/40 border border-gray-200 dark:border-slate-700 flex gap-4 items-start text-xs"
                >
                  <img
                    src={prj.imageUrl}
                    alt={prj.title}
                    className="w-24 h-20 rounded-xl object-cover shrink-0 border border-gray-200 dark:border-slate-600"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-[10px]">
                        {prj.sourceFund || prj.fundingSource} · {prj.progressPercent}%
                      </span>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => {
                            setEditingProject(prj);
                            setPrjTitle(prj.title);
                            setPrjLocation(prj.location);
                            setPrjBudget(String(prj.budget));
                            setPrjRealized(String(prj.realized || prj.budget));
                            setPrjSource(prj.sourceFund || prj.fundingSource || 'Dana Desa (DD)');
                            setPrjProgress(String(prj.progressPercent));
                            setPrjStatus(prj.status);
                            setPrjExecutor(prj.executor);
                            setPrjDesc(prj.description);
                            setPrjImageUrl(prj.imageUrl);
                            setIsProjectModalOpen(true);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                          title="Edit Proyek"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            onUpdateProjects(projects.filter((x) => x.id !== prj.id));
                            onShowToast('Proyek Dihapus', `Proyek "${prj.title}" telah dihapus.`);
                          }}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                          title="Hapus Proyek"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="font-bold text-gray-900 dark:text-white mt-1 line-clamp-1">{prj.title}</p>
                    <p className="text-gray-500 text-[11px]">
                      Lokasi: {prj.location} · Pagu: {formatRupiah(prj.budget)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SECTION 4: BERITA & PENGUMUMAN DESA (FULL CRUD + FOTO DATABASE)
          ===================================================================== */}
      {cmsSection === 'berita' && (
        <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-extrabold text-base text-gray-900 dark:text-white">
                Manajemen Berita & Kabar Desa ({news.length} Artikel)
              </h4>
              <p className="text-xs text-gray-500">
                Tambah, ubah, atau hapus berita desa beserta foto sampul yang disimpan langsung di database.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingNews(null);
                setNewsTitle('');
                setNewsCategory('Pengumuman');
                setNewsAuthor('Tim Humas Pemdes');
                setNewsSummary('');
                setNewsContent('');
                setNewsImageUrl('');
                setIsNewsModalOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tulis Berita Baru</span>
            </button>
          </div>

          <div className="space-y-3">
            {news.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-700/40 border border-gray-200/80 dark:border-slate-700 flex items-center justify-between gap-4 text-xs"
              >
                <div className="flex items-center space-x-3.5">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-16 h-16 rounded-xl object-cover shrink-0 border border-gray-200 dark:border-slate-600"
                  />
                  <div>
                    <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                      {item.category} · {item.date} · Oleh {item.author}
                    </span>
                    <h5 className="font-bold text-sm text-gray-900 dark:text-white">{item.title}</h5>
                    <p className="text-gray-500 line-clamp-1">{item.summary || item.excerpt}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    onClick={() => {
                      setEditingNews(item);
                      setNewsTitle(item.title);
                      setNewsCategory(item.category);
                      setNewsAuthor(item.author);
                      setNewsSummary(item.summary || item.excerpt);
                      setNewsContent(item.content || item.excerpt);
                      setNewsImageUrl(item.imageUrl);
                      setIsNewsModalOpen(true);
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                    title="Edit Berita"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      onUpdateNews(news.filter((n) => n.id !== item.id));
                      onShowToast('Berita Dihapus', `Artikel "${item.title}" telah dihapus.`);
                    }}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                    title="Hapus Berita"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          SECTION 5: GALERI KEGIATAN, LAPAK UMKM & POTENSI DESA (FULL CRUD)
          ===================================================================== */}
      {cmsSection === 'galeri_lapak_potensi' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Galeri Kegiatan CRUD */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-200 dark:border-slate-700 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-base text-gray-900 dark:text-white">
                  Galeri Dokumentasi ({gallery.length} Foto)
                </h4>
                <button
                  onClick={() => {
                    setEditingGallery(null);
                    setGalTitle('');
                    setGalCategory('Gotong Royong');
                    setGalLocation(defaultHamletName);
                    setGalDesc('');
                    setGalImageUrl('');
                    setIsGalleryModalOpen(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Unggah Foto Galeri</span>
                </button>
              </div>
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {gallery.map((g) => (
                  <div
                    key={g.id}
                    className="p-3 rounded-2xl bg-gray-50 dark:bg-slate-700/40 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center space-x-3">
                      <img src={g.imageUrl} alt={g.title} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white line-clamp-1">{g.title}</p>
                        <p className="text-[11px] text-gray-500">
                          {g.category} · {g.location}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => {
                          setEditingGallery(g);
                          setGalTitle(g.title);
                          setGalCategory(g.category);
                          setGalLocation(g.location);
                          setGalDesc(g.description);
                          setGalImageUrl(g.imageUrl);
                          setIsGalleryModalOpen(true);
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                        title="Edit Galeri"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          onUpdateGallery(gallery.filter((x) => x.id !== g.id));
                          onShowToast('Foto Dihapus', `Foto "${g.title}" telah dihapus.`);
                        }}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Produk Lapak UMKM CRUD */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-200 dark:border-slate-700 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-base text-gray-900 dark:text-white">
                  Katalog Produk Lapak UMKM ({products.length})
                </h4>
                <button
                  onClick={() => {
                    setEditingProduct(null);
                    setPrdName('');
                    setPrdPrice('45000');
                    setPrdUnit('Kemasan 500gr');
                    setPrdProducer('UMKM Desa');
                    setPrdWa(siteConfig.officialWhatsApp.replace(/\D/g, ''));
                    setPrdStock('30');
                    setPrdDesc('');
                    setPrdBadge('Produk Unggulan');
                    setPrdImageUrl('');
                    setIsProductModalOpen(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Produk UMKM</span>
                </button>
              </div>
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {products.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-2xl bg-gray-50 dark:bg-slate-700/40 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center space-x-3">
                      <img src={p.imageUrl} alt={p.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white line-clamp-1">{p.name}</p>
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono font-bold">
                          {formatRupiah(p.price)} / {p.unit} · {p.producerName || p.sellerName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => {
                          setEditingProduct(p);
                          setPrdName(p.name);
                          setPrdCategory(p.category);
                          setPrdPrice(String(p.price));
                          setPrdUnit(p.unit);
                          setPrdProducer(p.producerName || p.sellerName);
                          setPrdWa(p.whatsapp);
                          setPrdStock(String(p.stock || 50));
                          setPrdDesc(p.description);
                          setPrdBadge(p.badge || '');
                          setPrdImageUrl(p.imageUrl);
                          setIsProductModalOpen(true);
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                        title="Edit Produk"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          onUpdateProducts(products.filter((x) => x.id !== p.id));
                          onShowToast('Produk Dihapus', `Produk "${p.name}" telah dihapus.`);
                        }}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Potensi Unggulan Desa CRUD */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center space-x-2">
                  <Sprout className="w-5 h-5 text-emerald-600" />
                  <span>Potensi Unggulan Desa ({potentials.length} Potensi - Tampil di Profil Desa)</span>
                </h4>
                <p className="text-xs text-gray-500">
                  Kelola potensi pertanian, perikanan, ekowisata, dan ekonomi kreatif desa beserta fotonya di database.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingPotential(null);
                  setPotTitle('');
                  setPotCategory('Pertanian & Perkebunan');
                  setPotDesc('');
                  setPotEconomicVal('300 Ton / Tahun');
                  setPotLocation(defaultHamletName);
                  setPotManager(`BUMDes ${siteConfig.villageName}`);
                  setPotImageUrl('');
                  setIsPotentialModalOpen(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Potensi Desa</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {potentials.map((pot) => (
                <div
                  key={pot.id}
                  className="rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden flex flex-col justify-between bg-gray-50/50 dark:bg-slate-900/40 text-xs"
                >
                  <div>
                    <img src={pot.imageUrl} alt={pot.title} className="w-full h-32 object-cover" />
                    <div className="p-4 space-y-1">
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                        {pot.category}
                      </span>
                      <h5 className="font-bold text-sm text-gray-900 dark:text-white">{pot.title}</h5>
                      <p className="text-gray-500 line-clamp-2">{pot.description}</p>
                      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 pt-1">
                        Nilai: {pot.economicValue}
                      </p>
                    </div>
                  </div>
                  <div className="px-4 py-2.5 border-t border-gray-200 dark:border-slate-700 flex justify-end space-x-2">
                    <button
                      onClick={() => {
                        setEditingPotential(pot);
                        setPotTitle(pot.title);
                        setPotCategory(pot.category);
                        setPotDesc(pot.description);
                        setPotEconomicVal(pot.economicValue || pot.highlightStat || '');
                        setPotLocation(pot.location);
                        setPotManager(pot.manager || `BUMDes ${siteConfig.villageName}`);
                        setPotImageUrl(pot.imageUrl);
                        setIsPotentialModalOpen(true);
                      }}
                      className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg font-bold flex items-center space-x-1 cursor-pointer"
                    >
                      <Edit className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => {
                        onUpdatePotentials(potentials.filter((x) => x.id !== pot.id));
                        onShowToast('Potensi Dihapus', `Potensi "${pot.title}" telah dihapus.`);
                      }}
                      className="px-2.5 py-1 bg-red-50 text-red-600 rounded-lg font-bold flex items-center space-x-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SECTION 6: PAMONG SOTK, LEMBAGA DESA (LKD) & WILAYAH DUSUN (FULL CRUD)
          ===================================================================== */}
      {cmsSection === 'sotk_lkd_dusun' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pamong / Perangkat Desa SOTK CRUD */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-200 dark:border-slate-700 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-base text-gray-900 dark:text-white">
                  Aparatur & Perangkat Desa SOTK ({officials.length})
                </h4>
                <button
                  onClick={() => {
                    setEditingOfficial(null);
                    setOffName('');
                    setOffPosition('');
                    setOffNip('');
                    setOffPhone('0812-8888-9900');
                    setOffEmail(siteConfig.officeEmail);
                    setOffMotto('Siap Melayani Masyarakat dengan Sepenuh Hati.');
                    setOffPhotoUrl('');
                    setIsOfficialModalOpen(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Perangkat</span>
                </button>
              </div>
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {officials.map((off) => (
                  <div
                    key={off.id}
                    className="p-3 rounded-2xl bg-gray-50 dark:bg-slate-700/40 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center space-x-3">
                      <img src={off.photoUrl} alt={off.name} className="w-11 h-11 rounded-xl object-cover shrink-0" />
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">{off.name}</p>
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                          {off.position || off.role}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => {
                          setEditingOfficial(off);
                          setOffName(off.name);
                          setOffPosition(off.position || off.role);
                          setOffNip(off.nip || '');
                          setOffPhone(off.phone);
                          setOffEmail(off.email || siteConfig.officeEmail);
                          setOffMotto(off.motto || '');
                          setOffPhotoUrl(off.photoUrl);
                          setIsOfficialModalOpen(true);
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                        title="Edit Perangkat"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          onUpdateOfficials(officials.filter((x) => x.id !== off.id));
                          onShowToast('Perangkat Dihapus', `Data "${off.name}" telah dihapus.`);
                        }}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Lembaga Kemasyarakatan Desa (LKD) CRUD */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-200 dark:border-slate-700 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center space-x-1.5">
                  <Landmark className="w-4 h-4 text-emerald-600" />
                  <span>Lembaga Kemasyarakatan Desa / LKD ({institutions.length})</span>
                </h4>
                <button
                  onClick={() => {
                    setEditingInst(null);
                    setInstName('');
                    setInstAbbr('LKD');
                    setInstLeader('');
                    setInstPhone('0812-8800-1122');
                    setInstMembers('15');
                    setInstSk(`SK Kades No. 141/12/${new Date().getFullYear()}`);
                    setInstDesc('');
                    setInstLogoUrl(draftConfig.logoUrl);
                    setIsInstModalOpen(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Lembaga</span>
                </button>
              </div>
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {institutions.map((inst) => (
                  <div
                    key={inst.id}
                    className="p-3 rounded-2xl bg-gray-50 dark:bg-slate-700/40 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center space-x-3">
                      {inst.logoUrl ? (
                        <img src={inst.logoUrl} alt={inst.abbreviation} className="w-10 h-10 object-contain rounded-xl bg-white p-1 shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0">
                          {inst.abbreviation}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">
                          {inst.name} ({inst.abbreviation})
                        </p>
                        <p className="text-[11px] text-gray-500">
                          Ketua: {inst.leaderName} · {inst.memberCount} Anggota
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => {
                          setEditingInst(inst);
                          setInstName(inst.name);
                          setInstAbbr(inst.abbreviation);
                          setInstLeader(inst.leaderName);
                          setInstPhone(inst.phone || inst.contactPhone || '');
                          setInstMembers(String(inst.memberCount));
                          setInstSk(inst.skNumber || '');
                          setInstDesc(inst.description || inst.roleDescription || '');
                          setInstLogoUrl(inst.logoUrl || draftConfig.logoUrl);
                          setIsInstModalOpen(true);
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                        title="Edit Lembaga"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          onUpdateInstitutions(institutions.filter((x) => x.id !== inst.id));
                          onShowToast('Lembaga Dihapus', `Lembaga "${inst.name}" telah dihapus.`);
                        }}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Wilayah Administratif Dusun CRUD */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-base text-gray-900 dark:text-white">
                  Daftar Wilayah Kewilayahan Dusun ({hamlets.length} Dusun - Full CRUD)
                </h4>
                <p className="text-xs text-gray-500">
                  Kelola daftar Dusun, Kepala Dusun (Kadus), jumlah RT/RW, dan foto wilayah dusun di database.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingHamlet(null);
                  setHmName('');
                  setHmHeadName('');
                  setHmHeadPhone('0812-9000-1111');
                  setHmRtCount('4');
                  setHmRwCount('2');
                  setHmPopCount('85');
                  setHmFamCount('28');
                  setHmAreaHa('110 Ha');
                  setHmDesc('');
                  setHmImageUrl('');
                  setIsHamletModalOpen(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Wilayah Dusun</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {hamlets.map((hm) => (
                <div
                  key={hm.id}
                  className="rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden flex flex-col justify-between bg-gray-50/50 dark:bg-slate-900/40 text-xs"
                >
                  <div>
                    {hm.imageUrl && <img src={hm.imageUrl} alt={hm.name} className="w-full h-28 object-cover" />}
                    <div className="p-4 space-y-1">
                      <h5 className="font-bold text-sm text-gray-900 dark:text-white">{hm.name}</h5>
                      <p className="text-emerald-700 dark:text-emerald-400 font-semibold">
                        Kadus: {hm.headName}
                      </p>
                      <p className="text-gray-500">
                        {hm.rtCount} RT / {hm.rwCount} RW · Luas {hm.areaHa}
                      </p>
                    </div>
                  </div>
                  <div className="px-4 py-2.5 border-t border-gray-200 dark:border-slate-700 flex justify-end space-x-2">
                    <button
                      onClick={() => {
                        setEditingHamlet(hm);
                        setHmName(hm.name);
                        setHmHeadName(hm.headName);
                        setHmHeadPhone(hm.headPhone || hm.phone || '');
                        setHmRtCount(String(hm.rtCount));
                        setHmRwCount(String(hm.rwCount));
                        setHmPopCount(String(hm.populationCount || 80));
                        setHmFamCount(String(hm.familyCount || 25));
                        setHmAreaHa(hm.areaHa);
                        setHmDesc(hm.description);
                        setHmImageUrl(hm.imageUrl || '');
                        setIsHamletModalOpen(true);
                      }}
                      className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg font-bold flex items-center space-x-1 cursor-pointer"
                    >
                      <Edit className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => {
                        onUpdateHamlets(hamlets.filter((x) => x.id !== hm.id));
                        onShowToast('Dusun Dihapus', `Wilayah "${hm.name}" telah dihapus.`);
                      }}
                      className="px-2.5 py-1 bg-red-50 text-red-600 rounded-lg font-bold flex items-center space-x-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SECTION 7: PRODUK HUKUM PPID, JENIS SURAT & PETA FASILITAS (FULL CRUD)
          ===================================================================== */}
      {cmsSection === 'hukum_surat_peta' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Produk Hukum & PPID CRUD */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-200 dark:border-slate-700 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-base text-gray-900 dark:text-white">
                  Produk Hukum & Dokumen PPID ({regulations.length})
                </h4>
                <button
                  onClick={() => {
                    setEditingReg(null);
                    setRegTitle('');
                    setRegNumber(`Perdes No. 03 Tahun ${new Date().getFullYear()}`);
                    setRegCategory('Peraturan Desa (Perdes)');
                    setRegSummary('');
                    setRegFileSize('1.4 MB (PDF)');
                    setIsRegModalOpen(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Regulasi</span>
                </button>
              </div>
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {regulations.map((reg) => (
                  <div
                    key={reg.id}
                    className="p-3 rounded-2xl bg-gray-50 dark:bg-slate-700/40 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                        {reg.number} · {reg.category}
                      </span>
                      <p className="font-bold text-gray-900 dark:text-white mt-0.5">{reg.title}</p>
                    </div>
                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => {
                          setEditingReg(reg);
                          setRegTitle(reg.title);
                          setRegNumber(reg.number);
                          setRegCategory(reg.category);
                          setRegSummary(reg.summary);
                          setRegFileSize(reg.fileSize);
                          setIsRegModalOpen(true);
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                        title="Edit Produk Hukum"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          onUpdateRegulations(regulations.filter((x) => x.id !== reg.id));
                          onShowToast('Dokumen Dihapus', `Regulasi "${reg.number}" telah dihapus.`);
                        }}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Katalog Jenis Layanan Surat CRUD */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-200 dark:border-slate-700 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center space-x-1.5">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>Jenis Layanan Surat Mandiri ({letterTypes.length})</span>
                </h4>
                <button
                  onClick={() => {
                    setEditingLetterType(null);
                    setLtCode('SKU');
                    setLtName('');
                    setLtShortDesc('');
                    setLtSlaHours('2');
                    setLtReqsText('Scan / Foto KTP Asli, Scan Kartu Keluarga (KK)');
                    setIsLetterTypeModalOpen(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Jenis Surat</span>
                </button>
              </div>
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {letterTypes.map((lt) => (
                  <div
                    key={lt.code + lt.name}
                    className="p-3 rounded-2xl bg-gray-50 dark:bg-slate-700/40 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        KODE: {lt.code} · SLA ~{lt.estimatedHours} Jam
                      </span>
                      <p className="font-bold text-gray-900 dark:text-white">{lt.name}</p>
                      <p className="text-[11px] text-gray-500 line-clamp-1">{lt.shortDesc}</p>
                    </div>
                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => {
                          setEditingLetterType(lt);
                          setLtCode(lt.code);
                          setLtName(lt.name);
                          setLtShortDesc(lt.shortDesc);
                          setLtSlaHours(String(lt.estimatedHours));
                          setLtReqsText(lt.requirements.join(', '));
                          setIsLetterTypeModalOpen(true);
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                        title="Edit Jenis Surat"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          onUpdateLetterTypes(letterTypes.filter((x) => x.code !== lt.code));
                          onShowToast('Layanan Surat Dihapus', `Jenis surat "${lt.name}" telah dihapus.`);
                        }}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Peta Geospasial & Fasilitas Desa CRUD */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center space-x-2">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                  <span>Titik Fasilitas Peta Geospasial Desa ({facilities.length} Lokasi - Full CRUD)</span>
                </h4>
                <p className="text-xs text-gray-500">
                  Kelola lokasi kantor desa, posyandu, sekolah, masjid, BUMDes, dan objek wisata di halaman Peta.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingFacility(null);
                  setFacName('');
                  setFacCategory('Pemerintahan');
                  setFacDesc('');
                  setFacAddress(siteConfig.officeAddress);
                  setFacHours('08:00 - 16:00 WIB');
                  setFacPhone(siteConfig.officePhone);
                  setFacLat('-6.6542');
                  setFacLng('106.9035');
                  setFacX('55');
                  setFacY('45');
                  setFacImageUrl('');
                  setIsFacilityModalOpen(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Titik Fasilitas Peta</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {facilities.map((fac) => (
                <div
                  key={fac.id}
                  className="p-4 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/40 flex flex-col justify-between text-xs space-y-3"
                >
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">{fac.category}</span>
                      <span className="font-mono text-gray-400">
                        Lat:{fac.lat} Lng:{fac.lng}
                      </span>
                    </div>
                    <h5 className="font-bold text-sm text-gray-900 dark:text-white">{fac.name}</h5>
                    <p className="text-gray-500 line-clamp-2">{fac.description}</p>
                    <p className="text-[11px] text-gray-400">{fac.address}</p>
                  </div>
                  <div className="pt-2 border-t border-gray-200 dark:border-slate-700 flex justify-end space-x-2">
                    <button
                      onClick={() => {
                        setEditingFacility(fac);
                        setFacName(fac.name);
                        setFacCategory(fac.category);
                        setFacDesc(fac.description);
                        setFacAddress(fac.address);
                        setFacHours(fac.operatingHours);
                        setFacPhone(fac.phone || '');
                        setFacLat(String(fac.lat));
                        setFacLng(String(fac.lng));
                        setFacX(String(fac.xPercent));
                        setFacY(String(fac.yPercent));
                        setFacImageUrl(fac.imageUrl || '');
                        setIsFacilityModalOpen(true);
                      }}
                      className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg font-bold flex items-center space-x-1 cursor-pointer"
                    >
                      <Edit className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => {
                        onUpdateFacilities(facilities.filter((x) => x.id !== fac.id));
                        onShowToast('Titik Peta Dihapus', `Fasilitas "${fac.name}" telah dihapus.`);
                      }}
                      className="px-2.5 py-1 bg-red-50 text-red-600 rounded-lg font-bold flex items-center space-x-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SECTION 8: ASPIRASI & PENGADUAN MASYARAKAT
          ===================================================================== */}
      {cmsSection === 'aspirasi' && (
        <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-3xl border border-gray-200 dark:border-slate-700 space-y-4">
          <div>
            <h4 className="font-extrabold text-base text-gray-900 dark:text-white">
              Kotak Masuk Aspirasi & Pengaduan Warga ({aspirations.length})
            </h4>
            <p className="text-xs text-gray-500">
              Tanggapi laporan warga agar status tindak lanjut langsung tampil secara transparan di halaman Kontak.
            </p>
          </div>

          <div className="space-y-3">
            {aspirations.map((asp) => (
              <div
                key={asp.id}
                className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-700/40 border border-gray-200/80 dark:border-slate-700 space-y-2 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {asp.ticketNumber}
                    </span>
                    <span>·</span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {asp.citizenName || asp.senderName}
                    </span>
                    <span>·</span>
                    <span className="text-gray-500">{asp.category}</span>
                    <span>·</span>
                    <span className="text-gray-400">{asp.date || asp.createdAt}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {asp.status}
                    </span>
                    <button
                      onClick={() => {
                        setRespondingAspId(asp.id);
                        setAspResponseText(asp.adminResponse || asp.responseNote || '');
                        setAspStatusSelect(asp.status);
                      }}
                      className="text-blue-600 hover:underline font-bold cursor-pointer"
                    >
                      Balas / Ubah Status
                    </button>
                    <button
                      onClick={() => {
                        onUpdateAspirations(aspirations.filter((x) => x.id !== asp.id));
                      }}
                      className="text-red-500 hover:underline font-bold cursor-pointer"
                    >
                      Hapus
                    </button>
                  </div>
                </div>

                <h5 className="font-bold text-sm text-gray-900 dark:text-white">
                  {asp.title || asp.subject}
                </h5>
                <p className="text-gray-600 dark:text-gray-300">{asp.content || asp.message}</p>
                {asp.photoUrl && (
                  <img
                    src={asp.photoUrl}
                    alt={asp.title || asp.subject}
                    className="w-48 h-32 object-cover rounded-xl border border-gray-200 dark:border-slate-700"
                  />
                )}

                {(asp.adminResponse || asp.responseNote) && (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-slate-800 border border-emerald-200 dark:border-slate-600 text-emerald-900 dark:text-emerald-200">
                    <strong>Tanggapan Resmi Pemdes:</strong> {asp.adminResponse || asp.responseNote}
                  </div>
                )}

                {respondingAspId === asp.id && (
                  <div className="pt-2 space-y-2 border-t border-gray-200 dark:border-slate-600">
                    <div className="flex gap-2">
                      <select
                        value={aspStatusSelect}
                        onChange={(e) => setAspStatusSelect(e.target.value as any)}
                        className="px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-bold"
                      >
                        <option value="Menunggu">Menunggu</option>
                        <option value="Ditindaklanjuti">Ditindaklanjuti</option>
                        <option value="Selesai">Selesai</option>
                      </select>
                      <input
                        type="text"
                        value={aspResponseText}
                        onChange={(e) => setAspResponseText(e.target.value)}
                        placeholder="Ketik tanggapan resmi Pemerintah Desa..."
                        className="flex-1 px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                      />
                      <button
                        onClick={() => handleSaveAspirationResponse(asp.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold cursor-pointer"
                      >
                        Simpan
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          SECTION 9: MANAJEMEN AKUN PERANGKAT (ADMIN USERS) & MEDIA ASSETS DB
          ===================================================================== */}
      {cmsSection === 'admin_media' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Akun Login Perangkat Desa CRUD */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center space-x-2">
                  <KeyRound className="w-4 h-4 text-emerald-600" />
                  <span>Akun Login Perangkat Desa ({adminUsers.length})</span>
                </h4>
                <p className="text-xs text-gray-500">
                  Kelola kredensial operator SID, Kepala Desa, dan Kasi Pelayanan untuk akses Dasbor Admin.
                </p>
              </div>
              {onUpdateAdminUsers && (
                <button
                  onClick={() => {
                    setEditingAdminUser(null);
                    setAdmUsername('');
                    setAdmPassword('');
                    setAdmFullName('');
                    setAdmRole('Operator SID / Kaur Umum');
                    setAdmNip('');
                    setIsAdminModalOpen(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Akun</span>
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {adminUsers.map((u) => (
                <div
                  key={u.username}
                  className="p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-700/40 border border-gray-200/70 dark:border-slate-700 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono font-bold">
                        @{u.username}
                      </span>
                      <span className="font-bold text-gray-900 dark:text-white">{u.fullName}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1">
                      Jabatan: {u.role} · NIP: {u.nip}
                    </p>
                  </div>
                  {onUpdateAdminUsers && (
                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => {
                          setEditingAdminUser(u);
                          setAdmUsername(u.username);
                          setAdmPassword('');
                          setAdmFullName(u.fullName);
                          setAdmRole(u.role);
                          setAdmNip(u.nip);
                          setIsAdminModalOpen(true);
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                        title="Edit Akun"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {adminUsers.length > 1 && (
                        <button
                          onClick={() => {
                            onUpdateAdminUsers(adminUsers.filter((x) => x.username !== u.username));
                            onShowToast('Akun Dihapus', `Akun @${u.username} telah dihapus.`);
                          }}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                          title="Hapus Akun"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Pustaka Media Database (MediaGalleryPicker) */}
          <div className="space-y-4">
            <MediaGalleryPicker
              mediaAssets={mediaAssets}
              selectedValue={draftConfig.heroImageUrl}
              title="Pustaka Media & Pemilih Gambar Website (MediaGalleryPicker)"
              onSelect={(dataUrl, asset) => {
                const updated = { ...draftConfig, heroImageUrl: dataUrl };
                setDraftConfig(updated);
                onUpdateSiteConfig(updated);
                onShowToast(
                  'Media Terpilih',
                  `Aset "${asset.name}" ditetapkan sebagai Hero Image Beranda.`
                );
              }}
              onUploadNewAsset={(newAsset) => {
                onUpdateMediaAssets?.([newAsset, ...mediaAssets]);
                onShowToast(
                  'Media Tersimpan di Database',
                  `File "${newAsset.name}" berhasil ditambahkan ke mediaAssets.`
                );
              }}
              onApplyToHero={(asset) => {
                const updated = { ...draftConfig, heroImageUrl: asset.dataUrl };
                setDraftConfig(updated);
                onUpdateSiteConfig(updated);
                onShowToast(
                  'Hero Image Diperbarui!',
                  `Aset "${asset.name}" kini digunakan sebagai Hero Banner Beranda.`
                );
              }}
              onApplyToLogo={(asset) => {
                const updated = { ...draftConfig, logoUrl: asset.dataUrl };
                setDraftConfig(updated);
                onUpdateSiteConfig(updated);
                onShowToast(
                  'Logo Desa Diperbarui!',
                  `Aset "${asset.name}" kini ditetapkan sebagai Logo Resmi Desa.`
                );
              }}
              onAddToGallerySlide={(asset) => {
                const newSlide: GalleryItem = {
                  id: `gal-${Date.now()}`,
                  title: asset.name,
                  category: 'Pemerintahan',
                  date: formatDateId(new Date().toISOString().split('T')[0]),
                  location: siteConfig.villageName,
                  imageUrl: asset.dataUrl,
                  description: `Dokumentasi kegiatan resmi Pemerintah ${siteConfig.villageName}.`,
                  participantsCount: 45,
                };
                onUpdateGallery([newSlide, ...gallery]);
                onShowToast(
                  'Ditambahkan ke Slide Galeri!',
                  `Aset "${asset.name}" berhasil ditambahkan ke halaman Galeri Desa.`
                );
              }}
              onDeleteAsset={async (assetId) => {
                try {
                  const token = localStorage.getItem('sid_desa_admin_token') || '';
                  await fetch(`/api/media/${assetId}`, {
                    method: 'DELETE',
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                  });
                } catch {}
                onUpdateMediaAssets?.(mediaAssets.filter((m) => m.id !== assetId));
                onShowToast('Media Dihapus', 'Aset gambar telah dihapus dari database.');
              }}
            />
          </div>
        </div>
      )}

      {/* =====================================================================
          MODALS FOR ALL DOMAINS (FULL CREATE & UPDATE + IMAGE UPLOAD TO DB)
          ===================================================================== */}

      {/* MODAL 1: APBDES */}
      {isApbModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 space-y-4 border border-gray-200 dark:border-slate-800 shadow-2xl text-xs">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-base text-gray-900 dark:text-white">
                {editingApb ? 'Edit Pos Anggaran APBDes' : 'Tambah Pos Anggaran APBDes'}
              </h4>
              <button onClick={() => setIsApbModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveApbItem} className="space-y-3">
              <div>
                <label className="block font-bold mb-1">Kategori Anggaran</label>
                <select
                  value={apbCategory}
                  onChange={(e) => setApbCategory(e.target.value as any)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="Pendapatan">Pendapatan Desa</option>
                  <option value="Belanja">Belanja & Pembangunan Desa</option>
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Nama Bidang / Sumber Dana</label>
                <input
                  type="text"
                  value={apbSubCategory}
                  onChange={(e) => setApbSubCategory(e.target.value)}
                  placeholder="Contoh: Dana Desa (DD) APBN"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Pagu Anggaran (Rp)</label>
                  <input
                    type="number"
                    value={apbAnggaran}
                    onChange={(e) => setApbAnggaran(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Realisasi (Rp)</label>
                  <input
                    type="number"
                    value={apbRealisasi}
                    onChange={(e) => setApbRealisasi(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold mb-1">Keterangan Ringkas</label>
                <input
                  type="text"
                  value={apbDesc}
                  onChange={(e) => setApbDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsApbModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-slate-700"
                >
                  Batal
                </button>
                <button type="submit" className="bg-emerald-600 text-white px-5 py-2 rounded-xl font-bold cursor-pointer">
                  Simpan ke Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: PROYEK E-PEMBANGUNAN */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-6 space-y-4 border border-gray-200 dark:border-slate-800 shadow-2xl text-xs my-8">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-base text-gray-900 dark:text-white">
                {editingProject ? 'Edit Proyek Pembangunan Fisik' : 'Tambah Proyek Pembangunan Fisik'}
              </h4>
              <button onClick={() => setIsProjectModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveProject} className="space-y-3">
              <div>
                <label className="block font-bold mb-1">Nama Kegiatan / Proyek Infrastruktur</label>
                <input
                  type="text"
                  value={prjTitle}
                  onChange={(e) => setPrjTitle(e.target.value)}
                  placeholder="Contoh: Pengaspalan Jalan Usaha Tani 450 Meter"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Lokasi Proyek</label>
                  <input
                    type="text"
                    value={prjLocation}
                    onChange={(e) => setPrjLocation(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Sumber Dana</label>
                  <select
                    value={prjSource}
                    onChange={(e) => setPrjSource(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="Dana Desa (DD)">Dana Desa (DD)</option>
                    <option value="ADD Kabupaten">ADD Kabupaten</option>
                    <option value="Bantuan Provinsi">Bantuan Provinsi</option>
                    <option value="PADes">PADes</option>
                    <option value="Swadaya Masyarakat">Swadaya Masyarakat</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-1">Anggaran (Rp)</label>
                  <input
                    type="number"
                    value={prjBudget}
                    onChange={(e) => setPrjBudget(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Progres Fisik (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={prjProgress}
                    onChange={(e) => setPrjProgress(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Status</label>
                  <select
                    value={prjStatus}
                    onChange={(e) => setPrjStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="Perencanaan">Perencanaan</option>
                    <option value="Sedang Dikerjakan">Sedang Dikerjakan</option>
                    <option value="Selesai 100%">Selesai 100%</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-bold mb-1">Pelaksana Kegiatan (TPK / Swakelola)</label>
                <input
                  type="text"
                  value={prjExecutor}
                  onChange={(e) => setPrjExecutor(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Deskripsi Pekerjaan</label>
                <textarea
                  rows={2}
                  value={prjDesc}
                  onChange={(e) => setPrjDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <ImageUploadField
                label="Foto Dokumentasi Proyek Fisik (Disimpan ke Database)"
                value={prjImageUrl}
                onChange={setPrjImageUrl}
                category="pembangunan"
              />
              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsProjectModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-slate-700"
                >
                  Batal
                </button>
                <button type="submit" className="bg-emerald-600 text-white px-5 py-2 rounded-xl font-bold cursor-pointer">
                  Simpan Proyek ke Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: BERITA DESA */}
      {isNewsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-6 space-y-4 border border-gray-200 dark:border-slate-800 shadow-2xl text-xs my-8">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-base text-gray-900 dark:text-white">
                {editingNews ? 'Edit Artikel Berita Desa' : 'Tulis Artikel Berita Baru'}
              </h4>
              <button onClick={() => setIsNewsModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveNews} className="space-y-3">
              <div>
                <label className="block font-bold mb-1">Judul Berita</label>
                <input
                  type="text"
                  value={newsTitle}
                  onChange={(e) => setNewsTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Kategori</label>
                  <select
                    value={newsCategory}
                    onChange={(e) => setNewsCategory(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="Pengumuman">Pengumuman</option>
                    <option value="Pembangunan">Pembangunan</option>
                    <option value="Kesehatan">Kesehatan</option>
                    <option value="Sosial">Sosial</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1">Penulis</label>
                  <input
                    type="text"
                    value={newsAuthor}
                    onChange={(e) => setNewsAuthor(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold mb-1">Ringkasan Singkat</label>
                <textarea
                  rows={2}
                  value={newsSummary}
                  onChange={(e) => setNewsSummary(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  required
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Isi Lengkap Berita</label>
                <textarea
                  rows={3}
                  value={newsContent}
                  onChange={(e) => setNewsContent(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <ImageUploadField
                label="Foto Sampul Berita (Disimpan ke Database)"
                value={newsImageUrl}
                onChange={setNewsImageUrl}
                category="berita"
              />
              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsNewsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-slate-700"
                >
                  Batal
                </button>
                <button type="submit" className="bg-emerald-600 text-white px-5 py-2 rounded-xl font-bold cursor-pointer">
                  Publikasikan Berita
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: GALERI KEGIATAN */}
      {isGalleryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 space-y-4 border border-gray-200 dark:border-slate-800 shadow-2xl text-xs my-8">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-base text-gray-900 dark:text-white">
                {editingGallery ? 'Edit Dokumentasi Galeri' : 'Unggah Dokumentasi Galeri Baru'}
              </h4>
              <button onClick={() => setIsGalleryModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveGallery} className="space-y-3">
              <div>
                <label className="block font-bold mb-1">Judul Dokumentasi Kegiatan</label>
                <input
                  type="text"
                  value={galTitle}
                  onChange={(e) => setGalTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Kategori</label>
                  <select
                    value={galCategory}
                    onChange={(e) => setGalCategory(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="Gotong Royong">Gotong Royong</option>
                    <option value="Pembangunan">Pembangunan</option>
                    <option value="Budaya & Seni">Budaya & Seni</option>
                    <option value="UMKM & Panen">UMKM & Panen</option>
                    <option value="Pemerintahan">Pemerintahan</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1">Lokasi</label>
                  <input
                    type="text"
                    value={galLocation}
                    onChange={(e) => setGalLocation(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold mb-1">Deskripsi Kegiatan</label>
                <textarea
                  rows={2}
                  value={galDesc}
                  onChange={(e) => setGalDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <ImageUploadField
                label="Foto Kegiatan Desa (Disimpan ke Database)"
                value={galImageUrl}
                onChange={setGalImageUrl}
                category="galeri"
              />
              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsGalleryModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-slate-700"
                >
                  Batal
                </button>
                <button type="submit" className="bg-emerald-600 text-white px-5 py-2 rounded-xl font-bold cursor-pointer">
                  Simpan Galeri ke Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: PRODUK LAPAK UMKM */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-6 space-y-4 border border-gray-200 dark:border-slate-800 shadow-2xl text-xs my-8">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-base text-gray-900 dark:text-white">
                {editingProduct ? 'Edit Produk UMKM Desa' : 'Tambah Produk UMKM Baru'}
              </h4>
              <button onClick={() => setIsProductModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveProduct} className="space-y-3">
              <div>
                <label className="block font-bold mb-1">Nama Produk UMKM</label>
                <input
                  type="text"
                  value={prdName}
                  onChange={(e) => setPrdName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-1">Kategori</label>
                  <select
                    value={prdCategory}
                    onChange={(e) => setPrdCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="Hasil Bumi">Hasil Bumi</option>
                    <option value="Kuliner Olahan">Kuliner Olahan</option>
                    <option value="Kerajinan Tangan">Kerajinan Tangan</option>
                    <option value="Pupuk & Bibit">Pupuk & Bibit</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1">Harga (Rp)</label>
                  <input
                    type="number"
                    value={prdPrice}
                    onChange={(e) => setPrdPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Satuan</label>
                  <input
                    type="text"
                    value={prdUnit}
                    onChange={(e) => setPrdUnit(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-1">Nama Produsen / UMKM</label>
                  <input
                    type="text"
                    value={prdProducer}
                    onChange={(e) => setPrdProducer(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">No. WhatsApp Penjual</label>
                  <input
                    type="text"
                    value={prdWa}
                    onChange={(e) => setPrdWa(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Stok Tersedia</label>
                  <input
                    type="number"
                    value={prdStock}
                    onChange={(e) => setPrdStock(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold mb-1">Deskripsi Produk</label>
                <textarea
                  rows={2}
                  value={prdDesc}
                  onChange={(e) => setPrdDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <ImageUploadField
                label="Foto Produk UMKM (Disimpan ke Database)"
                value={prdImageUrl}
                onChange={setPrdImageUrl}
                category="umkm"
              />
              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-slate-700"
                >
                  Batal
                </button>
                <button type="submit" className="bg-emerald-600 text-white px-5 py-2 rounded-xl font-bold cursor-pointer">
                  Simpan Produk ke Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: POTENSI UNGGULAN DESA */}
      {isPotentialModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-6 space-y-4 border border-gray-200 dark:border-slate-800 shadow-2xl text-xs my-8">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-base text-gray-900 dark:text-white">
                {editingPotential ? 'Edit Potensi Unggulan Desa' : 'Tambah Potensi Unggulan Desa'}
              </h4>
              <button onClick={() => setIsPotentialModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSavePotential} className="space-y-3">
              <div>
                <label className="block font-bold mb-1">Nama Potensi Desa</label>
                <input
                  type="text"
                  value={potTitle}
                  onChange={(e) => setPotTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Kategori Sektor</label>
                  <select
                    value={potCategory}
                    onChange={(e) => setPotCategory(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="Pertanian & Perkebunan">Pertanian & Perkebunan</option>
                    <option value="Peternakan & Perikanan">Peternakan & Perikanan</option>
                    <option value="Pariwisata & Alam">Pariwisata & Alam</option>
                    <option value="Industri Kreatif & UMKM">Industri Kreatif & UMKM</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1">Kapasitas / Nilai Ekonomi</label>
                  <input
                    type="text"
                    value={potEconomicVal}
                    onChange={(e) => setPotEconomicVal(e.target.value)}
                    placeholder="Contoh: 1.250 Ton / Tahun"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Lokasi Wilayah</label>
                  <input
                    type="text"
                    value={potLocation}
                    onChange={(e) => setPotLocation(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Unit Pengelola</label>
                  <input
                    type="text"
                    value={potManager}
                    onChange={(e) => setPotManager(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold mb-1">Deskripsi Potensi</label>
                <textarea
                  rows={2}
                  value={potDesc}
                  onChange={(e) => setPotDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <ImageUploadField
                label="Foto Potensi Desa (Disimpan ke Database)"
                value={potImageUrl}
                onChange={setPotImageUrl}
                category="potensi"
              />
              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsPotentialModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-slate-700"
                >
                  Batal
                </button>
                <button type="submit" className="bg-emerald-600 text-white px-5 py-2 rounded-xl font-bold cursor-pointer">
                  Simpan Potensi ke Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: PERANGKAT DESA SOTK */}
      {isOfficialModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 space-y-4 border border-gray-200 dark:border-slate-800 shadow-2xl text-xs my-8">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-base text-gray-900 dark:text-white">
                {editingOfficial ? 'Edit Perangkat Desa (SOTK)' : 'Tambah Perangkat Desa (SOTK)'}
              </h4>
              <button onClick={() => setIsOfficialModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveOfficial} className="space-y-3">
              <div>
                <label className="block font-bold mb-1">Nama Lengkap & Gelar</label>
                <input
                  type="text"
                  value={offName}
                  onChange={(e) => setOffName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Jabatan Struktural</label>
                  <input
                    type="text"
                    value={offPosition}
                    onChange={(e) => setOffPosition(e.target.value)}
                    placeholder="Contoh: Kasi Pelayanan"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">NIP / NIAP</label>
                  <input
                    type="text"
                    value={offNip}
                    onChange={(e) => setOffNip(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Telepon / WA</label>
                  <input
                    type="text"
                    value={offPhone}
                    onChange={(e) => setOffPhone(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Email</label>
                  <input
                    type="email"
                    value={offEmail}
                    onChange={(e) => setOffEmail(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold mb-1">Motto Pelayanan</label>
                <input
                  type="text"
                  value={offMotto}
                  onChange={(e) => setOffMotto(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <ImageUploadField
                label="Foto Resmi Perangkat Desa (Disimpan ke Database)"
                value={offPhotoUrl}
                onChange={setOffPhotoUrl}
                category="perangkat"
              />
              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsOfficialModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-slate-700"
                >
                  Batal
                </button>
                <button type="submit" className="bg-emerald-600 text-white px-5 py-2 rounded-xl font-bold cursor-pointer">
                  Simpan ke Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 8: LEMBAGA KEMASYARAKATAN DESA (LKD) */}
      {isInstModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 space-y-4 border border-gray-200 dark:border-slate-800 shadow-2xl text-xs my-8">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-base text-gray-900 dark:text-white">
                {editingInst ? 'Edit Lembaga Desa (LKD)' : 'Tambah Lembaga Desa (LKD)'}
              </h4>
              <button onClick={() => setIsInstModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveInstitution} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold mb-1">Nama Lembaga</label>
                  <input
                    type="text"
                    value={instName}
                    onChange={(e) => setInstName(e.target.value)}
                    placeholder="Contoh: Badan Permusyawaratan Desa"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Singkatan</label>
                  <input
                    type="text"
                    value={instAbbr}
                    onChange={(e) => setInstAbbr(e.target.value)}
                    placeholder="BPD"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Nama Ketua / Pimpinan</label>
                  <input
                    type="text"
                    value={instLeader}
                    onChange={(e) => setInstLeader(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Jumlah Anggota</label>
                  <input
                    type="number"
                    value={instMembers}
                    onChange={(e) => setInstMembers(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold mb-1">Nomor SK Pengukuhan</label>
                <input
                  type="text"
                  value={instSk}
                  onChange={(e) => setInstSk(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Tugas & Fungsi Lembaga</label>
                <textarea
                  rows={2}
                  value={instDesc}
                  onChange={(e) => setInstDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <ImageUploadField
                label="Logo Lembaga Desa (Disimpan ke Database)"
                value={instLogoUrl}
                onChange={setInstLogoUrl}
                category="lembaga"
                isLogo={true}
              />
              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsInstModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-slate-700"
                >
                  Batal
                </button>
                <button type="submit" className="bg-emerald-600 text-white px-5 py-2 rounded-xl font-bold cursor-pointer">
                  Simpan ke Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 9: WILAYAH DUSUN */}
      {isHamletModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 space-y-4 border border-gray-200 dark:border-slate-800 shadow-2xl text-xs my-8">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-base text-gray-900 dark:text-white">
                {editingHamlet ? 'Edit Wilayah Dusun' : 'Tambah Wilayah Dusun Baru'}
              </h4>
              <button onClick={() => setIsHamletModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveHamlet} className="space-y-3">
              <div>
                <label className="block font-bold mb-1">Nama Dusun</label>
                <input
                  type="text"
                  value={hmName}
                  onChange={(e) => setHmName(e.target.value)}
                  placeholder="Contoh: Dusun 4 Cempaka"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Nama Kepala Dusun (Kadus)</label>
                  <input
                    type="text"
                    value={hmHeadName}
                    onChange={(e) => setHmHeadName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">No. HP Kadus</label>
                  <input
                    type="text"
                    value={hmHeadPhone}
                    onChange={(e) => setHmHeadPhone(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-1">Jumlah RT</label>
                  <input
                    type="number"
                    value={hmRtCount}
                    onChange={(e) => setHmRtCount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Jumlah RW</label>
                  <input
                    type="number"
                    value={hmRwCount}
                    onChange={(e) => setHmRwCount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Luas Area</label>
                  <input
                    type="text"
                    value={hmAreaHa}
                    onChange={(e) => setHmAreaHa(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold mb-1">Karakteristik Wilayah Dusun</label>
                <textarea
                  rows={2}
                  value={hmDesc}
                  onChange={(e) => setHmDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <ImageUploadField
                label="Foto Wilayah Dusun (Disimpan ke Database)"
                value={hmImageUrl}
                onChange={setHmImageUrl}
                category="dusun"
              />
              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsHamletModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-slate-700"
                >
                  Batal
                </button>
                <button type="submit" className="bg-emerald-600 text-white px-5 py-2 rounded-xl font-bold cursor-pointer">
                  Simpan ke Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 10: PRODUK HUKUM PPID */}
      {isRegModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 space-y-4 border border-gray-200 dark:border-slate-800 shadow-2xl text-xs">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-base text-gray-900 dark:text-white">
                {editingReg ? 'Edit Produk Hukum / PPID' : 'Tambah Produk Hukum / PPID'}
              </h4>
              <button onClick={() => setIsRegModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveRegulation} className="space-y-3">
              <div>
                <label className="block font-bold mb-1">Judul Peraturan / Dokumen Publik</label>
                <input
                  type="text"
                  value={regTitle}
                  onChange={(e) => setRegTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Nomor Regulasi</label>
                  <input
                    type="text"
                    value={regNumber}
                    onChange={(e) => setRegNumber(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Kategori</label>
                  <select
                    value={regCategory}
                    onChange={(e) => setRegCategory(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="Peraturan Desa (Perdes)">Peraturan Desa (Perdes)</option>
                    <option value="Peraturan Kepala Desa (Perkades)">Peraturan Kepala Desa (Perkades)</option>
                    <option value="SK Kepala Desa">SK Kepala Desa</option>
                    <option value="Dokumen RPJMDes / RKPDes">Dokumen RPJMDes / RKPDes</option>
                    <option value="Informasi Publik (PPID)">Informasi Publik (PPID)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-bold mb-1">Pokok Materi / Ringkasan</label>
                <textarea
                  rows={3}
                  value={regSummary}
                  onChange={(e) => setRegSummary(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  required
                />
              </div>
              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsRegModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-slate-700"
                >
                  Batal
                </button>
                <button type="submit" className="bg-emerald-600 text-white px-5 py-2 rounded-xl font-bold cursor-pointer">
                  Simpan ke Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 11: JENIS LAYANAN SURAT */}
      {isLetterTypeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 space-y-4 border border-gray-200 dark:border-slate-800 shadow-2xl text-xs">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-base text-gray-900 dark:text-white">
                {editingLetterType ? 'Edit Jenis Layanan Surat' : 'Tambah Jenis Layanan Surat'}
              </h4>
              <button onClick={() => setIsLetterTypeModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveLetterType} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-1">Kode Surat</label>
                  <select
                    value={ltCode}
                    onChange={(e) => setLtCode(e.target.value as LetterTypeCode)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  >
                    <option value="SKU">SKU</option>
                    <option value="SKTM">SKTM</option>
                    <option value="DOMISILI">DOMISILI</option>
                    <option value="SKCK">SKCK</option>
                    <option value="KELAHIRAN">KELAHIRAN</option>
                    <option value="PINDAH">PINDAH</option>
                    <option value="KEMATIAN">KEMATIAN</option>
                    <option value="NIKAH">NIKAH</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block font-bold mb-1">Nama Resmi Surat</label>
                  <input
                    type="text"
                    value={ltName}
                    onChange={(e) => setLtName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold mb-1">Estimasi SLA Selesai (Jam Kerja)</label>
                <input
                  type="number"
                  value={ltSlaHours}
                  onChange={(e) => setLtSlaHours(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Deskripsi Kegunaan Surat</label>
                <textarea
                  rows={2}
                  value={ltShortDesc}
                  onChange={(e) => setLtShortDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  required
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Syarat Berkas (Pisahkan dengan koma)</label>
                <input
                  type="text"
                  value={ltReqsText}
                  onChange={(e) => setLtReqsText(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsLetterTypeModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-slate-700"
                >
                  Batal
                </button>
                <button type="submit" className="bg-emerald-600 text-white px-5 py-2 rounded-xl font-bold cursor-pointer">
                  Simpan ke Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 12: TITIK FASILITAS PETA */}
      {isFacilityModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-6 space-y-4 border border-gray-200 dark:border-slate-800 shadow-2xl text-xs my-8">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-base text-gray-900 dark:text-white">
                {editingFacility ? 'Edit Titik Fasilitas Peta Desa' : 'Tambah Titik Fasilitas Peta Desa'}
              </h4>
              <button onClick={() => setIsFacilityModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveFacility} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Nama Fasilitas / Lokasi</label>
                  <input
                    type="text"
                    value={facName}
                    onChange={(e) => setFacName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Kategori</label>
                  <select
                    value={facCategory}
                    onChange={(e) => setFacCategory(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="Pemerintahan">Pemerintahan</option>
                    <option value="Kesehatan">Kesehatan</option>
                    <option value="Pendidikan">Pendidikan</option>
                    <option value="Ibadah">Ibadah</option>
                    <option value="Ekonomi & BUMDes">Ekonomi & BUMDes</option>
                    <option value="Wisata & Ruang Terbuka">Wisata & Ruang Terbuka</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Alamat Lokasi</label>
                  <input
                    type="text"
                    value={facAddress}
                    onChange={(e) => setFacAddress(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Jam Operasional</label>
                  <input
                    type="text"
                    value={facHours}
                    onChange={(e) => setFacHours(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block font-bold mb-1">Posisi Peta X (%)</label>
                  <input
                    type="number"
                    min="10"
                    max="90"
                    value={facX}
                    onChange={(e) => setFacX(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Posisi Peta Y (%)</label>
                  <input
                    type="number"
                    min="10"
                    max="90"
                    value={facY}
                    onChange={(e) => setFacY(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Latitude</label>
                  <input
                    type="text"
                    value={facLat}
                    onChange={(e) => setFacLat(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Longitude</label>
                  <input
                    type="text"
                    value={facLng}
                    onChange={(e) => setFacLng(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold mb-1">Deskripsi Fasilitas</label>
                <textarea
                  rows={2}
                  value={facDesc}
                  onChange={(e) => setFacDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <ImageUploadField
                label="Foto Fasilitas Peta (Opsional - Disimpan ke Database)"
                value={facImageUrl}
                onChange={setFacImageUrl}
                category="peta"
              />
              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsFacilityModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-slate-700"
                >
                  Batal
                </button>
                <button type="submit" className="bg-emerald-600 text-white px-5 py-2 rounded-xl font-bold cursor-pointer">
                  Simpan ke Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 13: AKUN LOGIN PERANGKAT DESA */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 space-y-4 border border-gray-200 dark:border-slate-800 shadow-2xl text-xs">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-base text-gray-900 dark:text-white">
                {editingAdminUser ? 'Edit Akun Perangkat Desa' : 'Tambah Akun Perangkat Desa Baru'}
              </h4>
              <button onClick={() => setIsAdminModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveAdminUser} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Username Login *</label>
                  <input
                    type="text"
                    value={admUsername}
                    onChange={(e) => setAdmUsername(e.target.value)}
                    disabled={Boolean(editingAdminUser)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono disabled:opacity-60"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">
                    {editingAdminUser ? 'Kata Sandi Baru (Opsional)' : 'Kata Sandi *'}
                  </label>
                  <input
                    type="password"
                    value={admPassword}
                    onChange={(e) => setAdmPassword(e.target.value)}
                    placeholder={editingAdminUser ? 'Kosongkan jika tetap' : 'Min. 6 karakter'}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    required={!editingAdminUser}
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold mb-1">Nama Lengkap & Gelar *</label>
                <input
                  type="text"
                  value={admFullName}
                  onChange={(e) => setAdmFullName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Jabatan / Hak Akses</label>
                  <input
                    type="text"
                    value={admRole}
                    onChange={(e) => setAdmRole(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">NIP / NIAP</label>
                  <input
                    type="text"
                    value={admNip}
                    onChange={(e) => setAdmNip(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAdminModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-slate-700"
                >
                  Batal
                </button>
                <button type="submit" className="bg-emerald-600 text-white px-5 py-2 rounded-xl font-bold cursor-pointer">
                  Simpan Akun ke Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI RESET */}
      {confirmResetOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 space-y-4 border border-gray-200 dark:border-slate-800 shadow-2xl text-xs">
            <h4 className="font-extrabold text-base text-gray-900 dark:text-white">
              Reset Seluruh Database Desa ke Standar Awal?
            </h4>
            <p className="text-gray-600 dark:text-gray-400">
              Tindakan ini akan mengembalikan seluruh pengaturan identitas, logo desa, berita, galeri, APBDes, dan proyek ke data standar awal.
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setConfirmResetOpen(false)}
                className="px-4 py-2 rounded-xl border border-gray-300 dark:border-slate-700"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  setConfirmResetOpen(false);
                  onResetAllToDefault();
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl font-bold cursor-pointer"
              >
                Ya, Reset Database
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
