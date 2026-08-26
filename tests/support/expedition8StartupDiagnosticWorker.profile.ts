/// <reference lib="webworker" />

import { createAfkPartyChunkResult, type AfkPartyChunkJob } from '../../src/game/afkChunkCoordinator.ts';
import { simulateAfkPartyChunkForWorker } from '../../src/hooks/useGameState.ts';
import { ensureLanguageLoaded } from '../../src/i18n/index.ts';

declare const self: DedicatedWorkerGlobalScope;

const epochNow = () => performance.timeOrigin + performance.now();

self.postMessage({ type: 'ready', workerModuleReadyAt: epochNow() });

self.onmessage = async (event: MessageEvent<{
  type: 'job';
  correlationId: string;
  mode: 'noop' | 'simulate';
  payload: unknown;
}>) => {
  const handlerEnteredAt = epochNow();
  const { correlationId, mode, payload } = event.data;
  const computeStartedAt = epochNow();
  try {
    let result: unknown = null;
    if (mode === 'simulate') {
      const job = payload as AfkPartyChunkJob;
      await ensureLanguageLoaded(job.baseState.global.language);
      const resultState = simulateAfkPartyChunkForWorker(job.baseState, {
        partyIndex: job.partyIndex,
        cycleDurationMs: job.cycleDurationMs,
        simulatedCompletedAt: job.simulatedCompletedAt,
        cycleDurationScale: job.cycleDurationScale,
        gameMode: job.gameMode,
      });
      result = createAfkPartyChunkResult(job, resultState, 0);
    }
    const computeEndedAt = epochNow();
    const response = { type: 'complete', correlationId, handlerEnteredAt, computeStartedAt, computeEndedAt, result };
    const resultPostStartedAt = epochNow();
    self.postMessage(response);
    const resultPostEndedAt = epochNow();
    self.postMessage({
      type: 'result-post-complete',
      correlationId,
      resultPostStartedAt,
      resultPostEndedAt,
    });
  } catch (error) {
    self.postMessage({
      type: 'error',
      correlationId,
      handlerEnteredAt,
      computeStartedAt,
      failedAt: epochNow(),
      message: error instanceof Error ? error.message : String(error),
    });
  }
};

export {};
