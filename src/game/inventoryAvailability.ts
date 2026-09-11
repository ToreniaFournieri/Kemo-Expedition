export function hasNewAvailability(
  previous: Record<string, unknown> | undefined,
  next: Record<string, unknown> | undefined,
  changedKeys?: readonly string[],
): boolean {
  // SpecRef: 7.1.2.1 | Dirty check | equipmentInventoryRevision
  // Identical records expose identical counts, including the AFK overlay Proxy.
  // Compare a changed overlay against its distinct base at the Chunk boundary;
  // inventory-neutral actions need no enumeration of that shared overlay.
  if (previous === next) return false;
  const countOf = (value: unknown): number => {
    if (typeof value === 'number') return value;
    if (value && typeof value === 'object' && typeof (value as { count?: unknown }).count === 'number') {
      return (value as { count: number }).count;
    }
    return 0;
  };
  return (changedKeys ?? Object.keys(next ?? {})).some((key) => countOf(previous?.[key]) <= 0 && countOf(next?.[key]) > 0);
}

