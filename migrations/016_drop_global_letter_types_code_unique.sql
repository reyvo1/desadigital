-- 016_drop_global_letter_types_code_unique.sql
DROP INDEX IF EXISTS idx_letter_types_code;
CREATE UNIQUE INDEX IF NOT EXISTS idx_letter_types_tenant_code ON letter_types (tenant_id, code);
