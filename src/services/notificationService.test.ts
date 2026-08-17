import * as Notifications from 'expo-notifications';

import {
  getNotificationPermissionStatus,
  requestNotificationPermission,
  requestNotificationPermissionIfNeeded,
} from './notificationService';

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
