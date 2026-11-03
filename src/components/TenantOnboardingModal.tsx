import React, { useState } from 'react';
import { Building2, Loader2, X } from 'lucide-react';

interface TenantOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (title: string, message: string) => void;
}

export const TenantOnboardingModal: React.FC<TenantOnboardingModalProps> = ({ isOpen, onClose, onShowToast }) => {
  const [villageName, setVillageName] = useState('');
  const [slug, setSlug] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!villageName.trim() || !slug.trim() || !contactName.trim() || !contactEmail.trim()) {
      onShowToast('Validasi', 'Nama desa, slug, nama kontak, dan email wajib diisi.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/tenant-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          village_name: villageName.trim(),
          slug: slug.trim(),
          contact_name: contactName.trim(),
          contact_email: contactEmail.trim(),
          contact_phone: contactPhone.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onShowToast('Request Terkirim', 'Permintaan onboarding desa berhasil dikirim. Admin akan meninjau.');
        setVillageName(''); setSlug(''); setContactName(''); setContactEmail(''); setContactPhone(''); setNotes('');
        onClose();
      } else {
        onShowToast('Error', data?.error || 'Gagal mengirim request.');
      }
    } catch {
      onShowToast('Error', 'Gagal mengirim request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-teal-600" />
            <h3 className="font-extrabold text-base text-gray-900 dark:text-white">Daftar Desa (SaaS Onboarding)</h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="Nama Desa"
            value={villageName}
            onChange={(e) => setVillageName(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
          />
          <input
            type="text"
            placeholder="Slug (mis. desa4)"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
          />
          <input
            type="text"
            placeholder="Nama Kontak"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
          />
          <input
            type="email"
            placeholder="Email Kontak"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
          />
          <input
            type="text"
            placeholder="No. Telepon/WhatsApp (opsional)"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
          />
          <textarea
            placeholder="Catatan (opsional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            rows={3}
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-xs font-bold flex items-center justify-center space-x-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
            <span>{submitting ? 'Mengirim...' : 'Kirim Request'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
