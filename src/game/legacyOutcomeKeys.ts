// SpecRef: 5.1.1 | Party State Machine | Notification (Clear / Return / Draw / Retreat / Defeat)
// Saves and runtime snapshots written before the outcome names were unified counted returns, draws, and retreats under
// `Turned_Back`, `Draw_Retreat`, and `Wounded_Retreat`. Loading upgrades those keys; nothing writes them any more.

const LEGACY_KEYS: ReadonlyArray<readonly [legacy: string, current: 'Return' | 'Draw' | 'Retreat']> = [
  ['Turned_Back', 'Return'], ['Draw_Retreat', 'Draw'], ['Wounded_Retreat', 'Retreat'],
];

/** Returns a copy of an outcome-count record with any legacy key renamed in place (a current key wins). */
export function upgradeLegacyOutcomeKeys(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const source = value as Record<string, unknown>;
  const renamed = new Map(LEGACY_KEYS);
  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(source)) {
    const current = renamed.get(key);
    if (!current) { result[key] = entry; continue; }
    // Keep the record's key order: the legacy key's position becomes the current key's position.
    if (typeof source[current] !== 'number') result[current] = entry;
  }
  return result;
}
