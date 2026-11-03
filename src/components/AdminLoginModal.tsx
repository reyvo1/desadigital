import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, KeyRound, Lock, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { AdminUser, VillageSiteConfig } from '../types/village';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AdminUser, token?: string) => void;
  adminUsers: AdminUser[];
  siteConfig: VillageSiteConfig;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  siteConfig,
}) => {
  const [mode, setMode] = useState<'login' | 'reset_request' | 'reset_confirm'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nip, setNip] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Username dan kata sandi wajib diisi.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setInfoMessage(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim().toLowerCase(),
          password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.status !== 'ok') {
        setError(data.error || 'Username atau kata sandi perangkat desa tidak sesuai.');
        setIsLoading(false);
        return;
      }
      setError(null);
      setPassword('');
      onLoginSuccess(data.user, data.token);
      onClose();
    } catch {
      setError('Gagal terhubung ke server otentikasi desa. Periksa koneksi jaringan Anda.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !nip.trim()) {
      setError('Username dan NIP perangkat desa wajib diisi untuk verifikasi.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setInfoMessage(null);

    try {
      const res = await fetch('/api/auth/reset-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim().toLowerCase(),
          nip: nip.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.status !== 'ok') {
        setError(data.error || 'Verifikasi username dan NIP gagal.');
        setIsLoading(false);
        return;
      }
      if (data.resetToken) {
        setResetToken(data.resetToken);
      }
      setInfoMessage(
        data.message ||
          'Token pemulihan kata sandi (berlaku 15 menit) berhasil diterbitkan. Silakan masukkan kata sandi baru Anda.'
      );
      setMode('reset_confirm');
    } catch {
      setError('Gagal menghubungi layanan pemulihan kata sandi server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !resetToken.trim() || newPassword.length < 6) {
      setError('Token reset wajib diisi dan kata sandi baru minimal 6 karakter.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/reset-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim().toLowerCase(),
          resetToken: resetToken.trim(),
          newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.status !== 'ok') {
        setError(data.error || 'Token pemulihan tidak valid atau telah kedaluwarsa.');
        setIsLoading(false);
        return;
      }
      setInfoMessage('Kata sandi berhasil diperbarui dengan enkripsi Scrypt. Silakan login.');
      setPassword('');
      setNewPassword('');
      setResetToken('');
      setMode('login');
    } catch {
      setError('Gagal menyimpan kata sandi baru ke server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-emerald-100 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 to-emerald-950 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
              <Lock className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-base">
                {mode === 'login'
                  ? `Login Perangkat ${siteConfig.villageName}`
                  : 'Pemulihan Kata Sandi Perangkat Desa'}
              </h3>
              <p className="text-[11px] text-emerald-300">
                Otentikasi Server-Side Scrypt & Sesi Berbasis Token RBAC
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 cursor-pointer"
            aria-label="Tutup Modal Login"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-300">
                {error}
              </div>
            )}

            {infoMessage && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{infoMessage}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="admin-login-username"
                className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1"
              >
                Username Perangkat Desa
              </label>
              <input
                id="admin-login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username perangkat desa"
                autoComplete="username"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="admin-login-password"
                  className="block text-xs font-bold text-gray-700 dark:text-gray-300"
                >
                  Kata Sandi Otorisasi
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setInfoMessage(null);
                    setMode('reset_request');
                  }}
                  className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  Lupa Kata Sandi?
                </button>
              </div>
              <input
                id="admin-login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi"
                autoComplete="current-password"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 pt-1">
              <span className="inline-flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Enkripsi Scrypt + Token Sesi 8 Jam</span>
              </span>
              <span>RBAC Protected</span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <KeyRound className="w-4 h-4" />
              )}
              <span>{isLoading ? 'Memverifikasi Kredensial...' : 'Masuk ke Dasbor Admin & CMS Desa'}</span>
            </button>
          </form>
        )}

        {mode === 'reset_request' && (
          <form onSubmit={handleRequestReset} className="p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-300">
                {error}
              </div>
            )}

            <p className="text-xs text-gray-600 dark:text-gray-300">
              Masukkan <strong>Username</strong> dan <strong>NIP / Nomor Induk Perangkat</strong> Anda untuk menerbitkan token pemulihan kata sandi satu kali pakai (15 menit).
            </p>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Username Perangkat Desa
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Contoh: admin"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                NIP / Nomor Induk Perangkat Terdaftar
              </label>
              <input
                type="text"
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                placeholder="Contoh: 19860412 201403 1 002"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white"
                required
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode('login');
                }}
                className="px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 text-xs font-bold text-gray-700 dark:text-gray-300 inline-flex items-center space-x-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali</span>
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
              >
                {isLoading ? 'Memverifikasi...' : 'Terbitkan Token Reset'}
              </button>
            </div>
          </form>
        )}

        {mode === 'reset_confirm' && (
          <form onSubmit={handleConfirmReset} className="p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-300">
                {error}
              </div>
            )}

            {infoMessage && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300">
                {infoMessage}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Token Pemulihan (15 Menit)
              </label>
              <input
                type="text"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                placeholder="Masukkan token reset"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Kata Sandi Baru (Minimal 6 Karakter)
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Masukkan kata sandi baru"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-white"
                required
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode('login');
                }}
                className="px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 text-xs font-bold text-gray-700 dark:text-gray-300 inline-flex items-center space-x-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Batal</span>
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
              >
                {isLoading ? 'Menyimpan...' : 'Simpan Kata Sandi Baru'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
