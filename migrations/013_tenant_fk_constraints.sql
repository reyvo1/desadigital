-- 013_tenant_fk_constraints.sql
-- Fase hardening: FK tenant_id -> tenants(id) on all domain tables

DO $$ BEGIN
  INSERT INTO tenants (id, slug, name, status)
  SELECT DISTINCT tenant_id, tenant_id, tenant_id, 'active' FROM site_config
  WHERE tenant_id IS NOT NULL AND tenant_id NOT IN (SELECT id FROM tenants)
  ON CONFLICT (id) DO NOTHING;
  UPDATE site_config SET tenant_id = 'default' WHERE tenant_id IS NULL;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_site_config_tenant') THEN
    ALTER TABLE site_config ADD CONSTRAINT fk_site_config_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  INSERT INTO tenants (id, slug, name, status)
  SELECT DISTINCT tenant_id, tenant_id, tenant_id, 'active' FROM hamlets
  WHERE tenant_id IS NOT NULL AND tenant_id NOT IN (SELECT id FROM tenants)
  ON CONFLICT (id) DO NOTHING;
  UPDATE hamlets SET tenant_id = 'default' WHERE tenant_id IS NULL;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_hamlets_tenant') THEN
    ALTER TABLE hamlets ADD CONSTRAINT fk_hamlets_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  INSERT INTO tenants (id, slug, name, status)
  SELECT DISTINCT tenant_id, tenant_id, tenant_id, 'active' FROM letter_types
  WHERE tenant_id IS NOT NULL AND tenant_id NOT IN (SELECT id FROM tenants)
  ON CONFLICT (id) DO NOTHING;
  UPDATE letter_types SET tenant_id = 'default' WHERE tenant_id IS NULL;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_letter_types_tenant') THEN
    ALTER TABLE letter_types ADD CONSTRAINT fk_letter_types_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  INSERT INTO tenants (id, slug, name, status)
  SELECT DISTINCT tenant_id, tenant_id, tenant_id, 'active' FROM facilities
  WHERE tenant_id IS NOT NULL AND tenant_id NOT IN (SELECT id FROM tenants)
  ON CONFLICT (id) DO NOTHING;
  UPDATE facilities SET tenant_id = 'default' WHERE tenant_id IS NULL;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_facilities_tenant') THEN
    ALTER TABLE facilities ADD CONSTRAINT fk_facilities_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  INSERT INTO tenants (id, slug, name, status)
  SELECT DISTINCT tenant_id, tenant_id, tenant_id, 'active' FROM admin_users
  WHERE tenant_id IS NOT NULL AND tenant_id NOT IN (SELECT id FROM tenants)
  ON CONFLICT (id) DO NOTHING;
  UPDATE admin_users SET tenant_id = 'default' WHERE tenant_id IS NULL;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_admin_users_tenant') THEN
    ALTER TABLE admin_users ADD CONSTRAINT fk_admin_users_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  INSERT INTO tenants (id, slug, name, status)
  SELECT DISTINCT tenant_id, tenant_id, tenant_id, 'active' FROM citizens
  WHERE tenant_id IS NOT NULL AND tenant_id NOT IN (SELECT id FROM tenants)
  ON CONFLICT (id) DO NOTHING;
  UPDATE citizens SET tenant_id = 'default' WHERE tenant_id IS NULL;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_citizens_tenant') THEN
    ALTER TABLE citizens ADD CONSTRAINT fk_citizens_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  INSERT INTO tenants (id, slug, name, status)
  SELECT DISTINCT tenant_id, tenant_id, tenant_id, 'active' FROM letter_requests
  WHERE tenant_id IS NOT NULL AND tenant_id NOT IN (SELECT id FROM tenants)
  ON CONFLICT (id) DO NOTHING;
  UPDATE letter_requests SET tenant_id = 'default' WHERE tenant_id IS NULL;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_letter_requests_tenant') THEN
    ALTER TABLE letter_requests ADD CONSTRAINT fk_letter_requests_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  INSERT INTO tenants (id, slug, name, status)
  SELECT DISTINCT tenant_id, tenant_id, tenant_id, 'active' FROM agendas
  WHERE tenant_id IS NOT NULL AND tenant_id NOT IN (SELECT id FROM tenants)
  ON CONFLICT (id) DO NOTHING;
  UPDATE agendas SET tenant_id = 'default' WHERE tenant_id IS NULL;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_agendas_tenant') THEN
    ALTER TABLE agendas ADD CONSTRAINT fk_agendas_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  INSERT INTO tenants (id, slug, name, status)
  SELECT DISTINCT tenant_id, tenant_id, tenant_id, 'active' FROM apbdes
  WHERE tenant_id IS NOT NULL AND tenant_id NOT IN (SELECT id FROM tenants)
  ON CONFLICT (id) DO NOTHING;
  UPDATE apbdes SET tenant_id = 'default' WHERE tenant_id IS NULL;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_apbdes_tenant') THEN
    ALTER TABLE apbdes ADD CONSTRAINT fk_apbdes_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  INSERT INTO tenants (id, slug, name, status)
  SELECT DISTINCT tenant_id, tenant_id, tenant_id, 'active' FROM news
  WHERE tenant_id IS NOT NULL AND tenant_id NOT IN (SELECT id FROM tenants)
  ON CONFLICT (id) DO NOTHING;
  UPDATE news SET tenant_id = 'default' WHERE tenant_id IS NULL;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_news_tenant') THEN
    ALTER TABLE news ADD CONSTRAINT fk_news_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  INSERT INTO tenants (id, slug, name, status)
  SELECT DISTINCT tenant_id, tenant_id, tenant_id, 'active' FROM gallery
  WHERE tenant_id IS NOT NULL AND tenant_id NOT IN (SELECT id FROM tenants)
  ON CONFLICT (id) DO NOTHING;
  UPDATE gallery SET tenant_id = 'default' WHERE tenant_id IS NULL;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_gallery_tenant') THEN
    ALTER TABLE gallery ADD CONSTRAINT fk_gallery_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  INSERT INTO tenants (id, slug, name, status)
  SELECT DISTINCT tenant_id, tenant_id, tenant_id, 'active' FROM products
  WHERE tenant_id IS NOT NULL AND tenant_id NOT IN (SELECT id FROM tenants)
  ON CONFLICT (id) DO NOTHING;
  UPDATE products SET tenant_id = 'default' WHERE tenant_id IS NULL;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_products_tenant') THEN
    ALTER TABLE products ADD CONSTRAINT fk_products_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  INSERT INTO tenants (id, slug, name, status)
  SELECT DISTINCT tenant_id, tenant_id, tenant_id, 'active' FROM officials
  WHERE tenant_id IS NOT NULL AND tenant_id NOT IN (SELECT id FROM tenants)
  ON CONFLICT (id) DO NOTHING;
  UPDATE officials SET tenant_id = 'default' WHERE tenant_id IS NULL;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_officials_tenant') THEN
    ALTER TABLE officials ADD CONSTRAINT fk_officials_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  INSERT INTO tenants (id, slug, name, status)
  SELECT DISTINCT tenant_id, tenant_id, tenant_id, 'active' FROM regulations
  WHERE tenant_id IS NOT NULL AND tenant_id NOT IN (SELECT id FROM tenants)
  ON CONFLICT (id) DO NOTHING;
  UPDATE regulations SET tenant_id = 'default' WHERE tenant_id IS NULL;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_regulations_tenant') THEN
    ALTER TABLE regulations ADD CONSTRAINT fk_regulations_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  INSERT INTO tenants (id, slug, name, status)
  SELECT DISTINCT tenant_id, tenant_id, tenant_id, 'active' FROM aspirations
  WHERE tenant_id IS NOT NULL AND tenant_id NOT IN (SELECT id FROM tenants)
  ON CONFLICT (id) DO NOTHING;
  UPDATE aspirations SET tenant_id = 'default' WHERE tenant_id IS NULL;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_aspirations_tenant') THEN
    ALTER TABLE aspirations ADD CONSTRAINT fk_aspirations_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  INSERT INTO tenants (id, slug, name, status)
  SELECT DISTINCT tenant_id, tenant_id, tenant_id, 'active' FROM potentials
  WHERE tenant_id IS NOT NULL AND tenant_id NOT IN (SELECT id FROM tenants)
  ON CONFLICT (id) DO NOTHING;
  UPDATE potentials SET tenant_id = 'default' WHERE tenant_id IS NULL;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_potentials_tenant') THEN
    ALTER TABLE potentials ADD CONSTRAINT fk_potentials_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  INSERT INTO tenants (id, slug, name, status)
  SELECT DISTINCT tenant_id, tenant_id, tenant_id, 'active' FROM projects
  WHERE tenant_id IS NOT NULL AND tenant_id NOT IN (SELECT id FROM tenants)
  ON CONFLICT (id) DO NOTHING;
  UPDATE projects SET tenant_id = 'default' WHERE tenant_id IS NULL;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_projects_tenant') THEN
    ALTER TABLE projects ADD CONSTRAINT fk_projects_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  INSERT INTO tenants (id, slug, name, status)
  SELECT DISTINCT tenant_id, tenant_id, tenant_id, 'active' FROM institutions
  WHERE tenant_id IS NOT NULL AND tenant_id NOT IN (SELECT id FROM tenants)
  ON CONFLICT (id) DO NOTHING;
  UPDATE institutions SET tenant_id = 'default' WHERE tenant_id IS NULL;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_institutions_tenant') THEN
    ALTER TABLE institutions ADD CONSTRAINT fk_institutions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  INSERT INTO tenants (id, slug, name, status)
  SELECT DISTINCT tenant_id, tenant_id, tenant_id, 'active' FROM media_assets
  WHERE tenant_id IS NOT NULL AND tenant_id NOT IN (SELECT id FROM tenants)
  ON CONFLICT (id) DO NOTHING;
  UPDATE media_assets SET tenant_id = 'default' WHERE tenant_id IS NULL;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_media_assets_tenant') THEN
    ALTER TABLE media_assets ADD CONSTRAINT fk_media_assets_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  INSERT INTO tenants (id, slug, name, status)
  SELECT DISTINCT tenant_id, tenant_id, tenant_id, 'active' FROM audit_logs
  WHERE tenant_id IS NOT NULL AND tenant_id NOT IN (SELECT id FROM tenants)
  ON CONFLICT (id) DO NOTHING;
  UPDATE audit_logs SET tenant_id = 'default' WHERE tenant_id IS NULL;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_audit_logs_tenant') THEN
    ALTER TABLE audit_logs ADD CONSTRAINT fk_audit_logs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  INSERT INTO tenants (id, slug, name, status)
  SELECT DISTINCT tenant_id, tenant_id, tenant_id, 'active' FROM chat_messages
  WHERE tenant_id IS NOT NULL AND tenant_id NOT IN (SELECT id FROM tenants)
  ON CONFLICT (id) DO NOTHING;
  UPDATE chat_messages SET tenant_id = 'default' WHERE tenant_id IS NULL;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_chat_messages_tenant') THEN
    ALTER TABLE chat_messages ADD CONSTRAINT fk_chat_messages_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  INSERT INTO tenants (id, slug, name, status)
  SELECT DISTINCT tenant_id, tenant_id, tenant_id, 'active' FROM incoming_outbox_letters
  WHERE tenant_id IS NOT NULL AND tenant_id NOT IN (SELECT id FROM tenants)
  ON CONFLICT (id) DO NOTHING;
  UPDATE incoming_outbox_letters SET tenant_id = 'default' WHERE tenant_id IS NULL;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_incoming_outbox_letters_tenant') THEN
    ALTER TABLE incoming_outbox_letters ADD CONSTRAINT fk_incoming_outbox_letters_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  INSERT INTO tenants (id, slug, name, status)
  SELECT DISTINCT tenant_id, tenant_id, tenant_id, 'active' FROM village_assets
  WHERE tenant_id IS NOT NULL AND tenant_id NOT IN (SELECT id FROM tenants)
  ON CONFLICT (id) DO NOTHING;
  UPDATE village_assets SET tenant_id = 'default' WHERE tenant_id IS NULL;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_village_assets_tenant') THEN
    ALTER TABLE village_assets ADD CONSTRAINT fk_village_assets_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  INSERT INTO tenants (id, slug, name, status)
  SELECT DISTINCT tenant_id, tenant_id, tenant_id, 'active' FROM population_mutations
  WHERE tenant_id IS NOT NULL AND tenant_id NOT IN (SELECT id FROM tenants)
  ON CONFLICT (id) DO NOTHING;
  UPDATE population_mutations SET tenant_id = 'default' WHERE tenant_id IS NULL;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_population_mutations_tenant') THEN
    ALTER TABLE population_mutations ADD CONSTRAINT fk_population_mutations_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  INSERT INTO tenants (id, slug, name, status)
  SELECT DISTINCT tenant_id, tenant_id, tenant_id, 'active' FROM village_database
  WHERE tenant_id IS NOT NULL AND tenant_id NOT IN (SELECT id FROM tenants)
  ON CONFLICT (id) DO NOTHING;
  UPDATE village_database SET tenant_id = 'default' WHERE tenant_id IS NULL;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_village_database_tenant') THEN
    ALTER TABLE village_database ADD CONSTRAINT fk_village_database_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  INSERT INTO tenants (id, slug, name, status)
  SELECT DISTINCT tenant_id, tenant_id, tenant_id, 'active' FROM auth_sessions
  WHERE tenant_id IS NOT NULL AND tenant_id NOT IN (SELECT id FROM tenants)
  ON CONFLICT (id) DO NOTHING;
  UPDATE auth_sessions SET tenant_id = 'default' WHERE tenant_id IS NULL;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_auth_sessions_tenant') THEN
    ALTER TABLE auth_sessions ADD CONSTRAINT fk_auth_sessions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;
