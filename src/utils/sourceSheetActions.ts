import type { DocumentSource } from '../services/imageService';

export interface SourceSheetAction {
  value: DocumentSource | 'remove';
  labelKey: string;
  descriptionKey: string;
  icon: string;
  destructive?: boolean;
}

export interface SourceSheet {
  titleKey: string;
  subtitleKey: string;
  actions: SourceSheetAction[];
}

export type DocumentSectionKind = 'invoice' | 'warranty';

/** The source-picker sheet shown when attaching or replacing an invoice/document. */
export function buildDocumentSourceSheet(
  kind: DocumentSectionKind,
  isReplace: boolean
): SourceSheet {
  const isInvoice = kind === 'invoice';

  return {
    titleKey: isReplace
      ? isInvoice
        ? 'addEditItem.replaceInvoiceTitle'
        : 'addEditItem.replaceDocumentTitle'
      : isInvoice
        ? 'addEditItem.attachInvoiceTitle'
        : 'addEditItem.attachDocumentTitle',
    subtitleKey: isInvoice
      ? 'addEditItem.attachInvoiceSubtitle'
      : 'addEditItem.attachDocumentSubtitle',
    actions: [
      {
        value: 'camera',
        labelKey: 'addEditItem.takePhoto',
        descriptionKey: isInvoice
          ? 'addEditItem.takePhotoInvoiceDesc'
          : 'addEditItem.takePhotoDocumentDesc',
        icon: 'camera-outline',
      },
      {
        value: 'gallery',
        labelKey: 'addEditItem.chooseFromGallery',
        descriptionKey: 'addEditItem.galleryDesc',
        icon: 'image-outline',
      },
      {
        value: 'files',
        labelKey: 'addEditItem.choosePdf',
        descriptionKey: isInvoice ? 'addEditItem.pdfInvoiceDesc' : 'addEditItem.pdfDocumentDesc',
        icon: 'document-outline',
      },
    ],
  };
}

/** The source-picker sheet shown when choosing or replacing the product photo. */
export function buildPhotoSourceSheet(hasPhoto: boolean): SourceSheet {
  const actions: SourceSheetAction[] = [
    {
      value: 'camera',
      labelKey: 'addEditItem.takePhoto',
      descriptionKey: 'addEditItem.takePhotoProductDesc',
      icon: 'camera-outline',
    },
    {
      value: 'gallery',
      labelKey: 'addEditItem.chooseFromGallery',
      descriptionKey: 'addEditItem.galleryDesc',
      icon: 'image-outline',
    },
  ];

  if (hasPhoto) {
    actions.push({
      value: 'remove',
      labelKey: 'addEditItem.removePhoto',
      descriptionKey: 'addEditItem.removePhotoDesc',
      icon: 'trash-outline',
      destructive: true,
    });
  }

  return {
    titleKey: 'addEditItem.photoSourceTitle',
    subtitleKey: 'addEditItem.photoSourceSubtitle',
    actions,
  };
}
