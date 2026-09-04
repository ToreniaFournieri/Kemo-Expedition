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

/** Explicit grants revive a variant and never apply its automatic-sale status. */
export function grantItemToInventory(
  inventory: InventoryRecord,
  item: Item,
  requestedCount = 1,
  mutateInventory = false,
): { inventory: InventoryRecord; grantedCount: number } {
  const count = Number.isFinite(requestedCount) ? Math.max(0, Math.floor(requestedCount)) : 0;
  if (count === 0) return { inventory, grantedCount: 0 };

  const key = getVariantKey(item);
  const existing = inventory[key];
  const grantedCount = Math.min(count, Math.max(0, ITEM_MAX_STACK - (existing?.count ?? 0)));
  if (grantedCount === 0) return { inventory, grantedCount: 0 };

  const nextInventory = mutateInventory ? inventory : { ...inventory };
  nextInventory[key] = {
    item,
    count: (existing?.count ?? 0) + grantedCount,
    status: 'owned',
    isNew: existing?.isNew ?? true,
  };
  return { inventory: nextInventory, grantedCount };
}

export function removeItemFromInventory(
  inventory: InventoryRecord,
  key: string,
  mutateInventory = false,
): InventoryRecord {
  const existing = inventory[key];
  if (!existing || existing.count <= 0) return inventory;

  const nextInventory = mutateInventory ? inventory : { ...inventory };
  nextInventory[key] = existing.count === 1
    ? { ...existing, count: 0, status: 'notown' }
    : { ...existing, count: existing.count - 1 };
  return nextInventory;
}

export function setInventoryVariantStatus(
  inventory: InventoryRecord,
  key: string,
  status: InventoryRecord[string]['status'],
  mutateInventory = false,
): InventoryRecord {
  const existing = inventory[key];
  if (!existing) return inventory;
  const nextInventory = mutateInventory ? inventory : { ...inventory };
  nextInventory[key] = { ...existing, status };
  return nextInventory;
}

export interface InventorySaleResult {
  readonly inventory: InventoryRecord;
  readonly gold: number;
  readonly prana: number;
  readonly soldCount: number;
}

export interface InventorySaleAuthorities {
  readonly getPrana: (item: Item) => number;
}

export function sellInventoryStack(
  inventory: InventoryRecord,
  key: string,
  currentGold: number,
  currentPrana: number,
  authorities: InventorySaleAuthorities,
): InventorySaleResult {
  const variant = inventory[key];
  if (!variant || variant.count <= 0) {
    return { inventory, gold: currentGold, prana: currentPrana, soldCount: 0 };
  }

  const soldCount = variant.count;
  const pranaGranted = authorities.getPrana(variant.item) * soldCount;
  const sellPrice = calculateSellPrice(variant.item) * soldCount;
  return {
    inventory: {
      ...inventory,
      [key]: { ...variant, count: 0, status: 'sold' },
    },
    gold: currentGold + (pranaGranted > 0 ? 0 : sellPrice),
    prana: currentPrana + pranaGranted,
    soldCount,
  };
}

export function sellAllOwnedInventory(
  inventory: InventoryRecord,
  currentGold: number,
  currentPrana: number,
  authorities: InventorySaleAuthorities,
): InventorySaleResult {
  let totalSellPrice = 0;
  let totalPrana = 0;
  let soldCount = 0;
  const nextInventory = { ...inventory };

  for (const [key, variant] of Object.entries(inventory)) {
    if (variant.status !== 'owned' || variant.count <= 0) continue;
    const pranaGranted = authorities.getPrana(variant.item) * variant.count;
    if (pranaGranted > 0) totalPrana += pranaGranted;
    else totalSellPrice += calculateSellPrice(variant.item) * variant.count;
    soldCount += variant.count;
    nextInventory[key] = { ...variant, count: 0, status: 'sold' };
  }

  if (totalSellPrice <= 0 && totalPrana <= 0) {
    return { inventory, gold: currentGold, prana: currentPrana, soldCount: 0 };
  }
  return {
    inventory: nextInventory,
    gold: currentGold + totalSellPrice,
    prana: currentPrana + totalPrana,
    soldCount,
  };
}
