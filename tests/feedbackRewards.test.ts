import assert from 'node:assert/strict';
import test from 'node:test';
import {
  completeFeedbackSubmission,
  FEEDBACK_REWARD_COOLDOWN_MS,
  getFeedbackRewardEligibility,
  isFeedbackRewardEligible,
  parseFeedbackSubmissionTimestamp,
} from '../src/game/feedbackRewards.ts';

const NOW = 2_000_000_000_000;

test('feedback reward is available to a player who has never submitted feedback', () => {
  const state = { hasLegacySubmission: false, lastSuccessfulSubmissionAt: null };
  assert.equal(getFeedbackRewardEligibility(state, NOW), 'never-submitted');
  assert.equal(isFeedbackRewardEligible(state, NOW), true);
});

test('legacy feedback submitters receive the one-time migration reward', () => {
  const state = { hasLegacySubmission: true, lastSuccessfulSubmissionAt: null };
  assert.equal(getFeedbackRewardEligibility(state, NOW), 'legacy-migration');
  assert.equal(isFeedbackRewardEligible(state, NOW), true);

  const migratedSubmission = completeFeedbackSubmission(state, NOW);
  assert.equal(migratedSubmission.shouldGrantReward, true);
  assert.equal(
    completeFeedbackSubmission(migratedSubmission.nextState, NOW + 1).shouldGrantReward,
    false,
  );
});

test('feedback reward remains unavailable until the full 168-hour cooldown passes', () => {
  const lastSuccessfulSubmissionAt = NOW - FEEDBACK_REWARD_COOLDOWN_MS;
  const state = { hasLegacySubmission: true, lastSuccessfulSubmissionAt };

  assert.equal(getFeedbackRewardEligibility(state, NOW - 1), 'cooldown');
  assert.equal(isFeedbackRewardEligible(state, NOW - 1), false);
  assert.equal(getFeedbackRewardEligibility(state, NOW), 'cooldown-complete');
  assert.equal(isFeedbackRewardEligible(state, NOW), true);
});

test('every successful feedback submission starts a new cooldown', () => {
  const priorSubmission = NOW - 60_000;
  const submission = completeFeedbackSubmission({
    hasLegacySubmission: true,
    lastSuccessfulSubmissionAt: priorSubmission,
  }, NOW);

  assert.equal(submission.shouldGrantReward, false);
  assert.deepEqual(submission.nextState, {
    hasLegacySubmission: true,
    lastSuccessfulSubmissionAt: NOW,
  });
  assert.equal(isFeedbackRewardEligible(submission.nextState, NOW + FEEDBACK_REWARD_COOLDOWN_MS - 1), false);
});

test('feedback submission timestamps accept persisted epochs and reject invalid data', () => {
  assert.equal(parseFeedbackSubmissionTimestamp(String(NOW)), NOW);
  assert.equal(parseFeedbackSubmissionTimestamp(null), null);
  assert.equal(parseFeedbackSubmissionTimestamp(''), null);
  assert.equal(parseFeedbackSubmissionTimestamp('invalid'), null);
  assert.equal(parseFeedbackSubmissionTimestamp('-1'), null);
});
