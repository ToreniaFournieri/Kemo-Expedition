import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { BONUS_ABILITY_GLOSSARY_ENTRIES } from '../../src/data/bonusAbilityGlossary.ts';
import { planExpeditionCommit } from '../../src/game/expeditionCommit.ts';
import type {
  ExpeditionLog,
  GameBags,
  GameState,
  InventoryRecord,
  Party,
} from '../../src/types/index.ts';

function createLog(): ExpeditionLog {
  return {
    dungeonId: 1,
    dungeonName: 'Commit Test Dungeon',
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

test('commit coordinator assembles Diary and validated disclosures before state projection', () => {
  const bags = { marker: 'next' } as unknown as GameBags;
  const inventory = { next: [] } as unknown as InventoryRecord;
  const party = {
    id: 1,
    clearGateProgress: {},
    clearGateStatus: {},
    defeatedBossExpeditions: {},
  } as unknown as Party;
  const state = {
    parties: [party],
    global: {
      gold: 100,
      inventory: {} as InventoryRecord,
      revealedGlossaryAbilityIds: ['existing'],
      revealedGlossaryTerrainKeys: [],
    },
  } as unknown as GameState;
  const log = createLog();
  const validAbilityId = BONUS_ABILITY_GLOSSARY_ENTRIES[0].abilityId;

  const projection = planExpeditionCommit({
    state,
    partyIndex: 0,
    party,
    bags,
    log,
    diaryTriggers: ['victory'],
    diaryCreatedAt: 123456,
    diaryIdToken: 'abc123',
    inventory,
    gold: 125,
    transaction: {
      revealedItemIds: [1, 2],
      revealedAbilityIds: [validAbilityId, 'invalid'],
      revealedTerrainKeys: ['terrain.new'],
      enemyBattleStats: { 1: { encounters: 1, defeats: 1 } },
    },
    finalization: {
      outcome: {
        canonicalGateOutcome: 'Clear',
        clearGateProgress: {},
        clearGateStatus: {},
        defeatedBossExpeditions: { 1: true },
        evaluatedGateKey: null,
        newlyUnlockedGateKey: null,
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
      altarVictoriesByEnemyType: {},
      pendingUnlockPartySlot: null,
    },
    defaultUnlockedDeities: [],
  });

  assert.equal(projection.parties[0].pendingDiaryLog?.id, '123456-abc123');
  assert.equal(projection.parties[0].pendingDiaryLog?.expeditionLog, log);
  assert.deepEqual(projection.global.revealedGlossaryAbilityIds, ['existing', validAbilityId]);
  assert.equal(projection.global.inventory, inventory);
  assert.equal(projection.global.gold, 125);
  assert.equal(state.parties[0], party);
  assert.equal(party.pendingDiaryLog, undefined);
});

test('commit coordinator preserves its deterministic call order and reducer boundaries', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/game/expeditionCommit.ts'), 'utf8');
  const hookSource = readFileSync(resolve(process.cwd(), 'src/hooks/useGameState.ts'), 'utf8');
  const applicationSource = readFileSync(resolve(process.cwd(), 'src/game/expeditionApplication.ts'), 'utf8');
  const runExpedition = hookSource.match(/case 'RUN_EXPEDITION':[\s\S]*?case 'FINALIZE_DIARY_LOG':/)?.[0] ?? '';
  const diaryIndex = source.indexOf('planPendingExpeditionDiaryLog({');
  const disclosureIndex = source.indexOf('planGlossaryRevealFromEncounter({');
  const stateIndex = source.indexOf('planCommittedExpeditionState({');

  assert.ok(diaryIndex >= 0 && diaryIndex < disclosureIndex && disclosureIndex < stateIndex);
  assert.equal((applicationSource.match(/planExpeditionCommit\(/g) ?? []).length, 1);
  assert.doesNotMatch(applicationSource, /planPendingExpeditionDiaryLog\(|planCommittedExpeditionState\(/);
  assert.doesNotMatch(applicationSource, /revealGlossaryFromEncounter|resolveRevealedGlossaryAbilityIds/);
  assert.match(
    applicationSource,
    /const diaryCreatedAt = command\.simulatedAt \?\? authorities\.getCommittedAt\(\);[\s\S]{0,240}authorities\.random\(\)[\s\S]{0,500}planExpeditionCommit\(/,
  );
  assert.match(applicationSource, /planExpeditionCommit\([\s\S]{0,900}return \{ kind: 'committed', projection/);
  assert.match(runExpedition, /return \{[\s\S]{0,100}\.\.\.result\.projection/);
  assert.doesNotMatch(source, /gameplayRandom|Math\.random|Date\.now|forecastResolutionByState|return \{\s*\.\.\.input\.state/);
});
