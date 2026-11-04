-- Migration 022: Citizen bill payments (pending -> paid via confirmation)
CREATE TABLE IF NOT EXISTS citizen_bill_payments (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  bill_id TEXT NOT NULL,
  kk TEXT NOT NULL,
  payer_nik TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | paid | failed | cancelled
  external_id TEXT,
  receipt_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_citizen_bill_payments_pending
  ON citizen_bill_payments (tenant_id, bill_id) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_citizen_bill_payments_tenant ON citizen_bill_payments (tenant_id);
CREATE INDEX IF NOT EXISTS idx_citizen_bill_payments_bill ON citizen_bill_payments (bill_id);