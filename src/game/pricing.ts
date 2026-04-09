import { Item } from '../types';

function clampTier(tier: number): number {
  return Math.max(1, Math.min(8, Math.floor(tier)));
}

function getItemTier(itemId: number): number {
  return clampTier(itemId / 1000);
}

type ItemPriceRarity = 'common' | 'uncommon' | 'eliteRare' | 'bossRare' | 'mythicRare';

const SELLING_RARITY_MULTIPLIER: Record<ItemPriceRarity, number> = {
  common: 1,
  uncommon: 3,
  eliteRare: 10,
  bossRare: 30,
  mythicRare: 300,
};

function getItemPriceRarity(itemId: number): ItemPriceRarity {
  const rarityCode = itemId % 1000;
  if (rarityCode >= 500) return 'mythicRare';
  if (rarityCode >= 400) return 'bossRare';
  if (rarityCode >= 300) return 'eliteRare';
  if (rarityCode >= 200) return 'uncommon';
  return 'common';
}

function getTierBasePrice(tier: number): number {
  return 10 + (2 * tier);
}

// SpecRef: 3.1.6 | Item selling price | Selling_price
export function calculateItemSellPrice(item: Item, autoSellMultiplier = 1): number {
  const tier = getItemTier(item.id);
  const rarityMultiplier = SELLING_RARITY_MULTIPLIER[getItemPriceRarity(item.id)];
  const superRareMultiplier = item.superRare > 0 ? 200 : 1;
  const rawPrice = getTierBasePrice(tier) * rarityMultiplier * superRareMultiplier * autoSellMultiplier;
  return Math.floor(rawPrice);
}

// SpecRef: 3.1.6 | Item selling price | Purchesing_price
export function getShopItemPrice(itemId: number): number {
  const tier = getItemTier(itemId);
  return getTierBasePrice(tier) * 100;
}
