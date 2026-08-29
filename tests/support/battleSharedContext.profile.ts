import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { getApproxAfkCycleDurationMs } from '../../src/game/afkScheduler.ts';
import { AFK_CHUNK_CYCLE_COUNT } from '../../src/game/afkChunkCoordinator.ts';
import {
  getProductionBattleTelemetry,
  resetProductionBattleTelemetryForTesting,
} from '../../src/game/battle.ts';
import {
  getBattlePreparationMeasurement,
  resetBattlePreparationMeasurementForTesting,
} from '../../src/game/battleCandidate.ts';
import { withBattleSeedSourceForTesting } from '../../src/game/battleSeedSource.ts';
import { withGameplayRandomSourceForTesting } from '../../src/game/gameplayRandom.ts';
import { hydrateGameState } from '../../src/game/saveCodec.ts';
import { decodePersistedState } from '../../src/game/storageCompression.ts';
import {
  runExpeditionTransactionForTesting,
  simulateAfkPartyChunkForWorker,
  simulateApiSortieBatchForTesting,
} from '../../src/hooks/useGameState.ts';
import type { GameState } from '../../src/types.ts';

const SAMPLE_SAVE_PATH = resolve(
  process.cwd(),
  'sample_savedata/Exp8,7,6,5,4,3_set_for_test_v0.9.3_dev_20260820.kemoz',
);

function loadState(): GameState {
  const envelope = JSON.parse(readFileSync(SAMPLE_SAVE_PATH, 'utf8')) as { saveDataCompressed: string };
  return hydrateGameState(JSON.parse(decodePersistedState(envelope.saveDataCompressed)) as GameState);
}

function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return (value >>> 0) / 0x1_0000_0000;
  };
}

function withDeterminism<T>(seed: number, operation: () => T): T {
  let battle = 0n;
  return withBattleSeedSourceForTesting(
    () => (BigInt(seed) << 32n) | battle++,
    () => withGameplayRandomSourceForTesting(seededRandom(seed), operation),
  );
}

test('online RUN_EXPEDITION computes one authoritative status and every battle shares it', () => {
  const state = loadState();
  resetProductionBattleTelemetryForTesting();
  resetBattlePreparationMeasurementForTesting();
  withDeterminism(0x2a010001, () => runExpeditionTransactionForTesting(state, 0, {
    gameMode: 'm.kemo', simulatedAt: Date.UTC(2026, 7, 25),
  }));
  const telemetry = getProductionBattleTelemetry();
  const preparation = getBattlePreparationMeasurement();
  assert.equal(telemetry.runExpeditionStatusComputations, 1);
  assert.equal(telemetry.runExpeditionStatusSnapshots, 0);
  assert.ok(telemetry.battles > 0);
  assert.equal(preparation.combatantProjections, telemetry.battles);
  assert.equal(preparation.productionPreparations, telemetry.battles);
  assert.equal(preparation.productionPartyStatusComputations, 0);
  assert.equal(preparation.productionNarrations, telemetry.battles);
  assert.equal(preparation.projectionPartyStatusFallbacks, 0);
  assert.equal(preparation.diagnosticNarrationPreparations, 0);
});

test('API Cycles supply one fresh status from each sequential Cycle starting state', () => {
  const state = loadState();
  const partyIndex = state.parties.length - 1;
  resetProductionBattleTelemetryForTesting();
  resetBattlePreparationMeasurementForTesting();
  const batch = withDeterminism(0x2a020002, () => simulateApiSortieBatchForTesting(
    state, partyIndex, 3, 'm.kemo', Date.UTC(2026, 7, 25),
  ));
  assert.equal(batch.runs.length, 3);
  for (let index = 1; index < batch.runs.length; index += 1) {
    assert.equal(batch.runs[index]!.beforeState, batch.runs[index - 1]!.afterState);
  }
  const telemetry = getProductionBattleTelemetry();
  assert.equal(telemetry.runExpeditionStatusComputations, 0);
  assert.equal(telemetry.runExpeditionStatusSnapshots, 3);
  assert.equal(getBattlePreparationMeasurement().projectionPartyStatusFallbacks, 0);
  assert.equal(getBattlePreparationMeasurement().productionPartyStatusComputations, 0);
});

test('AFK reuses supplied chunk authority for all twelve Cycles', () => {
  const state = loadState();
  const partyIndex = state.parties.length - 1;
  const party = state.parties[partyIndex]!;
  resetProductionBattleTelemetryForTesting();
  resetBattlePreparationMeasurementForTesting();
  withDeterminism(0x2a030003, () => simulateAfkPartyChunkForWorker(state, {
    partyIndex,
    cycleDurationMs: getApproxAfkCycleDurationMs(party, 0.05),
    simulatedCompletedAt: Date.UTC(2026, 7, 25),
    cycleDurationScale: 0.05,
    gameMode: 'm.kemo',
  }));
  const telemetry = getProductionBattleTelemetry();
  assert.equal(telemetry.runExpeditionStatusComputations, 0);
  assert.equal(telemetry.runExpeditionStatusSnapshots, AFK_CHUNK_CYCLE_COUNT);
  assert.equal(getBattlePreparationMeasurement().projectionPartyStatusFallbacks, 0);
  assert.equal(getBattlePreparationMeasurement().productionPartyStatusComputations, 0);
});
