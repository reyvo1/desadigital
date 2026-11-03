import React, { useEffect, useRef, useState } from 'react';
import {
  Bot,
  ExternalLink,
  MessageCircle,
  Phone,
  RefreshCw,
  Send,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { ChatMessage, VillageSiteConfig } from '../types/village';

interface LiveChatWidgetProps {
  siteConfig: VillageSiteConfig;
  chatMessages: ChatMessage[];
  onUpdateChatMessages: (messages: ChatMessage[]) => void;
}

export const LiveChatWidget: React.FC<LiveChatWidgetProps> = ({
  siteConfig,
  chatMessages,
  onUpdateChatMessages,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeChannel, setActiveChannel] = useState<'web' | 'whatsapp' | 'telegram'>('web');
  const [senderName, setSenderName] = useState(siteConfig.defaults?.senderName || 'Warga Desa');
  const [senderPhone, setSenderPhone] = useState('');
  const [inputText, setInputText] = useState('');
  const [askAiEnabled, setAskAiEnabled] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [externalRedirectUrl, setExternalRedirectUrl] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, chatMessages.length]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText ?? inputText).trim();
    if (!textToSend || isSending) return;

    setIsSending(true);
    setExternalRedirectUrl(null);
    if (!customText) setInputText('');

    try {
      if (activeChannel === 'whatsapp') {
        const res = await fetch('/api/integrations/whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: siteConfig.officialWhatsApp,
            recipientName: `Perangkat ${siteConfig.villageName}`,
            message: `[Live Chat Warga - ${senderName} (${senderPhone || '-'})]: ${textToSend}`,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.waUrl) {
            setExternalRedirectUrl(data.waUrl);
          }
        }
      } else if (activeChannel === 'telegram') {
        const res = await fetch('/api/integrations/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatId: siteConfig.telegramBotUsername || 'public',
            recipientName: `Telegram ${siteConfig.villageName}`,
            message: `[Telegram Warga - ${senderName}]: ${textToSend}`,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.shareUrl || data.tgChannelUrl) {
            setExternalRedirectUrl(data.shareUrl || data.tgChannelUrl);
          }
        }
      }

      // Also save message & trigger server-side AI / admin inbox via /api/chat
      const chatRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'warga-portal',
          senderName: senderName.trim() || siteConfig.defaults?.senderName || 'Warga Desa',
          senderPhone: senderPhone.trim() || '-',
          senderRole: 'citizen',
          channel: activeChannel,
          message: textToSend,
          askAi: askAiEnabled,
        }),
      });

      if (chatRes.ok) {
        const data = await chatRes.json();
        if (Array.isArray(data.messages)) {
          onUpdateChatMessages(data.messages);
        }
      }
    } catch {
      // Fallback local message if offline
      const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
      const fallbackUserMsg: ChatMessage = {
        id: `chat-local-${Date.now()}`,
        sessionId: 'warga-portal',
        senderName: senderName.trim() || 'Warga Desa',
        senderPhone: senderPhone.trim() || '-',
        senderRole: 'citizen',
        channel: activeChannel,
        message: textToSend,
        timestamp: now,
        isRead: false,
      };
      onUpdateChatMessages([...chatMessages, fallbackUserMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const cleanWaNumber = siteConfig.officialWhatsApp.replace(/\D/g, '');
  const cleanTelegramUrl = (siteConfig.socialMedia.telegram || 't.me/pemdes_sukamaju').startsWith(
    'http'
  )
    ? siteConfig.socialMedia.telegram!
    : `https://${(siteConfig.socialMedia.telegram || 't.me/pemdes_sukamaju').replace(/^@/, 't.me/')}`;

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {/* Floating Chat Panel */}
      {isOpen ? (
        <div className="w-[330px] sm:w-[370px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-emerald-500/40 dark:border-slate-700 overflow-hidden flex flex-col max-h-[520px]">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-900 text-white p-4 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h4 className="font-extrabold text-xs sm:text-sm">
                    Live Chat {siteConfig.villageName}
                  </h4>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <p className="text-[10px] text-emerald-200">
                  Perangkat Desa • Asisten AI • WA & Telegram API
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              aria-label="Tutup Live Chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Channel Selector (Web Live Chat / WhatsApp API / Telegram API) */}
          <div className="grid grid-cols-3 gap-1 p-2 bg-emerald-50/80 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-800 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setActiveChannel('web')}
              className={`py-1.5 px-2 rounded-xl flex items-center justify-center space-x-1 transition cursor-pointer ${
                activeChannel === 'web'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-slate-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Web & AI</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveChannel('whatsapp')}
              className={`py-1.5 px-2 rounded-xl flex items-center justify-center space-x-1 transition cursor-pointer ${
                activeChannel === 'whatsapp'
                  ? 'bg-green-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-slate-700'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>WhatsApp API</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveChannel('telegram')}
              className={`py-1.5 px-2 rounded-xl flex items-center justify-center space-x-1 transition cursor-pointer ${
                activeChannel === 'telegram'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-slate-700'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Telegram API</span>
            </button>
          </div>

          {/* Sender Identity Compact Bar */}
          <div className="px-3 py-2 bg-gray-50 dark:bg-slate-800/40 border-b border-gray-100 dark:border-slate-800 flex items-center gap-2 text-[11px]">
            <input
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Nama Anda"
              className="w-1/2 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] outline-none"
            />
            <input
              type="text"
              value={senderPhone}
              onChange={(e) => setSenderPhone(e.target.value)}
              placeholder="No. WA/Telegram (Opsional)"
              className="w-1/2 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-mono outline-none"
            />
          </div>

          {/* Chat Messages History */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-slate-50/60 dark:bg-slate-950/50 max-h-[260px] text-xs">
            {/* Greeting */}
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-100 text-[11px] leading-relaxed">
              <p className="font-bold text-emerald-800 dark:text-emerald-300 mb-0.5">
                Layanan Resmi Pemerintah {siteConfig.villageName}
              </p>
              <p>
                {siteConfig.liveChatGreeting ||
                  'Silakan tanyakan syarat surat, lacak tiket permohonan, jadwal kegiatan, atau produk UMKM kepada Perangkat Desa & Asisten AI.'}
              </p>
            </div>

            {chatMessages.map((msg) => {
              const isCitizen = msg.senderRole === 'citizen';
              const isAi = msg.senderRole === 'ai';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isCitizen ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center space-x-1 text-[10px] text-gray-400 mb-0.5 px-1">
                    {isAi ? (
                      <Bot className="w-3 h-3 text-teal-500" />
                    ) : (
                      <User className="w-3 h-3 text-emerald-600" />
                    )}
                    <span className="font-semibold text-gray-600 dark:text-gray-300">
                      {msg.senderName}
                    </span>
                    <span>•</span>
                    <span className="uppercase font-mono text-[9px]">{msg.channel}</span>
                  </div>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[11px] leading-relaxed whitespace-pre-line ${
                      isCitizen
                        ? 'bg-emerald-600 text-white rounded-br-xs shadow-xs'
                        : isAi
                        ? 'bg-teal-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-teal-200 dark:border-teal-800 rounded-bl-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-gray-200 dark:border-slate-700 rounded-bl-xs shadow-2xs'
                    }`}
                  >
                    {msg.message}
                  </div>
                  <span className="text-[9px] text-gray-400 mt-0.5 px-1">{msg.timestamp}</span>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* External WA / Telegram Direct Link Banner */}
          {externalRedirectUrl && (
            <div className="px-3.5 py-2 bg-emerald-900 text-white flex items-center justify-between text-[11px]">
              <span>Pesan tercatat di gateway desa!</span>
              <a
                href={externalRedirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 font-bold text-amber-300 hover:underline"
              >
                <span>Lanjutkan di Aplikasi</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Quick Prompt Suggestions */}
          <div className="px-3 py-1.5 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              'Syarat Surat SKU & SKTM',
              'Cek Tiket SKTM-2026-001',
              'Jadwal Kegiatan Desa',
              'Transparansi APBDes',
            ].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleSendMessage(q)}
                className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-950 text-gray-700 dark:text-gray-300 text-[10px] font-semibold whitespace-nowrap transition cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Form & Direct WA/Telegram Links */}
          <div className="p-3 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 space-y-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ketik pesan ke Admin / AI Desa..."
                className="flex-1 px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={isSending || !inputText.trim()}
                className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition cursor-pointer shrink-0"
                aria-label="Kirim Pesan Live Chat"
              >
                {isSending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>

            <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400">
              <label className="inline-flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={askAiEnabled}
                  onChange={(e) => setAskAiEnabled(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                <span>Balasan Instan AI Desa ({siteConfig.aiModel || 'gemini-3.8-flash'})</span>
              </label>

              <div className="flex items-center space-x-2 font-bold">
                <a
                  href={`https://wa.me/${cleanWaNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-600 dark:text-green-400 hover:underline"
                >
                  WA Direct
                </a>
                <span>•</span>
                <a
                  href={cleanTelegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-600 dark:text-sky-400 hover:underline"
                >
                  Telegram
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="group bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 text-white px-3.5 py-2.5 rounded-2xl shadow-lg border border-emerald-400/40 flex items-center space-x-2 transition transform hover:scale-105 cursor-pointer"
        >
          <div className="relative">
            <MessageCircle className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-emerald-800" />
          </div>
          <div className="text-left">
            <p className="text-[11px] font-extrabold leading-none">Live Chat & AI Desa</p>
            <p className="text-[9px] text-emerald-200 mt-0.5">WA • Telegram • 24 Jam</p>
          </div>
        </button>
      )}
    </div>
  );
};
