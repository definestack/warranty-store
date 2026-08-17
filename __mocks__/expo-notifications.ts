/**
 * Jest manual mock for `expo-notifications`. The real module delegates to a
 * native module that jest-expo stubs out to no-ops, so permission calls would
 * otherwise resolve to `undefined`. Tests override these with
 * `mockResolvedValueOnce` as needed.
 */
export const getPermissionsAsync = jest.fn(async () => ({ status: 'undetermined' }));

export const requestPermissionsAsync = jest.fn(async () => ({ status: 'granted' }));
