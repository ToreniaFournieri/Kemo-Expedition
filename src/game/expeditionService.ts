import type {
  Dungeon,
  EnemyDef,
  Item,
  Party,
} from '../types/index.ts';
import type { BattleExecutionOptions } from './battle.ts';
import {
  checkClearGateRequirement,
  type ClearGateCheckResult,
} from './clearGate.ts';
import {
  resolveExpeditionBattleRoom,
  type ExpeditionBattleRoomDefinition,
  type ExpeditionBattleRoomResult,
} from './expeditionBattleRoom.ts';
import {
  resolveExpeditionRoomPostReward,
  resolveExpeditionRoomVictoryRewards,
  type ExpeditionRoomPostRewardResult,
  type ExpeditionRoomVictoryRewardsResult,
} from './expeditionRoomVictory.ts';
import type { ExpeditionRunContext } from './expeditionRunContext.ts';
import {
  ExpeditionTransactionAccumulator,
  type CreateExpeditionTransactionInput,
  type ExpeditionAutoSoldItemFact,
  type ExpeditionTransactionResult,
} from './expeditionTransaction.ts';
import { getRoomMultiplier } from './enemyScaling.ts';

type BlockedClearGateCheck = Extract<ClearGateCheckResult, { blocked: true }>;

export interface ExpeditionRewardInstallation<TPresentation> {
  readonly retainedItems: readonly Item[];
  readonly autoSoldItems: readonly ExpeditionAutoSoldItemFact[];
  readonly presentation: TPresentation;
}

export interface ExpeditionServiceGateRoom {
  readonly kind: 'gate';
  readonly roomCounter: number;
  readonly floorNumber: number;
  readonly roomInFloor: number;
  readonly room: ExpeditionBattleRoomDefinition;
  readonly roomMultiplier: number;
  readonly remainingPartyHp: number;
  readonly gate: BlockedClearGateCheck;
}

export interface ExpeditionServiceVictory<TPresentation> {
  readonly rewards: ExpeditionRoomVictoryRewardsResult;
  readonly installation?: ExpeditionRewardInstallation<TPresentation>;
  readonly postReward: ExpeditionRoomPostRewardResult;
}

export interface ExpeditionServiceBattleRoom<TPresentation> {
  readonly kind: 'battle';
  readonly roomCounter: number;
  readonly floorNumber: number;
  readonly roomInFloor: number;
  readonly floorRoomCount: number;
  readonly room: ExpeditionBattleRoomDefinition;
  readonly roomStartHp: number;
  readonly resolution: ExpeditionBattleRoomResult;
  readonly victory?: ExpeditionServiceVictory<TPresentation>;
}

export type ExpeditionServiceRoom<TPresentation> =
  | ExpeditionServiceGateRoom
  | ExpeditionServiceBattleRoom<TPresentation>;

export interface RunExpeditionServiceInput<TPresentation> {
  readonly context: ExpeditionRunContext;
  readonly party: Pick<
    Party,
    'clearGateProgress' | 'clearGateStatus' | 'defeatedBossExpeditions' | 'expeditionDepthLimit'
  >;
  readonly dungeon: Dungeon;
  readonly transaction: CreateExpeditionTransactionInput;
  readonly isGodsBattle: boolean;
  readonly random: () => number;
  readonly refillBag: Parameters<typeof resolveExpeditionRoomVictoryRewards>[0]['refillBag'];
  readonly installRecoveredItems: (
    recoveredItems: readonly Item[],
  ) => ExpeditionRewardInstallation<TPresentation>;
  readonly encounterCache?: Map<string, EnemyDef>;
  readonly battleOptions?: BattleExecutionOptions;
}

export interface ExpeditionServiceResult<TPresentation> {
  readonly transaction: ExpeditionTransactionResult;
  readonly rooms: ExpeditionServiceRoom<TPresentation>[];
  readonly completedBossVictory: boolean;
}

/**
 * Language-neutral complete-expedition orchestration. Application-owned
 * inventory mutation remains synchronous through installRecoveredItems so its
 * historical position between reward draws and post-battle draws is exact.
 */
export function runExpeditionService<TPresentation>(
  input: RunExpeditionServiceInput<TPresentation>,
): ExpeditionServiceResult<TPresentation> {
  const transaction = new ExpeditionTransactionAccumulator(input.transaction);
  const rooms: ExpeditionServiceRoom<TPresentation>[] = [];
  let completedBossVictory = false;

  for (const floor of input.dungeon.floors) {
    if (transaction.ended) break;
    const selectedEnemyIdsByRoomRange = new Map<string, Set<number>>();

    for (let roomIndex = 0; roomIndex < floor.rooms.length; roomIndex += 1) {
      if (transaction.ended) break;
      const room = floor.rooms[roomIndex];
      const roomCounter = transaction.beginRoom();
      const roomInFloor = roomIndex + 1;
      const gate = checkClearGateRequirement({
        dungeonId: input.dungeon.id,
        floorNumber: floor.floorNumber,
        roomInFloor,
        roomType: room.type,
        party: input.party,
      });
      if (gate.blocked) {
        rooms.push({
          kind: 'gate',
          roomCounter,
          floorNumber: floor.floorNumber,
          roomInFloor,
          room,
          roomMultiplier: getRoomMultiplier(
            input.dungeon.expLevel,
            floor.floorNumber,
            room.type,
            false,
            input.context.difficulty.offset,
          ),
          remainingPartyHp: transaction.currentHp,
          gate,
        });
        transaction.end('Escape');
        break;
      }

      const explicitRoomEnemyIds = room.enemyIds ?? [];
      const roomRangeKey = explicitRoomEnemyIds.length > 1
        ? `${floor.floorNumber}:${explicitRoomEnemyIds.slice().sort((a, b) => a - b).join(',')}`
        : null;
      const usedEnemyIdsInRange = roomRangeKey
        ? (selectedEnemyIdsByRoomRange.get(roomRangeKey) ?? new Set<number>())
        : undefined;
      const resolution = resolveExpeditionBattleRoom({
        context: input.context,
        dungeon: input.dungeon,
        floorNumber: floor.floorNumber,
        floorTerrainEffect: floor.terrainEffect,
        room,
        currentHp: transaction.currentHp,
        bags: transaction.bags,
        usedEnemyIdsInRange,
        isGodsBattle: input.isGodsBattle,
        random: input.random,
        ...(input.encounterCache ? { encounterCache: input.encounterCache } : {}),
        ...(input.battleOptions ? { battleOptions: input.battleOptions } : {}),
      });
      if (!resolution) continue;
      if (roomRangeKey) {
        const nextUsedEnemyIds = selectedEnemyIdsByRoomRange.get(roomRangeKey) ?? new Set<number>();
        nextUsedEnemyIds.add(resolution.baseEnemyId);
        selectedEnemyIdsByRoomRange.set(roomRangeKey, nextUsedEnemyIds);
      }

      const roomStartHp = transaction.currentHp;
      const victory = resolution.battleResult.outcome === 'victory';
      transaction.recordBattleRoom({
        enemyId: resolution.enemy.id,
        victory,
        bags: resolution.updatedBags,
        revealedAbilityIds: resolution.revealedAbilityIds,
        revealedItemIds: resolution.revealedItemIds,
        terrainEffect: resolution.terrainEffect,
      });

      if (victory) {
        if (room.type === 'battle_Boss') completedBossVictory = true;
        const rewards = resolveExpeditionRoomVictoryRewards({
          context: input.context,
          dungeon: input.dungeon,
          enemy: resolution.enemy,
          battleResult: resolution.battleResult,
          floorNumber: floor.floorNumber,
          roomType: room.type,
          terrainEffect: resolution.terrainEffect,
          bags: transaction.bags,
          isGodsBattle: input.isGodsBattle,
          random: input.random,
          refillBag: input.refillBag,
        });
        transaction.recordVictoryRewards(rewards);
        const installation = rewards.recoveredItems.length > 0
          ? input.installRecoveredItems(rewards.recoveredItems)
          : undefined;
        if (installation) {
          transaction.recordRecoveredItems({
            recoveredItems: rewards.recoveredItems,
            retainedItems: installation.retainedItems,
            autoSoldItems: installation.autoSoldItems,
          });
        }
        const postReward = resolveExpeditionRoomPostReward({
          context: input.context,
          floorNumber: floor.floorNumber,
          roomInFloor,
          floorRoomCount: floor.rooms.length,
          roomType: room.type,
          terrainEffect: resolution.terrainEffect,
          battlePartyHp: resolution.battleResult.partyHp,
          depthLimit: input.party.expeditionDepthLimit,
          auriferousEffect: rewards.auriferousEffect,
          random: input.random,
        });
        transaction.recordPostReward({
          preContinuationHp: postReward.postBattleEffects.preContinuationHp,
          finalHp: postReward.postBattleEffects.finalHp,
          shouldRetreat: postReward.postBattleEffects.shouldRetreat,
          reachedDepthLimit: postReward.reachedDepthLimit,
        });
        rooms.push({
          kind: 'battle',
          roomCounter,
          floorNumber: floor.floorNumber,
          roomInFloor,
          floorRoomCount: floor.rooms.length,
          room,
          roomStartHp,
          resolution,
          victory: { rewards, ...(installation ? { installation } : {}), postReward },
        });
      } else {
        if (resolution.battleResult.outcome === 'defeat') {
          transaction.recordDefeat(resolution.battleResult.partyHp);
        } else {
          transaction.recordDraw(resolution.battleResult.partyHp);
        }
        rooms.push({
          kind: 'battle',
          roomCounter,
          floorNumber: floor.floorNumber,
          roomInFloor,
          floorRoomCount: floor.rooms.length,
          room,
          roomStartHp,
          resolution,
        });
      }
    }
  }

  return {
    transaction: transaction.finish(),
    rooms,
    completedBossVictory,
  };
}
