export type ReminderKind = 'thirtyDay' | 'sevenDay' | 'onExpiry';

export interface NotificationSchedule {
  id: string;
  itemId: string;
  reminderKind: ReminderKind;
  notificationId: string;
  triggerAt: string;
  createdAt: string;
}
