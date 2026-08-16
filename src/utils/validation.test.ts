import { parseWarrantyMonths } from './validation';

describe('parseWarrantyMonths', () => {
  it('parses a valid positive integer string', () => {
    expect(parseWarrantyMonths('12')).toBe(12);
  });

  it('trims surrounding whitespace', () => {
    expect(parseWarrantyMonths('  24 ')).toBe(24);
  });

  it('rejects zero', () => {
    expect(parseWarrantyMonths('0')).toBeNull();
  });

  it('rejects negative numbers', () => {
    expect(parseWarrantyMonths('-5')).toBeNull();
  });

  it('rejects decimals', () => {
    expect(parseWarrantyMonths('1.5')).toBeNull();
  });

  it('rejects non-numeric input', () => {
    expect(parseWarrantyMonths('abc')).toBeNull();
  });

  it('rejects an empty string', () => {
    expect(parseWarrantyMonths('')).toBeNull();
  });
});
