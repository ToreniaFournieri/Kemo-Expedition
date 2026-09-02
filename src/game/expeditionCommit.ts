import type {
  GameBags,
  GameState,
  InventoryRecord,
  Party,
} from '../types/index.ts';
import { planPendingExpeditionDiaryLog } from './expeditionDiary.ts';
import { planGlossaryRevealFromEncounter } from './glossaryDisclosure.ts';
import {
  planCommittedExpeditionState,
  type CommittedExpeditionStateProjection,
  type PlanCommittedExpeditionStateInput,
} from './expeditionStateInstallation.ts';
import type { ExpeditionTransactionResult } from './expeditionTransaction.ts';

export interface PlanExpeditionCommitInput {
  readonly state: GameState;
  readonly partyIndex: number;
  readonly party: Party;
  readonly bags: GameBags;
  readonly log: NonNullable<Party['lastExpeditionLog']>;
  readonly diaryTriggers: NonNullable<Party['pendingDiaryLog']>['triggers'];
  readonly diaryCreatedAt: number;
  readonly diaryIdToken: string | null;
  readonly inventory: InventoryRecord;
  readonly gold: number;
  readonly transaction: Pick<
    ExpeditionTransactionResult,
    | 'revealedItemIds'
    | 'revealedAbilityIds'
    | 'revealedTerrainKeys'
    | 'enemyBattleStats'
  >;
  readonly finalization: PlanCommittedExpeditionStateInput['finalization'];
  readonly defaultUnlockedDeities: readonly string[];
}

/**
 * Deterministic committed-expedition tail coordination. Forecast selection,
 * timestamp/token allocation, and final reducer publication remain caller-owned.
 */
export function planExpeditionCommit(
  input: PlanExpeditionCommitInput,
): CommittedExpeditionStateProjection {
  const pendingDiaryLog = planPendingExpeditionDiaryLog({
    log: input.log,
    triggers: input.diaryTriggers,
    createdAt: input.diaryCreatedAt,
    idToken: input.diaryIdToken,
  });
  const { revealedGlossaryAbilityIds } = planGlossaryRevealFromEncounter({
    global: input.state.global,
    abilityIds: input.transaction.revealedAbilityIds,
  });

  return planCommittedExpeditionState({
    state: input.state,
    partyIndex: input.partyIndex,
    party: input.party,
    bags: input.bags,
    log: input.log,
    pendingDiaryLog,
    inventory: input.inventory,
    gold: input.gold,
    revealedGlossaryAbilityIds,
    transaction: input.transaction,
    finalization: input.finalization,
    defaultUnlockedDeities: input.defaultUnlockedDeities,
  });
}
