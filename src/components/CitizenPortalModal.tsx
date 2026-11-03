import React, { useEffect, useState } from 'react';
import { User, X, LogOut, FileText, Edit2, Save } from 'lucide-react';

interface CitizenPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  citizen: { nik: string; name: string; kk: string; dusun: string } | null;
  token: string;
  onLogin: (nik: string, password: string) => Promise<void>;
  onLogout: () => void;
  onOpenLetterModal: () => void;
  onCitizenUpdated?: (citizen: { nik: string; name: string; kk: string; dusun: string }) => void;
}

export const CitizenPortalModal: React.FC<CitizenPortalModalProps> = ({
  isOpen,
  onClose,
  citizen,
  token,
  onLogin,
  onLogout,
  onOpenLetterModal,
  onCitizenUpdated,
}) => {
  const [nik, setNik] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!citizen || !token) return;
    setPhone('');
    setAddress('');
    fetch('/api/citizen/requests', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.requests) setRequests(data.requests); })
      .catch(() => {});
  }, [citizen, token]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onLogin(nik.trim(), password);
      setNik('');
      setPassword('');
    } catch (err: any) {
      setError(err?.message || 'Login gagal.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/citizen/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ phone: phone.trim() || undefined, address: address.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Gagal menyimpan profil.');
      if (data?.citizen && onCitizenUpdated) {
        onCitizenUpdated({ nik: data.citizen.nik, name: data.citizen.name, kk: data.citizen.kk, dusun: data.citizen.dusun });
      }
      setEditing(false);
    } catch (err: any) {
      setError(err?.message || 'Gagal menyimpan profil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto pt-8">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-emerald-100 dark:border-slate-800 shadow-2xl overflow-hidden my-4">
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center space-x-2.5">
            <User className="w-5 h-5 text-emerald-300" />
            <div>
              <h3 className="font-bold text-base">Portal Warga</h3>
              <p className="text-xs text-emerald-200">Login dengan NIK & PIN (4 digit terakhir NIK)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {!citizen ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 text-xs text-red-600 dark:text-red-300">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">NIK (16 digit)</label>
                <input
                  type="text"
                  value={nik}
                  onChange={(e) => setNik(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  placeholder="320114xxxxxxxxxx"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">PIN (4 digit terakhir NIK)</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  placeholder="****"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold flex items-center justify-center space-x-2"
              >
                <User className="w-4 h-4" />
                <span>{loading ? 'Memproses...' : 'Masuk Portal Warga'}</span>
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <p className="font-bold text-gray-900 dark:text-white text-sm">{citizen.name}</p>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">NIK: {citizen.nik}</p>
                <p className="text-xs text-gray-600 dark:text-gray-300">KK: {citizen.kk}</p>
                <p className="text-xs text-gray-600 dark:text-gray-300">Dusun: {citizen.dusun}</p>
              </div>

              {editing ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="No. WhatsApp baru"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Alamat baru"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold flex items-center justify-center space-x-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>{saving ? 'Menyimpan...' : 'Simpan'}</span>
                    </button>
                    <button
                      onClick={() => setEditing(false)}
                      className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200 text-xs font-semibold"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center justify-center space-x-2"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Edit Profil</span>
                </button>
              )}

              <button
                onClick={() => {
                  onClose();
                  onOpenLetterModal();
                }}
                className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold flex items-center justify-center space-x-2"
              >
                <FileText className="w-4 h-4" />
                <span>Ajukan Surat Online</span>
              </button>

              {requests.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Riwayat Surat ({requests.length})</p>
                  <div className="max-h-40 overflow-y-auto space-y-1.5">
                    {requests.map((r) => (
                      <div key={r.id || r.trackingCode} className="p-2.5 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{r.trackingCode}</span>
                          <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">{r.status}</span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mt-0.5">{r.letterTitle || r.letterType}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={onLogout}
                className="w-full py-2.5 rounded-xl bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center justify-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

