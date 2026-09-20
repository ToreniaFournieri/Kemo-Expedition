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
  published: GameState[];
  sessionEvents: boolean[];
  idleState: GameState;
}

function harness(): Harness {
  const idleState = createFreshGameState('ja', t0);
  const accountState = createFreshGameState('ja', t0);
  const persisted: Harness['persisted'] = [];
  const published: GameState[] = [];
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
      simulate: async () => ({ total: 100, Clear: 40, Turned_Back: 10, Draw_Retreat: 10, Wounded_Retreat: 10, Defeat: 30 }),
      publish: async (state) => { published.push(state); },
      yieldBetweenChunks: async () => undefined,
      createOpaqueId: () => `opaque-id-${String(++counter).padStart(16, '0')}`,
      createRandomSeed: () => 12345,
      now: () => t0,
    },
    help: { requirements: 'REQUIREMENTS', detail: 'DETAIL' },
    onSessionActive: (active) => { sessionEvents.push(active); },
  };
  return { api: createApplicationApi(ports, idleState), persisted, published, sessionEvents, idleState };
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
  { operation: 'read/expedition/{p}/setting', pathParameters: { p: 9 }, mutating: false },
  { operation: 'commit/base/changeJewelPriorityParty', parameters: { partyNumber: 'none' }, mutating: true },
  { operation: 'commit/base/changeJewelPriorityParty', parameters: { partyNumber: 'none' }, mutating: true },
  { operation: 'commit/expedition/{p}/changeExpedition', pathParameters: { p: 1 }, parameters: { destinationMode: 'fixed' }, mutating: true },
  { operation: 'commit/setting/uiPreferences', parameters: { changes: [{ key: 'basePane', value: 'shop' }] }, mutating: true },
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
