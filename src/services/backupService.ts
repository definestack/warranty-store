import {
  cacheDirectory,
  getInfoAsync,
  makeDirectoryAsync,
  readAsStringAsync,
  writeAsStringAsync,
} from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import JSZip from 'jszip';

import { getAllItems } from '../db/warrantyRepository';
import type { InvoiceImage, WarrantyItem } from '../types/warranty';
import { nowIso } from '../utils/date';

const BACKUP_DIR = `${cacheDirectory}backups/`;
export const BACKUP_DATA_FILE_NAME = 'data.json';
export const BACKUP_FORMAT_VERSION = 1;

export interface BackupPayload {
  formatVersion: number;
  exportedAt: string;
  items: WarrantyItem[];
}

export interface BackupArchiveResult {
  uri: string;
  itemCount: number;
  /** How many image files were left out because they could not be read. */
  skippedFileCount: number;
}

export interface CreateBackupOptions {
  /** Export anyway, omitting files that cannot be read, instead of reporting them. */
  skipMissingFiles?: boolean;
}

/** An image referenced by an item whose file could not be read at export time. */
export interface MissingBackupFile {
  itemId: string;
  itemName: string;
  kind: 'invoice' | 'photo';
  uri: string;
}

/**
 * Raised when an item references an image file that is gone or unreadable. Thrown
 * before any archive is written, so the user can decide whether to export without
 * those files rather than silently losing them or losing the whole backup.
 */
export class BackupMissingFilesError extends Error {
  readonly missingFiles: MissingBackupFile[];

  constructor(missingFiles: MissingBackupFile[]) {
    super(`${missingFiles.length} referenced image file(s) could not be read`);
    this.name = 'BackupMissingFilesError';
    this.missingFiles = missingFiles;
    // Restores the prototype chain so `instanceof` still works after transpilation.
    Object.setPrototypeOf(this, BackupMissingFilesError.prototype);
  }
}

function fileExtension(uri: string): string {
  const extMatch = uri.match(/\.[a-zA-Z0-9]+$/);
  return extMatch ? extMatch[0] : '.jpg';
}

function invoiceFileName(image: InvoiceImage): string {
  return `${image.id}${fileExtension(image.uri)}`;
}

/** One photo per item, so the item's own id is enough to name it unambiguously. */
function photoFileName(item: WarrantyItem): string {
  return `${item.id}${fileExtension(item.photoUri ?? '')}`;
}

/** Rewrites each item's image URIs to the relative paths they'll have inside the backup zip. */
export function buildBackupPayload(items: WarrantyItem[], exportedAt: string = nowIso()): BackupPayload {
  return {
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt,
    items: items.map((item) => ({
      ...item,
      photoUri: item.photoUri ? `photos/${photoFileName(item)}` : undefined,
      invoiceImages: item.invoiceImages.map((image) => ({
        ...image,
        uri: `invoices/${invoiceFileName(image)}`,
      })),
    })),
  };
}

async function ensureBackupDirExists(): Promise<void> {
  const dirInfo = await getInfoAsync(BACKUP_DIR);
  if (!dirInfo.exists) {
    await makeDirectoryAsync(BACKUP_DIR, { intermediates: true });
  }
}

/**
 * Bundles all warranty items, their invoice images and their photos into a single
 * self-contained zip file.
 *
 * A file that cannot be read — typically deleted outside the app — is reported via
 * `BackupMissingFilesError` before anything is written, so the user can either fix it
 * or re-run with `skipMissingFiles` to export without it. A skipped file leaves its
 * record pointing at an archive entry that isn't there, which restore already tolerates
 * by dropping that image and keeping the item.
 */
export async function createBackupArchive(
  options: CreateBackupOptions = {}
): Promise<BackupArchiveResult> {
  const items = await getAllItems();
  const exportedAt = nowIso();
  const payload = buildBackupPayload(items, exportedAt);

  const zip = new JSZip();
  zip.file(BACKUP_DATA_FILE_NAME, JSON.stringify(payload, null, 2));

  const missingFiles: MissingBackupFile[] = [];

  async function addFile(item: WarrantyItem, kind: MissingBackupFile['kind'], uri: string, path: string) {
    try {
      zip.file(path, await readAsStringAsync(uri, { encoding: 'base64' }), { base64: true });
    } catch (err) {
      if (__DEV__) console.warn(`Could not read ${kind} file ${uri} for backup`, err);
      missingFiles.push({ itemId: item.id, itemName: item.name, kind, uri });
    }
  }

  for (const item of items) {
    for (const image of item.invoiceImages) {
      await addFile(item, 'invoice', image.uri, `invoices/${invoiceFileName(image)}`);
    }
    if (item.photoUri) {
      await addFile(item, 'photo', item.photoUri, `photos/${photoFileName(item)}`);
    }
  }

  if (missingFiles.length > 0 && !options.skipMissingFiles) {
    throw new BackupMissingFilesError(missingFiles);
  }

  const zipBase64 = await zip.generateAsync({ type: 'base64' });

  await ensureBackupDirExists();
  const fileUri = `${BACKUP_DIR}warranty-backup-${exportedAt.replace(/[:.]/g, '-')}.zip`;
  await writeAsStringAsync(fileUri, zipBase64, { encoding: 'base64' });

  return { uri: fileUri, itemCount: items.length, skippedFileCount: missingFiles.length };
}

/**
 * Presents the OS share/save sheet for a previously created backup archive.
 *
 * Android's share intent resolves the same way whether the user picks a target
 * or backs out of the chooser, so this promise settling is not proof the file
 * was actually saved anywhere — callers should treat the backup as complete
 * once `createBackupArchive` succeeds, and use this only as a best-effort
 * follow-up rather than a gate on success.
 */
export async function shareBackupArchive(uri: string): Promise<void> {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/zip', dialogTitle: 'Warranty Store Backup' });
  }
}
