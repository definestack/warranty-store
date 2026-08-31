import type { WarrantyItem } from '../types/warranty';
import { compareByNameThenId } from './itemFilters';

/**
 * How many items the Home dashboard's Recent Products section lists.
 *
 * Five rather than the Warranty Status card's three, because the two sections do
 * different jobs. That card is triage: it is deliberately short, urgency-ordered, and
 * pushes the rest behind a filtered link. This one is recall — getting back to something
 * just added — and it only works if the item the user is reaching for is actually on it.
 * Items arrive in bursts (an unboxing, a shopping trip, an evening spent catching up on a
 * backlog of receipts), so three would routinely bury the earlier half of a session's work
 * behind the full product list.
 */
export const RECENT_PRODUCTS_LIMIT = 5;

/**
 * The most recently added items, newest first — the same ordering as the product list's
 * default "Newest" sort, so the two agree on what "recent" means. Pure: returns a new
 * array and leaves the input untouched.
 */
export function selectRecentProducts(
  items: WarrantyItem[],
  limit: number = RECENT_PRODUCTS_LIMIT
): WarrantyItem[] {
  return [...items]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || compareByNameThenId(a, b))
    .slice(0, limit);
}
