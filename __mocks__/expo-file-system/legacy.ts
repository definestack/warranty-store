/**
 * Jest manual mock for `expo-file-system/legacy`. Backs `getInfoAsync` /
 * `deleteAsync` / `makeDirectoryAsync` / `copyAsync` with an in-memory set of
 * "existing" URIs so tests can control file/directory existence and verify
 * copies, without needing the native module.
 */
const existingUris = new Set<string>();

export const documentDirectory = 'file:///mock-documents/';

export function __setFileExists(uri: string, exists: boolean): void {
  if (exists) {
    existingUris.add(uri);
  } else {
    existingUris.delete(uri);
  }
}

export function __resetMockFileSystem(): void {
  existingUris.clear();
}

export async function getInfoAsync(uri: string): Promise<{ exists: boolean }> {
  return { exists: existingUris.has(uri) };
}

export async function deleteAsync(uri: string): Promise<void> {
  existingUris.delete(uri);
}

export async function makeDirectoryAsync(uri: string): Promise<void> {
  existingUris.add(uri);
}

export async function copyAsync({ to }: { from: string; to: string }): Promise<void> {
  existingUris.add(to);
}

// Augments the real module's types so test files can import `__setFileExists`
// / `__resetMockFileSystem` (only provided by this mock) with type safety.
declare module 'expo-file-system/legacy' {
  export function __setFileExists(uri: string, exists: boolean): void;
  export function __resetMockFileSystem(): void;
}
