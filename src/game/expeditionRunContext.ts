import type { ComputedPartyStatus } from './partyComputation.ts';
import { computeCharacterHpContribution } from './partyComputation.ts';
import type { Dungeon, Party, RoomType, TerrainEffectKey } from '../types/index.ts';
import { hasDefeatedDungeonBoss } from './clearGate.ts';
import {
  getDifficultyOffsetItemChanceTickets,
  getDifficultyOffsetMax,
  getDifficultyOffsetSuperRareChanceTickets,
  normalizeDifficultyOffset,
} from './difficultyOffset.ts';
import {
  getDeityKey,
  getDeityRank,
  getDeityRewardDrawBonuses,
  normalizeDeityName,
} from './deity.ts';
import {
  deriveExpeditionRewardContext,
  type ExpeditionRewardContext,
} from './expeditionRewardContext.ts';
import type { PostBattleEffectCharacter } from './expeditionEffects/postBattleEffects.ts';
import type { RuntimeGameMode } from './runtimeGameMode.ts';

export interface ExpeditionDifficultyContext {
  readonly offset: number;
  readonly itemChanceTickets: number;
  readonly superRareChanceTickets: number;
}

export interface ExpeditionDeityContext {
  readonly key: ReturnType<typeof getDeityKey>;
  readonly donation: number;
  readonly rank: number;
  readonly itemChanceTickets: number;
  readonly superRareChanceTickets: number;
}

interface ExpeditionPostBattleCharacterContext extends PostBattleEffectCharacter {
  readonly firstAidHpContribution: number;
}

export interface ExpeditionRunContext {
  readonly statusParty: Party;
  readonly partyStatus: ComputedPartyStatus;
  readonly partyStats: ComputedPartyStatus['partyStats'];
  readonly characterStats: ComputedPartyStatus['characterStats'];
  readonly dungeonId: number;
  readonly dungeonFloorCount: number;
  readonly difficulty: ExpeditionDifficultyContext;
  readonly gameMode: RuntimeGameMode;
  readonly enemyLevelOffset: number;
  readonly deity: ExpeditionDeityContext;
  readonly reward: ExpeditionRewardContext;
  readonly terrainOverride?: TerrainEffectKey;
  readonly postBattleCharacters: readonly ExpeditionPostBattleCharacterContext[];
}

export interface CreateExpeditionRunContextInput {
  readonly currentParty: Party;
  readonly statusParty: Party;
  readonly partyStatus: ComputedPartyStatus;
  readonly dungeon: Dungeon;
  readonly deityDonations: Readonly<Record<string, number>>;
  readonly gameMode: RuntimeGameMode;
  readonly enemyLevelOffset: number;
  readonly terrainOverride?: TerrainEffectKey;
}

function getFirstAidLevel(
  characterStats: ComputedPartyStatus['characterStats'][number] | undefined,
): number {
  return characterStats?.abilities
    .filter((ability) => ability.id === 'first_aid')
    .reduce((maximum, ability) => Math.max(maximum, ability.level), 0)
    ?? 0;
}

export function createExpeditionRunContext(
  input: CreateExpeditionRunContextInput,
): ExpeditionRunContext {
  const maximumOffset = getDifficultyOffsetMax(input.dungeon.expLevel);
  const offset = hasDefeatedDungeonBoss(input.currentParty, input.dungeon.id)
    ? normalizeDifficultyOffset(
      input.currentParty.expeditionDifficultyOffsetByDungeon?.[input.dungeon.id]
        ?? input.currentParty.expeditionDifficultyOffset,
      maximumOffset,
    )
    : 0;
  const difficulty = Object.freeze({
    offset,
    itemChanceTickets: getDifficultyOffsetItemChanceTickets(offset),
    superRareChanceTickets: getDifficultyOffsetSuperRareChanceTickets(offset),
  });

  const donation = input.deityDonations[normalizeDeityName(input.statusParty.deity.name)]
    ?? input.statusParty.deityGold
    ?? 0;
  const deityRewardDrawBonuses = getDeityRewardDrawBonuses(
    input.statusParty.deity.name,
    donation,
  );
  const deity = Object.freeze({
    key: getDeityKey(input.statusParty.deity.name),
    donation,
    rank: getDeityRank(donation),
    itemChanceTickets: deityRewardDrawBonuses.itemChanceTickets,
    superRareChanceTickets: deityRewardDrawBonuses.superRareChanceTickets,
  });

  const postBattleCharacters = Object.freeze(input.statusParty.characters.map((character) => {
    const characterStats = input.partyStatus.characterStats.find(
      (candidate) => candidate.characterId === character.id,
    );
    const firstAidLevel = getFirstAidLevel(characterStats);
    return Object.freeze({
      name: character.name,
      firstAidLevel,
      firstAidHpContribution: firstAidLevel > 0
        ? computeCharacterHpContribution(character, input.statusParty.level).totalHpBonus
        : 0,
      thunderResistance: characterStats?.elementalDefenseMultipliers.thunder ?? 1,
    });
  }));

  return Object.freeze({
    statusParty: input.statusParty,
    partyStatus: input.partyStatus,
    partyStats: input.partyStatus.partyStats,
    characterStats: input.partyStatus.characterStats,
    dungeonId: input.dungeon.id,
    dungeonFloorCount: input.dungeon.floors.length,
    difficulty,
    gameMode: input.gameMode,
    enemyLevelOffset: input.enemyLevelOffset,
    deity,
    reward: deriveExpeditionRewardContext(input.statusParty, input.partyStatus),
    ...(input.terrainOverride !== undefined ? { terrainOverride: input.terrainOverride } : {}),
    postBattleCharacters,
  });
}

export function getExpeditionRoomTerrainEffect(
  context: Pick<ExpeditionRunContext, 'terrainOverride'>,
  floorTerrainEffect: TerrainEffectKey | undefined,
): TerrainEffectKey | undefined {
  return context.terrainOverride ?? floorTerrainEffect;
}

export function getPostBattleEffectCharacters(
  context: Pick<ExpeditionRunContext, 'postBattleCharacters'>,
  floorNumber: number,
  roomInFloor: number,
  roomType: RoomType,
): readonly PostBattleEffectCharacter[] {
  const isFirstAidRoom = floorNumber >= 1
    && floorNumber <= 5
    && roomInFloor === 4
    && roomType === 'battle_Elite';
  return Object.freeze(context.postBattleCharacters.map((character) => Object.freeze({
    ...character,
    firstAidHpContribution: isFirstAidRoom ? character.firstAidHpContribution : 0,
  })));
}
