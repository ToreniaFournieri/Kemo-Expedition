import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { ENEMIES } from '../../src/data/enemies.ts';
import { planExpeditionPostService } from '../../src/game/expeditionPostService.ts';
import type { ExpeditionRewardPresentation } from '../../src/game/expeditionPresentation.ts';
import type { ExpeditionServiceResult } from '../../src/game/expeditionService.ts';
import type { Dungeon } from '../../src/types/index.ts';
import { loadAndValidateExpedition8Fixture } from './expedition8SaveFixture.ts';

test('post-service coordinator returns finalization and room presentation without mutating inputs', () => {
  const { state } = loadAndValidateExpedition8Fixture();
  const party = state.parties[0];
  const dungeon = {
    id: party.selectedDungeonId,
    name: 'Post-service Test Dungeon',
    floors: [],
  } as unknown as Dungeon;
  const transaction = {
    currentHp: party.currentHp,
    bags: party.bags,
    totalExperience: 0,
    finalOutcome: 'Clear' as const,
    roomCounter: 0,
    enemyBattleStats: {},
    revealedItemIds: [],
    revealedAbilityIds: [],
    revealedTerrainKeys: [],
    recoveredItems: [],
    retainedRewards: [],
    autoSoldItems: [],
    autoSellProfit: 25,
    endedWithDrawRetreat: false,
  };
  const serviceResult: ExpeditionServiceResult<ExpeditionRewardPresentation> = {
    transaction,
    rooms: [],
    completedBossVictory: false,
  };
  const originalState = structuredClone(state);

  const result = planExpeditionPostService({
    serviceResult,
    state,
    party,
    statusParty: party,
    dungeon,
    installedGold: 1_000,
    isGodsBattle: false,
    maxPartyHp: party.currentHp,
    enemyDefinitions: ENEMIES,
    deferBattleNarration: true,
  });

  assert.equal(result.finalization.gold, 975);
  assert.equal(result.finalization.expeditionStats.Clear, party.expeditionStats.Clear + 1);
  assert.deepEqual(result.presentation, { entries: [], deferredBattleNarrations: [] });
  assert.equal(serviceResult.transaction, transaction);
  assert.deepEqual(state, originalState);
});

test('coordinator preserves finalization-before-render order and reducer checkpoint boundary', () => {
  const coordinatorSource = readFileSync(
    resolve(process.cwd(), 'src/game/expeditionPostService.ts'),
    'utf8',
  );
  const applicationSource = readFileSync(resolve(process.cwd(), 'src/game/expeditionApplication.ts'), 'utf8');
  const finalizationIndex = coordinatorSource.indexOf('planExpeditionFinalization({');
  const presentationIndex = coordinatorSource.indexOf('renderExpeditionServiceResult({');
  const coordinatorIndex = applicationSource.indexOf('planExpeditionPostService({');
  const inventoryCompletionIndex = applicationSource.indexOf('inventoryCoordinator.complete(');

  assert.ok(finalizationIndex >= 0 && finalizationIndex < presentationIndex);
  assert.equal((applicationSource.match(/planExpeditionPostService\(/g) ?? []).length, 1);
  assert.ok(coordinatorIndex >= 0 && coordinatorIndex < inventoryCompletionIndex);
  assert.doesNotMatch(applicationSource, /planExpeditionFinalization\(|renderExpeditionServiceResult\(/);
  assert.doesNotMatch(
    coordinatorSource,
    /gameplayRandom|Math\.random|Date\.now|inventoryCoordinator|replayDeferred|Diary|planForecast|planCommitted/,
  );
});
