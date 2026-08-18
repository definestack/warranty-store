import AsyncStorage from '@react-native-async-storage/async-storage';

import { getLastBackupTime, setLastBackupTime } from './backupPreferenceService';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('getLastBackupTime', () => {
  it('returns null when a backup has never been taken', async () => {
    expect(await getLastBackupTime()).toBeNull();
  });

  it('returns the previously persisted timestamp', async () => {
    await setLastBackupTime('2026-08-18T10:00:00.000Z');
    expect(await getLastBackupTime()).toBe('2026-08-18T10:00:00.000Z');
  });
});

describe('setLastBackupTime', () => {
  it('persists the timestamp under the settings key', async () => {
    await setLastBackupTime('2026-08-18T10:00:00.000Z');
    expect(await AsyncStorage.getItem('settings.lastBackupTime')).toBe('2026-08-18T10:00:00.000Z');
  });
});
