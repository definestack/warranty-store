import { parsePrice, parseWarrantyMonths } from './validation';

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

describe('parsePrice', () => {
  it('parses a valid positive integer string', () => {
    expect(parsePrice('1500')).toBe(1500);
  });

  it('parses a decimal amount', () => {
    expect(parsePrice('1499.99')).toBe(1499.99);
  });

  it('trims surrounding whitespace', () => {
    expect(parsePrice('  2000 ')).toBe(2000);
  });

  it('accepts zero', () => {
    expect(parsePrice('0')).toBe(0);
  });

  it('treats an empty string as no price entered', () => {
    expect(parsePrice('')).toBeUndefined();
  });

  it('treats whitespace-only input as no price entered', () => {
    expect(parsePrice('   ')).toBeUndefined();
  });

  it('rejects negative numbers', () => {
    expect(parsePrice('-5')).toBeUndefined();
  });

  it('rejects non-numeric input', () => {
    expect(parsePrice('abc')).toBeUndefined();
  });
});
