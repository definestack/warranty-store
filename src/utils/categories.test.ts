import { CATEGORIES, DEFAULT_CATEGORY, resolveCategory } from './categories';

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
