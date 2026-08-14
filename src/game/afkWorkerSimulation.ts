import { setColosseumSimulationSettingsOverride } from './colosseum';
import { gameReducer } from '../hooks/useGameState';
import { setLanguage } from '../i18n';
import type { AfkWorkerChunkRequest, AfkWorkerChunkSuccess } from './afkWorkerProtocol';

function createSeededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6D2B79F5) >>> 0;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 0x1_0000_0000;
  };
}

export function simulateAfkWorkerChunk(request: AfkWorkerChunkRequest): AfkWorkerChunkSuccess {
  const startedAt = performance.now();
  const originalRandom = Math.random;
  setLanguage(request.language);
  setColosseumSimulationSettingsOverride(request.colosseumSettings);
  Math.random = createSeededRandom(request.randomSeed);

  try {
    const state = gameReducer(request.state, {
      type: 'SIMULATE_AFK',
      elapsedMs: request.elapsedMs,
      isAutoRepeatEnabled: true,
      gameMode: request.gameMode,
      simulatedEndAt: request.simulatedEndAt,
      cycleDurationScale: request.cycleDurationScale,
      cycleDurationByParty: request.cycleDurationByParty,
      operationStart: request.operationStart,
      operationCount: request.operationCount,
      finalizeChunk: request.operationStart + request.operationCount >= request.totalOperationCount,
    });

    return {
      schemaVersion: 1,
      requestId: request.requestId,
      ok: true,
      state,
      operationStart: request.operationStart,
      operationCount: request.operationCount,
      totalOperationCount: request.totalOperationCount,
      randomSeed: request.randomSeed,
      durationMs: Math.max(0, performance.now() - startedAt),
    };
  } finally {
    Math.random = originalRandom;
    setColosseumSimulationSettingsOverride(null);
  }
}
