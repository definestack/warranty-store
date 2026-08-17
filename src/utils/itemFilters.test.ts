import type { WarrantyItem } from '../types/warranty';
import { ALL_CATEGORIES, filterItems } from './itemFilters';

function makeItem(overrides: Partial<WarrantyItem> = {}): WarrantyItem {
  return {
    id: overrides.id ?? 'id-1',
    name: overrides.name ?? 'Item',
    purchaseDate: '2024-01-01',
    warrantyMonths: 12,
    expiryDate: '2025-01-01',
    category: overrides.category,
    invoiceImages: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('filterItems', () => {
  const items = [
    makeItem({ id: '1', name: 'Samsung TV', category: 'Electronics' }),
    makeItem({ id: '2', name: 'LG Fridge', category: 'Appliances' }),
    makeItem({ id: '3', name: 'Office Chair', category: 'Furniture' }),
  ];

  it('returns all items when search is empty and category is "all"', () => {
    expect(filterItems(items, { search: '', category: ALL_CATEGORIES })).toEqual(items);
  });

  it('filters by name case-insensitively', () => {
    expect(filterItems(items, { search: 'samsung', category: ALL_CATEGORIES })).toEqual([items[0]]);
  });

  it('matches substrings anywhere in the name', () => {
    expect(filterItems(items, { search: 'ri', category: ALL_CATEGORIES })).toEqual([items[1]]);
  });

  it('trims surrounding whitespace from the query', () => {
    expect(filterItems(items, { search: '  lg  ', category: ALL_CATEGORIES })).toEqual([items[1]]);
  });

  it('restores the full list when the search is cleared', () => {
    const filtered = filterItems(items, { search: 'samsung', category: ALL_CATEGORIES });
    expect(filtered).toEqual([items[0]]);
    expect(filterItems(items, { search: '', category: ALL_CATEGORIES })).toEqual(items);
  });

  it('returns an empty list when nothing matches the search', () => {
    expect(filterItems(items, { search: 'nonexistent', category: ALL_CATEGORIES })).toEqual([]);
  });

  it('combines search and category filters', () => {
    expect(filterItems(items, { search: 'chair', category: 'Furniture' })).toEqual([items[2]]);
    expect(filterItems(items, { search: 'chair', category: 'Electronics' })).toEqual([]);
  });

  it('filters by category alone when search is empty', () => {
    expect(filterItems(items, { search: '', category: 'Appliances' })).toEqual([items[1]]);
  });

  it('treats a missing category as the default category', () => {
    const uncategorized = makeItem({ id: '4', name: 'Mystery Box', category: undefined });
    expect(filterItems([uncategorized], { search: '', category: 'Uncategorized' })).toEqual([uncategorized]);
  });
});
