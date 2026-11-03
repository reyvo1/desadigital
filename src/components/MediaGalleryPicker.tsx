import React, { useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Database,
  FolderOpen,
  Image as ImageIcon,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { MediaAsset } from '../types/village';

export interface MediaGalleryPickerProps {
  mediaAssets: MediaAsset[];
  onSelect: (dataUrl: string, asset: MediaAsset) => void;
  onUploadNewAsset?: (newAsset: MediaAsset) => void;
  onDeleteAsset?: (assetId: string) => void;
  onApplyToHero?: (asset: MediaAsset) => void;
  onApplyToLogo?: (asset: MediaAsset) => void;
  onAddToGallerySlide?: (asset: MediaAsset) => void;
  selectedValue?: string;
  defaultCategory?: string;
  title?: string;
  isModal?: boolean;
  onClose?: () => void;
}

const CATEGORY_TABS: { key: string; label: string }[] = [
  { key: 'semua', label: 'Semua Media' },
  { key: 'hero', label: 'Hero Banner' },
  { key: 'logo', label: 'Logo Desa' },
  { key: 'galeri', label: 'Slide Galeri' },
  { key: 'berita', label: 'Berita' },
  { key: 'umkm', label: 'Produk UMKM' },
  { key: 'pembangunan', label: 'Proyek Fisik' },
  { key: 'kades', label: 'Kades & Pamong' },
  { key: 'lainnya', label: 'Lainnya' },
];

export const MediaGalleryPicker: React.FC<MediaGalleryPickerProps> = ({
  mediaAssets,
  onSelect,
  onUploadNewAsset,
  onDeleteAsset,
  onApplyToHero,
  onApplyToLogo,
  onAddToGallerySlide,
  selectedValue,
  defaultCategory = 'semua',
  title = 'Pustaka Media & Galeri Database Desa (MediaGalleryPicker)',
  isModal = false,
  onClose,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>(defaultCategory || 'semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [uploadCategory, setUploadCategory] = useState<MediaAsset['category']>(
    defaultCategory && defaultCategory !== 'semua'
      ? (defaultCategory as MediaAsset['category'])
      : 'galeri'
  );
  const [customAssetName, setCustomAssetName] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredAssets = useMemo(() => {
    return mediaAssets.filter((asset) => {
      const matchCat =
        activeCategory === 'semua' ||
        asset.category === activeCategory ||
        (activeCategory === 'kades' &&
          (asset.category === 'kades' || asset.category === 'perangkat'));
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        asset.name.toLowerCase().includes(q) ||
        asset.category.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [mediaAssets, activeCategory, searchQuery]);

  const handleFileUpload = (file: File) => {
    if (!file) return;
    setIsUploading(true);
    const assetLabel = customAssetName.trim() || file.name.replace(/\.[^/.]+$/, '');

    const saveAssetToServer = async (dataUrl: string, mimeType: string) => {
      const fallbackAsset: MediaAsset = {
        id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: assetLabel,
        category: uploadCategory,
        dataUrl,
        mimeType,
        sizeBytes: Math.round((dataUrl.length * 3) / 4),
        createdAt: new Date().toISOString().split('T')[0],
      };

      try {
        const token = localStorage.getItem('sid_desa_admin_token') || '';
        const res = await fetch('/api/media', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            name: assetLabel,
            category: uploadCategory,
            dataUrl,
            mimeType,
          }),
        });
        if (res.ok) {
          const json = await res.json();
          const saved: MediaAsset = json.asset || fallbackAsset;
          onUploadNewAsset?.(saved);
          onSelect(saved.dataUrl, saved);
          setCustomAssetName('');
          setIsUploading(false);
          return;
        }
      } catch {
        // Fallback local asset
      }
      onUploadNewAsset?.(fallbackAsset);
      onSelect(fallbackAsset.dataUrl, fallbackAsset);
      setCustomAssetName('');
      setIsUploading(false);
    };

    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        if (result) {
          saveAssetToServer(result, 'image/svg+xml');
        } else {
          setIsUploading(false);
        }
      };
      reader.onerror = () => setIsUploading(false);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = uploadCategory === 'logo' ? 400 : 1000;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const keepPng = file.type === 'image/png' || uploadCategory === 'logo';
          const outMime = keepPng ? 'image/png' : 'image/jpeg';
          const compressed = canvas.toDataURL(outMime, keepPng ? 0.9 : 0.84);
          saveAssetToServer(compressed, outMime);
        } else {
          setIsUploading(false);
        }
      };
      img.onerror = () => {
        if (typeof ev.target?.result === 'string') {
          saveAssetToServer(ev.target.result, file.type || 'image/jpeg');
        } else {
          setIsUploading(false);
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.onerror = () => setIsUploading(false);
    reader.readAsDataURL(file);
  };

  const content = (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-lg overflow-hidden text-xs">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-white px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
            <FolderOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-extrabold text-sm sm:text-base">{title}</h3>
              <span className="px-2 py-0.5 rounded-md bg-emerald-400/20 text-emerald-200 font-mono text-[10px] font-bold">
                {mediaAssets.length} Aset Tersimpan
              </span>
            </div>
            <p className="text-[11px] text-emerald-200/90">
              Pilih aset gambar dari database (`mediaAssets`) untuk Hero Banner, Logo Desa, Slide Galeri, Berita, atau Produk UMKM tanpa URL eksternal.
            </p>
          </div>
        </div>

        {isModal && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white self-end sm:self-auto cursor-pointer"
            aria-label="Tutup pemilih media"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Upload Bar & Filter Controls */}
      <div className="p-5 bg-emerald-50/50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Upload new file into mediaAssets */}
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <input
              type="text"
              value={customAssetName}
              onChange={(e) => setCustomAssetName(e.target.value)}
              placeholder="Nama aset baru (opsional)..."
              className="px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs w-44 sm:w-52 outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <select
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value as MediaAsset['category'])}
              className="px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold outline-none"
            >
              <option value="hero">Kategori: Hero Banner</option>
              <option value="logo">Kategori: Logo Desa</option>
              <option value="galeri">Kategori: Slide Galeri</option>
              <option value="berita">Kategori: Berita Desa</option>
              <option value="umkm">Kategori: Produk UMKM</option>
              <option value="pembangunan">Kategori: Proyek Fisik</option>
              <option value="kades">Kategori: Foto Kades/Pamong</option>
              <option value="lainnya">Kategori: Lainnya</option>
            </select>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold flex items-center space-x-1.5 shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {isUploading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              <span>{isUploading ? 'Mengunggah...' : 'Unggah File Baru ke Media DB'}</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />
          </div>

          {/* Search box */}
          <div className="relative w-full lg:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama aset atau kategori..."
              className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs pr-8 outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <Search className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-2.5" />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {CATEGORY_TABS.map((tab) => {
            const active = activeCategory === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveCategory(tab.key)}
                className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition cursor-pointer ${
                  active
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-700 hover:border-emerald-400'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Media Assets Grid */}
      <div className="p-5">
        {filteredAssets.length === 0 ? (
          <div className="text-center py-10 space-y-2 text-gray-400">
            <ImageIcon className="w-8 h-8 mx-auto text-gray-300 dark:text-slate-600" />
            <p className="font-bold text-gray-600 dark:text-gray-300">
              Belum ada aset media pada kategori ini.
            </p>
            <p className="text-[11px]">
              Klik tombol "Unggah File Baru ke Media DB" di atas untuk menambahkan gambar baru.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[440px] overflow-y-auto pr-1">
            {filteredAssets.map((asset) => {
              const isSelected = selectedValue === asset.dataUrl;
              const sizeKb = Math.max(1, Math.round((asset.sizeBytes || asset.dataUrl.length * 0.75) / 1024));

              return (
                <div
                  key={asset.id}
                  className={`group rounded-2xl border transition flex flex-col justify-between overflow-hidden ${
                    isSelected
                      ? 'border-emerald-600 ring-2 ring-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/30'
                      : 'border-gray-200 dark:border-slate-700 bg-gray-50/70 dark:bg-slate-800/60 hover:border-emerald-400'
                  }`}
                >
                  <div>
                    {/* Thumbnail */}
                    <div className="relative h-32 bg-slate-900/5 dark:bg-slate-950 flex items-center justify-center overflow-hidden border-b border-gray-200/70 dark:border-slate-700">
                      <img
                        src={asset.dataUrl}
                        alt={asset.name}
                        className={`w-full h-full ${
                          asset.category === 'logo' ? 'object-contain p-3' : 'object-cover'
                        }`}
                      />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-slate-900/80 text-white text-[10px] font-bold uppercase">
                        {asset.category}
                      </span>
                      {isSelected && (
                        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold flex items-center space-x-1 shadow">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Aktif</span>
                        </span>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="p-3 space-y-1">
                      <p
                        className="font-bold text-gray-900 dark:text-white truncate text-xs"
                        title={asset.name}
                      >
                        {asset.name}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                        <span className="inline-flex items-center space-x-1">
                          <Database className="w-3 h-3 text-emerald-600" />
                          <span>{sizeKb} KB</span>
                        </span>
                        <span>{asset.createdAt}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="px-3 pb-3 pt-1 space-y-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(asset.dataUrl, asset);
                        if (isModal && onClose) onClose();
                      }}
                      className="w-full py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center justify-center space-x-1.5 transition cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isSelected ? 'Terpilih' : 'Pilih Media Ini'}</span>
                    </button>

                    {/* Quick Assign Shortcuts when used inside Admin Dashboard */}
                    {(onApplyToHero || onApplyToLogo || onAddToGallerySlide || onDeleteAsset) && (
                      <div className="flex flex-wrap items-center justify-between gap-1 pt-1 border-t border-gray-200/70 dark:border-slate-700">
                        {onApplyToHero && (
                          <button
                            type="button"
                            onClick={() => onApplyToHero(asset)}
                            className="text-[10px] font-bold text-teal-700 dark:text-teal-300 hover:underline inline-flex items-center space-x-0.5 cursor-pointer"
                            title="Gunakan gambar ini sebagai Hero Banner Beranda"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Set Hero</span>
                          </button>
                        )}
                        {onApplyToLogo && (
                          <button
                            type="button"
                            onClick={() => onApplyToLogo(asset)}
                            className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 hover:underline inline-flex items-center space-x-0.5 cursor-pointer"
                            title="Gunakan gambar ini sebagai Logo Resmi Desa"
                          >
                            <Layers className="w-3 h-3" />
                            <span>Set Logo</span>
                          </button>
                        )}
                        {onAddToGallerySlide && (
                          <button
                            type="button"
                            onClick={() => onAddToGallerySlide(asset)}
                            className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center space-x-0.5 cursor-pointer"
                            title="Tambahkan aset ini sebagai Slide Galeri Kegiatan Desa"
                          >
                            <Plus className="w-3 h-3" />
                            <span>+Slide Galeri</span>
                          </button>
                        )}
                        {onDeleteAsset && mediaAssets.length > 1 && (
                          <button
                            type="button"
                            onClick={() => onDeleteAsset(asset.id)}
                            className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded cursor-pointer ml-auto"
                            title="Hapus aset dari database"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
        <div className="w-full max-w-4xl my-8">{content}</div>
      </div>
    );
  }

  return content;
};
