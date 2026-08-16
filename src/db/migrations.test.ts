import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { migrations, runMigrations } from './migrations';
import { CREATE_WARRANTY_ITEMS_TABLE } from './schema';

async function freshDb(): Promise<SQLiteDatabase> {
  return openDatabaseAsync('test.db');
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
});
