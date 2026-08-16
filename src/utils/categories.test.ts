import { i18n } from '../i18n/i18n';
import type { TranslateFn } from '../i18n/i18n';
import { CATEGORIES, DEFAULT_CATEGORY, getCategoryLabel, resolveCategory } from './categories';

const t: TranslateFn = (scope, options) => i18n.t(scope, { locale: 'en', ...options });

describe('CATEGORIES', () => {
  it('includes Other as the catch-all option', () => {
    expect(CATEGORIES).toContain('Other');
  });
});

describe('resolveCategory', () => {
  it('returns the selected category when provided', () => {
    expect(resolveCategory('Electronics')).toBe('Electronics');
  });

  it('defaults to Uncategorized when nothing is selected', () => {
    expect(resolveCategory(undefined)).toBe(DEFAULT_CATEGORY);
    expect(resolveCategory('')).toBe(DEFAULT_CATEGORY);
  });

  it('defaults to Uncategorized for whitespace-only input', () => {
    expect(resolveCategory('   ')).toBe(DEFAULT_CATEGORY);
  });
});

describe('getCategoryLabel', () => {
  it('translates each predefined category', () => {
    expect(getCategoryLabel('Electronics', t)).toBe('Electronics');
    expect(getCategoryLabel('Appliances', t)).toBe('Appliances');
    expect(getCategoryLabel('Furniture', t)).toBe('Furniture');
    expect(getCategoryLabel('Vehicles', t)).toBe('Vehicles');
    expect(getCategoryLabel('Other', t)).toBe('Other');
  });

  it('translates the default category', () => {
    expect(getCategoryLabel(DEFAULT_CATEGORY, t)).toBe('Uncategorized');
  });

  it('falls back to the raw value for an unrecognized category', () => {
    expect(getCategoryLabel('Some Custom Value', t)).toBe('Some Custom Value');
  });
});
