import AsyncStorage from '@react-native-async-storage/async-storage';
import { __resetMockDocumentPicker, __setNextDocumentResult } from 'expo-document-picker';
import { __resetMockFileSystem, __setFileContent, readAsStringAsync } from 'expo-file-system/legacy';
import * as Notifications from 'expo-notifications';
import JSZip from 'jszip';

import { getDatabase, initDatabase } from '../db/database';
import { getAllSchedules } from '../db/notificationSchedulesRepository';
import { createItem, getAllItems } from '../db/warrantyRepository';
import type { TranslateFn } from '../i18n/i18n';
import { setNotificationsEnabled } from './notificationPreferenceService';
import {
  BackupValidationError,
  applyBackup,
  loadBackupArchive,
  parseBackupPayload,
  pickBackupFile,
} from './restoreService';

const t: TranslateFn = (scope, options) => (options ? `${scope}:${JSON.stringify(options)}` : scope);

const BACKUP_URI = 'file:///mock-cache/picked/warranty-backup.zip';
const IMAGE_BASE64 = Buffer.from('fake-image-bytes').toString('base64');

function makeBackupItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'item-1',
    name: 'Washing Machine',
    purchaseDate: '2026-01-15',
    warrantyMonths: 12,
    expiryDate: '2027-01-15',
    category: 'appliances',
    brand: 'Bosch',
    price: 499.5,
    store: 'Croma',
    notes: 'Extended warranty',
    invoiceImages: [],
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: '2026-01-15T00:00:00.000Z',
    ...overrides,
  };
}

function makePayload(items: unknown[], formatVersion = 1) {
  return { formatVersion, exportedAt: '2026-08-18T10:00:00.000Z', items };
}

/** Writes a zip containing `data.json` (plus any invoice entries) into the mock file system. */
async function writeBackupZip(
  payload: unknown,
  invoices: Record<string, string> = {},
  uri = BACKUP_URI
): Promise<string> {
  const zip = new JSZip();
  if (payload !== undefined) {
    zip.file('data.json', typeof payload === 'string' ? payload : JSON.stringify(payload));
  }
  for (const [path, base64] of Object.entries(invoices)) {
    zip.file(path, base64, { base64: true });
  }
  __setFileContent(uri, await zip.generateAsync({ type: 'base64' }));
  return uri;
}

beforeAll(async () => {
  await initDatabase();
});

beforeEach(async () => {
  await getDatabase().runAsync('DELETE FROM notification_schedules');
  await getDatabase().runAsync('DELETE FROM invoice_images');
  await getDatabase().runAsync('DELETE FROM warranty_items');
  __resetMockFileSystem();
  __resetMockDocumentPicker();
  await AsyncStorage.clear();
  jest.clearAllMocks();
  // clearAllMocks keeps implementations, so restore the default happy-path scheduler
  // for tests that follow one which makes it reject.
  (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue('mock-notification-id');
});

describe('parseBackupPayload', () => {
  it('accepts a well-formed payload', () => {
    const payload = parseBackupPayload(JSON.stringify(makePayload([makeBackupItem()])));

    expect(payload.formatVersion).toBe(1);
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0].name).toBe('Washing Machine');
  });

  it('rejects content that is not valid JSON', () => {
    expect(() => parseBackupPayload('not json at all')).toThrow(BackupValidationError);
  });

  it('rejects a payload with no items array', () => {
    expect(() => parseBackupPayload(JSON.stringify({ formatVersion: 1, exportedAt: 'x' }))).toThrow(
      BackupValidationError
    );
  });

  it('rejects an item missing required fields', () => {
    const broken = makeBackupItem({ name: undefined });
    expect(() => parseBackupPayload(JSON.stringify(makePayload([broken])))).toThrow(BackupValidationError);
  });

  it('rejects an item whose warrantyMonths is not a number', () => {
    const broken = makeBackupItem({ warrantyMonths: 'twelve' });
    expect(() => parseBackupPayload(JSON.stringify(makePayload([broken])))).toThrow(BackupValidationError);
  });

  it('rejects a malformed invoice image entry', () => {
    const broken = makeBackupItem({ invoiceImages: [{ id: 'img-1' }] });
    expect(() => parseBackupPayload(JSON.stringify(makePayload([broken])))).toThrow(BackupValidationError);
  });

  it('reports an unsupported format version distinctly from corrupt data', () => {
    expect.assertions(2);
    try {
      parseBackupPayload(JSON.stringify(makePayload([makeBackupItem()], 99)));
    } catch (err) {
      expect(err).toBeInstanceOf(BackupValidationError);
      expect((err as BackupValidationError).reason).toBe('unsupportedVersion');
    }
  });

  it('defaults a missing invoiceImages list to empty rather than failing', () => {
    const payload = parseBackupPayload(
      JSON.stringify(makePayload([makeBackupItem({ invoiceImages: undefined })]))
    );

    expect(payload.items[0].invoiceImages).toEqual([]);
  });
});

describe('loadBackupArchive', () => {
  it('reads and validates the archive without touching the database', async () => {
    await createItem({ name: 'Existing', purchaseDate: '2026-01-01', warrantyMonths: 24 });
    await writeBackupZip(makePayload([makeBackupItem()]));

    const loaded = await loadBackupArchive(BACKUP_URI);

    expect(loaded.payload.items).toHaveLength(1);
    expect(await getAllItems()).toHaveLength(1);
  });

  it('rejects an archive with no data.json', async () => {
    await writeBackupZip(undefined, { 'invoices/img-1.jpg': IMAGE_BASE64 });

    await expect(loadBackupArchive(BACKUP_URI)).rejects.toThrow(BackupValidationError);
  });

  it('rejects a file that is not a zip archive at all', async () => {
    __setFileContent(BACKUP_URI, Buffer.from('this is a text file').toString('base64'));

    await expect(loadBackupArchive(BACKUP_URI)).rejects.toThrow(BackupValidationError);
  });

  it('rejects an archive whose data.json is corrupt', async () => {
    await writeBackupZip('{ broken json');

    await expect(loadBackupArchive(BACKUP_URI)).rejects.toThrow(BackupValidationError);
  });
});

describe('applyBackup', () => {
  it('restores items into SQLite, preserving ids and timestamps', async () => {
    await writeBackupZip(makePayload([makeBackupItem()]));
    const loaded = await loadBackupArchive(BACKUP_URI);

    const result = await applyBackup(loaded, t);

    expect(result).toEqual({ imported: 1, skipped: 0 });
    const items = await getAllItems();
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: 'item-1',
      name: 'Washing Machine',
      expiryDate: '2027-01-15',
      brand: 'Bosch',
      price: 499.5,
      store: 'Croma',
      notes: 'Extended warranty',
      createdAt: '2026-01-15T00:00:00.000Z',
    });
  });

  it('keeps existing items and skips backup items that are already present', async () => {
    const existing = await createItem({ name: 'Existing', purchaseDate: '2026-01-01', warrantyMonths: 24 });
    await writeBackupZip(
      makePayload([
        makeBackupItem({ id: existing.id, name: 'Backup version of existing' }),
        makeBackupItem({ id: 'item-2', name: 'Brand New' }),
      ])
    );
    const loaded = await loadBackupArchive(BACKUP_URI);

    const result = await applyBackup(loaded, t);

    expect(result).toEqual({ imported: 1, skipped: 1 });
    const items = await getAllItems();
    expect(items).toHaveLength(2);
    expect(items.find((item) => item.id === existing.id)?.name).toBe('Existing');
    expect(items.find((item) => item.id === 'item-2')?.name).toBe('Brand New');
  });

  it('restores invoice images into app-private storage and points the records at them', async () => {
    const image = {
      id: 'img-1',
      itemId: 'item-1',
      uri: 'invoices/img-1.jpg',
      sortOrder: 0,
      createdAt: '2026-01-15T00:00:00.000Z',
    };
    await writeBackupZip(makePayload([makeBackupItem({ invoiceImages: [image] })]), {
      'invoices/img-1.jpg': IMAGE_BASE64,
    });
    const loaded = await loadBackupArchive(BACKUP_URI);

    await applyBackup(loaded, t);

    const [item] = await getAllItems();
    expect(item.invoiceImages).toHaveLength(1);
    expect(item.invoiceImages[0].uri).toBe('file:///mock-documents/invoices/invoice-img-1.jpg');
    expect(await readAsStringAsync(item.invoiceImages[0].uri, { encoding: 'base64' })).toBe(IMAGE_BASE64);
  });

  it('still imports an item whose invoice file is missing from the archive', async () => {
    const image = {
      id: 'img-1',
      itemId: 'item-1',
      uri: 'invoices/img-1.jpg',
      sortOrder: 0,
      createdAt: '2026-01-15T00:00:00.000Z',
    };
    await writeBackupZip(makePayload([makeBackupItem({ invoiceImages: [image] })]));
    const loaded = await loadBackupArchive(BACKUP_URI);
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await applyBackup(loaded, t);

    expect(result.imported).toBe(1);
    const [item] = await getAllItems();
    expect(item.invoiceImages).toEqual([]);
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('reschedules reminders for imported non-expired items', async () => {
    await writeBackupZip(
      makePayload([
        makeBackupItem({ id: 'future', expiryDate: '2099-01-15' }),
        makeBackupItem({ id: 'past', expiryDate: '2020-01-15' }),
      ])
    );
    const loaded = await loadBackupArchive(BACKUP_URI);

    await applyBackup(loaded, t);

    const schedules = await getAllSchedules();
    expect(schedules.length).toBeGreaterThan(0);
    expect(schedules.every((schedule) => schedule.itemId === 'future')).toBe(true);
  });

  it('does not schedule reminders when notifications are disabled', async () => {
    await setNotificationsEnabled(false);
    await writeBackupZip(makePayload([makeBackupItem({ id: 'future', expiryDate: '2099-01-15' })]));
    const loaded = await loadBackupArchive(BACKUP_URI);

    await applyBackup(loaded, t);

    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(await getAllSchedules()).toEqual([]);
  });

  it('imports the remaining items even if scheduling a reminder fails', async () => {
    (Notifications.scheduleNotificationAsync as jest.Mock).mockRejectedValue(new Error('boom'));
    await writeBackupZip(makePayload([makeBackupItem({ id: 'future', expiryDate: '2099-01-15' })]));
    const loaded = await loadBackupArchive(BACKUP_URI);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const result = await applyBackup(loaded, t);

    expect(result.imported).toBe(1);
    expect(await getAllItems()).toHaveLength(1);

    errorSpy.mockRestore();
  });

  it('imports nothing when every backup item already exists', async () => {
    const existing = await createItem({ name: 'Existing', purchaseDate: '2026-01-01', warrantyMonths: 24 });
    await writeBackupZip(makePayload([makeBackupItem({ id: existing.id })]));
    const loaded = await loadBackupArchive(BACKUP_URI);

    expect(await applyBackup(loaded, t)).toEqual({ imported: 0, skipped: 1 });
    expect(await getAllItems()).toHaveLength(1);
  });
});

describe('pickBackupFile', () => {
  it('returns the picked file uri', async () => {
    __setNextDocumentResult({
      canceled: false,
      assets: [
        { uri: BACKUP_URI, name: 'warranty-backup.zip', mimeType: 'application/zip', lastModified: 0 },
      ],
    });

    expect(await pickBackupFile()).toBe(BACKUP_URI);
  });

  it('returns null when the user cancels the picker', async () => {
    __setNextDocumentResult({ canceled: true, assets: null });

    expect(await pickBackupFile()).toBeNull();
  });
});
