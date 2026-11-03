-- Migration 002: Relational Columns, Indexes & Foreign Key Constraints
ALTER TABLE hamlets ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE letter_types ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS hamlet_name TEXT;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE citizens ADD COLUMN IF NOT EXISTS nik TEXT;
ALTER TABLE citizens ADD COLUMN IF NOT EXISTS hamlet_id TEXT;
ALTER TABLE letter_requests ADD COLUMN IF NOT EXISTS tracking_code TEXT;
ALTER TABLE letter_requests ADD COLUMN IF NOT EXISTS citizen_nik TEXT;
ALTER TABLE letter_requests ADD COLUMN IF NOT EXISTS letter_type_code TEXT;
ALTER TABLE letter_requests ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE agendas ADD COLUMN IF NOT EXISTS date TEXT;
ALTER TABLE apbdes ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE news ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE gallery ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE officials ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE regulations ADD COLUMN IF NOT EXISTS year INTEGER;
ALTER TABLE aspirations ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE potentials ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS abbreviation TEXT;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS module TEXT;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS channel TEXT;
ALTER TABLE incoming_outbox_letters ADD COLUMN IF NOT EXISTS mail_type TEXT;
ALTER TABLE village_assets ADD COLUMN IF NOT EXISTS condition TEXT;
ALTER TABLE population_mutations ADD COLUMN IF NOT EXISTS mutation_type TEXT;
ALTER TABLE population_mutations ADD COLUMN IF NOT EXISTS citizen_nik TEXT;

-- Unique & B-Tree Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_letter_types_code ON letter_types (code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users (username);
CREATE UNIQUE INDEX IF NOT EXISTS idx_citizens_nik ON citizens (nik);
CREATE INDEX IF NOT EXISTS idx_citizens_hamlet_id ON citizens (hamlet_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_letter_requests_tracking_code ON letter_requests (tracking_code);
CREATE INDEX IF NOT EXISTS idx_letter_requests_citizen_nik ON letter_requests (citizen_nik);
CREATE INDEX IF NOT EXISTS idx_letter_requests_letter_type_code ON letter_requests (letter_type_code);
CREATE INDEX IF NOT EXISTS idx_letter_requests_status ON letter_requests (status);
CREATE INDEX IF NOT EXISTS idx_facilities_category ON facilities (category);
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);
CREATE INDEX IF NOT EXISTS idx_gallery_category ON gallery (category);
CREATE INDEX IF NOT EXISTS idx_news_category ON news (category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs (module);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages (session_id);
CREATE INDEX IF NOT EXISTS idx_population_mutations_citizen_nik ON population_mutations (citizen_nik);

-- GIN Indexes for JSONB Queries
CREATE INDEX IF NOT EXISTS idx_citizens_data_gin ON citizens USING GIN (data);
CREATE INDEX IF NOT EXISTS idx_letter_requests_data_gin ON letter_requests USING GIN (data);

-- Idempotent Foreign Key Constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_citizens_hamlet'
  ) THEN
    ALTER TABLE citizens
      ADD CONSTRAINT fk_citizens_hamlet
      FOREIGN KEY (hamlet_id) REFERENCES hamlets (id)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_letter_requests_letter_type'
  ) THEN
    ALTER TABLE letter_requests
      ADD CONSTRAINT fk_letter_requests_letter_type
      FOREIGN KEY (letter_type_code) REFERENCES letter_types (code)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;
