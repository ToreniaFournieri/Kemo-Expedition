import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AFK_CHUNK_CYCLE_COUNT,
  commitAfkPartyChunk,
  compareAfkChunkResults,
  hasPendingPartySettingChanges,
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
  const result: AfkPartyChunkResult = {
    jobId: 'job-1',
    partyIndex: 0,
    partyId: 1,
    simulatedCompletedAt: 1_000,
    cycleDurationMs: 100,
    baseState,
    resultState,
    durationMs: 5,
  };

  const committed = commitAfkPartyChunk(currentState, result);
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
