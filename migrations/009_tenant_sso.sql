-- 009_tenant_sso.sql
-- Fase 3: SSO configuration per tenant (OIDC/SAML scaffold)

CREATE TABLE IF NOT EXISTS tenant_sso_settings (
  tenant_id TEXT PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  provider TEXT,            -- 'oidc' | 'saml'
  issuer_url TEXT,
  client_id TEXT,
  client_secret TEXT,
  redirect_uri TEXT,
  scopes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_sso_settings_tenant ON tenant_sso_settings(tenant_id);
