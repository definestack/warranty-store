import type { TranslateFn } from '../i18n/i18n';
import type { WarrantyDurationUnit } from '../types/warranty';
import type { WarrantyStatus } from './date';
import { addDays, addMonths, formatDaysRemaining, getDaysRemaining, getWarrantyStatus } from './date';

/**
 * A single cover period's own state. `upcoming` is the one state an item can never be in —
 * an item has no start date to be waiting on — which is why this widens `WarrantyStatus`
 * rather than replacing it. `getWarrantyStatus` still answers the item's question.
 */
export type PeriodStatus = WarrantyStatus | 'upcoming';

/**
 * The minimum a cover period has to expose for the arithmetic here. Declared structurally
 * so this module stays pure and does not depend on the stored extended warranty shape.
 */
export interface CoverageSpan {
  id: string;
  startsOn: string;
  endsOn: string;
}

/** Resolves a duration as the user entered it into whole months. */
export function resolveDurationMonths(value: number, unit: WarrantyDurationUnit): number {
  return unit === 'years' ? value * 12 : value;
}

/**
 * The last day a period covers: its start plus the whole duration, minus one day.
 *
 * The minus-one-day makes the period inclusive of both ends and exactly the stated length,
 * so cover beginning the day after a previous period ends tiles the timeline with no
 * uncovered and no doubly-covered day between them.
 *
 * `addMonths` is reused deliberately, so an extended warranty inherits the same
 * end-of-month overflow the manufacturer expiry date already has. One consistent quirk
 * beats two date rules that disagree.
 */
export function deriveCoverageEndDate(
  startsOn: string,
  durationValue: number,
  durationUnit: WarrantyDurationUnit
): string {
  return addDays(addMonths(startsOn, resolveDurationMonths(durationValue, durationUnit)), -1);
}

/**
 * How long the item is covered in total: the furthest of its manufacturer expiry date and
 * every extended period's end date. Derived rather than stored, so it cannot drift from
 * the periods it summarises.
 */
export function getCoverageEndDate(
  expiryDate: string,
  spans: Pick<CoverageSpan, 'endsOn'>[]
): string {
  // ISO YYYY-MM-DD strings order correctly under plain comparison.
  return spans.reduce((latest, span) => (span.endsOn > latest ? span.endsOn : latest), expiryDate);
}

/** Where the next extended warranty should start: the day after the current cover ends. */
export function getNextCoverageStartDate(
  expiryDate: string,
  spans: Pick<CoverageSpan, 'endsOn'>[]
): string {
  return addDays(getCoverageEndDate(expiryDate, spans), 1);
}

/**
 * An item's cover reduced to the ordered list of period end dates. Reminders are
 * rescheduled when this changes and left alone when it does not, which is what makes an
 * added or removed extended warranty trigger a reschedule even though the manufacturer
 * expiry date never moved.
 */
export function getCoverageSignature(
  expiryDate: string,
  spans: Pick<CoverageSpan, 'id' | 'endsOn'>[]
): string {
  return [`manufacturer:${expiryDate}`, ...spans.map((span) => `${span.id}:${span.endsOn}`)].join(
    '|'
  );
}

/** Classifies one cover period from its own dates, independently of the item's state. */
export function getPeriodStatus(
  startsOn: string,
  endsOn: string,
  referenceDate: Date = new Date()
): PeriodStatus {
  if (getDaysRemaining(startsOn, referenceDate) > 0) return 'upcoming';
  return getWarrantyStatus(endsOn, referenceDate);
}

/**
 * A period's countdown, which flips with its state: an upcoming period counts up to its
 * start date, everything else counts down to its end date.
 */
export function formatPeriodCountdown(
  startsOn: string,
  endsOn: string,
  t: TranslateFn,
  referenceDate: Date = new Date()
): string {
  const daysUntilStart = getDaysRemaining(startsOn, referenceDate);
  if (daysUntilStart > 0) return t('date.startsIn', { count: daysUntilStart });

  return formatDaysRemaining(endsOn, t, referenceDate);
}
