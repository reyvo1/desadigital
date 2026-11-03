-- 005_composite_primary_keys.sql
-- Fase 1b SaaS: composite PK (tenant_id, id) on 24 domain tables + tenant-aware FKs

-- 1. Drop dependent FKs
ALTER TABLE citizens DROP CONSTRAINT IF EXISTS fk_citizens_hamlet;
ALTER TABLE letter_requests DROP CONSTRAINT IF EXISTS fk_letter_requests_letter_type;

-- 2. Drop old single-column PKs and add composite PKs
ALTER TABLE site_config DROP CONSTRAINT IF EXISTS site_config_pkey;
ALTER TABLE site_config ADD PRIMARY KEY (tenant_id, id);

ALTER TABLE hamlets DROP CONSTRAINT IF EXISTS hamlets_pkey;
ALTER TABLE hamlets ADD PRIMARY KEY (tenant_id, id);

ALTER TABLE letter_types DROP CONSTRAINT IF EXISTS letter_types_pkey;
ALTER TABLE letter_types ADD PRIMARY KEY (tenant_id, id);

ALTER TABLE facilities DROP CONSTRAINT IF EXISTS facilities_pkey;
ALTER TABLE facilities ADD PRIMARY KEY (tenant_id, id);

ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_pkey;
ALTER TABLE admin_users ADD PRIMARY KEY (tenant_id, id);

ALTER TABLE citizens DROP CONSTRAINT IF EXISTS citizens_pkey;
ALTER TABLE citizens ADD PRIMARY KEY (tenant_id, id);

ALTER TABLE letter_requests DROP CONSTRAINT IF EXISTS letter_requests_pkey;
ALTER TABLE letter_requests ADD PRIMARY KEY (tenant_id, id);

ALTER TABLE agendas DROP CONSTRAINT IF EXISTS agendas_pkey;
ALTER TABLE agendas ADD PRIMARY KEY (tenant_id, id);

ALTER TABLE apbdes DROP CONSTRAINT IF EXISTS apbdes_pkey;
ALTER TABLE apbdes ADD PRIMARY KEY (tenant_id, id);

ALTER TABLE news DROP CONSTRAINT IF EXISTS news_pkey;
ALTER TABLE news ADD PRIMARY KEY (tenant_id, id);

ALTER TABLE gallery DROP CONSTRAINT IF EXISTS gallery_pkey;
ALTER TABLE gallery ADD PRIMARY KEY (tenant_id, id);

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_pkey;
ALTER TABLE products ADD PRIMARY KEY (tenant_id, id);

ALTER TABLE officials DROP CONSTRAINT IF EXISTS officials_pkey;
ALTER TABLE officials ADD PRIMARY KEY (tenant_id, id);

ALTER TABLE regulations DROP CONSTRAINT IF EXISTS regulations_pkey;
ALTER TABLE regulations ADD PRIMARY KEY (tenant_id, id);

ALTER TABLE aspirations DROP CONSTRAINT IF EXISTS aspirations_pkey;
ALTER TABLE aspirations ADD PRIMARY KEY (tenant_id, id);

ALTER TABLE potentials DROP CONSTRAINT IF EXISTS potentials_pkey;
ALTER TABLE potentials ADD PRIMARY KEY (tenant_id, id);

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_pkey;
ALTER TABLE projects ADD PRIMARY KEY (tenant_id, id);

ALTER TABLE institutions DROP CONSTRAINT IF EXISTS institutions_pkey;
ALTER TABLE institutions ADD PRIMARY KEY (tenant_id, id);

ALTER TABLE media_assets DROP CONSTRAINT IF EXISTS media_assets_pkey;
ALTER TABLE media_assets ADD PRIMARY KEY (tenant_id, id);

ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_pkey;
ALTER TABLE audit_logs ADD PRIMARY KEY (tenant_id, id);

ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_pkey;
ALTER TABLE chat_messages ADD PRIMARY KEY (tenant_id, id);

ALTER TABLE incoming_outbox_letters DROP CONSTRAINT IF EXISTS incoming_outbox_letters_pkey;
ALTER TABLE incoming_outbox_letters ADD PRIMARY KEY (tenant_id, id);

ALTER TABLE village_assets DROP CONSTRAINT IF EXISTS village_assets_pkey;
ALTER TABLE village_assets ADD PRIMARY KEY (tenant_id, id);

ALTER TABLE population_mutations DROP CONSTRAINT IF EXISTS population_mutations_pkey;
ALTER TABLE population_mutations ADD PRIMARY KEY (tenant_id, id);

-- 3. Unique constraint on letter_types (tenant_id, code) for composite FK
ALTER TABLE letter_types ADD CONSTRAINT uq_letter_types_tenant_code UNIQUE (tenant_id, code);

-- 4. village_database PK on tenant_id
ALTER TABLE village_database DROP CONSTRAINT IF EXISTS village_database_pkey;
ALTER TABLE village_database ADD PRIMARY KEY (tenant_id);

-- 5. Recreate tenant-aware FKs
ALTER TABLE citizens
  ADD CONSTRAINT fk_citizens_hamlet
  FOREIGN KEY (tenant_id, hamlet_id) REFERENCES hamlets (tenant_id, id)
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE letter_requests
  ADD CONSTRAINT fk_letter_requests_letter_type
  FOREIGN KEY (tenant_id, letter_type_code) REFERENCES letter_types (tenant_id, code)
  ON UPDATE CASCADE ON DELETE SET NULL;
