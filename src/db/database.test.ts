import { openDatabaseAsync } from 'expo-sqlite';

import { initDatabase } from './database';
import { runMigrations } from './migrations';

jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));
jest.mock('./migrations', () => ({ runMigrations: jest.fn() }));

const openDatabaseAsyncMock = openDatabaseAsync as unknown as jest.Mock;
const fakeDatabase = { name: 'warranty-store.db' };

beforeAll(() => {
  (runMigrations as unknown as jest.Mock).mockResolvedValue(undefined);
});

/**
 * These cases share one module instance and therefore one memoized init promise,
 * so the failure case has to run before the success case caches a connection.
 */
describe('initDatabase', () => {
  it('does not cache a failed attempt, so a later call can still succeed', async () => {
    openDatabaseAsyncMock.mockRejectedValueOnce(new Error('unable to open database file'));

    await expect(initDatabase()).rejects.toThrow('unable to open database file');

    openDatabaseAsyncMock.mockResolvedValueOnce(fakeDatabase);
    await expect(initDatabase()).resolves.toBe(fakeDatabase);
    expect(openDatabaseAsyncMock).toHaveBeenCalledTimes(2);
  });

  it('opens the database once and reuses the connection', async () => {
    openDatabaseAsyncMock.mockClear();

    const first = await initDatabase();
    const second = await initDatabase();

    expect(second).toBe(first);
    expect(openDatabaseAsyncMock).not.toHaveBeenCalled();
  });
});
