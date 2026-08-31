import type { WarrantyItem } from '../types/warranty';
import { getWarrantyStatus } from './date';
import type { WarrantyStatus } from './date';
import { compareByNameThenId } from './itemFilters';

/** How many of the items needing attention the Home card lists. */
export const WARRANTY_ATTENTION_LIMIT = 3;

/**
 * Which of the Warranty Status card's three shapes the data calls for: nothing tracked
 * yet, everything comfortably in cover, or something the user should look at.
 */
export type WarrantyAttentionState = 'empty' | 'caughtUp' | 'needsAttention';

export interface WarrantyAttentionSummary {
  state: WarrantyAttentionState;
  expiredCount: number;
  expiringCount: number;
  /** Everything needing attention, not just what `items` shows. */
  attentionCount: number;
  /** The first `WARRANTY_ATTENTION_LIMIT` items in display order. */
  items: WarrantyItem[];
}

/**
 * Expired warranties are the more urgent bucket, so they lead, most recently lapsed
 * first — a warranty that ran out last week is likelier to still be claimable than one
 * that ran out last month. Expiring-soon items follow, soonest first.
 *
 * ISO YYYY-MM-DD strings order correctly under plain comparison, so the dates compare
 * directly rather than via `getDaysRemaining`.
 */
function compareByUrgency(a: WarrantyItem, b: WarrantyItem, aStatus: WarrantyStatus): number {
  return aStatus === 'expired'
    ? b.coverageEndDate.localeCompare(a.coverageEndDate)
    : a.coverageEndDate.localeCompare(b.coverageEndDate);
}

/**
 * Splits the items into the buckets the Home card reports on and returns the ordered
 * slice it renders. Pure: the input list is untouched, and `referenceDate` is injectable
 * so the ordering can be tested against a fixed day.
 */
export function summarizeWarrantyAttention(
  items: WarrantyItem[],
  referenceDate: Date = new Date()
): WarrantyAttentionSummary {
  const expired: WarrantyItem[] = [];
  const expiring: WarrantyItem[] = [];

  for (const item of items) {
    const status = getWarrantyStatus(item.coverageEndDate, referenceDate);
    if (status === 'expired') expired.push(item);
    else if (status === 'expiring') expiring.push(item);
  }

  const attentionCount = expired.length + expiring.length;
  const state: WarrantyAttentionState =
    attentionCount > 0 ? 'needsAttention' : items.length > 0 ? 'caughtUp' : 'empty';

  const sortBucket = (bucket: WarrantyItem[], status: WarrantyStatus) =>
    bucket.sort((a, b) => compareByUrgency(a, b, status) || compareByNameThenId(a, b));

  return {
    state,
    expiredCount: expired.length,
    expiringCount: expiring.length,
    attentionCount,
    items:
      state === 'needsAttention'
        ? [...sortBucket(expired, 'expired'), ...sortBucket(expiring, 'expiring')].slice(
            0,
            WARRANTY_ATTENTION_LIMIT
          )
        : [],
  };
}

/**
 * The product-list status filter the card's footer link opens. When both buckets are
 * present the expired one wins, being the more urgent of the two.
 */
export function getAttentionStatusFilter({
  expiredCount,
  expiringCount,
}: WarrantyAttentionSummary): WarrantyStatus | null {
  if (expiredCount > 0) return 'expired';
  if (expiringCount > 0) return 'expiring';
  return null;
}
