import type { AfkSchedulerProfile } from './afkScheduler.ts';
import { getEffectiveAfkElapsedMs } from './afkScheduler.ts';
import { afkRuntimeTrace, type AfkTraceDiagnosticExport, type AfkTraceEvent } from './afkRuntimeTrace.ts';
import { resetBattleSeedSourceForTesting } from './battleSeedSource.ts';
import { createEnvironmentStorageKey } from './environment.ts';
import { resetGameplayRandomForTesting } from './gameplayRandom.ts';
import { hydrateLogSegmentedSave } from './logSegmentedSave.ts';
import { hydrateGameState, serializeGameState } from './saveCodec.ts';
import { decodePersistedState } from './storageCompression.ts';
import type { GameState } from '../types';

const PROFILE_NOW_MS = Date.UTC(2026, 7, 30, 0, 0, 0);
const RAW_HOUR_OPTIONS = new Set([9, 24, 162]);
const MEMORY_SAMPLE_INTERVAL_MS = 50;
const SETTLE_DELAY_MS = 1_000;
const SAVE_STORAGE_KEY = 'kemo-expedition-save';
const RUNTIME_STORAGE_KEY = 'kemo-expedition-afk-runtime';
const AUTO_EQUIPMENT_STORAGE_KEY = 'kemo-expedition-auto-equipment';

type ProfileMode = 'timing' | 'memory';
export type AfkLiveProfileVariant = 'baseline' | 'candidate';

export interface AfkLiveProfileMemoryPoint {
  readonly label: 'initial' | 'completion' | 'settled';
  readonly sampledAtMs: number;
  readonly rendererHeapBytes: number | null;
  readonly applicationWorkingSetBytes: number | null;
  readonly rendererWorkingSetBytes: number | null;
  readonly processBreakdown: Readonly<DesktopProcessMemoryMetrics['processBreakdown']>;
}

export interface AfkLiveProfileResult {
  readonly schemaVersion: 2;
  readonly rawAbsenceHours: number;
  readonly effectiveAfkMs: number;
  readonly mode: ProfileMode;
  readonly variant: AfkLiveProfileVariant;
  readonly workerLimit: number | null;
  readonly wallMs: number;
  readonly heartbeatDelayMs: { p50: number; p95: number; maximum: number };
  readonly longTasks: readonly { startedAtMs: number; durationMs: number }[];
  readonly scheduler: AfkSchedulerProfile | null;
  readonly trace: AfkTraceDiagnosticExport;
  readonly attribution: {
    readonly exclusiveTimelineByPhaseMs: Readonly<Record<string, number>>;
    readonly jobConstructionMs: number;
    readonly workerSubmissionMs: number;
    readonly workerExecutionSumMs: number;
    readonly workerInputQueueMs: number;
    readonly workerInputHydrationMs: number;
    readonly workerLanguageReadyMs: number;
    readonly workerSimulationExecutionMs: number;
    readonly workerBattleCount: number;
    readonly workerBattleTotalMs: number;
    readonly workerBattlePreparationMs: number;
    readonly workerBattleInputWriteMs: number;
    readonly workerBattleNativeExecutionMs: number;
    readonly workerBattleBorrowedOutputValidationMs: number;
    readonly workerBattleOutputConsumeMs: number;
    readonly workerBattleInputBytes: number;
    readonly workerBattleOutputBytes: number;
    readonly workerBattleResultBagEntryAllocations: number;
    readonly hydrationMs: number;
    readonly fifoCommitWaitMs: number;
    readonly chunkCommitReactVisibilityMs: number;
    readonly autoEquipmentMs: number;
    readonly autoEquipmentReactVisibilityMs: number;
    readonly atomicTransactionReactVisibilityMs: number;
    readonly chunkReducerMs: number;
    readonly autoEquipmentReducerMs: number;
    readonly rendererTransactionBoundaryMs: number;
    readonly rendererTransactionBoundarySharePercent: number;
    readonly persistenceRendererMs: number;
    readonly checkpointMs: number;
    readonly recoveryFinalizationMs: number;
  };
  readonly react: {
    readonly commitCount: number;
    readonly totalRenderDurationMs: number;
    readonly p95CommitDurationMs: number;
    readonly longestCommitDurationMs: number;
  };
  readonly memory: {
    readonly points: readonly AfkLiveProfileMemoryPoint[];
    readonly peakApplicationWorkingSetBytes: number | null;
    readonly peakRendererWorkingSetBytes: number | null;
    readonly peakRendererHeapBytes: number | null;
  };
  readonly validation: {
    readonly finalStateSha256: string;
    readonly persistedStateSha256: string | null;
    readonly persistedStateSemanticallyIdentical: boolean;
    readonly finalComponentSha256: Readonly<Record<string, string>>;
    readonly persistedComponentSha256: Readonly<Record<string, string>> | null;
  };
}

interface CompletionInput {
  readonly getState: () => GameState;
  readonly flushSave: () => Promise<void>;
  readonly scheduler: AfkSchedulerProfile | null;
}

interface ProfileRuntime {
  rawAbsenceHours: number;
  effectiveAfkMs: number;
  mode: ProfileMode;
  variant: AfkLiveProfileVariant;
  workerLimit: number | null;
  observedRecovery: boolean;
  startedAt: number | null;
  completing: boolean;
  completed: boolean;
  heartbeatDelays: number[];
  longTasks: Array<{ startedAtMs: number; durationMs: number }>;
  memoryPoints: AfkLiveProfileMemoryPoint[];
  peakApplicationWorkingSetBytes: number | null;
  peakRendererWorkingSetBytes: number | null;
  peakRendererHeapBytes: number | null;
  heartbeatTimer: number | null;
  memoryTimer: number | null;
  longTaskObserver: PerformanceObserver | null;
  reactCommitDurations: number[];
  exclusiveTimelineByPhaseMs: Record<string, number>;
  sampledPhase: string | null;
  sampledPhaseAt: number | null;
  resolve: (result: AfkLiveProfileResult) => void;
  reject: (error: unknown) => void;
}

let runtime: ProfileRuntime | null = null;

function createSeededRandom(seed: number): () => number {
  let value = seed >>> 0 || 0x9e3779b9;
  return () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return (value >>> 0) / 0x1_0000_0000;
  };
}

function finiteMetric(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function maxMetric(previous: number | null, current: number | null): number | null {
  if (current === null) return previous;
  return previous === null ? current : Math.max(previous, current);
}

function nearestRank(values: readonly number[], ratio: number): number {
  if (values.length === 0) return 0;
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.max(0, Math.ceil(ordered.length * ratio) - 1)] ?? 0;
}

function sumEventDurations(trace: AfkTraceDiagnosticExport, eventName: string): number {
  return trace.aggregatesByEvent[eventName]?.totalDurationMs ?? 0;
}

function sumEventDataValue(trace: AfkTraceDiagnosticExport, eventName: string, key: string): number {
  return trace.events.reduce((total, event) => {
    const value = event.event === eventName ? event.data?.[key] : undefined;
    return total + (typeof value === 'number' && Number.isFinite(value) ? value : 0);
  }, 0);
}

function createExclusiveTimeline(events: readonly AfkTraceEvent[]): Readonly<Record<string, number>> {
  const startIndex = events.findIndex((event) => event.event === 'recovery_start');
  const endIndex = events.findIndex((event, index) => index >= Math.max(0, startIndex) && event.event === 'recovery_complete');
  if (startIndex < 0 || endIndex <= startIndex) return Object.freeze({});
  const totals: Record<string, number> = {};
  for (let index = startIndex; index < endIndex; index += 1) {
    const current = events[index]!;
    const next = events[index + 1]!;
    totals[current.phase] = (totals[current.phase] ?? 0) + Math.max(0, next.monotonicTime - current.monotonicTime);
  }
  return Object.freeze(totals);
}

function sampleExclusivePhase(now = performance.now()): void {
  if (!runtime) return;
  const snapshot = afkRuntimeTrace.getCurrentSnapshot();
  if (runtime.sampledPhase !== null && runtime.sampledPhaseAt !== null) {
    runtime.exclusiveTimelineByPhaseMs[runtime.sampledPhase] = (
      runtime.exclusiveTimelineByPhaseMs[runtime.sampledPhase] ?? 0
    ) + Math.max(0, now - runtime.sampledPhaseAt);
  }
  if (!snapshot.recoveryActive) {
    runtime.sampledPhase = null;
    runtime.sampledPhaseAt = null;
    return;
  }
  runtime.sampledPhase = snapshot.phase;
  runtime.sampledPhaseAt = now;
}

function canonicalizeHashValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalizeHashValue);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value as Record<string, unknown>)
      .sort()
      .flatMap((key) => {
        const next = canonicalizeHashValue((value as Record<string, unknown>)[key]);
        return next === undefined ? [] : [[key, next]];
      }),
  );
}

async function sha256(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(canonicalizeHashValue(value)));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function componentHashes(state: GameState): Promise<Readonly<Record<string, string>>> {
  const entries: Array<readonly [string, unknown]> = [
    ['global', state.global],
    ['bags', state.bags],
    ['shell', { scene: state.scene, selectedPartyIndex: state.selectedPartyIndex, buildNumber: state.buildNumber }],
    ...state.parties.map((party, index) => [`party-${index + 1}`, party] as const),
  ];
  return Object.freeze(Object.fromEntries(await Promise.all(entries.map(async ([key, value]) => [key, await sha256(value)]))));
}

function canonicalProfileState(state: GameState): GameState {
  const serialized = serializeGameState(state);
  return {
    ...serialized,
    buildNumber: 0,
    parties: serialized.parties.map((party) => ({
      ...party,
      hasUnreadDiary: party.diaryLogs.some((entry) => !entry.isRead),
    })),
  };
}

function readPersistedState(): GameState | null {
  const storageKey = createEnvironmentStorageKey(SAVE_STORAGE_KEY);
  const raw = localStorage.getItem(storageKey);
  if (!raw) return null;
  const segmented = hydrateLogSegmentedSave(raw, localStorage, storageKey);
  return hydrateGameState((segmented ?? JSON.parse(decodePersistedState(raw))) as GameState);
}

async function sampleMemory(label?: AfkLiveProfileMemoryPoint['label']): Promise<void> {
  if (!runtime || runtime.mode !== 'memory') return;
  const bridge = window.__BOKEMO_AFK_LIVE_PROFILE_MEMORY__;
  if (!bridge) return;
  const metrics = await bridge.sample();
  const heap = (performance as Performance & { memory?: { usedJSHeapSize?: number } }).memory;
  const rendererHeapBytes = finiteMetric(heap?.usedJSHeapSize);
  const applicationWorkingSetBytes = finiteMetric(metrics.applicationWorkingSetBytes);
  const rendererWorkingSetBytes = finiteMetric(metrics.rendererWorkingSetBytes);
  runtime.peakApplicationWorkingSetBytes = maxMetric(runtime.peakApplicationWorkingSetBytes, applicationWorkingSetBytes);
  runtime.peakRendererWorkingSetBytes = maxMetric(runtime.peakRendererWorkingSetBytes, rendererWorkingSetBytes);
  runtime.peakRendererHeapBytes = maxMetric(runtime.peakRendererHeapBytes, rendererHeapBytes);
  if (label) {
    runtime.memoryPoints.push(Object.freeze({
      label,
      sampledAtMs: performance.now(),
      rendererHeapBytes,
      applicationWorkingSetBytes,
      rendererWorkingSetBytes,
      processBreakdown: Object.freeze([...(metrics.processBreakdown ?? [])]),
    }));
  }
}

export function prepareAfkLiveProfile(): void {
  if (!__AFK_LIVE_PROFILE_ENABLED__ || typeof window === 'undefined' || runtime) return;
  const params = new URLSearchParams(window.location.search);
  const requestedHours = Number(params.get('afkProfileHours') ?? 162);
  const rawAbsenceHours = RAW_HOUR_OPTIONS.has(requestedHours) ? requestedHours : 162;
  const mode: ProfileMode = params.get('afkProfileMode') === 'memory' ? 'memory' : 'timing';
  const variant: AfkLiveProfileVariant = params.get('afkProfileVariant') === 'baseline' ? 'baseline' : 'candidate';
  const requestedWorkerLimit = Number(params.get('afkProfileWorkers'));
  const workerLimit = Number.isInteger(requestedWorkerLimit) && requestedWorkerLimit >= 1 && requestedWorkerLimit <= 6
    ? requestedWorkerLimit
    : null;
  const effectiveAfkMs = getEffectiveAfkElapsedMs(rawAbsenceHours * 60 * 60 * 1_000);
  const envelope = JSON.parse(__AFK_LIVE_PROFILE_FIXTURE__) as {
    meta?: { format?: string };
    saveDataCompressed?: string;
  };
  if (envelope.meta?.format !== 'compressed-v1' || typeof envelope.saveDataCompressed !== 'string') {
    throw new Error('Invalid AFK live profile fixture');
  }

  Date.now = () => PROFILE_NOW_MS;
  resetGameplayRandomForTesting(createSeededRandom(0xafc0_9503));
  let battleSeedCursor = 0n;
  resetBattleSeedSourceForTesting(() => 0xafc0_9503_0000_0000n | battleSeedCursor++);

  localStorage.clear();
  localStorage.setItem(createEnvironmentStorageKey(SAVE_STORAGE_KEY), envelope.saveDataCompressed);
  localStorage.setItem(createEnvironmentStorageKey(AUTO_EQUIPMENT_STORAGE_KEY), 'on');
  localStorage.setItem(createEnvironmentStorageKey(RUNTIME_STORAGE_KEY), JSON.stringify({
    schemaVersion: 1,
    checkpointAt: PROFILE_NOW_MS,
    autoRepeatEnabled: true,
    partyCycles: {},
    pendingAfkMs: effectiveAfkMs,
    afkRecoveryTotalMs: effectiveAfkMs,
    afkRecoveryCompletedMs: 0,
    afkSimulationAnchor: PROFILE_NOW_MS,
    afkSummaryBaseline: null,
    shouldShowAfkSummary: true,
    afkChunkCursor: null,
    afkRemainingMsByParty: Object.fromEntries(Array.from({ length: 6 }, (_, index) => [index, effectiveAfkMs])),
  }));

  let resolve!: (result: AfkLiveProfileResult) => void;
  let reject!: (error: unknown) => void;
  window.__BOKEMO_AFK_LIVE_PROFILE_RESULT__ = new Promise<AfkLiveProfileResult>((resolveResult, rejectResult) => {
    resolve = resolveResult;
    reject = rejectResult;
  });
  runtime = {
    rawAbsenceHours,
    effectiveAfkMs,
    mode,
    variant,
    workerLimit,
    observedRecovery: false,
    startedAt: null,
    completing: false,
    completed: false,
    heartbeatDelays: [],
    longTasks: [],
    memoryPoints: [],
    peakApplicationWorkingSetBytes: null,
    peakRendererWorkingSetBytes: null,
    peakRendererHeapBytes: null,
    heartbeatTimer: null,
    memoryTimer: null,
    longTaskObserver: null,
    reactCommitDurations: [],
    exclusiveTimelineByPhaseMs: {},
    sampledPhase: null,
    sampledPhaseAt: null,
    resolve,
    reject,
  };
  beginAfkLiveProfileMeasurement();
}

export function useAfkAtomicTransactionCandidate(): boolean {
  return true;
}

export function useAfkWorkerSimulationCandidate(): boolean {
  return true;
}

export function useAfkCompactBattleResultCandidate(): boolean {
  // The candidate remains profile-only because its faster workers increased
  // FIFO coordinator wait beyond the promotion gate.
  return __AFK_LIVE_PROFILE_ENABLED__ && runtime?.variant === 'candidate';
}

/** Returns a profile-only pool-width override; production always returns undefined. */
export function getAfkLiveProfileWorkerLimitOverride(): number | undefined {
  return __AFK_LIVE_PROFILE_ENABLED__ ? runtime?.workerLimit ?? undefined : undefined;
}

export function beginAfkLiveProfileMeasurement(): void {
  if (!runtime || runtime.startedAt !== null) return;
  runtime.startedAt = performance.now();
  let expectedHeartbeat = runtime.startedAt + 10;
  runtime.heartbeatTimer = window.setInterval(() => {
    if (!runtime) return;
    const now = performance.now();
    runtime.heartbeatDelays.push(Math.max(0, now - expectedHeartbeat));
    sampleExclusivePhase(now);
    expectedHeartbeat = now + 10;
  }, 10);
  if ('PerformanceObserver' in window && PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
    runtime.longTaskObserver = new PerformanceObserver((list) => {
      if (!runtime) return;
      list.getEntries().forEach((entry) => runtime!.longTasks.push({
        startedAtMs: entry.startTime,
        durationMs: entry.duration,
      }));
    });
    runtime.longTaskObserver.observe({ entryTypes: ['longtask'] });
  }
  if (runtime.mode === 'memory') {
    void sampleMemory('initial');
    let sampling = false;
    runtime.memoryTimer = window.setInterval(() => {
      if (sampling) return;
      sampling = true;
      void sampleMemory().finally(() => { sampling = false; });
    }, MEMORY_SAMPLE_INTERVAL_MS);
  }
}

export function recordAfkLiveProfileReactCommit(durationMs: number): void {
  if (!runtime || runtime.completed || runtime.startedAt === null) return;
  runtime.reactCommitDurations.push(Math.max(0, durationMs));
}

export function observeAfkLiveProfilePending(pendingAfkMs: number): void {
  if (runtime && pendingAfkMs > 0) runtime.observedRecovery = true;
}

export function canCompleteAfkLiveProfile(): boolean {
  return Boolean(runtime?.observedRecovery && !runtime.completing && !runtime.completed);
}

export async function completeAfkLiveProfile(input: CompletionInput): Promise<void> {
  if (!runtime || runtime.completing || runtime.completed || runtime.startedAt === null) return;
  runtime.completing = true;
  try {
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    await input.flushSave();
    await sampleMemory('completion');
    if (runtime.mode === 'memory') {
      await window.__BOKEMO_AFK_LIVE_PROFILE_MEMORY__?.forceGc();
      await new Promise((resolve) => window.setTimeout(resolve, SETTLE_DELAY_MS));
      await window.__BOKEMO_AFK_LIVE_PROFILE_MEMORY__?.forceGc();
      await sampleMemory('settled');
    }
    const completedAt = performance.now();
    sampleExclusivePhase(completedAt);
    if (runtime.heartbeatTimer !== null) window.clearInterval(runtime.heartbeatTimer);
    if (runtime.memoryTimer !== null) window.clearInterval(runtime.memoryTimer);
    runtime.longTaskObserver?.disconnect();

    const trace = afkRuntimeTrace.getDiagnosticExport();
    const events = trace.events;
    const chunkCommitReactVisibilityMs = sumEventDurations(trace, 'commit_react_visible');
    const autoEquipmentMs = sumEventDurations(trace, 'auto_equipment_complete');
    const autoEquipmentReactVisibilityMs = sumEventDurations(trace, 'auto_equipment_react_visible');
    const atomicTransactionReactVisibilityMs = sumEventDurations(trace, 'atomic_transaction_react_visible');
    const rendererTransactionBoundaryMs = atomicTransactionReactVisibilityMs > 0
      // The single-publication timer starts before reducer dispatch, so it
      // already contains Chunk merge, equipment planning/application, and the
      // one React visibility wait.
      ? atomicTransactionReactVisibilityMs
      : chunkCommitReactVisibilityMs + autoEquipmentMs + autoEquipmentReactVisibilityMs;
    const wallMs = Math.max(0, completedAt - runtime.startedAt);
    const finalState = canonicalProfileState(input.getState());
    const persistedState = readPersistedState();
    const finalStateSha256 = await sha256(finalState);
    const persistedStateSha256 = persistedState ? await sha256(canonicalProfileState(persistedState)) : null;
    const finalComponentSha256 = await componentHashes(finalState);
    const persistedComponentSha256 = persistedState
      ? await componentHashes(canonicalProfileState(persistedState))
      : null;
    const scheduler = input.scheduler;
    const heartbeatDelays = runtime.heartbeatDelays;
    const reactCommitDurations = runtime.reactCommitDurations;
    const result: AfkLiveProfileResult = Object.freeze({
      schemaVersion: 2,
      rawAbsenceHours: runtime.rawAbsenceHours,
      effectiveAfkMs: runtime.effectiveAfkMs,
      mode: runtime.mode,
      variant: runtime.variant,
      workerLimit: runtime.workerLimit,
      wallMs,
      heartbeatDelayMs: Object.freeze({
        p50: nearestRank(heartbeatDelays, 0.5),
        p95: nearestRank(heartbeatDelays, 0.95),
        maximum: Math.max(...heartbeatDelays, 0),
      }),
      longTasks: Object.freeze([...runtime.longTasks]),
      scheduler,
      trace,
      attribution: Object.freeze({
        exclusiveTimelineByPhaseMs: Object.keys(runtime.exclusiveTimelineByPhaseMs).length > 0
          ? Object.freeze({ ...runtime.exclusiveTimelineByPhaseMs })
          : createExclusiveTimeline(events),
        jobConstructionMs: sumEventDurations(trace, 'worker_job_construction'),
        workerSubmissionMs: sumEventDurations(trace, 'worker_job_submission'),
        workerExecutionSumMs: sumEventDurations(trace, 'worker_job_complete'),
        workerInputQueueMs: sumEventDurations(trace, 'worker_input_queue'),
        workerInputHydrationMs: sumEventDurations(trace, 'worker_input_hydration'),
        workerLanguageReadyMs: sumEventDurations(trace, 'worker_language_ready'),
        workerSimulationExecutionMs: sumEventDurations(trace, 'worker_simulation_execution'),
        workerBattleCount: sumEventDataValue(trace, 'worker_job_complete', 'battleCount'),
        workerBattleTotalMs: sumEventDurations(trace, 'worker_battle_total'),
        workerBattlePreparationMs: sumEventDurations(trace, 'worker_battle_preparation'),
        workerBattleInputWriteMs: sumEventDurations(trace, 'worker_battle_input_write'),
        workerBattleNativeExecutionMs: sumEventDurations(trace, 'worker_battle_native_execution'),
        workerBattleBorrowedOutputValidationMs: sumEventDurations(trace, 'worker_battle_borrowed_output_validation'),
        workerBattleOutputConsumeMs: sumEventDurations(trace, 'worker_battle_output_consume'),
        workerBattleInputBytes: sumEventDataValue(trace, 'worker_job_complete', 'battleInputBytes'),
        workerBattleOutputBytes: sumEventDataValue(trace, 'worker_job_complete', 'battleOutputBytes'),
        workerBattleResultBagEntryAllocations: sumEventDataValue(trace, 'worker_job_complete', 'battleResultBagEntryAllocations'),
        hydrationMs: sumEventDurations(trace, 'worker_result_hydration'),
        fifoCommitWaitMs: sumEventDurations(trace, 'fifo_commit_wait_end'),
        chunkCommitReactVisibilityMs,
        autoEquipmentMs,
        autoEquipmentReactVisibilityMs,
        atomicTransactionReactVisibilityMs,
        chunkReducerMs: sumEventDurations(trace, 'chunk_transaction_reducer'),
        autoEquipmentReducerMs: sumEventDurations(trace, 'auto_equipment_transaction_reducer'),
        rendererTransactionBoundaryMs,
        rendererTransactionBoundarySharePercent: wallMs > 0 ? rendererTransactionBoundaryMs / wallMs * 100 : 0,
        persistenceRendererMs: [
          'game_save_canonical_snapshot',
          'game_save_json_serialization',
          'game_save_worker_submission',
          'game_save_storage_write',
        ].reduce((total, eventName) => total + sumEventDurations(trace, eventName), 0),
        checkpointMs: sumEventDurations(trace, 'afk_checkpoint_complete'),
        recoveryFinalizationMs: sumEventDurations(trace, 'recovery_finalization_complete'),
      }),
      react: Object.freeze({
        commitCount: reactCommitDurations.length,
        totalRenderDurationMs: reactCommitDurations.reduce((total, durationMs) => total + durationMs, 0),
        p95CommitDurationMs: nearestRank(reactCommitDurations, 0.95),
        longestCommitDurationMs: Math.max(...reactCommitDurations, 0),
      }),
      memory: Object.freeze({
        points: Object.freeze([...runtime.memoryPoints]),
        peakApplicationWorkingSetBytes: runtime.peakApplicationWorkingSetBytes,
        peakRendererWorkingSetBytes: runtime.peakRendererWorkingSetBytes,
        peakRendererHeapBytes: runtime.peakRendererHeapBytes,
      }),
      validation: Object.freeze({
        finalStateSha256,
        persistedStateSha256,
        persistedStateSemanticallyIdentical: persistedStateSha256 === finalStateSha256,
        finalComponentSha256,
        persistedComponentSha256,
      }),
    });
    runtime.completed = true;
    runtime.resolve(result);
  } catch (error) {
    runtime.reject(error);
  }
}
