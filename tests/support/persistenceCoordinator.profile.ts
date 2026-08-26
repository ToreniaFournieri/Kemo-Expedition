import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import {
  PersistenceCoordinator,
  PersistenceShutdownError,
  type PersistenceWorkerLike,
  type PersistenceWorkerRequest,
  type PersistenceWorkerResponse,
} from '../../src/game/savePersistence.ts';
import { hydrateGameState, serializeGameState } from '../../src/game/saveCodec.ts';
import { decodePersistedState, encodePersistedState } from '../../src/game/storageCompression.ts';
import type { GameState } from '../../src/types.ts';

class ControlledWorker implements PersistenceWorkerLike {
  onmessage: ((event: MessageEvent<PersistenceWorkerResponse>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  readonly requests: PersistenceWorkerRequest[] = [];
  terminated = false;

  postMessage(request: PersistenceWorkerRequest): void { this.requests.push(request) }
  terminate(): void { this.terminated = true }
  complete(request = this.requests.at(-1)!): void {
    this.onmessage?.({ data: { type: 'complete', requestId: request.requestId, revision: request.revision,
      encodedPayload: encodePersistedState(request.jsonPayload), queueLatencyMs: 1, compressionMs: 2,
      completedAt: performance.timeOrigin + performance.now() } } as MessageEvent<PersistenceWorkerResponse>);
  }
  fail(request = this.requests.at(-1)!, message = 'encode failed'): void {
    const event = { data: { type: 'error', requestId: request.requestId, revision: request.revision, message } } as unknown as MessageEvent<PersistenceWorkerResponse>;
    this.onmessage?.(event);
  }
}

function loadFixture(): GameState {
  const envelope = JSON.parse(readFileSync(resolve(process.cwd(), 'sample_savedata/ALL_Exp8_v0.9.3_dev_20260816.kemoz'), 'utf8')) as { saveDataCompressed: string };
  return hydrateGameState(JSON.parse(decodePersistedState(envelope.saveDataCompressed)) as GameState);
}

function withGold(state: GameState, gold: number): GameState {
  return { ...state, global: { ...state.global, gold } };
}

function harness(options: { failWrites?: number } = {}) {
  const workers: ControlledWorker[] = [];
  const writes: string[] = [];
  let remainingFailures = options.failWrites ?? 0;
  const coordinator = new PersistenceCoordinator({
    storageKey: 'save',
    storage: { setItem: (_key, value) => { if (remainingFailures-- > 0) throw new Error('quota'); writes.push(value) } },
    workerFactory: () => { const worker = new ControlledWorker(); workers.push(worker); return worker },
  });
  return { coordinator, workers, writes };
}

test('worker-coordinated output is byte-identical to the synchronous encoder and round-trips semantically', async () => {
  const state = loadFixture();
  const { coordinator, workers, writes } = harness();
  const durable = coordinator.requestDurable(state);
  const request = workers[0]!.requests[0]!;
  workers[0]!.complete(request);
  await durable;
  const expected = encodePersistedState(JSON.stringify(serializeGameState(state)));
  assert.equal(writes[0], expected);
  assert.deepEqual(JSON.parse(decodePersistedState(writes[0]!)), serializeGameState(state));
  coordinator.shutdown();
});

test('single-flight coalescing keeps only the latest pending state', async () => {
  const base = loadFixture();
  const { coordinator, workers, writes } = harness();
  coordinator.requestOrdinary(withGold(base, 1));
  coordinator.requestOrdinary(withGold(base, 2));
  const latest = coordinator.requestDurable(withGold(base, 3));
  assert.deepEqual(coordinator.getSnapshotForTesting(), { revision: 3, durableRevision: 0, inFlightRevision: 1, pendingRevision: 3, storageRetryRevision: null });
  assert.equal(workers[0]!.requests.length, 1);
  workers[0]!.complete(workers[0]!.requests[0]);
  assert.equal(workers[0]!.requests.length, 2);
  workers[0]!.complete(workers[0]!.requests[1]);
  await latest;
  assert.equal((JSON.parse(decodePersistedState(writes.at(-1)!)) as GameState).global.gold, 3);
  assert.equal(writes.length, 2);
  coordinator.shutdown();
});

test('stale and out-of-order worker responses cannot overwrite newer work', async () => {
  const base = loadFixture();
  const { coordinator, workers, writes } = harness();
  coordinator.requestOrdinary(withGold(base, 10));
  const oldRequest = workers[0]!.requests[0]!;
  const latest = coordinator.requestDurable(withGold(base, 30));
  workers[0]!.complete(oldRequest);
  const latestRequest = workers[0]!.requests[1]!;
  workers[0]!.complete(oldRequest);
  assert.equal(writes.length, 1);
  workers[0]!.complete(latestRequest);
  await latest;
  assert.equal((JSON.parse(decodePersistedState(writes.at(-1)!)) as GameState).global.gold, 30);
  coordinator.shutdown();
});

test('durable flushes resolve in revision order alongside ordinary requests', async () => {
  const base = loadFixture();
  const { coordinator, workers } = harness();
  let firstResolved = false;
  let thirdResolved = false;
  const first = coordinator.requestDurable(withGold(base, 1)).then(() => { firstResolved = true });
  coordinator.requestOrdinary(withGold(base, 2));
  const third = coordinator.requestDurable(withGold(base, 3)).then(() => { thirdResolved = true });
  workers[0]!.complete(workers[0]!.requests[0]);
  await first;
  assert.equal(firstResolved, true);
  assert.equal(thirdResolved, false);
  workers[0]!.complete(workers[0]!.requests[1]);
  await third;
  assert.equal(thirdResolved, true);
  coordinator.shutdown();
});

test('worker encode failure retains the latest revision for explicit retry', async () => {
  const base = loadFixture();
  const { coordinator, workers, writes } = harness();
  const durable = coordinator.requestDurable(base);
  workers[0]!.fail();
  assert.equal(coordinator.getSnapshotForTesting().pendingRevision, 1);
  coordinator.retry();
  assert.equal(workers.length, 2);
  workers[1]!.complete();
  await durable;
  assert.equal(writes.length, 1);
  coordinator.shutdown();
});

test('localStorage failure retains encoded bytes and retries without recompression', async () => {
  const state = loadFixture();
  const { coordinator, workers, writes } = harness({ failWrites: 1 });
  const durable = coordinator.requestDurable(state);
  workers[0]!.complete();
  assert.equal(coordinator.getSnapshotForTesting().storageRetryRevision, 1);
  assert.equal(workers[0]!.requests.length, 1);
  coordinator.retry();
  await durable;
  assert.equal(writes.length, 1);
  assert.equal(workers[0]!.requests.length, 1);
  coordinator.shutdown();
});

test('teardown rejects pending durability without unhandled rejections', async () => {
  const { coordinator, workers } = harness();
  const unhandled: unknown[] = [];
  const listener = (reason: unknown) => unhandled.push(reason);
  process.on('unhandledRejection', listener);
  try {
    const durable = coordinator.requestDurable(loadFixture());
    coordinator.shutdown();
    await assert.rejects(durable, PersistenceShutdownError);
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(unhandled, []);
    assert.equal(workers[0]!.terminated, true);
  } finally {
    process.off('unhandledRejection', listener);
  }
});
