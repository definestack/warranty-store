import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { runMigrations } from './migrations';

const DATABASE_NAME = 'warranty-store.db';

let dbInstance: SQLiteDatabase | null = null;
let initPromise: Promise<SQLiteDatabase> | null = null;

export function getDatabase(): SQLiteDatabase {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return dbInstance;
}

export function initDatabase(): Promise<SQLiteDatabase> {
  if (!initPromise) {
    initPromise = (async () => {
      const db = await openDatabaseAsync(DATABASE_NAME);
      await runMigrations(db);
      dbInstance = db;
      return db;
    })();
  }
  return initPromise;
}
