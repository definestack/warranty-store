import AsyncStorage from '@react-native-async-storage/async-storage';

import { getNotificationsEnabled, setNotificationsEnabled } from './notificationPreferenceService';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('getNotificationsEnabled', () => {
  it('defaults to enabled when nothing has been stored yet', async () => {
    expect(await getNotificationsEnabled()).toBe(true);
  });

  it('returns the previously persisted value', async () => {
    await setNotificationsEnabled(false);
    expect(await getNotificationsEnabled()).toBe(false);

    await setNotificationsEnabled(true);
    expect(await getNotificationsEnabled()).toBe(true);
  });
});

describe('setNotificationsEnabled', () => {
  it('persists the value under the settings key', async () => {
    await setNotificationsEnabled(false);
    expect(await AsyncStorage.getItem('settings.notificationsEnabled')).toBe('false');
  });
});
