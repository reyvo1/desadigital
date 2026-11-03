import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Database,
  FolderOpen,
  Image as ImageIcon,
  Link2,
  RefreshCw,
  Upload,
} from 'lucide-react';
import { MediaAsset } from '../types/village';
import { MediaGalleryPicker } from './MediaGalleryPicker';

interface ImageUploadFieldProps {
  label: string;
  value: string;
  onChange: (newDataUrlOrUrl: string) => void;
  domain?: string;
  category?: string;
  isLogo?: boolean;
  helperText?: string;
  aspectRatio?: 'square' | 'landscape' | 'logo';
  maxWidthPx?: number;
  presets?: { name: string; dataUrl: string }[];
  mediaAssets?: MediaAsset[];
  onUploadNewAsset?: (asset: MediaAsset) => void;
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  label,
  value,
  onChange,
  domain,
  category,
  isLogo,
  helperText = 'Pilih dari Pustaka Media (`mediaAssets`) atau unggah file foto baru — otomatis disimpan di Database.',
  aspectRatio,
  maxWidthPx = 900,
  presets,
  mediaAssets: propMediaAssets,
  onUploadNewAsset,
}) => {
  const effectiveDomain = domain || category || 'lainnya';
  const effectiveAspect = aspectRatio || (isLogo ? 'logo' : 'landscape');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [localMediaAssets, setLocalMediaAssets] = useState<MediaAsset[]>(propMediaAssets || []);
  const [dragOver, setDragOver] = useState(false);
  const [lastUploadedName, setLastUploadedName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (propMediaAssets && propMediaAssets.length > 0) {
      setLocalMediaAssets(propMediaAssets);
    }
  }, [propMediaAssets]);

  const handleOpenPicker = async () => {
    setIsPickerOpen(true);
    if (!propMediaAssets || propMediaAssets.length === 0) {
      try {
        const res = await fetch('/api/db');
        if (res.ok) {
          const db = await res.json();
          if (Array.isArray(db?.mediaAssets)) {
            setLocalMediaAssets(db.mediaAssets);
          }
        }
      } catch {
        // Use existing localMediaAssets
      }
    }
  };

  const isStoredInDatabase = value?.startsWith('data:image/');
  const estimatedSizeKb = isStoredInDatabase
    ? Math.max(1, Math.round((value.length * 0.75) / 1024))
    : null;

  const processFileToDatabase = (file: File) => {
    if (!file) return;
    setIsProcessing(true);
    setLastUploadedName(file.name);

    const persistAsset = async (dataUrl: string, mimeType: string) => {
      onChange(dataUrl);
      try {
        const token = localStorage.getItem('sid_desa_admin_token') || '';
        const res = await fetch('/api/media', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            name: file.name,
            mimeType,
            dataUrl,
            category: effectiveDomain,
          }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json?.asset) {
            setLocalMediaAssets((prev) => [json.asset, ...prev]);
            onUploadNewAsset?.(json.asset);
          }
        }
      } catch {}
      setIsProcessing(false);
    };

    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        if (result) {
          persistAsset(result, file.type);
        } else {
          setIsProcessing(false);
        }
      };
      reader.onerror = () => setIsProcessing(false);
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

        const targetMax = effectiveAspect === 'logo' ? 400 : maxWidthPx;
        if (width > targetMax || height > targetMax) {
          if (width > height) {
            height = Math.round((height * targetMax) / width);
            width = targetMax;
          } else {
            width = Math.round((width * targetMax) / height);
            height = targetMax;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const keepPng = file.type === 'image/png' || effectiveAspect === 'logo';
          const outMime = keepPng ? 'image/png' : 'image/jpeg';
          const compressedDataUrl = canvas.toDataURL(outMime, keepPng ? 0.9 : 0.82);
          persistAsset(compressedDataUrl, outMime);
        } else {
          setIsProcessing(false);
        }
      };
      img.onerror = () => {
        if (typeof ev.target?.result === 'string') {
          persistAsset(ev.target.result, file.type || 'image/jpeg');
        } else {
          setIsProcessing(false);
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.onerror = () => setIsProcessing(false);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processFileToDatabase(file);
    }
  };

  return (
    <div className="space-y-2 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="font-bold text-gray-700 dark:text-gray-200 flex items-center space-x-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
          <span>{label}</span>
        </label>

        <div className="flex items-center space-x-2">
          {isStoredInDatabase ? (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold text-[10px]">
              <Database className="w-3 h-3" />
              <span>Tersimpan di Database ({estimatedSizeKb} KB)</span>
            </span>
          ) : value ? (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-blue-300 font-semibold text-[10px]">
              <span>Media Terhubung</span>
            </span>
          ) : null}

          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline flex items-center space-x-1 cursor-pointer"
          >
            <Link2 className="w-3 h-3" />
            <span>{showUrlInput ? 'Tutup Input Path/URL' : 'Input Path/URL'}</span>
          </button>
        </div>
      </div>

      {/* Upload Box & Live Preview */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`p-3.5 rounded-2xl border-2 border-dashed transition flex flex-col sm:flex-row items-center gap-4 ${
          dragOver
            ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30'
            : 'border-gray-300 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-900/50 hover:border-emerald-400'
        }`}
      >
        {/* Preview Thumbnail */}
        <div
          className={`relative overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 ${
            effectiveAspect === 'logo'
              ? 'w-20 h-20 p-2'
              : effectiveAspect === 'square'
              ? 'w-20 h-20'
              : 'w-32 h-20'
          }`}
        >
          {value ? (
            <img
              src={value}
              alt={label}
              referrerPolicy="no-referrer"
              className={`w-full h-full ${
                effectiveAspect === 'logo' ? 'object-contain' : 'object-cover'
              }`}
            />
          ) : (
            <ImageIcon className="w-7 h-7 text-gray-300 dark:text-slate-600" />
          )}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
              <RefreshCw className="w-5 h-5 animate-spin" />
            </div>
          )}
        </div>

        {/* Upload & MediaGalleryPicker Actions */}
        <div className="flex-1 space-y-2 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <button
              type="button"
              onClick={handleOpenPicker}
              className="bg-teal-700 hover:bg-teal-800 text-white px-3.5 py-2 rounded-xl font-bold text-xs flex items-center space-x-1.5 shadow-xs transition cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Pilih dari Pustaka Media (`mediaAssets`)</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl font-bold text-xs flex items-center space-x-1.5 shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isProcessing ? 'Menyimpan ke DB...' : 'Unggah File Baru'}</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  processFileToDatabase(file);
                }
              }}
            />

            {lastUploadedName && (
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="truncate max-w-[160px]">{lastUploadedName}</span>
              </span>
            )}
          </div>

          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
            {helperText}
          </p>

          {/* Optional Presets (e.g., for Village Logo) */}
          {presets && presets.length > 0 && (
            <div className="pt-1 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Template Cepat:</span>
              {presets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onChange(preset.dataUrl)}
                  className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-emerald-500 text-[10px] font-semibold text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Collapsible URL/Path Input */}
      {showUrlInput && (
        <div className="pt-1">
          <input
            type="text"
            value={isStoredInDatabase ? '' : value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Masukkan referensi path atau URL gambar..."
            className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs"
          />
        </div>
      )}

      {/* MediaGalleryPicker Modal */}
      {isPickerOpen && (
        <MediaGalleryPicker
          isModal={true}
          onClose={() => setIsPickerOpen(false)}
          mediaAssets={propMediaAssets && propMediaAssets.length > 0 ? propMediaAssets : localMediaAssets}
          selectedValue={value}
          defaultCategory={effectiveDomain}
          title={`Pilih Media untuk: ${label}`}
          onSelect={(selectedDataUrl, asset) => {
            onChange(selectedDataUrl);
            setLastUploadedName(asset.name);
            setIsPickerOpen(false);
          }}
          onUploadNewAsset={(newAsset) => {
            setLocalMediaAssets((prev) => [newAsset, ...prev]);
            onUploadNewAsset?.(newAsset);
          }}
        />
      )}
    </div>
  );
};
