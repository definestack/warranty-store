/**
 * Tests for the YYDOYBOD version code calculation and app.json sync
 * Run with: npm test scripts/update-version.test.js
 */

const {
  getDayOfYear,
  computeVersionCode,
  parseVersionCode,
  setAppJsonVersionCode,
} = require('./update-version');

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

describe('setAppJsonVersionCode', () => {
  test('sets expo.android.versionCode and leaves other fields unchanged', () => {
    const appJson = {
      expo: {
        name: 'Warranty Store',
        version: '1.0.3',
        android: {
          package: 'in.definestack.warrantystore',
          versionCode: 2,
          adaptiveIcon: { backgroundColor: '#FBFBFD' },
        },
        plugins: ['expo-sqlite'],
      },
    };

    const result = setAppJsonVersionCode(appJson, 263130001);

    expect(result.expo.android.versionCode).toBe(263130001);
    expect(result.expo.name).toBe('Warranty Store');
    expect(result.expo.version).toBe('1.0.3');
    expect(result.expo.android.package).toBe('in.definestack.warrantystore');
    expect(result.expo.android.adaptiveIcon).toEqual({ backgroundColor: '#FBFBFD' });
    expect(result.expo.plugins).toEqual(['expo-sqlite']);
  });

  test('does not mutate the input object', () => {
    const appJson = {
      expo: { version: '1.0.3', android: { versionCode: 2 } },
    };

    setAppJsonVersionCode(appJson, 263130001);

    expect(appJson.expo.android.versionCode).toBe(2);
  });

  test('creates expo.android when it is missing', () => {
    const appJson = { expo: { version: '1.0.3' } };

    const result = setAppJsonVersionCode(appJson, 263130001);

    expect(result.expo.android).toEqual({ versionCode: 263130001 });
  });
});
