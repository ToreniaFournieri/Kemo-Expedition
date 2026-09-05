import type { GameBags, Item, ItemDef, TerrainEffectKey } from '../../types/index.ts';
import { drawFromBagWithRandom } from '../weightedBag.ts';

export type RewardRarity = 'common' | 'uncommon' | 'eliteRare' | 'bossRare' | 'mythicRare';
type RewardBagType = 'commonRewardBag' | 'uncommonRewardBag' | 'eliteRareRewardBag' | 'bossRareRewardBag' | 'mythicRareRewardBag';
type SuperRareBagType = 'commonSuperRareBag' | 'rareSuperRareBag';
type RewardDrawBagType = RewardBagType | SuperRareBagType | 'commonEnhancementBag' | 'enhancementBag';

export interface RewardTicketModifiers {
  readonly hasUnlock: boolean;
  readonly terrainEffect?: TerrainEffectKey;
  readonly deityItemChanceTickets?: number;
  readonly auriferousBonusRolls?: number;
  readonly difficultyItemChanceTickets?: number;
  readonly difficultySuperRareChanceTickets?: number;
}

export interface ResolveEnemyRewardDropsInput extends RewardTicketModifiers {
  readonly baseItems: readonly ItemDef[];
  readonly bags: GameBags;
  readonly random: () => number;
  readonly refillBag: (bags: GameBags, bagType: RewardDrawBagType) => GameBags;
}

export interface EnemyRewardDropsResult {
  readonly bags: GameBags;
  readonly recoveredItems: readonly Item[];
}

export function getRewardRarityByItemId(itemId: number): RewardRarity {
  const rarityCode = itemId % 1000;
  if (rarityCode >= 500) return 'mythicRare';
  if (rarityCode >= 400) return 'bossRare';
  if (rarityCode >= 300) return 'eliteRare';
  if (rarityCode >= 200) return 'uncommon';
  return 'common';
}

export function getRewardRarityRank(rarity: RewardRarity): number {
  if (rarity === 'mythicRare') return 5;
  if (rarity === 'bossRare') return 4;
  if (rarity === 'eliteRare') return 3;
  if (rarity === 'uncommon') return 2;
  return 1;
}

export function getRewardTicketCount(modifiers: RewardTicketModifiers): number {
  return 2
    + (modifiers.hasUnlock ? 1 : 0)
    + (modifiers.terrainEffect !== 'terrain.gehenna'
      ? Math.max(0, modifiers.deityItemChanceTickets ?? 0)
      : 0)
    + (modifiers.difficultyItemChanceTickets ?? 0)
    + (modifiers.auriferousBonusRolls ?? 0);
}

function getRewardBagType(rarity: RewardRarity): RewardBagType {
  if (rarity === 'uncommon') return 'uncommonRewardBag';
  if (rarity === 'eliteRare') return 'eliteRareRewardBag';
  if (rarity === 'bossRare') return 'bossRareRewardBag';
  if (rarity === 'mythicRare') return 'mythicRareRewardBag';
  return 'commonRewardBag';
}

function getSuperRareBagType(rarity: RewardRarity): SuperRareBagType {
  return rarity === 'common' ? 'commonSuperRareBag' : 'rareSuperRareBag';
}

export function resolveEnemyRewardDrops(input: ResolveEnemyRewardDropsInput): EnemyRewardDropsResult {
  let bags = input.bags;
  const recoveredItems: Item[] = [];
  const rewardRollCount = Math.max(1, getRewardTicketCount(input));

  for (const baseItem of input.baseItems) {
    const rarity = getRewardRarityByItemId(baseItem.id);
    const rewardBagType = getRewardBagType(rarity);
    let gotReward = false;

    for (let rollIndex = 0; rollIndex < rewardRollCount; rollIndex++) {
      bags = input.refillBag(bags, rewardBagType);
      const { ticket, newBag } = drawFromBagWithRandom(bags[rewardBagType], input.random);
      bags = { ...bags, [rewardBagType]: newBag };
      gotReward = gotReward || ticket === 1;
    }

    if (!gotReward) continue;

    const enhancementBagType = rewardBagType === 'commonRewardBag'
      ? 'commonEnhancementBag'
      : 'enhancementBag';
    bags = input.refillBag(bags, enhancementBagType);
    const { ticket: enhancement, newBag: newEnhancementBag } = drawFromBagWithRandom(
      bags[enhancementBagType],
      input.random,
    );
    bags = { ...bags, [enhancementBagType]: newEnhancementBag };

    const qualifiesForSuperRare = rarity === 'common' ? enhancement >= 2 : enhancement >= 1;
    const superRareRollCount = qualifiesForSuperRare
      ? 1 + Math.max(0, input.difficultySuperRareChanceTickets ?? 0)
      : 0;
    let superRare = 0;
    if (superRareRollCount > 0) {
      const superRareBagType = getSuperRareBagType(rarity);
      for (let rollIndex = 0; rollIndex < superRareRollCount; rollIndex++) {
        bags = input.refillBag(bags, superRareBagType);
        const { ticket, newBag } = drawFromBagWithRandom(bags[superRareBagType], input.random);
        bags = { ...bags, [superRareBagType]: newBag };
        superRare = Math.max(superRare, ticket);
      }
    }

    recoveredItems.push({ ...baseItem, enhancement, superRare });
  }

  return Object.freeze({
    bags,
    recoveredItems: Object.freeze(recoveredItems),
  });
}
