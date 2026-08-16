/** Maximum length allowed for the free-text item notes field. */
export const NOTES_MAX_LENGTH = 500;

/** Parses a warranty-months form input; returns the positive integer or null if invalid. */
export function parseWarrantyMonths(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return parsed > 0 ? parsed : null;
}

/** Parses an optional price form input; returns undefined when empty or invalid (price is not required). */
export function parsePrice(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}
