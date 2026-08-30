import * as DocumentPicker from 'expo-document-picker';
import { readAsStringAsync } from 'expo-file-system/legacy';
import JSZip from 'jszip';

import { saveSchedulesForItem } from '../db/notificationSchedulesRepository';
import { getExistingItemIds, insertImportedItems } from '../db/warrantyRepository';
import type { TranslateFn } from '../i18n/i18n';
import type {
  ExtendedWarranty,
  ItemDocument,
  ItemDocumentKind,
  WarrantyDurationUnit,
  WarrantyItem,
} from '../types/warranty';
import { getCoverageEndDate } from '../utils/coverage';
import { getWarrantyStatus } from '../utils/date';
import { BACKUP_DATA_FILE_NAME, BACKUP_FORMAT_VERSION } from './backupService';

import { writeDocumentImageFile, writeItemPhotoFile } from './fileService';
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
  payload: ValidatedBackupPayload;
  zip: JSZip;
}

export interface RestoreResult {
  imported: number;
  skipped: number;
}

/**
 * A backup once it has been parsed and validated: documents are already split into the
 * two kinds, matching the in-app shape rather than the archive's single legacy list.
 */
export interface ValidatedBackupPayload {
  formatVersion: number;
  exportedAt: string;
  items: WarrantyItem[];
}

function invalid(message: string): BackupValidationError {
  return new BackupValidationError('invalid', message);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * A document's kind is optional in the archive and anything unrecognised falls back to
 * 'invoice'. That is what lets an archive written before the invoice/warranty split
 * import cleanly instead of being rejected over a field it could not have carried.
 */
function documentKind(raw: unknown): ItemDocumentKind {
  return raw === 'warranty' ? 'warranty' : 'invoice';
}

function validateDocument(
  raw: unknown,
  itemId: string,
  index: number,
  extendedWarrantyId?: string
): ItemDocument {
  if (typeof raw !== 'object' || raw === null) {
    throw invalid(`Document ${index} of item ${itemId} is not an object`);
  }

  const document = raw as Record<string, unknown>;
  if (!isNonEmptyString(document.id) || !isNonEmptyString(document.uri)) {
    throw invalid(`Document ${index} of item ${itemId} is missing an id or path`);
  }
  if (typeof document.sortOrder !== 'number' || !isNonEmptyString(document.createdAt)) {
    throw invalid(`Document ${document.id} of item ${itemId} has invalid metadata`);
  }

  return {
    id: document.id,
    itemId,
    kind: documentKind(document.kind),
    extendedWarrantyId,
    uri: document.uri,
    sortOrder: document.sortOrder,
    createdAt: document.createdAt,
  };
}

function optionalString(value: unknown, field: string, itemId: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') {
    throw invalid(`Item ${itemId} has a non-text ${field}`);
  }
  return value;
}

/** Anything unrecognised is read as months, the unit a bare number would have meant. */
function durationUnit(raw: unknown): WarrantyDurationUnit {
  return raw === 'years' ? 'years' : 'months';
}

/**
 * An extended warranty's documents are nested inside its own entry, so a build that
 * predates extended cover ignores the whole key rather than misfiling its paperwork into
 * the item's own sections. See BackupExtendedWarranty in backupService.
 */
function validateExtendedWarranty(
  raw: unknown,
  itemId: string,
  index: number
): ExtendedWarranty {
  if (typeof raw !== 'object' || raw === null) {
    throw invalid(`Extended warranty ${index} of item ${itemId} is not an object`);
  }

  const extended = raw as Record<string, unknown>;
  if (!isNonEmptyString(extended.id)) {
    throw invalid(`Extended warranty ${index} of item ${itemId} is missing an id`);
  }
  if (!isNonEmptyString(extended.startsOn) || !isNonEmptyString(extended.endsOn)) {
    throw invalid(`Extended warranty ${extended.id} of item ${itemId} is missing its dates`);
  }
  if (typeof extended.durationValue !== 'number' || Number.isNaN(extended.durationValue)) {
    throw invalid(`Extended warranty ${extended.id} of item ${itemId} has an invalid duration`);
  }
  if (extended.cost !== undefined && extended.cost !== null && typeof extended.cost !== 'number') {
    throw invalid(`Extended warranty ${extended.id} of item ${itemId} has an invalid cost`);
  }
  if (!isNonEmptyString(extended.createdAt) || !isNonEmptyString(extended.updatedAt)) {
    throw invalid(`Extended warranty ${extended.id} of item ${itemId} is missing its timestamps`);
  }

  const rawDocuments = extended.documents ?? [];
  if (!Array.isArray(rawDocuments)) {
    throw invalid(`Extended warranty ${extended.id} of item ${itemId} has an invalid document list`);
  }
  const documents = rawDocuments.map((document, documentIndex) =>
    validateDocument(document, itemId, documentIndex, extended.id as string)
  );

  return {
    id: extended.id,
    itemId,
    provider: optionalString(extended.provider, 'provider', itemId),
    durationValue: extended.durationValue,
    durationUnit: durationUnit(extended.durationUnit),
    startsOn: extended.startsOn,
    endsOn: extended.endsOn,
    cost: (extended.cost as number | undefined) ?? undefined,
    notes: optionalString(extended.notes, 'notes', itemId),
    sortOrder: typeof extended.sortOrder === 'number' ? extended.sortOrder : index,
    invoiceDocuments: documents.filter((document) => document.kind === 'invoice'),
    warrantyDocuments: documents.filter((document) => document.kind === 'warranty'),
    createdAt: extended.createdAt,
    updatedAt: extended.updatedAt,
  };
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

  // Older or hand-edited backups may omit the list entirely; that just means no documents.
  // Both kinds share this one list — see BackupItem in backupService.
  const rawDocuments = item.invoiceImages ?? [];
  if (!Array.isArray(rawDocuments)) {
    throw invalid(`Item ${item.id} has an invalid document list`);
  }

  const documents = rawDocuments.map((document, documentIndex) =>
    validateDocument(document, item.id as string, documentIndex)
  );

  // Absent in an archive written before extended cover existed, which just means none.
  const rawExtended = item.extendedWarranties ?? [];
  if (!Array.isArray(rawExtended)) {
    throw invalid(`Item ${item.id} has an invalid extended warranty list`);
  }
  const extendedWarranties = rawExtended.map((extended, extendedIndex) =>
    validateExtendedWarranty(extended, item.id as string, extendedIndex)
  );

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
    photoUri: optionalString(item.photoUri, 'photo', item.id),
    invoiceDocuments: documents.filter((document) => document.kind === 'invoice'),
    warrantyDocuments: documents.filter((document) => document.kind === 'warranty'),
    extendedWarranties,
    // Derived, never carried in the archive.
    coverageEndDate: getCoverageEndDate(item.expiryDate, extendedWarranties),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

/**
 * Parses and fully validates a backup's `data.json`. Throws `BackupValidationError`
 * for anything unusable, so a corrupt file is rejected before the database is touched.
 */
export function parseBackupPayload(raw: string): ValidatedBackupPayload {
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

function fileExtension(uri: string): string {
  const extMatch = uri.match(/\.[a-zA-Z0-9]+$/);
  return extMatch ? extMatch[0] : '.jpg';
}

function restoredDocumentFileName(document: ItemDocument): string {
  return `invoice-${document.id}${fileExtension(document.uri)}`;
}

/**
 * Unpacks an item's documents into app-private storage, keeping each in the kind it was
 * exported from and renumbering each kind densely from zero. A document whose file is
 * missing or unreadable is dropped rather than failing the whole restore — losing one
 * picture is better than losing the item.
 */
type RestoredDocuments = Pick<WarrantyItem, 'invoiceDocuments' | 'warrantyDocuments'>;

/** Unpacks one section's documents, renumbering it densely from zero as it goes. */
async function restoreSection(
  itemId: string,
  documents: ItemDocument[],
  zip: JSZip
): Promise<RestoredDocuments> {
  const restored: RestoredDocuments = { invoiceDocuments: [], warrantyDocuments: [] };

  for (const document of documents) {
    const entry = zip.file(document.uri);
    if (!entry) {
      if (__DEV__) console.warn(`Backup archive is missing document ${document.uri}`);
      continue;
    }

    try {
      const base64 = await entry.async('base64');
      const uri = await writeDocumentImageFile(restoredDocumentFileName(document), base64);
      const target =
        document.kind === 'warranty' ? restored.warrantyDocuments : restored.invoiceDocuments;
      target.push({ ...document, itemId, uri, sortOrder: target.length });
    } catch (err) {
      console.error(`Failed to restore document ${document.uri}`, err);
    }
  }

  return restored;
}

async function restoreDocuments(item: WarrantyItem, zip: JSZip): Promise<RestoredDocuments> {
  return restoreSection(item.id, [...item.invoiceDocuments, ...item.warrantyDocuments], zip);
}

/**
 * Unpacks each extended warranty's own documents, back into the extended warranty they
 * were exported from rather than into the item's own sections.
 */
async function restoreExtendedWarranties(
  item: WarrantyItem,
  zip: JSZip
): Promise<ExtendedWarranty[]> {
  const restored: ExtendedWarranty[] = [];

  for (const extended of item.extendedWarranties) {
    const documents = await restoreSection(
      item.id,
      [...extended.invoiceDocuments, ...extended.warrantyDocuments],
      zip
    );
    restored.push({ ...extended, itemId: item.id, ...documents });
  }

  return restored;
}

/**
 * Unpacks an item's photo into app-private storage, returning the local URI. Follows the
 * same policy as invoice images: a photo whose file is missing from the archive or cannot
 * be written is dropped so the item itself still imports.
 */
async function restoreItemPhoto(item: WarrantyItem, zip: JSZip): Promise<string | undefined> {
  if (!item.photoUri) return undefined;

  const entry = zip.file(item.photoUri);
  if (!entry) {
    if (__DEV__) console.warn(`Backup archive is missing item photo ${item.photoUri}`);
    return undefined;
  }

  try {
    const base64 = await entry.async('base64');
    return await writeItemPhotoFile(`photo-${item.id}${fileExtension(item.photoUri)}`, base64);
  } catch (err) {
    console.error(`Failed to restore item photo ${item.photoUri}`, err);
    return undefined;
  }
}

/**
 * Schedules the 30/7/0-day reminders for freshly imported items. Skipped entirely when
 * the user has reminders turned off, and per-item failures are logged rather than thrown
 * so a scheduling problem can't undo an otherwise successful restore.
 */
async function scheduleRemindersForImported(items: WarrantyItem[], t: TranslateFn): Promise<void> {
  if (items.length === 0 || !(await getNotificationsEnabled())) return;

  const nonExpired = items.filter((item) => getWarrantyStatus(item.coverageEndDate) !== 'expired');
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
    restored.push({
      ...item,
      photoUri: await restoreItemPhoto(item, backup.zip),
      ...(await restoreDocuments(item, backup.zip)),
      extendedWarranties: await restoreExtendedWarranties(item, backup.zip),
    });
  }

  await insertImportedItems(restored);
  await scheduleRemindersForImported(restored, t);

  return { imported: restored.length, skipped: backup.payload.items.length - restored.length };
}
