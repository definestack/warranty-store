import * as DocumentPicker from 'expo-document-picker';
import { readAsStringAsync } from 'expo-file-system/legacy';
import JSZip from 'jszip';

import { saveSchedulesForItem } from '../db/notificationSchedulesRepository';
import { getExistingItemIds, insertImportedItems } from '../db/warrantyRepository';
import type { TranslateFn } from '../i18n/i18n';
import type { InvoiceImage, WarrantyItem } from '../types/warranty';
import { getWarrantyStatus } from '../utils/date';
import { BACKUP_DATA_FILE_NAME, BACKUP_FORMAT_VERSION } from './backupService';
import type { BackupPayload } from './backupService';
import { writeInvoiceImageFile } from './fileService';
import { getNotificationsEnabled } from './notificationPreferenceService';
import { scheduleExpiryReminders } from './notificationService';

export type BackupValidationReason = 'invalid' | 'unsupportedVersion';

/** Raised when a picked file isn't a usable backup — always before anything is written. */
export class BackupValidationError extends Error {
  readonly reason: BackupValidationReason;

  constructor(reason: BackupValidationReason, message: string) {
    super(message);
    this.name = 'BackupValidationError';
    this.reason = reason;
    // Restores the prototype chain so `instanceof` still works after transpilation.
    Object.setPrototypeOf(this, BackupValidationError.prototype);
  }
}

/** A validated backup archive, held in memory so the user can confirm before anything is written. */
export interface LoadedBackup {
  uri: string;
  payload: BackupPayload;
  zip: JSZip;
}

export interface RestoreResult {
  imported: number;
  skipped: number;
}

function invalid(message: string): BackupValidationError {
  return new BackupValidationError('invalid', message);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function validateInvoiceImage(raw: unknown, itemId: string, index: number): InvoiceImage {
  if (typeof raw !== 'object' || raw === null) {
    throw invalid(`Invoice image ${index} of item ${itemId} is not an object`);
  }

  const image = raw as Record<string, unknown>;
  if (!isNonEmptyString(image.id) || !isNonEmptyString(image.uri)) {
    throw invalid(`Invoice image ${index} of item ${itemId} is missing an id or path`);
  }
  if (typeof image.sortOrder !== 'number' || !isNonEmptyString(image.createdAt)) {
    throw invalid(`Invoice image ${image.id} of item ${itemId} has invalid metadata`);
  }

  return {
    id: image.id,
    itemId,
    uri: image.uri,
    sortOrder: image.sortOrder,
    createdAt: image.createdAt,
  };
}

function optionalString(value: unknown, field: string, itemId: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') {
    throw invalid(`Item ${itemId} has a non-text ${field}`);
  }
  return value;
}

function validateItem(raw: unknown, index: number): WarrantyItem {
  if (typeof raw !== 'object' || raw === null) {
    throw invalid(`Item ${index} is not an object`);
  }

  const item = raw as Record<string, unknown>;
  if (!isNonEmptyString(item.id) || !isNonEmptyString(item.name)) {
    throw invalid(`Item ${index} is missing an id or name`);
  }
  if (!isNonEmptyString(item.purchaseDate) || !isNonEmptyString(item.expiryDate)) {
    throw invalid(`Item ${item.id} is missing a purchase or expiry date`);
  }
  if (typeof item.warrantyMonths !== 'number' || Number.isNaN(item.warrantyMonths)) {
    throw invalid(`Item ${item.id} has an invalid warranty period`);
  }
  if (!isNonEmptyString(item.createdAt) || !isNonEmptyString(item.updatedAt)) {
    throw invalid(`Item ${item.id} is missing its timestamps`);
  }
  if (item.price !== undefined && item.price !== null && typeof item.price !== 'number') {
    throw invalid(`Item ${item.id} has an invalid price`);
  }

  // Older or hand-edited backups may omit the list entirely; that just means no invoices.
  const rawImages = item.invoiceImages ?? [];
  if (!Array.isArray(rawImages)) {
    throw invalid(`Item ${item.id} has an invalid invoice image list`);
  }

  return {
    id: item.id,
    name: item.name,
    purchaseDate: item.purchaseDate,
    warrantyMonths: item.warrantyMonths,
    expiryDate: item.expiryDate,
    category: optionalString(item.category, 'category', item.id),
    brand: optionalString(item.brand, 'brand', item.id),
    price: (item.price as number | undefined) ?? undefined,
    store: optionalString(item.store, 'store', item.id),
    notes: optionalString(item.notes, 'notes', item.id),
    invoiceImages: rawImages.map((image, imageIndex) =>
      validateInvoiceImage(image, item.id as string, imageIndex)
    ),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

/**
 * Parses and fully validates a backup's `data.json`. Throws `BackupValidationError`
 * for anything unusable, so a corrupt file is rejected before the database is touched.
 */
export function parseBackupPayload(raw: string): BackupPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw invalid('Backup data is not valid JSON');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw invalid('Backup data is not an object');
  }

  const payload = parsed as Record<string, unknown>;
  if (typeof payload.formatVersion !== 'number') {
    throw invalid('Backup data has no format version');
  }
  if (payload.formatVersion > BACKUP_FORMAT_VERSION) {
    throw new BackupValidationError(
      'unsupportedVersion',
      `Backup format version ${payload.formatVersion} is newer than this app supports`
    );
  }
  if (!Array.isArray(payload.items)) {
    throw invalid('Backup data has no items list');
  }

  return {
    formatVersion: payload.formatVersion,
    exportedAt: isNonEmptyString(payload.exportedAt) ? payload.exportedAt : '',
    items: payload.items.map(validateItem),
  };
}

/** Opens the system file picker; resolves to the picked URI, or null if the user cancelled. */
export async function pickBackupFile(): Promise<string | null> {
  // Android reports zip files under several MIME types (and none at all for some
  // providers), so filtering would grey out valid backups — validation is what
  // actually rejects the wrong file.
  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets?.length) return null;
  return result.assets[0].uri;
}

/** Reads and validates a backup archive without writing anything, so the user can confirm first. */
export async function loadBackupArchive(uri: string): Promise<LoadedBackup> {
  let zip: JSZip;
  try {
    const base64 = await readAsStringAsync(uri, { encoding: 'base64' });
    zip = await JSZip.loadAsync(base64, { base64: true });
  } catch {
    throw invalid('Selected file could not be read as a backup archive');
  }

  const dataEntry = zip.file(BACKUP_DATA_FILE_NAME);
  if (!dataEntry) {
    throw invalid(`Backup archive has no ${BACKUP_DATA_FILE_NAME}`);
  }

  return { uri, payload: parseBackupPayload(await dataEntry.async('string')), zip };
}

function restoredImageFileName(image: InvoiceImage): string {
  const extMatch = image.uri.match(/\.[a-zA-Z0-9]+$/);
  return `invoice-${image.id}${extMatch ? extMatch[0] : '.jpg'}`;
}

/**
 * Unpacks an item's invoice images into app-private storage. An image whose file is
 * missing or unreadable is dropped rather than failing the whole restore — losing one
 * picture is better than losing the item.
 */
async function restoreInvoiceImages(item: WarrantyItem, zip: JSZip): Promise<InvoiceImage[]> {
  const restored: InvoiceImage[] = [];

  for (const image of item.invoiceImages) {
    const entry = zip.file(image.uri);
    if (!entry) {
      if (__DEV__) console.warn(`Backup archive is missing invoice image ${image.uri}`);
      continue;
    }

    try {
      const base64 = await entry.async('base64');
      const uri = await writeInvoiceImageFile(restoredImageFileName(image), base64);
      restored.push({ ...image, itemId: item.id, uri, sortOrder: restored.length });
    } catch (err) {
      console.error(`Failed to restore invoice image ${image.uri}`, err);
    }
  }

  return restored;
}

/**
 * Schedules the 30/7/0-day reminders for freshly imported items. Skipped entirely when
 * the user has reminders turned off, and per-item failures are logged rather than thrown
 * so a scheduling problem can't undo an otherwise successful restore.
 */
async function scheduleRemindersForImported(items: WarrantyItem[], t: TranslateFn): Promise<void> {
  if (items.length === 0 || !(await getNotificationsEnabled())) return;

  const nonExpired = items.filter((item) => getWarrantyStatus(item.expiryDate) !== 'expired');
  for (const item of nonExpired) {
    try {
      const scheduled = await scheduleExpiryReminders(item, t);
      if (scheduled.length > 0) {
        await saveSchedulesForItem(item.id, scheduled);
      }
    } catch (err) {
      console.error(`Failed to schedule expiry reminders for imported item ${item.id}`, err);
    }
  }
}

function dedupeById(items: WarrantyItem[]): WarrantyItem[] {
  const seen = new Set<string>();
  return items.filter((item) => (seen.has(item.id) ? false : seen.add(item.id) !== undefined));
}

/**
 * Merges a validated backup into the existing library: items whose id is already
 * present are left exactly as they are, so nothing the user already has can be lost
 * or overwritten. Returns how many items were imported versus skipped as duplicates.
 */
export async function applyBackup(backup: LoadedBackup, t: TranslateFn): Promise<RestoreResult> {
  const uniqueItems = dedupeById(backup.payload.items);
  const existingIds = await getExistingItemIds(uniqueItems.map((item) => item.id));
  const newItems = uniqueItems.filter((item) => !existingIds.has(item.id));

  const restored: WarrantyItem[] = [];
  for (const item of newItems) {
    restored.push({ ...item, invoiceImages: await restoreInvoiceImages(item, backup.zip) });
  }

  await insertImportedItems(restored);
  await scheduleRemindersForImported(restored, t);

  return { imported: restored.length, skipped: backup.payload.items.length - restored.length };
}
