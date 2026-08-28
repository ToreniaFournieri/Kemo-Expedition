import { getApproxAfkCycleDurationMs } from '../../src/game/afkScheduler.ts';
import {
  AFK_CHUNK_CYCLE_COUNT,
  commitAfkPartyChunk,
  compareAfkChunkResults,
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
declare const __AFK_TRANSFER_WORKER_URL__: string;
declare const __AFK_TRANSFER_SAMPLE_COUNT__: number;
declare const __AFK_TRANSFER_WARMUP_COUNT__: number;

type Candidate = 'full' | 'compact';
const DEV_CYCLE_DURATION_SCALE = 0.05;
const SIMULATED_END_AT = Date.UTC(2026, 7, 16);
const EXPECTED_HASH = '11fb8356c53d5087d8f220408a92c3c8b12ef276abf2898e9a7e19e7b88bfebc';
const HEARTBEAT_MS = 10;

interface Sample {
  candidate: Candidate;
  eventLoopDelayMs: number;
  wallMs: number;
  postMessageSumMs: number;
  postMessageMaximumMs: number;
  workerComputeSumMs: number;
  resultPostSumMs: number;
  resultDeliveryMaximumMs: number;
  hydratedResultsJson: string;
  finalHash: string;
}

function nearestRank(values: number[], ratio: number): number {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.max(0, Math.ceil(ordered.length * ratio) - 1)] ?? 0;
}

function distribution(values: number[]) {
  return {
    samples: values.length,
    minimum: values.length === 0 ? 0 : Math.min(...values),
    p50: nearestRank(values, 0.5),
    p95: nearestRank(values, 0.95),
    maximum: Math.max(...values, 0),
  };
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function createJob(state: GameState, partyIndex: number, candidate: Candidate, sampleIndex: number): AfkPartyChunkJob {
  const party = state.parties[partyIndex];
  const cycleDurationMs = getApproxAfkCycleDurationMs(party, DEV_CYCLE_DURATION_SCALE);
  return {
    jobId: `transfer-${sampleIndex}-${party.id}`,
    partyIndex,
    partyId: party.id,
    simulatedStartedAt: SIMULATED_END_AT - cycleDurationMs * AFK_CHUNK_CYCLE_COUNT,
    simulatedCompletedAt: SIMULATED_END_AT,
    cycleDurationMs,
    operationCount: AFK_CHUNK_CYCLE_COUNT,
    baseState: candidate === 'compact' ? createAfkPartyChunkWorkerState(state, partyIndex) : state,
    gameMode: 'm.kemo',
    cycleDurationScale: DEV_CYCLE_DURATION_SCALE,
  };
}

async function runCandidate(state: GameState, candidate: Candidate, sampleIndex: number): Promise<Sample> {
  const jobs = state.parties.map((_, partyIndex) => createJob(state, partyIndex, candidate, sampleIndex));
  let expectedHeartbeat = performance.now() + HEARTBEAT_MS;
  let maximumHeartbeatDelay = 0;
  const heartbeat = setInterval(() => {
    const now = performance.now();
    maximumHeartbeatDelay = Math.max(maximumHeartbeatDelay, now - expectedHeartbeat);
    expectedHeartbeat = now + HEARTBEAT_MS;
  }, HEARTBEAT_MS);
  const workerLimit = getAfkWorkerPoolLimit(navigator.hardwareConcurrency, jobs.length);
  let nextJobIndex = 0;
  const results: AfkPartyChunkResult[] = [];
  const postMessageDurations: number[] = [];
  const computeDurations: number[] = [];
  const resultPostDurations: number[] = [];
  const resultDeliveryDurations: number[] = [];
  const startedAt = performance.now();

  const runSlot = async () => {
    const worker = new Worker(new URL(__AFK_TRANSFER_WORKER_URL__, import.meta.url), { type: 'module' });
    try {
      while (nextJobIndex < jobs.length) {
        const job = jobs[nextJobIndex++]!;
        const correlationId = job.jobId;
        const result = await new Promise<AfkPartyChunkResult>((resolve, reject) => {
          let completion: Record<string, unknown> | null = null;
          let postComplete: Record<string, number> | null = null;
          const finish = () => {
            if (!completion || !postComplete) return;
            const deliveredAt = performance.timeOrigin + performance.now();
            const workerResult = completion.result as AfkPartyChunkResult | AfkPartyChunkWorkerResult;
            const hydrated = candidate === 'compact'
              ? hydrateAfkPartyChunkResult(workerResult as AfkPartyChunkWorkerResult, state.parties[job.partyIndex])
              : workerResult as AfkPartyChunkResult;
            computeDurations.push(Number(completion.computeEndedAt) - Number(completion.computeStartedAt));
            resultPostDurations.push(postComplete.resultPostEndedAt - postComplete.resultPostStartedAt);
            resultDeliveryDurations.push(deliveredAt - postComplete.resultPostEndedAt);
            resolve(hydrated);
          };
          worker.onmessage = (event) => {
            if (event.data.correlationId !== correlationId) return;
            if (event.data.type === 'error') reject(new Error(event.data.message));
            else if (event.data.type === 'complete') completion = event.data;
            else if (event.data.type === 'post-complete') postComplete = event.data;
            finish();
          };
          worker.onerror = (event) => reject(new Error(event.message));
          const postStartedAt = performance.now();
          worker.postMessage({ candidate, correlationId, job });
          postMessageDurations.push(performance.now() - postStartedAt);
        });
        results.push(result);
      }
    } finally {
      worker.terminate();
    }
  };

  await Promise.all(Array.from({ length: workerLimit }, () => runSlot()));
  const wallMs = performance.now() - startedAt;
  clearInterval(heartbeat);
  await new Promise((resolve) => setTimeout(resolve, 0));
  let finalState = state;
  for (const result of results.sort(compareAfkChunkResults)) finalState = commitAfkPartyChunk(finalState, result);
  const hydratedResultsJson = JSON.stringify(results);
  const finalHash = await sha256(JSON.stringify(serializeGameState(finalState)));
  if (finalHash !== EXPECTED_HASH) {
    throw new Error(`${candidate} AFK transfer hash mismatch: expected ${EXPECTED_HASH}; observed ${finalHash}`);
  }
  return {
    candidate,
    eventLoopDelayMs: maximumHeartbeatDelay,
    wallMs,
    postMessageSumMs: postMessageDurations.reduce((total, value) => total + value, 0),
    postMessageMaximumMs: Math.max(...postMessageDurations, 0),
    workerComputeSumMs: computeDurations.reduce((total, value) => total + value, 0),
    resultPostSumMs: resultPostDurations.reduce((total, value) => total + value, 0),
    resultDeliveryMaximumMs: Math.max(...resultDeliveryDurations, 0),
    hydratedResultsJson,
    finalHash,
  };
}

function summarize(samples: Sample[]) {
  const fields: Array<keyof Omit<Sample, 'candidate' | 'hydratedResultsJson' | 'finalHash'>> = [
    'eventLoopDelayMs',
    'wallMs',
    'postMessageSumMs',
    'postMessageMaximumMs',
    'workerComputeSumMs',
    'resultPostSumMs',
    'resultDeliveryMaximumMs',
  ];
  return Object.fromEntries(fields.map((field) => [field, distribution(samples.map((sample) => sample[field]))]));
}

async function runProfile() {
  const envelope = JSON.parse(__EXPEDITION_8_SAVE_FIXTURE__) as { saveDataCompressed: string };
  const state = hydrateGameState(JSON.parse(decodePersistedState(envelope.saveDataCompressed)) as GameState);
  const measured: Record<Candidate, Sample[]> = { full: [], compact: [] };
  for (let index = -__AFK_TRANSFER_WARMUP_COUNT__; index < __AFK_TRANSFER_SAMPLE_COUNT__; index += 1) {
    const order: Candidate[] = index % 2 === 0 ? ['full', 'compact'] : ['compact', 'full'];
    const pair: Partial<Record<Candidate, Sample>> = {};
    for (const candidate of order) pair[candidate] = await runCandidate(state, candidate, index);
    if (pair.full!.hydratedResultsJson !== pair.compact!.hydratedResultsJson) {
      throw new Error(`Hydrated full/compact result mismatch in sample ${index}`);
    }
    if (index >= 0) {
      measured.full.push(pair.full!);
      measured.compact.push(pair.compact!);
    }
  }
  const pairedWallImprovement = measured.full.map((sample, index) => (
    (1 - measured.compact[index].wallMs / sample.wallMs) * 100
  ));
  const pairedEventLoopImprovement = measured.full.map((sample, index) => (
    (1 - measured.compact[index].eventLoopDelayMs / sample.eventLoopDelayMs) * 100
  ));
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sampling: {
      warmups: __AFK_TRANSFER_WARMUP_COUNT__,
      measuredSamples: __AFK_TRANSFER_SAMPLE_COUNT__,
      candidateOrder: 'alternating-within-sample',
    },
    validation: {
      hydratedResultsByteIdenticalEverySample: true,
      deterministicAfkFinalStateSha256: EXPECTED_HASH,
    },
    candidates: { full: summarize(measured.full), compact: summarize(measured.compact) },
    pairedImprovementPercent: {
      wallMs: distribution(pairedWallImprovement),
      eventLoopDelayMs: distribution(pairedEventLoopImprovement),
    },
  };
}

declare global {
  interface Window { __BOKEMO_AFK_TRANSFER_PROFILE__?: Promise<unknown> }
}
window.__BOKEMO_AFK_TRANSFER_PROFILE__ = runProfile();
