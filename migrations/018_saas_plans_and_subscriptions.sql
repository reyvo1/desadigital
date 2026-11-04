-- Migration 018: SaaS Plans Catalog & Multi-Tenant Village Subscriptions (B2B2G / APBDes)
CREATE TABLE IF NOT EXISTS saas_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  audience TEXT NOT NULL,
  annual_price_rupiah INTEGER NOT NULL,
  monthly_equivalent_rupiah INTEGER NOT NULL,
  max_population_quota INTEGER NOT NULL,
  wa_quota_monthly INTEGER NOT NULL,
  ai_quota_monthly INTEGER NOT NULL,
  tte_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  citizen_portal_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  features JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saas_subscriptions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  village_name TEXT NOT NULL,
  plan_tier TEXT NOT NULL,
  billing_cycle TEXT NOT NULL DEFAULT 'Tahunan (APBDes)',
  status TEXT NOT NULL DEFAULT 'Aktif',
  contract_number TEXT NOT NULL,
  apbdes_fiscal_year INTEGER NOT NULL DEFAULT 2026,
  annual_amount_rupiah INTEGER NOT NULL,
  discount_rupiah INTEGER NOT NULL DEFAULT 0,
  ppn_rupiah INTEGER NOT NULL DEFAULT 0,
  net_amount_rupiah INTEGER NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  auto_renew BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saas_subscriptions_tenant ON saas_subscriptions (tenant_id);
CREATE INDEX IF NOT EXISTS idx_saas_subscriptions_status ON saas_subscriptions (status);

INSERT INTO saas_plans (id, name, audience, annual_price_rupiah, monthly_equivalent_rupiah, max_population_quota, wa_quota_monthly, ai_quota_monthly, tte_enabled, citizen_portal_enabled, features)
VALUES
  ('starter', 'Starter Desa Digital', 'Untuk Desa Berkembang', 3500000, 291667, 3000, 1500, 500, FALSE, TRUE, '["Portal Website Profil Desa & Transparansi APBDes","16 Layanan Surat Pengantar Online & QR Verifikasi","Portal Login Kepala Keluarga & KK Digital","Kuota Notifikasi WhatsApp 1.500 pesan/bulan","Hosting Cloud Terkelola & Backup Mingguan"]'::jsonb),
  ('pro_digital', 'Pro Smart Village', 'Untuk Desa Maju (Paling Laris)', 6500000, 541667, 10000, 5000, 2500, TRUE, TRUE, '["Seluruh fitur paket Starter Desa Digital","Tanda Tangan Elektronik (TTE QR-Code) Kepala Desa","Asisten AI Desa 24 Jam (Web & Bot Telegram Resmi)","9 Buku Administrasi Desa (Permendagri 47/2016)","Modul Posyandu e-Stunting, DPT TPS & Lapak UMKM","Kuota WhatsApp Gateway 5.000 pesan/bulan + Backup Harian"]'::jsonb),
  ('enterprise_mandiri', 'Enterprise White-Label', 'Untuk Desa Mandiri & Pemkab', 12000000, 1000000, 25000, 15000, 10000, TRUE, TRUE, '["Seluruh fitur Pro Smart Village tanpa batas","Domain Resmi Kustom (.desa.id) & White-Label Penuh","PostgreSQL Cloud SQL Dedicated + SLA Uptime 99.95%","Dashboard Monitoring Tingkat Kecamatan / Kabupaten","Pendampingan Bimtek Perangkat Desa & Migrasi Data CSV"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  annual_price_rupiah = EXCLUDED.annual_price_rupiah,
  monthly_equivalent_rupiah = EXCLUDED.monthly_equivalent_rupiah,
  max_population_quota = EXCLUDED.max_population_quota,
  wa_quota_monthly = EXCLUDED.wa_quota_monthly,
  ai_quota_monthly = EXCLUDED.ai_quota_monthly,
  features = EXCLUDED.features,
  updated_at = NOW();

INSERT INTO saas_subscriptions (id, tenant_id, village_name, plan_tier, billing_cycle, status, contract_number, apbdes_fiscal_year, annual_amount_rupiah, discount_rupiah, ppn_rupiah, net_amount_rupiah, start_date, end_date, auto_renew)
VALUES
  ('sub-sukamaju-2026', 'tenant-sukamaju', 'Desa Sukamaju', 'enterprise_mandiri', 'Tahunan (APBDes)', 'Aktif', 'SPK/SID-CLOUD/32.01.14/2026/001', 2026, 12000000, 0, 1320000, 13320000, '2026-01-01', '2026-12-31', TRUE),
  ('sub-wonorejo-2026', 'tenant-wonorejo', 'Desa Wonorejo', 'pro_digital', 'Tahunan (APBDes)', 'Aktif', 'SPK/SID-CLOUD/35.07.18/2026/002', 2026, 6500000, 0, 715000, 7215000, '2026-01-15', '2027-01-15', TRUE),
  ('sub-karangpatihan-2026', 'tenant-karangpatihan', 'Desa Karangpatihan', 'pro_digital', 'Tahunan (APBDes)', 'Aktif', 'SPK/SID-CLOUD/35.02.04/2026/003', 2026, 6500000, 0, 715000, 7215000, '2026-02-01', '2027-02-01', TRUE),
  ('sub-panglipuran-2026', 'tenant-panglipuran', 'Desa Panglipuran Jaya', 'starter', 'Tahunan (APBDes)', 'Trial 30 Hari', 'SPK/SID-CLOUD/51.06.01/2026/004', 2026, 3500000, 350000, 346500, 3496500, '2026-03-01', '2027-03-01', TRUE)
ON CONFLICT (id) DO NOTHING;