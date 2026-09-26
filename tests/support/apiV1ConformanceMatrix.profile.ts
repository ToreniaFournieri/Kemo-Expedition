import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createApplicationApi, type ApplicationApiPorts } from '../../src/api/v1/applicationApi';
import { createFreshGameState } from '../../src/hooks/useGameState';
import { serializeGameState } from '../../src/game/saveCodec';
import { encodePersistedState } from '../../src/game/storageCompression';
import { decodeApiSavePayload } from '../../src/api/v1/commitOperations';
import { resetBattleSeedSourceForTesting } from '../../src/game/battleSeedSource';
import { createHash } from 'node:crypto';
import type { GameState } from '../../src/types';

// SpecRef: 9.1.4.13 | Adapter and contract-test requirements | conformance matrix
// Every catalogued operation runs through the real desktop HTTP transport (`desktop/api-v1.cjs`: authentication,
// Ajv request and response validation, envelopes) wired to the real Application API, exactly as the desktop app wires
// them (`invokeApplication` → `ApplicationApi.handle`). Each case logs in to a fresh copy of a deterministic save, so no
// case sees another's writes. For every operation the matrix derives the applicable cells from the catalog (kind,
// per-operation error list, restrictions) and fails when an applicable cell has neither a passing check nor a recorded
// reason it does not apply.

const require = createRequire(import.meta.url);
const contract = JSON.parse(fs.readFileSync(path.resolve('desktop/api-v1-contract.json'), 'utf8')) as Contract;
const { createApiV1 } = require(path.resolve('desktop/api-v1.cjs')) as { createApiV1: (options: Record<string, unknown>) => HttpApi };

interface Contract { operations: CatalogOperation[] }
interface CatalogOperation {
  operationId: string; method: 'GET' | 'POST'; path: string; access: 'public' | 'bootstrap' | 'session'; errors: string[];
  restrictions: { environments: string; requiresDebugMode: boolean; requiresLogin: boolean };
  examples: { invalidRequest?: { body?: Record<string, unknown>; query?: Record<string, unknown> } };
}
interface HttpApi { enable: () => Promise<{ connectionFile: string }>; shutdown: () => Promise<void> }

const t0 = Date.parse('2026-01-01T00:00:00.000Z');
const identity = { userId: 'Matrix', environment: 'desktop', gameMode: 'normal', levelOffsetForOrca: null } as const;

// ---------------------------------------------------------------------------------------------------------------------
// Deterministic save: a fresh game with enough currency, Jewels, and a Diary entry for every command's success path.

function matrixSave(variant?: (state: GameState) => void): GameState {
  const state = createFreshGameState('ja', t0);
  state.global.userId = 'matrix-user';
  state.global.gold = 1_000_000;
  state.global.prana = 10_000;
  state.global.jewels = { 'fort:1': 3 } as GameState['global']['jewels'];
  state.parties[0].diaryLogs = [{
    id: 'matrix-diary-id',
    expeditionLog: {
      dungeonId: 1, compactVersion: 1, dungeonName: '', difficultyOffset: 0, totalExperience: 0, totalRooms: 0, completedRooms: 0,
      finalOutcome: 'Return', entries: [], rewards: [], autoSellProfit: 0, autoSellCount: 0, autoSellItems: [], remainingPartyHP: 100, maxPartyHP: 100,
    },
    triggers: ['return'], createdAt: t0, isRead: false,
  }] as GameState['parties'][number]['diaryLogs'];
  state.parties[0].hasUnreadDiary = true;
  variant?.(state);
  return state;
}

function encodeSave(variant?: (state: GameState) => void): string {
  return encodePersistedState(JSON.stringify(serializeGameState(matrixSave(variant))));
}
const defaultSavePayload = encodeSave();
let savePayload = defaultSavePayload;

/** The first party has met the Gods Battle gate for its selected destination (Spec 5.1.3.1). */
function godsBattleReady(state: GameState) {
  const party = state.parties[0];
  party.clearGateProgress = { ...party.clearGateProgress, [`godBattle:${party.selectedDungeonId}:bossRare`]: 3 };
  party.defeatedBossExpeditions = { ...party.defeatedBossExpeditions, [party.selectedDungeonId]: true } as typeof party.defeatedBossExpeditions;
}

// ---------------------------------------------------------------------------------------------------------------------
// One application and one HTTP server for the whole run; every case logs in (fresh account copy) and logs out.

let runtimeNow = t0;
let failPersist = false;
let seededTombstones: string[] = [];
let persistCount = 0;
let counter = 0;
let returnPayload: string | null = null;
const idleState = createFreshGameState('ja', t0);

const ports: ApplicationApiPorts = {
  session: {
    accounts: {
      create: async (created) => created,
      load: async () => ({
        identity,
        savePayload,
        control: { revisionHighWater: 0, inGameTime: t0, receipts: [], tombstones: [...seededTombstones], popupEvents: [], deliveries: [] },
      }) as DesktopApiAccountRecord,
      commit: async () => {
        if (failPersist) throw new Error('simulated disk failure');
        persistCount += 1;
        return true;
      },
    },
    player: {
      flushSave: async () => undefined,
      exportPayload: async () => encodePersistedState(JSON.stringify(serializeGameState(idleState))),
      returnPayload: { get: () => returnPayload, set: (payload) => { returnPayload = payload; }, clear: () => { returnPayload = null; } },
    },
    importGameState: async (state) => ({ state, errorLog: null }),
    exportActiveAccountPayload: async () => savePayload,
    now: () => runtimeNow,
    catchUp: { maximumElapsedMs: 3_600_000, applyAutoEquipment: (state) => state, yieldBetweenChunks: async () => undefined, randomSeed: () => 7 },
  },
  desktopAvailable: () => true,
  runtime: {
    readiness: () => 'ready',
    versionBuild: () => '0.9.7 (matrix)',
    environment: () => currentEnvironment(),
    gameMode: () => 'mode.normal',
    enemyLevelOffset: () => 0,
    cycleDurationScale: () => 1,
    applyAutoEquipment: (state) => state,
    simulate: async () => ({ total: 100, Clear: 40, Return: 10, Draw: 10, Retreat: 10, Defeat: 30, rooms: [] }),
    persistPlayer: async () => undefined,
    publish: async () => undefined,
    yieldBetweenChunks: async () => undefined,
    createOpaqueId: () => `matrix-opaque-${String(++counter).padStart(16, '0')}`,
    createRandomSeed: () => 12345,
    now: () => runtimeNow,
  },
  help: { requirements: 'REQUIREMENTS', detail: 'DETAIL' },
  onSessionActive: () => undefined,
  delivery: { send: async () => ({ kind: 'delivered' }) },
};
const application = createApplicationApi(ports, idleState);

function setEnvironment(environment: 'prod' | 'dev') {
  (globalThis as { location?: { pathname: string } }).location = { pathname: environment === 'dev' ? '/dev/' : '/' };
}
function currentEnvironment(): string {
  return (globalThis as { location?: { pathname: string } }).location?.pathname === '/dev/' ? 'dev' : 'prod';
}

const connectionDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'bokemo-api-v1-matrix-'));
const http = createApiV1({
  allowEnable: true, connectionDirectory, allowedOrigin: 'app://bokemo',
  invokeApplication: (operationId: string, payload: Record<string, unknown>) => application.handle(operationId, payload),
});
const settings = await http.enable();
const descriptor = JSON.parse(fs.readFileSync(settings.connectionFile, 'utf8')) as { endpoint: string; token: string };

// ---------------------------------------------------------------------------------------------------------------------
// HTTP client.

interface HttpResult { sent?: CommitRequest; status: number; body: Record<string, unknown> & { error?: { code: string; details?: Record<string, unknown> }; data?: Record<string, unknown>; revision?: number } ; bytes?: Uint8Array }

const byId = new Map(contract.operations.map((operation) => [operation.operationId, operation]));

function routeFor(operationId: string, pathParameters: Record<string, unknown> = {}): string {
  const operation = byId.get(operationId);
  assert.ok(operation, `unknown operation ${operationId}`);
  return operation.path.replace(/\{([^}]+)\}/g, (_, name: string) => encodeURIComponent(String(pathParameters[name])));
}

class Client {
  revision = 0;
  // A fresh connection per request: on this platform a reused loopback connection that sat idle makes Node's `fetch` wait
  // about 300 ms (a plain Node server shows the same), which would dominate the run.
  private headers: Record<string, string> = { Authorization: `Bearer ${descriptor.token}`, Connection: 'close' };
  private keySequence = 0;

  async send(operationId: string, init: { path?: Record<string, unknown>; query?: Record<string, unknown>; body?: Record<string, unknown>; files?: Record<string, { bytes: Uint8Array; type: string }> } = {}): Promise<HttpResult> {
    const operation = byId.get(operationId)!;
    const url = new URL(`${descriptor.endpoint}${routeFor(operationId, init.path).replace(/^\/api\/v1/, '')}`);
    for (const [key, value] of Object.entries(init.query ?? {})) {
      for (const entry of Array.isArray(value) ? value : [value]) url.searchParams.append(key, typeof entry === 'string' ? entry : JSON.stringify(entry));
    }
    let body: BodyInit | undefined;
    const headers = { ...this.headers };
    if (operation.method === 'POST') {
      if (operationId === 'commit/setting/backup/import' || operationId === 'commit/setting/feedback') {
        const form = new FormData();
        form.append('metadata', JSON.stringify(init.body ?? {}));
        for (const [name, file] of Object.entries(init.files ?? {})) form.append(name, new Blob([file.bytes], { type: file.type }), name);
        body = form;
      } else {
        body = JSON.stringify(init.body ?? {});
        headers['Content-Type'] = 'application/json';
      }
    }
    const response = await fetch(url, { method: operation.method, headers, body });
    const type = response.headers.get('content-type') ?? '';
    if (type.startsWith('application/octet-stream')) {
      const bytes = new Uint8Array(await response.arrayBuffer());
      return { status: response.status, body: { revision: Number(response.headers.get('x-bokemo-revision')) }, bytes };
    }
    const json = await response.json() as HttpResult['body'];
    if (response.ok && typeof json.revision === 'number') this.revision = json.revision;
    return { status: response.status, body: json };
  }

  async logIn(): Promise<void> {
    const result = await this.send('fundamental/logIn', { body: { userId: identity.userId, environment: identity.environment, gameMode: identity.gameMode } });
    assert.equal(result.status, 200, JSON.stringify(result.body));
    const data = result.body.data as { sessionToken: string; controlLeaseToken: string };
    this.headers['X-BoKemo-Session'] = data.sessionToken;
    this.headers['X-BoKemo-Control-Lease'] = data.controlLeaseToken;
    this.revision = Number(result.body.revision ?? 0);
  }

  async logOut(): Promise<void> {
    const result = await this.send('fundamental/logOut', { body: {} });
    assert.equal(result.status, 200, `logOut: ${JSON.stringify(result.body)}`);
  }

  newKey(label: string): string {
    this.keySequence += 1;
    return `matrix-${label}-${String(this.keySequence).padStart(6, '0')}`.slice(0, 128).padEnd(16, '0');
  }

  async read(operationId: string, path: Record<string, unknown> = {}, query: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    const result = await this.send(operationId, { path, query });
    assert.equal(result.status, 200, `${operationId}: ${JSON.stringify(result.body)}`);
    return result.body.data as Record<string, unknown>;
  }

  async commit(operationId: string, request: CommitRequest, options: { key?: string; revision?: number; confirmationToken?: string } = {}): Promise<HttpResult> {
    return this.send(operationId, {
      path: request.path,
      body: {
        expectedRevision: options.revision ?? this.revision,
        idempotencyKey: options.key ?? this.newKey('commit'),
        ...(options.confirmationToken ? { confirmationToken: options.confirmationToken } : {}),
        parameters: request.parameters ?? {},
      },
      files: request.files,
    });
  }

  /** A commit that must succeed, following a confirmation challenge with the fixture's choice when one is issued. */
  async commitOk(operationId: string, request: CommitRequest, key = this.newKey('setup')): Promise<HttpResult> {
    let sent = request;
    let result = await this.commit(operationId, request, { key });
    if (result.body.error?.code === 'confirmation_required') {
      const token = String(result.body.error.details?.confirmationToken);
      sent = withChoice(request, result);
      result = await this.commit(operationId, sent, { key, confirmationToken: token });
    }
    assert.equal(result.status, 200, `${operationId}: ${JSON.stringify(result.body)}`);
    return { ...result, sent };
  }
}

/** What a fixture needs from a caller: the HTTP client or the trusted in-process adapter (9.3 parity). */
interface Actor {
  read: (operationId: string, path?: Record<string, unknown>, query?: Record<string, unknown>) => Promise<Record<string, unknown>>;
  commitOk: (operationId: string, request: CommitRequest, key?: string) => Promise<HttpResult>;
}

interface CommitRequest {
  path?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
  files?: Record<string, { bytes: Uint8Array; type: string }>;
}

function withChoice(request: CommitRequest, challenge: HttpResult): CommitRequest {
  const field = challenge.body.error?.details?.choiceField as string | undefined;
  if (!field) return request;
  const allowed = challenge.body.error?.details?.allowedChoices as string[];
  return { ...request, parameters: { ...request.parameters, [field]: allowed[0] } };
}

// ---------------------------------------------------------------------------------------------------------------------
// Fixtures: how to reach a successful request for each operation from the matrix save.

interface CommitFixture {
  /** Commits needed before the request is valid (for example a saved set before renaming it). */
  prepare?: (client: Actor) => Promise<void>;
  request: (client: Actor) => Promise<CommitRequest>;
  /** Environment in which the operation is available when it is restricted to debug mode. */
  environment?: 'dev';
  /** A save variant the success path needs (the default save is used for the restriction cell). */
  save?: (state: GameState) => void;
  /** A request refused by an unlock or availability rule, with the expected stable code. */
  locked?: (client: Actor) => Promise<{ request: CommitRequest; code: string }>;
}

interface ReadFixture {
  path?: (client: Actor) => Promise<Record<string, unknown>>;
  query?: Record<string, unknown>;
  missingPath?: Record<string, unknown>;
  prepare?: (client: Actor) => Promise<void>;
  environment?: 'dev';
}

async function firstCharacterId(client: Actor): Promise<number> {
  const party = await client.read('read/build/party/{p}', { p: 1 }) as { current: { order: number[] } };
  return party.current.order[0];
}
async function characterPath(client: Actor) { return { characterId: await firstCharacterId(client) }; }
async function ownedItems(client: Client, category?: string): Promise<string[]> {
  const data = await client.read('read/base/searchItems', {}, { state: 'owned', ...(category ? { category } : {}) }) as { items: string[] };
  return data.items.map((entry) => entry.split('/').slice(0, 4).join('/'));
}
async function exportedBackup(client: Actor): Promise<Uint8Array> {
  const exported = await client.commitOk('commit/setting/backup/export', {});
  assert.ok(exported.bytes && exported.bytes.length > 0);
  return exported.bytes;
}
async function saveSet(client: Actor): Promise<number> {
  const result = await client.commitOk('commit/build/character/{characterId}/saveEquipmentSet', { path: await characterPath(client), parameters: { equipmentSet: { name: 'Matrix' } } });
  return Number((result.body.data as { equipmentSetId?: number }).equipmentSetId ?? 1);
}

const commitFixtures: Record<string, CommitFixture> = {
  'commit/progress/elapsed': { request: async () => ({ parameters: { elapsedSeconds: 60 } }) },
  'commit/progress/progressReport': { request: async () => ({}) },
  'commit/expedition/{p}/changeExpedition': { request: async () => ({ path: { p: 1 }, parameters: { destinationMode: 'fixed' } }) },
  'commit/expedition/{p}/sortie': { request: async () => ({ path: { p: 1 } }) },
  'commit/expedition/{p}/godsBattle': {
    save: godsBattleReady,
    request: async () => ({ path: { p: 1 } }),
    locked: async () => ({ request: { path: { p: 1 } }, code: 'illegal_action' }),
  },
  'commit/expedition/{p}/resetStatistics': { request: async () => ({ path: { p: 1 } }) },
  'commit/build/party/{p}': {
    request: async (client) => {
      const party = await client.read('read/build/party/{p}', { p: 1 }) as { current: { order: number[] } };
      const order = [...party.current.order];
      [order[0], order[1]] = [order[1], order[0]];
      return { path: { p: 1 }, parameters: { order } };
    },
  },
  'commit/build/character/{characterId}/changeBuild': {
    // The starting characters are unique and cannot be edited (Spec 8.2.3), so the save makes the second one editable.
    save: (state) => { state.parties[0].characters[1].isUnique = false; },
    request: async (client) => {
      const party = await client.read('read/build/party/{p}', { p: 1 }) as { current: { order: number[] } };
      return { path: { characterId: party.current.order[1] }, parameters: { name: 'Matrix', simulation: false } };
    },
    locked: async (client) => ({ request: { path: await characterPath(client), parameters: { name: 'Matrix', simulation: false } }, code: 'illegal_action' }),
  },
  'commit/build/character/{characterId}/removeAllEquipment': { request: async (client) => ({ path: await characterPath(client) }) },
  'commit/build/character/{characterId}/removeEquipment': { request: async (client) => ({ path: await characterPath(client), parameters: { targetEquipment: 1 } }) },
  'commit/build/character/{characterId}/equip': {
    prepare: async (client) => { await client.commitOk('commit/build/character/{characterId}/removeEquipment', { path: await characterPath(client), parameters: { targetEquipment: 1 } }); },
    request: async (client) => {
      const equipment = await client.read('read/build/character/{characterId}/equipment', await characterPath(client)) as { current: { equipment: Array<string | null> } };
      void equipment;
      const armor = await ownedItems(client, 'armor');
      return { path: await characterPath(client), parameters: { targetEquipment: armor[0] } };
    },
  },
  'commit/build/character/{characterId}/lockEquipment': { request: async (client) => ({ path: await characterPath(client), parameters: { targetEquipment: 1 } }) },
  'commit/build/character/{characterId}/unlockEquipment': {
    prepare: async (client) => { await client.commitOk('commit/build/character/{characterId}/lockEquipment', { path: await characterPath(client), parameters: { targetEquipment: 1 } }); },
    request: async (client) => ({ path: await characterPath(client), parameters: { targetEquipment: 1 } }),
  },
  'commit/build/character/{characterId}/autoEquipment': { request: async (client) => ({ path: await characterPath(client), parameters: { mode: 'OFF' } }) },
  'commit/build/character/{characterId}/jewelAttach': { request: async (client) => ({ path: await characterPath(client), parameters: { targetEquipment: 1, jewelToSet: 'fort:1' } }) },
  'commit/build/character/{characterId}/jewelRemove': {
    prepare: async (client) => { await client.commitOk('commit/build/character/{characterId}/jewelAttach', { path: await characterPath(client), parameters: { targetEquipment: 1, jewelToSet: 'fort:1' } }); },
    request: async (client) => ({ path: await characterPath(client), parameters: { targetEquipment: 1 } }),
  },
  'commit/build/character/{characterId}/saveEquipmentSet': { request: async (client) => ({ path: await characterPath(client), parameters: { equipmentSet: { name: 'Matrix' } } }) },
  'commit/build/character/{characterId}/loadEquipmentSet': {
    request: async (client) => {
      // Selling one saved item makes the load partial, which is the case that asks for confirmation (Spec 9.1.3, 3-3-12).
      const setId = await saveSet(client);
      await client.commitOk('commit/build/character/{characterId}/removeAllEquipment', { path: await characterPath(client) });
      await client.commitOk('commit/base/sellInventoryItems', { parameters: { items: [(await ownedItems(client, 'armor'))[0]] } });
      return { path: await characterPath(client), parameters: { equipmentSetId: setId } };
    },
  },
  'commit/build/character/{characterId}/deleteEquipmentSet': { request: async (client) => ({ path: await characterPath(client), parameters: { equipmentSetId: await saveSet(client) } }) },
  'commit/build/character/{characterId}/renameEquipmentSet': { request: async (client) => ({ path: await characterPath(client), parameters: { equipmentSetId: await saveSet(client), name: 'Renamed' } }) },
  'commit/build/character/{characterId}/undoEquipment': {
    prepare: async (client) => { await client.commitOk('commit/build/character/{characterId}/removeEquipment', { path: await characterPath(client), parameters: { targetEquipment: 1 } }); },
    request: async (client) => ({ path: await characterPath(client) }),
  },
  'commit/build/character/{characterId}/redoEquipment': {
    prepare: async (client) => {
      await client.commitOk('commit/build/character/{characterId}/removeEquipment', { path: await characterPath(client), parameters: { targetEquipment: 1 } });
      await client.commitOk('commit/build/character/{characterId}/undoEquipment', { path: await characterPath(client) });
    },
    request: async (client) => ({ path: await characterPath(client) }),
  },
  'commit/base/changeJewelPriorityParty': { request: async () => ({ parameters: { partyNumber: 'none' } }) },
  'commit/base/sellInventoryItems': { request: async (client) => ({ parameters: { items: [(await ownedItems(client))[0]] } }) },
  'commit/base/purchaseShopItems': {
    request: async (client) => {
      const shop = await client.read('read/base/shopItemsList') as { current: { lineupId: string; entries: Array<{ shopItemId: number; soldOut: boolean }> } };
      const available = shop.current.entries.find((entry) => !entry.soldOut) ?? shop.current.entries[0];
      return { parameters: { lineupId: shop.current.lineupId, items: [{ shopItemId: available.shopItemId }] } };
    },
  },
  'commit/base/paidShopRefresh': { request: async () => ({}) },
  'commit/base/unlockSoldItems': {
    request: async (client) => {
      const item = (await ownedItems(client))[0];
      await client.commitOk('commit/base/sellInventoryItems', { parameters: { items: [item] } });
      return { parameters: { items: [item] } };
    },
  },
  'commit/base/unlockForm': {
    request: async (client) => {
      const forms = await client.read('read/base/enemyFormList') as { current: { enemyFormList: Array<{ enemyId: number; unlocked: boolean; unlockable: { available?: boolean } }> } };
      const list = forms.current.enemyFormList;
      const candidate = list.find((form) => !form.unlocked && form.unlockable?.available !== false) ?? list[0];
      return { parameters: { enemyId: candidate.enemyId } };
    },
  },
  'commit/diary/{p}/diarySetting': { request: async () => ({ path: { p: 1 }, parameters: { notifyGodsBattle: false } }) },
  'commit/diary/diaryEntry/markAsRead': { request: async () => ({ parameters: { diaryEntryId: 'ALL', partyNumber: 1 } }) },
  'commit/setting/clairvoyanceReset': {
    // A reset needs a.prophecy2 in the party or the Debug Clairvoyance override (Spec 8.6); the matrix party has no
    // a.prophecy, so the success path turns on the account's own override (dev/beta only) and the restriction cell is the refusal.
    environment: 'dev',
    prepare: async (client) => { await client.commitOk('commit/setting/debug', { parameters: { clairvoyance: true } }); },
    request: async () => ({ parameters: { partyNumber: 1, resetCommonRewards: true, resetRewards: false, resetSideQuest: false } }),
    locked: async () => ({ request: { parameters: { partyNumber: 1, resetCommonRewards: true, resetRewards: false, resetSideQuest: false } }, code: 'illegal_action' }),
  },
  'commit/setting/modeSelect': { request: async () => ({ parameters: { language: 'ja' } }) },
  'commit/setting/enemyEditPane': { environment: 'dev', request: async () => ({ parameters: { enemyLevel: 10 } }) },
  'commit/setting/feedback': { request: async () => ({ parameters: { name: 'Matrix', category: 'feedback', text: 'Conformance matrix feedback.' } }) },
  'commit/setting/backup/export': { request: async () => ({}) },
  'commit/setting/backup/import': { request: async (client) => ({ files: { backup: { bytes: await exportedBackup(client), type: 'application/octet-stream' } } }) },
  'commit/setting/backup/reset': { request: async () => ({}) },
  'commit/setting/debug': { environment: 'dev', request: async () => ({ parameters: { displayAfkDuration: true } }) },
  'commit/setting/markNewsAsRead': { request: async () => ({}) },
  'commit/setting/uiPreferences': {
    request: async (client) => ({ parameters: { changes: [{ key: `party.equipCategory.${await firstCharacterId(client)}`, value: 'wand' }] } }),
  },
  'commit/base/markItemsAsSeen': {
    // The command takes the Base projection's stable variant keys of newly acquired items (Spec 9.1.4.17).
    save: (state) => { const [key] = Object.keys(state.global.inventory); state.global.inventory[key] = { ...state.global.inventory[key], isNew: true }; },
    request: async (client) => {
      const base = await client.read('read/observation/base') as { baseInfo?: { inventory?: Array<{ variantKey: string; isNew: boolean }> }; inventory?: Array<{ variantKey: string; isNew: boolean }> };
      const inventory = base.baseInfo?.inventory ?? base.inventory ?? [];
      const fresh = inventory.find((entry) => entry.isNew);
      assert.ok(fresh, `no new variant in ${JSON.stringify(base).slice(0, 200)}`);
      return { parameters: { items: [fresh.variantKey] } };
    },
  },
};

const readFixtures: Record<string, ReadFixture> = {
  'read/expedition/{p}/setting': { path: async () => ({ p: 1 }), missingPath: { p: 6 } },
  'read/expedition/{p}/latestBattleLog': { path: async () => ({ p: 1 }), missingPath: { p: 6 } },
  'read/expedition/{p}/simulationRun': { path: async () => ({ p: 1 }), missingPath: { p: 6 } },
  'read/expedition/{p}/chargeStock': { path: async () => ({ p: 1 }), missingPath: { p: 6 } },
  'read/build/party/{p}': { path: async () => ({ p: 1 }), missingPath: { p: 6 } },
  'read/build/character/{characterId}/status': { path: characterPath, missingPath: { characterId: 999999 } },
  'read/build/character/{characterId}/equipment': { path: characterPath, missingPath: { characterId: 999999 } },
  'read/build/character/{characterId}/equipmentSet': { path: characterPath, missingPath: { characterId: 999999 } },
  'read/build/character/{characterId}/equipmentEvaluation': { path: characterPath, query: { equipmentChanges: '1=0' }, missingPath: { characterId: 999999 } },
  'read/base/searchItems': { query: { state: 'owned' } },
  'resources/glossary': { query: { category: 'Ab.' } },
  'resources/itemCompendium': { query: { category: 'armor' } },
  'resources/characterRoster': { query: { race: 'lupinian' } },
  'read/diary/{p}/diarySetting': { path: async () => ({ p: 1 }), missingPath: { p: 6 } },
  'read/diary/diaryEntry/{diaryEntryId}': {
    path: async (client) => {
      const diary = await client.read('read/observation/diary') as { entries?: Array<{ diaryEntryId: string }> };
      return { diaryEntryId: diary.entries?.[0]?.diaryEntryId ?? 'matrix-diary-id' };
    },
    missingPath: { diaryEntryId: 'missing-diary-entry' },
  },
  'read/setting/delivery/{deliveryId}': {
    path: async (client) => {
      const queued = await client.commitOk('commit/setting/feedback', { parameters: { name: 'Matrix', category: 'feedback', text: 'Delivery read.' } });
      return { deliveryId: (queued.body.data as { deliveryId: string }).deliveryId };
    },
    missingPath: { deliveryId: 'missing-delivery' },
  },
  'resources/clairvoyance/{p}': { path: async () => ({ p: 1 }), missingPath: { p: 6 } },
};

/** Operations whose cells are covered by a dedicated suite rather than this matrix, with the reason. */
const coveredElsewhere: Record<string, string> = {
  'fundamental/signUp': 'account creation writes the desktop account store; tests/apiV1SessionLifecycle.test.cjs and tests/apiAccountStore.test.cjs',
  'fundamental/logIn': 'every matrix case logs in; refusal of a second login is in tests/apiV1ApplicationApi.test.cjs and tests/apiV1Server.test.cjs',
  'fundamental/logOut': 'every matrix case logs out; flush and restore are in tests/apiV1SessionLifecycle.test.cjs',
  'read/observation/popupEventStream': 'an SSE stream, not a JSON read; tests/apiV1PopupStream.test.cjs covers connect, replay, invalid cursor, and fencing',
};

// ---------------------------------------------------------------------------------------------------------------------
// Matrix execution.

type Cell = 'success' | 'invalidInput' | 'staleRevision' | 'receiptReplay' | 'idempotencyConflict' | 'tombstone' | 'persistenceRollback'
  | 'confirmationExpiry' | 'confirmationReplay' | 'restriction' | 'notFound' | 'readOnly' | 'parity';
const COMMIT_CELLS: Cell[] = ['success', 'invalidInput', 'staleRevision', 'receiptReplay', 'idempotencyConflict', 'tombstone', 'persistenceRollback', 'confirmationExpiry', 'confirmationReplay', 'restriction', 'parity'];
const READ_CELLS: Cell[] = ['success', 'invalidInput', 'readOnly', 'notFound', 'parity'];

const results = new Map<string, Map<Cell, string>>();
const failures: string[] = [];
function record(operationId: string, cell: Cell, outcome: string) {
  if (!results.has(operationId)) results.set(operationId, new Map());
  results.get(operationId)!.set(cell, outcome);
}

/** Everything a failed commit must leave untouched: the revision and the complete observation. */
async function snapshot(client: Client): Promise<string> {
  const observation = await client.send('read/observation');
  assert.equal(observation.status, 200, JSON.stringify(observation.body));
  return JSON.stringify({ revision: observation.body.revision, data: observation.body.data });
}

async function withSession<T>(options: { environment?: 'prod' | 'dev'; tombstones?: string[]; save?: (state: GameState) => void }, run: (client: Client) => Promise<T>): Promise<T> {
  setEnvironment(options.environment ?? 'prod');
  savePayload = options.save ? encodeSave(options.save) : defaultSavePayload;
  seededTombstones = options.tombstones ?? [];
  failPersist = false;
  runtimeNow = t0;
  const client = new Client();
  await client.logIn();
  try {
    return await run(client);
  } finally {
    failPersist = false;
    await client.logOut();
    setEnvironment('prod');
    seededTombstones = [];
    savePayload = defaultSavePayload;
  }
}

async function cell(operationId: string, name: Cell, run: () => Promise<string | void>) {
  try {
    record(operationId, name, (await run()) ?? 'pass');
  } catch (error) {
    record(operationId, name, 'FAIL');
    failures.push(`${operationId} [${name}]: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function expectError(result: HttpResult, code: string, context: string) {
  assert.equal(result.body.error?.code, code, `${context}: expected ${code}, got ${result.status} ${JSON.stringify(result.body.error ?? result.body.data)}`);
}

async function runCommit(operation: CatalogOperation) {
  const id = operation.operationId;
  const fixture = commitFixtures[id];
  if (!fixture) { failures.push(`${id}: no commit fixture`); return; }
  const environment = fixture.environment ?? 'prod';
  const errors = new Set(operation.errors);
  const confirmable = errors.has('confirmation_required');

  // Brings the save to the fixture's precondition and returns the request plus the state it must not leave.
  const arrange = async (client: Client) => {
    await fixture.prepare?.(client);
    const request = await fixture.request(client);
    return { request, before: await snapshot(client) };
  };

  // success: the response passed the transport's catalog validation (a mismatch is a 500), and the revision advanced.
  await cell(id, 'success', () => withSession({ environment, save: fixture.save }, async (client) => {
    const { request } = await arrange(client);
    const start = client.revision;
    const result = await client.commitOk(id, request);
    assert.equal(result.body.revision !== undefined, true);
    assert.ok(Number(result.body.revision) >= start, 'the revision never moves backwards');
  }));

  await cell(id, 'invalidInput', () => withSession({ environment, save: fixture.save }, async (client) => {
    const { request, before } = await arrange(client);
    const invalid = operation.examples.invalidRequest?.body ?? { unexpectedMember: true };
    const result = await client.send(id, {
      path: request.path,
      body: { expectedRevision: client.revision, idempotencyKey: client.newKey('invalid'), parameters: request.parameters ?? {}, ...invalid },
      files: request.files,
    });
    expectError(result, 'invalid_request', 'an unknown member');
    assert.equal(await snapshot(client), before, 'no partial mutation');
  }));

  await cell(id, 'staleRevision', () => withSession({ environment, save: fixture.save }, async (client) => {
    const { request, before } = await arrange(client);
    const result = await client.commit(id, request, { revision: client.revision + 1 });
    expectError(result, 'stale_revision', 'a future expectedRevision');
    assert.equal(await snapshot(client), before, 'no partial mutation');
  }));

  await cell(id, 'receiptReplay', () => withSession({ environment, save: fixture.save }, async (client) => {
    const { request } = await arrange(client);
    const key = client.newKey('replay');
    const first = await client.commitOk(id, request, key);
    const after = await snapshot(client);
    const persistedBefore = persistCount;
    // The replay carries the original expectedRevision; a retained receipt answers before the revision check.
    const replay = await client.commit(id, first.sent ?? request, { key, revision: Number(first.body.previousRevision ?? client.revision) });
    assert.equal(replay.status, 200, JSON.stringify(replay.body));
    assert.equal(replay.body.revision, first.body.revision);
    if (first.bytes) assert.deepEqual(replay.bytes, first.bytes);
    else assert.deepEqual(replay.body.data, first.body.data);
    assert.equal(await snapshot(client), after, 'the replay changes nothing');
    assert.equal(persistCount, persistedBefore, 'the replay persists nothing');
  }));

  await cell(id, 'idempotencyConflict', () => withSession({ environment, save: fixture.save }, async (client) => {
    const { request } = await arrange(client);
    const key = client.newKey('conflict');
    await client.commitOk(id, request, key);
    const after = await snapshot(client);
    // The same key for a different request: another operation whose parameters always validate.
    const other = id === 'commit/setting/markNewsAsRead' ? 'commit/base/changeJewelPriorityParty' : 'commit/setting/markNewsAsRead';
    const otherRequest = other === 'commit/base/changeJewelPriorityParty' ? { parameters: { partyNumber: 'none' } } : {};
    const result = await client.commit(other, otherRequest, { key });
    expectError(result, 'idempotency_conflict', 'a reused key');
    assert.equal(await snapshot(client), after, 'no partial mutation');
  }));

  await cell(id, 'tombstone', () => withSession({ environment, save: fixture.save, tombstones: ['matrix-tombstoned-key-0001'] }, async (client) => {
    const { request, before } = await arrange(client);
    const result = await client.commit(id, request, { key: 'matrix-tombstoned-key-0001' });
    expectError(result, 'idempotency_expired', 'an evicted receipt key');
    assert.equal(await snapshot(client), before, 'no partial mutation');
  }));

  await cell(id, 'persistenceRollback', () => withSession({ environment, save: fixture.save }, async (client) => {
    const { request, before } = await arrange(client);
    const key = client.newKey('rollback');
    // Fails the first durable write of the request: the confirmation reservation for a confirmed command, or the commit.
    failPersist = true;
    const failed = await client.commit(id, request, { key });
    failPersist = false;
    expectError(failed, 'save_failed', 'a failed save');
    assert.equal(await snapshot(client), before, 'the failed save published nothing');
    const retried = await client.commitOk(id, request, key);
    assert.equal(retried.status, 200, 'the same key retries after the failure');
  }));

  if (confirmable) {
    await cell(id, 'confirmationExpiry', () => withSession({ environment, save: fixture.save }, async (client) => {
      const { request, before } = await arrange(client);
      const key = client.newKey('expiry');
      const challenge = await client.commit(id, request, { key });
      if (challenge.body.error?.code !== 'confirmation_required') return 'MISSING: the fixture does not reach the confirmation';
      runtimeNow = t0 + 300_001;
      const late = await client.commit(id, withChoice(request, challenge), { key, confirmationToken: String(challenge.body.error.details?.confirmationToken) });
      expectError(late, 'confirmation_invalid', 'an expired token');
      assert.equal(await snapshot(client), before, 'no partial mutation');
    }));
    await cell(id, 'confirmationReplay', () => withSession({ environment, save: fixture.save }, async (client) => {
      const { request } = await arrange(client);
      const key = client.newKey('confirmed');
      const challenge = await client.commit(id, request, { key });
      if (challenge.body.error?.code !== 'confirmation_required') return 'MISSING: the fixture does not reach the confirmation';
      const token = String(challenge.body.error.details?.confirmationToken);
      const beforeConfirmed = await snapshot(client);
      failPersist = true;
      const failedConfirmed = await client.commit(id, withChoice(request, challenge), { key, confirmationToken: token });
      failPersist = false;
      expectError(failedConfirmed, 'save_failed', 'a failed save of the confirmed commit');
      assert.equal(await snapshot(client), beforeConfirmed, 'the failed confirmed commit published nothing');
      const confirmed = await client.commit(id, withChoice(request, challenge), { key, confirmationToken: token });
      assert.equal(confirmed.status, 200, JSON.stringify(confirmed.body));
      const again = await client.commit(id, withChoice(request, challenge), { key, confirmationToken: token, revision: Number(confirmed.body.previousRevision) });
      assert.equal(again.status, 200, 'a used token replays the receipt');
      assert.equal(again.body.revision, confirmed.body.revision);
    }));
  } else {
    record(id, 'confirmationExpiry', 'n/a: no confirmation in the catalog');
    record(id, 'confirmationReplay', 'n/a: no confirmation in the catalog');
  }

  if (operation.restrictions.requiresDebugMode) {
    await cell(id, 'restriction', () => withSession({ environment: 'prod' }, async (client) => {
      const request = await fixture.request(client);
      const before = await snapshot(client);
      const result = await client.commit(id, request);
      expectError(result, 'illegal_action', 'a debug-only operation outside dev/beta');
      assert.equal(await snapshot(client), before, 'no partial mutation');
    }));
  } else if (fixture.locked) {
    await cell(id, 'restriction', () => withSession({ environment }, async (client) => {
      const { request, code } = await fixture.locked!(client);
      const before = await snapshot(client);
      const result = await client.commit(id, request);
      expectError(result, code, 'a locked operation');
      assert.equal(await snapshot(client), before, 'no partial mutation');
    }));
  } else {
    record(id, 'restriction', 'n/a: no environment or unlock restriction');
  }
}

async function runRead(operation: CatalogOperation) {
  const id = operation.operationId;
  const fixture = readFixtures[id] ?? {};
  const environment = fixture.environment ?? 'prod';
  const errors = new Set(operation.errors);
  const needsSession = operation.access !== 'public';

  const execute = async (client: Client | null) => {
    const probe = client ?? new Client();
    const path = (await fixture.path?.(probe)) ?? {};
    return { client: probe, path };
  };

  await cell(id, 'success', async () => {
    const run = async (client: Client | null) => {
      const { client: active, path } = await execute(client);
      const result = await active.send(id, { path, query: fixture.query });
      assert.equal(result.status, 200, JSON.stringify(result.body));
    };
    if (needsSession) await withSession({ environment }, run); else await run(null);
  });

  await cell(id, 'invalidInput', async () => {
    const run = async (client: Client | null) => {
      const { client: active, path } = await execute(client);
      const result = operation.method === 'POST'
        ? await active.send(id, { path, body: { ...(operation.examples.invalidRequest?.body ?? { unexpectedMember: true }) } })
        : await active.send(id, { path, query: { ...fixture.query, ...(operation.examples.invalidRequest?.query ?? { unexpectedMember: 'true' }) } });
      expectError(result, 'invalid_request', 'an unknown query member');
    };
    if (needsSession) await withSession({ environment }, run); else await run(null);
  });

  if (needsSession) {
    await cell(id, 'readOnly', () => withSession({ environment }, async (client) => {
      const { path } = await execute(client);
      const before = await snapshot(client);
      const persisted = persistCount;
      const result = await client.send(id, { path, query: fixture.query });
      assert.equal(result.status, 200, JSON.stringify(result.body));
      assert.equal(await snapshot(client), before, 'a read changes nothing');
      assert.equal(persistCount, persisted, 'a read persists nothing');
    }));
  } else {
    record(id, 'readOnly', 'n/a: public operation without a save');
  }

  if (errors.has('not_found') && fixture.missingPath) {
    await cell(id, 'notFound', () => withSession({ environment }, async (client) => {
      const result = await client.send(id, { path: fixture.missingPath, query: fixture.query });
      expectError(result, 'not_found', 'a missing path resource');
    }));
  } else if (errors.has('not_found')) {
    record(id, 'notFound', 'MISSING: not_found is catalogued but the fixture has no missing path');
  } else {
    record(id, 'notFound', 'n/a: not_found is not catalogued');
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Stage 9.3: dual-adapter parity (Spec 9.1.4.13). Every operation with a fixture runs from the same save and clock through
// the HTTP transport (an API account) and through the trusted in-process adapter (a fresh Application API whose runtime
// has none of the ordinary player's live-only ports, so both describe the same actor). The command's result and the
// complete observation afterwards must match after removing transport metadata and per-run random identifiers.

class InProcessActor implements Actor {
  private readonly adapter;
  constructor(readonly api: ReturnType<typeof createApplicationApi>) { this.adapter = api.createInProcessAdapter(); }

  async read(operationId: string, path: Record<string, unknown> = {}, query: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    const result = await this.adapter.read(operationId, { pathParameters: path, parameters: { ...path, ...query } }) as HttpResult['body'];
    assert.equal(result.error, undefined, `${operationId}: ${JSON.stringify(result.error)}`);
    return result.data as Record<string, unknown>;
  }

  async raw(operationId: string, path: Record<string, unknown> = {}, query: Record<string, unknown> = {}): Promise<HttpResult['body']> {
    return await this.adapter.read(operationId, { pathParameters: path, parameters: { ...path, ...query } }) as HttpResult['body'];
  }

  async commitOk(operationId: string, request: CommitRequest): Promise<HttpResult> {
    const uploadedFiles = Object.fromEntries(Object.entries(request.files ?? {}).map(([name, file]) => [name, {
      mediaType: file.type, byteLength: file.bytes.length, sha256: createHash('sha256').update(file.bytes).digest('hex'),
      contentBase64: Buffer.from(file.bytes).toString('base64'), validImageSignature: true,
    }]));
    let sent = request;
    let body = await this.adapter.commit(operationId, { pathParameters: request.path, parameters: request.parameters ?? {}, uploadedFiles }) as HttpResult['body'];
    if (body.error?.code === 'confirmation_required') {
      sent = withChoice(request, { status: 409, body });
      body = await this.adapter.commit(operationId, { pathParameters: request.path, parameters: sent.parameters ?? {}, uploadedFiles, confirmed: true }) as HttpResult['body'];
    }
    assert.equal(body.error, undefined, `${operationId}: ${JSON.stringify(body.error)}`);
    const savePayload = (body.data as { savePayload?: unknown } | undefined)?.savePayload;
    const bytes = operationId === 'commit/setting/backup/export' && typeof savePayload === 'string' ? new TextEncoder().encode(savePayload) : undefined;
    return { status: 200, body, bytes, sent };
  }
}

function inProcessApplication(variant?: (state: GameState) => void) {
  const state = decodeApiSavePayload(encodeSave(variant));
  let opaque = 0;
  const localPorts: ApplicationApiPorts = {
    ...ports,
    runtime: {
      ...ports.runtime,
      createOpaqueId: () => `matrix-inprocess-${String(++opaque).padStart(16, '0')}`,
      persistPlayer: async () => { if (failPersist) throw new Error('simulated disk failure'); },
    },
  };
  return createApplicationApi(localPorts, state);
}

// Transport metadata and per-run random identifiers (opaque IDs, confirmation tokens, forecast seeds) are excluded.
const VOLATILE_KEYS = new Set(['requestId', 'observedAt', 'committedAt', 'seedDomain', 'confirmationToken', 'expiresAt', 'leaseExpiresAt']);
function normalize(value: unknown, extraVolatile: readonly string[] = []): unknown {
  return JSON.parse(JSON.stringify(value, (key, entry) => {
    if (VOLATILE_KEYS.has(key) || extraVolatile.includes(key)) return undefined;
    if (typeof entry === 'string' && /^matrix-(opaque|inprocess)-\d+$/.test(entry)) return '<opaque-id>';
    return entry;
  }));
}

// The ordinary player's in-game time is the wall clock, while an API account's clock is advanced by its own elapsed
// progression (Spec 9.1.4.4); for `commit/progress/elapsed` that difference is the actor's, not the adapter's.
const ACTOR_CLOCK_KEYS: Record<string, readonly string[]> = { 'commit/progress/elapsed': ['inGameTime'] };

/** A backup is compared by the save it contains, not by its encoded bytes. */
function commandResult(result: HttpResult): unknown {
  if (result.bytes) return normalize(JSON.parse(JSON.stringify(serializeGameState(decodeApiSavePayload(new TextDecoder().decode(result.bytes))))));
  return normalize({ revision: result.body.revision, data: result.body.data });
}

/** Runs the delivery sender to completion so a queued report or feedback is settled on both sides before comparing. */
async function settleDeliveries(api: ReturnType<typeof createApplicationApi>) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await api.pumpDeliveries();
    await new Promise((resolve) => setImmediate(resolve));
  }
}

async function httpObservation(client: Client, extraVolatile: readonly string[] = []) {
  const observation = await client.send('read/observation');
  return normalize(observation.body.data, extraVolatile);
}

// Battle seeds are fresh Web Crypto entropy for every battle (as in the UI), not part of the API's seeded random state, so
// a Sortie or Gods Battle can resolve differently on two runs. Each side of a parity cell replays the same seed sequence.
function replayBattleSeeds() {
  let next = 0x9e3779b97f4a7c15n;
  resetBattleSeedSourceForTesting(() => { next = (next * 6364136223846793005n + 1442695040888963407n) & 0xffffffffffffffffn; return next === 0n ? 1n : next; });
}

async function runParity(filter: RegExp | null) {
  for (const operation of contract.operations) {
    const id = operation.operationId;
    if (filter && !filter.test(id)) continue;
    if (coveredElsewhere[id] || operation.access !== 'session') { record(id, 'parity', coveredElsewhere[id] ? `elsewhere: ${coveredElsewhere[id]}` : 'n/a: public operation without a save'); continue; }
    await cell(id, 'parity', async () => {
      if (id.startsWith('commit/')) {
        const fixture = commitFixtures[id];
        const environment = fixture.environment ?? 'prod';
        replayBattleSeeds();
        const http = await withSession({ environment, save: fixture.save }, async (client) => {
          await fixture.prepare?.(client);
          const request = await fixture.request(client);
          const result = await client.commitOk(id, request);
          await settleDeliveries(application);
          return { result: commandResult(result), observation: await httpObservation(client, ACTOR_CLOCK_KEYS[id]) };
        });
        setEnvironment(environment);
        replayBattleSeeds();
        try {
          const local = new InProcessActor(inProcessApplication(fixture.save));
          await fixture.prepare?.(local);
          const request = await fixture.request(local);
          const result = await local.commitOk(id, request);
          await settleDeliveries(local.api);
          assert.deepEqual(commandResult(result), http.result, 'the command result differs between adapters');
          assert.deepEqual(normalize((await local.raw('read/observation')).data, ACTOR_CLOCK_KEYS[id]), http.observation, 'the state afterwards differs between adapters');
        } finally {
          setEnvironment('prod');
          resetBattleSeedSourceForTesting(null);
        }
      } else {
        const fixture = readFixtures[id] ?? {};
        const environment = fixture.environment ?? 'prod';
        const http = await withSession({ environment }, async (client) => {
          const path = (await fixture.path?.(client)) ?? {};
          await settleDeliveries(application);
          const result = await client.send(id, { path, query: fixture.query });
          assert.equal(result.status, 200, JSON.stringify(result.body));
          return normalize({ revision: result.body.revision, data: result.body.data });
        });
        setEnvironment(environment);
        try {
          const local = new InProcessActor(inProcessApplication());
          const path = (await fixture.path?.(local)) ?? {};
          await settleDeliveries(local.api);
          const result = await local.raw(id, path, fixture.query ?? {});
          assert.equal(result.error, undefined, JSON.stringify(result.error));
          assert.deepEqual(normalize({ revision: result.revision, data: result.data }), http, 'the read differs between adapters');
        } finally {
          setEnvironment('prod');
        }
      }
    });
  }
}

const only = process.env.MATRIX_ONLY ? new RegExp(process.env.MATRIX_ONLY) : null;
try {
  for (const operation of contract.operations) {
    const id = operation.operationId;
    if (only && !only.test(id)) continue;
    if (coveredElsewhere[id]) {
      for (const name of id.startsWith('commit/') ? COMMIT_CELLS : READ_CELLS) record(id, name, `elsewhere: ${coveredElsewhere[id]}`);
      continue;
    }
    if (id.startsWith('commit/')) await runCommit(operation);
    else await runRead(operation);
  }
  await runParity(only);
} finally {
  await http.shutdown();
  fs.rmSync(connectionDirectory, { recursive: true, force: true });
}


// ---------------------------------------------------------------------------------------------------------------------
// Report: every applicable cell has an outcome, and no cell failed.

const missing: string[] = [];
for (const operation of contract.operations.filter((entry) => !process.env.MATRIX_ONLY || new RegExp(process.env.MATRIX_ONLY).test(entry.operationId))) {
  const cells = operation.operationId.startsWith('commit/') ? COMMIT_CELLS : READ_CELLS;
  for (const name of cells) {
    const outcome = results.get(operation.operationId)?.get(name);
    if (!outcome || outcome.startsWith('MISSING')) missing.push(`${operation.operationId} [${name}]: ${outcome ?? 'no outcome'}`);
  }
}
const counts = { pass: 0, na: 0, elsewhere: 0, fail: failures.length };
for (const cells of results.values()) for (const outcome of cells.values()) {
  if (outcome === 'pass') counts.pass += 1; else if (outcome.startsWith('n/a')) counts.na += 1; else if (outcome.startsWith('elsewhere')) counts.elsewhere += 1;
}
console.log(JSON.stringify({ operations: contract.operations.length, ...counts, missing: missing.length }));
if (process.env.MATRIX_REPORT) {
  for (const [operationId, cells] of results) console.log(operationId.padEnd(56), [...cells].map(([name, outcome]) => `${name}=${outcome === 'pass' ? '✓' : outcome.slice(0, 12)}`).join(' '));
}
assert.deepEqual(failures, [], `conformance failures:\n${failures.join('\n')}`);
assert.deepEqual(missing, [], `cells without an outcome:\n${missing.join('\n')}`);
