import type {
  Dungeon,
  EnemyDef,
  GameState,
  Party,
} from '../types/index.ts';
import {
  renderExpeditionServiceResult,
  type ExpeditionRewardPresentation,
  type RenderedExpeditionServiceResult,
} from './expeditionPresentation.ts';
import type { ExpeditionServiceResult } from './expeditionService.ts';
import {
  planExpeditionFinalization,
  type ExpeditionFinalizationPlan,
} from './expeditionTransaction.ts';

export interface PlanExpeditionPostServiceInput {
  readonly serviceResult: ExpeditionServiceResult<ExpeditionRewardPresentation>;
  readonly state: Pick<GameState, 'global' | 'parties'>;
  readonly party: Pick<
    Party,
    'clearGateProgress' | 'clearGateStatus' | 'defeatedBossExpeditions' | 'expeditionStats'
  >;
  readonly statusParty: Pick<Party, 'characters'>;
  readonly dungeon: Dungeon;
  readonly installedGold: number;
  readonly isGodsBattle: boolean;
  readonly maxPartyHp: number;
  readonly enemyDefinitions: readonly Pick<EnemyDef, 'id' | 'enemyType'>[];
  readonly deferBattleNarration: boolean;
}

export interface ExpeditionPostServicePlan {
  readonly finalization: ExpeditionFinalizationPlan;
  readonly presentation: RenderedExpeditionServiceResult;
}

/**
 * Random-free application coordination after the neutral expedition service.
 * Inventory checkpoint completion deliberately remains with the reducer after
 * this planner returns so defeat rollback keeps its historical timing.
 */
export function planExpeditionPostService(
  input: PlanExpeditionPostServiceInput,
): ExpeditionPostServicePlan {
  const finalization = planExpeditionFinalization({
    transaction: input.serviceResult.transaction,
    initialGold: input.state.global.gold,
    installedGold: input.installedGold,
    isGodsBattle: input.isGodsBattle,
    dungeonId: input.dungeon.id,
    clearGateProgress: input.party.clearGateProgress ?? {},
    clearGateStatus: input.party.clearGateStatus ?? {},
    defeatedBossExpeditions: input.party.defeatedBossExpeditions ?? {},
    expeditionStats: input.party.expeditionStats,
    altarVictoriesByEnemyType: input.state.global.altarVictoriesByEnemyType ?? {},
    partyCharacters: input.statusParty.characters,
    enemyDefinitions: input.enemyDefinitions,
    currentUnlockedPartySlots: input.state.parties.length,
    completedBossVictory: input.serviceResult.completedBossVictory,
  });
  const presentation = renderExpeditionServiceResult({
    result: input.serviceResult,
    dungeon: input.dungeon,
    maxPartyHp: input.maxPartyHp,
    isGodsBattle: input.isGodsBattle,
    deferBattleNarration: input.deferBattleNarration,
    newlyUnlockedGateKey: finalization.outcome.newlyUnlockedGateKey,
  });

  return { finalization, presentation };
}
