/**
 * Jest manual mock for `expo-file-system/legacy`. Backs `getInfoAsync` /
 * `deleteAsync` / `makeDirectoryAsync` / `copyAsync` with an in-memory set of
 * "existing" URIs, and `readAsStringAsync` / `writeAsStringAsync` with an
 * in-memory content map, so tests can control file/directory existence and
 * verify copies/content, without needing the native module.
 */
const existingUris = new Set<string>();
const fileContents = new Map<string, string>();
let writeFailurePattern: string | null = null;

export const documentDirectory = 'file:///mock-documents/';
export const cacheDirectory = 'file:///mock-cache/';

export function __setFileExists(uri: string, exists: boolean): void {
  if (exists) {
    existingUris.add(uri);
  } else {
    existingUris.delete(uri);
  }
}

export function __setFileContent(uri: string, content: string): void {
  existingUris.add(uri);
  fileContents.set(uri, content);
}

/** Makes `writeAsStringAsync` reject for any uri containing `pattern`, so tests can
 *  exercise write-failure paths. Pass null to clear. */
export function __setWriteFailure(pattern: string | null): void {
  writeFailurePattern = pattern;
}

export function __resetMockFileSystem(): void {
  existingUris.clear();
  fileContents.clear();
  writeFailurePattern = null;
}

export async function getInfoAsync(uri: string): Promise<{ exists: boolean }> {
  return { exists: existingUris.has(uri) };
}

export async function deleteAsync(uri: string): Promise<void> {
  existingUris.delete(uri);
  fileContents.delete(uri);
}

export async function makeDirectoryAsync(uri: string): Promise<void> {
  existingUris.add(uri);
}

export async function copyAsync({ from, to }: { from: string; to: string }): Promise<void> {
  existingUris.add(to);
  const content = fileContents.get(from);
  if (content !== undefined) {
    fileContents.set(to, content);
  }
}

export async function readAsStringAsync(uri: string): Promise<string> {
  const content = fileContents.get(uri);
  if (content === undefined) {
    throw new Error(`Mock file system: no content set for ${uri}`);
  }
  return content;
}

export async function writeAsStringAsync(uri: string, content: string): Promise<void> {
  if (writeFailurePattern !== null && uri.includes(writeFailurePattern)) {
    throw new Error(`Mock file system: write failed for ${uri}`);
  }
  existingUris.add(uri);
  fileContents.set(uri, content);
}

// Augments the real module's types so test files can import `__setFileExists`
// / `__setFileContent` / `__resetMockFileSystem` (only provided by this mock)
// with type safety.
declare module 'expo-file-system/legacy' {
  export function __setFileExists(uri: string, exists: boolean): void;
  export function __setFileContent(uri: string, content: string): void;
  export function __setWriteFailure(pattern: string | null): void;
  export function __resetMockFileSystem(): void;
}
