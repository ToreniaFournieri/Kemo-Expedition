import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { getDungeonById } from '../../src/data/dungeons.ts';
import { ENEMIES } from '../../src/data/enemies.ts';
import { getApproxAfkCycleDurationMs } from '../../src/game/afkScheduler.ts';
import { AFK_CHUNK_CYCLE_COUNT } from '../../src/game/afkChunkCoordinator.ts';
import { beginBattleKernelMeasurement, endBattleKernelMeasurement } from '../../src/game/battleKernel.ts';
import { executeBattle, executeBattleWithSeed } from '../../src/game/battle.ts';
import { getProductionBattleTelemetry, resetProductionBattleTelemetryForTesting } from '../../src/game/battle.ts';
import { getBattlePreparationMeasurement, resetBattlePreparationMeasurementForTesting } from '../../src/game/battleCandidate.ts';
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
const ONLINE_MEDIAN_CEILING_MS = 25;
const AFK_TOTAL_CPU_CEILING_MS = 7_000;
const AFK_PROJECTED_PARALLEL_CEILING_MS = 2_000;
const API_COUNT_100_CEILING_MS = 10_000;
const RETROSPECTIVE_COMPARISON = process.env.BOKEMO_RETROSPECTIVE_COMPARISON === '1';

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

function createPartyBattleFixture(state: GameState, partyIndex: number) {
  const party = state.parties[partyIndex];
  if (!party) throw new Error(`Performance save is missing party ${partyIndex + 1}`);
  const dungeon = getDungeonById(party.selectedDungeonId);
  const floor = dungeon?.floors[dungeon.floors.length - 1];
  const bossId = floor?.rooms.find(room => room.type === 'battle_Boss')?.bossId ?? dungeon?.bossId;
  const enemy = ENEMIES.find(entry => entry.id === bossId);
  if (!dungeon || !floor || !enemy) throw new Error(`Performance save is missing party ${partyIndex + 1}'s boss encounter`);
  return { party, enemy: getEncounterEnemyWithScaling(enemy, dungeon, floor.floorNumber, 'battle_Boss'), terrainEffect: floor.terrainEffect };
}

function measureBattleOnlyCase(
  label: string,
  state: GameState,
  fixture: ReturnType<typeof createPartyBattleFixture>,
  seed: bigint,
) {
  const prepared = Array.from({ length: WARMUP_COUNT + SAMPLE_COUNT }, () => ({
    party: structuredClone(fixture.party),
    enemy: structuredClone(fixture.enemy),
    bags: structuredClone(state.bags),
    environment: { terrainEffect: fixture.terrainEffect },
  }));
  const before = prepared.map(input => JSON.stringify(input));
  for (let index = 0; index < WARMUP_COUNT; index += 1) {
    const input = prepared[index]!;
    executeBattleWithSeed(input.party, input.enemy, input.bags, seed, 1, input.party.currentHp, input.environment);
  }
  const durations: number[] = [];
  const events: number[] = [];
  let calls = 0;
  let encodedInputAllocations = 0;
  let inputArenaCopies = 0;
  let outputBufferCopies = 0;
  let decodedEventObjectAllocations = 0;
  let decodedBagEntryObjectAllocations = 0;
  let resultBagEntryObjectAllocations = 0;
  for (let index = WARMUP_COUNT; index < prepared.length; index += 1) {
    const input = prepared[index]!;
    resetProductionBattleTelemetryForTesting();
    beginBattleKernelMeasurement();
    const started = performance.now();
    executeBattleWithSeed(input.party, input.enemy, input.bags, seed, 1, input.party.currentHp, input.environment);
    durations.push(performance.now() - started);
    const boundary = endBattleKernelMeasurement();
    calls += boundary.calls;
    encodedInputAllocations += boundary.encodedInputAllocations;
    inputArenaCopies += boundary.inputArenaCopies;
    outputBufferCopies += boundary.outputBufferCopies;
    decodedEventObjectAllocations += boundary.decodedEventObjectAllocations ?? 0;
    decodedBagEntryObjectAllocations += boundary.decodedBagEntryObjectAllocations ?? 0;
    resultBagEntryObjectAllocations += boundary.resultBagEntryObjectAllocations ?? 0;
    events.push(getProductionBattleTelemetry().maxSemanticEvents);
  }
  prepared.forEach((input, index) => assert.equal(JSON.stringify(input), before[index], `${label} input ${index} mutated`));
  const report = {
    boundary: 'battle-only-production-projection-through-owned-result', label, samples: SAMPLE_COUNT,
    seed: `0x${seed.toString(16)}`, medianBattleMs: percentile(durations, 0.5), p95BattleMs: percentile(durations, 0.95),
    minBattleMs: Math.min(...durations), maxBattleMs: Math.max(...durations),
    medianSemanticEvents: percentile(events, 0.5), maxSemanticEvents: Math.max(...events),
    wasmBoundaryCalls: calls, encodedInputAllocations, inputArenaCopies, outputBufferCopies,
    decodedEventObjectAllocations, decodedBagEntryObjectAllocations, resultBagEntryObjectAllocations,
    seededInputRandomCount: 0,
  };
  assert.equal(report.wasmBoundaryCalls, SAMPLE_COUNT, `${label} must execute native Wasm once per battle`);
  assert.equal(report.encodedInputAllocations + report.inputArenaCopies + report.outputBufferCopies, 0);
  if (!RETROSPECTIVE_COMPARISON) assert.equal(report.decodedEventObjectAllocations + report.decodedBagEntryObjectAllocations, 0);
  return report;
}

function findSemanticHeavySeed(
  state: GameState,
  fixture: ReturnType<typeof createPartyBattleFixture>,
): bigint {
  let selectedSeed = 0x8e710001n;
  let selectedEventCount = -1;
  for (let offset = 1; offset <= 64; offset += 1) {
    const seed = 0x8e710000n + BigInt(offset);
    resetProductionBattleTelemetryForTesting();
    executeBattleWithSeed(
      structuredClone(fixture.party), structuredClone(fixture.enemy), structuredClone(state.bags),
      seed, 1, fixture.party.currentHp, { terrainEffect: fixture.terrainEffect },
    );
    const eventCount = getProductionBattleTelemetry().maxSemanticEvents;
    if (eventCount > selectedEventCount) {
      selectedSeed = seed;
      selectedEventCount = eventCount;
    }
  }
  assert.ok(selectedEventCount >= 132, `semantic-heavy fixture reached only ${selectedEventCount} events`);
  return selectedSeed;
}

test('reports isolated deterministic battle-only microprofiles', () => {
  setLanguage('ja');
  const state = loadState();
  const typical = measureBattleOnlyCase('typical', state, createPartyBattleFixture(state, 5), 0x8e710006n);
  const heavyFixture = createPartyBattleFixture(state, 0);
  const semanticHeavy = measureBattleOnlyCase('semantic-heavy', state, heavyFixture, findSemanticHeavySeed(state, heavyFixture));
  console.info('BATTLE_ONLY_BASELINE', JSON.stringify([typical, semanticHeavy]));
});

test('reports deterministic end-to-end online single-battle migration metrics', () => {
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
  const encodedInputAllocations: number[] = [];
  const inputArenaCopies: number[] = [];
  const outputBufferCopies: number[] = [];
  const decodedEventObjectAllocations: number[] = [];
  const decodedBagEntryObjectAllocations: number[] = [];
  const resultBagEntryObjectAllocations: number[] = [];
  for (let index = 0; index < SAMPLE_COUNT; index += 1) {
    beginBattleKernelMeasurement();
    const started = performance.now();
    const measured = run(index + WARMUP_COUNT);
    duration.push(performance.now() - started);
    const boundary = endBattleKernelMeasurement();
    calls.push(boundary.calls);
    inputBytes.push(boundary.inputBytes);
    outputBytes.push(boundary.outputBytes);
    encodedInputAllocations.push(boundary.encodedInputAllocations);
    inputArenaCopies.push(boundary.inputArenaCopies);
    outputBufferCopies.push(boundary.outputBufferCopies);
    decodedEventObjectAllocations.push(boundary.decodedEventObjectAllocations ?? 0);
    decodedBagEntryObjectAllocations.push(boundary.decodedBagEntryObjectAllocations ?? 0);
    resultBagEntryObjectAllocations.push(boundary.resultBagEntryObjectAllocations ?? 0);
    draws.push(measured.logicalDraws);
    events.push(measured.result.log.length);
  }
  const report = {
    boundary: 'end-to-end-including-fixture-cloning', engine: 'protocol-v3-production-native-coordinator', samples: SAMPLE_COUNT,
    medianBattleMs: percentile(duration, 0.5), p95BattleMs: percentile(duration, 0.95),
    medianRandomDraws: percentile(draws, 0.5), medianEventCount: percentile(events, 0.5),
    medianWasmBoundaryCalls: percentile(calls, 0.5), medianInputBytes: percentile(inputBytes, 0.5),
    medianOutputBytes: percentile(outputBytes, 0.5),
    encodedInputAllocations: encodedInputAllocations.reduce((sum, value) => sum + value, 0),
    inputArenaCopies: inputArenaCopies.reduce((sum, value) => sum + value, 0),
    outputBufferCopies: outputBufferCopies.reduce((sum, value) => sum + value, 0),
    decodedEventObjectAllocations: decodedEventObjectAllocations.reduce((sum, value) => sum + value, 0),
    decodedBagEntryObjectAllocations: decodedBagEntryObjectAllocations.reduce((sum, value) => sum + value, 0),
    resultBagEntryObjectAllocations: resultBagEntryObjectAllocations.reduce((sum, value) => sum + value, 0),
    maxRandomConsumed: getProductionBattleTelemetry().maxRandomConsumed,
    maxSemanticEvents: getProductionBattleTelemetry().maxSemanticEvents,
    seededInputRandomCount: 0,
  };
  console.info('BATTLE_MIGRATION_BASELINE', JSON.stringify(report));
  assert.ok(report.medianBattleMs < ONLINE_MEDIAN_CEILING_MS, `online median ${report.medianBattleMs}ms must remain below ${ONLINE_MEDIAN_CEILING_MS}ms`);
  assert.equal(report.medianWasmBoundaryCalls, 1);
  assert.equal(report.encodedInputAllocations, 0);
  assert.equal(report.inputArenaCopies, 0);
  assert.equal(report.outputBufferCopies, 0);
  if (!RETROSPECTIVE_COMPARISON) {
    assert.equal(report.decodedEventObjectAllocations, 0);
    assert.equal(report.decodedBagEntryObjectAllocations, 0);
  }
});

test('reports deterministic end-to-end AFK migration metrics', () => {
  resetProductionBattleTelemetryForTesting();
  resetBattlePreparationMeasurementForTesting();
  const state = loadState();
  const durations: number[] = [];
  let calls = 0;
  let inputBytes = 0;
  let outputBytes = 0;
  let encodedInputAllocations = 0;
  let inputArenaCopies = 0;
  let outputBufferCopies = 0;
  let decodedEventObjectAllocations = 0;
  let decodedBagEntryObjectAllocations = 0;
  let resultBagEntryObjectAllocations = 0;
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
    encodedInputAllocations += boundary.encodedInputAllocations;
    inputArenaCopies += boundary.inputArenaCopies;
    outputBufferCopies += boundary.outputBufferCopies;
    decodedEventObjectAllocations += boundary.decodedEventObjectAllocations ?? 0;
    decodedBagEntryObjectAllocations += boundary.decodedBagEntryObjectAllocations ?? 0;
    resultBagEntryObjectAllocations += boundary.resultBagEntryObjectAllocations ?? 0;
  }
  const report = {
    boundary: 'end-to-end-afk-orchestration', engine: 'protocol-v3-production-native-coordinator', parties: state.parties.length,
    totalWorkerCpuMs: durations.reduce((sum, value) => sum + value, 0),
    projectedParallelWorkerMs: Math.max(...durations), p95WorkerMs: percentile(durations, 0.95),
    battles: getProductionBattleTelemetry().battles - battlesBefore,
    wasmBoundaryCalls: calls, inputBytes, outputBytes,
    encodedInputAllocations, inputArenaCopies, outputBufferCopies,
    decodedEventObjectAllocations, decodedBagEntryObjectAllocations, resultBagEntryObjectAllocations,
    maxRandomConsumed: getProductionBattleTelemetry().maxRandomConsumed,
    maxSemanticEvents: getProductionBattleTelemetry().maxSemanticEvents,
    seededInputRandomCount: 0,
  };
  const preparation = getBattlePreparationMeasurement();
  console.info('BATTLE_MIGRATION_AFK_BASELINE', JSON.stringify(report));
  assert.equal(report.parties, 6);
  assert.ok(report.totalWorkerCpuMs < AFK_TOTAL_CPU_CEILING_MS, `AFK total CPU ${report.totalWorkerCpuMs}ms must remain below ${AFK_TOTAL_CPU_CEILING_MS}ms`);
  assert.ok(report.projectedParallelWorkerMs < AFK_PROJECTED_PARALLEL_CEILING_MS, `AFK projected parallel ${report.projectedParallelWorkerMs}ms must remain below ${AFK_PROJECTED_PARALLEL_CEILING_MS}ms`);
  assert.equal(report.wasmBoundaryCalls, report.battles, 'AFK must make one Wasm call per battle');
  assert.equal(preparation.combatantProjections, report.battles, 'AFK production must project once per battle');
  assert.equal(preparation.productionNarrations, report.battles, 'AFK production must narrate each prepared projection once');
  assert.equal(preparation.projectionPartyStatusFallbacks, 0, 'AFK battles must use chunk-start status');
  assert.equal(preparation.productionPartyStatusComputations, 0, 'AFK battles must not compute status locally');
  assert.equal(getProductionBattleTelemetry().runExpeditionStatusComputations, 0, 'AFK Cycles must not recompute RUN_EXPEDITION status');
  assert.equal(getProductionBattleTelemetry().runExpeditionStatusSnapshots, state.parties.length * AFK_CHUNK_CYCLE_COUNT, 'AFK must reuse one supplied status for all 12 Cycles per party');
  assert.equal(report.encodedInputAllocations + report.inputArenaCopies + report.outputBufferCopies, 0);
  if (!RETROSPECTIVE_COMPARISON) assert.equal(report.decodedEventObjectAllocations + report.decodedBagEntryObjectAllocations, 0);
});

test('reports Experimental API sortie counts 1 and 100 through the production battle entry point', () => {
  const reports: Array<Record<string, number | string>> = [];
  for (const count of [1, 100]) {
    resetProductionBattleTelemetryForTesting();
    resetBattlePreparationMeasurementForTesting();
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
    const preparation = getBattlePreparationMeasurement();
    assert.equal(preparation.combatantProjections, telemetry.battles, 'API production must project once per battle');
    assert.equal(preparation.productionNarrations, telemetry.battles, 'API production must narrate each prepared projection once');
    assert.equal(preparation.projectionPartyStatusFallbacks, 0, 'API battles must use Cycle-start status');
    assert.equal(preparation.productionPartyStatusComputations, 0, 'API battles must not compute status locally');
    assert.equal(telemetry.runExpeditionStatusComputations, 0, 'API RUN_EXPEDITION must not recompute supplied Cycle status');
    assert.equal(telemetry.runExpeditionStatusSnapshots, count, 'API must supply one fresh authoritative status per Cycle');
    assert.equal(boundary.encodedInputAllocations + boundary.inputArenaCopies + boundary.outputBufferCopies, 0);
    if (!RETROSPECTIVE_COMPARISON) assert.equal(boundary.decodedEventObjectAllocations + boundary.decodedBagEntryObjectAllocations, 0);
    if (count === 100) {
      assert.ok(durationMs < API_COUNT_100_CEILING_MS, `API count-100 ${durationMs}ms must remain below ${API_COUNT_100_CEILING_MS}ms`);
    }
    reports.push({ boundary: 'end-to-end-api-sortie-orchestration', count, durationMs, battles: telemetry.battles, wasmCalls: boundary.calls, inputBytes: boundary.inputBytes, outputBytes: boundary.outputBytes, encodedInputAllocations: boundary.encodedInputAllocations, inputArenaCopies: boundary.inputArenaCopies, outputBufferCopies: boundary.outputBufferCopies, decodedEventObjectAllocations: boundary.decodedEventObjectAllocations ?? 0, decodedBagEntryObjectAllocations: boundary.decodedBagEntryObjectAllocations ?? 0, resultBagEntryObjectAllocations: boundary.resultBagEntryObjectAllocations ?? 0, maxRandomConsumed: telemetry.maxRandomConsumed, maxSemanticEvents: telemetry.maxSemanticEvents, seededInputRandomCount: 0 });
  }
  console.info('BATTLE_MIGRATION_API_BASELINE', JSON.stringify(reports));
});

test('battle projection hot path does not reintroduce Party structured clones', () => {
  const candidateSource = readFileSync(resolve(process.cwd(), 'src/game/battleCandidate.ts'), 'utf8');
  assert.equal(candidateSource.includes('structuredClone(party)'), false);
  assert.equal(candidateSource.includes('structuredClone(party.characters['), false);
});
