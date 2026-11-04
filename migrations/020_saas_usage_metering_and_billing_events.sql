-- Migration 020: SaaS Usage Metering (AI, WhatsApp, TTE, OTP) & Immutable Billing Audit Trail
CREATE TABLE IF NOT EXISTS saas_usage_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  village_name TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  period_month TEXT NOT NULL,
  actor TEXT NOT NULL DEFAULT 'System',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saas_usage_tenant_period ON saas_usage_logs (tenant_id, period_month);

CREATE TABLE IF NOT EXISTS saas_billing_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  invoice_id TEXT,
  event_type TEXT NOT NULL,
  actor TEXT NOT NULL,
  description TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saas_billing_events_tenant ON saas_billing_events (tenant_id);

INSERT INTO saas_usage_logs (id, tenant_id, village_name, metric_type, quantity, period_month, actor)
VALUES
  ('usage-001', 'tenant-sukamaju', 'Desa Sukamaju', 'whatsapp_gateway', 1420, '2026-03', 'Notifikasi Surat & Posyandu'),
  ('usage-002', 'tenant-sukamaju', 'Desa Sukamaju', 'ai_assistant', 312, '2026-03', 'Asisten Digital Warga & Bot Telegram')
ON CONFLICT (id) DO NOTHING;

INSERT INTO saas_billing_events (id, tenant_id, invoice_id, event_type, actor, description, payload)
VALUES
  ('evt-001', 'tenant-sukamaju', 'inv-2026-001', 'INVOICE_PAID_SP2D', 'Kaur Keuangan Desa Sukamaju', 'Pelunasan Faktur INV/APBDes/2026/001 melalui SP2D-3201-2026-00891', '{"sp2d":"SP2D-3201-2026-00891","amount":13080000}'::jsonb)
ON CONFLICT (id) DO NOTHING;