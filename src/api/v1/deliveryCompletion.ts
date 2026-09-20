import type { GameState } from '../../types';
import { gameReducer } from '../../hooks/useGameState';
import { completeFeedbackSubmission, type FeedbackRewardState } from '../../game/feedbackRewards';
import { replaceDelivery, stampDelivery, type ApiV1DeliveryRecord } from './deliveries';

// SpecRef: 9.1.4.15 | External delivery and rewards | Serialized completion transaction

export interface ApiV1DeliveryCompletion {
  state: GameState;
  deliveries: ApiV1DeliveryRecord[];
  feedbackReward: FeedbackRewardState;
  /** True when this call applied a benefit; false for a no-op or a cooldown submission. */
  rewardApplied: boolean;
  /** True when state changed and the caller must publish one new public revision. */
  stateChanged: boolean;
}

/**
 * The single serialized completion transaction for a confirmed delivery. Only `delivered` jobs complete, and each
 * completes at most once; queued, failed, unknown, and cancelled jobs never grant anything.
 */
export function completeDeliveredBenefit(
  state: GameState,
  deliveries: readonly ApiV1DeliveryRecord[],
  feedbackReward: FeedbackRewardState,
  deliveryId: string,
  now: number,
): ApiV1DeliveryCompletion {
  const record = deliveries.find((entry) => entry.deliveryId === deliveryId);
  if (!record || record.status !== 'delivered' || record.completionApplied) {
    return { state, deliveries: [...deliveries], feedbackReward, rewardApplied: false, stateChanged: false };
  }
  let nextState = state;
  let nextFeedbackReward = feedbackReward;
  let rewardApplied = false;
  if (record.operation === 'commit/setting/feedback') {
    const result = completeFeedbackSubmission(feedbackReward, now);
    nextFeedbackReward = result.nextState;
    if (result.shouldGrantReward) {
      nextState = gameReducer(state, { type: 'GRANT_FEEDBACK_REWARD' });
      rewardApplied = true;
    }
  }
  return {
    state: nextState,
    deliveries: replaceDelivery(deliveries, deliveryId, (entry) => ({ ...entry, completionApplied: true, rewardApplied, updatedAt: stampDelivery(now) })),
    feedbackReward: nextFeedbackReward,
    rewardApplied,
    stateChanged: nextState !== state,
  };
}
