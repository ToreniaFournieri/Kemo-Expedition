/**
 * Replaces an item's flat (d-stat) value without changing a similarly named
 * percentage (c-bonus), such as `Physical DEF +8%`.
 */
export function replaceFlatItemStat(
  statsText: string,
  label: string,
  replacement: string,
): string {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const flatStatPattern = new RegExp(`${escapedLabel}\\+[\\d,]+(?=\\s|$)`);
  return statsText.replace(flatStatPattern, replacement);
}
