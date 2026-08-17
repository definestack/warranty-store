import * as Notifications from 'expo-notifications';

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
