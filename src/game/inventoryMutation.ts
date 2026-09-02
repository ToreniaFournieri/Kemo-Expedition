import {
  getVariantKey,
  type InventoryRecord,
  type Item,
} from '../types/index.ts';
import { calculateItemSellPrice } from './pricing.ts';

export const ITEM_MAX_STACK = 99;

export function calculateSellPrice(item: Item, autoSellMultiplier = 1): number {
  return calculateItemSellPrice(item, autoSellMultiplier);
}

/** Shared inventory addition used by expeditions, shops, rewards, and debug actions. */
export function addItemToInventory(
  inventory: InventoryRecord,
  item: Item,
  currentGold: number,
  autoSellMultiplier = 1,
  mutateInventory = false,
): {
  inventory: InventoryRecord;
  gold: number;
  wasAutoSold: boolean;
  autoSellProfit: number;
} {
  const key = getVariantKey(item);
  const existing = inventory[key];

  if (existing?.status === 'sold') {
    const sellPrice = calculateSellPrice(item, autoSellMultiplier);
    return {
      inventory,
      gold: currentGold + sellPrice,
      wasAutoSold: true,
      autoSellProfit: sellPrice,
    };
  }

  if (existing?.status === 'owned' && existing.count >= ITEM_MAX_STACK) {
    const sellPrice = calculateSellPrice(item, autoSellMultiplier);
    return {
      inventory,
      gold: currentGold + sellPrice,
      wasAutoSold: true,
      autoSellProfit: sellPrice,
    };
  }

  const nextInventory = mutateInventory ? inventory : { ...inventory };
  if (existing) {
    nextInventory[key] = {
      ...existing,
      count: existing.count + 1,
      status: 'owned',
      isNew: existing.isNew ?? false,
    };
  } else {
    nextInventory[key] = {
      item: { ...item, isNew: undefined },
      count: 1,
      status: 'owned',
      isNew: true,
    };
  }

  return {
    inventory: nextInventory,
    gold: currentGold,
    wasAutoSold: false,
    autoSellProfit: 0,
  };
}
