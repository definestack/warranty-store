import { shouldShowAddFab } from './addFab';

describe('shouldShowAddFab', () => {
  it('hides the FAB on Home while nothing is tracked yet', () => {
    // The Home empty state carries its own "Add Product" button; two add affordances
    // on one empty screen is one too many.
    expect(shouldShowAddFab('Home', 0)).toBe(false);
  });

  it('shows the FAB on Home once a product exists', () => {
    expect(shouldShowAddFab('Home', 1)).toBe(true);
  });

  it('keeps the FAB on other tabs even with nothing tracked', () => {
    // Products and Settings have no add button of their own, so the FAB is the only
    // way in from there.
    expect(shouldShowAddFab('Products', 0)).toBe(true);
    expect(shouldShowAddFab('Settings', 0)).toBe(true);
  });
});
