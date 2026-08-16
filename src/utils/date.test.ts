import { addMonths, formatIsoDate, getWarrantyStatus, toIsoDate } from './date';

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
