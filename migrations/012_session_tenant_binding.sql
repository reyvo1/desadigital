-- 012_session_tenant_binding.sql
-- Fase security: bind auth sessions to tenant_id to prevent cross-tenant admin access

ALTER TABLE auth_sessions ADD COLUMN IF NOT EXISTS tenant_id TEXT;
CREATE INDEX IF NOT EXISTS idx_auth_sessions_tenant ON auth_sessions(tenant_id);
