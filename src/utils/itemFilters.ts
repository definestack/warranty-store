import type { TranslateFn } from '../i18n/i18n';
import type { WarrantyItem } from '../types/warranty';
import { DEFAULT_CATEGORY } from './categories';
import { getWarrantyStatus } from './date';
import type { WarrantyStatus } from './date';

export const ALL_CATEGORIES = 'all';

export interface ItemFilters {
  search: string;
  category: string;
}

/** Filters items by name (case-insensitive substring) and category, for the product list. */
export function filterItems(items: WarrantyItem[], { search, category }: ItemFilters): WarrantyItem[] {
  const query = search.trim().toLowerCase();
  return items.filter((item) => {
    const itemCategory = item.category ?? DEFAULT_CATEGORY;
    const matchesCategory = category === ALL_CATEGORIES || itemCategory === category;
    const matchesSearch = item.name.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });
}

/** The "no status filter" sentinel, matching `ALL_CATEGORIES`'s role for categories. */
export const ALL_STATUSES = 'all';

export type StatusFilter = typeof ALL_STATUSES | WarrantyStatus;

/** The status chips on the product list, in the order they are shown. */
export const STATUS_FILTERS: StatusFilter[] = [ALL_STATUSES, 'active', 'expiring', 'expired'];

export type ProductSort =
  | 'newest'
  | 'oldest'
  | 'nameAsc'
  | 'priceDesc'
  | 'expirySoonest'
  | 'expiryLatest';

/** The sort options on the product list, in the order they are offered. */
export const PRODUCT_SORTS: ProductSort[] = [
  'newest',
  'oldest',
  'nameAsc',
  'priceDesc',
  'expirySoonest',
  'expiryLatest',
];

export const DEFAULT_PRODUCT_SORT: ProductSort = 'newest';

const STATUS_FILTER_LABEL_KEYS: Record<StatusFilter, string> = {
  all: 'status.all',
  active: 'status.active',
  expiring: 'status.expiringSoon',
  expired: 'status.expired',
};

const SORT_LABEL_KEYS: Record<ProductSort, string> = {
  newest: 'sort.newest',
  oldest: 'sort.oldest',
  nameAsc: 'sort.nameAsc',
  priceDesc: 'sort.priceDesc',
  expirySoonest: 'sort.expirySoonest',
  expiryLatest: 'sort.expiryLatest',
};

export function getStatusFilterLabel(status: StatusFilter, t: TranslateFn): string {
  return t(STATUS_FILTER_LABEL_KEYS[status]);
}

export function getSortLabel(sort: ProductSort, t: TranslateFn): string {
  return t(SORT_LABEL_KEYS[sort]);
}

export interface ProductListOptions extends ItemFilters {
  status: StatusFilter;
  sort: ProductSort;
}

function compareStrings(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/**
 * The tie-break every sort ends with, so equal keys never reorder between renders:
 * name first, then id, which is unique.
 */
function compareFallback(a: WarrantyItem, b: WarrantyItem): number {
  return (
    compareStrings(a.name.toLowerCase(), b.name.toLowerCase()) || compareStrings(a.id, b.id)
  );
}

/**
 * Price is optional, so an item without one has no place on a price scale: it sorts after
 * every priced item whichever way the prices themselves run.
 */
function comparePrice(a: WarrantyItem, b: WarrantyItem): number {
  if (a.price === undefined && b.price === undefined) return 0;
  if (a.price === undefined) return 1;
  if (b.price === undefined) return -1;
  return b.price - a.price;
}

const SORT_COMPARATORS: Record<ProductSort, (a: WarrantyItem, b: WarrantyItem) => number> = {
  newest: (a, b) => compareStrings(b.createdAt, a.createdAt),
  oldest: (a, b) => compareStrings(a.createdAt, b.createdAt),
  // A–Z is the fallback comparator on its own — name, then id.
  nameAsc: () => 0,
  priceDesc: comparePrice,
  // ISO YYYY-MM-DD strings order correctly under plain comparison.
  expirySoonest: (a, b) => compareStrings(a.coverageEndDate, b.coverageEndDate),
  expiryLatest: (a, b) => compareStrings(b.coverageEndDate, a.coverageEndDate),
};

/**
 * The full product list pipeline: search, status and category filters compose, then the
 * chosen sort is applied to what survives. Returns a new array; the input is untouched.
 */
export function filterAndSortItems(
  items: WarrantyItem[],
  { search, category, status, sort }: ProductListOptions,
  referenceDate: Date = new Date()
): WarrantyItem[] {
  const filtered = filterItems(items, { search, category }).filter(
    (item) =>
      status === ALL_STATUSES || getWarrantyStatus(item.coverageEndDate, referenceDate) === status
  );

  const compare = SORT_COMPARATORS[sort];
  return filtered.sort((a, b) => compare(a, b) || compareFallback(a, b));
}
