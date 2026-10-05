export const PDF_MIME_TYPE = 'application/pdf';

/**
 * A document's type is read from its file extension, never stored separately: every
 * attached document that is not a PDF is an image, so existing rows need no backfill.
 */
export function isPdfUri(uri: string): boolean {
  return /\.pdf$/i.test(uri);
}

/**
 * The image-only list a viewer pages through, with the tapped document's position within
 * that list. The viewer cannot render a PDF, so PDFs are left out and the index is
 * recomputed against what remains.
 */
export function viewableImagesAt(
  documents: { uri: string }[],
  tappedIndex: number
): { uris: string[]; index: number } {
  const images = documents.filter((document) => !isPdfUri(document.uri));
  const tapped = documents[tappedIndex];
  const index = tapped ? images.indexOf(tapped) : -1;
  return { uris: images.map((document) => document.uri), index: Math.max(index, 0) };
}
