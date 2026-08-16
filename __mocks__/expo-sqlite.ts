import Database from 'better-sqlite3';

/**
 * Jest manual mock for `expo-sqlite`. Backs the async `SQLiteDatabase` API our
 * code relies on with a real in-memory `better-sqlite3` engine, so repository
 * and migration tests exercise actual SQL instead of a hand-rolled fake.
 */
class FakeSQLiteDatabase {
  private readonly db: InstanceType<typeof Database>;

  constructor() {
    this.db = new Database(':memory:');
  }

  async execAsync(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async runAsync(sql: string, ...params: unknown[]): Promise<{ changes: number; lastInsertRowId: number }> {
    const info = this.db.prepare(sql).run(...params);
    return { changes: info.changes, lastInsertRowId: Number(info.lastInsertRowid) };
  }

  async getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]> {
    return this.db.prepare(sql).all(...params) as T[];
  }

  async getFirstAsync<T>(sql: string, ...params: unknown[]): Promise<T | null> {
    const row = this.db.prepare(sql).get(...params);
    return (row as T) ?? null;
  }

  async withTransactionAsync(callback: () => Promise<void>): Promise<void> {
    this.db.exec('BEGIN');
    try {
      await callback();
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
}

export async function openDatabaseAsync(_name: string): Promise<FakeSQLiteDatabase> {
  return new FakeSQLiteDatabase();
}
