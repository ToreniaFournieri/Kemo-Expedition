import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createApplicationApi, type ApplicationApiPorts } from '../../src/api/v1/applicationApi';
import { decodeApiSavePayload } from '../../src/api/v1/commitOperations';
import { createFreshGameState } from '../../src/hooks/useGameState';
import { serializeGameState } from '../../src/game/saveCodec';
import { encodePersistedState } from '../../src/game/storageCompression';
import type { GameState } from '../../src/types';

// SpecRef: 9.1.4.16 | Admitted work, disconnection, and shutdown; 9.1.4.6 | exclusive control
// Stage 9.4 lifecycle coverage over the real desktop HTTP transport and Application API: account switching, simultaneous
// duplicates, receipt eviction, lease expiry and in-flight pinning, crash and renderer-loss recovery, and shutdown
// draining. Each scenario owns a durable in-memory account store that survives a simulated renderer restart.

const require = createRequire(import.meta.url);
const { createApiV1 } = require(path.resolve('desktop/api-v1.cjs')) as { createApiV1: (options: Record<string, unknown>) => HttpApi };
interface HttpApi { enable: () => Promise<{ connectionFile: string }>; shutdown: () => Promise<void>; releaseForRendererLoss: () => void }

const t0 = Date.parse('2026-01-01T00:00:00.000Z');
const encode = (state: GameState) => encodePersistedState(JSON.stringify(serializeGameState(state)));

interface Stack {
  api: HttpApi;
  endpoint: string;
  token: string;
  store: Map<string, DesktopApiAccountRecord>;
  /** The state the renderer currently shows (the player's own save, or the logged-in account's). */
  renderer: () => GameState;
  playerUserId: string;
  /** Replaces the renderer's Application API, as a crash or reload does: every in-memory session is lost. */
  restartRenderer: () => void;
  /** Delays the named operation inside the renderer (an admitted request still being worked on). */
  delay: Map<string, Promise<void>>;
  failCommits: { value: boolean };
  close: () => Promise<void>;
}

async function stack(options: { leaseIdleTimeoutMs?: number; seedAccounts?: Array<{ userId: string; control?: Partial<DesktopApiControlMetadata> }> } = {}): Promise<Stack> {
  const store = new Map<string, DesktopApiAccountRecord>();
  const failCommits = { value: false };
  const player = createFreshGameState('ja', t0);
  player.global.userId = 'player';
  let renderer: GameState = player;
  let returnPayload: string | null = null;
  let counter = 0;
  for (const seed of options.seedAccounts ?? []) {
    const state = createFreshGameState('ja', t0);
    state.global.userId = seed.userId;
    store.set(seed.userId, {
      identity: { userId: seed.userId, environment: 'desktop', gameMode: 'normal', levelOffsetForOrca: null } as unknown as DesktopApiAccountIdentity,
      savePayload: encode(state),
      control: { revisionHighWater: 0, inGameTime: t0, receipts: [], tombstones: [], popupEvents: [], deliveries: [], ...seed.control } as DesktopApiControlMetadata,
    });
  }
  const ports: ApplicationApiPorts = {
    session: {
      accounts: {
        create: async (identity, savePayload) => {
          if (store.has(identity.userId)) throw new Error('already_exists');
          store.set(identity.userId, { identity, savePayload, control: { revisionHighWater: 0, inGameTime: t0, receipts: [], tombstones: [], popupEvents: [], deliveries: [] } as DesktopApiControlMetadata });
          return identity;
        },
        load: async (identity) => { const record = store.get(identity.userId); return record ? structuredClone(record) : null; },
        commit: async (identity, savePayload, control) => {
          if (failCommits.value) throw new Error('simulated disk failure');
          store.set(identity.userId, { identity, savePayload, control: structuredClone(control) });
          return true;
        },
      } as ApplicationApiPorts['session']['accounts'],
      player: {
        flushSave: async () => undefined,
        exportPayload: async () => encode(player),
        returnPayload: { get: () => returnPayload, set: (payload) => { returnPayload = payload; }, clear: () => { returnPayload = null; } },
      },
      importGameState: async (state) => { renderer = state; return { state, errorLog: null }; },
      exportActiveAccountPayload: async () => encode(renderer),
      now: () => t0,
      catchUp: { maximumElapsedMs: 3_600_000, cycleDurationScale: () => 1, applyAutoEquipment: (state) => state, yieldBetweenChunks: async () => undefined, randomSeed: () => 7 },
    },
    desktopAvailable: () => true,
    runtime: {
      readiness: () => 'ready', versionBuild: () => '0.9.7 (lifecycle)', environment: () => 'prod', gameMode: () => 'mode.normal', enemyLevelOffset: () => 0,
      cycleDurationScale: () => 1, applyAutoEquipment: (state) => state,
      simulate: async () => ({ total: 100, Clear: 40, Return: 10, Draw: 10, Retreat: 10, Defeat: 30, rooms: [] }),
      persistPlayer: async () => undefined,
      publish: async (state) => { renderer = state; },
      yieldBetweenChunks: async () => undefined,
      createOpaqueId: () => `lifecycle-opaque-${String(++counter).padStart(16, '0')}`,
      createRandomSeed: () => 12345,
      now: () => t0,
    },
    help: { requirements: 'REQUIREMENTS', detail: 'DETAIL' },
    onSessionActive: () => undefined,
    delivery: { send: async () => ({ kind: 'delivered' }) },
  };
  let application = createApplicationApi(ports, player);
  const delay = new Map<string, Promise<void>>();
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bokemo-api-v1-lifecycle-'));
  const api = createApiV1({
    allowEnable: true, connectionDirectory: directory, allowedOrigin: 'app://bokemo', leaseIdleTimeoutMs: options.leaseIdleTimeoutMs,
    invokeApplication: async (operationId: string, payload: Record<string, unknown>) => {
      await delay.get(operationId);
      return application.handle(operationId, payload);
    },
  });
  const settings = await api.enable();
  const descriptor = JSON.parse(fs.readFileSync(settings.connectionFile, 'utf8')) as { endpoint: string; token: string };
  return {
    api, endpoint: descriptor.endpoint, token: descriptor.token, store, renderer: () => renderer, playerUserId: player.global.userId, delay, failCommits,
    restartRenderer: () => {
      // A reload shows the player's own save again and starts a new Application API with no session.
      renderer = player;
      returnPayload = null;
      application = createApplicationApi(ports, player);
    },
    close: async () => { await api.shutdown(); fs.rmSync(directory, { recursive: true, force: true }); },
  };
}

interface Response { status: number; body: { revision?: number; previousRevision?: number; data?: Record<string, unknown>; error?: { code: string } } }

class Client {
  private session: Record<string, string> = {};
  private keys = 0;
  constructor(private readonly s: Stack) {}

  async request(method: 'GET' | 'POST', route: string, body?: Record<string, unknown>): Promise<Response> {
    // A fresh connection per request: an idle reused loopback connection makes Node's `fetch` wait about 300 ms here.
    const headers: Record<string, string> = { Authorization: `Bearer ${this.s.token}`, Connection: 'close', ...this.session };
    if (body) headers['Content-Type'] = 'application/json';
    const response = await fetch(`${this.s.endpoint}/${route}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    return { status: response.status, body: await response.json() as Response['body'] };
  }

  async signUp(userId: string) {
    const result = await this.request('POST', 'fundamental/signUp', { userId, environment: 'desktop', gameMode: 'normal' });
    assert.equal(result.status, 200, JSON.stringify(result.body));
  }

  async logIn(userId: string): Promise<Response> {
    const result = await this.request('POST', 'fundamental/logIn', { userId, environment: 'desktop', gameMode: 'normal' });
    if (result.status === 200) {
      const data = result.body.data as { sessionToken: string; controlLeaseToken: string };
      this.session = { 'X-BoKemo-Session': data.sessionToken, 'X-BoKemo-Control-Lease': data.controlLeaseToken };
    }
    return result;
  }

  async logOut() { return this.request('POST', 'fundamental/logOut', {}); }

  key(label: string) { this.keys += 1; return `lifecycle-${label}-${String(this.keys).padStart(6, '0')}`; }

  async destinationMode(): Promise<string> {
    const result = await this.request('GET', 'read/expedition/1/setting');
    assert.equal(result.status, 200, JSON.stringify(result.body));
    return String((result.body.data as { current: { destinationMode: string } }).current.destinationMode);
  }

  async revision(): Promise<number> {
    const result = await this.request('GET', 'read/observation/overview');
    assert.equal(result.status, 200, JSON.stringify(result.body));
    return Number(result.body.revision);
  }

  changeExpedition(mode: 'auto' | 'fixed', expectedRevision: number, key: string) {
    return this.request('POST', 'commit/expedition/1/changeExpedition', { expectedRevision, idempotencyKey: key, parameters: { destinationMode: mode } });
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 1. Account switching: each account sees only its own save, and every logout hands the renderer back the player's save.
{
  const s = await stack();
  try {
    const client = new Client(s);
    await client.signUp('Alice');
    await client.signUp('Bob');
    assert.equal((await client.logIn('Alice')).status, 200);
    assert.notEqual(s.renderer().global.userId, s.playerUserId, 'the renderer shows the account while logged in');
    const changed = await client.changeExpedition('fixed', await client.revision(), client.key('alice'));
    assert.equal(changed.status, 200, JSON.stringify(changed.body));
    assert.equal((await client.logOut()).status, 200);
    assert.equal(s.renderer().global.userId, s.playerUserId, "logout restores the player's own save");

    assert.equal((await client.logIn('Bob')).status, 200);
    assert.equal(await client.destinationMode(), 'auto', "Bob does not see Alice's change");
    assert.equal((await client.logOut()).status, 200);

    assert.equal((await client.logIn('Alice')).status, 200);
    assert.equal(await client.destinationMode(), 'fixed', "Alice's change is durable across a switch");
    assert.equal((await client.logOut()).status, 200);
    assert.equal(s.renderer().global.userId, s.playerUserId);
  } finally { await s.close(); }
}

// 2. Simultaneous duplicates: the same request sent twice at once changes the save once; each copy either replays the one
// receipt or is told the operation is in progress.
{
  const s = await stack({ seedAccounts: [{ userId: 'Dup' }] });
  try {
    const client = new Client(s);
    assert.equal((await client.logIn('Dup')).status, 200);
    const start = await client.revision();
    const key = client.key('dup');
    const [first, second] = await Promise.all([client.changeExpedition('fixed', start, key), client.changeExpedition('fixed', start, key)]);
    const outcomes = [first, second].map((result) => result.status === 200 ? `ok:${result.body.revision}` : result.body.error?.code);
    for (const outcome of outcomes) assert.ok(outcome === `ok:${start + 1}` || outcome === 'operation_in_progress', `unexpected outcome ${outcome}`);
    assert.ok(outcomes.includes(`ok:${start + 1}`), 'one copy commits');
    assert.equal(await client.revision(), start + 1, 'the save changed exactly once');
    const retry = await client.changeExpedition('fixed', start, key);
    assert.equal(retry.body.revision, start + 1, 'a later retry replays the same receipt');
  } finally { await s.close(); }
}

// 3. Receipt eviction: after 4,096 retained receipts the oldest key becomes a tombstone (`idempotency_expired`), while a
// retained key still replays.
{
  const receipts = Array.from({ length: 4096 }, (_, index) => ({
    key: `seeded-receipt-${String(index).padStart(6, '0')}`,
    operation: 'commit/setting/markNewsAsRead',
    canonical: `seeded-${index}`,
    response: { requestId: 'seeded', previousRevision: 0, revision: 0, data: {}, effects: [], changedResources: [], committedAt: new Date(t0).toISOString() },
  }));
  const s = await stack({ seedAccounts: [{ userId: 'Evict', control: { receipts } as Partial<DesktopApiControlMetadata> }] });
  try {
    const client = new Client(s);
    assert.equal((await client.logIn('Evict')).status, 200);
    const committed = await client.changeExpedition('fixed', await client.revision(), client.key('evict'));
    assert.equal(committed.status, 200, JSON.stringify(committed.body));
    const control = s.store.get('Evict')!.control;
    assert.equal(control.receipts.length, 4096, 'the retained receipt count stays bounded');
    assert.ok(control.tombstones.includes('seeded-receipt-000000'), 'the oldest receipt is tombstoned');
    const evicted = await client.request('POST', 'commit/setting/markNewsAsRead', { expectedRevision: await client.revision(), idempotencyKey: 'seeded-receipt-000000', parameters: {} });
    assert.equal(evicted.body.error?.code, 'idempotency_expired');
    const retained = await client.request('POST', 'commit/expedition/1/changeExpedition', { expectedRevision: 0, idempotencyKey: 'lifecycle-evict-000001', parameters: { destinationMode: 'fixed' } });
    assert.equal(retained.body.revision, committed.body.revision, 'a retained receipt still replays');
  } finally { await s.close(); }
}

// 4. Lease expiry: an idle lease expires and the server logs the account out; a request that is still being worked on
// pins the lease so it cannot expire mid-flight; a new login then succeeds.
{
  const s = await stack({ leaseIdleTimeoutMs: 150, seedAccounts: [{ userId: 'Idle' }] });
  try {
    const client = new Client(s);
    assert.equal((await client.logIn('Idle')).status, 200);
    let release!: () => void;
    s.delay.set('read/observation/overview', new Promise<void>((resolve) => { release = resolve; }));
    const pinned = client.request('GET', 'read/observation/overview');
    await sleep(300);
    release();
    assert.equal((await pinned).status, 200, 'an in-flight request pins the lease');
    s.delay.clear();
    await sleep(300);
    const expired = await client.request('GET', 'read/observation/overview');
    assert.equal(expired.status, 401);
    assert.ok(['login_required', 'control_lease_expired'].includes(String(expired.body.error?.code)), JSON.stringify(expired.body));
    assert.equal(s.renderer().global.userId, s.playerUserId, "expiry logs out and restores the player's save");
    assert.equal((await client.logIn('Idle')).status, 200, 'a new login succeeds after expiry');
  } finally { await s.close(); }
}

// 5. Crash and renderer loss: the durable commit and its receipt survive a renderer restart; old tokens are rejected, a new
// login succeeds at once, a retry of the lost response replays the receipt, and a commit whose save failed is gone.
{
  const s = await stack({ seedAccounts: [{ userId: 'Crash' }] });
  try {
    const client = new Client(s);
    assert.equal((await client.logIn('Crash')).status, 200);
    const start = await client.revision();
    const committed = await client.changeExpedition('fixed', start, client.key('crash'));
    assert.equal(committed.status, 200);
    s.failCommits.value = true;
    const failed = await client.request('POST', 'commit/diary/diaryEntry/markAsRead', { expectedRevision: committed.body.revision, idempotencyKey: client.key('lost'), parameters: { diaryEntryId: 'ALL', partyNumber: 1 } });
    assert.equal(failed.body.error?.code, 'save_failed');
    s.failCommits.value = false;

    // The renderer is lost: the main process releases the lease and the reloaded renderer starts without a session.
    s.api.releaseForRendererLoss();
    s.restartRenderer();
    const stale = await client.request('GET', 'read/observation/overview');
    assert.equal(stale.status, 401, 'old tokens are not accepted after renderer loss');
    assert.equal((await client.logIn('Crash')).status, 200, 'a new login succeeds at once');
    assert.equal(await client.destinationMode(), 'fixed', 'the durable commit survived');
    assert.equal(await client.revision(), committed.body.revision, 'the failed commit left no trace');
    const replay = await client.changeExpedition('fixed', start, 'lifecycle-crash-000001');
    assert.equal(replay.status, 200);
    assert.equal(replay.body.revision, committed.body.revision, 'the receipt survived the restart');
  } finally { await s.close(); }
}

// 6. Shutdown draining: an admitted commit finishes and is durable before the server stops; nothing is admitted after.
{
  const s = await stack({ seedAccounts: [{ userId: 'Drain' }] });
  let closed = false;
  try {
    const client = new Client(s);
    assert.equal((await client.logIn('Drain')).status, 200);
    const start = await client.revision();
    let release!: () => void;
    s.delay.set('commit/expedition/{p}/changeExpedition', new Promise<void>((resolve) => { release = resolve; }));
    const inFlight = client.changeExpedition('fixed', start, client.key('drain'));
    await sleep(50);
    const stopping = s.api.shutdown();
    await sleep(50);
    release();
    const result = await inFlight;
    await stopping;
    closed = true;
    assert.equal(result.status, 200, `the admitted commit completes: ${JSON.stringify(result.body)}`);
    const durable = decodeApiSavePayload(s.store.get('Drain')!.savePayload);
    assert.equal(durable.parties[0].expeditionDestinationMode, 'fixed', 'the admitted commit is durable');
    await assert.rejects(client.request('GET', 'fundamental/status'), 'nothing is admitted after shutdown');
  } finally { if (!closed) await s.close(); }
}

console.log('lifecycle ok');
