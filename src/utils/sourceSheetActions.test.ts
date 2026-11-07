import { buildDocumentSourceSheet, buildPhotoSourceSheet } from './sourceSheetActions';

describe('buildDocumentSourceSheet', () => {
  it('uses invoice wording for the invoice section', () => {
    const sheet = buildDocumentSourceSheet('invoice', false);
    expect(sheet.titleKey).toBe('addEditItem.attachInvoiceTitle');
    expect(sheet.subtitleKey).toBe('addEditItem.attachInvoiceSubtitle');
    expect(sheet.actions.map((a) => a.descriptionKey)).toEqual([
      'addEditItem.takePhotoInvoiceDesc',
      'addEditItem.galleryDesc',
      'addEditItem.pdfInvoiceDesc',
    ]);
  });

  it('uses document wording for the warranty section', () => {
    const sheet = buildDocumentSourceSheet('warranty', false);
    expect(sheet.titleKey).toBe('addEditItem.attachDocumentTitle');
    expect(sheet.subtitleKey).toBe('addEditItem.attachDocumentSubtitle');
    expect(sheet.actions.map((a) => a.descriptionKey)).toEqual([
      'addEditItem.takePhotoDocumentDesc',
      'addEditItem.galleryDesc',
      'addEditItem.pdfDocumentDesc',
    ]);
  });

  it('switches to replace titles when replacing', () => {
    expect(buildDocumentSourceSheet('invoice', true).titleKey).toBe(
      'addEditItem.replaceInvoiceTitle'
    );
    expect(buildDocumentSourceSheet('warranty', true).titleKey).toBe(
      'addEditItem.replaceDocumentTitle'
    );
  });

  it('keeps action values aligned with DocumentSource (camera, gallery, files)', () => {
    const sheet = buildDocumentSourceSheet('invoice', false);
    expect(sheet.actions.map((a) => a.value)).toEqual(['camera', 'gallery', 'files']);
  });

  it('gives every action a label key and an icon', () => {
    const sheet = buildDocumentSourceSheet('invoice', false);
    for (const action of sheet.actions) {
      expect(action.labelKey).toMatch(/^addEditItem\./);
      expect(action.icon).toEqual(expect.any(String));
    }
  });
});

describe('buildPhotoSourceSheet', () => {
  it('offers camera and gallery without a photo', () => {
    const sheet = buildPhotoSourceSheet(false);
    expect(sheet.actions.map((a) => a.value)).toEqual(['camera', 'gallery']);
  });

  it('adds a destructive remove action when a photo exists', () => {
    const sheet = buildPhotoSourceSheet(true);
    expect(sheet.actions.map((a) => a.value)).toEqual(['camera', 'gallery', 'remove']);
    const removeAction = sheet.actions.find((a) => a.value === 'remove');
    expect(removeAction?.destructive).toBe(true);
  });

  it('uses the product photo title and subtitle', () => {
    const sheet = buildPhotoSourceSheet(false);
    expect(sheet.titleKey).toBe('addEditItem.photoSourceTitle');
    expect(sheet.subtitleKey).toBe('addEditItem.photoSourceSubtitle');
  });
});
