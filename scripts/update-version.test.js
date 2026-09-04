/**
 * Tests for the YYDOYBOD version code calculation
 * Run with: npm test scripts/update-version.test.js
 */

// Re-implement the functions for testing
function getDayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

function computeVersionCode(date, buildOfDay = 1) {
  const year = String(date.getFullYear()).slice(-2).padStart(2, '0');
  const doy = String(getDayOfYear(date)).padStart(3, '0');
  const bod = String(buildOfDay).padStart(4, '0');
  return parseInt(year + doy + bod, 10);
}

function parseVersionCode(versionCode) {
  const str = String(versionCode).padStart(9, '0');
  return {
    year: parseInt(str.substring(0, 2), 10),
    doy: parseInt(str.substring(2, 5), 10),
    bod: parseInt(str.substring(5, 9), 10),
  };
}

// Tests
describe('YYDOYBOD Version Code', () => {
  test('computes correct day of year for known dates', () => {
    // January 1 = day 1
    expect(getDayOfYear(new Date(2026, 0, 1))).toBe(1);

    // December 31 = day 365 (2026 is not a leap year)
    expect(getDayOfYear(new Date(2026, 11, 31))).toBe(365);

    // September 3, 2026 = day 246
    expect(getDayOfYear(new Date(2026, 8, 3))).toBe(246);
  });

  test('computes correct version code for Jan 1, 2026, build 1', () => {
    const code = computeVersionCode(new Date(2026, 0, 1), 1);
    const parsed = parseVersionCode(code);
    expect(code).toBe(260010001);
    expect(parsed.year).toBe(26);
    expect(parsed.doy).toBe(1);
    expect(parsed.bod).toBe(1);
  });

  test('increments build of day correctly', () => {
    const date = new Date(2026, 8, 3); // Sept 3
    const build1 = computeVersionCode(date, 1);
    const build2 = computeVersionCode(date, 2);
    const build3 = computeVersionCode(date, 3);

    expect(build2).toBe(build1 + 1);
    expect(build3).toBe(build2 + 1);
  });

  test('version codes are strictly increasing across days', () => {
    const day1 = computeVersionCode(new Date(2026, 0, 1), 9999);
    const day2 = computeVersionCode(new Date(2026, 0, 2), 1);
    expect(day2).toBeGreaterThan(day1);
  });

  test('parses version code correctly', () => {
    const parsed = parseVersionCode(262610001);
    expect(parsed.year).toBe(26);
    expect(parsed.doy).toBe(261);
    expect(parsed.bod).toBe(1);
  });

  test('parses padded version code correctly', () => {
    const parsed = parseVersionCode(100010001);
    expect(parsed.year).toBe(10);
    expect(parsed.doy).toBe(1);
    expect(parsed.bod).toBe(1);
  });
});
