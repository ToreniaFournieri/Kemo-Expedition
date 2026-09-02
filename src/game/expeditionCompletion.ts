import type { Party } from '../types/index.ts';
import {
  planCompletedExpeditionPresentation,
  type CompletedExpeditionPresentationPlan,
  type PlanCompletedExpeditionPresentationInput,
} from './expeditionCompletionPresentation.ts';
import { replayDeferredExpeditionNarrations } from './expeditionNarrationReplay.ts';
import type { DeferredExpeditionBattleNarration } from './expeditionPresentation.ts';
import type { ComputedPartyStatus } from './partyComputation.ts';

export interface CompleteExpeditionPresentationInput
  extends PlanCompletedExpeditionPresentationInput {
  readonly deferredBattleNarrations: readonly DeferredExpeditionBattleNarration[];
  readonly party: Party;
  readonly partyStatus: ComputedPartyStatus;
}

export type CompletedExpeditionResult = Pick<
  CompletedExpeditionPresentationPlan,
  'log' | 'diaryTriggers'
>;

/**
 * Application coordination for completed-log planning and optional seeded
 * narration reconstruction. RNG, time, forecast, and publication stay outside.
 */
export function completeExpeditionPresentation(
  input: CompleteExpeditionPresentationInput,
): CompletedExpeditionResult {
  const {
    deferredBattleNarrations,
    party,
    partyStatus,
    ...presentationInput
  } = input;
  const {
    log,
    diaryTriggers,
    shouldRetainCompleteNarration,
  } = planCompletedExpeditionPresentation(presentationInput);

  if (shouldRetainCompleteNarration && deferredBattleNarrations.length > 0) {
    replayDeferredExpeditionNarrations({
      narrations: deferredBattleNarrations,
      party,
      partyStatus,
    });
  }

  return { log, diaryTriggers };
}
