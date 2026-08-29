import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Session } from 'node:inspector';
import { resolve } from 'node:path';
import { getDungeonById } from '../../src/data/dungeons.ts';
import { ENEMIES } from '../../src/data/enemies.ts';
import { getApproxAfkCycleDurationMs } from '../../src/game/afkScheduler.ts';
import { executeBattleWithSeed, getProductionBattleTelemetry, resetProductionBattleTelemetryForTesting } from '../../src/game/battle.ts';
import { getEncounterEnemyWithScaling } from '../../src/game/enemyScaling.ts';
import { hydrateGameState } from '../../src/game/saveCodec.ts';
import { decodePersistedState } from '../../src/game/storageCompression.ts';
import { simulateAfkPartyChunkForWorker, simulateApiSortieBatchForTesting } from '../../src/hooks/useGameState.ts';
import { setLanguage } from '../../src/i18n/index.ts';
import { withGameplayRandomSourceForTesting } from '../../src/game/gameplayRandom.ts';
import { withBattleSeedSourceForTesting } from '../../src/game/battleSeedSource.ts';
import type { GameState } from '../../src/types.ts';

const SAMPLE_SAVE_PATH = resolve(process.cwd(), 'sample_savedata/Exp8,7,6,5,4,3_set_for_test_v0.9.3_dev_20260820.kemoz');
const workload = process.env.BOKEMO_PROFILE_WORKLOAD;
const profileOutputDirectory = process.env.BOKEMO_PROFILE_OUTPUT_DIRECTORY;

function post(session: Session, method: string, params?: Record<string, unknown>): Promise<Record<string, unknown>> {
  return new Promise((resolvePromise, reject) => session.post(method, params, (error, result) => (
    error ? reject(error) : resolvePromise(result as Record<string, unknown>)
  )));
}

function loadState(): GameState {
  const envelope = JSON.parse(readFileSync(SAMPLE_SAVE_PATH, 'utf8')) as { saveDataCompressed: string };
  return hydrateGameState(JSON.parse(decodePersistedState(envelope.saveDataCompressed)) as GameState);
}

function createSeededRandom(seed: number): () => number {
  let value = seed >>> 0 || 0x9e3779b9;
  return () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return (value >>> 0) / 0x1_0000_0000;
  };
}

function createFixture(state: GameState, partyIndex: number) {
  const party = state.parties[partyIndex]!;
  const dungeon = getDungeonById(party.selectedDungeonId)!;
  const floor = dungeon.floors[dungeon.floors.length - 1]!;
  const bossId = floor.rooms.find(room => room.type === 'battle_Boss')?.bossId ?? dungeon.bossId;
  const enemy = ENEMIES.find(entry => entry.id === bossId)!;
  return { party, enemy: getEncounterEnemyWithScaling(enemy, dungeon, floor.floorNumber, 'battle_Boss'), terrainEffect: floor.terrainEffect };
}

function profileBattle(state: GameState, partyIndex: number, seed: bigint, iterations: number) {
  const fixture = createFixture(state, partyIndex);
  const before = JSON.stringify({ party: fixture.party, enemy: fixture.enemy, bags: state.bags });
  for (let index = 0; index < 100; index += 1) {
    executeBattleWithSeed(fixture.party, fixture.enemy, state.bags, seed, 1, fixture.party.currentHp, { terrainEffect: fixture.terrainEffect });
  }
  resetProductionBattleTelemetryForTesting();
  const started = performance.now();
  for (let index = 0; index < iterations; index += 1) {
    executeBattleWithSeed(fixture.party, fixture.enemy, state.bags, seed, 1, fixture.party.currentHp, { terrainEffect: fixture.terrainEffect });
  }
  const durationMs = performance.now() - started;
  assert.equal(JSON.stringify({ party: fixture.party, enemy: fixture.enemy, bags: state.bags }), before);
  return { workload, durationMs, iterations, telemetry: getProductionBattleTelemetry() };
}

setLanguage('ja');
const state = loadState();
const runWorkload = () => {
  if (workload === 'typical') return profileBattle(state, 5, 0x8e710006n, 4_000);
  if (workload === 'semantic-heavy') return profileBattle(state, 0, 0x8e710017n, 2_000);
  if (workload === 'afk-1724') {
  resetProductionBattleTelemetryForTesting();
  const started = performance.now();
  for (const [partyIndex, party] of state.parties.entries()) {
    let seedCursor = 0n;
    withBattleSeedSourceForTesting(() => (BigInt(0xaf000000 + partyIndex) << 32n) | seedCursor++, () => (
      withGameplayRandomSourceForTesting(createSeededRandom(0xaf000000 + partyIndex), () => simulateAfkPartyChunkForWorker(state, {
        partyIndex,
        cycleDurationMs: getApproxAfkCycleDurationMs(party, 0.05),
        simulatedCompletedAt: Date.UTC(2026, 7, 20),
        cycleDurationScale: 0.05,
        gameMode: 'm.kemo',
      }))
    ));
  }
    return { workload, durationMs: performance.now() - started, telemetry: getProductionBattleTelemetry() };
  }
  if (workload === 'api-100') {
  resetProductionBattleTelemetryForTesting();
  const partyIndex = state.parties.length - 1;
  let seedCursor = 0n;
  const started = performance.now();
  const batch = withBattleSeedSourceForTesting(() => (0xa9100064n << 32n) | seedCursor++, () => (
    withGameplayRandomSourceForTesting(createSeededRandom(0xa9100064), () => (
      simulateApiSortieBatchForTesting(state, partyIndex, 100, 'm.kemo', Date.UTC(2026, 7, 23))
    ))
  ));
    return { workload, durationMs: performance.now() - started, runs: batch.runs.length, telemetry: getProductionBattleTelemetry() };
  }
  throw new Error(`Unknown BOKEMO_PROFILE_WORKLOAD ${workload ?? '<missing>'}`);
};

let report: unknown;
if (profileOutputDirectory) {
  mkdirSync(profileOutputDirectory, { recursive: true });
  const session = new Session();
  session.connect();
  await post(session, 'Profiler.enable');
  await post(session, 'HeapProfiler.enable');
  await post(session, 'Profiler.start');
  await post(session, 'HeapProfiler.startSampling', {
    samplingInterval: 32_768,
    includeObjectsCollectedByMajorGC: true,
    includeObjectsCollectedByMinorGC: true,
  });
  report = runWorkload();
  const heap = await post(session, 'HeapProfiler.stopSampling');
  const cpu = await post(session, 'Profiler.stop');
  session.disconnect();
  writeFileSync(resolve(profileOutputDirectory, `${workload}.heapprofile`), JSON.stringify(heap.profile));
  writeFileSync(resolve(profileOutputDirectory, `${workload}.cpuprofile`), JSON.stringify(cpu.profile));
} else {
  report = runWorkload();
}

// Prevent the profiler from discarding the completed work and provide a concise run record.
console.info('BATTLE_ATTRIBUTION_WORKLOAD', JSON.stringify(report));
