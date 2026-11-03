-- 006_billing_subscriptions.sql
-- Fase 2: billing & subscription per tenant

CREATE TABLE IF NOT EXISTS subscriptions (
  tenant_id TEXT PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  max_users INTEGER NOT NULL DEFAULT 10,
  max_storage_mb INTEGER NOT NULL DEFAULT 100,
  max_requests_per_month INTEGER NOT NULL DEFAULT 1000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default subscription for existing tenants
INSERT INTO subscriptions (tenant_id, plan, status)
SELECT id, 'free', 'active' FROM tenants
ON CONFLICT (tenant_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
