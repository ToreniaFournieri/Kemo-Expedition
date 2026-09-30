import assert from 'node:assert/strict';
import { applyApiV1Commit, type ApiV1CommitContext } from '../../src/api/v1/commitOperations';
import { executeApiV1CommitTransaction, type ApiV1CommitAuthorityDependencies, type ApiV1ControlMetadata } from '../../src/api/v1/authority';
import { resolveConfirmationPolicy } from '../../src/api/v1/confirmationPolicy';
import type { ApiV1DeliveryRecord } from '../../src/api/v1/deliveries';
import { API_V1_SCHEMA_VERSION, API_V1_VERSION } from '../../src/api/v1/contracts';
import { createApplicationApi, type ApplicationApiPorts } from '../../src/api/v1/applicationApi';
import { createFreshGameState } from '../../src/hooks/useGameState';
import { serializeGameState } from '../../src/game/saveCodec';
import { encodePersistedState, decodePersistedState } from '../../src/game/storageCompression';
import type { GameState } from '../../src/types';

// SpecRef: 9.1.4.15 | Backup export, import, and reset
// Dedicated coverage for `commit/setting/backup/export`, `commit/setting/backup/import`, `commit/setting/backup/reset`,
// and the `delivery_in_flight` refusal path (Stage 8: the implementation already exists; this closes the stated
// test-coverage gap). Import fixtures use the real production encoding (UTF-8 bytes of the compressed payload,
// base64'd, exactly as `desktop/api-v1.cjs`'s multipart handler builds `uploadedFiles.backup`), not a shortcut
// ASCII-only fixture, so a regression in the byte/text boundary is actually caught.

const t0 = Date.parse('2026-01-01T00:00:00.000Z');

function baseContext(overrides: Partial<ApiV1CommitContext> = {}): ApiV1CommitContext {
  return {
    simulatedAt: t0, gameMode: 'mode.normal', enemyLevelOffset: 0, settings: {}, equipmentHistory: {},
    uploadedFiles: {}, canonicalFiles: {}, applyAutoEquipment: (state) => state,
    createDeliveryId: () => 'delivery-id-fixed', now: () => t0, ...overrides,
  };
}

/** Mirrors `desktop/api-v1.cjs`'s `readMultipart`: the uploaded file's bytes are the UTF-8 encoding of the text. */
function uploadedBackupFile(payload: string): Record<string, unknown> {
  const bytes = Buffer.from(payload, 'utf8');
  return { contentBase64: bytes.toString('base64'), mediaType: 'application/octet-stream', byteLength: bytes.length, sha256: 'unused-in-tests' };
}

function job(id: string, overrides: Partial<ApiV1DeliveryRecord> = {}): ApiV1DeliveryRecord {
  const at = new Date(t0).toISOString();
  return { deliveryId: id, status: 'queued', createdAt: at, updatedAt: at, failureReason: null, rewardApplied: false, operation: 'commit/setting/feedback', parameters: {}, files: {}, ...overrides };
}

/** `createFreshGameState` stamps a random `userId` and the real wall clock into `shopIntimacyLastDecayAt` when no
 *  explicit `now` is passed (as `commit/setting/backup/reset` does not); ignore both to compare on gameplay content. */
function serializeIgnoringFreshIdentity(state: GameState): unknown {
  const serialized = serializeGameState(state) as { global: Record<string, unknown> };
  const { userId: _userId, shopIntimacyLastDecayAt: _decayAt, ...global } = serialized.global;
  return { ...serialized, global };
}

function popupEvent(revision: number, sequence: number) {
  return {
    apiVersion: API_V1_VERSION, schemaVersion: API_V1_SCHEMA_VERSION, revision, sequence,
    eventId: `${revision}:${sequence}`, eventKey: 'popup.itemDrop', args: {}, partyNumber: 1,
    diaryEntryId: null, groupKey: null, createdAt: new Date(t0).toISOString(),
  };
}

// 1. Export encodes the current state's canonical save payload (never mutating state), decodable back to the same state.
{
  const state = createFreshGameState('ja', t0);
  state.global.gold = 12345;
  const outcome = applyApiV1Commit('commit/setting/backup/export', state, {}, baseContext());
  assert.equal(outcome.state, state, 'export never mutates state');
  assert.equal(outcome.resetControlEvents, false);
  assert.equal(outcome.delivery, null);
  const payload = outcome.data.savePayload;
  assert.equal(typeof payload, 'string');
  assert.ok((payload as string).length > 0);
  const decoded = JSON.parse(decodePersistedState(payload as string));
  assert.deepEqual(decoded, serializeGameState(state));
}

// 2. Import replaces the state with the decoded backup (a Japanese-locale save, so the payload is not ASCII-only)
// and flags resetControlEvents; a missing or corrupt upload is refused with the stable `invalid_backup` marker.
{
  const original = createFreshGameState('en', t0);
  const other = createFreshGameState('ja', t0);
  other.global.gold = 99999;
  const backupPayload = encodePersistedState(JSON.stringify(serializeGameState(other)));

  const outcome = applyApiV1Commit('commit/setting/backup/import', original, {}, baseContext({
    uploadedFiles: { backup: uploadedBackupFile(backupPayload) },
  }));
  assert.equal(outcome.resetControlEvents, true);
  assert.deepEqual(outcome.data, { imported: true });
  assert.deepEqual(serializeGameState(outcome.state), serializeGameState(other));
  assert.notDeepEqual(serializeGameState(outcome.state), serializeGameState(original));

  assert.throws(() => applyApiV1Commit('commit/setting/backup/import', original, {}, baseContext({ uploadedFiles: {} })), /invalid_backup/, 'no uploaded file');
  assert.throws(() => applyApiV1Commit('commit/setting/backup/import', original, {}, baseContext({ uploadedFiles: { backup: {} } })), /invalid_backup/, 'file present without contentBase64');
  assert.throws(() => applyApiV1Commit('commit/setting/backup/import', original, {}, baseContext({
    uploadedFiles: { backup: { contentBase64: Buffer.from('not a real backup', 'utf8').toString('base64') } },
  })), /^Error: invalid_backup$/, 'a non-backup upload is the stable invalid_backup marker, never the decoder\'s own error');
}

// 3. Reset discards the state for a fresh one in the same language and flags resetControlEvents.
{
  const state = createFreshGameState('ja', t0);
  state.global.gold = 500;
  const outcome = applyApiV1Commit('commit/setting/backup/reset', state, {}, baseContext());
  assert.equal(outcome.resetControlEvents, true);
  assert.deepEqual(outcome.data, {});
  assert.equal(outcome.state.global.language, 'ja');
  assert.notEqual(outcome.state.global.userId, state.global.userId, 'reset assigns a fresh identity');
  assert.deepEqual(serializeIgnoringFreshIdentity(outcome.state), serializeIgnoringFreshIdentity(createFreshGameState('ja', t0)), 'reset never carries over prior progress');
}

// 4. Authority: revision high-water is preserved (not reset to zero) across a confirmed reset/import, popup events
// and confirmations are cleared, queued deliveries are cancelled, and a delivery in flight refuses both operations
// with the stable `delivery_in_flight` reason, leaving the account untouched.
{
  const persisted: ApiV1ControlMetadata[] = [];
  const dependencies: ApiV1CommitAuthorityDependencies = {
    gameMode: 'mode.normal', enemyLevelOffset: 0, cycleDurationScale: 1, applyAutoEquipment: (s) => s,
    persist: async (_state, control) => { persisted.push(structuredClone(control)); },
    publish: async () => undefined,
    createOpaqueId: () => 'opaque-token-fixed', createRandomSeed: () => 1, now: () => t0,
  };
  const state = createFreshGameState('en', t0);
  const otherState = createFreshGameState('ja', t0);
  const backupPayload = encodePersistedState(JSON.stringify(serializeGameState(otherState)));

  const seeded = (deliveries: ApiV1DeliveryRecord[]): ApiV1ControlMetadata => ({
    revisionHighWater: 5, inGameTime: t0, receipts: [], tombstones: [], confirmations: [],
    popupEvents: [popupEvent(1, 1)], deliveries,
  });
  const input = (operation: string, control: ApiV1ControlMetadata, confirmationToken: string | null, uploadedFiles: Record<string, Record<string, unknown>> = {}) => ({
    operation, expectedRevision: control.revisionHighWater, idempotencyKey: `${operation}-key-000001`, confirmationToken,
    requestId: 'request-fixed', parameters: {}, uploadedFiles, state, simulatedAt: t0, control,
  });

  async function confirmedRun(operation: string, deliveries: ApiV1DeliveryRecord[], uploadedFiles: Record<string, Record<string, unknown>> = {}) {
    const control = seeded(deliveries);
    // The uploaded file is part of the request the challenge reserves against; the confirmed retry must repeat the
    // same upload, exactly as the same idempotency key's confirmed retry repeats the same parameters.
    const challenge = await executeApiV1CommitTransaction(input(operation, control, null, uploadedFiles), dependencies);
    assert.equal(challenge.ok, false);
    if (challenge.ok || challenge.error.code !== 'confirmation_required' || !challenge.durableControl) throw new Error('expected a confirmation challenge');
    const token = String((challenge.error.details as { confirmationToken: string }).confirmationToken);
    return executeApiV1CommitTransaction(input(operation, challenge.durableControl, token, uploadedFiles), dependencies);
  }

  const resetResult = await confirmedRun('commit/setting/backup/reset', [job('a')]);
  assert.equal(resetResult.ok, true);
  if (!resetResult.ok) throw new Error(resetResult.error.code);
  assert.equal(resetResult.response.previousRevision, 5);
  assert.equal(resetResult.response.revision, 6, 'the account revision keeps counting up, not reset to 0/1');
  assert.equal(resetResult.control.revisionHighWater, 6);
  assert.deepEqual(resetResult.control.popupEvents, [], 'reset clears outstanding popup events');
  assert.deepEqual(resetResult.control.confirmations, [], 'reset clears outstanding confirmations');
  assert.deepEqual(resetResult.control.deliveries?.map((entry) => entry.status), ['cancelled']);

  const importResult = await confirmedRun('commit/setting/backup/import', [job('a')], { backup: uploadedBackupFile(backupPayload) });
  assert.equal(importResult.ok, true);
  if (!importResult.ok) throw new Error(importResult.error.code);
  assert.equal(importResult.response.previousRevision, 5);
  assert.equal(importResult.response.revision, 6, 'import preserves the revision high-water the same way reset does');
  assert.equal(importResult.control.revisionHighWater, 6);
  assert.deepEqual(serializeGameState(importResult.state), serializeGameState(otherState));
  assert.deepEqual(importResult.control.popupEvents, []);
  assert.deepEqual(importResult.control.confirmations, []);
  assert.deepEqual(importResult.control.deliveries?.map((entry) => entry.status), ['cancelled']);

  const blockedReset = await confirmedRun('commit/setting/backup/reset', [job('a', { status: 'sending' })]);
  assert.equal(blockedReset.ok, false);
  if (blockedReset.ok) throw new Error('expected illegal_action');
  assert.equal(blockedReset.error.code, 'illegal_action');
  assert.equal(blockedReset.error.details?.reason, 'delivery_in_flight');

  const blockedImport = await confirmedRun('commit/setting/backup/import', [job('a', { status: 'sending' })], { backup: uploadedBackupFile(backupPayload) });
  assert.equal(blockedImport.ok, false);
  if (blockedImport.ok) throw new Error('expected illegal_action');
  assert.equal(blockedImport.error.code, 'illegal_action');
  assert.equal(blockedImport.error.details?.reason, 'delivery_in_flight');

  assert.ok(persisted.length > 0);
}

// 5. Transport-neutral ApplicationApi: log in, mutate, export, and re-import that exact backup through the
// confirmation-required/confirmed commit cycle, exactly as the HTTP adapter would shape the request (real
// `uploadedFiles.backup` with `contentBase64`, not the in-process adapter's always-empty upload set).
{
  const identity: DesktopApiAccountIdentity = { userId: 'Taro', environment: 'desktop', gameMode: 'normal' };
  const idleState = createFreshGameState('ja', t0);
  const accountState = createFreshGameState('en', t0);
  const account: DesktopApiAccountRecord = {
    identity,
    savePayload: encodePersistedState(JSON.stringify(serializeGameState(accountState))),
    // A nonzero revision with outstanding popup events and a queued delivery, so the import's control-plane fencing
    // (clearing popups, cancelling the queued job) is a real, revision-incrementing change rather than a no-op —
    // the same reason revision preservation must be seeded nonzero in section 4.
    control: { revisionHighWater: 3, inGameTime: t0, receipts: [], tombstones: [], popupEvents: [popupEvent(1, 1)], deliveries: [job('a')] },
  };
  let counter = 0;
  const ports: ApplicationApiPorts = {
    session: {
      accounts: {
        create: async (created) => created,
        load: async () => structuredClone(account),
        commit: async () => true,
      },
      player: { flushSave: async () => undefined, exportPayload: async () => encodePersistedState(JSON.stringify(serializeGameState(idleState))), returnPayload: { get: () => null, set: () => undefined, clear: () => undefined } },
      importGameState: async (state) => ({ state, errorLog: null }),
      exportActiveAccountPayload: async () => encodePersistedState(JSON.stringify(serializeGameState(accountState))),
      now: () => t0,
      catchUp: { maximumElapsedMs: 3_600_000, applyAutoEquipment: (state) => state, yieldBetweenChunks: async () => undefined, randomSeed: () => 7 },
    },
    desktopAvailable: () => true,
    runtime: {
      readiness: () => 'ready', versionBuild: () => '0.9.7 (test)', environment: () => 'desktop',
      gameMode: () => 'mode.normal', enemyLevelOffset: () => 0, cycleDurationScale: () => 1,
      applyAutoEquipment: (state) => state, simulate: async () => ({}),
      persistPlayer: async () => undefined, publish: async () => undefined,
      yieldBetweenChunks: async () => undefined, createOpaqueId: () => `opaque-id-${String(++counter).padStart(4, '0')}`,
      createRandomSeed: () => 12345, now: () => t0,
    },
    help: { requirements: 'REQUIREMENTS', detail: 'DETAIL' },
    onSessionActive: () => undefined,
  };
  const api = createApplicationApi(ports, idleState);

  const login = await api.handle('fundamental/logIn', { parameters: {}, uploadedFiles: {}, userId: 'Taro', environment: 'desktop', gameMode: 'normal', transport: {} }) as Record<string, unknown>;
  assert.equal(login.error, undefined);
  let revision = Number(login.revision);

  const exported = await api.handle('commit/setting/backup/export', {
    pathParameters: {}, parameters: {}, uploadedFiles: {}, transport: {},
    expectedRevision: revision, idempotencyKey: 'export-idempotency-key-01',
  }) as Record<string, unknown>;
  assert.equal(exported.error, undefined);
  revision = Number(exported.revision ?? revision);
  const savePayload = (exported.data as Record<string, unknown>).savePayload as string;
  assert.deepEqual(JSON.parse(decodePersistedState(savePayload)), serializeGameState(accountState));

  const importRequest = (confirmationToken: string | null) => ({
    pathParameters: {}, parameters: {}, uploadedFiles: { backup: uploadedBackupFile(savePayload) }, transport: {},
    expectedRevision: revision, idempotencyKey: 'import-idempotency-key-01', confirmationToken,
  });
  // A file that is not a backup is refused at admission: no confirmation token is ever issued for it.
  const bogus = await api.handle('commit/setting/backup/import', {
    ...importRequest(null), idempotencyKey: 'import-idempotency-key-bogus',
    uploadedFiles: { backup: uploadedBackupFile('{"not":"a backup"}') },
  }) as Record<string, unknown>;
  const bogusError = (bogus.error ?? {}) as Record<string, unknown>;
  assert.equal(bogusError.code, 'invalid_request');
  assert.deepEqual(bogusError.details, { field: 'backup', reason: 'invalid_backup' });

  const challenge = await api.handle('commit/setting/backup/import', importRequest(null)) as Record<string, unknown>;
  const error = (challenge.error ?? {}) as Record<string, unknown>;
  assert.equal(error.code, 'confirmation_required', 'backup/import requires confirmation like backup/reset');
  const details = (error.details ?? {}) as Record<string, unknown>;

  const imported = await api.handle('commit/setting/backup/import', importRequest(String(details.confirmationToken))) as Record<string, unknown>;
  assert.equal(imported.error, undefined);
  assert.deepEqual(imported.data, { imported: true });
  assert.equal(imported.revision, revision + 1, 'revision keeps counting up across the confirmed import, not reset');

  const snapshot = api.authority.getSnapshot();
  assert.deepEqual(serializeGameState(snapshot.state), serializeGameState(accountState), 'the account is now exactly the state it exported');
  assert.deepEqual(snapshot.control.popupEvents, []);
  assert.deepEqual(snapshot.control.confirmations, []);
  assert.deepEqual(snapshot.control.deliveries?.map((entry) => entry.status), ['cancelled']);
}

// 6. `skipConfirmation` (Spec 9.1.3, 3-6-5-2/3-6-5-3): `true` bypasses only this request's own challenge and commits
// immediately with no confirmationToken; omitted or `false` behaves exactly as before; a delivery in flight still
// refuses the commit either way, since fencing is independent of the confirmation step it now skips.
{
  const freshState = createFreshGameState('en', t0);
  assert.notEqual(resolveConfirmationPolicy('commit/setting/backup/reset', freshState, {}), null, 'omitted skipConfirmation still challenges');
  assert.notEqual(resolveConfirmationPolicy('commit/setting/backup/reset', freshState, { skipConfirmation: false }), null, 'explicit false still challenges');
  assert.equal(resolveConfirmationPolicy('commit/setting/backup/reset', freshState, { skipConfirmation: true }), null, 'true bypasses the challenge');
  assert.notEqual(resolveConfirmationPolicy('commit/setting/backup/import', freshState, {}), null);
  assert.equal(resolveConfirmationPolicy('commit/setting/backup/import', freshState, { skipConfirmation: true }), null);
  // A non-boolean value is not `=== true`, so it is treated the same as omitted: still challenged. The metadata
  // schema (`scripts/generate-api-v1-contract.mjs`) restricts the wire value to a real boolean before this runs.
  assert.notEqual(resolveConfirmationPolicy('commit/setting/backup/reset', freshState, { skipConfirmation: 'true' }), null);

  const persisted: ApiV1ControlMetadata[] = [];
  const dependencies: ApiV1CommitAuthorityDependencies = {
    gameMode: 'mode.normal', enemyLevelOffset: 0, cycleDurationScale: 1, applyAutoEquipment: (s) => s,
    persist: async (_state, control) => { persisted.push(structuredClone(control)); },
    publish: async () => undefined,
    createOpaqueId: () => 'opaque-token-fixed', createRandomSeed: () => 1, now: () => t0,
  };
  const state = createFreshGameState('en', t0);
  const otherState = createFreshGameState('ja', t0);
  const backupPayload = encodePersistedState(JSON.stringify(serializeGameState(otherState)));
  const control = (deliveries: ApiV1DeliveryRecord[]): ApiV1ControlMetadata => ({
    revisionHighWater: 5, inGameTime: t0, receipts: [], tombstones: [], confirmations: [], popupEvents: [popupEvent(1, 1)], deliveries,
  });
  const skipInput = (operation: string, deliveries: ApiV1DeliveryRecord[], uploadedFiles: Record<string, Record<string, unknown>> = {}) => ({
    operation, expectedRevision: 5, idempotencyKey: `${operation}-skip-key-0001`, confirmationToken: null,
    requestId: 'request-fixed', parameters: { skipConfirmation: true }, uploadedFiles, state, simulatedAt: t0, control: control(deliveries),
  });

  const skippedReset = await executeApiV1CommitTransaction(skipInput('commit/setting/backup/reset', [job('a')]), dependencies);
  assert.equal(skippedReset.ok, true, 'skipConfirmation commits in a single round trip, with no confirmation_required first');
  if (!skippedReset.ok) throw new Error(skippedReset.error.code);
  assert.equal(skippedReset.response.previousRevision, 5);
  assert.equal(skippedReset.response.revision, 6, 'a skipped-confirmation commit still advances the revision like a normal commit');
  assert.deepEqual(skippedReset.control.deliveries?.map((entry) => entry.status), ['cancelled']);

  const skippedImport = await executeApiV1CommitTransaction(skipInput('commit/setting/backup/import', [job('a')], { backup: uploadedBackupFile(backupPayload) }), dependencies);
  assert.equal(skippedImport.ok, true);
  if (!skippedImport.ok) throw new Error(skippedImport.error.code);
  assert.deepEqual(skippedImport.response.data, { imported: true });
  assert.deepEqual(serializeGameState(skippedImport.state), serializeGameState(otherState));

  const skippedButBlockedReset = await executeApiV1CommitTransaction(skipInput('commit/setting/backup/reset', [job('a', { status: 'sending' })]), dependencies);
  assert.equal(skippedButBlockedReset.ok, false, 'delivery_in_flight still applies: skipping confirmation never skips fencing');
  if (skippedButBlockedReset.ok) throw new Error('expected illegal_action');
  assert.equal(skippedButBlockedReset.error.code, 'illegal_action');
  assert.equal(skippedButBlockedReset.error.details?.reason, 'delivery_in_flight');

  const skippedButBlockedImport = await executeApiV1CommitTransaction(skipInput('commit/setting/backup/import', [job('a', { status: 'sending' })], { backup: uploadedBackupFile(backupPayload) }), dependencies);
  assert.equal(skippedButBlockedImport.ok, false);
  if (skippedButBlockedImport.ok) throw new Error('expected illegal_action');
  assert.equal(skippedButBlockedImport.error.code, 'illegal_action');
  assert.equal(skippedButBlockedImport.error.details?.reason, 'delivery_in_flight');

  assert.ok(persisted.length > 0);
}

console.log('apiV1Backup profile ok');
