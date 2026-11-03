-- 014_market_product_submissions.sql
-- Fase feature: self-service product submission by citizens (admin approval)

CREATE TABLE IF NOT EXISTS market_product_submissions (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  seller_name TEXT NOT NULL,
  producer_name TEXT,
  dusun TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  stock INTEGER DEFAULT 0,
  image_url TEXT,
  description TEXT,
  is_organic_or_local BOOLEAN DEFAULT true,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  approved_product_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_submissions_tenant ON market_product_submissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_market_submissions_status ON market_product_submissions(status);
