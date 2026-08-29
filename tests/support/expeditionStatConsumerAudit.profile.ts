import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Session } from 'node:inspector';
import { resolve } from 'node:path';
import { getGodsBattleProgress, getGodsBattleRequired } from '../../src/game/clearGate.ts';
import { buildExperimentalObservation } from '../../src/game/experimentalApi.ts';
import { getApproxAfkCycleDurationMs } from '../../src/game/afkScheduler.ts';
import { hydrateGameState } from '../../src/game/saveCodec.ts';
import { decodePersistedState } from '../../src/game/storageCompression.ts';
import {
  runExpeditionTransactionForTesting,
  simulateAfkPartyChunkForWorker,
  simulateApiSortieBatchForTesting,
  simulateExpeditionRuns,
} from '../../src/hooks/useGameState.ts';
import { setLanguage } from '../../src/i18n/index.ts';
import { withGameplayRandomSourceForTesting } from '../../src/game/gameplayRandom.ts';
import { withBattleSeedSourceForTesting } from '../../src/game/battleSeedSource.ts';
import type { GameState, Party } from '../../src/types.ts';

declare global {
  // Installed only by the audit harness when the profiling loader is enabled.
  var __bokemoRecordPartyStatsCall: ((party: Party) => void) | undefined;
}

const SAVE_PATH = resolve(process.cwd(), 'sample_savedata/Exp8,7,6,5,4,3_set_for_test_v0.9.3_dev_20260820.kemoz');
const workload = process.env.BOKEMO_STAT_WORKLOAD ?? '';
const outputDirectory = process.env.BOKEMO_PROFILE_OUTPUT_DIRECTORY;

function loadState(): GameState {
  const envelope = JSON.parse(readFileSync(SAVE_PATH, 'utf8')) as { saveDataCompressed: string };
  return hydrateGameState(JSON.parse(decodePersistedState(envelope.saveDataCompressed)) as GameState);
}

function seededRandom(seed: number): () => number {
  let value = seed >>> 0 || 0x9e3779b9;
  return () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return (value >>> 0) / 0x1_0000_0000;
  };
}

function deterministic<T>(seed: number, operation: () => T): T {
  let battle = 0n;
  return withBattleSeedSourceForTesting(
    () => (BigInt(seed) << 32n) | battle++,
    () => withGameplayRandomSourceForTesting(seededRandom(seed), operation),
  );
}

function fingerprint(party: Party): string {
  const relevant = JSON.stringify({
    level: party.level,
    deity: party.deity,
    deityGold: party.deityGold,
    characters: party.characters.map((character) => ({
      id: character.id,
      raceId: character.raceId,
      gender: character.gender,
      lineageId: character.lineageId,
      predispositionId: character.predispositionId,
      mainClassId: character.mainClassId,
      subClassId: character.subClassId,
      mimorianEnemyId: character.mimorianEnemyId,
      equipment: character.equipment,
    })),
  });
  let hash = 0x811c9dc5;
  for (let index = 0; index < relevant.length; index += 1) {
    hash ^= relevant.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

const calls = new Map<string, { count: number; partyIds: Set<number>; fingerprints: Map<string, number> }>();
if (process.env.BOKEMO_STAT_AUDIT === '1') {
  globalThis.__bokemoRecordPartyStatsCall = (party) => {
    const frames = new Error().stack?.split('\n').slice(2) ?? [];
    const caller = frames.filter((frame) => (
      !frame.includes('partyComputation.ts') && !frame.includes('at computePartyStats ')
    )).slice(0, 4).map((frame) => frame.trim()).join(' <- ') || '<unknown>';
    const current = calls.get(caller) ?? { count: 0, partyIds: new Set<number>(), fingerprints: new Map<string, number>() };
    const stateFingerprint = fingerprint(party);
    current.count += 1;
    current.partyIds.add(party.id);
    current.fingerprints.set(stateFingerprint, (current.fingerprints.get(stateFingerprint) ?? 0) + 1);
    calls.set(caller, current);
  };
}

function post(session: Session, method: string, params?: Record<string, unknown>): Promise<Record<string, unknown>> {
  return new Promise((resolvePromise, reject) => session.post(method, params, (error, result) => (
    error ? reject(error) : resolvePromise(result as Record<string, unknown>)
  )));
}

async function execute(state: GameState): Promise<Record<string, unknown>> {
  const lastPartyIndex = state.parties.length - 1;
  const simulatedAt = Date.UTC(2026, 7, 25);
  const started = performance.now();
  if (workload === 'online') {
    deterministic(0x3a010001, () => runExpeditionTransactionForTesting(state, lastPartyIndex, { gameMode: 'm.kemo', simulatedAt }));
  } else if (workload === 'simulation') {
    await deterministic(0x3a020002, () => simulateExpeditionRuns(state, lastPartyIndex, 'm.kemo', 1));
  } else if (workload === 'gods-battle') {
    const partyIndex = state.parties.findIndex((party) => (
      Boolean(party.defeatedBossExpeditions[party.selectedDungeonId])
      && getGodsBattleProgress(party, party.selectedDungeonId) >= getGodsBattleRequired()
    ));
    assert.ok(partyIndex >= 0, 'sample save has no Gods Battle-ready party');
    deterministic(0x3a030003, () => runExpeditionTransactionForTesting(state, partyIndex, {
      gameMode: 'm.kemo', triggerGodsBattle: true, simulatedAt,
    }));
  } else if (workload === 'afk-6x12') {
    for (const [partyIndex, party] of state.parties.entries()) {
      deterministic(0x3a040000 + partyIndex, () => simulateAfkPartyChunkForWorker(state, {
        partyIndex,
        cycleDurationMs: getApproxAfkCycleDurationMs(party, 0.05),
        simulatedCompletedAt: simulatedAt,
        cycleDurationScale: 0.05,
        gameMode: 'm.kemo',
      }));
    }
  } else if (workload === 'api-1' || workload === 'api-100') {
    const count = workload === 'api-1' ? 1 : 100;
    deterministic(0x3a050000 + count, () => simulateApiSortieBatchForTesting(
      state, lastPartyIndex, count, 'm.kemo', simulatedAt,
    ));
  } else if (workload === 'observation-before-after') {
    const before = buildExperimentalObservation(state, 1, false, {}, simulatedAt);
    const batch = deterministic(0x3a060006, () => simulateApiSortieBatchForTesting(
      state, lastPartyIndex, 1, 'm.kemo', simulatedAt,
    ));
    const after = buildExperimentalObservation(batch.state, 2, false, {}, simulatedAt);
    assert.equal(before.parties.length, state.parties.length);
    assert.equal(after.parties.length, state.parties.length);
  } else {
    throw new Error(`Unknown BOKEMO_STAT_WORKLOAD ${workload || '<missing>'}`);
  }
  return { workload, durationMs: performance.now() - started };
}

setLanguage('ja');
const state = loadState();
// Warm stat code without warming the measured transaction or mutating its state.
buildExperimentalObservation(state, 0, false, {}, Date.UTC(2026, 7, 24));
calls.clear();

let report: Record<string, unknown>;
if (outputDirectory) {
  mkdirSync(outputDirectory, { recursive: true });
  const session = new Session();
  session.connect();
  await post(session, 'Profiler.enable');
  await post(session, 'HeapProfiler.enable');
  await post(session, 'Profiler.start');
  await post(session, 'HeapProfiler.startSampling', { samplingInterval: 8_192, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
  report = await execute(state);
  const heap = await post(session, 'HeapProfiler.stopSampling');
  const cpu = await post(session, 'Profiler.stop');
  session.disconnect();
  writeFileSync(resolve(outputDirectory, `${workload}.heapprofile`), JSON.stringify(heap.profile));
  writeFileSync(resolve(outputDirectory, `${workload}.cpuprofile`), JSON.stringify(cpu.profile));
} else {
  report = await execute(state);
}

const callSites = [...calls.entries()].map(([caller, details]) => ({
  caller,
  count: details.count,
  partyIds: [...details.partyIds].sort((a, b) => a - b),
  fingerprints: Object.fromEntries([...details.fingerprints.entries()].sort()),
})).sort((left, right) => right.count - left.count || left.caller.localeCompare(right.caller));

console.info('EXPEDITION_STAT_AUDIT', JSON.stringify({
  ...report,
  totalCalls: callSites.reduce((sum, site) => sum + site.count, 0),
  callSites,
}));
