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
import type { ExtendedWarranty, ItemDocument, WarrantyItem } from '../types/warranty';
import { nowIso } from '../utils/date';

const BACKUP_DIR = `${cacheDirectory}backups/`;
export const BACKUP_DATA_FILE_NAME = 'data.json';
export const BACKUP_FORMAT_VERSION = 1;

/**
 * An item as it appears in `data.json`. Both document kinds share the single
 * `invoiceImages` list, which predates the split and is retained on purpose: each entry
 * carries its own `kind`, so a build that pre-dates the split still reads every document
 * and files them all as invoices. Emitting warranty documents under a separate key would
 * make those older builds drop them entirely — a degraded import beats a lossy one.
 */
export interface BackupItem
  extends Omit<
    WarrantyItem,
    'invoiceDocuments' | 'warrantyDocuments' | 'extendedWarranties' | 'coverageEndDate'
  > {
  invoiceImages: ItemDocument[];
  extendedWarranties: BackupExtendedWarranty[];
}

/**
 * An extended warranty in `data.json`, with its own documents nested inside it rather
 * than in the item's flat `invoiceImages` list.
 *
 * The nesting is load-bearing. The format version stays 1 so an older build still accepts
 * the archive, and such a build ignores the key it does not know — importing the item with
 * its own documents intact and its extended cover simply absent. Were these documents in
 * the flat list, that same build would ignore the scope it does not understand and file an
 * extended warranty's paperwork into the item's own sections. A clean partial import beats
 * a silently mixed-up one.
 */
export interface BackupExtendedWarranty
  extends Omit<ExtendedWarranty, 'invoiceDocuments' | 'warrantyDocuments'> {
  documents: ItemDocument[];
}

export interface BackupPayload {
  formatVersion: number;
  exportedAt: string;
  items: BackupItem[];
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
  kind: 'document' | 'photo';
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

/** Document ids are UUIDs, so both kinds coexist in one archive folder without collision. */
function documentFileName(document: ItemDocument): string {
  return `${document.id}${fileExtension(document.uri)}`;
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
    items: items.map((item) => {
      const {
        invoiceDocuments,
        warrantyDocuments,
        extendedWarranties,
        // Derived on read, so it is not exported — it would only be able to disagree with
        // the periods it is derived from.
        coverageEndDate: _coverageEndDate,
        ...rest
      } = item;
      return {
        ...rest,
        photoUri: item.photoUri ? `photos/${photoFileName(item)}` : undefined,
        invoiceImages: [...invoiceDocuments, ...warrantyDocuments].map((document) => ({
          ...document,
          uri: `invoices/${documentFileName(document)}`,
        })),
        extendedWarranties: extendedWarranties.map((extended) => {
          const { invoiceDocuments: extendedInvoices, warrantyDocuments: extendedWarrantyDocs, ...extendedRest } =
            extended;
          return {
            ...extendedRest,
            documents: [...extendedInvoices, ...extendedWarrantyDocs].map((document) => ({
              ...document,
              uri: `invoices/${documentFileName(document)}`,
            })),
          };
        }),
      };
    }),
  };
}

async function ensureBackupDirExists(): Promise<void> {
  const dirInfo = await getInfoAsync(BACKUP_DIR);
  if (!dirInfo.exists) {
    await makeDirectoryAsync(BACKUP_DIR, { intermediates: true });
  }
}

/**
 * Bundles all warranty items, their attached documents and their photos into a single
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
    const documents = [
      ...item.invoiceDocuments,
      ...item.warrantyDocuments,
      ...item.extendedWarranties.flatMap((extended) => [
        ...extended.invoiceDocuments,
        ...extended.warrantyDocuments,
      ]),
    ];
    for (const document of documents) {
      await addFile(item, 'document', document.uri, `invoices/${documentFileName(document)}`);
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
