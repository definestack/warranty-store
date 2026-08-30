import type { WarrantyItem } from '../types/warranty';
import { DEFAULT_CATEGORY } from './categories';
import { getDaysRemaining, getWarrantyStatus } from './date';

export const ALL_CATEGORIES = 'all';

interface ItemFilters {
  search: string;
  category: string;
}

/** Filters items by name (case-insensitive substring) and category, for the Home screen list. */
export function filterItems(items: WarrantyItem[], { search, category }: ItemFilters): WarrantyItem[] {
  const query = search.trim().toLowerCase();
  return items.filter((item) => {
    const itemCategory = item.category ?? DEFAULT_CATEGORY;
    const matchesCategory = category === ALL_CATEGORIES || itemCategory === category;
    const matchesSearch = item.name.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });
}

/**
 * Items whose cover ends within the next 30 days (not yet ended), sorted soonest-first,
 * for the Home screen's "Expiring Soon" section.
 *
 * Read from the coverage end date, not the manufacturer expiry date: an item carried by an
 * extended warranty is not expiring just because its manufacturer cover is.
 */
export function getExpiringSoonItems(items: WarrantyItem[], referenceDate: Date = new Date()): WarrantyItem[] {
  return items
    .filter((item) => getWarrantyStatus(item.coverageEndDate, referenceDate) === 'expiring')
    .sort(
      (a, b) =>
        getDaysRemaining(a.coverageEndDate, referenceDate) -
        getDaysRemaining(b.coverageEndDate, referenceDate)
    );
}
