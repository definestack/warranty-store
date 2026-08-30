import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { migrations, runMigrations } from './migrations';
import { CREATE_SCHEMA_MIGRATIONS_TABLE, CREATE_WARRANTY_ITEMS_TABLE } from './schema';

async function freshDb(): Promise<SQLiteDatabase> {
  return openDatabaseAsync('test.db');
}

/** Brings a fresh database to the given schema version, as an older install would be. */
async function migrateToVersion(db: SQLiteDatabase, version: number): Promise<void> {
  await db.execAsync(CREATE_SCHEMA_MIGRATIONS_TABLE);
  for (const migration of migrations.filter((candidate) => candidate.version <= version)) {
    await migration.up(db);
    await db.runAsync(
      'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)',
      migration.version,
      '2026-01-01T00:00:00.000Z'
    );
  }
}

describe('runMigrations', () => {
  it('creates the warranty_items table', async () => {
    const db = await freshDb();
    await runMigrations(db);

    const table = await db.getFirstAsync(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'warranty_items'"
    );
    expect(table).not.toBeNull();
  });

  it('records the applied migration version', async () => {
    const db = await freshDb();
    await runMigrations(db);

    const row = await db.getFirstAsync<{ version: number }>(
      'SELECT MAX(version) as version FROM schema_migrations'
    );
    const latestVersion = Math.max(...migrations.map((migration) => migration.version));
    expect(row?.version).toBe(latestVersion);
  });

  it('adds the brand, price, and store columns', async () => {
    const db = await freshDb();
    await runMigrations(db);

    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(warranty_items)');
    const columnNames = columns.map((column) => column.name);
    expect(columnNames).toEqual(expect.arrayContaining(['brand', 'price', 'store']));
  });

  it('is idempotent when run more than once', async () => {
    const db = await freshDb();
    await runMigrations(db);
    await runMigrations(db);

    const rows = await db.getAllAsync('SELECT * FROM schema_migrations');
    expect(rows).toHaveLength(migrations.length);
  });

  it('creates the invoice_images table', async () => {
    const db = await freshDb();
    await runMigrations(db);

    const table = await db.getFirstAsync(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'invoice_images'"
    );
    expect(table).not.toBeNull();
  });

  it('migrates an existing invoice_uri into invoice_images as page 1', async () => {
    const db = await freshDb();
    await db.execAsync(CREATE_WARRANTY_ITEMS_TABLE);
    await db.runAsync(
      `INSERT INTO warranty_items
        (id, name, purchase_date, warranty_months, expiry_date, invoice_uri, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      'legacy-item',
      'Blender',
      '2026-01-15',
      12,
      '2027-01-15',
      'file:///legacy-invoice.jpg',
      '2026-01-15T00:00:00.000Z',
      '2026-01-15T00:00:00.000Z'
    );

    const migrationV4 = migrations.find((migration) => migration.version === 4);
    await migrationV4!.up(db);

    const rows = await db.getAllAsync<{ item_id: string; uri: string; sort_order: number }>(
      'SELECT * FROM invoice_images WHERE item_id = ?',
      'legacy-item'
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].uri).toBe('file:///legacy-invoice.jpg');
    expect(rows[0].sort_order).toBe(0);
  });

  it('does not create an invoice_images row when invoice_uri is null', async () => {
    const db = await freshDb();
    await db.execAsync(CREATE_WARRANTY_ITEMS_TABLE);
    await db.runAsync(
      `INSERT INTO warranty_items
        (id, name, purchase_date, warranty_months, expiry_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      'no-invoice-item',
      'Toaster',
      '2026-01-15',
      6,
      '2026-07-15',
      '2026-01-15T00:00:00.000Z',
      '2026-01-15T00:00:00.000Z'
    );

    const migrationV4 = migrations.find((migration) => migration.version === 4);
    await migrationV4!.up(db);

    const rows = await db.getAllAsync('SELECT * FROM invoice_images WHERE item_id = ?', 'no-invoice-item');
    expect(rows).toHaveLength(0);
  });

  it('creates the notification_schedules table', async () => {
    const db = await freshDb();
    await runMigrations(db);

    const table = await db.getFirstAsync(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'notification_schedules'"
    );
    expect(table).not.toBeNull();
  });

  it('adds a nullable photo_uri column to warranty_items', async () => {
    const db = await freshDb();
    await runMigrations(db);

    const columns = await db.getAllAsync<{ name: string; notnull: number; dflt_value: string | null }>(
      'PRAGMA table_info(warranty_items)'
    );
    const photoColumn = columns.find((column) => column.name === 'photo_uri');

    expect(photoColumn).toBeDefined();
    expect(photoColumn?.notnull).toBe(0);
    expect(photoColumn?.dflt_value).toBeNull();
  });

  it('keeps rows written before migration 6 intact with a null photo_uri', async () => {
    const db = await freshDb();
    await migrateToVersion(db, 5);
    await db.runAsync(
      `INSERT INTO warranty_items
        (id, name, purchase_date, warranty_months, expiry_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      'pre-photo-item',
      'Kettle',
      '2026-01-15',
      12,
      '2027-01-15',
      '2026-01-15T00:00:00.000Z',
      '2026-01-15T00:00:00.000Z'
    );

    await runMigrations(db);

    const row = await db.getFirstAsync<{ name: string; expiry_date: string; photo_uri: string | null }>(
      'SELECT * FROM warranty_items WHERE id = ?',
      'pre-photo-item'
    );
    expect(row?.name).toBe('Kettle');
    expect(row?.expiry_date).toBe('2027-01-15');
    expect(row?.photo_uri).toBeNull();
  });

  it('applies nothing when re-run on a fully migrated database', async () => {
    const db = await freshDb();
    await runMigrations(db);

    await expect(runMigrations(db)).resolves.toBeUndefined();

    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(warranty_items)');
    expect(columns.filter((column) => column.name === 'photo_uri')).toHaveLength(1);

    const applied = await db.getAllAsync('SELECT * FROM schema_migrations');
    expect(applied).toHaveLength(migrations.length);
  });

  it('adds a non-null kind column defaulting to invoice on invoice_images', async () => {
    const db = await freshDb();
    await runMigrations(db);

    const columns = await db.getAllAsync<{ name: string; notnull: number; dflt_value: string | null }>(
      'PRAGMA table_info(invoice_images)'
    );
    const kindColumn = columns.find((column) => column.name === 'kind');

    expect(kindColumn).toBeDefined();
    expect(kindColumn?.notnull).toBe(1);
    expect(kindColumn?.dflt_value).toBe("'invoice'");
  });

  it('files documents attached before migration 7 as invoice documents', async () => {
    const db = await freshDb();
    await migrateToVersion(db, 6);
    await db.runAsync(
      `INSERT INTO warranty_items
        (id, name, purchase_date, warranty_months, expiry_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      'pre-kind-item',
      'Microwave',
      '2026-01-15',
      24,
      '2028-01-15',
      '2026-01-15T00:00:00.000Z',
      '2026-01-15T00:00:00.000Z'
    );
    // A warranty card and a receipt, indistinguishable before the split.
    await db.runAsync(
      'INSERT INTO invoice_images (id, item_id, uri, sort_order, created_at) VALUES (?, ?, ?, ?, ?)',
      'doc-receipt',
      'pre-kind-item',
      'file:///receipt.jpg',
      0,
      '2026-01-15T00:00:00.000Z'
    );
    await db.runAsync(
      'INSERT INTO invoice_images (id, item_id, uri, sort_order, created_at) VALUES (?, ?, ?, ?, ?)',
      'doc-warranty-card',
      'pre-kind-item',
      'file:///warranty-card.jpg',
      1,
      '2026-01-15T00:00:00.000Z'
    );

    await runMigrations(db);

    const rows = await db.getAllAsync<{ id: string; uri: string; sort_order: number; kind: string }>(
      'SELECT * FROM invoice_images WHERE item_id = ? ORDER BY sort_order ASC',
      'pre-kind-item'
    );
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.kind)).toEqual(['invoice', 'invoice']);
    expect(rows.map((row) => row.uri)).toEqual(['file:///receipt.jpg', 'file:///warranty-card.jpg']);
    expect(rows.map((row) => row.sort_order)).toEqual([0, 1]);
  });

  it('applies nothing when re-run on a database already at version 7', async () => {
    const db = await freshDb();
    await migrateToVersion(db, 7);

    await expect(runMigrations(db)).resolves.toBeUndefined();

    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(invoice_images)');
    expect(columns.filter((column) => column.name === 'kind')).toHaveLength(1);

    const applied = await db.getAllAsync('SELECT * FROM schema_migrations');
    expect(applied).toHaveLength(migrations.length);
  });

  it('creates the extended_warranties table', async () => {
    const db = await freshDb();
    await runMigrations(db);

    const table = await db.getFirstAsync(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'extended_warranties'"
    );
    expect(table).not.toBeNull();

    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(extended_warranties)');
    expect(columns.map((column) => column.name)).toEqual(
      expect.arrayContaining([
        'id',
        'item_id',
        'provider',
        'duration_value',
        'duration_unit',
        'starts_on',
        'ends_on',
        'cost',
        'notes',
        'sort_order',
        'created_at',
        'updated_at',
      ])
    );
  });

  it('leaves items that existed before migration 8 holding no extended warranties', async () => {
    const db = await freshDb();
    await migrateToVersion(db, 7);
    await db.runAsync(
      `INSERT INTO warranty_items
        (id, name, purchase_date, warranty_months, expiry_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      'pre-extended-item',
      'Dishwasher',
      '2026-02-01',
      24,
      '2028-02-01',
      '2026-02-01T00:00:00.000Z',
      '2026-02-01T00:00:00.000Z'
    );

    await runMigrations(db);

    const item = await db.getFirstAsync<{ name: string; expiry_date: string }>(
      'SELECT * FROM warranty_items WHERE id = ?',
      'pre-extended-item'
    );
    expect(item?.name).toBe('Dishwasher');
    expect(item?.expiry_date).toBe('2028-02-01');

    const extended = await db.getAllAsync(
      'SELECT * FROM extended_warranties WHERE item_id = ?',
      'pre-extended-item'
    );
    expect(extended).toHaveLength(0);
  });

  it('adds a nullable extended warranty reference to invoice_images and notification_schedules', async () => {
    const db = await freshDb();
    await runMigrations(db);

    for (const table of ['invoice_images', 'notification_schedules']) {
      const columns = await db.getAllAsync<{
        name: string;
        notnull: number;
        dflt_value: string | null;
      }>(`PRAGMA table_info(${table})`);
      const column = columns.find((candidate) => candidate.name === 'extended_warranty_id');

      expect(column).toBeDefined();
      expect(column?.notnull).toBe(0);
      expect(column?.dflt_value).toBeNull();
    }
  });

  it('reads rows written before migration 9 as item-scoped documents and manufacturer reminders', async () => {
    const db = await freshDb();
    await migrateToVersion(db, 8);
    await db.runAsync(
      `INSERT INTO warranty_items
        (id, name, purchase_date, warranty_months, expiry_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      'pre-scope-item',
      'Router',
      '2026-03-01',
      12,
      '2027-03-01',
      '2026-03-01T00:00:00.000Z',
      '2026-03-01T00:00:00.000Z'
    );
    await db.runAsync(
      'INSERT INTO invoice_images (id, item_id, uri, sort_order, created_at, kind) VALUES (?, ?, ?, ?, ?, ?)',
      'doc-pre-scope',
      'pre-scope-item',
      'file:///receipt.jpg',
      0,
      '2026-03-01T00:00:00.000Z',
      'invoice'
    );
    await db.runAsync(
      `INSERT INTO notification_schedules
        (id, item_id, reminder_kind, notification_id, trigger_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      'sched-pre-scope',
      'pre-scope-item',
      'thirtyDay',
      'os-notification-1',
      '2027-01-30T09:00:00.000Z',
      '2026-03-01T00:00:00.000Z'
    );

    await runMigrations(db);

    // NULL keeps meaning what these rows already meant: a document on the item itself,
    // and a reminder for the manufacturer period.
    const document = await db.getFirstAsync<{ extended_warranty_id: string | null; kind: string }>(
      'SELECT * FROM invoice_images WHERE id = ?',
      'doc-pre-scope'
    );
    expect(document?.extended_warranty_id).toBeNull();
    expect(document?.kind).toBe('invoice');

    const schedule = await db.getFirstAsync<{
      extended_warranty_id: string | null;
      notification_id: string;
    }>('SELECT * FROM notification_schedules WHERE id = ?', 'sched-pre-scope');
    expect(schedule?.extended_warranty_id).toBeNull();
    expect(schedule?.notification_id).toBe('os-notification-1');
  });

  it('applies nothing when re-run on a database already at version 9', async () => {
    const db = await freshDb();
    await migrateToVersion(db, 9);

    await expect(runMigrations(db)).resolves.toBeUndefined();

    const documentColumns = await db.getAllAsync<{ name: string }>(
      'PRAGMA table_info(invoice_images)'
    );
    expect(
      documentColumns.filter((column) => column.name === 'extended_warranty_id')
    ).toHaveLength(1);

    const tables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'extended_warranties'"
    );
    expect(tables).toHaveLength(1);

    const applied = await db.getAllAsync('SELECT * FROM schema_migrations');
    expect(applied).toHaveLength(migrations.length);
  });
});
