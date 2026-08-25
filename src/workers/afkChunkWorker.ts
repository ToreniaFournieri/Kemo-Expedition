/// <reference lib="webworker" />

import { simulateAfkPartyChunkForWorker } from '../hooks/useGameState';
import { createAfkPartyChunkResult, type AfkPartyChunkJob } from '../game/afkChunkCoordinator';
import { ensureLanguageLoaded } from '../i18n';

declare const self: DedicatedWorkerGlobalScope;

self.onmessage = async (event: MessageEvent<AfkPartyChunkJob>) => {
  const job = event.data;
  const receivedAt = performance.now();
  try {
    await ensureLanguageLoaded(job.baseState.global.language);
    const executionStartedAt = performance.now();
    self.postMessage({ type: 'started', jobId: job.jobId, partyIndex: job.partyIndex });
    const resultState = simulateAfkPartyChunkForWorker(job.baseState, {
      partyIndex: job.partyIndex,
      cycleDurationMs: job.cycleDurationMs,
      simulatedCompletedAt: job.simulatedCompletedAt,
      cycleDurationScale: job.cycleDurationScale,
      gameMode: job.gameMode,
    });
    const completedAt = performance.now();
    const result = createAfkPartyChunkResult(job, resultState, Math.max(0, completedAt - receivedAt), {
      workerStartupMs: job.isFirstWorkerJob && job.workerCreatedAt !== undefined
        ? receivedAt - job.workerCreatedAt
        : 0,
      queueMs: job.queuedAt === undefined ? 0 : receivedAt - job.queuedAt,
      executionMs: completedAt - executionStartedAt,
      inputTransferBytes: job.inputTransferBytes,
    });
    result.workerTelemetry.outputTransferBytes = new TextEncoder().encode(JSON.stringify(result)).byteLength;
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
