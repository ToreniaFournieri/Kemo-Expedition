/// <reference lib="webworker" />

import { simulateAfkPartyChunkForWorker } from '../hooks/useGameState';
import { createAfkPartyChunkResult, type AfkPartyChunkJob } from '../game/afkChunkCoordinator';

declare const self: DedicatedWorkerGlobalScope;

self.onmessage = (event: MessageEvent<AfkPartyChunkJob>) => {
  const job = event.data;
  const startedAt = performance.now();
  try {
    const resultState = simulateAfkPartyChunkForWorker(job.baseState, {
      partyIndex: job.partyIndex,
      cycleDurationMs: job.cycleDurationMs,
      simulatedCompletedAt: job.simulatedCompletedAt,
      cycleDurationScale: job.cycleDurationScale,
      gameMode: job.gameMode,
    });
    const result = createAfkPartyChunkResult(job, resultState, Math.max(0, performance.now() - startedAt));
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
