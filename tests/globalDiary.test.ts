import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  addGlobalDiaryLogs,
  applyAchievementMilestones,
  createGodFirstDefeatDiaryLog,
  getAchievementValues,
  GLOBAL_ACHIEVEMENT_THRESHOLDS,
  seedAchievementState,
  countUnreadGlobalDiaryLogs,
  createAccountCreatedDiaryLog,
  createBossFirstClearDiaryLog,
  GLOBAL_DIARY_PARTY_NUMBER,
  GLOBAL_DIARY_RETENTION_LIMIT,
  normalizeGlobalDiaryLogs,
} from '../src/game/globalDiary.ts';
import type { GlobalDiaryLog } from '../src/types/index.ts';

const hookSource = readFileSync(new URL('../src/hooks/useGameState.ts', import.meta.url), 'utf8');
const diaryTabSource = readFileSync(new URL('../src/components/home/tabs/DiaryTab.tsx', import.meta.url), 'utf8');

function clearLog(createdAt: number): GlobalDiaryLog {
  return createBossFirstClearDiaryLog({ createdAt, idToken: `t${createdAt}`, partyNumber: 1, dungeonId: createdAt });
}

test('Global Diary uses scope 0 and keeps at most 99 entries', () => {
  assert.equal(GLOBAL_DIARY_PARTY_NUMBER, 0);
  assert.equal(GLOBAL_DIARY_RETENTION_LIMIT, 99);
  const existing = Array.from({ length: 99 }, (_, index) => clearLog(index + 1));
  const next = addGlobalDiaryLogs(existing, [clearLog(1000)]);
  assert.equal(next.length, 99);
  assert.equal(next[0]!.createdAt, 1000);
  assert.equal(next.at(-1)!.createdAt, 2);
});

test('Global Diary retention runs only when an entry is created and ignores duplicate ids', () => {
  const legacyOverflow = Array.from({ length: 120 }, (_, index) => clearLog(index + 1));
  assert.equal(normalizeGlobalDiaryLogs(legacyOverflow).length, 120);
  assert.equal(addGlobalDiaryLogs(legacyOverflow, []).length, 120);
  assert.equal(addGlobalDiaryLogs(legacyOverflow, [legacyOverflow[0]!]).length, 120);
});

test('account-created and first-clear entries carry only language-neutral facts', () => {
  const created = createAccountCreatedDiaryLog(5, 'account');
  assert.deepEqual(created, { id: '5-account', kind: 'accountCreated', createdAt: 5, isRead: true });
  const unlock = createBossFirstClearDiaryLog({ createdAt: 9, idToken: 'p1d3', partyNumber: 1, dungeonId: 3, unlockedPartyNumber: 2 });
  assert.deepEqual(unlock, { id: '9-p1d3', kind: 'bossFirstClear', partyNumber: 1, dungeonId: 3, unlockedPartyNumber: 2, createdAt: 9, isRead: false });
  assert.equal('unlockedPartyNumber' in clearLog(1), false);
});

test('loading drops malformed Global Diary entries and never backfills old saves', () => {
  assert.deepEqual(normalizeGlobalDiaryLogs(undefined), []);
  assert.deepEqual(normalizeGlobalDiaryLogs([{ id: 1 }, null, { id: 'x', kind: 'nope', createdAt: 1 }]), []);
  const valid = normalizeGlobalDiaryLogs([{ id: 'a', kind: 'accountCreated', createdAt: 1, isRead: 'yes' }]);
  assert.equal(valid[0]!.isRead, false);
  assert.equal(countUnreadGlobalDiaryLogs([clearLog(1), createAccountCreatedDiaryLog(2, 'account')]), 1);
});

test('runtime wires the Global Diary into new accounts, boss first clears and AFK commits', () => {
  assert.match(hookSource, /globalDiary: \[createAccountCreatedDiaryLog\(inGameNow, 'account'\)\]/);
  assert.match(hookSource, /parsed\.global\.globalDiary = normalizeGlobalDiaryLogs/);
  assert.match(hookSource, /createBossFirstClearDiaryLog\(\{/);
  assert.doesNotMatch(hookSource, /getUnlockDiaryLog/);
  const coordinator = readFileSync(new URL('../src/game/afkChunkCoordinator.ts', import.meta.url), 'utf8');
  assert.match(coordinator, /globalDiary: additions\(/);
  assert.match(coordinator, /globalDiary: addGlobalDiaryLogs\(/);
});

test('Diary tab always shows Global first, hides no tabs and shows the year in timestamps', () => {
  assert.match(diaryTabSource, /grid-cols-7/);
  assert.doesNotMatch(diaryTabSource, /parties\.length <= 1\) return null/);
  assert.match(diaryTabSource, /year: 'numeric'/);
  assert.match(diaryTabSource, /isGlobalSelected/);
});

function achievementGlobal(overrides: Record<string, unknown> = {}) {
  return { inventory: {}, jewels: {}, achievementClearTotal: 0, achievementMilestones: [] as string[], globalDiary: [] as GlobalDiaryLog[], ...overrides } as never as Parameters<typeof applyAchievementMilestones>[0];
}

const superRareVariant = (count: number, superRare = 3) => ({ item: { superRare }, count, status: 'normal' });

test('achievement values count Super Rare items and jewels held, and the lifetime Clear counter', () => {
  const global = achievementGlobal({
    inventory: { a: superRareVariant(4), b: superRareVariant(9, 0) },
    jewels: { 'x-1': 3, 'y-2': 2 },
    achievementClearTotal: 120,
  });
  assert.deepEqual(getAchievementValues(global), { clear: 120, superRare: 4, jewel: 5 });
  assert.deepEqual(GLOBAL_ACHIEVEMENT_THRESHOLDS.clear, [100, 1000, 10000, 100000, 1000000]);
});

test('every newly reached milestone is recorded once and never again after the value falls and returns', () => {
  const first = applyAchievementMilestones(achievementGlobal({ inventory: { a: superRareVariant(12) } }), 1000);
  assert.deepEqual(first.achievementMilestones, ['superRare:1', 'superRare:10']);
  assert.deepEqual(first.globalDiary!.map((entry) => entry.threshold), [10, 1]);
  assert.equal(applyAchievementMilestones(first, 2000), first);
  const dropped = applyAchievementMilestones({ ...first, inventory: {} }, 3000);
  const returned = applyAchievementMilestones({ ...dropped, inventory: { a: superRareVariant(12) } }, 4000);
  assert.equal(returned.globalDiary!.length, 2);
});

test('parallel reports of the same one-time event are recorded once', () => {
  const god = createGodFirstDefeatDiaryLog({ createdAt: 5, partyNumber: 1, godExpeditionId: 2 });
  const duplicate = createGodFirstDefeatDiaryLog({ createdAt: 9, partyNumber: 2, godExpeditionId: 2 });
  assert.equal(addGlobalDiaryLogs([god], [duplicate]).length, 1);
  assert.equal(addGlobalDiaryLogs([god], [createGodFirstDefeatDiaryLog({ createdAt: 9, partyNumber: 2, godExpeditionId: 3 })]).length, 2);
});

test('saves from before achievements start from their current state without recording history', () => {
  const seeded = seedAchievementState(
    { inventory: { a: superRareVariant(12) }, jewels: { k: 1 } } as never as Parameters<typeof seedAchievementState>[0],
    250,
  );
  assert.equal(seeded.achievementClearTotal, 250);
  assert.deepEqual([...seeded.achievementMilestones!].sort(), ['clear:100', 'jewel:1', 'superRare:1', 'superRare:10']);
  const unchanged = applyAchievementMilestones({ ...seeded, globalDiary: [] }, 1);
  assert.equal(unchanged.globalDiary!.length, 0);
});

test('runtime counts Clear, first god defeats and evaluates achievements on the authoritative state', () => {
  assert.match(hookSource, /achievementClearTotal: \(nextGlobal\.achievementClearTotal \?\? 0\) \+ 1/);
  assert.match(hookSource, /createGodFirstDefeatDiaryLog\(/);
  assert.match(hookSource, /applyAchievementMilestones\(after,/);
  assert.match(hookSource, /afkChunkContext\) return next/);
});
