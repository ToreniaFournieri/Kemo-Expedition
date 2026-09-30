import assert from 'node:assert/strict';
import {
  API_V1_DELIVERY_MAX_ATTEMPTS,
  claimNextDelivery,
  prepareSaveReplacement,
  projectDelivery,
  recoverInterruptedDeliveries,
  settleDelivery,
  type ApiV1DeliveryRecord,
} from '../../src/api/v1/deliveries';
import { completeDeliveredBenefit } from '../../src/api/v1/deliveryCompletion';
import { executeApiV1CommitTransaction, type ApiV1CommitAuthorityDependencies, type ApiV1ControlMetadata } from '../../src/api/v1/authority';
import { FEEDBACK_REWARD_COOLDOWN_MS } from '../../src/game/feedbackRewards';
import { createFreshGameState } from '../../src/hooks/useGameState';

// SpecRef: 9.1.4.15 | External delivery and rewards
// The delivery lifecycle is exercised without React, Electron, HTTP, or a real network sender.

const t0 = Date.parse('2026-01-01T00:00:00.000Z');
const state = createFreshGameState('ja', t0);

function job(id: string, overrides: Partial<ApiV1DeliveryRecord> = {}): ApiV1DeliveryRecord {
  const at = new Date(t0).toISOString();
  return { deliveryId: id, status: 'queued', createdAt: at, updatedAt: at, failureReason: null, rewardApplied: false, operation: 'commit/setting/feedback', parameters: { text: 'private feedback' }, files: {}, ...overrides };
}

// 1. Claiming is serialized and oldest-first: nothing is claimed while a send is in flight.
{
  const first = claimNextDelivery([job('a'), job('b')], t0);
  assert.equal(first.claimed?.deliveryId, 'a');
  assert.equal(first.claimed?.status, 'sending');
  assert.equal(first.claimed?.attempts, 1);
  const second = claimNextDelivery(first.deliveries, t0);
  assert.equal(second.claimed, null, 'a second job is not claimed while one is sending');
  assert.equal(claimNextDelivery([], t0).claimed, null);
}

// 2. Settling: delivered, safe retry up to the limit, definitive rejection, and ambiguous outcomes.
{
  const sending = claimNextDelivery([job('a')], t0).deliveries;
  assert.equal(settleDelivery(sending, 'a', { kind: 'delivered' }, t0)[0].status, 'delivered');
  assert.equal(settleDelivery(sending, 'a', { kind: 'rejected', reason: 'http_400' }, t0)[0].status, 'failed');
  const ambiguous = settleDelivery(sending, 'a', { kind: 'ambiguous', reason: 'timeout_after_send' }, t0)[0];
  assert.equal(ambiguous.status, 'unknown');
  assert.equal(claimNextDelivery([ambiguous], t0).claimed, null, 'an unknown delivery is never resent automatically');

  let queue: ApiV1DeliveryRecord[] = [job('a')];
  for (let attempt = 1; attempt <= API_V1_DELIVERY_MAX_ATTEMPTS; attempt += 1) {
    const claim = claimNextDelivery(queue, t0);
    assert.ok(claim.claimed, `attempt ${attempt} is claimable`);
    queue = settleDelivery(claim.deliveries, 'a', { kind: 'not_sent', reason: 'dns_failure' }, t0);
    assert.equal(queue[0].status, attempt < API_V1_DELIVERY_MAX_ATTEMPTS ? 'queued' : 'failed');
  }
  assert.throws(() => settleDelivery([job('a')], 'a', { kind: 'delivered' }, t0), /illegal_action/, 'only a sending job can settle');
}

// 3. Restart recovery: an interrupted send becomes unknown; every other status is untouched.
{
  const recovered = recoverInterruptedDeliveries([job('a', { status: 'sending' }), job('b'), job('c', { status: 'delivered' })], t0);
  assert.deepEqual(recovered.map((entry) => entry.status), ['unknown', 'queued', 'delivered']);
  assert.equal(recovered[0].failureReason, 'interrupted_while_sending');
}

// 4. Save replacement is refused while sending, and otherwise cancels only queued jobs.
{
  assert.equal(prepareSaveReplacement([job('a', { status: 'sending' })], t0).ok, false);
  const replaced = prepareSaveReplacement([job('a'), job('b', { status: 'unknown' }), job('c', { status: 'delivered' })], t0);
  assert.equal(replaced.ok, true);
  if (!replaced.ok) throw new Error('unreachable');
  assert.deepEqual(replaced.deliveries.map((entry) => entry.status), ['cancelled', 'unknown', 'delivered']);
}

// 5. The public projection exposes exactly the six specified members and never the stored payload.
{
  const projected = projectDelivery(job('a', { attempts: 2, completionApplied: true }));
  assert.deepEqual(Object.keys(projected).sort(), ['createdAt', 'deliveryId', 'failureReason', 'rewardApplied', 'status', 'updatedAt']);
}

// 6. Completion grants the feedback reward once, and never for a job that is not delivered.
{
  const delivered = [job('a', { status: 'delivered' })];
  const first = completeDeliveredBenefit(state, delivered, { hasLegacySubmission: false, lastSuccessfulSubmissionAt: null }, 'a', t0);
  assert.equal(first.rewardApplied, true);
  assert.equal(first.stateChanged, true);
  assert.equal(first.state.global.prana, state.global.prana + 10);
  assert.equal(first.feedbackReward.lastSuccessfulSubmissionAt, t0);
  assert.equal(first.deliveries[0].rewardApplied, true);

  const again = completeDeliveredBenefit(first.state, first.deliveries, first.feedbackReward, 'a', t0 + 1_000);
  assert.equal(again.rewardApplied, false);
  assert.equal(again.stateChanged, false);
  assert.equal(again.state.global.prana, first.state.global.prana, 'a completed job can never grant twice');

  for (const status of ['queued', 'sending', 'failed', 'unknown', 'cancelled'] as const) {
    const blocked = completeDeliveredBenefit(state, [job('a', { status })], { hasLegacySubmission: false, lastSuccessfulSubmissionAt: null }, 'a', t0);
    assert.equal(blocked.rewardApplied, false, `${status} never grants a reward`);
    assert.equal(blocked.state, state);
  }
}

// 7. A submission inside the cooldown grants nothing but still restarts the cooldown; progress reports grant no Prana.
{
  const recent = { hasLegacySubmission: true, lastSuccessfulSubmissionAt: t0 };
  const cooldown = completeDeliveredBenefit(state, [job('a', { status: 'delivered' })], recent, 'a', t0 + FEEDBACK_REWARD_COOLDOWN_MS - 1);
  assert.equal(cooldown.rewardApplied, false);
  assert.equal(cooldown.state, state);
  assert.equal(cooldown.feedbackReward.lastSuccessfulSubmissionAt, t0 + FEEDBACK_REWARD_COOLDOWN_MS - 1);
  assert.equal(cooldown.deliveries[0].completionApplied, true);

  const report = completeDeliveredBenefit(state, [job('a', { status: 'delivered', operation: 'commit/progress/progressReport' })], recent, 'a', t0);
  assert.equal(report.state, state);
  assert.equal(report.feedbackReward, recent, 'a progress report does not touch the feedback cooldown');
}

// 8. Authority: reset/import is refused while a send is in flight and cancels queued jobs otherwise.
{
  const persisted: ApiV1ControlMetadata[] = [];
  const dependencies: ApiV1CommitAuthorityDependencies = {
    gameMode: 'mode.normal', enemyLevelOffset: 0, cycleDurationScale: 1, applyAutoEquipment: (s) => s,
    persist: async (_state, control) => { persisted.push(structuredClone(control)); },
    publish: async () => undefined,
    createOpaqueId: () => 'opaque-token-fixed', createRandomSeed: () => 1, now: () => t0,
  };
  const base = (deliveries: ApiV1DeliveryRecord[]): ApiV1ControlMetadata => ({ revisionHighWater: 0, inGameTime: t0, receipts: [], tombstones: [], confirmations: [], popupEvents: [], deliveries });
  const input = (control: ApiV1ControlMetadata, confirmationToken?: string) => ({
    operation: 'commit/setting/backup/reset', expectedRevision: 0, idempotencyKey: 'reset-key-000000001', confirmationToken: confirmationToken ?? null,
    requestId: 'request-fixed', parameters: {}, uploadedFiles: {}, state, simulatedAt: t0, control,
  });

  async function reset(deliveries: ApiV1DeliveryRecord[]) {
    const challenge = await executeApiV1CommitTransaction(input(base(deliveries)), dependencies);
    assert.equal(challenge.ok, false);
    if (challenge.ok || challenge.error.code !== 'confirmation_required' || !challenge.durableControl) throw new Error('expected a confirmation challenge');
    const token = String((challenge.error.details as { confirmationToken: string }).confirmationToken);
    return executeApiV1CommitTransaction(input(challenge.durableControl, token), dependencies);
  }

  const blocked = await reset([job('a', { status: 'sending' })]);
  assert.equal(blocked.ok, false);
  if (blocked.ok) throw new Error('expected illegal_action');
  assert.equal(blocked.error.code, 'illegal_action');

  const allowed = await reset([job('a'), job('b', { status: 'unknown' })]);
  assert.equal(allowed.ok, true);
  if (!allowed.ok) throw new Error(allowed.error.code);
  assert.deepEqual(allowed.control.deliveries?.map((entry) => entry.status), ['cancelled', 'unknown']);
  assert.ok(persisted.length > 0);
}

console.log('apiV1Deliveries profile ok');
