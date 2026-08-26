import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { cpus, tmpdir, totalmem } from 'node:os';
import { join } from 'node:path';
import { getApproxAfkCycleDurationMs } from '../../src/game/afkScheduler.ts';
import {
  AFK_CHUNK_CYCLE_COUNT,
  commitAfkPartyChunk,
  compareAfkChunkResults,
  createAfkPartyChunkResult,
  type AfkPartyChunkResult,
} from '../../src/game/afkChunkCoordinator.ts';
import { withBattleSeedSourceForTesting } from '../../src/game/battleSeedSource.ts';
import { withGameplayRandomSourceForTesting } from '../../src/game/gameplayRandom.ts';
import {
  persistGameState,
  type PersistedStateProfile,
  type PersistedStateStorage,
} from '../../src/game/savePersistence.ts';
import { serializeGameState } from '../../src/game/saveCodec.ts';
import { decodePersistedState } from '../../src/game/storageCompression.ts';
import { simulateAfkPartyChunkForWorker } from '../../src/hooks/useGameState.ts';
import { setLanguage } from '../../src/i18n/index.ts';
import type { GameState } from '../../src/types.ts';
import { loadAndValidateExpedition8Fixture } from './expedition8SaveFixture.ts';

const DEV_CYCLE_DURATION_SCALE = 0.05;
const SIMULATED_END_AT = Date.UTC(2026, 7, 16);
const DEFAULT_SAMPLE_COUNT = 7;
const DEFAULT_WARMUP_COUNT = 1;

interface Distribution {
  samples: number;
  p50: number;
  p95: number;
  maximum: number;
}

interface SaveSample {
  profile: PersistedStateProfile;
  eventLoopDelayMs: number;
}

interface AfkSample {
  workerExecutionMs: number;
  projectedParallelWorkerMs: number;
  coordinatorCommitMs: number;
  longestSingleCoordinatorCommitMs: number;
  finalStateHash: string;
}

function parsePositiveInteger(name: string, fallback: number): number {
  const prefix = `--${name}=`;
  const raw = process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) throw new Error(`${name} must be a positive integer`);
  return value;
}

function nearestRank(values: number[], ratio: number): number {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.max(0, Math.ceil(ordered.length * ratio) - 1)] ?? 0;
}

function distribution(values: number[]): Distribution {
  return {
    samples: values.length,
    p50: nearestRank(values, 0.5),
    p95: nearestRank(values, 0.95),
    maximum: Math.max(...values),
  };
}

function createSeededRandom(seed: number): () => number {
  let value = seed >>> 0 || 0x9e3779b9;
  return () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return (value >>> 0) / 0x1_0000_0000;
  };
}

function hashCanonicalState(state: GameState): string {
  return createHash('sha256')
    .update(JSON.stringify(serializeGameState(state)))
    .digest('hex');
}

function runAfkSample(baseState: GameState): AfkSample {
  const workerDurations: number[] = [];
  const results: AfkPartyChunkResult[] = baseState.parties.map((party, partyIndex) => {
    const cycleDurationMs = getApproxAfkCycleDurationMs(party, DEV_CYCLE_DURATION_SCALE);
    let seedCursor = 0n;
    const startedAt = performance.now();
    const resultState = withBattleSeedSourceForTesting(
      () => (BigInt(0xaf000000 + partyIndex) << 32n) | seedCursor++,
      () => withGameplayRandomSourceForTesting(
        createSeededRandom(0xaf000000 + partyIndex),
        () => simulateAfkPartyChunkForWorker(baseState, {
          partyIndex,
          cycleDurationMs,
          simulatedCompletedAt: SIMULATED_END_AT,
          cycleDurationScale: DEV_CYCLE_DURATION_SCALE,
          gameMode: 'm.kemo',
        }),
      ),
    );
    const durationMs = performance.now() - startedAt;
    workerDurations.push(durationMs);
    return createAfkPartyChunkResult({
      jobId: `profile-${party.id}`,
      partyIndex,
      partyId: party.id,
      simulatedStartedAt: SIMULATED_END_AT - cycleDurationMs * AFK_CHUNK_CYCLE_COUNT,
      simulatedCompletedAt: SIMULATED_END_AT,
      cycleDurationMs,
      baseState,
      gameMode: 'm.kemo',
      cycleDurationScale: DEV_CYCLE_DURATION_SCALE,
    }, resultState, durationMs);
  }).sort(compareAfkChunkResults);

  let state = baseState;
  const coordinatorDurations: number[] = [];
  for (const result of results) {
    const startedAt = performance.now();
    state = commitAfkPartyChunk(state, result);
    coordinatorDurations.push(performance.now() - startedAt);
  }

  return {
    workerExecutionMs: workerDurations.reduce((total, value) => total + value, 0),
    projectedParallelWorkerMs: Math.max(...workerDurations),
    coordinatorCommitMs: coordinatorDurations.reduce((total, value) => total + value, 0),
    longestSingleCoordinatorCommitMs: Math.max(...coordinatorDurations),
    finalStateHash: hashCanonicalState(state),
  };
}

async function runSaveSample(state: GameState, storage: PersistedStateStorage): Promise<SaveSample> {
  const timerScheduledAt = performance.now();
  let resolveTimer!: (delayMs: number) => void;
  const timer = new Promise<number>((resolve) => {
    resolveTimer = resolve;
  });
  setTimeout(() => resolveTimer(performance.now() - timerScheduledAt), 0);
  const profile = persistGameState(state, 'bokemo-exp8-profile', storage, {
    now: () => performance.now(),
    includeUtf8Sizes: true,
  });
  assert.ok(profile);
  const eventLoopDelayMs = await timer;
  return { profile, eventLoopDelayMs };
}

function getEnvironment() {
  const processorList = cpus();
  return {
    platform: process.platform,
    architecture: process.arch,
    node: process.version,
    cpuModel: processorList[0]?.model ?? 'unknown',
    logicalProcessors: processorList.length,
    totalMemoryBytes: totalmem(),
    timingClock: 'performance.now() monotonic high-resolution clock',
    storageAdapter: 'synchronous UTF-8 temporary-file overwrite; no fsync',
  };
}

setLanguage('ja');
const sampleCount = parsePositiveInteger('samples', DEFAULT_SAMPLE_COUNT);
const warmupCount = parsePositiveInteger('warmups', DEFAULT_WARMUP_COUNT);
const { state, identity } = loadAndValidateExpedition8Fixture();
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'bokemo-exp8-save-profile-'));
const storagePath = join(temporaryDirectory, 'persisted-state.txt');
const storage: PersistedStateStorage = {
  setItem: (_key, value) => writeFileSync(storagePath, value, 'utf8'),
};

try {
  const warmupSaveSamples: SaveSample[] = [];
  const warmupAfkSamples: AfkSample[] = [];
  for (let index = 0; index < warmupCount; index += 1) {
    warmupSaveSamples.push(await runSaveSample(state, storage));
    warmupAfkSamples.push(runAfkSample(state));
  }

  const saveSamples: SaveSample[] = [];
  const afkSamples: AfkSample[] = [];
  for (let index = 0; index < sampleCount; index += 1) {
    console.error(`Expedition 8 profile sample ${index + 1}/${sampleCount}`);
    saveSamples.push(await runSaveSample(state, storage));
    afkSamples.push(runAfkSample(state));
  }

  assert.equal(new Set(afkSamples.map((sample) => sample.finalStateHash)).size, 1);
  const finalPayload = readFileSync(storagePath, 'utf8');
  assert.deepEqual(
    JSON.parse(decodePersistedState(finalPayload)),
    serializeGameState(state),
    'profiled persistence must round-trip the canonical snapshot',
  );

  const phaseValues = (field: keyof PersistedStateProfile['phases']) => (
    saveSamples.map((sample) => sample.profile.phases[field])
  );
  const size = saveSamples[0]!.profile.sizes;
  assert.ok(saveSamples.every((sample) => JSON.stringify(sample.profile.sizes) === JSON.stringify(size)));

  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    fixture: identity,
    validation: {
      canonicalRoundTrip: true,
      deterministicAfkFinalState: true,
      deterministicAfkFinalStateSha256: afkSamples[0]!.finalStateHash,
    },
    sampling: {
      warmups: warmupCount,
      measuredSamples: sampleCount,
      percentileMethod: 'nearest-rank',
      warmup: warmupSaveSamples.map((sample, index) => ({
        index: index + 1,
        saveEndToEndMs: sample.profile.phases.endToEndMs,
        compressionEncodingMs: sample.profile.phases.compressionEncodingMs,
        afkWorkerExecutionMs: warmupAfkSamples[index]!.workerExecutionMs,
        coordinatorCommitMs: warmupAfkSamples[index]!.coordinatorCommitMs,
      })),
    },
    environment: getEnvironment(),
    payload: size,
    metricsMs: {
      canonicalSnapshot: distribution(phaseValues('canonicalSnapshotMs')),
      jsonStringify: distribution(phaseValues('jsonStringifyMs')),
      compressionEncoding: distribution(phaseValues('compressionEncodingMs')),
      persistenceWrite: distribution(phaseValues('storageWriteMs')),
      endToEndSave: distribution(phaseValues('endToEndMs')),
      eventLoopDelay: distribution(saveSamples.map((sample) => sample.eventLoopDelayMs)),
      afkWorkerExecutionSixPartyCpuSum: distribution(afkSamples.map((sample) => sample.workerExecutionMs)),
      afkWorkerExecutionProjectedParallel: distribution(afkSamples.map((sample) => sample.projectedParallelWorkerMs)),
      coordinatorCommitSixPartySum: distribution(afkSamples.map((sample) => sample.coordinatorCommitMs)),
      coordinatorCommitLongestSingle: distribution(afkSamples.map((sample) => sample.longestSingleCoordinatorCommitMs)),
    },
    limitations: [
      'The persistence-write sample uses a synchronous temporary-file adapter, not Chromium localStorage.',
      'AFK worker execution calls the production worker computation directly in one Node realm; it reports CPU time and a max-per-party parallel projection, not browser Worker startup, transfer, contention, or wall time.',
      'Coordinator timing covers the pure canonical commit reducer and excludes React dispatch-to-visibility and automatic-equipment follow-up time.',
      'The event-loop delay is measured around each synchronous save in Node and is a renderer-blocking proxy, not a browser Long Tasks API entry.',
    ],
  };
  console.log(JSON.stringify(report, null, 2));
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
