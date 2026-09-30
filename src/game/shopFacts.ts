import { buildShopLineup, getShopHourKey, getShopRefreshPrice, SHOP_SLOT_COUNT, type ShopLineupEntry, type ShopLineupInput } from './shop';

export { SHOP_SLOT_COUNT };

// SpecRef: 8.4.1 | Shop (お店) | Dialogue by intimacy
// SpecRef: 8.4.1 | Shop (お店) | Paid Refresh (有償洗替)
// Everything the Shop pane shows and the Application API publishes about the shop at one instant, from one place, so the two
// cannot disagree about the dialogue, the countdown, the refresh price, or which slot is which.

export type ShopDialogueKey = 'home.shop.dialogue.default' | 'home.shop.dialogue.intimacy20' | 'home.shop.dialogue.intimacy40' | 'home.shop.dialogue.intimacy80' | 'home.shop.dialogue.intimacy100' | 'home.shop.dialogue.intimacy120' | 'home.shop.dialogue.intimacy140';

export function getShopDialogueKey(effectiveIntimacy: number): ShopDialogueKey {
  if (effectiveIntimacy >= 140) return 'home.shop.dialogue.intimacy140';
  if (effectiveIntimacy >= 120) return 'home.shop.dialogue.intimacy120';
  if (effectiveIntimacy >= 100) return 'home.shop.dialogue.intimacy100';
  if (effectiveIntimacy >= 80) return 'home.shop.dialogue.intimacy80';
  if (effectiveIntimacy >= 40) return 'home.shop.dialogue.intimacy40';
  if (effectiveIntimacy >= 20) return 'home.shop.dialogue.intimacy20';
  return 'home.shop.dialogue.default';
}

/** The slot (1-based) a lineup entry occupies: entry IDs are `<itemId>-<slot index>`. */
export function getShopSlot(entry: Pick<ShopLineupEntry, 'stockEntryId'>): number {
  return Number(entry.stockEntryId.slice(entry.stockEntryId.lastIndexOf('-') + 1)) + 1;
}

export type ShopEntryUnavailableReason = 'sold_out' | 'insufficient_gold';

export interface ShopEntryFacts {
  shopItemId: number;
  stockEntryId: string;
  itemId: number;
  /** Identified entries show their rolled enhancement and Super Rare title; unidentified ones hide both until bought. */
  identified: boolean;
  enhancement: number | null;
  superRare: number | null;
  price: number;
  rarity: ShopLineupEntry['rarity'];
  soldOut: boolean;
  available: boolean;
  unavailableReason: ShopEntryUnavailableReason | null;
}

export interface ShopFacts {
  lineupId: string;
  /** Effective intimacy: the stored value decayed for every refresh time that has passed. */
  intimacy: number;
  dialogueKey: ShopDialogueKey;
  refreshesAt: number;
  /** Whole seconds until the next scheduled refresh, at least 1. */
  refreshCountdownSeconds: number;
  refreshCount: number;
  paidRefreshPrice: number;
  paidRefreshAvailable: boolean;
  entries: ShopEntryFacts[];
}

// SpecRef: 9.1.3 | 2-4-4 shopItemsList / 3-4-3 purchaseShopItems | lineupId
/**
 * The public ID of a lineup: an opaque hash of the stock period (which changes with every refresh), each slot's item, rolled
 * enhancement and Super Rare title, price, and whether it is sold. A purchase names the lineup it was chosen from, so a
 * rotation, a refresh, or a restock in between (even one that rolls the same items) is refused instead of buying a different
 * item. Stock, not affordability, is hashed: gold changing between the read and the purchase does not change the lineup.
 */
export function getPublicShopLineupId(facts: Pick<ShopFacts, 'entries' | 'lineupId'>): string {
  const text = [facts.lineupId, ...facts.entries.map((entry) => [entry.shopItemId, entry.itemId, entry.enhancement ?? '?', entry.superRare ?? '?', entry.price, entry.soldOut ? 1 : 0].join(','))].join('|');
  // Two 32-bit FNV-1a hashes with different offsets, so the 16 hex characters do not collide by accident.
  let high = 0x811c9dc5;
  let low = 0x01000193;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    high = Math.imul(high ^ code, 0x01000193) >>> 0;
    low = Math.imul(low ^ code, 0x85ebca6b) >>> 0;
  }
  return `${high.toString(16).padStart(8, '0')}${low.toString(16).padStart(8, '0')}`;
}

export function getShopFacts(input: ShopLineupInput, now: Date): ShopFacts {
  const lineup = buildShopLineup(input, now);
  const refreshCount = input.shopRefreshCounts[getShopHourKey(now)] ?? 0;
  const paidRefreshPrice = getShopRefreshPrice(refreshCount);
  return {
    lineupId: lineup.lineupId,
    intimacy: lineup.effectiveIntimacy,
    dialogueKey: getShopDialogueKey(lineup.effectiveIntimacy),
    refreshesAt: lineup.refreshesAt,
    refreshCountdownSeconds: Math.max(1, Math.ceil((lineup.refreshesAt - now.getTime()) / 1000)),
    refreshCount,
    paidRefreshPrice,
    paidRefreshAvailable: input.gold >= paidRefreshPrice,
    entries: lineup.entries.map((entry) => ({
      shopItemId: getShopSlot(entry),
      stockEntryId: entry.stockEntryId,
      itemId: entry.itemId,
      identified: entry.identified,
      enhancement: entry.identified ? entry.item.enhancement : null,
      superRare: entry.identified ? entry.item.superRare : null,
      price: entry.price,
      rarity: entry.rarity,
      soldOut: entry.soldOut,
      available: entry.canPurchase,
      unavailableReason: entry.soldOut ? 'sold_out' : entry.canPurchase ? null : 'insufficient_gold',
    })),
  };
}

export function shopLineupInputOf(state: { parties: ShopLineupInput['parties']; global: { gold: number; shopLineup?: ShopLineupInput['shopLineup']; shopPurchases: ShopLineupInput['shopPurchases']; shopRefreshCounts: ShopLineupInput['shopRefreshCounts']; shopIntimacy: number; shopIntimacyLastDecayAt: number } }): ShopLineupInput {
  return { parties: state.parties, gold: state.global.gold, shopLineup: state.global.shopLineup ?? null, shopPurchases: state.global.shopPurchases, shopRefreshCounts: state.global.shopRefreshCounts, shopIntimacy: state.global.shopIntimacy, shopIntimacyLastDecayAt: state.global.shopIntimacyLastDecayAt };
}
