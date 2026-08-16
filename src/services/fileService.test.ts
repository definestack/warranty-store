import * as legacyFileSystem from 'expo-file-system/legacy';
import { __setFileExists, getInfoAsync } from 'expo-file-system/legacy';

import { deleteInvoiceFile } from './fileService';

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
