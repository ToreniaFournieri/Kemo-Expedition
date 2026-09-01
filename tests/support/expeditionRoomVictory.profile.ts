import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { getDungeonById, getEffectiveEnemyLevel } from '../../src/data/dungeons.ts';
import { ENEMIES } from '../../src/data/enemies.ts';
import { refillBagIfEmpty } from '../../src/game/bags.ts';
import { normalizeDeityName } from '../../src/game/deity.ts';
import {
  resolveExpeditionRoomPostReward,
  resolveExpeditionRoomVictoryRewards,
} from '../../src/game/expeditionRoomVictory.ts';
import { createExpeditionRunContext } from '../../src/game/expeditionRunContext.ts';
import { calculateExperience } from '../../src/game/partyLevel.ts';
import { computePartyStats } from '../../src/game/partyComputation.ts';
import { hydrateGameState } from '../../src/game/saveCodec.ts';
import { decodePersistedState } from '../../src/game/storageCompression.ts';
import type { EnemyDef, GameState } from '../../src/types/index.ts';

function loadSampleState(): GameState {
  const savePath = resolve(
    process.cwd(),
    'sample_savedata/Exp8,7,6,5,4,3_set_for_test_v0.9.3_dev_20260820.kemoz',
  );
  const envelope = JSON.parse(readFileSync(savePath, 'utf8')) as { saveDataCompressed: string };
  return hydrateGameState(JSON.parse(decodePersistedState(envelope.saveDataCompressed)) as GameState);
}

function getFixture() {
  const state = loadSampleState();
  const party = state.parties[0];
  const dungeon = getDungeonById(party.selectedDungeonId);
  assert.ok(dungeon);
  const partyStatus = computePartyStats(party);
  const context = createExpeditionRunContext({
    currentParty: party,
    statusParty: party,
    partyStatus,
    dungeon,
    deityDonations: { [normalizeDeityName(party.deity.name)]: party.deityGold ?? 0 },
  });
  return { state, party, dungeon, context };
}

test('victory reward stage owns XP, reward draws, and Auriferous preparation without its flavor draw', () => {
  const { party, dungeon, context } = getFixture();
  const baseEnemy = ENEMIES.find((enemy) => enemy.itemIds.length > 0);
  assert.ok(baseEnemy);
  const enemy: EnemyDef = {
    ...baseEnemy,
    abilities: [...baseEnemy.abilities, { id: 'auriferous', level: 1 }],
  };
  let draws = 0;
  const result = resolveExpeditionRoomVictoryRewards({
    context,
    dungeon,
    enemy,
    battleResult: { enemyHitsReceived: 27 },
    floorNumber: 1,
    roomType: 'battle_Normal',
    bags: party.bags,
    isGodsBattle: false,
    random: () => {
      draws += 1;
      return 0.999999;
    },
    refillBag: refillBagIfEmpty,
  });
  assert.deepEqual(result.auriferousEffect, {
    actorName: enemy.name,
    totalHitsReceived: 27,
    bonusRolls: 2,
  });
  assert.equal('flavorIndex' in result.auriferousEffect!, false);
  assert.ok(draws > 0);
  assert.equal(
    result.experience,
    calculateExperience(
      enemy.experience,
      'battle_Normal',
      party.level,
      getEffectiveEnemyLevel(dungeon.expLevel, 1, 'battle_Normal', false, context.difficulty.offset),
      false,
    ),
  );
});

test('post-reward stage preserves Auriferous then three unconditional post-battle draws', () => {
  const { context } = getFixture();
  const draws = [0.1, 0.2, 0.3, 0.4];
  let cursor = 0;
  const result = resolveExpeditionRoomPostReward({
    context,
    floorNumber: 1,
    roomInFloor: 3,
    floorRoomCount: 4,
    roomType: 'battle_Normal',
    battlePartyHp: context.partyStats.hp,
    depthLimit: '1f-3',
    auriferousEffect: { actorName: 'Gold', totalHitsReceived: 10, bonusRolls: 1 },
    random: () => draws[cursor++] ?? 0.9,
  });
  assert.equal(result.auriferousNarrationFact?.flavorIndex, 1);
  assert.equal(cursor, 4);
  assert.equal(result.postBattleEffects.shouldRetreat, false);
  assert.equal(result.reachedDepthLimit, true);
});

test('wounded retreat remains before depth-limit and Decay continuation', () => {
  const { context } = getFixture();
  let draws = 0;
  const result = resolveExpeditionRoomPostReward({
    context,
    floorNumber: 1,
    roomInFloor: 3,
    floorRoomCount: 4,
    roomType: 'battle_Normal',
    terrainEffect: 'terrain.decay',
    battlePartyHp: Math.floor(context.partyStats.hp * 0.2),
    depthLimit: '1f-3',
    auriferousEffect: null,
    random: () => {
      draws += 1;
      return 0;
    },
  });
  assert.equal(draws, 3);
  assert.equal(result.postBattleEffects.shouldRetreat, true);
  assert.deepEqual(result.postBattleEffects.continuationFacts, []);
  assert.equal(result.reachedDepthLimit, false);
});

test('expedition service keeps inventory installation between the two room-victory stages', () => {
  const hookSource = readFileSync(resolve(process.cwd(), 'src/hooks/useGameState.ts'), 'utf8');
  const serviceSource = readFileSync(resolve(process.cwd(), 'src/game/expeditionService.ts'), 'utf8');
  const presentationSource = readFileSync(resolve(process.cwd(), 'src/game/expeditionPresentation.ts'), 'utf8');
  const runExpedition = hookSource.match(/case 'RUN_EXPEDITION':[\s\S]*?case 'FINALIZE_DIARY_LOG':/)?.[0] ?? '';
  const rewardIndex = serviceSource.indexOf('resolveExpeditionRoomVictoryRewards({');
  const installIndex = serviceSource.indexOf('input.installRecoveredItems(');
  const postRewardIndex = serviceSource.indexOf('resolveExpeditionRoomPostReward({');
  assert.ok(rewardIndex >= 0 && rewardIndex < installIndex && installIndex < postRewardIndex);
  assert.doesNotMatch(runExpedition, /resolveEnemyRewardDrops\(/);
  assert.doesNotMatch(runExpedition, /resolvePostBattleEffects\(/);
  assert.doesNotMatch(runExpedition, /drawAuriferousNarrationFact\(/);
  assert.doesNotMatch(runExpedition, /buildRewardLogEntries\(/);
  assert.doesNotMatch(runExpedition, /buildPostBattleEffectLogs\(/);
  assert.match(runExpedition, /renderExpeditionServiceResult\(/);
  assert.match(runExpedition, /installRecoveredEnemyRewards\(/);
  assert.match(presentationSource, /buildRewardLogEntries\(/);
  assert.match(presentationSource, /buildPostBattleEffectLogs\(/);
});
