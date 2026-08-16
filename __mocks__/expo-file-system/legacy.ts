/**
 * Jest manual mock for `expo-file-system/legacy`. Backs `getInfoAsync` /
 * `deleteAsync` with an in-memory set of "existing" URIs so tests can
 * control whether a delete is a no-op or an actual removal, without needing
 * the native module.
 */
const existingUris = new Set<string>();

export function __setFileExists(uri: string, exists: boolean): void {
  if (exists) {
    existingUris.add(uri);
  } else {
    existingUris.delete(uri);
  }
}

export async function getInfoAsync(uri: string): Promise<{ exists: boolean }> {
  return { exists: existingUris.has(uri) };
}

export async function deleteAsync(uri: string): Promise<void> {
  existingUris.delete(uri);
}

// Augments the real module's types so test files can import `__setFileExists`
// (only provided by this mock) with type safety.
declare module 'expo-file-system/legacy' {
  export function __setFileExists(uri: string, exists: boolean): void;
}
