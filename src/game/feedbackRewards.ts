// SpecRef: 8.6 | UI_SETTING | Feedback reward and migration
export const FEEDBACK_REWARD_COOLDOWN_MS = 168 * 60 * 60 * 1000;

export type FeedbackRewardState = {
  hasLegacySubmission: boolean;
  lastSuccessfulSubmissionAt: number | null;
};

export type FeedbackRewardEligibility =
  | 'never-submitted'
  | 'legacy-migration'
  | 'cooldown-complete'
  | 'cooldown';

export function parseFeedbackSubmissionTimestamp(value: string | null): number | null {
  if (value === null || value.trim() === '') return null;
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp >= 0 ? timestamp : null;
}

export function getFeedbackRewardEligibility(
  state: FeedbackRewardState,
  now = Date.now(),
): FeedbackRewardEligibility {
  if (state.lastSuccessfulSubmissionAt === null) {
    return state.hasLegacySubmission ? 'legacy-migration' : 'never-submitted';
  }
  return now - state.lastSuccessfulSubmissionAt >= FEEDBACK_REWARD_COOLDOWN_MS
    ? 'cooldown-complete'
    : 'cooldown';
}

export function isFeedbackRewardEligible(state: FeedbackRewardState, now = Date.now()): boolean {
  return getFeedbackRewardEligibility(state, now) !== 'cooldown';
}

export function completeFeedbackSubmission(
  state: FeedbackRewardState,
  submittedAt = Date.now(),
): { shouldGrantReward: boolean; nextState: FeedbackRewardState } {
  return {
    shouldGrantReward: isFeedbackRewardEligible(state, submittedAt),
    nextState: {
      hasLegacySubmission: true,
      lastSuccessfulSubmissionAt: submittedAt,
    },
  };
}
