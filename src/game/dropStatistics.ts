import type { Item, Party } from '../types/index.ts';

// SpecRef: 9.1.3 | Read | 2-1-4 party `dropStatistics` | what a party's own expeditions brought home, so a farm party can
// be judged: the Inventory does not say which party dropped an item.

export type PartyDropStats = NonNullable<Party['dropStats']>;

/** Enhancement values `+0` .. `+6`: `byEnhancement[n]` counts the kept drops at `+n`. */
const ENHANCEMENT_STEPS = 7;

const emptyDropStats = (): PartyDropStats => ({ items: 0, superRare: 0, autoSold: 0, byEnhancement: new Array(ENHANCEMENT_STEPS).fill(0) });

const count = (raw: unknown): number => (typeof raw === 'number' && Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0);

/** A saved value with every counter present and non-negative; absent (or malformed) gives all zeros. */
export function normalizePartyDropStats(raw: unknown): PartyDropStats {
  if (!raw || typeof raw !== 'object') return emptyDropStats();
  const value = raw as Record<string, unknown>;
  const steps = Array.isArray(value.byEnhancement) ? value.byEnhancement : [];
  return {
    items: count(value.items),
    superRare: count(value.superRare),
    autoSold: count(value.autoSold),
    byEnhancement: Array.from({ length: ENHANCEMENT_STEPS }, (_, step) => count(steps[step])),
  };
}

/**
 * Adds one finished expedition: the rewards the party kept (`items`, with `superRare` and `byEnhancement` over them) and the
 * drops Auto Sell sold during it (`autoSold`). A Defeat keeps nothing, so it adds nothing.
 */
export function addPartyDrops(stats: unknown, rewards: readonly Pick<Item, 'enhancement' | 'superRare'>[], autoSold: number): PartyDropStats {
  const next = normalizePartyDropStats(stats);
  next.items += rewards.length;
  next.autoSold += Math.max(0, autoSold);
  for (const item of rewards) {
    if (item.superRare > 0) next.superRare += 1;
    next.byEnhancement[Math.min(ENHANCEMENT_STEPS - 1, Math.max(0, item.enhancement))] += 1;
  }
  return next;
}
