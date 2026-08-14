// Placeholder data until the item list is backed by the SQLite repository (see src/db).

export interface MockWarrantyItem {
  id: string;
  name: string;
  category: string;
  brand: string;
  purchaseDate: string;
  expiryDate: string;
  price: string;
  store: string;
  invoiceFileName: string;
  status: 'active' | 'expired';
}

export const CATEGORIES = ['Electronics', 'Furniture', 'Appliances', 'Vehicles', 'Other'];

export const WARRANTY_PERIODS = ['6 Months', '1 Year', '2 Years', '3 Years', '5 Years'];

export const PLACEHOLDER_ITEMS: MockWarrantyItem[] = [
  {
    id: '1',
    name: 'Dell XPS 13 Laptop',
    category: 'Electronics',
    brand: 'Dell',
    purchaseDate: '20 May 2024',
    expiryDate: '20 May 2026',
    price: '₹1,25,990',
    store: 'Amazon India',
    invoiceFileName: 'INV-4587.pdf',
    status: 'active',
  },
  {
    id: '2',
    name: 'Canon EOS R50 Camera',
    category: 'Electronics',
    brand: 'Canon',
    purchaseDate: '10 Dec 2023',
    expiryDate: '10 Dec 2025',
    price: '₹81,500',
    store: 'Croma',
    invoiceFileName: 'INV-2201.pdf',
    status: 'active',
  },
  {
    id: '3',
    name: 'IKEA Office Chair',
    category: 'Furniture',
    brand: 'IKEA',
    purchaseDate: '15 Apr 2023',
    expiryDate: '15 Apr 2024',
    price: '₹14,999',
    store: 'IKEA Bengaluru',
    invoiceFileName: 'INV-0932.pdf',
    status: 'expired',
  },
];
