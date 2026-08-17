/**
 * Jest manual mock for `expo-notifications`. The real module delegates to a
 * native module that jest-expo stubs out to no-ops, so permission/scheduling
 * calls would otherwise resolve to `undefined`. Tests override these with
 * `mockResolvedValueOnce` as needed.
 */
export const getPermissionsAsync = jest.fn(async () => ({ status: 'undetermined' }));

export const requestPermissionsAsync = jest.fn(async () => ({ status: 'granted' }));

export enum SchedulableTriggerInputTypes {
  DATE = 'date',
}

export const scheduleNotificationAsync = jest.fn(async () => 'mock-notification-id');

export const cancelScheduledNotificationAsync = jest.fn(async () => undefined);

export const addNotificationResponseReceivedListener = jest.fn(() => ({ remove: jest.fn() }));
