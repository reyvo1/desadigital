import React from 'react';
import { Bell, CheckCheck, MessageSquare, Phone, ShieldCheck, X } from 'lucide-react';
import { VillageSiteConfig } from '../types/village';

export interface WhatsAppLogEntry {
  id: string;
  timestamp: string;
  recipientName: string;
  recipientPhone: string;
  trackingCode: string;
  statusLabel: string;
  message: string;
}

interface WhatsAppSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: WhatsAppLogEntry[];
  siteConfig: VillageSiteConfig;
}

export const WhatsAppSimulatorModal: React.FC<WhatsAppSimulatorModalProps> = ({
  isOpen,
  onClose,
  logs,
  siteConfig,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-emerald-100 dark:border-slate-800 shadow-2xl overflow-hidden my-8">
        <div className="bg-gradient-to-r from-emerald-700 to-green-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base">Pusat Notifikasi Real-Time & Log WhatsApp</h3>
              <p className="text-xs text-emerald-100">
                Riwayat pesan otomatis perubahan status dokumen ke nomor WhatsApp warga
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 max-h-[70vh] overflow-y-auto space-y-3 bg-emerald-50/40 dark:bg-slate-950/60">
          {logs.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-500">
              Belum ada riwayat pengiriman notifikasi WhatsApp pada sesi ini.
            </div>
          ) : (
            logs.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-emerald-200/80 dark:border-slate-800 shadow-sm space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-[11px]">
                      <Phone className="w-3 h-3" />
                      <span>{item.recipientPhone}</span>
                    </span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {item.recipientName}
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-400 flex items-center space-x-1">
                    <span>{item.timestamp}</span>
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-slate-800 text-xs font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed border border-emerald-100 dark:border-slate-700">
                  {item.message}
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                  <span>Tiket: {item.trackingCode}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1">
                    <Bell className="w-3 h-3" />
                    <span>Log Notifikasi: {item.statusLabel}</span>
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-6 py-3 bg-gray-50 dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 flex items-center justify-between text-xs text-gray-500">
          <span className="inline-flex items-center space-x-1 text-emerald-700 dark:text-emerald-400 font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Layanan Notifikasi WhatsApp {siteConfig.villageName}</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
