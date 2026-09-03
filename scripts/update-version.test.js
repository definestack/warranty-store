'use strict';

const { dayOfYear, computeNextVersionCode } = require('./update-version');

describe('dayOfYear', () => {
  it('returns 1 for January 1st', () => {
    expect(dayOfYear(new Date(2026, 0, 1))).toBe(1);
  });

  it('returns the correct day for a mid-year date', () => {
    // Sept 18 2026 is the 261st day of the year (non-leap).
    expect(dayOfYear(new Date(2026, 8, 18))).toBe(261);
  });

  it('returns 366 for Dec 31st of a leap year', () => {
    expect(dayOfYear(new Date(2028, 11, 31))).toBe(366);
  });
});

describe('computeNextVersionCode', () => {
  it('resets the build segment to 0001 on a later day', () => {
    const lastCode = 262610001; // 2026, day 261, build 0001
    const laterDate = new Date(2026, 8, 19); // day 262
    expect(computeNextVersionCode(laterDate, lastCode)).toBe(262620001);
  });

  it('increments the build segment for a same-day rebuild', () => {
    const lastCode = 262610001; // 2026, day 261, build 0001
    const sameDay = new Date(2026, 8, 18); // day 261
    expect(computeNextVersionCode(sameDay, lastCode)).toBe(262610002);
  });

  it('keeps incrementing across multiple same-day rebuilds', () => {
    const sameDay = new Date(2026, 8, 18);
    let code = 262610001;
    code = computeNextVersionCode(sameDay, code);
    code = computeNextVersionCode(sameDay, code);
    expect(code).toBe(262610003);
  });

  it('still strictly increases when the clock moves backwards', () => {
    const lastCode = 262620005; // day 262, build 0005
    const earlierDate = new Date(2026, 8, 18); // day 261 (earlier than lastCode's day)
    expect(computeNextVersionCode(earlierDate, lastCode)).toBe(262620006);
  });
});
