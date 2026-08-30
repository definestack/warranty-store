import * as Crypto from 'expo-crypto';
import {
  copyAsync,
  deleteAsync,
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
  writeAsStringAsync,
} from 'expo-file-system/legacy';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/**
 * Holds attached documents of BOTH kinds — invoices and manufacturer warranty paperwork.
 * The `invoices/` path and the `invoice-` filename prefix predate the split and are kept
 * deliberately: a document's kind lives on its database row, never in its file name or
 * location. Sharing one directory is what lets a document be reclassified with a single
 * database write instead of a copy/update/delete that could half-succeed. Do not infer a
 * document's kind from where its file sits.
 */
const DOCUMENTS_DIR = `${documentDirectory}invoices/`;
const PHOTOS_DIR = `${documentDirectory}photos/`;
const MAX_DIMENSION = 1600;
const COMPRESSION_QUALITY = 0.8;

async function ensureDirExists(directory: string): Promise<void> {
  const dirInfo = await getInfoAsync(directory);
  if (!dirInfo.exists) {
    await makeDirectoryAsync(directory, { intermediates: true });
  }
}

/**
 * Resizes/compresses images above MAX_DIMENSION so saved images don't
 * consume excessive device storage. Images already within the threshold are
 * returned unchanged to avoid a needless re-encode.
 */
async function compressIfNeeded(sourceUri: string): Promise<string> {
  const context = ImageManipulator.manipulate(sourceUri);
  const original = await context.renderAsync();

  if (original.width <= MAX_DIMENSION && original.height <= MAX_DIMENSION) {
    original.release();
    context.release();
    return sourceUri;
  }

  const resizeTarget =
    original.width >= original.height ? { width: MAX_DIMENSION } : { height: MAX_DIMENSION };
  const resized = await context.reset().resize(resizeTarget).renderAsync();
  const result = await resized.saveAsync({ compress: COMPRESSION_QUALITY, format: SaveFormat.JPEG });

  original.release();
  resized.release();
  context.release();

  return result.uri;
}

/**
 * Copies a picked image into app-private storage under `<directory><prefix>-<uuid>.jpg`,
 * compressing it first when it exceeds the size budget. Shared by attached documents and
 * item photos so both get identical resize/compress behaviour.
 */
async function saveImageInto(
  directory: string,
  filePrefix: string,
  sourceUri: string
): Promise<string> {
  await ensureDirExists(directory);
  const destinationUri = `${directory}${filePrefix}-${Crypto.randomUUID()}.jpg`;

  let uriToCopy = sourceUri;
  try {
    uriToCopy = await compressIfNeeded(sourceUri);
  } catch (err) {
    if (__DEV__) {
      console.warn('Image compression failed, saving original file', err);
    }
  }

  await copyAsync({ from: uriToCopy, to: destinationUri });
  return destinationUri;
}

/**
 * Writes an already-encoded image (e.g. one unpacked from a backup archive) into
 * app-private storage under the given file name, and returns its local URI.
 * Restored images are stored as-is — they were compressed before being exported.
 */
async function writeImageInto(
  directory: string,
  fileName: string,
  base64: string
): Promise<string> {
  await ensureDirExists(directory);
  const destinationUri = `${directory}${fileName}`;
  await writeAsStringAsync(destinationUri, base64, { encoding: 'base64' });
  return destinationUri;
}

/** Deletes a stored image, tolerating a file that is already gone or unreadable. */
async function deleteImageFile(uri: string, description: string): Promise<void> {
  try {
    const info = await getInfoAsync(uri);
    if (info.exists) {
      await deleteAsync(uri, { idempotent: true });
    }
  } catch (err) {
    console.error(`Failed to delete ${description}`, err);
  }
}

export async function saveDocumentImage(sourceUri: string): Promise<string> {
  return saveImageInto(DOCUMENTS_DIR, 'invoice', sourceUri);
}

export async function writeDocumentImageFile(fileName: string, base64: string): Promise<string> {
  return writeImageInto(DOCUMENTS_DIR, fileName, base64);
}

export async function deleteDocumentFile(uri: string): Promise<void> {
  return deleteImageFile(uri, 'document file');
}

/**
 * Item photos live in their own directory so a photo can never be mistaken for an
 * attached document during cleanup.
 */
export async function saveItemPhoto(sourceUri: string): Promise<string> {
  return saveImageInto(PHOTOS_DIR, 'photo', sourceUri);
}

export async function writeItemPhotoFile(fileName: string, base64: string): Promise<string> {
  return writeImageInto(PHOTOS_DIR, fileName, base64);
}

export async function deleteItemPhotoFile(uri: string): Promise<void> {
  return deleteImageFile(uri, 'item photo file');
}
