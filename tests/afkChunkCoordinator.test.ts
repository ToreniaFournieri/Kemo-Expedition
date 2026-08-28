import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AFK_CHUNK_CYCLE_COUNT,
  commitAfkPartyChunk,
  compareAfkChunkResults,
  createAfkPartyChunkResult,
  createAfkPartyChunkWorkerResult,
  createAfkPartyChunkWorkerState,
  getAfkWorkerPoolLimit,
  hasPendingPartySettingChanges,
  hydrateAfkPartyChunkResult,
  type AfkPartyChunkResult,
} from '../src/game/afkChunkCoordinator.ts';
import type { GameState, Party } from '../src/types/index.ts';

function makeParty(overrides: Partial<Party> = {}): Party {
  return {
    id: 1,
    name: 'PT1',
    level: 1,
    experience: 0,
    characters: [{
      id: 1,
      name: 'Kemo',
      gender: 'male',
      raceId: 'caninian',
      mainClassId: 'guardian',
      subClassId: 'guardian',
      predispositionId: 'brave',
      lineageId: 'unascertained',
      equipment: [],
    }],
    deity: { name: 'none', uniqueAbilities: [] },
    selectedDungeonId: 1,
    expeditionDestinationMode: 'fixed',
    expeditionDepthLimit: 'all',
    expeditionDifficultyOffset: 0,
    expeditionDifficultyOffsetByDungeon: {},
    lastExpeditionLog: null,
    diaryLogs: [],
    diarySettings: {} as Party['diarySettings'],
    ...overrides,
  } as Party;
}

function makeState(party: Party, gold: number, inventoryCount: number): GameState {
  return {
    scene: 'home',
    selectedPartyIndex: 0,
    buildNumber: 1,
    parties: [party],
    bags: {} as GameState['bags'],
    global: {
      gold,
      prana: 0,
      inventory: {
        '1-0-0': {
          item: { id: 1, category: 'sword', name: 'Sword', enhancement: 0, superRare: 0 },
          count: inventoryCount,
          status: 'owned',
          isNew: false,
        },
      },
      jewels: {},
      deityDonations: {},
      unlockedMimorianEnemyIds: [],
      unlockedDeities: [],
      challengedGodNames: [],
      revealedItemCompendiumItemIds: [],
      revealedGlossaryAbilityIds: [],
      revealedGlossaryTerrainKeys: [],
      shopPurchases: {},
      jewelShopPurchases: {},
      shopRefreshCounts: {},
      shopIntimacy: 0,
      shopIntimacyLastDecayAt: 0,
      readDeveloperNewsItemIds: [],
      language: 'en',
      userId: 'test',
    },
  };
}

test('party AFK Chunks contain exactly twelve Cycles', () => {
  assert.equal(AFK_CHUNK_CYCLE_COUNT, 12);
});

test('unmeasured AFK transfer sizes remain unavailable', () => {
  const baseState = makeState(makeParty(), 100, 1);
  const result = createAfkPartyChunkResult({
    jobId: 'job-unmeasured',
    partyIndex: 0,
    partyId: 1,
    simulatedCompletedAt: 1_000,
    cycleDurationMs: 100,
    baseState,
    gameMode: 'm.kemo',
    cycleDurationScale: 1,
    simulatedStartedAt: 0,
  }, baseState, 5);

  assert.equal(result.workerTelemetry.inputTransferBytes, null);
  assert.equal(result.workerTelemetry.outputTransferBytes, null);
});

test('party-scoped worker inputs remove only inactive Diary presentation history', () => {
  const target = makeParty({
    id: 1,
    lastExpeditionLog: { dungeonId: 8 } as Party['lastExpeditionLog'],
    diaryLogs: [{ id: 'target-log' }] as Party['diaryLogs'],
  });
  const inactive = makeParty({
    id: 2,
    name: 'PT2',
    lastExpeditionLog: { dungeonId: 7 } as Party['lastExpeditionLog'],
    diaryLogs: [{ id: 'inactive-log' }] as Party['diaryLogs'],
  });
  const state = makeState(target, 100, 1);
  state.parties.push(inactive);

  const workerState = createAfkPartyChunkWorkerState(state, 0);

  assert.notEqual(workerState, state);
  assert.equal(workerState.parties[0], target);
  assert.equal(workerState.parties[1].id, inactive.id);
  assert.equal(workerState.parties[1].name, inactive.name);
  assert.equal(workerState.parties[1].lastExpeditionLog, null);
  assert.deepEqual(workerState.parties[1].diaryLogs, []);
  assert.equal(state.parties[1].lastExpeditionLog, inactive.lastExpeditionLog);
  assert.equal(state.parties[1].diaryLogs[0]?.id, 'inactive-log');
});

test('renderer hydration restores the exact complete worker-result envelope', () => {
  const baseState = makeState(makeParty(), 100, 1);
  const complete = createAfkPartyChunkResult({
    jobId: 'job-compact-output',
    partyIndex: 0,
    partyId: 1,
    simulatedCompletedAt: 1_000,
    cycleDurationMs: 100,
    baseState,
    gameMode: 'm.kemo',
    cycleDurationScale: 1,
    simulatedStartedAt: 0,
  }, baseState, 5);

  const workerResult = createAfkPartyChunkWorkerResult(complete);
  assert.equal('baseParty' in workerResult, false);
  assert.equal(workerResult.transferSchemaVersion, 2);
  assert.deepEqual(workerResult.resultParty.diaryLogs, []);
  assert.equal(workerResult.resultParty.lastExpeditionLog, null);
  assert.equal(
    JSON.stringify(hydrateAfkPartyChunkResult(workerResult, baseState.parties[0])),
    JSON.stringify(complete),
  );
});

test('worker history transfer references the renderer-owned retained Diary suffix', () => {
  const retainedLog = { id: 'retained', expeditionLog: { dungeonId: 8 }, createdAt: 1 } as Party['diaryLogs'][number];
  const newLog = { id: 'new', expeditionLog: { dungeonId: 8 }, createdAt: 2 } as Party['diaryLogs'][number];
  const baseParty = makeParty({ diaryLogs: [retainedLog], lastExpeditionLog: retainedLog.expeditionLog });
  const resultParty = makeParty({ diaryLogs: [newLog, retainedLog], lastExpeditionLog: newLog.expeditionLog });
  const baseState = makeState(baseParty, 100, 1);
  const resultState = makeState(resultParty, 100, 1);
  const complete = createAfkPartyChunkResult({
    jobId: 'job-history-delta', partyIndex: 0, partyId: 1,
    simulatedStartedAt: 0, simulatedCompletedAt: 1_000, cycleDurationMs: 100,
    baseState, gameMode: 'm.kemo', cycleDurationScale: 1,
  }, resultState, 5);

  const workerResult = createAfkPartyChunkWorkerResult(complete);
  assert.deepEqual(workerResult.partyHistory.diaryLogs[1], { source: 'base', index: 0 });
  assert.equal(workerResult.partyHistory.diaryLogs[0]?.source, 'worker');
  assert.deepEqual(workerResult.partyHistory.lastExpeditionLog, { source: 'diary', index: 0 });
  assert.equal(
    JSON.stringify(hydrateAfkPartyChunkResult(workerResult, baseParty)),
    JSON.stringify(complete),
  );
});

test('AFK worker pool preserves renderer capacity and never exceeds party count', () => {
  assert.equal(getAfkWorkerPoolLimit(2, 6), 1);
  assert.equal(getAfkWorkerPoolLimit(4, 6), 2);
  assert.equal(getAfkWorkerPoolLimit(8, 6), 2);
  assert.equal(getAfkWorkerPoolLimit(16, 2), 2);
  assert.equal(getAfkWorkerPoolLimit(undefined, 6), 2);
});

test('coordinator order is simulated completion time then party ID', () => {
  const later = { simulatedCompletedAt: 200, partyId: 1, jobId: 'b' };
  const earlierHigherParty = { simulatedCompletedAt: 100, partyId: 2, jobId: 'c' };
  const earlierLowerParty = { simulatedCompletedAt: 100, partyId: 1, jobId: 'a' };
  assert.deepEqual(
    [later, earlierHigherParty, earlierLowerParty].sort(compareAfkChunkResults),
    [earlierLowerParty, earlierHigherParty, later],
  );
});

test('coordinator merges stale global deltas and lets pending PT settings win', () => {
  const baseParty = makeParty();
  const baseState = makeState(baseParty, 100, 1);
  const workerParty = makeParty({ level: 2, selectedDungeonId: 2 });
  const resultState = makeState(workerParty, 115, 3);
  const liveParty = makeParty({
    selectedDungeonId: 9,
    characters: [{ ...baseParty.characters[0], name: 'Pending name' }],
  });
  const currentState = makeState(liveParty, 120, 4);
  const result: AfkPartyChunkResult = createAfkPartyChunkResult({
    jobId: 'job-1',
    partyIndex: 0,
    partyId: 1,
    simulatedCompletedAt: 1_000,
    cycleDurationMs: 100,
    baseState,
    gameMode: 'm.kemo',
    cycleDurationScale: 1,
    simulatedStartedAt: 0,
  }, resultState, 5, {
    workerStartupMs: 1,
    queueMs: 2,
    executionMs: 3,
    inputTransferBytes: 4,
    outputTransferBytes: 5,
  });

  const committed = commitAfkPartyChunk(currentState, result);
  assert.equal('baseState' in result, false);
  assert.equal('resultState' in result, false);
  assert.equal(result.schemaVersion, 1);
  assert.deepEqual(result.workerTelemetry, {
    workerStartupMs: 1,
    queueMs: 2,
    executionMs: 3,
    inputTransferBytes: 4,
    outputTransferBytes: 5,
  });
  assert.equal(committed.global.gold, 135);
  assert.equal(committed.global.inventory['1-0-0'].count, 6);
  assert.equal(committed.parties[0].level, 2);
  assert.equal(committed.parties[0].selectedDungeonId, 9);
  assert.equal(committed.parties[0].characters[0].name, 'Pending name');
});

test('transaction cutoff detects PT settings without treating Chunk progress as pending input', () => {
  const baseParty = makeParty();
  assert.equal(hasPendingPartySettingChanges(baseParty, makeParty()), false);
  assert.equal(hasPendingPartySettingChanges(baseParty, makeParty({ level: 2, experience: 10 })), false);
  assert.equal(hasPendingPartySettingChanges(baseParty, makeParty({ selectedDungeonId: 2 })), true);
  assert.equal(hasPendingPartySettingChanges(baseParty, makeParty({
    characters: [{ ...baseParty.characters[0], autoEquipmentMode: 1 }],
  })), true);
});
