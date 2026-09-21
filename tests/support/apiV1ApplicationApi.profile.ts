import assert from 'node:assert/strict';
import { createApplicationApi, type ApplicationApi, type ApplicationApiPorts } from '../../src/api/v1/applicationApi';
import { createFreshGameState } from '../../src/hooks/useGameState';
import { serializeGameState } from '../../src/game/saveCodec';
import { encodePersistedState } from '../../src/game/storageCompression';
import type { GameState } from '../../src/types';

// SpecRef: 9.1.4.13 | Adapter and contract-test requirements | HTTP and in-process adapters share one handler set
// The same canonical operations run through an HTTP-shaped request and through the trusted in-process adapter
// against identical deterministic ports; semantic results must match after excluding transport-only metadata.

const t0 = Date.parse('2026-01-01T00:00:00.000Z');
const identity: DesktopApiAccountIdentity = { userId: 'Taro', environment: 'desktop', gameMode: 'normal' };

interface Harness {
  api: ApplicationApi;
  persisted: Array<{ state: GameState; control: DesktopApiControlMetadata }>;
  persistedPlayers: GameState[];
  published: GameState[];
  playerCommitEvents: string[];
  cycleWrites: unknown[];
  sessionEvents: boolean[];
  idleState: GameState;
  /** Moves the runtime's wall clock (the ordinary player's in-game time). */
  setNow: (value: number) => void;
}

function harness(): Harness {
  let runtimeNow = t0;
  const idleState = createFreshGameState('ja', t0);
  const accountState = createFreshGameState('ja', t0);
  const persisted: Harness['persisted'] = [];
  const published: GameState[] = [];
  const persistedPlayers: GameState[] = [];
  const playerCommitEvents: string[] = [];
  const cycleWrites: unknown[] = [];
  const sessionEvents: boolean[] = [];
  let counter = 0;
  let returnPayload: string | null = null;
  const account: DesktopApiAccountRecord = {
    identity,
    savePayload: encodePersistedState(JSON.stringify(serializeGameState(accountState))),
    control: { revisionHighWater: 0, inGameTime: t0, receipts: [], tombstones: [], popupEvents: [], deliveries: [] },
  };
  const ports: ApplicationApiPorts = {
    session: {
      accounts: {
        create: async (created) => created,
        load: async () => structuredClone(account),
        commit: async (committed, savePayload, control) => { persisted.push({ state: JSON.parse(JSON.stringify(serializeGameState(accountState))) as GameState, control: structuredClone(control) }); void committed; void savePayload; return true; },
      },
      player: {
        flushSave: async () => undefined,
        exportPayload: async () => encodePersistedState(JSON.stringify(serializeGameState(idleState))),
        returnPayload: { get: () => returnPayload, set: (payload) => { returnPayload = payload; }, clear: () => { returnPayload = null; } },
      },
      importGameState: async (state) => ({ state, errorLog: null }),
      exportActiveAccountPayload: async () => encodePersistedState(JSON.stringify(serializeGameState(accountState))),
      now: () => t0,
      catchUp: { maximumElapsedMs: 3_600_000, cycleDurationScale: () => 1, applyAutoEquipment: (state) => state, yieldBetweenChunks: async () => undefined, randomSeed: () => 7 },
    },
    desktopAvailable: () => true,
    runtime: {
      readiness: () => 'ready',
      versionBuild: () => '0.9.7 (test)',
      environment: () => 'desktop',
      gameMode: () => 'mode.normal',
      enemyLevelOffset: () => 0,
      cycleDurationScale: () => 1,
      applyAutoEquipment: (state) => state,
      simulate: async () => ({ total: 100, Clear: 40, Return: 10, Draw: 10, Retreat: 10, Defeat: 30 }),
      persistPlayer: async (state) => { playerCommitEvents.push('persist'); persistedPlayers.push(state); },
      publish: async (state) => { playerCommitEvents.push('publish'); published.push(state); },
      partyCycle: () => ({ state: 'explore' }),
      restDurationMs: () => 9_999,
      applyPartyCycleWrites: (writes) => { playerCommitEvents.push('cycle'); cycleWrites.push(...writes); },
      yieldBetweenChunks: async () => undefined,
      createOpaqueId: () => `opaque-id-${String(++counter).padStart(16, '0')}`,
      createRandomSeed: () => 12345,
      now: () => runtimeNow,
    },
    help: { requirements: 'REQUIREMENTS', detail: 'DETAIL' },
    onSessionActive: (active) => { sessionEvents.push(active); },
  };
  return { cycleWrites, api: createApplicationApi(ports, idleState), persisted, persistedPlayers, published, playerCommitEvents, sessionEvents, idleState, setNow: (value) => { runtimeNow = value; } };
}

type Step = { operation: string; pathParameters?: Record<string, unknown>; parameters?: Record<string, unknown>; mutating: boolean };
const steps: Step[] = [
  { operation: 'read/observation/overview', mutating: false },
  { operation: 'read/observation/expedition', mutating: false },
  { operation: 'read/observation/party', mutating: false },
  { operation: 'read/observation/base', mutating: false },
  { operation: 'read/observation/diary', mutating: false },
  { operation: 'read/observation/setting', mutating: false },
  { operation: 'read/observation/compact', mutating: false },
  { operation: 'read/expedition/{p}/setting', pathParameters: { p: 1 }, mutating: false },
  { operation: 'read/build/character/{characterId}/equipmentEvaluation', pathParameters: { characterId: createFreshGameState('ja', 0).parties[0].characters[0].id }, parameters: { equipmentChanges: ['0=0', '1=0'], targetItems: ['0/1101/2/0/0:0'.replace('/0:0', '') + '/fort:1'] }, mutating: false },
  { operation: 'read/expedition/{p}/setting', pathParameters: { p: 9 }, mutating: false },
  { operation: 'commit/base/changeJewelPriorityParty', parameters: { partyNumber: 'none' }, mutating: true },
  { operation: 'commit/base/changeJewelPriorityParty', parameters: { partyNumber: 'none' }, mutating: true },
  { operation: 'commit/expedition/{p}/changeExpedition', pathParameters: { p: 1 }, parameters: { destinationMode: 'fixed' }, mutating: true },
  { operation: 'commit/expedition/{p}/resetStatistics', pathParameters: { p: 1 }, mutating: true },
  { operation: 'commit/expedition/{p}/resetStatistics', pathParameters: { p: 9 }, mutating: true },
  { operation: 'commit/setting/uiPreferences', parameters: { changes: [{ key: `party.equipCategory.${createFreshGameState('ja', 0).parties[0].characters[0].id}`, value: 'wand' }] }, mutating: true },
  { operation: 'commit/setting/modeSelect', parameters: { mode: 'mode.orca' }, mutating: true },
  { operation: 'commit/does/not/exist', mutating: true },
  { operation: 'read/observation/overview', mutating: false },
];

function normalize(value: unknown): unknown {
  // Transport-only metadata: the request identifier, which each adapter generates independently.
  return JSON.parse(JSON.stringify(value, (key, entry) => key === 'requestId' ? undefined : entry));
}

async function runHttpShaped(h: Harness): Promise<unknown[]> {
  const results: unknown[] = [];
  let revision = 0;
  let sequence = 0;
  for (const step of steps) {
    sequence += 1;
    const raw = {
      pathParameters: step.pathParameters ?? {},
      parameters: step.parameters ?? {},
      uploadedFiles: {},
      transport: { requestId: `http-request-${sequence}` },
      ...(step.mutating ? { expectedRevision: revision, idempotencyKey: `http-idempotency-key-${String(sequence).padStart(4, '0')}` } : {}),
    };
    const result = await h.api.handle(step.operation, raw) as Record<string, unknown>;
    if (typeof result.revision === 'number' && !result.error) revision = result.revision;
    results.push(normalize(result));
  }
  return results;
}

async function runInProcess(h: Harness): Promise<unknown[]> {
  const adapter = h.api.createInProcessAdapter();
  const results: unknown[] = [];
  for (const step of steps) {
    const input = { pathParameters: step.pathParameters, parameters: step.parameters };
    results.push(normalize(step.mutating ? await adapter.commit(step.operation, input) : await adapter.read(step.operation, input)));
  }
  return results;
}

// 1. Unauthenticated requests are rejected identically, and status/help need no session.
{
  const h = harness();
  const status = await h.api.handle('fundamental/status', {}) as { data: { systemStatus: string; versionBuild: string } };
  assert.equal(status.data.systemStatus, 'ready');
  assert.equal(status.data.versionBuild, '0.9.7 (test)');
  const help = await h.api.handle('help/endpoints', {}) as { data: { requirements: string } };
  assert.equal(help.data.requirements, 'REQUIREMENTS');
  const denied = await h.api.handle('read/observation/overview', {}) as { status: number; error: { code: string } };
  assert.equal(denied.status, 401);
  assert.equal(denied.error.code, 'login_required');
  const deniedCommit = await h.api.handle('commit/base/changeJewelPriorityParty', { parameters: { partyNumber: 'none' }, expectedRevision: 0, idempotencyKey: 'unauthenticated-key-001' }) as { error: { code: string } };
  assert.equal(deniedCommit.error.code, 'login_required');
  assert.equal(h.api.isSessionActive(), false);
}

// 1a. The trusted in-process adapter operates on the idle player snapshot in browser or desktop builds, persists
// before publication, and can carry a UI-confirmed command through the shared confirmation policy.
{
  const h = harness();
  const local = h.api.createInProcessAdapter();
  const before = await local.read('read/build/party/{p}', { pathParameters: { p: 1 } }) as { data: { current: { order: number[] } } };
  assert.equal(before.data.current.order.length, 6);
  const reordered = [...before.data.current.order];
  [reordered[0], reordered[1]] = [reordered[1], reordered[0]];
  const committed = await local.commit('commit/build/party/{p}', { pathParameters: { p: 1 }, parameters: { order: reordered } }) as { revision: number; error?: unknown };
  assert.equal(committed.error, undefined);
  assert.equal(committed.revision, 1);
  assert.equal(h.persistedPlayers.length, 1);
  assert.equal(h.published.length, 1);
  assert.deepEqual(h.playerCommitEvents, ['persist', 'publish']);
  assert.equal(h.api.isSessionActive(), false);
}

// 1a-bis. The ordinary player's sortie resets the live party cycle once, after persistence and before publication (Spec 9.1.3, 3-2-2).
{
  const h = harness();
  const local = h.api.createInProcessAdapter();
  const charged = { ...h.idleState, parties: h.idleState.parties.map((party, index) => index === 0 ? { ...party, instantExpeditionStock: 3, instantExpeditionChargeStartedAt: null } : party) } as typeof h.idleState;
  h.api.syncIdleState(charged);
  const sortie = await local.commit('commit/expedition/{p}/sortie', { pathParameters: { p: 1 }, parameters: {} }) as { revision: number; error?: unknown; data: { logId: string } };
  assert.equal(sortie.error, undefined);
  assert.equal(sortie.revision, 1);
  assert.deepEqual(h.playerCommitEvents, ['persist', 'cycle', 'publish']);
  assert.deepEqual(h.cycleWrites, [{ partyIndex: 0, cycle: { state: 'rest', stateStartedAt: t0, durationMs: 9_999, restInitialTotalSteps: 1, isCurrentExpeditionGodsBattle: false } }]);
  assert.match(sortie.data.logId, /^(latest|diary:.+)$/);
}

// 1a-ter. The ordinary player's in-game time is the wall clock of each request, not the time the app started: a charge that
// recharged since then can be spent, and reads report the current time.
{
  const h = harness();
  const local = h.api.createInProcessAdapter();
  const empty = { ...h.idleState, parties: h.idleState.parties.map((party, index) => index === 0 ? { ...party, instantExpeditionStock: 0, instantExpeditionChargeStartedAt: t0 } : party) } as typeof h.idleState;
  h.api.syncIdleState(empty);
  const refused = await local.commit('commit/expedition/{p}/sortie', { pathParameters: { p: 1 }, parameters: {} }) as { error?: { details?: { reason?: string } } };
  assert.match(String(refused.error?.details?.reason), /charge_insufficient/, 'no charge has recharged at the start time');
  const threeHours = t0 + 3 * 3_600_000;
  h.setNow(threeHours);
  const header = await local.read('read/observation/overview', {}) as { data: { headerInfo: { inGameTime: string } } };
  assert.equal(header.data.headerInfo.inGameTime, new Date(threeHours).toISOString(), 'reads report the current time');
  const spent = await local.commit('commit/expedition/{p}/sortie', { pathParameters: { p: 1 }, parameters: {} }) as { error?: unknown };
  assert.equal(spent.error, undefined, 'the charge that recharged in three hours is available');
}

// 1b. A UI-confirmed trusted command still traverses the shared challenge/token policy with one idempotency key.
// (`changeBuild` confirms through its own `simulation` and `confirmation` parameters; a partial set load uses the shared policy.)
{
  const h = harness();
  const local = h.api.createInProcessAdapter();
  const saved = await local.commit('commit/build/character/{characterId}/saveEquipmentSet', { pathParameters: { characterId: 1 }, parameters: { equipmentSet: { name: 'Shared set' } } }) as { data: { equipmentSetId: number }; error?: unknown };
  assert.equal(saved.error, undefined);
  const eventsBefore = h.playerCommitEvents.length;
  const confirmed = await local.commit('commit/build/character/{characterId}/loadEquipmentSet', {
    pathParameters: { characterId: 2 }, parameters: { equipmentSetId: saved.data.equipmentSetId, loadMode: 'equipSimilar' }, confirmed: true,
  }) as { revision: number; error?: unknown };
  assert.equal(confirmed.error, undefined);
  assert.deepEqual(h.playerCommitEvents.slice(eventsBefore), ['persist', 'persist', 'publish'], 'challenge reservation precedes durable commit and publication');
}
{
  // Without the UI's confirmation, the same partial load is challenged rather than applied.
  const h = harness();
  const local = h.api.createInProcessAdapter();
  const saved = await local.commit('commit/build/character/{characterId}/saveEquipmentSet', { pathParameters: { characterId: 1 }, parameters: { equipmentSet: { name: 'Shared set' } } }) as { data: { equipmentSetId: number } };
  const challenged = await local.commit('commit/build/character/{characterId}/loadEquipmentSet', {
    pathParameters: { characterId: 2 }, parameters: { equipmentSetId: saved.data.equipmentSetId, loadMode: 'equipSimilar' },
  }) as { error?: { code?: string } };
  assert.equal(challenged.error?.code, 'confirmation_required');
}

// 1c. The adapter tells subscribers after a commit is fully installed, so a projection that depends on control
// metadata (the equipment history) already sees it. A failed commit does not notify.
{
  const h = harness();
  const local = h.api.createInProcessAdapter();
  type Equipment = { data: { validOptions: { undoEquipment: { available: boolean }; redoEquipment: { available: boolean } } } };
  const readEquipment = () => local.read('read/build/character/{characterId}/equipment', { pathParameters: { characterId: 1 } }) as Promise<Equipment>;
  assert.equal((await readEquipment()).data.validOptions.undoEquipment.available, false);
  const seen: Promise<Equipment>[] = [];
  const unsubscribe = local.subscribe(() => { seen.push(readEquipment()); });
  const removed = await local.commit('commit/build/character/{characterId}/removeAllEquipment', { pathParameters: { characterId: 1 } }) as { error?: unknown };
  assert.equal(removed.error, undefined);
  assert.equal(seen.length, 1, 'one notification per successful commit');
  assert.equal((await seen[0]).data.validOptions.undoEquipment.available, true, 'the history is installed when subscribers are told');
  const undone = await local.commit('commit/build/character/{characterId}/undoEquipment', { pathParameters: { characterId: 1 } }) as { error?: unknown };
  assert.equal(undone.error, undefined);
  const afterUndo = (await seen[1]).data.validOptions;
  assert.equal(afterUndo.redoEquipment.available, true, 'Redo is available as soon as Undo is installed');
  assert.equal(afterUndo.undoEquipment.available, false);
  const rejected = await local.commit('commit/build/character/{characterId}/undoEquipment', { pathParameters: { characterId: 1 } }) as { error?: unknown };
  assert.ok(rejected.error, 'no Undo history remains');
  assert.equal(seen.length, 2, 'a rejected commit does not notify');
  unsubscribe();
  await local.commit('commit/build/character/{characterId}/redoEquipment', { pathParameters: { characterId: 1 } });
  assert.equal(seen.length, 2, 'an unsubscribed listener is not called');
}

// 2. The session lifecycle is serialized through the handler: a second login is refused; logout restores the idle state.
{
  const h = harness();
  const login = await h.api.handle('fundamental/logIn', { ...identity }) as { data: { userId: string } };
  assert.equal(login.data.userId, 'Taro');
  assert.equal(h.api.isSessionActive(), true);
  assert.deepEqual(h.sessionEvents, [true]);
  const second = await h.api.handle('fundamental/logIn', { ...identity }) as { error: { code: string } };
  assert.equal(second.error.code, 'control_unavailable');
  const logout = await h.api.handle('fundamental/logOut', {}) as { data: { finalPersistedRevision: number } };
  assert.equal(typeof logout.data.finalPersistedRevision, 'number');
  assert.equal(h.api.isSessionActive(), false);
  assert.deepEqual(h.sessionEvents, [true, false]);
}

// 3. HTTP-shaped and in-process adapters produce identical semantic results, persisted state, and publications.
{
  const http = harness();
  const local = harness();
  await http.api.handle('fundamental/logIn', { ...identity });
  await local.api.handle('fundamental/logIn', { ...identity });
  const httpResults = await runHttpShaped(http);
  const localResults = await runInProcess(local);
  assert.equal(httpResults.length, steps.length);
  assert.deepEqual(localResults, httpResults, 'every operation returns identical data, revisions, effects, and changed resources');

  const finalHttp = http.persisted.at(-1);
  const finalLocal = local.persisted.at(-1);
  assert.ok(finalHttp && finalLocal, 'both adapters durably persisted');
  assert.equal(http.persisted.length, local.persisted.length);
  assert.equal(finalHttp.control.revisionHighWater, finalLocal.control.revisionHighWater);
  assert.deepEqual(normalize(finalHttp.control.receipts.map((receipt) => receipt.response)), normalize(finalLocal.control.receipts.map((receipt) => receipt.response)));
  assert.equal(http.published.length, local.published.length);
  assert.ok((httpResults as Array<Record<string, unknown>>).some((result) => result.error), 'the matrix includes failing operations');
  assert.ok(finalHttp.control.revisionHighWater >= 3, 'the mutating operations advanced the revision');
}

console.log('apiV1ApplicationApi profile ok');
