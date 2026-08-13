import assert from 'node:assert/strict';
import test from 'node:test';
import { getDesktopNotificationRewardItems } from '../src/game/desktopNotificationRewards.ts';
import type { DiaryLog, Item } from '../src/types/index.ts';

function item(id: number, superRare = 0): Item {
  return { id, superRare } as Item;
}

function diaryLog(triggers: DiaryLog['triggers'], rewards: Item[]): DiaryLog {
  return {
    id: 'test-log',
    triggers,
    expeditionLog: { rewards } as DiaryLog['expeditionLog'],
    createdAt: 0,
    isRead: false,
  };
}

test('desktop Boss Rare notifications select the exact dropped Boss Rare items', () => {
  const common = item(101);
  const firstBossRare = item(1401);
  const secondBossRare = item(2402);
  assert.deepEqual(
    getDesktopNotificationRewardItems(diaryLog(['bossRare'], [common, firstBossRare, secondBossRare])),
    [firstBossRare, secondBossRare],
  );
});

test('desktop Super Rare notifications select titled items regardless of base rarity', () => {
  const superRareBossItem = item(1401, 2);
  const ordinaryBossItem = item(1402);
  assert.deepEqual(
    getDesktopNotificationRewardItems(diaryLog(['superRare', 'bossRare'], [superRareBossItem, ordinaryBossItem])),
    [superRareBossItem],
  );
});

test('non-item desktop notifications keep using their generic trigger title', () => {
  assert.deepEqual(getDesktopNotificationRewardItems(diaryLog(['defeat'], [item(1401)])), []);
});
