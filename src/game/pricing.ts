import type { Item, ItemRarity } from '../types/index.ts';
import { getItemRarityById } from './itemRarity.ts';

function clampTier(tier: number): number {
  return Math.max(1, Math.min(8, Math.floor(tier)));
}

// SpecRef: 3.2 | ITEM_MASTER_DATA | `x.item_tier` is the thousands digit of the item ID (1–8)
export function getItemTier(itemId: number): number {
  return clampTier(itemId / 1000);
}

// SpecRef: 3.1.6 | Item selling price | `rarity.price_multiplier`
const RARITY_PRICE_MULTIPLIER: Record<ItemRarity, number> = {
  common: 1,
  uncommon: 3,
  rare: 10,
  epic: 30,
  mythic: 300,
};


function getSellingBasePrice(tier: number): number {
  return 10 + (2 * tier);
}

function getPurchasingBasePrice(tier: number): number {
  return 4 + (2 * tier);
}

const SUPER_RARE_PRICE_MULTIPLIER = 100;
const IDENTIFIED_PURCHASE_MULTIPLIER = 40;
const UNIDENTIFIED_PURCHASE_MULTIPLIER = 10;

// SpecRef: 3.1.6 | Item selling price | Selling_price
// (10 + 2 x item_tier) x (1 + enhancement / 5) x rarity x super_rare, rounded up.
export function calculateItemSellPrice(item: Item, autoSellMultiplier = 1): number {
  const tier = getItemTier(item.id);
  const rarityMultiplier = RARITY_PRICE_MULTIPLIER[getItemRarityById(item.id)];
  const superRareMultiplier = item.superRare > 0 ? SUPER_RARE_PRICE_MULTIPLIER : 1;
  const enhancementMultiplier = 1 + (item.enhancement / 5);
  const rawPrice = getSellingBasePrice(tier) * enhancementMultiplier * rarityMultiplier * superRareMultiplier * autoSellMultiplier;
  return Math.ceil(rawPrice - 1e-9);
}

// SpecRef: 3.1.6 | Item selling price | Unidentified Purchesing_price
export function getShopItemPrice(itemId: number): number {
  const tier = getItemTier(itemId);
  const rarityMultiplier = RARITY_PRICE_MULTIPLIER[getItemRarityById(itemId)];
  return Math.ceil(getPurchasingBasePrice(tier) * rarityMultiplier * UNIDENTIFIED_PURCHASE_MULTIPLIER);
}

// SpecRef: 3.1.6 | Item selling price | Identified Purchesing_price
// (4 + 2 x item_tier) x rarity x (1 + enhancement) x super_rare x 40, rounded up.
export function getIdentifiedShopItemPrice(itemId: number, enhancement: number, superRare: number): number {
  const tier = getItemTier(itemId);
  const rarityMultiplier = RARITY_PRICE_MULTIPLIER[getItemRarityById(itemId)];
  const superRareMultiplier = superRare > 0 ? SUPER_RARE_PRICE_MULTIPLIER : 1;
  return Math.ceil(getPurchasingBasePrice(tier) * rarityMultiplier * (1 + enhancement) * superRareMultiplier * IDENTIFIED_PURCHASE_MULTIPLIER);
}
