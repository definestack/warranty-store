import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { isPdfUri, PDF_MIME_TYPE } from '../utils/documentType';
import { saveDocumentImage, saveDocumentPdf, saveItemPhoto } from './fileService';

/** A document now in app-private storage. `fileName` is only known for picked files. */
export interface PickedDocument {
  uri: string;
  fileName?: string;
}

export type DocumentPickResult =
  | { status: 'success'; documents: PickedDocument[] }
  | { status: 'canceled' }
  | { status: 'permission-denied' };

async function finalizePick(result: ImagePicker.ImagePickerResult): Promise<DocumentPickResult> {
  if (result.canceled || result.assets.length === 0) {
    return { status: 'canceled' };
  }
  const documents = await Promise.all(
    result.assets.map(async (asset) => ({ uri: await saveDocumentImage(asset.uri) }))
  );
  return { status: 'success', documents };
}

/**
 * Lets the user pick PDFs from the system file browser. The system picker needs no
 * permission. Anything that is not a PDF is dropped, so a non-PDF can never be filed as one.
 */
export async function pickDocumentFromFiles(multiple = true): Promise<DocumentPickResult> {
  const result = await DocumentPicker.getDocumentAsync({
    type: PDF_MIME_TYPE,
    multiple,
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets) {
    return { status: 'canceled' };
  }

  const pdfs = result.assets.filter(
    (asset) => asset.mimeType === PDF_MIME_TYPE || isPdfUri(asset.name)
  );
  if (pdfs.length === 0) {
    return { status: 'canceled' };
  }

  const documents = await Promise.all(
    pdfs.map(async (asset) => ({ uri: await saveDocumentPdf(asset.uri), fileName: asset.name }))
  );
  return { status: 'success', documents };
}

export async function pickDocumentFromCamera(): Promise<DocumentPickResult> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    return { status: 'permission-denied' };
  }

  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
  return finalizePick(result);
}

export async function pickDocumentFromGallery(selectionLimit?: number): Promise<DocumentPickResult> {
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

export type DocumentSource = 'camera' | 'gallery' | 'files';

/**
 * Routes a document pick to the picker for the chosen source. A selection limit of 1 means
 * a single replacement, which for the file browser means no multi-select.
 */
export async function pickDocument(
  source: DocumentSource,
  selectionLimit?: number
): Promise<DocumentPickResult> {
  if (source === 'files') return pickDocumentFromFiles(selectionLimit !== 1);
  if (source === 'camera') return pickDocumentFromCamera();
  return pickDocumentFromGallery(selectionLimit);
}
