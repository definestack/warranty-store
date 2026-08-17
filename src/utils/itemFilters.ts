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

/** Items expiring within the next 30 days (not yet expired), sorted soonest-first, for the Home screen's "Expiring Soon" section. */
export function getExpiringSoonItems(items: WarrantyItem[], referenceDate: Date = new Date()): WarrantyItem[] {
  return items
    .filter((item) => getWarrantyStatus(item.expiryDate, referenceDate) === 'expiring')
    .sort((a, b) => getDaysRemaining(a.expiryDate, referenceDate) - getDaysRemaining(b.expiryDate, referenceDate));
}
