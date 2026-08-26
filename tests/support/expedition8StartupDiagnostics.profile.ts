import { getApproxAfkCycleDurationMs } from '../../src/game/afkScheduler.ts';
import {
  AFK_CHUNK_CYCLE_COUNT,
  compareAfkChunkResults,
  commitAfkPartyChunk,
  type AfkPartyChunkJob,
  type AfkPartyChunkResult,
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
  deterministic: boolean | null;
}
interface Variant {
  name: string;
  jobs: number;
  concurrency: number;
  payload: 'full' | 'small';
  work: 'simulate' | 'noop';
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
  const sampleStartedAt = performance.now();
  let peakHeap = heapBytes();
  const slots: WorkerSlot[] = [];
  for (let index = 0; index < variant.concurrency; index += 1) {
    const slot = await constructWorker();
    slots.push(slot);
    intervals.push({ name: `worker_construction_call:${index}`, durationMs: slot.constructionCallMs });
  }
  peakHeap = Math.max(peakHeap ?? 0, heapBytes() ?? 0) || null;
  if (variant.prewarm && !variant.createOnly) {
    await Promise.all(slots.map((slot, index) => runOnSlot(slot, {
      correlationId: `prewarm-${sampleIndex}-${index}`,
      mode: 'noop',
      payload: { ping: true },
    }, false)));
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
      workerReadyLatencyMs: Math.max(...slots.map((slot) => slot.readyLatencyMs), 0),
      payloadConstructionMs: 0, exactSizingMs: 0, postMessageMs: 0, handlerLatencyMs: 0,
      workerComputeMs: 0, resultPostMs: 0, resultDeliveryMs: 0, coordinatorCommitMs: 0,
      wallMs: performance.now() - sampleStartedAt, peakHeapBytes: peakHeap, jobTraces: [], deterministic: null,
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
        payload,
      }, true);
      trace.payloadConstructionMs = payloadConstructionMs;
      trace.exactSizingMs = exactSizingMs;
      trace.jsonChars = jsonChars;
      trace.jsonUtf16Bytes = jsonChars * 2;
      traces.push(trace);
      intervals.push({ name: `postMessage:${correlationId}`, durationMs: trace.postMessageMs });
      intervals.push({ name: `renderer_result_handler:${correlationId}`, durationMs: trace.resultDeliveryMs });
      if (trace.result) results.push(trace.result);
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
  return {
    eventLoopDelayMs: maxHeartbeatDelay,
    largestNamedRendererInterval: largest,
    workerConstructionMs: slots.reduce((sum, slot) => sum + slot.constructionCallMs, 0),
    workerReadyLatencyMs: Math.max(...slots.map((slot) => slot.readyLatencyMs), 0),
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
    deterministic: variant.work === 'simulate' ? JSON.stringify(serializeGameState(committed)).length > 0 : null,
  };
}

async function runOnSlot(
  slot: WorkerSlot,
  request: { correlationId: string; mode: 'noop' | 'simulate'; payload: unknown },
  keepResult: boolean,
): Promise<JobTrace & { result?: AfkPartyChunkResult }> {
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

function summarize(samples: Sample[]) {
  const values = (field: keyof Omit<Sample, 'largestNamedRendererInterval' | 'jobTraces' | 'deterministic'>) => (
    samples.map((sample) => Number(sample[field] ?? 0))
  );
  return {
    eventLoopDelayMs: distribution(values('eventLoopDelayMs')),
    workerConstructionMs: distribution(values('workerConstructionMs')),
    workerReadyLatencyMs: distribution(values('workerReadyLatencyMs')),
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
    deterministic: samples.every((sample) => sample.deterministic !== false),
  };
}

async function runProfile() {
  const envelope = JSON.parse(__EXPEDITION_8_SAVE_FIXTURE__) as { saveDataCompressed: string };
  const state = hydrateGameState(JSON.parse(decodePersistedState(envelope.saveDataCompressed)) as GameState);
  const current = Math.min(4, state.parties.length);
  const variants: Variant[] = [
    { name: 'A_existing_exact_size_concurrent', jobs: 6, concurrency: current, payload: 'full', work: 'simulate', exactSizing: true, prewarm: false },
    { name: 'B_create_only', jobs: 0, concurrency: current, payload: 'small', work: 'noop', exactSizing: false, prewarm: false, createOnly: true },
    { name: 'C_one_full_job', jobs: 1, concurrency: 1, payload: 'full', work: 'simulate', exactSizing: true, prewarm: false },
    { name: 'D_sequential_full', jobs: 6, concurrency: 1, payload: 'full', work: 'simulate', exactSizing: false, prewarm: false },
    { name: 'E_concurrent_full', jobs: 6, concurrency: current, payload: 'full', work: 'simulate', exactSizing: false, prewarm: false },
    { name: 'F_small_payload_noop', jobs: 6, concurrency: current, payload: 'small', work: 'noop', exactSizing: false, prewarm: false },
    { name: 'G_full_payload_noop', jobs: 6, concurrency: current, payload: 'full', work: 'noop', exactSizing: false, prewarm: false },
    { name: 'H_prewarmed_full', jobs: 6, concurrency: current, payload: 'full', work: 'simulate', exactSizing: false, prewarm: true },
    { name: 'I_concurrency_1', jobs: 6, concurrency: 1, payload: 'full', work: 'simulate', exactSizing: false, prewarm: false },
    { name: 'I_concurrency_2', jobs: 6, concurrency: 2, payload: 'full', work: 'simulate', exactSizing: false, prewarm: false },
  ];
  const report: Record<string, unknown> = {};
  for (const variant of variants) {
    for (let index = 0; index < __DIAGNOSTIC_WARMUP_COUNT__; index += 1) await runSample(state, variant, -(index + 1));
    const samples: Sample[] = [];
    for (let index = 0; index < __DIAGNOSTIC_SAMPLE_COUNT__; index += 1) samples.push(await runSample(state, variant, index));
    report[variant.name] = { configuration: variant, summary: summarize(samples), samples };
  }
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sampling: { warmups: __DIAGNOSTIC_WARMUP_COUNT__, measuredSamples: __DIAGNOSTIC_SAMPLE_COUNT__, heartbeatMs: HEARTBEAT_MS },
    environment: { userAgent: navigator.userAgent, logicalProcessors: navigator.hardwareConcurrency, deviceMemoryGiB: (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null },
    variants: report,
  };
}

declare global { interface Window { __BOKEMO_EXP8_STARTUP_DIAGNOSTICS__?: Promise<unknown> } }
window.__BOKEMO_EXP8_STARTUP_DIAGNOSTICS__ = runProfile();
