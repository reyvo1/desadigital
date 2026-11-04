import React, { useEffect, useMemo, useState } from 'react';

interface SaasPlatformViewProps {
  siteConfig?: any;
  onUpdateSiteConfig?: (config: any) => void;
  onShowToast?: (title: string, message: string) => void;
  onNavigateHome?: () => void;
}

export const SaasPlatformView: React.FC<SaasPlatformViewProps> = ({ onShowToast }) => {
  const [plans, setPlans] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('pro_digital');
  const [population, setPopulation] = useState<number>(5000);
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  useEffect(() => {
    fetch('/api/saas/billing')
      .then((r) => r.json())
      .then((d) => {
        setPlans(d.plans || []);
        setInvoices(d.invoices || []);
        if (d.plans && d.plans.length > 0 && !d.plans.find((p: any) => p.id === selectedPlanId)) {
          setSelectedPlanId(d.plans[0].id);
        }
      })
      .catch(() => onShowToast?.('Error', 'Gagal memuat billing SaaS'));
  }, [onShowToast, selectedPlanId]);

  const selectedPlan = useMemo(
    () => plans.find((p: any) => p.id === selectedPlanId) || plans[0],
    [plans, selectedPlanId]
  );

  const calc = useMemo(() => {
    if (!selectedPlan) return null;
    const base = Number(selectedPlan.annual_price_rupiah || 0);
    const discount = Math.round((base * discountPercent) / 100);
    const subtotal = base - discount;
    const ppn = Math.round(subtotal * 0.11);
    const pph23 = Math.round(subtotal * 0.02);
    const total = subtotal + ppn - pph23;
    const populationOk = population <= Number(selectedPlan.max_population_quota || 0);
    return { base, discount, subtotal, ppn, pph23, total, populationOk };
  }, [selectedPlan, population, discountPercent]);

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">SaaS Platform & Billing</h2>
        {onShowToast && (
          <span className="text-xs text-gray-500">Data live dari /api/saas/billing</span>
        )}
      </div>

      <section>
        <h3 className="font-semibold mb-2">Tabel Paket Harga</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-800">
                <th className="border px-2 py-1 text-left">Paket</th>
                <th className="border px-2 py-1 text-right">Harga Tahunan</th>
                <th className="border px-2 py-1 text-right">Kuota Penduduk</th>
                <th className="border px-2 py-1 text-right">WA/bulan</th>
                <th className="border px-2 py-1 text-right">AI/bulan</th>
                <th className="border px-2 py-1 text-center">TTE</th>
                <th className="border px-2 py-1 text-center">Portal Warga</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p: any) => (
                <tr key={p.id} className={p.id === selectedPlanId ? 'bg-blue-50 dark:bg-blue-900/20' : ''}>
                  <td className="border px-2 py-1 font-medium">{p.name}</td>
                  <td className="border px-2 py-1 text-right">{Number(p.annual_price_rupiah || 0).toLocaleString('id-ID')}</td>
                  <td className="border px-2 py-1 text-right">{Number(p.max_population_quota || 0).toLocaleString('id-ID')}</td>
                  <td className="border px-2 py-1 text-right">{Number(p.wa_quota_monthly || 0).toLocaleString('id-ID')}</td>
                  <td className="border px-2 py-1 text-right">{Number(p.ai_quota_monthly || 0).toLocaleString('id-ID')}</td>
                  <td className="border px-2 py-1 text-center">{p.tte_enabled ? 'Ya' : 'Tidak'}</td>
                  <td className="border px-2 py-1 text-center">{p.citizen_portal_enabled ? 'Ya' : 'Tidak'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h3 className="font-semibold">Kalkulator Penawaran</h3>
          <label className="block text-sm">
            Pilih Paket
            <select
              className="mt-1 w-full border rounded px-2 py-1"
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
            >
              {plans.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Jumlah Penduduk
            <input
              type="number"
              className="mt-1 w-full border rounded px-2 py-1"
              value={population}
              onChange={(e) => setPopulation(Number(e.target.value) || 0)}
            />
          </label>
          <label className="block text-sm">
            Diskon (%)
            <input
              type="number"
              className="mt-1 w-full border rounded px-2 py-1"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(Number(e.target.value) || 0)}
            />
          </label>
          {calc && !calc.populationOk && (
            <p className="text-xs text-red-600">Jumlah penduduk melebihi kuota paket terpilih.</p>
          )}
        </div>

        {calc && (
          <div className="border rounded p-4 space-y-2 text-sm">
            <h3 className="font-semibold mb-1">Rincian Biaya (B2B2G / APBDes)</h3>
            <div className="flex justify-between"><span>Harga Dasar</span><span>Rp {calc.base.toLocaleString('id-ID')}</span></div>
            <div className="flex justify-between"><span>Diskon</span><span>- Rp {calc.discount.toLocaleString('id-ID')}</span></div>
            <div className="flex justify-between"><span>Subtotal</span><span>Rp {calc.subtotal.toLocaleString('id-ID')}</span></div>
            <div className="flex justify-between"><span>PPN 11%</span><span>Rp {calc.ppn.toLocaleString('id-ID')}</span></div>
            <div className="flex justify-between"><span>PPh 23 (2%)</span><span>- Rp {calc.pph23.toLocaleString('id-ID')}</span></div>
            <div className="flex justify-between font-bold border-t pt-2"><span>Total Tagihan</span><span>Rp {calc.total.toLocaleString('id-ID')}</span></div>
          </div>
        )}
      </section>

      <section>
        <h3 className="font-semibold mb-2">Invoice</h3>
        <ul className="space-y-1 text-sm">
          {invoices.map((inv: any) => (
            <li key={inv.id} className="border rounded px-3 py-2 flex justify-between">
              <span>{inv.invoice_number} — {inv.village_name}</span>
              <span>{inv.status} — Rp {Number(inv.total_amount_rupiah || 0).toLocaleString('id-ID')}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};
