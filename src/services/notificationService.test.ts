import * as Notifications from 'expo-notifications';

import type { TranslateFn } from '../i18n/i18n';
import type { NotificationSchedule } from '../types/notification';
import type { ExtendedWarranty, WarrantyItem } from '../types/warranty';
import {
  cancelScheduledReminders,
  computeReminderPlans,
  getNotificationPermissionStatus,
  getCoveragePeriods,
  hasCoverageChanged,
  requestNotificationPermission,
  requestNotificationPermissionIfNeeded,
  scheduleExpiryReminders,
} from './notificationService';

function makeSchedule(overrides: Partial<NotificationSchedule> = {}): NotificationSchedule {
  return {
    id: 'schedule-1',
    itemId: 'item-1',
    reminderKind: 'thirtyDay',
    notificationId: 'notif-30',
    triggerAt: '2026-12-16T09:00:00.000Z',
    createdAt: '2026-01-15T00:00:00.000Z',
    ...overrides,
  };
}

const t: TranslateFn = (scope, options) =>
  options ? `${scope}:${JSON.stringify(options)}` : scope;

function makeItem(overrides: Partial<WarrantyItem> = {}): WarrantyItem {
  return {
    id: 'item-1',
    name: 'Blender',
    purchaseDate: '2026-01-15',
    warrantyMonths: 12,
    expiryDate: '2027-01-15',
    invoiceDocuments: [],
    warrantyDocuments: [],
    extendedWarranties: [],
    coverageEndDate: '2027-01-15',
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: '2026-01-15T00:00:00.000Z',
    ...overrides,
  };
}

/** An extended warranty on `item-1`, complete enough to stand in for a stored one. */
function makeExtended(id: string, startsOn: string, endsOn: string): ExtendedWarranty {
  return {
    id,
    itemId: 'item-1',
    durationValue: 24,
    durationUnit: 'months',
    startsOn,
    endsOn,
    sortOrder: 0,
    invoiceDocuments: [],
    warrantyDocuments: [],
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: '2026-01-15T00:00:00.000Z',
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

describe('reminders across several cover periods', () => {
  const now = new Date(2026, 0, 15, 8, 0, 0);

  const itemWithCover = () =>
    makeItem({
      expiryDate: '2027-01-15',
      extendedWarranties: [
        makeExtended('ew-1', '2027-01-16', '2029-01-15'),
        makeExtended('ew-2', '2029-01-16', '2031-01-15'),
      ],
    });

  it('plans three reminders for every period, tagged with the period they belong to', () => {
    const plans = computeReminderPlans(itemWithCover(), now);

    expect(plans).toHaveLength(9);
    expect(plans.filter((plan) => plan.extendedWarrantyId === undefined)).toHaveLength(3);
    expect(plans.filter((plan) => plan.extendedWarrantyId === 'ew-1')).toHaveLength(3);
    expect(plans.filter((plan) => plan.extendedWarrantyId === 'ew-2')).toHaveLength(3);
  });

  it('plans each period’s reminders against that period’s own end date', () => {
    const plans = computeReminderPlans(itemWithCover(), now);
    const onExpiry = plans.filter((plan) => plan.reminderKind === 'onExpiry');

    expect(onExpiry.map((plan) => plan.triggerAt)).toEqual([
      new Date(2027, 0, 15, 9, 0, 0, 0),
      new Date(2029, 0, 15, 9, 0, 0, 0),
      new Date(2031, 0, 15, 9, 0, 0, 0),
    ]);
  });

  it('plans nothing for a period that has already ended, but keeps the others', () => {
    const item = makeItem({
      expiryDate: '2020-01-15', // manufacturer cover long gone
      extendedWarranties: [makeExtended('ew-1', '2020-01-16', '2029-01-15')],
    });

    const plans = computeReminderPlans(item, now);

    expect(plans.every((plan) => plan.extendedWarrantyId === 'ew-1')).toBe(true);
    expect(plans).toHaveLength(3);
  });

  it('schedules one notification per period reminder, each carrying the item id', async () => {
    (Notifications.scheduleNotificationAsync as jest.Mock).mockImplementation(async () => 'notif');

    const scheduled = await scheduleExpiryReminders(itemWithCover(), t, now);

    expect(scheduled).toHaveLength(9);
    expect(scheduled.filter((entry) => entry.extendedWarrantyId === 'ew-1')).toHaveLength(3);
    for (const call of (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls) {
      expect(call[0].content.data).toEqual({ itemId: 'item-1' });
    }
  });

  it('keeps the other periods’ reminders when one of them fails to schedule', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    let call = 0;
    (Notifications.scheduleNotificationAsync as jest.Mock).mockImplementation(async () => {
      call += 1;
      if (call === 1) throw new Error('boom');
      return `notif-${call}`;
    });

    const scheduled = await scheduleExpiryReminders(itemWithCover(), t, now);

    expect(scheduled).toHaveLength(8);
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});

describe('cancelScheduledReminders', () => {
  it('cancels each scheduled notification', async () => {
    const schedules = [
      makeSchedule({ notificationId: 'notif-30' }),
      makeSchedule({ notificationId: 'notif-7', reminderKind: 'sevenDay' }),
    ];

    await cancelScheduledReminders(schedules);

    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(2);
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notif-30');
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notif-7');
  });

  it('does nothing for an empty list', async () => {
    await cancelScheduledReminders([]);

    expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
  });

  it('logs and continues when cancelling a reminder fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (Notifications.cancelScheduledNotificationAsync as jest.Mock)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(undefined);
    const schedules = [
      makeSchedule({ notificationId: 'notif-30' }),
      makeSchedule({ notificationId: 'notif-7', reminderKind: 'sevenDay' }),
    ];

    await cancelScheduledReminders(schedules);

    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(2);
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});

describe('hasCoverageChanged', () => {
  it('returns false when nothing about the cover moved', () => {
    const previous = makeItem({ expiryDate: '2027-01-15' });
    const updated = makeItem({ expiryDate: '2027-01-15', notes: 'new notes' });

    expect(hasCoverageChanged(previous, updated)).toBe(false);
  });

  it('returns true when the manufacturer expiry date changed', () => {
    const previous = makeItem({ expiryDate: '2027-01-15' });
    const updated = makeItem({ expiryDate: '2027-06-15' });

    expect(hasCoverageChanged(previous, updated)).toBe(true);
  });

  it('returns true when an extended warranty is added, though the expiry date did not move', () => {
    const previous = makeItem({ expiryDate: '2027-01-15' });
    const updated = makeItem({
      expiryDate: '2027-01-15',
      extendedWarranties: [makeExtended('ew-1', '2027-01-16', '2029-01-15')],
    });

    expect(hasCoverageChanged(previous, updated)).toBe(true);
  });

  it('returns true when an extended warranty is removed', () => {
    const previous = makeItem({
      extendedWarranties: [makeExtended('ew-1', '2027-01-16', '2029-01-15')],
    });
    const updated = makeItem({ extendedWarranties: [] });

    expect(hasCoverageChanged(previous, updated)).toBe(true);
  });

  it('returns true when an existing extended warranty moves its end date', () => {
    const previous = makeItem({
      extendedWarranties: [makeExtended('ew-1', '2027-01-16', '2029-01-15')],
    });
    const updated = makeItem({
      extendedWarranties: [makeExtended('ew-1', '2027-01-16', '2030-01-15')],
    });

    expect(hasCoverageChanged(previous, updated)).toBe(true);
  });

  it('returns false when an extended warranty changes but its end date does not', () => {
    const previous = makeItem({
      extendedWarranties: [{ ...makeExtended('ew-1', '2027-01-16', '2029-01-15'), cost: 100 }],
    });
    const updated = makeItem({
      extendedWarranties: [{ ...makeExtended('ew-1', '2027-01-16', '2029-01-15'), cost: 200 }],
    });

    // Only the cost moved; the reminders it would schedule are identical.
    expect(hasCoverageChanged(previous, updated)).toBe(false);
  });
});

describe('getCoveragePeriods', () => {
  it('lists the manufacturer period first, then each extended warranty', () => {
    const item = makeItem({
      expiryDate: '2027-01-15',
      extendedWarranties: [
        makeExtended('ew-1', '2027-01-16', '2029-01-15'),
        makeExtended('ew-2', '2029-01-16', '2031-01-15'),
      ],
    });

    expect(getCoveragePeriods(item)).toEqual([
      { endDate: '2027-01-15' },
      { extendedWarrantyId: 'ew-1', endDate: '2029-01-15' },
      { extendedWarrantyId: 'ew-2', endDate: '2031-01-15' },
    ]);
  });

  it('is a single manufacturer period for an item with no extended cover', () => {
    expect(getCoveragePeriods(makeItem({ expiryDate: '2027-01-15' }))).toEqual([
      { endDate: '2027-01-15' },
    ]);
  });
});
