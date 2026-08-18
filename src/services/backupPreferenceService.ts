import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_BACKUP_TIME_KEY = 'settings.lastBackupTime';

/** ISO timestamp of the last successful backup export, or null if none has been taken. */
export async function getLastBackupTime(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_BACKUP_TIME_KEY);
}

export async function setLastBackupTime(isoTimestamp: string): Promise<void> {
  await AsyncStorage.setItem(LAST_BACKUP_TIME_KEY, isoTimestamp);
}
