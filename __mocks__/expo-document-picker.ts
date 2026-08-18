/**
 * Jest manual mock for `expo-document-picker`. Lets tests script the result of
 * the next `getDocumentAsync` call (a picked file or a cancellation), without
 * needing the native module.
 */
import type { DocumentPickerResult } from 'expo-document-picker';

const CANCELED: DocumentPickerResult = { canceled: true, assets: null };

let nextResult: DocumentPickerResult = CANCELED;

export function __setNextDocumentResult(result: DocumentPickerResult): void {
  nextResult = result;
}

export function __resetMockDocumentPicker(): void {
  nextResult = CANCELED;
}

export async function getDocumentAsync(): Promise<DocumentPickerResult> {
  return nextResult;
}

// Augments the real module's types so test files can import
// `__setNextDocumentResult` / `__resetMockDocumentPicker` (only provided by
// this mock) with type safety.
declare module 'expo-document-picker' {
  export function __setNextDocumentResult(result: DocumentPickerResult): void;
  export function __resetMockDocumentPicker(): void;
}
