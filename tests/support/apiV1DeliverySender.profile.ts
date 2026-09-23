import assert from 'node:assert/strict';
import { buildFeedbackDeliveryPayload, buildProgressReportDeliveryPayload } from '../../src/api/v1/deliveryContent';
import { createApplicationApi, type ApplicationApiPorts } from '../../src/api/v1/applicationApi';
import { createFreshGameState } from '../../src/hooks/useGameState';
import { serializeGameState } from '../../src/game/saveCodec';
import { decodePersistedState, encodePersistedState } from '../../src/game/storageCompression';
import type { ApiV1DeliveryOutcome, ApiV1DeliveryRecord } from '../../src/api/v1/deliveries';
import type { ExpeditionLog, GameState } from '../../src/types';

// SpecRef: 9.1.4.15 | External delivery and rewards
// Stage 8: `queued`/`sending`/`delivered`/`failed`/`unknown`/`cancelled` already existed and were unit-tested in
// isolation; this profile covers what was missing — content capture at admission (deliveryContent.ts) and the
// claim/send/settle/complete orchestration (applicationApi.ts) that actually moves a job through the state machine,
// with `ports.delivery.send` always a controllable mock. No test here ever performs a real network call.
//
// `commit/progress/progressReport`/`commit/setting/feedback` fire a pump immediately after the commit succeeds
// (applicationApi.ts), but as a genuine fire-and-forget: the commit's own promise never waits for it. Every test
// below yields once (`await new Promise(resolve => setTimeout(resolve, 0))`) after such a commit to let that
// auto-fired pump run to completion before making assertions — a real macrotask boundary always comes after every
// currently-pending microtask (including the whole chain behind `authority.runExclusive`), so this is deterministic,
// not a race. Multi-attempt scenarios then drive further attempts with explicit `pumpDeliveries()` calls.

const t0 = Date.parse('2026-01-01T00:00:00.000Z');
const identity: DesktopApiAccountIdentity = { userId: 'Taro', environment: 'desktop', gameMode: 'normal' };

function fakeLog(): ExpeditionLog {
  return {
    dungeonId: 1, compactVersion: 1, dungeonName: 'Test Dungeon', difficultyOffset: 0, totalExperience: 0, totalRooms: 0, completedRooms: 0,
    finalOutcome: 'Return', entries: [], rewards: [], autoSellProfit: 0, autoSellCount: 0, autoSellItems: [], remainingPartyHP: 100, maxPartyHP: 100,
  };
}

// 1. buildProgressReportDeliveryPayload/buildFeedbackDeliveryPayload: content and attachments captured from one
// immutable (state, parameters, uploadedFiles) snapshot.
{
  const state = createFreshGameState('en', t0);
  state.global.gold = 555;
  const report = buildProgressReportDeliveryPayload(state, t0);
  assert.match(report.content, /Progress Report/);
  assert.match(report.content, /555/);
  assert.match(report.content, /PT1: Lv1/);
  assert.deepEqual(report.attachments, []);
}
{
  const state = createFreshGameState('ja', t0);
  const feedback = buildFeedbackDeliveryPayload(state, { name: 'Taro', category: 'bugReport', text: 'it crashed', latestBattleLogParty: 'none', includeBackup: false, attachments: [] }, {}, t0);
  assert.match(feedback.content, /it crashed/);
  assert.match(feedback.content, /bugReport/);
  assert.deepEqual(feedback.attachments, []);
}
{
  // includeBackup: the exact same encodePersistedState(serializeGameState(...)) backup/export produces, base64'd
  // UTF-8-safe (matching the `backup/import` decode fix, not a plain Latin1 btoa).
  const state = createFreshGameState('ja', t0);
  state.parties[0].name = 'テストパーティー';
  const feedback = buildFeedbackDeliveryPayload(state, { includeBackup: true, latestBattleLogParty: 'none', name: '', category: 'feedback', text: 't' }, {}, t0);
  const backup = feedback.attachments.find((entry) => entry.name === 'backup.bokemo');
  assert.ok(backup);
  const decodedPayload = new TextDecoder().decode(Uint8Array.from(atob(backup!.contentBase64), (char) => char.charCodeAt(0)));
  assert.deepEqual(JSON.parse(decodePersistedState(decodedPayload)), serializeGameState(state));
}
{
  // latestBattleLogParty defaults to 1; present when that party has one, omitted (not an error) when it does not.
  const state = createFreshGameState('ja', t0);
  const withoutLog = buildFeedbackDeliveryPayload(state, { includeBackup: false, name: '', category: 'feedback', text: 't' }, {}, t0);
  assert.equal(withoutLog.attachments.some((entry) => entry.name.startsWith('latestBattleLog')), false);
  state.parties[0].lastExpeditionLog = fakeLog();
  const withLog = buildFeedbackDeliveryPayload(state, { includeBackup: false, name: '', category: 'feedback', text: 't' }, {}, t0);
  const attachment = withLog.attachments.find((entry) => entry.name === 'latestBattleLog-PT1.json');
  assert.ok(attachment);
  const parsed: { battleLog: { dungeonId: number } | null } = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(attachment!.contentBase64), (char) => char.charCodeAt(0))));
  assert.equal(parsed.battleLog?.dungeonId, 1);
  const explicitNone = buildFeedbackDeliveryPayload(state, { latestBattleLogParty: 'none', includeBackup: false, name: '', category: 'feedback', text: 't' }, {}, t0);
  assert.equal(explicitNone.attachments.some((entry) => entry.name.startsWith('latestBattleLog')), false);
}
{
  // Uploaded images pass through byte-for-byte; extension follows the verified media type.
  const state = createFreshGameState('en', t0);
  const uploadedFiles = { attachment0: { contentBase64: btoa('fake-png-bytes'), mediaType: 'image/png' } };
  const feedback = buildFeedbackDeliveryPayload(state, { attachments: ['attachment0'], latestBattleLogParty: 'none', includeBackup: false, name: '', category: 'feedback', text: 't' }, uploadedFiles, t0);
  assert.equal(feedback.attachments.length, 1);
  assert.equal(feedback.attachments[0].contentBase64, btoa('fake-png-bytes'));
  assert.equal(feedback.attachments[0].name, 'attachment0.png');
  assert.equal(feedback.attachments[0].mediaType, 'image/png');
}

// 2. Test harness for the full sender: a real ApplicationApi with a controllable mock `delivery.send` and a way to
// inject a persist failure on one specific, precisely counted `accounts.commit` call.
interface Harness {
  api: ReturnType<typeof createApplicationApi>;
  sendCalls: ApiV1DeliveryRecord[];
  persistedControls: DesktopApiControlMetadata[];
  persistState: { callIndex: number; failOnCallIndex: number | null };
  published: GameState[];
}

function harness(sendImpl: (record: ApiV1DeliveryRecord, callIndex: number) => Promise<ApiV1DeliveryOutcome>): Harness {
  const accountState = createFreshGameState('en', t0);
  const sendCalls: ApiV1DeliveryRecord[] = [];
  const persistedControls: DesktopApiControlMetadata[] = [];
  const persistState = { callIndex: 0, failOnCallIndex: null as number | null };
  const published: GameState[] = [];
  const account: DesktopApiAccountRecord = {
    identity,
    savePayload: encodePersistedState(JSON.stringify(serializeGameState(accountState))),
    control: { revisionHighWater: 0, inGameTime: t0, receipts: [], tombstones: [], popupEvents: [], deliveries: [] },
  };
  let counter = 0;
  const ports: ApplicationApiPorts = {
    session: {
      accounts: {
        create: async (created) => created,
        load: async () => structuredClone(account),
        commit: async (_identity, _savePayload, control) => {
          persistState.callIndex += 1;
          if (persistState.failOnCallIndex === persistState.callIndex) {
            persistState.failOnCallIndex = null;
            throw new Error('simulated persist failure');
          }
          persistedControls.push(structuredClone(control));
          return true;
        },
      },
      player: { flushSave: async () => undefined, exportPayload: async () => encodePersistedState(JSON.stringify(serializeGameState(accountState))), returnPayload: { get: () => null, set: () => undefined, clear: () => undefined } },
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
      persistPlayer: async () => undefined, publish: async (state) => { published.push(state); },
      yieldBetweenChunks: async () => undefined, createOpaqueId: () => `opaque-id-${String(++counter).padStart(4, '0')}`,
      createRandomSeed: () => 12345, now: () => t0,
    },
    help: { requirements: 'REQUIREMENTS', detail: 'DETAIL' },
    onSessionActive: () => undefined,
    delivery: { send: async (record) => { sendCalls.push(record); return sendImpl(record, sendCalls.length - 1); } },
  };
  const idleState = createFreshGameState('ja', t0);
  return { api: createApplicationApi(ports, idleState), sendCalls, persistedControls, persistState, published };
}

async function logIn(h: Harness): Promise<number> {
  const login = await h.api.handle('fundamental/logIn', { parameters: {}, uploadedFiles: {}, userId: 'Taro', environment: 'desktop', gameMode: 'normal', transport: {} }) as Record<string, unknown>;
  assert.equal(login.error, undefined);
  return Number(login.revision);
}

async function commit(h: Harness, operation: string, revision: number, parameters: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const result = await h.api.handle(operation, {
    pathParameters: {}, parameters, uploadedFiles: {}, transport: {},
    expectedRevision: revision, idempotencyKey: `${operation}-key-000001`,
  }) as Record<string, unknown>;
  assert.equal(result.error, undefined, JSON.stringify(result));
  return result;
}

/** Lets an auto-fired pump (queued right before a commit's response returns) run to completion. */
async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function deliveryOf(h: Harness, deliveryId: string): ApiV1DeliveryRecord | undefined {
  return h.api.authority.getSnapshot().control.deliveries?.find((entry) => entry.deliveryId === deliveryId);
}

async function readPendingDeliveryIds(h: Harness): Promise<unknown> {
  const read = await h.api.handle('read/observation/setting', { pathParameters: {}, parameters: {}, uploadedFiles: {}, transport: {} }) as Record<string, unknown>;
  const settingInfo = (read.data as Record<string, unknown>).settingInfo as Record<string, unknown>;
  return settingInfo.pendingDeliveryIds;
}

// 3. Happy path: a queued progressReport is claimed, sent exactly once, settles delivered, and completes (no reward
// for progressReport, but `completionApplied` is still set so it is never reconsidered again).
{
  const h = harness(async () => ({ kind: 'delivered' }));
  const revision = await logIn(h);
  const queued = await commit(h, 'commit/progress/progressReport', revision);
  const deliveryId = String((queued.data as Record<string, unknown>).deliveryId);
  assert.equal((queued.data as Record<string, unknown>).status, 'queued', 'the commit itself only reports queued, never delivered');

  await flush();
  assert.equal(h.sendCalls.length, 1);
  const record = deliveryOf(h, deliveryId);
  assert.equal(record?.status, 'delivered');
  assert.equal(record?.payload, undefined, 'the frozen payload is dropped once the job can never send again');
  assert.equal(record?.completionApplied, true);
  assert.equal(record?.rewardApplied, false, 'progressReport never grants the feedback reward');

  await h.api.pumpDeliveries();
  assert.equal(h.sendCalls.length, 1, 'a delivered job is never reconsidered');
}

// 4. Feedback happy path grants the reward exactly once and persists the cooldown.
{
  const h = harness(async () => ({ kind: 'delivered' }));
  const revision = await logIn(h);
  const goldBefore = h.api.authority.getSnapshot().state.global.prana;
  await commit(h, 'commit/setting/feedback', revision, { name: 'Taro', category: 'feedback', text: 'hi', latestBattleLogParty: 'none', includeBackup: false, attachments: [] });
  await flush();
  const snapshot = h.api.authority.getSnapshot();
  const record = snapshot.control.deliveries?.[0];
  assert.equal(record?.status, 'delivered');
  assert.equal(record?.rewardApplied, true);
  assert.ok(snapshot.state.global.prana > goldBefore, 'the first-ever feedback submission grants Prana');
  assert.ok(snapshot.control.feedbackReward?.lastSuccessfulSubmissionAt !== null && snapshot.control.feedbackReward?.lastSuccessfulSubmissionAt !== undefined);
  assert.equal(h.published.length > 0, true, 'granting Prana changes game state, which must publish');
}

// 5. `not_sent` is retried automatically up to the attempt limit, then fails; each attempt sends once.
{
  const h = harness(async () => ({ kind: 'not_sent', reason: 'dns_failure' }));
  const revision = await logIn(h);
  await commit(h, 'commit/progress/progressReport', revision);
  await flush(); // attempt 1 (auto-fired)
  await h.api.pumpDeliveries(); // attempt 2
  await h.api.pumpDeliveries(); // attempt 3
  assert.equal(h.sendCalls.length, 3, 'API_V1_DELIVERY_MAX_ATTEMPTS caps automatic retry at 3');
  const record = h.api.authority.getSnapshot().control.deliveries?.[0];
  assert.equal(record?.status, 'failed');
  assert.equal(record?.failureReason, 'dns_failure');
  await h.api.pumpDeliveries();
  assert.equal(h.sendCalls.length, 3, 'a failed job is never retried further');
}

// 6. `rejected` fails immediately, after exactly one send attempt, never retried.
{
  const h = harness(async () => ({ kind: 'rejected', reason: 'http_400' }));
  const revision = await logIn(h);
  await commit(h, 'commit/progress/progressReport', revision);
  await flush();
  await h.api.pumpDeliveries();
  assert.equal(h.sendCalls.length, 1);
  assert.equal(h.api.authority.getSnapshot().control.deliveries?.[0].status, 'failed');
}

// 7. `ambiguous` (e.g. a send timeout) becomes `unknown` and is never automatically resent, per 9.1.4.15.
{
  const h = harness(async () => ({ kind: 'ambiguous', reason: 'timeout_after_send' }));
  const revision = await logIn(h);
  await commit(h, 'commit/progress/progressReport', revision);
  await flush();
  assert.equal(h.sendCalls.length, 1);
  assert.equal(h.api.authority.getSnapshot().control.deliveries?.[0].status, 'unknown');
  await h.api.pumpDeliveries();
  assert.equal(h.sendCalls.length, 1, 'unknown is never automatically resent');
}

// 8. A settle-persist failure is retried without ever re-invoking `send` (9.1.4.15: "retry local completion, never
// the remote send"); the job stays `sending` in the meantime and no second job can be claimed.
{
  const h = harness(async () => ({ kind: 'delivered' }));
  await logIn(h); // persist call 1
  // The commit's own auto-fired pump can race ahead of this test's own code (it does not wait on this test's
  // promise chain at all), so the target must be an absolute call number fixed *before* anything that could reach
  // it, not a "from now" offset computed after racing code may already have run: call 2 is the progressReport
  // commit itself, call 3 is the claim (queued -> sending), call 4 is the settle this test targets.
  h.persistState.failOnCallIndex = 4;
  const revision = h.api.authority.getSnapshot().control.revisionHighWater;
  await commit(h, 'commit/progress/progressReport', revision);
  await flush(); // attempt 1 (auto-fired): commit and claim persist, send happens once, settle persist fails as arranged
  assert.equal(h.sendCalls.length, 1);
  assert.equal(h.api.authority.getSnapshot().control.deliveries?.[0].status, 'sending', 'settle could not persist yet');

  await h.api.pumpDeliveries(); // retries only the persist
  assert.equal(h.sendCalls.length, 1, 'the retry never re-sends');
  assert.equal(h.api.authority.getSnapshot().control.deliveries?.[0].status, 'delivered');
}

// 9. `read/observation/setting`'s `pendingDeliveryIds` lists only non-terminal jobs (queued/sending/unknown).
{
  const h = harness(async () => ({ kind: 'ambiguous', reason: 'timeout_after_send' }));
  const revision = await logIn(h);
  const queued = await commit(h, 'commit/progress/progressReport', revision);
  const deliveryId = String((queued.data as Record<string, unknown>).deliveryId);
  await flush();
  assert.equal(deliveryOf(h, deliveryId)?.status, 'unknown');
  assert.deepEqual(await readPendingDeliveryIds(h), [deliveryId], 'unknown still counts as pending per 9.1.4.15');
}
{
  const h = harness(async () => ({ kind: 'delivered' }));
  const revision = await logIn(h);
  await commit(h, 'commit/progress/progressReport', revision);
  await flush();
  assert.deepEqual(await readPendingDeliveryIds(h), [], 'a delivered job is no longer pending');
}

console.log('apiV1DeliverySender profile ok');
