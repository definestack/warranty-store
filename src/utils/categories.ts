import type { TranslateFn } from '../i18n/i18n';

// Single source of truth for the predefined item categories (Phase 1, hardcoded per issue #5).
// These are the values persisted in SQLite — keep them stable across locales and only
// localize how they're displayed, via `getCategoryLabel`.
export const CATEGORIES = ['Electronics', 'Appliances', 'Furniture', 'Vehicles', 'Other'];

export const DEFAULT_CATEGORY = 'Uncategorized';

const CATEGORY_LABEL_KEYS: Record<string, string> = {
  Electronics: 'category.electronics',
  Appliances: 'category.appliances',
  Furniture: 'category.furniture',
  Vehicles: 'category.vehicles',
  Other: 'category.other',
  Uncategorized: 'category.uncategorized',
};

/** Resolves a user-selected category to a persistable value, defaulting when none was chosen. */
export function resolveCategory(selected?: string): string {
  const trimmed = selected?.trim();
  return trimmed ? trimmed : DEFAULT_CATEGORY;
}

/** Translated display label for a persisted category value; falls back to the raw value if unrecognized. */
export function getCategoryLabel(category: string, t: TranslateFn): string {
  const key = CATEGORY_LABEL_KEYS[category];
  return key ? t(key) : category;
}
