// Placeholder data until the item list is backed by the SQLite repository (see src/db).

export type MockWarrantyStatus = 'active' | 'expiring' | 'expired';

export interface MockWarrantyItem {
  id: string;
  name: string;
  category: string;
  brand: string;
  purchaseDate: string;
  expiryDate: string;
  expiresIn: string;
  price: string;
  store: string;
  invoiceFileName: string;
  status: MockWarrantyStatus;
  notes?: string;
}

export const WARRANTY_PERIODS = ['6 Months', '1 Year', '2 Years', '3 Years', '5 Years'];

export const PLACEHOLDER_ITEMS: MockWarrantyItem[] = [
  {
    id: '1',
    name: 'Dell XPS 13 Laptop',
    category: 'Electronics',
    brand: 'Dell',
    purchaseDate: '20 May 2024',
    expiryDate: '20 May 2026',
    expiresIn: 'Expires in 10 months',
    price: '₹1,25,990',
    store: 'Amazon India',
    invoiceFileName: 'INV-4587.pdf',
    status: 'active',
    notes: 'My primary work laptop.',
  },
  {
    id: '2',
    name: 'Sony WH-1000XM5',
    category: 'Electronics',
    brand: 'Sony',
    purchaseDate: '20 Dec 2024',
    expiryDate: '20 Dec 2025',
    expiresIn: 'Expires in 4 months',
    price: '₹29,990',
    store: 'Sony Center',
    invoiceFileName: 'INV-3312.pdf',
    status: 'expiring',
  },
  {
    id: '3',
    name: 'IKEA Office Chair',
    category: 'Furniture',
    brand: 'IKEA',
    purchaseDate: '15 Apr 2023',
    expiryDate: '15 Apr 2024',
    expiresIn: 'Expired on 15 Apr 2024',
    price: '₹14,999',
    store: 'IKEA Bengaluru',
    invoiceFileName: 'INV-0932.pdf',
    status: 'expired',
  },
  {
    id: '4',
    name: 'Philips Air Purifier',
    category: 'Appliances',
    brand: 'Philips',
    purchaseDate: '10 Aug 2025',
    expiryDate: '10 Aug 2027',
    expiresIn: 'Expires in 1 year',
    price: '₹18,499',
    store: 'Flipkart',
    invoiceFileName: 'INV-5540.pdf',
    status: 'active',
  },
  {
    id: '5',
    name: 'Canon EOS R50 Camera',
    category: 'Electronics',
    brand: 'Canon',
    purchaseDate: '10 Dec 2023',
    expiryDate: '10 Dec 2025',
    expiresIn: 'Expires in 3 months',
    price: '₹81,500',
    store: 'Croma',
    invoiceFileName: 'INV-2201.pdf',
    status: 'expiring',
  },
];
