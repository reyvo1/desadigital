import React, { useMemo, useState } from 'react';
import { Calendar, Camera, MapPin, Users, X } from 'lucide-react';
import { GalleryItem, VillageSiteConfig } from '../types/village';

const FALLBACK_SVG_URI = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500"><rect width="800" height="500" fill="#064e3b"/><circle cx="650" cy="120" r="70" fill="#fbbf24" fill-opacity="0.7"/><text x="50" y="420" font-family="Arial, sans-serif" font-weight="bold" font-size="28" fill="#ffffff">Galeri Dokumentasi Desa</text></svg>`
)}`;

interface GalleryViewProps {
  gallery: GalleryItem[];
  siteConfig?: VillageSiteConfig;
}

const DEFAULT_CATEGORIES: string[] = [
  'Semua',
  'Gotong Royong',
  'Pembangunan',
  'Budaya & Seni',
  'UMKM & Panen',
  'Pemerintahan',
];

export const GalleryView: React.FC<GalleryViewProps> = ({ gallery, siteConfig }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [activeItem, setActiveItem] = useState<GalleryItem | null>(null);
  const villageName = siteConfig?.villageName || 'Pemerintah Desa';

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    if (target.src !== FALLBACK_SVG_URI) {
      target.src = FALLBACK_SVG_URI;
    }
  };

  const categories = useMemo(() => {
    const base =
      siteConfig?.galleryCategories && siteConfig.galleryCategories.length > 0
        ? siteConfig.galleryCategories
        : DEFAULT_CATEGORIES;
    return Array.from(new Set([...base, ...gallery.map((g) => g.category)]));
  }, [gallery, siteConfig?.galleryCategories]);

  const filtered =
    selectedCategory === 'Semua'
      ? gallery
      : gallery.filter((g) => g.category === selectedCategory);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <Camera className="w-4 h-4" />
            <span>Dokumentasi Publik & Transparansi Kegiatan</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mt-1">
            Galeri Kegiatan & Pembangunan {villageName}
          </h1>
        </div>

        {/* Category Filter Buttons */}
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:border-emerald-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Photo Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((item) => (
          <div
            key={item.id}
            onClick={() => setActiveItem(item)}
            className="group bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-gray-200/80 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="relative h-52 overflow-hidden">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  onError={handleImgError}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-sm text-emerald-300 text-[10px] font-bold uppercase">
                  {item.category}
                </span>
              </div>

              <div className="p-5 space-y-2">
                <h3 className="font-bold text-gray-900 dark:text-white text-sm group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>

            <div className="px-5 pb-4 pt-2 border-t border-gray-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
              <span className="flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>{item.date}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>{item.participantsCount || 50} Warga</span>
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full overflow-hidden border border-gray-200 dark:border-slate-800 shadow-2xl">
            <div className="relative h-72 sm:h-80">
              <img
                src={activeItem.imageUrl}
                alt={activeItem.title}
                onError={handleImgError}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setActiveItem(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <span className="absolute bottom-4 left-4 px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold">
                {activeItem.category}
              </span>
            </div>
            <div className="p-6 space-y-3">
              <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">
                {activeItem.title}
              </h3>
              <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>{activeItem.date}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>{activeItem.location}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>Partisipasi: {activeItem.participantsCount || 50} Peserta</span>
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed pt-2 border-t border-gray-100 dark:border-slate-800">
                {activeItem.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
