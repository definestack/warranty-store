/**
 * Which section a document belongs to. 'invoice' is the purchase bill or receipt;
 * 'warranty' is the warranty card, certificate or terms.
 *
 * Kind alone does not identify a section: a document is filed by kind *and* scope, and an
 * extended warranty's paperwork reuses these same two kinds within its own scope. See
 * `ItemDocument.extendedWarrantyId`.
 */
export type ItemDocumentKind = 'invoice' | 'warranty';

/** How an extended warranty's duration was entered, preserved so it displays as typed. */
export type WarrantyDurationUnit = 'months' | 'years';

export interface ItemDocument {
  id: string;
  itemId: string;
  kind: ItemDocumentKind;
  /**
   * The extended warranty this document belongs to, or undefined when it belongs to the
   * item itself. Together with `kind` this is the document's section, and the per-section
   * limit is counted over that pair.
   */
  extendedWarrantyId?: string;
  uri: string;
  sortOrder: number;
  createdAt: string;
}

/**
 * Extended cover bought on top of the manufacturer warranty. An item may hold any number
 * of these, ordered by `sortOrder`, each with its own documents and its own reminders.
 */
export interface ExtendedWarranty {
  id: string;
  itemId: string;
  provider?: string;
  durationValue: number;
  durationUnit: WarrantyDurationUnit;
  startsOn: string;
  /** Derived from `startsOn` and the duration on every write; never supplied by a caller. */
  endsOn: string;
  cost?: number;
  notes?: string;
  sortOrder: number;
  /** Pre-grouped by kind within this extended warranty's own scope, as on the item. */
  invoiceDocuments: ItemDocument[];
  warrantyDocuments: ItemDocument[];
  createdAt: string;
  updatedAt: string;
}

/** An extended warranty as the caller supplies it — the derived end date is not accepted. */
export type NewExtendedWarranty = Omit<
  ExtendedWarranty,
  'itemId' | 'endsOn' | 'sortOrder' | 'invoiceDocuments' | 'warrantyDocuments' | 'createdAt' | 'updatedAt'
>;

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
  /** Extended cover, in stored order. Empty for an item that has none. */
  extendedWarranties: ExtendedWarranty[];
  /**
   * How long the item is covered in total: the furthest of `expiryDate` and every extended
   * warranty's end date. Derived in the repository mapper rather than stored, so it cannot
   * drift from the periods it summarises. This — not `expiryDate` — is what the item's
   * status, days-remaining and expiring-soon placement are read from.
   */
  coverageEndDate: string;
  createdAt: string;
  updatedAt: string;
}

export type NewWarrantyItem = Omit<
  WarrantyItem,
  | 'id'
  | 'expiryDate'
  | 'coverageEndDate'
  | 'createdAt'
  | 'updatedAt'
  | 'invoiceDocuments'
  | 'warrantyDocuments'
  | 'extendedWarranties'
>;

export type WarrantyItemUpdate = Partial<NewWarrantyItem>;
