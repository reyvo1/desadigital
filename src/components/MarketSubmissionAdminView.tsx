import React, { useEffect, useState } from 'react';
import { CheckCircle, Loader2, Store, XCircle } from 'lucide-react';

interface Props {
  adminToken: string;
  onShowToast: (title: string, message: string) => void;
}

export const MarketSubmissionAdminView: React.FC<Props> = ({ adminToken, onShowToast }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/market-submissions', { headers: { Authorization: `Bearer ${adminToken}` } });
      const data = await res.json();
      if (res.ok) setItems(data.submissions || []);
      else onShowToast('Error', data?.error || 'Gagal memuat pengajuan.');
    } catch {
      onShowToast('Error', 'Gagal memuat pengajuan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, [adminToken]);

  const handleAction = async (id: number, action: 'approve' | 'reject') => {
    try {
      const res = await fetch(`/api/market-submissions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        onShowToast('Lapak', action === 'approve' ? `Produk disetujui (${data.product_id}).` : 'Pengajuan ditolak.');
        fetchItems();
      } else {
        onShowToast('Error', data?.error || 'Gagal memproses.');
      }
    } catch {
      onShowToast('Error', 'Gagal memproses.');
    }
  };

  if (loading) return <div className="p-4 text-xs text-gray-500">Memuat pengajuan lapak...</div>;

  const pending = items.filter((i) => i.status === 'pending');

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 space-y-3">
      <div className="flex items-center space-x-2">
        <Store className="w-5 h-5 text-teal-600" />
        <h3 className="font-extrabold text-base text-gray-900 dark:text-white">Pengajuan Produk Lapak (Self-Service)</h3>
      </div>
      {pending.length === 0 ? (
        <p className="text-xs text-gray-500">Tidak ada pengajuan pending.</p>
      ) : (
        <div className="space-y-3">
          {pending.map((s) => (
            <div key={s.id} className="border rounded-xl p-3 space-y-2">
              <p className="text-xs font-bold text-gray-900 dark:text-white">{s.name} — {s.category}</p>
              <p className="text-[10px] text-gray-500">Rp {Number(s.price).toLocaleString('id-ID')} / {s.unit} | {s.seller_name} ({s.dusun}) | WA: {s.whatsapp}</p>
              {s.description && <p className="text-[10px] text-gray-500">{s.description}</p>}
              <div className="flex space-x-2">
                <button onClick={() => handleAction(s.id, 'approve')} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center space-x-1">
                  <CheckCircle className="w-3.5 h-3.5" /><span>Approve</span>
                </button>
                <button onClick={() => handleAction(s.id, 'reject')} className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold flex items-center space-x-1">
                  <XCircle className="w-3.5 h-3.5" /><span>Reject</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
