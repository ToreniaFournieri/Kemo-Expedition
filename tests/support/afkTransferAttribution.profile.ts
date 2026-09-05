import { createHash } from 'node:crypto';
import { getApproxAfkCycleDurationMs } from '../../src/game/afkScheduler.ts';
import {
  AFK_CHUNK_CYCLE_COUNT,
  commitAfkPartyChunk,
  compareAfkChunkResults,
  createAfkPartyChunkResult,
  createAfkPartyChunkWorkerResult,
  createAfkPartyChunkWorkerState,
  hydrateAfkPartyChunkResult,
  type AfkPartyChunkJob,
  type AfkPartyChunkResult,
} from '../../src/game/afkChunkCoordinator.ts';
import { withBattleSeedSourceForTesting } from '../../src/game/battleSeedSource.ts';
import { withGameplayRandomSourceForTesting } from '../../src/game/gameplayRandom.ts';
import { serializeGameState } from '../../src/game/saveCodec.ts';
import { getAfkInventoryDeltaForState, simulateAfkPartyChunkForWorker } from '../../src/hooks/useGameState.ts';
import { setLanguage } from '../../src/i18n/index.ts';
import type { GameState } from '../../src/types.ts';
import { loadAndValidateExpedition8Fixture } from './expedition8SaveFixture.ts';

const DEV_CYCLE_DURATION_SCALE = 0.05;
const SIMULATED_END_AT = Date.UTC(2026, 7, 16);
const EXPECTED_FINAL_HASH = 'bbc124165873d61ed01670c556510b89cccae8f03dc808aae54233cb5847b544';

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

function propertySizes(value: Record<string, unknown>): Array<{ key: string; bytes: number }> {
  return Object.entries(value)
    .map(([key, entry]) => ({ key, bytes: utf8Bytes(entry) }))
    .sort((left, right) => right.bytes - left.bytes);
}

function canonicalHash(state: GameState): string {
  return createHash('sha256').update(JSON.stringify(serializeGameState(state))).digest('hex');
}

setLanguage('ja');
const { state, identity } = loadAndValidateExpedition8Fixture();
const results: AfkPartyChunkResult[] = state.parties.map((party, partyIndex) => {
  const cycleDurationMs = getApproxAfkCycleDurationMs(party, DEV_CYCLE_DURATION_SCALE);
  const job: AfkPartyChunkJob = {
    jobId: `transfer-attribution-${party.id}`,
    partyIndex,
    partyId: party.id,
    simulatedStartedAt: SIMULATED_END_AT - cycleDurationMs * AFK_CHUNK_CYCLE_COUNT,
    simulatedCompletedAt: SIMULATED_END_AT,
    cycleDurationMs,
    operationCount: AFK_CHUNK_CYCLE_COUNT,
    baseState: state,
    gameMode: 'm.kemo',
    cycleDurationScale: DEV_CYCLE_DURATION_SCALE,
  };
  let seedCursor = 0n;
  const resultState = withBattleSeedSourceForTesting(
    () => (BigInt(0xaf000000 + partyIndex) << 32n) | seedCursor++,
    () => withGameplayRandomSourceForTesting(
      createSeededRandom(0xaf000000 + partyIndex),
      () => simulateAfkPartyChunkForWorker(state, {
        partyIndex,
        cycleDurationMs,
        simulatedCompletedAt: SIMULATED_END_AT,
        cycleDurationScale: DEV_CYCLE_DURATION_SCALE,
        gameMode: 'm.kemo',
      }),
    ),
  );
  return createAfkPartyChunkResult(job, resultState, 0);
}).sort(compareAfkChunkResults);

const compactResults: AfkPartyChunkResult[] = state.parties.map((party, partyIndex) => {
  const workerState = createAfkPartyChunkWorkerState(state, partyIndex);
  const cycleDurationMs = getApproxAfkCycleDurationMs(party, DEV_CYCLE_DURATION_SCALE);
  const job: AfkPartyChunkJob = {
    jobId: `transfer-attribution-${party.id}`,
    partyIndex,
    partyId: party.id,
    simulatedStartedAt: SIMULATED_END_AT - cycleDurationMs * AFK_CHUNK_CYCLE_COUNT,
    simulatedCompletedAt: SIMULATED_END_AT,
    cycleDurationMs,
    operationCount: AFK_CHUNK_CYCLE_COUNT,
    baseState: workerState,
    gameMode: 'm.kemo',
    cycleDurationScale: DEV_CYCLE_DURATION_SCALE,
  };
  let seedCursor = 0n;
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
      }),
    ),
  );
  const completeResult = createAfkPartyChunkResult(job, resultState, 0, {}, getAfkInventoryDeltaForState(resultState));
  return hydrateAfkPartyChunkResult(createAfkPartyChunkWorkerResult(completeResult), state.parties[partyIndex]);
}).sort(compareAfkChunkResults);

const resultBytes = results.map((result) => JSON.stringify(result));
const compactResultBytes = compactResults.map((result) => JSON.stringify(result));
if (JSON.stringify(resultBytes) !== JSON.stringify(compactResultBytes)) {
  const partyIndex = resultBytes.findIndex((value, index) => value !== compactResultBytes[index]);
  const expected = resultBytes[partyIndex] ?? '';
  const actual = compactResultBytes[partyIndex] ?? '';
  let offset = 0;
  while (offset < expected.length && expected[offset] === actual[offset]) offset += 1;
  throw new Error(`Compact AFK worker inputs changed hydrated worker result ${partyIndex} at ${offset}: ${expected.slice(offset, offset + 240)} != ${actual.slice(offset, offset + 240)}`);
}

const finalState = results.reduce((current, result) => commitAfkPartyChunk(current, result), state);
const finalHash = canonicalHash(finalState);
if (finalHash !== EXPECTED_FINAL_HASH) {
  throw new Error(`AFK transfer attribution hash mismatch: expected ${EXPECTED_FINAL_HASH}; observed ${finalHash}`);
}
const compactFinalState = compactResults.reduce((current, result) => commitAfkPartyChunk(current, result), state);
const compactFinalHash = canonicalHash(compactFinalState);
if (compactFinalHash !== EXPECTED_FINAL_HASH) {
  throw new Error(`Compact AFK transfer hash mismatch: expected ${EXPECTED_FINAL_HASH}; observed ${compactFinalHash}`);
}

const resultSizes = results.map((result) => {
  const { baseParty: _baseParty, ...withoutBaseParty } = result;
  const compactWorkerResult = createAfkPartyChunkWorkerResult(
    compactResults.find((candidate) => candidate.partyId === result.partyId)!,
  );
  return {
    partyId: result.partyId,
    completeResultBytes: utf8Bytes(result),
    basePartyBytes: utf8Bytes(result.baseParty),
    resultPartyBytes: utf8Bytes(result.resultParty),
    globalDeltaBytes: utf8Bytes(result.globalDelta),
    resultWithoutBasePartyBytes: utf8Bytes(withoutBaseParty),
    compactHistoryWorkerResultBytes: utf8Bytes(compactWorkerResult),
  };
});

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  fixture: identity,
  validation: {
    deterministicAfkFinalState: true,
    deterministicAfkFinalStateSha256: finalHash,
    compactHydratedResultsByteIdentical: true,
    compactDeterministicAfkFinalStateSha256: compactFinalHash,
  },
  input: {
    completeStateBytes: utf8Bytes(state),
    topLevelPropertyBytes: propertySizes(state as unknown as Record<string, unknown>),
    globalPropertyBytes: propertySizes(state.global as unknown as Record<string, unknown>).slice(0, 20),
    partyBytes: state.parties.map((party) => ({
      partyId: party.id,
      bytes: utf8Bytes(party),
      largestProperties: propertySizes(party as unknown as Record<string, unknown>).slice(0, 12),
    })),
    compactJobStateBytes: state.parties.map((party, partyIndex) => ({
      partyId: party.id,
      bytes: utf8Bytes(createAfkPartyChunkWorkerState(state, partyIndex)),
    })),
  },
  output: {
    results: resultSizes,
    completeSixPartyBytes: resultSizes.reduce((total, result) => total + result.completeResultBytes, 0),
    withoutBasePartySixPartyBytes: resultSizes.reduce((total, result) => total + result.resultWithoutBasePartyBytes, 0),
    compactHistorySixPartyBytes: resultSizes.reduce((total, result) => total + result.compactHistoryWorkerResultBytes, 0),
  },
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
