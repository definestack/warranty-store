import * as ImagePicker from 'expo-image-picker';

import { saveInvoiceImage, saveItemPhoto } from './fileService';

export const MAX_INVOICE_PAGES = 10;

export type InvoicePickResult =
  | { status: 'success'; uris: string[] }
  | { status: 'canceled' }
  | { status: 'permission-denied' };

async function finalizePick(result: ImagePicker.ImagePickerResult): Promise<InvoicePickResult> {
  if (result.canceled || result.assets.length === 0) {
    return { status: 'canceled' };
  }
  const uris = await Promise.all(result.assets.map((asset) => saveInvoiceImage(asset.uri)));
  return { status: 'success', uris };
}

export async function pickInvoiceFromCamera(): Promise<InvoicePickResult> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    return { status: 'permission-denied' };
  }

  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
  return finalizePick(result);
}

export async function pickInvoiceFromGallery(selectionLimit?: number): Promise<InvoicePickResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return { status: 'permission-denied' };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
    allowsMultipleSelection: true,
    selectionLimit,
  });
  return finalizePick(result);
}

export type ItemPhotoPickResult =
  | { status: 'success'; uri: string }
  | { status: 'canceled' }
  | { status: 'permission-denied' };

/** An item carries at most one photo, so only the first asset is ever kept. */
async function finalizeItemPhotoPick(
  result: ImagePicker.ImagePickerResult
): Promise<ItemPhotoPickResult> {
  if (result.canceled || result.assets.length === 0) {
    return { status: 'canceled' };
  }
  const uri = await saveItemPhoto(result.assets[0].uri);
  return { status: 'success', uri };
}

export async function pickItemPhotoFromCamera(): Promise<ItemPhotoPickResult> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    return { status: 'permission-denied' };
  }

  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
  return finalizeItemPhotoPick(result);
}

export async function pickItemPhotoFromGallery(): Promise<ItemPhotoPickResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return { status: 'permission-denied' };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
    allowsMultipleSelection: false,
    selectionLimit: 1,
  });
  return finalizeItemPhotoPick(result);
}
