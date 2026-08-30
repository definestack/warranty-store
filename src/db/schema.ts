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

export const CREATE_INVOICE_IMAGES_TABLE = `
  CREATE TABLE IF NOT EXISTS invoice_images (
    id TEXT PRIMARY KEY NOT NULL,
    item_id TEXT NOT NULL,
    uri TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
`;

export const CREATE_NOTIFICATION_SCHEDULES_TABLE = `
  CREATE TABLE IF NOT EXISTS notification_schedules (
    id TEXT PRIMARY KEY NOT NULL,
    item_id TEXT NOT NULL,
    reminder_kind TEXT NOT NULL,
    notification_id TEXT NOT NULL,
    trigger_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`;

export const ADD_PHOTO_URI_COLUMN = `
  ALTER TABLE warranty_items ADD COLUMN photo_uri TEXT;
`;

/**
 * Splits attached documents into invoices and manufacturer-warranty paperwork.
 * Rows written before this column existed carry no record of which they were, so the
 * default files every one of them as an invoice; the user reclassifies from the UI.
 */
export const ADD_DOCUMENT_KIND_COLUMN = `
  ALTER TABLE invoice_images ADD COLUMN kind TEXT NOT NULL DEFAULT 'invoice';
`;

/**
 * Extended warranty cover bought on top of the manufacturer warranty. An item may hold
 * any number of these; `sort_order` is dense from zero and reconciled on save, the same
 * way `invoice_images` is ordered.
 *
 * `ends_on` is derived from `starts_on` and the duration on every write and is never
 * supplied by a caller, matching the contract `warranty_items.expiry_date` already has.
 * `duration_value` and `duration_unit` are both stored so the form shows the duration back
 * as the user typed it — "2 years" must not reopen as "24 months".
 */
export const CREATE_EXTENDED_WARRANTIES_TABLE = `
  CREATE TABLE IF NOT EXISTS extended_warranties (
    id TEXT PRIMARY KEY NOT NULL,
    item_id TEXT NOT NULL,
    provider TEXT,
    duration_value INTEGER NOT NULL,
    duration_unit TEXT NOT NULL,
    starts_on TEXT NOT NULL,
    ends_on TEXT NOT NULL,
    cost REAL,
    notes TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;

/**
 * Scopes a document and a reminder to a cover period. NULL keeps meaning exactly what
 * these rows already meant — a document belonging to the item itself, and a reminder for
 * the manufacturer period — so every pre-existing row is correct with no backfill.
 */
export const ADD_EXTENDED_WARRANTY_SCOPE_COLUMNS = `
  ALTER TABLE invoice_images ADD COLUMN extended_warranty_id TEXT;
  ALTER TABLE notification_schedules ADD COLUMN extended_warranty_id TEXT;
`;
