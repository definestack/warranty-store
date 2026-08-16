import * as Crypto from 'expo-crypto';
import {
  copyAsync,
  deleteAsync,
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
} from 'expo-file-system/legacy';

const INVOICES_DIR = `${documentDirectory}invoices/`;

async function ensureInvoicesDirExists(): Promise<void> {
  const dirInfo = await getInfoAsync(INVOICES_DIR);
  if (!dirInfo.exists) {
    await makeDirectoryAsync(INVOICES_DIR, { intermediates: true });
  }
}

export async function saveInvoiceImage(sourceUri: string): Promise<string> {
  await ensureInvoicesDirExists();
  const destinationUri = `${INVOICES_DIR}invoice-${Crypto.randomUUID()}.jpg`;
  await copyAsync({ from: sourceUri, to: destinationUri });
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
