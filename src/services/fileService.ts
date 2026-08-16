import { deleteAsync, getInfoAsync } from 'expo-file-system/legacy';

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
