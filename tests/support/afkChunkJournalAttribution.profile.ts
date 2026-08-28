import { getApproxAfkCycleDurationMs } from '../../src/game/afkScheduler.ts';
import {
  commitAfkPartyChunk,
  compareAfkChunkResults,
  createAfkPartyChunkResult,
  createAfkPartyChunkWorkerResult,
  createAfkPartyChunkWorkerState,
  hydrateAfkPartyChunkResult,
} from '../../src/game/afkChunkCoordinator.ts';
import { withBattleSeedSourceForTesting } from '../../src/game/battleSeedSource.ts';
import { withGameplayRandomSourceForTesting } from '../../src/game/gameplayRandom.ts';
import {
  getAfkInventoryDeltaForState,
  simulateAfkPartyChunkForWorker,
} from '../../src/hooks/useGameState.ts';
import { setLanguage } from '../../src/i18n/index.ts';
import type { GameState } from '../../src/types.ts';
import { loadAndValidateExpedition8Fixture } from './expedition8SaveFixture.ts';

declare const __PROFILE_SAMPLE_COUNT__: number;
declare const __PROFILE_WARMUP_COUNT__: number;

type Candidate = 'legacy' | 'diary-journal' | 'inventory-overlay' | 'combined';

const CANDIDATES: Candidate[] = ['legacy', 'diary-journal', 'inventory-overlay', 'combined'];
const DEV_CYCLE_DURATION_SCALE = 0.05;
const SIMULATED_END_AT = Date.UTC(2026, 7, 16);
const BACKLOG_WAVES = 3;

function createSeededRandom(seed: number): () => number {
  let value = seed >>> 0 || 0x9e3779b9;
  return () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return (value >>> 0) / 0x1_0000_0000;
  };
}

function utf8Bytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function nearestRank(values: number[], ratio: number): number {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.max(0, Math.ceil(ordered.length * ratio) - 1)] ?? 0;
}

function distribution(values: number[]) {
  return {
    samples: values.length,
    minimum: Math.min(...values),
    p50: nearestRank(values, 0.5),
    p95: nearestRank(values, 0.95),
    maximum: Math.max(...values),
  };
}

function rotate<T>(values: readonly T[], offset: number): T[] {
  const normalized = ((offset % values.length) + values.length) % values.length;
  return [...values.slice(normalized), ...values.slice(0, normalized)];
}

function runCandidate(state: GameState, candidate: Candidate) {
  const historyStrategy = candidate === 'legacy' || candidate === 'inventory-overlay' ? 'full' : 'placeholders';
  const inventoryStrategy = candidate === 'legacy' || candidate === 'diary-journal' ? 'immutable' : 'overlay';
  const inputBytes: number[] = [];
  const outputBytes: number[] = [];
  const partyMs: number[] = [];
  const hydratedResults: string[] = [];
  let finalState = state;

  for (let waveIndex = 0; waveIndex < BACKLOG_WAVES; waveIndex += 1) {
    const waveBaseState = finalState;
    const waveResults = waveBaseState.parties.map((party, partyIndex) => {
      const baseState = createAfkPartyChunkWorkerState(waveBaseState, partyIndex, historyStrategy);
      inputBytes.push(utf8Bytes(baseState));
      const cycleDurationMs = getApproxAfkCycleDurationMs(party, DEV_CYCLE_DURATION_SCALE);
      let seedCursor = 0n;
      const startedAt = performance.now();
      const resultState = withBattleSeedSourceForTesting(
        () => (BigInt(0xaf720000 + partyIndex) << 32n) | seedCursor++,
        () => withGameplayRandomSourceForTesting(
          createSeededRandom(0xaf720000 + partyIndex),
          () => simulateAfkPartyChunkForWorker(baseState, {
            partyIndex,
            cycleDurationMs,
            simulatedCompletedAt: SIMULATED_END_AT + waveIndex * cycleDurationMs * 12,
            cycleDurationScale: DEV_CYCLE_DURATION_SCALE,
            gameMode: 'm.kemo',
            inventoryStrategy,
          }),
        ),
      );
      const complete = createAfkPartyChunkResult({
        jobId: `journal-${waveIndex}-${party.id}`,
        partyIndex,
        partyId: party.id,
        simulatedStartedAt: SIMULATED_END_AT + (waveIndex - 1) * cycleDurationMs * 12,
        simulatedCompletedAt: SIMULATED_END_AT + waveIndex * cycleDurationMs * 12,
        cycleDurationMs,
        operationCount: 12,
        baseState,
        gameMode: 'm.kemo',
        cycleDurationScale: DEV_CYCLE_DURATION_SCALE,
      }, resultState, 0, {}, getAfkInventoryDeltaForState(resultState));
      const workerResult = createAfkPartyChunkWorkerResult(complete);
      partyMs.push(performance.now() - startedAt);
      outputBytes.push(utf8Bytes(workerResult));
      const hydrated = hydrateAfkPartyChunkResult(workerResult, waveBaseState.parties[partyIndex]!);
      hydratedResults.push(JSON.stringify(hydrated));
      return hydrated;
    }).sort(compareAfkChunkResults);
    waveResults.forEach((result) => { finalState = commitAfkPartyChunk(finalState, result); });
  }

  return {
    cpuMs: partyMs.reduce((total, value) => total + value, 0),
    slowestPartyMs: Math.max(...partyMs),
    inputBytes: inputBytes.reduce((total, value) => total + value, 0),
    outputBytes: outputBytes.reduce((total, value) => total + value, 0),
    hydratedResults,
    finalStateJson: JSON.stringify(finalState),
  };
}

setLanguage('ja');
const { state, identity } = loadAndValidateExpedition8Fixture();
const measured = Object.fromEntries(CANDIDATES.map((candidate) => [candidate, []])) as Record<Candidate, ReturnType<typeof runCandidate>[]>;

for (let sampleIndex = -__PROFILE_WARMUP_COUNT__; sampleIndex < __PROFILE_SAMPLE_COUNT__; sampleIndex += 1) {
  const pair: Partial<Record<Candidate, ReturnType<typeof runCandidate>>> = {};
  rotate(CANDIDATES, sampleIndex).forEach((candidate) => { pair[candidate] = runCandidate(state, candidate); });
  const oracle = pair.legacy!.hydratedResults;
  CANDIDATES.forEach((candidate) => {
    if (JSON.stringify(pair[candidate]!.hydratedResults) !== JSON.stringify(oracle)) {
      const actual = JSON.stringify(pair[candidate]!.hydratedResults);
      const expected = JSON.stringify(oracle);
      let offset = 0;
      while (offset < actual.length && actual[offset] === expected[offset]) offset += 1;
      throw new Error(`${candidate} changed a hydrated AFK result in sample ${sampleIndex} at ${offset}: ${expected.slice(offset, offset + 240)} != ${actual.slice(offset, offset + 240)}`);
    }
    if (pair[candidate]!.finalStateJson !== pair.legacy!.finalStateJson) {
      const actual = pair[candidate]!.finalStateJson;
      const expected = pair.legacy!.finalStateJson;
      let offset = 0;
      while (offset < actual.length && actual[offset] === expected[offset]) offset += 1;
      throw new Error(`${candidate} changed final AFK state in sample ${sampleIndex} at ${offset}: ${expected.slice(offset, offset + 240)} != ${actual.slice(offset, offset + 240)}`);
    }
    if (sampleIndex >= 0) measured[candidate].push({
      ...pair[candidate]!,
      hydratedResults: [],
      finalStateJson: '',
    });
  });
}

const legacy = measured.legacy;
const improvement = (candidate: Candidate, field: 'cpuMs' | 'slowestPartyMs' | 'inputBytes') => (
  legacy.map((sample, index) => (1 - measured[candidate][index]![field] / sample[field]) * 100)
);

process.stdout.write(`${JSON.stringify({
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  fixture: identity,
  sampling: {
    warmups: __PROFILE_WARMUP_COUNT__, samples: __PROFILE_SAMPLE_COUNT__, backlogWaves: BACKLOG_WAVES, candidateOrder: 'rotating',
  },
  validation: { hydratedResultsByteIdenticalEverySample: true, finalStateByteIdenticalEverySample: true },
  candidates: Object.fromEntries(CANDIDATES.map((candidate) => [candidate, {
    cpuMs: distribution(measured[candidate].map((sample) => sample.cpuMs)),
    slowestPartyMs: distribution(measured[candidate].map((sample) => sample.slowestPartyMs)),
    inputBytes: distribution(measured[candidate].map((sample) => sample.inputBytes)),
    outputBytes: distribution(measured[candidate].map((sample) => sample.outputBytes)),
    pairedImprovementPercent: {
      cpuMs: distribution(improvement(candidate, 'cpuMs')),
      slowestPartyMs: distribution(improvement(candidate, 'slowestPartyMs')),
      inputBytes: distribution(improvement(candidate, 'inputBytes')),
    },
  }])),
}, null, 2)}\n`);
