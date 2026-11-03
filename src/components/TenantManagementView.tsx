import React, { useEffect, useState } from 'react';
import { Building2, Plus, Loader2, CreditCard, Activity, TrendingUp, Bell, Key } from 'lucide-react';

interface Tenant {
  id: string;
  slug: string;
  name: string;
  status: string;
  created_at?: string;
}

interface Subscription {
  tenant_id: string;
  plan: string;
  status: string;
  max_users: number;
  max_storage_mb: number;
  max_requests_per_month: number;
  started_at?: string;
  expires_at?: string | null;
  updated_at?: string;
}

interface Usage {
  month: string;
  request_count: number;
  limit: number;
  percentage: number;
}

interface NotificationSettings {
  tenant_id: string;
  email_enabled: boolean;
  email_recipient: string | null;
  whatsapp_enabled: boolean;
  whatsapp_recipient: string | null;
  notify_letter_status: boolean;
  notify_aspirations: boolean;
}

interface TenantManagementViewProps {
  adminToken: string;
  onShowToast: (title: string, message: string) => void;
}

const PLAN_PRESETS: Record<string, { max_users: number; max_storage_mb: number; max_requests_per_month: number; label: string }> = {
  free: { max_users: 10, max_storage_mb: 100, max_requests_per_month: 1000, label: 'Free' },
  basic: { max_users: 50, max_storage_mb: 500, max_requests_per_month: 10000, label: 'Basic' },
  pro: { max_users: 200, max_storage_mb: 2000, max_requests_per_month: 100000, label: 'Pro' },
  enterprise: { max_users: 1000, max_storage_mb: 10000, max_requests_per_month: 1000000, label: 'Enterprise' },
};

export const TenantManagementView: React.FC<TenantManagementViewProps> = ({ adminToken, onShowToast }) => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newId, setNewId] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newName, setNewName] = useState('');

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [savingBilling, setSavingBilling] = useState(false);
  const [plan, setPlan] = useState('free');
  const [status, setStatus] = useState('active');
  const [maxUsers, setMaxUsers] = useState(10);
  const [maxStorage, setMaxStorage] = useState(100);
  const [maxRequests, setMaxRequests] = useState(1000);
  const [integrationStatus, setIntegrationStatus] = useState<any>(null);
  const [testingIntegration, setTestingIntegration] = useState(false);

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);
  const [notifLoading, setNotifLoading] = useState(true);
  const [savingNotif, setSavingNotif] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [whatsappRecipient, setWhatsappRecipient] = useState('');
  const [notifyLetterStatus, setNotifyLetterStatus] = useState(true);
  const [notifyAspirations, setNotifyAspirations] = useState(true);
  const [onboardingRequests, setOnboardingRequests] = useState<any[]>([]);
  const [onboardingLoading, setOnboardingLoading] = useState(true);
  const [ssoLoading, setSsoLoading] = useState(true);
  const [savingSso, setSavingSso] = useState(false);
  const [ssoEnabled, setSsoEnabled] = useState(false);
  const [ssoProvider, setSsoProvider] = useState('oidc');
  const [ssoIssuer, setSsoIssuer] = useState('');
  const [ssoClientId, setSsoClientId] = useState('');
  const [ssoClientSecret, setSsoClientSecret] = useState('');
  const [ssoRedirect, setSsoRedirect] = useState('');
  const [ssoScopes, setSsoScopes] = useState('openid profile email');

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tenants', { headers: { Authorization: `Bearer ${adminToken}` } });
      const data = await res.json();
      if (res.ok) setTenants(data.tenants || []);
      else onShowToast('Error', data?.error || 'Gagal memuat tenant.');
    } catch {
      onShowToast('Error', 'Gagal memuat tenant.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscription = async () => {
    setBillingLoading(true);
    try {
      const res = await fetch('/api/subscription', { headers: { Authorization: `Bearer ${adminToken}` } });
      const data = await res.json();
      if (res.ok) {
        setSubscription(data.subscription);
        setUsage(data.usage);
        if (data.subscription) {
          setPlan(data.subscription.plan || 'free');
          setStatus(data.subscription.status || 'active');
          setMaxUsers(data.subscription.max_users ?? 10);
          setMaxStorage(data.subscription.max_storage_mb ?? 100);
          setMaxRequests(data.subscription.max_requests_per_month ?? 1000);
        }
      } else {
        onShowToast('Error', data?.error || 'Gagal memuat subscription.');
      }
    } catch {
      onShowToast('Error', 'Gagal memuat subscription.');
    } finally {
      setBillingLoading(false);
    }
  };

  const fetchNotificationSettings = async () => {
    setNotifLoading(true);
    try {
      const res = await fetch('/api/notifications', { headers: { Authorization: `Bearer ${adminToken}` } });
      const data = await res.json();
      if (res.ok && data.settings) {
        setNotificationSettings(data.settings);
        setEmailEnabled(!!data.settings.email_enabled);
        setEmailRecipient(data.settings.email_recipient || '');
        setWhatsappEnabled(data.settings.whatsapp_enabled !== false);
        setWhatsappRecipient(data.settings.whatsapp_recipient || '');
        setNotifyLetterStatus(data.settings.notify_letter_status !== false);
        setNotifyAspirations(data.settings.notify_aspirations !== false);
      }
    } catch {
      onShowToast('Error', 'Gagal memuat pengaturan notifikasi.');
    } finally {
      setNotifLoading(false);
    }
  };

  const handleSaveNotifications = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingNotif(true);
    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          email_enabled: emailEnabled,
          email_recipient: emailRecipient || null,
          whatsapp_enabled: whatsappEnabled,
          whatsapp_recipient: whatsappRecipient || null,
          notify_letter_status: notifyLetterStatus,
          notify_aspirations: notifyAspirations,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotificationSettings(data.settings);
        onShowToast('Notifikasi Disimpan', 'Pengaturan notifikasi tenant berhasil diperbarui.');
      } else {
        onShowToast('Error', data?.error || 'Gagal menyimpan notifikasi.');
      }
    } catch {
      onShowToast('Error', 'Gagal menyimpan notifikasi.');
    } finally {
      setSavingNotif(false);
    }
  };

  const fetchSsoSettings = async () => {
    setSsoLoading(true);
    try {
      const res = await fetch('/api/sso', { headers: { Authorization: `Bearer ${adminToken}` } });
      const data = await res.json();
      if (res.ok && data.settings) {
        setSsoEnabled(!!data.settings.enabled);
        setSsoProvider(data.settings.provider || 'oidc');
        setSsoIssuer(data.settings.issuer_url || '');
        setSsoClientId(data.settings.client_id || '');
        setSsoClientSecret(data.settings.client_secret || '');
        setSsoRedirect(data.settings.redirect_uri || '');
        setSsoScopes(data.settings.scopes || 'openid profile email');
      }
    } catch {
      onShowToast('Error', 'Gagal memuat pengaturan SSO.');
    } finally {
      setSsoLoading(false);
    }
  };

  const handleSaveSso = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingSso(true);
    try {
      const res = await fetch('/api/sso', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          enabled: ssoEnabled,
          provider: ssoProvider,
          issuer_url: ssoIssuer || null,
          client_id: ssoClientId || null,
          client_secret: ssoClientSecret || null,
          redirect_uri: ssoRedirect || null,
          scopes: ssoScopes || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onShowToast('SSO Disimpan', 'Pengaturan SSO tenant berhasil diperbarui.');
      } else {
        onShowToast('Error', data?.error || 'Gagal menyimpan SSO.');
      }
    } catch {
      onShowToast('Error', 'Gagal menyimpan SSO.');
    } finally {
      setSavingSso(false);
    }
  };

  const fetchOnboardingRequests = async () => {
    setOnboardingLoading(true);
    try {
      const res = await fetch('/api/tenant-requests', { headers: { Authorization: `Bearer ${adminToken}` } });
      const data = await res.json();
      if (res.ok) setOnboardingRequests(data.requests || []);
    } catch {
      onShowToast('Error', 'Gagal memuat request onboarding.');
    } finally {
      setOnboardingLoading(false);
    }
  };

  const handleOnboardingAction = async (id: number, action: 'approve' | 'reject') => {
    try {
      const res = await fetch(`/api/tenant-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        onShowToast('Onboarding', action === 'approve' ? `Tenant ${data.tenant_id} dibuat.` : 'Request ditolak.');
        fetchOnboardingRequests();
        fetchTenants();
      } else {
        onShowToast('Error', data?.error || 'Gagal memproses request.');
      }
    } catch {
      onShowToast('Error', 'Gagal memproses request.');
    }
  };

  const handleTestIntegration = async () => {
    setTestingIntegration(true);
    try {
      await fetchIntegrationStatus();
      // Try sending a test notification if channels configured
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ channel: 'email', message: 'Test koneksi integrasi desa-saas', subject: 'Test Koneksi' }),
      });
      if (res.ok) {
        await fetch('/api/notifications/dispatch', { method: 'POST', headers: { Authorization: `Bearer ${adminToken}` } });
        onShowToast('Test Koneksi', 'Test notifikasi email dikirim (cek outbox).');
      } else {
        const data = await res.json().catch(() => ({}));
        onShowToast('Test Koneksi', data?.error || 'Email belum terkonfigurasi; status integrasi diperbarui.');
      }
    } catch {
      onShowToast('Error', 'Gagal test koneksi.');
    } finally {
      setTestingIntegration(false);
    }
  };

  const fetchIntegrationStatus = async () => {
    try {
      const res = await fetch('/api/integrations/status');
      const data = await res.json();
      if (res.ok) setIntegrationStatus(data);
    } catch {}
  };

  useEffect(() => {
    fetchTenants();
    fetchSubscription();
    fetchNotificationSettings();
    fetchSsoSettings();
    fetchOnboardingRequests();
    fetchIntegrationStatus();
  }, [adminToken]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newId.trim() || !newSlug.trim() || !newName.trim()) {
      onShowToast('Validasi', 'ID, slug, dan nama wajib diisi.');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ id: newId.trim(), slug: newSlug.trim(), name: newName.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        onShowToast('Tenant Dibuat', `Tenant ${newName} berhasil dibuat.`);
        setNewId(''); setNewSlug(''); setNewName('');
        fetchTenants();
      } else {
        onShowToast('Error', data?.error || 'Gagal membuat tenant.');
      }
    } catch {
      onShowToast('Error', 'Gagal membuat tenant.');
    } finally {
      setCreating(false);
    }
  };

  const applyPreset = (p: string) => {
    const preset = PLAN_PRESETS[p];
    if (!preset) return;
    setPlan(p);
    setMaxUsers(preset.max_users);
    setMaxStorage(preset.max_storage_mb);
    setMaxRequests(preset.max_requests_per_month);
  };

  const handleSaveBilling = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingBilling(true);
    try {
      const res = await fetch('/api/subscription', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          plan,
          status,
          max_users: Number(maxUsers) || 0,
          max_storage_mb: Number(maxStorage) || 0,
          max_requests_per_month: Number(maxRequests) || 0,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubscription(data.subscription);
        setUsage(data.usage);
        onShowToast('Billing Disimpan', `Paket ${plan} berhasil diperbarui.`);
      } else {
        onShowToast('Error', data?.error || 'Gagal menyimpan billing.');
      }
    } catch {
      onShowToast('Error', 'Gagal menyimpan billing.');
    } finally {
      setSavingBilling(false);
    }
  };

  const handleUpgrade = async (targetPlan: string) => {
    applyPreset(targetPlan);
    setTimeout(() => {
      handleSaveBilling();
    }, 0);
  };

  const usagePct = usage?.percentage ?? 0;
  const usageColor = usagePct >= 90 ? 'bg-red-500' : usagePct >= 70 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Building2 className="w-5 h-5 text-emerald-600" />
        <h3 className="font-extrabold text-base sm:text-lg text-gray-900 dark:text-white">Manajemen Tenant (SaaS)</h3>
      </div>

      <form onSubmit={handleCreate} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 space-y-3">
        <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Buat Tenant Baru</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="ID (mis. desa4)"
            value={newId}
            onChange={(e) => setNewId(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
          />
          <input
            type="text"
            placeholder="Slug (mis. desa4)"
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
          />
          <input
            type="text"
            placeholder="Nama Desa"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
          />
        </div>
        <button
          type="submit"
          disabled={creating}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold flex items-center space-x-2"
        >
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          <span>{creating ? 'Membuat...' : 'Buat Tenant'}</span>
        </button>
      </form>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
          <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Daftar Tenant ({tenants.length})</p>
        </div>
        {loading ? (
          <div className="p-6 text-center text-xs text-gray-500">Memuat...</div>
        ) : tenants.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-500">Belum ada tenant.</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {tenants.map((t) => (
              <div key={t.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{t.name}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">ID: {t.id} | Slug: {t.slug} | Status: {t.status}</p>
                </div>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">{t.id}.app.com</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2 mt-4">
        <CreditCard className="w-5 h-5 text-indigo-600" />
        <h3 className="font-extrabold text-base sm:text-lg text-gray-900 dark:text-white">Billing & Subscription (SaaS)</h3>
      </div>

      {billingLoading ? (
        <div className="p-6 text-center text-xs text-gray-500">Memuat billing...</div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Penggunaan Bulan {usage?.month}</p>
              </div>
              <span className="text-[10px] font-mono text-gray-500">{usage?.request_count ?? 0} / {usage?.limit ?? 0} request</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
              <div className={`${usageColor} h-2.5 rounded-full transition-all`} style={{ width: `${usagePct}%` }} />
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              {usagePct}% kuota terpakai. {usagePct >= 90 ? 'Segera upgrade paket!' : usagePct >= 70 ? 'Penggunaan mendekati batas.' : 'Penggunaan normal.'}
            </p>
          </div>

          {subscription && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 space-y-2">
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Paket Aktif</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <p className="text-[10px] text-gray-500">Plan</p>
                  <p className="font-bold text-gray-900 dark:text-white uppercase">{subscription.plan}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500">Status</p>
                  <p className="font-bold text-gray-900 dark:text-white">{subscription.status}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500">Max Users</p>
                  <p className="font-bold text-gray-900 dark:text-white">{subscription.max_users}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500">Max Storage</p>
                  <p className="font-bold text-gray-900 dark:text-white">{subscription.max_storage_mb} MB</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 space-y-3">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Upgrade / Atur Paket</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(PLAN_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleUpgrade(key)}
                  disabled={savingBilling}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                    plan === key
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-slate-700 hover:border-indigo-400'
                  } disabled:opacity-60`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSaveBilling} className="space-y-3 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500">Plan</label>
                  <select
                    value={plan}
                    onChange={(e) => applyPreset(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  >
                    {Object.keys(PLAN_PRESETS).map((p) => (
                      <option key={p} value={p}>{PLAN_PRESETS[p].label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  >
                    <option value="active">active</option>
                    <option value="suspended">suspended</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500">Max Users</label>
                  <input
                    type="number"
                    min={1}
                    value={maxUsers}
                    onChange={(e) => setMaxUsers(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500">Max Storage (MB)</label>
                  <input
                    type="number"
                    min={1}
                    value={maxStorage}
                    onChange={(e) => setMaxStorage(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-gray-500">Max Requests / Bulan</label>
                  <input
                    type="number"
                    min={1}
                    value={maxRequests}
                    onChange={(e) => setMaxRequests(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={savingBilling}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold flex items-center space-x-2"
              >
                {savingBilling ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                <span>{savingBilling ? 'Menyimpan...' : 'Simpan Billing'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
      {/* ---- Notifikasi Per Tenant (Fase 3) ---- */}
      <div className="flex items-center space-x-2 mt-4">
        <Bell className="w-5 h-5 text-rose-600" />
        <h3 className="font-extrabold text-base sm:text-lg text-gray-900 dark:text-white">Notifikasi Per Tenant (Email/WhatsApp)</h3>
      </div>

      {notifLoading ? (
        <div className="p-6 text-center text-xs text-gray-500">Memuat notifikasi...</div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 space-y-3">
          <form onSubmit={handleSaveNotifications} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center space-x-2 text-xs">
                <input type="checkbox" checked={emailEnabled} onChange={(e) => setEmailEnabled(e.target.checked)} />
                <span className="font-bold text-gray-700 dark:text-gray-300">Email aktif</span>
              </label>
              <input
                type="email"
                placeholder="Email penerima (tenant)"
                value={emailRecipient}
                onChange={(e) => setEmailRecipient(e.target.value)}
                disabled={!emailEnabled}
                className="px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs disabled:opacity-50"
              />
              <label className="flex items-center space-x-2 text-xs">
                <input type="checkbox" checked={whatsappEnabled} onChange={(e) => setWhatsappEnabled(e.target.checked)} />
                <span className="font-bold text-gray-700 dark:text-gray-300">WhatsApp aktif</span>
              </label>
              <input
                type="text"
                placeholder="No. WhatsApp penerima (tenant)"
                value={whatsappRecipient}
                onChange={(e) => setWhatsappRecipient(e.target.value)}
                disabled={!whatsappEnabled}
                className="px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs disabled:opacity-50"
              />
            </div>
            <div className="flex flex-wrap gap-4 text-xs">
              <label className="flex items-center space-x-2">
                <input type="checkbox" checked={notifyLetterStatus} onChange={(e) => setNotifyLetterStatus(e.target.checked)} />
                <span className="text-gray-700 dark:text-gray-300">Notif status surat</span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="checkbox" checked={notifyAspirations} onChange={(e) => setNotifyAspirations(e.target.checked)} />
                <span className="text-gray-700 dark:text-gray-300">Notif aspirasi warga</span>
              </label>
            </div>
            <button
              type="submit"
              disabled={savingNotif}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-xs font-bold flex items-center space-x-2"
            >
              {savingNotif ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
              <span>{savingNotif ? 'Menyimpan...' : 'Simpan Notifikasi'}</span>
            </button>
          </form>
        </div>
      )}

      {/* ---- SSO Per Tenant (Fase 3 scaffold) ---- */}
      <div className="flex items-center space-x-2 mt-4">
        <Key className="w-5 h-5 text-violet-600" />
        <h3 className="font-extrabold text-base sm:text-lg text-gray-900 dark:text-white">SSO (Single Sign-On) Per Tenant</h3>
      </div>

      {ssoLoading ? (
        <div className="p-6 text-center text-xs text-gray-500">Memuat SSO...</div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 space-y-3">
          <form onSubmit={handleSaveSso} className="space-y-3">
            <label className="flex items-center space-x-2 text-xs">
              <input type="checkbox" checked={ssoEnabled} onChange={(e) => setSsoEnabled(e.target.checked)} />
              <span className="font-bold text-gray-700 dark:text-gray-300">SSO aktif</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-gray-500">Provider</label>
                <select
                  value={ssoProvider}
                  onChange={(e) => setSsoProvider(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                >
                  <option value="oidc">OIDC</option>
                  <option value="saml">SAML</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500">Issuer URL</label>
                <input
                  type="text"
                  value={ssoIssuer}
                  onChange={(e) => setSsoIssuer(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500">Client ID</label>
                <input
                  type="text"
                  value={ssoClientId}
                  onChange={(e) => setSsoClientId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500">Client Secret</label>
                <input
                  type="password"
                  value={ssoClientSecret}
                  onChange={(e) => setSsoClientSecret(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500">Redirect URI</label>
                <input
                  type="text"
                  value={ssoRedirect}
                  onChange={(e) => setSsoRedirect(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500">Scopes</label>
                <input
                  type="text"
                  value={ssoScopes}
                  onChange={(e) => setSsoScopes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={savingSso}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-xs font-bold flex items-center space-x-2"
            >
              {savingSso ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
              <span>{savingSso ? 'Menyimpan...' : 'Simpan SSO'}</span>
            </button>
          </form>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">
            Catatan: konfigurasi SSO disimpan per tenant. Integrasi penuh dengan IdP (OIDC/SAML) dapat ditambahkan pada tahap berikutnya.
          </p>
        </div>
      )}

      {/* ---- Self-Service Onboarding Requests (Fase 4) ---- */}
      <div className="flex items-center space-x-2 mt-4">
        <Building2 className="w-5 h-5 text-teal-600" />
        <h3 className="font-extrabold text-base sm:text-lg text-gray-900 dark:text-white">Request Onboarding Tenant (Self-Service)</h3>
      </div>

      {onboardingLoading ? (
        <div className="p-6 text-center text-xs text-gray-500">Memuat request...</div>
      ) : onboardingRequests.length === 0 ? (
        <div className="p-6 text-center text-xs text-gray-500">Belum ada request onboarding.</div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {onboardingRequests.map((r) => (
              <div key={r.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{r.village_name} ({r.slug})</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    {r.contact_name} — {r.contact_email} {r.contact_phone ? `— ${r.contact_phone}` : ''}
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">Status: {r.status} {r.approved_tenant_id ? `→ ${r.approved_tenant_id}` : ''}</p>
                </div>
                {r.status === 'pending' && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleOnboardingAction(r.id, 'approve')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleOnboardingAction(r.id, 'reject')}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- Integrasi & Provider (Info) ---- */}
      <div className="flex items-center space-x-2 mt-4">
        <CreditCard className="w-5 h-5 text-slate-600" />
        <h3 className="font-extrabold text-base sm:text-lg text-gray-900 dark:text-white">Integrasi & Provider (Konfigurasi Server)</h3>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 space-y-2 text-xs">
        <p className="text-gray-600 dark:text-gray-300">Status integrasi (dari server):</p>
        <pre className="text-[10px] bg-slate-100 dark:bg-slate-900 p-2 rounded-lg overflow-x-auto">{JSON.stringify(integrationStatus, null, 2)}</pre>
        <p className="text-[10px] text-gray-500 dark:text-gray-400">
          Isi kredensial di file <code>.env</code> server, lalu restart server:
          PAYMENT_PROVIDER, MIDTRANS_SERVER_KEY / XENDIT, EMAIL_PROVIDER + API key, WHATSAPP_PROVIDER + token, ALERT_WEBHOOK_URL, NOTIFICATION_WEBHOOK_URL.
        </p>
        <button
          onClick={handleTestIntegration}
          disabled={testingIntegration}
          className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-bold flex items-center space-x-2"
        >
          {testingIntegration ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          <span>{testingIntegration ? 'Menguji...' : 'Test Koneksi'}</span>
        </button>
      </div>

    </div>
  );
};
