// Single source of truth for the predefined item categories (Phase 1, hardcoded per issue #5).
export const CATEGORIES = ['Electronics', 'Appliances', 'Furniture', 'Vehicles', 'Other'];

export const DEFAULT_CATEGORY = 'Uncategorized';

/** Resolves a user-selected category to a persistable value, defaulting when none was chosen. */
export function resolveCategory(selected?: string): string {
  const trimmed = selected?.trim();
  return trimmed ? trimmed : DEFAULT_CATEGORY;
}
