import assert from 'node:assert/strict';
import {
  executeApiV1CommitTransaction,
  SerializedApplicationApiAuthority,
  type ApiV1CommitAuthorityDependencies,
  type ApiV1CommitAuthorityInput,
  type ApiV1ControlMetadata,
} from '../../src/api/v1/authority';
import { createFreshGameState } from '../../src/hooks/useGameState';
import { stageApiV1ElapsedProgression } from '../../src/api/v1/elapsedProgression';
import { resetGameplayRandomForTesting } from '../../src/game/gameplayRandom';
import type { GameState } from '../../src/types';

// SpecRef: 9.1.4.4 | Commit, revision, and idempotency contract
// These fixtures exercise the transaction boundary without React, Electron, or HTTP.

const fixedNow = Date.parse('2026-01-01T00:00:00.000Z');
const seed = createFreshGameState('ja', fixedNow);

function control(): ApiV1ControlMetadata {
  return { revisionHighWater: 0, inGameTime: fixedNow, receipts: [], tombstones: [], confirmations: [], popupEvents: [], deliveries: [] };
}

function input(overrides: Partial<ApiV1CommitAuthorityInput> = {}): ApiV1CommitAuthorityInput {
  return {
    operation: 'commit/base/changeJewelPriorityParty',
    expectedRevision: 0,
    idempotencyKey: 'authority-key-0001',
    requestId: 'request-fixed-id',
    parameters: { partyNumber: 'none' },
    uploadedFiles: {},
    state: seed,
    simulatedAt: fixedNow,
    control: control(),
    ...overrides,
  };
}

function dependencies(overrides: Partial<ApiV1CommitAuthorityDependencies> = {}) {
  const persisted: Array<{ state: GameState; control: ApiV1ControlMetadata }> = [];
  const published: GameState[] = [];
  const value: ApiV1CommitAuthorityDependencies = {
    gameMode: 'mode.normal',
    enemyLevelOffset: 0,
    cycleDurationScale: 1,
    applyAutoEquipment: state => state,
    persist: async (state, metadata) => { persisted.push({ state, control: metadata }); },
    publish: async state => { published.push(state); },
    createOpaqueId: () => 'opaque-fixed-id',
    createRandomSeed: () => 0xa91f_0028,
    now: () => fixedNow,
    ...overrides,
  };
  return { value, persisted, published };
}

// A successful mutation persists its state, receipt, and revision before publishing it.
{
  const deps = dependencies();
  const result = await executeApiV1CommitTransaction(input(), deps.value);
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(result.error.code);
  assert.equal(result.response.previousRevision, 0);
  assert.equal(result.response.revision, 1);
  assert.equal(result.control.receipts.length, 1);
  assert.equal(result.state.global.jewelAutoEquipPriorityPartyId, null);
  assert.equal(seed.global.jewelAutoEquipPriorityPartyId, 1, 'the immutable input is untouched');
  assert.equal(deps.persisted.length, 1);
  assert.equal(deps.published.length, 1);

  const replayDeps = dependencies();
  const replay = await executeApiV1CommitTransaction(input({ state: result.state, control: result.control, expectedRevision: 0 }), replayDeps.value);
  assert.equal(replay.ok, true);
  if (!replay.ok) throw new Error(replay.error.code);
  assert.deepEqual(replay.response, result.response, 'a lost response replays the durable receipt verbatim');
  assert.equal(replayDeps.persisted.length, 0);
  assert.equal(replayDeps.published.length, 0);

  const conflict = await executeApiV1CommitTransaction(input({ state: result.state, control: result.control, expectedRevision: 1, parameters: { partyNumber: 2 } }), dependencies().value);
  assert.equal(conflict.ok, false);
  if (conflict.ok) throw new Error('expected conflict');
  assert.equal(conflict.error.code, 'idempotency_conflict', 'receipt lookup precedes stale-revision checks');
}

// Stale revisions are rejected without persistence or publication.
{
  const deps = dependencies();
  const result = await executeApiV1CommitTransaction(input({ expectedRevision: 9 }), deps.value);
  assert.equal(result.ok, false);
  if (result.ok) throw new Error('expected stale revision');
  assert.equal(result.error.code, 'stale_revision');
  assert.equal(deps.persisted.length, 0);
  assert.equal(deps.published.length, 0);
}

// Persistence failure rolls back state, revision, receipt, and publication as one unit.
{
  const originalControl = control();
  const deps = dependencies({ persist: async () => { throw new Error('injected manifest failure'); } });
  const result = await executeApiV1CommitTransaction(input({ control: originalControl }), deps.value);
  assert.equal(result.ok, false);
  if (result.ok) throw new Error('expected save failure');
  assert.equal(result.error.code, 'save_failed');
  assert.equal(originalControl.revisionHighWater, 0);
  assert.equal(originalControl.receipts.length, 0);
  assert.equal(seed.global.jewelAutoEquipPriorityPartyId, 1);
  assert.equal(deps.published.length, 0);
}

// A no-op still persists its replay receipt but consumes no revision and publishes no state.
{
  const deps = dependencies();
  const result = await executeApiV1CommitTransaction(input({ idempotencyKey: 'authority-key-noop', parameters: { partyNumber: 1 } }), deps.value);
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(result.error.code);
  assert.equal(result.response.revision, 0);
  assert.equal(result.response.changedResources.length, 0);
  assert.equal(result.control.receipts.length, 1);
  assert.equal(deps.persisted.length, 1);
  assert.equal(deps.published.length, 0);
}

// Once manifest persistence succeeds, renderer publication failure remains a durable success.
{
  let publicationFailure: unknown;
  const deps = dependencies({
    publish: async () => { throw new Error('renderer unavailable'); },
    onPublicationFailure: error => { publicationFailure = error; },
  });
  const result = await executeApiV1CommitTransaction(input({ idempotencyKey: 'authority-key-publish' }), deps.value);
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(result.error.code);
  assert.equal(result.published, false);
  assert.equal(result.response.revision, 1);
  assert.equal(deps.persisted.length, 1);
  assert.ok(String(publicationFailure).includes('renderer unavailable'));
}

// Confirmation reservations are durable, revision-neutral, and stable for identical retries.
{
  const deps = dependencies();
  const confirmationInput = input({ operation: 'commit/setting/backup/reset', idempotencyKey: 'authority-key-confirm', parameters: {} });
  const first = await executeApiV1CommitTransaction(confirmationInput, deps.value);
  assert.equal(first.ok, false);
  if (first.ok) throw new Error('expected confirmation challenge');
  assert.equal(first.error.code, 'confirmation_required');
  assert.equal(first.durableControl?.revisionHighWater, 0);
  assert.equal(first.durableControl?.receipts.length, 0);
  assert.equal(first.durableControl?.confirmations?.[0].token, 'opaque-fixed-id');
  assert.equal(deps.persisted.length, 1);

  const retryDeps = dependencies();
  const retry = await executeApiV1CommitTransaction({ ...confirmationInput, control: first.durableControl! }, retryDeps.value);
  assert.equal(retry.ok, false);
  if (retry.ok) throw new Error('expected confirmation challenge');
  assert.equal(retry.error.details?.confirmationToken, 'opaque-fixed-id');
  assert.equal(retry.durableControl?.confirmations?.length, 1);
}

// Reset fences the old replay buffer in the same durable transaction. The confirmation reservation itself leaves the
// buffer intact; only the successful replacement clears it.
{
  const withPopup = control();
  withPopup.popupEvents = [{
    apiVersion: 'v1', schemaVersion: 1, revision: 0, sequence: 1, eventId: '0:1', eventKey: 'popup.test',
    args: {}, partyNumber: 1, diaryEntryId: null, groupKey: null, createdAt: new Date(fixedNow).toISOString(),
  }];
  const deps = dependencies();
  const resetInput = input({ operation: 'commit/setting/backup/reset', idempotencyKey: 'authority-reset-fence', control: withPopup });
  const challenge = await executeApiV1CommitTransaction(resetInput, deps.value);
  assert.equal(challenge.ok, false);
  if (challenge.ok) throw new Error('expected confirmation');
  assert.equal(challenge.durableControl?.popupEvents?.length, 1);
  const confirmed = await executeApiV1CommitTransaction({
    ...resetInput,
    control: challenge.durableControl!,
    confirmationToken: String(challenge.error.details?.confirmationToken),
  }, deps.value);
  assert.equal(confirmed.ok, true);
  if (!confirmed.ok) throw new Error(confirmed.error.code);
  assert.deepEqual(confirmed.control.popupEvents, []);
  assert.deepEqual(deps.persisted.at(-1)?.control.popupEvents, [], 'the replay fence and replacement state share one durable write');
}

// The snapshot owner rejects an admitted duplicate immediately and keeps reads on the pre-commit snapshot.
{
  let releasePersistence!: () => void;
  const persistenceGate = new Promise<void>((resolve) => { releasePersistence = resolve; });
  const deps = dependencies({ persist: async () => { await persistenceGate; } });
  const owner = new SerializedApplicationApiAuthority({ state: seed, control: control(), simulatedAt: fixedNow });
  const { state: _state, control: _control, simulatedAt: _simulatedAt, ...queuedInput } = input({ idempotencyKey: 'authority-key-admitted' });
  const pending = owner.executeCommit(queuedInput, deps.value);
  await Promise.resolve();
  const visibleWhilePending = owner.getSnapshot();
  assert.equal(visibleWhilePending.control.revisionHighWater, 0);
  assert.equal(visibleWhilePending.state.global.jewelAutoEquipPriorityPartyId, 1);

  const duplicate = await owner.executeCommit(queuedInput, deps.value);
  assert.equal(duplicate.ok, false);
  if (duplicate.ok) throw new Error('expected operation in progress');
  assert.equal(duplicate.error.code, 'operation_in_progress');

  const conflict = await owner.executeCommit({ ...queuedInput, parameters: { partyNumber: 2 } }, deps.value);
  assert.equal(conflict.ok, false);
  if (conflict.ok) throw new Error('expected admitted conflict');
  assert.equal(conflict.error.code, 'idempotency_conflict');

  releasePersistence();
  const completed = await pending;
  assert.equal(completed.ok, true);
  assert.equal(owner.getSnapshot().control.revisionHighWater, 1);
  assert.equal(owner.getSnapshot().state.global.jewelAutoEquipPriorityPartyId, null);
}

// Elapsed progression privately stages more than one logical Chunk and persists/publishes only the final result.
{
  const chunkNumbers: number[] = [];
  let globalGameplayDraws = 0;
  resetGameplayRandomForTesting(() => { globalGameplayDraws += 1; return 0.5; });
  const deps = dependencies({
    cycleDurationScale: 0.01,
    afterElapsedChunk: async (completed) => { chunkNumbers.push(completed); },
    yieldBetweenChunks: async () => undefined,
  });
  const result = await executeApiV1CommitTransaction(input({
    operation: 'commit/progress/elapsed',
    idempotencyKey: 'authority-key-elapsed',
    parameters: { elapsedSeconds: 180 },
  }), deps.value);
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(result.error.code);
  assert.ok(chunkNumbers.length >= 2, `expected multiple Chunks, received ${chunkNumbers.length}`);
  assert.deepEqual(chunkNumbers, chunkNumbers.map((_, index) => index + 1));
  assert.equal(result.response.revision, 1);
  assert.equal(result.response.data.elapsedSeconds, 180);
  assert.equal(result.response.data.inGameTime, new Date(fixedNow + 180_000).toISOString());
  assert.equal(deps.persisted.length, 1, 'only the complete staged state is persisted');
  assert.equal(deps.published.length, 1, 'only the complete staged state is published');
  assert.equal(globalGameplayDraws, 0, 'the API transaction never consumes the renderer gameplay stream');
  assert.equal(typeof result.control.rngState, 'number', 'the private API RNG high-water state is persisted with the receipt');
  resetGameplayRandomForTesting();
}

// SpecRef: 9.1.4.11 | `illegal_action` and `not_found` `details.reason` is the bare token, not the stringified `Error: …`.
for (const [thrown, code] of [['illegal_action:charge_insufficient', 'illegal_action'], ['not_found', 'not_found']] as const) {
  const deps = dependencies({
    cycleDurationScale: 0.01,
    afterElapsedChunk: async () => { throw new Error(thrown); },
    yieldBetweenChunks: async () => undefined,
  });
  const result = await executeApiV1CommitTransaction(input({
    operation: 'commit/progress/elapsed',
    idempotencyKey: `authority-key-reason-${code}`,
    parameters: { elapsedSeconds: 180 },
    control: control(),
  }), deps.value);
  if (result.ok) throw new Error(`expected ${code}`);
  assert.deepEqual([result.error.code, result.error.details?.reason], [code, thrown]);
}

// An intermediate Chunk failure discards all private state, RNG/log effects, receipt, clock, and revision.
{
  const originalControl = control();
  const deps = dependencies({
    cycleDurationScale: 0.01,
    afterElapsedChunk: async (completed) => { if (completed === 2) throw new Error('injected_chunk_failure'); },
    yieldBetweenChunks: async () => undefined,
  });
  const result = await executeApiV1CommitTransaction(input({
    operation: 'commit/progress/elapsed',
    idempotencyKey: 'authority-key-chunk-fail',
    parameters: { elapsedSeconds: 180 },
    control: originalControl,
  }), deps.value);
  assert.equal(result.ok, false);
  if (result.ok) throw new Error('expected staged Chunk failure');
  assert.equal(result.error.code, 'invalid_request');
  assert.ok(String(result.error.details?.reason).includes('injected_chunk_failure'));
  assert.equal(originalControl.revisionHighWater, 0);
  assert.equal(originalControl.receipts.length, 0);
  assert.equal(seed.global.jewelAutoEquipPriorityPartyId, 1);
  assert.equal(deps.persisted.length, 0);
  assert.equal(deps.published.length, 0);
}

// calculateToRealTime resolves its target once, reports the cap explicitly, and does nothing for a future clock.
{
  const slowCycleOptions = {
    simulatedAt: fixedNow,
    realNow: fixedNow + (13 * 60 * 60 * 1_000),
    gameMode: 'mode.normal' as const,
    enemyLevelOffset: 0,
    cycleDurationScale: 1_000_000,
    applyAutoEquipment: (state: GameState) => state,
    runWithRandom: operation => operation(),
  };
  const capped = await stageApiV1ElapsedProgression(seed, { calculateToRealTime: true }, slowCycleOptions);
  assert.equal(capped.data.requestedElapsedSeconds, 46_800);
  assert.equal(capped.data.acceptedElapsedSeconds, 46_800);
  assert.equal(capped.data.cappedElapsedSeconds, 43_200);
  assert.equal(capped.data.elapsedSeconds, 43_200);
  assert.equal(capped.simulatedAt, fixedNow + 43_200_000);

  const future = await stageApiV1ElapsedProgression(seed, { calculateToRealTime: true }, { ...slowCycleOptions, realNow: fixedNow - 1_000 });
  assert.equal(future.data.elapsedSeconds, 0);
  assert.equal(future.simulatedAt, fixedNow);
  assert.equal(future.state, seed);
}

// Advancing only the in-game clock is still a mutation with one revision, but requires no React state publication.
{
  const deps = dependencies({ cycleDurationScale: 1_000_000 });
  const result = await executeApiV1CommitTransaction(input({
    operation: 'commit/progress/elapsed',
    idempotencyKey: 'authority-key-clock-only',
    parameters: { elapsedSeconds: 60 },
  }), deps.value);
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(result.error.code);
  assert.equal(result.state, seed);
  assert.equal(result.response.revision, 1);
  assert.equal(result.simulatedAt, fixedNow + 60_000);
  assert.equal(deps.persisted.length, 1);
  assert.equal(deps.published.length, 0);
}

// A sortie's party-cycle reset is applied only after the commit is durable, right before publication, never for a failed
// persistence, and receives the cycle the runtime reports.
{
  const events: string[] = [];
  let durablePopupEvents: ApiV1ControlMetadata['popupEvents'];
  const charged = { ...seed, parties: seed.parties.map((party, index) => index === 0 ? { ...party, instantExpeditionStock: 3, instantExpeditionChargeStartedAt: null } : party) } as GameState;
  const cycleDependencies = (overrides: Partial<ApiV1CommitAuthorityDependencies> = {}) => dependencies({
    persist: async (_state, metadata) => { durablePopupEvents = structuredClone(metadata.popupEvents); events.push('persist'); },
    publish: async () => { events.push('publish'); },
    partyCycle: () => ({ state: 'explore' }),
    restDurationMs: () => 4242,
    applyPartyCycleWrites: (writes) => { events.push(`cycle:${writes[0].partyIndex}:${writes[0].cycle.state}:${writes[0].cycle.durationMs}`); },
    ...overrides,
  });
  const okDependencies = cycleDependencies();
  const ok = await executeApiV1CommitTransaction(input({ operation: 'commit/expedition/1/sortie', parameters: {}, state: charged, idempotencyKey: 'sortie-cycle-key-0001' }), okDependencies.value);
  assert.equal(ok.ok, true, ok.ok ? '' : JSON.stringify(ok.error));
  if (!ok.ok) throw new Error(ok.error.code);
  assert.ok((ok.control.popupEvents?.length ?? 0) > 0, 'the committing transaction durably records its popup events');
  assert.deepEqual(ok.control.popupEvents, durablePopupEvents, 'events are present in the one durable write');
  assert.deepEqual(ok.control.popupEvents?.map((entry) => entry.eventId), ok.control.popupEvents?.map((_, index) => `1:${index + 1}`));
  assert.deepEqual(events, ['persist', 'cycle:0:rest:4242', 'publish'], 'persist, then the cycle reset, then publication');

  const replayDependencies = cycleDependencies();
  const replay = await executeApiV1CommitTransaction(input({ operation: 'commit/expedition/1/sortie', parameters: {}, state: ok.state, control: ok.control, expectedRevision: 0, idempotencyKey: 'sortie-cycle-key-0001' }), replayDependencies.value);
  assert.equal(replay.ok, true);
  if (!replay.ok) throw new Error(replay.error.code);
  assert.deepEqual(replay.control.popupEvents, ok.control.popupEvents, 'receipt replay creates no second popup event');

  events.length = 0;
  const failed = await executeApiV1CommitTransaction(input({ operation: 'commit/expedition/1/sortie', parameters: {}, state: charged, idempotencyKey: 'sortie-cycle-key-0002' }), cycleDependencies({ persist: async () => { throw new Error('injected'); } }).value);
  assert.equal(failed.ok, false);
  assert.deepEqual(events, [], 'a failed persistence resets nothing and publishes nothing');

  // A refused sortie (no charge) changes nothing and writes no cycle.
  events.length = 0;
  const empty = { ...seed, parties: seed.parties.map((party, index) => index === 0 ? { ...party, instantExpeditionStock: 0, instantExpeditionChargeStartedAt: fixedNow } : party) } as GameState;
  const refused = await executeApiV1CommitTransaction(input({ operation: 'commit/expedition/1/sortie', parameters: {}, state: empty, idempotencyKey: 'sortie-cycle-key-0003' }), cycleDependencies().value);
  assert.equal(refused.ok, false);
  if (!refused.ok) assert.equal(refused.error.code, 'illegal_action');
  assert.deepEqual(events, [], 'a refused sortie writes and publishes nothing');
}

// SpecRef: 9.1.4.8 | Popup event stream | notifyPopupActivity lets the transport push open streams instead of waiting
// for their next poll. It fires once a changed commit is durable, never for a no-op or an idempotent replay, never for
// a confirmation reservation alone (the popup buffer is untouched until confirmed), and once more for the confirmed
// reset that fences the buffer.
{
  let notifyCount = 0;
  const deps = dependencies({ notifyPopupActivity: () => { notifyCount += 1; } });
  const result = await executeApiV1CommitTransaction(input({ idempotencyKey: 'authority-key-notify-0001' }), deps.value);
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(result.error.code);
  assert.equal(notifyCount, 1, 'a changed commit notifies once its persist is durable');

  const replay = await executeApiV1CommitTransaction(input({ state: result.state, control: result.control, expectedRevision: 0, idempotencyKey: 'authority-key-notify-0001' }), deps.value);
  assert.equal(replay.ok, true);
  if (!replay.ok) throw new Error(replay.error.code);
  assert.equal(notifyCount, 1, 'an idempotent receipt replay persists nothing and notifies nothing again');

  const noop = await executeApiV1CommitTransaction(input({ idempotencyKey: 'authority-key-notify-0002', parameters: { partyNumber: 1 } }), deps.value);
  assert.equal(noop.ok, true);
  if (!noop.ok) throw new Error(noop.error.code);
  assert.equal(notifyCount, 1, 'a persisted no-op receipt (unchanged revision) does not notify');

  const withPopup = control();
  withPopup.popupEvents = [{
    apiVersion: 'v1', schemaVersion: 1, revision: 0, sequence: 1, eventId: '0:1', eventKey: 'popup.test',
    args: {}, partyNumber: 1, diaryEntryId: null, groupKey: null, createdAt: new Date(fixedNow).toISOString(),
  }];
  const resetInput = input({ operation: 'commit/setting/backup/reset', idempotencyKey: 'authority-key-notify-reset', control: withPopup });
  const challenge = await executeApiV1CommitTransaction(resetInput, deps.value);
  assert.equal(challenge.ok, false);
  if (challenge.ok) throw new Error('expected confirmation');
  assert.equal(notifyCount, 1, 'a confirmation reservation leaves the popup buffer untouched and does not notify');

  const confirmed = await executeApiV1CommitTransaction({
    ...resetInput,
    control: challenge.durableControl!,
    confirmationToken: String(challenge.error.details?.confirmationToken),
  }, deps.value);
  assert.equal(confirmed.ok, true);
  if (!confirmed.ok) throw new Error(confirmed.error.code);
  assert.equal(notifyCount, 2, 'the confirmed reset that fences the popup buffer notifies once more');
}

// A language switch loads that language's dictionary before the synchronous commit activates it, so switching to a
// language whose text was never loaded in this process succeeds instead of failing with a missing-dictionary error.
{
  const deps = dependencies();
  const result = await executeApiV1CommitTransaction(input({
    operation: 'commit/setting/modeSelect', idempotencyKey: 'authority-key-language-en', parameters: { language: 'en' },
  }), deps.value);
  assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.error));
  if (!result.ok) throw new Error(result.error.code);
  assert.equal(result.state.global.language, 'en');
  assert.equal(deps.persisted.length, 1);
}

console.log('apiV1Authority profile ok');
