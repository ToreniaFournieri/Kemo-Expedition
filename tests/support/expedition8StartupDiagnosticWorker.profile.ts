/// <reference lib="webworker" />

import { createAfkPartyChunkResult, type AfkPartyChunkJob } from '../../src/game/afkChunkCoordinator.ts';
import { withBattleSeedSourceForTesting } from '../../src/game/battleSeedSource.ts';
import { withGameplayRandomSourceForTesting } from '../../src/game/gameplayRandom.ts';
import { simulateAfkPartyChunkForWorker } from '../../src/hooks/useGameState.ts';
import { ensureLanguageLoaded } from '../../src/i18n/index.ts';

declare const self: DedicatedWorkerGlobalScope;

const epochNow = () => performance.timeOrigin + performance.now();
function createSeededRandom(seed: number): () => number {
  let value = seed >>> 0 || 0x9e3779b9;
  return () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return (value >>> 0) / 0x1_0000_0000;
  };
}

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
      let seedCursor = 0n;
      const resultState = withBattleSeedSourceForTesting(
        () => (BigInt(0xaf000000 + job.partyIndex) << 32n) | seedCursor++,
        () => withGameplayRandomSourceForTesting(
          createSeededRandom(0xaf000000 + job.partyIndex),
          () => simulateAfkPartyChunkForWorker(job.baseState, {
            partyIndex: job.partyIndex,
            cycleDurationMs: job.cycleDurationMs,
            simulatedCompletedAt: job.simulatedCompletedAt,
            cycleDurationScale: job.cycleDurationScale,
            gameMode: job.gameMode,
          }),
        ),
      );
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
