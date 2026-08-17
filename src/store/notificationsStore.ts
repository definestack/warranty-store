import { create } from 'zustand';

import {
  deleteAllSchedules,
  deleteSchedulesForItem,
  getAllSchedules,
  saveSchedulesForItem,
} from '../db/notificationSchedulesRepository';
import { getAllItems } from '../db/warrantyRepository';
import type { TranslateFn } from '../i18n/i18n';
import {
  getNotificationsEnabled,
  setNotificationsEnabled as persistNotificationsEnabled,
} from '../services/notificationPreferenceService';
import { cancelScheduledReminders, scheduleExpiryReminders } from '../services/notificationService';
import { getWarrantyStatus } from '../utils/date';

interface NotificationsState {
  enabled: boolean;
  loading: boolean;
  loadPreference: () => Promise<void>;
  setEnabled: (enabled: boolean, t: TranslateFn) => Promise<void>;
}

async function cancelAllReminders(): Promise<void> {
  const schedules = await getAllSchedules();
  await cancelScheduledReminders(schedules);
  await deleteAllSchedules();
}

async function rescheduleAllReminders(t: TranslateFn): Promise<void> {
  const items = await getAllItems();
  const nonExpired = items.filter((item) => getWarrantyStatus(item.expiryDate) !== 'expired');

  for (const item of nonExpired) {
    try {
      await deleteSchedulesForItem(item.id);
      const scheduled = await scheduleExpiryReminders(item, t);
      if (scheduled.length > 0) {
        await saveSchedulesForItem(item.id, scheduled);
      }
    } catch (err) {
      console.error(`Failed to reschedule expiry reminders for item ${item.id}`, err);
    }
  }
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  enabled: true,
  loading: false,
  loadPreference: async () => {
    try {
      const enabled = await getNotificationsEnabled();
      set({ enabled });
    } catch (err) {
      console.error('Failed to load notifications preference', err);
    }
  },
  setEnabled: async (enabled, t) => {
    set({ loading: true });
    try {
      await persistNotificationsEnabled(enabled);
      if (enabled) {
        await rescheduleAllReminders(t);
      } else {
        await cancelAllReminders();
      }
      set({ enabled });
    } catch (err) {
      console.error('Failed to update notifications preference', err);
    } finally {
      set({ loading: false });
    }
  },
}));
