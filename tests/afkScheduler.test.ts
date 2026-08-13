import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  createAfkSchedulerProfile,
  getAdaptiveAfkOperationCount,
  getAfkBatchBudgetMs,
  getAfkOperationWindow,
  normalizePersistedAfkChunkCursor,
  recordAfkSchedulerBatch,
} from '../src/game/afkSchedulerCore.ts';

const hookSource = readFileSync(new URL('../src/hooks/useGameState.ts', import.meta.url), 'utf8');
const homeSource = readFileSync(new URL('../src/components/HomeScreen.tsx', import.meta.url), 'utf8');

test('a logical AFK Chunk retains twelve Cycles per equal-duration party', () => {
  const durationMs = 450_000;
  const operations = getAfkOperationWindow(
    [durationMs, durationMs],
    durationMs * 12,
    0,
    Number.MAX_SAFE_INTEGER,
  );

  assert.equal(operations.length, 24);
  assert.equal(operations.at(-1)?.runIndex, 11);
});

test('partitioned operation windows preserve the unsliced chronological order', () => {
  const durations = [100, 150, 240];
  const elapsedMs = 1_200;
  const complete = getAfkOperationWindow(durations, elapsedMs, 0, Number.MAX_SAFE_INTEGER);
  const partitioned = [
    ...getAfkOperationWindow(durations, elapsedMs, 0, 3),
    ...getAfkOperationWindow(durations, elapsedMs, 3, 5),
    ...getAfkOperationWindow(durations, elapsedMs, 8, complete.length),
  ];

  assert.deepEqual(partitioned, complete);
  assert.deepEqual(complete.slice(0, 6).map(({ runIndex, partyIndex }) => [runIndex, partyIndex]), [
    [0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2],
  ]);
});

test('adaptive batches start conservatively and remain within the requested budget', () => {
  assert.equal(getAdaptiveAfkOperationCount(100, null, 16), 1);
  assert.equal(getAdaptiveAfkOperationCount(100, 2, 10), 4);
  assert.equal(getAdaptiveAfkOperationCount(2, 0.1, 20), 2);
  assert.equal(getAfkBatchBudgetMs({ hardwareConcurrency: 8 }), 16);
  assert.equal(getAfkBatchBudgetMs({ hardwareConcurrency: 4 }), 10);
  assert.equal(getAfkBatchBudgetMs({ hardwareConcurrency: 8, saveData: true }), 6);
});

test('persisted mid-Chunk cursors are normalized without advancing their operation offset', () => {
  const cursor = normalizePersistedAfkChunkCursor({
    elapsedMs: 5_400_000,
    simulatedEndAt: 10_000_000,
    cycleDurationScale: 1,
    cycleDurationByParty: [450_000, 900_000],
    operationCount: 18,
    operationCursor: 7,
  }, 2);

  assert.ok(cursor);
  assert.equal(cursor.operationCursor, 7);
  assert.equal(cursor.operationCount, 18);
  assert.equal(normalizePersistedAfkChunkCursor({ operationCursor: 1 }, 2), null);
});

test('profiling aggregates batches in memory without per-Cycle output', () => {
  const initial = createAfkSchedulerProfile(100);
  const first = recordAfkSchedulerBatch(initial, 12, 4, 3);
  const second = recordAfkSchedulerBatch(first, 8, 5, 7);

  assert.equal(second.batches, 2);
  assert.equal(second.cyclePartyOperations, 9);
  assert.equal(second.totalBatchDurationMs, 20);
  assert.equal(second.longestBatchDurationMs, 12);
  assert.equal(second.longestEventLoopDelayMs, 7);
});

test('runtime slices the immutable logical Chunk plan and finalizes only its last batch', () => {
  assert.match(hookSource, /getAfkOperationWindow\([\s\S]*operationStart,[\s\S]*requestedOperationCount/);
  assert.match(hookSource, /if \(action\.finalizeChunk !== false \|\| operationEnd >= totalOperationCount\)/);
  assert.match(homeSource, /afkChunkCursorRef\.current = finalizeChunk[\s\S]*operationStart,[\s\S]*operationCount,[\s\S]*finalizeChunk/);
  assert.match(homeSource, /minimumCommitIntervalMs = document\.visibilityState === 'visible' \? 100 : 250/);
});
