-- Migration 023: Fix SaaS billing FK to RESTRICT and mark demo tenants non-active
-- Idempotent.

-- Ensure demo tenants are not publicly accessible
UPDATE tenants SET status = 'demo' WHERE id IN ('tenant-sukamaju','tenant-wonorejo','tenant-karangpatihan','tenant-panglipuran');

DO $$
BEGIN
  -- subscriptions
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_saas_subscriptions_tenant') THEN
    ALTER TABLE saas_subscriptions DROP CONSTRAINT fk_saas_subscriptions_tenant;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_saas_subscriptions_tenant') THEN
    ALTER TABLE saas_subscriptions ADD CONSTRAINT fk_saas_subscriptions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
  END IF;
  -- invoices
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_saas_invoices_tenant') THEN
    ALTER TABLE saas_invoices DROP CONSTRAINT fk_saas_invoices_tenant;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_saas_invoices_tenant') THEN
    ALTER TABLE saas_invoices ADD CONSTRAINT fk_saas_invoices_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
  END IF;
  -- payments
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_saas_payments_tenant') THEN
    ALTER TABLE saas_payments DROP CONSTRAINT fk_saas_payments_tenant;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_saas_payments_tenant') THEN
    ALTER TABLE saas_payments ADD CONSTRAINT fk_saas_payments_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
  END IF;
  -- usage logs
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_saas_usage_logs_tenant') THEN
    ALTER TABLE saas_usage_logs DROP CONSTRAINT fk_saas_usage_logs_tenant;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_saas_usage_logs_tenant') THEN
    ALTER TABLE saas_usage_logs ADD CONSTRAINT fk_saas_usage_logs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
  END IF;
  -- billing events
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_saas_billing_events_tenant') THEN
    ALTER TABLE saas_billing_events DROP CONSTRAINT fk_saas_billing_events_tenant;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_saas_billing_events_tenant') THEN
    ALTER TABLE saas_billing_events ADD CONSTRAINT fk_saas_billing_events_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
  END IF;
END $$;