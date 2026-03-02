import { Item } from '../types';

function clampTier(tier: number): number {
  return Math.max(1, Math.min(8, Math.floor(tier)));
}

function getItemTier(itemId: number): number {
  return clampTier(itemId / 1000);
}

function getTierSellMultiplier(tier: number): number {
  let multiplier = 1;

  for (let currentTier = 2; currentTier <= tier; currentTier += 1) {
    multiplier *= (1.30 - 0.02 * currentTier);
  }

  return multiplier;
}

function getTierShopMultiplier(tier: number): number {
  let multiplier = 1;

  for (let currentTier = 2; currentTier <= tier; currentTier += 1) {
    multiplier *= (2.50 - 0.12 * currentTier);
  }

  return multiplier;
}

// SpecRef: 2.5.5 | Item selling price | calculateItemSellPrice
export function calculateItemSellPrice(item: Item, autoSellMultiplier = 1): number {
  const tier = getItemTier(item.id);
  const superRareFlag = item.superRare > 0 ? 1 : 0;
  const tier1SellPrice = 5 * (1.25 ** (item.enhancement - 1)) * (1000 ** superRareFlag);
  const rawPrice = tier1SellPrice * getTierSellMultiplier(tier) * autoSellMultiplier;
  return Math.floor(rawPrice);
}

// SpecRef: 2.5.5 | Item selling price | getShopItemPrice
export function getShopItemPrice(itemId: number): number {
  const tier = getItemTier(itemId);
  const rawPrice = 200 * getTierShopMultiplier(tier);
  return Math.round(rawPrice / 100) * 100;
}

