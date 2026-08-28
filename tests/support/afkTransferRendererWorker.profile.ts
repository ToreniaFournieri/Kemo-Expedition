/// <reference lib="webworker" />

import {
  createAfkPartyChunkResult,
  createAfkPartyChunkWorkerResult,
  type AfkPartyChunkJob,
} from '../../src/game/afkChunkCoordinator.ts';
import { withBattleSeedSourceForTesting } from '../../src/game/battleSeedSource.ts';
import { withGameplayRandomSourceForTesting } from '../../src/game/gameplayRandom.ts';
import { simulateAfkPartyChunkForWorker } from '../../src/hooks/useGameState.ts';
import { ensureLanguageLoaded } from '../../src/i18n/index.ts';

declare const self: DedicatedWorkerGlobalScope;

type Candidate = 'full' | 'build62' | 'production';
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

self.onmessage = async (event: MessageEvent<{
  candidate: Candidate;
  correlationId: string;
  job: AfkPartyChunkJob;
}>) => {
  const { candidate, correlationId, job } = event.data;
  const receivedAt = epochNow();
  try {
    await ensureLanguageLoaded(job.baseState.global.language);
    let seedCursor = 0n;
    const computeStartedAt = epochNow();
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
          chunkStatusScope: candidate === 'production' ? 'target' : 'all',
        }),
      ),
    );
    const completeResult = createAfkPartyChunkResult(job, resultState, 0);
    const result = candidate === 'production'
      ? createAfkPartyChunkWorkerResult(completeResult)
      : candidate === 'build62'
        ? (({ baseParty: _baseParty, ...build62Result }) => build62Result)(completeResult)
        : completeResult;
    const computeEndedAt = epochNow();
    const resultPostStartedAt = epochNow();
    self.postMessage({
      type: 'complete',
      candidate,
      correlationId,
      receivedAt,
      computeStartedAt,
      computeEndedAt,
      result,
    });
    const resultPostEndedAt = epochNow();
    self.postMessage({ type: 'post-complete', correlationId, resultPostStartedAt, resultPostEndedAt });
  } catch (error) {
    self.postMessage({
      type: 'error',
      correlationId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};

export {};
