import type { TranslateFn } from '../i18n/i18n';

/** Adds `months` to an ISO date string (YYYY-MM-DD) and returns an ISO date string. */
export function addMonths(isoDate: string, months: number): string {
  const date = new Date(isoDate);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

/**
 * Adds `days` to an ISO date string (YYYY-MM-DD). Negative values subtract. Unlike
 * `addMonths` this works in local time, so it never shifts a day across a timezone.
 */
export function addDays(isoDate: string, days: number): string {
  const date = fromIsoDate(isoDate);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Converts a Date to a local YYYY-MM-DD string (avoids UTC day-shift from toISOString). */
export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Parses a YYYY-MM-DD string into a local Date (inverse of `toIsoDate`, avoids UTC day-shift). */
export function fromIsoDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Intl resolves the bare "en" tag to US month-first ordering; map it to "en-GB" so
// English keeps the day-first "20 May 2026" style the rest of the app's UI uses.
const DATE_FORMAT_LOCALES: Record<string, string> = { en: 'en-GB' };

/** Formats a Date using Intl in the given locale, e.g. "20 May 2026". */
export function formatDate(date: Date, locale = 'en'): string {
  const intlLocale = DATE_FORMAT_LOCALES[locale] ?? locale;
  return new Intl.DateTimeFormat(intlLocale, { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

/** Formats an ISO date string (YYYY-MM-DD) in the given locale, without any timezone conversion. */
export function formatIsoDate(isoDate: string, locale = 'en'): string {
  return formatDate(fromIsoDate(isoDate), locale);
}

export type WarrantyStatus = 'active' | 'expiring' | 'expired';

const EXPIRING_SOON_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Classifies a warranty as active, expiring soon (within 30 days), or expired, relative to `referenceDate`. */
export function getWarrantyStatus(expiryDate: string, referenceDate: Date = new Date()): WarrantyStatus {
  const daysUntilExpiry = getDaysRemaining(expiryDate, referenceDate);

  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= EXPIRING_SOON_DAYS) return 'expiring';
  return 'active';
}

/** Days between `referenceDate` and `expiryDate`; negative once the warranty has expired. */
export function getDaysRemaining(expiryDate: string, referenceDate: Date = new Date()): number {
  const [year, month, day] = expiryDate.split('-').map(Number);
  const expiry = new Date(year, month - 1, day);
  const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());

  return Math.round((expiry.getTime() - today.getTime()) / MS_PER_DAY);
}

/** Human-readable days-remaining label, e.g. "Expires in 10 days" or "Expired 1 day ago". */
export function formatDaysRemaining(expiryDate: string, t: TranslateFn, referenceDate: Date = new Date()): string {
  const days = getDaysRemaining(expiryDate, referenceDate);

  if (days === 0) return t('date.expiresToday');
  if (days > 0) return t('date.expiresIn', { count: days });

  return t('date.expiredAgo', { count: Math.abs(days) });
}

/** Formats a warranty duration in months as e.g. "6 months" or "2 years" for whole-year durations. */
export function formatWarrantyDuration(months: number, t: TranslateFn): string {
  if (months >= 12 && months % 12 === 0) {
    return t('duration.years', { count: months / 12 });
  }
  return t('duration.months', { count: months });
}
