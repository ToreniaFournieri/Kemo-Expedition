import { useReducer, useCallback, useEffect, useRef, useState } from 'react';
import {
  GameState,
  Item,
  ItemCategory,
  Character,
  Party,
  SleepinessState,
  RaceId,
  ClassId,
  PredispositionId,
  LineageId,
  ExpeditionLog,
  DiaryLog,
  DiarySettings,
  ExpeditionLogEntry,
  BattleLogEntry,
  InventoryRecord,
  getVariantKey,
  GameNotification,
  NotificationStyle,
  NotificationCategory,
  RoomType,
  TerrainEffectKey,
  EnemyDef,
  ExpeditionDepthLimit,
} from '../types';
import { computePartyStats } from '../game/partyComputation';
import { executeBattle, calculateEnemyAttackValues } from '../game/battle';
import { getEncounterEnemyWithScaling, getRoomMultiplier } from '../game/enemyScaling';
import { buildColosseumEnemy, getColosseumEnemySettings } from '../game/colosseum';
import { replaceCharacterEquipment } from '../game/equipment';
import { DUNGEONS, getDungeonById, getEffectiveEnemyLevel, getEffectiveEnemyMultipliers, getEffectiveExpeditionTier } from '../data/dungeons';
import { ENEMIES, getEnemiesByPool, getElitesByPool, getBossEnemy, getEnemyDropCandidates } from '../data/enemies';
import { getGodProfileForDungeon } from '../data/dropTables';
import { buildGodRuntimeEnemy } from '../game/godEnemy';
import { formatEnemyDefName } from '../game/enemyDisplay';
import {
  drawFromBag,
  refillBagIfEmpty,
  createCommonRewardBag,
  createCommonEnhancementBag,
  createUncommonRewardBag,
  createEliteRareRewardBag,
  createBossRareRewardBag,
  createMythicRareRewardBag,
  createEnhancementBag,
  createSuperRareBag,
  createPhysicalThreatBag,
  createMagicalThreatBag,
  createSideQuestBag,
  createSleepinessPartyBag,
  normalizeSleepinessPartyBag,
  normalizeBagForType,
  BagType,
  normalizeGameBags,
} from '../game/bags';
import { getItemById, getItemsByTierAndRarity } from '../data/items';
import { hydrateGameState, serializeGameState } from '../game/saveCodec';
import { getItemDisplayName } from '../game/gameState';
import { DEITY_OPTIONS, getDeityKey, getDeityRank, isNoFaithDeity, normalizeDeityName } from '../game/deity';
import { RACES } from '../data/races';
import { CLASSES } from '../data/classes';
import { PREDISPOSITIONS } from '../data/predispositions';
import { LINEAGES } from '../data/lineages';
import {
  ELITE_GATE_REQUIREMENTS,
  ENTRY_GATE_REQUIRED,
  BOSS_GATE_REQUIRED,
  getGodsBattleRequired,
  getLootCollectionCount,
  getLootCollectionKey,
  getEntryGateKey,
  getEliteGateKey,
  getBossGateKey,
  isLootGateUnlocked,
  checkLootGateRequirement,
  addRecoveredItemsToLootProgress,
  hasDefeatedDungeonBoss,
  unlockAvailableLootGates,
} from '../game/lootGate';
import { calculateExperience, getXpToNextLevel } from '../game/partyLevel';
import { MAX_LEVEL } from '../types';
import { createEnvironmentStorageKey, getEnvironmentId } from '../game/environment';
import { DIARY_LOG_RETENTION_LIMIT } from '../game/diary';
import { computeCharacterStats } from '../game/characterComputation';
import {
  getShopItemPrice,
  getShopHourKey,
  getShopStockKey,
  getShopRefreshPrice,
  countElapsedShopRefreshes,
  getCurrentShopRefreshDate,
} from '../game/shop';
import { calculateItemSellPrice } from '../game/pricing';
import {
  addJewelToInventory,
  createStarterJewelInventory,
  getJewelOwnedCount,
  isJewelAllowedForCategory,
  removeJewelFromInventory,
  getJewelNameByRank,
} from '../game/jewel';
import { decodePersistedState, encodePersistedState } from '../game/storageCompression';

const BUILD_NUMBER = __BUILD_NUMBER__;
const STORAGE_KEY = createEnvironmentStorageKey('kemo-expedition-save');
const AFK_MAX_SIMULATION_MS = 600 * 60 * 1000;
const STATE_SAVE_THROTTLE_MS = 5000;
const DEBUG_CYCLE_DURATION_SCALE = 0.2;
const ITEM_MAX_STACK = 99;
const TIME_BASED_SIDE_QUEST_TYPES = new Set(['q.exercise', 'q.healing', 'q.AFK']);
const BASE_STEP_DURATION_MS = 15_000;
const APPROX_CYCLE_STEP_COUNT = 30;

type SideQuestScaleByLevel = {
  1: number;
  2: number;
  3: number;
  4: number;
};

type SideQuestRuntimeDef = {
  type: string;
  shortText: string;
  baseMin: number;
  baseMax: number;
  deadlineHours: number;
  scaleByLevel: SideQuestScaleByLevel;
};

const SIDE_QUEST_RUNTIME_DEFS: Record<number, SideQuestRuntimeDef> = {
  1: { type: 'q.squander', shortText: '散財', baseMin: 100, baseMax: 400, deadlineHours: 16, scaleByLevel: { 1: 1, 2: 1.4, 3: 1.8, 4: 2.2 } },
  2: { type: 'q.sleeping', shortText: '安眠', baseMin: 1, baseMax: 4, deadlineHours: 12, scaleByLevel: { 1: 1, 2: 1, 3: 1, 4: 1 } },
  3: { type: 'q.exercise', shortText: '運動', baseMin: 5, baseMax: 15, deadlineHours: 16, scaleByLevel: { 1: 1, 2: 1.3, 3: 1.5, 4: 2.0 } },
  4: { type: 'q.embezzlement', shortText: '横領', baseMin: 25, baseMax: 100, deadlineHours: 16, scaleByLevel: { 1: 1, 2: 1.4, 3: 1.8, 4: 2.2 } },
  5: { type: 'q.donation', shortText: '寄付', baseMin: 100, baseMax: 500, deadlineHours: 12, scaleByLevel: { 1: 1, 2: 1.4, 3: 1.8, 4: 2.2 } },
  6: { type: 'q.healing', shortText: '治療', baseMin: 5, baseMax: 20, deadlineHours: 16, scaleByLevel: { 1: 1, 2: 1.3, 3: 1.5, 4: 2.0 } },
  7: { type: 'q.AFK', shortText: '放置', baseMin: 30, baseMax: 120, deadlineHours: 0, scaleByLevel: { 1: 1, 2: 1.3, 3: 1.5, 4: 2.0 } },
  8: { type: 'q.treasure-super-rare', shortText: '超レア獲得', baseMin: 1, baseMax: 1, deadlineHours: 24, scaleByLevel: { 1: 1, 2: 1, 3: 1, 4: 1 } },
  9: { type: 'q.treasure-boss-rare', shortText: 'ボスレア獲得', baseMin: 1, baseMax: 4, deadlineHours: 16, scaleByLevel: { 1: 1, 2: 1, 3: 1, 4: 1 } },
  10: { type: 'q.poor-kid', shortText: 'アイテム獲得空振り', baseMin: 10, baseMax: 30, deadlineHours: 9, scaleByLevel: { 1: 1, 2: 1.3, 3: 1.5, 4: 2.0 } },
  11: { type: 'q.consecutive-wins', shortText: '連続踏破', baseMin: 5, baseMax: 20, deadlineHours: 16, scaleByLevel: { 1: 1, 2: 1.3, 3: 1.5, 4: 2.0 } },
  12: { type: 'q.losers', shortText: '敗北', baseMin: 1, baseMax: 1, deadlineHours: 9, scaleByLevel: { 1: 1, 2: 1, 3: 1, 4: 1 } },
  13: { type: 'q.savings', shortText: '貯金', baseMin: 200, baseMax: 1000, deadlineHours: 16, scaleByLevel: { 1: 1, 2: 1.4, 3: 1.8, 4: 2.2 } },
};

function getSideQuestLevelFromExpId(expId: number): 1 | 2 | 3 | 4 {
  // SpecRef: 5.1.2 | Side Quest | Side quest difficulty
  if (expId <= 2) return 1;
  if (expId <= 4) return 2;
  if (expId <= 6) return 3;
  return 4;
}

function normalizeSideQuestType(type: string): string {
  // SpecRef: 5.1.2 | Side Quest | Runtime quest id normalization
  const legacyToCurrentTypeMap: Record<string, string> = {
    'q.treasure_super_rare': 'q.treasure-super-rare',
    'q.treasure_boss_rare': 'q.treasure-boss-rare',
    'q.poor_kid': 'q.poor-kid',
    'q.consecutive_wins': 'q.consecutive-wins',
  };
  return legacyToCurrentTypeMap[type] ?? type;
}

const PARTY_UNLOCK_BY_GOD_NAME: Record<string, number> = {
  Seiran: 2,
  'セイラン': 2,
  Garv: 3,
  'ガーヴ': 3,
  'Kyōen': 4,
  'キョウエン': 4,
  Miora: 5,
  'ミオラ': 5,
  Dolvar: 6,
  'ドルヴァ': 6,
};

function getGodNameFromLogEnemyName(enemyName: string): string {
  const token = enemyName.split(' ')[0] ?? enemyName;
  return token.replace(/\(.*?\)/g, '');
}

function getUnlockedPartySlotFromEntry(entry: ExpeditionLogEntry): number | null {
  if (entry.outcome !== 'victory' || entry.roomType !== 'battle_Boss' || !entry.enemyName.includes('(神魔戦)')) return null;
  const enemyName = getGodNameFromLogEnemyName(entry.enemyName);
  return PARTY_UNLOCK_BY_GOD_NAME[enemyName] ?? null;
}

const DEFAULT_UNLOCKED_DEITIES: string[] = DEITY_OPTIONS
  .map((deity) => normalizeDeityName(deity.name))
  .filter((deityName) => !isNoFaithDeity(deityName));

function normalizeUnlockedDeities(unlockedDeities: unknown): string[] {
  if (!Array.isArray(unlockedDeities)) return [];
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const deityName of unlockedDeities) {
    if (typeof deityName !== 'string') continue;
    const name = normalizeDeityName(deityName);
    if (isNoFaithDeity(name) || seen.has(name)) continue;
    seen.add(name);
    normalized.push(name);
  }
  return normalized;
}

function createUnlockedPartyWithAvailableDeity(defaultParty: Party, existingParties: Party[]): Party {
  const normalizedDeityName = normalizeDeityName(defaultParty.deity.name);
  if (isNoFaithDeity(normalizedDeityName)) return defaultParty;

  const isUsedByOtherParty = existingParties.some((party) => normalizeDeityName(party.deity.name) === normalizedDeityName);
  if (!isUsedByOtherParty) return defaultParty;

  return {
    ...defaultParty,
    deity: createInitialDeity('None'),
    deityGold: 0,
  };
}

function getUnlockedStateFromEntries(logs: ExpeditionLog[], initialPartySlots: number): { unlockedPartySlots: number } {
  let unlockedPartySlots = initialPartySlots;

  for (const log of logs) {
    for (const entry of log.entries) {
      const unlockPartySlot = getUnlockedPartySlotFromEntry(entry);
      if (unlockPartySlot) {
        unlockedPartySlots = Math.max(unlockedPartySlots, unlockPartySlot);
      }
    }
  }

  return { unlockedPartySlots };
}

// SpecRef: 8.5 | UI_DIARY | It keeps 24 entries
function enforceGlobalDiaryLogRetention(parties: Party[]): Party[] {
  const allDiaryLogRefs = parties.flatMap((party, partyIndex) =>
    (party.diaryLogs ?? []).map((log, logIndex) => ({
      partyIndex,
      logIndex,
      createdAt: typeof log.createdAt === 'number' ? log.createdAt : 0,
    }))
  );

  if (allDiaryLogRefs.length <= DIARY_LOG_RETENTION_LIMIT) {
    return parties;
  }

  const keepKeys = new Set(
    allDiaryLogRefs
      .sort((a, b) => b.createdAt - a.createdAt || a.partyIndex - b.partyIndex || a.logIndex - b.logIndex)
      .slice(0, DIARY_LOG_RETENTION_LIMIT)
      .map(({ partyIndex, logIndex }) => `${partyIndex}:${logIndex}`)
  );

  return parties.map((party, partyIndex) => {
    const nextDiaryLogs = (party.diaryLogs ?? []).filter((_, logIndex) => keepKeys.has(`${partyIndex}:${logIndex}`));
    if (nextDiaryLogs.length === (party.diaryLogs ?? []).length) {
      return party;
    }
    return {
      ...party,
      diaryLogs: nextDiaryLogs,
      hasUnreadDiary: nextDiaryLogs.some((log) => !log.isRead),
    };
  });
}


// SpecRef: 5.1.3.2 | Unlock party | Party unlock condition
function getUnlockDiaryLog(
  log: ExpeditionLog | null,
  previousPartySlots: number,
  pendingUnlockState: NonNullable<Party['pendingUnlockState']>,
  createdAt: number,
): DiaryLog | null {
  if (!log) return null;

  const unlockedPartySlot = pendingUnlockState.partySlotCount > previousPartySlots
    ? pendingUnlockState.partySlotCount
    : null;
  if (!unlockedPartySlot) return null;

  const unlockSourceEntry = [...log.entries]
    .reverse()
    .find((entry) => {
      const partyUnlock = getUnlockedPartySlotFromEntry(entry);
      return !!partyUnlock;
    });

  const godName = unlockSourceEntry && unlockSourceEntry.enemyName.includes('(神魔戦)')
    ? getGodNameFromLogEnemyName(unlockSourceEntry.enemyName)
    : null;
  const godProfile = godName ? getGodProfileForDungeon(log.dungeonId, log.dungeonName) : null;
  const unlockHeadline = godProfile
    ? `${godProfile.displayName}撃破`
    : unlockSourceEntry?.enemyName.includes('(BOSS)')
      ? `${log.dungeonName}のBOSS撃破`
      : '解禁条件達成';

  const unlockPartyLabel = unlockedPartySlot ? `PT${unlockedPartySlot}解放` : '';
  const unlockDetail = [unlockPartyLabel].filter(Boolean).join('、');

  return {
    id: `${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
    expeditionLog: log,
    triggers: ['unlock'],
    unlockHeadline,
    unlockDetail,
    createdAt,
    isRead: false,
  };
}

function getCycleDurationScale(): number {
  const env = getEnvironmentId();
  return env === 'dev' || env === 'qa' || env === 'luna' ? DEBUG_CYCLE_DURATION_SCALE : 1;
}

function formatSideQuestShortText(type: string, shortText: string, target: number): string {
  const formatNumber = (value: number) => Math.floor(value).toLocaleString('ja-JP');
  const valueByType: Partial<Record<string, string>> = {
    'q.squander': `${formatNumber(target)}G`,
    'q.sleeping': `${formatNumber(target)}回`,
    'q.exercise': `${formatNumber(target)}分`,
    'q.embezzlement': `${formatNumber(target)}G`,
    'q.donation': `${formatNumber(target)}G`,
    'q.healing': `${formatNumber(target)}分`,
    'q.AFK': `${formatNumber(target)}分`,
    'q.treasure-super-rare': '',
    'q.treasure-boss-rare': `${formatNumber(target)}個`,
    'q.poor-kid': `${formatNumber(target)}回`,
    'q.consecutive-wins': `${formatNumber(target)}連`,
    'q.losers': '',
    'q.savings': `${formatNumber(target)}G`,
  };
  const suffix = valueByType[type];
  if (suffix === '') return shortText;
  return `${shortText}(${suffix ?? formatNumber(target)})`;
}

const DEFAULT_DIARY_SETTINGS: DiarySettings = {
  superRareThreshold: 'all',
  bossThreshold: 'all',
  mythicThreshold: 'all',
  rareThreshold: 5,
  notifyDefeat: true,
};

const MELEE_CATEGORIES = new Set<Item['category']>(['sword', 'katana', 'gauntlet']);
const RANGED_CATEGORIES = new Set<Item['category']>(['arrow', 'bolt', 'archery']);
const MAGIC_CATEGORIES = new Set<Item['category']>(['wand', 'grimoire', 'catalyst']);


function isGodsBattleAvailable(party: Party, dungeonId: number): boolean {
  // SpecRef: 5.1.3.1 | "Loot-Gate" progression system | Gods battle gate
  return getLootCollectionCount(party, dungeonId, 'bossRare') >= getGodsBattleRequired()
    && hasDefeatedDungeonBoss(party, dungeonId);
}

function normalizePartyCondition(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 0;
  // SpecRef: 7.1.2 | AUTO progress logic | condition
  return Math.max(-400, Math.min(400, Math.floor(raw)));
}

type PartyConditionState =
  | 'condition.terrible'
  | 'condition.poor'
  | 'condition.low'
  | 'condition.cautious'
  | 'condition.normal'
  | 'condition.steady'
  | 'condition.good'
  | 'condition.great'
  | 'condition.excellent';

type ConditionOutcomeKey = 'Clear' | 'Turned_Back' | 'Draw_Retreat' | 'Wounded_Retreat' | 'Defeat';

const CONDITION_ADJUSTMENTS: Record<PartyConditionState, Record<ConditionOutcomeKey, number>> = {
  'condition.terrible': { Clear: 8, Turned_Back: 4, Draw_Retreat: 0, Wounded_Retreat: -2, Defeat: -6 },
  'condition.poor': { Clear: 7, Turned_Back: 4, Draw_Retreat: -1, Wounded_Retreat: -4, Defeat: -17 },
  'condition.low': { Clear: 6, Turned_Back: 3, Draw_Retreat: -2, Wounded_Retreat: -6, Defeat: -28 },
  'condition.cautious': { Clear: 5, Turned_Back: 3, Draw_Retreat: -3, Wounded_Retreat: -8, Defeat: -39 },
  'condition.normal': { Clear: 4, Turned_Back: 2, Draw_Retreat: -4, Wounded_Retreat: -10, Defeat: -50 },
  'condition.steady': { Clear: 3, Turned_Back: 1, Draw_Retreat: -5, Wounded_Retreat: -12, Defeat: -58 },
  'condition.good': { Clear: 2, Turned_Back: 1, Draw_Retreat: -6, Wounded_Retreat: -14, Defeat: -64 },
  'condition.great': { Clear: 1, Turned_Back: 0, Draw_Retreat: -7, Wounded_Retreat: -16, Defeat: -68 },
  'condition.excellent': { Clear: 1, Turned_Back: 0, Draw_Retreat: -8, Wounded_Retreat: -18, Defeat: -70 },
};

// SpecRef: 7.1.2 | AUTO progress logic | condition state classification
function getConditionState(condition: number): PartyConditionState {
  if (condition <= -350) return 'condition.terrible';
  if (condition <= -250) return 'condition.poor';
  if (condition <= -150) return 'condition.low';
  if (condition <= -50) return 'condition.cautious';
  if (condition <= 50) return 'condition.normal';
  if (condition <= 150) return 'condition.steady';
  if (condition <= 250) return 'condition.good';
  if (condition <= 350) return 'condition.great';
  return 'condition.excellent';
}

function getConditionOutcomeKey(finalOutcome: ExpeditionLog['finalOutcome'], endedWithDrawRetreat: boolean): ConditionOutcomeKey {
  if (finalOutcome === 'Clear') return 'Clear';
  if (finalOutcome === 'Escape') return 'Turned_Back';
  if (finalOutcome === 'Retreat') return endedWithDrawRetreat ? 'Draw_Retreat' : 'Wounded_Retreat';
  return 'Defeat';
}

// SpecRef: 7.1.2 | AUTO progress logic | condition
function getOutcomeConditionAdjustment(
  conditionBeforeOutcome: number,
  finalOutcome: ExpeditionLog['finalOutcome'],
  endedWithDrawRetreat: boolean,
): number {
  const conditionState = getConditionState(conditionBeforeOutcome);
  const outcomeKey = getConditionOutcomeKey(finalOutcome, endedWithDrawRetreat);
  return CONDITION_ADJUSTMENTS[conditionState][outcomeKey];
}

function isGodsBattleExpedition(log: ExpeditionLog | null): boolean {
  if (!log) return false;
  return log.entries.some((entry) => entry.enemyName.includes('(神魔戦)'));
}


function applyShopIntimacyDecay(global: GameState['global'], now: Date): GameState['global'] {
  const elapsedRefreshes = countElapsedShopRefreshes(global.shopIntimacyLastDecayAt, now);
  if (elapsedRefreshes <= 0) {
    return global;
  }

  const decayedIntimacy = Math.max(0, Math.floor(global.shopIntimacy * (0.9 ** elapsedRefreshes)));
  return {
    ...global,
    shopIntimacy: decayedIntimacy,
    shopRefreshCounts: {},
    shopIntimacyLastDecayAt: getCurrentShopRefreshDate(now).getTime(),
  };
}

function getCharacterCombatBonusLevels(character: Character): { melee: boolean; ranged: boolean; magic: boolean } {
  const race = RACES.find(r => r.id === character.raceId);
  const mainClass = CLASSES.find(c => c.id === character.mainClassId);
  const subClass = CLASSES.find(c => c.id === character.subClassId);
  const predisposition = PREDISPOSITIONS.find(p => p.id === character.predispositionId);
  const lineage = LINEAGES.find(l => l.id === character.lineageId);

  if (!race || !mainClass || !subClass || !predisposition || !lineage) {
    return { melee: false, ranged: false, magic: false };
  }

  const isMasterClass = character.mainClassId === character.subClassId;
  const bonusSources = [
    race.bonuses,
    mainClass.mainSubBonuses,
    isMasterClass ? mainClass.masterBonuses : mainClass.mainBonuses,
    ...(isMasterClass ? [] : [subClass.mainSubBonuses]),
    predisposition.bonuses,
    lineage.bonuses,
  ];

  let melee = false;
  let ranged = false;
  let magic = false;
  for (const bonuses of bonusSources) {
    for (const bonus of bonuses) {
      if (bonus.type === 'grit' || bonus.type === 'equip_melee') {
        melee = true;
      } else if (bonus.type === 'caster' || bonus.type === 'equip_magic') {
        magic = true;
      } else if (bonus.type === 'pursuit' || bonus.type === 'equip_ranged') {
        ranged = true;
      }
    }
  }

  return { melee, ranged, magic };
}

// SpecRef: 8.5 | UI_DIARY | Setting.
function getDiarySettingsWithDefaults(value: Partial<DiarySettings> | undefined): DiarySettings {
  return {
    ...DEFAULT_DIARY_SETTINGS,
    ...(value ?? {}),
  };
}

function getDeityDonationsWithDefaults(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object') return {};
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, number>>((totals, [name, donation]) => {
    totals[normalizeDeityName(name)] = typeof donation === 'number' ? donation : 0;
    return totals;
  }, {});
}

function getExpeditionStatsWithDefaults(value: unknown) {
  if (!value || typeof value !== 'object') {
    return { Clear: 0, Turned_Back: 0, Draw_Retreat: 0, Wounded_Retreat: 0, Defeat: 0, donatedGold: 0, savedGold: 0 };
  }
  const raw = value as Record<string, unknown>;
  return {
    Clear: typeof raw.Clear === 'number' ? raw.Clear : (typeof raw.victories === 'number' ? raw.victories : 0),
    Turned_Back: typeof raw.Turned_Back === 'number' ? raw.Turned_Back : (typeof raw.returns === 'number' ? raw.returns : 0),
    Draw_Retreat: typeof raw.Draw_Retreat === 'number' ? raw.Draw_Retreat : (typeof raw.draws === 'number' ? raw.draws : 0),
    Wounded_Retreat: typeof raw.Wounded_Retreat === 'number' ? raw.Wounded_Retreat : (typeof raw.retreats === 'number' ? raw.retreats : 0),
    Defeat: typeof raw.Defeat === 'number' ? raw.Defeat : (typeof raw.defeats === 'number' ? raw.defeats : 0),
    donatedGold: typeof raw.donatedGold === 'number' ? raw.donatedGold : 0,
    savedGold: typeof raw.savedGold === 'number' ? raw.savedGold : 0,
  };
}

function getExpeditionDepthLimitWithDefault(value: unknown): ExpeditionDepthLimit {
  const validDepthLimits: ExpeditionDepthLimit[] = ['1f-3', '1f-4', '2f-3', '2f-4', '3f-3', '3f-4', '4f-3', '4f-4', '5f-3', '5f-4', 'beforeBoss', 'all'];
  return validDepthLimits.includes(value as ExpeditionDepthLimit) ? (value as ExpeditionDepthLimit) : 'all';
}

function normalizeExpeditionDifficultyOffset(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(30, Math.floor(value)));
}

function matchesDiaryThreshold(item: Item, threshold: DiarySettings['superRareThreshold']): boolean {
  if (threshold === 'none') return false;
  if (threshold === 'all') return true;
  return item.enhancement >= threshold;
}

function getItemRarityCode(item: Item): 'common' | 'uncommon' | 'eliteRare' | 'bossRare' | 'mythicRare' {
  const rarityCode = item.id % 1000;
  if (rarityCode >= 500) return 'mythicRare';
  if (rarityCode >= 400) return 'bossRare';
  if (rarityCode >= 300) return 'eliteRare';
  if (rarityCode >= 200) return 'uncommon';
  return 'common';
}

// Helper to calculate sell price for an item
function calculateSellPrice(item: Item, autoSellMultiplier: number = 1): number {
  return calculateItemSellPrice(item, autoSellMultiplier);
}

// Helper to add item to inventory (handles stacking and auto-sell)
function addItemToInventory(
  inventory: InventoryRecord,
  item: Item,
  currentGold: number,
  autoSellMultiplier: number = 1
): { inventory: InventoryRecord; gold: number; wasAutoSold: boolean; autoSellProfit: number } {
  const key = getVariantKey(item);
  const existing = inventory[key];

  // If this variant is marked as sold, auto-sell it
  if (existing?.status === 'sold') {
    const sellPrice = calculateSellPrice(item, autoSellMultiplier);
    return {
      inventory,
      gold: currentGold + sellPrice,
      wasAutoSold: true,
      autoSellProfit: sellPrice,
    };
  }

  // Stack overflow handling: treat excess copies as auto-sell items.
  if (existing?.status === 'owned' && existing.count >= ITEM_MAX_STACK) {
    const sellPrice = calculateSellPrice(item, autoSellMultiplier);
    return {
      inventory,
      gold: currentGold + sellPrice,
      wasAutoSold: true,
      autoSellProfit: sellPrice,
    };
  }

  // Otherwise add to inventory
  const newInventory = { ...inventory };
  if (existing) {
    newInventory[key] = {
      ...existing,
      count: existing.count + 1,
      status: 'owned',
      isNew: existing.isNew ?? false,
    };
  } else {
    newInventory[key] = {
      item: { ...item, isNew: undefined },
      count: 1,
      status: 'owned',
      isNew: true,
    };
  }

  return { inventory: newInventory, gold: currentGold, wasAutoSold: false, autoSellProfit: 0 };
}

// Helper to remove one item from inventory
function removeItemFromInventory(inventory: InventoryRecord, key: string): InventoryRecord {
  const existing = inventory[key];
  if (!existing || existing.count <= 0) return inventory;

  const newInventory = { ...inventory };
  if (existing.count === 1) {
    // Last item - mark as notown instead of deleting
    newInventory[key] = { ...existing, count: 0, status: 'notown' };
  } else {
    newInventory[key] = { ...existing, count: existing.count - 1 };
  }
  return newInventory;
}

// Helper to convert old inventory format to new format
function migrateOldInventory(oldInventory: Item[] | InventoryRecord): InventoryRecord {
  // Check if already in new format
  if (!Array.isArray(oldInventory)) {
    return oldInventory;
  }

  // Convert array to record
  const newInventory: InventoryRecord = {};
  for (const item of oldInventory) {
    const key = getVariantKey(item);
    if (newInventory[key]) {
      newInventory[key].count++;
    } else {
      newInventory[key] = {
        item: { ...item, isNew: undefined },
        count: 1,
        status: 'owned',
        isNew: item.isNew,
      };
    }
  }
  return newInventory;
}


function migrateLegacyBag(
  rawBag: unknown,
  fallbackFactory: () => ReturnType<typeof createCommonRewardBag>,
  bagType: BagType
) {
  if (!rawBag || typeof rawBag !== 'object') {
    return normalizeBagForType(fallbackFactory(), bagType);
  }

  const bag = rawBag as { entries?: unknown; tickets?: unknown };
  if (Array.isArray(bag.entries)) {
    return normalizeBagForType({
      entries: bag.entries
        .filter((entry): entry is { id: unknown; tickets: unknown } => Boolean(entry) && typeof entry === 'object' && 'id' in entry && 'tickets' in entry)
        .map((entry) => ({
          id: typeof entry.id === 'number' ? entry.id : 0,
          tickets: Math.max(0, Math.floor(typeof entry.tickets === 'number' ? entry.tickets : 0)),
        })),
    }, bagType);
  }

  if (Array.isArray(bag.tickets)) {
    const counter = new Map<number, number>();
    for (const ticket of bag.tickets) {
      if (typeof ticket !== 'number') continue;
      counter.set(ticket, (counter.get(ticket) ?? 0) + 1);
    }
    return normalizeBagForType({
      entries: Array.from(counter.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([id, tickets]) => ({ id, tickets })),
    }, bagType);
  }

  return normalizeBagForType(fallbackFactory(), bagType);
}

function normalizeImportedBags(rawBags: unknown): GameState['bags'] {
  const bags = (rawBags && typeof rawBags === 'object') ? (rawBags as Record<string, unknown>) : {};
  return normalizeGameBags({
    commonRewardBag: migrateLegacyBag(bags.commonRewardBag, createCommonRewardBag, 'commonRewardBag'),
    commonEnhancementBag: migrateLegacyBag(bags.commonEnhancementBag, createCommonEnhancementBag, 'commonEnhancementBag'),
    uncommonRewardBag: migrateLegacyBag(bags.uncommonRewardBag, createUncommonRewardBag, 'uncommonRewardBag'),
    eliteRareRewardBag: migrateLegacyBag(bags.eliteRareRewardBag, createEliteRareRewardBag, 'eliteRareRewardBag'),
    bossRareRewardBag: migrateLegacyBag(bags.bossRareRewardBag, createBossRareRewardBag, 'bossRareRewardBag'),
    mythicRareRewardBag: migrateLegacyBag(bags.mythicRareRewardBag, createMythicRareRewardBag, 'mythicRareRewardBag'),
    enhancementBag: migrateLegacyBag(bags.enhancementBag, createEnhancementBag, 'enhancementBag'),
    superRareBag: migrateLegacyBag(bags.superRareBag, createSuperRareBag, 'superRareBag'),
    physicalThreatBag: migrateLegacyBag(bags.physicalThreatBag, createPhysicalThreatBag, 'physicalThreatBag'),
    magicalThreatBag: migrateLegacyBag(bags.magicalThreatBag, createMagicalThreatBag, 'magicalThreatBag'),
    sideQuestBag: migrateLegacyBag(bags.sideQuestBag, createSideQuestBag, 'sideQuestBag'),
  });
}

function normalizeExpeditionFinalOutcome(rawOutcome: unknown): 'Clear' | 'Escape' | 'Retreat' | 'Defeat' {
  if (rawOutcome === 'Clear' || rawOutcome === 'Escape' || rawOutcome === 'Retreat' || rawOutcome === 'Defeat') {
    return rawOutcome;
  }
  if (rawOutcome === 'victory') return 'Clear';
  if (rawOutcome === 'defeat') return 'Defeat';
  if (rawOutcome === 'escape' || rawOutcome === 'return') return 'Escape';
  if (rawOutcome === 'retreat') return 'Retreat';
  return 'Retreat';
}

function normalizeExpeditionLog(log: ExpeditionLog | null | undefined): ExpeditionLog | null {
  if (!log) return null;
  return {
    ...log,
    difficultyOffset: normalizeExpeditionDifficultyOffset(log.difficultyOffset),
    finalOutcome: normalizeExpeditionFinalOutcome(log.finalOutcome),
  };
}

function loadSavedState(): GameState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(decodePersistedState(saved));
      // Validate it has required properties and migrate legacy saves.
      const hasParties = Array.isArray(parsed?.parties);
      const hasBags = parsed?.bags && typeof parsed.bags === 'object';
      if (hasParties && hasBags) {

        parsed.bags = normalizeGameBags({
          commonRewardBag: migrateLegacyBag(parsed.bags.commonRewardBag, createCommonRewardBag, 'commonRewardBag'),
          commonEnhancementBag: migrateLegacyBag(parsed.bags.commonEnhancementBag, createCommonEnhancementBag, 'commonEnhancementBag'),
          uncommonRewardBag: migrateLegacyBag(parsed.bags.uncommonRewardBag, createUncommonRewardBag, 'uncommonRewardBag'),
          eliteRareRewardBag: migrateLegacyBag(parsed.bags.eliteRareRewardBag, createEliteRareRewardBag, 'eliteRareRewardBag'),
          bossRareRewardBag: migrateLegacyBag(parsed.bags.bossRareRewardBag, createBossRareRewardBag, 'bossRareRewardBag'),
          mythicRareRewardBag: migrateLegacyBag(parsed.bags.mythicRareRewardBag, createMythicRareRewardBag, 'mythicRareRewardBag'),
          enhancementBag: migrateLegacyBag(parsed.bags.enhancementBag, createEnhancementBag, 'enhancementBag'),
          superRareBag: migrateLegacyBag(parsed.bags.superRareBag, createSuperRareBag, 'superRareBag'),
          physicalThreatBag: migrateLegacyBag(parsed.bags.physicalThreatBag, createPhysicalThreatBag, 'physicalThreatBag'),
          magicalThreatBag: migrateLegacyBag(parsed.bags.magicalThreatBag, createMagicalThreatBag, 'magicalThreatBag'),
          sideQuestBag: migrateLegacyBag(parsed.bags.sideQuestBag, createSideQuestBag, 'sideQuestBag'),
        });

        if (!parsed.global) {
          const firstParty = parsed.parties?.[0];
          parsed.global = {
            gold: firstParty?.gold ?? 200,
            inventory: migrateOldInventory(firstParty?.inventory ?? []),
            deityDonations: {},
            unlockedDeities: [...DEFAULT_UNLOCKED_DEITIES],
            shopPurchases: {},
            jewelShopPurchases: {},
            shopRefreshCounts: {},
            shopIntimacy: 0,
            shopIntimacyLastDecayAt: Date.now(),
            jewels: createStarterJewelInventory(),
          };
        }
        if (Array.isArray(parsed.global.inventory)) {
          parsed.global.inventory = migrateOldInventory(parsed.global.inventory);
        }
        parsed.global.deityDonations = getDeityDonationsWithDefaults(parsed.global.deityDonations);
        parsed.global.unlockedDeities = normalizeUnlockedDeities(parsed.global.unlockedDeities);
        parsed.global.shopPurchases = (parsed.global.shopPurchases && typeof parsed.global.shopPurchases === 'object')
          ? Object.entries(parsed.global.shopPurchases as Record<string, unknown>).reduce<Record<string, number[]>>((acc, [hourKey, itemIds]) => {
              if (!Array.isArray(itemIds)) return acc;
              const normalized = itemIds.filter((itemId): itemId is number => typeof itemId === 'number');
              if (normalized.length > 0) {
                acc[hourKey] = normalized;
              }
              return acc;
            }, {})
          : {};

        parsed.global.jewelShopPurchases = (parsed.global.jewelShopPurchases && typeof parsed.global.jewelShopPurchases === 'object')
          ? Object.entries(parsed.global.jewelShopPurchases as Record<string, unknown>).reduce<Record<string, number>>((acc, [jewelStockKey, purchaseCount]) => {
              if (typeof purchaseCount !== 'number' || purchaseCount <= 0) return acc;
              acc[jewelStockKey] = Math.floor(purchaseCount);
              return acc;
            }, {})
          : {};

        parsed.global.shopRefreshCounts = (parsed.global.shopRefreshCounts && typeof parsed.global.shopRefreshCounts === 'object')
          ? Object.entries(parsed.global.shopRefreshCounts as Record<string, unknown>).reduce<Record<string, number>>((acc, [hourKey, refreshCount]) => {
              if (typeof refreshCount !== 'number' || refreshCount < 0) return acc;
              acc[hourKey] = Math.floor(refreshCount);
              return acc;
            }, {})
          : {};

        parsed.global.shopIntimacy = Math.max(0, Math.min(99, Math.floor(typeof parsed.global.shopIntimacy === 'number' ? parsed.global.shopIntimacy : 0)));
        parsed.global.shopIntimacyLastDecayAt = typeof parsed.global.shopIntimacyLastDecayAt === 'number'
          ? parsed.global.shopIntimacyLastDecayAt
          : Date.now();

        parsed.global.jewels = (parsed.global.jewels && typeof parsed.global.jewels === 'object')
          ? Object.entries(parsed.global.jewels as Record<string, unknown>).reduce<Record<string, number>>((acc, [key, count]) => {
              if (typeof count !== 'number' || count <= 0) return acc;
              acc[key] = Math.floor(count);
              return acc;
            }, {})
          : createStarterJewelInventory();

        const defaultParties = createDefaultParties();
        if (!Array.isArray(parsed.parties)) {
          parsed.parties = [];
        }
        parsed.parties = parsed.parties.slice(0, defaultParties.length);
        const normalizedSelectedPartyIndex = typeof parsed.selectedPartyIndex === 'number'
          ? Math.max(0, Math.min(Math.floor(parsed.selectedPartyIndex), Math.max(0, parsed.parties.length - 1)))
          : 0;

        const unlockedDeities = [...DEFAULT_UNLOCKED_DEITIES];
        let unlockedPartySlots = Math.max(1, Math.min(defaultParties.length, parsed.parties.length || 1));

        // Process all parties (whether single or array)
        const partiesToProcess = parsed.parties ?? [];
        for (const [index, party] of partiesToProcess.entries()) {
          if (!party.id) {
            party.id = index + 1;
          }
          if (!party.deity) {
            party.deity = createInitialDeity('Goddess of Restoration');
          }
          party.deity.name = normalizeDeityName(party.deity.name);
          if (typeof party.level !== 'number') party.level = 1;
          if (typeof party.experience !== 'number') party.experience = 0;
          if (!party.defeatedBossExpeditions) party.defeatedBossExpeditions = {};
          if (!party.lootGateStatus) party.lootGateStatus = {};
          if (!party.lootGateProgress) party.lootGateProgress = {};
          if (!Array.isArray(party.diaryLogs)) party.diaryLogs = [];
          if (typeof party.pendingDiaryLog === 'undefined') party.pendingDiaryLog = null;
          if (typeof party.hasUnreadDiary !== 'boolean') party.hasUnreadDiary = false;
          party.diaryLogs = party.diaryLogs
            .map((log: DiaryLog) => ({
              ...log,
              triggers: Array.isArray(log.triggers) ? log.triggers : [],
              isRead: typeof log.isRead === 'boolean' ? log.isRead : !party.hasUnreadDiary,
            }));
          party.hasUnreadDiary = party.diaryLogs.some((log: DiaryLog) => !log.isRead);
          party.diarySettings = getDiarySettingsWithDefaults(party.diarySettings);
          if (typeof party.currentHp !== 'number') {
            const computed = computePartyStats(party).partyStats;
            party.currentHp = computed.hp;
          }
          party.expeditionDepthLimit = getExpeditionDepthLimitWithDefault(party.expeditionDepthLimit);
          party.expeditionDifficultyOffset = normalizeExpeditionDifficultyOffset(party.expeditionDifficultyOffset);
          if (typeof party.pendingProfit !== 'number') party.pendingProfit = 0;
          if (typeof party.expeditionRewardsPending !== 'boolean') party.expeditionRewardsPending = false;
          if (!party.pendingUnlockState || typeof party.pendingUnlockState !== 'object') {
            party.pendingUnlockState = null;
          } else {
            const deityNames = Array.isArray(party.pendingUnlockState.deityNames)
              ? normalizeUnlockedDeities(party.pendingUnlockState.deityNames)
              : [];
            const partySlotCount = typeof party.pendingUnlockState.partySlotCount === 'number'
              ? Math.max(1, Math.min(defaultParties.length, Math.floor(party.pendingUnlockState.partySlotCount)))
              : 1;
            party.pendingUnlockState = { deityNames, partySlotCount };
          }
          if (typeof party.deityGold !== 'number') party.deityGold = 0;
          party.expeditionStats = getExpeditionStatsWithDefaults(party.expeditionStats);
          const legacyCondition = typeof party.condition === 'number'
            ? party.condition
            : (party as Party & { motivation?: unknown }).motivation;
          party.condition = normalizePartyCondition(legacyCondition);
          party.lastExpeditionLog = normalizeExpeditionLog(party.lastExpeditionLog);
          if (party.pendingDiaryLog?.expeditionLog) {
            party.pendingDiaryLog = {
              ...party.pendingDiaryLog,
              expeditionLog: normalizeExpeditionLog(party.pendingDiaryLog.expeditionLog),
            };
          }
          party.diaryLogs = party.diaryLogs.map((log: DiaryLog) => (
            log.expeditionLog
              ? { ...log, expeditionLog: normalizeExpeditionLog(log.expeditionLog) }
              : log
          ));
          party.sleepinessOfPartyBag = normalizeSleepinessPartyBag(party.sleepinessOfPartyBag ?? createSleepinessPartyBag());
          party.currentSleepiness = normalizeSleepinessState(party.currentSleepiness);
          if (typeof party.sideQuest === 'undefined') party.sideQuest = null;
          if (party.sideQuest) {
            party.sideQuest.type = normalizeSideQuestType(party.sideQuest.type);
          }
          if (party.sideQuest?.type === 'q.sleeping' && party.sideQuest.target > 4) {
            party.sideQuest = {
              ...party.sideQuest,
              target: Math.max(1, Math.min(4, Math.floor(party.sideQuest.target / 10))),
              progress: Math.max(0, Math.min(4, Math.floor(party.sideQuest.progress / 10))),
            };
          }
          if (party.sideQuest && TIME_BASED_SIDE_QUEST_TYPES.has(party.sideQuest.type) && party.sideQuest.target < 1000) {
            party.sideQuest = {
              ...party.sideQuest,
              target: Math.max(1, Math.floor(party.sideQuest.target * 60)),
              progress: Math.max(0, Math.floor(party.sideQuest.progress * 60)),
            };
          }
          if (Array.isArray(party.characters)) {
            party.characters = party.characters.map((character: Character) => ({
              ...character,
              autoEquipmentMode: normalizeCharacterAutoEquipmentMode(character.autoEquipmentMode),
            }));
          }

          const allExpeditionLogs: ExpeditionLog[] = [
            ...(party.lastExpeditionLog ? [party.lastExpeditionLog] : []),
            ...party.diaryLogs.flatMap((log: DiaryLog) => (log.expeditionLog ? [log.expeditionLog] : [])),
            ...(party.pendingDiaryLog?.expeditionLog ? [party.pendingDiaryLog.expeditionLog] : []),
          ];
          const unlockedState = getUnlockedStateFromEntries(allExpeditionLogs, unlockedPartySlots);
          unlockedPartySlots = Math.max(unlockedPartySlots, unlockedState.unlockedPartySlots);

          const normalizedDeityName = normalizeDeityName(party.deity.name);
          if (typeof parsed.global.deityDonations[normalizedDeityName] !== 'number') {
            parsed.global.deityDonations[normalizedDeityName] = party.deityGold;
          }
          party.deityGold = parsed.global.deityDonations[normalizedDeityName] ?? 0;

        }

        parsed.global.unlockedDeities = unlockedDeities;
        while (parsed.parties.length < unlockedPartySlots) {
          const nextDefaultParty = createUnlockedPartyWithAvailableDeity(defaultParties[parsed.parties.length], parsed.parties);
          parsed.parties.push(nextDefaultParty);
        }
        parsed.parties = parsed.parties.slice(0, unlockedPartySlots);
        parsed.parties = enforceGlobalDiaryLogRetention(parsed.parties);
        parsed.selectedPartyIndex = Math.max(0, Math.min(normalizedSelectedPartyIndex, Math.max(0, parsed.parties.length - 1)));
        parsed.buildNumber = typeof parsed.buildNumber === 'number' ? parsed.buildNumber : 0;

        return hydrateGameState(parsed as GameState);
      }
    }
  } catch (e) {
    console.error('Failed to load saved state:', e);
  }
  return null;
}

function saveState(state: GameState): void {
  try {
    const payload = JSON.stringify(serializeGameState(state));
    localStorage.setItem(STORAGE_KEY, encodePersistedState(payload));

  } catch (e) {
    console.error('Failed to save state:', e);
  }
}

function createInitialDeity(name: string) {
  return {
    name: normalizeDeityName(name),
    uniqueAbilities: [],
  };
}

function createStarterInventory(): InventoryRecord {
  const starterItemIds = [
    1101, 1102, 1103, 1104, 1105, 1106,
    1107, 1108, 1109, 1110, 1111, 1112,
  ];
  const starterItems: Item[] = starterItemIds.map((id) => ({ ...getItemById(id)!, enhancement: 0, superRare: 0 }));

  const inventory: InventoryRecord = {};
  for (const item of starterItems) {
    const key = getVariantKey(item);
    if (inventory[key]) {
      inventory[key].count++;
    } else {
      inventory[key] = {
        item,
        count: 1,
        status: 'owned',
      };
    }
  }
  return inventory;
}


function initializePartyRuntimeState<T extends Party>(party: T): T {
  const { partyStats } = computePartyStats(party);
  const now = Date.now();
  const normalizedSideQuest = party.sideQuest
    ? {
        ...party.sideQuest,
        assignedAt: Number.isFinite(party.sideQuest.assignedAt) ? party.sideQuest.assignedAt : now,
        expiresAt: Number.isFinite(party.sideQuest.expiresAt) ? party.sideQuest.expiresAt : now + (16 * 60 * 60 * 1000),
      }
    : null;
  return {
    ...party,
    characters: party.characters.map((character) => ({
      ...character,
      autoEquipmentMode: normalizeCharacterAutoEquipmentMode(character.autoEquipmentMode),
    })),
    currentHp: partyStats.hp,
    pendingProfit: 0,
    expeditionRewardsPending: false,
    pendingUnlockState: null,
    deityGold: 0,
    expeditionDifficultyOffset: normalizeExpeditionDifficultyOffset(party.expeditionDifficultyOffset),
    expeditionStats: getExpeditionStatsWithDefaults(party.expeditionStats),
    sleepinessOfPartyBag: normalizeSleepinessPartyBag(party.sleepinessOfPartyBag ?? createSleepinessPartyBag()),
    currentSleepiness: normalizeSleepinessState(party.currentSleepiness),
    condition: normalizePartyCondition(party.condition),
    sideQuest: normalizedSideQuest,
  };
}

function normalizeSleepinessState(raw: unknown): SleepinessState {
  if (raw === 1 || raw === 2) return raw;
  return 0;
}

function normalizeCharacterAutoEquipmentMode(raw: unknown): 0 | 1 | 2 {
  if (raw === 0 || raw === 1 || raw === 2) return raw;
  return 2;
}

// SpecRef: 5.1.1 | Party State Machine | sleepiness from t.sleepiness_of_party_bag
function drawPartySleepiness(party: Party): { party: Party; sleepiness: SleepinessState } {
  const normalizedBag = normalizeSleepinessPartyBag(party.sleepinessOfPartyBag ?? createSleepinessPartyBag());
  const totalTickets = normalizedBag.entries.reduce((sum, entry) => sum + Math.max(0, entry.tickets), 0);
  const sourceBag = totalTickets > 0 ? normalizedBag : createSleepinessPartyBag();
  const { ticket, newBag } = drawFromBag(sourceBag);
  const sleepiness = normalizeSleepinessState(ticket);

  return {
    party: {
      ...party,
      sleepinessOfPartyBag: normalizeSleepinessPartyBag(newBag),
      currentSleepiness: sleepiness,
    },
    sleepiness,
  };
}

// SpecRef: 2.1.4.2 | Initial setup | PT1 Party initial condition.
function createInitialParty() {
  const defaultSetup = [
    { race: 'caninian', main: 'guardian', sub: 'alchemist', pred: 'inquisitive', lineage: 'fragment', name: 'ケモ', equipmentIds: [1101, 1110, 1111, 1112] },
    { race: 'vulpinian', main: 'duelist', sub: 'samurai', pred: 'aggressive', lineage: 'sandstorm', name: 'ゴン', equipmentIds: [1104, 1106] },
    { race: 'procyonian', main: 'ninja', sub: 'lord', pred: 'evasive', lineage: 'firmament', name: 'ソウタ', equipmentIds: [1104, 1106, 1104, 1106] },
    { race: 'leporian', main: 'ranger', sub: 'pilgrim', pred: 'nimble', lineage: 'abyssal_sea', name: 'ロップ', equipmentIds: [1107, 1108, 1109] },
    { race: 'felidian', main: 'sage', sub: 'guardian', pred: 'nimble', lineage: 'adaptation', name: 'ラス', equipmentIds: [1110, 1111, 1112] },
    // SpecRef: 2.1.4.2 | Initial setup | PT1 #6 "セルヴァ" starts with 1110 and 1112 only.
    { race: 'cervin', main: 'wizard', sub: 'wizard', pred: 'resourceful', lineage: 'utopia', name: 'セルヴァ', equipmentIds: [1110, 1112] },
  ];

  const characters: Character[] = defaultSetup.map((setup, i) => ({
    id: i + 1,
    name: setup.name,
    raceId: setup.race as RaceId,
    mainClassId: setup.main as ClassId,
    subClassId: setup.sub as ClassId,
    predispositionId: setup.pred as PredispositionId,
    lineageId: setup.lineage as LineageId,
    autoEquipmentMode: 2,
    equipment: setup.equipmentIds.map((itemId) => ({
      ...getItemById(itemId)!,
      enhancement: 0,
      superRare: 0,
    })),
  }));

  const party: Party = {
    id: 1,
    name: 'PT1',
    level: 1,
    experience: 0,
    defeatedBossExpeditions: {},
    lootGateProgress: {},
    lootGateStatus: {},
    deity: createInitialDeity('Goddess of Restoration'),
    characters,
    selectedDungeonId: 1,
    expeditionDepthLimit: 'all',
    expeditionDifficultyOffset: 0,
    currentHp: 0,
    pendingProfit: 0,
    expeditionRewardsPending: false,
    pendingUnlockState: null,
    deityGold: 0,
    lastExpeditionLog: null,
    pendingDiaryLog: null,
    diaryLogs: [],
    hasUnreadDiary: false,
    diarySettings: getDiarySettingsWithDefaults(undefined),
    expeditionStats: getExpeditionStatsWithDefaults(null),
    sleepinessOfPartyBag: createSleepinessPartyBag(),
    currentSleepiness: 0,
    condition: 0,
    sideQuest: null,
  };

  return initializePartyRuntimeState(party);
}

function createSecondParty() {
  const defaultSetup = [
    { race: 'lupinian', main: 'samurai', sub: 'samurai', pred: 'aggressive', lineage: 'ashen_capital', name: 'ルプ' },
    { race: 'lupinian', main: 'guardian', sub: 'lord', pred: 'stubborn', lineage: 'fragment', name: 'ガル' },
    { race: 'lupinian', main: 'duelist', sub: 'ranger', pred: 'precise', lineage: 'abyssal_sea', name: 'ヴォルフ' },
    { race: 'lupinian', main: 'ninja', sub: 'ninja', pred: 'introspective', lineage: 'blaze_peak', name: 'ライカ' },
    { race: 'lupinian', main: 'pilgrim', sub: 'sage', pred: 'perceptive', lineage: 'utopia', name: 'フェン' },
    { race: 'lupinian', main: 'wizard', sub: 'sage', pred: 'resourceful', lineage: 'firmament', name: 'ノア' },
  ];

  const characters: Character[] = defaultSetup.map((setup, i) => ({
    id: i + 101,
    name: setup.name,
    raceId: setup.race as RaceId,
    mainClassId: setup.main as ClassId,
    subClassId: setup.sub as ClassId,
    predispositionId: setup.pred as PredispositionId,
    lineageId: setup.lineage as LineageId,
    autoEquipmentMode: 2,
    equipment: [],
  }));

  const party: Party = {
    id: 2,
    name: 'PT2',
    level: 1,
    experience: 0,
    defeatedBossExpeditions: {},
    lootGateProgress: {},
    lootGateStatus: {},
    deity: createInitialDeity('God of Attrition'),
    characters,
    selectedDungeonId: 1,
    expeditionDepthLimit: 'all',
    expeditionDifficultyOffset: 0,
    currentHp: 0,
    pendingProfit: 0,
    expeditionRewardsPending: false,
    pendingUnlockState: null,
    deityGold: 0,
    lastExpeditionLog: null,
    pendingDiaryLog: null,
    diaryLogs: [],
    hasUnreadDiary: false,
    diarySettings: getDiarySettingsWithDefaults(undefined),
    expeditionStats: getExpeditionStatsWithDefaults(null),
    sleepinessOfPartyBag: createSleepinessPartyBag(),
    currentSleepiness: 0,
    condition: 0,
    sideQuest: null,
  };

  return initializePartyRuntimeState(party);
}

function createThirdParty() {
  const defaultSetup = [
    { race: 'vulpinian', main: 'duelist', sub: 'samurai', pred: 'aggressive', lineage: 'ashen_capital', name: 'キツネ' },
    { race: 'vulpinian', main: 'ninja', sub: 'ninja', pred: 'introspective', lineage: 'blaze_peak', name: 'ヨウ' },
    { race: 'vulpinian', main: 'ranger', sub: 'sage', pred: 'precise', lineage: 'abyssal_sea', name: 'シュン' },
    { race: 'vulpinian', main: 'lord', sub: 'guardian', pred: 'stubborn', lineage: 'fragment', name: 'コン' },
    { race: 'vulpinian', main: 'pilgrim', sub: 'sage', pred: 'perceptive', lineage: 'utopia', name: 'ミコ' },
    { race: 'vulpinian', main: 'wizard', sub: 'sage', pred: 'resourceful', lineage: 'firmament', name: 'イナ' },
  ];

  const characters: Character[] = defaultSetup.map((setup, i) => ({
    id: i + 201,
    name: setup.name,
    raceId: setup.race as RaceId,
    mainClassId: setup.main as ClassId,
    subClassId: setup.sub as ClassId,
    predispositionId: setup.pred as PredispositionId,
    lineageId: setup.lineage as LineageId,
    autoEquipmentMode: 2,
    equipment: [],
  }));

  const party: Party = {
    id: 3,
    name: 'PT3',
    level: 1,
    experience: 0,
    defeatedBossExpeditions: {},
    lootGateProgress: {},
    lootGateStatus: {},
    deity: createInitialDeity('God of Cunning'),
    characters,
    selectedDungeonId: 1,
    expeditionDepthLimit: 'all',
    expeditionDifficultyOffset: 0,
    currentHp: 0,
    pendingProfit: 0,
    expeditionRewardsPending: false,
    pendingUnlockState: null,
    deityGold: 0,
    lastExpeditionLog: null,
    pendingDiaryLog: null,
    diaryLogs: [],
    hasUnreadDiary: false,
    diarySettings: getDiarySettingsWithDefaults(undefined),
    expeditionStats: getExpeditionStatsWithDefaults(null),
    sleepinessOfPartyBag: createSleepinessPartyBag(),
    currentSleepiness: 0,
    condition: 0,
    sideQuest: null,
  };

  return initializePartyRuntimeState(party);
}

function createFourthParty() {
  const defaultSetup = [
    { race: 'ursan', main: 'guardian', sub: 'lord', pred: 'stubborn', lineage: 'fragment', name: 'グロウ' },
    { race: 'ursan', main: 'samurai', sub: 'guardian', pred: 'aggressive', lineage: 'ashen_capital', name: 'バル' },
    { race: 'ursan', main: 'duelist', sub: 'ranger', pred: 'precise', lineage: 'abyssal_sea', name: 'ロア' },
    { race: 'ursan', main: 'ninja', sub: 'ninja', pred: 'introspective', lineage: 'blaze_peak', name: 'グリズ' },
    { race: 'ursan', main: 'sage', sub: 'pilgrim', pred: 'perceptive', lineage: 'utopia', name: 'ウル' },
    { race: 'ursan', main: 'wizard', sub: 'sage', pred: 'resourceful', lineage: 'firmament', name: 'ドルト' },
  ];

  const characters: Character[] = defaultSetup.map((setup, i) => ({
    id: i + 301,
    name: setup.name,
    raceId: setup.race as RaceId,
    mainClassId: setup.main as ClassId,
    subClassId: setup.sub as ClassId,
    predispositionId: setup.pred as PredispositionId,
    lineageId: setup.lineage as LineageId,
    autoEquipmentMode: 2,
    equipment: [],
  }));

  const party: Party = {
    id: 4,
    name: 'PT4',
    level: 1,
    experience: 0,
    defeatedBossExpeditions: {},
    lootGateProgress: {},
    lootGateStatus: {},
    deity: createInitialDeity('God of Fortification'),
    characters,
    selectedDungeonId: 1,
    expeditionDepthLimit: 'all',
    expeditionDifficultyOffset: 0,
    currentHp: 0,
    pendingProfit: 0,
    expeditionRewardsPending: false,
    pendingUnlockState: null,
    deityGold: 0,
    lastExpeditionLog: null,
    pendingDiaryLog: null,
    diaryLogs: [],
    hasUnreadDiary: false,
    diarySettings: getDiarySettingsWithDefaults(undefined),
    expeditionStats: getExpeditionStatsWithDefaults(null),
    sleepinessOfPartyBag: createSleepinessPartyBag(),
    currentSleepiness: 0,
    condition: 0,
    sideQuest: null,
  };

  return initializePartyRuntimeState(party);
}

function createFifthParty() {
  const defaultSetup = [
    { race: 'felidian', main: 'sage', sub: 'pilgrim', pred: 'perceptive', lineage: 'utopia', name: 'ミャオ' },
    { race: 'felidian', main: 'ranger', sub: 'sage', pred: 'precise', lineage: 'abyssal_sea', name: 'ニル' },
    { race: 'felidian', main: 'duelist', sub: 'samurai', pred: 'aggressive', lineage: 'ashen_capital', name: 'フェル' },
    { race: 'felidian', main: 'ninja', sub: 'ninja', pred: 'introspective', lineage: 'blaze_peak', name: 'シロ' },
    { race: 'felidian', main: 'lord', sub: 'guardian', pred: 'stubborn', lineage: 'fragment', name: 'カリン' },
    { race: 'felidian', main: 'wizard', sub: 'sage', pred: 'resourceful', lineage: 'firmament', name: 'ネイ' },
  ];

  const characters: Character[] = defaultSetup.map((setup, i) => ({
    id: i + 401,
    name: setup.name,
    raceId: setup.race as RaceId,
    mainClassId: setup.main as ClassId,
    subClassId: setup.sub as ClassId,
    predispositionId: setup.pred as PredispositionId,
    lineageId: setup.lineage as LineageId,
    autoEquipmentMode: 2,
    equipment: [],
  }));

  const party: Party = {
    id: 5,
    name: 'PT5',
    level: 1,
    experience: 0,
    defeatedBossExpeditions: {},
    lootGateProgress: {},
    lootGateStatus: {},
    deity: createInitialDeity('Goddess of Fertility'),
    characters,
    selectedDungeonId: 1,
    expeditionDepthLimit: 'all',
    expeditionDifficultyOffset: 0,
    currentHp: 0,
    pendingProfit: 0,
    expeditionRewardsPending: false,
    pendingUnlockState: null,
    deityGold: 0,
    lastExpeditionLog: null,
    pendingDiaryLog: null,
    diaryLogs: [],
    hasUnreadDiary: false,
    diarySettings: getDiarySettingsWithDefaults(undefined),
    expeditionStats: getExpeditionStatsWithDefaults(null),
    sleepinessOfPartyBag: createSleepinessPartyBag(),
    currentSleepiness: 0,
    condition: 0,
    sideQuest: null,
  };

  return initializePartyRuntimeState(party);
}

function createSixthParty() {
  const defaultSetup = [
    { race: 'mustelid', main: 'wizard', sub: 'sage', pred: 'resourceful', lineage: 'firmament', name: 'ミン' },
    { race: 'mustelid', main: 'ninja', sub: 'ninja', pred: 'introspective', lineage: 'blaze_peak', name: 'トロ' },
    { race: 'mustelid', main: 'duelist', sub: 'samurai', pred: 'aggressive', lineage: 'ashen_capital', name: 'ネル' },
    { race: 'mustelid', main: 'ranger', sub: 'sage', pred: 'precise', lineage: 'abyssal_sea', name: 'マル' },
    { race: 'mustelid', main: 'guardian', sub: 'lord', pred: 'stubborn', lineage: 'fragment', name: 'タル' },
    { race: 'mustelid', main: 'pilgrim', sub: 'sage', pred: 'perceptive', lineage: 'utopia', name: 'リン' },
  ];

  const characters: Character[] = defaultSetup.map((setup, i) => ({
    id: i + 501,
    name: setup.name,
    raceId: setup.race as RaceId,
    mainClassId: setup.main as ClassId,
    subClassId: setup.sub as ClassId,
    predispositionId: setup.pred as PredispositionId,
    lineageId: setup.lineage as LineageId,
    autoEquipmentMode: 2,
    equipment: [],
  }));

  const party: Party = {
    id: 6,
    name: 'PT6',
    level: 1,
    experience: 0,
    defeatedBossExpeditions: {},
    lootGateProgress: {},
    lootGateStatus: {},
    deity: createInitialDeity('God of Resonance'),
    characters,
    selectedDungeonId: 1,
    expeditionDepthLimit: 'all',
    expeditionDifficultyOffset: 0,
    currentHp: 0,
    pendingProfit: 0,
    expeditionRewardsPending: false,
    pendingUnlockState: null,
    deityGold: 0,
    lastExpeditionLog: null,
    pendingDiaryLog: null,
    diaryLogs: [],
    hasUnreadDiary: false,
    diarySettings: getDiarySettingsWithDefaults(undefined),
    expeditionStats: getExpeditionStatsWithDefaults(null),
    sleepinessOfPartyBag: createSleepinessPartyBag(),
    currentSleepiness: 0,
    condition: 0,
    sideQuest: null,
  };

  return initializePartyRuntimeState(party);
}

function createDefaultParties(): Party[] {
  return [createInitialParty(), createSecondParty(), createThirdParty(), createFourthParty(), createFifthParty(), createSixthParty()];
}

function createInitialState(): GameState {
  // Try to load saved state first
  const savedState = loadSavedState();
  if (savedState) {
    // Update build number in case it changed
    return { ...savedState, buildNumber: BUILD_NUMBER };
  }

  return {
    scene: 'home',
    global: {
      gold: 200,
      inventory: createStarterInventory(),
      jewels: createStarterJewelInventory(),
      deityDonations: {},
      unlockedDeities: [...DEFAULT_UNLOCKED_DEITIES],
      shopPurchases: {},
      jewelShopPurchases: {},
      shopRefreshCounts: {},
      shopIntimacy: 0,
      shopIntimacyLastDecayAt: Date.now(),
    },
    parties: [createInitialParty()],
    selectedPartyIndex: 0,
    bags: {
      commonRewardBag: createCommonRewardBag(),
      commonEnhancementBag: createCommonEnhancementBag(),
      uncommonRewardBag: createUncommonRewardBag(),
      eliteRareRewardBag: createEliteRareRewardBag(),
      bossRareRewardBag: createBossRareRewardBag(),
          mythicRareRewardBag: createMythicRareRewardBag(),
      enhancementBag: createEnhancementBag(),
      superRareBag: createSuperRareBag(),
      physicalThreatBag: createPhysicalThreatBag(),
      magicalThreatBag: createMagicalThreatBag(),
      sideQuestBag: createSideQuestBag(),
    },
    buildNumber: BUILD_NUMBER,
  };
}

type GameMode = 'm.kemo' | 'm.luna' | 'm.laika';

type GameAction =
  | { type: 'SELECT_PARTY'; partyIndex: number }
  | { type: 'SELECT_DUNGEON'; partyIndex: number; dungeonId: number }
  | { type: 'SET_EXPEDITION_DEPTH_LIMIT'; partyIndex: number; depthLimit: ExpeditionDepthLimit }
  | { type: 'SET_EXPEDITION_DIFFICULTY_OFFSET'; partyIndex: number; difficultyOffset: number }
  | { type: 'RESET_EXPEDITION_STATS'; partyIndex: number }
  | { type: 'UPDATE_PARTY_DEITY'; partyIndex: number; deityName: string }
  | { type: 'RUN_EXPEDITION'; partyIndex: number; simulatedAt?: number; gameMode?: GameMode; triggerGodsBattle?: boolean; isAfkSimulation?: boolean }
  | { type: 'FINALIZE_DIARY_LOG'; partyIndex: number; isAfkSimulation?: boolean }
  | { type: 'HEAL_PARTY_HP'; partyIndex: number; amount: number }
  | { type: 'CLEAR_PENDING_PROFIT'; partyIndex: number }
  | { type: 'PROCESS_PENDING_PROFIT'; partyIndex: number; donation: number; deposit: number }
  | { type: 'SPEND_PENDING_PROFIT'; partyIndex: number; amount: number }
  | { type: 'ROLL_PARTY_SLEEPINESS'; partyIndex: number }
  | { type: 'ROLL_SIDE_QUEST'; partyIndex: number; rolledTier: number; simulatedAt?: number }
  | { type: 'CANCEL_SIDE_QUEST'; partyIndex: number }
  | { type: 'ADVANCE_SIDE_QUEST'; partyIndex: number; amount: number; simulatedAt?: number }
  | { type: 'SET_SIDE_QUEST_PROGRESS'; partyIndex: number; progress: number }
  | { type: 'EQUIP_ITEM'; characterId: number; slotIndex: number; itemKey: string | null; partyIndex?: number }
  | { type: 'TOGGLE_EQUIPMENT_LOCK'; characterId: number; slotIndex: number }
  | { type: 'ATTACH_JEWEL'; characterId: number; slotIndex: number; jewelKey: 'might' | 'arcana' | 'fort' | 'ward' | 'shade' | 'focus'; rank: number; partyIndex?: number }
  | { type: 'UPDATE_CHARACTER'; characterId: number; updates: Partial<Character> }
  | { type: 'REORDER_PARTY_CHARACTER'; fromIndex: number; toIndex: number }
  | { type: 'SELL_STACK'; variantKey: string }
  | { type: 'SELL_ALL_OWNED' }
  | { type: 'BUY_SHOP_ITEM'; itemId: number }
  | { type: 'BUY_JEWEL_SHOP_ITEM'; jewelKey: 'might' | 'arcana' | 'fort' | 'ward' | 'shade' | 'focus'; rank: number }
  | { type: 'REFRESH_SHOP_LINEUP' }
  | { type: 'SET_VARIANT_STATUS'; variantKey: string; status: 'notown' }
  | { type: 'MARK_ITEMS_SEEN' }
  | { type: 'MARK_DIARY_LOG_SEEN'; logId: string }
  | { type: 'MARK_ALL_DIARY_LOGS_SEEN' }
  | { type: 'UPDATE_DIARY_SETTINGS'; partyIndex: number; settings: Partial<DiarySettings> }
  | { type: 'SIMULATE_AFK'; elapsedMs: number; isAutoRepeatEnabled: boolean; gameMode?: GameMode; simulatedEndAt?: number; cycleDurationScale?: number }
  | { type: 'RESET_GAME' }
  | { type: 'IMPORT_GAME_STATE'; state: GameState }
  | { type: 'RESET_COMMON_BAGS' }
  | { type: 'RESET_UNIQUE_BAGS' }
  | { type: 'RESET_SUPER_RARE_BAG' }
  | { type: 'RESET_SIDE_QUEST_BAG' }
  | { type: 'UNLOCK_PARTY_SLOT' };

// Select enemy based on room type and pool
function selectEnemyForRoom(
  roomType: RoomType,
  poolId?: number,
  bossId?: number,
  floorNumber?: number,
  roomIndex?: number,
  roomEnemyIds: number[] = [],
  isLunaMode: boolean = false
): EnemyDef | null {
  if (poolId === 99 || bossId === 9901) {
    return buildColosseumEnemy(getColosseumEnemySettings(), isLunaMode);
  }

  if (roomType === 'battle_Boss' && bossId) {
    return getBossEnemy(bossId) ?? null;
  }

  if (roomEnemyIds.length > 0) {
    const explicitEnemies = roomEnemyIds
      .map((enemyId) => ENEMIES.find((enemy) => enemy.id === enemyId))
      .filter((enemy): enemy is EnemyDef => enemy !== undefined)
      .sort((a, b) => a.id - b.id);
    if (explicitEnemies.length > 0) {
      const randomIndex = Math.floor(Math.random() * explicitEnemies.length);
      return explicitEnemies[randomIndex] ?? explicitEnemies[0] ?? null;
    }
  }

  if (!poolId) return null;

  if (roomType === 'battle_Elite') {
    const elites = getElitesByPool(poolId).sort((a, b) => a.id - b.id);
    if (elites.length === 0) return null;
    if (floorNumber && floorNumber <= elites.length) {
      return elites[floorNumber - 1] ?? null;
    }
    const randomIndex = Math.floor(Math.random() * elites.length);
    return elites[randomIndex];
  }

  const enemies = getEnemiesByPool(poolId).sort((a, b) => a.id - b.id);
  if (enemies.length === 0) return null;

  if (floorNumber && roomIndex !== undefined) {
    // Fixed pools: each floor uses 5 unique normal enemies (pool_1 ... pool_6)
    const poolOffset = Math.max(0, Math.min(5, floorNumber - 1)) * 5;
    const floorPool = enemies.slice(poolOffset, poolOffset + 5);
    if (floorPool.length > 0) {
      // Normal rooms select randomly from the corresponding floor pool
      const randomFloorIndex = Math.floor(Math.random() * floorPool.length);
      return floorPool[randomFloorIndex] ?? floorPool[0] ?? null;
    }
  }

  const randomIndex = Math.floor(Math.random() * enemies.length);
  return enemies[randomIndex];
}

function getGodShortName(displayName: string): string {
  return displayName.split(' ')[0] ?? displayName;
}

function getGodMythicDropId(dropItemTier: number, categories: [ItemCategory, ItemCategory], seed: number): number {
  const mythicItems = getItemsByTierAndRarity(dropItemTier, 'mythicRare');
  const options = categories.flatMap((category) => mythicItems.filter((item) => item.category === category));

  if (options.length === 0) {
    return mythicItems[seed % mythicItems.length]?.id ?? 8501;
  }

  return options[seed % options.length].id;
}

function createGodEnemy(
  enemy: EnemyDef,
  dungeonId: number,
  dungeonName: string,
  isLunaMode: boolean,
  difficultyOffset: number,
): EnemyDef {
  const godProfile = getGodProfileForDungeon(dungeonId, dungeonName);
  const godName = godProfile ? getGodShortName(godProfile.displayName) : enemy.name;

  if (!godProfile) {
    return {
      ...enemy,
      name: godName,
      hp: Math.max(1, Math.floor(enemy.hp * 2.6)),
      rangedAttack: Math.max(0, Math.floor(enemy.rangedAttack * 1.7)),
      magicalAttack: Math.max(0, Math.floor(enemy.magicalAttack * 1.7)),
      meleeAttack: Math.max(0, Math.floor(enemy.meleeAttack * 1.7)),
      rangedNoA: Math.max(1, Math.ceil(enemy.rangedNoA * 1.2)),
      magicalNoA: Math.max(1, Math.ceil(enemy.magicalNoA * 1.2)),
      meleeNoA: Math.max(1, Math.ceil(enemy.meleeNoA * 1.2)),
      rangedAttackAmplifier: enemy.rangedAttackAmplifier * 1.25,
      magicalAttackAmplifier: enemy.magicalAttackAmplifier * 1.25,
      meleeAttackAmplifier: enemy.meleeAttackAmplifier * 1.25,
      physicalDefense: Math.max(0, Math.floor(enemy.physicalDefense * 1.6)),
      magicalDefense: Math.max(0, Math.floor(enemy.magicalDefense * 1.6)),
      physicalDefenseAmplifier: enemy.physicalDefenseAmplifier * 1.15,
      magicalDefenseAmplifier: enemy.magicalDefenseAmplifier * 1.15,
      experience: Math.floor(enemy.experience * 2.2),
    };
  }

  const runtimeGodEnemy = buildGodRuntimeEnemy(godProfile, isLunaMode, difficultyOffset);

  if (!runtimeGodEnemy) {
    return {
      ...enemy,
      name: godName,
      enemyClass: godProfile.enemyClass,
      abilities: godProfile.abilities,
      dropItemId: getGodMythicDropId(godProfile.dropItemTier, godProfile.dropItemCategories, enemy.id),
      isGodEnemy: true,
      godDropItemCategories: godProfile.dropItemCategories,
    };
  }

  return {
    ...enemy,
    ...runtimeGodEnemy,
    id: enemy.id,
    type: enemy.type,
    spawnTier: enemy.spawnTier,
    spawnPool: enemy.spawnPool,
    poolId: enemy.poolId,
    dropItemId: getGodMythicDropId(godProfile.dropItemTier, godProfile.dropItemCategories, enemy.id),
    isGodEnemy: true,
    godDropItemCategories: godProfile.dropItemCategories,
  };
}

function getItemRarityById(itemId: number): 'common' | 'uncommon' | 'eliteRare' | 'bossRare' | 'mythicRare' {
  const rarityCode = itemId % 1000;
  if (rarityCode >= 500) return 'mythicRare';
  if (rarityCode >= 400) return 'bossRare';
  if (rarityCode >= 300) return 'eliteRare';
  if (rarityCode >= 200) return 'uncommon';
  return 'common';
}


function advanceAfkLogSideQuestProgress(state: GameState, partyIndex: number, simulatedAt: number): GameState {
  const party = state.parties[partyIndex];
  const sideQuestType = party?.sideQuest?.type;
  const afkLog = party?.lastExpeditionLog;
  if (!sideQuestType || !afkLog) return state;

  switch (sideQuestType) {
    case 'q.treasure_super_rare':
    case 'q.treasure-super-rare': {
      const gained = afkLog.rewards.filter((item) => item.superRare > 0).length;
      return gained > 0 ? gameReducer(state, { type: 'ADVANCE_SIDE_QUEST', partyIndex, amount: gained, simulatedAt }) : state;
    }
    case 'q.treasure_boss_rare':
    case 'q.treasure-boss-rare': {
      const gained = afkLog.rewards.filter((item) => getItemRarityById(item.id) === 'bossRare').length;
      return gained > 0 ? gameReducer(state, { type: 'ADVANCE_SIDE_QUEST', partyIndex, amount: gained, simulatedAt }) : state;
    }
    case 'q.poor_kid':
    case 'q.poor-kid':
      return (afkLog.rewards.length ?? 0) === 0
        ? gameReducer(state, { type: 'ADVANCE_SIDE_QUEST', partyIndex, amount: 1, simulatedAt })
        : state;
    case 'q.consecutive_wins':
    case 'q.consecutive-wins':
      return afkLog.finalOutcome === 'Clear'
        ? gameReducer(state, { type: 'ADVANCE_SIDE_QUEST', partyIndex, amount: 1, simulatedAt })
        : gameReducer(state, { type: 'SET_SIDE_QUEST_PROGRESS', partyIndex, progress: 0 });
    case 'q.losers':
      return afkLog.finalOutcome === 'Defeat'
        ? gameReducer(state, { type: 'ADVANCE_SIDE_QUEST', partyIndex, amount: 1, simulatedAt })
        : state;
    default:
      return state;
  }
}

function getApproxAfkTimeQuestProgressPerCycle(
  party: Party,
  approxCycleDurationMs: number,
  cycleDurationScale: number,
): number {
  // SpecRef: 5.1.2 | Side Quest | AFK handling
  if (!party.sideQuest) return 0;
  if (party.sideQuest.type === 'q.sleeping') {
    return normalizeSleepinessState(party.currentSleepiness ?? 2) > 0 ? 1 : 0;
  }
  if (!TIME_BASED_SIDE_QUEST_TYPES.has(party.sideQuest.type)) return 0;

  const safeScale = Math.max(0.001, cycleDurationScale);
  const emulatedCycleSeconds = Math.max(1, Math.ceil((approxCycleDurationMs / safeScale) / 1000));
  const stepSeconds = BASE_STEP_DURATION_MS / 1000;
  const baseRestSeconds = Math.ceil(stepSeconds);
  const expeditionTier = Math.max(0, party.selectedDungeonId);
  const moveSeconds = Math.ceil((1 + expeditionTier) * stepSeconds);
  const returnSeconds = Math.ceil((5 + expeditionTier) * stepSeconds);

  switch (party.sideQuest.type) {
    case 'q.healing':
      return baseRestSeconds;
    case 'q.exercise':
      return moveSeconds + returnSeconds;
    case 'q.AFK':
      return emulatedCycleSeconds;
    default:
      return 0;
  }
}

function getScaledSideQuestExpiresAt(sideQuest: Party['sideQuest'], cycleDurationScale: number): number {
  if (!sideQuest) return 0;
  const safeScale = Math.max(0.001, cycleDurationScale);
  const deadlineWindowMs = Math.max(0, sideQuest.expiresAt - sideQuest.assignedAt);
  return sideQuest.assignedAt + Math.floor(deadlineWindowMs * safeScale);
}

function hasActiveNonGodBattleLootGateCondition(party: Party): boolean {
  // SpecRef: 5.1.2 | Side Quest | Trigger Condition
  const currentDungeon = DUNGEONS.find((dungeon) => dungeon.id === party.selectedDungeonId);
  if (!currentDungeon || !currentDungeon.floors || currentDungeon.id === 99) return false;

  const tier = currentDungeon.enemyPoolIds[0];
  for (const floor of currentDungeon.floors) {
    if (floor.floorNumber >= 6) continue;
    const required = ELITE_GATE_REQUIREMENTS[floor.floorNumber] ?? 3;
    const collected = getLootCollectionCount(party, tier, 'uncommon');
    const unlocked = isLootGateUnlocked(party, getEliteGateKey(currentDungeon.id, floor.floorNumber)) || collected >= required;
    if (!unlocked) return true;
  }

  const eliteRareCollected = getLootCollectionCount(party, tier, 'eliteRare');
  const bossUnlocked = isLootGateUnlocked(party, getBossGateKey(currentDungeon.id)) || eliteRareCollected >= BOSS_GATE_REQUIRED;
  if (!bossUnlocked) return true;

  const nextDungeon = DUNGEONS.find((dungeon) => dungeon.id === currentDungeon.id + 1);
  if (!nextDungeon) return false;

  const previousBossDefeated = party.defeatedBossExpeditions?.[currentDungeon.id] ? 1 : 0;
  const entryUnlocked = isLootGateUnlocked(party, getEntryGateKey(nextDungeon.id))
    || previousBossDefeated >= ENTRY_GATE_REQUIRED;
  return !entryUnlocked;
}



type RewardBagType = 'commonRewardBag' | 'uncommonRewardBag' | 'eliteRareRewardBag' | 'bossRareRewardBag' | 'mythicRareRewardBag';




function getRewardBagTypeForRarity(rarity: 'common' | 'uncommon' | 'eliteRare' | 'bossRare' | 'mythicRare'): RewardBagType {
  if (rarity === 'uncommon') return 'uncommonRewardBag';
  if (rarity === 'eliteRare') return 'eliteRareRewardBag';
  if (rarity === 'bossRare') return 'bossRareRewardBag';
  if (rarity === 'mythicRare') return 'mythicRareRewardBag';
  return 'commonRewardBag';
}

function getRarityRank(rarity: 'common' | 'uncommon' | 'eliteRare' | 'bossRare' | 'mythicRare'): number {
  if (rarity === 'mythicRare') return 5;
  if (rarity === 'bossRare') return 4;
  if (rarity === 'eliteRare') return 3;
  if (rarity === 'uncommon') return 2;
  return 1;
}

function resolveEnemyRewards(
  enemy: EnemyDef,
  currentBags: GameState['bags'],
  currentInventory: InventoryRecord,
  currentGold: number,
  hasUnlock: boolean,
  gameMode: GameMode,
  autoSellMultiplier: number,
  terrainEffect: TerrainEffectKey | undefined,
  hasExtraRewardRollBlessing: boolean = false,
  auriferousBonusRolls: number = 0,
): {
  bags: GameState['bags'];
  inventory: InventoryRecord;
  gold: number;
  autoSellProfit: number;
  rewards: Item[];
  recoveredItems: Item[];
  rewardNames: string[];
  rewardLogEntries: { itemName: string; autoSellProfit?: number }[];
  autoSellItemCount: number;
  highestRewardRarity?: 'common' | 'uncommon' | 'eliteRare' | 'bossRare' | 'mythicRare';
  hasSuperRareReward: boolean;
  autoSellItems: { itemName: string; autoSellProfit: number }[];
} {
  let bags = currentBags;
  let inventory = currentInventory;
  let gold = currentGold;
  let autoSellProfit = 0;
  const rewards: Item[] = [];
  const recoveredItems: Item[] = [];
  const rewardNames: string[] = [];
  const rewardLogEntries: { itemName: string; autoSellProfit?: number }[] = [];
  const autoSellItems: { itemName: string; autoSellProfit: number }[] = [];
  let autoSellItemCount = 0;
  let highestRewardRarity: 'common' | 'uncommon' | 'eliteRare' | 'bossRare' | 'mythicRare' | undefined;
  let hasSuperRareReward = false;

  const dropCandidates = getEnemyDropCandidates(enemy);
  const fallbackItem = enemy.dropItemId ? getItemById(enemy.dropItemId) : undefined;
  const baseDropItems = dropCandidates.length > 0
    ? dropCandidates
    : (fallbackItem ? [fallbackItem] : []);

  for (const baseItem of baseDropItems) {
    const baseRarity = getItemRarityById(baseItem.id);
    const rewardBagType = getRewardBagTypeForRarity(baseRarity);
    const enhancementBagType = rewardBagType === 'commonRewardBag' ? 'commonEnhancementBag' : 'enhancementBag';

    bags = refillBagIfEmpty(bags, rewardBagType);
    const { ticket: rewardTicket, newBag: newRewardBag } = drawFromBag(bags[rewardBagType]);
    bags = { ...bags, [rewardBagType]: newRewardBag };

    let gotReward = rewardTicket === 1;

    // SpecRef: 6.1.6 | REWARD | Ticket calculation
    const totalTicketCount =
      2
      + (hasUnlock ? 1 : 0)
      + (gameMode === 'm.luna' ? 1 : 0)
      + (terrainEffect !== 'terrain.gehenna' && hasExtraRewardRollBlessing ? 1 : 0)
      + auriferousBonusRolls;
    const bonusRollCount = Math.max(0, totalTicketCount - 1);
    for (let rollIndex = 0; rollIndex < bonusRollCount; rollIndex++) {
      bags = refillBagIfEmpty(bags, rewardBagType);
      const { ticket: bonusTicket, newBag } = drawFromBag(bags[rewardBagType]);
      bags = { ...bags, [rewardBagType]: newBag };
      gotReward = gotReward || bonusTicket === 1;
    }

    if (!gotReward) continue;

    bags = refillBagIfEmpty(bags, enhancementBagType);
    const { ticket: enhVal, newBag: newEnhBag } = drawFromBag(bags[enhancementBagType]);
    bags = { ...bags, [enhancementBagType]: newEnhBag };

    const normalizedEnhancement = gameMode === 'm.laika' && enhVal >= 5 ? 4 : enhVal;

    let srVal = 0;
    if (normalizedEnhancement >= 1 && gameMode !== 'm.laika') {
      bags = refillBagIfEmpty(bags, 'superRareBag');
      const { ticket: drawnSrVal, newBag: newSRBag } = drawFromBag(bags.superRareBag);
      bags = { ...bags, superRareBag: newSRBag };
      srVal = drawnSrVal;
    }

    const newItem: Item = { ...baseItem, enhancement: normalizedEnhancement, superRare: srVal };
    const itemName = getItemDisplayName(newItem);
    const result = addItemToInventory(inventory, newItem, gold, autoSellMultiplier);
    recoveredItems.push(newItem);
    inventory = result.inventory;
    gold = result.gold;
    autoSellProfit += result.autoSellProfit;

    rewardLogEntries.push({
      itemName,
      autoSellProfit: result.wasAutoSold ? result.autoSellProfit : undefined,
    });

    if (result.wasAutoSold) {
      autoSellItemCount += 1;
      autoSellItems.push({ itemName, autoSellProfit: result.autoSellProfit });
    }

    if (!result.wasAutoSold) {
      rewards.push(newItem);
      rewardNames.push(itemName);
      if (!highestRewardRarity || getRarityRank(baseRarity) > getRarityRank(highestRewardRarity)) {
        highestRewardRarity = baseRarity;
      }
      if (newItem.superRare > 0) hasSuperRareReward = true;
    }
  }

  return {
    bags,
    inventory,
    gold,
    autoSellProfit,
    rewards,
    recoveredItems,
    rewardNames,
    rewardLogEntries,
    autoSellItemCount,
    highestRewardRarity,
    hasSuperRareReward,
    autoSellItems,
  };
}

function drawGuaranteedEnhancement(
  bags: GameState['bags'],
): { enhancement: number; bags: GameState['bags'] } {
  let nextBags = bags;
  let enhancement = 0;

  do {
    nextBags = refillBagIfEmpty(nextBags, 'enhancementBag');
    const { ticket, newBag } = drawFromBag(nextBags.enhancementBag);
    nextBags = { ...nextBags, enhancementBag: newBag };
    enhancement = ticket;
  } while (enhancement < 1);

  return { enhancement, bags: nextBags };
}


function getPartyAbilityLevel(party: Party, abilityId: string): number {
  const { characterStats } = computePartyStats(party);
  return characterStats.reduce((maxLevel, stats) => {
    const abilityLevel = stats.abilities
      .filter((ability) => ability.id === abilityId)
      .reduce((abilityMaxLevel, ability) => Math.max(abilityMaxLevel, ability.level), 0);
    return Math.max(maxLevel, abilityLevel);
  }, 0);
}

function getPartyCunningMultiplier(party: Party): number {
  const cunningLevel = getPartyAbilityLevel(party, 'cunning');
  const abilityMultiplier = cunningLevel >= 2 ? 1.3 : cunningLevel >= 1 ? 1.2 : 1;

  return abilityMultiplier * getPrayerDepositMultiplier(party);
}

function getPrayerDepositMultiplier(party: Party): number {
  const deityKey = getDeityKey(party.deity.name);
  const momentumLevel = getPartyAbilityLevel(party, 'momentum');
  const embezzlementRate =
    (deityKey === 'God of Cunning' ? 0.5 : 0)
    + (momentumLevel > 0 ? 0.1 : 0);

  // Embezzlement at pray end: God of Cunning +50%, Momentum (party has at least one) +10%.
  return Math.max(0, 1 - embezzlementRate);
}

function getUnlockActorName(party: Party): string | undefined {
  const { characterStats } = computePartyStats(party);
  let bestLevel = 0;
  let unlockActorName: string | undefined;

  for (const char of party.characters) {
    const stats = characterStats.find(cs => cs.characterId === char.id);
    const unlockAbility = stats?.abilities.find(ability => ability.id === 'unlock');
    if (!unlockAbility) continue;
    if (unlockAbility.level > bestLevel) {
      bestLevel = unlockAbility.level;
      unlockActorName = char.name;
    }
  }

  return unlockActorName;
}


function applyPeriodicDeityHpEffect(
  deityName: string,
  floorNumber: number,
  roomInFloor: number,
  roomType: RoomType,
  terrainEffect: TerrainEffectKey | undefined,
  currentHp: number,
  maxHp: number
): { hp: number; healAmount?: number; attritionAmount?: number } {
  const isEliteRoom = floorNumber >= 1 && floorNumber <= 5
    && roomInFloor === 4
    && roomType === 'battle_Elite';
  if (!isEliteRoom) {
    return { hp: currentHp };
  }

  const deityKey = getDeityKey(deityName);
  if (terrainEffect === 'terrain.gehenna') {
    return { hp: currentHp };
  }
  const isHealingBlockedByTerrain = terrainEffect === 'terrain.rotwood';
  if (deityKey === 'Goddess of Restoration') {
    if (isHealingBlockedByTerrain) {
      return { hp: currentHp };
    }
    const missingHp = maxHp - currentHp;
    const healAmount = Math.floor(missingHp * 0.2);
    return {
      hp: Math.min(maxHp, currentHp + healAmount),
      healAmount: healAmount > 0 ? healAmount : undefined,
    };
  }

  if (deityKey === 'God of Attrition') {
    const hpLossPct = 0.05;
    const nextHp = Math.max(1, Math.floor(currentHp * (1 - hpLossPct)));
    const attritionAmount = Math.max(0, currentHp - nextHp);
    return {
      hp: nextHp,
      attritionAmount: attritionAmount > 0 ? attritionAmount : undefined,
    };
  }

  return { hp: currentHp };
}

function buildDeityEffectLogEntry(
  deityName: string,
  healAmount?: number,
  attritionAmount?: number
): BattleLogEntry | null {
  const deityKey = getDeityKey(deityName);
  if (deityKey === 'Goddess of Restoration' && healAmount && healAmount > 0) {
    return {
      phase: 'end',
      actor: 'effect',
      action: '再生の女神の祝福！',
      note: `(HP回復+${healAmount})`,
    };
  }

  if (deityKey === 'God of Attrition' && attritionAmount && attritionAmount > 0) {
    return {
      phase: 'end',
      actor: 'effect',
      action: '消耗の神への代償！',
      note: `(HP消耗-${attritionAmount})`,
    };
  }

  return null;
}

const TERRAIN_REJUVENATION_LOGS = [
  '{actor} は周囲の活力に満たされ、体力を回復した',
  '{actor} の傷がゆっくりと癒えていく',
  '{actor} は大地の力を受け、HPを回復した',
  '{actor} の身体に微かな活力が巡った',
  '{actor} は自然の息吹に包まれ、回復した',
  '{actor} の疲労がわずかに和らいだ',
  '{actor} の傷口が静かにふさがっていく',
  '{actor} は環境の恩恵を受け、体力を取り戻した',
  '{actor} に穏やかな再生の力が働いた',
  '{actor} の身体がじんわりと回復していく',
] as const;

const TERRAIN_ROTWOOD_LOGS = [
  '腐敗の気配が癒しを拒んだ…',
  '大地は腐り、再生の力は働かない',
  '生命の流れが淀み、回復は起こらない',
  '癒しの力は腐敗に呑まれた',
  '周囲は朽ち、再生の気配はない',
  '腐敗した空気が、回復を阻んでいる',
  '大地は死に、癒しは届かない',
  '再生の力は遮られ、何も起こらない',
  'すべてが朽ち、回復の兆しは消えた',
  '腐敗が満ち、癒しの力は失われた',
] as const;

const TERRAIN_ABUNDANT_LOGS = [
  '豊かな力が満ち、体力が満たされた',
  '大地の恵みが溢れ、体力が回復した',
  '満ち足りた気配が、体を力で満たす',
  '豊穣の力が流れ込み、体力が回復した',
  'あふれる生命力が、体を満たしていく',
  '大地の祝福が降り注ぎ、体力が回復した',
  '力が満ち、失われた分を超えて満たされる',
  '周囲に満ちる力が、体力を押し上げる',
  '濃密な生命の気配が、体を満たす',
  '豊かな流れが巡り、体力が回復した',
] as const;

const TERRAIN_DECAY_LOGS = [
  '見えぬ力が心を蝕んだ…',
  '正体不明の気配が、じわりと体力を削る',
  '理解できぬ何かが、内側から力を奪う',
  '不穏な気配が満ち、心が削られていく',
  '触れられぬ何かが、確かに力を奪った',
  '静かな異質さが、体力を侵食する',
  '名状しがたい力が、じわじわと削っていく',
  '違和感が広がり、気づかぬうちに力が失われる',
  '不可視の圧力が、心をすり減らす',
  '得体の知れぬ力が、体力を奪っていく',
] as const;

const TERRAIN_LEAKAGE_LOGS = [
  '{target} に電流が走った！',
  '{target} は漏電により感電した！',
  '{target} の体を電撃が駆け抜けた！',
  '{target} は不意の電流に打たれた！',
  '{target} に漏れ出した電流が襲いかかった！',
  '{target} は電撃により体力を失った！',
  '{target} の周囲で電流が弾け、感電した！',
  '{target} に稲妻のような電流が走る！',
  '{target} は漏電の影響を受け、感電した！',
  '{target} に不規則な電流が流れ込んだ！',
] as const;


const TERRAIN_HEATWAVE_LOGS = [
  '灼熱の風が {actor} を焼いた！',
  '熱波が押し寄せ、{actor} の体力を削った！',
  'うだるような暑さが {actor} を蝕む！',
  '焼けつく空気が {actor} を包み込んだ！',
  '熱気が渦巻き、{actor} の力を奪った！',
  '容赦ない熱波が {actor} を襲った！',
  '焦げつくような空気が {actor} を消耗させる！',
  '灼ける大気が {actor} を締めつけた！',
  '熱波が吹き荒れ、{actor} のHPを削り取る！',
  '逃げ場のない暑さが {actor} を苦しめた！',
] as const;

// SpecRef: 6.1.5 | Outcome | terrain.rejuvenation
function applyTerrainRejuvenationHpEffect(
  terrainEffect: TerrainEffectKey | undefined,
  roomType: RoomType,
  currentHp: number,
  maxHp: number
): { hp: number; healAmount?: number } {
  if (terrainEffect === 'terrain.rotwood') {
    return { hp: currentHp };
  }
  if (terrainEffect !== 'terrain.rejuvenation') {
    return { hp: currentHp };
  }
  if (roomType !== 'battle_Normal' && roomType !== 'battle_Elite') {
    return { hp: currentHp };
  }

  const missingHp = Math.max(0, maxHp - currentHp);
  const healAmount = missingHp > 0 ? Math.max(1, Math.floor(missingHp * 0.02)) : 0;
  if (healAmount <= 0) {
    return { hp: currentHp };
  }

  return {
    hp: Math.min(maxHp, currentHp + healAmount),
    healAmount,
  };
}

// SpecRef: 6.1.5 | Outcome | terrain.abundant
function applyTerrainAbundantHpEffect(
  terrainEffect: TerrainEffectKey | undefined,
  roomType: RoomType,
  currentHp: number,
  maxHp: number
): { hp: number; healAmount?: number } {
  if (terrainEffect === 'terrain.rotwood') {
    return { hp: currentHp };
  }
  if (terrainEffect !== 'terrain.abundant') {
    return { hp: currentHp };
  }
  if (roomType !== 'battle_Normal' && roomType !== 'battle_Elite') {
    return { hp: currentHp };
  }

  const healAmount = Math.floor(maxHp * 0.02);
  if (healAmount <= 0) {
    return { hp: currentHp };
  }

  return {
    hp: Math.min(maxHp, currentHp + healAmount),
    healAmount,
  };
}

// SpecRef: 6.1.5 | Outcome | terrain.decay
function applyTerrainDecayHpEffect(
  terrainEffect: TerrainEffectKey | undefined,
  roomType: RoomType,
  currentHp: number,
  maxHp: number
): { hp: number; damageAmount?: number } {
  if (terrainEffect !== 'terrain.decay') {
    return { hp: currentHp };
  }
  if (roomType !== 'battle_Normal' && roomType !== 'battle_Elite') {
    return { hp: currentHp };
  }

  const damageAmount = Math.floor(maxHp * 0.02);
  if (damageAmount <= 0) {
    return { hp: currentHp };
  }

  return {
    hp: Math.max(1, currentHp - damageAmount),
    damageAmount,
  };
}

function buildTerrainAbundantLogEntry(healAmount?: number): BattleLogEntry | null {
  if (!healAmount || healAmount <= 0) return null;
  const flavorText = TERRAIN_ABUNDANT_LOGS[Math.floor(Math.random() * TERRAIN_ABUNDANT_LOGS.length)]
    ?? '豊かな流れが巡り、体力が回復した';
  return {
    phase: 'end',
    actor: 'effect',
    action: flavorText,
    note: `(HP回復+${healAmount})`,
  };
}

function buildTerrainDecayLogEntry(damageAmount?: number): BattleLogEntry | null {
  if (!damageAmount || damageAmount <= 0) return null;
  const flavorText = TERRAIN_DECAY_LOGS[Math.floor(Math.random() * TERRAIN_DECAY_LOGS.length)]
    ?? '得体の知れぬ力が、体力を奪っていく';
  return {
    phase: 'end',
    actor: 'effect',
    action: flavorText,
    note: `(HP減少-${damageAmount})`,
  };
}

// SpecRef: 6.2.2 | Terrain flavor text | log.terrain.rejuvenation
function buildTerrainRejuvenationLogEntry(actorName: string, healAmount?: number): BattleLogEntry | null {
  if (!healAmount || healAmount <= 0) return null;
  const flavorText = TERRAIN_REJUVENATION_LOGS[Math.floor(Math.random() * TERRAIN_REJUVENATION_LOGS.length)]
    ?? '{actor} の身体がじんわりと回復していく';
  return {
    phase: 'end',
    actor: 'effect',
    action: flavorText.replace('{actor}', actorName),
    note: `(HP回復+${healAmount})`,
  };
}

// SpecRef: 6.2.2 | Terrain flavor text | log.terrain.rotwood
function buildTerrainRotwoodLogEntry(): BattleLogEntry {
  const flavorText = TERRAIN_ROTWOOD_LOGS[Math.floor(Math.random() * TERRAIN_ROTWOOD_LOGS.length)]
    ?? '腐敗が満ち、癒しの力は失われた';
  return {
    phase: 'end',
    actor: 'effect',
    action: flavorText,
  };
}


// SpecRef: 6.1.5 | Outcome | terrain.heatwave
function applyTerrainHeatwaveHpEffect(
  terrainEffect: TerrainEffectKey | undefined,
  roomType: RoomType,
  currentHp: number
): { hp: number; damageAmount?: number } {
  if (terrainEffect !== 'terrain.heatwave') {
    return { hp: currentHp };
  }
  if (roomType !== 'battle_Normal' && roomType !== 'battle_Elite' && roomType !== 'battle_Boss') {
    return { hp: currentHp };
  }

  const damageAmount = Math.floor(Math.max(0, currentHp) * 0.05);
  if (damageAmount <= 0) {
    return { hp: currentHp };
  }

  return {
    hp: Math.max(1, currentHp - damageAmount),
    damageAmount,
  };
}

// SpecRef: 6.1.5 | Outcome | terrain.leakage
function applyTerrainLeakageHpEffect(
  terrainEffect: TerrainEffectKey | undefined,
  roomType: RoomType,
  currentHp: number,
  thunderResistance: number
): { hp: number; damageAmount?: number } {
  if (terrainEffect !== 'terrain.leakage') {
    return { hp: currentHp };
  }
  if (roomType !== 'battle_Normal' && roomType !== 'battle_Elite') {
    return { hp: currentHp };
  }
  const damageAmount = Math.floor(Math.max(0, currentHp) * 0.03 * thunderResistance);
  if (damageAmount <= 0) {
    return { hp: currentHp };
  }

  return {
    hp: Math.max(1, currentHp - damageAmount),
    damageAmount,
  };
}


// SpecRef: 6.2.2 | Terrain flavor text | log.terrain.heatwave
function buildTerrainHeatwaveLogEntry(actorName: string, damageAmount?: number): BattleLogEntry | null {
  if (!damageAmount || damageAmount <= 0) return null;
  const flavorText = TERRAIN_HEATWAVE_LOGS[Math.floor(Math.random() * TERRAIN_HEATWAVE_LOGS.length)]
    ?? '逃げ場のない暑さが {actor} を苦しめた！';
  return {
    phase: 'end',
    actor: 'effect',
    effectKind: 'terrain',
    action: flavorText.replace('{actor}', actorName),
    note: `(HP減少-${damageAmount})`,
  };
}

// SpecRef: 6.2.2 | Terrain flavor text | log.terrain.leakage
function buildTerrainLeakageLogEntry(targetName: string, damageAmount?: number): BattleLogEntry | null {
  if (!damageAmount || damageAmount <= 0) return null;
  const flavorText = TERRAIN_LEAKAGE_LOGS[Math.floor(Math.random() * TERRAIN_LEAKAGE_LOGS.length)]
    ?? '{target} に不規則な電流が流れ込んだ！';
  return {
    phase: 'end',
    actor: 'effect',
    action: flavorText.replace('{target}', targetName),
    note: `(HP減少 ⚡-${damageAmount})`,
  };
}

function buildRewardLogEntries(
  rewardLogEntries: { itemName: string; autoSellProfit?: number }[]
): BattleLogEntry[] {
  return rewardLogEntries.map((rewardEntry) => ({
    phase: 'end',
    actor: 'effect',
    action: `${rewardEntry.itemName} を獲得した！`,
    note: rewardEntry.autoSellProfit && rewardEntry.autoSellProfit > 0
      ? `(自動売却対象: ${rewardEntry.autoSellProfit}G)`
      : undefined,
  }));
}

const AURIFEROUS_LOGS = [
  '{actor} の体に蓄えられた衝撃からアイテムが零れ落ちた！',
  '{actor} は受けた攻撃により、装備の一部が露出した！',
  '{actor} の内側から、価値あるアイテムが静かに形成された…',
  '{actor} の体内で圧縮された力が、新たなる可能性の輝きとなった！',
  '{actor} への打撃が重なることで、生成される価値が増している！',
  '{actor} は打撃を受けるほど、何かを生成している…',
  '{actor} の損傷が、別の形の“価値”へと転換された！',
  '{actor} の肉体が圧縮され、素材としての価値を帯び始めた！',
  '{actor} に刻まれた傷が、アイテムとなる因子へと変わった！',
  '{actor} は攻撃の蓄積により、価値ある断片を生み出した！',
] as const;

function buildAuriferousLogEntry(actorName: string, totalHitsReceived: number, bonusRolls: number): BattleLogEntry | null {
  if (bonusRolls <= 0) return null;

  const flavorText = AURIFEROUS_LOGS[Math.floor(Math.random() * AURIFEROUS_LOGS.length)]
    ?? '{actor} は攻撃の蓄積により、価値ある断片を生み出した！';

  return {
    phase: 'end',
    actor: 'effect',
    action: flavorText.replace('{actor}', actorName),
    note: `(累計${totalHitsReceived}回→ +${bonusRolls}回抽選回数増加)`,
  };
}

function isRetreatHpThresholdReached(currentHp: number, maxHp: number): boolean {
  return currentHp <= maxHp * 0.3;
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SELECT_PARTY':
      return { ...state, selectedPartyIndex: action.partyIndex };

    case 'SELECT_DUNGEON': {
      const updatedParties = [...state.parties];
      updatedParties[action.partyIndex] = {
        ...updatedParties[action.partyIndex],
        selectedDungeonId: action.dungeonId
      };
      return { ...state, parties: updatedParties };
    }

    case 'SET_EXPEDITION_DEPTH_LIMIT': {
      const updatedParties = [...state.parties];
      updatedParties[action.partyIndex] = {
        ...updatedParties[action.partyIndex],
        expeditionDepthLimit: action.depthLimit,
      };
      return { ...state, parties: updatedParties };
    }

    case 'SET_EXPEDITION_DIFFICULTY_OFFSET': {
      const updatedParties = [...state.parties];
      updatedParties[action.partyIndex] = {
        ...updatedParties[action.partyIndex],
        expeditionDifficultyOffset: normalizeExpeditionDifficultyOffset(action.difficultyOffset),
      };
      return { ...state, parties: updatedParties };
    }

    case 'RESET_EXPEDITION_STATS': {
      const updatedParties = [...state.parties];
      updatedParties[action.partyIndex] = {
        ...updatedParties[action.partyIndex],
        expeditionStats: getExpeditionStatsWithDefaults(null),
      };
      return { ...state, parties: updatedParties };
    }

    case 'UPDATE_PARTY_DEITY': {
      const normalizedDeityName = normalizeDeityName(action.deityName);
      const isKnownDeity = DEITY_OPTIONS.some((deity) => normalizeDeityName(deity.name) === normalizedDeityName);
      const isUnlockedDeity = isNoFaithDeity(normalizedDeityName)
        || isKnownDeity
        || normalizeUnlockedDeities(state.global.unlockedDeities).includes(normalizedDeityName);
      if (!isUnlockedDeity) {
        return state;
      }

      const isUsedByOtherParty = !isNoFaithDeity(normalizedDeityName) && state.parties.some((party, index) =>
        index !== action.partyIndex && normalizeDeityName(party.deity.name) === normalizedDeityName
      );
      if (isUsedByOtherParty) {
        return state;
      }

      const updatedParties = [...state.parties];
      const targetParty = updatedParties[action.partyIndex];

      updatedParties[action.partyIndex] = {
        ...targetParty,
        deity: {
          ...targetParty.deity,
          name: normalizedDeityName,
        },
        deityGold: state.global.deityDonations[normalizedDeityName] ?? 0,
      };

      return {
        ...state,
        parties: updatedParties,
      };
    }

    case 'RUN_EXPEDITION': {
      const gameMode = action.gameMode ?? 'm.kemo';
      const currentParty = state.parties[action.partyIndex];
      const dungeon = getDungeonById(currentParty.selectedDungeonId);
      if (!dungeon) return state;
      const isGodsBattle = action.triggerGodsBattle === true && isGodsBattleAvailable(currentParty, dungeon.id);
      const { partyStats, characterStats } = computePartyStats(currentParty);
      const persistedCurrentHp = currentParty.currentHp ?? partyStats.hp;
      if (persistedCurrentHp <= 0 || partyStats.hp <= 0) {
        return state;
      }
      let currentHp = Math.max(0, Math.min(persistedCurrentHp, partyStats.hp));
      // SpecRef: 8.3 | UI_EXPEDITION | Difficulty Offset (難易度)
      const effectiveDifficultyOffset = hasDefeatedDungeonBoss(currentParty, dungeon.id)
        ? normalizeExpeditionDifficultyOffset(currentParty.expeditionDifficultyOffset)
        : 0;

      const entries: ExpeditionLogEntry[] = [];
      const rewards: Item[] = [];
      const recoveredItems: Item[] = [];
      let totalExp = 0;
      let bags = state.bags;
      let finalOutcome: 'Clear' | 'Escape' | 'Defeat' | 'Retreat' = 'Clear';
      let currentInventory = state.global.inventory;
      let currentGold = state.global.gold;
      let totalAutoSellProfit = 0;
      let totalAutoSellItemCount = 0;
      let totalAutoSellItems: { itemName: string; autoSellProfit: number }[] = [];
      let roomCounter = 0;
      let expeditionEnded = false;

      // Use new floor structure if available
      if (dungeon.floors && dungeon.floors.length > 0) {
        // New v0.2.0 floor-based expedition
        for (const floor of dungeon.floors) {
          if (expeditionEnded) break;

          for (let roomIndex = 0; roomIndex < floor.rooms.length; roomIndex++) {
            if (expeditionEnded) break;

            const roomDef = floor.rooms[roomIndex];
            roomCounter++;

            const tier = dungeon.enemyPoolIds[0]; // dungeon tier
            // SpecRef: 5.1.3.1 | "Loot-Gate" progression system | Gate `x.floor`,`x.room`
            const gateCheck = checkLootGateRequirement({
              dungeonId: dungeon.id,
              floorNumber: floor.floorNumber,
              roomInFloor: roomIndex + 1,
              roomType: roomDef.type,
              tier,
              party: currentParty,
            });
            if (gateCheck.blocked) {
              const gateEntry: ExpeditionLogEntry = {
                room: roomCounter,
                floor: floor.floorNumber,
                roomInFloor: roomIndex + 1,
                roomType: roomDef.type,
                floorMultiplier: getRoomMultiplier(
                  dungeon.expLevel,
                  floor.floorNumber,
                  roomDef.type,
                  gameMode === 'm.luna',
                  effectiveDifficultyOffset,
                ),
                enemyName: '[扉が封印されている]',
                enemyHP: 0,
                enemyAttackValues: '',
                outcome: 'draw', // Not a battle - displayed as 未到達
                damageDealt: 0,
                damageTaken: 0,
                remainingPartyHP: currentHp,
                maxPartyHP: partyStats.hp,
                details: [],
                gateInfo: roomDef.type === 'battle_Boss'
                  ? `${gateCheck.label} ${gateCheck.collected}/${gateCheck.required}で ボス戦解放`
                  : roomIndex === 0
                    ? `${gateCheck.label} ${gateCheck.collected}/${gateCheck.required}で${dungeon.name}開放`
                    : `${gateCheck.label} ${gateCheck.collected}/${gateCheck.required}で ${floor.floorNumber}F-4解放`,
              };
              entries.push(gateEntry);
              finalOutcome = 'Escape';
              expeditionEnded = true;
              break;
            }

            // Select enemy for this room
            const baseEnemy = selectEnemyForRoom(roomDef.type, roomDef.poolId, roomDef.bossId, floor.floorNumber, roomIndex, roomDef.enemyIds ?? [], gameMode === 'm.luna');
            if (!baseEnemy) continue;

            const roomMultiplier = getRoomMultiplier(
              dungeon.expLevel,
              floor.floorNumber,
              roomDef.type,
              gameMode === 'm.luna',
              effectiveDifficultyOffset,
            );
            const effectiveTier = getEffectiveExpeditionTier(dungeon.id, gameMode === 'm.luna');
            const effectiveDungeon = {
              ...dungeon,
              tier: effectiveTier,
              enemyMultipliers: getEffectiveEnemyMultipliers(dungeon, gameMode === 'm.luna'),
            };
            let enemy = getEncounterEnemyWithScaling(baseEnemy, effectiveDungeon, floor.floorNumber, roomDef.type, {
              isLunaMode: gameMode === 'm.luna',
              difficultyOffset: effectiveDifficultyOffset,
            });
            if (isGodsBattle && roomDef.type === 'battle_Boss') {
              enemy = createGodEnemy(
                enemy,
                dungeon.id,
                dungeon.name,
                gameMode === 'm.luna',
                effectiveDifficultyOffset,
              );
            }

            // Pass currentHp to maintain HP persistence during expedition
            const roomStartHp = currentHp;
            const colosseumTerrainEffect = dungeon.id === 99 ? getColosseumEnemySettings().terrainEffect : 'none';
            const terrainEffect = colosseumTerrainEffect !== 'none'
              ? colosseumTerrainEffect
              : floor.terrainEffect;
            const battleResult = executeBattle(currentParty, enemy, bags, roomStartHp, { terrainEffect });

            // Update threat bags from battle result
            bags = {
              ...bags,
              physicalThreatBag: battleResult.updatedBags.physicalThreatBag,
              magicalThreatBag: battleResult.updatedBags.magicalThreatBag,
            };

            const damageDealt = enemy.hp - Math.max(0, battleResult.enemyHp);
            const damageTaken = Math.max(0, roomStartHp - battleResult.partyHp);

            const enemyAttackValues = calculateEnemyAttackValues(enemy, partyStats);

            // Room type suffix for display
            let roomSuffix = '';
            if (roomDef.type === 'battle_Elite') roomSuffix = ' (ELITE)';
            if (roomDef.type === 'battle_Boss') roomSuffix = isGodsBattle ? ' (神魔戦)' : ' (BOSS)';

            const entry: ExpeditionLogEntry = {
              room: roomCounter,
              floor: floor.floorNumber,
              roomInFloor: roomIndex + 1,
              roomType: roomDef.type,
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
              maxPartyHP: partyStats.hp,
              details: battleResult.log,
            };

            if (battleResult.outcome === 'victory') {
              const isColosseumBattle = dungeon.id === 99;
              if (!isColosseumBattle) {
                const enemyLevelFinal = getEffectiveEnemyLevel(
                  dungeon.expLevel,
                  floor.floorNumber,
                  roomDef.type,
                  gameMode === 'm.luna',
                  effectiveDifficultyOffset,
                );
                totalExp += calculateExperience(
                  enemy.experience,
                  roomDef.type,
                  currentParty.level,
                  enemyLevelFinal,
                  isGodsBattle,
                );
              }

              const unlockActorName = getUnlockActorName(currentParty);
              const hasUnlock = !!unlockActorName;
              const autoSellMultiplier = getPartyCunningMultiplier(currentParty);
              const deityKey = getDeityKey(currentParty.deity.name);
              const deityDonation =
                state.global.deityDonations[normalizeDeityName(currentParty.deity.name)]
                ?? currentParty.deityGold
                ?? 0;
              const hasExtraRewardRollBlessing = deityKey === 'Goddess of Discord'
                || (deityKey === 'God of Oblivion' && getDeityRank(deityDonation) >= 10);
              let rewardLogEntries: { itemName: string; autoSellProfit?: number }[] = [];
              if (!isColosseumBattle) {
                const enemyAuriferousLevel = enemy.abilities
                  .filter((ability) => ability.id === 'auriferous')
                  .reduce((maxLevel, ability) => Math.max(maxLevel, ability.level), 0);
                const auriferousBonusRolls = enemyAuriferousLevel > 0
                  ? Math.floor(battleResult.enemyHitsReceived / 10)
                  : 0;
                const rewardResult = resolveEnemyRewards(
                  enemy,
                  bags,
                  currentInventory,
                  currentGold,
                  hasUnlock,
                  gameMode,
                  autoSellMultiplier,
                  terrainEffect,
                  hasExtraRewardRollBlessing,
                  auriferousBonusRolls,
                );
                bags = rewardResult.bags;
                currentInventory = rewardResult.inventory;
                currentGold = rewardResult.gold;
                totalAutoSellProfit += rewardResult.autoSellProfit;
                totalAutoSellItemCount += rewardResult.autoSellItemCount;
                totalAutoSellItems.push(...rewardResult.autoSellItems);
                rewards.push(...rewardResult.rewards);
                recoveredItems.push(...rewardResult.recoveredItems);
                if (rewardResult.rewardNames.length > 0) {
                  entry.reward = rewardResult.rewardNames.join(' / ');
                  entry.rewardItems = [...rewardResult.rewards];
                  entry.rewardRarity = rewardResult.highestRewardRarity;
                  entry.rewardIsSuperRare = rewardResult.hasSuperRareReward;
                }
                rewardLogEntries = rewardResult.rewardLogEntries;
                const auriferousLogEntry = buildAuriferousLogEntry(
                  enemy.name,
                  battleResult.enemyHitsReceived,
                  auriferousBonusRolls,
                );
                if (auriferousLogEntry) {
                  entry.details.push(auriferousLogEntry);
                }
              }

              currentHp = battleResult.partyHp;
              entries.push(entry);

              const deityHpEffect = applyPeriodicDeityHpEffect(
                currentParty.deity.name,
                floor.floorNumber,
                roomIndex + 1,
                roomDef.type,
                terrainEffect,
                currentHp,
                partyStats.hp
              );
              currentHp = deityHpEffect.hp;
              entry.postBattlePartyHP = battleResult.partyHp;
              entry.remainingPartyHP = currentHp;
              if (deityHpEffect.healAmount) {
                entry.healAmount = deityHpEffect.healAmount;
              }
              if (deityHpEffect.attritionAmount) {
                entry.attritionAmount = deityHpEffect.attritionAmount;
              }
              const deityLogEntry = buildDeityEffectLogEntry(
                currentParty.deity.name,
                deityHpEffect.healAmount,
                deityHpEffect.attritionAmount
              );
              if (deityLogEntry) {
                entry.details.push(deityLogEntry);
              }

              const rejuvenationActorName = currentParty.characters[
                Math.floor(Math.random() * currentParty.characters.length)
              ]?.name ?? currentParty.name;
              const terrainHpEffect = applyTerrainRejuvenationHpEffect(
                terrainEffect,
                roomDef.type,
                currentHp,
                partyStats.hp
              );
              currentHp = terrainHpEffect.hp;
              entry.remainingPartyHP = currentHp;
              const terrainLogEntry = buildTerrainRejuvenationLogEntry(
                rejuvenationActorName,
                terrainHpEffect.healAmount
              );
              if (terrainLogEntry) {
                entry.details.push(terrainLogEntry);
              }

              const abundantHpEffect = applyTerrainAbundantHpEffect(
                terrainEffect,
                roomDef.type,
                currentHp,
                partyStats.hp
              );
              currentHp = abundantHpEffect.hp;
              entry.remainingPartyHP = currentHp;
              const abundantLogEntry = buildTerrainAbundantLogEntry(abundantHpEffect.healAmount);
              if (abundantLogEntry) {
                entry.details.push(abundantLogEntry);
              }

              const isNormalOrEliteRoom = roomDef.type === 'battle_Normal' || roomDef.type === 'battle_Elite';
              const restorationBlockedByRotwood = terrainEffect === 'terrain.rotwood'
                && isNormalOrEliteRoom
                && getDeityKey(currentParty.deity.name) === 'Goddess of Restoration'
                && floor.floorNumber >= 1
                && floor.floorNumber <= 5
                && roomIndex + 1 === 4;
              if (restorationBlockedByRotwood) {
                entry.details.push(buildTerrainRotwoodLogEntry());
              }

              const leakageTargetIndex = Math.floor(Math.random() * currentParty.characters.length);
              const leakageTarget = currentParty.characters[leakageTargetIndex];
              const leakageTargetStats = characterStats.find(
                (stats) => stats.characterId === leakageTarget?.id
              );
              const leakageThunderResistance = leakageTargetStats?.elementalDefenseMultipliers.thunder ?? 1.0;
              const leakageHpEffect = applyTerrainLeakageHpEffect(
                terrainEffect,
                roomDef.type,
                currentHp,
                leakageThunderResistance
              );
              currentHp = leakageHpEffect.hp;
              entry.remainingPartyHP = currentHp;
              const leakageLogEntry = buildTerrainLeakageLogEntry(
                leakageTarget?.name ?? currentParty.name,
                leakageHpEffect.damageAmount
              );
              if (leakageLogEntry) {
                entry.details.push(leakageLogEntry);
              }

              const heatwaveActorName = currentParty.characters[
                Math.floor(Math.random() * currentParty.characters.length)
              ]?.name ?? currentParty.name;
              const heatwaveHpEffect = applyTerrainHeatwaveHpEffect(
                terrainEffect,
                roomDef.type,
                currentHp
              );
              currentHp = heatwaveHpEffect.hp;
              entry.remainingPartyHP = currentHp;
              const heatwaveLogEntry = buildTerrainHeatwaveLogEntry(
                heatwaveActorName,
                heatwaveHpEffect.damageAmount
              );
              if (heatwaveLogEntry) {
                entry.details.push(heatwaveLogEntry);
              }

              if (rewardLogEntries.length > 0) {
                entry.details.push(...buildRewardLogEntries(rewardLogEntries));
              }

              const isFinalBossRoom =
                roomDef.type === 'battle_Boss'
                && floor.floorNumber === dungeon.floors.length
                && roomIndex === floor.rooms.length - 1;

              if (!isFinalBossRoom && isRetreatHpThresholdReached(currentHp, partyStats.hp)) {
                finalOutcome = 'Retreat';
                expeditionEnded = true;
                entry.details.push({
                  phase: 'end',
                  actor: 'deity',
                  action: '撤退',
                  note: 'HPが30%以下のため、戦利品を持ち帰ります。',
                });
              } else {
                const decayHpEffect = applyTerrainDecayHpEffect(
                  terrainEffect,
                  roomDef.type,
                  currentHp,
                  partyStats.hp
                );
                currentHp = decayHpEffect.hp;
                entry.remainingPartyHP = currentHp;
                const decayLogEntry = buildTerrainDecayLogEntry(decayHpEffect.damageAmount);
                if (decayLogEntry) {
                  entry.details.push(decayLogEntry);
                }

                const reachedDepthLimit =
                  (currentParty.expeditionDepthLimit === '1f-3' && floor.floorNumber === 1 && roomIndex === 2)
                  || (currentParty.expeditionDepthLimit === '1f-4' && floor.floorNumber === 1 && roomIndex === 3)
                  || (currentParty.expeditionDepthLimit === '2f-3' && floor.floorNumber === 2 && roomIndex === 2)
                  || (currentParty.expeditionDepthLimit === '2f-4' && floor.floorNumber === 2 && roomIndex === 3)
                  || (currentParty.expeditionDepthLimit === '3f-3' && floor.floorNumber === 3 && roomIndex === 2)
                  || (currentParty.expeditionDepthLimit === '3f-4' && floor.floorNumber === 3 && roomIndex === 3)
                  || (currentParty.expeditionDepthLimit === '4f-3' && floor.floorNumber === 4 && roomIndex === 2)
                  || (currentParty.expeditionDepthLimit === '4f-4' && floor.floorNumber === 4 && roomIndex === 3)
                  || (currentParty.expeditionDepthLimit === '5f-3' && floor.floorNumber === 5 && roomIndex === 2)
                  || (currentParty.expeditionDepthLimit === '5f-4' && floor.floorNumber === 5 && roomIndex === 3)
                  || (currentParty.expeditionDepthLimit === 'beforeBoss' && floor.floorNumber === 6 && roomIndex === 2);

                if (reachedDepthLimit) {
                  finalOutcome = 'Escape';
                  expeditionEnded = true;
                  entry.details.push({
                    phase: 'end',
                    actor: 'deity',
                    action: '探索深度に到達した為帰還します',
                  });
                }
              }
            } else if (battleResult.outcome === 'defeat') {
              entries.push(entry);
              finalOutcome = 'Defeat';
              expeditionEnded = true;
            } else {
              // Draw
              entries.push(entry);
              finalOutcome = 'Retreat';
              expeditionEnded = true;
            }
          }
        }
      }

      // On defeat: revert inventory and gold (no item rewards), but keep experience
      const isDefeat = finalOutcome === 'Defeat';
      const finalInventory = isDefeat ? state.global.inventory : currentInventory;
      const finalRewards = isDefeat ? [] : rewards;
      const finalAutoSellProfit = isDefeat ? 0 : totalAutoSellProfit;
      const finalAutoSellItemCount = isDefeat ? 0 : totalAutoSellItemCount;
      const finalGold = isDefeat ? state.global.gold : (currentGold - finalAutoSellProfit);
      const finalAutoSellItems = isDefeat ? [] : totalAutoSellItems;

      const nextLootGateProgressBase = isDefeat
        ? currentParty.lootGateProgress
        : addRecoveredItemsToLootProgress(currentParty.lootGateProgress ?? {}, recoveredItems);
      const nextLootGateProgress = { ...(nextLootGateProgressBase ?? {}) };
      if (isGodsBattle && finalOutcome === 'Clear') {
        nextLootGateProgress[getLootCollectionKey(dungeon.id, 'bossRare')] = 0;
      }
      const nextDefeatedBossExpeditions = {
        ...(currentParty.defeatedBossExpeditions ?? {}),
      };
      if (!isGodsBattle && finalOutcome === 'Clear') {
        nextDefeatedBossExpeditions[dungeon.id] = true;
      }
      const nextLootGateStatus = unlockAvailableLootGates(
        currentParty.lootGateStatus ?? {},
        nextLootGateProgress,
        nextDefeatedBossExpeditions,
        DUNGEONS.length
      );

      const totalExpGain = Math.ceil(totalExp);

      const finalRemainingPartyHP = entries.length > 0
        ? entries[entries.length - 1].remainingPartyHP
        : currentHp;
      const expeditionAutoSellMultiplier = getPartyCunningMultiplier(currentParty);

      const log: ExpeditionLog = {
        dungeonId: dungeon.id,
        dungeonName: dungeon.name,
        difficultyOffset: effectiveDifficultyOffset,
        totalExperience: totalExpGain,
        totalRooms: dungeon.floors.reduce((sum, f) => sum + f.rooms.length, 0),
        completedRooms: entries.length,
        finalOutcome,
        entries,
        rewards: finalRewards,
        autoSellProfit: finalAutoSellProfit,
        autoSellCount: finalAutoSellItemCount,
        autoSellItems: finalAutoSellItems,
        autoSellMultiplier: expeditionAutoSellMultiplier > 1 ? expeditionAutoSellMultiplier : undefined,
        remainingPartyHP: finalRemainingPartyHP,
        maxPartyHP: partyStats.hp,
      };

      const diarySettings = getDiarySettingsWithDefaults(currentParty.diarySettings);
      const hasSuperRareMatch = finalRewards.some((item) => item.superRare > 0 && matchesDiaryThreshold(item, diarySettings.superRareThreshold));
      const hasBossMatch = finalRewards.some((item) => getItemRarityCode(item) === 'bossRare' && matchesDiaryThreshold(item, diarySettings.bossThreshold));
      const hasMythicMatch = finalRewards.some((item) => getItemRarityCode(item) === 'mythicRare' && matchesDiaryThreshold(item, diarySettings.mythicThreshold));
      const hasRareMatch = finalRewards.some((item) => getItemRarityCode(item) === 'eliteRare' && matchesDiaryThreshold(item, diarySettings.rareThreshold));

      const diaryTriggers: DiaryLog['triggers'] = [];
      if (finalOutcome === 'Defeat' && diarySettings.notifyDefeat) diaryTriggers.push('defeat');

      if (hasSuperRareMatch) {
        diaryTriggers.push('superRare');
      } else {
        if (hasMythicMatch) diaryTriggers.push('mythicRare');
        if (hasBossMatch) diaryTriggers.push('bossRare');
        if (hasRareMatch) diaryTriggers.push('eliteRare');
      }

      const diaryCreatedAt = action.simulatedAt ?? Date.now();

      const pendingDiaryLog = diaryTriggers.length > 0
        ? {
            id: `${diaryCreatedAt}-${Math.random().toString(36).slice(2, 8)}`,
            expeditionLog: log,
            triggers: diaryTriggers,
            createdAt: diaryCreatedAt,
            isRead: false,
          }
        : null;

      const updatedParties = [...state.parties];
      const endedWithDrawRetreat = entries.length > 0 && entries[entries.length - 1].outcome === 'draw';
      updatedParties[action.partyIndex] = {
        ...currentParty,
        expeditionRewardsPending: true,
        defeatedBossExpeditions: nextDefeatedBossExpeditions,
        lootGateProgress: nextLootGateProgress,
        lootGateStatus: nextLootGateStatus,
        lastExpeditionLog: log,
        pendingDiaryLog,
        currentHp: finalRemainingPartyHP,
        // Party-cycle spending/donation is defined from the *latest* expedition's
        // auto-sell profit, so this should not accumulate across expeditions.
        pendingProfit: finalAutoSellProfit,
        expeditionStats: {
          ...currentParty.expeditionStats,
          Clear: currentParty.expeditionStats.Clear + (finalOutcome === 'Clear' ? 1 : 0),
          Turned_Back: currentParty.expeditionStats.Turned_Back + (finalOutcome === 'Escape' ? 1 : 0),
          Draw_Retreat: currentParty.expeditionStats.Draw_Retreat + (finalOutcome === 'Retreat' && endedWithDrawRetreat ? 1 : 0),
          Wounded_Retreat: currentParty.expeditionStats.Wounded_Retreat + (finalOutcome === 'Retreat' && !endedWithDrawRetreat ? 1 : 0),
          Defeat: currentParty.expeditionStats.Defeat + (finalOutcome === 'Defeat' ? 1 : 0),
        },
      };

      const currentUnlockedPartySlots = state.parties.length;
      const unlockedState = getUnlockedStateFromEntries([log], currentUnlockedPartySlots);
      const pendingUnlockState = (
        unlockedState.unlockedPartySlots > currentUnlockedPartySlots
      )
        ? {
            deityNames: [...DEFAULT_UNLOCKED_DEITIES],
            partySlotCount: Math.max(1, Math.min(6, unlockedState.unlockedPartySlots)),
          }
        : null;

      const nextParties = [...updatedParties];
      nextParties[action.partyIndex] = {
        ...nextParties[action.partyIndex],
        pendingUnlockState,
      };

      return {
        ...state,
        bags,
        parties: nextParties,
        global: {
          ...state.global,
          inventory: finalInventory,
          gold: finalGold,
        },
      };
    }

    case 'FINALIZE_DIARY_LOG': {
      const party = state.parties[action.partyIndex];
      if (!party) return state;

      const pendingDiaryLog = party.pendingDiaryLog;
      const pendingUnlockState = party.pendingUnlockState;
      const createdAtBase = pendingDiaryLog?.createdAt ?? Date.now();
      const unlockDiaryLog = pendingUnlockState
        ? getUnlockDiaryLog(
            party.lastExpeditionLog,
            state.parties.length,
            pendingUnlockState,
            createdAtBase + 1,
          )
        : null;
      const nextDiaryLogs = [
        ...(unlockDiaryLog ? [unlockDiaryLog] : []),
        ...(pendingDiaryLog ? [pendingDiaryLog] : []),
        ...(party.diaryLogs ?? []),
      ].slice(0, DIARY_LOG_RETENTION_LIMIT);

      let nextLevel = party.level;
      let nextExperience = party.experience;
      let nextCondition = party.condition;
      if (party.expeditionRewardsPending && party.lastExpeditionLog) {
        nextExperience += party.lastExpeditionLog.totalExperience;
        if (nextLevel < MAX_LEVEL && nextExperience >= getXpToNextLevel(nextLevel)) {
          nextLevel += 1;
          nextExperience = 0;
        }
        const endedWithDrawRetreat = party.lastExpeditionLog.entries.length > 0
          && party.lastExpeditionLog.entries[party.lastExpeditionLog.entries.length - 1].outcome === 'draw';
        const conditionBase = normalizePartyCondition(party.condition);
        const rawConditionDelta = getOutcomeConditionAdjustment(
          conditionBase,
          party.lastExpeditionLog.finalOutcome,
          endedWithDrawRetreat,
        );
        const conditionDelta = rawConditionDelta;
        const shouldConsumeConditionForAutoGodsBattle = isGodsBattleExpedition(party.lastExpeditionLog)
          && conditionBase >= 100
          && !party.sideQuest;
        // SpecRef: 7.1.2 | AUTO progress logic | condition
        nextCondition = normalizePartyCondition(
          conditionBase
          + conditionDelta
          - (shouldConsumeConditionForAutoGodsBattle ? 200 : 0),
        );
      }

      const updatedParties = [...state.parties];
      updatedParties[action.partyIndex] = {
        ...party,
        level: nextLevel,
        experience: nextExperience,
        condition: nextCondition,
        expeditionRewardsPending: false,
        pendingDiaryLog: null,
        diaryLogs: nextDiaryLogs,
        hasUnreadDiary: nextDiaryLogs.some((diaryLog) => !diaryLog.isRead),
      };

      let nextGlobal = state.global;
      if (pendingUnlockState) {
        const nextUnlockedPartySlots = Math.max(1, Math.min(6, pendingUnlockState.partySlotCount));
        const defaultParties = createDefaultParties();

        while (updatedParties.length < nextUnlockedPartySlots) {
          const nextDefaultParty = createUnlockedPartyWithAvailableDeity(defaultParties[updatedParties.length], updatedParties);
          updatedParties.push(nextDefaultParty);
        }

        updatedParties[action.partyIndex] = {
          ...updatedParties[action.partyIndex],
          pendingUnlockState: null,
        };

        nextGlobal = {
          ...state.global,
          unlockedDeities: [...DEFAULT_UNLOCKED_DEITIES],
        };
      }

      const trimmedParties = enforceGlobalDiaryLogRetention(updatedParties);

      return {
        ...state,
        parties: trimmedParties,
        global: nextGlobal,
      };
    }

    case 'HEAL_PARTY_HP': {
      const currentParty = state.parties[action.partyIndex];
      if (!currentParty) return state;
      const { partyStats } = computePartyStats(currentParty);
      const healedHp = Math.min(partyStats.hp, (currentParty.currentHp ?? partyStats.hp) + action.amount);
      const updatedParties = [...state.parties];
      updatedParties[action.partyIndex] = {
        ...currentParty,
        currentHp: healedHp,
      };
      return {
        ...state,
        parties: updatedParties,
      };
    }

    case 'CLEAR_PENDING_PROFIT': {
      const currentParty = state.parties[action.partyIndex];
      if (!currentParty) return state;
      const updatedParties = [...state.parties];
      updatedParties[action.partyIndex] = {
        ...currentParty,
        pendingProfit: 0,
      };
      return {
        ...state,
        parties: updatedParties,
      };
    }


    case 'SPEND_PENDING_PROFIT': {
      const currentParty = state.parties[action.partyIndex];
      if (!currentParty) return state;
      const amount = Math.max(0, Math.floor(action.amount));
      const updatedParties = [...state.parties];
      updatedParties[action.partyIndex] = {
        ...currentParty,
        pendingProfit: Math.max(0, (currentParty.pendingProfit ?? 0) - amount),
      };
      return {
        ...state,
        parties: updatedParties,
      };
    }

    case 'ROLL_PARTY_SLEEPINESS': {
      const currentParty = state.parties[action.partyIndex];
      if (!currentParty) return state;

      const { party: updatedParty } = drawPartySleepiness(currentParty);
      const updatedParties = [...state.parties];
      updatedParties[action.partyIndex] = updatedParty;

      return {
        ...state,
        parties: updatedParties,
      };
    }


    case 'ROLL_SIDE_QUEST': {
      const currentParty = state.parties[action.partyIndex];
      if (!currentParty || currentParty.sideQuest) return state;
      let bags = refillBagIfEmpty(state.bags, 'sideQuestBag');
      const { ticket, newBag } = drawFromBag(bags.sideQuestBag);
      bags = { ...bags, sideQuestBag: newBag };
      if (ticket === 0) return { ...state, bags };

      // SpecRef: 5.1.2 | Side Quest | Side quest difficulty
      const def = SIDE_QUEST_RUNTIME_DEFS[ticket];
      if (!def) return { ...state, bags };
      const sideQuestLevel = getSideQuestLevelFromExpId(Math.floor(action.rolledTier));
      const multiplier = def.scaleByLevel[sideQuestLevel] ?? 1;
      const scaledMin = Math.round(def.baseMin * multiplier);
      const scaledMax = Math.round(def.baseMax * multiplier);
      const min = Math.min(scaledMin, scaledMax);
      const max = Math.max(scaledMin, scaledMax);
      const target = Math.floor(Math.random() * (max - min + 1)) + min;
      const internalTarget = TIME_BASED_SIDE_QUEST_TYPES.has(def.type) ? target * 60 : target;
      const assignedAt = action.simulatedAt ?? Date.now();
      const expiresAt = def.deadlineHours > 0
        ? assignedAt + (def.deadlineHours * 60 * 60 * 1000)
        : Number.MAX_SAFE_INTEGER;
      const updatedParties = [...state.parties];
      updatedParties[action.partyIndex] = {
        ...currentParty,
        sideQuest: {
          id: ticket,
          type: def.type,
          shortText: formatSideQuestShortText(def.type, def.shortText, target),
          target: internalTarget,
          progress: 0,
          rolledTier: Math.max(1, Math.min(8, Math.floor(action.rolledTier))),
          assignedAt,
          expiresAt,
        },
      };
      return { ...state, bags, parties: updatedParties };
    }

    case 'CANCEL_SIDE_QUEST': {
      const currentParty = state.parties[action.partyIndex];
      if (!currentParty || !currentParty.sideQuest) return state;
      const updatedParties = [...state.parties];
      updatedParties[action.partyIndex] = { ...currentParty, sideQuest: null };
      return { ...state, parties: updatedParties };
    }

    case 'ADVANCE_SIDE_QUEST': {
      const currentParty = state.parties[action.partyIndex];
      if (!currentParty?.sideQuest) return state;
      const gained = Math.max(0, Math.floor(action.amount));
      if (gained <= 0) return state;

      const nextProgress = currentParty.sideQuest.progress + gained;
      const updatedParties = [...state.parties];
      if (nextProgress < currentParty.sideQuest.target) {
        updatedParties[action.partyIndex] = {
          ...currentParty,
          sideQuest: { ...currentParty.sideQuest, progress: nextProgress },
        };
        return { ...state, parties: updatedParties };
      }

      const jewelKeys = ['might', 'arcana', 'fort', 'ward', 'shade', 'focus'] as const;
      const key = jewelKeys[Math.floor(Math.random() * jewelKeys.length)];
      const rewardRank = Math.floor(Math.random() * currentParty.sideQuest.rolledTier) + 1;
      const diaryCreatedAt = action.simulatedAt ?? Date.now();
      const dungeonName = DUNGEONS.find((dungeon) => dungeon.id === currentParty.selectedDungeonId)?.name ?? '';
      const sideQuestLabel = currentParty.sideQuest.shortText.replace(/\(([^)]*)\)/, '$1');
      const sideQuestDetail = `${dungeonName}: ${getJewelNameByRank(key, rewardRank)} を手に入れた`;
      const sideQuestDiaryLog: DiaryLog = {
        id: `${diaryCreatedAt}-${Math.random().toString(36).slice(2, 8)}`,
        expeditionLog: {
          dungeonId: currentParty.selectedDungeonId,
          dungeonName,
          difficultyOffset: 0,
          totalExperience: 0,
          totalRooms: 0,
          completedRooms: 0,
          finalOutcome: 'Escape',
          entries: [],
          rewards: [],
          autoSellProfit: 0,
          autoSellCount: 0,
          autoSellItems: [],
          remainingPartyHP: currentParty.currentHp,
          maxPartyHP: currentParty.currentHp,
        },
        triggers: ['sideQuest'],
        sideQuestLabel,
        sideQuestDetail,
        createdAt: diaryCreatedAt,
        isRead: false,
      };
      const nextDiaryLogs: DiaryLog[] = [
        sideQuestDiaryLog,
        ...(currentParty.diaryLogs ?? []),
      ].slice(0, DIARY_LOG_RETENTION_LIMIT);
      updatedParties[action.partyIndex] = {
        ...currentParty,
        sideQuest: null,
        diaryLogs: nextDiaryLogs,
        hasUnreadDiary: true,
      };
      const trimmedParties = enforceGlobalDiaryLogRetention(updatedParties);
      return {
        ...state,
        parties: trimmedParties,
        global: {
          ...state.global,
          jewels: addJewelToInventory(state.global.jewels, key, rewardRank),
        },
      };
    }

    case 'SET_SIDE_QUEST_PROGRESS': {
      const currentParty = state.parties[action.partyIndex];
      if (!currentParty?.sideQuest) return state;
      const nextProgress = Math.max(0, Math.min(currentParty.sideQuest.target, Math.floor(action.progress)));
      if (nextProgress === currentParty.sideQuest.progress) return state;

      const updatedParties = [...state.parties];
      updatedParties[action.partyIndex] = {
        ...currentParty,
        sideQuest: {
          ...currentParty.sideQuest,
          progress: nextProgress,
        },
      };

      return {
        ...state,
        parties: updatedParties,
      };
    }

    case 'PROCESS_PENDING_PROFIT': {
      const currentParty = state.parties[action.partyIndex];
      if (!currentParty) return state;
      const totalProfit = Math.max(0, Math.floor(currentParty.pendingProfit ?? 0));
      const donation = Math.min(totalProfit, Math.max(0, Math.floor(action.donation)));
      const deposit = Math.min(totalProfit - donation, Math.max(0, Math.floor(action.deposit)));
      const updatedParties = [...state.parties];
      const deityName = normalizeDeityName(currentParty.deity.name);
      const deityDonations = {
        ...state.global.deityDonations,
        [deityName]: (state.global.deityDonations[deityName] ?? 0) + donation,
      };
      updatedParties[action.partyIndex] = {
        ...currentParty,
        pendingProfit: 0,
        deityGold: deityDonations[deityName],
        expeditionStats: {
          ...currentParty.expeditionStats,
          donatedGold: currentParty.expeditionStats.donatedGold + donation,
          savedGold: currentParty.expeditionStats.savedGold + deposit,
        },
      };
      return {
        ...state,
        parties: updatedParties,
        global: {
          ...state.global,
          gold: state.global.gold + deposit,
          deityDonations,
        },
      };
    }

    case 'EQUIP_ITEM': {
      const targetPartyIndex = action.partyIndex ?? state.selectedPartyIndex;
      const currentParty = state.parties[targetPartyIndex];
      if (!currentParty) return state;
      const charIndex = currentParty.characters.findIndex(c => c.id === action.characterId);
      if (charIndex === -1) return state;

      const character = currentParty.characters[charIndex];
      // SpecRef: 8.2.4 | Equipment management | three-state toggle(手動/補助/一任)
      const isManualEquipmentChange = typeof action.partyIndex === 'undefined';
      const nextAutoEquipmentMode = isManualEquipmentChange && character.autoEquipmentMode === 2
        ? 1
        : character.autoEquipmentMode;
      let newInventory = { ...state.global.inventory };
      let newJewels = { ...state.global.jewels };
      let newGold = state.global.gold;

      // Add old item back to inventory
      const oldItem = character.equipment[action.slotIndex];
      if (oldItem) {
        const addResult = addItemToInventory(newInventory, oldItem, newGold);
        newInventory = addResult.inventory;
        newGold = addResult.gold;
        if (oldItem.jewel) {
          newJewels = addJewelToInventory(newJewels, oldItem.jewel.key, oldItem.jewel.rank);
        }
      }

      // Remove new item from inventory and equip
      if (action.itemKey) {
        const variant = newInventory[action.itemKey];
        if (variant && variant.count > 0) {
          newInventory = removeItemFromInventory(newInventory, action.itemKey);
          const equippedCharacter = {
            ...replaceCharacterEquipment(character, action.slotIndex, { ...variant.item, jewel: null }),
            autoEquipmentMode: nextAutoEquipmentMode,
          };
          const newCharacters = [...currentParty.characters];
          newCharacters[charIndex] = equippedCharacter;

          const updatedParties = [...state.parties];
          updatedParties[targetPartyIndex] = {
            ...currentParty,
            characters: newCharacters
          };

          return {
            ...state,
            parties: updatedParties,
            global: { ...state.global, gold: newGold, inventory: newInventory, jewels: newJewels },
          };
        }
      }

      const unequippedCharacter = {
        ...replaceCharacterEquipment(character, action.slotIndex, null),
        autoEquipmentMode: nextAutoEquipmentMode,
      };
      const newCharacters = [...currentParty.characters];
      newCharacters[charIndex] = unequippedCharacter;

      const updatedParties = [...state.parties];
      updatedParties[targetPartyIndex] = {
        ...currentParty,
        characters: newCharacters
      };

      return {
        ...state,
        parties: updatedParties,
        global: { ...state.global, gold: newGold, inventory: newInventory, jewels: newJewels },
      };
    }

    case 'TOGGLE_EQUIPMENT_LOCK': {
      const currentParty = state.parties[state.selectedPartyIndex];
      if (!currentParty) return state;
      const charIndex = currentParty.characters.findIndex(c => c.id === action.characterId);
      if (charIndex === -1) return state;
      const character = currentParty.characters[charIndex];
      if (character.autoEquipmentMode !== 2) return state;
      const item = character.equipment[action.slotIndex];
      if (!item) return state;

      const toggledItem: Item = { ...item, isLocked: item.isLocked !== true };
      const newCharacters = [...currentParty.characters];
      newCharacters[charIndex] = replaceCharacterEquipment(character, action.slotIndex, toggledItem);

      const updatedParties = [...state.parties];
      updatedParties[state.selectedPartyIndex] = {
        ...currentParty,
        characters: newCharacters,
      };

      return {
        ...state,
        parties: updatedParties,
      };
    }

    case 'ATTACH_JEWEL': {
      const targetPartyIndex = action.partyIndex ?? state.selectedPartyIndex;
      const currentParty = state.parties[targetPartyIndex];
      if (!currentParty) return state;
      const charIndex = currentParty.characters.findIndex(c => c.id === action.characterId);
      if (charIndex === -1) return state;
      const character = currentParty.characters[charIndex];
      const item = character.equipment[action.slotIndex];
      if (!item) return state;
      if (!isJewelAllowedForCategory(item.category, action.jewelKey)) return state;

      const isRemovingCurrentJewel = item.jewel?.key === action.jewelKey && item.jewel.rank === action.rank;
      if (isRemovingCurrentJewel) {
        const newJewels = addJewelToInventory(state.global.jewels, action.jewelKey, action.rank);
        const replacedItem: Item = { ...item, jewel: null };
        const newCharacters = [...currentParty.characters];
        newCharacters[charIndex] = replaceCharacterEquipment(character, action.slotIndex, replacedItem);

        const updatedParties = [...state.parties];
        updatedParties[targetPartyIndex] = {
          ...currentParty,
          characters: newCharacters,
        };

        return {
          ...state,
          parties: updatedParties,
          global: { ...state.global, jewels: newJewels },
        };
      }

      if (getJewelOwnedCount(state.global.jewels, action.jewelKey, action.rank) <= 0) return state;

      let newJewels = removeJewelFromInventory(state.global.jewels, action.jewelKey, action.rank);
      if (item.jewel) {
        newJewels = addJewelToInventory(newJewels, item.jewel.key, item.jewel.rank);
      }
      const replacedItem: Item = { ...item, jewel: { key: action.jewelKey, rank: action.rank } };
      const newCharacters = [...currentParty.characters];
      newCharacters[charIndex] = replaceCharacterEquipment(character, action.slotIndex, replacedItem);

      const updatedParties = [...state.parties];
      updatedParties[targetPartyIndex] = {
        ...currentParty,
        characters: newCharacters,
      };

      return {
        ...state,
        parties: updatedParties,
        global: { ...state.global, jewels: newJewels },
      };
    }

    case 'UPDATE_CHARACTER': {
      const currentParty = state.parties[state.selectedPartyIndex];
      const charIndex = currentParty.characters.findIndex(c => c.id === action.characterId);
      if (charIndex === -1) return state;

      const oldChar = currentParty.characters[charIndex];
      const newCharacters = [...currentParty.characters];

      let newInventory = state.global.inventory;
      let newJewels = state.global.jewels;
      let newGold = state.global.gold;
      const nextCharacter = { ...oldChar, ...action.updates };
      const oldMaxEquipSlots = computeCharacterStats(oldChar, currentParty.level).maxEquipSlots;
      const nextMaxEquipSlots = computeCharacterStats(nextCharacter, currentParty.level).maxEquipSlots;
      let newEquipment = [...oldChar.equipment];

      if (nextMaxEquipSlots < oldMaxEquipSlots) {
        // Keep as many equipped items as possible by compacting into the surviving slots first,
        // then return only the overflow equipment to inventory.
        const keptEquipment = newEquipment.slice(0, nextMaxEquipSlots);
        const overflowCandidates = newEquipment.slice(nextMaxEquipSlots).filter((e): e is Item => e != null);

        for (let i = 0; i < keptEquipment.length && overflowCandidates.length > 0; i++) {
          if (keptEquipment[i] == null) {
            keptEquipment[i] = overflowCandidates.shift() ?? null;
          }
        }

        newEquipment = [...keptEquipment, ...Array.from({ length: newEquipment.length - nextMaxEquipSlots }, () => null)];

        newInventory = { ...state.global.inventory };
        newJewels = { ...newJewels };
        for (const item of overflowCandidates) {
          const addResult = addItemToInventory(newInventory, item, newGold);
          newInventory = addResult.inventory;
          newGold = addResult.gold;
          if (item.jewel) newJewels = addJewelToInventory(newJewels, item.jewel.key, item.jewel.rank);
        }
      }

      const oldCombatBonuses = getCharacterCombatBonusLevels(oldChar);
      const nextCombatBonuses = getCharacterCombatBonusLevels(nextCharacter);
      const lostMeleeAptitude = oldCombatBonuses.melee && !nextCombatBonuses.melee;
      const lostRangedAptitude = oldCombatBonuses.ranged && !nextCombatBonuses.ranged;
      const lostMagicAptitude = oldCombatBonuses.magic && !nextCombatBonuses.magic;

      if (lostMeleeAptitude || lostRangedAptitude || lostMagicAptitude) {
        newInventory = { ...newInventory };
        newJewels = { ...newJewels };
        for (let i = 0; i < newEquipment.length; i++) {
          const item = newEquipment[i];
          if (!item) continue;

          const shouldRemove = (lostMeleeAptitude && MELEE_CATEGORIES.has(item.category))
            || (lostRangedAptitude && RANGED_CATEGORIES.has(item.category))
            || (lostMagicAptitude && MAGIC_CATEGORIES.has(item.category));
          if (!shouldRemove) continue;

          const addResult = addItemToInventory(newInventory, item, newGold);
          newInventory = addResult.inventory;
          newGold = addResult.gold;
          if (item.jewel) newJewels = addJewelToInventory(newJewels, item.jewel.key, item.jewel.rank);

          newEquipment[i] = null;
        }
      }

      newCharacters[charIndex] = { ...oldChar, ...action.updates, equipment: newEquipment };

      const updatedParties = [...state.parties];
      updatedParties[state.selectedPartyIndex] = {
        ...currentParty,
        characters: newCharacters
      };

      return {
        ...state,
        parties: updatedParties,
        global: { ...state.global, gold: newGold, inventory: newInventory },
      };
    }

    case 'REORDER_PARTY_CHARACTER': {
      const currentParty = state.parties[state.selectedPartyIndex];
      const fromIndex = action.fromIndex;
      const toIndex = action.toIndex;

      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= currentParty.characters.length ||
        toIndex >= currentParty.characters.length ||
        fromIndex === toIndex
      ) {
        return state;
      }

      const reorderedCharacters = [...currentParty.characters];
      const [movedCharacter] = reorderedCharacters.splice(fromIndex, 1);
      reorderedCharacters.splice(toIndex, 0, movedCharacter);

      const updatedParties = [...state.parties];
      updatedParties[state.selectedPartyIndex] = {
        ...currentParty,
        characters: reorderedCharacters,
      };

      return {
        ...state,
        parties: updatedParties,
      };
    }

    case 'SELL_STACK': {
      const currentParty = state.parties[state.selectedPartyIndex];
      const variant = state.global.inventory[action.variantKey];
      if (!variant || variant.count <= 0 || variant.item.superRare >= 1) return state;

      const sellPrice = calculateSellPrice(variant.item) * variant.count;

      const newInventory = { ...state.global.inventory };
      newInventory[action.variantKey] = {
        ...variant,
        count: 0,
        status: 'sold',
      };

      const updatedParties = [...state.parties];
      updatedParties[state.selectedPartyIndex] = {
        ...currentParty
      };

      return {
        ...state,
        parties: updatedParties,
        global: { ...state.global, inventory: newInventory, gold: state.global.gold + sellPrice },
      };
    }

    case 'SELL_ALL_OWNED': {
      let totalSellPrice = 0;
      const newInventory = { ...state.global.inventory };

      const hasOwnedSuperRare = Object.values(state.global.inventory).some((variant) => (
        variant.status === 'owned' && variant.count > 0 && variant.item.superRare >= 1
      ));
      if (hasOwnedSuperRare) return state;

      for (const [variantKey, variant] of Object.entries(state.global.inventory)) {
        if (variant.status !== 'owned' || variant.count <= 0) continue;
        totalSellPrice += calculateSellPrice(variant.item) * variant.count;
        newInventory[variantKey] = {
          ...variant,
          count: 0,
          status: 'sold',
        };
      }

      if (totalSellPrice <= 0) return state;

      return {
        ...state,
        global: {
          ...state.global,
          inventory: newInventory,
          gold: state.global.gold + totalSellPrice,
        },
      };
    }

    case 'BUY_SHOP_ITEM': {
      const now = new Date();
      const globalState = applyShopIntimacyDecay(state.global, now);
      const baseItem = getItemById(action.itemId);
      const shopPrice = getShopItemPrice(action.itemId);
      if (!baseItem || globalState.gold < shopPrice) return state;

      const hourKey = getShopHourKey(now);
      const refreshCount = globalState.shopRefreshCounts[hourKey] ?? 0;
      const stockKey = getShopStockKey(now, refreshCount);
      const soldOutItemIds = globalState.shopPurchases[stockKey] ?? [];
      if (soldOutItemIds.includes(action.itemId)) return state;

      const guaranteedEnhancementResult = drawGuaranteedEnhancement(state.bags);
      const enhancement = guaranteedEnhancementResult.enhancement;
      let bags = guaranteedEnhancementResult.bags;

      bags = refillBagIfEmpty(bags, 'superRareBag');
      const { ticket: superRare, newBag: newSuperRareBag } = drawFromBag(bags.superRareBag);
      bags = { ...bags, superRareBag: newSuperRareBag };

      const purchasedItem: Item = {
        ...baseItem,
        enhancement,
        superRare,
      };
      const currentParty = state.parties[state.selectedPartyIndex];
      const autoSellMultiplier = getPartyCunningMultiplier(currentParty);
      const inventoryResult = addItemToInventory(
        globalState.inventory,
        purchasedItem,
        globalState.gold,
        autoSellMultiplier,
      );

      return {
        ...state,
        bags,
        global: {
          ...globalState,
          inventory: inventoryResult.inventory,
          gold: inventoryResult.gold - shopPrice,
          shopIntimacy: Math.min(99, globalState.shopIntimacy + 1),
          shopPurchases: {
            ...globalState.shopPurchases,
            [stockKey]: [...soldOutItemIds, action.itemId],
          },
        },
      };
    }


    case 'BUY_JEWEL_SHOP_ITEM': {
      const JEWEL_PRICE = 100;
      const JEWEL_STOCK_LIMIT = 5;
      const purchaseKey = `${action.jewelKey}:${Math.max(1, Math.min(8, Math.floor(action.rank)))}`;
      const purchasedCount = state.global.jewelShopPurchases[purchaseKey] ?? 0;
      if (state.global.gold < JEWEL_PRICE || purchasedCount >= JEWEL_STOCK_LIMIT) return state;

      const rank = Math.max(1, Math.min(8, Math.floor(action.rank)));
      return {
        ...state,
        global: {
          ...state.global,
          gold: state.global.gold - JEWEL_PRICE,
          jewels: addJewelToInventory(state.global.jewels, action.jewelKey, rank),
          jewelShopPurchases: {
            ...state.global.jewelShopPurchases,
            [purchaseKey]: purchasedCount + 1,
          },
        },
      };
    }

    case 'REFRESH_SHOP_LINEUP': {
      const now = new Date();
      const globalState = applyShopIntimacyDecay(state.global, now);
      const hourKey = getShopHourKey(now);
      const currentRefreshCount = globalState.shopRefreshCounts[hourKey] ?? 0;
      const refreshPrice = getShopRefreshPrice(currentRefreshCount);
      if (globalState.gold < refreshPrice) return state;

      return {
        ...state,
        global: {
          ...globalState,
          gold: globalState.gold - refreshPrice,
          shopIntimacy: Math.min(99, globalState.shopIntimacy + 2),
          shopRefreshCounts: {
            ...globalState.shopRefreshCounts,
            [hourKey]: currentRefreshCount + 1,
          },
        },
      };
    }

    case 'SET_VARIANT_STATUS': {
      const currentParty = state.parties[state.selectedPartyIndex];
      const variant = state.global.inventory[action.variantKey];
      if (!variant) return state;

      const newInventory = { ...state.global.inventory };
      newInventory[action.variantKey] = {
        ...variant,
        status: action.status,
      };

      const updatedParties = [...state.parties];
      updatedParties[state.selectedPartyIndex] = {
        ...currentParty
      };

      return {
        ...state,
        parties: updatedParties,
        global: { ...state.global, inventory: newInventory },
      };
    }

    case 'MARK_DIARY_LOG_SEEN': {
      const updatedParties = state.parties.map((party) => {
        const nextDiaryLogs = party.diaryLogs.map((diaryLog) => (
          diaryLog.id === action.logId
            ? { ...diaryLog, isRead: true }
            : diaryLog
        ));

        return {
          ...party,
          diaryLogs: nextDiaryLogs,
          hasUnreadDiary: nextDiaryLogs.some((diaryLog) => !diaryLog.isRead),
        };
      });

      return {
        ...state,
        parties: updatedParties,
      };
    }

    case 'MARK_ALL_DIARY_LOGS_SEEN': {
      const updatedParties = state.parties.map((party) => {
        const nextDiaryLogs = party.diaryLogs.map((diaryLog) => ({
          ...diaryLog,
          isRead: true,
        }));

        return {
          ...party,
          diaryLogs: nextDiaryLogs,
          hasUnreadDiary: false,
        };
      });

      return {
        ...state,
        parties: updatedParties,
      };
    }

    case 'UPDATE_DIARY_SETTINGS': {
      const currentParty = state.parties[action.partyIndex];
      if (!currentParty) return state;

      const updatedParties = [...state.parties];
      updatedParties[action.partyIndex] = {
        ...currentParty,
        diarySettings: getDiarySettingsWithDefaults({
          ...currentParty.diarySettings,
          ...action.settings,
        }),
      };

      return {
        ...state,
        parties: updatedParties,
      };
    }

    case 'SIMULATE_AFK': {
      const gameMode = action.gameMode ?? 'm.kemo';
      if (!action.isAutoRepeatEnabled) return state;

      const cappedElapsedMs = Math.max(0, Math.min(action.elapsedMs, AFK_MAX_SIMULATION_MS));
      if (cappedElapsedMs < 1000) return state;

      const resolvedCycleDurationScale = Math.max(0.001, action.cycleDurationScale ?? getCycleDurationScale());
      // SpecRef: 5.1 | PROGRESS | Cycle
      const approxCycleDurationMs = Math.max(1, Math.ceil(BASE_STEP_DURATION_MS * APPROX_CYCLE_STEP_COUNT * resolvedCycleDurationScale));
      const runCount = Math.max(0, Math.floor(cappedElapsedMs / approxCycleDurationMs));
      if (runCount <= 0) return state;

      let workingState = state;
      const simulationEndAt = action.simulatedEndAt ?? Date.now();
      const simulationStartAt = simulationEndAt - cappedElapsedMs;
      const partyTimestampStepMs = 1_000;

      for (let runIndex = 0; runIndex < runCount; runIndex++) {
        const cycleCompletedAt = simulationStartAt + ((runIndex + 1) * approxCycleDurationMs);
        for (let partyIndex = 0; partyIndex < workingState.parties.length; partyIndex++) {
          const simulatedAt = Math.min(
            simulationEndAt,
            cycleCompletedAt + (partyIndex * partyTimestampStepMs)
          );

          const partyForAfkChunk = workingState.parties[partyIndex];
          const shouldTriggerAfkGodsBattle = partyForAfkChunk
            ? (
              // SpecRef: 7.1.2 | AUTO progress logic | AFK (during state.reactivate)
              normalizePartyCondition(partyForAfkChunk.condition) >= 100
              && !partyForAfkChunk.sideQuest
              && isGodsBattleAvailable(partyForAfkChunk, partyForAfkChunk.selectedDungeonId)
            )
            : false;

          workingState = gameReducer(workingState, {
            type: 'RUN_EXPEDITION',
            partyIndex,
            simulatedAt,
            gameMode,
            isAfkSimulation: true,
            triggerGodsBattle: shouldTriggerAfkGodsBattle,
          });
          workingState = gameReducer(workingState, { type: 'FINALIZE_DIARY_LOG', partyIndex, isAfkSimulation: true });

          const currentParty = workingState.parties[partyIndex];
          if (!currentParty) continue;
          const activeParty = workingState.parties[partyIndex];
          if (!activeParty) continue;

          if (activeParty.sideQuest && TIME_BASED_SIDE_QUEST_TYPES.has(activeParty.sideQuest.type)) {
            const approximateProgress = getApproxAfkTimeQuestProgressPerCycle(
              activeParty,
              approxCycleDurationMs,
              resolvedCycleDurationScale,
            );
            if (approximateProgress > 0) {
              workingState = gameReducer(workingState, {
                type: 'ADVANCE_SIDE_QUEST',
                partyIndex,
                amount: approximateProgress,
                simulatedAt,
              });
            }
          }

          workingState = advanceAfkLogSideQuestProgress(workingState, partyIndex, simulatedAt);

          const postCycleParty = workingState.parties[partyIndex];
          if (postCycleParty) {
            const { partyStats: postCycleStats } = computePartyStats(postCycleParty);
            const missingHp = Math.max(0, postCycleStats.hp - (postCycleParty.currentHp ?? 0));
            if (missingHp > 0) {
              workingState = gameReducer(workingState, {
                type: 'HEAL_PARTY_HP',
                partyIndex,
                amount: missingHp,
              });
            }
          }

          if (postCycleParty && !postCycleParty.sideQuest && !hasActiveNonGodBattleLootGateCondition(postCycleParty)) {
            workingState = gameReducer(workingState, {
              type: 'ROLL_SIDE_QUEST',
              partyIndex,
              rolledTier: postCycleParty.selectedDungeonId,
              simulatedAt,
            });
          }

          const latestParty = workingState.parties[partyIndex];
          // SpecRef: 5.1.2 | Side Quest | AFK handling
          if (
            latestParty?.sideQuest
            && simulatedAt >= getScaledSideQuestExpiresAt(latestParty.sideQuest, resolvedCycleDurationScale)
          ) {
            workingState = gameReducer(workingState, { type: 'CANCEL_SIDE_QUEST', partyIndex });
          }
        }
      }

      const clampedParties = workingState.parties.map((party) => ({
        ...party,
        // SpecRef: 7.1.2 | AUTO progress logic | AFK (during state.reactivate)
        condition: normalizePartyCondition(party.condition),
      }));

      workingState = {
        ...workingState,
        parties: clampedParties,
      };

      return workingState;
    }

    case 'MARK_ITEMS_SEEN': {
      const currentParty = state.parties[state.selectedPartyIndex];
      const newInventory: InventoryRecord = {};
      for (const [key, variant] of Object.entries(state.global.inventory)) {
        newInventory[key] = { ...variant, isNew: false };
      }

      const updatedParties = [...state.parties];
      updatedParties[state.selectedPartyIndex] = {
        ...currentParty
      };

      return {
        ...state,
        parties: updatedParties,
        global: { ...state.global, inventory: newInventory },
      };
    }

    case 'RESET_GAME': {
      // Clear localStorage
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {
        console.error('Failed to clear saved state:', e);
      }
      // Return fresh state (not from localStorage)
      return {
        scene: 'home' as const,
        global: {
          gold: 200,
          inventory: createStarterInventory(),
          jewels: createStarterJewelInventory(),
          deityDonations: {},
          unlockedDeities: [...DEFAULT_UNLOCKED_DEITIES],
          shopPurchases: {},
          jewelShopPurchases: {},
          shopRefreshCounts: {},
          shopIntimacy: 0,
          shopIntimacyLastDecayAt: Date.now(),
        },
        parties: [createInitialParty()],
        selectedPartyIndex: 0,
        bags: {
          commonRewardBag: createCommonRewardBag(),
          commonEnhancementBag: createCommonEnhancementBag(),
          uncommonRewardBag: createUncommonRewardBag(),
          eliteRareRewardBag: createEliteRareRewardBag(),
          bossRareRewardBag: createBossRareRewardBag(),
          mythicRareRewardBag: createMythicRareRewardBag(),
          enhancementBag: createEnhancementBag(),
          superRareBag: createSuperRareBag(),
          physicalThreatBag: createPhysicalThreatBag(),
          magicalThreatBag: createMagicalThreatBag(),
          sideQuestBag: createSideQuestBag(),
        },
        buildNumber: BUILD_NUMBER,
      };
    }

    case 'IMPORT_GAME_STATE': {
      const hydrated = hydrateGameState(action.state);
      const normalizedParties = hydrated.parties.map((party) => ({
        ...party,
        level: typeof party.level === 'number' ? party.level : 1,
        experience: typeof party.experience === 'number' ? party.experience : 0,
        sleepinessOfPartyBag: normalizeSleepinessPartyBag(party.sleepinessOfPartyBag ?? createSleepinessPartyBag()),
        currentSleepiness: normalizeSleepinessState(party.currentSleepiness),
      }));
      const defaultParties = createDefaultParties();
      const unlockedDeities = [...DEFAULT_UNLOCKED_DEITIES];
      let unlockedPartySlots = Math.max(1, Math.min(6, normalizedParties.length || 1));
      for (const party of normalizedParties) {
        const allExpeditionLogs = [
          ...(party.lastExpeditionLog ? [party.lastExpeditionLog] : []),
          ...party.diaryLogs.flatMap((log) => (log.expeditionLog ? [log.expeditionLog] : [])),
          ...(party.pendingDiaryLog?.expeditionLog ? [party.pendingDiaryLog.expeditionLog] : []),
        ];
        const unlockedState = getUnlockedStateFromEntries(allExpeditionLogs, unlockedPartySlots);
        unlockedPartySlots = Math.max(unlockedPartySlots, unlockedState.unlockedPartySlots);
      }
      while (normalizedParties.length < unlockedPartySlots) {
        const nextDefaultParty = createUnlockedPartyWithAvailableDeity(defaultParties[normalizedParties.length], normalizedParties);
        normalizedParties.push(nextDefaultParty);
      }
      const trimmedParties = normalizedParties.slice(0, unlockedPartySlots).map((party) => ({
        ...party,
        characters: party.characters.map((character) => ({
          ...character,
          autoEquipmentMode: normalizeCharacterAutoEquipmentMode(character.autoEquipmentMode),
        })),
      }));
      const normalizedSelectedPartyIndex = Math.min(
        Math.max(0, hydrated.selectedPartyIndex),
        Math.max(0, trimmedParties.length - 1),
      );

      return {
        ...hydrated,
        global: {
          ...hydrated.global,
          unlockedDeities: unlockedDeities,
        },
        parties: trimmedParties,
        selectedPartyIndex: normalizedSelectedPartyIndex,
        bags: normalizeImportedBags(hydrated.bags),
        buildNumber: BUILD_NUMBER,
      };
    }


    case 'UNLOCK_PARTY_SLOT': {
      if (state.parties.length >= 6) return state;
      const defaultParties = createDefaultParties();
      const nextDefaultParty = createUnlockedPartyWithAvailableDeity(defaultParties[state.parties.length], state.parties);
      return {
        ...state,
        parties: [...state.parties, nextDefaultParty],
      };
    }

    case 'RESET_COMMON_BAGS': {
      return {
        ...state,
        bags: {
          ...state.bags,
          commonRewardBag: createCommonRewardBag(),
          commonEnhancementBag: createCommonEnhancementBag(),
        },
      };
    }

    case 'RESET_UNIQUE_BAGS': {
      return {
        ...state,
        bags: {
          ...state.bags,
          commonRewardBag: createCommonRewardBag(),
          uncommonRewardBag: createUncommonRewardBag(),
          eliteRareRewardBag: createEliteRareRewardBag(),
          bossRareRewardBag: createBossRareRewardBag(),
          mythicRareRewardBag: createMythicRareRewardBag(),
          enhancementBag: createEnhancementBag(),
          sideQuestBag: createSideQuestBag(),
        },
      };
    }

    case 'RESET_SUPER_RARE_BAG': {
      return {
        ...state,
        bags: {
          ...state.bags,
          superRareBag: createSuperRareBag(),
        },
      };
    }

    case 'RESET_SIDE_QUEST_BAG': {
      return {
        ...state,
        bags: {
          ...state.bags,
          sideQuestBag: createSideQuestBag(),
        },
      };
    }

    default:
      return state;
  }
}

// SpecRef: 5.1.1 | Party State Machine | Time-Based Progress Handling (Online + AFK)
export function useGameState() {
  const [state, dispatch] = useReducer(gameReducer, null, createInitialState);
  const [notifications, setNotifications] = useState<GameNotification[]>([]);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveStateRef = useRef<GameState | null>(null);
  const lastSavedAtRef = useRef(0);

  const flushPendingSave = useCallback(() => {
    if (!pendingSaveStateRef.current) return;
    saveState(pendingSaveStateRef.current);
    pendingSaveStateRef.current = null;
    lastSavedAtRef.current = Date.now();
  }, []);

  // Save immediately for normal-paced play, while coalescing rapid update bursts (e.g. AFK recovery).
  useEffect(() => {
    pendingSaveStateRef.current = state;

    const now = Date.now();
    const msSinceLastSave = now - lastSavedAtRef.current;

    if (msSinceLastSave >= STATE_SAVE_THROTTLE_MS) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      flushPendingSave();
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    const delayMs = Math.max(0, STATE_SAVE_THROTTLE_MS - msSinceLastSave);
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null;
      flushPendingSave();
    }, delayMs);
  }, [state, flushPendingSave]);

  useEffect(() => {
    const flushOnHidden = () => {
      if (document.visibilityState === 'hidden') {
        flushPendingSave();
      }
    };

    window.addEventListener('beforeunload', flushPendingSave);
    document.addEventListener('visibilitychange', flushOnHidden);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      window.removeEventListener('beforeunload', flushPendingSave);
      document.removeEventListener('visibilitychange', flushOnHidden);
      flushPendingSave();
    };
  }, [flushPendingSave]);

  // Add notification helper
  // For 'stat' category, dismiss previous stat notifications first
  const addNotification = useCallback((
    message: string,
    style: NotificationStyle = 'normal',
    category: NotificationCategory = 'item',
    isPositive?: boolean,
    options?: { rarity?: 'common' | 'uncommon' | 'eliteRare' | 'bossRare' | 'mythicRare'; isSuperRareItem?: boolean }
  ) => {
    const notification: GameNotification = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message,
      style,
      category,
      isPositive,
      rarity: options?.rarity,
      isSuperRareItem: options?.isSuperRareItem,
      createdAt: Date.now(),
    };
    setNotifications(prev => {
      // For stat notifications, dismiss previous stat notifications
      const filtered = category === 'stat'
        ? prev.filter(n => n.category !== 'stat')
        : prev;
      return [...filtered, notification];
    });
  }, []);

  // Add multiple stat notifications at once (clears previous stat notifications)
  const addStatNotifications = useCallback((
    changes: Array<{ message: string; isPositive: boolean }>
  ) => {
    const now = Date.now();
    const newNotifications: GameNotification[] = changes.map((change, index) => ({
      id: `${now}-${index}-${Math.random().toString(36).substr(2, 9)}`,
      message: change.message,
      style: 'normal' as NotificationStyle,
      category: 'stat' as NotificationCategory,
      isPositive: change.isPositive,
      createdAt: now,
    }));
    setNotifications(prev => {
      // Clear all previous stat notifications
      const filtered = prev.filter(n => n.category !== 'stat');
      return [...filtered, ...newNotifications];
    });
  }, []);

  // Dismiss notification helper
  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Dismiss all notifications
  const dismissAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const actions = {
    selectParty: useCallback((partyIndex: number) => {
      dispatch({ type: 'SELECT_PARTY', partyIndex });
    }, []),

    selectDungeon: useCallback((partyIndex: number, dungeonId: number) => {
      dispatch({ type: 'SELECT_DUNGEON', partyIndex, dungeonId });
    }, []),

    setExpeditionDepthLimit: useCallback((partyIndex: number, depthLimit: ExpeditionDepthLimit) => {
      dispatch({ type: 'SET_EXPEDITION_DEPTH_LIMIT', partyIndex, depthLimit });
    }, []),

    setExpeditionDifficultyOffset: useCallback((partyIndex: number, difficultyOffset: number) => {
      dispatch({ type: 'SET_EXPEDITION_DIFFICULTY_OFFSET', partyIndex, difficultyOffset });
    }, []),

    resetExpeditionStats: useCallback((partyIndex: number) => {
      dispatch({ type: 'RESET_EXPEDITION_STATS', partyIndex });
    }, []),

    updatePartyDeity: useCallback((partyIndex: number, deityName: string) => {
      dispatch({ type: 'UPDATE_PARTY_DEITY', partyIndex, deityName });
    }, []),

    runExpedition: useCallback((partyIndex: number, gameMode: GameMode = 'm.kemo', triggerGodsBattle: boolean = false, simulatedAt?: number) => {
      dispatch({ type: 'RUN_EXPEDITION', partyIndex, gameMode, triggerGodsBattle, simulatedAt });
    }, []),

    finalizeDiaryLog: useCallback((partyIndex: number) => {
      dispatch({ type: 'FINALIZE_DIARY_LOG', partyIndex });
    }, []),

    healPartyHp: useCallback((partyIndex: number, amount: number) => {
      dispatch({ type: 'HEAL_PARTY_HP', partyIndex, amount });
    }, []),

    clearPendingProfit: useCallback((partyIndex: number) => {
      dispatch({ type: 'CLEAR_PENDING_PROFIT', partyIndex });
    }, []),

    processPendingProfit: useCallback((partyIndex: number, donation: number, deposit: number) => {
      dispatch({ type: 'PROCESS_PENDING_PROFIT', partyIndex, donation, deposit });
    }, []),

    spendPendingProfit: useCallback((partyIndex: number, amount: number) => {
      dispatch({ type: 'SPEND_PENDING_PROFIT', partyIndex, amount });
    }, []),

    rollSideQuest: useCallback((partyIndex: number, rolledTier: number, simulatedAt?: number) => {
      dispatch({ type: 'ROLL_SIDE_QUEST', partyIndex, rolledTier, simulatedAt });
    }, []),

    rollPartySleepiness: useCallback((partyIndex: number) => {
      dispatch({ type: 'ROLL_PARTY_SLEEPINESS', partyIndex });
    }, []),

    cancelSideQuest: useCallback((partyIndex: number) => {
      dispatch({ type: 'CANCEL_SIDE_QUEST', partyIndex });
    }, []),

    advanceSideQuest: useCallback((partyIndex: number, amount: number, simulatedAt?: number) => {
      dispatch({ type: 'ADVANCE_SIDE_QUEST', partyIndex, amount, simulatedAt });
    }, []),

    setSideQuestProgress: useCallback((partyIndex: number, progress: number) => {
      dispatch({ type: 'SET_SIDE_QUEST_PROGRESS', partyIndex, progress });
    }, []),

    equipItem: useCallback((characterId: number, slotIndex: number, itemKey: string | null, partyIndex?: number) => {
      dispatch({ type: 'EQUIP_ITEM', characterId, slotIndex, itemKey, partyIndex });
    }, []),

    toggleEquipmentLock: useCallback((characterId: number, slotIndex: number) => {
      dispatch({ type: 'TOGGLE_EQUIPMENT_LOCK', characterId, slotIndex });
    }, []),

    attachJewel: useCallback((characterId: number, slotIndex: number, jewelKey: 'might' | 'arcana' | 'fort' | 'ward' | 'shade' | 'focus', rank: number, partyIndex?: number) => {
      dispatch({ type: 'ATTACH_JEWEL', characterId, slotIndex, jewelKey, rank, partyIndex });
    }, []),

    updateCharacter: useCallback((characterId: number, updates: Partial<Character>) => {
      dispatch({ type: 'UPDATE_CHARACTER', characterId, updates });
    }, []),

    reorderPartyCharacter: useCallback((fromIndex: number, toIndex: number) => {
      dispatch({ type: 'REORDER_PARTY_CHARACTER', fromIndex, toIndex });
    }, []),

    sellStack: useCallback((variantKey: string) => {
      dispatch({ type: 'SELL_STACK', variantKey });
    }, []),

    sellAllOwned: useCallback(() => {
      dispatch({ type: 'SELL_ALL_OWNED' });
    }, []),

    buyShopItem: useCallback((itemId: number) => {
      dispatch({ type: 'BUY_SHOP_ITEM', itemId });
    }, []),

    buyJewelShopItem: useCallback((jewelKey: 'might' | 'arcana' | 'fort' | 'ward' | 'shade' | 'focus', rank: number) => {
      dispatch({ type: 'BUY_JEWEL_SHOP_ITEM', jewelKey, rank });
    }, []),

    refreshShopLineup: useCallback(() => {
      dispatch({ type: 'REFRESH_SHOP_LINEUP' });
    }, []),

    setVariantStatus: useCallback((variantKey: string, status: 'notown') => {
      dispatch({ type: 'SET_VARIANT_STATUS', variantKey, status });
    }, []),

    markItemsSeen: useCallback(() => {
      dispatch({ type: 'MARK_ITEMS_SEEN' });
    }, []),

    markDiaryLogSeen: useCallback((logId: string) => {
      dispatch({ type: 'MARK_DIARY_LOG_SEEN', logId });
    }, []),

    markAllDiaryLogsSeen: useCallback(() => {
      dispatch({ type: 'MARK_ALL_DIARY_LOGS_SEEN' });
    }, []),

    updateDiarySettings: useCallback((partyIndex: number, settings: Partial<DiarySettings>) => {
      dispatch({ type: 'UPDATE_DIARY_SETTINGS', partyIndex, settings });
    }, []),

    simulateAfk: useCallback((elapsedMs: number, isAutoRepeatEnabled: boolean, gameMode: GameMode = 'm.kemo', simulatedEndAt?: number, cycleDurationScale?: number) => {
      dispatch({ type: 'SIMULATE_AFK', elapsedMs, isAutoRepeatEnabled, gameMode, simulatedEndAt, cycleDurationScale });
    }, []),

    resetGame: useCallback(() => {
      dispatch({ type: 'RESET_GAME' });
    }, []),

    importGameState: useCallback((nextState: GameState) => {
      dispatch({ type: 'IMPORT_GAME_STATE', state: nextState });
    }, []),

    resetCommonBags: useCallback(() => {
      dispatch({ type: 'RESET_COMMON_BAGS' });
    }, []),

    resetUniqueBags: useCallback(() => {
      dispatch({ type: 'RESET_UNIQUE_BAGS' });
    }, []),

    resetSuperRareBag: useCallback(() => {
      dispatch({ type: 'RESET_SUPER_RARE_BAG' });
    }, []),

    resetSideQuestBag: useCallback(() => {
      dispatch({ type: 'RESET_SIDE_QUEST_BAG' });
    }, []),

    unlockPartySlot: useCallback(() => {
      dispatch({ type: 'UNLOCK_PARTY_SLOT' });
    }, []),

    addNotification,
    addStatNotifications,
    dismissNotification,
    dismissAllNotifications,
  };

  return { state, actions, bags: state.bags, notifications };
}
