import * as ImagePicker from 'expo-image-picker';
import { __resetMockFileSystem } from 'expo-file-system/legacy';

import { pickInvoiceFromCamera, pickInvoiceFromGallery } from './imageService';

beforeEach(() => {
  __resetMockFileSystem();
  jest.clearAllMocks();
});

describe('pickInvoiceFromCamera', () => {
  it('copies the captured photo into app storage on success', async () => {
    const result = await pickInvoiceFromCamera();

    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.uri).toMatch(/^file:\/\/\/mock-documents\/invoices\/invoice-[0-9a-f-]+\.jpg$/);
    }
  });

  it('returns permission-denied without launching the camera when permission is refused', async () => {
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValueOnce({ granted: false });

    const result = await pickInvoiceFromCamera();

    expect(result).toEqual({ status: 'permission-denied' });
    expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
  });

  it('returns canceled when the user backs out of the camera', async () => {
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValueOnce({ canceled: true, assets: null });

    const result = await pickInvoiceFromCamera();

    expect(result).toEqual({ status: 'canceled' });
  });
});

describe('pickInvoiceFromGallery', () => {
  it('copies the selected photo into app storage on success', async () => {
    const result = await pickInvoiceFromGallery();

    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.uri).toMatch(/^file:\/\/\/mock-documents\/invoices\/invoice-[0-9a-f-]+\.jpg$/);
    }
  });

  it('returns permission-denied without launching the picker when permission is refused', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      granted: false,
    });

    const result = await pickInvoiceFromGallery();

    expect(result).toEqual({ status: 'permission-denied' });
    expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
  });

  it('returns canceled when the user backs out of the gallery picker', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: true,
      assets: null,
    });

    const result = await pickInvoiceFromGallery();

    expect(result).toEqual({ status: 'canceled' });
  });
});
