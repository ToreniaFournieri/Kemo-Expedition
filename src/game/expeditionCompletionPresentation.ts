import type {
  DiaryLog,
  DiarySettings,
  Dungeon,
  ExpeditionLog,
  ExpeditionLogEntry,
  Item,
} from '../types/index.ts';
import { getDiaryOutcomeTrigger } from './diary.ts';
import { getItemDisplayName } from './gameState.ts';
import type {
  ExpeditionFinalizationPlan,
  ExpeditionTransactionResult,
} from './expeditionTransaction.ts';

export interface PlanCompletedExpeditionPresentationInput {
  readonly dungeon: Pick<Dungeon, 'id' | 'name' | 'floors'>;
  readonly difficultyOffset: number;
  readonly entries: ExpeditionLogEntry[];
  readonly transaction: Pick<
    ExpeditionTransactionResult,
    'totalExperience' | 'finalOutcome' | 'currentHp'
  >;
  readonly finalization: Pick<
    ExpeditionFinalizationPlan,
    | 'rewards'
    | 'autoSoldItems'
    | 'autoSellProfit'
    | 'autoSellItemCount'
    | 'endedWithDrawRetreat'
    | 'requiresUnlockNarration'
  >;
  readonly maxPartyHp: number;
  readonly autoSellMultiplier: number;
  readonly diarySettings: DiarySettings;
  readonly isGodsBattle: boolean;
}

export interface CompletedExpeditionPresentationPlan {
  readonly log: ExpeditionLog;
  readonly diaryTriggers: DiaryLog['triggers'];
  readonly shouldRetainCompleteNarration: boolean;
}

function matchesDiaryThreshold(
  item: Item,
  threshold: DiarySettings['superRareThreshold'],
): boolean {
  if (threshold === 'none') return false;
  if (threshold === 'all') return true;
  return item.enhancement >= threshold;
}

function getItemRarityCode(
  item: Item,
): 'common' | 'uncommon' | 'eliteRare' | 'bossRare' | 'mythicRare' {
  const rarityCode = item.id % 1000;
  if (rarityCode >= 500) return 'mythicRare';
  if (rarityCode >= 400) return 'bossRare';
  if (rarityCode >= 300) return 'eliteRare';
  if (rarityCode >= 200) return 'uncommon';
  return 'common';
}

/**
 * Random-free completed-expedition presentation planning. Diary identifiers,
 * timestamps, deferred replay execution, and state installation remain owned by
 * the application shell.
 */
export function planCompletedExpeditionPresentation(
  input: PlanCompletedExpeditionPresentationInput,
): CompletedExpeditionPresentationPlan {
  const finalRemainingPartyHp = input.entries.length > 0
    ? input.entries[input.entries.length - 1].remainingPartyHP
    : input.transaction.currentHp;
  const log: ExpeditionLog = {
    dungeonId: input.dungeon.id,
    dungeonName: input.dungeon.name,
    difficultyOffset: input.difficultyOffset,
    totalExperience: input.transaction.totalExperience,
    totalRooms: input.dungeon.floors.reduce((sum, floor) => sum + floor.rooms.length, 0),
    completedRooms: input.entries.length,
    finalOutcome: input.transaction.finalOutcome,
    entries: input.entries,
    rewards: input.finalization.rewards,
    autoSellProfit: input.finalization.autoSellProfit,
    autoSellCount: input.finalization.autoSellItemCount,
    autoSellItems: input.finalization.autoSoldItems.map(({ item, profit }) => ({
      itemName: getItemDisplayName(item),
      autoSellProfit: profit,
    })),
    autoSellMultiplier: input.autoSellMultiplier > 1 ? input.autoSellMultiplier : undefined,
    remainingPartyHP: finalRemainingPartyHp,
    maxPartyHP: input.maxPartyHp,
  };

  const hasSuperRareMatch = input.finalization.rewards.some((item) => (
    item.superRare > 0
      && matchesDiaryThreshold(item, input.diarySettings.superRareThreshold)
  ));
  const hasBossMatch = input.finalization.rewards.some((item) => (
    getItemRarityCode(item) === 'bossRare'
      && matchesDiaryThreshold(item, input.diarySettings.bossThreshold)
  ));
  const hasMythicMatch = input.finalization.rewards.some((item) => (
    getItemRarityCode(item) === 'mythicRare'
      && matchesDiaryThreshold(item, input.diarySettings.mythicThreshold)
  ));
  const hasRareMatch = input.finalization.rewards.some((item) => (
    getItemRarityCode(item) === 'eliteRare'
      && matchesDiaryThreshold(item, input.diarySettings.rareThreshold)
  ));

  const diaryTriggers: DiaryLog['triggers'] = [];
  const outcomeTrigger = getDiaryOutcomeTrigger(
    input.transaction.finalOutcome,
    input.finalization.endedWithDrawRetreat,
    input.diarySettings.defeatNotificationMode,
  );
  if (outcomeTrigger) diaryTriggers.push(outcomeTrigger);
  if (input.isGodsBattle && input.diarySettings.notifyGodsBattle) {
    diaryTriggers.push('godsBattle');
  }
  if (hasSuperRareMatch) {
    diaryTriggers.push('superRare');
  } else {
    if (hasMythicMatch) diaryTriggers.push('mythicRare');
    if (hasBossMatch) diaryTriggers.push('bossRare');
    if (hasRareMatch) diaryTriggers.push('eliteRare');
  }

  return {
    log,
    diaryTriggers,
    shouldRetainCompleteNarration: diaryTriggers.length > 0
      || input.finalization.requiresUnlockNarration,
  };
}
