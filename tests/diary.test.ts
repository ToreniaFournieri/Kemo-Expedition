import assert from 'node:assert/strict';
import test from 'node:test';

import {
  addDiaryLogs,
  DIARY_LEGACY_LOG_LOAD_LIMIT,
  DIARY_LOG_RETENTION_LIMIT,
  formatDiaryUnreadBadge,
  getDiaryOutcomeTrigger,
} from '../src/game/diary.ts';
import type { DiaryLog } from '../src/types/index.ts';

function createDiaryLog(createdAt: number): DiaryLog {
  return {
    id: String(createdAt),
    expeditionLog: {
      dungeonId: 1,
      dungeonName: 'Test',
      difficultyOffset: 0,
      totalExperience: 0,
      totalRooms: 0,
      completedRooms: 0,
      finalOutcome: 'Return',
      entries: [],
      rewards: [],
      autoSellProfit: 0,
      autoSellCount: 0,
      autoSellItems: [],
      remainingPartyHP: 1,
      maxPartyHP: 1,
    },
    triggers: ['return'],
    createdAt,
    isRead: false,
  };
}

test('Diary defeat notification modes select the specified expedition outcomes', () => {
  assert.equal(getDiaryOutcomeTrigger('Defeat', false, 'defeatOnly'), 'defeat');
  assert.equal(getDiaryOutcomeTrigger('Retreat', true, 'defeatOnly'), null);
  assert.equal(getDiaryOutcomeTrigger('Retreat', true, 'defeatAndDraw'), 'draw');
  assert.equal(getDiaryOutcomeTrigger('Clear', false, 'defeatAndDraw'), null);
  assert.equal(getDiaryOutcomeTrigger('Retreat', true, 'defeatDrawRetreat'), 'draw');
  assert.equal(getDiaryOutcomeTrigger('Retreat', false, 'defeatDrawRetreat'), 'retreat');
  assert.equal(getDiaryOutcomeTrigger('Return', false, 'defeatDrawRetreat'), null);
  assert.equal(getDiaryOutcomeTrigger('Clear', false, 'all'), 'victory');
  assert.equal(getDiaryOutcomeTrigger('Return', false, 'all'), 'return');
  assert.equal(getDiaryOutcomeTrigger('Defeat', false, 'all'), 'defeat');
  assert.equal(getDiaryOutcomeTrigger('Retreat', true, 'all'), 'draw');
  assert.equal(getDiaryOutcomeTrigger('Retreat', false, 'all'), 'retreat');
  assert.equal(getDiaryOutcomeTrigger('Defeat', false, 'none'), null);
  assert.equal(getDiaryOutcomeTrigger('Clear', false, 'none'), null);
});

test('Diary retention leaves existing entries untouched until a new entry is created', () => {
  const existingLogs = Array.from({ length: DIARY_LOG_RETENTION_LIMIT + 1 }, (_, index) => createDiaryLog(index + 1));

  assert.equal(addDiaryLogs(existingLogs, []), existingLogs);
  assert.equal(existingLogs.length, DIARY_LOG_RETENTION_LIMIT + 1);
});

test('Diary retention limit is 12 entries per party', () => {
  assert.equal(DIARY_LOG_RETENTION_LIMIT, 12);
});

test('a new Diary entry trims an older 24-entry history to the 12-entry maximum', () => {
  const legacyLogs = Array.from({ length: DIARY_LEGACY_LOG_LOAD_LIMIT }, (_, index) => createDiaryLog(index + 1));
  const nextLogs = addDiaryLogs(legacyLogs, [createDiaryLog(100)]);

  assert.deepEqual(nextLogs.map((log) => log.createdAt), [100, ...Array.from({ length: 11 }, (_, index) => 24 - index)]);
});

test('Diary retention removes only the oldest entries after creating a new entry', () => {
  const existingLogs = Array.from({ length: DIARY_LOG_RETENTION_LIMIT }, (_, index) => createDiaryLog(index + 1));
  const nextLogs = addDiaryLogs(existingLogs, [createDiaryLog(100)]);

  assert.equal(nextLogs.length, DIARY_LOG_RETENTION_LIMIT);
  assert.deepEqual(nextLogs.map((log) => log.createdAt), [100, ...Array.from({ length: 11 }, (_, index) => 12 - index)]);
  assert.equal(nextLogs.some((log) => log.createdAt === 1), false);
});

test('main Diary unread badge changes to 49+ at 49 unread entries', () => {
  assert.equal(formatDiaryUnreadBadge(48), '48');
  assert.equal(formatDiaryUnreadBadge(49), '49+');
  assert.equal(formatDiaryUnreadBadge(72), '49+');
});
