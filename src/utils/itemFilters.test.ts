import type { WarrantyItem } from '../types/warranty';
import { getWarrantyStatus } from './date';
import { ALL_CATEGORIES, filterItems, getExpiringSoonItems } from './itemFilters';

function makeItem(overrides: Partial<WarrantyItem> = {}): WarrantyItem {
  const item: WarrantyItem = {
    id: overrides.id ?? 'id-1',
    name: overrides.name ?? 'Item',
    purchaseDate: '2024-01-01',
    warrantyMonths: 12,
    expiryDate: '2025-01-01',
    category: overrides.category,
    invoiceDocuments: [],
    warrantyDocuments: [],
    extendedWarranties: [],
    coverageEndDate: '2025-01-01',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };

  // Without extended cover an item is covered exactly as long as its manufacturer
  // warranty, so the two dates track unless a test says otherwise.
  return { ...item, coverageEndDate: overrides.coverageEndDate ?? item.expiryDate };
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

describe('getExpiringSoonItems', () => {
  const today = new Date(2026, 4, 20); // 20 May 2026, local time

  it('returns only items expiring within 30 days, sorted soonest-first', () => {
    const items = [
      makeItem({ id: 'active', expiryDate: '2026-12-01' }),
      makeItem({ id: 'expiring-later', expiryDate: '2026-06-10' }), // 21 days out
      makeItem({ id: 'expiring-sooner', expiryDate: '2026-05-25' }), // 5 days out
      makeItem({ id: 'expired', expiryDate: '2026-05-01' }),
      makeItem({ id: 'expiring-today', expiryDate: '2026-05-20' }), // 0 days out
    ];

    const result = getExpiringSoonItems(items, today);

    expect(result.map((item) => item.id)).toEqual(['expiring-today', 'expiring-sooner', 'expiring-later']);
  });

  it('excludes already-expired items', () => {
    const items = [makeItem({ id: 'expired', expiryDate: '2026-05-01' })];
    expect(getExpiringSoonItems(items, today)).toEqual([]);
  });

  it('includes items exactly on the 30-day boundary and expiring today', () => {
    const items = [
      makeItem({ id: 'boundary', expiryDate: '2026-06-19' }), // exactly 30 days
      makeItem({ id: 'today', expiryDate: '2026-05-20' }), // 0 days
    ];

    expect(getExpiringSoonItems(items, today).map((item) => item.id)).toEqual(['today', 'boundary']);
  });

  it('returns an empty array when nothing is expiring soon', () => {
    const items = [makeItem({ id: 'active', expiryDate: '2026-12-01' })];
    expect(getExpiringSoonItems(items, today)).toEqual([]);
  });

  it('does not treat an item carried by extended cover as expiring', () => {
    const items = [
      makeItem({ id: 'extended', expiryDate: '2026-05-25', coverageEndDate: '2028-05-25' }),
    ];

    // Its manufacturer warranty ends in 5 days, but the item is covered for two more years.
    expect(getExpiringSoonItems(items, today)).toEqual([]);
  });

  it('surfaces an item whose extended cover is what ends soon', () => {
    const items = [
      makeItem({ id: 'extended', expiryDate: '2024-01-01', coverageEndDate: '2026-06-10' }),
    ];

    // The manufacturer warranty expired two years ago; the extended cover ends in 21 days.
    expect(getExpiringSoonItems(items, today).map((item) => item.id)).toEqual(['extended']);
  });

  it('orders by when cover actually ends, not by the manufacturer expiry date', () => {
    const items = [
      makeItem({ id: 'later', expiryDate: '2026-05-22', coverageEndDate: '2026-06-10' }),
      makeItem({ id: 'sooner', expiryDate: '2026-06-15', coverageEndDate: '2026-05-25' }),
    ];

    expect(getExpiringSoonItems(items, today).map((item) => item.id)).toEqual(['sooner', 'later']);
  });

  it('does not expire an item whose manufacturer warranty has lapsed but whose extended cover runs', () => {
    const items = [
      makeItem({ id: 'extended', expiryDate: '2026-05-01', coverageEndDate: '2028-05-01' }),
    ];

    // Not expiring soon, and — the point — not expired either.
    expect(getExpiringSoonItems(items, today)).toEqual([]);
    expect(getWarrantyStatus(items[0].coverageEndDate, today)).toBe('active');
  });
});
