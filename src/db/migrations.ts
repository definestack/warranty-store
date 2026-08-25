import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import {
  ADD_BRAND_AND_PRICE_COLUMNS,
  ADD_PHOTO_URI_COLUMN,
  ADD_STORE_COLUMN,
  CREATE_INVOICE_IMAGES_TABLE,
  CREATE_NOTIFICATION_SCHEDULES_TABLE,
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
  {
    version: 2,
    name: 'add_brand_and_price_to_warranty_items',
    up: async (db) => {
      await db.execAsync(ADD_BRAND_AND_PRICE_COLUMNS);
    },
  },
  {
    version: 3,
    name: 'add_store_to_warranty_items',
    up: async (db) => {
      await db.execAsync(ADD_STORE_COLUMN);
    },
  },
  {
    version: 4,
    name: 'add_invoice_images_table',
    up: async (db) => {
      await db.execAsync(CREATE_INVOICE_IMAGES_TABLE);

      const legacyRows = await db.getAllAsync<{
        id: string;
        invoice_uri: string | null;
        created_at: string;
      }>('SELECT id, invoice_uri, created_at FROM warranty_items WHERE invoice_uri IS NOT NULL');

      for (const row of legacyRows) {
        await db.runAsync(
          'INSERT INTO invoice_images (id, item_id, uri, sort_order, created_at) VALUES (?, ?, ?, 0, ?)',
          Crypto.randomUUID(),
          row.id,
          row.invoice_uri,
          row.created_at
        );
      }
    },
  },
  {
    version: 5,
    name: 'create_notification_schedules_table',
    up: async (db) => {
      await db.execAsync(CREATE_NOTIFICATION_SCHEDULES_TABLE);
    },
  },
  {
    version: 6,
    name: 'add_photo_uri_to_warranty_items',
    up: async (db) => {
      await db.execAsync(ADD_PHOTO_URI_COLUMN);
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
