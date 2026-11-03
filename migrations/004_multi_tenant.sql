-- 004_multi_tenant.sql
-- Add multi-tenant support: tenants table + tenant_id on village_database

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active'
);

INSERT INTO tenants (id, slug, name, status)
VALUES ('default', 'default', 'Desa Sukamaju (Default)', 'active')
ON CONFLICT (id) DO NOTHING;

-- Migrate village_database to per-tenant if needed
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='village_database' AND column_name='tenant_id') THEN
    ALTER TABLE village_database ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
    -- If id=1 row exists, keep it
    UPDATE village_database SET tenant_id = 'default' WHERE id = 1;
  END IF;
END $$;

-- Create unique index on tenant_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_village_database_tenant ON village_database(tenant_id);

-- Note: 24 normalized tables will get tenant_id in Fase 2.

-- Add tenant_id to all 24 domain tables
ALTER TABLE site_config ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE hamlets ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE letter_types ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE citizens ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE letter_requests ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE agendas ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE apbdes ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE news ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE gallery ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE products ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE officials ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE regulations ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE aspirations ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE potentials ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE incoming_outbox_letters ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE village_assets ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE population_mutations ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';

-- Indexes for tenant filtering
CREATE INDEX IF NOT EXISTS idx_site_config_tenant ON site_config(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hamlets_tenant ON hamlets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_letter_types_tenant ON letter_types(tenant_id);
CREATE INDEX IF NOT EXISTS idx_facilities_tenant ON facilities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_tenant ON admin_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_citizens_tenant ON citizens(tenant_id);
CREATE INDEX IF NOT EXISTS idx_letter_requests_tenant ON letter_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agendas_tenant ON agendas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_apbdes_tenant ON apbdes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_news_tenant ON news(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gallery_tenant ON gallery(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_officials_tenant ON officials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_regulations_tenant ON regulations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_aspirations_tenant ON aspirations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_potentials_tenant ON potentials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_tenant ON projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_institutions_tenant ON institutions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_tenant ON media_assets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_tenant ON chat_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_incoming_outbox_letters_tenant ON incoming_outbox_letters(tenant_id);
CREATE INDEX IF NOT EXISTS idx_village_assets_tenant ON village_assets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_population_mutations_tenant ON population_mutations(tenant_id);
