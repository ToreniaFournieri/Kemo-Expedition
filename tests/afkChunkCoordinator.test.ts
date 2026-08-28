import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AFK_CHUNK_CYCLE_COUNT,
  commitAfkPartyChunk,
  compareAfkChunkResults,
  createAfkPartyChunkColdWorkerJob,
  createAfkPartyChunkContinuationWorkerJob,
  createAfkPartyChunkResult,
  createAfkPartyChunkWorkerResult,
  createAfkPartyChunkWorkerResultV3,
  createAfkPartyChunkWorkerState,
  getAfkWorkerPoolLimit,
  hasPendingPartySettingChanges,
  hydrateAfkPartyChunkResult,
  hydrateAfkPartyChunkResultV3,
  hydrateAfkPartyChunkContinuationWorkerState,
  type AfkPartyChunkResult,
  type AfkPartyChunkWorkerResult,
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

test('schema v3 continuation restores renderer authority from retained worker history', () => {
  const retainedLog = { id: 'retained', expeditionLog: { dungeonId: 8 }, createdAt: 1 } as Party['diaryLogs'][number];
  const rendererLog = { id: 'renderer', expeditionLog: { dungeonId: 7 }, createdAt: 2 } as Party['diaryLogs'][number];
  const retainedParty = makeParty({
    diaryLogs: [retainedLog],
    lastExpeditionLog: retainedLog.expeditionLog,
    level: 2,
  });
  const authoritativeParty = makeParty({
    diaryLogs: [rendererLog, structuredClone(retainedLog)],
    lastExpeditionLog: rendererLog.expeditionLog,
    level: 3,
    selectedDungeonId: 4,
  });
  const authoritativeState = makeState(authoritativeParty, 150, 3);
  const baseJob: import('../src/game/afkChunkCoordinator.ts').AfkPartyChunkJob = {
    jobId: 'continuation-1', partyIndex: 0, partyId: 1,
    simulatedStartedAt: 0, simulatedCompletedAt: 1_000, cycleDurationMs: 100,
    baseState: authoritativeState, gameMode: 'm.kemo', cycleDurationScale: 1,
  };
  const job = createAfkPartyChunkContinuationWorkerJob(
    baseJob,
    retainedParty,
    'retained-token',
    1,
    'next-token',
    2,
  );

  assert.equal(job.transferSchemaVersion, 3);
  assert.equal(job.transferKind, 'continuation');
  assert.deepEqual(job.baseState.parties[0].diaryLogs, []);
  assert.deepEqual(job.partyHistory.diaryLogs[1], { source: 'retained', index: 0 });
  assert.equal(job.partyHistory.diaryLogs[0]?.source, 'renderer');
  const hydrated = hydrateAfkPartyChunkContinuationWorkerState(job, retainedParty, 'retained-token', 1);
  assert.equal(JSON.stringify(hydrated), JSON.stringify(authoritativeState));
});

test('schema v3 continuation rejects stale tokens, revisions, and party identities', () => {
  const party = makeParty();
  const baseJob: import('../src/game/afkChunkCoordinator.ts').AfkPartyChunkJob = {
    jobId: 'continuation-invalid', partyIndex: 0, partyId: 1,
    simulatedStartedAt: 0, simulatedCompletedAt: 1_000, cycleDurationMs: 100,
    baseState: makeState(party, 100, 1), gameMode: 'm.kemo', cycleDurationScale: 1,
  };
  const job = createAfkPartyChunkContinuationWorkerJob(baseJob, party, 'token', 1, 'next', 2);
  assert.throws(
    () => hydrateAfkPartyChunkContinuationWorkerState(job, party, 'stale', 1),
    /state mismatch/,
  );
  assert.throws(
    () => hydrateAfkPartyChunkContinuationWorkerState(job, party, 'token', 2),
    /state mismatch/,
  );
  assert.throws(
    () => hydrateAfkPartyChunkContinuationWorkerState(job, makeParty({ id: 2 }), 'token', 1),
    /party identity mismatch/,
  );
  assert.throws(
    () => createAfkPartyChunkContinuationWorkerJob(baseJob, party, 'token', 2, 'next', 2),
    /reconciliation revision/,
  );
});

test('schema v3 worker results validate continuation acknowledgements', () => {
  const party = makeParty();
  const state = makeState(party, 100, 1);
  const cold = createAfkPartyChunkColdWorkerJob({
    jobId: 'cold-v3', partyIndex: 0, partyId: 1,
    simulatedStartedAt: 0, simulatedCompletedAt: 1_000, cycleDurationMs: 100,
    baseState: state, gameMode: 'm.kemo', cycleDurationScale: 1,
  }, 'state-1', 1);
  const complete = createAfkPartyChunkResult(cold, state, 5);
  const workerResult = createAfkPartyChunkWorkerResultV3(complete, {
    consumedStateToken: null,
    nextStateToken: cold.nextStateToken,
    reconciliationRevision: cold.reconciliationRevision,
  });
  assert.equal(workerResult.transferSchemaVersion, 3);
  assert.equal(workerResult.nextStateToken, 'state-1');
  assert.equal(JSON.stringify(hydrateAfkPartyChunkResultV3(workerResult, party)), JSON.stringify(complete));
  assert.throws(
    () => hydrateAfkPartyChunkResultV3({ ...workerResult, nextStateToken: '' }, party),
    /acknowledgement/,
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

test('worker history transfer preserves an explicit latest expedition outside the Diary', () => {
  const retainedLog = { id: 'retained', expeditionLog: { dungeonId: 8 }, createdAt: 1 } as Party['diaryLogs'][number];
  const explicitLatest = { dungeonId: 7 } as NonNullable<Party['lastExpeditionLog']>;
  const baseParty = makeParty({ diaryLogs: [retainedLog], lastExpeditionLog: retainedLog.expeditionLog });
  const resultParty = makeParty({ diaryLogs: [retainedLog], lastExpeditionLog: explicitLatest });
  const baseState = makeState(baseParty, 100, 1);
  const complete = createAfkPartyChunkResult({
    jobId: 'job-explicit-latest', partyIndex: 0, partyId: 1,
    simulatedStartedAt: 0, simulatedCompletedAt: 1_000, cycleDurationMs: 100,
    baseState, gameMode: 'm.kemo', cycleDurationScale: 1,
  }, makeState(resultParty, 100, 1), 5);

  const workerResult = createAfkPartyChunkWorkerResult(complete);
  assert.deepEqual(workerResult.partyHistory.lastExpeditionLog, { source: 'worker', value: explicitLatest });
  assert.equal(JSON.stringify(hydrateAfkPartyChunkResult(workerResult, baseParty)), JSON.stringify(complete));
});

test('worker history hydration rejects incompatible schemas and invalid references', () => {
  const retainedLog = { id: 'retained', expeditionLog: { dungeonId: 8 }, createdAt: 1 } as Party['diaryLogs'][number];
  const baseParty = makeParty({ diaryLogs: [retainedLog], lastExpeditionLog: retainedLog.expeditionLog });
  const baseState = makeState(baseParty, 100, 1);
  const complete = createAfkPartyChunkResult({
    jobId: 'job-invalid-history', partyIndex: 0, partyId: 1,
    simulatedStartedAt: 0, simulatedCompletedAt: 1_000, cycleDurationMs: 100,
    baseState, gameMode: 'm.kemo', cycleDurationScale: 1,
  }, baseState, 5);
  const workerResult = createAfkPartyChunkWorkerResult(complete);

  assert.throws(
    () => hydrateAfkPartyChunkResult({ ...workerResult, transferSchemaVersion: 1 } as unknown as AfkPartyChunkWorkerResult, baseParty),
    /unsupported transferSchemaVersion/,
  );
  assert.throws(
    () => hydrateAfkPartyChunkResult({
      ...workerResult,
      partyHistory: { ...workerResult.partyHistory, diaryLogs: [{ source: 'base', index: 1 }] },
    }, baseParty),
    /invalid base Diary reference/,
  );
  assert.throws(
    () => hydrateAfkPartyChunkResult({
      ...workerResult,
      partyHistory: { ...workerResult.partyHistory, lastExpeditionLog: { source: 'diary', index: 1 } },
    }, baseParty),
    /invalid lastExpeditionLog Diary reference/,
  );
  assert.throws(
    () => hydrateAfkPartyChunkResult({ ...workerResult, partyId: 2 }, baseParty),
    /party identity mismatch/,
  );
  assert.throws(
    () => hydrateAfkPartyChunkResult({
      ...workerResult,
      partyHistory: {
        ...workerResult.partyHistory,
        diaryLogs: Array.from({ length: 25 }, () => ({ source: 'base' as const, index: 0 })),
      },
    }, baseParty),
    /Diary retention limit exceeded/,
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
