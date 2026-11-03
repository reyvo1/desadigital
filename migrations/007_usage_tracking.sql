-- 007_usage_tracking.sql
-- Fase 2: usage tracking per tenant per month

CREATE TABLE IF NOT EXISTS usage_counters (
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, month)
);

CREATE INDEX IF NOT EXISTS idx_usage_counters_tenant ON usage_counters(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usage_counters_month ON usage_counters(month);
