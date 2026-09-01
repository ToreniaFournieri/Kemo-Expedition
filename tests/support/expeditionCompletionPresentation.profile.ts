import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { getDungeonById } from '../../src/data/dungeons.ts';
import { getItemById } from '../../src/data/items.ts';
import { planCompletedExpeditionPresentation } from '../../src/game/expeditionCompletionPresentation.ts';
import type { DiarySettings, ExpeditionLogEntry, Item } from '../../src/types/index.ts';

const BASE_DIARY_SETTINGS: DiarySettings = {
  superRareThreshold: 'all',
  bossThreshold: 'all',
  mythicThreshold: 'all',
  rareThreshold: 'all',
  sideQuestThreshold: 'all',
  notifyGodsBattle: true,
  defeatNotificationMode: 'all',
  notifyCyclePopup: true,
  notifyItemDropPopup: true,
  notifyAutoEquipmentPopup: true,
  notifySideQuestPopup: true,
};

function createItem(id: number, enhancement: number, superRare: number): Item {
  const base = getItemById(1101);
  assert.ok(base);
  return { ...base, id, enhancement, superRare };
}

function createEntry(remainingPartyHP: number): ExpeditionLogEntry {
  return {
    room: 1,
    enemyName: 'Test Enemy',
    enemyHP: 100,
    enemyAttackValues: '1/2/3',
    outcome: 'victory',
    damageDealt: 100,
    damageTaken: 10,
    remainingPartyHP,
    maxPartyHP: 500,
    details: [],
  };
}

function plan(overrides: Partial<Parameters<typeof planCompletedExpeditionPresentation>[0]> = {}) {
  const dungeon = getDungeonById(1);
  assert.ok(dungeon);
  return planCompletedExpeditionPresentation({
    dungeon,
    difficultyOffset: 3,
    entries: [createEntry(490)],
    transaction: { totalExperience: 25, finalOutcome: 'Clear', currentHp: 480 },
    finalization: {
      rewards: [],
      autoSoldItems: [],
      autoSellProfit: 0,
      autoSellItemCount: 0,
      endedWithDrawRetreat: false,
      requiresUnlockNarration: false,
    },
    maxPartyHp: 500,
    autoSellMultiplier: 1,
    diarySettings: BASE_DIARY_SETTINGS,
    isGodsBattle: false,
    ...overrides,
  });
}

test('completed presentation plan assembles the log and preserves trigger precedence', () => {
  const superRare = createItem(1501, 6, 1);
  const mythic = createItem(1502, 6, 0);
  const sold = createItem(1401, 2, 0);
  const result = plan({
    finalization: {
      rewards: [superRare, mythic],
      autoSoldItems: [{ item: sold, profit: 75 }],
      autoSellProfit: 75,
      autoSellItemCount: 1,
      endedWithDrawRetreat: false,
      requiresUnlockNarration: false,
    },
    autoSellMultiplier: 1.5,
    isGodsBattle: true,
  });

  assert.equal(result.log.totalExperience, 25);
  assert.equal(result.log.remainingPartyHP, 490);
  assert.equal(result.log.autoSellItems[0]?.autoSellProfit, 75);
  assert.ok(result.log.autoSellItems[0]?.itemName.length);
  assert.equal(result.log.autoSellMultiplier, 1.5);
  assert.deepEqual(result.diaryTriggers, ['victory', 'godsBattle', 'superRare']);
  assert.equal(result.shouldRetainCompleteNarration, true);
});

test('unlock narration can require full replay without creating a Diary trigger', () => {
  const result = plan({
    diarySettings: {
      ...BASE_DIARY_SETTINGS,
      notifyGodsBattle: false,
      defeatNotificationMode: 'none',
    },
    finalization: {
      rewards: [],
      autoSoldItems: [],
      autoSellProfit: 0,
      autoSellItemCount: 0,
      endedWithDrawRetreat: false,
      requiresUnlockNarration: true,
    },
  });

  assert.deepEqual(result.diaryTriggers, []);
  assert.equal(result.shouldRetainCompleteNarration, true);
  assert.equal(result.log.autoSellMultiplier, undefined);
});

test('completion planner owns log and trigger projection without RNG or state mutation', () => {
  const plannerSource = readFileSync(
    resolve(process.cwd(), 'src/game/expeditionCompletionPresentation.ts'),
    'utf8',
  );
  const hookSource = readFileSync(resolve(process.cwd(), 'src/hooks/useGameState.ts'), 'utf8');
  const runExpedition = hookSource.match(/case 'RUN_EXPEDITION':[\s\S]*?case 'FINALIZE_DIARY_LOG':/)?.[0] ?? '';
  assert.match(runExpedition, /planCompletedExpeditionPresentation\(/);
  assert.doesNotMatch(runExpedition, /const log: ExpeditionLog/);
  assert.doesNotMatch(runExpedition, /has(SuperRare|Boss|Mythic|Rare)Match/);
  assert.doesNotMatch(runExpedition, /diaryTriggers\.push\(/);
  assert.match(plannerSource, /const log: ExpeditionLog/);
  assert.match(plannerSource, /getDiaryOutcomeTrigger\(/);
  assert.doesNotMatch(plannerSource, /gameplayRandom|Math\.random|executeBattleWithSeed|Date\.now|GameState/);
});
