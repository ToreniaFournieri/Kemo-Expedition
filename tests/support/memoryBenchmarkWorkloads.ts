import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getApproxAfkCycleDurationMs, getEffectiveAfkElapsedMs } from '../../src/game/afkScheduler.ts';
import { createAfkPartyChunkResult, AFK_CHUNK_CYCLE_COUNT } from '../../src/game/afkChunkCoordinator.ts';
import { simulateAfkPartyChunkForWorker, simulateApiSortieBatchForTesting, simulateExpeditionRuns } from '../../src/hooks/useGameState.ts';
import { hydrateGameState } from '../../src/game/saveCodec.ts';
import { decodePersistedState } from '../../src/game/storageCompression.ts';
import type { GameState } from '../../src/types.ts';

type Observe = () => void;

function loadSampleState(): GameState {
  const envelope = JSON.parse(readFileSync(resolve('sample_savedata/ALL_Exp8_v0.9.3_dev_20260816.kemoz'), 'utf8')) as { saveDataCompressed: string };
  return hydrateGameState(JSON.parse(decodePersistedState(envelope.saveDataCompressed)) as GameState);
}

const delay = (milliseconds: number) => new Promise<void>((resolveDelay) => setTimeout(resolveDelay, milliseconds));

export function measureAfkEnvelopeBytes(): { legacyBytes: number; compactBytes: number } {
  const baseState = loadSampleState();
  const partyIndex = 0;
  const party = baseState.parties[partyIndex];
  const cycleDurationMs = getApproxAfkCycleDurationMs(party, 0.05);
  const job = {
    jobId: 'memory-envelope-comparison',
    partyIndex,
    partyId: party.id,
    simulatedStartedAt: Date.UTC(2026, 7, 25),
    simulatedCompletedAt: Date.UTC(2026, 7, 25) + cycleDurationMs * AFK_CHUNK_CYCLE_COUNT,
    cycleDurationMs,
    baseState,
    gameMode: 'm.kemo' as const,
    cycleDurationScale: 0.05,
  };
  const resultState = simulateAfkPartyChunkForWorker(baseState, {
    partyIndex,
    cycleDurationMs,
    simulatedCompletedAt: job.simulatedCompletedAt,
    cycleDurationScale: 0.05,
    gameMode: 'm.kemo',
  });
  const compact = createAfkPartyChunkResult(job, resultState, 0);
  const legacy = { ...job, baseState, resultState, durationMs: 0 };
  return {
    legacyBytes: Buffer.byteLength(JSON.stringify(legacy)),
    compactBytes: Buffer.byteLength(JSON.stringify(compact)),
  };
}

export async function runMemoryWorkload(name: string, smoke: boolean, observe: Observe): Promise<void> {
  if (name === 'idle') {
    const end = Date.now() + (smoke ? 50 : 30 * 60_000);
    while (Date.now() < end) {
      await delay(smoke ? 10 : 5_000);
      observe();
    }
    return;
  }

  if (name === 'pane-switching') {
    const files = [
      'public/background/PT1.png',
      'public/background/Shop.png',
      'public/background/Felis.png',
      'public/chibi/C_1_Caninian_Male.png',
    ];
    const iterations = smoke ? 12 : 1_000;
    for (let index = 0; index < iterations; index += 1) {
      const activePaneAssets = files.map((file) => readFileSync(resolve(file)));
      if (activePaneAssets.length !== files.length) throw new Error('asset_load_failed');
      if (index % 10 === 0) observe();
    }
    return;
  }

  let state = loadSampleState();
  if (name === 'afk-24h') {
    const effectiveElapsedMs = getEffectiveAfkElapsedMs(24 * 60 * 60_000);
    const chunkTargets = state.parties.map((party) => {
      const cycleDurationMs = getApproxAfkCycleDurationMs(party, 0.05);
      return smoke ? 1 : Math.floor(effectiveElapsedMs / (cycleDurationMs * 12));
    });
    const chunks = Math.max(...chunkTargets);
    for (let chunk = 0; chunk < chunks; chunk += 1) {
      for (let partyIndex = 0; partyIndex < state.parties.length; partyIndex += 1) {
        if (chunk >= chunkTargets[partyIndex]) continue;
        const cycleDurationMs = getApproxAfkCycleDurationMs(state.parties[partyIndex], 0.05);
        state = simulateAfkPartyChunkForWorker(state, {
          partyIndex,
          cycleDurationMs,
          simulatedCompletedAt: Date.UTC(2026, 7, 25) + chunk * cycleDurationMs * 12,
          cycleDurationScale: 0.05,
          gameMode: 'm.kemo',
        });
      }
      observe();
    }
    return;
  }

  if (name === 'simulation-100') {
    const repetitions = smoke ? 1 : 100;
    for (let index = 0; index < repetitions; index += 1) {
      await simulateExpeditionRuns(state, 0, 'm.kemo', 100);
      observe();
    }
    return;
  }

  const durationMs = smoke ? 100 : name === 'x100' ? 30 * 60_000 : 60 * 60_000;
  const count = name === 'x100' ? 100 : 1;
  const end = Date.now() + durationMs;
  while (Date.now() < end) {
    const batch = simulateApiSortieBatchForTesting(state, 0, count, 'm.kemo', Date.now());
    state = batch.state;
    observe();
    if (name === 'normal-play') await delay(smoke ? 5 : 1_000);
  }
}
