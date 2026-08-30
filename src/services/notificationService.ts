import * as Notifications from 'expo-notifications';

import type { TranslateFn } from '../i18n/i18n';
import type { NotificationSchedule, ReminderKind } from '../types/notification';
import type { WarrantyItem } from '../types/warranty';
import { getCoverageSignature } from '../utils/coverage';
import { fromIsoDate } from '../utils/date';

export async function getNotificationPermissionStatus(): Promise<Notifications.PermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

export async function requestNotificationPermission(): Promise<Notifications.PermissionStatus> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status;
}

/**
 * Requests notification permission the first time it's needed. Only prompts
 * (rationale + OS dialog) while the OS-level status is still "undetermined";
 * an already-resolved status (granted/denied) is returned as-is so the user
 * is never re-asked.
 */
export async function requestNotificationPermissionIfNeeded(
  showRationale: () => Promise<boolean>
): Promise<Notifications.PermissionStatus> {
  const current = await getNotificationPermissionStatus();
  if (current !== 'undetermined') return current;

  const shouldContinue = await showRationale();
  if (!shouldContinue) return current;

  return requestNotificationPermission();
}

const REMINDER_OFFSETS: { kind: ReminderKind; daysBefore: number }[] = [
  { kind: 'thirtyDay', daysBefore: 30 },
  { kind: 'sevenDay', daysBefore: 7 },
  { kind: 'onExpiry', daysBefore: 0 },
];

const REMINDER_HOUR = 9;

/**
 * One stretch of cover an item holds. The manufacturer warranty is a period like any
 * other — it simply has no extended warranty id — so nothing downstream special-cases it.
 */
export interface CoveragePeriod {
  extendedWarrantyId?: string;
  endDate: string;
}

export interface ReminderPlan {
  reminderKind: ReminderKind;
  daysBefore: number;
  triggerAt: Date;
  extendedWarrantyId?: string;
}

export interface ScheduledReminder {
  reminderKind: ReminderKind;
  notificationId: string;
  triggerAt: string;
  extendedWarrantyId?: string;
}

/** An item's cover as periods: the manufacturer warranty, then each extended warranty. */
export function getCoveragePeriods(item: WarrantyItem): CoveragePeriod[] {
  return [
    { endDate: item.expiryDate },
    ...item.extendedWarranties.map((extended) => ({
      extendedWarrantyId: extended.id,
      endDate: extended.endsOn,
    })),
  ];
}

/**
 * The still-upcoming 30/7/0-day reminder trigger times for every one of the item's cover
 * periods. A period that has already ended plans nothing, because the past-trigger filter
 * removes all three of its reminders — no special case needed.
 */
export function computeReminderPlans(item: WarrantyItem, now: Date = new Date()): ReminderPlan[] {
  return getCoveragePeriods(item).flatMap((period) => {
    const end = fromIsoDate(period.endDate);

    return REMINDER_OFFSETS.map(({ kind, daysBefore }) => {
      const triggerAt = new Date(end);
      triggerAt.setDate(triggerAt.getDate() - daysBefore);
      triggerAt.setHours(REMINDER_HOUR, 0, 0, 0);
      return {
        reminderKind: kind,
        daysBefore,
        triggerAt,
        extendedWarrantyId: period.extendedWarrantyId,
      };
    }).filter((plan) => plan.triggerAt.getTime() > now.getTime());
  });
}

/**
 * Schedules a local notification for each upcoming reminder of each cover period.
 * Per-reminder failures are logged and skipped rather than thrown, so one bad schedule
 * call doesn't lose the others or block the caller (item save already succeeded by this
 * point).
 *
 * Content is identical for every period — same title, same body, same payload — so a
 * reminder for extended cover is indistinguishable to the OS from any other, and the
 * existing tap-to-open-item listener needs no change.
 */
export async function scheduleExpiryReminders(
  item: WarrantyItem,
  t: TranslateFn,
  now: Date = new Date()
): Promise<ScheduledReminder[]> {
  const plans = computeReminderPlans(item, now);
  const scheduled: ScheduledReminder[] = [];

  for (const plan of plans) {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: t('notifications.reminderTitle', { name: item.name }),
          body:
            plan.daysBefore === 0
              ? t('date.expiresToday')
              : t('date.expiresIn', { count: plan.daysBefore }),
          data: { itemId: item.id },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: plan.triggerAt },
      });
      scheduled.push({
        reminderKind: plan.reminderKind,
        notificationId,
        triggerAt: plan.triggerAt.toISOString(),
        extendedWarrantyId: plan.extendedWarrantyId,
      });
    } catch (err) {
      console.error(`Failed to schedule ${plan.reminderKind} reminder for item ${item.id}`, err);
    }
  }

  return scheduled;
}

/**
 * True when an edit moved any of the item's cover period end dates, meaning its reminders
 * need rescheduling.
 *
 * This replaces the old expiry-date comparison, which was too narrow: adding or removing
 * an extended warranty changes nothing about `expiryDate`, and under that check the new
 * period would silently never be reminded on.
 */
export function hasCoverageChanged(previous: WarrantyItem, updated: WarrantyItem): boolean {
  return coverageSignatureOf(previous) !== coverageSignatureOf(updated);
}

function coverageSignatureOf(item: WarrantyItem): string {
  return getCoverageSignature(item.expiryDate, item.extendedWarranties);
}

/**
 * Cancels each already-scheduled local notification. Per-reminder failures are logged and
 * skipped rather than thrown, matching scheduleExpiryReminders's fault tolerance.
 */
export async function cancelScheduledReminders(schedules: NotificationSchedule[]): Promise<void> {
  for (const schedule of schedules) {
    try {
      await Notifications.cancelScheduledNotificationAsync(schedule.notificationId);
    } catch (err) {
      console.error(`Failed to cancel ${schedule.reminderKind} reminder for item ${schedule.itemId}`, err);
    }
  }
}

/** Registers a listener that navigates to the tapped notification's item detail screen. */
export function addNotificationResponseListener(
  onItemTapped: (itemId: string) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const itemId = response.notification.request.content.data?.itemId;
    if (typeof itemId === 'string') {
      onItemTapped(itemId);
    }
  });
}
