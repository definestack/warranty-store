import * as ImagePicker from 'expo-image-picker';

import { saveInvoiceImage } from './fileService';

export type InvoicePickResult =
  | { status: 'success'; uri: string }
  | { status: 'canceled' }
  | { status: 'permission-denied' };

async function finalizePick(result: ImagePicker.ImagePickerResult): Promise<InvoicePickResult> {
  if (result.canceled || result.assets.length === 0) {
    return { status: 'canceled' };
  }
  const uri = await saveInvoiceImage(result.assets[0].uri);
  return { status: 'success', uri };
}

export async function pickInvoiceFromCamera(): Promise<InvoicePickResult> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    return { status: 'permission-denied' };
  }

  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
  return finalizePick(result);
}

export async function pickInvoiceFromGallery(): Promise<InvoicePickResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return { status: 'permission-denied' };
  }

  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
  return finalizePick(result);
}
