import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { planPendingExpeditionDiaryLog } from '../src/game/expeditionDiary.ts';
import type { ExpeditionLog } from '../src/types/index.ts';

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
    autoSellProfit: 0,
    autoSellCount: 0,
    autoSellItems: [],
    remainingPartyHP: 450,
    maxPartyHP: 500,
  };
}

test('pending expedition Diary adapter assembles the retained record from allocated values', () => {
  const log = createLog();
  const triggers = ['victory', 'bossRare'] as const;
  const pending = planPendingExpeditionDiaryLog({
    log,
    triggers: [...triggers],
    createdAt: 123456,
    idToken: 'abc123',
  });

  assert.deepEqual(pending, {
    id: '123456-abc123',
    expeditionLog: log,
    triggers: [...triggers],
    createdAt: 123456,
    isRead: false,
  });
  assert.equal(pending?.expeditionLog, log);
});

test('pending expedition Diary adapter returns null when no trigger exists', () => {
  assert.equal(planPendingExpeditionDiaryLog({
    log: createLog(),
    triggers: [],
    createdAt: 123456,
    idToken: null,
  }), null);
});

test('pending expedition Diary adapter rejects a missing token for a retained record', () => {
  assert.throws(() => planPendingExpeditionDiaryLog({
    log: createLog(),
    triggers: ['victory'],
    createdAt: 123456,
    idToken: null,
  }), /Diary ID token/);
});

test('RUN_EXPEDITION retains time and random allocation before the Diary adapter', () => {
  const adapterSource = readFileSync(
    new URL('../src/game/expeditionDiary.ts', import.meta.url),
    'utf8',
  );
  const commitSource = readFileSync(
    new URL('../src/game/expeditionCommit.ts', import.meta.url),
    'utf8',
  );
  const hookSource = readFileSync(new URL('../src/hooks/useGameState.ts', import.meta.url), 'utf8');
  const applicationSource = readFileSync(new URL('../src/game/expeditionApplication.ts', import.meta.url), 'utf8');
  const runExpedition = hookSource.match(/case 'RUN_EXPEDITION':[\s\S]*?case 'FINALIZE_DIARY_LOG':/)?.[0] ?? '';

  assert.match(
    applicationSource,
    /const diaryCreatedAt = command\.simulatedAt \?\? authorities\.getCommittedAt\(\);[\s\S]{0,240}authorities\.random\(\)\.toString\(36\)\.slice\(2, 8\)[\s\S]{0,500}planExpeditionCommit\(/,
  );
  assert.match(
    applicationSource,
    /if \(command\.resolutionMode === 'forecast'\)[\s\S]{0,900}kind: 'forecast'[\s\S]{0,300}const diaryCreatedAt/,
  );
  assert.match(runExpedition, /getCommittedAt: \(\) => Date\.now\(\)/);
  assert.doesNotMatch(applicationSource, /id: `\$\{diaryCreatedAt\}-\$\{/);
  assert.match(commitSource, /planPendingExpeditionDiaryLog\(/);
  assert.doesNotMatch(adapterSource, /gameplayRandom|Math\.random|Date\.now|forecastResolutionByState/);
  assert.doesNotMatch(commitSource, /gameplayRandom|Math\.random|Date\.now|forecastResolutionByState/);
});
