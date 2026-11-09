/**
 * Jest manual mock for `expo-sharing`. Each test scripts the outcome of
 * `isAvailableAsync` / `shareAsync` without needing the native module.
 */
export const isAvailableAsync = jest.fn(async () => true);
export const shareAsync = jest.fn(async () => {});
