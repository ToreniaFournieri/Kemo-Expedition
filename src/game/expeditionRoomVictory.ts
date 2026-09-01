import type {
  Dungeon,
  ExpeditionDepthLimit,
  GameBags,
  Item,
  RoomType,
  TerrainEffectKey,
} from '../types/index.ts';
import { getEffectiveEnemyLevel } from '../data/dungeons.ts';
import { getEnemyDropCandidates } from '../data/enemies.ts';
import type { BattleResolution } from './battle.ts';
import {
  drawAuriferousNarrationFact,
  resolveAuriferousRewardEffect,
  type AuriferousNarrationFact,
  type AuriferousRewardEffect,
} from './expeditionEffects/auriferousEffect.ts';
import { hasReachedExpeditionDepthLimit } from './expeditionEffects/expeditionContinuation.ts';
import {
  resolvePostBattleEffects,
  type PostBattleEffectsResult,
} from './expeditionEffects/postBattleEffects.ts';
import {
  resolveEnemyRewardDrops,
  type ResolveEnemyRewardDropsInput,
} from './expeditionEffects/rewardDrops.ts';
import {
  getPostBattleEffectCharacters,
  type ExpeditionRunContext,
} from './expeditionRunContext.ts';
import { calculateExperience } from './partyLevel.ts';

export interface ResolveExpeditionRoomVictoryRewardsInput {
  readonly context: ExpeditionRunContext;
  readonly dungeon: Dungeon;
  readonly enemy: Parameters<typeof getEnemyDropCandidates>[0];
  readonly battleResult: Pick<BattleResolution, 'enemyHitsReceived'>;
  readonly floorNumber: number;
  readonly roomType: RoomType;
  readonly terrainEffect?: TerrainEffectKey;
  readonly bags: GameBags;
  readonly isGodsBattle: boolean;
  readonly random: () => number;
  readonly refillBag: ResolveEnemyRewardDropsInput['refillBag'];
}

export interface ExpeditionRoomVictoryRewardsResult {
  readonly experience: number;
  readonly bags: GameBags;
  readonly recoveredItems: readonly Item[];
  readonly auriferousEffect: AuriferousRewardEffect | null;
}

export function resolveExpeditionRoomVictoryRewards(
  input: ResolveExpeditionRoomVictoryRewardsInput,
): ExpeditionRoomVictoryRewardsResult {
  const isColosseumBattle = input.dungeon.id === 99;
  const experience = isColosseumBattle
    ? 0
    : calculateExperience(
      input.enemy.experience,
      input.roomType,
      input.context.statusParty.level,
      getEffectiveEnemyLevel(
        input.dungeon.expLevel,
        input.floorNumber,
        input.roomType,
        false,
        input.context.difficulty.offset,
      ),
      input.isGodsBattle,
    );

  if (isColosseumBattle) {
    return Object.freeze({
      experience,
      bags: input.bags,
      recoveredItems: Object.freeze([]),
      auriferousEffect: null,
    });
  }

  const auriferousEffect = resolveAuriferousRewardEffect({
    actorName: input.enemy.name,
    abilities: input.enemy.abilities,
    totalHitsReceived: input.battleResult.enemyHitsReceived,
  });
  const dropResult = resolveEnemyRewardDrops({
    baseItems: getEnemyDropCandidates(input.enemy),
    bags: input.bags,
    hasUnlock: Boolean(input.context.reward.unlockActorName),
    terrainEffect: input.terrainEffect,
    deityItemChanceTickets: input.context.deity.itemChanceTickets,
    auriferousBonusRolls: auriferousEffect?.bonusRolls ?? 0,
    difficultyItemChanceTickets: input.context.difficulty.itemChanceTickets,
    difficultySuperRareChanceTickets: input.context.difficulty.superRareChanceTickets
      + (input.terrainEffect !== 'terrain.gehenna'
        ? input.context.deity.superRareChanceTickets
        : 0),
    random: input.random,
    refillBag: input.refillBag,
  });

  return Object.freeze({
    experience,
    bags: dropResult.bags,
    recoveredItems: dropResult.recoveredItems,
    auriferousEffect,
  });
}

export interface ResolveExpeditionRoomPostRewardInput {
  readonly context: ExpeditionRunContext;
  readonly floorNumber: number;
  readonly roomInFloor: number;
  readonly floorRoomCount: number;
  readonly roomType: RoomType;
  readonly terrainEffect?: TerrainEffectKey;
  readonly battlePartyHp: number;
  readonly depthLimit: ExpeditionDepthLimit;
  readonly auriferousEffect: AuriferousRewardEffect | null;
  readonly random: () => number;
}

export interface ExpeditionRoomPostRewardResult {
  readonly auriferousNarrationFact?: AuriferousNarrationFact;
  readonly postBattleEffects: PostBattleEffectsResult;
  readonly reachedDepthLimit: boolean;
}

export function resolveExpeditionRoomPostReward(
  input: ResolveExpeditionRoomPostRewardInput,
): ExpeditionRoomPostRewardResult {
  // Preserve the historical reward -> Auriferous flavor -> post-battle draw order.
  const auriferousNarrationFact = input.auriferousEffect
    ? drawAuriferousNarrationFact(input.auriferousEffect, input.random)
    : undefined;
  const isFinalBossRoom = input.roomType === 'battle_Boss'
    && input.floorNumber === input.context.dungeonFloorCount
    && input.roomInFloor === input.floorRoomCount;
  const postBattleEffects = resolvePostBattleEffects({
    currentHp: input.battlePartyHp,
    maxHp: input.context.partyStats.hp,
    floorNumber: input.floorNumber,
    roomInFloor: input.roomInFloor,
    roomType: input.roomType,
    terrainEffect: input.terrainEffect,
    deityKey: input.context.deity.key,
    deityRank: input.context.deity.rank,
    partyName: input.context.statusParty.name,
    characters: getPostBattleEffectCharacters(
      input.context,
      input.floorNumber,
      input.roomInFloor,
      input.roomType,
    ),
    isFinalBossRoom,
    random: input.random,
  });
  const reachedDepthLimit = !postBattleEffects.shouldRetreat
    && hasReachedExpeditionDepthLimit(
      input.depthLimit,
      input.floorNumber,
      input.roomInFloor,
    );

  return Object.freeze({
    ...(auriferousNarrationFact ? { auriferousNarrationFact } : {}),
    postBattleEffects,
    reachedDepthLimit,
  });
}
