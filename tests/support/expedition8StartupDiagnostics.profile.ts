import { getApproxAfkCycleDurationMs } from '../../src/game/afkScheduler.ts';
import {
  AFK_CHUNK_CYCLE_COUNT,
  compareAfkChunkResults,
  commitAfkPartyChunk,
  createAfkPartyChunkWorkerState,
  getAfkWorkerPoolLimit,
  hydrateAfkPartyChunkResult,
  type AfkPartyChunkJob,
  type AfkPartyChunkResult,
  type AfkPartyChunkWorkerResult,
} from '../../src/game/afkChunkCoordinator.ts';
import { hydrateGameState, serializeGameState } from '../../src/game/saveCodec.ts';
import { decodePersistedState } from '../../src/game/storageCompression.ts';
import type { GameState } from '../../src/types.ts';

declare const __EXPEDITION_8_SAVE_FIXTURE__: string;
declare const __DIAGNOSTIC_WORKER_URL__: string;
declare const __DIAGNOSTIC_SAMPLE_COUNT__: number;
declare const __DIAGNOSTIC_WARMUP_COUNT__: number;

const SCALE = 0.05;
const SIMULATED_END_AT = Date.UTC(2026, 7, 16);
const HEARTBEAT_MS = 10;
const EXPECTED_SIX_PARTY_SHA256 = 'bbc124165873d61ed01670c556510b89cccae8f03dc808aae54233cb5847b544';
const EXPECTED_ONE_PARTY_SHA256 = 'b69c4cd44b86e998f684d88f29efa7a7bca22610781a95682e0ab0f5728e339c';
const epochNow = () => performance.timeOrigin + performance.now();

interface Distribution { samples: number; p50: number; p95: number; maximum: number }
interface WorkerSlot { worker: Worker; constructedAt: number; constructionCallMs: number; readyAt: number; readyLatencyMs: number }
interface JobTrace {
  correlationId: string;
  payloadConstructionMs: number;
  exactSizingMs: number;
  jsonChars: number;
  jsonUtf16Bytes: number;
  postMessageMs: number;
  handlerLatencyMs: number;
  workerComputeMs: number;
  resultPostMs: number;
  resultDeliveryMs: number;
}
interface Sample {
  eventLoopDelayMs: number;
  largestNamedRendererInterval: { name: string; durationMs: number };
  workerConstructionMs: number;
  workerReadyLatencyMs: number;
  prewarmMs: number;
  payloadConstructionMs: number;
  exactSizingMs: number;
  postMessageMs: number;
  handlerLatencyMs: number;
  workerComputeMs: number;
  resultPostMs: number;
  resultDeliveryMs: number;
  coordinatorCommitMs: number;
  wallMs: number;
  peakHeapBytes: number | null;
  jobTraces: JobTrace[];
  deterministicHash: string | null;
}
interface Variant {
  name: string;
  jobs: number;
  concurrency: number;
  payload: 'full' | 'compact' | 'small';
  work: 'simulate' | 'noop';
  resultContract?: 'complete' | 'production';
  exactSizing: boolean;
  prewarm: boolean;
  createOnly?: boolean;
}

function nearestRank(values: number[], ratio: number): number {
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.max(0, Math.ceil(ordered.length * ratio) - 1)] ?? 0;
}
function distribution(values: number[]): Distribution {
  return { samples: values.length, p50: nearestRank(values, 0.5), p95: nearestRank(values, 0.95), maximum: Math.max(...values, 0) };
}
function heapBytes(): number | null {
  return (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? null;
}
async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
function createJob(state: GameState, partyIndex: number, correlationId: string): AfkPartyChunkJob {
  const party = state.parties[partyIndex]!;
  const cycleDurationMs = getApproxAfkCycleDurationMs(party, SCALE);
  return {
    jobId: correlationId,
    partyIndex,
    partyId: party.id,
    simulatedStartedAt: SIMULATED_END_AT - cycleDurationMs * AFK_CHUNK_CYCLE_COUNT,
    simulatedCompletedAt: SIMULATED_END_AT,
    cycleDurationMs,
    baseState: state,
    gameMode: 'm.kemo',
    cycleDurationScale: SCALE,
  };
}

async function constructWorker(): Promise<WorkerSlot> {
  const constructedAt = epochNow();
  const worker = new Worker(new URL(__DIAGNOSTIC_WORKER_URL__, import.meta.url), { type: 'module' });
  const constructionEndedAt = epochNow();
  const readyAt = await new Promise<number>((resolve, reject) => {
    worker.onmessage = (event) => {
      if (event.data.type === 'ready') resolve(epochNow());
    };
    worker.onerror = (event) => reject(new Error(event.message));
  });
  return { worker, constructedAt, constructionCallMs: constructionEndedAt - constructedAt,
    readyAt, readyLatencyMs: readyAt - constructionEndedAt };
}

async function runSample(state: GameState, variant: Variant, sampleIndex: number): Promise<Sample> {
  let maxHeartbeatDelay = 0;
  let expectedHeartbeat = performance.now() + HEARTBEAT_MS;
  const heartbeat = setInterval(() => {
    const now = performance.now();
    maxHeartbeatDelay = Math.max(maxHeartbeatDelay, now - expectedHeartbeat);
    expectedHeartbeat = now + HEARTBEAT_MS;
  }, HEARTBEAT_MS);
  const intervals: Array<{ name: string; durationMs: number }> = [];
  let sampleStartedAt = performance.now();
  let peakHeap = heapBytes();
  const slots: WorkerSlot[] = [];
  for (let index = 0; index < variant.concurrency; index += 1) {
    const slot = await constructWorker();
    slots.push(slot);
    intervals.push({ name: `worker_construction_call:${index}`, durationMs: slot.constructionCallMs });
  }
  peakHeap = Math.max(peakHeap ?? 0, heapBytes() ?? 0) || null;
  let prewarmMs = 0;
  if (variant.prewarm && !variant.createOnly) {
    const prewarmStartedAt = performance.now();
    await Promise.all(slots.map((slot, index) => runOnSlot(slot, {
      correlationId: `prewarm-${sampleIndex}-${index}`,
      mode: 'simulate',
      payload: createJob(state, index % state.parties.length, `prewarm-${sampleIndex}-${index}`),
    }, false)));
    prewarmMs = performance.now() - prewarmStartedAt;
    maxHeartbeatDelay = 0;
    expectedHeartbeat = performance.now() + HEARTBEAT_MS;
    sampleStartedAt = performance.now();
  }
  if (variant.createOnly) {
    slots.forEach((slot) => slot.worker.terminate());
    clearInterval(heartbeat);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const constructionMs = slots.reduce((sum, slot) => sum + slot.constructionCallMs, 0);
    return {
      eventLoopDelayMs: maxHeartbeatDelay,
      largestNamedRendererInterval: intervals.reduce((best, current) => current.durationMs > best.durationMs ? current : best,
        { name: 'none', durationMs: 0 }),
      workerConstructionMs: constructionMs,
      workerReadyLatencyMs: Math.max(...slots.map((slot) => slot.readyLatencyMs), 0), prewarmMs,
      payloadConstructionMs: 0, exactSizingMs: 0, postMessageMs: 0, handlerLatencyMs: 0,
      workerComputeMs: 0, resultPostMs: 0, resultDeliveryMs: 0, coordinatorCommitMs: 0,
      wallMs: performance.now() - sampleStartedAt, peakHeapBytes: peakHeap, jobTraces: [], deterministicHash: null,
    };
  }

  const traces: JobTrace[] = [];
  const results: AfkPartyChunkResult[] = [];
  let nextJob = 0;
  const initialSubmissionBurstStartedAt = performance.now();
  const runners = slots.map(async (slot) => {
    while (nextJob < variant.jobs) {
      const partyIndex = nextJob++;
      const correlationId = `${variant.name}-${sampleIndex}-${partyIndex}`;
      const constructionAt = performance.now();
      const payload = variant.payload === 'full'
        ? createJob(state, partyIndex % state.parties.length, correlationId)
        : variant.payload === 'compact'
          ? createJob(createAfkPartyChunkWorkerState(state, partyIndex % state.parties.length), partyIndex % state.parties.length, correlationId)
        : { partyIndex, marker: correlationId, values: [1, 2, 3, 4] };
      const payloadConstructionMs = performance.now() - constructionAt;
      const sizingAt = performance.now();
      const jsonChars = variant.exactSizing ? JSON.stringify(payload).length : 0;
      const exactSizingMs = performance.now() - sizingAt;
      intervals.push({ name: `payload_construction:${correlationId}`, durationMs: payloadConstructionMs });
      intervals.push({ name: `exact_message_sizing:${correlationId}`, durationMs: exactSizingMs });
      peakHeap = Math.max(peakHeap ?? 0, heapBytes() ?? 0) || null;
      const trace = await runOnSlot(slot, {
        correlationId,
        mode: variant.work,
        resultContract: variant.resultContract,
        payload,
      }, true);
      trace.payloadConstructionMs = payloadConstructionMs;
      trace.exactSizingMs = exactSizingMs;
      trace.jsonChars = jsonChars;
      trace.jsonUtf16Bytes = jsonChars * 2;
      traces.push(trace);
      intervals.push({ name: `postMessage:${correlationId}`, durationMs: trace.postMessageMs });
      intervals.push({ name: `renderer_result_handler:${correlationId}`, durationMs: trace.resultDeliveryMs });
      if (trace.result) {
        results.push(variant.resultContract === 'production'
          ? hydrateAfkPartyChunkResult(trace.result as AfkPartyChunkWorkerResult, state.parties[partyIndex % state.parties.length]!)
          : trace.result as AfkPartyChunkResult);
      }
    }
  });
  intervals.push({ name: 'initial_renderer_submission_burst', durationMs: performance.now() - initialSubmissionBurstStartedAt });
  await Promise.all(runners);
  const coordinatorStartedAt = performance.now();
  let committed = state;
  for (const result of results.sort(compareAfkChunkResults)) committed = commitAfkPartyChunk(committed, result);
  const coordinatorCommitMs = performance.now() - coordinatorStartedAt;
  intervals.push({ name: 'coordinator_validation_ordering_merge_commit', durationMs: coordinatorCommitMs });
  slots.forEach((slot) => slot.worker.terminate());
  await new Promise((resolve) => setTimeout(resolve, 0));
  clearInterval(heartbeat);
  peakHeap = Math.max(peakHeap ?? 0, heapBytes() ?? 0) || null;
  const largest = intervals.reduce((best, current) => current.durationMs > best.durationMs ? current : best, { name: 'none', durationMs: 0 });
  const deterministicHash = variant.work === 'simulate'
    ? await sha256(JSON.stringify(serializeGameState(committed)))
    : null;
  return {
    eventLoopDelayMs: maxHeartbeatDelay,
    largestNamedRendererInterval: largest,
    workerConstructionMs: slots.reduce((sum, slot) => sum + slot.constructionCallMs, 0),
    workerReadyLatencyMs: Math.max(...slots.map((slot) => slot.readyLatencyMs), 0),
    prewarmMs,
    payloadConstructionMs: traces.reduce((sum, trace) => sum + trace.payloadConstructionMs, 0),
    exactSizingMs: traces.reduce((sum, trace) => sum + trace.exactSizingMs, 0),
    postMessageMs: traces.reduce((sum, trace) => sum + trace.postMessageMs, 0),
    handlerLatencyMs: Math.max(...traces.map((trace) => trace.handlerLatencyMs), 0),
    workerComputeMs: traces.reduce((sum, trace) => sum + trace.workerComputeMs, 0),
    resultPostMs: traces.reduce((sum, trace) => sum + trace.resultPostMs, 0),
    resultDeliveryMs: Math.max(...traces.map((trace) => trace.resultDeliveryMs), 0),
    coordinatorCommitMs,
    wallMs: performance.now() - sampleStartedAt,
    peakHeapBytes: peakHeap,
    jobTraces: traces.map(({ result: _result, ...trace }) => trace),
    deterministicHash,
  };
}

async function runOnSlot(
  slot: WorkerSlot,
  request: {
    correlationId: string;
    mode: 'noop' | 'simulate';
    resultContract?: 'complete' | 'production';
    payload: unknown;
  },
  keepResult: boolean,
): Promise<JobTrace & { result?: AfkPartyChunkResult | AfkPartyChunkWorkerResult }> {
  const submittedAt = epochNow();
  let postMessageEndedAt = submittedAt;
  return new Promise((resolve, reject) => {
    let completion: Record<string, unknown> | null = null;
    let postComplete: Record<string, number> | null = null;
    const finish = () => {
      if (!completion || !postComplete) return;
      const handlerEnteredAt = completion.handlerEnteredAt as number;
      const computeStartedAt = completion.computeStartedAt as number;
      const computeEndedAt = completion.computeEndedAt as number;
      resolve({
        correlationId: request.correlationId,
        payloadConstructionMs: 0, exactSizingMs: 0, jsonChars: 0, jsonUtf16Bytes: 0,
        postMessageMs: postMessageEndedAt - submittedAt,
        handlerLatencyMs: Math.max(0, handlerEnteredAt - postMessageEndedAt),
        workerComputeMs: Math.max(0, computeEndedAt - computeStartedAt),
        resultPostMs: Math.max(0, postComplete.resultPostEndedAt - postComplete.resultPostStartedAt),
        resultDeliveryMs: Math.max(0, epochNow() - postComplete.resultPostEndedAt),
        ...(keepResult && completion.result ? { result: completion.result as AfkPartyChunkResult } : {}),
      });
    };
    slot.worker.onmessage = (event) => {
      if (event.data.correlationId !== request.correlationId) return;
      if (event.data.type === 'error') reject(new Error(event.data.message));
      else if (event.data.type === 'complete') completion = event.data;
      else if (event.data.type === 'result-post-complete') postComplete = event.data;
      finish();
    };
    slot.worker.onerror = (event) => reject(new Error(event.message));
    slot.worker.postMessage({ type: 'job', ...request });
    postMessageEndedAt = epochNow();
  });
}

function summarize(samples: Sample[], expectedHash: string | null) {
  const values = (field: keyof Omit<Sample, 'largestNamedRendererInterval' | 'jobTraces' | 'deterministicHash'>) => (
    samples.map((sample) => Number(sample[field] ?? 0))
  );
  const observedDeterministicHashes = [...new Set(
    samples.map((sample) => sample.deterministicHash).filter((hash): hash is string => hash !== null),
  )];
  return {
    eventLoopDelayMs: distribution(values('eventLoopDelayMs')),
    workerConstructionMs: distribution(values('workerConstructionMs')),
    workerReadyLatencyMs: distribution(values('workerReadyLatencyMs')),
    prewarmMs: distribution(values('prewarmMs')),
    payloadConstructionMs: distribution(values('payloadConstructionMs')),
    exactSizingMs: distribution(values('exactSizingMs')),
    postMessageMs: distribution(values('postMessageMs')),
    handlerLatencyMs: distribution(values('handlerLatencyMs')),
    workerComputeMs: distribution(values('workerComputeMs')),
    resultPostMs: distribution(values('resultPostMs')),
    resultDeliveryMs: distribution(values('resultDeliveryMs')),
    coordinatorCommitMs: distribution(values('coordinatorCommitMs')),
    wallMs: distribution(values('wallMs')),
    peakHeapBytes: distribution(samples.map((sample) => sample.peakHeapBytes ?? 0)),
    largestNamedRendererInterval: samples.reduce((best, sample) => (
      sample.largestNamedRendererInterval.durationMs > best.durationMs ? sample.largestNamedRendererInterval : best
    ), { name: 'none', durationMs: 0 }),
    fourSecondClassStall: samples.some((sample) => sample.eventLoopDelayMs >= 4_000),
    deterministic: expectedHash === null
      ? null
      : samples.every((sample) => sample.deterministicHash === expectedHash),
    deterministicHash: expectedHash,
    observedDeterministicHashes,
  };
}

async function runProfile() {
  const envelope = JSON.parse(__EXPEDITION_8_SAVE_FIXTURE__) as { saveDataCompressed: string };
  const state = hydrateGameState(JSON.parse(decodePersistedState(envelope.saveDataCompressed)) as GameState);
  const current = getAfkWorkerPoolLimit(navigator.hardwareConcurrency, state.parties.length);
  const variants: Variant[] = [
    { name: 'A_production_concurrency_exact_size', jobs: 6, concurrency: current, payload: 'full', work: 'simulate', exactSizing: true, prewarm: false },
    { name: 'B_create_only', jobs: 0, concurrency: current, payload: 'small', work: 'noop', exactSizing: false, prewarm: false, createOnly: true },
    { name: 'C_one_full_job', jobs: 1, concurrency: 1, payload: 'full', work: 'simulate', exactSizing: true, prewarm: false },
    { name: 'D_production_concurrency_full', jobs: 6, concurrency: current, payload: 'full', work: 'simulate', exactSizing: false, prewarm: false },
    { name: 'F_small_payload_noop', jobs: 6, concurrency: current, payload: 'small', work: 'noop', exactSizing: false, prewarm: false },
    { name: 'G_full_payload_noop', jobs: 6, concurrency: current, payload: 'full', work: 'noop', exactSizing: false, prewarm: false },
    { name: 'H_simulation_prewarmed_full', jobs: 6, concurrency: current, payload: 'full', work: 'simulate', exactSizing: false, prewarm: true },
    { name: 'I_concurrency_1', jobs: 6, concurrency: 1, payload: 'full', work: 'simulate', exactSizing: false, prewarm: false },
    { name: 'I_concurrency_2', jobs: 6, concurrency: 2, payload: 'full', work: 'simulate', exactSizing: false, prewarm: false },
    { name: 'I_concurrency_3', jobs: 6, concurrency: 3, payload: 'full', work: 'simulate', exactSizing: false, prewarm: false },
    { name: 'I_concurrency_4_stress', jobs: 6, concurrency: 4, payload: 'full', work: 'simulate', exactSizing: false, prewarm: false },
    { name: 'J_production_compact_concurrency_2', jobs: 6, concurrency: 2, payload: 'compact', work: 'simulate', resultContract: 'production', exactSizing: false, prewarm: false },
    { name: 'J_production_compact_concurrency_3', jobs: 6, concurrency: 3, payload: 'compact', work: 'simulate', resultContract: 'production', exactSizing: false, prewarm: false },
  ];
  const report: Record<string, unknown> = {};
  for (const variant of variants) {
    for (let index = 0; index < __DIAGNOSTIC_WARMUP_COUNT__; index += 1) await runSample(state, variant, -(index + 1));
    const samples: Sample[] = [];
    for (let index = 0; index < __DIAGNOSTIC_SAMPLE_COUNT__; index += 1) samples.push(await runSample(state, variant, index));
    const expectedHash = variant.work !== 'simulate'
      ? null
      : variant.jobs === state.parties.length
        ? EXPECTED_SIX_PARTY_SHA256
        : variant.jobs === 1
          ? EXPECTED_ONE_PARTY_SHA256
          : null;
    if (variant.work === 'simulate' && expectedHash === null) {
      throw new Error(`Missing pinned deterministic hash for ${variant.name}`);
    }
    if (expectedHash !== null && samples.some((sample) => sample.deterministicHash !== expectedHash)) {
      const observed = [...new Set(samples.map((sample) => sample.deterministicHash))].join(', ');
      throw new Error(`Deterministic hash mismatch for ${variant.name}: expected ${expectedHash}; observed ${observed}`);
    }
    report[variant.name] = { configuration: variant, summary: summarize(samples, expectedHash), samples };
  }
  return {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    sampling: { warmups: __DIAGNOSTIC_WARMUP_COUNT__, measuredSamples: __DIAGNOSTIC_SAMPLE_COUNT__, heartbeatMs: HEARTBEAT_MS },
    environment: { userAgent: navigator.userAgent, logicalProcessors: navigator.hardwareConcurrency, deviceMemoryGiB: (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null },
    variants: report,
  };
}

declare global { interface Window { __BOKEMO_EXP8_STARTUP_DIAGNOSTICS__?: Promise<unknown> } }
window.__BOKEMO_EXP8_STARTUP_DIAGNOSTICS__ = runProfile();
