/** Parses a warranty-months form input; returns the positive integer or null if invalid. */
export function parseWarrantyMonths(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return parsed > 0 ? parsed : null;
}
