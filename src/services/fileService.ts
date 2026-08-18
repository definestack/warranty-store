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

const INVOICES_DIR = `${documentDirectory}invoices/`;
const MAX_DIMENSION = 1600;
const COMPRESSION_QUALITY = 0.8;

async function ensureInvoicesDirExists(): Promise<void> {
  const dirInfo = await getInfoAsync(INVOICES_DIR);
  if (!dirInfo.exists) {
    await makeDirectoryAsync(INVOICES_DIR, { intermediates: true });
  }
}

/**
 * Resizes/compresses images above MAX_DIMENSION so invoice photos don't
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

export async function saveInvoiceImage(sourceUri: string): Promise<string> {
  await ensureInvoicesDirExists();
  const destinationUri = `${INVOICES_DIR}invoice-${Crypto.randomUUID()}.jpg`;

  let uriToCopy = sourceUri;
  try {
    uriToCopy = await compressIfNeeded(sourceUri);
  } catch (err) {
    if (__DEV__) {
      console.warn('Invoice image compression failed, saving original file', err);
    }
  }

  await copyAsync({ from: uriToCopy, to: destinationUri });
  return destinationUri;
}

/**
 * Writes an already-encoded invoice image (e.g. one unpacked from a backup archive)
 * into app-private storage under the given file name, and returns its local URI.
 * Restored images are stored as-is — they were compressed before being exported.
 */
export async function writeInvoiceImageFile(fileName: string, base64: string): Promise<string> {
  await ensureInvoicesDirExists();
  const destinationUri = `${INVOICES_DIR}${fileName}`;
  await writeAsStringAsync(destinationUri, base64, { encoding: 'base64' });
  return destinationUri;
}

export async function deleteInvoiceFile(uri: string): Promise<void> {
  try {
    const info = await getInfoAsync(uri);
    if (info.exists) {
      await deleteAsync(uri, { idempotent: true });
    }
  } catch (err) {
    console.error('Failed to delete invoice file', err);
  }
}
