import { isPdfUri, PDF_MIME_TYPE, viewableImagesAt } from './documentType';

describe('isPdfUri', () => {
  it('recognises a .pdf file', () => {
    expect(isPdfUri('file:///data/invoices/invoice-abc.pdf')).toBe(true);
  });

  it('is case-insensitive about the extension', () => {
    expect(isPdfUri('file:///data/invoices/RECEIPT.PDF')).toBe(true);
  });

  it('treats images as non-PDF', () => {
    expect(isPdfUri('file:///data/invoices/invoice-abc.jpg')).toBe(false);
  });

  it('treats a URI with no extension as non-PDF', () => {
    expect(isPdfUri('content://media/12345')).toBe(false);
  });

  it('does not match .pdf appearing mid-name', () => {
    expect(isPdfUri('file:///data/invoices/report.pdf.jpg')).toBe(false);
  });
});

describe('PDF_MIME_TYPE', () => {
  it('is the standard PDF media type', () => {
    expect(PDF_MIME_TYPE).toBe('application/pdf');
  });
});

describe('viewableImagesAt', () => {
  const docs = [
    { uri: 'file:///a.jpg' },
    { uri: 'file:///b.pdf' },
    { uri: 'file:///c.jpg' },
  ];

  it('keeps only images and re-indexes the tapped one within them', () => {
    expect(viewableImagesAt(docs, 2)).toEqual({ uris: ['file:///a.jpg', 'file:///c.jpg'], index: 1 });
  });

  it('starts at zero when the first image is tapped', () => {
    expect(viewableImagesAt(docs, 0)).toEqual({ uris: ['file:///a.jpg', 'file:///c.jpg'], index: 0 });
  });

  it('returns an empty list when the section holds only PDFs', () => {
    expect(viewableImagesAt([{ uri: 'file:///b.pdf' }], 0)).toEqual({ uris: [], index: 0 });
  });
});
