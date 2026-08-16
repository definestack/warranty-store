import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { migrations, runMigrations } from './migrations';

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
});
