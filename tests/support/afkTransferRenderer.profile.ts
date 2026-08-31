import { getApproxAfkCycleDurationMs } from '../../src/game/afkScheduler.ts';
import {
  AFK_CHUNK_CYCLE_COUNT,
  commitAfkPartyChunk,
  compareAfkChunkResults,
  createAfkPartyChunkColdWorkerJob,
  createAfkPartyChunkContinuationWorkerJob,
  createAfkPartyChunkInventoryColdWorkerJob,
  createAfkPartyChunkInventoryContinuationWorkerJob,
  createAfkPartyChunkWorkerState,
  getAfkWorkerPoolLimit,
  hydrateAfkPartyChunkResult,
  hydrateAfkPartyChunkResultV3,
  hydrateAfkPartyChunkInventoryResult,
  type AfkPartyChunkJob,
  type AfkPartyChunkResult,
  type AfkPartyChunkWorkerResult,
  type AfkPartyChunkWorkerResultV3,
  type AfkPartyChunkWorkerJob,
  type AfkPartyChunkInventoryWorkerJob,
  type AfkPartyChunkInventoryWorkerResult,
} from '../../src/game/afkChunkCoordinator.ts';
import { hydrateGameState, serializeGameState } from '../../src/game/saveCodec.ts';
import { decodePersistedState } from '../../src/game/storageCompression.ts';
import type { GameState } from '../../src/types.ts';
import { createAfkCompactInventoryCandidateState } from './afkCompactInventoryCandidate.ts';

declare const __EXPEDITION_8_SAVE_FIXTURE__: string;
declare const __AFK_TRANSFER_WORKER_URL__: string;
declare const __AFK_TRANSFER_SAMPLE_COUNT__: number;
declare const __AFK_TRANSFER_WARMUP_COUNT__: number;
declare const __AFK_TRANSFER_ONLY_CANDIDATE__: string;
declare const __AFK_TRANSFER_PROMOTION_ONLY__: boolean;

type Candidate = 'full' | 'build62' | 'build71' | 'build72' | 'linear' | 'production' | 'continuation' | 'inventory';
type Build62WorkerResult = Omit<AfkPartyChunkResult, 'baseParty'>;
const DEV_CYCLE_DURATION_SCALE = 0.05;
const SIMULATED_END_AT = Date.UTC(2026, 7, 16);
const HEARTBEAT_MS = 10;
const BACKLOG_WAVES = 3;

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
  inputBytes: number;
  coldStartCount: number;
  continuationCount: number;
  peakRendererHeapBytes: number | null;
  peakApplicationWorkingSetBytes: number | null;
  peakRendererWorkingSetBytes: number | null;
  settledApplicationWorkingSetBytes: number | null;
  settledRendererWorkingSetBytes: number | null;
}

interface ProfileMemoryMetrics {
  applicationWorkingSetBytes: number | null;
  rendererWorkingSetBytes: number | null;
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

function hydrateBuild62Result(result: Build62WorkerResult, baseParty: GameState['parties'][number]): AfkPartyChunkResult {
  return {
    schemaVersion: result.schemaVersion,
    jobId: result.jobId,
    partyIndex: result.partyIndex,
    partyId: result.partyId,
    simulatedCompletedAt: result.simulatedCompletedAt,
    cycleDurationMs: result.cycleDurationMs,
    operationCount: result.operationCount,
    baseParty,
    resultParty: result.resultParty,
    unlockedParties: result.unlockedParties,
    globalDelta: result.globalDelta,
    durationMs: result.durationMs,
    workerTelemetry: result.workerTelemetry,
  };
}

function createJob(state: GameState, partyIndex: number, candidate: Candidate, sampleIndex: number, waveIndex: number): AfkPartyChunkJob {
  const party = state.parties[partyIndex];
  const cycleDurationMs = getApproxAfkCycleDurationMs(party, DEV_CYCLE_DURATION_SCALE);
  return {
    jobId: `transfer-${sampleIndex}-${waveIndex}-${party.id}`,
    partyIndex,
    partyId: party.id,
    simulatedStartedAt: SIMULATED_END_AT + (waveIndex - 1) * cycleDurationMs * AFK_CHUNK_CYCLE_COUNT,
    simulatedCompletedAt: SIMULATED_END_AT + waveIndex * cycleDurationMs * AFK_CHUNK_CYCLE_COUNT,
    cycleDurationMs,
    operationCount: AFK_CHUNK_CYCLE_COUNT,
    baseState: candidate === 'full'
      ? state
      : candidate === 'production' || candidate === 'linear'
        ? createAfkCompactInventoryCandidateState(state, partyIndex)
        : createAfkPartyChunkWorkerState(
          state,
          partyIndex,
          candidate === 'build62' || candidate === 'build71' || candidate === 'continuation' ? 'full' : 'placeholders',
        ),
    gameMode: 'm.kemo',
    cycleDurationScale: DEV_CYCLE_DURATION_SCALE,
  };
}

async function runCandidate(state: GameState, candidate: Candidate, sampleIndex: number): Promise<Sample> {
  (globalThis as typeof globalThis & { gc?: () => void }).gc?.();
  await new Promise((resolve) => setTimeout(resolve, 250));
  let expectedHeartbeat = performance.now() + HEARTBEAT_MS;
  let maximumHeartbeatDelay = 0;
  let peakRendererHeapBytes: number | null = null;
  let peakApplicationWorkingSetBytes: number | null = null;
  let peakRendererWorkingSetBytes: number | null = null;
  const sampleProcessMemory = async () => {
    const metrics = await window.__BOKEMO_PROFILE_MEMORY__.sample();
    if (metrics.applicationWorkingSetBytes !== null) {
      peakApplicationWorkingSetBytes = Math.max(peakApplicationWorkingSetBytes ?? 0, metrics.applicationWorkingSetBytes);
    }
    if (metrics.rendererWorkingSetBytes !== null) {
      peakRendererWorkingSetBytes = Math.max(peakRendererWorkingSetBytes ?? 0, metrics.rendererWorkingSetBytes);
    }
    return metrics;
  };
  const observeHeap = () => {
    const used = (performance as Performance & { memory?: { usedJSHeapSize?: number } }).memory?.usedJSHeapSize;
    if (typeof used === 'number') peakRendererHeapBytes = Math.max(peakRendererHeapBytes ?? 0, used);
  };
  const heartbeat = setInterval(() => {
    const now = performance.now();
    maximumHeartbeatDelay = Math.max(maximumHeartbeatDelay, now - expectedHeartbeat);
    expectedHeartbeat = now + HEARTBEAT_MS;
    observeHeap();
  }, HEARTBEAT_MS);
  const workerLimit = getAfkWorkerPoolLimit(navigator.hardwareConcurrency, state.parties.length);
  const results: AfkPartyChunkResult[] = [];
  const postMessageDurations: number[] = [];
  const computeDurations: number[] = [];
  const resultPostDurations: number[] = [];
  const resultDeliveryDurations: number[] = [];
  let inputBytes = 0;
  let coldStartCount = 0;
  let continuationCount = 0;
  const authoritativePartiesByJobId = new Map<string, GameState['parties'][number]>();
  const startedAt = performance.now();
  await sampleProcessMemory();
  const slots = Array.from({ length: workerLimit }, () => ({
    worker: new Worker(new URL(__AFK_TRANSFER_WORKER_URL__, import.meta.url), { type: 'module' }),
    retainedParties: new Map<number, { party: GameState['parties'][number]; stateToken: string; revision: number }>(),
    retainedInventory: null as GameState['global']['inventory'] | null,
    retainedInventoryToken: null as string | null,
    retainedInventoryRevision: 0,
  }));

  const runSlot = async (slotIndex: number, jobs: AfkPartyChunkJob[]) => {
    const slot = slots[slotIndex]!;
    const worker = slot.worker;
    for (const baseJob of jobs) {
        const retained = slot.retainedParties.get(baseJob.partyId);
        const job: AfkPartyChunkJob | AfkPartyChunkWorkerJob | AfkPartyChunkInventoryWorkerJob = candidate === 'inventory'
          ? slot.retainedInventory && slot.retainedInventoryToken
            ? createAfkPartyChunkInventoryContinuationWorkerJob(
              baseJob,
              slot.retainedInventory,
              slot.retainedInventoryToken,
              slot.retainedInventoryRevision,
              `${baseJob.jobId}:inventory`,
              slot.retainedInventoryRevision + 1,
            )
            : createAfkPartyChunkInventoryColdWorkerJob(baseJob, `${baseJob.jobId}:inventory`, 1)
          : candidate === 'continuation'
          ? retained
            ? createAfkPartyChunkContinuationWorkerJob(
              baseJob,
              retained.party,
              retained.stateToken,
              retained.revision,
              `${baseJob.jobId}:state`,
              retained.revision + 1,
            )
            : createAfkPartyChunkColdWorkerJob(baseJob, `${baseJob.jobId}:state`, 1)
          : baseJob;
        if (candidate === 'continuation' || candidate === 'inventory') {
          if (('transferKind' in job && job.transferKind === 'continuation')
            || ('inventoryTransferKind' in job && job.inventoryTransferKind === 'continuation')) continuationCount += 1;
          else coldStartCount += 1;
        }
        inputBytes += new TextEncoder().encode(JSON.stringify(job)).byteLength;
        const correlationId = job.jobId;
        const result = await new Promise<AfkPartyChunkResult>((resolve, reject) => {
          let completion: Record<string, unknown> | null = null;
          let postComplete: Record<string, number> | null = null;
          const finish = () => {
            if (!completion || !postComplete) return;
            const deliveredAt = performance.timeOrigin + performance.now();
            const workerResult = completion.result as AfkPartyChunkResult | Build62WorkerResult | AfkPartyChunkWorkerResult | AfkPartyChunkWorkerResultV3 | AfkPartyChunkInventoryWorkerResult;
            const hydrated = candidate === 'inventory'
              ? hydrateAfkPartyChunkInventoryResult(
                workerResult as AfkPartyChunkInventoryWorkerResult,
                authoritativePartiesByJobId.get(baseJob.jobId)!,
                job as AfkPartyChunkInventoryWorkerJob,
              )
              : candidate === 'continuation'
              ? hydrateAfkPartyChunkResultV3(workerResult as AfkPartyChunkWorkerResultV3, authoritativePartiesByJobId.get(baseJob.jobId)!)
              : candidate === 'production' || candidate === 'linear' || candidate === 'build71' || candidate === 'build72'
                ? hydrateAfkPartyChunkResult(workerResult as AfkPartyChunkWorkerResult, authoritativePartiesByJobId.get(baseJob.jobId)!)
              : candidate === 'build62'
                ? hydrateBuild62Result(workerResult as Build62WorkerResult, authoritativePartiesByJobId.get(baseJob.jobId)!)
                : workerResult as AfkPartyChunkResult;
            computeDurations.push(Number(completion.computeEndedAt) - Number(completion.computeStartedAt));
            resultPostDurations.push(postComplete.resultPostEndedAt - postComplete.resultPostStartedAt);
            resultDeliveryDurations.push(deliveredAt - postComplete.resultPostEndedAt);
            if (candidate === 'continuation' && 'transferKind' in job) {
              const typed = workerResult as AfkPartyChunkWorkerResultV3;
              if (typed.nextStateToken !== job.nextStateToken
                || typed.reconciliationRevision !== job.reconciliationRevision) {
                reject(new Error('Continuation acknowledgement mismatch'));
                return;
              }
              slot.retainedParties.set(job.partyId, {
                party: hydrated.resultParty,
                stateToken: job.nextStateToken,
                revision: job.reconciliationRevision,
              });
            }
            if (candidate === 'inventory' && 'inventoryTransferKind' in job) {
              slot.retainedInventory = baseJob.baseState.global.inventory;
              slot.retainedInventoryToken = job.nextInventoryToken;
              slot.retainedInventoryRevision = job.inventoryRevision;
            }
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
  };

  let finalState = state;
  try {
    for (let waveIndex = 0; waveIndex < BACKLOG_WAVES; waveIndex += 1) {
      const jobs = finalState.parties.map((_, partyIndex) => createJob(finalState, partyIndex, candidate, sampleIndex, waveIndex));
      jobs.forEach((job) => authoritativePartiesByJobId.set(job.jobId, finalState.parties[job.partyIndex]!));
      const waveResultsStart = results.length;
      await Promise.all(Array.from({ length: workerLimit }, (_, slotIndex) => (
        runSlot(slotIndex, jobs.filter((_, partyIndex) => partyIndex % workerLimit === slotIndex))
      )));
      const waveResults = results.slice(waveResultsStart).sort(compareAfkChunkResults);
      for (const result of waveResults) finalState = commitAfkPartyChunk(finalState, result);
      await sampleProcessMemory();
    }
  } finally {
    slots.forEach((slot) => slot.worker.terminate());
  }
  const wallMs = performance.now() - startedAt;
  clearInterval(heartbeat);
  await new Promise((resolve) => setTimeout(resolve, 0));
  (globalThis as typeof globalThis & { gc?: () => void }).gc?.();
  await new Promise((resolve) => setTimeout(resolve, 500));
  const settledMemory = await sampleProcessMemory();
  const hydratedResultsJson = JSON.stringify([...results].sort(compareAfkChunkResults).map((result) => ({ ...result, durationMs: 0, workerTelemetry: {
    workerStartupMs: 0, queueMs: 0, inputHydrationMs: 0, languageReadyMs: 0, executionMs: 0, inputTransferBytes: null, outputTransferBytes: null,
  } })));
  const finalHash = await sha256(JSON.stringify(serializeGameState(finalState)));
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
    inputBytes,
    coldStartCount,
    continuationCount,
    peakRendererHeapBytes,
    peakApplicationWorkingSetBytes,
    peakRendererWorkingSetBytes,
    settledApplicationWorkingSetBytes: settledMemory.applicationWorkingSetBytes,
    settledRendererWorkingSetBytes: settledMemory.rendererWorkingSetBytes,
  };
}

function summarize(samples: Sample[]) {
  const fields: Array<keyof Omit<Sample, 'candidate' | 'hydratedResultsJson' | 'finalHash' | 'peakRendererHeapBytes'>> = [
    'eventLoopDelayMs',
    'wallMs',
    'postMessageSumMs',
    'postMessageMaximumMs',
    'workerComputeSumMs',
    'resultPostSumMs',
    'resultDeliveryMaximumMs',
    'inputBytes',
    'coldStartCount',
    'continuationCount',
    'peakApplicationWorkingSetBytes',
    'peakRendererWorkingSetBytes',
    'settledApplicationWorkingSetBytes',
    'settledRendererWorkingSetBytes',
  ];
  return {
    ...Object.fromEntries(fields.map((field) => [field, distribution(samples.map((sample) => sample[field]))])),
    peakRendererHeapBytes: distribution(samples.flatMap((sample) => sample.peakRendererHeapBytes === null ? [] : [sample.peakRendererHeapBytes])),
  };
}

async function runProfile() {
  const envelope = JSON.parse(__EXPEDITION_8_SAVE_FIXTURE__) as { saveDataCompressed: string };
  const state = hydrateGameState(JSON.parse(decodePersistedState(envelope.saveDataCompressed)) as GameState);
  const measured: Record<Candidate, Sample[]> = {
    full: [], build62: [], build71: [], build72: [], linear: [], production: [], continuation: [], inventory: [],
  };
  const onlyCandidate = (__AFK_TRANSFER_ONLY_CANDIDATE__ || '') as Candidate | '';
  const validCandidates: Candidate[] = ['full', 'build62', 'build71', 'build72', 'linear', 'production', 'continuation', 'inventory'];
  if (onlyCandidate && !validCandidates.includes(onlyCandidate)) throw new Error(`Unknown isolated candidate: ${onlyCandidate}`);
  for (let index = -__AFK_TRANSFER_WARMUP_COUNT__; index < __AFK_TRANSFER_SAMPLE_COUNT__; index += 1) {
    const orders: Candidate[][] = [
      ['full', 'build62', 'build71', 'build72', 'continuation', 'linear', 'production'],
      ['build62', 'build71', 'build72', 'continuation', 'full', 'production', 'linear'],
      ['build71', 'build72', 'continuation', 'full', 'build62', 'linear', 'production'],
      ['build72', 'continuation', 'full', 'build62', 'production', 'build71', 'linear'],
    ];
    const order = onlyCandidate
      ? [onlyCandidate]
      : __AFK_TRANSFER_PROMOTION_ONLY__
        ? index % 2 === 0 ? ['build72', 'inventory'] as Candidate[] : ['inventory', 'build72'] as Candidate[]
        : orders[((index % orders.length) + orders.length) % orders.length]!;
    const pair: Partial<Record<Candidate, Sample>> = {};
    for (const candidate of order) pair[candidate] = await runCandidate(state, candidate, index);
    if (__AFK_TRANSFER_PROMOTION_ONLY__) {
      if (pair.build72!.hydratedResultsJson !== pair.inventory!.hydratedResultsJson
        || pair.build72!.finalHash !== pair.inventory!.finalHash) {
        throw new Error(`Build-2/inventory promotion parity mismatch in sample ${index}`);
      }
    } else if (!onlyCandidate && (pair.full!.hydratedResultsJson !== pair.build62!.hydratedResultsJson
      || pair.full!.hydratedResultsJson !== pair.production!.hydratedResultsJson
      || pair.full!.hydratedResultsJson !== pair.build71!.hydratedResultsJson
      || pair.full!.hydratedResultsJson !== pair.build72!.hydratedResultsJson
      || pair.full!.hydratedResultsJson !== pair.linear!.hydratedResultsJson
      || pair.full!.hydratedResultsJson !== pair.continuation!.hydratedResultsJson
      || new Set(Object.values(pair).map((sample) => sample!.finalHash)).size !== 1)) {
      throw new Error(`Hydrated full/compact result mismatch in sample ${index}: ${JSON.stringify({
        fullBuild62: pair.full!.hydratedResultsJson === pair.build62!.hydratedResultsJson,
        fullProduction: pair.full!.hydratedResultsJson === pair.production!.hydratedResultsJson,
        productionContinuation: pair.production!.hydratedResultsJson === pair.continuation!.hydratedResultsJson,
        finalHashes: Object.fromEntries(Object.entries(pair).map(([name, sample]) => [name, sample?.finalHash])),
        resultLengths: Object.fromEntries(Object.entries(pair).map(([name, sample]) => [name, sample?.hydratedResultsJson.length])),
      })}`);
    }
    if (index >= 0) {
      const retainMetrics = (sample: Sample): Sample => ({ ...sample, hydratedResultsJson: '' });
      order.forEach((candidate) => measured[candidate].push(retainMetrics(pair[candidate]!)));
    }
  }
  const pairedImprovement = (
    baseline: Sample[],
    candidate: Sample[],
    field: 'wallMs' | 'eventLoopDelayMs' | 'workerComputeSumMs',
  ) => Array.from({ length: Math.min(baseline.length, candidate.length) }, (_, index) => (
    (1 - candidate[index]![field] / baseline[index]![field]) * 100
  ));
  const pairedWallImprovement = pairedImprovement(measured.build62, measured.production, 'wallMs');
  const pairedEventLoopImprovement = pairedImprovement(measured.build62, measured.production, 'eventLoopDelayMs');
  const build71WallImprovement = pairedImprovement(measured.build71, measured.production, 'wallMs');
  const build71EventLoopImprovement = pairedImprovement(measured.build71, measured.production, 'eventLoopDelayMs');
  const build72WallImprovement = pairedImprovement(measured.build72, measured.production, 'wallMs');
  const build72EventLoopImprovement = pairedImprovement(measured.build72, measured.production, 'eventLoopDelayMs');
  const build72ComputeImprovement = pairedImprovement(measured.build72, measured.production, 'workerComputeSumMs');
  const inventoryWallImprovement = pairedImprovement(measured.build72, measured.inventory, 'wallMs');
  const inventoryHeartbeatImprovement = pairedImprovement(measured.build72, measured.inventory, 'eventLoopDelayMs');
  const inventoryComputeImprovement = pairedImprovement(measured.build72, measured.inventory, 'workerComputeSumMs');
  const continuationWallImprovement = pairedImprovement(measured.production, measured.continuation, 'wallMs');
  const continuationHeartbeatImprovement = pairedImprovement(measured.production, measured.continuation, 'eventLoopDelayMs');
  const indexedWallImprovement = pairedImprovement(measured.linear, measured.production, 'wallMs');
  const indexedComputeImprovement = pairedImprovement(measured.linear, measured.production, 'workerComputeSumMs');
  return {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    sampling: {
      warmups: __AFK_TRANSFER_WARMUP_COUNT__,
      measuredSamples: __AFK_TRANSFER_SAMPLE_COUNT__,
      backlogWaves: BACKLOG_WAVES,
      candidateOrder: onlyCandidate
        ? `isolated-${onlyCandidate}`
        : __AFK_TRANSFER_PROMOTION_ONLY__ ? 'alternating-build2-inventory' : 'rotating-within-sample',
    },
    validation: {
      hydratedResultsByteIdenticalEverySample: true,
      deterministicAfkFinalStateSha256: validCandidates.flatMap((candidate) => measured[candidate])[0]?.finalHash ?? null,
    },
    candidates: {
      full: summarize(measured.full),
      build62: summarize(measured.build62),
      build71: summarize(measured.build71),
      build72: summarize(measured.build72),
      linear: summarize(measured.linear),
      production: summarize(measured.production),
      continuation: summarize(measured.continuation),
      inventory: summarize(measured.inventory),
    },
    build62ToProductionPairedImprovementPercent: {
      wallMs: distribution(pairedWallImprovement),
      eventLoopDelayMs: distribution(pairedEventLoopImprovement),
    },
    build71ToProductionPairedImprovementPercent: {
      wallMs: distribution(build71WallImprovement),
      eventLoopDelayMs: distribution(build71EventLoopImprovement),
    },
    build72ToProductionPairedImprovementPercent: {
      wallMs: distribution(build72WallImprovement),
      eventLoopDelayMs: distribution(build72EventLoopImprovement),
      workerComputeSumMs: distribution(build72ComputeImprovement),
    },
    build2ToInventoryPairedImprovementPercent: {
      wallMs: distribution(inventoryWallImprovement),
      eventLoopDelayMs: distribution(inventoryHeartbeatImprovement),
      workerComputeSumMs: distribution(inventoryComputeImprovement),
    },
    productionToContinuationPairedImprovementPercent: {
      wallMs: distribution(continuationWallImprovement),
      eventLoopDelayMs: distribution(continuationHeartbeatImprovement),
    },
    linearToIndexedPairedImprovementPercent: {
      wallMs: distribution(indexedWallImprovement),
      workerComputeSumMs: distribution(indexedComputeImprovement),
    },
  };
}

declare global {
  interface Window {
    __BOKEMO_AFK_TRANSFER_PROFILE__?: Promise<unknown>;
    __BOKEMO_PROFILE_MEMORY__: { sample: () => Promise<ProfileMemoryMetrics> };
  }
}
window.__BOKEMO_AFK_TRANSFER_PROFILE__ = runProfile();
