import { i18n } from '../i18n/i18n';
import type { TranslateFn } from '../i18n/i18n';
import {
  deriveCoverageEndDate,
  formatPeriodCountdown,
  getCoverageEndDate,
  getCoverageSignature,
  getNextCoverageStartDate,
  getPeriodStatus,
  resolveDurationMonths,
} from './coverage';
import { addDays, addMonths, getWarrantyStatus } from './date';

const t: TranslateFn = (scope, options) => i18n.t(scope, { locale: 'en', ...options });

describe('resolveDurationMonths', () => {
  it('passes a duration in months straight through', () => {
    expect(resolveDurationMonths(24, 'months')).toBe(24);
    expect(resolveDurationMonths(6, 'months')).toBe(6);
  });

  it('multiplies a duration in years by twelve', () => {
    expect(resolveDurationMonths(2, 'years')).toBe(24);
    expect(resolveDurationMonths(1, 'years')).toBe(12);
  });

  it('agrees between the two units for the same span', () => {
    expect(resolveDurationMonths(3, 'years')).toBe(resolveDurationMonths(36, 'months'));
  });
});

describe('deriveCoverageEndDate', () => {
  it('ends one day short of the start plus the duration', () => {
    expect(deriveCoverageEndDate('2027-08-28', 24, 'months')).toBe('2029-08-27');
  });

  it('gives the same end date whether the duration is entered in years or months', () => {
    expect(deriveCoverageEndDate('2027-08-28', 2, 'years')).toBe(
      deriveCoverageEndDate('2027-08-28', 24, 'months')
    );
  });

  it('tiles with the next period, leaving no gap and no overlap', () => {
    const start = '2026-01-01';
    const end = deriveCoverageEndDate(start, 12, 'months');

    expect(end).toBe('2026-12-31');
    // The day after this period ends is exactly the start plus the whole duration,
    // so consecutive periods cover every day once and only once.
    expect(addDays(end, 1)).toBe(addMonths(start, 12));
  });

  it('inherits addMonths end-of-month overflow rather than clamping it', () => {
    // Jan 31 + 1 month rolls to Mar 3 (see date.ts), so the period ends the day before.
    expect(deriveCoverageEndDate('2026-01-31', 1, 'months')).toBe('2026-03-02');
  });
});

describe('getCoverageEndDate', () => {
  it('is the manufacturer expiry date when there is no extended cover', () => {
    expect(getCoverageEndDate('2027-08-27', [])).toBe('2027-08-27');
  });

  it('is the extended end date when the extended cover runs longer', () => {
    expect(getCoverageEndDate('2027-08-27', [{ endsOn: '2029-08-27' }])).toBe('2029-08-27');
  });

  it('stays the manufacturer expiry date when the extended cover ends sooner', () => {
    expect(getCoverageEndDate('2027-08-27', [{ endsOn: '2026-12-31' }])).toBe('2027-08-27');
  });

  it('is the latest of several extended periods', () => {
    expect(
      getCoverageEndDate('2027-08-27', [
        { endsOn: '2028-06-30' },
        { endsOn: '2030-01-15' },
        { endsOn: '2029-08-27' },
      ])
    ).toBe('2030-01-15');
  });
});

describe('getNextCoverageStartDate', () => {
  it('is the day after the manufacturer warranty ends when there is no extended cover', () => {
    expect(getNextCoverageStartDate('2027-08-27', [])).toBe('2027-08-28');
  });

  it('is the day after the last extended period ends', () => {
    expect(getNextCoverageStartDate('2027-08-27', [{ endsOn: '2029-08-27' }])).toBe('2029-08-28');
  });

  it('crosses a year boundary', () => {
    expect(getNextCoverageStartDate('2026-12-31', [])).toBe('2027-01-01');
  });
});

describe('getCoverageSignature', () => {
  const spans = [{ id: 'ew-1', endsOn: '2029-08-27' }];

  it('is stable for unchanged cover', () => {
    expect(getCoverageSignature('2027-08-27', spans)).toBe(
      getCoverageSignature('2027-08-27', spans)
    );
  });

  it('changes when an extended period is added', () => {
    expect(getCoverageSignature('2027-08-27', spans)).not.toBe(
      getCoverageSignature('2027-08-27', [...spans, { id: 'ew-2', endsOn: '2031-08-27' }])
    );
  });

  it('changes when an extended period is removed', () => {
    expect(getCoverageSignature('2027-08-27', spans)).not.toBe(
      getCoverageSignature('2027-08-27', [])
    );
  });

  it('changes when an existing period moves its end date', () => {
    expect(getCoverageSignature('2027-08-27', spans)).not.toBe(
      getCoverageSignature('2027-08-27', [{ id: 'ew-1', endsOn: '2030-08-27' }])
    );
  });

  it('changes when the manufacturer expiry date moves', () => {
    expect(getCoverageSignature('2027-08-27', spans)).not.toBe(
      getCoverageSignature('2027-09-27', spans)
    );
  });
});

describe('getPeriodStatus', () => {
  const now = new Date(2026, 7, 30); // 30 Aug 2026, local

  it('is upcoming while the start date is still ahead', () => {
    expect(getPeriodStatus('2027-08-28', '2029-08-27', now)).toBe('upcoming');
  });

  it('stops being upcoming on the start date itself', () => {
    expect(getPeriodStatus('2026-08-30', '2029-08-27', now)).toBe('active');
  });

  it('is expired once the end date has passed', () => {
    expect(getPeriodStatus('2024-01-01', '2026-08-29', now)).toBe('expired');
  });

  it('is still running on the end date itself', () => {
    expect(getPeriodStatus('2024-01-01', '2026-08-30', now)).toBe('expiring');
  });

  it('is expiring when the end date is inside the near-expiry window', () => {
    expect(getPeriodStatus('2024-01-01', '2026-09-15', now)).toBe('expiring');
  });

  it('is active when the end date is beyond the near-expiry window', () => {
    expect(getPeriodStatus('2024-01-01', '2027-08-27', now)).toBe('active');
  });
});

describe('formatPeriodCountdown', () => {
  const now = new Date(2026, 7, 30); // 30 Aug 2026, local

  it('counts up to the start date for an upcoming period', () => {
    expect(formatPeriodCountdown('2026-09-04', '2028-09-03', t, now)).toBe('Starts in 5 days');
  });

  it('counts down to the end date for a running period', () => {
    expect(formatPeriodCountdown('2024-01-01', '2026-09-09', t, now)).toBe('Expires in 10 days');
  });

  it('counts down for a period starting today rather than up', () => {
    expect(formatPeriodCountdown('2026-08-30', '2026-09-09', t, now)).toBe('Expires in 10 days');
  });

  it('reports how long ago an expired period ended', () => {
    expect(formatPeriodCountdown('2024-01-01', '2026-08-29', t, now)).toBe('Expired 1 day ago');
  });
});

describe('a period’s state and the item’s state are independent', () => {
  const now = new Date(2026, 7, 30); // 30 Aug 2026, local

  it('keeps an item covered while its only extended period is still upcoming', () => {
    const expiryDate = '2026-08-20'; // manufacturer cover already lapsed
    const spans = [{ id: 'ew-1', startsOn: '2027-01-01', endsOn: '2029-01-01' }];

    expect(getPeriodStatus(spans[0].startsOn, spans[0].endsOn, now)).toBe('upcoming');
    expect(getWarrantyStatus(getCoverageEndDate(expiryDate, spans), now)).toBe('active');
  });

  it('does not let an expired manufacturer period expire the item', () => {
    const expiryDate = '2026-08-20';
    const spans = [{ id: 'ew-1', startsOn: '2026-08-21', endsOn: '2028-08-20' }];

    expect(getPeriodStatus('2024-08-21', expiryDate, now)).toBe('expired');
    expect(getWarrantyStatus(getCoverageEndDate(expiryDate, spans), now)).toBe('active');
  });
});
