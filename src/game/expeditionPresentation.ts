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
import { formatEnemyDefName } from './enemyDisplay.ts';
import { buildAuriferousLogEntry } from './expeditionEffects/auriferousNarration.ts';
import { buildPostBattleEffectLogs } from './expeditionEffects/postBattleEffectNarration.ts';
import type { ExpeditionServiceResult } from './expeditionService.ts';

const GODS_BATTLE_SUFFIX_KEY = 'game.log.godsBattleSuffix';

export interface ExpeditionRewardPresentation {
  readonly rewardNames: readonly string[];
  readonly rewards: readonly Item[];
  readonly rewardLogEntries: readonly {
    readonly itemName: string;
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
  readonly dungeon: Pick<Dungeon, 'name'>;
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
      const gateLabel = t(serviceRoom.gate.labelKey);
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
      const gateInfo = gateWasUnlocked && input.newlyUnlockedGateKey !== null
        && input.newlyUnlockedGateKey !== undefined
        ? unlockedBossGate
          ? t('game.log.gateInfo.bossCleared', {
              label: t('home.gate.consecutiveSuccesses'),
              required: getClearGateRequired(input.newlyUnlockedGateKey),
            })
          : t('game.log.gateInfo.floorCleared', {
              label: t('home.gate.consecutiveSuccesses'),
              required: getClearGateRequired(input.newlyUnlockedGateKey),
              floor: serviceRoom.floorNumber,
            })
        : serviceRoom.room.type === 'battle_Boss'
          ? t('game.log.gateInfo.boss', {
              label: gateLabel,
              required: serviceRoom.gate.required,
            })
          : serviceRoom.roomInFloor === 1
            ? t('game.log.gateInfo.dungeon', {
                label: gateLabel,
                current: serviceRoom.gate.current,
                required: serviceRoom.gate.required,
                dungeon: input.dungeon.name,
              })
            : t('game.log.gateInfo.floor', {
                label: gateLabel,
                required: serviceRoom.gate.required,
                floor: serviceRoom.floorNumber,
              });
      entries.push({
        room: serviceRoom.roomCounter,
        floor: serviceRoom.floorNumber,
        roomInFloor: serviceRoom.roomInFloor,
        roomType: serviceRoom.room.type,
        floorMultiplier: serviceRoom.roomMultiplier,
        enemyName: t('auto.jp.270d06353e'),
        enemyHP: 0,
        enemyAttackValues: '',
        outcome: 'draw',
        damageDealt: 0,
        damageTaken: 0,
        remainingPartyHP: serviceRoom.remainingPartyHp,
        maxPartyHP: input.maxPartyHp,
        details: [],
        gateInfo,
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
    let roomSuffix = '';
    if (room.type === 'battle_Elite') roomSuffix = ' (ELITE)';
    if (room.type === 'battle_Boss') {
      roomSuffix = input.isGodsBattle ? ` ${t(GODS_BATTLE_SUFFIX_KEY)}` : ' (BOSS)';
    }
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
      enemyName: formatEnemyDefName(enemy) + roomSuffix,
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
        entry.reward = rewardResult.rewardNames.join(' / ');
        entry.rewardItems = [...rewardResult.rewards];
        entry.rewardRarity = rewardResult.highestRewardRarity;
        entry.rewardIsSuperRare = rewardResult.hasSuperRareReward;
      }
      if (postReward.auriferousNarrationFact) {
        entry.details.push(buildAuriferousLogEntry(postReward.auriferousNarrationFact));
      }
      const { postBattleEffects } = postReward;
      entry.remainingPartyHP = postBattleEffects.preContinuationHp;
      if (postBattleEffects.deityHealAmount) entry.healAmount = postBattleEffects.deityHealAmount;
      if (postBattleEffects.deityAttritionAmount) {
        entry.attritionAmount = postBattleEffects.deityAttritionAmount;
      }
      if (postBattleEffects.preContinuationFacts.length > 0) {
        entry.details.push(...buildPostBattleEffectLogs(postBattleEffects.preContinuationFacts));
      }
      if (rewardResult && rewardResult.rewardLogEntries.length > 0) {
        entry.details.push(...buildRewardLogEntries(rewardResult.rewardLogEntries));
      }
      if (postBattleEffects.shouldRetreat) {
        entry.details.push({
          phase: 'end',
          actor: 'deity',
          action: t('auto.jp.2660ad39fa'),
          note: t('auto.jp.36cbc2e27f'),
        });
      } else {
        entry.remainingPartyHP = postBattleEffects.finalHp;
        if (postBattleEffects.continuationFacts.length > 0) {
          entry.details.push(...buildPostBattleEffectLogs(postBattleEffects.continuationFacts));
        }
        if (postReward.reachedDepthLimit) {
          entry.details.push({
            phase: 'end',
            actor: 'deity',
            action: t('auto.jp.96b6003d0c'),
          });
        }
      }
    }
    entries.push(entry);
  }

  return { entries, deferredBattleNarrations };
}
