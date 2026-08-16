export interface InvoiceImage {
  id: string;
  itemId: string;
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
  invoiceImages: InvoiceImage[];
  createdAt: string;
  updatedAt: string;
}

export type NewWarrantyItem = Omit<
  WarrantyItem,
  'id' | 'expiryDate' | 'createdAt' | 'updatedAt' | 'invoiceImages'
>;

export type WarrantyItemUpdate = Partial<NewWarrantyItem>;
