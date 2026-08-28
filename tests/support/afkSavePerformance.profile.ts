import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getEffectiveAfkElapsedMs,
  getApproxAfkCycleDurationMs,
} from '../../src/game/afkScheduler.ts';
import {
  AFK_CHUNK_CYCLE_COUNT,
  commitAfkPartyChunk,
  compareAfkChunkResults,
  createAfkPartyChunkResult,
  createAfkPartyChunkWorkerResult,
  createAfkPartyChunkWorkerState,
  hydrateAfkPartyChunkResult,
  type AfkPartyChunkResult,
} from '../../src/game/afkChunkCoordinator.ts';
import { withBattleSeedSourceForTesting } from '../../src/game/battleSeedSource.ts';
import { withGameplayRandomSourceForTesting } from '../../src/game/gameplayRandom.ts';
import { persistGameState } from '../../src/game/savePersistence.ts';
import { serializeGameState } from '../../src/game/saveCodec.ts';
import { decodePersistedState } from '../../src/game/storageCompression.ts';
import { simulateAfkPartyChunkForWorker } from '../../src/hooks/useGameState.ts';
import type { GameState } from '../../src/types.ts';
import { loadAndValidateExpedition8Fixture } from './expedition8SaveFixture.ts';

const HOUR_MS = 60 * 60 * 1000;
const DEV_CYCLE_DURATION_SCALE = 0.05;
const SIMULATED_END_AT = Date.UTC(2026, 7, 16);
const AFK_PERIODS = [
  [9, 9],
  [18, 15],
  [30, 21],
  [48, 27],
  [72, 33],
  [108, 39],
  [162, 45],
] as const;

function createSeededRandom(seed: number): () => number {
  let value = seed >>> 0 || 0x9e3779b9;
  return () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return (value >>> 0) / 0x1_0000_0000;
  };
}

function runDeterministicAfkWorkflow(baseState: GameState, compact: boolean = false): GameState {
  const results: AfkPartyChunkResult[] = baseState.parties.map((party, partyIndex) => {
    const workerState = compact ? createAfkPartyChunkWorkerState(baseState, partyIndex) : baseState;
    const cycleDurationMs = getApproxAfkCycleDurationMs(party, DEV_CYCLE_DURATION_SCALE);
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
    const completeResult = createAfkPartyChunkResult({
      jobId: `regression-${party.id}`,
      partyIndex,
      partyId: party.id,
      simulatedStartedAt: SIMULATED_END_AT - cycleDurationMs * AFK_CHUNK_CYCLE_COUNT,
      simulatedCompletedAt: SIMULATED_END_AT,
      cycleDurationMs,
      baseState: workerState,
      gameMode: 'm.kemo',
      cycleDurationScale: DEV_CYCLE_DURATION_SCALE,
    }, resultState, 0);
    return compact
      ? hydrateAfkPartyChunkResult(createAfkPartyChunkWorkerResult(completeResult), baseState.parties[partyIndex])
      : completeResult;
  }).sort(compareAfkChunkResults);
  return results.reduce(commitAfkPartyChunk, baseState);
}

test('Expedition 8 fixture identity and AFK efficiency coverage remain stable', () => {
  const { state, identity } = loadAndValidateExpedition8Fixture();
  assert.equal(identity.partyCount, 6);
  assert.deepEqual(identity.selectedDungeonIds, [8, 8, 8, 8, 8, 8]);
  for (const [realHours, effectiveHours] of AFK_PERIODS) {
    assert.equal(getEffectiveAfkElapsedMs(realHours * HOUR_MS), effectiveHours * HOUR_MS);
  }
  assert.equal(state.parties.every((party) => party.characters.length === 6), true);
});

test('profiled persistence preserves the canonical compressed-save round trip', () => {
  const { state } = loadAndValidateExpedition8Fixture();
  let persisted = '';
  const profile = persistGameState(state, 'test-key', {
    setItem: (_key, value) => {
      persisted = value;
    },
  }, { now: () => performance.now(), includeUtf8Sizes: true });
  assert.ok(profile);
  assert.deepEqual(JSON.parse(decodePersistedState(persisted)), serializeGameState(state));
  assert.ok(profile.phases.endToEndMs >= 0);
  assert.ok(profile.phases.canonicalSnapshotMs >= 0);
  assert.ok(profile.phases.jsonStringifyMs >= 0);
  assert.ok(profile.phases.compressionEncodingMs >= 0);
  assert.ok(profile.phases.storageWriteMs >= 0);
  assert.ok(profile.sizes.jsonUtf16Bytes > profile.sizes.encodedUtf16Bytes);
  assert.ok(profile.sizes.compressionRatio > 0 && profile.sizes.compressionRatio < 1);
});

test('profiling wrappers preserve deterministic AFK worker and coordinator results', () => {
  const { state } = loadAndValidateExpedition8Fixture();
  const first = runDeterministicAfkWorkflow(state);
  const second = runDeterministicAfkWorkflow(state);
  const compact = runDeterministicAfkWorkflow(state, true);
  assert.deepEqual(serializeGameState(second), serializeGameState(first));
  assert.deepEqual(serializeGameState(compact), serializeGameState(first));
});
