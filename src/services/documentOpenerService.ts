import { getContentUriAsync } from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';

import { PDF_MIME_TYPE } from '../utils/documentType';

/** Intent flag letting the receiving viewer read the file through its content URI. */
const FLAG_GRANT_READ_URI_PERMISSION = 1;

/**
 * Opens a stored PDF in whichever external viewer the device has. Resolves to false when no
 * viewer can handle it, so the caller can show a message instead of failing silently.
 */
export async function openPdf(uri: string): Promise<boolean> {
  try {
    const contentUri = await getContentUriAsync(uri);
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: contentUri,
      type: PDF_MIME_TYPE,
      flags: FLAG_GRANT_READ_URI_PERMISSION,
    });
    return true;
  } catch (err) {
    if (__DEV__) console.warn('No application could open PDF', err);
    return false;
  }
}
