import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import {
  AdminUser,
  AidStatus,
  ApbdesItem,
  AuditLog,
  ChatMessage,
  Citizen,
  CitizenAspiration,
  EducationLevel,
  FamilyRelationRole,
  GalleryItem,
  Gender,
  LetterRequest,
  LetterRequestStatus,
  LetterTypeInfo,
  MapFacility,
  MarketProduct,
  MediaAsset,
  OccupationType,
  PopulationMutationItem,
  Religion,
  VerificationChecklist,
  VillageAgenda,
  VillageAssetItem,
  VillageHamlet,
  VillageInstitution,
  VillageMailLog,
  VillageNews,
  VillageOfficial,
  VillagePotential,
  VillageProject,
  VillageRegulation,
  VillageSiteConfig,
} from '../types/village';
import {
  buildCsvContent,
  buildMonthlyReportCsv,
  computeDocumentAnalytics,
  evaluateVerificationChecklist,
  formatWhatsAppNotification,
  generateCitizenEncryptionHash,
  generateOfficialLetterNumber,
  groupCitizensByKk,
  inferFamilyRole,
  maskSensitiveNumber,
  parseCitizensCsv,
  validateNikFormat,
} from '../utils/villageLogic';
import { ImageUploadField } from '../components/ImageUploadField';

const VillageCalendarView = lazy(() =>
  import('../components/VillageCalendarView').then((m) => ({ default: m.VillageCalendarView }))
);
const VillageCMSView = lazy(() =>
  import('../components/VillageCMSView').then((m) => ({ default: m.VillageCMSView }))
);
const MediaGalleryPicker = lazy(() =>
  import('../components/MediaGalleryPicker').then((m) => ({ default: m.MediaGalleryPicker }))
);
const VillageAdministrationBooksView = lazy(() =>
  import('../components/VillageAdministrationBooksView').then((m) => ({
    default: m.VillageAdministrationBooksView,
  }))
);
const VillageAnalyticsCharts = lazy(() =>
  import('../components/VillageAnalyticsCharts').then((m) => ({
    default: m.VillageAnalyticsCharts,
  }))
);

import {
  BookOpen,
  Bot,
  Calendar as CalendarIcon,
  CheckCircle2,
  Database,
  Download,
  Edit,
  ExternalLink,
  FileCheck2,
  FileText,
  FolderOpen,
  Lock,
  MessageSquare,
  Phone,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  Unlock,
  Users,
  X,
  XCircle,
} from 'lucide-react';

interface AdminDashboardViewProps {
  currentUser: AdminUser;
  requests: LetterRequest[];
  onUpdateRequests: (newRequests: LetterRequest[]) => void;
  citizens: Citizen[];
  onUpdateCitizens: (newCitizens: Citizen[]) => void;
  agendas: VillageAgenda[];
  onUpdateAgendas: (newAgendas: VillageAgenda[]) => void;
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
  adminUsers: AdminUser[];
  onUpdateAdminUsers: (items: AdminUser[]) => void;
  mediaAssets: MediaAsset[];
  onUpdateMediaAssets: (items: MediaAsset[]) => void;
  auditLogs: AuditLog[];
  onUpdateAuditLogs: (logs: AuditLog[]) => void;
  chatMessages?: ChatMessage[];
  onUpdateChatMessages?: (msgs: ChatMessage[]) => void;
  incomingOutboxLetters?: VillageMailLog[];
  onUpdateIncomingOutboxLetters?: (items: VillageMailLog[]) => void;
  villageAssets?: VillageAssetItem[];
  onUpdateVillageAssets?: (items: VillageAssetItem[]) => void;
  populationMutations?: PopulationMutationItem[];
  onUpdatePopulationMutations?: (items: PopulationMutationItem[]) => void;
  onResetAllToDefault: () => void;
  onShowToast: (title: string, message: string) => void;
  onViewLetter: (req: LetterRequest) => void;
  onRecordWhatsAppNotification: (req: LetterRequest, message: string) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  currentUser,
  requests,
  onUpdateRequests,
  citizens,
  onUpdateCitizens,
  agendas,
  onUpdateAgendas,
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
  adminUsers,
  onUpdateAdminUsers,
  mediaAssets,
  onUpdateMediaAssets,
  auditLogs,
  onUpdateAuditLogs,
  chatMessages = [],
  onUpdateChatMessages,
  incomingOutboxLetters = [],
  onUpdateIncomingOutboxLetters,
  villageAssets = [],
  onUpdateVillageAssets,
  populationMutations = [],
  onUpdatePopulationMutations,
  onResetAllToDefault,
  onShowToast,
  onViewLetter,
  onRecordWhatsAppNotification,
}) => {
  const isSuperAdmin = /super admin|sekretaris desa|administrator/i.test(currentUser?.role || '');
  const [adminTab, setAdminTab] = useState<
    'cms' | 'media' | 'surat' | 'buku_admin' | 'penduduk' | 'kalender' | 'integrasi' | 'keamanan'
  >(() => {
    if (typeof window !== 'undefined') {
      const sub = new URLSearchParams(window.location.search).get('subtab');
      if (
        sub &&
        ['cms', 'media', 'surat', 'buku_admin', 'penduduk', 'kalender', 'integrasi', 'keamanan'].includes(
          sub
        )
      ) {
        return sub as any;
      }
    }
    return 'cms';
  });

  // Privacy mask toggle for NIK/KK
  const [showFullNik, setShowFullNik] = useState<boolean>(false);

  // Search & Filter for Letter Requests
  const [requestStatusFilter, setRequestStatusFilter] = useState<string>('SEMUA');
  const [requestSearch, setRequestSearch] = useState<string>('');
  const [inspectingRequest, setInspectingRequest] = useState<LetterRequest | null>(null);
  const [adminNoteInput, setAdminNoteInput] = useState<string>('');

  // Search & Filter for Citizens
  const [citizenSearch, setCitizenSearch] = useState<string>('');
  const [citizenDusunFilter, setCitizenDusunFilter] = useState<string>('SEMUA');
  const [pendudukViewMode, setPendudukViewMode] = useState<
    'individu' | 'kk' | 'mutasi' | 'import_export'
  >('individu');

  // Citizen Add / Edit Modal State
  const [isCitizenModalOpen, setIsCitizenModalOpen] = useState(false);
  const [editingCitizen, setEditingCitizen] = useState<Citizen | null>(null);
  const [citizenFormError, setCitizenFormError] = useState<string | null>(null);
  const [formNik, setFormNik] = useState('');
  const [formKk, setFormKk] = useState('');
  const [formName, setFormName] = useState('');
  const [formGender, setFormGender] = useState<Gender>('Laki-laki');
  const [formBirthPlace, setFormBirthPlace] = useState('Bogor');
  const [formBirthDate, setFormBirthDate] = useState('1990-05-15');
  const [formMaritalStatus, setFormMaritalStatus] = useState<Citizen['maritalStatus']>('Kawin');
  const [formReligion, setFormReligion] = useState<Religion>('Islam');
  const [formEducation, setFormEducation] = useState<EducationLevel>('SMA/Sederajat');
  const [formOccupation, setFormOccupation] = useState<OccupationType>('Wiraswasta');
  const [formDusun, setFormDusun] = useState<string>(hamlets[0]?.name || 'Dusun 1');
  const [formRt, setFormRt] = useState('001');
  const [formRw, setFormRw] = useState('001');
  const [formAddress, setFormAddress] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAidStatus, setFormAidStatus] = useState<AidStatus>('Non-Penerima');
  const [formAidStage, setFormAidStage] = useState('Tahap I - 2026');
  const [formAidAmount, setFormAidAmount] = useState('300000');
  const [formFamilyRole, setFormFamilyRole] = useState<FamilyRelationRole>('Kepala Keluarga');
  const [formTpsNumber, setFormTpsNumber] = useState('TPS 01');
  const [formBloodType, setFormBloodType] = useState<Citizen['bloodType']>('O');
  const [formVerifiedDukcapil, setFormVerifiedDukcapil] = useState<boolean>(true);
  const [formPhotoUrl, setFormPhotoUrl] = useState<string>('');

  // Integrated Mutation State (Lahir, Mati, Pindah Keluar, Datang Masuk)
  const [mutType, setMutType] = useState<PopulationMutationItem['mutationType']>('KELAHIRAN');
  const [mutTargetCitizenId, setMutTargetCitizenId] = useState<string>(citizens[0]?.id || '');
  const [mutNewName, setMutNewName] = useState('');
  const [mutNewNik, setMutNewNik] = useState('');
  const [mutNewKk, setMutNewKk] = useState(citizens[0]?.kk || '3201140908120001');
  const [mutNewGender, setMutNewGender] = useState<Gender>('Laki-laki');
  const [mutNewBirthDate, setMutNewBirthDate] = useState(new Date().toISOString().slice(0, 10));
  const [mutNewDusun, setMutNewDusun] = useState(hamlets[0]?.name || 'Dusun 1 Sukasari');
  const [mutNotes, setMutNotes] = useState('');

  // Bulk CSV Import & Validation Preview State
  const [csvRawInput, setCsvRawInput] = useState('');
  const [csvPreviewResult, setCsvPreviewResult] = useState<ReturnType<typeof parseCitizensCsv> | null>(
    null
  );

  // MediaGalleryPicker Target Selector State in AdminDashboardView
  const [mediaAssignTarget, setMediaAssignTarget] = useState<
    'hero' | 'logo' | 'kades' | 'galeri'
  >('hero');

  // Live Chat, WA/Telegram API & Server-Side Gemini AI State
  const latestTelegramMessage = useMemo(() => {
    return [...chatMessages]
      .reverse()
      .find((m) => m.channel === 'telegram' && (m.telegramChatId || m.sessionId?.startsWith('tg-')));
  }, [chatMessages]);

  const derivedLastTelegramChatId = useMemo(() => {
    if (!latestTelegramMessage) return '';
    return (
      latestTelegramMessage.telegramChatId ||
      latestTelegramMessage.sessionId.replace(/^tg-/, '')
    );
  }, [latestTelegramMessage]);

  const [adminReplyText, setAdminReplyText] = useState('');
  const [adminReplyChannel, setAdminReplyChannel] = useState<'web' | 'whatsapp' | 'telegram'>('web');
  const [adminReplyRecipientPhone, setAdminReplyRecipientPhone] = useState(siteConfig.officialWhatsApp);
  const [adminReplyTelegramChatId, setAdminReplyTelegramChatId] = useState<string>(
    derivedLastTelegramChatId || '619283745'
  );
  const [adminReplyRecipientName, setAdminReplyRecipientName] = useState<string>(
    latestTelegramMessage?.senderName || 'Warga Desa'
  );
  const [adminReplyError, setAdminReplyError] = useState<string | null>(null);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [externalDispatchUrl, setExternalDispatchUrl] = useState<string | null>(null);

  // Telegram Webhook Configuration State (Token is strictly server-side env, never stored in DB)
  const [webhookUrlInput, setWebhookUrlInput] = useState<string>(
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/telegram/webhook`
      : 'http://localhost:3000/api/telegram/webhook'
  );
  const [isSettingWebhook, setIsSettingWebhook] = useState(false);
  const [isSimulatingWebhook, setIsSimulatingWebhook] = useState(false);
  const [webhookActionStatus, setWebhookActionStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Server-Side Gemini AI Draft Generator State
  const [aiDraftTopic, setAiDraftTopic] = useState(
    'Jadwal Pelayanan Administrasi & Penyaluran BLT Dana Desa'
  );
  const [aiDraftType, setAiDraftType] = useState<'pengumuman' | 'berita' | 'surat'>('pengumuman');
  const [aiDraftResult, setAiDraftResult] = useState('');
  const [aiDraftProvider, setAiDraftProvider] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // System Integration Status & Crypto Verification State
  const [integrationStatus, setIntegrationStatus] = useState<any>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [verifyQuery, setVerifyQuery] = useState(requests[0]?.trackingCode || '');
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [isVerifyingCrypto, setIsVerifyingCrypto] = useState(false);

  const fetchIntegrationDiagnostics = async () => {
    setIsCheckingStatus(true);
    try {
      const res = await fetch('/api/integrations/status');
      if (res.ok) {
        const data = await res.json();
        setIntegrationStatus(data);
        if (data?.services?.telegramBridge?.lastChatId && !adminReplyTelegramChatId) {
          setAdminReplyTelegramChatId(String(data.services.telegramBridge.lastChatId));
        }
        if (data?.services?.telegramBridge?.defaultWebhookUrl && !webhookUrlInput) {
          setWebhookUrlInput(String(data.services.telegramBridge.defaultWebhookUrl));
        }
      }
    } catch {
      // Ignore network error
    } finally {
      setIsCheckingStatus(false);
    }
  };

  useEffect(() => {
    if (adminTab === 'integrasi' || adminTab === 'keamanan') {
      fetchIntegrationDiagnostics();
    }
  }, [adminTab]);

  const handleRunCryptoVerify = async (codeToVerify?: string) => {
    const q = (codeToVerify ?? verifyQuery).trim();
    if (!q) return;
    setIsVerifyingCrypto(true);
    try {
      const res = await fetch('/api/security/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      if (res.ok) {
        const data = await res.json();
        setVerifyResult(data);
      }
    } catch {
      // Ignore
    } finally {
      setIsVerifyingCrypto(false);
    }
  };

  const handleSetTelegramWebhook = async () => {
    if (isSettingWebhook) return;
    setIsSettingWebhook(true);
    setWebhookActionStatus(null);
    try {
      const res = await fetch('/api/telegram/set-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: webhookUrlInput.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.status === 'error') {
        const errMsg =
          data.error ||
          'Gagal mendaftarkan Webhook Telegram. Pastikan TELEGRAM_BOT_TOKEN telah diset di environment server (.env).';
        setWebhookActionStatus({ type: 'error', message: errMsg });
        onShowToast('Gagal Set Webhook Telegram', errMsg);
      } else {
        const okMsg = `Webhook berhasil didaftarkan ke ${data.webhookUrl} (${data.description || 'OK'}).`;
        setWebhookActionStatus({ type: 'success', message: okMsg });
        appendAuditLog(`Set Webhook Telegram: ${data.webhookUrl}`, 'Integrasi API', data.webhookUrl);
        onShowToast('Webhook Telegram Aktif', okMsg);
      }
      await fetchIntegrationDiagnostics();
    } catch (err: any) {
      setWebhookActionStatus({
        type: 'error',
        message: `Kesalahan jaringan saat memanggil /api/telegram/set-webhook: ${err?.message || 'Error'}`,
      });
    } finally {
      setIsSettingWebhook(false);
    }
  };

  const handleSimulateIncomingTelegramWebhook = async (sampleText: string) => {
    if (isSimulatingWebhook) return;
    setIsSimulatingWebhook(true);
    setWebhookActionStatus(null);
    try {
      const simulatedChatId = adminReplyTelegramChatId.trim() || '619283745';
      const res = await fetch('/api/telegram/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          update_id: Math.floor(Date.now() / 1000),
          message: {
            message_id: Math.floor(Math.random() * 9000) + 100,
            from: {
              id: Number(simulatedChatId.replace(/\D/g, '').slice(0, 9)) || 619283745,
              is_bot: false,
              first_name: 'Siti',
              last_name: 'Aminah (Warga Telegram)',
              username: 'siti_berkahtani',
            },
            chat: {
              id: simulatedChatId,
              first_name: 'Siti',
              last_name: 'Aminah',
              username: 'siti_berkahtani',
              type: 'private',
            },
            date: Math.floor(Date.now() / 1000),
            text: sampleText,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.status === 'error') {
        setWebhookActionStatus({
          type: 'error',
          message: data.error || 'Webhook menolak request masuk (periksa TELEGRAM_WEBHOOK_SECRET).',
        });
      } else {
        if (Array.isArray(data.messages)) {
          onUpdateChatMessages?.(data.messages);
        }
        if (data.chatId) {
          setAdminReplyTelegramChatId(String(data.chatId));
        }
        setWebhookActionStatus({
          type: 'success',
          message: data.commandReply
            ? `Pesan masuk Telegram "${sampleText}" (chatId: ${data.chatId}) diterima di /api/telegram/webhook dan langsung dijawab otomatis oleh ${data.aiProvider ? `Asisten AI (${data.aiProvider})` : 'Bot Komando Desa'}!`
            : `Pesan masuk Telegram "${sampleText}" (chatId: ${data.chatId}) berhasil diterima di /api/telegram/webhook dan disimpan ke Kotak Masuk.`,
        });
        await fetchIntegrationDiagnostics();
      }
    } catch (err: any) {
      setWebhookActionStatus({
        type: 'error',
        message: `Gagal menguji webhook: ${err?.message || 'Network error'}`,
      });
    } finally {
      setIsSimulatingWebhook(false);
    }
  };

  const [isSendingAiTelegram, setIsSendingAiTelegram] = useState(false);

  const handleTriggerTelegramAiReply = async (
    targetChatId: string,
    recipientName: string,
    promptText: string
  ) => {
    if (isSendingAiTelegram) return;
    setIsSendingAiTelegram(true);
    setAdminReplyError(null);
    try {
      const res = await fetch('/api/telegram/ai-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: targetChatId,
          recipientName,
          prompt: promptText,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.status === 'error') {
        const errMsg = data.error || 'Gagal memproses balasan AI Telegram.';
        setAdminReplyError(errMsg);
        onShowToast('Gagal Balas AI Telegram', errMsg);
        return;
      }
      if (Array.isArray(data.messages)) {
        onUpdateChatMessages?.(data.messages);
      }
      appendAuditLog(
        `Balas Otomatis AI Telegram (${data.provider}) ke ChatID ${targetChatId}`,
        'Integrasi API',
        targetChatId
      );
      onShowToast(
        'Balasan AI Telegram Terkirim!',
        data.botApiDispatched
          ? `Jawaban AI (${data.provider}) telah dikirim via Bot API ke chatId ${targetChatId}.`
          : `Jawaban AI (${data.provider}) tercatat untuk chatId ${targetChatId} di Kotak Masuk.`
      );
      await fetchIntegrationDiagnostics();
    } catch (err: any) {
      setAdminReplyError(`Gagal menghubungi /api/telegram/ai-reply: ${err?.message || 'Error'}`);
    } finally {
      setIsSendingAiTelegram(false);
    }
  };

  const handleAdminSendChatReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminReplyText.trim() || isSendingReply) return;
    setIsSendingReply(true);
    setExternalDispatchUrl(null);
    setAdminReplyError(null);
    const text = adminReplyText.trim();

    try {
      if (adminReplyChannel === 'telegram') {
        const targetChatId =
          adminReplyTelegramChatId.trim() ||
          integrationStatus?.services?.telegramBridge?.lastChatId ||
          derivedLastTelegramChatId;
        const tgRes = await fetch('/api/integrations/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatId: targetChatId,
            recipientName: adminReplyRecipientName || 'Warga Telegram',
            message: text,
          }),
        });
        const tgData = await tgRes.json().catch(() => ({}));
        if (!tgRes.ok || tgData.status === 'error') {
          const errMessage =
            tgData.error ||
            'Gagal mengirim pesan via Telegram Bot API. Pastikan TELEGRAM_BOT_TOKEN sudah dikonfigurasi di server (.env) dan chatId valid.';
          setAdminReplyError(errMessage);
          onShowToast('Gagal Kirim ke Telegram API', errMessage);
          return;
        }

        setAdminReplyText('');
        if (Array.isArray(tgData.messages)) {
          onUpdateChatMessages?.(tgData.messages);
        }
        appendAuditLog(
          `Kirim Balasan Telegram Bot API ke ChatID ${targetChatId}`,
          'Live Chat',
          String(targetChatId)
        );
        onShowToast(
          'Balasan Telegram Terkirim!',
          `Pesan berhasil dikirim via Telegram Bot API ke chatId ${targetChatId}.`
        );
        await fetchIntegrationDiagnostics();
        return;
      }

      if (adminReplyChannel === 'whatsapp') {
        const waRes = await fetch('/api/integrations/whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: adminReplyRecipientPhone || siteConfig.officialWhatsApp,
            recipientName: adminReplyRecipientName || 'Warga Pemohon',
            message: text,
          }),
        });
        const waData = await waRes.json().catch(() => ({}));
        if (!waRes.ok) {
          setAdminReplyError(waData.error || 'Gagal memproses pengiriman WhatsApp.');
          return;
        }
        setAdminReplyText('');
        if (waData.waUrl) setExternalDispatchUrl(waData.waUrl);
        if (Array.isArray(waData.messages)) {
          onUpdateChatMessages?.(waData.messages);
        }
        appendAuditLog(
          `Kirim Balasan Live Chat via WHATSAPP`,
          'Live Chat',
          adminReplyRecipientPhone
        );
        onShowToast(
          'Pesan Balasan WhatsApp Dicatat!',
          `Tautan pengiriman WA ke ${waData.normalizedPhone} siap dibuka.`
        );
        return;
      }

      // Default: web portal live chat
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'admin-balasan',
          senderName: `${currentUser.fullName} (${currentUser.role})`,
          senderPhone: siteConfig.officialWhatsApp,
          senderRole: 'admin',
          channel: 'web',
          message: text,
          askAi: false,
        }),
      });
      if (res.ok) {
        setAdminReplyText('');
        const data = await res.json();
        if (Array.isArray(data.messages)) {
          onUpdateChatMessages?.(data.messages);
        }
        appendAuditLog(`Kirim Balasan Live Chat via WEB`, 'Live Chat', 'web-portal');
        onShowToast(
          'Pesan Balasan Terkirim!',
          'Balasan telah ditampilkan langsung di Live Chat Portal Web.'
        );
      }
    } catch (err: any) {
      setAdminReplyError(`Gagal menghubungi server: ${err?.message || 'Network error'}`);
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleGenerateAiDraft = async () => {
    if (!aiDraftTopic.trim() || isGeneratingAi) return;
    setIsGeneratingAi(true);
    try {
      const res = await fetch('/api/ai/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: aiDraftTopic,
          type: aiDraftType,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiDraftResult(data.draft || '');
        setAiDraftProvider(data.provider || 'gemini-3.8-flash');
        appendAuditLog(`Generate Draf AI Desa: ${aiDraftTopic}`, 'Integrasi API', aiDraftTopic);
      }
    } catch {
      // Ignore
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const docMetrics = useMemo(() => computeDocumentAnalytics(requests), [requests]);

  const appendAuditLog = (
    action: string,
    module: AuditLog['module'],
    seedPayload: string
  ) => {
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;
    const entry: AuditLog = {
      id: `aud-${Date.now()}`,
      timestamp,
      actor: currentUser.fullName,
      role: currentUser.role,
      action,
      module,
      encryptionHash: generateCitizenEncryptionHash({
        nik: seedPayload.padEnd(16, '0').slice(0, 16),
        kk: siteConfig.villageCode.replace(/\D/g, '').padEnd(16, '0').slice(0, 16),
        name: currentUser.fullName,
      }),
      status: 'Sukses',
    };
    onUpdateAuditLogs([entry, ...auditLogs]);
  };

  // Update Request Status & Checklist
  const handleToggleChecklistItem = (
    req: LetterRequest,
    key: keyof VerificationChecklist
  ) => {
    const updatedChecklist: VerificationChecklist = {
      ...req.checklist,
      [key]: !req.checklist[key],
    };
    const updatedList = requests.map((r) =>
      r.id === req.id ? { ...r, checklist: updatedChecklist } : r
    );
    onUpdateRequests(updatedList);
    if (inspectingRequest?.id === req.id) {
      setInspectingRequest({ ...req, checklist: updatedChecklist });
    }
  };

  const handleUpdateRequestStatus = (
    req: LetterRequest,
    newStatus: LetterRequestStatus,
    customNotes?: string
  ) => {
    const now = new Date();
    const formattedNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(
      2,
      '0'
    )}:${String(now.getMinutes()).padStart(2, '0')}`;

    const seq = requests.filter((r) => r.registrationNumber).length + 1;
    const regNum =
      newStatus === 'Selesai' && !req.registrationNumber
        ? generateOfficialLetterNumber(
            req.letterType,
            seq,
            now.getMonth(),
            now.getFullYear(),
            siteConfig.villageCode
          )
        : req.registrationNumber;

    const notes =
      customNotes !== undefined && customNotes.trim() !== ''
        ? customNotes.trim()
        : newStatus === 'Selesai'
        ? `Dokumen telah diverifikasi dan ditandatangani secara elektronik (TTE QR-Code) oleh ${ siteConfig.headOfVillageName }.`
        : newStatus === 'Ditolak'
        ? 'Mohon lengkapi berkas lampiran pengantar RT/RW atau perbaiki kecocokan NIK.'
        : `Sedang diproses oleh ${currentUser.fullName} (${currentUser.role}).`;

    const waMessage = formatWhatsAppNotification(
      {
        trackingCode: req.trackingCode,
        citizenName: req.citizenName,
        letterTitle: req.letterTitle,
        status: newStatus,
        registrationNumber: regNum,
        adminNotes: notes,
      },
      siteConfig.villageName
    );

    const updatedReq: LetterRequest = {
      ...req,
      status: newStatus,
      registrationNumber: regNum,
      adminNotes: notes,
      updatedAt: formattedNow,
      completedAt: newStatus === 'Selesai' ? formattedNow : req.completedAt,
      processingHours: newStatus === 'Selesai' ? req.processingHours || 1.5 : req.processingHours,
      verifiedBy: `${currentUser.fullName} (${currentUser.role})`,
      signedBy: newStatus === 'Selesai' ? siteConfig.headOfVillageName : req.signedBy,
      qrVerificationCode:
        newStatus === 'Selesai'
          ? `TTE-${siteConfig.villageCode}-${req.trackingCode}`
          : req.qrVerificationCode,
      whatsappNotifiedCount: (req.whatsappNotifiedCount || 0) + 1,
      lastWhatsappMessage: waMessage,
    };

    const updatedList = requests.map((r) => (r.id === req.id ? updatedReq : r));
    onUpdateRequests(updatedList);
    if (inspectingRequest?.id === req.id) {
      setInspectingRequest(updatedReq);
    }

    onRecordWhatsAppNotification(updatedReq, waMessage);
    appendAuditLog(
      `Ubah Status Surat ${req.trackingCode} -> ${newStatus}`,
      'Persuratan',
      req.nik
    );
    onShowToast(
      `Status Diperbarui: ${newStatus}`,
      `Notifikasi WhatsApp otomatis dikirim ke ${req.citizenName} (${req.whatsapp}).`
    );
  };

  const handleDeleteRequest = (req: LetterRequest) => {
    onUpdateRequests(requests.filter((r) => r.id !== req.id));
    if (inspectingRequest?.id === req.id) {
      setInspectingRequest(null);
    }
    appendAuditLog(`Hapus Permohonan Surat ${req.trackingCode}`, 'Persuratan', req.nik);
    onShowToast('Permohonan Dihapus', `Tiket ${req.trackingCode} telah dihapus dari database.`);
  };

  const handleExportRequestsCsv = () => {
    const headers = [
      'Kode Tiket',
      'No Surat Resmi',
      'NIK Pemohon',
      'Nama Pemohon',
      'Dusun',
      'Jenis Surat',
      'Status',
      'Waktu Pengajuan',
      'Petugas Verifikator',
    ];
    const rows = requests.map((r) => [
      r.trackingCode,
      r.registrationNumber || '-',
      showFullNik ? r.nik : maskSensitiveNumber(r.nik, false),
      r.citizenName,
      r.dusun,
      r.letterTitle,
      r.status,
      r.createdAt,
      r.verifiedBy || '-',
    ]);
    const csv = buildCsvContent(headers, rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `laporan_persuratan_${siteConfig.villageName.toLowerCase().replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Citizen Add / Edit / Delete Handlers
  const openAddCitizenModal = () => {
    setEditingCitizen(null);
    setCitizenFormError(null);
    setFormNik('');
    setFormKk('');
    setFormName('');
    setFormGender('Laki-laki');
    setFormBirthPlace('Bogor');
    setFormBirthDate('1992-04-10');
    setFormMaritalStatus('Kawin');
    setFormReligion('Islam');
    setFormEducation('SMA/Sederajat');
    setFormOccupation('Wiraswasta');
    setFormDusun(hamlets[0]?.name || 'Dusun 1');
    setFormRt('001');
    setFormRw('001');
    setFormAddress('');
    setFormPhone('0812');
    setFormAidStatus('Non-Penerima');
    setFormAidStage('Tahap I - 2026');
    setFormAidAmount('0');
    setFormFamilyRole('Kepala Keluarga');
    setFormTpsNumber('TPS 01');
    setFormBloodType('O');
    setFormVerifiedDukcapil(true);
    setFormPhotoUrl('');
    setIsCitizenModalOpen(true);
  };

  const openAddMemberToKkModal = (
    kkNumber: string,
    dusun: string,
    rt: string,
    rw: string,
    address: string,
    role: FamilyRelationRole = 'Anak'
  ) => {
    setEditingCitizen(null);
    setCitizenFormError(null);
    setFormNik('');
    setFormKk(kkNumber);
    setFormName('');
    setFormGender(role === 'Istri' ? 'Perempuan' : 'Laki-laki');
    setFormBirthPlace(siteConfig.defaults?.birthPlace || 'Bogor');
    setFormBirthDate(role === 'Anak' ? '2018-06-15' : '1994-05-10');
    setFormMaritalStatus(role === 'Anak' ? 'Belum Kawin' : 'Kawin');
    setFormReligion('Islam');
    setFormEducation(role === 'Anak' ? 'SD/Sederajat' : 'SMA/Sederajat');
    setFormOccupation(role === 'Anak' ? 'Pelajar / Mahasiswa' : 'Mengurus Rumah Tangga');
    setFormDusun(dusun);
    setFormRt(rt);
    setFormRw(rw);
    setFormAddress(address);
    setFormPhone('0812');
    setFormAidStatus('Non-Penerima');
    setFormAidStage('Tahap I - 2026');
    setFormAidAmount('0');
    setFormFamilyRole(role);
    setFormTpsNumber('TPS 01');
    setFormBloodType('O');
    setFormVerifiedDukcapil(true);
    setFormPhotoUrl('');
    setIsCitizenModalOpen(true);
  };

  const openEditCitizenModal = (citizen: Citizen) => {
    setEditingCitizen(citizen);
    setCitizenFormError(null);
    setFormNik(citizen.nik);
    setFormKk(citizen.kk);
    setFormName(citizen.name);
    setFormGender(citizen.gender);
    setFormBirthPlace(citizen.birthPlace);
    setFormBirthDate(citizen.birthDate);
    setFormMaritalStatus(citizen.maritalStatus);
    setFormReligion(citizen.religion);
    setFormEducation(citizen.education);
    setFormOccupation(citizen.occupation);
    setFormDusun(citizen.dusun);
    setFormRt(citizen.rt);
    setFormRw(citizen.rw);
    setFormAddress(citizen.address);
    setFormPhone(citizen.phone);
    setFormAidStatus(citizen.aidStatus);
    setFormAidStage(citizen.aidStage || 'Tahap I - 2026');
    setFormAidAmount(String(citizen.aidAmount || 0));
    setFormFamilyRole(citizen.familyRole || inferFamilyRole(citizen));
    setFormTpsNumber(citizen.tpsNumber || 'TPS 01');
    setFormBloodType(citizen.bloodType);
    setFormVerifiedDukcapil(citizen.verifiedDukcapil);
    setFormPhotoUrl(citizen.photoUrl || '');
    setIsCitizenModalOpen(true);
  };

  const handleSaveCitizen = (e: React.FormEvent) => {
    e.preventDefault();
    const nikValidation = validateNikFormat(formNik);
    if (!nikValidation.isValid) {
      setCitizenFormError(nikValidation.errorMessage || 'Format NIK tidak valid.');
      return;
    }
    if (!formName.trim()) {
      setCitizenFormError('Nama lengkap warga wajib diisi.');
      return;
    }

    const birthYear = Number(formBirthDate.split('-')[0]) || 1990;
    const computedAge = Math.max(0, new Date().getFullYear() - birthYear);
    const todayStr = new Date().toISOString().slice(0, 10);

    if (editingCitizen) {
      const updatedCitizen: Citizen = {
        ...editingCitizen,
        nik: nikValidation.cleanNik,
        kk: formKk.trim() || editingCitizen.kk,
        name: formName.trim(),
        gender: formGender,
        birthPlace: formBirthPlace.trim(),
        birthDate: formBirthDate,
        age: computedAge,
        maritalStatus: formMaritalStatus,
        religion: formReligion,
        education: formEducation,
        occupation: formOccupation,
        dusun: formDusun,
        rt: formRt.trim() || '001',
        rw: formRw.trim() || '001',
        address: formAddress.trim() || `${formDusun} RT ${formRt}/RW ${formRw}`,
        phone: formPhone.trim(),
        aidStatus: formAidStatus,
        aidStage: formAidStatus === 'Non-Penerima' ? '-' : formAidStage.trim() || 'Tahap I - 2026',
        aidAmount: formAidStatus === 'Non-Penerima' ? 0 : Number(formAidAmount) || 300000,
        familyRole: formFamilyRole,
        tpsNumber: formTpsNumber.trim() || 'TPS 01',
        verifiedDukcapil: formVerifiedDukcapil,
        bloodType: formBloodType,
        lastUpdated: todayStr,
        photoUrl: formPhotoUrl || editingCitizen.photoUrl,
      };
      onUpdateCitizens(
        citizens.map((c) => (c.id === editingCitizen.id ? updatedCitizen : c))
      );
      appendAuditLog(`Perbarui Data Penduduk: ${updatedCitizen.name}`, 'Kependudukan', updatedCitizen.nik);
      onShowToast('Data Warga Diperbarui', `Biodata ${updatedCitizen.name} berhasil disimpan ke database.`);
    } else {
      const newCitizen: Citizen = {
        id: `cit-${Date.now()}`,
        nik: nikValidation.cleanNik,
        kk: formKk.trim() || '3201140908120099',
        name: formName.trim(),
        gender: formGender,
        birthPlace: formBirthPlace.trim() || 'Bogor',
        birthDate: formBirthDate,
        age: computedAge,
        maritalStatus: formMaritalStatus,
        religion: formReligion,
        education: formEducation,
        occupation: formOccupation,
        dusun: formDusun,
        rt: formRt.trim() || '001',
        rw: formRw.trim() || '001',
        address: formAddress.trim() || `${formDusun} RT ${formRt}/RW ${formRw}`,
        phone: formPhone.trim() || '-',
        aidStatus: formAidStatus,
        aidStage: formAidStatus === 'Non-Penerima' ? '-' : formAidStage.trim() || 'Tahap I - 2026',
        aidAmount: formAidStatus === 'Non-Penerima' ? 0 : Number(formAidAmount) || 300000,
        familyRole: formFamilyRole,
        tpsNumber: formTpsNumber.trim() || 'TPS 01',
        lifeStatus: 'Hidup',
        verifiedDukcapil: formVerifiedDukcapil,
        bloodType: formBloodType,
        lastUpdated: todayStr,
        photoUrl: formPhotoUrl || undefined,
      };
      onUpdateCitizens([newCitizen, ...citizens]);
      appendAuditLog(`Tambah Penduduk Baru: ${newCitizen.name}`, 'Kependudukan', newCitizen.nik);
      onShowToast('Penduduk Ditambahkan', `Warga baru "${newCitizen.name}" telah tersimpan di database.`);
    }

    setIsCitizenModalOpen(false);
    setEditingCitizen(null);
  };

  const handleDeleteCitizen = (citizen: Citizen) => {
    onUpdateCitizens(citizens.filter((c) => c.id !== citizen.id));
    appendAuditLog(`Hapus Data Penduduk: ${citizen.name}`, 'Kependudukan', citizen.nik);
    onShowToast('Data Warga Dihapus', `Data "${citizen.name}" telah dihapus dari database.`);
  };

  const handleExecuteIntegratedMutation = (e: React.FormEvent) => {
    e.preventDefault();
    const todayStr = new Date().toISOString().slice(0, 10);

    if (mutType === 'KELAHIRAN' || mutType === 'DATANG_MASUK') {
      if (!mutNewName.trim()) {
        onShowToast('Validasi Mutasi', 'Nama lengkap bayi / pendatang wajib diisi.');
        return;
      }
      const cleanNik =
        mutNewNik.replace(/\D/g, '').length === 16
          ? mutNewNik.replace(/\D/g, '')
          : `320114${String(Date.now()).slice(-10)}`;
      const cleanKk =
        mutNewKk.replace(/\D/g, '').length === 16
          ? mutNewKk.replace(/\D/g, '')
          : citizens[0]?.kk || '3201140908120001';
      const birthYear = Number(mutNewBirthDate.split('-')[0]) || new Date().getFullYear();
      const computedAge =
        mutType === 'KELAHIRAN' ? 0 : Math.max(0, new Date().getFullYear() - birthYear);

      const newCitizen: Citizen = {
        id: `cit-mut-${Date.now()}`,
        nik: cleanNik,
        kk: cleanKk,
        name: mutNewName.trim(),
        gender: mutNewGender,
        birthPlace: siteConfig.defaults?.birthPlace || 'Bogor',
        birthDate: mutNewBirthDate,
        age: computedAge,
        maritalStatus: mutType === 'KELAHIRAN' ? 'Belum Kawin' : 'Kawin',
        religion: 'Islam',
        education: mutType === 'KELAHIRAN' ? 'Tidak/Belum Sekolah' : 'SMA/Sederajat',
        occupation: mutType === 'KELAHIRAN' ? 'Belum / Tidak Bekerja' : 'Wiraswasta',
        dusun: mutNewDusun,
        rt: '001',
        rw: '001',
        address: `${mutNewDusun} RT 001/RW 001`,
        phone: '-',
        aidStatus: 'Non-Penerima',
        familyRole: mutType === 'KELAHIRAN' ? 'Anak' : 'Famili Lain',
        lifeStatus: 'Hidup',
        tpsNumber: 'TPS 01',
        verifiedDukcapil: true,
        bloodType: 'O',
        lastUpdated: todayStr,
      };

      const newMutation: PopulationMutationItem = {
        id: `mut-${Date.now()}`,
        nik: cleanNik,
        kk: cleanKk,
        citizenName: mutNewName.trim(),
        mutationType: mutType,
        date: todayStr,
        dusun: mutNewDusun,
        rtRw: 'RT 001 / RW 001',
        notes:
          mutNotes.trim() ||
          `Otomatis ditambahkan ke Buku Induk Penduduk (KK ${cleanKk}) melalui Modul Mutasi Terpadu.`,
      };

      onUpdateCitizens([newCitizen, ...citizens]);
      onUpdatePopulationMutations?.([newMutation, ...populationMutations]);
      appendAuditLog(`Mutasi ${mutType}: ${newCitizen.name}`, 'Kependudukan', cleanNik);
      setMutNewName('');
      setMutNewNik('');
      setMutNotes('');
      onShowToast(
        `Mutasi ${mutType} Berhasil!`,
        `${newCitizen.name} otomatis masuk ke Buku Induk Penduduk (KK ${cleanKk}) & Buku Mutasi.`
      );
    } else {
      const target = citizens.find((c) => c.id === mutTargetCitizenId);
      if (!target) {
        onShowToast('Pilih Warga', 'Pilih warga dari daftar Buku Induk terlebih dahulu.');
        return;
      }
      const nextStatus: Citizen['lifeStatus'] =
        mutType === 'KEMATIAN' ? 'Meninggal' : 'Pindah Keluar';
      const updatedCitizens = citizens.map((c) =>
        c.id === target.id
          ? { ...c, lifeStatus: nextStatus, lastUpdated: todayStr }
          : c
      );
      const newMutation: PopulationMutationItem = {
        id: `mut-${Date.now()}`,
        nik: target.nik,
        kk: target.kk,
        citizenName: target.name,
        mutationType: mutType,
        date: todayStr,
        dusun: target.dusun,
        rtRw: `RT ${target.rt} / RW ${target.rw}`,
        notes:
          mutNotes.trim() ||
          `Status warga diperbarui menjadi "${nextStatus}" di Buku Induk Penduduk & Buku Mutasi.`,
      };

      onUpdateCitizens(updatedCitizens);
      onUpdatePopulationMutations?.([newMutation, ...populationMutations]);
      appendAuditLog(`Mutasi ${mutType}: ${target.name}`, 'Kependudukan', target.nik);
      setMutNotes('');
      onShowToast(
        `Mutasi ${mutType} Tercatat!`,
        `Status "${target.name}" diperbarui menjadi ${nextStatus} di Buku Induk & Buku Mutasi.`
      );
    }
  };

  const handleExportMonthlyReportCsv = () => {
    const csv = buildMonthlyReportCsv(
      citizens,
      populationMutations,
      requests,
      apbdes,
      siteConfig
    );
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `laporan_bulanan_terpadu_${siteConfig.villageName.toLowerCase().replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onShowToast(
      'Laporan Bulanan Diunduh',
      'Berkas CSV Laporan Bulanan Kependudukan, Mutasi, Bansos & APBDes berhasil diekspor.'
    );
  };

  const handleCommitImportedCitizensCsv = () => {
    if (!csvPreviewResult || csvPreviewResult.validCitizens.length === 0) return;
    const existingNiks = new Set(citizens.map((c) => c.nik));
    const uniqueNew = csvPreviewResult.validCitizens.filter((c) => !existingNiks.has(c.nik));
    const updatedExisting = citizens.map((existing) => {
      const replacement = csvPreviewResult.validCitizens.find((v) => v.nik === existing.nik);
      return replacement ? { ...existing, ...replacement, id: existing.id } : existing;
    });
    onUpdateCitizens([...uniqueNew, ...updatedExisting]);
    appendAuditLog(
      `Import CSV Massal (${csvPreviewResult.validCitizens.length} Warga)`,
      'Kependudukan',
      'CSV-IMPORT'
    );
    onShowToast(
      'Import CSV Kependudukan Selesai!',
      `${csvPreviewResult.validCitizens.length} data warga berhasil disimpan ke database server.`
    );
    setCsvPreviewResult(null);
    setCsvRawInput('');
    setPendudukViewMode('individu');
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const matchesStatus =
        requestStatusFilter === 'SEMUA' || r.status === requestStatusFilter;
      const q = requestSearch.toLowerCase();
      const matchesSearch =
        !q ||
        r.citizenName.toLowerCase().includes(q) ||
        r.trackingCode.toLowerCase().includes(q) ||
        r.nik.includes(q) ||
        r.letterTitle.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [requests, requestStatusFilter, requestSearch]);

  const filteredCitizens = useMemo(() => {
    return citizens.filter((c) => {
      const matchesDusun =
        citizenDusunFilter === 'SEMUA' || c.dusun === citizenDusunFilter;
      const q = citizenSearch.toLowerCase();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.nik.includes(q) ||
        c.kk.includes(q) ||
        c.occupation.toLowerCase().includes(q);
      return matchesDusun && matchesSearch;
    });
  }, [citizens, citizenDusunFilter, citizenSearch]);

  const dusunOptions = useMemo(() => {
    const set = new Set<string>();
    hamlets.forEach((h) => {
      if (h.name) set.add(h.name);
    });
    citizens.forEach((c) => {
      if (c.dusun) set.add(c.dusun);
    });
    return Array.from(set);
  }, [hamlets, citizens]);

  return (
    <div className="space-y-8">
      {/* Admin Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-800/60 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          {siteConfig.logoUrl ? (
            <img
              src={siteConfig.logoUrl}
              alt={`Logo ${siteConfig.villageName}`}
              className="w-16 h-16 rounded-2xl object-contain bg-white/10 p-2 ring-2 ring-emerald-400/50 shadow-md shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center font-black text-2xl shrink-0">
              {siteConfig.logoSymbolText || 'D'}
            </div>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs bg-emerald-400 text-emerald-950 font-black px-2.5 py-0.5 rounded-lg uppercase tracking-wider">
                {currentUser.role}
              </span>
              <span className="text-xs text-emerald-300 font-mono flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Database Server Aktif (`/api/db`)</span>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold mt-1">
              Dashboard Kendali Pemerintah {siteConfig.villageName} — {currentUser.fullName}
            </h1>
            <p className="text-xs text-emerald-200 mt-0.5">
              NIP: {currentUser.nip} • Kelola seluruh profil desa, logo, galeri, produk UMKM, persuratan TTE, kependudukan, dan jadwal kegiatan.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="bg-white/10 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-white/15 text-xs text-emerald-100 flex items-center space-x-2">
            <Database className="w-4 h-4 text-emerald-300" />
            <span>{citizens.length} Warga • {requests.length} Surat • {agendas.length} Agenda</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setAdminTab('cms')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition cursor-pointer ${
            adminTab === 'cms'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-800 hover:border-emerald-500'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>CMS Website, Logo & Database Konten</span>
        </button>

        <button
          onClick={() => setAdminTab('media')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition cursor-pointer ${
            adminTab === 'media'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-800 hover:border-emerald-500'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          <span>Pustaka Media (`MediaGalleryPicker`) ({mediaAssets.length})</span>
        </button>

        <button
          onClick={() => setAdminTab('surat')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition cursor-pointer ${
            adminTab === 'surat'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-800 hover:border-emerald-500'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Verifikasi Surat & TTE ({requests.length})</span>
        </button>

        <button
          onClick={() => setAdminTab('buku_admin')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition cursor-pointer ${
            adminTab === 'buku_admin'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-800 hover:border-emerald-500'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Generator Surat, Buku Administrasi & Bansos ({letterTypes.length} Jenis)</span>
        </button>

        <button
          onClick={() => setAdminTab('penduduk')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition cursor-pointer ${
            adminTab === 'penduduk'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-800 hover:border-emerald-500'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Database Penduduk CRUD ({citizens.length})</span>
        </button>

        <button
          onClick={() => setAdminTab('kalender')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition cursor-pointer ${
            adminTab === 'kalender'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-800 hover:border-emerald-500'
          }`}
        >
          <CalendarIcon className="w-4 h-4" />
          <span>Kalender Kegiatan Desa ({agendas.length})</span>
        </button>

        <button
          onClick={() => setAdminTab('integrasi')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition cursor-pointer ${
            adminTab === 'integrasi'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-800 hover:border-emerald-500'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Live Chat, WA/Telegram API & AI Desa ({chatMessages.length})</span>
        </button>

        {isSuperAdmin && (
          <button
            onClick={() => setAdminTab('keamanan')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition cursor-pointer ${
              adminTab === 'keamanan'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-800 hover:border-emerald-500'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Verifikasi SHA-256 & Audit Log ({auditLogs.length})</span>
          </button>
        )}
      </div>

      {/* TAB 1B: PUSTAKA MEDIA & PEMILIH GAMBAR WEBSITE (MediaGalleryPicker) */}
      {adminTab === 'media' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-white">
                Target Penempatan `MediaGalleryPicker` di Website {siteConfig.villageName}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                Pilih bagian website tujuan di sebelah kanan, lalu klik **"Pilih Media Ini"** pada daftar `mediaAssets` di bawah untuk langsung mengganti gambar tanpa URL hardcoded.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {[
                { key: 'hero', label: 'Target: Hero Image Beranda' },
                { key: 'logo', label: 'Target: Logo Resmi Desa' },
                { key: 'kades', label: 'Target: Foto Kepala Desa' },
                { key: 'galeri', label: 'Target: Tambah Slide Galeri Baru' },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setMediaAssignTarget(t.key as any)}
                  className={`px-3.5 py-2 rounded-xl font-bold transition cursor-pointer ${
                    mediaAssignTarget === t.key
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-emerald-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <Suspense
            fallback={
              <div className="p-8 text-center text-xs font-bold text-emerald-700 dark:text-emerald-400">
                Memuat Pustaka Media...
              </div>
            }
          >
            <MediaGalleryPicker
              mediaAssets={mediaAssets}
              selectedValue={
                mediaAssignTarget === 'hero'
                  ? siteConfig.heroImageUrl
                  : mediaAssignTarget === 'logo'
                  ? siteConfig.logoUrl
                  : mediaAssignTarget === 'kades'
                  ? siteConfig.headOfVillagePhotoUrl
                  : undefined
              }
              defaultCategory={mediaAssignTarget === 'galeri' ? 'galeri' : mediaAssignTarget}
              title={`MediaGalleryPicker — Pilih File dari mediaAssets (${mediaAssets.length} File Database)`}
              onSelect={(dataUrl, asset) => {
                if (mediaAssignTarget === 'hero') {
                  onUpdateSiteConfig({ ...siteConfig, heroImageUrl: dataUrl });
                  appendAuditLog(`Ganti Hero Image via MediaGalleryPicker: ${asset.name}`, 'CMS Website', asset.id);
                  onShowToast(
                    'Hero Image Beranda Diperbarui!',
                    `Aset "${asset.name}" dari mediaAssets kini aktif sebagai latar Hero Beranda.`
                  );
                } else if (mediaAssignTarget === 'logo') {
                  onUpdateSiteConfig({ ...siteConfig, logoUrl: dataUrl });
                  appendAuditLog(`Ganti Logo Desa via MediaGalleryPicker: ${asset.name}`, 'CMS Website', asset.id);
                  onShowToast(
                    'Logo Resmi Desa Diperbarui!',
                    `Aset "${asset.name}" kini aktif di Navbar, Footer, dan Kop Surat.`
                  );
                } else if (mediaAssignTarget === 'kades') {
                  onUpdateSiteConfig({ ...siteConfig, headOfVillagePhotoUrl: dataUrl });
                  appendAuditLog(`Ganti Foto Kades via MediaGalleryPicker: ${asset.name}`, 'CMS Website', asset.id);
                  onShowToast(
                    'Foto Kepala Desa Diperbarui!',
                    `Aset "${asset.name}" kini aktif sebagai foto resmi Kepala Desa.`
                  );
                } else {
                  const newGalSlide: GalleryItem = {
                    id: `gal-${Date.now()}`,
                    title: asset.name,
                    category: 'Pemerintahan',
                    date: new Date().toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    }),
                    location: siteConfig.villageName,
                    imageUrl: dataUrl,
                    description: `Dokumentasi kegiatan resmi Pemerintah ${siteConfig.villageName} dari pustaka media database.`,
                    participantsCount: 60,
                  };
                  onUpdateGallery([newGalSlide, ...gallery]);
                  appendAuditLog(`Tambah Slide Galeri via MediaGalleryPicker: ${asset.name}`, 'CMS Website', asset.id);
                  onShowToast(
                    'Slide Galeri Baru Ditambahkan!',
                    `Aset "${asset.name}" telah ditambahkan ke halaman Galeri Desa.`
                  );
                }
              }}
              onUploadNewAsset={(newAsset) => {
                onUpdateMediaAssets([newAsset, ...mediaAssets]);
                appendAuditLog(`Unggah Media Baru ke Database: ${newAsset.name}`, 'CMS Website', newAsset.id);
                onShowToast(
                  'File Baru Tersimpan di mediaAssets',
                  `"${newAsset.name}" berhasil disimpan sebagai base64 di database desa.`
                );
              }}
              onApplyToHero={(asset) => {
                onUpdateSiteConfig({ ...siteConfig, heroImageUrl: asset.dataUrl });
                onShowToast('Hero Image Diperbarui!', `"${asset.name}" diterapkan sebagai Hero Image.`);
              }}
              onApplyToLogo={(asset) => {
                onUpdateSiteConfig({ ...siteConfig, logoUrl: asset.dataUrl });
                onShowToast('Logo Desa Diperbarui!', `"${asset.name}" diterapkan sebagai Logo Desa.`);
              }}
              onAddToGallerySlide={(asset) => {
                const newGalSlide: GalleryItem = {
                  id: `gal-${Date.now()}`,
                  title: asset.name,
                  category: 'Pemerintahan',
                  date: new Date().toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  }),
                  location: siteConfig.villageName,
                  imageUrl: asset.dataUrl,
                  description: `Dokumentasi kegiatan resmi Pemerintah ${siteConfig.villageName}.`,
                  participantsCount: 55,
                };
                onUpdateGallery([newGalSlide, ...gallery]);
                onShowToast('Slide Galeri Ditambahkan!', `"${asset.name}" ditambahkan ke Galeri Desa.`);
              }}
              onDeleteAsset={async (assetId) => {
                try {
                  const token = localStorage.getItem('sid_desa_admin_token') || '';
                  await fetch(`/api/media/${assetId}`, {
                    method: 'DELETE',
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                  });
                } catch {}
                onUpdateMediaAssets(mediaAssets.filter((m) => m.id !== assetId));
                onShowToast('Media Dihapus', 'Aset telah dihapus dari daftar mediaAssets.');
              }}
            />
          </Suspense>
        </div>
      )}

      {/* TAB 1C: GENERATOR SEGALA JENIS SURAT LOKET, BUKU ADMINISTRASI DESA (PERMENDAGRI 47/2016) & BANSOS */}
      {adminTab === 'buku_admin' && (
        <Suspense
          fallback={
            <div className="p-8 text-center text-xs font-bold text-emerald-700 dark:text-emerald-400">
              Memuat Buku Administrasi Desa...
            </div>
          }
        >
          <VillageAdministrationBooksView
            siteConfig={siteConfig}
            onUpdateSiteConfig={onUpdateSiteConfig}
            citizens={citizens}
            onUpdateCitizens={onUpdateCitizens}
            requests={requests}
            onUpdateRequests={onUpdateRequests}
            letterTypes={letterTypes}
            onUpdateLetterTypes={onUpdateLetterTypes}
            incomingOutboxLetters={incomingOutboxLetters}
            onUpdateIncomingOutboxLetters={(items) => onUpdateIncomingOutboxLetters?.(items)}
            villageAssets={villageAssets}
            onUpdateVillageAssets={(items) => onUpdateVillageAssets?.(items)}
            populationMutations={populationMutations}
            onUpdatePopulationMutations={(items) => onUpdatePopulationMutations?.(items)}
            hamlets={hamlets}
            officials={officials}
            currentUserFullName={currentUser.fullName}
            currentUserRole={currentUser.role}
            onViewLetter={onViewLetter}
            onRecordWhatsAppNotification={onRecordWhatsAppNotification}
            onShowToast={onShowToast}
          />
        </Suspense>
      )}

      {/* TAB 1: CMS WEBSITE & DATABASE KONTEN */}
      {adminTab === 'cms' && (
        <Suspense
          fallback={
            <div className="p-8 text-center text-xs font-bold text-emerald-700 dark:text-emerald-400">
              Memuat Pusat Kendali CMS Desa...
            </div>
          }
        >
          <VillageCMSView
            siteConfig={siteConfig}
            onUpdateSiteConfig={onUpdateSiteConfig}
            apbdes={apbdes}
            onUpdateApbdes={onUpdateApbdes}
            news={news}
            onUpdateNews={onUpdateNews}
            gallery={gallery}
            onUpdateGallery={onUpdateGallery}
            products={products}
            onUpdateProducts={onUpdateProducts}
            officials={officials}
            onUpdateOfficials={onUpdateOfficials}
            regulations={regulations}
            onUpdateRegulations={onUpdateRegulations}
            aspirations={aspirations}
            onUpdateAspirations={onUpdateAspirations}
            potentials={potentials}
            onUpdatePotentials={onUpdatePotentials}
            projects={projects}
            onUpdateProjects={onUpdateProjects}
            institutions={institutions}
            onUpdateInstitutions={onUpdateInstitutions}
            hamlets={hamlets}
            onUpdateHamlets={onUpdateHamlets}
            facilities={facilities}
            onUpdateFacilities={onUpdateFacilities}
            letterTypes={letterTypes}
            onUpdateLetterTypes={onUpdateLetterTypes}
            adminUsers={adminUsers}
            onUpdateAdminUsers={onUpdateAdminUsers}
            mediaAssets={mediaAssets}
            onUpdateMediaAssets={onUpdateMediaAssets}
            onResetAllToDefault={onResetAllToDefault}
            onShowToast={onShowToast}
          />
        </Suspense>
      )}

      {/* TAB 2: LAYANAN DOKUMEN & VERIFIKASI SURAT */}
      {adminTab === 'surat' && (
        <div className="space-y-6">
          {/* Analytics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-bold text-gray-500">Total Permohonan</span>
              <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1 font-mono">
                {docMetrics.totalRequests}
              </p>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                {docMetrics.completedCount} Selesai Terbit TTE
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-bold text-gray-500">Rata-rata Waktu Layanan</span>
              <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                {docMetrics.averageProcessingHours} <span className="text-sm font-normal">Jam</span>
              </p>
              <p className="text-[11px] text-gray-500 mt-1">
                Kepatuhan SLA: {docMetrics.slaCompliancePercent}%
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-bold text-gray-500">Tingkat Penyelesaian</span>
              <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-1 font-mono">
                {docMetrics.completionRatePercent}%
              </p>
              <p className="text-[11px] text-gray-500 mt-1">
                {docMetrics.inProgressCount} sedang diproses
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-bold text-gray-500">Notifikasi WhatsApp Terkirim</span>
              <p className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-1 font-mono">
                {docMetrics.whatsappNotificationsSent}
              </p>
              <p className="text-[11px] text-gray-500 mt-1">Pesan pembaruan status otomatis</p>
            </div>
          </div>

          {/* Visual Charts for Letter Services */}
          <VillageAnalyticsCharts
            siteConfig={siteConfig}
            chatMessages={chatMessages}
            requests={requests}
            apbdes={apbdes}
            citizens={citizens}
            defaultView="persuratan"
          />

          {/* Filter & Search Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { key: 'SEMUA', label: 'Semua Status' },
                { key: 'Menunggu Verifikasi', label: 'Menunggu Verifikasi' },
                { key: 'Validasi Dokumen', label: 'Validasi Dokumen' },
                { key: 'Menunggu Tanda Tangan Kades', label: 'Menunggu TTE Kades' },
                { key: 'Selesai', label: 'Selesai (Terbit TTE)' },
                { key: 'Ditolak', label: 'Ditolak' },
              ].map((st) => (
                <button
                  key={st.key}
                  onClick={() => setRequestStatusFilter(st.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    requestStatusFilter === st.key
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-800'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <input
                  type="text"
                  value={requestSearch}
                  onChange={(e) => setRequestSearch(e.target.value)}
                  placeholder="Cari tiket, nama, atau NIK..."
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 outline-none pr-8"
                />
                <Search className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-2.5" />
              </div>

              <button
                onClick={handleExportRequestsCsv}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition cursor-pointer shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Ekspor CSV</span>
              </button>
            </div>
          </div>

          {/* Requests Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-slate-800/60 text-gray-500 dark:text-gray-400 uppercase text-[10px] border-b border-gray-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Kode Tiket</th>
                    <th className="py-3.5 px-4">Pemohon & NIK</th>
                    <th className="py-3.5 px-4">Jenis Surat</th>
                    <th className="py-3.5 px-4">Kelengkapan Berkas</th>
                    <th className="py-3.5 px-4">Status & No. Surat</th>
                    <th className="py-3.5 px-4 text-right">Tindakan Perangkat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {filteredRequests.map((req) => {
                    const evalResult = evaluateVerificationChecklist(req.checklist);
                    return (
                      <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          {req.trackingCode}
                          <p className="text-[10px] text-gray-400 font-normal mt-0.5">{req.createdAt}</p>
                        </td>

                        <td className="py-3.5 px-4">
                          <p className="font-bold text-gray-900 dark:text-white">{req.citizenName}</p>
                          <p className="font-mono text-[11px] text-gray-500">
                            {showFullNik ? req.nik : maskSensitiveNumber(req.nik, false)}
                          </p>
                          <p className="text-[10px] text-emerald-600 font-mono">WA: {req.whatsapp}</p>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-bold text-gray-800 dark:text-gray-200">{req.letterTitle}</span>
                          <p className="text-[11px] text-gray-500 line-clamp-1 max-w-xs">{req.purpose}</p>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-20 bg-gray-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-emerald-600 h-full rounded-full"
                                style={{ width: `${evalResult.scorePercent}%` }}
                              />
                            </div>
                            <span className="font-mono font-bold text-[11px] text-emerald-700 dark:text-emerald-400">
                              {evalResult.completedCount}/{evalResult.totalCount}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              setInspectingRequest(req);
                              setAdminNoteInput(req.adminNotes || '');
                            }}
                            className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold mt-1 inline-flex items-center space-x-1 cursor-pointer"
                          >
                            <FileCheck2 className="w-3 h-3" />
                            <span>Periksa Checklist Dokumen</span>
                          </button>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-lg text-[10px] font-bold ${
                              req.status === 'Selesai'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : req.status === 'Ditolak'
                                ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {req.status}
                          </span>
                          {req.registrationNumber && (
                            <p className="text-[10px] font-mono text-gray-500 mt-1">
                              {req.registrationNumber}
                            </p>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {req.status !== 'Selesai' && (
                              <button
                                onClick={() => handleUpdateRequestStatus(req, 'Selesai')}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold inline-flex items-center space-x-1 transition cursor-pointer"
                                title="Setujui & Terbitkan Surat Ber-QR Code"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Setujui TTE</span>
                              </button>
                            )}

                            {req.status !== 'Ditolak' && req.status !== 'Selesai' && (
                              <button
                                onClick={() => handleUpdateRequestStatus(req, 'Ditolak')}
                                className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition cursor-pointer"
                                title="Tolak Permohonan"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              onClick={() => onViewLetter(req)}
                              className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition cursor-pointer"
                              title="Pratinjau / Cetak Surat Resmi Ber-QR Code"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteRequest(req)}
                              className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition cursor-pointer"
                              title="Hapus Permohonan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Checklist Verification Modal */}
          {inspectingRequest && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden">
                <div className="bg-emerald-900 text-white px-6 py-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm">
                      Modul Verifikasi Dokumen — {inspectingRequest.trackingCode}
                    </h3>
                    <p className="text-xs text-emerald-200">
                      {inspectingRequest.citizenName} ({inspectingRequest.letterTitle})
                    </p>
                  </div>
                  <button
                    onClick={() => setInspectingRequest(null)}
                    className="p-1 rounded-lg hover:bg-white/10 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-4 text-xs">
                  <div className="space-y-2">
                    <p className="font-bold text-gray-700 dark:text-gray-200">
                      Daftar Periksa Keabsahan Dokumen Pemohon:
                    </p>
                    {(
                      [
                        { key: 'nikMatchDukcapil', label: 'NIK 16 Digit Sesuai Database Kependudukan Desa' },
                        { key: 'kkMatchDukcapil', label: 'Nomor Kartu Keluarga (KK) Aktif & Sesuai' },
                        { key: 'ktpAttachmentClear', label: `Lampiran Berkas (${inspectingRequest.attachmentName}) Jelas & Sah` },
                        { key: 'pengantarRtRwValid', label: 'Keterangan Domisili RT/RW Setempat Valid' },
                        { key: 'noTaxArrearsPbb', label: 'Lunas Pajak Bumi & Bangunan (PBB-P2)' },
                      ] as { key: keyof VerificationChecklist; label: string }[]
                    ).map((item) => (
                      <label
                        key={item.key}
                        className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/70 border border-gray-200 dark:border-slate-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={inspectingRequest.checklist[item.key]}
                          onChange={() => handleToggleChecklistItem(inspectingRequest, item.key)}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="font-medium text-gray-800 dark:text-gray-200">{item.label}</span>
                      </label>
                    ))}
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Catatan Verifikator (Dikirimkan via WhatsApp ke Pemohon):
                    </label>
                    <textarea
                      rows={2}
                      value={adminNoteInput}
                      onChange={(e) => setAdminNoteInput(e.target.value)}
                      placeholder="Tambahkan catatan verifikasi atau instruksi pengambilan surat..."
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => {
                        handleUpdateRequestStatus(
                          inspectingRequest,
                          'Menunggu Tanda Tangan Kades',
                          adminNoteInput
                        );
                        setInspectingRequest(null);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
                    >
                      Teruskan ke Kades
                    </button>
                    <button
                      onClick={() => {
                        handleUpdateRequestStatus(inspectingRequest, 'Selesai', adminNoteInput);
                        setInspectingRequest(null);
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                    >
                      Setujui & Terbitkan TTE Sekarang
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DATABASE PENDUDUK TERINTEGRASI (KK & SILSILAH, MUTASI OTOMATIS, IMPORT/EXPORT CSV) */}
      {adminTab === 'penduduk' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
            <div>
              <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">
                Manajemen Basis Data Kependudukan & Kartu Keluarga (KK) {siteConfig.villageName}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Pengelompokan otomatis per Nomor KK (Kepala Keluarga, Istri, Anak), Mutasi Warga Terpadu, serta Import/Export CSV Massal.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowFullNik(!showFullNik)}
                className="px-3.5 py-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200 text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
              >
                {showFullNik ? (
                  <>
                    <Unlock className="w-3.5 h-3.5 text-amber-500" />
                    <span>NIK Terbuka</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Sensor Privasi NIK Aktif</span>
                  </>
                )}
              </button>

              <button
                onClick={handleExportMonthlyReportCsv}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Laporan Bulanan (CSV)</span>
              </button>

              <button
                onClick={openAddCitizenModal}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Penduduk Baru</span>
              </button>
            </div>
          </div>

          {/* Sub-mode Switcher for Penduduk */}
          <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-gray-200 dark:border-slate-800">
            {[
              { id: 'individu', label: `1. Daftar Individu (${filteredCitizens.length} Jiwa)` },
              {
                id: 'kk',
                label: `2. Kartu Keluarga & Silsilah (${groupCitizensByKk(filteredCitizens).length} KK)`,
              },
              {
                id: 'mutasi',
                label: `3. Mutasi Warga Terpadu (${populationMutations.length} Peristiwa)`,
              },
              {
                id: 'import_export',
                label: '4. Import / Export CSV & Excel Massal',
              },
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setPendudukViewMode(mode.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  pendudukViewMode === mode.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-emerald-50'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {/* Filter & Search */}
          {(pendudukViewMode === 'individu' || pendudukViewMode === 'kk') && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <span className="text-xs font-bold text-gray-500">Filter Wilayah Dusun:</span>
                <select
                  value={citizenDusunFilter}
                  onChange={(e) => setCitizenDusunFilter(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 px-3 py-2 rounded-xl text-xs font-bold outline-none"
                >
                  <option value="SEMUA">Semua Dusun ({citizens.length})</option>
                  {dusunOptions.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  value={citizenSearch}
                  onChange={(e) => setCitizenSearch(e.target.value)}
                  placeholder="Cari Nama, NIK, KK, atau Pekerjaan..."
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 outline-none pr-8"
                />
                <Search className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-2.5" />
              </div>
            </div>
          )}

          {/* MODE 1: DAFTAR INDIVIDU */}
          {pendudukViewMode === 'individu' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 dark:bg-slate-800/60 text-gray-500 dark:text-gray-400 uppercase text-[10px] border-b border-gray-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">NIK & No. KK</th>
                      <th className="py-3.5 px-4">Nama Lengkap & Hubungan KK</th>
                      <th className="py-3.5 px-4">Wilayah & TPS</th>
                      <th className="py-3.5 px-4">Pendidikan & Pekerjaan</th>
                      <th className="py-3.5 px-4">Program Bantuan (DTKS)</th>
                      <th className="py-3.5 px-4 text-right">Aksi CRUD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {filteredCitizens.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 font-mono">
                          <p className="font-bold text-emerald-700 dark:text-emerald-400">
                            {maskSensitiveNumber(c.nik, showFullNik)}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            KK: {maskSensitiveNumber(c.kk, showFullNik)}
                          </p>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-1.5">
                            <p className="font-bold text-gray-900 dark:text-white">{c.name}</p>
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                              {c.familyRole || inferFamilyRole(c)}
                            </span>
                            {c.lifeStatus && c.lifeStatus !== 'Hidup' && (
                              <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold">
                                {c.lifeStatus}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-500">
                            {c.gender} • {c.age} Thn ({c.birthPlace}, {c.birthDate})
                          </p>
                        </td>

                        <td className="py-3.5 px-4 text-gray-700 dark:text-gray-300">
                          <p className="font-semibold">{c.dusun}</p>
                          <p className="text-[11px] text-gray-400">
                            RT {c.rt}/RW {c.rw} • <strong className="text-emerald-600">{c.tpsNumber || 'TPS 01'}</strong>
                          </p>
                        </td>

                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-gray-800 dark:text-gray-200">{c.occupation}</p>
                          <p className="text-[11px] text-gray-500">{c.education}</p>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-lg text-[10px] font-bold ${
                              c.aidStatus === 'Non-Penerima'
                                ? 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            }`}
                          >
                            {c.aidStatus}
                          </span>
                          {c.aidStatus !== 'Non-Penerima' && c.aidStage && (
                            <p className="text-[10px] text-gray-400 mt-0.5">{c.aidStage}</p>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => openEditCitizenModal(c)}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 text-[11px] font-bold inline-flex items-center space-x-1 cursor-pointer"
                              title="Edit Biodata Penduduk"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteCitizen(c)}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 cursor-pointer"
                              title="Hapus Data Penduduk"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MODE 2: KARTU KELUARGA (KK) & SILSILAH KELUARGA TERPADU */}
          {pendudukViewMode === 'kk' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {groupCitizensByKk(filteredCitizens).map((card) => (
                <div
                  key={card.kkNumber}
                  className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-emerald-200 dark:border-slate-800 shadow-sm space-y-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-gray-100 dark:border-slate-800 pb-3">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">
                        Kartu Keluarga (No. KK: {maskSensitiveNumber(card.kkNumber, showFullNik)})
                      </span>
                      <h4 className="text-sm font-extrabold text-gray-900 dark:text-white mt-0.5">
                        Keluarga {card.headOfFamily.name} ({card.members.length} Anggota)
                      </h4>
                      <p className="text-[11px] text-gray-500">
                        {card.dusun} • RT {card.rt}/RW {card.rw} • {card.address}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          openAddMemberToKkModal(
                            card.kkNumber,
                            card.dusun,
                            card.rt,
                            card.rw,
                            card.address,
                            'Anak'
                          )
                        }
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer"
                      >
                        + Tambah Anggota KK
                      </button>
                    </div>
                  </div>

                  {/* Silsilah Anggota Keluarga */}
                  <div className="space-y-2">
                    {card.members.map((member) => {
                      const role = member.familyRole || inferFamilyRole(member);
                      return (
                        <div
                          key={member.id}
                          className="p-3 rounded-2xl bg-gray-50 dark:bg-slate-800/70 border border-gray-200/80 dark:border-slate-700 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                  role === 'Kepala Keluarga'
                                    ? 'bg-emerald-600 text-white'
                                    : role === 'Istri'
                                    ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                }`}
                              >
                                {role}
                              </span>
                              <span className="font-bold text-gray-900 dark:text-white">
                                {member.name}
                              </span>
                              <span className="font-mono text-[11px] text-gray-500">
                                ({maskSensitiveNumber(member.nik, showFullNik)})
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500">
                              {member.gender} • {member.age} Thn • {member.occupation} •{' '}
                              <strong className="text-emerald-700 dark:text-emerald-400">
                                Bansos: {member.aidStatus}
                              </strong>
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => openEditCitizenModal(member)}
                            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-[11px] font-bold text-blue-600 cursor-pointer"
                          >
                            Edit
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* MODE 3: MUTASI WARGA TERPADU (OTOMATIS UPDATE BUKU INDUK & BUKU MUTASI) */}
          {pendudukViewMode === 'mutasi' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
              <form
                onSubmit={handleExecuteIntegratedMutation}
                className="lg:col-span-5 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-4"
              >
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">
                    Integrasi Otomatis Buku Induk & Buku Mutasi
                  </span>
                  <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                    Catat Peristiwa Mutasi Warga (Lahir / Mati / Pindah / Datang)
                  </h3>
                </div>

                <div>
                  <label className="block font-bold mb-1">Jenis Peristiwa Mutasi Kependudukan</label>
                  <select
                    value={mutType}
                    onChange={(e) =>
                      setMutType(e.target.value as PopulationMutationItem['mutationType'])
                    }
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  >
                    <option value="KELAHIRAN">KELAHIRAN (+ Tambah Bayi ke KK & Buku Induk)</option>
                    <option value="DATANG_MASUK">
                      DATANG MASUK (+ Tambah Pendatang Baru ke Buku Induk)
                    </option>
                    <option value="KEMATIAN">
                      KEMATIAN (Perbarui Status Meninggal di Buku Induk)
                    </option>
                    <option value="PINDAH_KELUAR">
                      PINDAH KELUAR (Perbarui Status Pindah di Buku Induk)
                    </option>
                  </select>
                </div>

                {mutType === 'KELAHIRAN' || mutType === 'DATANG_MASUK' ? (
                  <>
                    <div>
                      <label className="block font-bold mb-1">
                        Nomor Kartu Keluarga (KK) Tujuan
                      </label>
                      <input
                        type="text"
                        value={mutNewKk}
                        onChange={(e) => setMutNewKk(e.target.value)}
                        placeholder="16 Digit Nomor KK"
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">
                        Nama Lengkap {mutType === 'KELAHIRAN' ? 'Bayi Baru Lahir' : 'Warga Pendatang'} *
                      </label>
                      <input
                        type="text"
                        required
                        value={mutNewName}
                        onChange={(e) => setMutNewName(e.target.value)}
                        placeholder="Contoh: Muhammad Rafa Pratama"
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold mb-1">NIK (16 Digit / Otomatis)</label>
                        <input
                          type="text"
                          value={mutNewNik}
                          onChange={(e) => setMutNewNik(e.target.value)}
                          placeholder="Kosongkan jika belum terbit"
                          className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-bold mb-1">Jenis Kelamin</label>
                        <select
                          value={mutNewGender}
                          onChange={(e) => setMutNewGender(e.target.value as Gender)}
                          className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        >
                          <option value="Laki-laki">Laki-laki</option>
                          <option value="Perempuan">Perempuan</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold mb-1">Tanggal Lahir / Datang</label>
                        <input
                          type="date"
                          value={mutNewBirthDate}
                          onChange={(e) => setMutNewBirthDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block font-bold mb-1">Wilayah Dusun</label>
                        <select
                          value={mutNewDusun}
                          onChange={(e) => setMutNewDusun(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        >
                          {dusunOptions.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block font-bold mb-1">
                      Pilih Warga Terdaftar di Buku Induk Penduduk *
                    </label>
                    <select
                      value={mutTargetCitizenId}
                      onChange={(e) => setMutTargetCitizenId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                    >
                      {citizens.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} — NIK {c.nik} ({c.dusun})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block font-bold mb-1">Catatan Resmi Buku Mutasi</label>
                  <input
                    type="text"
                    value={mutNotes}
                    onChange={(e) => setMutNotes(e.target.value)}
                    placeholder="Contoh: Lahir sehat di Puskesmas / Pindah domisili ke Kota Bogor"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                >
                  Proses Mutasi & Sinkronkan Buku Induk Penduduk
                </button>
              </form>

              <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-3">
                <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">
                  Log Riwayat Mutasi Warga Terpadu ({populationMutations.length} Peristiwa)
                </h4>
                <div className="space-y-2.5 max-h-[460px] overflow-y-auto">
                  {populationMutations.map((mut) => (
                    <div
                      key={mut.id}
                      className="p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800/70 border border-gray-200 dark:border-slate-700 flex items-center justify-between gap-3"
                    >
                      <div>
                        <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-[10px]">
                          {mut.mutationType} • {mut.date}
                        </span>
                        <p className="font-bold text-gray-900 dark:text-white mt-1">
                          {mut.citizenName} (NIK: {mut.nik}) — {mut.dusun}
                        </p>
                        <p className="text-[11px] text-gray-500">{mut.notes}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* MODE 4: IMPORT / EXPORT CSV & EXCEL MASSAL DENGAN PREVIEW VALIDASI */}
          {pendudukViewMode === 'import_export' && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-5 text-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100 dark:border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">
                    Otomatisasi Data Lapangan Perangkat Desa
                  </span>
                  <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                    Upload / Tempel CSV & Excel Data Warga dengan Preview Validasi Otomatis
                  </h3>
                  <p className="text-gray-500">
                    Format Kolom: <code>NIK,KK,Nama,JenisKelamin,TanggalLahir,Dusun,RT,RW,Pekerjaan,Bansos,HubunganKK</code>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const sample = [
                        'NIK,KK,Nama,JenisKelamin,TanggalLahir,Dusun,RT,RW,Pekerjaan,Bansos,HubunganKK',
                        '3201141205850011,3201140908120088,Hendra Gunawan,Laki-laki,1985-05-12,Dusun 1 Sukasari,002,001,Petani / Pekebun,BLT Dana Desa,Kepala Keluarga',
                        '3201145508880012,3201140908120088,Rina Marlina,Perempuan,1988-08-15,Dusun 1 Sukasari,002,001,Pedagang / UMKM,BLT Dana Desa,Istri',
                      ].join('\n');
                      setCsvRawInput(sample);
                      setCsvPreviewResult(
                        parseCitizensCsv(sample, hamlets[0]?.name || 'Dusun 1 Sukasari')
                      );
                    }}
                    className="px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 font-bold cursor-pointer"
                  >
                    Muat Contoh Data CSV
                  </button>
                  <button
                    type="button"
                    onClick={handleExportMonthlyReportCsv}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
                  >
                    Download Laporan Bulanan (CSV)
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="font-bold text-gray-700 dark:text-gray-300">
                    Unggah File `.csv` dari Excel atau Tempel Baris CSV di Bawah:
                  </label>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        const text = String(reader.result || '');
                        setCsvRawInput(text);
                        setCsvPreviewResult(
                          parseCitizensCsv(text, hamlets[0]?.name || 'Dusun 1 Sukasari')
                        );
                      };
                      reader.readAsText(file);
                    }}
                    className="text-xs"
                  />
                </div>

                <textarea
                  rows={5}
                  value={csvRawInput}
                  onChange={(e) => {
                    setCsvRawInput(e.target.value);
                    setCsvPreviewResult(
                      parseCitizensCsv(e.target.value, hamlets[0]?.name || 'Dusun 1 Sukasari')
                    );
                  }}
                  placeholder="NIK,KK,Nama,JenisKelamin,TanggalLahir,Dusun,RT,RW,Pekerjaan,Bansos,HubunganKK..."
                  className="w-full p-3.5 rounded-2xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 font-mono text-[11px]"
                />
              </div>

              {csvPreviewResult && (
                <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-slate-800 border border-emerald-200 dark:border-slate-700 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">
                        Preview Validasi Otomatis: {csvPreviewResult.validCitizens.length} Baris Valid •{' '}
                        {csvPreviewResult.errors.length} Baris Error
                      </h4>
                    </div>
                    {csvPreviewResult.validCitizens.length > 0 && (
                      <button
                        type="button"
                        onClick={handleCommitImportedCitizensCsv}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                      >
                        Simpan {csvPreviewResult.validCitizens.length} Warga Valid ke Database Server
                      </button>
                    )}
                  </div>

                  {csvPreviewResult.errors.length > 0 && (
                    <div className="p-3 rounded-xl bg-red-50 text-red-700 space-y-1">
                      {csvPreviewResult.errors.map((err, i) => (
                        <p key={i}>
                          • Baris {err.rowNumber}: {err.message}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: KALENDER ACARA DESA */}
      {adminTab === 'kalender' && (
        <Suspense
          fallback={
            <div className="p-8 text-center text-xs font-bold text-emerald-700 dark:text-emerald-400">
              Memuat Kalender Kegiatan Desa...
            </div>
          }
        >
          <VillageCalendarView
            agendas={agendas}
            siteConfig={siteConfig}
            hamlets={hamlets}
            onAddAgenda={(newAgenda) => {
              onUpdateAgendas([newAgenda, ...agendas]);
              appendAuditLog(`Jadwalkan Kegiatan: ${newAgenda.title}`, 'Kalender', newAgenda.id);
              onShowToast('Agenda Desa Dijadwalkan', `Kegiatan "${newAgenda.title}" berhasil disimpan.`);
            }}
            onUpdateAgenda={(updatedAgenda) => {
              onUpdateAgendas(
                agendas.map((a) => (a.id === updatedAgenda.id ? updatedAgenda : a))
              );
              appendAuditLog(`Perbarui Agenda: ${updatedAgenda.title}`, 'Kalender', updatedAgenda.id);
              onShowToast('Agenda Diperbarui', `Jadwal "${updatedAgenda.title}" berhasil diperbarui.`);
            }}
            onDeleteAgenda={(id) => {
              onUpdateAgendas(agendas.filter((a) => a.id !== id));
              onShowToast('Agenda Dihapus', 'Kegiatan telah dihapus dari kalender desa.');
            }}
            onBroadcastAgendaWa={(agenda) => {
              const updated = agendas.map((a) =>
                a.id === agenda.id ? { ...a, whatsappBroadcastSent: true } : a
              );
              onUpdateAgendas(updated);
              onShowToast(
                'Undangan WhatsApp Dikirim',
                `Broadcast undangan "${agenda.title}" tercatat untuk ${agenda.participantsTarget}.`
              );
            }}
          />
        </Suspense>
      )}

      {/* TAB 5: LIVE CHAT WARGA, INTEGRASI WA/TELEGRAM API & ASISTEN AI DESA */}
      {adminTab === 'integrasi' && (
        <div className="space-y-6 text-xs">
          {/* Real Server Integration Status Cards */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-white">
                  Status Real-Time Integrasi Server, WhatsApp/Telegram API & Gemini AI Desa
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Seluruh endpoint di bawah berjalan nyata di server Express (`/api/chat`, `/api/integrations/*`, `/api/ai/*`, `/api/security/verify`).
                </p>
              </div>
              <button
                type="button"
                onClick={fetchIntegrationDiagnostics}
                disabled={isCheckingStatus}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center space-x-1.5 cursor-pointer self-start sm:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                <span>Uji Koneksi Server</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-slate-800/70 border border-emerald-200 dark:border-slate-700 space-y-1">
                <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400">
                  Database Persistent (`/api/db`)
                </span>
                <p className="font-extrabold text-sm text-gray-900 dark:text-white">
                  {integrationStatus?.database?.recordsTotal ?? citizens.length + requests.length} Record Aktif
                </p>
                <p className="text-[11px] text-gray-500 font-mono">
                  Latensi Baca: {integrationStatus?.database?.readLatencyMs ?? 0.4} ms • {integrationStatus?.database?.sizeKb ?? 85} KB
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-green-50/70 dark:bg-slate-800/70 border border-green-200 dark:border-slate-700 space-y-1">
                <span className="text-[10px] font-bold uppercase text-green-700 dark:text-green-400">
                  WhatsApp Gateway (`/api/integrations/whatsapp`)
                </span>
                <p className="font-extrabold text-sm text-gray-900 dark:text-white">
                  +{siteConfig.officialWhatsApp}
                </p>
                <p className="text-[11px] text-gray-500">
                  {integrationStatus?.services?.whatsappGateway?.statusLabel || 'Aktif (Direct WA API & Log DB)'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-sky-50/70 dark:bg-slate-800/70 border border-sky-200 dark:border-slate-700 space-y-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold uppercase text-sky-700 dark:text-sky-400">
                    Telegram Bot API (`/api/integrations/telegram`)
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                      integrationStatus?.services?.telegramBridge?.configuredToken
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-200 dark:bg-amber-950 text-amber-900 dark:text-amber-300'
                    }`}
                  >
                    {integrationStatus?.services?.telegramBridge?.configuredToken
                      ? 'Configured'
                      : 'Not Configured'}
                  </span>
                </div>
                <p className="font-extrabold text-sm text-gray-900 dark:text-white truncate">
                  @{siteConfig.telegramBotUsername || 'pemdes_sukamaju_bot'}
                </p>
                <p className="text-[11px] text-gray-500 font-mono">
                  Chat ID Terakhir:{' '}
                  <strong className="text-sky-700 dark:text-sky-300">
                    {integrationStatus?.services?.telegramBridge?.lastChatId ||
                      derivedLastTelegramChatId ||
                      'Belum ada'}
                  </strong>
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-slate-800/70 border border-teal-200 dark:border-slate-700 space-y-1">
                <span className="text-[10px] font-bold uppercase text-teal-700 dark:text-teal-400">
                  Asisten AI Desa (`/api/ai/chat`)
                </span>
                <p className="font-extrabold text-sm text-gray-900 dark:text-white">
                  Model: {siteConfig.aiModel || 'gemini-3.8-flash'}
                </p>
                <p className="text-[11px] text-gray-500">
                  {integrationStatus?.services?.geminiAi?.statusLabel || 'Aktif (Server-Side Proxy)'}
                </p>
              </div>
            </div>
          </div>

          {/* Visual Analytics Charts (Tampilan Grafik Omnichannel, Telegram AI, Persuratan & APBDes) */}
          <Suspense
            fallback={
              <div className="p-6 text-center text-xs font-bold text-emerald-700 dark:text-emerald-400">
                Memuat Grafik Analitik...
              </div>
            }
          >
            <VillageAnalyticsCharts
              siteConfig={siteConfig}
              chatMessages={chatMessages}
              requests={requests}
              apbdes={apbdes}
              citizens={citizens}
              defaultView="all"
            />
          </Suspense>

          {/* Unified Telegram Bot API, Token Status, Webhook & AI Integration Configuration Panel */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-sky-200 dark:border-slate-800 shadow-sm space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-800 pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 font-extrabold text-[10px] uppercase">
                    Telegram Bot API + AI Config
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-lg font-extrabold text-[10px] uppercase ${
                      integrationStatus?.services?.telegramBridge?.configuredToken
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    Token Server:{' '}
                    {integrationStatus?.services?.telegramBridge?.configuredToken
                      ? 'TERKONFIGURASI (TELEGRAM_BOT_TOKEN Aktif)'
                      : 'BELUM DIKONFIGURASI (Not Configured)'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-extrabold text-[10px] uppercase">
                    AI Telegram:{' '}
                    {siteConfig.telegramAiAutoReply !== false
                      ? 'Auto-Reply AI Aktif (gemini-3.8-flash)'
                      : 'Manual (/ai)'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-mono text-[10px]">
                    Secret Header:{' '}
                    {integrationStatus?.services?.telegramBridge?.configuredWebhookSecret
                      ? 'Aktif (Verified)'
                      : 'Opsional (Tidak Diset)'}
                  </span>
                </div>
                <h4 className="text-base font-extrabold text-gray-900 dark:text-white">
                  Konfigurasi Terpadu Bot Telegram, Status Token Server, Webhook & Integrasi AI Desa
                </h4>
                <p className="text-gray-500">
                  Atur identitas Bot Telegram, Chat ID default, mode <strong>Auto-Reply AI Telegram</strong>, dan persona AI langsung di konfigurasi desa (`siteConfig`). Token rahasia (`TELEGRAM_BOT_TOKEN` & `GEMINI_API_KEY`) dibaca aman dari environment server (`.env`).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="px-3.5 py-2 rounded-xl bg-sky-50 dark:bg-slate-800 border border-sky-200 dark:border-slate-700">
                  <span className="block text-[10px] text-gray-500 uppercase font-bold">
                    Chat ID Pengirim Terakhir
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-extrabold text-sm text-sky-700 dark:text-sky-300">
                      {integrationStatus?.services?.telegramBridge?.lastChatId ||
                        derivedLastTelegramChatId ||
                        siteConfig.telegramDefaultChatId ||
                        'Belum ada'}
                    </span>
                    {(integrationStatus?.services?.telegramBridge?.lastChatId ||
                      derivedLastTelegramChatId) && (
                      <button
                        type="button"
                        onClick={() => {
                          const cid =
                            integrationStatus?.services?.telegramBridge?.lastChatId ||
                            derivedLastTelegramChatId;
                          setAdminReplyChannel('telegram');
                          setAdminReplyTelegramChatId(String(cid));
                        }}
                        className="px-2 py-0.5 rounded bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-bold cursor-pointer"
                      >
                        Gunakan untuk Balas
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Editable Telegram Bot & AI Configuration Row (Saved to siteConfig in Database) */}
            <div className="p-4 rounded-2xl bg-sky-50/50 dark:bg-slate-800/60 border border-sky-200/80 dark:border-slate-700 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-extrabold text-xs text-sky-900 dark:text-sky-300">
                  Pengaturan Konfigurasi Bot Telegram & Asisten AI Desa (`siteConfig`)
                </span>
                <label className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={siteConfig.telegramAiAutoReply !== false}
                    onChange={(e) => {
                      const nextVal = e.target.checked;
                      onUpdateSiteConfig({
                        ...siteConfig,
                        telegramAiAutoReply: nextVal,
                      });
                      onShowToast(
                        nextVal ? 'Auto-Reply AI Telegram Diaktifkan' : 'Auto-Reply AI Telegram Dinonaktifkan',
                        nextVal
                          ? 'Setiap pertanyaan masuk di Webhook Telegram akan dijawab otomatis oleh Asisten AI Desa.'
                          : 'Bot hanya merespons perintah /start, /status, dan /ai secara eksplisit.'
                      );
                    }}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-extrabold text-xs text-emerald-700 dark:text-emerald-400">
                    Aktifkan Auto-Reply AI di Webhook Telegram (`telegramAiAutoReply`)
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Username Bot Telegram (`@bot`)
                  </label>
                  <input
                    type="text"
                    value={siteConfig.telegramBotUsername || ''}
                    onChange={(e) =>
                      onUpdateSiteConfig({
                        ...siteConfig,
                        telegramBotUsername: e.target.value.replace(/^@/, ''),
                      })
                    }
                    placeholder="pemdes_sukamaju_bot"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Tautan Kanal / Grup Telegram Desa
                  </label>
                  <input
                    type="text"
                    value={siteConfig.socialMedia.telegram || ''}
                    onChange={(e) =>
                      onUpdateSiteConfig({
                        ...siteConfig,
                        socialMedia: {
                          ...siteConfig.socialMedia,
                          telegram: e.target.value,
                        },
                      })
                    }
                    placeholder="t.me/pemdes_sukamaju"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Default / Admin Telegram Chat ID
                  </label>
                  <input
                    type="text"
                    value={siteConfig.telegramDefaultChatId || ''}
                    onChange={(e) =>
                      onUpdateSiteConfig({
                        ...siteConfig,
                        telegramDefaultChatId: e.target.value,
                      })
                    }
                    placeholder="619283745"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Instruksi Persona & Gaya Bahasa Asisten AI Telegram (`telegramAiPersona`)
                </label>
                <input
                  type="text"
                  value={siteConfig.telegramAiPersona || ''}
                  onChange={(e) =>
                    onUpdateSiteConfig({
                      ...siteConfig,
                      telegramAiPersona: e.target.value,
                    })
                  }
                  placeholder="Ramah, solutif, menggunakan Bahasa Indonesia baku pemerintahan desa yang sopan..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Webhook Registration & Quick Test */}
              <div className="lg:col-span-7 space-y-3">
                <label className="block font-bold text-gray-700 dark:text-gray-200">
                  Endpoint URL Webhook Publik (`setWebhook` ke Telegram Bot API)
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    value={webhookUrlInput}
                    onChange={(e) => setWebhookUrlInput(e.target.value)}
                    placeholder="https://domain-desa-anda.run.app/api/telegram/webhook"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleSetTelegramWebhook}
                    disabled={isSettingWebhook}
                    className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold flex items-center justify-center space-x-1.5 cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSettingWebhook ? 'animate-spin' : ''}`} />
                    <span>{isSettingWebhook ? 'Mendaftarkan...' : 'Set Webhook'}</span>
                  </button>
                </div>

                {webhookActionStatus && (
                  <div
                    className={`p-3 rounded-xl border font-semibold ${
                      webhookActionStatus.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                        : 'bg-red-50 dark:bg-red-950/50 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300'
                    }`}
                  >
                    {webhookActionStatus.message}
                  </div>
                )}

                <div className="pt-1 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-gray-500">
                    Uji Webhook & Auto-Reply AI Telegram (`/api/telegram/webhook`):
                  </span>
                  <button
                    type="button"
                    disabled={isSimulatingWebhook}
                    onClick={() => handleSimulateIncomingTelegramWebhook('/start')}
                    className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-sky-700 dark:text-sky-300 font-mono font-bold text-[11px] cursor-pointer"
                  >
                    Simulasi /start
                  </button>
                  <button
                    type="button"
                    disabled={isSimulatingWebhook}
                    onClick={() =>
                      handleSimulateIncomingTelegramWebhook(
                        `/status ${requests[0]?.trackingCode || 'SRT-2026-SKU-001'}`
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-sky-700 dark:text-sky-300 font-mono font-bold text-[11px] cursor-pointer"
                  >
                    Simulasi /status {requests[0]?.trackingCode || 'SRT-2026-SKU-001'}
                  </button>
                  <button
                    type="button"
                    disabled={isSimulatingWebhook}
                    onClick={() =>
                      handleSimulateIncomingTelegramWebhook(
                        '/ai Apa saja syarat mengurus Surat Pengantar Nikah (N1-N4) dan jam buka Balai Desa?'
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] cursor-pointer"
                  >
                    Simulasi /ai Tanya Syarat Surat
                  </button>
                  <button
                    type="button"
                    disabled={isSimulatingWebhook}
                    onClick={() =>
                      handleSimulateIncomingTelegramWebhook(
                        'Halo Bot Desa, berapa jumlah penerima bantuan sosial (Bansos) dan realisasi APBDes tahun ini?'
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer"
                  >
                    Simulasi Tanya AI Bansos & APBDes
                  </button>
                </div>
              </div>

              {/* Environment Variable Instructions */}
              <div className="lg:col-span-5 p-4 rounded-2xl bg-slate-900 text-slate-100 space-y-2 font-mono text-[11px]">
                <div className="flex items-center justify-between text-amber-300 font-sans font-extrabold text-xs">
                  <span>Instruksi Token & API Key Server (`.env`)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-emerald-300 font-mono">
                    Server-Only
                  </span>
                </div>
                <p className="font-sans text-[11px] text-slate-300 leading-relaxed">
                  Token Bot & API Key AI hanya dibaca dari environment server (`.env`) dan tidak pernah disimpan di database:
                </p>
                <pre className="p-2.5 rounded-xl bg-slate-950 text-emerald-300 overflow-x-auto text-[10px] leading-relaxed">
{`TELEGRAM_BOT_TOKEN="123456789:AAH_token_botfather"
TELEGRAM_WEBHOOK_SECRET="rahasia_webhook_desa"
GEMINI_API_KEY="AIzaSy_kunci_gemini_server"
APP_URL="https://domain-publik-desa.run.app"`}
                </pre>
                <p className="font-sans text-[10px] text-slate-400 leading-relaxed">
                  • Ketika warga mengirim perintah <code>/ai &lt;pertanyaan&gt;</code> atau pesan biasa ke Bot Telegram, server memanggil <strong>Gemini AI (`gemini-3.8-flash`)</strong> dan otomatis mengirim balasan ke <code>chatId</code> warga.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Col (7): Live Chat Inbox & Omnichannel Reply (Web / WA / Telegram) */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center space-x-2">
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                    <span>Kotak Masuk Live Chat Warga & Kanal WA / Telegram ({chatMessages.length})</span>
                  </h4>
                  <p className="text-gray-500">
                    Pesan masuk dari Telegram menampilkan <code>chatId</code> pengirim. Klik <strong>Balas ke Chat ID</strong> untuk balas manual atau <strong>Balas AI</strong> untuk mengirim jawaban Asisten AI Desa ke Telegram warga.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1 bg-gray-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-gray-100 dark:border-slate-800">
                {chatMessages.map((msg) => {
                  const msgTelegramChatId =
                    msg.telegramChatId ||
                    (msg.channel === 'telegram' && msg.sessionId?.startsWith('tg-')
                      ? msg.sessionId.replace(/^tg-/, '')
                      : '');
                  return (
                    <div
                      key={msg.id}
                      className={`p-3 rounded-2xl border text-xs space-y-1.5 ${
                        msg.senderRole === 'citizen'
                          ? 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-900/60'
                          : msg.senderRole === 'ai'
                          ? 'bg-teal-50/70 dark:bg-slate-800/80 border-teal-200 dark:border-teal-900/50'
                          : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded font-bold uppercase font-mono ${
                              msg.channel === 'telegram'
                                ? 'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300'
                                : msg.channel === 'whatsapp'
                                ? 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300'
                                : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                            }`}
                          >
                            {msg.channel}
                          </span>
                          <span className="font-bold text-gray-900 dark:text-white">
                            {msg.senderName}
                          </span>
                          {msg.senderPhone && msg.senderPhone !== '-' && (
                            <span className="font-mono text-gray-500">({msg.senderPhone})</span>
                          )}
                          {msgTelegramChatId && (
                            <span className="px-2 py-0.5 rounded bg-sky-50 dark:bg-slate-800 border border-sky-200 dark:border-slate-700 font-mono text-sky-700 dark:text-sky-300 font-bold">
                              chatId: {msgTelegramChatId}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {msg.channel === 'telegram' &&
                            msg.senderRole === 'citizen' &&
                            msgTelegramChatId && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAdminReplyChannel('telegram');
                                    setAdminReplyTelegramChatId(msgTelegramChatId);
                                    setAdminReplyRecipientName(msg.senderName);
                                    setAdminReplyError(null);
                                  }}
                                  className="px-2 py-0.5 rounded bg-sky-600 hover:bg-sky-700 text-white font-bold cursor-pointer"
                                >
                                  Balas ke Chat ID ({msgTelegramChatId})
                                </button>
                                <button
                                  type="button"
                                  disabled={isSendingAiTelegram}
                                  onClick={() =>
                                    handleTriggerTelegramAiReply(
                                      msgTelegramChatId,
                                      msg.senderName,
                                      msg.message
                                    )
                                  }
                                  className="px-2 py-0.5 rounded bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer disabled:opacity-50"
                                >
                                  🤖 Balas AI
                                </button>
                              </>
                            )}
                          <span className="text-gray-400 font-mono">{msg.timestamp}</span>
                        </div>
                      </div>
                      <p className="text-gray-700 dark:text-gray-200 whitespace-pre-line leading-relaxed">
                        {msg.message}
                      </p>
                    </div>
                  );
                })}
              </div>

              {adminReplyError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 font-semibold flex items-start justify-between gap-2">
                  <span>{adminReplyError}</span>
                  <button
                    type="button"
                    onClick={() => setAdminReplyError(null)}
                    className="text-red-500 hover:text-red-700 font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {externalDispatchUrl && (
                <div className="p-3 rounded-xl bg-emerald-900 text-white flex items-center justify-between">
                  <span>Tautan dispatch kanal WhatsApp siap dibuka:</span>
                  <a
                    href={externalDispatchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 font-bold text-amber-300 hover:underline"
                  >
                    <span>Buka WhatsApp</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              <form onSubmit={handleAdminSendChatReply} className="space-y-3 pt-2 border-t border-gray-100 dark:border-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold mb-1">Kanal Pengiriman Balasan</label>
                    <select
                      value={adminReplyChannel}
                      onChange={(e) => {
                        setAdminReplyChannel(e.target.value as any);
                        setAdminReplyError(null);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                    >
                      <option value="web">Live Chat Portal Web (Langsung Tampil)</option>
                      <option value="telegram">Telegram Bot API (`/api/integrations/telegram` ke chatId)</option>
                      <option value="whatsapp">WhatsApp Gateway API (`wa.me` + Log DB)</option>
                    </select>
                  </div>
                  {adminReplyChannel === 'telegram' ? (
                    <div>
                      <label className="block font-bold mb-1 text-sky-700 dark:text-sky-400">
                        Target Chat ID Pengirim Telegram (`chatId`) *
                      </label>
                      <input
                        type="text"
                        value={adminReplyTelegramChatId}
                        onChange={(e) => setAdminReplyTelegramChatId(e.target.value)}
                        placeholder="Contoh: 619283745 atau @channel"
                        className="w-full px-3 py-2 rounded-xl border border-sky-400 dark:border-sky-700 bg-sky-50/40 dark:bg-slate-800 font-mono font-bold"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block font-bold mb-1">Nomor WA / Tujuan (Jika via WA)</label>
                      <input
                        type="text"
                        value={adminReplyRecipientPhone}
                        onChange={(e) => setAdminReplyRecipientPhone(e.target.value)}
                        placeholder="62812xxxxxxx"
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={adminReplyText}
                    onChange={(e) => setAdminReplyText(e.target.value)}
                    placeholder={
                      adminReplyChannel === 'telegram'
                        ? `Ketik balasan ke Telegram Chat ID ${adminReplyTelegramChatId || '...'}...`
                        : 'Ketik balasan resmi Perangkat Desa untuk warga...'
                    }
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <button
                    type="submit"
                    disabled={isSendingReply || !adminReplyText.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {adminReplyChannel === 'telegram' ? 'Kirim via Bot API' : 'Kirim Balasan'}
                    </span>
                  </button>
                </div>
              </form>
            </div>

            {/* Right Col (5): Server-Side Gemini AI Official Draft Assistant */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2.5 rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-400">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-base text-gray-900 dark:text-white">
                    Asisten AI Pemerintah Desa (`gemini-3.8-flash`)
                  </h4>
                  <p className="text-gray-500">
                    Susun draf pengumuman resmi, artikel berita desa, atau himbauan warga secara otomatis via `/api/ai/draft`.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block font-bold mb-1">Jenis Dokumen / Publikasi</label>
                  <select
                    value={aiDraftType}
                    onChange={(e) => setAiDraftType(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  >
                    <option value="pengumuman">Pengumuman Resmi Warga & Running Text</option>
                    <option value="berita">Artikel Berita Kegiatan Desa</option>
                    <option value="surat">Himbauan & Surat Edaran Kepala Desa</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">Topik / Pokok Informasi</label>
                  <input
                    type="text"
                    value={aiDraftTopic}
                    onChange={(e) => setAiDraftTopic(e.target.value)}
                    placeholder="Contoh: Jadwal Posyandu Serentak & Pembagian Bibit Tanaman"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleGenerateAiDraft}
                  disabled={isGeneratingAi}
                  className="w-full py-2.5 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingAi ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>
                    {isGeneratingAi
                      ? 'Menyusun Draf Resmi di Server...'
                      : 'Susun Draf dengan Gemini AI Desa'}
                  </span>
                </button>

                {aiDraftResult && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-[10px] text-teal-700 dark:text-teal-300 font-mono">
                      <span>Hasil Draf Resmi:</span>
                      <span>Engine: {aiDraftProvider}</span>
                    </div>
                    <textarea
                      rows={6}
                      value={aiDraftResult}
                      onChange={(e) => setAiDraftResult(e.target.value)}
                      className="w-full p-3 rounded-2xl border border-teal-200 dark:border-slate-700 bg-teal-50/40 dark:bg-slate-800 text-xs leading-relaxed"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateSiteConfig({
                            ...siteConfig,
                            runningText: aiDraftResult.replace(/\n+/g, ' • ').slice(0, 260),
                          });
                          onShowToast(
                            'Running Text Diperbarui!',
                            'Draf berhasil dipasang pada pengumuman berjalan di bagian atas website.'
                          );
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[11px] cursor-pointer"
                      >
                        Pasang ke Running Text Atas
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const newArticle: VillageNews = {
                            id: `news-ai-${Date.now()}`,
                            title: aiDraftTopic,
                            category: 'Pengumuman',
                            date: new Date().toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                            }),
                            author: currentUser.fullName,
                            excerpt: aiDraftResult.slice(0, 140) + '...',
                            summary: aiDraftResult.slice(0, 140) + '...',
                            content: aiDraftResult,
                            imageUrl: mediaAssets[0]?.dataUrl || siteConfig.heroImageUrl,
                            readTime: '3 Menit',
                          };
                          onUpdateNews([newArticle, ...news]);
                          onShowToast(
                            'Berita Desa Dipublikasikan!',
                            `Artikel "${newArticle.title}" telah terbit di Beranda.`
                          );
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer"
                      >
                        Terbitkan sebagai Berita Desa
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: KEAMANAN DATA, VERIFIKASI KRIPTOGRAFI SHA-256 & AUDIT LOG */}
      {adminTab === 'keamanan' && isSuperAdmin && (
        <div className="space-y-6">
          {/* Interactive Server-Side Cryptographic HMAC-SHA256 Verification */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm p-6 space-y-4 text-xs">
            <div>
              <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">
                Verifikasi Kriptografi HMAC-SHA256 Dokumen TTE & NIK Penduduk (`/api/security/verify`)
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Uji keaslian tanda tangan elektronik (TTE QR-Code) surat desa atau validitas NIK warga menggunakan mesin kriptografi SHA-256 di server.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={verifyQuery}
                onChange={(e) => setVerifyQuery(e.target.value)}
                placeholder="Masukkan Kode Tiket (mis. SKTM-2026-001), Kode QR TTE, atau NIK 16 Digit..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 font-mono"
              />
              <button
                type="button"
                onClick={() => handleRunCryptoVerify()}
                disabled={isVerifyingCrypto}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center space-x-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isVerifyingCrypto ? 'Memverifikasi...' : 'Verifikasi SHA-256 Server'}</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-gray-400">Contoh Cepat:</span>
              {requests.slice(0, 3).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setVerifyQuery(r.trackingCode);
                    handleRunCryptoVerify(r.trackingCode);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-emerald-50 font-mono text-[11px] font-semibold cursor-pointer"
                >
                  {r.trackingCode}
                </button>
              ))}
              {citizens.slice(0, 2).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setVerifyQuery(c.nik);
                    handleRunCryptoVerify(c.nik);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-emerald-50 font-mono text-[11px] font-semibold cursor-pointer"
                >
                  NIK: {c.name}
                </button>
              ))}
            </div>

            {verifyResult && (
              <div
                className={`p-4 rounded-2xl border ${
                  verifyResult.verified
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                    : 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800'
                }`}
              >
                {verifyResult.verified ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-emerald-800 dark:text-emerald-300 text-sm">
                        ✓ TERVERIFIKASI SAH ({verifyResult.type}) — {verifyResult.title}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-mono text-[10px] font-bold">
                        {verifyResult.algorithm}
                      </span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-200">
                      Pemegang: <strong>{verifyResult.holderName}</strong> ({verifyResult.nikMasked}) • Status: <strong>{verifyResult.status}</strong> • Nomor: <strong>{verifyResult.registrationNumber}</strong>
                    </p>
                    <p className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400 break-all">
                      SHA-256 Signature: {verifyResult.cryptographicHash}
                    </p>
                  </div>
                ) : (
                  <p className="font-bold text-red-700 dark:text-red-300">{verifyResult.message}</p>
                )}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">
                  Sidik Jari Integritas Kependudukan & Catatan Audit Log Perangkat Desa
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Setiap perubahan surat, data warga, agenda, dan konfigurasi CMS tercatat beserta hash integritas data.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
                Total Log Tercatat: {auditLogs.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-gray-50 dark:bg-slate-800/60 text-gray-500 uppercase text-[10px] border-b border-gray-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Waktu</th>
                    <th className="py-3 px-4">Perangkat Desa</th>
                    <th className="py-3 px-4">Modul</th>
                    <th className="py-3 px-4">Aktivitas</th>
                    <th className="py-3 px-4">Hash Integritas</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-[11px]">
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="py-2.5 px-4 text-gray-500">{log.timestamp}</td>
                      <td className="py-2.5 px-4 font-sans font-bold text-gray-900 dark:text-white">
                        {log.actor}
                        <span className="block text-[10px] font-normal text-gray-400">{log.role}</span>
                      </td>
                      <td className="py-2.5 px-4 font-sans font-semibold text-emerald-700 dark:text-emerald-400">
                        {log.module}
                      </td>
                      <td className="py-2.5 px-4 font-sans text-gray-700 dark:text-gray-300">
                        {log.action}
                      </td>
                      <td className="py-2.5 px-4 text-gray-500">{log.encryptionHash}</td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-[10px]">
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH / EDIT PENDUDUK */}
      {isCitizenModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
            <div className="bg-emerald-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-base">
                  {editingCitizen ? `Edit Biodata Warga — ${editingCitizen.name}` : 'Tambah Data Penduduk Baru'}
                </h3>
              </div>
              <button
                onClick={() => setIsCitizenModalOpen(false)}
                className="p-1 text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCitizen} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              {citizenFormError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 font-semibold">
                  {citizenFormError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    NIK (16 Digit) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={16}
                    value={formNik}
                    onChange={(e) => setFormNik(e.target.value.replace(/\D/g, ''))}
                    placeholder="320114xxxxxxxxxx"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Nomor Kartu Keluarga (KK)
                  </label>
                  <input
                    type="text"
                    maxLength={16}
                    value={formKk}
                    onChange={(e) => setFormKk(e.target.value.replace(/\D/g, ''))}
                    placeholder="320114xxxxxxxxxx"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Nama Lengkap Sesuai KTP <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Nama Lengkap Warga"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value as Gender)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Tempat Lahir
                  </label>
                  <input
                    type="text"
                    value={formBirthPlace}
                    onChange={(e) => setFormBirthPlace(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Tanggal Lahir
                  </label>
                  <input
                    type="date"
                    value={formBirthDate}
                    onChange={(e) => setFormBirthDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Status Perkawinan
                  </label>
                  <select
                    value={formMaritalStatus}
                    onChange={(e) => setFormMaritalStatus(e.target.value as Citizen['maritalStatus'])}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Belum Kawin">Belum Kawin</option>
                    <option value="Kawin">Kawin</option>
                    <option value="Cerai Hidup">Cerai Hidup</option>
                    <option value="Cerai Mati">Cerai Mati</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Wilayah Dusun
                  </label>
                  <select
                    value={formDusun}
                    onChange={(e) => setFormDusun(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {dusunOptions.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">RT</label>
                  <input
                    type="text"
                    value={formRt}
                    onChange={(e) => setFormRt(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none text-center"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">RW</label>
                  <input
                    type="text"
                    value={formRw}
                    onChange={(e) => setFormRw(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Pendidikan Terakhir
                  </label>
                  <select
                    value={formEducation}
                    onChange={(e) => setFormEducation(e.target.value as EducationLevel)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                  >
                    <option value="Tidak/Belum Sekolah">Tidak/Belum Sekolah</option>
                    <option value="SD/Sederajat">SD/Sederajat</option>
                    <option value="SMP/Sederajat">SMP/Sederajat</option>
                    <option value="SMA/Sederajat">SMA/Sederajat</option>
                    <option value="Diploma (D1-D3)">Diploma (D1-D3)</option>
                    <option value="Sarjana (S1)">Sarjana (S1)</option>
                    <option value="Pascasarjana (S2/S3)">Pascasarjana (S2/S3)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Pekerjaan Utama
                  </label>
                  <select
                    value={formOccupation}
                    onChange={(e) => setFormOccupation(e.target.value as OccupationType)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                  >
                    <option value="Petani / Pekebun">Petani / Pekebun</option>
                    <option value="Pedagang / UMKM">Pedagang / UMKM</option>
                    <option value="Karyawan Swasta">Karyawan Swasta</option>
                    <option value="PNS / TNI / Polri">PNS / TNI / Polri</option>
                    <option value="Wiraswasta">Wiraswasta</option>
                    <option value="Guru / Tenaga Pendidik">Guru / Tenaga Pendidik</option>
                    <option value="Bidan / Tenaga Medis">Bidan / Tenaga Medis</option>
                    <option value="Pelajar / Mahasiswa">Pelajar / Mahasiswa</option>
                    <option value="Mengurus Rumah Tangga">Mengurus Rumah Tangga</option>
                    <option value="Belum / Tidak Bekerja">Belum / Tidak Bekerja</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Status Bantuan Sosial (DTKS)
                  </label>
                  <select
                    value={formAidStatus}
                    onChange={(e) => setFormAidStatus(e.target.value as AidStatus)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                  >
                    <option value="Non-Penerima">Non-Penerima</option>
                    <option value="PKH">PKH (Keluarga Harapan)</option>
                    <option value="BLT Dana Desa">BLT Dana Desa</option>
                    <option value="BPNT">BPNT (Sembako)</option>
                    <option value="BPJS PBI">BPJS PBI Kesehatan</option>
                    <option value="Beasiswa Desa">Beasiswa Desa</option>
                    <option value="Rutilahu">Bantuan Rutilahu</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Hubungan Dalam KK (Silsilah)
                  </label>
                  <select
                    value={formFamilyRole}
                    onChange={(e) => setFormFamilyRole(e.target.value as FamilyRelationRole)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none font-bold"
                  >
                    <option value="Kepala Keluarga">Kepala Keluarga</option>
                    <option value="Istri">Istri</option>
                    <option value="Anak">Anak</option>
                    <option value="Orang Tua">Orang Tua</option>
                    <option value="Famili Lain">Famili Lain</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Lokasi TPS Pemilih
                  </label>
                  <input
                    type="text"
                    value={formTpsNumber}
                    onChange={(e) => setFormTpsNumber(e.target.value)}
                    placeholder="TPS 01"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Tahap / Nominal Bansos (Rp)
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      value={formAidStage}
                      onChange={(e) => setFormAidStage(e.target.value)}
                      placeholder="Tahap I"
                      className="w-full px-2.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                    />
                    <input
                      type="number"
                      value={formAidAmount}
                      onChange={(e) => setFormAidAmount(e.target.value)}
                      placeholder="300000"
                      className="w-full px-2.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Nomor Telepon / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="0812xxxxxxx"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Alamat Lengkap
                  </label>
                  <input
                    type="text"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    placeholder="Jl. / Kp. / Nomor Rumah"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                  />
                </div>
              </div>

              <ImageUploadField
                label="Pas Foto Warga (Opsional - Disimpan di Database)"
                value={formPhotoUrl}
                onChange={setFormPhotoUrl}
                category="lainnya"
              />

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCitizenModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  {editingCitizen ? 'Simpan Perubahan Data' : 'Simpan Warga Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
