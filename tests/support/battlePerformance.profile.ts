import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { getDungeonById } from '../../src/data/dungeons.ts';
import { ENEMIES } from '../../src/data/enemies.ts';
import { getApproxAfkCycleDurationMs } from '../../src/game/afkScheduler.ts';
import { beginBattleKernelMeasurement, endBattleKernelMeasurement } from '../../src/game/battleKernel.ts';
import { executeBattle } from '../../src/game/battle.ts';
import { getProductionBattleTelemetry, resetProductionBattleTelemetryForTesting } from '../../src/game/battle.ts';
import { executeBattleCandidateFromWindow } from '../../src/game/battleCandidate.ts';
import { executeBattle as executeTypeScriptBattle } from '../../src/game/battleTypeScriptReference.ts';
import { getEncounterEnemyWithScaling } from '../../src/game/enemyScaling.ts';
import { hydrateGameState } from '../../src/game/saveCodec.ts';
import { decodePersistedState } from '../../src/game/storageCompression.ts';
import { simulateAfkPartyChunkForWorker, simulateApiSortieBatchForTesting } from '../../src/hooks/useGameState.ts';
import { setLanguage } from '../../src/i18n/index.ts';
import { withGameplayRandomSourceForTesting } from '../../src/game/gameplayRandom.ts';
import { withBattleSeedSourceForTesting } from '../../src/game/battleSeedSource.ts';
import type { GameState } from '../../src/types.ts';

const SAMPLE_SAVE_PATH = resolve(process.cwd(), 'sample_savedata/Exp8,7,6,5,4,3_set_for_test_v0.9.3_dev_20260820.kemoz');
const WARMUP_COUNT = 8;
const SAMPLE_COUNT = 40;
const AFK_CYCLE_DURATION_SCALE = 0.05;

function loadState(): GameState {
  const envelope = JSON.parse(readFileSync(SAMPLE_SAVE_PATH, 'utf8')) as { saveDataCompressed: string };
  return hydrateGameState(JSON.parse(decodePersistedState(envelope.saveDataCompressed)) as GameState);
}

function percentile(values: readonly number[], ratio: number): number {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.min(ordered.length - 1, Math.floor((ordered.length - 1) * ratio))] ?? 0;
}

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0 || 0x9e3779b9;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
}

function withRandom<T>(seed: number, operation: () => T): { result: T; draws: number; tape: number[] } {
  const previous = Math.random;
  const random = createSeededRandom(seed);
  let draws = 0;
  const tape: number[] = [];
  Math.random = () => { draws += 1; const value = random(); tape.push(value); return value; };
  try {
    return withGameplayRandomSourceForTesting(random, () => ({ result: operation(), draws, tape }));
  } finally {
    Math.random = previous;
  }
}

function createBattleFixture(state: GameState) {
  const party = state.parties[0];
  if (!party) throw new Error('Performance save is missing party 1');
  const dungeon = getDungeonById(party.selectedDungeonId);
  const floor = dungeon?.floors[dungeon.floors.length - 1];
  const bossId = floor?.rooms.find(room => room.type === 'battle_Boss')?.bossId ?? dungeon?.bossId;
  const enemy = ENEMIES.find(entry => entry.id === bossId);
  if (!dungeon || !floor || !enemy) throw new Error('Performance save is missing its boss encounter');
  return { party, enemy: getEncounterEnemyWithScaling(enemy, dungeon, floor.floorNumber, 'battle_Boss'), terrainEffect: floor.terrainEffect };
}

test('reports deterministic single-battle migration metrics', () => {
  resetProductionBattleTelemetryForTesting();
  setLanguage('ja');
  const state = loadState();
  const fixture = createBattleFixture(state);
  const run = (iteration: number) => {
    const before = getProductionBattleTelemetry().randomConsumed;
    const measured = withBattleSeedSourceForTesting(() => BigInt(0x8e710001 + iteration), () => withRandom(0x8e710001 + iteration, () => executeBattle(
      structuredClone(fixture.party), structuredClone(fixture.enemy), structuredClone(state.bags),
      fixture.party.currentHp, { terrainEffect: fixture.terrainEffect },
    )));
    return { ...measured, logicalDraws: getProductionBattleTelemetry().randomConsumed - before };
  };
  for (let index = 0; index < WARMUP_COUNT; index += 1) run(index);

  const duration: number[] = [];
  const draws: number[] = [];
  const events: number[] = [];
  const calls: number[] = [];
  const inputBytes: number[] = [];
  const outputBytes: number[] = [];
  for (let index = 0; index < SAMPLE_COUNT; index += 1) {
    beginBattleKernelMeasurement();
    const started = performance.now();
    const measured = run(index + WARMUP_COUNT);
    duration.push(performance.now() - started);
    const boundary = endBattleKernelMeasurement();
    calls.push(boundary.calls);
    inputBytes.push(boundary.inputBytes);
    outputBytes.push(boundary.outputBytes);
    draws.push(measured.logicalDraws);
    events.push(measured.result.log.length);
  }
  const report = {
    engine: 'protocol-v3-production-native-coordinator', samples: SAMPLE_COUNT,
    medianBattleMs: percentile(duration, 0.5), p95BattleMs: percentile(duration, 0.95),
    medianRandomDraws: percentile(draws, 0.5), medianEventCount: percentile(events, 0.5),
    medianWasmBoundaryCalls: percentile(calls, 0.5), medianInputBytes: percentile(inputBytes, 0.5),
    medianOutputBytes: percentile(outputBytes, 0.5),
    maxRandomConsumed: getProductionBattleTelemetry().maxRandomConsumed,
    maxSemanticEvents: getProductionBattleTelemetry().maxSemanticEvents,
    seededInputRandomCount: 0,
  };
  console.info('BATTLE_MIGRATION_BASELINE', JSON.stringify(report));
  assert.ok(report.medianBattleMs > 0);
  assert.equal(report.medianWasmBoundaryCalls, 1);
});

test('reports the protocol-v3 one-call reserved-window boundary', () => {
  setLanguage('ja');
  const state = loadState();
  const fixture = createBattleFixture(state);
  const calls: number[] = [];
  const inputBytes: number[] = [];
  const outputBytes: number[] = [];
  for (let index = 0; index < 10; index += 1) {
    const recording = withRandom(0x8e710001, () => executeTypeScriptBattle(
      structuredClone(fixture.party), structuredClone(fixture.enemy), structuredClone(state.bags),
      fixture.party.currentHp, { terrainEffect: fixture.terrainEffect },
    ));
    beginBattleKernelMeasurement();
    executeBattleCandidateFromWindow(
      structuredClone(fixture.party), structuredClone(fixture.enemy), structuredClone(state.bags),
      [...recording.tape, ...Array(Math.max(0, 4_096 - recording.tape.length)).fill(0.5)],
      fixture.party.currentHp, { terrainEffect: fixture.terrainEffect },
    );
    const boundary = endBattleKernelMeasurement();
    calls.push(boundary.calls);
    inputBytes.push(boundary.inputBytes);
    outputBytes.push(boundary.outputBytes);
  }
  const report = {
    engine: 'protocol-v3-explicit-tape-candidate', samples: calls.length,
    medianWasmBoundaryCalls: percentile(calls, 0.5),
    medianInputBytes: percentile(inputBytes, 0.5),
    medianOutputBytes: percentile(outputBytes, 0.5),
  };
  console.info('BATTLE_PROTOCOL_V3_BOUNDARY', JSON.stringify(report));
  assert.equal(report.medianWasmBoundaryCalls, 1);
  assert.ok(report.medianInputBytes > 0);
  assert.ok(report.medianOutputBytes > 0);
});

test('reports deterministic AFK migration metrics', () => {
  resetProductionBattleTelemetryForTesting();
  const state = loadState();
  const durations: number[] = [];
  let calls = 0;
  let inputBytes = 0;
  let outputBytes = 0;
  const battlesBefore = getProductionBattleTelemetry().battles;
  for (const [partyIndex, party] of state.parties.entries()) {
    beginBattleKernelMeasurement();
    const started = performance.now();
    let seedCursor = 0n;
    withBattleSeedSourceForTesting(() => (BigInt(0xaf000000 + partyIndex) << 32n) | seedCursor++, () => withRandom(0xaf000000 + partyIndex, () => simulateAfkPartyChunkForWorker(state, {
      partyIndex,
      cycleDurationMs: getApproxAfkCycleDurationMs(party, AFK_CYCLE_DURATION_SCALE),
      simulatedCompletedAt: Date.UTC(2026, 7, 20),
      cycleDurationScale: AFK_CYCLE_DURATION_SCALE,
      gameMode: 'm.kemo',
    })));
    durations.push(performance.now() - started);
    const boundary = endBattleKernelMeasurement();
    calls += boundary.calls;
    inputBytes += boundary.inputBytes;
    outputBytes += boundary.outputBytes;
  }
  const report = {
    engine: 'protocol-v3-production-native-coordinator', parties: state.parties.length,
    totalWorkerCpuMs: durations.reduce((sum, value) => sum + value, 0),
    projectedParallelWorkerMs: Math.max(...durations), p95WorkerMs: percentile(durations, 0.95),
    battles: getProductionBattleTelemetry().battles - battlesBefore,
    wasmBoundaryCalls: calls, inputBytes, outputBytes,
    maxRandomConsumed: getProductionBattleTelemetry().maxRandomConsumed,
    maxSemanticEvents: getProductionBattleTelemetry().maxSemanticEvents,
    seededInputRandomCount: 0,
  };
  console.info('BATTLE_MIGRATION_AFK_BASELINE', JSON.stringify(report));
  assert.equal(report.parties, 6);
  assert.ok(report.totalWorkerCpuMs > 0);
  assert.equal(report.wasmBoundaryCalls, report.battles, 'AFK must make one Wasm call per battle');
});

test('reports Experimental API sortie counts 1 and 100 through the production battle entry point', () => {
  const reports: Array<Record<string, number>> = [];
  for (const count of [1, 100]) {
    resetProductionBattleTelemetryForTesting();
    const state = loadState();
    const partyIndex = state.parties.length - 1;
    const initialParty = state.parties[partyIndex]!;
    const chargeBefore = [initialParty.instantExpeditionStock, initialParty.instantExpeditionChargeStartedAt];
    beginBattleKernelMeasurement();
    const started = performance.now();
    let seedCursor = 0n;
    const batch = withBattleSeedSourceForTesting(() => (BigInt(0xa9100000 + count) << 32n) | seedCursor++, () => (
      withGameplayRandomSourceForTesting(createSeededRandom(0xa9100000 + count), () => (
        simulateApiSortieBatchForTesting(state, partyIndex, count, 'm.kemo', Date.UTC(2026, 7, 23))
      ))
    ));
    const durationMs = performance.now() - started;
    const boundary = endBattleKernelMeasurement();
    const telemetry = getProductionBattleTelemetry();
    assert.equal(batch.runs.length, count);
    for (let index = 1; index < batch.runs.length; index += 1) {
      assert.equal(batch.runs[index]!.beforeState, batch.runs[index - 1]!.afterState, 'API sortie state must propagate sequentially');
    }
    const finalParty = batch.state.parties[partyIndex]!;
    assert.deepEqual([finalParty.instantExpeditionStock, finalParty.instantExpeditionChargeStartedAt], chargeBefore);
    assert.equal(boundary.calls, telemetry.battles, 'API sortie must make one Wasm call per encounter');
    reports.push({ count, durationMs, battles: telemetry.battles, wasmCalls: boundary.calls, inputBytes: boundary.inputBytes, outputBytes: boundary.outputBytes, maxRandomConsumed: telemetry.maxRandomConsumed, maxSemanticEvents: telemetry.maxSemanticEvents, seededInputRandomCount: 0 });
  }
  console.info('BATTLE_MIGRATION_API_BASELINE', JSON.stringify(reports));
});
