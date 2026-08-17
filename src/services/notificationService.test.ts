import * as Notifications from 'expo-notifications';

import type { TranslateFn } from '../i18n/i18n';
import type { WarrantyItem } from '../types/warranty';
import {
  computeReminderPlans,
  getNotificationPermissionStatus,
  requestNotificationPermission,
  requestNotificationPermissionIfNeeded,
  scheduleExpiryReminders,
} from './notificationService';

const t: TranslateFn = (scope, options) =>
  options ? `${scope}:${JSON.stringify(options)}` : scope;

function makeItem(overrides: Partial<WarrantyItem> = {}): WarrantyItem {
  return {
    id: 'item-1',
    name: 'Blender',
    purchaseDate: '2026-01-15',
    warrantyMonths: 12,
    expiryDate: '2027-01-15',
    invoiceImages: [],
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: '2026-01-15T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getNotificationPermissionStatus', () => {
  it('returns the live status from the OS', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'granted' });

    await expect(getNotificationPermissionStatus()).resolves.toBe('granted');
  });
});

describe('requestNotificationPermission', () => {
  it('requests permission and returns the resulting status', async () => {
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'denied' });

    await expect(requestNotificationPermission()).resolves.toBe('denied');
  });
});

describe('requestNotificationPermissionIfNeeded', () => {
  it('does nothing and returns the current status when already granted', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'granted' });
    const showRationale = jest.fn();

    await expect(requestNotificationPermissionIfNeeded(showRationale)).resolves.toBe('granted');

    expect(showRationale).not.toHaveBeenCalled();
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('does nothing and returns the current status when already denied', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'denied' });
    const showRationale = jest.fn();

    await expect(requestNotificationPermissionIfNeeded(showRationale)).resolves.toBe('denied');

    expect(showRationale).not.toHaveBeenCalled();
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('shows the rationale and requests permission when status is undetermined', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'undetermined' });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'granted' });
    const showRationale = jest.fn(async () => true);

    await expect(requestNotificationPermissionIfNeeded(showRationale)).resolves.toBe('granted');

    expect(showRationale).toHaveBeenCalledTimes(1);
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('does not request the OS permission when the user declines the rationale', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'undetermined' });
    const showRationale = jest.fn(async () => false);

    await expect(requestNotificationPermissionIfNeeded(showRationale)).resolves.toBe('undetermined');

    expect(showRationale).toHaveBeenCalledTimes(1);
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });
});

describe('computeReminderPlans', () => {
  it('returns all three reminders in chronological order when far from expiry', () => {
    const item = makeItem({ expiryDate: '2027-01-15' });
    const now = new Date(2026, 0, 15, 8, 0, 0);

    const plans = computeReminderPlans(item, now);

    expect(plans.map((p) => p.reminderKind)).toEqual(['thirtyDay', 'sevenDay', 'onExpiry']);
    expect(plans[0].triggerAt).toEqual(new Date(2026, 11, 16, 9, 0, 0, 0));
    expect(plans[1].triggerAt).toEqual(new Date(2027, 0, 8, 9, 0, 0, 0));
    expect(plans[2].triggerAt).toEqual(new Date(2027, 0, 15, 9, 0, 0, 0));
  });

  it('skips reminders whose trigger time has already passed', () => {
    const item = makeItem({ expiryDate: '2027-01-15' });
    const now = new Date(2027, 0, 10, 8, 0, 0);

    const plans = computeReminderPlans(item, now);

    expect(plans.map((p) => p.reminderKind)).toEqual(['onExpiry']);
  });

  it('returns no reminders when expiry has already passed', () => {
    const item = makeItem({ expiryDate: '2026-01-01' });
    const now = new Date(2026, 5, 1);

    expect(computeReminderPlans(item, now)).toEqual([]);
  });
});

describe('scheduleExpiryReminders', () => {
  it('schedules a notification for each future reminder and returns their details', async () => {
    (Notifications.scheduleNotificationAsync as jest.Mock)
      .mockResolvedValueOnce('notif-30')
      .mockResolvedValueOnce('notif-7')
      .mockResolvedValueOnce('notif-0');
    const item = makeItem({ expiryDate: '2027-01-15' });
    const now = new Date(2026, 0, 15, 8, 0, 0);

    const scheduled = await scheduleExpiryReminders(item, t, now);

    expect(scheduled).toEqual([
      {
        reminderKind: 'thirtyDay',
        notificationId: 'notif-30',
        triggerAt: new Date(2026, 11, 16, 9, 0, 0, 0).toISOString(),
      },
      {
        reminderKind: 'sevenDay',
        notificationId: 'notif-7',
        triggerAt: new Date(2027, 0, 8, 9, 0, 0, 0).toISOString(),
      },
      {
        reminderKind: 'onExpiry',
        notificationId: 'notif-0',
        triggerAt: new Date(2027, 0, 15, 9, 0, 0, 0).toISOString(),
      },
    ]);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(3);
  });

  it('includes the item name and days remaining in the notification content', async () => {
    const item = makeItem({ name: 'Blender', expiryDate: '2027-01-15' });
    const now = new Date(2026, 0, 15, 8, 0, 0);

    await scheduleExpiryReminders(item, t, now);

    const [firstCall] = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls;
    expect(firstCall[0].content.title).toContain('Blender');
    expect(firstCall[0].content.body).toContain('30');
    expect(firstCall[0].content.data).toEqual({ itemId: 'item-1' });
  });

  it('uses the on-expiry copy for the day-of reminder', async () => {
    const item = makeItem({ expiryDate: '2026-01-22' });
    const now = new Date(2026, 0, 20, 8, 0, 0);

    await scheduleExpiryReminders(item, t, now);

    const [call] = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls;
    expect(call[0].content.body).toBe('date.expiresToday');
  });

  it('returns no scheduled reminders when none are upcoming', async () => {
    const item = makeItem({ expiryDate: '2026-01-01' });
    const now = new Date(2026, 5, 1);

    const scheduled = await scheduleExpiryReminders(item, t, now);

    expect(scheduled).toEqual([]);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('logs and continues when scheduling a reminder fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (Notifications.scheduleNotificationAsync as jest.Mock)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce('notif-7')
      .mockResolvedValueOnce('notif-0');
    const item = makeItem({ expiryDate: '2027-01-15' });
    const now = new Date(2026, 0, 15, 8, 0, 0);

    const scheduled = await scheduleExpiryReminders(item, t, now);

    expect(scheduled).toEqual([
      {
        reminderKind: 'sevenDay',
        notificationId: 'notif-7',
        triggerAt: new Date(2027, 0, 8, 9, 0, 0, 0).toISOString(),
      },
      {
        reminderKind: 'onExpiry',
        notificationId: 'notif-0',
        triggerAt: new Date(2027, 0, 15, 9, 0, 0, 0).toISOString(),
      },
    ]);
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
