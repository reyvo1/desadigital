-- 010_tenant_onboarding_requests.sql
-- Fase 4: self-service onboarding requests

CREATE TABLE IF NOT EXISTS tenant_onboarding_requests (
  id BIGSERIAL PRIMARY KEY,
  requested_tenant_id TEXT,
  village_name TEXT NOT NULL,
  slug TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_tenant_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_onboarding_requests_status ON tenant_onboarding_requests(status);
CREATE INDEX IF NOT EXISTS idx_tenant_onboarding_requests_created ON tenant_onboarding_requests(created_at);
