export interface WarrantyItem {
  id: string;
  name: string;
  purchaseDate: string;
  warrantyMonths: number;
  expiryDate: string;
  category?: string;
  notes?: string;
  invoiceUri?: string;
  createdAt: string;
  updatedAt: string;
}

export type NewWarrantyItem = Omit<
  WarrantyItem,
  'id' | 'expiryDate' | 'createdAt' | 'updatedAt'
>;

export type WarrantyItemUpdate = Partial<NewWarrantyItem>;
