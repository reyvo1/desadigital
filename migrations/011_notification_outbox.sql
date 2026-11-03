-- 011_notification_outbox.sql
-- Fase 4: notification delivery outbox + gateway scaffold

CREATE TABLE IF NOT EXISTS notification_outbox (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,          -- 'email' | 'whatsapp'
  recipient TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | sent | failed | logged
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_tenant ON notification_outbox(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notification_outbox_status ON notification_outbox(status);
