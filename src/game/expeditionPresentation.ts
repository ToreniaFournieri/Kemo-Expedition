import { diaryItem, type DiaryText } from './compactDiary.ts';
import type {
  BattleLogEntry,
  Dungeon,
  EnemyDef,
  ExpeditionLogEntry,
  GameBags,
  Item,
  ItemRarity,
  TerrainEffectKey,
} from '../types/index.ts';
import { t } from '../i18n/index.ts';
import { getClearGateRequired } from './clearGate.ts';
import type { ExpeditionServiceResult } from './expeditionService.ts';


export interface ExpeditionRewardPresentation {
  readonly rewardNames: readonly string[];
  readonly rewards: readonly Item[];
  readonly rewardLogEntries: readonly {
    readonly itemName: string;
    readonly item?: Item;
    readonly autoSellProfit?: number;
  }[];
  readonly highestRewardRarity?: ItemRarity;
  readonly hasSuperRareReward: boolean;
}

export interface DeferredExpeditionBattleNarration {
  readonly entry: ExpeditionLogEntry;
  readonly enemy: EnemyDef;
  readonly bags: GameBags;
  readonly initialPartyHp: number;
  readonly terrainEffect: TerrainEffectKey | null | undefined;
}

export interface RenderExpeditionServiceResultInput {
  readonly result: ExpeditionServiceResult<ExpeditionRewardPresentation>;
  readonly dungeon: Pick<Dungeon, 'name'> & Partial<Pick<Dungeon, 'id'>>;
  readonly maxPartyHp: number;
  readonly isGodsBattle: boolean;
  readonly deferBattleNarration: boolean;
  readonly newlyUnlockedGateKey?: number | null;
}

export interface RenderedExpeditionServiceResult {
  readonly entries: ExpeditionLogEntry[];
  readonly deferredBattleNarrations: DeferredExpeditionBattleNarration[];
}

function buildRewardLogEntries(
  rewardLogEntries: ExpeditionRewardPresentation['rewardLogEntries'],
): BattleLogEntry[] {
  return rewardLogEntries.map((rewardEntry) => ({
    phase: 'end',
    actor: 'effect',
    action: t('game.log.itemObtained', { item: rewardEntry.itemName }),
    note: rewardEntry.autoSellProfit && rewardEntry.autoSellProfit > 0
      ? t('game.log.autoSellTarget', { amount: rewardEntry.autoSellProfit })
      : undefined,
  }));
}

/**
 * Localized, random-free projection of a neutral expedition service result.
 * The returned entry references are also used by deferred AFK narration so a
 * later replay fills the exact entries installed in the expedition log.
 */
export function renderExpeditionServiceResult(
  input: RenderExpeditionServiceResultInput,
): RenderedExpeditionServiceResult {
  const entries: ExpeditionLogEntry[] = [];
  const deferredBattleNarrations: DeferredExpeditionBattleNarration[] = [];

  for (const serviceRoom of input.result.rooms) {
    if (serviceRoom.kind === 'gate') {
      const gateLabel: DiaryText = [serviceRoom.gate.labelKey];
      const unlockedGatePosition = input.newlyUnlockedGateKey === null
        || input.newlyUnlockedGateKey === undefined
        ? null
        : input.newlyUnlockedGateKey % 1000;
      const unlockedBossGate = unlockedGatePosition === 604;
      const unlockedFloor = unlockedGatePosition === null
        ? null
        : unlockedBossGate
          ? 6
          : Math.floor(unlockedGatePosition / 10);
      const gateWasUnlocked = unlockedFloor === serviceRoom.floorNumber
        && serviceRoom.roomInFloor === 4;
      const gateText: DiaryText = gateWasUnlocked && input.newlyUnlockedGateKey !== null
        && input.newlyUnlockedGateKey !== undefined
        ? unlockedBossGate
          ? ['game.log.gateInfo.bossCleared', {
              label: ['home.gate.consecutiveSuccesses'],
              required: getClearGateRequired(input.newlyUnlockedGateKey),
            }]
          : ['game.log.gateInfo.floorCleared', {
              label: ['home.gate.consecutiveSuccesses'],
              required: getClearGateRequired(input.newlyUnlockedGateKey),
              floor: serviceRoom.floorNumber,
            }]
        : serviceRoom.room.type === 'battle_Boss'
          ? ['game.log.gateInfo.boss', {
              label: gateLabel,
              required: serviceRoom.gate.required,
            }]
          : serviceRoom.roomInFloor === 1
            ? ['game.log.gateInfo.dungeon', {
                label: gateLabel,
                current: serviceRoom.gate.current,
                required: serviceRoom.gate.required,
                dungeon: input.dungeon.id ? [`data.dungeons.${input.dungeon.id}.name`] : input.dungeon.name,
              }]
            : ['game.log.gateInfo.floor', {
                label: gateLabel,
                required: serviceRoom.gate.required,
                floor: serviceRoom.floorNumber,
              }];
      entries.push({
        room: serviceRoom.roomCounter,
        floor: serviceRoom.floorNumber,
        roomInFloor: serviceRoom.roomInFloor,
        roomType: serviceRoom.room.type,
        floorMultiplier: serviceRoom.roomMultiplier,
        enemyName: '',
        enemyHP: 0,
        enemyAttackValues: '',
        outcome: 'draw',
        damageDealt: 0,
        damageTaken: 0,
        remainingPartyHP: serviceRoom.remainingPartyHp,
        maxPartyHP: input.maxPartyHp,
        details: [],
        gateInfo: '@compact',
        gateText,
      });
      continue;
    }

    const { resolution, room, roomStartHp } = serviceRoom;
    const {
      enemy,
      roomMultiplier,
      terrainEffect,
      battleStartBags,
      battleResult,
      damageDealt,
      damageTaken,
      enemyAttackValues,
    } = resolution;
    const entry: ExpeditionLogEntry = {
      room: serviceRoom.roomCounter,
      floor: serviceRoom.floorNumber,
      roomInFloor: serviceRoom.roomInFloor,
      roomType: room.type,
      startPartyHP: roomStartHp,
      postBattlePartyHP: battleResult.partyHp,
      floorMultiplier: roomMultiplier,
      enemyId: enemy.id,
      enemySnapshot: enemy,
      enemyName: '',
      godsBattle: input.isGodsBattle && room.type === 'battle_Boss',
      endEvents: [],
      ...('log' in battleResult ? { compactBattle: (battleResult as import('./battle.ts').BattleResult).compactBattle } : {}),
      enemyHP: enemy.hp,
      enemyAttackValues,
      outcome: battleResult.outcome!,
      damageDealt,
      damageTaken,
      remainingPartyHP: battleResult.partyHp,
      maxPartyHP: input.maxPartyHp,
      details: 'log' in battleResult && Array.isArray(battleResult.log)
        ? [...battleResult.log]
        : [],
      replayMetadata: battleResult.replayMetadata,
    };
    if (input.deferBattleNarration) {
      deferredBattleNarrations.push({
        entry,
        enemy,
        bags: battleStartBags,
        initialPartyHp: roomStartHp,
        terrainEffect,
      });
    }

    if (serviceRoom.victory) {
      const { installation, postReward } = serviceRoom.victory;
      const rewardResult = installation?.presentation;
      if (rewardResult && rewardResult.rewardNames.length > 0) {
        entry.reward = '@compact';
        entry.rewardItems = [...rewardResult.rewards];
        entry.rewardRarity = rewardResult.highestRewardRarity;
        entry.rewardIsSuperRare = rewardResult.hasSuperRareReward;
      }
      if (postReward.auriferousNarrationFact) {
        entry.endEvents!.push([1, postReward.auriferousNarrationFact]);
      }
      const { postBattleEffects } = postReward;
      entry.remainingPartyHP = postBattleEffects.preContinuationHp;
      if (postBattleEffects.deityHealAmount) entry.healAmount = postBattleEffects.deityHealAmount;
      if (postBattleEffects.deityAttritionAmount) {
        entry.attritionAmount = postBattleEffects.deityAttritionAmount;
      }
      if (postBattleEffects.preContinuationFacts.length > 0) {
        entry.endEvents!.push(...postBattleEffects.preContinuationFacts.map(fact => [0, fact] as [0, typeof fact]));
      }
      if (rewardResult && rewardResult.rewardLogEntries.length > 0) {
        for (const reward of rewardResult.rewardLogEntries) {
          if (reward.item) entry.endEvents!.push(reward.autoSellProfit === undefined ? [2, diaryItem(reward.item)] : [2, diaryItem(reward.item), reward.autoSellProfit]);
          else entry.details.push(...buildRewardLogEntries([reward]));
        }
      }
      if (postBattleEffects.shouldRetreat) {
        entry.endEvents!.push([3]);
      } else {
        entry.remainingPartyHP = postBattleEffects.finalHp;
        if (postBattleEffects.continuationFacts.length > 0) {
          entry.endEvents!.push(...postBattleEffects.continuationFacts.map(fact => [0, fact] as [0, typeof fact]));
        }
        if (postReward.reachedDepthLimit) {
          entry.endEvents!.push([4]);
        }
      }
    }
    entries.push(entry);
  }

  return { entries, deferredBattleNarrations };
}
