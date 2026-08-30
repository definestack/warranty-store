import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

import { getDatabase, initDatabase } from '../db/database';
import { getAllSchedules, saveSchedulesForItem } from '../db/notificationSchedulesRepository';
import { saveExtendedWarrantiesForItem } from '../db/extendedWarrantyRepository';
import { createItem } from '../db/warrantyRepository';
import type { TranslateFn } from '../i18n/i18n';
import { useNotificationsStore } from './notificationsStore';

const t: TranslateFn = (scope, options) => (options ? `${scope}:${JSON.stringify(options)}` : scope);

beforeAll(async () => {
  await initDatabase();
});

beforeEach(async () => {
  await getDatabase().runAsync('DELETE FROM notification_schedules');
  await getDatabase().runAsync('DELETE FROM extended_warranties');
  await getDatabase().runAsync('DELETE FROM warranty_items');
  await AsyncStorage.clear();
  useNotificationsStore.setState({ enabled: true, loading: false });
  jest.clearAllMocks();
});

async function makeItem(purchaseDate: string, warrantyMonths: number, name = 'Blender') {
  return createItem({ name, purchaseDate, warrantyMonths });
}

describe('notificationsStore', () => {
  it('starts enabled and not loading', () => {
    expect(useNotificationsStore.getState().enabled).toBe(true);
    expect(useNotificationsStore.getState().loading).toBe(false);
  });
});

describe('loadPreference', () => {
  it('loads the persisted value from AsyncStorage', async () => {
    await AsyncStorage.setItem('settings.notificationsEnabled', 'false');

    await useNotificationsStore.getState().loadPreference();

    expect(useNotificationsStore.getState().enabled).toBe(false);
  });

  it('defaults to enabled when nothing is persisted', async () => {
    await useNotificationsStore.getState().loadPreference();

    expect(useNotificationsStore.getState().enabled).toBe(true);
  });
});

describe('setEnabled(false)', () => {
  it('persists the preference and cancels every scheduled reminder', async () => {
    const item = await makeItem('2026-01-01', 12);
    await saveSchedulesForItem(item.id, [
      { reminderKind: 'thirtyDay', notificationId: 'notif-30', triggerAt: '2026-12-16T09:00:00.000Z' },
      { reminderKind: 'sevenDay', notificationId: 'notif-7', triggerAt: '2027-01-08T09:00:00.000Z' },
    ]);

    await useNotificationsStore.getState().setEnabled(false, t);

    expect(await AsyncStorage.getItem('settings.notificationsEnabled')).toBe('false');
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(2);
    expect(await getAllSchedules()).toEqual([]);
    expect(useNotificationsStore.getState().enabled).toBe(false);
  });

  it('sets loading true while the cancellation is in flight', async () => {
    const promise = useNotificationsStore.getState().setEnabled(false, t);
    expect(useNotificationsStore.getState().loading).toBe(true);
    await promise;
    expect(useNotificationsStore.getState().loading).toBe(false);
  });

  it('does nothing destructive when there are no schedules to cancel', async () => {
    await expect(useNotificationsStore.getState().setEnabled(false, t)).resolves.toBeUndefined();
    expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
  });
});

describe('setEnabled(true)', () => {
  it('persists the preference and reschedules reminders for every non-expired item', async () => {
    (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue('mock-notification-id');
    await makeItem('2026-06-01', 12, 'Active Item'); // expires 2027-06-01, not yet expired

    await useNotificationsStore.getState().setEnabled(true, t);

    expect(await AsyncStorage.getItem('settings.notificationsEnabled')).toBe('true');
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
    expect(await getAllSchedules()).not.toEqual([]);
    expect(useNotificationsStore.getState().enabled).toBe(true);
  });

  it('does not schedule reminders for already-expired items', async () => {
    await makeItem('2020-01-01', 1, 'Expired Item'); // expired long ago

    await useNotificationsStore.getState().setEnabled(true, t);

    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(await getAllSchedules()).toEqual([]);
  });

  it('still schedules for an item kept alive only by its extended cover', async () => {
    const item = await makeItem('2020-01-01', 1, 'Extended Item'); // manufacturer cover long gone
    await saveExtendedWarrantiesForItem(item.id, [
      {
        id: 'ew-live',
        durationValue: 10,
        durationUnit: 'years',
        startsOn: '2020-02-02',
        isPersisted: false,
      },
    ]);

    await useNotificationsStore.getState().setEnabled(true, t);

    // The item is not expired — its cover runs to 2030 — so it must not be filtered out.
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
    expect(await getAllSchedules()).not.toEqual([]);
  });

  it('logs and continues when scheduling fails for one item', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (Notifications.scheduleNotificationAsync as jest.Mock).mockRejectedValue(new Error('boom'));
    await makeItem('2026-06-01', 12, 'Active Item');

    await expect(useNotificationsStore.getState().setEnabled(true, t)).resolves.toBeUndefined();

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
