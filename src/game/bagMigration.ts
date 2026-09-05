import type { GameBags, RandomBag } from '../types/index.ts';
import {
  createBossRareRewardBag,
  createCommonEnhancementBag,
  createCommonRewardBag,
  createCommonSuperRareBag,
  createEliteRareRewardBag,
  createEnhancementBag,
  createMagicalThreatBag,
  createMythicRareRewardBag,
  createPhysicalThreatBag,
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

/** Canonical migration for save-level and Party-level legacy bag representations. */
export function normalizeImportedBags(rawBags: unknown): GameBags {
  const bags = rawBags && typeof rawBags === 'object'
    ? rawBags as Record<string, unknown>
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
    eliteRareRewardBag: migrateLegacyBag(
      bags.eliteRareRewardBag,
      createEliteRareRewardBag,
      'eliteRareRewardBag',
    ),
    bossRareRewardBag: migrateLegacyBag(
      bags.bossRareRewardBag,
      createBossRareRewardBag,
      'bossRareRewardBag',
    ),
    mythicRareRewardBag: migrateLegacyBag(
      bags.mythicRareRewardBag,
      createMythicRareRewardBag,
      'mythicRareRewardBag',
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
