import {
  addMonths,
  formatDaysRemaining,
  formatIsoDate,
  formatWarrantyDuration,
  getDaysRemaining,
  getWarrantyStatus,
  toIsoDate,
} from './date';

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

describe('formatIsoDate', () => {
  it('formats an ISO date as "D MMM YYYY"', () => {
    expect(formatIsoDate('2026-05-20')).toBe('20 May 2026');
  });

  it('pads single-digit days', () => {
    expect(formatIsoDate('2026-05-01')).toBe('01 May 2026');
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
    expect(formatDaysRemaining('2026-05-21', today)).toBe('Expires in 1 day');
  });

  it('formats multiple days remaining', () => {
    expect(formatDaysRemaining('2026-05-30', today)).toBe('Expires in 10 days');
  });

  it('formats expiry today', () => {
    expect(formatDaysRemaining('2026-05-20', today)).toBe('Expires today');
  });

  it('formats a single day since expiry without pluralizing', () => {
    expect(formatDaysRemaining('2026-05-19', today)).toBe('Expired 1 day ago');
  });

  it('formats multiple days since expiry', () => {
    expect(formatDaysRemaining('2026-05-10', today)).toBe('Expired 10 days ago');
  });
});

describe('formatWarrantyDuration', () => {
  it('formats a single month', () => {
    expect(formatWarrantyDuration(1)).toBe('1 month');
  });

  it('formats multiple months', () => {
    expect(formatWarrantyDuration(6)).toBe('6 months');
  });

  it('formats whole years as years', () => {
    expect(formatWarrantyDuration(12)).toBe('1 year');
    expect(formatWarrantyDuration(24)).toBe('2 years');
  });

  it('formats a non-whole-year month count as months even past a year', () => {
    expect(formatWarrantyDuration(18)).toBe('18 months');
  });
});
