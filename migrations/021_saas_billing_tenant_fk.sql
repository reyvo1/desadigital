-- Migration 021: Add tenant_id foreign keys to SaaS billing tables (018-020)
-- Idempotent: add constraints only if not exists.

-- Ensure tenant rows exist for seeded SaaS tenants
INSERT INTO tenants (id, slug, name, status)
VALUES
  ('tenant-sukamaju','tenant-sukamaju','Desa Sukamaju','active'),
  ('tenant-wonorejo','tenant-wonorejo','Desa Wonorejo','active'),
  ('tenant-karangpatihan','tenant-karangpatihan','Desa Karangpatihan','active'),
  ('tenant-panglipuran','tenant-panglipuran','Desa Panglipuran Jaya','active')
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_saas_subscriptions_tenant') THEN
    ALTER TABLE saas_subscriptions ADD CONSTRAINT fk_saas_subscriptions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_saas_invoices_tenant') THEN
    ALTER TABLE saas_invoices ADD CONSTRAINT fk_saas_invoices_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_saas_payments_tenant') THEN
    ALTER TABLE saas_payments ADD CONSTRAINT fk_saas_payments_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_saas_usage_logs_tenant') THEN
    ALTER TABLE saas_usage_logs ADD CONSTRAINT fk_saas_usage_logs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_saas_billing_events_tenant') THEN
    ALTER TABLE saas_billing_events ADD CONSTRAINT fk_saas_billing_events_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;