import type { SQLiteDatabase } from 'expo-sqlite';

import {
  CREATE_SCHEMA_MIGRATIONS_TABLE,
  CREATE_WARRANTY_ITEMS_TABLE,
} from './schema';

export interface Migration {
  version: number;
  name: string;
  up: (db: SQLiteDatabase) => Promise<void>;
}

export const migrations: Migration[] = [
  {
    version: 1,
    name: 'create_warranty_items',
    up: async (db) => {
      await db.execAsync(CREATE_WARRANTY_ITEMS_TABLE);
    },
  },
];

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(CREATE_SCHEMA_MIGRATIONS_TABLE);

  const appliedRow = await db.getFirstAsync<{ maxVersion: number | null }>(
    'SELECT MAX(version) as maxVersion FROM schema_migrations'
  );
  const currentVersion = appliedRow?.maxVersion ?? 0;

  const pending = migrations
    .filter((migration) => migration.version > currentVersion)
    .sort((a, b) => a.version - b.version);

  for (const migration of pending) {
    await db.withTransactionAsync(async () => {
      await migration.up(db);
      await db.runAsync(
        'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)',
        migration.version,
        new Date().toISOString()
      );
    });
  }
}
