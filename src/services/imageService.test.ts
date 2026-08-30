import * as ImagePicker from 'expo-image-picker';
import * as legacyFileSystem from 'expo-file-system/legacy';
import { __resetMockFileSystem } from 'expo-file-system/legacy';

import {
  pickDocumentFromCamera,
  pickDocumentFromGallery,
  pickItemPhotoFromCamera,
  pickItemPhotoFromGallery,
} from './imageService';

beforeEach(() => {
  __resetMockFileSystem();
  jest.clearAllMocks();
});

describe('pickDocumentFromCamera', () => {
  it('copies the captured photo into app storage on success', async () => {
    const result = await pickDocumentFromCamera();

    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.uris).toHaveLength(1);
      expect(result.uris[0]).toMatch(/^file:\/\/\/mock-documents\/invoices\/invoice-[0-9a-f-]+\.jpg$/);
    }
  });

  it('returns permission-denied without launching the camera when permission is refused', async () => {
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValueOnce({ granted: false });

    const result = await pickDocumentFromCamera();

    expect(result).toEqual({ status: 'permission-denied' });
    expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
  });

  it('returns canceled when the user backs out of the camera', async () => {
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValueOnce({ canceled: true, assets: null });

    const result = await pickDocumentFromCamera();

    expect(result).toEqual({ status: 'canceled' });
  });
});

describe('pickDocumentFromGallery', () => {
  it('copies the selected photo into app storage on success', async () => {
    const result = await pickDocumentFromGallery();

    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.uris).toHaveLength(1);
      expect(result.uris[0]).toMatch(/^file:\/\/\/mock-documents\/invoices\/invoice-[0-9a-f-]+\.jpg$/);
    }
  });

  it('copies every selected photo into app storage when multiple are picked', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [
        { uri: 'file:///mock-gallery/photo-1.jpg' },
        { uri: 'file:///mock-gallery/photo-2.jpg' },
        { uri: 'file:///mock-gallery/photo-3.jpg' },
      ],
    });

    const result = await pickDocumentFromGallery();

    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.uris).toHaveLength(3);
      for (const uri of result.uris) {
        expect(uri).toMatch(/^file:\/\/\/mock-documents\/invoices\/invoice-[0-9a-f-]+\.jpg$/);
      }
    }
  });

  it('passes the selection limit and multi-select flag through to the picker', async () => {
    await pickDocumentFromGallery(5);

    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith(
      expect.objectContaining({ allowsMultipleSelection: true, selectionLimit: 5 })
    );
  });

  it('returns permission-denied without launching the picker when permission is refused', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      granted: false,
    });

    const result = await pickDocumentFromGallery();

    expect(result).toEqual({ status: 'permission-denied' });
    expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
  });

  it('returns canceled when the user backs out of the gallery picker', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: true,
      assets: null,
    });

    const result = await pickDocumentFromGallery();

    expect(result).toEqual({ status: 'canceled' });
  });
});

describe('pickItemPhotoFromCamera', () => {
  it('copies the captured photo into app-private photo storage on success', async () => {
    const result = await pickItemPhotoFromCamera();

    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.uri).toMatch(/^file:\/\/\/mock-documents\/photos\/photo-[0-9a-f-]+\.jpg$/);
    }
  });

  it('returns permission-denied without launching the camera when permission is refused', async () => {
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      granted: false,
    });

    const result = await pickItemPhotoFromCamera();

    expect(result).toEqual({ status: 'permission-denied' });
    expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
  });

  it('returns canceled when the user backs out of the camera', async () => {
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValueOnce({
      canceled: true,
      assets: null,
    });

    const result = await pickItemPhotoFromCamera();

    expect(result).toEqual({ status: 'canceled' });
  });

  it('returns canceled when the camera returns no asset', async () => {
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [],
    });

    const result = await pickItemPhotoFromCamera();

    expect(result).toEqual({ status: 'canceled' });
  });
});

describe('pickItemPhotoFromGallery', () => {
  it('copies the selected photo into app-private photo storage on success', async () => {
    const result = await pickItemPhotoFromGallery();

    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.uri).toMatch(/^file:\/\/\/mock-documents\/photos\/photo-[0-9a-f-]+\.jpg$/);
    }
  });

  it('limits the gallery to a single selection', async () => {
    await pickItemPhotoFromGallery();

    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith(
      expect.objectContaining({ allowsMultipleSelection: false, selectionLimit: 1 })
    );
  });

  it('keeps only the first asset when the picker returns more than one', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///mock-gallery/photo-1.jpg' }, { uri: 'file:///mock-gallery/photo-2.jpg' }],
    });
    const copySpy = jest.spyOn(legacyFileSystem, 'copyAsync');

    const result = await pickItemPhotoFromGallery();

    expect(result.status).toBe('success');
    expect(copySpy).toHaveBeenCalledTimes(1);
    expect(copySpy.mock.calls[0][0].from).toBe('file:///mock-gallery/photo-1.jpg');

    copySpy.mockRestore();
  });

  it('returns permission-denied without launching the picker when permission is refused', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      granted: false,
    });

    const result = await pickItemPhotoFromGallery();

    expect(result).toEqual({ status: 'permission-denied' });
    expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
  });

  it('returns canceled when the user backs out of the gallery picker', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: true,
      assets: null,
    });

    const result = await pickItemPhotoFromGallery();

    expect(result).toEqual({ status: 'canceled' });
  });
});
