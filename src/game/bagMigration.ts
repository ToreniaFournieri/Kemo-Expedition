import type { GameBags, RandomBag } from '../types/index.ts';
import {
  createCommonEnhancementBag,
  createCommonRewardBag,
  createCommonSuperRareBag,
  createEnhancementBag,
  createEpicRewardBag,
  createMagicalThreatBag,
  createMythicRewardBag,
  createPhysicalThreatBag,
  createRareRewardBag,
  createRareSuperRareBag,
  createSideQuestBag,
  createSuperRareBag,
  createUncommonRewardBag,
  normalizeBagForType,
  normalizeGameBags,
  type BagType,
} from './bags.ts';

export function migrateLegacyBag(
  rawBag: unknown,
  fallbackFactory: () => RandomBag,
  bagType: BagType,
): RandomBag {
  if (!rawBag || typeof rawBag !== 'object') {
    return normalizeBagForType(fallbackFactory(), bagType);
  }

  const bag = rawBag as { entries?: unknown; tickets?: unknown };
  if (Array.isArray(bag.entries)) {
    return normalizeBagForType({
      entries: bag.entries
        .map((entry) => {
          if (Array.isArray(entry) && entry.length >= 2) {
            const [id, tickets] = entry;
            if (typeof id === 'number' && typeof tickets === 'number') {
              return { id, tickets: Math.max(0, Math.floor(tickets)) };
            }
            return null;
          }
          if (entry && typeof entry === 'object' && 'id' in entry && 'tickets' in entry) {
            const typedEntry = entry as { id: unknown; tickets: unknown };
            return {
              id: typeof typedEntry.id === 'number' ? typedEntry.id : 0,
              tickets: Math.max(
                0,
                Math.floor(typeof typedEntry.tickets === 'number' ? typedEntry.tickets : 0),
              ),
            };
          }
          return null;
        })
        .filter((entry): entry is { id: number; tickets: number } => entry !== null),
    }, bagType);
  }

  if (Array.isArray(bag.tickets)) {
    const counter = new Map<number, number>();
    for (const ticket of bag.tickets) {
      if (typeof ticket !== 'number') continue;
      counter.set(ticket, (counter.get(ticket) ?? 0) + 1);
    }
    return normalizeBagForType({
      entries: Array.from(counter.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([id, tickets]) => ({ id, tickets })),
    }, bagType);
  }

  return normalizeBagForType(fallbackFactory(), bagType);
}

// SpecRef: 1.2 | Bag Randomization | `t.rare_reward_bag`, `t.epic_reward_bag`, `t.mythic_reward_bag`
// Saves written before the item rarity rename store these bags as `eliteRareRewardBag`, `bossRareRewardBag`, and
// `mythicRareRewardBag`. A current key wins over its legacy key.
const LEGACY_REWARD_BAG_KEYS: ReadonlyArray<readonly [legacy: string, current: keyof GameBags]> = [
  ['eliteRareRewardBag', 'rareRewardBag'],
  ['bossRareRewardBag', 'epicRewardBag'],
  ['mythicRareRewardBag', 'mythicRewardBag'],
];

/** Returns a copy of a bag collection with legacy reward bag keys renamed, or the same object when none is legacy. */
export function upgradeLegacyRewardBagKeys<T extends object>(bags: T): T {
  const source = bags as Record<string, unknown>;
  if (!LEGACY_REWARD_BAG_KEYS.some(([legacy]) => legacy in source)) return bags;
  const result: Record<string, unknown> = { ...source };
  for (const [legacy, current] of LEGACY_REWARD_BAG_KEYS) {
    if (!(legacy in result)) continue;
    if (result[current] === undefined) result[current] = result[legacy];
    delete result[legacy];
  }
  return result as T;
}

/** Canonical migration for save-level and Party-level legacy bag representations. */
export function normalizeImportedBags(rawBags: unknown): GameBags {
  const bags = rawBags && typeof rawBags === 'object'
    ? upgradeLegacyRewardBagKeys(rawBags as Record<string, unknown>)
    : {};
  return normalizeGameBags({
    commonRewardBag: migrateLegacyBag(
      bags.commonRewardBag,
      createCommonRewardBag,
      'commonRewardBag',
    ),
    commonEnhancementBag: migrateLegacyBag(
      bags.commonEnhancementBag,
      createCommonEnhancementBag,
      'commonEnhancementBag',
    ),
    uncommonRewardBag: migrateLegacyBag(
      bags.uncommonRewardBag,
      createUncommonRewardBag,
      'uncommonRewardBag',
    ),
    rareRewardBag: migrateLegacyBag(
      bags.rareRewardBag,
      createRareRewardBag,
      'rareRewardBag',
    ),
    epicRewardBag: migrateLegacyBag(
      bags.epicRewardBag,
      createEpicRewardBag,
      'epicRewardBag',
    ),
    mythicRewardBag: migrateLegacyBag(
      bags.mythicRewardBag,
      createMythicRewardBag,
      'mythicRewardBag',
    ),
    enhancementBag: migrateLegacyBag(
      bags.enhancementBag,
      createEnhancementBag,
      'enhancementBag',
    ),
    superRareBag: migrateLegacyBag(
      bags.superRareBag,
      createSuperRareBag,
      'superRareBag',
    ),
    commonSuperRareBag: migrateLegacyBag(
      bags.commonSuperRareBag ?? bags.superRareBag,
      createCommonSuperRareBag,
      'commonSuperRareBag',
    ),
    rareSuperRareBag: migrateLegacyBag(
      bags.rareSuperRareBag ?? bags.superRareBag,
      createRareSuperRareBag,
      'rareSuperRareBag',
    ),
    physicalThreatBag: migrateLegacyBag(
      bags.physicalThreatBag,
      createPhysicalThreatBag,
      'physicalThreatBag',
    ),
    magicalThreatBag: migrateLegacyBag(
      bags.magicalThreatBag,
      createMagicalThreatBag,
      'magicalThreatBag',
    ),
    sideQuestBag: migrateLegacyBag(
      bags.sideQuestBag,
      createSideQuestBag,
      'sideQuestBag',
    ),
  });
}
