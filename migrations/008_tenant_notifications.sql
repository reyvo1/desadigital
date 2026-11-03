-- 008_tenant_notifications.sql
-- Fase 3: notification settings per tenant (email/WhatsApp)

CREATE TABLE IF NOT EXISTS tenant_notification_settings (
  tenant_id TEXT PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  email_enabled BOOLEAN NOT NULL DEFAULT false,
  email_recipient TEXT,
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT true,
  whatsapp_recipient TEXT,
  notify_letter_status BOOLEAN NOT NULL DEFAULT true,
  notify_aspirations BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_notification_settings_tenant ON tenant_notification_settings(tenant_id);
