/**
 * Jest manual mock for `expo-sharing`. Records the last `shareAsync` call so
 * tests can assert the share sheet was invoked with the expected file, without
 * needing the native module.
 */
let lastSharedUri: string | null = null;
let available = true;

export function __setAvailable(value: boolean): void {
  available = value;
}

export function __getLastSharedUri(): string | null {
  return lastSharedUri;
}

export function __resetMockSharing(): void {
  lastSharedUri = null;
  available = true;
}

export async function isAvailableAsync(): Promise<boolean> {
  return available;
}

export async function shareAsync(uri: string): Promise<void> {
  lastSharedUri = uri;
}

declare module 'expo-sharing' {
  export function __setAvailable(value: boolean): void;
  export function __getLastSharedUri(): string | null;
  export function __resetMockSharing(): void;
}
