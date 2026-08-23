import assert from 'node:assert/strict';
import test from 'node:test';
import { buildExperimentalBattleLog, buildExperimentalDiaryEntries } from '../src/game/experimentalApiLogs.ts';
import type { DiaryLog, ExpeditionLog, Party } from '../src/types/index.ts';

const expeditionLog: ExpeditionLog = {
  dungeonId: 2,
  dungeonName: 'Test Dungeon',
  difficultyOffset: 4,
  totalExperience: 123,
  totalRooms: 24,
  completedRooms: 1,
  finalOutcome: 'Defeat',
  entries: [{
    room: 1,
    floor: 1,
    roomInFloor: 1,
    roomType: 'battle_Normal',
    startPartyHP: 100,
    enemyId: 27,
    enemySnapshot: { internalSecret: true } as never,
    enemyName: 'Test Enemy',
    enemyHP: 80,
    enemyAttackValues: '10/20/30',
    outcome: 'defeat',
    damageDealt: 30,
    damageTaken: 100,
    remainingPartyHP: 0,
    maxPartyHP: 100,
    rewardItems: [],
    replayMetadata: { protocolVersion: 3, abiVersion: 8, rngVersion: 1, seedHex: '0123456789abcdef', randomDrawCount: 127 },
    details: [{
      phase: 'combat',
      actor: 'character',
      characterId: 11,
      attackType: 'magical',
      initiativeRoll: 35,
      action: 'Rin cast a spell!',
      damage: 30,
      damageTarget: 'enemy',
      hits: 2,
      totalAttempts: 3,
      isFirstStrike: true,
    }],
  }],
  rewards: [],
  autoSellProfit: 10,
  autoSellCount: 1,
  autoSellItems: [{ itemName: 'Sold item', autoSellProfit: 10 }],
  remainingPartyHP: 0,
  maxPartyHP: 100,
};

function diaryLog(index: number): DiaryLog {
  return {
    id: `${index}-entry`,
    expeditionLog,
    triggers: ['defeat'],
    createdAt: index,
    isRead: index % 2 === 0,
  };
}

function partyWithDiary(logs: DiaryLog[]): Party {
  return {
    id: 1,
    name: 'PT1',
    diaryLogs: logs,
  } as Party;
}

test('retained battle-log serializer exposes safe recorded events without internal snapshots', () => {
  const response = buildExperimentalBattleLog(9, 1, expeditionLog, { kind: 'latest', diaryEntryId: null });

  assert.equal(response.revision, 9);
  assert.deepEqual(response.source, { kind: 'latest', diaryEntryId: null });
  assert.equal(response.battleLog.rooms[0].events[0].attempts, 3);
  assert.deepEqual(response.battleLog.rooms[0].events[0].modifiers, { firstStrike: true });
  assert.equal(response.battleLog.autoSell.gold, 10);
  assert.equal(response.battleLog.rooms[0].replayMetadata?.seedHex, '0123456789abcdef');

  const serialized = JSON.stringify(response);
  assert.equal(serialized.includes('enemySnapshot'), false);
  assert.equal(serialized.includes('internalSecret'), false);
  assert.equal(serialized.includes('rewardItems'), false);
  assert.equal(serialized.includes('enemyAttackValues'), false);
});

test('Diary API listing is newest-first, capped at 24, and does not mutate retained entries', () => {
  const retained = Array.from({ length: 25 }, (_, index) => diaryLog(index + 1));
  const party = partyWithDiary(retained);
  const before = JSON.stringify(retained);

  const response = buildExperimentalDiaryEntries([party], 12);

  assert.equal(response.revision, 12);
  assert.equal(response.entries.length, 24);
  assert.equal(response.entries[0].id, '25-entry');
  assert.equal(response.entries.at(-1)?.id, '2-entry');
  assert.equal('battleLog' in response.entries[0], false);
  assert.equal('rooms' in response.entries[0].expedition, false);
  assert.equal(JSON.stringify(retained), before);
});
