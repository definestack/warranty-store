import * as legacyFileSystem from 'expo-file-system/legacy';
import {
  __resetMockFileSystem,
  __setFileExists,
  getInfoAsync,
  readAsStringAsync,
} from 'expo-file-system/legacy';
import {
  __resetImageManipulatorMock,
  __setManipulateShouldFail,
  __setMockImageSize,
  ImageManipulator,
} from 'expo-image-manipulator';

import {
  deleteInvoiceFile,
  deleteItemPhotoFile,
  saveInvoiceImage,
  saveItemPhoto,
  writeInvoiceImageFile,
  writeItemPhotoFile,
} from './fileService';

beforeEach(() => {
  __resetMockFileSystem();
  __resetImageManipulatorMock();
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

  it('resizes and compresses images larger than the max dimension before saving', async () => {
    __setMockImageSize({ width: 3200, height: 2400 });
    const copySpy = jest.spyOn(legacyFileSystem, 'copyAsync');

    const savedUri = await saveInvoiceImage('file:///camera-tmp/large.jpg');

    expect((await getInfoAsync(savedUri)).exists).toBe(true);
    const copiedFrom = copySpy.mock.calls[0][0].from;
    expect(copiedFrom).toMatch(/^file:\/\/\/mock-cache\/compressed-1600x1200-q0\.8\.jpg$/);

    copySpy.mockRestore();
  });

  it('does not resize or compress images already within the max dimension', async () => {
    __setMockImageSize({ width: 800, height: 600 });
    const copySpy = jest.spyOn(legacyFileSystem, 'copyAsync');

    await saveInvoiceImage('file:///camera-tmp/small.jpg');

    expect(copySpy.mock.calls[0][0].from).toBe('file:///camera-tmp/small.jpg');

    copySpy.mockRestore();
  });

  it('falls back to the original file when compression fails, logging a dev warning', async () => {
    __setManipulateShouldFail(true);
    const copySpy = jest.spyOn(legacyFileSystem, 'copyAsync');
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const savedUri = await saveInvoiceImage('file:///camera-tmp/broken.jpg');

    expect((await getInfoAsync(savedUri)).exists).toBe(true);
    expect(copySpy.mock.calls[0][0].from).toBe('file:///camera-tmp/broken.jpg');
    expect(warnSpy).toHaveBeenCalled();

    copySpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('uses the manipulate API on the correct source image', async () => {
    __setMockImageSize({ width: 3200, height: 2400 });

    await saveInvoiceImage('file:///camera-tmp/large.jpg');

    expect(ImageManipulator.manipulate).toHaveBeenCalledWith('file:///camera-tmp/large.jpg');
  });
});

describe('writeInvoiceImageFile', () => {
  it('writes the decoded image into app-private invoice storage', async () => {
    const base64 = Buffer.from('restored-image-bytes').toString('base64');

    const uri = await writeInvoiceImageFile('invoice-img-1.jpg', base64);

    expect(uri).toBe('file:///mock-documents/invoices/invoice-img-1.jpg');
    expect((await getInfoAsync(uri)).exists).toBe(true);
    expect(await readAsStringAsync(uri, { encoding: 'base64' })).toBe(base64);
  });

  it('creates the invoices directory when it does not exist yet', async () => {
    const makeDirSpy = jest.spyOn(legacyFileSystem, 'makeDirectoryAsync');

    await writeInvoiceImageFile('invoice-img-2.jpg', 'AAAA');

    expect(makeDirSpy).toHaveBeenCalledWith('file:///mock-documents/invoices/', {
      intermediates: true,
    });

    makeDirSpy.mockRestore();
  });
});

describe('saveItemPhoto', () => {
  it('copies the source file into the app-private photos directory', async () => {
    const savedUri = await saveItemPhoto('file:///camera-tmp/photo.jpg');

    expect(savedUri).toMatch(/^file:\/\/\/mock-documents\/photos\/photo-[0-9a-f-]+\.jpg$/);
    expect((await getInfoAsync(savedUri)).exists).toBe(true);
  });

  it('creates the photos directory the first time it is needed', async () => {
    const makeDirSpy = jest.spyOn(legacyFileSystem, 'makeDirectoryAsync');

    await saveItemPhoto('file:///camera-tmp/photo.jpg');

    expect(makeDirSpy).toHaveBeenCalledWith('file:///mock-documents/photos/', {
      intermediates: true,
    });

    makeDirSpy.mockRestore();
  });

  it('returns a unique destination for each photo', async () => {
    const first = await saveItemPhoto('file:///camera-tmp/photo.jpg');
    const second = await saveItemPhoto('file:///camera-tmp/photo.jpg');

    expect(first).not.toBe(second);
  });

  it('resizes and compresses photos larger than the max dimension before saving', async () => {
    __setMockImageSize({ width: 3200, height: 2400 });
    const copySpy = jest.spyOn(legacyFileSystem, 'copyAsync');

    const savedUri = await saveItemPhoto('file:///camera-tmp/large.jpg');

    expect((await getInfoAsync(savedUri)).exists).toBe(true);
    expect(copySpy.mock.calls[0][0].from).toMatch(
      /^file:\/\/\/mock-cache\/compressed-1600x1200-q0\.8\.jpg$/
    );

    copySpy.mockRestore();
  });

  it('does not resize or compress photos already within the max dimension', async () => {
    __setMockImageSize({ width: 800, height: 600 });
    const copySpy = jest.spyOn(legacyFileSystem, 'copyAsync');

    await saveItemPhoto('file:///camera-tmp/small.jpg');

    expect(copySpy.mock.calls[0][0].from).toBe('file:///camera-tmp/small.jpg');

    copySpy.mockRestore();
  });

  it('falls back to the original file when compression fails, logging a dev warning', async () => {
    __setManipulateShouldFail(true);
    const copySpy = jest.spyOn(legacyFileSystem, 'copyAsync');
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const savedUri = await saveItemPhoto('file:///camera-tmp/broken.jpg');

    expect((await getInfoAsync(savedUri)).exists).toBe(true);
    expect(copySpy.mock.calls[0][0].from).toBe('file:///camera-tmp/broken.jpg');
    expect(warnSpy).toHaveBeenCalled();

    copySpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('uses the manipulate API on the correct source image', async () => {
    __setMockImageSize({ width: 3200, height: 2400 });

    await saveItemPhoto('file:///camera-tmp/large.jpg');

    expect(ImageManipulator.manipulate).toHaveBeenCalledWith('file:///camera-tmp/large.jpg');
  });
});

describe('deleteItemPhotoFile', () => {
  it('deletes the file when it exists', async () => {
    __setFileExists('file:///mock-documents/photos/photo-1.jpg', true);

    await deleteItemPhotoFile('file:///mock-documents/photos/photo-1.jpg');

    expect((await getInfoAsync('file:///mock-documents/photos/photo-1.jpg')).exists).toBe(false);
  });

  it('does nothing when the file does not exist', async () => {
    __setFileExists('file:///mock-documents/photos/missing.jpg', false);
    const deleteSpy = jest.spyOn(legacyFileSystem, 'deleteAsync');

    await expect(
      deleteItemPhotoFile('file:///mock-documents/photos/missing.jpg')
    ).resolves.toBeUndefined();
    expect(deleteSpy).not.toHaveBeenCalled();

    deleteSpy.mockRestore();
  });

  it('swallows errors so a failed cleanup does not block the caller', async () => {
    const failingGetInfo = jest
      .spyOn(legacyFileSystem, 'getInfoAsync')
      .mockRejectedValueOnce(new Error('boom'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      deleteItemPhotoFile('file:///mock-documents/photos/photo-1.jpg')
    ).resolves.toBeUndefined();

    failingGetInfo.mockRestore();
    errorSpy.mockRestore();
  });
});

describe('writeItemPhotoFile', () => {
  it('writes the decoded photo into app-private photo storage', async () => {
    const base64 = Buffer.from('restored-photo-bytes').toString('base64');

    const uri = await writeItemPhotoFile('item-1.jpg', base64);

    expect(uri).toBe('file:///mock-documents/photos/item-1.jpg');
    expect((await getInfoAsync(uri)).exists).toBe(true);
    expect(await readAsStringAsync(uri, { encoding: 'base64' })).toBe(base64);
  });

  it('creates the photos directory when it does not exist yet', async () => {
    const makeDirSpy = jest.spyOn(legacyFileSystem, 'makeDirectoryAsync');

    await writeItemPhotoFile('item-2.jpg', 'AAAA');

    expect(makeDirSpy).toHaveBeenCalledWith('file:///mock-documents/photos/', {
      intermediates: true,
    });

    makeDirSpy.mockRestore();
  });
});
