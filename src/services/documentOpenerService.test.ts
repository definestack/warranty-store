import * as IntentLauncher from 'expo-intent-launcher';

import { openPdf } from './documentOpenerService';

beforeEach(() => {
  (IntentLauncher.startActivityAsync as jest.Mock).mockClear();
});

describe('openPdf', () => {
  it('opens the PDF with a viewer through a readable content URI', async () => {
    const opened = await openPdf('file:///mock-documents/invoices/invoice-1.pdf');

    expect(opened).toBe(true);
    expect(IntentLauncher.startActivityAsync).toHaveBeenCalledWith('android.intent.action.VIEW', {
      data: 'content://mock-provider/mock-documents/invoices/invoice-1.pdf',
      type: 'application/pdf',
      flags: 1,
    });
  });

  it('returns false when no app can open PDFs, rather than throwing', async () => {
    (IntentLauncher.startActivityAsync as jest.Mock).mockRejectedValueOnce(
      new Error('No Activity found to handle Intent')
    );

    await expect(openPdf('file:///mock-documents/invoices/invoice-2.pdf')).resolves.toBe(false);
  });
});
