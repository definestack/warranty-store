/**
 * Which section a document attached to an item belongs to. 'invoice' is the purchase
 * bill or receipt; 'warranty' is the manufacturer warranty card, certificate or terms.
 * A third kind for extended warranty is expected here later.
 */
export type ItemDocumentKind = 'invoice' | 'warranty';

/** How an extended warranty's duration was entered, preserved so it displays as typed. */
export type WarrantyDurationUnit = 'months' | 'years';

export interface ItemDocument {
  id: string;
  itemId: string;
  kind: ItemDocumentKind;
  uri: string;
  sortOrder: number;
  createdAt: string;
}

export interface WarrantyItem {
  id: string;
  name: string;
  purchaseDate: string;
  warrantyMonths: number;
  expiryDate: string;
  category?: string;
  brand?: string;
  price?: number;
  store?: string;
  notes?: string;
  photoUri?: string;
  /**
   * Documents are exposed pre-grouped by kind, each list ordered densely from zero
   * within its own kind. Grouping happens once in the repository mapper so callers
   * never have to remember that ordering is per kind rather than per item.
   */
  invoiceDocuments: ItemDocument[];
  warrantyDocuments: ItemDocument[];
  createdAt: string;
  updatedAt: string;
}

export type NewWarrantyItem = Omit<
  WarrantyItem,
  'id' | 'expiryDate' | 'createdAt' | 'updatedAt' | 'invoiceDocuments' | 'warrantyDocuments'
>;

export type WarrantyItemUpdate = Partial<NewWarrantyItem>;
