import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import {
  getEffectiveAfkElapsedMs,
  getApproxAfkCycleDurationMs,
} from '../../src/game/afkScheduler.ts';
import {
  AFK_CHUNK_CYCLE_COUNT,
  commitAfkPartyChunk,
  compareAfkChunkResults,
  type AfkPartyChunkResult,
} from '../../src/game/afkChunkCoordinator.ts';
import { hydrateGameState } from '../../src/game/saveCodec.ts';
import { decodePersistedState } from '../../src/game/storageCompression.ts';
import { simulateAfkPartyChunkForWorker } from '../../src/hooks/useGameState.ts';
import type { GameState } from '../../src/types.ts';

const SAMPLE_SAVE_PATH = resolve(
  process.cwd(),
  'sample_savedata/ALL_Exp8_v0.9.3_dev_20260816.kemoz',
);
const HOUR_MS = 60 * 60 * 1000;
const MAX_BATCH_DURATION_MS = 50;
const DEV_CYCLE_DURATION_SCALE = 0.05;
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
    const cyclePartyOperations = state.parties.reduce((total, party) => {
      const cycleDurationMs = getApproxAfkCycleDurationMs(party, DEV_CYCLE_DURATION_SCALE);
      return total + Math.floor(elapsedMs / (cycleDurationMs * AFK_CHUNK_CYCLE_COUNT)) * AFK_CHUNK_CYCLE_COUNT;
    }, 0);
    return { realHours, effectiveHours, cyclePartyOperations };
  });
}

test('Expedition 8 sample save covers every AFK efficiency duration period', () => {
  const state = loadSampleState();
  assert.equal(state.parties.length, 6);
  assert.deepEqual(state.parties.map((party) => party.selectedDungeonId), [8, 8, 8, 8, 8, 8]);
  console.info('AFK_DURATION_PERIOD_REPORT', JSON.stringify(getDurationPeriodReport(state)));
});

test('Expedition 8 sample save reports worker and coordinator duration compliance', () => {
  const baseState = loadSampleState();
  let state = baseState;
  const simulatedEndAt = Date.UTC(2026, 7, 16);
  const workerDurationsMs: number[] = [];
  const results: AfkPartyChunkResult[] = baseState.parties.map((party, partyIndex) => {
    const cycleDurationMs = getApproxAfkCycleDurationMs(party, DEV_CYCLE_DURATION_SCALE);
    const startedAt = performance.now();
    const resultState = simulateAfkPartyChunkForWorker(baseState, {
      partyIndex,
      cycleDurationMs,
      simulatedCompletedAt: simulatedEndAt,
      cycleDurationScale: DEV_CYCLE_DURATION_SCALE,
      gameMode: 'm.kemo',
    });
    const durationMs = performance.now() - startedAt;
    workerDurationsMs.push(durationMs);
    return {
      jobId: `profile-${party.id}`,
      partyIndex,
      partyId: party.id,
      simulatedCompletedAt: simulatedEndAt,
      cycleDurationMs,
      baseState,
      resultState,
      durationMs,
    };
  }).sort(compareAfkChunkResults);

  const coordinatorDurationsMs: number[] = [];
  results.forEach((result) => {
    const startedAt = performance.now();
    state = commitAfkPartyChunk(state, result);
    coordinatorDurationsMs.push(performance.now() - startedAt);
  });

  const report = {
    parties: state.parties.length,
    cyclesPerWorkerChunk: AFK_CHUNK_CYCLE_COUNT,
    totalWorkerDurationMs: workerDurationsMs.reduce((total, duration) => total + duration, 0),
    projectedParallelWorkerDurationMs: Math.max(...workerDurationsMs),
    p95CoordinatorCommitDurationMs: percentile(coordinatorDurationsMs, 0.95),
    longestCoordinatorCommitDurationMs: Math.max(...coordinatorDurationsMs),
    coordinatorWithin50msCeiling: Math.max(...coordinatorDurationsMs) < MAX_BATCH_DURATION_MS,
  };
  console.info('AFK_WORKER_COORDINATOR_DURATION_REPORT', JSON.stringify(report));

  assert.ok(Number.isFinite(report.longestCoordinatorCommitDurationMs));
  assert.equal(report.coordinatorWithin50msCeiling, true);
});
