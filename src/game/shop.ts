import { getShopItemPrice as getTierShopItemPrice } from './pricing';
import { DUNGEONS } from '../data/dungeons';
import { ITEMS } from '../data/items';
import type { Item, ItemCategory, Party } from '../types';

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

export interface ShopLineupInput {
  parties: Party[];
  gold: number;
  shopPurchases: Record<string, string[]>;
  shopRefreshCounts: Record<string, number>;
  shopIntimacy: number;
  shopIntimacyLastDecayAt: number;
}

export interface ShopLineupEntry {
  stockEntryId: string;
  itemId: number;
  item: Item;
  price: number;
  rarity: 'common' | 'uncommon' | 'eliteRare' | 'bossRare';
  soldOut: boolean;
  canPurchase: boolean;
}

function getShopItemRarity(itemId: number): ShopLineupEntry['rarity'] {
  const rarityCode = itemId % 1000;
  if (rarityCode >= 400) return 'bossRare';
  if (rarityCode >= 300) return 'eliteRare';
  if (rarityCode >= 200) return 'uncommon';
  return 'common';
}

// SpecRef: 8.4.1 | Shop (お店) | Lineup
// SpecRef: 9.1.3 | Experimental AI API | Shop observation
export function buildShopLineup(input: ShopLineupInput, now: Date) {
  const elapsedRefreshes = countElapsedShopRefreshes(input.shopIntimacyLastDecayAt, now);
  const effectiveIntimacy = Math.max(0, Math.floor(input.shopIntimacy * (0.9 ** elapsedRefreshes)));
  const hourKey = getShopHourKey(now);
  const refreshCount = input.shopRefreshCounts[hourKey] ?? 0;
  const lineupId = getShopStockKey(now, refreshCount);
  const soldOutItemKeys = input.shopPurchases[lineupId] ?? [];
  const highestDefeatedBossTier = DUNGEONS.reduce((highestTier, dungeon) => {
    const hasBeatenBoss = input.parties.some((party) => Boolean(party.defeatedBossExpeditions?.[dungeon.id]));
    return hasBeatenBoss ? Math.max(highestTier, dungeon.tier) : highestTier;
  }, 1);
  const lineupSeed = getShopLineupSeed(now, refreshCount);
  const shopCategories: ItemCategory[] = ['shield', 'armor', 'sword', 'wand', 'grimoire'];
  const rarityPool: number[] = effectiveIntimacy >= 80
    ? [400, 300, 300, 200, 200]
    : effectiveIntimacy >= 40
      ? [300, 200, 200, 100, 100]
      : effectiveIntimacy >= 20
        ? [200, 100, 100, 100, 100]
        : [100, 100, 100, 100, 100];
  const entries = rarityPool.flatMap((rarityBase, index): ShopLineupEntry[] => {
    const x = Math.sin(lineupSeed + (index + 1) * 97) * 10000;
    const tier = Math.floor((x - Math.floor(x)) * highestDefeatedBossTier) + 1;
    const targetRarity = getShopItemRarity(tier * 1000 + rarityBase + 1);
    const tierRarityItems = ITEMS.filter((item) => (
      Math.floor(item.id / 1000) === tier && getShopItemRarity(item.id) === targetRarity
    ));
    const rotatedCategories = shopCategories.map((_, offset) => shopCategories[(index + offset) % shopCategories.length]);
    const selectedCategory = rotatedCategories.find((category) => tierRarityItems.some((item) => item.category === category));
    const categoryItems = selectedCategory ? tierRarityItems.filter((item) => item.category === selectedCategory) : tierRarityItems;
    const selectionSeed = Math.abs(Math.floor(Math.sin(lineupSeed + (index + 1) * 193) * 10000));
    const baseItem = categoryItems[selectionSeed % categoryItems.length];
    if (!baseItem) return [];
    const stockEntryId = `${baseItem.id}-${index}`;
    const price = getShopItemPrice(baseItem.id);
    const soldOut = soldOutItemKeys.includes(stockEntryId);
    return [{
      stockEntryId,
      itemId: baseItem.id,
      item: { ...baseItem, enhancement: 0, superRare: 0 },
      price,
      rarity: getShopItemRarity(baseItem.id),
      soldOut,
      canPurchase: !soldOut && input.gold >= price,
    }];
  });
  return {
    lineupId,
    refreshesAt: getNextShopRefreshDate(now).getTime(),
    effectiveIntimacy,
    entries,
  };
}
