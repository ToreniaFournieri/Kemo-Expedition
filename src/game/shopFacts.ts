import { buildShopLineup, getShopHourKey, getShopRefreshPrice, type ShopLineupEntry, type ShopLineupInput } from './shop';

// SpecRef: 8.4.1 | Shop (お店) | Dialogue by intimacy
// SpecRef: 8.4.1 | Shop (お店) | Paid Refresh (有償洗替)
// Everything the Shop pane shows and the Application API publishes about the shop at one instant, from one place, so the two
// cannot disagree about the dialogue, the countdown, the refresh price, or which slot is which.

/** The Shop's lineup has five slots; a slot's public ID is its 1-based position. */
export const SHOP_SLOT_COUNT = 5;

export type ShopDialogueKey = 'home.shop.dialogue.default' | 'home.shop.dialogue.intimacy20' | 'home.shop.dialogue.intimacy40' | 'home.shop.dialogue.intimacy80';

export function getShopDialogueKey(effectiveIntimacy: number): ShopDialogueKey {
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
      price: entry.price,
      rarity: entry.rarity,
      soldOut: entry.soldOut,
      available: entry.canPurchase,
      unavailableReason: entry.soldOut ? 'sold_out' : entry.canPurchase ? null : 'insufficient_gold',
    })),
  };
}

export function shopLineupInputOf(state: { parties: ShopLineupInput['parties']; global: { gold: number; shopPurchases: ShopLineupInput['shopPurchases']; shopRefreshCounts: ShopLineupInput['shopRefreshCounts']; shopIntimacy: number; shopIntimacyLastDecayAt: number } }): ShopLineupInput {
  return { parties: state.parties, gold: state.global.gold, shopPurchases: state.global.shopPurchases, shopRefreshCounts: state.global.shopRefreshCounts, shopIntimacy: state.global.shopIntimacy, shopIntimacyLastDecayAt: state.global.shopIntimacyLastDecayAt };
}
