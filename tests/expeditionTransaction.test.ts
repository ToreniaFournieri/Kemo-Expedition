import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  ExpeditionTransactionAccumulator,
  getPartyUnlockSlotForBossVictory,
  planExpeditionFinalization,
} from '../src/game/expeditionTransaction.ts';
import type { GameBags, Item } from '../src/types/index.ts';

function createOpaqueBags(): GameBags {
  return {} as GameBags;
}

function createItem(id: number): Item {
  return { id, enhancement: 0, superRare: 0 } as Item;
}

const BASE_FINALIZATION_STATE = {
  expeditionStats: {
    Clear: 1,
    Turned_Back: 2,
    Draw_Retreat: 3,
    Wounded_Retreat: 4,
    Defeat: 5,
    donatedGold: 6,
    savedGold: 7,
  },
  altarVictoriesByEnemyType: {},
  assignedMimorianEnemyTypes: [],
  currentUnlockedPartySlots: 1,
  completedBossVictory: false,
} as const;

test('transaction accumulator owns room counters, battle statistics, disclosures, bags, and XP', () => {
  const initialBags = createOpaqueBags();
  const rewardBags = { ...initialBags, commonRewardBag: { entries: [] } };
  const originalStats = { 10: { defeats: 2, encounters: 3 } };
  const transaction = new ExpeditionTransactionAccumulator({
    initialHp: 500,
    bags: initialBags,
    enemyBattleStats: originalStats,
    revealedItemIds: [1],
    revealedAbilityIds: ['existing'],
    revealedTerrainKeys: ['terrain.existing'],
  });

  assert.equal(transaction.beginRoom(), 1);
  assert.equal(transaction.beginRoom(), 2);
  transaction.recordBattleRoom({
    enemyId: 10,
    victory: true,
    bags: initialBags,
    revealedItemIds: [1, 2],
    revealedAbilityIds: ['existing', 'new'],
    terrainEffect: 'terrain.new',
  });
  transaction.recordVictoryRewards({ experience: 10.25, bags: rewardBags });
  const result = transaction.finish();

  assert.equal(result.roomCounter, 2);
  assert.equal(result.totalExperience, 11);
  assert.equal(result.bags, rewardBags);
  assert.deepEqual(result.enemyBattleStats[10], { defeats: 3, encounters: 4 });
  assert.deepEqual(originalStats[10], { defeats: 2, encounters: 3 });
  assert.deepEqual(result.revealedItemIds, [1, 2]);
  assert.deepEqual(result.revealedAbilityIds, ['existing', 'new']);
  assert.deepEqual(result.revealedTerrainKeys, ['terrain.existing', 'terrain.new']);
});

test('transaction retains language-neutral recovered and auto-sell facts as detached results', () => {
  const retained = createItem(101);
  const sold = createItem(102);
  const transaction = new ExpeditionTransactionAccumulator({ initialHp: 500, bags: createOpaqueBags() });
  transaction.recordRecoveredItems({
    recoveredItems: [retained, sold],
    retainedItems: [retained],
    autoSoldItems: [{ item: sold, profit: 75 }],
  });

  const first = transaction.finish();
  first.recoveredItems.length = 0;
  first.retainedRewards.length = 0;
  (first.autoSoldItems[0] as { profit: number }).profit = 0;
  const second = transaction.finish();

  assert.deepEqual(second.recoveredItems, [retained, sold]);
  assert.deepEqual(second.retainedRewards, [retained]);
  assert.deepEqual(second.autoSoldItems, [{ item: sold, profit: 75 }]);
  assert.equal(second.autoSellProfit, 75);
});

test('finalization plan commits rewards and defers auto-sell profit to the Cycle', () => {
  const retained = createItem(201);
  const sold = createItem(202);
  const transaction = new ExpeditionTransactionAccumulator({ initialHp: 500, bags: createOpaqueBags() });
  transaction.recordRecoveredItems({
    recoveredItems: [retained, sold],
    retainedItems: [retained],
    autoSoldItems: [{ item: sold, profit: 40 }],
  });
  const plan = planExpeditionFinalization({
    transaction: transaction.finish(),
    initialGold: 100,
    installedGold: 140,
    isGodsBattle: false,
    dungeonId: 1,
    clearGateProgress: {},
    clearGateStatus: {},
    defeatedBossExpeditions: {},
    ...BASE_FINALIZATION_STATE,
  });

  assert.equal(plan.shouldRollbackInventory, false);
  assert.equal(plan.gold, 100);
  assert.deepEqual(plan.rewards, [retained]);
  assert.deepEqual(plan.autoSoldItems, [{ item: sold, profit: 40 }]);
  assert.equal(plan.autoSellProfit, 40);
  assert.equal(plan.autoSellItemCount, 1);
  assert.equal(plan.outcome.canonicalGateOutcome, 'Clear');
});

test('defeat finalization discards item facts and restores the initial gold plan', () => {
  const sold = createItem(301);
  const transaction = new ExpeditionTransactionAccumulator({ initialHp: 500, bags: createOpaqueBags() });
  transaction.recordRecoveredItems({
    recoveredItems: [sold],
    retainedItems: [],
    autoSoldItems: [{ item: sold, profit: 30 }],
  });
  transaction.recordDefeat(0);
  const plan = planExpeditionFinalization({
    transaction: transaction.finish(),
    initialGold: 100,
    installedGold: 130,
    isGodsBattle: false,
    dungeonId: 1,
    clearGateProgress: {},
    clearGateStatus: {},
    defeatedBossExpeditions: {},
    ...BASE_FINALIZATION_STATE,
  });

  assert.equal(plan.shouldRollbackInventory, true);
  assert.equal(plan.gold, 100);
  assert.deepEqual(plan.rewards, []);
  assert.deepEqual(plan.autoSoldItems, []);
  assert.equal(plan.autoSellProfit, 0);
  assert.equal(plan.autoSellItemCount, 0);
  assert.equal(plan.outcome.canonicalGateOutcome, 'Defeat');
  assert.equal(plan.expeditionStats.Defeat, 6);
});

test('finalization plans statistics, unique Altar victories, and Boss party unlock retention', () => {
  const transaction = new ExpeditionTransactionAccumulator({ initialHp: 500, bags: createOpaqueBags() });
  const plan = planExpeditionFinalization({
    transaction: transaction.finish(),
    initialGold: 0,
    installedGold: 0,
    isGodsBattle: false,
    dungeonId: 3,
    clearGateProgress: {},
    clearGateStatus: {},
    defeatedBossExpeditions: {},
    ...BASE_FINALIZATION_STATE,
    altarVictoriesByEnemyType: { beast: 9, flying: 2 },
    assignedMimorianEnemyTypes: ['beast', 'beast', 'undead'],
    completedBossVictory: true,
  });

  assert.deepEqual(plan.expeditionStats, {
    Clear: 2,
    Turned_Back: 2,
    Draw_Retreat: 3,
    Wounded_Retreat: 4,
    Defeat: 5,
    donatedGold: 6,
    savedGold: 7,
  });
  assert.deepEqual(plan.altarVictoriesByEnemyType, { beast: 10, flying: 2, undead: 1 });
  assert.equal(plan.pendingUnlockPartySlot, 2);
  assert.equal(plan.requiresUnlockNarration, true);
});

test('an already available party slot does not request unlock narration', () => {
  const transaction = new ExpeditionTransactionAccumulator({ initialHp: 500, bags: createOpaqueBags() });
  const plan = planExpeditionFinalization({
    transaction: transaction.finish(),
    initialGold: 0,
    installedGold: 0,
    isGodsBattle: false,
    dungeonId: 3,
    clearGateProgress: {},
    clearGateStatus: {},
    defeatedBossExpeditions: {},
    ...BASE_FINALIZATION_STATE,
    currentUnlockedPartySlots: 2,
    completedBossVictory: true,
  });

  assert.equal(plan.pendingUnlockPartySlot, null);
  assert.equal(plan.requiresUnlockNarration, false);
});

test('party unlock mapping follows the five specification Boss milestones', () => {
  assert.deepEqual(
    [1, 2, 3, 4, 5, 6, 7, 8].map(getPartyUnlockSlotForBossVictory),
    [null, null, 2, 3, 4, 5, 6, null],
  );
});

test('wounded retreat has precedence while ordinary continuation can end at the depth limit', () => {
  const wounded = new ExpeditionTransactionAccumulator({ initialHp: 500, bags: createOpaqueBags() });
  wounded.recordPostReward({
    preContinuationHp: 100,
    finalHp: 90,
    shouldRetreat: true,
    reachedDepthLimit: true,
  });
  assert.equal(wounded.ended, true);
  assert.equal(wounded.finish().finalOutcome, 'Retreat');
  assert.equal(wounded.finish().currentHp, 100);

  const depthLimited = new ExpeditionTransactionAccumulator({ initialHp: 500, bags: createOpaqueBags() });
  depthLimited.recordPostReward({
    preContinuationHp: 400,
    finalHp: 390,
    shouldRetreat: false,
    reachedDepthLimit: true,
  });
  assert.equal(depthLimited.finish().finalOutcome, 'Escape');
  assert.equal(depthLimited.finish().currentHp, 390);
});

test('defeat and draw retain their distinct terminal outcome and HP facts', () => {
  const defeat = new ExpeditionTransactionAccumulator({ initialHp: 100, bags: createOpaqueBags() });
  defeat.recordDefeat(0);
  assert.deepEqual(
    { outcome: defeat.finish().finalOutcome, hp: defeat.finish().currentHp },
    { outcome: 'Defeat', hp: 0 },
  );

  const draw = new ExpeditionTransactionAccumulator({ initialHp: 100, bags: createOpaqueBags() });
  draw.recordDraw(42);
  assert.deepEqual(
    { outcome: draw.finish().finalOutcome, hp: draw.finish().currentHp },
    { outcome: 'Retreat', hp: 42 },
  );
});

test('RUN_EXPEDITION delegates one transaction to the expedition service without parallel mechanic locals', () => {
  const source = readFileSync(new URL('../src/hooks/useGameState.ts', import.meta.url), 'utf8');
  const runExpedition = source.match(/case 'RUN_EXPEDITION':[\s\S]*?case 'FINALIZE_DIARY_LOG':/)?.[0] ?? '';
  assert.equal((runExpedition.match(/runExpeditionService\(/g) ?? []).length, 1);
  assert.doesNotMatch(runExpedition, /new ExpeditionTransactionAccumulator\(/);
  assert.doesNotMatch(runExpedition, /transaction\.record(BattleRoom|VictoryRewards|RecoveredItems|PostReward|Defeat|Draw)\(/);
  assert.match(runExpedition, /const transactionResult = serviceResult\.transaction/);
  assert.match(runExpedition, /planExpeditionFinalization\(/);
  assert.match(runExpedition, /planCommittedExpeditionState\(/);
  assert.match(runExpedition, /planCompletedExpeditionPresentation\(/);
  assert.doesNotMatch(runExpedition, /resolveExpeditionOutcome\(/);
  assert.doesNotMatch(runExpedition, /const nextAltarVictoriesByEnemyType/);
  assert.doesNotMatch(runExpedition, /let (currentHp|totalExp|bags|finalOutcome|roomCounter|expeditionEnded|nextEnemyBattleStats|totalAutoSellProfit|totalAutoSellItemCount|totalAutoSellItems)\b/);
  assert.doesNotMatch(runExpedition, /const (rewards|recoveredItems): Item\[\]/);
  assert.doesNotMatch(runExpedition, /new Set<number>\(state\.global\.revealedItemCompendiumItemIds/);
  assert.doesNotMatch(runExpedition, /selectedEnemyIdsByRoomRange/);
});
