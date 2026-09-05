import type {
  DiaryLog,
  GameBags,
  GameState,
  InventoryRecord,
  Party,
} from '../types/index.ts';
import type {
  ExpeditionFinalizationPlan,
  ExpeditionTransactionResult,
} from './expeditionTransaction.ts';

export interface PlanCommittedExpeditionStateInput {
  readonly state: GameState;
  readonly partyIndex: number;
  readonly party: Party;
  readonly bags: GameBags;
  readonly log: NonNullable<Party['lastExpeditionLog']>;
  readonly pendingDiaryLog: DiaryLog | null;
  readonly inventory: InventoryRecord;
  readonly gold: number;
  readonly revealedGlossaryAbilityIds: string[];
  readonly transaction: Pick<
    ExpeditionTransactionResult,
    | 'revealedItemIds'
    | 'revealedTerrainKeys'
    | 'enemyBattleStats'
  >;
  readonly finalization: Pick<
    ExpeditionFinalizationPlan,
    | 'outcome'
    | 'autoSellProfit'
    | 'expeditionStats'
    | 'altarVictoriesByEnemyType'
    | 'pendingUnlockPartySlot'
  >;
  readonly defaultUnlockedDeities: readonly string[];
}

export interface CommittedExpeditionStateProjection {
  readonly parties: Party[];
  readonly global: GameState['global'];
}

export interface PlanForecastExpeditionStateInput {
  readonly state: GameState;
  readonly partyIndex: number;
  readonly party: Party;
  readonly bags: GameBags;
  readonly finalPartyHp: number;
}

/** Private, non-persisted forecast projection. Registration remains caller-owned. */
export function planForecastExpeditionState(
  input: PlanForecastExpeditionStateInput,
): GameState {
  const parties = [...input.state.parties];
  parties[input.partyIndex] = {
    ...input.party,
    bags: input.bags,
    lastExpeditionLog: null,
    pendingDiaryLog: null,
    currentHp: input.finalPartyHp,
  };
  return { ...input.state, parties };
}

/**
 * Pure application projection for a committed expedition. The caller retains
 * forecast selection, Diary ID/time generation, checkpoint lifecycle, and the
 * final reducer publication decision.
 */
export function planCommittedExpeditionState(
  input: PlanCommittedExpeditionStateInput,
): CommittedExpeditionStateProjection {
  const pendingUnlockState = input.finalization.pendingUnlockPartySlot !== null
    ? {
        deityNames: [...input.defaultUnlockedDeities],
        partySlotCount: input.finalization.pendingUnlockPartySlot,
      }
    : null;
  const updatedParties = [...input.state.parties];
  updatedParties[input.partyIndex] = {
    ...input.party,
    bags: input.bags,
    expeditionRewardsPending: true,
    pendingClearGateSnapshot: {
      progress: { ...(input.party.clearGateProgress ?? {}) },
      status: { ...(input.party.clearGateStatus ?? {}) },
      defeatedBossExpeditions: { ...(input.party.defeatedBossExpeditions ?? {}) },
    },
    defeatedBossExpeditions: input.finalization.outcome.defeatedBossExpeditions,
    clearGateProgress: input.finalization.outcome.clearGateProgress,
    clearGateStatus: input.finalization.outcome.clearGateStatus,
    lastExpeditionLog: input.log,
    pendingDiaryLog: input.pendingDiaryLog,
    currentHp: input.log.remainingPartyHP,
    // Party-cycle spending/donation is defined from the latest expedition only.
    pendingProfit: input.finalization.autoSellProfit,
    expeditionStats: input.finalization.expeditionStats,
    pendingUnlockState,
  };

  return {
    parties: updatedParties,
    global: {
      ...input.state.global,
      inventory: input.inventory,
      gold: input.gold,
      revealedItemCompendiumItemIds: input.transaction.revealedItemIds,
      revealedGlossaryAbilityIds: input.revealedGlossaryAbilityIds,
      revealedGlossaryTerrainKeys: input.transaction.revealedTerrainKeys,
      enemyBattleStats: input.transaction.enemyBattleStats,
      altarVictoriesByEnemyType: input.finalization.altarVictoriesByEnemyType,
    },
  };
}
