-- Migration 019: SaaS Invoices (Faktur Pajak / APBDes B2B2G) & SP2D Payments Ledger
CREATE TABLE IF NOT EXISTS saas_invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  tenant_id TEXT NOT NULL,
  village_name TEXT NOT NULL,
  district_name TEXT NOT NULL,
  subscription_id TEXT,
  plan_tier TEXT NOT NULL,
  plan_label TEXT NOT NULL,
  billing_period TEXT NOT NULL,
  apbdes_account_code TEXT NOT NULL DEFAULT '5.1.2.05.03 (Belanja Jasa Langganan Sistem Informasi Desa)',
  npwp_bendahara TEXT NOT NULL DEFAULT '00.128.491.8-653.000',
  subtotal_rupiah INTEGER NOT NULL,
  discount_rupiah INTEGER NOT NULL DEFAULT 0,
  ppn_rupiah INTEGER NOT NULL,
  pph23_rupiah INTEGER NOT NULL DEFAULT 0,
  total_amount_rupiah INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'Belum Dibayar',
  due_date TEXT NOT NULL,
  paid_at TEXT,
  payment_method TEXT NOT NULL DEFAULT 'Transfer Kasda / SP2D Bank Jatim/BJB',
  sp2d_reference TEXT,
  notes TEXT,
  line_items JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saas_invoices_tenant ON saas_invoices (tenant_id);
CREATE INDEX IF NOT EXISTS idx_saas_invoices_status ON saas_invoices (status);

CREATE TABLE IF NOT EXISTS saas_payments (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  village_name TEXT NOT NULL,
  payment_reference TEXT NOT NULL,
  sp2d_number TEXT,
  payment_channel TEXT NOT NULL,
  amount_rupiah INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'Terverifikasi',
  verified_by TEXT NOT NULL DEFAULT 'Sistem Billing Otomatis',
  paid_at TEXT NOT NULL,
  proof_metadata JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saas_payments_invoice ON saas_payments (invoice_id);
CREATE INDEX IF NOT EXISTS idx_saas_payments_tenant ON saas_payments (tenant_id);

INSERT INTO saas_invoices (id, invoice_number, tenant_id, village_name, district_name, subscription_id, plan_tier, plan_label, billing_period, apbdes_account_code, npwp_bendahara, subtotal_rupiah, discount_rupiah, ppn_rupiah, pph23_rupiah, total_amount_rupiah, status, due_date, paid_at, payment_method, sp2d_reference, notes, line_items)
VALUES
  ('inv-2026-001', 'INV/APBDes/2026/001', 'tenant-sukamaju', 'Desa Sukamaju', 'Kabupaten Bogor', 'sub-sukamaju-2026', 'enterprise_mandiri', 'Enterprise Desa Mandiri (White-Label)', 'Tahun Anggaran APBDes 2026', '5.1.2.05.03 (Belanja Jasa Langganan Sistem Informasi Desa)', '00.128.491.8-403.000', 12000000, 0, 1320000, 240000, 13080000, 'Lunas', '2026-01-31', '2026-01-18 10:15 WIB', 'SP2D Kasda Bank BJB Cabang Cibinong', 'SP2D-3201-2026-00891', 'Pembayaran lunas melalui pencairan APBDes Tahap I.', '[{"description":"Lisensi Tahunan Enterprise White-Label SID Cloud","qty":1,"unitPrice":12000000,"total":12000000}]'::jsonb),
  ('inv-2026-004', 'INV/APBDes/2026/004', 'tenant-panglipuran', 'Desa Panglipuran Jaya', 'Kabupaten Bangli', 'sub-panglipuran-2026', 'starter', 'Starter Desa Berkembang', 'Tahun Anggaran APBDes 2026', '5.1.2.05.03 (Belanja Jasa Langganan Sistem Informasi Desa)', '00.511.209.4-905.000', 3500000, 350000, 346500, 63000, 3433500, 'Belum Dibayar', '2026-04-15', NULL, 'Menunggu Pencairan SP2D BPD Bali / Virtual Account', NULL, 'Tagihan aktivasi pasca-trial 30 hari.', '[{"description":"Lisensi Tahunan Starter Desa Digital","qty":1,"unitPrice":3500000,"total":3500000}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO saas_payments (id, invoice_id, invoice_number, tenant_id, village_name, payment_reference, sp2d_number, payment_channel, amount_rupiah, status, verified_by, paid_at, proof_metadata)
VALUES
  ('pay-2026-001', 'inv-2026-001', 'INV/APBDes/2026/001', 'tenant-sukamaju', 'Desa Sukamaju', 'TRX-BJB-20260118-001', 'SP2D-3201-2026-00891', 'SP2D Kasda Bank BJB', 13080000, 'Terverifikasi', 'Auditor Keuangan SaaS', '2026-01-18 10:15 WIB', '{"bank":"Bank BJB"}'::jsonb)
ON CONFLICT (id) DO NOTHING;