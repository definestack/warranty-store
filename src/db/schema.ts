export const CREATE_SCHEMA_MIGRATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL
  );
`;

export const CREATE_WARRANTY_ITEMS_TABLE = `
  CREATE TABLE IF NOT EXISTS warranty_items (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    purchase_date TEXT NOT NULL,
    warranty_months INTEGER NOT NULL,
    expiry_date TEXT NOT NULL,
    category TEXT,
    notes TEXT,
    invoice_uri TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;

export const ADD_BRAND_AND_PRICE_COLUMNS = `
  ALTER TABLE warranty_items ADD COLUMN brand TEXT;
  ALTER TABLE warranty_items ADD COLUMN price REAL;
`;

export const ADD_STORE_COLUMN = `
  ALTER TABLE warranty_items ADD COLUMN store TEXT;
`;
