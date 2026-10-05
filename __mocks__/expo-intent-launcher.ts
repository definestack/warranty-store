/**
 * Jest manual mock for `expo-intent-launcher`. Each test scripts the outcome of
 * `startActivityAsync` (a launched viewer, or a throw when no app can handle the intent)
 * without needing the native module.
 */
export const startActivityAsync = jest.fn(async () => ({ resultCode: -1, data: null }));
