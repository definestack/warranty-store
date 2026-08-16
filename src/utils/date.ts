/** Adds `months` to an ISO date string (YYYY-MM-DD) and returns an ISO date string. */
export function addMonths(isoDate: string, months: number): string {
  const date = new Date(isoDate);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
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

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** Formats an ISO date string (YYYY-MM-DD) as "20 May 2026" without any timezone conversion. */
export function formatIsoDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return `${String(day).padStart(2, '0')} ${MONTH_LABELS[month - 1]} ${year}`;
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
export function formatDaysRemaining(expiryDate: string, referenceDate: Date = new Date()): string {
  const days = getDaysRemaining(expiryDate, referenceDate);

  if (days === 0) return 'Expires today';
  if (days > 0) return `Expires in ${days} day${days === 1 ? '' : 's'}`;

  const daysAgo = Math.abs(days);
  return `Expired ${daysAgo} day${daysAgo === 1 ? '' : 's'} ago`;
}

/** Formats a warranty duration in months as e.g. "6 months" or "2 years" for whole-year durations. */
export function formatWarrantyDuration(months: number): string {
  if (months >= 12 && months % 12 === 0) {
    const years = months / 12;
    return `${years} year${years === 1 ? '' : 's'}`;
  }
  return `${months} month${months === 1 ? '' : 's'}`;
}
