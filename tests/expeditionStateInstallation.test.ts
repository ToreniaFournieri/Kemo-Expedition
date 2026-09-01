import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  planCommittedExpeditionState,
  planForecastExpeditionState,
} from '../src/game/expeditionStateInstallation.ts';
import type {
  DiaryLog,
  ExpeditionLog,
  GameBags,
  GameState,
  InventoryRecord,
  Party,
} from '../src/types/index.ts';

function createLog(): ExpeditionLog {
  return {
    dungeonId: 1,
    dungeonName: 'Test Dungeon',
    difficultyOffset: 0,
    totalExperience: 10,
    totalRooms: 4,
    completedRooms: 1,
    finalOutcome: 'Clear',
    entries: [],
    rewards: [],
    autoSellProfit: 25,
    autoSellCount: 1,
    autoSellItems: [],
    remainingPartyHP: 450,
    maxPartyHP: 500,
  };
}

test('committed state planner installs one expedition projection without mutating its source', () => {
  const oldBags = { marker: 'old' } as unknown as GameBags;
  const nextBags = { marker: 'next' } as unknown as GameBags;
  const oldInventory = { old: [] } as unknown as InventoryRecord;
  const nextInventory = { next: [] } as unknown as InventoryRecord;
  const party = {
    id: 1,
    clearGateProgress: { old: 2 },
    clearGateStatus: { 1014: false },
    defeatedBossExpeditions: { 1: false },
    bags: oldBags,
    pendingProfit: 7,
    currentHp: 500,
    expeditionRewardsPending: false,
    lastExpeditionLog: null,
    pendingDiaryLog: null,
  } as unknown as Party;
  const untouchedParty = { id: 2, name: 'PT2' } as Party;
  const state = {
    parties: [party, untouchedParty],
    global: {
      inventory: oldInventory,
      gold: 100,
      revealedItemCompendiumItemIds: [1],
      revealedGlossaryAbilityIds: ['old'],
      revealedGlossaryTerrainKeys: ['terrain.old'],
      enemyBattleStats: { 1: { encounters: 1, defeats: 0 } },
      altarVictoriesByEnemyType: { beast: 1 },
    },
  } as unknown as GameState;
  const log = createLog();
  const pendingDiaryLog = {
    id: 'diary-1',
    expeditionLog: log,
    triggers: ['victory'],
    createdAt: 123,
    isRead: false,
  } as DiaryLog;

  const projection = planCommittedExpeditionState({
    state,
    partyIndex: 0,
    party,
    bags: nextBags,
    log,
    pendingDiaryLog,
    inventory: nextInventory,
    gold: 125,
    revealedGlossaryAbilityIds: ['old', 'new'],
    transaction: {
      revealedItemIds: [1, 2],
      revealedTerrainKeys: ['terrain.new'],
      enemyBattleStats: { 1: { encounters: 2, defeats: 1 } },
    },
    finalization: {
      outcome: {
        canonicalGateOutcome: 'Clear',
        clearGateProgress: { next: 1 },
        clearGateStatus: { 1014: true },
        defeatedBossExpeditions: { 1: true },
        evaluatedGateKey: 1014,
        newlyUnlockedGateKey: 1014,
      },
      autoSellProfit: 25,
      expeditionStats: {
        Clear: 1,
        Turned_Back: 0,
        Draw_Retreat: 0,
        Wounded_Retreat: 0,
        Defeat: 0,
        donatedGold: 0,
        savedGold: 0,
      },
      altarVictoriesByEnemyType: { beast: 2 },
      pendingUnlockPartySlot: 2,
    },
    defaultUnlockedDeities: ['Deity A', 'Deity B'],
  });

  const installedParty = projection.parties[0];
  assert.equal(projection.parties[1], untouchedParty);
  assert.equal(installedParty.bags, nextBags);
  assert.equal(installedParty.lastExpeditionLog, log);
  assert.equal(installedParty.pendingDiaryLog, pendingDiaryLog);
  assert.equal(installedParty.currentHp, 450);
  assert.equal(installedParty.pendingProfit, 25);
  assert.deepEqual(installedParty.pendingUnlockState, {
    deityNames: ['Deity A', 'Deity B'],
    partySlotCount: 2,
  });
  assert.deepEqual(installedParty.pendingClearGateSnapshot, {
    progress: { old: 2 },
    status: { 1014: false },
    defeatedBossExpeditions: { 1: false },
  });
  assert.equal(projection.global.inventory, nextInventory);
  assert.equal(projection.global.gold, 125);
  assert.deepEqual(projection.global.revealedItemCompendiumItemIds, [1, 2]);
  assert.deepEqual(projection.global.revealedGlossaryAbilityIds, ['old', 'new']);
  assert.deepEqual(projection.global.revealedGlossaryTerrainKeys, ['terrain.new']);
  assert.deepEqual(projection.global.altarVictoriesByEnemyType, { beast: 2 });
  assert.equal(state.parties[0], party);
  assert.equal(state.global.inventory, oldInventory);
  assert.equal(party.pendingProfit, 7);
});

test('forecast state planner changes only the selected private Party projection', () => {
  const oldBags = { marker: 'old' } as unknown as GameBags;
  const nextBags = { marker: 'forecast' } as unknown as GameBags;
  const party = {
    id: 1,
    bags: oldBags,
    currentHp: 500,
    lastExpeditionLog: createLog(),
    pendingDiaryLog: { id: 'old-diary' },
  } as unknown as Party;
  const untouchedParty = { id: 2, name: 'PT2' } as Party;
  const global = { gold: 100 } as GameState['global'];
  const state = { parties: [party, untouchedParty], global } as GameState;

  const forecast = planForecastExpeditionState({
    state,
    partyIndex: 0,
    party,
    bags: nextBags,
    finalPartyHp: 321,
  });

  assert.notEqual(forecast, state);
  assert.notEqual(forecast.parties, state.parties);
  assert.equal(forecast.global, global);
  assert.equal(forecast.parties[1], untouchedParty);
  assert.equal(forecast.parties[0].bags, nextBags);
  assert.equal(forecast.parties[0].currentHp, 321);
  assert.equal(forecast.parties[0].lastExpeditionLog, null);
  assert.equal(forecast.parties[0].pendingDiaryLog, null);
  assert.equal(party.bags, oldBags);
  assert.equal(party.currentHp, 500);
});

test('committed state planner source owns installation without random or publication authority', () => {
  const plannerSource = readFileSync(
    new URL('../src/game/expeditionStateInstallation.ts', import.meta.url),
    'utf8',
  );
  const hookSource = readFileSync(new URL('../src/hooks/useGameState.ts', import.meta.url), 'utf8');
  const runExpedition = hookSource.match(/case 'RUN_EXPEDITION':[\s\S]*?case 'FINALIZE_DIARY_LOG':/)?.[0] ?? '';
  assert.match(runExpedition, /planCommittedExpeditionState\(/);
  assert.match(runExpedition, /gameplayRandom\(\)[\s\S]{0,300}planForecastExpeditionState\(/);
  assert.match(runExpedition, /planForecastExpeditionState\([\s\S]{0,300}forecastResolutionByState\.set/);
  assert.doesNotMatch(runExpedition, /const updatedParties = \[\.\.\.state\.parties\]/);
  assert.doesNotMatch(runExpedition, /expeditionRewardsPending: true/);
  assert.doesNotMatch(runExpedition, /pendingClearGateSnapshot:/);
  assert.doesNotMatch(runExpedition, /altarVictoriesByEnemyType: finalization/);
  assert.match(plannerSource, /expeditionRewardsPending: true/);
  assert.match(plannerSource, /pendingClearGateSnapshot:/);
  assert.doesNotMatch(plannerSource, /gameplayRandom|Math\.random|Date\.now|forecastResolutionByState/);
});
