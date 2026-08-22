import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { getDungeonById } from '../../src/data/dungeons.ts';
import { ENEMIES } from '../../src/data/enemies.ts';
import { getApproxAfkCycleDurationMs } from '../../src/game/afkScheduler.ts';
import { beginBattleKernelMeasurement, endBattleKernelMeasurement } from '../../src/game/battleKernel.ts';
import { executeBattle } from '../../src/game/battle.ts';
import { getEncounterEnemyWithScaling } from '../../src/game/enemyScaling.ts';
import { hydrateGameState } from '../../src/game/saveCodec.ts';
import { decodePersistedState } from '../../src/game/storageCompression.ts';
import { simulateAfkPartyChunkForWorker } from '../../src/hooks/useGameState.ts';
import { setLanguage } from '../../src/i18n/index.ts';
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

function withRandom<T>(seed: number, operation: () => T): { result: T; draws: number } {
  const previous = Math.random;
  const random = createSeededRandom(seed);
  let draws = 0;
  Math.random = () => { draws += 1; return random(); };
  try {
    return { result: operation(), draws };
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
  setLanguage('ja');
  const state = loadState();
  const fixture = createBattleFixture(state);
  const run = (iteration: number) => withRandom(0x8e710001 + iteration, () => executeBattle(
    structuredClone(fixture.party), structuredClone(fixture.enemy), structuredClone(state.bags),
    fixture.party.currentHp, { terrainEffect: fixture.terrainEffect },
  ));
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
    draws.push(measured.draws);
    events.push(measured.result.log.length);
  }
  const report = {
    engine: 'typescript-coordinator-cpp-primitives', samples: SAMPLE_COUNT,
    medianBattleMs: percentile(duration, 0.5), p95BattleMs: percentile(duration, 0.95),
    medianRandomDraws: percentile(draws, 0.5), medianEventCount: percentile(events, 0.5),
    medianWasmBoundaryCalls: percentile(calls, 0.5), medianInputBytes: percentile(inputBytes, 0.5),
    medianOutputBytes: percentile(outputBytes, 0.5),
  };
  console.info('BATTLE_MIGRATION_BASELINE', JSON.stringify(report));
  assert.ok(report.medianBattleMs > 0);
  assert.ok(report.medianWasmBoundaryCalls > 1);
});

test('reports deterministic AFK migration metrics', () => {
  const state = loadState();
  const durations: number[] = [];
  let calls = 0;
  let inputBytes = 0;
  let outputBytes = 0;
  for (const [partyIndex, party] of state.parties.entries()) {
    beginBattleKernelMeasurement();
    const started = performance.now();
    withRandom(0xaf000000 + partyIndex, () => simulateAfkPartyChunkForWorker(state, {
      partyIndex,
      cycleDurationMs: getApproxAfkCycleDurationMs(party, AFK_CYCLE_DURATION_SCALE),
      simulatedCompletedAt: Date.UTC(2026, 7, 20),
      cycleDurationScale: AFK_CYCLE_DURATION_SCALE,
      gameMode: 'm.kemo',
    }));
    durations.push(performance.now() - started);
    const boundary = endBattleKernelMeasurement();
    calls += boundary.calls;
    inputBytes += boundary.inputBytes;
    outputBytes += boundary.outputBytes;
  }
  const report = {
    engine: 'typescript-coordinator-cpp-primitives', parties: state.parties.length,
    totalWorkerCpuMs: durations.reduce((sum, value) => sum + value, 0),
    projectedParallelWorkerMs: Math.max(...durations), p95WorkerMs: percentile(durations, 0.95),
    wasmBoundaryCalls: calls, inputBytes, outputBytes,
  };
  console.info('BATTLE_MIGRATION_AFK_BASELINE', JSON.stringify(report));
  assert.equal(report.parties, 6);
  assert.ok(report.totalWorkerCpuMs > 0);
});
