import type { LineageId, RaceId } from '../../types/index.ts';

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

export interface AltarCategoryProjection {
  enemyType: string;
  altarLevel: number;
  victories: number;
  nextLevelVictories: number;
  maximumLevel: boolean;
  formCount: number;
  unlockedFormCount: number;
}

export interface AltarProjection {
  prana: number;
  maximumAltarLevel: number;
  categories: AltarCategoryProjection[];
  unlockedEnemyIds: number[];
}

export interface EnemyFormProjection {
  enemyId: number;
  enemyName: string;
  nameKey: string | null;
  enemyType: string;
  enemyTier: 'normal' | 'elite' | 'boss' | 'divine';
  enemyAbility: { abilityId: string; level: number }[];
  enemyBonus: string[];
  unlockCost: number;
  unlockCondition: { requiredAltarLevel: number; currentAltarLevel: number; met: boolean };
  unlocked: boolean;
  unlockable: { available: boolean; unavailableReason: 'already_unlocked' | 'altar_level_too_low' | 'insufficient_prana' | null };
}

export interface BaseProjection extends InventoryProjection {
  currencies: { gold: number; prana: number };
  shop: ShopProjection;
  altar: AltarProjection;
}

export interface InventoryVariantProjection {
  variantKey: string;
  item: string;
  quantity: number;
  status: 'owned' | 'sold' | 'notown';
  isNew: boolean;
  sale: { gold: number; prana: number } | null;
}

export interface HeldJewelProjection {
  jewelKey: string;
  rank: number;
  quantity: number;
}

export interface EquippedItemProjection {
  characterId: number;
  partyNumber: number;
  member: number;
  owner: { name: string; raceId: RaceId; gender: 'male' | 'female'; isUnique: boolean; lineageId: LineageId | null; mimorianEnemyId: number | null };
  slotIndex: number;
  item: string;
  jewel: string | null;
  active: boolean;
}

export interface InventoryProjection {
  inventory: InventoryVariantProjection[];
  jewels: HeldJewelProjection[];
  equippedItems: EquippedItemProjection[];
  jewelPriorityParty: number | 'none';
}
