import { getIdentifiedShopItemPrice, getShopItemPrice as getTierShopItemPrice } from './pricing';
import { refillBagIfEmpty } from './bags';
import { createApiRandom, gameplayRandom } from './gameplayRandom';
import { drawFromBagWithRandom } from './weightedBag';
import { DUNGEONS } from '../data/dungeons';
import { ITEMS } from '../data/items';
import type { GameBags, Item, Party } from '../types';

const SHOP_REFRESH_BASE_PRICE = 200;
const SHOP_REFRESH_HOURS = [2, 10, 18] as const;

function getRefreshDateAt(base: Date, hour: number): Date {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), hour, 0, 0, 0);
}

// SpecRef: 8.4.1 | Shop (お店) | getCurrentShopRefreshDate
export function getCurrentShopRefreshDate(now: Date): Date {
  for (let index = SHOP_REFRESH_HOURS.length - 1; index >= 0; index -= 1) {
    const hour = SHOP_REFRESH_HOURS[index];
    const candidate = getRefreshDateAt(now, hour);
    if (now >= candidate) {
      return candidate;
    }
  }

  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  return getRefreshDateAt(yesterday, SHOP_REFRESH_HOURS[SHOP_REFRESH_HOURS.length - 1]);
}

// SpecRef: 8.4.1 | Shop (お店) | getNextShopRefreshDate
export function getNextShopRefreshDate(now: Date): Date {
  for (const hour of SHOP_REFRESH_HOURS) {
    const candidate = getRefreshDateAt(now, hour);
    if (candidate > now) {
      return candidate;
    }
  }

  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return getRefreshDateAt(tomorrow, SHOP_REFRESH_HOURS[0]);
}

// SpecRef: 8.4.1 | Shop (お店) | countElapsedShopRefreshes
export function countElapsedShopRefreshes(fromTimestamp: number, now: Date): number {
  if (!Number.isFinite(fromTimestamp) || fromTimestamp <= 0) return 0;
  const from = new Date(fromTimestamp);
  if (from >= now) return 0;

  let count = 0;
  let cursor = getNextShopRefreshDate(from);
  while (cursor <= now) {
    count += 1;
    cursor = getNextShopRefreshDate(new Date(cursor.getTime() + 1));
  }
  return count;
}

// SpecRef: 8.4.1 | Shop (お店) | getShopHourKey
export function getShopHourKey(now: Date): string {
  const refreshDate = getCurrentShopRefreshDate(now);
  return `${refreshDate.getFullYear()}${String(refreshDate.getMonth() + 1).padStart(2, '0')}${String(refreshDate.getDate()).padStart(2, '0')}${String(refreshDate.getHours()).padStart(2, '0')}`;
}

// SpecRef: 8.4.1 | Shop (お店) | getShopLineupSeed
export function getShopLineupSeed(now: Date, refreshCount: number): number {
  const hourSeed = Number(getShopHourKey(now));
  return hourSeed + (Math.max(0, refreshCount) * 997);
}

// SpecRef: 8.4.1 | Shop (お店) | getShopStockKey
export function getShopStockKey(now: Date, refreshCount: number): string {
  return `${getShopHourKey(now)}-${Math.max(0, refreshCount)}`;
}

// SpecRef: 8.4.1 | Shop (お店) | Paid Refresh (有償洗替)
export function getShopRefreshPrice(refreshCount: number): number {
  return SHOP_REFRESH_BASE_PRICE * (2 ** Math.max(0, refreshCount));
}

// SpecRef: 8.4.1 | Shop (お店) | getShopItemPrice
export function getShopItemPrice(itemId: number): number {
  return getTierShopItemPrice(itemId);
}

/** The Shop's lineup: identified slots first, then unidentified slots (7 in all). A slot's public ID is its 1-based position. */
export const SHOP_SLOT_COUNT = 7;
/** Intimacy is capped at 99 until the boss of expedition 7 is defeated, then at 199 (SpecRef: 8.4.1 | Shop (お店) | Intimacy Cap). */
export const SHOP_INTIMACY_CAP_BEFORE_UNLOCK = 99;
export const SHOP_INTIMACY_CAP_AFTER_UNLOCK = 199;
export const SHOP_INTIMACY_UNLOCK_EXPEDITION_ID = 7;

export function getShopIntimacyCap(parties: Pick<Party, 'defeatedBossExpeditions'>[]): number {
  const unlocked = parties.some((party) => Boolean(party.defeatedBossExpeditions?.[SHOP_INTIMACY_UNLOCK_EXPEDITION_ID]));
  return unlocked ? SHOP_INTIMACY_CAP_AFTER_UNLOCK : SHOP_INTIMACY_CAP_BEFORE_UNLOCK;
}
const SHOP_IDENTIFIED_ENHANCEMENT_MINIMUM = 2;
const SHOP_IDENTIFIED_SUPER_RARE_DRAWS = 10;
const SHOP_UNIDENTIFIED_SUPER_RARE_DRAWS = 20;

export type ShopEntryRarity = 'common' | 'uncommon' | 'eliteRare' | 'bossRare';

/**
 * One stock entry of a generated lineup. Identified entries carry the enhancement and Super Rare title rolled when the
 * lineup was generated; for unidentified entries both are 0 here and are rolled when the entry is bought.
 */
export interface ShopStockEntry {
  itemId: number;
  identified: boolean;
  enhancement: number;
  superRare: number;
  price: number;
}

/** The saved lineup of one stock period (`getShopStockKey`): it is never rerolled by viewing, reloading, or purchasing. */
export interface ShopLineupSnapshot {
  stockKey: string;
  entries: ShopStockEntry[];
}

export interface ShopLineupInput {
  parties: Party[];
  gold: number;
  shopPurchases: Record<string, string[]>;
  shopRefreshCounts: Record<string, number>;
  shopIntimacy: number;
  shopIntimacyLastDecayAt: number;
  shopLineup: ShopLineupSnapshot | null;
}

export interface ShopLineupEntry {
  stockEntryId: string;
  itemId: number;
  item: Item;
  identified: boolean;
  price: number;
  rarity: ShopEntryRarity;
  soldOut: boolean;
  canPurchase: boolean;
}

function getShopItemRarity(itemId: number): ShopEntryRarity {
  const rarityCode = itemId % 1000;
  if (rarityCode >= 400) return 'bossRare';
  if (rarityCode >= 300) return 'eliteRare';
  if (rarityCode >= 200) return 'uncommon';
  return 'common';
}

/** The id under which a slot (0-based index) of a lineup is sold out in `shopPurchases`. */
export function getShopStockEntryId(itemId: number, index: number): string {
  return `${itemId}-${index}`;
}

// SpecRef: 8.4.1 | Shop (お店) | Enhancement (Same as item drop logic)
/** Draws one enhancement ticket, redrawing (and consuming the rejected tickets) until it is at least 2. */
export function drawShopEnhancement(bags: GameBags, random: () => number = gameplayRandom): { enhancement: number; bags: GameBags } {
  let nextBags = bags;
  let enhancement = 0;
  do {
    nextBags = refillBagIfEmpty(nextBags, 'enhancementBag');
    const { ticket, newBag } = drawFromBagWithRandom(nextBags.enhancementBag, random);
    nextBags = { ...nextBags, enhancementBag: newBag };
    enhancement = ticket;
  } while (enhancement < SHOP_IDENTIFIED_ENHANCEMENT_MINIMUM);
  return { enhancement, bags: nextBags };
}

/** Draws `draws` Super Rare tickets and keeps the highest ID. */
export function drawShopSuperRare(bags: GameBags, draws: number, random: () => number = gameplayRandom): { superRare: number; bags: GameBags } {
  let nextBags = bags;
  let superRare = 0;
  for (let count = 0; count < draws; count += 1) {
    nextBags = refillBagIfEmpty(nextBags, 'superRareBag');
    const { ticket, newBag } = drawFromBagWithRandom(nextBags.superRareBag, random);
    nextBags = { ...nextBags, superRareBag: newBag };
    superRare = Math.max(superRare, ticket);
  }
  return { superRare, bags: nextBags };
}

/** Rolls the hidden enhancement and Super Rare title of an unidentified entry when it is bought (PT1's bags). */
export function rollUnidentifiedShopItem(bags: GameBags): { enhancement: number; superRare: number; bags: GameBags } {
  const enhancementResult = drawShopEnhancement(bags);
  const superRareResult = drawShopSuperRare(enhancementResult.bags, SHOP_UNIDENTIFIED_SUPER_RARE_DRAWS);
  return { enhancement: enhancementResult.enhancement, superRare: superRareResult.superRare, bags: superRareResult.bags };
}

// SpecRef: 8.4.1 | Shop (お店) | Lineup
// Rarity base codes (100 common, 200 uncommon, 300 elite rare, 400 boss rare) of the identified slots and of the unidentified
// slots, by intimacy tier. The identified slots come first; every tier fills all 7 slots.
const SHOP_RARITY_PLANS: ReadonlyArray<{ minimumIntimacy: number; identified: number[]; unidentified: number[] }> = [
  { minimumIntimacy: 140, identified: [400, 300], unidentified: [400, 400, 300, 300, 300] },
  { minimumIntimacy: 120, identified: [300, 300], unidentified: [400, 400, 300, 300, 200] },
  { minimumIntimacy: 100, identified: [300, 200], unidentified: [400, 300, 300, 300, 200] },
  { minimumIntimacy: 80, identified: [200, 200], unidentified: [400, 300, 300, 200, 200] },
  { minimumIntimacy: 40, identified: [200, 100], unidentified: [300, 200, 200, 100, 100] },
  { minimumIntimacy: 20, identified: [100, 100], unidentified: [200, 100, 100, 100, 100] },
  { minimumIntimacy: 0, identified: [100], unidentified: [100, 100, 100, 100, 100, 100] },
];

function getShopRarityPlan(effectiveIntimacy: number) {
  return SHOP_RARITY_PLANS.find((plan) => effectiveIntimacy >= plan.minimumIntimacy) ?? SHOP_RARITY_PLANS[SHOP_RARITY_PLANS.length - 1];
}

function getHighestDefeatedBossTier(parties: Party[]): number {
  return DUNGEONS.reduce((highestTier, dungeon) => {
    const hasBeatenBoss = parties.some((party) => Boolean(party.defeatedBossExpeditions?.[dungeon.id]));
    return hasBeatenBoss ? Math.max(highestTier, dungeon.tier) : highestTier;
  }, 1);
}

export interface ResolvedShopLineup {
  stockKey: string;
  refreshCount: number;
  effectiveIntimacy: number;
  entries: ShopStockEntry[];
  /** True when `entries` is the saved snapshot; false when it is generated now and still has to be saved. */
  saved: boolean;
  /** PT1's bags after the identified rolls of a newly generated lineup (unchanged when `saved`). */
  bags: GameBags | null;
}

/** Effective intimacy at `now`: the stored value decayed for every refresh time that has passed. */
export function getEffectiveShopIntimacy(input: Pick<ShopLineupInput, 'shopIntimacy' | 'shopIntimacyLastDecayAt' | 'parties'>, now: Date): number {
  const elapsedRefreshes = countElapsedShopRefreshes(input.shopIntimacyLastDecayAt, now);
  const decayed = Math.max(0, Math.floor(input.shopIntimacy * (0.9 ** elapsedRefreshes)));
  return Math.min(decayed, getShopIntimacyCap(input.parties));
}

// SpecRef: 8.4.1 | Shop (お店) | Lineup
// SpecRef: 8.4.1 | Shop (お店) | Enhancement (Same as item drop logic)
/**
 * Generates the lineup of one stock period: the items from the clock seed, and the identified entries' enhancement and Super
 * Rare title from PT1's bags. Intimacy and defeated bosses are read once, here, so they cannot change the saved lineup later.
 */
export function generateShopLineup(
  input: Pick<ShopLineupInput, 'parties'>,
  effectiveIntimacy: number,
  now: Date,
  refreshCount: number,
): { entries: ShopStockEntry[]; bags: GameBags } {
  const highestDefeatedBossTier = getHighestDefeatedBossTier(input.parties);
  const lineupSeed = getShopLineupSeed(now, refreshCount);
  // The rolls draw from PT1's bags with a random source seeded by the stock period, so the lineup a read reports is the one
  // that is saved (for the same bags), and a retry after a rejected request cannot roll a different lineup.
  const random = createApiRandom(lineupSeed).next;
  let bags = input.parties[0].bags;
  const rarityPlan = getShopRarityPlan(effectiveIntimacy);
  const identifiedSlotCount = rarityPlan.identified.length;
  const entries = [...rarityPlan.identified, ...rarityPlan.unidentified].flatMap((rarityBase, index): ShopStockEntry[] => {
    const x = Math.sin(lineupSeed + (index + 1) * 97) * 10000;
    const tier = Math.floor((x - Math.floor(x)) * highestDefeatedBossTier) + 1;
    const targetRarity = getShopItemRarity(tier * 1000 + rarityBase + 1);
    const tierRarityItems = ITEMS.filter((item) => (
      Math.floor(item.id / 1000) === tier && getShopItemRarity(item.id) === targetRarity
    ));
    // Every category of the rolled tier and rarity is eligible, so a refresh can change every slot.
    const selectionSeed = Math.abs(Math.floor(Math.sin(lineupSeed + (index + 1) * 193) * 10000));
    const baseItem = tierRarityItems[selectionSeed % tierRarityItems.length];
    if (!baseItem) return [];
    if (index >= identifiedSlotCount) {
      return [{ itemId: baseItem.id, identified: false, enhancement: 0, superRare: 0, price: getShopItemPrice(baseItem.id) }];
    }
    const enhancementResult = drawShopEnhancement(bags, random);
    const superRareResult = drawShopSuperRare(enhancementResult.bags, SHOP_IDENTIFIED_SUPER_RARE_DRAWS, random);
    bags = superRareResult.bags;
    return [{
      itemId: baseItem.id,
      identified: true,
      enhancement: enhancementResult.enhancement,
      superRare: superRareResult.superRare,
      price: getIdentifiedShopItemPrice(baseItem.id, enhancementResult.enhancement, superRareResult.superRare),
    }];
  });
  return { entries, bags };
}

/**
 * The lineup at `now`: the saved snapshot while it belongs to the current stock period, otherwise the lineup that period will
 * be generated as (`saved: false`), which the reducers persist before they use it.
 */
export function resolveShopLineup(input: ShopLineupInput, now: Date): ResolvedShopLineup {
  const effectiveIntimacy = getEffectiveShopIntimacy(input, now);
  const refreshCount = input.shopRefreshCounts[getShopHourKey(now)] ?? 0;
  const stockKey = getShopStockKey(now, refreshCount);
  if (input.shopLineup && input.shopLineup.stockKey === stockKey && input.shopLineup.entries.length > 0) {
    return { stockKey, refreshCount, effectiveIntimacy, entries: input.shopLineup.entries, saved: true, bags: null };
  }
  const generated = generateShopLineup(input, effectiveIntimacy, now, refreshCount);
  return { stockKey, refreshCount, effectiveIntimacy, entries: generated.entries, saved: false, bags: generated.bags };
}

// SpecRef: 8.4.1 | Shop (お店) | Lineup
// SpecRef: 9.1.3 | Read | 2-4-3 shopInfo
export function buildShopLineup(input: ShopLineupInput, now: Date) {
  const resolved = resolveShopLineup(input, now);
  const soldOutItemKeys = input.shopPurchases[resolved.stockKey] ?? [];
  const entries = resolved.entries.map((stock, index): ShopLineupEntry => {
    const baseItem = ITEMS.find((item) => item.id === stock.itemId) as Item;
    const stockEntryId = getShopStockEntryId(stock.itemId, index);
    const soldOut = soldOutItemKeys.includes(stockEntryId);
    return {
      stockEntryId,
      itemId: stock.itemId,
      item: { ...baseItem, enhancement: stock.enhancement, superRare: stock.superRare },
      identified: stock.identified,
      price: stock.price,
      rarity: getShopItemRarity(stock.itemId),
      soldOut,
      canPurchase: !soldOut && input.gold >= stock.price,
    };
  });
  return {
    lineupId: resolved.stockKey,
    refreshesAt: getNextShopRefreshDate(now).getTime(),
    effectiveIntimacy: resolved.effectiveIntimacy,
    entries,
  };
}

/** Restores a saved lineup from untrusted save data; anything malformed is dropped, and the lineup is generated again. */
export function normalizeShopLineup(value: unknown): ShopLineupSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const { stockKey, entries } = value as { stockKey?: unknown; entries?: unknown };
  if (typeof stockKey !== 'string' || !Array.isArray(entries) || entries.length === 0) return null;
  const normalized: ShopStockEntry[] = [];
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') return null;
    const { itemId, identified, enhancement, superRare, price } = entry as Record<string, unknown>;
    if (typeof itemId !== 'number' || !ITEMS.some((item) => item.id === itemId)) return null;
    if (typeof identified !== 'boolean' || typeof price !== 'number' || !Number.isFinite(price) || price < 0) return null;
    if (typeof enhancement !== 'number' || typeof superRare !== 'number') return null;
    normalized.push({ itemId, identified, enhancement: Math.max(0, Math.floor(enhancement)), superRare: Math.max(0, Math.floor(superRare)), price: Math.floor(price) });
  }
  return { stockKey, entries: normalized };
}
