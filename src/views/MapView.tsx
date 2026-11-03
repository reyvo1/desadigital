import React, { useEffect, useMemo, useState } from 'react';
import {
  Clock,
  Compass,
  ExternalLink,
  Layers,
  Map as MapIcon,
  MapPin,
  Navigation,
  Phone,
  User,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { MapFacility, VillageHamlet, VillageSiteConfig } from '../types/village';

interface MapViewProps {
  facilities: MapFacility[];
  siteConfig: VillageSiteConfig;
  hamlets?: VillageHamlet[];
}

export const MapView: React.FC<MapViewProps> = ({
  facilities,
  siteConfig,
  hamlets = [],
}) => {
  const [selectedFacility, setSelectedFacility] = useState<MapFacility | null>(
    facilities[0] || null
  );
  const [categoryFilter, setCategoryFilter] = useState<string>('Semua');
  const [mapMode, setMapMode] = useState<'osm' | 'spatial'>('osm');
  const [bboxDelta, setBboxDelta] = useState<number>(0.008);

  useEffect(() => {
    if (facilities.length > 0 && (!selectedFacility || !facilities.some((f) => f.id === selectedFacility.id))) {
      setSelectedFacility(facilities[0]);
    }
  }, [facilities, selectedFacility]);

  const categories = useMemo(() => {
    const base =
      siteConfig.facilityCategories && siteConfig.facilityCategories.length > 0
        ? siteConfig.facilityCategories
        : ['Semua', 'Pemerintahan', 'Kesehatan', 'Pendidikan', 'Ibadah', 'Ekonomi', 'Wisata & Olahraga'];
    const dynamic = facilities.map((f) => f.category).filter(Boolean);
    return Array.from(new Set([...base, ...dynamic]));
  }, [facilities, siteConfig.facilityCategories]);

  const filteredFacilities = useMemo(() => {
    if (categoryFilter === 'Semua') return facilities;
    return facilities.filter((fac) => fac.category === categoryFilter);
  }, [facilities, categoryFilter]);

  const getCategoryColor = (cat: string) => {
    if (siteConfig.facilityCategoryColors && siteConfig.facilityCategoryColors[cat]) {
      return siteConfig.facilityCategoryColors[cat];
    }
    switch (cat) {
      case 'Pemerintahan':
        return '#047857';
      case 'Kesehatan':
        return '#e11d48';
      case 'Pendidikan':
        return '#2563eb';
      case 'Ibadah':
        return '#059669';
      case 'Ekonomi':
      case 'Ekonomi & BUMDes':
        return '#d97706';
      case 'Wisata & Olahraga':
      case 'Wisata & Ruang Terbuka':
        return '#16a34a';
      default:
        return '#0f766e';
    }
  };

  const activeLat = selectedFacility?.lat ?? -6.6542;
  const activeLng = selectedFacility?.lng ?? 106.9035;
  const minLon = (activeLng - bboxDelta).toFixed(5);
  const minLat = (activeLat - bboxDelta * 0.7).toFixed(5);
  const maxLon = (activeLng + bboxDelta).toFixed(5);
  const maxLat = (activeLat + bboxDelta * 0.7).toFixed(5);
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${minLon}%2C${minLat}%2C${maxLon}%2C${maxLat}&layer=mapnik&marker=${activeLat}%2C${activeLng}`;
  const osmDirectUrl = `https://www.openstreetmap.org/?mlat=${activeLat}&mlon=${activeLng}#map=16/${activeLat}/${activeLng}`;

  const hamletLabels = useMemo(() => {
    if (hamlets.length >= 3) {
      return [hamlets[0].name, hamlets[1].name, hamlets[2].name];
    }
    const fromFac = Array.from(new Set(facilities.map((f) => f.dusun).filter(Boolean)));
    const fallbackDusun = siteConfig.defaults?.dusun || 'Wilayah Dusun I';
    return [
      fromFac[0] || fallbackDusun,
      fromFac[1] || 'Wilayah Dusun II',
      fromFac[2] || 'Wilayah Dusun III',
    ];
  }, [hamlets, facilities, siteConfig.defaults?.dusun]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1">
            <Compass className="w-4 h-4" />
            <span>Sistem Informasi Geografis (WebGIS) • {facilities.length} Titik Fasilitas</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
            Peta Interaktif Fasilitas & Wilayah {siteConfig.villageName}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Peta geospasial real-time berbasis OpenStreetMap & pemetaan batas wilayah administratif {siteConfig.villageName} ({siteConfig.mapEmbedCoordinates}).
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="inline-flex rounded-xl bg-white dark:bg-slate-900 p-1 border border-gray-200 dark:border-slate-800 shadow-xs self-start">
          <button
            onClick={() => setMapMode('osm')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer ${
              mapMode === 'osm'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>Peta Satelit / OpenStreetMap Nyata</span>
          </button>
          <button
            onClick={() => setMapMode('spatial')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer ${
              mapMode === 'spatial'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Denah Tematik Wilayah Dusun</span>
          </button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap items-center gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              categoryFilter === cat
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-800 hover:border-emerald-500'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Main Map + Facility Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-4">
          {mapMode === 'osm' ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-lg border border-gray-200 dark:border-slate-800">
              <div className="px-4 py-3 bg-emerald-950 text-white flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-bold">
                    OpenStreetMap Geospasial: {selectedFacility?.name || siteConfig.villageName}
                  </span>
                  <span className="font-mono text-emerald-300 text-[11px]">
                    ({activeLat.toFixed(5)}, {activeLng.toFixed(5)})
                  </span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => setBboxDelta((d) => Math.max(0.002, d * 0.65))}
                    className="p-1.5 rounded-lg bg-emerald-900 hover:bg-emerald-800 text-emerald-100 cursor-pointer"
                    title="Perbesar Peta"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setBboxDelta((d) => Math.min(0.03, d * 1.4))}
                    className="p-1.5 rounded-lg bg-emerald-900 hover:bg-emerald-800 text-emerald-100 cursor-pointer"
                    title="Perkecil Peta"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <a
                    href={osmDirectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold"
                  >
                    <span>OSM Penuh</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="relative aspect-[16/10] w-full bg-slate-100 dark:bg-slate-800">
                <iframe
                  title={`Peta OpenStreetMap ${selectedFacility?.name || siteConfig.villageName}`}
                  src={osmEmbedUrl}
                  className="w-full h-full border-0"
                  loading="lazy"
                />
              </div>

              {/* Interactive Facility Selector Strip below Map */}
              <div className="p-3 bg-gray-50 dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto">
                {filteredFacilities.map((fac) => {
                  const active = selectedFacility?.id === fac.id;
                  return (
                    <button
                      key={fac.id}
                      onClick={() => setSelectedFacility(fac)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 shrink-0 transition cursor-pointer ${
                        active
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-700 hover:border-emerald-500'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: active ? '#fff' : getCategoryColor(fac.category) }}
                      />
                      <span>{fac.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-emerald-950 rounded-2xl overflow-hidden shadow-lg border border-emerald-800 relative aspect-[16/11] select-none">
              <svg className="w-full h-full" viewBox="0 0 1000 700">
                <defs>
                  <linearGradient id="forestGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#064e3b" />
                    <stop offset="50%" stopColor="#065f46" />
                    <stop offset="100%" stopColor="#047857" />
                  </linearGradient>
                </defs>

                <path
                  d="M 120 180 Q 250 80 500 90 T 880 160 Q 940 350 870 540 T 520 640 Q 240 630 110 480 Z"
                  fill="url(#forestGrad)"
                  stroke="#34d399"
                  strokeWidth="4"
                  strokeDasharray="8,6"
                />

                <path
                  d="M 160 220 Q 300 160 480 200 L 490 420 Q 280 430 150 360 Z"
                  fill="#10b981"
                  fillOpacity="0.15"
                />
                <text x="220" y="270" fill="#a7f3d0" fontSize="15" fontWeight="bold" opacity="0.85">
                  {hamletLabels[0].toUpperCase()}
                </text>

                <path
                  d="M 490 200 Q 720 170 820 250 L 800 480 Q 560 460 490 420 Z"
                  fill="#059669"
                  fillOpacity="0.2"
                />
                <text x="560" y="270" fill="#a7f3d0" fontSize="15" fontWeight="bold" opacity="0.85">
                  {hamletLabels[1].toUpperCase()}
                </text>

                <path
                  d="M 220 440 Q 520 440 780 480 Q 680 600 460 610 Q 250 580 220 440 Z"
                  fill="#047857"
                  fillOpacity="0.3"
                />
                <text x="380" y="540" fill="#a7f3d0" fontSize="15" fontWeight="bold" opacity="0.85">
                  {hamletLabels[2].toUpperCase()}
                </text>

                <path
                  d="M 130 190 Q 260 300 420 320 T 700 420 T 870 520"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="10"
                  strokeLinecap="round"
                  opacity="0.8"
                />
                <path
                  d="M 200 620 L 350 490 L 500 340 L 700 240 L 850 170"
                  fill="none"
                  stroke="#fef08a"
                  strokeWidth="7"
                  strokeLinecap="round"
                />
                <text x="320" y="440" fill="#fef08a" fontSize="12" fontWeight="bold">
                  Poros Utama {siteConfig.villageName}
                </text>
              </svg>

              {filteredFacilities.map((fac) => {
                const isSelected = selectedFacility?.id === fac.id;
                return (
                  <div
                    key={fac.id}
                    style={{
                      left: `${fac.xPercent || 50}%`,
                      top: `${fac.yPercent || 50}%`,
                    }}
                    onClick={() => setSelectedFacility(fac)}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-20"
                  >
                    {isSelected && (
                      <span className="absolute -inset-2 rounded-full bg-emerald-400 opacity-75 animate-ping pointer-events-none" />
                    )}
                    <div
                      className={`px-2.5 py-1.5 rounded-xl flex items-center space-x-1.5 shadow-xl transition-all duration-300 font-bold text-xs ${
                        isSelected
                          ? 'bg-white text-emerald-950 ring-4 ring-emerald-400 scale-110 z-30'
                          : 'bg-emerald-900/90 text-white border border-emerald-400/80 hover:scale-105'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: getCategoryColor(fac.category) }}
                      />
                      <span className="whitespace-nowrap hidden sm:inline">{fac.name}</span>
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                  </div>
                );
              })}

              <div className="absolute top-3 left-3 bg-emerald-950/85 border border-emerald-500/40 px-3 py-1.5 rounded-xl text-[11px] text-emerald-200">
                Denah Skematik Wilayah Dusun (Klik titik lokasi untuk detail)
              </div>
            </div>
          )}

          {/* Batas Wilayah Administratif Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-200 dark:border-slate-800 shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/60">
              <span className="text-gray-400 font-bold uppercase text-[10px]">Batas Utara</span>
              <p className="font-bold text-gray-900 dark:text-white mt-0.5">{siteConfig.boundaries.north}</p>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/60">
              <span className="text-gray-400 font-bold uppercase text-[10px]">Batas Selatan</span>
              <p className="font-bold text-gray-900 dark:text-white mt-0.5">{siteConfig.boundaries.south}</p>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/60">
              <span className="text-gray-400 font-bold uppercase text-[10px]">Batas Timur</span>
              <p className="font-bold text-gray-900 dark:text-white mt-0.5">{siteConfig.boundaries.east}</p>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/60">
              <span className="text-gray-400 font-bold uppercase text-[10px]">Batas Barat</span>
              <p className="font-bold text-gray-900 dark:text-white mt-0.5">{siteConfig.boundaries.west}</p>
            </div>
          </div>
        </div>

        {/* Selected Facility Details Panel */}
        {selectedFacility && (
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-800 shadow-lg">
            {selectedFacility.imageUrl && (
              <div className="h-44 bg-emerald-950 relative overflow-hidden">
                <img
                  src={selectedFacility.imageUrl}
                  alt={selectedFacility.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span
                  className="text-xs font-bold px-3 py-1 rounded-xl text-white"
                  style={{ backgroundColor: getCategoryColor(selectedFacility.category) }}
                >
                  {selectedFacility.category}
                </span>
                <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
                  {selectedFacility.lat.toFixed(4)}, {selectedFacility.lng.toFixed(4)}
                </span>
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-gray-900 dark:text-white">
                  {selectedFacility.name}
                </h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
                  Wilayah: {selectedFacility.dusun}
                </p>
              </div>

              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                {selectedFacility.description}
              </p>

              <div className="space-y-2.5 pt-3 border-t border-gray-100 dark:border-slate-800 text-xs text-gray-600 dark:text-gray-300">
                <div className="flex items-start space-x-2.5">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{selectedFacility.address}</span>
                </div>
                <div className="flex items-start space-x-2.5">
                  <Clock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{selectedFacility.operatingHours}</span>
                </div>
                {selectedFacility.contactPerson && (
                  <div className="flex items-start space-x-2.5">
                    <User className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Penanggung Jawab: {selectedFacility.contactPerson}</span>
                  </div>
                )}
                {selectedFacility.phone && (
                  <div className="flex items-start space-x-2.5">
                    <Phone className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="font-mono">{selectedFacility.phone}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 grid grid-cols-1 gap-2">
                <a
                  href={`https://www.openstreetmap.org/directions?from=&to=${selectedFacility.lat}%2C${selectedFacility.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition shadow-xs"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Navigasi Rute OpenStreetMap</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
