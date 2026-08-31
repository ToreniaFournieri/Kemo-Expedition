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
import { withBattleSeedSourceForTesting } from '../game/battleSeedSource';
import { withGameplayRandomSourceForTesting } from '../game/gameplayRandom';
import { beginBattleKernelMeasurement, endBattleKernelMeasurement } from '../game/battleKernel';
import { beginBattleRuntimeAttribution, endBattleRuntimeAttribution } from '../game/battleCandidate';
import { getProductionBattleTelemetry, resetProductionBattleTelemetryForTesting } from '../game/battle';

declare const self: DedicatedWorkerGlobalScope;

let retainedInventory: InventoryRecord | null = null;
let retainedInventoryToken: string | null = null;
let retainedInventoryRevision = 0;

function createProfileRandom(seed: number): () => number {
  let value = seed >>> 0 || 0x9e3779b9;
  return () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return (value >>> 0) / 0x1_0000_0000;
  };
}

self.onmessage = async (event: MessageEvent<AfkPartyChunkInventoryWorkerJob>) => {
  const job = event.data;
  const receivedAt = performance.now();
  const receivedAtEpoch = performance.timeOrigin + receivedAt;
  try {
    const hydrationStartedAt = performance.now();
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
    const hydrationCompletedAt = performance.now();
    await ensureLanguageLoaded(baseState.global.language);
    const languageReadyAt = performance.now();
    const executionStartedAt = performance.now();
    if (__AFK_LIVE_PROFILE_ENABLED__) {
      resetProductionBattleTelemetryForTesting();
      beginBattleRuntimeAttribution();
      beginBattleKernelMeasurement();
    }
    self.postMessage({ type: 'started', jobId: job.jobId, partyIndex: job.partyIndex });
    const simulate = () => simulateAfkPartyChunkForWorker(baseState, {
      partyIndex: job.partyIndex,
      cycleDurationMs: job.cycleDurationMs,
      simulatedCompletedAt: job.simulatedCompletedAt,
      cycleDurationScale: job.cycleDurationScale,
      gameMode: job.gameMode,
      operationCount: job.operationCount,
      workerOptimization: job.workerOptimization,
      compactBattleResultOutput: job.compactBattleResultOutput,
      onProgress: (completedOperations, operationCount) => {
        self.postMessage({ type: 'progress', jobId: job.jobId, partyIndex: job.partyIndex, completedOperations, operationCount });
      },
    });
    let battleSeedCursor = 0n;
    const profileSeed = (0xafc0_0000 ^ Math.floor(job.simulatedStartedAt) ^ (job.partyIndex << 12)) >>> 0;
    const resultState = __AFK_LIVE_PROFILE_ENABLED__
      ? withBattleSeedSourceForTesting(
        () => (BigInt(profileSeed) << 32n) | battleSeedCursor++,
        () => withGameplayRandomSourceForTesting(createProfileRandom(profileSeed), simulate),
      )
      : simulate();
    const battleRuntime = __AFK_LIVE_PROFILE_ENABLED__
      ? endBattleRuntimeAttribution()
      : { executionMs: 0, preparationMs: 0 };
    const battleKernel = __AFK_LIVE_PROFILE_ENABLED__
      ? endBattleKernelMeasurement()
      : null;
    const battleTelemetry = getProductionBattleTelemetry();
    const completedAt = performance.now();
    const completeResult = createAfkPartyChunkResult({ ...job, baseState }, resultState, Math.max(0, completedAt - receivedAt), {
      workerStartupMs: job.isFirstWorkerJob && job.workerCreatedAt !== undefined
        ? receivedAtEpoch - job.workerCreatedAt
        : 0,
      queueMs: job.queuedAt === undefined ? 0 : receivedAtEpoch - job.queuedAt,
      inputHydrationMs: hydrationCompletedAt - hydrationStartedAt,
      languageReadyMs: languageReadyAt - hydrationCompletedAt,
      executionMs: completedAt - executionStartedAt,
      battleCount: __AFK_LIVE_PROFILE_ENABLED__ ? battleTelemetry.battles : 0,
      battleTotalMs: battleRuntime.executionMs,
      battlePreparationMs: battleRuntime.preparationMs,
      battleInputWriteMs: battleKernel?.inputWriteMs ?? 0,
      battleNativeExecutionMs: battleKernel?.nativeExecutionMs ?? 0,
      battleBorrowedOutputValidationMs: battleKernel?.borrowedOutputValidationMs ?? 0,
      battleOutputConsumeMs: battleKernel?.outputConsumeMs ?? 0,
      battleInputBytes: battleKernel?.inputBytes ?? 0,
      battleOutputBytes: battleKernel?.outputBytes ?? 0,
      battleResultBagEntryAllocations: battleKernel?.resultBagEntryObjectAllocations ?? 0,
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
