import AsyncStorage from '@react-native-async-storage/async-storage';
import { __resetMockFileSystem, __setFileContent, readAsStringAsync } from 'expo-file-system/legacy';
import { __getLastSharedUri, __resetMockSharing, __setAvailable } from 'expo-sharing';
import JSZip from 'jszip';

import { getDatabase, initDatabase } from '../db/database';
import { saveInvoiceImagesForItem } from '../db/invoiceImagesRepository';
import { createItem } from '../db/warrantyRepository';
import type { NewWarrantyItem, WarrantyItem } from '../types/warranty';
import { getLastBackupTime } from './backupPreferenceService';
import { buildBackupPayload, createBackupArchive, exportBackup } from './backupService';

const baseItem: NewWarrantyItem = {
  name: 'Washing Machine',
  purchaseDate: '2026-01-15',
  warrantyMonths: 12,
};

const IMAGE_URI = 'file:///mock-documents/invoices/invoice-1.jpg';
const IMAGE_BASE64 = Buffer.from('fake-image-bytes').toString('base64');

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
    invoiceImages: [
      { id: 'img-1', itemId: 'item-1', uri: IMAGE_URI, sortOrder: 0, createdAt: '2026-01-15T00:00:00.000Z' },
    ],
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

  it('leaves items with no invoice images untouched', () => {
    const payload = buildBackupPayload([{ ...item, invoiceImages: [] }], '2026-08-18T10:00:00.000Z');

    expect(payload.items[0].invoiceImages).toEqual([]);
  });
});

describe('createBackupArchive', () => {
  it('bundles all items as JSON plus their invoice images into a single zip file', async () => {
    const item = await createItem(baseItem);
    __setFileContent(IMAGE_URI, IMAGE_BASE64);
    await saveInvoiceImagesForItem(item.id, [{ id: 'draft-1', uri: IMAGE_URI, isPersisted: false }]);

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

  it('produces a valid empty backup when there are no items', async () => {
    const result = await createBackupArchive();

    expect(result.itemCount).toBe(0);
    const zipBase64 = await readAsStringAsync(result.uri, { encoding: 'base64' });
    const zip = await JSZip.loadAsync(zipBase64, { base64: true });
    const payload = JSON.parse(await zip.file('data.json')!.async('string'));
    expect(payload.items).toEqual([]);
  });
});

describe('exportBackup', () => {
  it('records the last backup time and opens the share sheet for the archive', async () => {
    await createItem(baseItem);
    expect(await getLastBackupTime()).toBeNull();

    const result = await exportBackup();

    expect(await getLastBackupTime()).toEqual(expect.any(String));
    expect(__getLastSharedUri()).toBe(result.uri);
  });

  it('does not attempt to share when sharing is unavailable on the device', async () => {
    __setAvailable(false);

    await exportBackup();

    expect(__getLastSharedUri()).toBeNull();
  });
});
