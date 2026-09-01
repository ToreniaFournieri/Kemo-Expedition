import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { getDungeonById } from '../../src/data/dungeons.ts';
import { getDeityKey, getDeityRank, getDeityRewardDrawBonuses, normalizeDeityName } from '../../src/game/deity.ts';
import {
  getDifficultyOffsetItemChanceTickets,
  getDifficultyOffsetMax,
  getDifficultyOffsetSuperRareChanceTickets,
  normalizeDifficultyOffset,
} from '../../src/game/difficultyOffset.ts';
import {
  createExpeditionRunContext,
  getExpeditionRoomTerrainEffect,
  getPostBattleEffectCharacters,
} from '../../src/game/expeditionRunContext.ts';
import { deriveExpeditionRewardContext } from '../../src/game/expeditionRewardContext.ts';
import { computeCharacterHpContribution, computePartyStats } from '../../src/game/partyComputation.ts';
import { hydrateGameState } from '../../src/game/saveCodec.ts';
import { decodePersistedState } from '../../src/game/storageCompression.ts';
import type { ComputedPartyStatus } from '../../src/game/partyComputation.ts';
import type { GameState, Party } from '../../src/types/index.ts';

function loadSampleState(): GameState {
  const savePath = resolve(
    process.cwd(),
    'sample_savedata/Exp8,7,6,5,4,3_set_for_test_v0.9.3_dev_20260820.kemoz',
  );
  const envelope = JSON.parse(readFileSync(savePath, 'utf8')) as { saveDataCompressed: string };
  return hydrateGameState(JSON.parse(decodePersistedState(envelope.saveDataCompressed)) as GameState);
}

function createContext(
  party: Party,
  partyStatus: ComputedPartyStatus = computePartyStats(party),
  terrainOverride?: `terrain.${string}`,
) {
  const dungeon = getDungeonById(party.selectedDungeonId);
  assert.ok(dungeon);
  return createExpeditionRunContext({
    currentParty: party,
    statusParty: party,
    partyStatus,
    dungeon,
    deityDonations: { [normalizeDeityName(party.deity.name)]: party.deityGold ?? 0 },
    ...(terrainOverride ? { terrainOverride } : {}),
  });
}

test('expedition context preserves authoritative status identity and freezes derived facts', () => {
  const party = loadSampleState().parties[0];
  const partyStatus = computePartyStats(party);
  const context = createContext(party, partyStatus);

  assert.equal(context.statusParty, party);
  assert.equal(context.partyStatus, partyStatus);
  assert.equal(context.partyStats, partyStatus.partyStats);
  assert.equal(context.characterStats, partyStatus.characterStats);
  assert.equal(Object.isFrozen(context), true);
  assert.equal(Object.isFrozen(context.difficulty), true);
  assert.equal(Object.isFrozen(context.deity), true);
  assert.equal(Object.isFrozen(context.reward), true);
  assert.equal(Object.isFrozen(context.postBattleCharacters), true);
  context.postBattleCharacters.forEach((character) => assert.equal(Object.isFrozen(character), true));
});

test('expedition context retains difficulty, deity, and reward formulas', () => {
  const sourceParty = loadSampleState().parties[0];
  const dungeon = getDungeonById(sourceParty.selectedDungeonId);
  assert.ok(dungeon);
  const party: Party = {
    ...sourceParty,
    expeditionDifficultyOffset: 2,
    expeditionDifficultyOffsetByDungeon: { [dungeon.id]: 14 },
    defeatedBossExpeditions: { ...sourceParty.defeatedBossExpeditions, [dungeon.id]: true },
  };
  const partyStatus = computePartyStats(party);
  const donation = 123_456;
  const context = createExpeditionRunContext({
    currentParty: party,
    statusParty: party,
    partyStatus,
    dungeon,
    deityDonations: { [normalizeDeityName(party.deity.name)]: donation },
  });
  const expectedOffset = normalizeDifficultyOffset(14, getDifficultyOffsetMax(dungeon.expLevel));
  const expectedDeityBonuses = getDeityRewardDrawBonuses(party.deity.name, donation);

  assert.deepEqual(context.difficulty, {
    offset: expectedOffset,
    itemChanceTickets: getDifficultyOffsetItemChanceTickets(expectedOffset),
    superRareChanceTickets: getDifficultyOffsetSuperRareChanceTickets(expectedOffset),
  });
  assert.deepEqual(context.deity, {
    key: getDeityKey(party.deity.name),
    donation,
    rank: getDeityRank(donation),
    itemChanceTickets: expectedDeityBonuses.itemChanceTickets,
    superRareChanceTickets: expectedDeityBonuses.superRareChanceTickets,
  });
  assert.deepEqual(context.reward, deriveExpeditionRewardContext(party, partyStatus));
});

test('locked difficulty remains zero and terrain override wins only when supplied', () => {
  const sourceParty = loadSampleState().parties[0];
  const party: Party = {
    ...sourceParty,
    expeditionDifficultyOffset: 40,
    expeditionDifficultyOffsetByDungeon: { [sourceParty.selectedDungeonId]: 40 },
    defeatedBossExpeditions: {
      ...sourceParty.defeatedBossExpeditions,
      [sourceParty.selectedDungeonId]: false,
    },
  };
  const context = createContext(party);
  assert.equal(context.difficulty.offset, 0);
  assert.equal(getExpeditionRoomTerrainEffect(context, 'terrain.chill'), 'terrain.chill');

  const overridden = createContext(party, computePartyStats(party), 'terrain.gehenna');
  assert.equal(getExpeditionRoomTerrainEffect(overridden, 'terrain.chill'), 'terrain.gehenna');
});

test('post-battle character preparation preserves First Aid room gating and HP inputs', () => {
  const party = loadSampleState().parties[0];
  const baseStatus = computePartyStats(party);
  const firstCharacter = party.characters[0];
  const injectedStatus: ComputedPartyStatus = {
    ...baseStatus,
    characterStats: baseStatus.characterStats.map((stats, index) => index === 0
      ? { ...stats, abilities: [...stats.abilities, { id: 'first_aid', level: 2 }] }
      : stats),
  };
  const context = createContext(party, injectedStatus);
  const ordinary = getPostBattleEffectCharacters(context, 1, 1, 'battle_Normal');
  const qualifying = getPostBattleEffectCharacters(context, 1, 4, 'battle_Elite');

  assert.equal(ordinary[0]?.firstAidHpContribution, 0);
  assert.equal(qualifying[0]?.firstAidLevel, 2);
  assert.equal(
    qualifying[0]?.firstAidHpContribution,
    computeCharacterHpContribution(firstCharacter, party.level).totalHpBonus,
  );
  assert.equal(Object.isFrozen(qualifying), true);
  qualifying.forEach((character) => assert.equal(Object.isFrozen(character), true));
});

test('RUN_EXPEDITION consumes the shared context instead of recomputing inline facts', () => {
  const hookSource = readFileSync(resolve(process.cwd(), 'src/hooks/useGameState.ts'), 'utf8');
  const serviceSource = readFileSync(resolve(process.cwd(), 'src/game/expeditionService.ts'), 'utf8');
  const runExpedition = hookSource.match(/case 'RUN_EXPEDITION':[\s\S]*?case 'FINALIZE_DIARY_LOG':/)?.[0] ?? '';
  assert.match(runExpedition, /createExpeditionRunContext\(/);
  assert.match(runExpedition, /runExpeditionService\(\{/);
  assert.match(serviceSource, /resolveExpeditionBattleRoom\(\{[\s\S]{0,120}context: input\.context/);
  assert.match(serviceSource, /resolveExpeditionRoomPostReward\(\{[\s\S]{0,120}context: input\.context/);
  assert.doesNotMatch(runExpedition, /deriveExpeditionRewardContext\(/);
  assert.doesNotMatch(runExpedition, /const isFirstAidRoom/);
  assert.doesNotMatch(runExpedition, /getDeityRewardDrawBonuses\(/);
});
