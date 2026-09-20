import { AFK_CHUNK_CYCLE_COUNT, compareAfkPartyDispatchCandidates, getAfkChunkOperationCount } from '../../game/afkChunkCoordinator';
import { getApproxAfkCycleDurationMs, getEffectiveAfkElapsedMs } from '../../game/afkScheduler';
import { simulateAfkPartyChunkForWorker } from '../../hooks/useGameState';
import type { GameState } from '../../types';

// SpecRef: 9.1.4.4 | Atomic progression across multiple Chunks

export interface ApiV1ElapsedProgressionOptions {
  simulatedAt: number;
  realNow: number;
  gameMode: 'mode.normal' | 'mode.orca';
  enemyLevelOffset: number;
  cycleDurationScale: number;
  applyAutoEquipment: (state: GameState, partyIndex: number, characterId: number | undefined, forceFull: boolean) => GameState;
  yieldBetweenChunks?: () => Promise<void>;
  afterChunk?: (completedChunks: number, totalChunks: number, stagedState: GameState) => void | Promise<void>;
  runWithRandom: <T>(operation: () => T) => T;
  maximumElapsedSeconds?: number;
  allowExtendedElapsedSeconds?: boolean;
}

export interface ApiV1ElapsedProgressionResult {
  state: GameState;
  simulatedAt: number;
  data: Record<string, unknown>;
  chunkCount: number;
}

function resolveRequestedElapsedSeconds(parameters: Record<string, unknown>, simulatedAt: number, realNow: number, allowExtendedElapsedSeconds: boolean, maximumElapsedSeconds: number): number {
  if (parameters.elapsedSeconds !== undefined) {
    const elapsedSeconds = Number(parameters.elapsedSeconds);
    if (!Number.isInteger(elapsedSeconds) || elapsedSeconds < 60 || elapsedSeconds > (allowExtendedElapsedSeconds ? maximumElapsedSeconds : 43_200)) throw new Error('invalid_elapsed');
    return elapsedSeconds;
  }
  if (parameters.calculateToRealTime === true) return Math.max(0, Math.floor((realNow - simulatedAt) / 1_000));
  return 0;
}

/**
 * Runs all logical Chunks against a private snapshot. The caller owns the single final persistence/publication.
 * A thrown error discards the local staged state and therefore cannot expose an intermediate Chunk.
 */
export async function stageApiV1ElapsedProgression(
  state: GameState,
  parameters: Record<string, unknown>,
  options: ApiV1ElapsedProgressionOptions,
): Promise<ApiV1ElapsedProgressionResult> {
  const maximumElapsedSeconds = Math.max(0, Math.floor(options.maximumElapsedSeconds ?? 43_200));
  const requestedElapsedSeconds = resolveRequestedElapsedSeconds(parameters, options.simulatedAt, options.realNow, options.allowExtendedElapsedSeconds === true, maximumElapsedSeconds);
  const acceptedElapsedSeconds = requestedElapsedSeconds;
  const cappedElapsedSeconds = Math.min(maximumElapsedSeconds, acceptedElapsedSeconds);
  const effectiveElapsedMs = getEffectiveAfkElapsedMs(cappedElapsedSeconds * 1_000);
  const elapsedSeconds = Math.floor(effectiveElapsedMs / 1_000);
  const simulatedAt = options.simulatedAt + (cappedElapsedSeconds * 1_000);
  let stagedState = state;
  const remainingMsByParty = stagedState.parties.map(() => effectiveElapsedMs);
  const estimatedChunkCount = stagedState.parties.reduce((total, party) => {
    const durationMs = getApproxAfkCycleDurationMs(party, options.cycleDurationScale);
    return total + Math.ceil(Math.floor(effectiveElapsedMs / durationMs) / AFK_CHUNK_CYCLE_COUNT);
  }, 0);
  let chunkCount = 0;

  while (true) {
    const candidate = stagedState.parties.map((party, partyIndex) => {
      const cycleDurationMs = getApproxAfkCycleDurationMs(party, options.cycleDurationScale);
      const remainingMs = remainingMsByParty[partyIndex] ?? 0;
      const operationCount = getAfkChunkOperationCount(remainingMs, cycleDurationMs);
      return operationCount > 0 ? {
        partyId: party.id,
        partyIndex,
        partyLocalEmulatedTime: simulatedAt - remainingMs,
        remainingMs,
        cycleDurationMs,
        operationCount,
      } : null;
    }).filter((entry): entry is NonNullable<typeof entry> => entry !== null)
      .sort(compareAfkPartyDispatchCandidates)[0];
    if (!candidate) break;
    if (chunkCount > 0) await options.yieldBetweenChunks?.();
    const chunkElapsedMs = candidate.cycleDurationMs * candidate.operationCount;
    const simulatedCompletedAt = simulatedAt - candidate.remainingMs + chunkElapsedMs;
    stagedState = options.runWithRandom(() => {
      let next = simulateAfkPartyChunkForWorker(stagedState, {
        partyIndex: candidate.partyIndex,
        cycleDurationMs: candidate.cycleDurationMs,
        simulatedCompletedAt,
        cycleDurationScale: options.cycleDurationScale,
        gameMode: options.gameMode,
        enemyLevelOffset: options.enemyLevelOffset,
        operationCount: candidate.operationCount,
        inventoryStrategy: 'immutable',
        workerOptimization: 'optimized',
        compactBattleResultOutput: false,
      });
      next = options.applyAutoEquipment(next, candidate.partyIndex, undefined, false);
      return next;
    });
    remainingMsByParty[candidate.partyIndex] = Math.max(0, candidate.remainingMs - chunkElapsedMs);
    chunkCount += 1;
    await options.afterChunk?.(chunkCount, Math.max(estimatedChunkCount, chunkCount), stagedState);
  }

  return {
    state: stagedState,
    simulatedAt,
    chunkCount,
    data: {
      requestedElapsedSeconds,
      acceptedElapsedSeconds,
      cappedElapsedSeconds,
      elapsedSeconds,
      inGameTime: new Date(simulatedAt).toISOString(),
    },
  };
}
