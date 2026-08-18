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
}

function invoiceFileName(image: InvoiceImage): string {
  const extMatch = image.uri.match(/\.[a-zA-Z0-9]+$/);
  const extension = extMatch ? extMatch[0] : '.jpg';
  return `${image.id}${extension}`;
}

/** Rewrites each item's invoice image URIs to the relative paths they'll have inside the backup zip. */
export function buildBackupPayload(items: WarrantyItem[], exportedAt: string = nowIso()): BackupPayload {
  return {
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt,
    items: items.map((item) => ({
      ...item,
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

/** Bundles all warranty items and their invoice images into a single self-contained zip file. */
export async function createBackupArchive(): Promise<BackupArchiveResult> {
  const items = await getAllItems();
  const exportedAt = nowIso();
  const payload = buildBackupPayload(items, exportedAt);

  const zip = new JSZip();
  zip.file(BACKUP_DATA_FILE_NAME, JSON.stringify(payload, null, 2));

  for (const item of items) {
    for (const image of item.invoiceImages) {
      const base64 = await readAsStringAsync(image.uri, { encoding: 'base64' });
      zip.file(`invoices/${invoiceFileName(image)}`, base64, { base64: true });
    }
  }

  const zipBase64 = await zip.generateAsync({ type: 'base64' });

  await ensureBackupDirExists();
  const fileUri = `${BACKUP_DIR}warranty-backup-${exportedAt.replace(/[:.]/g, '-')}.zip`;
  await writeAsStringAsync(fileUri, zipBase64, { encoding: 'base64' });

  return { uri: fileUri, itemCount: items.length };
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
