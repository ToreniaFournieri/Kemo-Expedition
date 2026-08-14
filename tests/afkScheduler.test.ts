import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  createAfkReplaySeed,
  createAfkSchedulerProfile,
  getAdaptiveAfkOperationCount,
  getAfkBatchBudgetMs,
  getAfkOperationWindow,
  normalizePersistedAfkChunkCursor,
  observeAfkRecoveryBacklog,
  recordAfkSchedulerBatch,
  shouldPauseOnlineProgressForAfk,
} from '../src/game/afkSchedulerCore.ts';

const hookSource = readFileSync(new URL('../src/hooks/useGameState.ts', import.meta.url), 'utf8');
const homeSource = readFileSync(new URL('../src/components/HomeScreen.tsx', import.meta.url), 'utf8');
const workerSource = readFileSync(new URL('../src/workers/afkSimulation.worker.ts', import.meta.url), 'utf8');
const workerSimulationSource = readFileSync(new URL('../src/game/afkWorkerSimulation.ts', import.meta.url), 'utf8');

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
    randomSeed: 123456,
    cycleDurationScale: 1,
    cycleDurationByParty: [450_000, 900_000],
    operationCount: 18,
    operationCursor: 7,
  }, 2);

  assert.ok(cursor);
  assert.equal(cursor.operationCursor, 7);
  assert.equal(cursor.operationCount, 18);
  assert.equal(cursor.randomSeed, 123456);
  assert.equal(normalizePersistedAfkChunkCursor({ operationCursor: 1 }, 2), null);
});

test('logical Chunk plans derive a replayable seed from their immutable boundary', () => {
  const first = createAfkReplaySeed(5_400_000, 10_000_000, 12);
  const replay = createAfkReplaySeed(5_400_000, 10_000_000, 12);
  assert.equal(first, replay);
  assert.notEqual(first, createAfkReplaySeed(5_400_000, 10_000_001, 12));
});

test('AFK reconstruction requires an observed positive backlog followed by zero', () => {
  const initialZero = observeAfkRecoveryBacklog(0, false);
  assert.deepEqual(initialZero, {
    hasObservedActiveRecovery: false,
    didCompleteRecovery: false,
  });

  const active = observeAfkRecoveryBacklog(5_400_000, initialZero.hasObservedActiveRecovery);
  assert.deepEqual(active, {
    hasObservedActiveRecovery: true,
    didCompleteRecovery: false,
  });

  const completed = observeAfkRecoveryBacklog(0, active.hasObservedActiveRecovery);
  assert.deepEqual(completed, {
    hasObservedActiveRecovery: false,
    didCompleteRecovery: true,
  });

  const settled = observeAfkRecoveryBacklog(0, completed.hasObservedActiveRecovery);
  assert.equal(settled.didCompleteRecovery, false);
});

test('online progression stays paused for every active AFK recovery boundary', () => {
  const unlocked = {
    isHydrating: false,
    pendingAfkMs: 0,
    hasChunkCursor: false,
    shouldRebuildAfterRecovery: false,
  };
  assert.equal(shouldPauseOnlineProgressForAfk(unlocked), false);
  assert.equal(shouldPauseOnlineProgressForAfk({ ...unlocked, isHydrating: true }), true);
  assert.equal(shouldPauseOnlineProgressForAfk({ ...unlocked, pendingAfkMs: 1 }), true);
  assert.equal(shouldPauseOnlineProgressForAfk({ ...unlocked, hasChunkCursor: true }), true);
  assert.equal(shouldPauseOnlineProgressForAfk({ ...unlocked, shouldRebuildAfterRecovery: true }), true);
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

test('runtime sends one immutable logical Chunk to the worker and commits one result', () => {
  assert.match(hookSource, /getAfkOperationWindow\([\s\S]*operationStart,[\s\S]*requestedOperationCount/);
  assert.match(hookSource, /if \(action\.finalizeChunk !== false \|\| operationEnd >= totalOperationCount\)/);
  assert.match(homeSource, /new Worker\(new URL\('\.\.\/workers\/afkSimulation\.worker\.ts'/);
  assert.match(homeSource, /operationCount: remainingOperations[\s\S]*runAfkWorkerChunk\(request\)/);
  assert.match(homeSource, /isMatchingAfkWorkerSuccess\(response, request\)[\s\S]*actions\.commitAfkChunk\(response\.state\)/);
  assert.doesNotMatch(homeSource, /minimumCommitIntervalMs/);
  assert.match(workerSource, /simulateAfkWorkerChunk\(request\)/);
  assert.match(workerSimulationSource, /Math\.random = createSeededRandom\(request\.randomSeed\)/);
  assert.match(workerSimulationSource, /operationCount: request\.operationCount[\s\S]*finalizeChunk:/);
});

test('AFK recovery pauses the next slice for live user input without cancelling the event', () => {
  assert.match(homeSource, /afkInteractionPausedRef\.current = true/);
  assert.match(homeSource, /afkWorkerBusyRef\.current[\s\S]*afkInteractionPausedRef\.current/);
  assert.match(homeSource, /setTimeout\(\(\) => \{\s*if \(afkInteractionPausedRef\.current\) return;/);
  assert.match(homeSource, /afkInteractionPausedRef\.current = false/);
  assert.match(homeSource, /if \(cancelled\)[\s\S]*setAfkWorkerSettledVersion/);
});

test('AFK-to-online reconstruction uses the emulated anchor for Diary timestamps', () => {
  assert.match(homeSource, /pendingAfkMsRef\.current > 0[\s\S]*!hasObservedActiveAfkRecoveryRef\.current/);
  assert.match(homeSource, /const emulatedNow = afkSimulationAnchorRef\.current \?\? runtimeNow/);
  assert.match(homeSource, /const simulatedExpeditionStartedAt = emulatedNow - exploreElapsedMs/);
  assert.match(homeSource, /simulatedAt: simulatedExpeditionStartedAt/);
  assert.match(homeSource, /stateStartedAt: runtimeExpeditionStartedAt/);
});

test('the online checkpoint timer cannot mutate gameplay during AFK recovery', () => {
  assert.match(homeSource, /if \(shouldPauseOnlineProgressForAfk\(\{[\s\S]*pendingAfkMs: pendingAfkMsRef\.current[\s\S]*shouldRebuildAfterRecovery: shouldRebuildPartyCyclesAfterAfkRef\.current[\s\S]*lastCheckpointAtRef\.current = now;[\s\S]*return;/);
});
