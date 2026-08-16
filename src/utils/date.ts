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
