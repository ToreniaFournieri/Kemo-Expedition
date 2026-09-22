// SpecRef: 9.1.4.7 | Observation projections | base
// The typed read model the Base panes consume. It contains only public projection facts.

export interface ShopEntryProjection {
  shopItemId: number;
  itemId: number;
  price: number;
  rarity: 'common' | 'uncommon' | 'eliteRare' | 'bossRare';
  soldOut: boolean;
  available: boolean;
  unavailableReason: 'sold_out' | 'insufficient_gold' | null;
}

export interface ShopProjection {
  lineupId: string;
  intimacy: number;
  dialogue: { key: 'home.shop.dialogue.default' | 'home.shop.dialogue.intimacy20' | 'home.shop.dialogue.intimacy40' | 'home.shop.dialogue.intimacy80'; args: Record<string, never> };
  paidRefreshCountdown: number;
  paidRefreshPrice: number;
  paidRefresh: { available: boolean; unavailableReason: 'insufficient_gold' | null };
  refreshesAt: string;
  entries: ShopEntryProjection[];
}

export interface BaseProjection {
  currencies: { gold: number; prana: number };
  shop: ShopProjection;
}
