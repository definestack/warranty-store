export type ReminderKind = 'thirtyDay' | 'sevenDay' | 'onExpiry';

export interface NotificationSchedule {
  id: string;
  itemId: string;
  /**
   * The extended warranty this reminder belongs to, or undefined for the item's
   * manufacturer period. Reminders are scheduled per cover period, so the item id alone
   * no longer identifies which reminder this is.
   */
  extendedWarrantyId?: string;
  reminderKind: ReminderKind;
  notificationId: string;
  triggerAt: string;
  createdAt: string;
}
