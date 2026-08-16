import * as legacyFileSystem from 'expo-file-system/legacy';
import { __resetMockFileSystem, __setFileExists, getInfoAsync } from 'expo-file-system/legacy';

import { deleteInvoiceFile, saveInvoiceImage } from './fileService';

beforeEach(() => {
  __resetMockFileSystem();
});

describe('deleteInvoiceFile', () => {
  it('deletes the file when it exists', async () => {
    __setFileExists('file:///invoice.jpg', true);

    await deleteInvoiceFile('file:///invoice.jpg');

    expect((await getInfoAsync('file:///invoice.jpg')).exists).toBe(false);
  });

  it('does nothing when the file does not exist', async () => {
    __setFileExists('file:///missing.jpg', false);
    const deleteSpy = jest.spyOn(legacyFileSystem, 'deleteAsync');

    await expect(deleteInvoiceFile('file:///missing.jpg')).resolves.toBeUndefined();
    expect(deleteSpy).not.toHaveBeenCalled();

    deleteSpy.mockRestore();
  });

  it('swallows errors so a failed cleanup does not block item deletion', async () => {
    const failingGetInfo = jest
      .spyOn(legacyFileSystem, 'getInfoAsync')
      .mockRejectedValueOnce(new Error('boom'));

    await expect(deleteInvoiceFile('file:///invoice.jpg')).resolves.toBeUndefined();

    failingGetInfo.mockRestore();
  });
});

describe('saveInvoiceImage', () => {
  it('copies the source file into the app-private invoices directory', async () => {
    const savedUri = await saveInvoiceImage('file:///camera-tmp/photo.jpg');

    expect(savedUri).toMatch(
      /^file:\/\/\/mock-documents\/invoices\/invoice-[0-9a-f-]+\.jpg$/
    );
    expect((await getInfoAsync(savedUri)).exists).toBe(true);
  });

  it('creates the invoices directory the first time it is needed', async () => {
    const makeDirSpy = jest.spyOn(legacyFileSystem, 'makeDirectoryAsync');

    await saveInvoiceImage('file:///camera-tmp/photo.jpg');

    expect(makeDirSpy).toHaveBeenCalledWith('file:///mock-documents/invoices/', {
      intermediates: true,
    });

    makeDirSpy.mockRestore();
  });

  it('returns a unique destination for each capture', async () => {
    const first = await saveInvoiceImage('file:///camera-tmp/photo.jpg');
    const second = await saveInvoiceImage('file:///camera-tmp/photo.jpg');

    expect(first).not.toBe(second);
  });
});
