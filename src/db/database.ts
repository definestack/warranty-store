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
    })().catch((err) => {
      // Never memoize a failed attempt: the launch screen offers a retry, and it must be
      // able to start a fresh initialization instead of re-awaiting the same rejection.
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}
