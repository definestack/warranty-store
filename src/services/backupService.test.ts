import AsyncStorage from '@react-native-async-storage/async-storage';
import { __resetMockFileSystem, __setFileContent, readAsStringAsync } from 'expo-file-system/legacy';
import { __getLastSharedUri, __resetMockSharing, __setAvailable } from 'expo-sharing';
import JSZip from 'jszip';

import { getDatabase, initDatabase } from '../db/database';
import { saveDocumentsForItem } from '../db/invoiceImagesRepository';
import { createItem } from '../db/warrantyRepository';
import type { NewWarrantyItem, WarrantyItem } from '../types/warranty';
import {
  BackupMissingFilesError,
  buildBackupPayload,
  createBackupArchive,
  shareBackupArchive,
} from './backupService';

const baseItem: NewWarrantyItem = {
  name: 'Washing Machine',
  purchaseDate: '2026-01-15',
  warrantyMonths: 12,
};

const IMAGE_URI = 'file:///mock-documents/invoices/invoice-1.jpg';
const IMAGE_BASE64 = Buffer.from('fake-image-bytes').toString('base64');
const PHOTO_URI = 'file:///mock-documents/photos/photo-1.jpg';
const PHOTO_BASE64 = Buffer.from('fake-photo-bytes').toString('base64');

beforeAll(async () => {
  await initDatabase();
});

beforeEach(async () => {
  await getDatabase().runAsync('DELETE FROM invoice_images');
  await getDatabase().runAsync('DELETE FROM warranty_items');
  __resetMockFileSystem();
  __resetMockSharing();
  await AsyncStorage.clear();
});

describe('buildBackupPayload', () => {
  const item: WarrantyItem = {
    id: 'item-1',
    name: 'Washing Machine',
    purchaseDate: '2026-01-15',
    warrantyMonths: 12,
    expiryDate: '2027-01-15',
    invoiceDocuments: [
      {
        id: 'img-1',
        itemId: 'item-1',
        kind: 'invoice',
        uri: IMAGE_URI,
        sortOrder: 0,
        createdAt: '2026-01-15T00:00:00.000Z',
      },
    ],
    warrantyDocuments: [],
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: '2026-01-15T00:00:00.000Z',
  };

  it('rewrites invoice image URIs to their bundled relative paths', () => {
    const payload = buildBackupPayload([item], '2026-08-18T10:00:00.000Z');

    expect(payload.formatVersion).toBe(1);
    expect(payload.exportedAt).toBe('2026-08-18T10:00:00.000Z');
    expect(payload.items[0].invoiceImages[0].uri).toBe('invoices/img-1.jpg');
    expect(payload.items[0].name).toBe('Washing Machine');
  });

  it('leaves items with no documents untouched', () => {
    const payload = buildBackupPayload([{ ...item, invoiceDocuments: [] }], '2026-08-18T10:00:00.000Z');

    expect(payload.items[0].invoiceImages).toEqual([]);
  });

  it('records each document kind and keeps both kinds in one archive folder', () => {
    const withWarranty: WarrantyItem = {
      ...item,
      warrantyDocuments: [
        {
          id: 'img-2',
          itemId: 'item-1',
          kind: 'warranty',
          uri: 'file:///mock-documents/invoices/invoice-warranty.jpg',
          sortOrder: 0,
          createdAt: '2026-01-15T00:00:00.000Z',
        },
      ],
    };

    const payload = buildBackupPayload([withWarranty], '2026-08-18T10:00:00.000Z');

    const documents = payload.items[0].invoiceImages;
    expect(documents.map((document) => document.kind)).toEqual(['invoice', 'warranty']);
    const paths = documents.map((document) => document.uri);
    expect(paths).toEqual(['invoices/img-1.jpg', 'invoices/img-2.jpg']);
    // Ids are UUIDs in production, so both kinds share the folder without colliding.
    expect(new Set(paths).size).toBe(2);
  });

  it('emits both kinds under the single legacy list so older builds still read them', () => {
    const withWarranty: WarrantyItem = {
      ...item,
      warrantyDocuments: [
        {
          id: 'img-2',
          itemId: 'item-1',
          kind: 'warranty',
          uri: 'file:///mock-documents/invoices/invoice-warranty.jpg',
          sortOrder: 0,
          createdAt: '2026-01-15T00:00:00.000Z',
        },
      ],
    };

    const payload = buildBackupPayload([withWarranty], '2026-08-18T10:00:00.000Z');

    expect(payload.formatVersion).toBe(1);
    expect(payload.items[0].invoiceImages).toHaveLength(2);
    expect(payload.items[0]).not.toHaveProperty('warrantyDocuments');
    expect(payload.items[0]).not.toHaveProperty('invoiceDocuments');
  });

  it("rewrites an item photo's uri to its bundled relative path", () => {
    const payload = buildBackupPayload([{ ...item, photoUri: PHOTO_URI }], '2026-08-18T10:00:00.000Z');

    expect(payload.items[0].photoUri).toBe('photos/item-1.jpg');
  });

  it('leaves an item with no photo untouched', () => {
    const payload = buildBackupPayload([item], '2026-08-18T10:00:00.000Z');

    expect(payload.items[0].photoUri).toBeUndefined();
  });
});

describe('createBackupArchive', () => {
  it('bundles all items as JSON plus their invoice images into a single zip file', async () => {
    const item = await createItem(baseItem);
    __setFileContent(IMAGE_URI, IMAGE_BASE64);
    await saveDocumentsForItem(item.id, 'invoice', [{ id: 'draft-1', uri: IMAGE_URI, isPersisted: false }]);

    const result = await createBackupArchive();

    expect(result.itemCount).toBe(1);
    expect(result.uri).toMatch(/^file:\/\/\/mock-cache\/backups\/warranty-backup-.*\.zip$/);

    const zipBase64 = await readAsStringAsync(result.uri, { encoding: 'base64' });
    const zip = await JSZip.loadAsync(zipBase64, { base64: true });

    const dataEntry = zip.file('data.json');
    expect(dataEntry).not.toBeNull();
    const payload = JSON.parse(await dataEntry!.async('string'));
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0].name).toBe('Washing Machine');
    const bundledImagePath = payload.items[0].invoiceImages[0].uri;
    expect(bundledImagePath).toMatch(/^invoices\/.+\.jpg$/);

    const imageEntry = zip.file(bundledImagePath);
    expect(imageEntry).not.toBeNull();
    expect(await imageEntry!.async('base64')).toBe(IMAGE_BASE64);
  });

  it('bundles an item photo into the archive under its relative path', async () => {
    const item = await createItem({ ...baseItem, photoUri: PHOTO_URI });
    __setFileContent(PHOTO_URI, PHOTO_BASE64);

    const result = await createBackupArchive();

    const zipBase64 = await readAsStringAsync(result.uri, { encoding: 'base64' });
    const zip = await JSZip.loadAsync(zipBase64, { base64: true });
    const payload = JSON.parse(await zip.file('data.json')!.async('string'));

    expect(payload.formatVersion).toBe(1);
    expect(payload.items[0].photoUri).toBe(`photos/${item.id}.jpg`);
    const photoEntry = zip.file(`photos/${item.id}.jpg`);
    expect(photoEntry).not.toBeNull();
    expect(await photoEntry!.async('base64')).toBe(PHOTO_BASE64);
  });

  it('reports unreadable photo and document files instead of writing an archive', async () => {
    const item = await createItem({ ...baseItem, photoUri: PHOTO_URI });
    await saveDocumentsForItem(item.id, 'invoice', [{ id: 'draft-1', uri: IMAGE_URI, isPersisted: false }]);

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    expect.assertions(4);
    try {
      await createBackupArchive();
    } catch (err) {
      expect(err).toBeInstanceOf(BackupMissingFilesError);
      const missing = (err as BackupMissingFilesError).missingFiles;
      expect(missing).toHaveLength(2);
      expect(missing.map((file) => file.kind).sort()).toEqual(['document', 'photo']);
      expect(missing.every((file) => file.itemName === 'Washing Machine')).toBe(true);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('exports without the unreadable files once the user opts to continue', async () => {
    const item = await createItem({ ...baseItem, photoUri: PHOTO_URI });
    __setFileContent(IMAGE_URI, IMAGE_BASE64);
    await saveDocumentsForItem(item.id, 'invoice', [{ id: 'draft-1', uri: IMAGE_URI, isPersisted: false }]);
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await createBackupArchive({ skipMissingFiles: true });

    expect(result.itemCount).toBe(1);
    expect(result.skippedFileCount).toBe(1);
    const zipBase64 = await readAsStringAsync(result.uri, { encoding: 'base64' });
    const zip = await JSZip.loadAsync(zipBase64, { base64: true });
    const payload = JSON.parse(await zip.file('data.json')!.async('string'));

    // The record still points at the photo; restore drops a photo whose file is absent.
    expect(payload.items[0].photoUri).toBe(`photos/${item.id}.jpg`);
    expect(zip.file(`photos/${item.id}.jpg`)).toBeNull();
    expect(zip.file(payload.items[0].invoiceImages[0].uri)).not.toBeNull();

    warnSpy.mockRestore();
  });

  it('produces a valid empty backup when there are no items', async () => {
    const result = await createBackupArchive();

    expect(result.itemCount).toBe(0);
    expect(result.skippedFileCount).toBe(0);
    const zipBase64 = await readAsStringAsync(result.uri, { encoding: 'base64' });
    const zip = await JSZip.loadAsync(zipBase64, { base64: true });
    const payload = JSON.parse(await zip.file('data.json')!.async('string'));
    expect(payload.items).toEqual([]);
  });
});

describe('shareBackupArchive', () => {
  it('opens the share sheet for the given archive uri', async () => {
    await shareBackupArchive('file:///mock-cache/backups/warranty-backup-test.zip');

    expect(__getLastSharedUri()).toBe('file:///mock-cache/backups/warranty-backup-test.zip');
  });

  it('does not attempt to share when sharing is unavailable on the device', async () => {
    __setAvailable(false);

    await shareBackupArchive('file:///mock-cache/backups/warranty-backup-test.zip');

    expect(__getLastSharedUri()).toBeNull();
  });
});
