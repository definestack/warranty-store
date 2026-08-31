import type { WarrantyItem } from '../types/warranty';
import { RECENT_PRODUCTS_LIMIT, selectRecentProducts } from './recentProducts';

function makeItem(overrides: Partial<WarrantyItem> = {}): WarrantyItem {
  return {
    id: 'id-1',
    name: 'Item',
    purchaseDate: '2024-01-01',
    warrantyMonths: 12,
    expiryDate: '2025-01-01',
    invoiceDocuments: [],
    warrantyDocuments: [],
    extendedWarranties: [],
    coverageEndDate: '2025-01-01',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const jan = makeItem({ id: 'jan', name: 'Fridge', createdAt: '2025-01-04T09:00:00.000Z' });
const feb = makeItem({ id: 'feb', name: 'Sofa', createdAt: '2025-02-11T09:00:00.000Z' });
const mar = makeItem({ id: 'mar', name: 'Canon EOS R50', createdAt: '2025-03-02T09:00:00.000Z' });

describe('selectRecentProducts', () => {
  it('returns nothing for an empty list', () => {
    expect(selectRecentProducts([])).toEqual([]);
  });

  it('orders by when the item was added, newest first', () => {
    expect(selectRecentProducts([jan, mar, feb])).toEqual([mar, feb, jan]);
  });

  it('keeps at most RECENT_PRODUCTS_LIMIT items', () => {
    const items = Array.from({ length: RECENT_PRODUCTS_LIMIT + 3 }, (_, index) =>
      makeItem({ id: `id-${index}`, createdAt: `2025-03-0${index + 1}T09:00:00.000Z` })
    );

    const recent = selectRecentProducts(items);

    expect(recent).toHaveLength(RECENT_PRODUCTS_LIMIT);
    // The three oldest fall off the end.
    expect(recent.map((item) => item.id)).toEqual(['id-7', 'id-6', 'id-5', 'id-4', 'id-3']);
  });

  it('returns everything when there are fewer items than the limit', () => {
    expect(selectRecentProducts([jan, feb])).toHaveLength(2);
  });

  it('settles items added at the same moment by name, then id', () => {
    const sameMoment = '2025-03-02T09:00:00.000Z';
    const bravo = makeItem({ id: 'b', name: 'Bravo', createdAt: sameMoment });
    const alpha = makeItem({ id: 'a', name: 'alpha', createdAt: sameMoment });

    expect(selectRecentProducts([bravo, alpha]).map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('leaves the caller’s array untouched', () => {
    const items = [jan, mar, feb];

    selectRecentProducts(items);

    expect(items).toEqual([jan, mar, feb]);
  });
});
