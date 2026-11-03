-- 017_cancel_citizen_pins.sql
UPDATE citizens SET data = data - 'passwordHash' WHERE data ? 'passwordHash';
