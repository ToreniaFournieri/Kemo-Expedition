import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import {
  createAfkChunkPlan,
  getAdaptiveAfkOperationCount,
  getEffectiveAfkElapsedMs,
} from '../../src/game/afkScheduler.ts';
import { BASE_STEP_DURATION_MS } from '../../src/game/progressTiming.ts';
import { hydrateGameState } from '../../src/game/saveCodec.ts';
import { decodePersistedState } from '../../src/game/storageCompression.ts';
import { simulateAfkBatchForTesting } from '../../src/hooks/useGameState.ts';
import type { GameState } from '../../src/types.ts';

const SAMPLE_SAVE_PATH = resolve(
  process.cwd(),
  'sample_savedata/ALL_Exp8_v0.9.3_dev_20260816.kemoz',
);
const HOUR_MS = 60 * 60 * 1000;
const DESKTOP_BATCH_BUDGET_MS = 16;
const MAX_BATCH_DURATION_MS = 50;
const DEV_CYCLE_DURATION_SCALE = 0.05;
const APPROX_CYCLE_STEP_COUNT = 30;
const CHUNK_CYCLE_COUNT = 12;
const VISIBLE_COMMIT_INTERVAL_MS = 100;
const HIDDEN_COMMIT_INTERVAL_MS = 250;
const AFK_PERIODS = [
  [9, 9],
  [18, 15],
  [30, 21],
  [48, 27],
  [72, 33],
  [108, 39],
  [162, 45],
] as const;

type SaveEnvelope = {
  saveDataCompressed: string;
};

function loadSampleState(): GameState {
  const envelope = JSON.parse(readFileSync(SAMPLE_SAVE_PATH, 'utf8')) as SaveEnvelope;
  return hydrateGameState(
    JSON.parse(decodePersistedState(envelope.saveDataCompressed)) as GameState,
  );
}

function percentile(values: number[], ratio: number): number {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.min(ordered.length - 1, Math.floor(ordered.length * ratio))] ?? 0;
}

function getDurationPeriodReport(state: GameState) {
  return AFK_PERIODS.map(([realHours, effectiveHours]) => {
    const elapsedMs = getEffectiveAfkElapsedMs(realHours * HOUR_MS);
    assert.equal(elapsedMs, effectiveHours * HOUR_MS);
    const plan = createAfkChunkPlan(
      state.parties,
      elapsedMs,
      Date.UTC(2026, 7, 16),
      DEV_CYCLE_DURATION_SCALE,
    );
    return { realHours, effectiveHours, cyclePartyOperations: plan.operationCount };
  });
}

test('Expedition 8 sample save covers every AFK efficiency duration period', () => {
  const state = loadSampleState();
  assert.equal(state.parties.length, 6);
  assert.deepEqual(state.parties.map((party) => party.selectedDungeonId), [8, 8, 8, 8, 8, 8]);
  console.info('AFK_DURATION_PERIOD_REPORT', JSON.stringify(getDurationPeriodReport(state)));
});

test('Expedition 8 sample save reports AFK reducer batch duration and compliance', () => {
  let state = loadSampleState();
  const chunkElapsedMs = BASE_STEP_DURATION_MS
    * APPROX_CYCLE_STEP_COUNT
    * CHUNK_CYCLE_COUNT
    * DEV_CYCLE_DURATION_SCALE;
  const simulatedEndAt = Date.UTC(2026, 7, 16);
  const plan = createAfkChunkPlan(
    state.parties,
    chunkElapsedMs,
    simulatedEndAt,
    DEV_CYCLE_DURATION_SCALE,
  );
  assert.ok(plan.operationCount > 0);

  let operationCursor = 0;
  let averageOperationDurationMs: number | null = null;
  const batchDurationsMs: number[] = [];
  const batchOperationCounts: number[] = [];

  while (operationCursor < plan.operationCount) {
    const remainingOperations = plan.operationCount - operationCursor;
    const operationCount = getAdaptiveAfkOperationCount(
      remainingOperations,
      averageOperationDurationMs,
      DESKTOP_BATCH_BUDGET_MS,
    );
    const startedAt = performance.now();
    state = simulateAfkBatchForTesting(state, {
      elapsedMs: plan.elapsedMs,
      isAutoRepeatEnabled: true,
      gameMode: 'm.kemo',
      simulatedEndAt,
      cycleDurationScale: plan.cycleDurationScale,
      cycleDurationByParty: plan.cycleDurationByParty,
      operationStart: operationCursor,
      operationCount,
      finalizeChunk: operationCursor + operationCount >= plan.operationCount,
    });
    const durationMs = performance.now() - startedAt;
    const durationPerOperationMs = durationMs / operationCount;
    averageOperationDurationMs = averageOperationDurationMs === null
      ? durationPerOperationMs
      : (averageOperationDurationMs * 0.7) + (durationPerOperationMs * 0.3);
    batchDurationsMs.push(durationMs);
    batchOperationCounts.push(operationCount);
    operationCursor += operationCount;
  }

  const totalDurationMs = batchDurationsMs.reduce((total, duration) => total + duration, 0);
  const report = {
    effectiveChunkMinutes: chunkElapsedMs / 60_000,
    parties: state.parties.length,
    cyclePartyOperations: plan.operationCount,
    batches: batchDurationsMs.length,
    minimumOperationsPerBatch: Math.min(...batchOperationCounts),
    maximumOperationsPerBatch: Math.max(...batchOperationCounts),
    totalDurationMs,
    averageBatchDurationMs: totalDurationMs / batchDurationsMs.length,
    p95BatchDurationMs: percentile(batchDurationsMs, 0.95),
    longestBatchDurationMs: Math.max(...batchDurationsMs),
    within50msCeiling: Math.max(...batchDurationsMs) < MAX_BATCH_DURATION_MS,
  };
  console.info('AFK_BATCH_DURATION_REPORT', JSON.stringify(report));
  console.info('AFK_PROJECTED_REDUCER_DURATION_REPORT', JSON.stringify(
    getDurationPeriodReport(loadSampleState()).map((period) => ({
      ...period,
      projectedReducerDurationMs:
        period.cyclePartyOperations * (totalDurationMs / plan.operationCount),
      projectedVisibleSchedulerDurationMs:
        period.cyclePartyOperations * VISIBLE_COMMIT_INTERVAL_MS,
      projectedHiddenSchedulerDurationMs:
        period.cyclePartyOperations * HIDDEN_COMMIT_INTERVAL_MS,
    })),
  ));

  assert.equal(operationCursor, plan.operationCount);
  assert.ok(Number.isFinite(report.longestBatchDurationMs));
});
