import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { getDungeonById } from '../../src/data/dungeons.ts';
import {
  ENEMIES,
  getElitesByPool,
  getEnemiesByPool,
  getSortedElitesByPool,
  getSortedEnemiesByPool,
} from '../../src/data/enemies.ts';
import { withBattleSeedSourceForTesting } from '../../src/game/battleSeedSource.ts';
import {
  resolveExpeditionBattleRoom,
  selectExpeditionRoomEnemy,
} from '../../src/game/expeditionBattleRoom.ts';
import { createExpeditionRunContext } from '../../src/game/expeditionRunContext.ts';
import { runExpeditionService } from '../../src/game/expeditionService.ts';
import { renderExpeditionServiceResult } from '../../src/game/expeditionPresentation.ts';
import { replayDeferredExpeditionNarrations } from '../../src/game/expeditionNarrationReplay.ts';
import { getEliteGateKey } from '../../src/game/clearGate.ts';
import { getRoomMultiplier } from '../../src/game/enemyScaling.ts';
import { normalizeDeityName } from '../../src/game/deity.ts';
import { computePartyStats } from '../../src/game/partyComputation.ts';
import { hydrateGameState } from '../../src/game/saveCodec.ts';
import { decodePersistedState } from '../../src/game/storageCompression.ts';
import type { GameState } from '../../src/types/index.ts';
import { refillBagIfEmpty } from '../../src/game/bags.ts';

function loadSampleState(): GameState {
  const savePath = resolve(
    process.cwd(),
    'sample_savedata/Exp8,7,6,5,4,3_set_for_test_v0.9.3_dev_20260820.kemoz',
  );
  const envelope = JSON.parse(readFileSync(savePath, 'utf8')) as { saveDataCompressed: string };
  return hydrateGameState(JSON.parse(decodePersistedState(envelope.saveDataCompressed)) as GameState);
}

test('indexed enemy-pool views preserve the sorted legacy selections', () => {
  const poolIds = [...new Set(ENEMIES.map((enemy) => enemy.poolId)
    .filter((poolId): poolId is number => typeof poolId === 'number'))];
  for (const poolId of poolIds) {
    assert.deepEqual(
      getSortedEnemiesByPool(poolId).map((enemy) => enemy.id),
      getEnemiesByPool(poolId).map((enemy) => enemy.id).sort((left, right) => left - right),
    );
    assert.deepEqual(
      getSortedElitesByPool(poolId).map((enemy) => enemy.id),
      getElitesByPool(poolId).map((enemy) => enemy.id).sort((left, right) => left - right),
    );
  }
  assert.equal(getSortedEnemiesByPool(-1), getSortedEnemiesByPool(-1));
  assert.equal(getSortedElitesByPool(-1), getSortedElitesByPool(-1));
});

test('explicit room candidates remain sorted, unique until exhausted, and consume one draw', () => {
  const enemyIds = ENEMIES.slice(0, 3).map((enemy) => enemy.id).reverse();
  const sortedIds = enemyIds.slice().sort((a, b) => a - b);
  let draws = 0;
  const selected = selectExpeditionRoomEnemy({
    room: { type: 'battle_Normal', enemyIds },
    floorNumber: 1,
    usedEnemyIdsInRange: new Set([sortedIds[0]]),
    random: () => {
      draws += 1;
      return 0;
    },
  });
  assert.equal(selected?.id, sortedIds[1]);
  assert.equal(draws, 1);

  const exhausted = selectExpeditionRoomEnemy({
    room: { type: 'battle_Normal', enemyIds },
    floorNumber: 1,
    usedEnemyIdsInRange: new Set(sortedIds),
    random: () => 0,
  });
  assert.equal(exhausted?.id, sortedIds[0]);
});

test('fixed elite selection consumes no gameplay draw while normal floor selection consumes one', () => {
  const dungeon = getDungeonById(1);
  assert.ok(dungeon);
  const eliteRoom = dungeon.floors.flatMap((floor) => floor.rooms)
    .find((room) => room.type === 'battle_Elite' && room.poolId !== undefined);
  const normalRoom = dungeon.floors[0]?.rooms
    .find((room) => room.type === 'battle_Normal' && room.poolId !== undefined);
  assert.ok(eliteRoom?.poolId);
  assert.ok(normalRoom?.poolId);
  assert.ok(getElitesByPool(eliteRoom.poolId).length >= 1);
  assert.ok(getEnemiesByPool(normalRoom.poolId).length >= 1);

  let eliteDraws = 0;
  const elite = selectExpeditionRoomEnemy({
    room: { type: 'battle_Elite', poolId: eliteRoom.poolId },
    floorNumber: 1,
    random: () => {
      eliteDraws += 1;
      return 0.75;
    },
  });
  assert.ok(elite);
  assert.equal(eliteDraws, 0);

  let normalDraws = 0;
  const normal = selectExpeditionRoomEnemy({
    room: normalRoom,
    floorNumber: 1,
    random: () => {
      normalDraws += 1;
      return 0;
    },
  });
  assert.ok(normal);
  assert.equal(normalDraws, 1);
});

test('room resolution returns neutral battle facts and only replaces threat bags', () => {
  const state = loadSampleState();
  const party = state.parties[0];
  const dungeon = getDungeonById(party.selectedDungeonId);
  assert.ok(dungeon);
  const floor = dungeon.floors[0];
  const room = floor?.rooms.find((candidate) => candidate.type === 'battle_Normal');
  assert.ok(floor && room);
  const partyStatus = computePartyStats(party);
  const context = createExpeditionRunContext({
    currentParty: party,
    statusParty: party,
    partyStatus,
    dungeon,
    deityDonations: { [normalizeDeityName(party.deity.name)]: party.deityGold ?? 0 },
  });

  const result = withBattleSeedSourceForTesting(
    () => 0x1234_5678_9abcn,
    () => resolveExpeditionBattleRoom({
      context,
      dungeon,
      floorNumber: floor.floorNumber,
      floorTerrainEffect: floor.terrainEffect,
      room,
      currentHp: partyStatus.partyStats.hp,
      bags: party.bags,
      isGodsBattle: false,
      random: () => 0,
      battleOptions: { outputMode: 'result-only', compactResultOutput: true },
    }),
  );
  assert.ok(result);
  assert.equal(
    result.roomMultiplier,
    getRoomMultiplier(dungeon.expLevel, floor.floorNumber, room.type, false, context.difficulty.offset),
  );
  assert.equal(result.battleStartBags, party.bags);
  assert.equal(result.updatedBags.commonRewardBag, party.bags.commonRewardBag);
  assert.equal(result.updatedBags.physicalThreatBag, result.battleResult.updatedBags.physicalThreatBag);
  assert.equal(result.updatedBags.magicalThreatBag, result.battleResult.updatedBags.magicalThreatBag);
  assert.equal(result.damageDealt, result.enemy.hp - Math.max(0, result.battleResult.enemyHp));
  assert.equal(
    result.damageTaken,
    Math.max(0, partyStatus.partyStats.hp - result.battleResult.partyHp),
  );
  assert.deepEqual(result.revealedAbilityIds, result.enemy.abilities.map((ability) => ability.id));
  assert.equal(typeof result.enemyAttackValues, 'string');
});

test('RUN_EXPEDITION delegates room mechanics and localized room presentation', () => {
  const hookSource = readFileSync(resolve(process.cwd(), 'src/hooks/useGameState.ts'), 'utf8');
  const applicationSource = readFileSync(resolve(process.cwd(), 'src/game/expeditionApplication.ts'), 'utf8');
  const postServiceSource = readFileSync(resolve(process.cwd(), 'src/game/expeditionPostService.ts'), 'utf8');
  const rewardInstallationSource = readFileSync(resolve(process.cwd(), 'src/game/expeditionRewardInstallation.ts'), 'utf8');
  const runExpedition = hookSource.match(/case 'RUN_EXPEDITION':[\s\S]*?case 'FINALIZE_DIARY_LOG':/)?.[0] ?? '';
  assert.match(runExpedition, /runExpeditionApplication\(/);
  assert.match(applicationSource, /runExpeditionService\(/);
  assert.match(applicationSource, /planExpeditionPostService\(/);
  assert.match(postServiceSource, /renderExpeditionServiceResult\(/);
  assert.doesNotMatch(runExpedition, /selectEnemyForRoom\(/);
  assert.doesNotMatch(runExpedition, /executeBattle\(/);
  assert.doesNotMatch(runExpedition, /getEncounterEnemyWithScaling\(/);
  assert.doesNotMatch(runExpedition, /const entry: ExpeditionLogEntry/);
  assert.match(runExpedition, /createExpeditionApplicationAdapters\(/);
  assert.match(rewardInstallationSource, /installRecoveredExpeditionRewards\(/);
  assert.doesNotMatch(runExpedition, /buildPostBattleEffectLogs\(/);
  assert.doesNotMatch(runExpedition, /selectedEnemyIdsByRoomRange/);
});

test('expedition service owns gate termination before battle and consumes no random draw', () => {
  const state = loadSampleState();
  const sourceParty = state.parties[0];
  const dungeon = getDungeonById(2);
  assert.ok(dungeon);
  const party = {
    ...sourceParty,
    selectedDungeonId: dungeon.id,
    defeatedBossExpeditions: {},
    clearGateProgress: {},
    clearGateStatus: {},
  };
  const partyStatus = computePartyStats(party);
  const context = createExpeditionRunContext({
    currentParty: party,
    statusParty: party,
    partyStatus,
    dungeon,
    deityDonations: {},
  });
  let randomDraws = 0;
  const result = runExpeditionService({
    context,
    party,
    dungeon,
    transaction: { initialHp: partyStatus.partyStats.hp, bags: party.bags },
    isGodsBattle: false,
    random: () => {
      randomDraws += 1;
      return 0;
    },
    refillBag: refillBagIfEmpty,
    installRecoveredItems: () => {
      throw new Error('blocked gate must not install rewards');
    },
  });

  assert.equal(randomDraws, 0);
  assert.equal(result.rooms.length, 1);
  assert.equal(result.rooms[0]?.kind, 'gate');
  assert.equal(result.transaction.finalOutcome, 'Escape');
  assert.equal(result.transaction.roomCounter, 1);
  assert.equal(result.completedBossVictory, false);
});

test('service source owns traversal, resolver order, and transaction transitions without presentation imports', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/game/expeditionService.ts'), 'utf8');
  const battle = source.indexOf('resolveExpeditionBattleRoom({');
  const rewards = source.indexOf('resolveExpeditionRoomVictoryRewards({');
  const install = source.indexOf('input.installRecoveredItems(');
  const postReward = source.indexOf('resolveExpeditionRoomPostReward({');
  assert.ok(battle >= 0 && battle < rewards && rewards < install && install < postReward);
  assert.match(source, /for \(const floor of input\.dungeon\.floors\)/);
  assert.match(source, /transaction\.recordBattleRoom\(/);
  assert.match(source, /transaction\.recordPostReward\(/);
  assert.doesNotMatch(source, /useGameState|\bt\(|getItemDisplayName|ExpeditionLogEntry/);
});

test('presentation adapter owns localized room projection and remains random-free', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/game/expeditionPresentation.ts'), 'utf8');
  assert.match(source, /for \(const serviceRoom of input\.result\.rooms\)/);
  assert.match(source, /const entry: ExpeditionLogEntry/);
  assert.match(source, /buildAuriferousLogEntry\(/);
  assert.match(source, /buildPostBattleEffectLogs\(/);
  assert.match(source, /buildRewardLogEntries\(/);
  assert.match(source, /deferredBattleNarrations\.push\(/);
  assert.doesNotMatch(source, /gameplayRandom|Math\.random|resolveExpeditionBattleRoom|installRecoveredEnemyRewards/);
});

test('presentation adapter projects a gate unlocked by the current run without mutating service facts', () => {
  const gateRoom = {
    kind: 'gate' as const,
    roomCounter: 4,
    floorNumber: 1,
    roomInFloor: 4,
    room: { type: 'battle_Elite' as const },
    roomMultiplier: 1.5,
    remainingPartyHp: 400,
    gate: {
      blocked: true as const,
      gateKey: getEliteGateKey(1, 1),
      labelKey: 'home.gate.consecutiveSuccesses',
      current: 1,
      required: 2,
    },
  };
  const serviceResult = {
    rooms: [gateRoom],
    transaction: {},
    completedBossVictory: false,
  } as unknown as Parameters<typeof renderExpeditionServiceResult>[0]['result'];
  const commonInput = {
    result: serviceResult,
    dungeon: { name: 'Test Dungeon' },
    maxPartyHp: 500,
    isGodsBattle: false,
    deferBattleNarration: false,
  };

  const locked = renderExpeditionServiceResult(commonInput);
  const unlocked = renderExpeditionServiceResult({
    ...commonInput,
    newlyUnlockedGateKey: getEliteGateKey(1, 1),
  });

  assert.equal(locked.entries.length, 1);
  assert.equal(unlocked.entries.length, 1);
  assert.notEqual(locked.entries[0]?.gateInfo, unlocked.entries[0]?.gateInfo);
  assert.equal(gateRoom.gate.required, 2);
  assert.deepEqual(unlocked.deferredBattleNarrations, []);
});

test('deferred narration adapter reconstructs seeded logs and preserves existing room details', () => {
  const state = loadSampleState();
  const party = state.parties[0];
  const dungeon = getDungeonById(party.selectedDungeonId);
  assert.ok(dungeon);
  const floor = dungeon.floors[0];
  const room = floor?.rooms.find((candidate) => candidate.type === 'battle_Normal');
  assert.ok(floor && room);
  const partyStatus = computePartyStats(party);
  const context = createExpeditionRunContext({
    currentParty: party,
    statusParty: party,
    partyStatus,
    dungeon,
    deityDonations: {},
  });
  const resolution = withBattleSeedSourceForTesting(
    () => 0x1234_5678_9abcn,
    () => resolveExpeditionBattleRoom({
      context,
      dungeon,
      floorNumber: floor.floorNumber,
      floorTerrainEffect: floor.terrainEffect,
      room,
      currentHp: partyStatus.partyStats.hp,
      bags: party.bags,
      isGodsBattle: false,
      random: () => 0,
      battleOptions: { outputMode: 'result-only', compactResultOutput: true },
    }),
  );
  assert.ok(resolution);
  const retainedDetail = { phase: 'end' as const, actor: 'effect' as const, action: 'retained' };
  const entry = {
    room: 1,
    enemyName: resolution.enemy.name,
    enemyHP: resolution.enemy.hp,
    enemyAttackValues: resolution.enemyAttackValues,
    outcome: resolution.battleResult.outcome!,
    damageDealt: resolution.damageDealt,
    damageTaken: resolution.damageTaken,
    remainingPartyHP: resolution.battleResult.partyHp,
    postBattlePartyHP: resolution.battleResult.partyHp,
    maxPartyHP: partyStatus.partyStats.hp,
    details: [retainedDetail],
    replayMetadata: resolution.battleResult.replayMetadata,
  };

  replayDeferredExpeditionNarrations({
    narrations: [{
      entry,
      enemy: resolution.enemy,
      bags: resolution.battleStartBags,
      initialPartyHp: partyStatus.partyStats.hp,
      terrainEffect: resolution.terrainEffect,
    }],
    party,
    partyStatus,
  });

  assert.ok(entry.details.length > 1);
  assert.equal(entry.details.at(-1), retainedDetail);
  assert.equal(entry.replayMetadata, resolution.battleResult.replayMetadata);
});

test('deferred narration adapter rejects missing replay metadata before battle execution', () => {
  const state = loadSampleState();
  const party = state.parties[0];
  const partyStatus = computePartyStats(party);
  assert.throws(() => replayDeferredExpeditionNarrations({
    narrations: [{
      entry: {
        room: 1,
        enemyName: 'Missing Metadata',
        enemyHP: 1,
        enemyAttackValues: '0/0/0',
        outcome: 'draw',
        damageDealt: 0,
        damageTaken: 0,
        remainingPartyHP: 1,
        maxPartyHP: 1,
        details: [],
      },
      enemy: ENEMIES[0],
      bags: party.bags,
      initialPartyHp: 1,
      terrainEffect: 'none',
    }],
    party,
    partyStatus,
  }), /missing replay metadata/);
});

test('deferred narration adapter owns replay validation without gameplay RNG authority', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/game/expeditionNarrationReplay.ts'), 'utf8');
  const hookSource = readFileSync(resolve(process.cwd(), 'src/hooks/useGameState.ts'), 'utf8');
  const runExpedition = hookSource.match(/case 'RUN_EXPEDITION':[\s\S]*?case 'FINALIZE_DIARY_LOG':/)?.[0] ?? '';
  const completionSource = readFileSync(resolve(process.cwd(), 'src/game/expeditionCompletion.ts'), 'utf8');
  const applicationSource = readFileSync(resolve(process.cwd(), 'src/game/expeditionApplication.ts'), 'utf8');
  assert.match(applicationSource, /completeExpeditionPresentation\(/);
  assert.doesNotMatch(runExpedition, /replayDeferredExpeditionNarrations\(/);
  assert.match(completionSource, /shouldRetainCompleteNarration[\s\S]{0,300}replayDeferredExpeditionNarrations\(/);
  assert.doesNotMatch(runExpedition, /executeBattleWithSeed\(/);
  assert.match(source, /executeBattleWithSeed\(/);
  assert.match(source, /randomDrawCount !== replay\.randomDrawCount/);
  assert.doesNotMatch(source, /gameplayRandom|Math\.random|acquireBattleSeed/);
});
