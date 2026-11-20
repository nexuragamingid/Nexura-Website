-- Changes to tables that already exist in a live database (schema.sql only creates what is
-- missing). One statement per line; each is run once and a "duplicate column" answer is ignored.
ALTER TABLE orders ADD COLUMN qr_string TEXT;
ALTER TABLE orders ADD COLUMN flag TEXT;
