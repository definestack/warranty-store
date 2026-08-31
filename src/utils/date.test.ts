import { i18n } from '../i18n/i18n';
import type { TranslateFn } from '../i18n/i18n';
import {
  addDays,
  addMonths,
  formatAddedAgo,
  formatDaysRemaining,
  formatIsoDate,
  formatWarrantyDuration,
  fromIsoDate,
  getDaysRemaining,
  getWarrantyStatus,
  toIsoDate,
} from './date';

const t: TranslateFn = (scope, options) => i18n.t(scope, { locale: 'en', ...options });

describe('addMonths', () => {
  it('adds whole months within the same year', () => {
    expect(addMonths('2026-01-15', 3)).toBe('2026-04-15');
  });

  it('rolls over into the next year', () => {
    expect(addMonths('2026-11-01', 3)).toBe('2027-02-01');
  });

  it('handles a zero-month warranty', () => {
    expect(addMonths('2026-05-20', 0)).toBe('2026-05-20');
  });

  it('clamps end-of-month overflow the same way Date does', () => {
    // Jan 31 + 1 month -> JS Date rolls into March 3 (Feb has 28 days in 2026).
    expect(addMonths('2026-01-31', 1)).toBe('2026-03-03');
  });
});

describe('addDays', () => {
  it('adds days within the same month', () => {
    expect(addDays('2026-05-09', 5)).toBe('2026-05-14');
  });

  it('subtracts days with a negative count', () => {
    expect(addDays('2026-05-09', -1)).toBe('2026-05-08');
  });

  it('rolls backwards across a month boundary', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('rolls forwards across a year boundary', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('toIsoDate', () => {
  it('formats a local date as YYYY-MM-DD without UTC shifting', () => {
    const date = new Date(2026, 4, 9); // 9 May 2026, local time
    expect(toIsoDate(date)).toBe('2026-05-09');
  });

  it('pads single-digit months and days', () => {
    const date = new Date(2026, 0, 5); // 5 Jan 2026
    expect(toIsoDate(date)).toBe('2026-01-05');
  });
});

describe('fromIsoDate', () => {
  it('parses an ISO date string into a local Date', () => {
    const date = fromIsoDate('2026-05-09');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(4);
    expect(date.getDate()).toBe(9);
  });

  it('round-trips with toIsoDate', () => {
    expect(toIsoDate(fromIsoDate('2026-01-05'))).toBe('2026-01-05');
  });
});

describe('formatIsoDate', () => {
  it('formats an ISO date as "D MMM YYYY" using the English locale by default', () => {
    expect(formatIsoDate('2026-05-20')).toBe('20 May 2026');
  });

  it('pads single-digit days', () => {
    expect(formatIsoDate('2026-05-01')).toBe('01 May 2026');
  });

  it('formats the month name in the requested locale', () => {
    expect(formatIsoDate('2026-05-20', 'fr')).toBe('20 mai 2026');
    expect(formatIsoDate('2026-05-20', 'de')).toBe('20. Mai 2026');
  });
});

describe('getWarrantyStatus', () => {
  const today = new Date(2026, 4, 20); // 20 May 2026, local time

  it('returns "active" when expiry is well in the future', () => {
    expect(getWarrantyStatus('2026-12-01', today)).toBe('active');
  });

  it('returns "expiring" when expiry is within 30 days', () => {
    expect(getWarrantyStatus('2026-06-10', today)).toBe('expiring');
  });

  it('returns "expiring" when expiry is today', () => {
    expect(getWarrantyStatus('2026-05-20', today)).toBe('expiring');
  });

  it('returns "expired" when expiry is in the past', () => {
    expect(getWarrantyStatus('2026-05-01', today)).toBe('expired');
  });

  it('treats the boundary (exactly 30 days out) as expiring', () => {
    expect(getWarrantyStatus('2026-06-19', today)).toBe('expiring');
  });

  it('treats 31 days out as active', () => {
    expect(getWarrantyStatus('2026-06-20', today)).toBe('active');
  });
});

describe('getDaysRemaining', () => {
  const today = new Date(2026, 4, 20); // 20 May 2026, local time

  it('returns a positive count for a future expiry', () => {
    expect(getDaysRemaining('2026-05-30', today)).toBe(10);
  });

  it('returns zero when expiry is today', () => {
    expect(getDaysRemaining('2026-05-20', today)).toBe(0);
  });

  it('returns a negative count for a past expiry', () => {
    expect(getDaysRemaining('2026-05-10', today)).toBe(-10);
  });
});

describe('formatDaysRemaining', () => {
  const today = new Date(2026, 4, 20); // 20 May 2026, local time

  it('formats a single day remaining without pluralizing', () => {
    expect(formatDaysRemaining('2026-05-21', t, today)).toBe('Expires in 1 day');
  });

  it('formats multiple days remaining', () => {
    expect(formatDaysRemaining('2026-05-30', t, today)).toBe('Expires in 10 days');
  });

  it('formats expiry today', () => {
    expect(formatDaysRemaining('2026-05-20', t, today)).toBe('Expires today');
  });

  it('formats a single day since expiry without pluralizing', () => {
    expect(formatDaysRemaining('2026-05-19', t, today)).toBe('Expired 1 day ago');
  });

  it('formats multiple days since expiry', () => {
    expect(formatDaysRemaining('2026-05-10', t, today)).toBe('Expired 10 days ago');
  });
});

describe('formatWarrantyDuration', () => {
  it('formats a single month', () => {
    expect(formatWarrantyDuration(1, t)).toBe('1 month');
  });

  it('formats multiple months', () => {
    expect(formatWarrantyDuration(6, t)).toBe('6 months');
  });

  it('formats whole years as years', () => {
    expect(formatWarrantyDuration(12, t)).toBe('1 year');
    expect(formatWarrantyDuration(24, t)).toBe('2 years');
  });

  it('formats a non-whole-year month count as months even past a year', () => {
    expect(formatWarrantyDuration(18, t)).toBe('18 months');
  });
});

describe('formatAddedAgo', () => {
  const today = new Date(2025, 5, 15); // 15 Jun 2025
  const added = (isoTimestamp: string) => formatAddedAgo(isoTimestamp, t, today);

  it('reads as today for something added earlier the same day', () => {
    expect(added('2025-06-15T08:30:00.000Z')).toBe('Added today');
  });

  it('treats a timestamp ahead of the reference day as today', () => {
    expect(added('2025-06-16T08:30:00.000Z')).toBe('Added today');
  });

  it('names yesterday rather than counting it', () => {
    expect(added('2025-06-14T08:30:00.000Z')).toBe('Added yesterday');
  });

  it('counts days within the first week', () => {
    expect(added('2025-06-13T08:30:00.000Z')).toBe('Added 2 days ago');
    expect(added('2025-06-10T08:30:00.000Z')).toBe('Added 5 days ago');
  });

  it('switches to weeks from seven days on', () => {
    expect(added('2025-06-08T08:30:00.000Z')).toBe('Added 1 week ago');
    expect(added('2025-06-01T08:30:00.000Z')).toBe('Added 2 weeks ago');
  });

  it('stays on weeks until a whole calendar month has passed', () => {
    // 30 days back, but not yet a month by the calendar.
    expect(added('2025-05-16T08:30:00.000Z')).toBe('Added 4 weeks ago');
  });

  it('switches to months on the calendar month boundary', () => {
    expect(added('2025-05-15T08:30:00.000Z')).toBe('Added 1 month ago');
    expect(added('2025-03-15T08:30:00.000Z')).toBe('Added 3 months ago');
    expect(added('2024-06-16T08:30:00.000Z')).toBe('Added 11 months ago');
  });

  it('switches to years at twelve months', () => {
    expect(added('2024-06-15T08:30:00.000Z')).toBe('Added 1 year ago');
    expect(added('2023-01-05T08:30:00.000Z')).toBe('Added 2 years ago');
  });
});
