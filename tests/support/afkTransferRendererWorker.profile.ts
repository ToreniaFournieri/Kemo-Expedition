/// <reference lib="webworker" />

import {
  createAfkPartyChunkResult,
  createAfkPartyChunkWorkerResult,
  createAfkPartyChunkWorkerResultV3,
  hydrateAfkPartyChunkContinuationWorkerState,
  type AfkPartyChunkJob,
  type AfkPartyChunkWorkerJob,
} from '../../src/game/afkChunkCoordinator.ts';
import { withBattleSeedSourceForTesting } from '../../src/game/battleSeedSource.ts';
import { withGameplayRandomSourceForTesting } from '../../src/game/gameplayRandom.ts';
import {
  getAfkInventoryDeltaForState,
  simulateAfkPartyChunkForWorker,
} from '../../src/hooks/useGameState.ts';
import { ensureLanguageLoaded } from '../../src/i18n/index.ts';
import { withItemLookupStrategyForTesting } from '../../src/data/items.ts';
import { materializeAfkCompactInventoryCandidateDelta } from './afkCompactInventoryCandidate.ts';

declare const self: DedicatedWorkerGlobalScope;

type Candidate = 'full' | 'build62' | 'build71' | 'build72' | 'linear' | 'production' | 'continuation';
const epochNow = () => performance.timeOrigin + performance.now();
const retainedParties = new Map<number, { party: import('../../src/types.ts').Party; stateToken: string; revision: number }>();

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
  job: AfkPartyChunkJob | AfkPartyChunkWorkerJob;
}>) => {
  const { candidate, correlationId, job } = event.data;
  const receivedAt = epochNow();
  try {
    const baseState = candidate === 'continuation' && 'transferKind' in job && job.transferKind === 'continuation'
      ? (() => {
        const retained = retainedParties.get(job.partyId);
        if (!retained) throw new Error('AFK continuation state mismatch');
        return hydrateAfkPartyChunkContinuationWorkerState(job, retained.party, retained.stateToken, retained.revision);
      })()
      : job.baseState;
    await ensureLanguageLoaded(baseState.global.language);
    let seedCursor = 0n;
    const computeStartedAt = epochNow();
    const resultState = withItemLookupStrategyForTesting(candidate === 'linear' ? 'linear' : 'indexed', () => (
      withBattleSeedSourceForTesting(
        () => (BigInt(0xaf000000 + job.partyIndex) << 32n) | seedCursor++,
        () => withGameplayRandomSourceForTesting(
          createSeededRandom(0xaf000000 + job.partyIndex),
          () => simulateAfkPartyChunkForWorker(baseState, {
            partyIndex: job.partyIndex,
            cycleDurationMs: job.cycleDurationMs,
            simulatedCompletedAt: job.simulatedCompletedAt,
            cycleDurationScale: job.cycleDurationScale,
            gameMode: job.gameMode,
            chunkStatusScope: candidate === 'full' || candidate === 'build62' ? 'all' : 'target',
            inventoryStrategy: candidate === 'full' || candidate === 'build62' || candidate === 'build71' ? 'immutable' : 'overlay',
          }),
        ),
      )
    ));
    const inventoryDelta = getAfkInventoryDeltaForState(resultState);
    const completeResult = createAfkPartyChunkResult(
      { ...job, baseState },
      resultState,
      0,
      {},
      candidate === 'production' || candidate === 'linear'
        ? materializeAfkCompactInventoryCandidateDelta(inventoryDelta!)
        : inventoryDelta,
    );
    const result = candidate === 'continuation' && 'transferKind' in job
      ? (() => {
        retainedParties.set(job.partyId, {
          party: resultState.parties[job.partyIndex],
          stateToken: job.nextStateToken,
          revision: job.reconciliationRevision,
        });
        return createAfkPartyChunkWorkerResultV3(completeResult, {
          consumedStateToken: job.transferKind === 'continuation' ? job.retainedStateToken : null,
          nextStateToken: job.nextStateToken,
          reconciliationRevision: job.reconciliationRevision,
        });
      })()
      : candidate === 'production' || candidate === 'linear' || candidate === 'build71' || candidate === 'build72'
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
