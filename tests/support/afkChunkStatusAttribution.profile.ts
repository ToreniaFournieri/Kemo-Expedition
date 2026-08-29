import { getApproxAfkCycleDurationMs } from '../../src/game/afkScheduler.ts';
import { createAfkPartyChunkWorkerState } from '../../src/game/afkChunkCoordinator.ts';
import { withBattleSeedSourceForTesting } from '../../src/game/battleSeedSource.ts';
import { withGameplayRandomSourceForTesting } from '../../src/game/gameplayRandom.ts';
import { serializeGameState } from '../../src/game/saveCodec.ts';
import { simulateAfkPartyChunkForWorker } from '../../src/hooks/useGameState.ts';
import { setLanguage } from '../../src/i18n/index.ts';
import type { GameState } from '../../src/types.ts';
import { loadAndValidateExpedition8Fixture } from './expedition8SaveFixture.ts';

declare const __PROFILE_SAMPLE_COUNT__: number;
declare const __PROFILE_WARMUP_COUNT__: number;

type Candidate = 'all' | 'target';
const DEV_CYCLE_DURATION_SCALE = 0.05;
const SIMULATED_END_AT = Date.UTC(2026, 7, 16);

function createSeededRandom(seed: number): () => number {
  let value = seed >>> 0 || 0x9e3779b9;
  return () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return (value >>> 0) / 0x1_0000_0000;
  };
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

function runCandidate(state: GameState, candidate: Candidate) {
  const durations: number[] = [];
  const serializedResults: string[] = [];
  state.parties.forEach((party, partyIndex) => {
    const workerState = createAfkPartyChunkWorkerState(state, partyIndex);
    const cycleDurationMs = getApproxAfkCycleDurationMs(party, DEV_CYCLE_DURATION_SCALE);
    let seedCursor = 0n;
    const startedAt = performance.now();
    const resultState = withBattleSeedSourceForTesting(
      () => (BigInt(0xaf000000 + partyIndex) << 32n) | seedCursor++,
      () => withGameplayRandomSourceForTesting(
        createSeededRandom(0xaf000000 + partyIndex),
        () => simulateAfkPartyChunkForWorker(workerState, {
          partyIndex,
          cycleDurationMs,
          simulatedCompletedAt: SIMULATED_END_AT,
          cycleDurationScale: DEV_CYCLE_DURATION_SCALE,
          gameMode: 'm.kemo',
          chunkStatusScope: candidate,
        }),
      ),
    );
    durations.push(performance.now() - startedAt);
    serializedResults.push(JSON.stringify(serializeGameState(resultState)));
  });
  return {
    totalMs: durations.reduce((total, value) => total + value, 0),
    slowestPartyMs: Math.max(...durations),
    partyMs: durations,
    serializedResults,
  };
}

setLanguage('ja');
const { state, identity } = loadAndValidateExpedition8Fixture();
const measured: Record<Candidate, ReturnType<typeof runCandidate>[]> = { all: [], target: [] };
for (let sampleIndex = -__PROFILE_WARMUP_COUNT__; sampleIndex < __PROFILE_SAMPLE_COUNT__; sampleIndex += 1) {
  const order: Candidate[] = sampleIndex % 2 === 0 ? ['all', 'target'] : ['target', 'all'];
  const pair: Partial<Record<Candidate, ReturnType<typeof runCandidate>>> = {};
  order.forEach((candidate) => { pair[candidate] = runCandidate(state, candidate); });
  if (JSON.stringify(pair.all!.serializedResults) !== JSON.stringify(pair.target!.serializedResults)) {
    throw new Error(`AFK target-only Chunk status changed a result in sample ${sampleIndex}`);
  }
  if (sampleIndex >= 0) {
    measured.all.push(pair.all!);
    measured.target.push(pair.target!);
  }
}

const pairedTotalImprovement = measured.all.map((sample, sampleIndex) => (
  (1 - measured.target[sampleIndex]!.totalMs / sample.totalMs) * 100
));
const pairedSlowestImprovement = measured.all.map((sample, sampleIndex) => (
  (1 - measured.target[sampleIndex]!.slowestPartyMs / sample.slowestPartyMs) * 100
));

process.stdout.write(`${JSON.stringify({
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  fixture: identity,
  sampling: {
    warmups: __PROFILE_WARMUP_COUNT__,
    measuredSamples: __PROFILE_SAMPLE_COUNT__,
    candidateOrder: 'alternating-within-sample',
  },
  validation: { serializedWorkerStatesByteIdenticalEverySample: true },
  candidates: Object.fromEntries((['all', 'target'] as const).map((candidate) => [candidate, {
    sixPartyCpuSumMs: distribution(measured[candidate].map((sample) => sample.totalMs)),
    slowestPartyMs: distribution(measured[candidate].map((sample) => sample.slowestPartyMs)),
    partyMs: state.parties.map((party, partyIndex) => ({
      partyId: party.id,
      duration: distribution(measured[candidate].map((sample) => sample.partyMs[partyIndex] ?? 0)),
    })),
  }])),
  pairedImprovementPercent: {
    sixPartyCpuSumMs: distribution(pairedTotalImprovement),
    slowestPartyMs: distribution(pairedSlowestImprovement),
  },
}, null, 2)}\n`);
