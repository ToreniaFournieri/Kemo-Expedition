import type { InventoryRecord, Item } from '../types/index.ts';
import {
  getRewardRarityByItemId,
  getRewardRarityRank,
} from './expeditionEffects/rewardDrops.ts';
import type { ExpeditionInventoryInstallationResult } from './expeditionInventory.ts';
import type { ExpeditionRewardPresentation } from './expeditionPresentation.ts';
import { getItemDisplayName } from './gameState.ts';

export interface InventoryItemAdditionResult {
  readonly inventory: InventoryRecord;
  readonly gold: number;
  readonly wasAutoSold: boolean;
  readonly autoSellProfit: number;
}

export interface InstallRecoveredExpeditionRewardsInput {
  readonly recoveredItems: readonly Item[];
  readonly inventory: InventoryRecord;
  readonly gold: number;
  readonly autoSellMultiplier: number;
  readonly mutateInventory: boolean;
  readonly addItemToInventory: (
    inventory: InventoryRecord,
    item: Item,
    gold: number,
    autoSellMultiplier: number,
    mutateInventory: boolean,
  ) => InventoryItemAdditionResult;
}

/** Localized application adapter for retained and auto-sold expedition drops. */
export function installRecoveredExpeditionRewards(
  input: InstallRecoveredExpeditionRewardsInput,
): ExpeditionInventoryInstallationResult<ExpeditionRewardPresentation> {
  let inventory = input.inventory;
  let gold = input.gold;
  const rewards: Item[] = [];
  const rewardNames: string[] = [];
  const rewardLogEntries: Array<{ itemName: string; autoSellProfit?: number }> = [];
  const autoSoldItems: Array<{ item: Item; profit: number }> = [];
  let highestRewardRarity: ExpeditionRewardPresentation['highestRewardRarity'];
  let hasSuperRareReward = false;

  for (const item of input.recoveredItems) {
    const baseRarity = getRewardRarityByItemId(item.id);
    const itemName = getItemDisplayName(item);
    const result = input.addItemToInventory(
      inventory,
      item,
      gold,
      input.autoSellMultiplier,
      input.mutateInventory,
    );
    inventory = result.inventory;
    gold = result.gold;
    rewardLogEntries.push({
      itemName,
      autoSellProfit: result.wasAutoSold ? result.autoSellProfit : undefined,
    });

    if (result.wasAutoSold) {
      autoSoldItems.push({ item, profit: result.autoSellProfit });
      continue;
    }

    rewards.push(item);
    rewardNames.push(itemName);
    if (!highestRewardRarity
      || getRewardRarityRank(baseRarity) > getRewardRarityRank(highestRewardRarity)) {
      highestRewardRarity = baseRarity;
    }
    if (item.superRare > 0) hasSuperRareReward = true;
  }

  return {
    inventory,
    gold,
    retainedItems: rewards,
    autoSoldItems,
    presentation: {
      rewardNames,
      rewards,
      rewardLogEntries,
      highestRewardRarity,
      hasSuperRareReward,
    },
  };
}
