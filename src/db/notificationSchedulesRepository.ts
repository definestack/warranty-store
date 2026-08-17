import * as Crypto from 'expo-crypto';

import { nowIso } from '../utils/date';
import type { NotificationSchedule, ReminderKind } from '../types/notification';
import { getDatabase } from './database';

interface NotificationScheduleRow {
  id: string;
  item_id: string;
  reminder_kind: ReminderKind;
  notification_id: string;
  trigger_at: string;
  created_at: string;
}

function mapRowToSchedule(row: NotificationScheduleRow): NotificationSchedule {
  return {
    id: row.id,
    itemId: row.item_id,
    reminderKind: row.reminder_kind,
    notificationId: row.notification_id,
    triggerAt: row.trigger_at,
    createdAt: row.created_at,
  };
}

export interface NewNotificationSchedule {
  reminderKind: ReminderKind;
  notificationId: string;
  triggerAt: string;
}

export async function saveSchedulesForItem(
  itemId: string,
  schedules: NewNotificationSchedule[]
): Promise<void> {
  if (schedules.length === 0) return;

  const db = getDatabase();
  const timestamp = nowIso();
  await db.withTransactionAsync(async () => {
    for (const schedule of schedules) {
      await db.runAsync(
        `INSERT INTO notification_schedules
          (id, item_id, reminder_kind, notification_id, trigger_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        Crypto.randomUUID(),
        itemId,
        schedule.reminderKind,
        schedule.notificationId,
        schedule.triggerAt,
        timestamp
      );
    }
  });
}

export async function getSchedulesForItem(itemId: string): Promise<NotificationSchedule[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<NotificationScheduleRow>(
    'SELECT * FROM notification_schedules WHERE item_id = ? ORDER BY created_at ASC',
    itemId
  );
  return rows.map(mapRowToSchedule);
}
