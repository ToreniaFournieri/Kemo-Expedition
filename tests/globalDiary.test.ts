import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  addGlobalDiaryLogs,
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
  return createBossFirstClearDiaryLog({ createdAt, idToken: `t${createdAt}`, partyNumber: 1, dungeonId: 1 });
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
