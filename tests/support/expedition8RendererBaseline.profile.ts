import {
  getApproxAfkCycleDurationMs,
} from '../../src/game/afkScheduler.ts';
import {
  AFK_CHUNK_CYCLE_COUNT,
  commitAfkPartyChunk,
  compareAfkChunkResults,
  createAfkPartyChunkResult,
  createAfkPartyChunkWorkerState,
  getAfkWorkerPoolLimit,
  hydrateAfkPartyChunkResult,
  type AfkPartyChunkJob,
  type AfkPartyChunkResult,
  type AfkPartyChunkWorkerResult,
} from '../../src/game/afkChunkCoordinator.ts';
import { withBattleSeedSourceForTesting } from '../../src/game/battleSeedSource.ts';
import { withGameplayRandomSourceForTesting } from '../../src/game/gameplayRandom.ts';
import {
  PersistenceCoordinator,
  type PersistenceTelemetryEvent,
  type PersistedStateProfile,
} from '../../src/game/savePersistence.ts';
import { hydrateGameState, serializeGameState } from '../../src/game/saveCodec.ts';
import { decodePersistedState } from '../../src/game/storageCompression.ts';
import { simulateAfkPartyChunkForWorker } from '../../src/hooks/useGameState.ts';
import { setLanguage } from '../../src/i18n/index.ts';
import type { GameState } from '../../src/types.ts';

declare const __EXPEDITION_8_SAVE_FIXTURE__: string;
declare const __EXPEDITION_8_SAVE_SHA256__: string;
declare const __PROFILE_SAMPLE_COUNT__: number;
declare const __PROFILE_WARMUP_COUNT__: number;
declare const __AFK_WORKER_URL__: string;
declare const __PERSISTENCE_WORKER_URL__: string;

const STORAGE_KEY = 'bokemo-expedition-8-renderer-profile';
const DEV_CYCLE_DURATION_SCALE = 0.05;
const SIMULATED_END_AT = Date.UTC(2026, 7, 16);

interface Distribution {
  samples: number;
  p50: number;
  p95: number;
  maximum: number;
}

interface SaveSample {
  profile: PersistedStateProfile;
  eventLoopDelayMs: number;
  workerSubmissionMs: number;
  workerQueueLatencyMs: number;
  resultDeliveryMs: number;
}

interface AfkSample {
  workerExecutionMs: number;
  projectedParallelWorkerMs: number;
  workerAsyncWallMs: number;
  coordinatorCommitMs: number;
  longestSingleCoordinatorCommitMs: number;
}

interface RendererTraceInterval {
  name: string;
  durationMs: number;
  partyIndex?: number;
}

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
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

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function loadAndValidateFixture() {
  invariant(await sha256(__EXPEDITION_8_SAVE_FIXTURE__) === __EXPEDITION_8_SAVE_SHA256__, 'fixture SHA-256 mismatch');
  const envelope = JSON.parse(__EXPEDITION_8_SAVE_FIXTURE__) as {
    meta: { app: string; version: string; env: string; format: string };
    saveDataCompressed: string;
  };
  invariant(envelope.meta.app === 'Kemo-Expedition', 'fixture app mismatch');
  invariant(envelope.meta.version === 'v0.9.3', 'fixture version mismatch');
  invariant(envelope.meta.env === 'dev', 'fixture environment mismatch');
  invariant(envelope.meta.format === 'compressed-v1', 'fixture format mismatch');
  const state = hydrateGameState(JSON.parse(decodePersistedState(envelope.saveDataCompressed)) as GameState);
  const partyIds = state.parties.map((party) => party.id);
  const partyNames = state.parties.map((party) => party.name);
  const selectedDungeonIds = state.parties.map((party) => party.selectedDungeonId);
  const characterCounts = state.parties.map((party) => party.characters.length);
  invariant(state.buildNumber === 9, 'fixture build mismatch');
  invariant(JSON.stringify(partyIds) === JSON.stringify([1, 2, 3, 4, 5, 6]), 'fixture party IDs mismatch');
  invariant(JSON.stringify(partyNames) === JSON.stringify(['PT1', 'PT2', 'PT3', 'PT4', 'PT5', 'PT6']), 'fixture party names mismatch');
  invariant(selectedDungeonIds.every((value) => value === 8), 'fixture is not all Expedition 8');
  invariant(characterCounts.every((value) => value === 6), 'fixture character count mismatch');
  invariant(Object.keys(state.global.inventory).length === 2_308, 'fixture inventory identity mismatch');
  return {
    state,
    expectedEncodedPayload: envelope.saveDataCompressed,
    identity: {
      path: 'sample_savedata/ALL_Exp8_v0.9.3_dev_20260816.kemoz',
      sha256: __EXPEDITION_8_SAVE_SHA256__,
      appVersion: envelope.meta.version,
      environment: envelope.meta.env,
      format: envelope.meta.format,
      buildNumber: state.buildNumber,
      partyCount: state.parties.length,
      partyIds,
      partyNames,
      selectedDungeonIds,
      characterCounts,
      inventoryVariantCount: Object.keys(state.global.inventory).length,
    },
  };
}

function runDeterministicAfkWorkflow(
  baseState: GameState,
  trace: RendererTraceInterval[] = [],
  label = 'deterministic_afk',
): GameState {
  const results: AfkPartyChunkResult[] = baseState.parties.map((party, partyIndex) => {
    const partyStartedAt = performance.now();
    const cycleDurationMs = getApproxAfkCycleDurationMs(party, DEV_CYCLE_DURATION_SCALE);
    let seedCursor = 0n;
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
    const chunkResult = createAfkPartyChunkResult({
      jobId: `renderer-profile-${party.id}`,
      partyIndex,
      partyId: party.id,
      simulatedStartedAt: SIMULATED_END_AT - cycleDurationMs * AFK_CHUNK_CYCLE_COUNT,
      simulatedCompletedAt: SIMULATED_END_AT,
      cycleDurationMs,
      baseState: createAfkPartyChunkWorkerState(baseState, partyIndex),
      gameMode: 'm.kemo',
      cycleDurationScale: DEV_CYCLE_DURATION_SCALE,
    }, resultState, 0);
    trace.push({ name: `${label}_party_simulation_and_delta`, partyIndex, durationMs: performance.now() - partyStartedAt });
    return chunkResult;
  }).sort(compareAfkChunkResults);

  const commitStartedAt = performance.now();
  const committed = results.reduce((state, result) => commitAfkPartyChunk(state, result), baseState);
  trace.push({ name: `${label}_six_party_commit`, durationMs: performance.now() - commitStartedAt });
  return committed;
}

async function runAfkSample(baseState: GameState): Promise<AfkSample> {
  const jobs: AfkPartyChunkJob[] = baseState.parties.map((party, partyIndex) => {
    const cycleDurationMs = getApproxAfkCycleDurationMs(party, DEV_CYCLE_DURATION_SCALE);
    const job: AfkPartyChunkJob = {
      jobId: `renderer-worker-profile-${party.id}`,
      partyIndex,
      partyId: party.id,
      simulatedStartedAt: SIMULATED_END_AT - cycleDurationMs * AFK_CHUNK_CYCLE_COUNT,
      simulatedCompletedAt: SIMULATED_END_AT,
      cycleDurationMs,
      baseState,
      gameMode: 'm.kemo',
      cycleDurationScale: DEV_CYCLE_DURATION_SCALE,
      queuedAt: performance.now(),
    };
    job.inputTransferBytes = new TextEncoder().encode(JSON.stringify(job)).byteLength;
    return job;
  });
  const results: AfkPartyChunkResult[] = [];
  const workerLimit = getAfkWorkerPoolLimit(navigator.hardwareConcurrency, baseState.parties.length);
  let nextJobIndex = 0;
  const asyncStartedAt = performance.now();

  const runWorkerSlot = async () => {
    const workerCreatedAt = performance.now();
    const worker = new Worker(new URL(__AFK_WORKER_URL__, import.meta.url), { type: 'module' });
    let completedJobs = 0;
    try {
      while (nextJobIndex < jobs.length) {
        const job = jobs[nextJobIndex++]!;
        job.workerCreatedAt = workerCreatedAt;
        job.isFirstWorkerJob = completedJobs === 0;
        const result = await new Promise<AfkPartyChunkResult>((resolve, reject) => {
          worker.onmessage = (event: MessageEvent<
            | { type: 'started'; jobId: string; partyIndex: number }
            | { type: 'progress'; jobId: string; partyIndex: number; completedOperations: number; operationCount: number }
            | { type: 'complete'; result: AfkPartyChunkWorkerResult }
            | { type: 'error'; jobId: string; message: string }
          >) => {
            if (event.data.type === 'started' || event.data.type === 'progress') return;
            if (event.data.type === 'complete') {
              resolve(hydrateAfkPartyChunkResult(event.data.result, baseState.parties[event.data.result.partyIndex]));
            }
            else reject(new Error(`AFK worker ${event.data.jobId}: ${event.data.message}`));
          };
          worker.onerror = (event) => reject(new Error(event.message));
          worker.postMessage(job);
        });
        results.push(result);
        completedJobs += 1;
      }
    } finally {
      worker.terminate();
    }
  };
  await Promise.all(Array.from({ length: workerLimit }, () => runWorkerSlot()));
  const workerAsyncWallMs = performance.now() - asyncStartedAt;
  results.sort(compareAfkChunkResults);

  let state = baseState;
  const coordinatorDurations: number[] = [];
  for (const result of results) {
    const startedAt = performance.now();
    state = commitAfkPartyChunk(state, result);
    coordinatorDurations.push(performance.now() - startedAt);
  }
  return {
    workerExecutionMs: results.reduce((total, result) => total + result.workerTelemetry.executionMs, 0),
    projectedParallelWorkerMs: Math.max(...results.map((result) => result.workerTelemetry.executionMs)),
    workerAsyncWallMs,
    coordinatorCommitMs: coordinatorDurations.reduce((total, value) => total + value, 0),
    longestSingleCoordinatorCommitMs: Math.max(...coordinatorDurations),
  };
}

async function runSaveSample(
  state: GameState,
  coordinator: PersistenceCoordinator,
  telemetry: PersistenceTelemetryEvent[],
): Promise<SaveSample> {
  telemetry.splice(0);
  const timerScheduledAt = performance.now();
  let resolveTimer!: (delayMs: number) => void;
  const timer = new Promise<number>((resolve) => {
    resolveTimer = resolve;
  });
  setTimeout(() => resolveTimer(performance.now() - timerScheduledAt), 0);
  await coordinator.requestDurable(state);
  const persisted = localStorage.getItem(STORAGE_KEY);
  invariant(persisted, 'persistence worker did not write localStorage');
  const jsonPayload = JSON.stringify(serializeGameState(state));
  const duration = (event: PersistenceTelemetryEvent['event']) => telemetry.find((sample) => sample.event === event)?.durationMs ?? 0;
  const jsonUtf8Bytes = new TextEncoder().encode(jsonPayload).byteLength;
  const encodedUtf8Bytes = new TextEncoder().encode(persisted).byteLength;
  const profile: PersistedStateProfile = {
    phases: {
      canonicalSnapshotMs: duration('canonical_snapshot'),
      jsonStringifyMs: duration('json_serialization'),
      compressionEncodingMs: duration('worker_compression'),
      storageWriteMs: duration('storage_write'),
      endToEndMs: duration('durability_latency'),
    },
    sizes: {
      jsonChars: jsonPayload.length,
      jsonUtf8Bytes,
      jsonUtf16Bytes: jsonPayload.length * 2,
      encodedChars: persisted.length,
      encodedUtf8Bytes,
      encodedUtf16Bytes: persisted.length * 2,
      compressionRatio: persisted.length / jsonPayload.length,
    },
  };
  return {
    profile,
    eventLoopDelayMs: await timer,
    workerSubmissionMs: duration('worker_submission'),
    workerQueueLatencyMs: duration('worker_queue_latency'),
    resultDeliveryMs: duration('result_delivery'),
  };
}

async function runProfile() {
  setLanguage('ja');
  const { state, identity, expectedEncodedPayload } = await loadAndValidateFixture();
  localStorage.removeItem(STORAGE_KEY);
  const persistenceTelemetry: PersistenceTelemetryEvent[] = [];
  const persistenceCoordinator = new PersistenceCoordinator({
    storageKey: STORAGE_KEY,
    storage: localStorage,
    workerFactory: () => new Worker(new URL(__PERSISTENCE_WORKER_URL__, import.meta.url), { type: 'module' }),
    onTelemetry: (event) => persistenceTelemetry.push(event),
  });
  const warmupSaveSamples: SaveSample[] = [];
  const warmupAfkSamples: AfkSample[] = [];
  for (let index = 0; index < __PROFILE_WARMUP_COUNT__; index += 1) {
    warmupSaveSamples.push(await runSaveSample(state, persistenceCoordinator, persistenceTelemetry));
    warmupAfkSamples.push(await runAfkSample(state));
  }
  const saveSamples: SaveSample[] = [];
  const afkSamples: AfkSample[] = [];
  for (let index = 0; index < __PROFILE_SAMPLE_COUNT__; index += 1) {
    saveSamples.push(await runSaveSample(state, persistenceCoordinator, persistenceTelemetry));
    afkSamples.push(await runAfkSample(state));
  }

  // Run the synchronous correctness oracle after all measured work so its JIT,
  // allocation, and long-task behavior cannot contaminate save/AFK samples.
  const startupTrace: RendererTraceInterval[] = [];
  const observedLongTasks: Array<{ name: string; startTime: number; durationMs: number; attribution: string[] }> = [];
  const validationWindowStartedAt = performance.now();
  const LongTaskObserver = typeof PerformanceObserver === 'undefined' ? null : PerformanceObserver;
  const longTaskObserver = LongTaskObserver ? new LongTaskObserver((list) => {
    list.getEntries().forEach((entry) => {
      const attributed = entry as PerformanceEntry & { attribution?: Array<{ name?: string }> };
      observedLongTasks.push({
        name: entry.name,
        startTime: entry.startTime,
        durationMs: entry.duration,
        attribution: attributed.attribution?.map((value) => value.name ?? 'unknown') ?? [],
      });
    });
  }) : null;
  try { longTaskObserver?.observe({ type: 'longtask', buffered: true }); } catch { /* Unsupported runtime. */ }
  const validationTimerScheduledAt = performance.now();
  const validationTimer = new Promise<number>((resolve) => {
    setTimeout(() => resolve(performance.now() - validationTimerScheduledAt), 0);
  });
  const validationStartedAt = performance.now();
  const firstWorkflowStartedAt = performance.now();
  const deterministicFirstState = runDeterministicAfkWorkflow(state, startupTrace, 'deterministic_afk_first');
  startupTrace.push({ name: 'deterministic_afk_first_workflow', durationMs: performance.now() - firstWorkflowStartedAt });
  const firstSerializationStartedAt = performance.now();
  const deterministicFirst = JSON.stringify(serializeGameState(deterministicFirstState));
  startupTrace.push({ name: 'deterministic_afk_first_serialization', durationMs: performance.now() - firstSerializationStartedAt });
  const secondWorkflowStartedAt = performance.now();
  const deterministicSecondState = runDeterministicAfkWorkflow(state, startupTrace, 'deterministic_afk_second');
  startupTrace.push({ name: 'deterministic_afk_second_workflow', durationMs: performance.now() - secondWorkflowStartedAt });
  const secondSerializationStartedAt = performance.now();
  const deterministicSecond = JSON.stringify(serializeGameState(deterministicSecondState));
  startupTrace.push({ name: 'deterministic_afk_second_serialization', durationMs: performance.now() - secondSerializationStartedAt });
  const deterministicValidationMs = performance.now() - validationStartedAt;
  const validationWindowEndedAt = performance.now();
  startupTrace.push({ name: 'deterministic_afk_validation_total', durationMs: deterministicValidationMs });
  const deterministicValidationEventLoopDelayMs = await validationTimer;
  // Chromium publishes Long Tasks asynchronously after the blocked task ends.
  await new Promise((resolve) => setTimeout(resolve, 50));
  longTaskObserver?.takeRecords().forEach((entry) => {
    const attributed = entry as PerformanceEntry & { attribution?: Array<{ name?: string }> };
    observedLongTasks.push({ name: entry.name, startTime: entry.startTime, durationMs: entry.duration,
      attribution: attributed.attribution?.map((value) => value.name ?? 'unknown') ?? [] });
  });
  longTaskObserver?.disconnect();
  const longTasks = observedLongTasks.filter((entry) => (
    entry.startTime <= validationWindowEndedAt
    && entry.startTime + entry.durationMs >= validationWindowStartedAt
  ));
  invariant(deterministicSecond === deterministicFirst, 'seeded AFK result drift');

  const persisted = localStorage.getItem(STORAGE_KEY);
  invariant(persisted, 'localStorage payload missing');
  invariant(persisted === expectedEncodedPayload, 'persistence worker bytes differ from the retained synchronous codec fixture');
  invariant(
    JSON.stringify(JSON.parse(decodePersistedState(persisted))) === JSON.stringify(serializeGameState(state)),
    'canonical persisted-state round trip changed',
  );
  const phaseValues = (field: keyof PersistedStateProfile['phases']) => (
    saveSamples.map((sample) => sample.profile.phases[field])
  );
  const size = saveSamples[0]!.profile.sizes;
  invariant(saveSamples.every((sample) => JSON.stringify(sample.profile.sizes) === JSON.stringify(size)), 'payload sizes changed');
  const finalStateSha256 = await sha256(deterministicFirst);
  persistenceCoordinator.shutdown();
  localStorage.removeItem(STORAGE_KEY);

  return {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    fixture: identity,
    validation: {
      canonicalRoundTrip: true,
      byteIdenticalWorkerEncoding: true,
      deterministicAfkFinalState: true,
      deterministicAfkFinalStateSha256: finalStateSha256,
    },
    sampling: {
      warmups: __PROFILE_WARMUP_COUNT__,
      measuredSamples: __PROFILE_SAMPLE_COUNT__,
      percentileMethod: 'nearest-rank',
      warmup: warmupSaveSamples.map((sample, index) => ({
        index: index + 1,
        saveEndToEndMs: sample.profile.phases.endToEndMs,
        compressionEncodingMs: sample.profile.phases.compressionEncodingMs,
        afkWorkerExecutionMs: warmupAfkSamples[index]!.workerExecutionMs,
        afkWorkerAsyncWallMs: warmupAfkSamples[index]!.workerAsyncWallMs,
        coordinatorCommitMs: warmupAfkSamples[index]!.coordinatorCommitMs,
      })),
    },
    startupSequence: {
      position: 'after_measured_samples',
      deterministicValidationMs,
      eventLoopDelayMs: deterministicValidationEventLoopDelayMs,
      largestNamedRendererInterval: startupTrace.reduce((largest, interval) => (
        interval.durationMs > largest.durationMs ? interval : largest
      ), { name: 'none', durationMs: 0 }),
      intervals: startupTrace,
      browserLongTasks: longTasks,
    },
    environment: {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      logicalProcessors: navigator.hardwareConcurrency,
      deviceMemoryGiB: (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null,
      crossOriginIsolated,
      timingClock: 'renderer performance.now() monotonic high-resolution clock',
      persistence: 'Chromium localStorage.setItem in a hidden sandboxed Electron renderer',
    },
    payload: size,
    metricsMs: {
      canonicalSnapshot: distribution(phaseValues('canonicalSnapshotMs')),
      jsonStringify: distribution(phaseValues('jsonStringifyMs')),
      compressionEncoding: distribution(phaseValues('compressionEncodingMs')),
      rendererWorkerSubmission: distribution(saveSamples.map((sample) => sample.workerSubmissionMs)),
      workerQueueLatency: distribution(saveSamples.map((sample) => sample.workerQueueLatencyMs)),
      workerResultDelivery: distribution(saveSamples.map((sample) => sample.resultDeliveryMs)),
      persistenceWrite: distribution(phaseValues('storageWriteMs')),
      endToEndSave: distribution(phaseValues('endToEndMs')),
      eventLoopDelay: distribution(saveSamples.map((sample) => sample.eventLoopDelayMs)),
      afkWorkerExecutionSixPartyCpuSum: distribution(afkSamples.map((sample) => sample.workerExecutionMs)),
      afkWorkerExecutionProjectedParallel: distribution(afkSamples.map((sample) => sample.projectedParallelWorkerMs)),
      afkWorkerAsyncWall: distribution(afkSamples.map((sample) => sample.workerAsyncWallMs)),
      coordinatorCommitSixPartySum: distribution(afkSamples.map((sample) => sample.coordinatorCommitMs)),
      coordinatorCommitLongestSingle: distribution(afkSamples.map((sample) => sample.longestSingleCoordinatorCommitMs)),
    },
    limitations: [
      'AFK worker execution is reported from production worker telemetry; asynchronous wall time includes startup, structured-clone transfer, language readiness, and the production-sized worker pool.',
      'The projected parallel worker value is the slowest individual execution and excludes startup, transfer, queueing, and pool contention.',
      'Coordinator timing covers the pure canonical commit reducer and excludes React dispatch-to-visibility and automatic-equipment follow-up time.',
      'The event-loop delay is zero-delay timer drift around renderer preparation and worker submission; it is not a Long Tasks API entry.',
    ],
  };
}

declare global {
  interface Window {
    __BOKEMO_EXP8_PROFILE_PROMISE__?: Promise<unknown>;
  }
}

window.__BOKEMO_EXP8_PROFILE_PROMISE__ = runProfile();
