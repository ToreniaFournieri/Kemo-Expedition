/// <reference lib="webworker" />

import { getAfkInventoryDeltaForState, simulateAfkPartyChunkForWorker } from '../hooks/useGameState';
import {
  createAfkPartyChunkResult,
  createAfkPartyChunkInventoryWorkerResult,
  hydrateAfkPartyChunkInventoryWorkerState,
  type AfkPartyChunkInventoryWorkerJob,
} from '../game/afkChunkCoordinator';
import type { InventoryRecord } from '../types';
import { ensureLanguageLoaded } from '../i18n';

declare const self: DedicatedWorkerGlobalScope;

let retainedInventory: InventoryRecord | null = null;
let retainedInventoryToken: string | null = null;
let retainedInventoryRevision = 0;

self.onmessage = async (event: MessageEvent<AfkPartyChunkInventoryWorkerJob>) => {
  const job = event.data;
  const receivedAt = performance.now();
  const receivedAtEpoch = performance.timeOrigin + receivedAt;
  try {
    const hydrated = hydrateAfkPartyChunkInventoryWorkerState(
      job,
      retainedInventory,
      retainedInventoryToken,
      retainedInventoryRevision,
    );
    const baseState = hydrated.state;
    retainedInventory = hydrated.inventory;
    retainedInventoryToken = job.nextInventoryToken;
    retainedInventoryRevision = job.inventoryRevision;
    await ensureLanguageLoaded(baseState.global.language);
    const executionStartedAt = performance.now();
    self.postMessage({ type: 'started', jobId: job.jobId, partyIndex: job.partyIndex });
    const resultState = simulateAfkPartyChunkForWorker(baseState, {
      partyIndex: job.partyIndex,
      cycleDurationMs: job.cycleDurationMs,
      simulatedCompletedAt: job.simulatedCompletedAt,
      cycleDurationScale: job.cycleDurationScale,
      gameMode: job.gameMode,
      operationCount: job.operationCount,
      onProgress: (completedOperations, operationCount) => {
        self.postMessage({ type: 'progress', jobId: job.jobId, partyIndex: job.partyIndex, completedOperations, operationCount });
      },
    });
    const completedAt = performance.now();
    const completeResult = createAfkPartyChunkResult({ ...job, baseState }, resultState, Math.max(0, completedAt - receivedAt), {
      workerStartupMs: job.isFirstWorkerJob && job.workerCreatedAt !== undefined
        ? receivedAtEpoch - job.workerCreatedAt
        : 0,
      queueMs: job.queuedAt === undefined ? 0 : receivedAtEpoch - job.queuedAt,
      executionMs: completedAt - executionStartedAt,
      inputTransferBytes: job.inputTransferBytes,
    }, getAfkInventoryDeltaForState(resultState));
    const result = createAfkPartyChunkInventoryWorkerResult(completeResult, job);
    if (job.inputTransferBytes !== undefined) {
      result.workerTelemetry.outputTransferBytes = new TextEncoder().encode(JSON.stringify(result)).byteLength;
    }
    self.postMessage({ type: 'complete', result });
  } catch (error) {
    self.postMessage({
      type: 'error',
      jobId: job.jobId,
      partyIndex: job.partyIndex,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};

export {};
