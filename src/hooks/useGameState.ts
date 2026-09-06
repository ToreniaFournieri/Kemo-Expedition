import { createApiRuntime, createEvaluation } from '../game/experimentalApiSession';
import { hasNewAvailability } from '../game/inventoryAvailability';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { RuntimeGameMode } from '../game/runtimeGameMode';
import {
  GameState,
  Item,
  Character,
  Party,
  SleepinessState,
  CharacterGender,
  RaceId,
  ClassId,
  PredispositionId,
  LineageId,
  ExpeditionLog,
  DiaryLog,
  DiarySettings,
  ExpeditionLogEntry,
  InventoryRecord,
  JewelInventory,
  getVariantKey,
  GameNotification,
  NotificationStyle,
  NotificationCategory,
  EnemyDef,
  ExpeditionDepthLimit,
  ExpeditionDestinationMode,
  ExpeditionSimulationResult,
  SavedEquipmentSet,
} from '../types';
import {
  computeCharacterHpContribution,
  computePartyMaxHp,
  computePartyStats,
  createPartyMaxHpLedger,
  updatePartyMaxHpLedger,
  type ComputedPartyStatus,
  type PartyMaxHpLedger,
} from '../game/partyComputation';
import { getPartyUnlockSlotForBossVictory } from '../game/expeditionTransaction';
import {
  createExpeditionForecastResolution,
  type ExpeditionForecastResolution,
  type ExpeditionResolutionMode,
  type RunExpeditionApplicationCommand,
} from '../game/expeditionApplicationContract';
import { runExpeditionApplication } from '../game/expeditionApplication';
import {
  createDefaultExpeditionApplicationAdapterFactory,
  DEFAULT_UNLOCKED_DEITIES,
} from '../game/expeditionApplicationAdapters';
import { getDiarySettingsWithDefaults } from '../game/diarySettings';
import { normalizeImportedBags } from '../game/bagMigration';
import { migrateLegacyInventory } from '../game/inventoryMigration';
import {
  addItemToInventory,
  grantItemToInventory,
  removeItemFromInventory,
  sellAllOwnedInventory,
  sellInventoryStack,
  setInventoryVariantStatus,
} from '../game/inventoryMutation';
import { EXPEDITION_SIMULATION_RUN_COUNT } from '../game/expeditionSimulation';
import { recordRunExpeditionStatusAuthority } from '../game/battle';
import {
  normalizeRevealedGlossaryAbilityIds,
  normalizeRevealedGlossaryTerrainKeys,
} from '../game/glossaryDisclosure';
import { gameplayRandom, createApiRandom, withGameplayRandomSource } from '../game/gameplayRandom';
import { replaceCharacterEquipment } from '../game/equipment';
import {
  applyEquipmentSet,
  MAX_SAVED_EQUIPMENT_SETS,
  normalizeSavedEquipmentSets,
  type EquipmentSetLoadMode,
} from '../game/equipmentSets';
import { DUNGEONS, getDungeonById } from '../data/dungeons';
import { ENEMIES } from '../data/enemies';
import { getDifficultyOffsetMax, normalizeDifficultyOffset } from '../game/difficultyOffset';
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
  createCommonSuperRareBag,
  createRareSuperRareBag,
  createPhysicalThreatBag,
  createMagicalThreatBag,
  createSideQuestBag,
  createSleepinessPartyBag,
  normalizeSleepinessPartyBag,
  initializeBags,
} from '../game/bags';
import { getItemById } from '../data/items';
import { hydrateGameState } from '../game/saveCodec';
import type {
  AutoEquipmentHpStrategy,
  AutoEquipmentProfileAction,
  AutoEquipmentReducerAttribution,
  AutoEquipmentStateStrategy,
} from '../game/autoEquipmentAttribution';
import { INSTANT_EXPEDITION_MAX_STOCK, consumeInstantExpeditionStock, getInstantExpeditionChargeState } from '../game/instantExpedition';
import { DEITY_OPTIONS, getDeityDepositMultiplier, getDeityPartyHpMultiplier, isNoFaithDeity, normalizeDeityName } from '../game/deity';
import { RACES } from '../data/races';
import { CLASSES } from '../data/classes';
import { PREDISPOSITIONS } from '../data/predispositions';
import { LINEAGES } from '../data/lineages';
import {
  getEliteGateKey,
  getBossGateKey,
  isClearGateUnlocked,
  isDungeonEntryUnlocked,
  isGodsBattleAvailable,
} from '../game/clearGate';
import { resolveSideQuestOutcome } from '../game/expeditionEffects/sideQuestOutcome';
import { getXpToNextLevel } from '../game/partyLevel';
import { MAX_LEVEL } from '../types';
import { createEnvironmentStorageKey, getEnvironmentId } from '../game/environment';
import { addDiaryLogs } from '../game/diary';
import { computeCharacterStats } from '../game/characterComputation';
import {
  getShopItemPrice,
  getShopHourKey,
  getShopStockKey,
  getShopRefreshPrice,
  countElapsedShopRefreshes,
  getCurrentShopRefreshDate,
} from '../game/shop';
import { getAltarLevel, getAltarVictoriesForEnemyType, getEnemyFormPranaCost, getEnemyRequiredAltarLevel, getSuperRareItemPrana } from '../game/prana';
import {
  addJewelToInventory,
  createStarterJewelInventory,
  getJewelOwnedCount,
  isJewelAllowedForCategory,
  removeJewelFromInventory,
  getJewelNameByRank,
} from '../game/jewel';
import { decodePersistedState } from '../game/storageCompression';
import { hydrateLogSegmentedSave, removeAllDiaryLogRecords } from '../game/logSegmentedSave';
import {
  createBrowserPersistenceWorker,
  PersistenceCoordinator,
  type PersistenceTelemetryEvent,
} from '../game/savePersistence';
import { Language, ensureLanguageLoaded, normalizeLanguage, persistLanguage, resolveInitialLanguage, setLanguage as setActiveLanguage, t, translate } from '../i18n';
import { AFK_MAX_EFFECTIVE_ELAPSED_MS, getAfkOperationWindow, getApproxAfkCycleDurationMs, type AfkSimulationBatchSlice } from '../game/afkScheduler';
import {
  AFK_CHUNK_CYCLE_COUNT,
  commitAfkPartyChunk,
  type AfkInventoryDelta,
  type AfkPartyChunkResult,
  type AfkWorkerPhaseAttribution,
  type AfkWorkerSimulationStrategy,
} from '../game/afkChunkCoordinator';
import { afkRuntimeTrace } from '../game/afkRuntimeTrace';
import { memoryMonitor } from '../game/memoryMonitoring';
import { BASE_STEP_DURATION_MS } from '../game/progressTiming';
import { GameStateAuthority, type AuthorityReceipt } from '../game/gameStateAuthority';
import { useAfkCoordinatorAuthorityCandidate } from '../game/afkLiveProfile';

const BUILD_NUMBER = __BUILD_NUMBER__;
const AFK_LIVE_PROFILE_BUILD_ENABLED = typeof __AFK_LIVE_PROFILE_ENABLED__ !== 'undefined'
  && __AFK_LIVE_PROFILE_ENABLED__;
const STORAGE_KEY = createEnvironmentStorageKey('kemo-expedition-save');
const AFK_MAX_SIMULATION_MS = AFK_MAX_EFFECTIVE_ELAPSED_MS;
const STATE_SAVE_THROTTLE_MS = 5000;
const DEBUG_CYCLE_DURATION_SCALE = 0.05;
const TIME_BASED_SIDE_QUEST_TYPES = new Set(['q.exercise', 'q.healing', 'q.AFK']);
function generateUserId(): string {
  // SpecRef: 1.2 | CONSTANTS_GLOBAL | User ID (UUID)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `uuid-${Date.now()}-${Math.floor(gameplayRandom() * 1_000_000_000)}`;
}
const APPROX_CYCLE_STEP_COUNT = 30;
const SAVE_LOAD_WARNING_KEY = 'save.loadWarning';

type SideQuestScaleByLevel = {
  1: number;
  2: number;
  3: number;
  4: number;
};

type SideQuestRuntimeDef = {
  type: string;
  shortTextKey: string;
  baseMin: number;
  baseMax: number;
  deadlineHours: number;
  scaleByLevel: SideQuestScaleByLevel;
};

const SIDE_QUEST_RUNTIME_DEFS: Record<number, SideQuestRuntimeDef> = {
  1: { type: 'q.squander', shortTextKey: 'sideQuest.squander.short', baseMin: 100, baseMax: 400, deadlineHours: 16, scaleByLevel: { 1: 1, 2: 1.4, 3: 1.8, 4: 2.2 } },
  2: { type: 'q.sleeping', shortTextKey: 'sideQuest.sleeping.short', baseMin: 1, baseMax: 4, deadlineHours: 12, scaleByLevel: { 1: 1, 2: 1, 3: 1, 4: 1 } },
  3: { type: 'q.exercise', shortTextKey: 'sideQuest.exercise.short', baseMin: 5, baseMax: 15, deadlineHours: 16, scaleByLevel: { 1: 1, 2: 1.3, 3: 1.5, 4: 2.0 } },
  4: { type: 'q.embezzlement', shortTextKey: 'sideQuest.embezzlement.short', baseMin: 25, baseMax: 100, deadlineHours: 16, scaleByLevel: { 1: 1, 2: 1.4, 3: 1.8, 4: 2.2 } },
  5: { type: 'q.donation', shortTextKey: 'sideQuest.donation.short', baseMin: 100, baseMax: 500, deadlineHours: 12, scaleByLevel: { 1: 1, 2: 1.4, 3: 1.8, 4: 2.2 } },
  6: { type: 'q.healing', shortTextKey: 'sideQuest.healing.short', baseMin: 5, baseMax: 20, deadlineHours: 16, scaleByLevel: { 1: 1, 2: 1.3, 3: 1.5, 4: 2.0 } },
  7: { type: 'q.AFK', shortTextKey: 'sideQuest.afk.short', baseMin: 30, baseMax: 120, deadlineHours: 0, scaleByLevel: { 1: 1, 2: 1.3, 3: 1.5, 4: 2.0 } },
  8: { type: 'q.treasure-super-rare', shortTextKey: 'sideQuest.treasureSuperRare.short', baseMin: 1, baseMax: 1, deadlineHours: 24, scaleByLevel: { 1: 1, 2: 1, 3: 1, 4: 1 } },
  9: { type: 'q.treasure-boss-rare', shortTextKey: 'sideQuest.treasureBossRare.short', baseMin: 1, baseMax: 4, deadlineHours: 16, scaleByLevel: { 1: 1, 2: 1, 3: 1, 4: 1 } },
  10: { type: 'q.poor-kid', shortTextKey: 'sideQuest.poorKid.short', baseMin: 10, baseMax: 30, deadlineHours: 9, scaleByLevel: { 1: 1, 2: 1.3, 3: 1.5, 4: 2.0 } },
  11: { type: 'q.consecutive-wins', shortTextKey: 'sideQuest.consecutiveWins.short', baseMin: 5, baseMax: 20, deadlineHours: 16, scaleByLevel: { 1: 1, 2: 1.3, 3: 1.5, 4: 2.0 } },
  12: { type: 'q.losers', shortTextKey: 'sideQuest.losers.short', baseMin: 1, baseMax: 1, deadlineHours: 9, scaleByLevel: { 1: 1, 2: 1, 3: 1, 4: 1 } },
  13: { type: 'q.savings', shortTextKey: 'sideQuest.savings.short', baseMin: 200, baseMax: 1000, deadlineHours: 16, scaleByLevel: { 1: 1, 2: 1.4, 3: 1.8, 4: 2.2 } },
};

function getSideQuestLevelFromExpId(expId: number): 1 | 2 | 3 | 4 {
  // SpecRef: 5.1.2 | Side Quest | Side quest difficulty
  if (expId <= 2) return 1;
  if (expId <= 4) return 2;
  if (expId <= 6) return 3;
  return 4;
}


function getSideQuestShortTextKey(type: string): string | undefined {
  return Object.values(SIDE_QUEST_RUNTIME_DEFS).find((def) => def.type === normalizeSideQuestType(type))?.shortTextKey;
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

function normalizeRevealedItemCompendiumItemIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(
    value.filter((itemId): itemId is number => Number.isInteger(itemId) && itemId > 0),
  ));
}

function collectRevealedItemIdsFromOwnedData(
  inventory: InventoryRecord,
  parties: Party[],
): number[] {
  // SpecRef: 3.1 | ITEM | Item Compendium (アイテム図鑑)
  const revealedIds = new Set<number>();
  Object.values(inventory).forEach((variant) => {
    const itemId = variant?.item?.id;
    if (Number.isInteger(itemId) && (itemId as number) > 0) {
      revealedIds.add(itemId as number);
    }
  });

  parties.forEach((party) => {
    party.characters.forEach((character) => {
      character.equipment.forEach((item) => {
        if (!item) return;
        if (Number.isInteger(item.id) && item.id > 0) {
          revealedIds.add(item.id);
        }
      });
    });
  });

  return Array.from(revealedIds);
}

function getUnlockedPartySlotFromEntry(entry: ExpeditionLogEntry, dungeonId?: number): number | null {
  // SpecRef: 5.1.3.2 | Unlock party | Party unlock condition
  if (entry.outcome !== 'victory' || entry.roomType !== 'battle_Boss') return null;
  if (typeof dungeonId !== 'number') return null;
  return getPartyUnlockSlotForBossVictory(dungeonId);
}

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

function normalizeChallengedGodName(rawName: string): string {
  const withoutBattleSuffix = stripGodsBattleSuffix(rawName);
  const withoutRoleSuffix = withoutBattleSuffix.replace(/\([^)]*\)/gu, '').trim();
  const [head] = withoutRoleSuffix.split(/\s+/u);
  return (head ?? withoutRoleSuffix).trim();
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
      const unlockPartySlot = getUnlockedPartySlotFromEntry(entry, log.dungeonId);
      if (unlockPartySlot) {
        unlockedPartySlots = Math.max(unlockedPartySlots, unlockPartySlot);
      }
    }
  }

  return { unlockedPartySlots };
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
      const partyUnlock = getUnlockedPartySlotFromEntry(entry, log.dungeonId);
      return !!partyUnlock;
    });

  const unlockHeadline = unlockSourceEntry?.enemyName.includes('(BOSS)')
    ? t('unlock.condition.dungeonCleared', { dungeon: log.dungeonName })
    : t('unlock.condition.met');

  const unlockPartyLabel = unlockedPartySlot ? t('unlock.partySlot', { slot: unlockedPartySlot }) : '';
  const unlockDetail = [unlockPartyLabel].filter(Boolean).join('、');

  return {
    id: `${createdAt}-${gameplayRandom().toString(36).slice(2, 8)}`,
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
  return env === 'dev' ? DEBUG_CYCLE_DURATION_SCALE : 1;
}

function formatSideQuestShortText(type: string, shortTextKey: string, target: number): string {
  const shortText = t(shortTextKey);
  const formatNumber = (value: number) => Math.floor(value).toLocaleString('ja-JP');
  const value = formatNumber(target);
  const targetTemplateByType: Partial<Record<string, string>> = {
    'q.squander': 'sideQuest.target.gold',
    'q.sleeping': 'sideQuest.target.count',
    'q.exercise': 'sideQuest.target.minutes',
    'q.embezzlement': 'sideQuest.target.gold',
    'q.donation': 'sideQuest.target.gold',
    'q.healing': 'sideQuest.target.minutes',
    'q.AFK': 'sideQuest.target.minutes',
    'q.treasure-super-rare': '',
    'q.treasure-boss-rare': 'sideQuest.target.items',
    'q.poor-kid': 'sideQuest.target.count',
    'q.consecutive-wins': 'sideQuest.target.streak',
    'q.losers': '',
    'q.savings': 'sideQuest.target.gold',
  };
  const targetTemplateKey = targetTemplateByType[type];
  if (targetTemplateKey === '') return shortText;
  return t(targetTemplateKey ?? 'sideQuest.target.count', { label: shortText, value });
}


const GODS_BATTLE_SUFFIX_KEY = 'game.log.godsBattleSuffix';
const GODS_BATTLE_SUFFIX_FALLBACKS = ['(神魔戦)', '(Gods Battle)'] as const;

function getGodsBattleSuffix(): string {
  return t(GODS_BATTLE_SUFFIX_KEY);
}

function hasGodsBattleSuffix(text: string): boolean {
  const localizedSuffix = getGodsBattleSuffix();
  return [localizedSuffix, ...GODS_BATTLE_SUFFIX_FALLBACKS].some((suffix) => text.includes(suffix));
}

function stripGodsBattleSuffix(text: string): string {
  return [getGodsBattleSuffix(), ...GODS_BATTLE_SUFFIX_FALLBACKS].reduce(
    (value, suffix) => value.replace(new RegExp(`\\s*${escapeRegExp(suffix)}\\s*$`, 'u'), '').trim(),
    text,
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function characterName(key: string): string {
  return t(`character.default.${key}`);
}

const DEFAULT_NAME_RACES: readonly RaceId[] = [
  'caninian', 'lupinian', 'vulpinian', 'ursan', 'felidian',
  'leporian', 'cervin', 'murid', 'procyonian',
];

const UNIQUE_CHARACTER_NAME_KEYS: Partial<Record<LineageId, string>> = {
  unascertained: 'n1', pioneer: 'n2', meddlesome_fox: 'n3', rowdy_orca_girl: 'n4',
  phantom_thief: 'n5', crescent_jade: 'n6', apostate: 'n7', flamebound_grove: 'n8',
  hidden_grail: 'n9', almighty: 'n10', 'unexpected_prince(ss)': 'n11', incarnation: 'n12',
};

function translateCharacterName(
  character: Character,
  partyIndex: number,
  sourceLanguage: Language,
  targetLanguage: Language,
): string {
  // SpecRef: 8.2.3 | Character Edit Mode (selected member): | Mimorian default enemy name localization
  if (character.raceId === 'mimorian' && character.mimorianEnemyId != null) {
    const copiedEnemy = ENEMIES.find((enemy) => enemy.id === character.mimorianEnemyId);
    if (copiedEnemy?.nameKey && translate(sourceLanguage, copiedEnemy.nameKey) === character.name) {
      return translate(targetLanguage, copiedEnemy.nameKey);
    }
  }

  if (character.isUnique) {
    const uniqueNameKey = UNIQUE_CHARACTER_NAME_KEYS[character.lineageId];
    if (uniqueNameKey) {
      const translationKey = `character.default.${uniqueNameKey}`;
      return translate(sourceLanguage, translationKey) === character.name
        ? translate(targetLanguage, translationKey)
        : character.name;
    }
    return character.name;
  }

  // SpecRef: 2.2.1 | Potential default name for player side characters | Potential Default Name Table
  if (DEFAULT_NAME_RACES.includes(character.raceId) && partyIndex >= 0 && partyIndex < 6) {
    const poolKey = `home.defaultNames.pt${partyIndex + 1}.${character.raceId}`;
    const sourceNames = translate(sourceLanguage, poolKey).split('|');
    const nameIndex = sourceNames.indexOf(character.name);
    if (nameIndex >= 0) {
      return translate(targetLanguage, poolKey).split('|')[nameIndex] ?? character.name;
    }
  }

  // Initial non-unique members also have stable, localized default-name entries.
  for (let nameNumber = 13; nameNumber <= 36; nameNumber += 1) {
    const key = `character.default.n${nameNumber}`;
    if (translate(sourceLanguage, key) === character.name) return translate(targetLanguage, key);
  }
  return character.name;
}

function translatePartyCharacterNames(
  parties: Party[],
  sourceLanguage: Language,
  targetLanguage: Language,
): Party[] {
  if (sourceLanguage === targetLanguage) return parties;
  return parties.map((party, partyIndex) => ({
    ...party,
    characters: party.characters.map((character) => ({
      ...character,
      name: translateCharacterName(character, partyIndex, sourceLanguage, targetLanguage),
    })),
  }));
}

const MELEE_CATEGORIES = new Set<Item['category']>(['sword', 'katana', 'gauntlet']);
const RANGED_CATEGORIES = new Set<Item['category']>(['arrow', 'bolt', 'archery']);
const MAGIC_CATEGORIES = new Set<Item['category']>(['wand', 'grimoire', 'catalyst']);


function normalizePartyCondition(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 0;
  // SpecRef: 7.1.2 | AUTO progress logic | condition
  return Math.max(-400, Math.min(400, Math.floor(raw)));
}

function normalizeExpeditionDestinationMode(raw: unknown): ExpeditionDestinationMode {
  return raw === 'fixed' ? 'fixed' : 'auto';
}

function shouldAutoAdvanceExpeditionDestination(party: Party): { shouldAdvance: boolean; nextDungeonId: number | null } {
  // SpecRef: 8.3 | UI_EXPEDITION | Auto Destination Change Logic
  if (party.expeditionDestinationMode !== 'auto') {
    return { shouldAdvance: false, nextDungeonId: null };
  }

  const nextDungeon = DUNGEONS.find((dungeon) => dungeon.id === party.selectedDungeonId + 1 && dungeon.id <= 9);
  if (!nextDungeon) {
    return { shouldAdvance: false, nextDungeonId: null };
  }

  const hasClearedSelectedExpeditionAtLeastOnce = Boolean(
    party.defeatedBossExpeditions?.[party.selectedDungeonId],
  );
  if (!hasClearedSelectedExpeditionAtLeastOnce) {
    return { shouldAdvance: false, nextDungeonId: null };
  }

  if (!isDungeonEntryUnlocked(party, nextDungeon.id)) {
    return { shouldAdvance: false, nextDungeonId: null };
  }

  const selectedDifficultyOffset = party.expeditionDifficultyOffsetByDungeon?.[party.selectedDungeonId]
    ?? party.expeditionDifficultyOffset
    ?? 0;
  const condition = normalizePartyCondition(party.condition);
  const selectedDungeon = DUNGEONS.find((dungeon) => dungeon.id === party.selectedDungeonId);
  if (!selectedDungeon) {
    return { shouldAdvance: false, nextDungeonId: null };
  }

  const enemyLevelWithOffset = selectedDungeon.expLevel + selectedDifficultyOffset;
  const meetsAnyAutoAdvanceRule = (
    (enemyLevelWithOffset <= party.level + 9 && condition >= 250)
    || (enemyLevelWithOffset <= party.level + 10 && condition >= 240)
    || (enemyLevelWithOffset <= party.level + 11 && condition >= 230)
  );

  return {
    shouldAdvance: meetsAnyAutoAdvanceRule,
    nextDungeonId: meetsAnyAutoAdvanceRule ? nextDungeon.id : null,
  };
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
  'condition.terrible': { Clear: 15, Turned_Back: 6, Draw_Retreat: 2, Wounded_Retreat: 1, Defeat: -4 },
  'condition.poor': { Clear: 12, Turned_Back: 5, Draw_Retreat: 1, Wounded_Retreat: 0, Defeat: -15 },
  'condition.low': { Clear: 9, Turned_Back: 4, Draw_Retreat: 1, Wounded_Retreat: -1, Defeat: -26 },
  'condition.cautious': { Clear: 6, Turned_Back: 3, Draw_Retreat: 0, Wounded_Retreat: -2, Defeat: -38 },
  'condition.normal': { Clear: 4, Turned_Back: 2, Draw_Retreat: -1, Wounded_Retreat: -8, Defeat: -50 },
  'condition.steady': { Clear: 3, Turned_Back: 1, Draw_Retreat: -3, Wounded_Retreat: -10, Defeat: -58 },
  'condition.good': { Clear: 2, Turned_Back: 1, Draw_Retreat: -4, Wounded_Retreat: -12, Defeat: -64 },
  'condition.great': { Clear: 1, Turned_Back: 0, Draw_Retreat: -5, Wounded_Retreat: -14, Defeat: -68 },
  'condition.excellent': { Clear: 1, Turned_Back: 0, Draw_Retreat: -6, Wounded_Retreat: -16, Defeat: -70 },
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
  return log.entries.some((entry) => hasGodsBattleSuffix(entry.enemyName));
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

// SpecRef: 9 | Environment | Save Data Isolation
function normalizeImportedCharacter(character: Character, fallbackCharacter: Character): Character {
  // SpecRef: 8.2.3 | Character Edit Mode (selected member): | Migration from Previous Non-Gender Data
  const normalizedMainClassId = CLASSES.some((c) => c.id === character.mainClassId)
    ? character.mainClassId
    : fallbackCharacter.mainClassId;
  const normalizedSubClassId = CLASSES.some((c) => c.id === character.subClassId)
    ? character.subClassId
    : normalizedMainClassId;

  const normalizedRaceId = RACES.some((r) => r.id === character.raceId) ? character.raceId : fallbackCharacter.raceId;
  const normalizedMimorianEnemyId = normalizedRaceId === 'mimorian'
    ? (ENEMIES.some((enemy) => enemy.id === character.mimorianEnemyId) ? character.mimorianEnemyId : ENEMIES[0]?.id)
    : undefined;

  return {
    ...character,
    isUnique: typeof character.isUnique === 'boolean' ? character.isUnique : (fallbackCharacter.isUnique ?? false),
    raceId: normalizedRaceId,
    mimorianEnemyId: normalizedMimorianEnemyId,
    mainClassId: normalizedMainClassId,
    subClassId: normalizedSubClassId,
    predispositionId: PREDISPOSITIONS.some((p) => p.id === character.predispositionId)
      ? character.predispositionId
      : fallbackCharacter.predispositionId,
    lineageId: LINEAGES.some((l) => l.id === character.lineageId) ? character.lineageId : fallbackCharacter.lineageId,
    gender: normalizeCharacterGender((character as Character & { gender?: CharacterGender }).gender, {
      isUnique: typeof character.isUnique === 'boolean' ? character.isUnique : (fallbackCharacter.isUnique ?? false),
      name: typeof character.name === 'string' && character.name.trim().length > 0 ? character.name : fallbackCharacter.name,
    }),
    autoEquipmentMode: normalizeCharacterAutoEquipmentMode(character.autoEquipmentMode),
  };
}

function getDeityDonationsWithDefaults(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object') return {};
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, number>>((totals, [name, donation]) => {
    totals[normalizeDeityName(name)] = typeof donation === 'number' ? donation : 0;
    return totals;
  }, {});
}


function getEnemyBattleStatsWithDefaults(value: unknown): Record<number, { defeats: number; encounters: number }> {
  if (!value || typeof value !== 'object') return {};
  return Object.entries(value as Record<string, unknown>).reduce<Record<number, { defeats: number; encounters: number }>>((acc, [enemyIdKey, stats]) => {
    const enemyId = Number(enemyIdKey);
    if (!Number.isFinite(enemyId) || !stats || typeof stats !== 'object') return acc;
    const raw = stats as Record<string, unknown>;
    acc[Math.floor(enemyId)] = {
      defeats: typeof raw.defeats === 'number' ? Math.max(0, Math.floor(raw.defeats)) : 0,
      encounters: typeof raw.encounters === 'number' ? Math.max(0, Math.floor(raw.encounters)) : 0,
    };
    return acc;
  }, {});
}

function getAltarVictoriesWithDefaults(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object') return {};
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, number>>((acc, [enemyType, victories]) => {
    if (typeof victories === 'number' && Number.isFinite(victories)) {
      acc[enemyType] = Math.max(0, Math.floor(victories));
    }
    return acc;
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
  const validDepthLimits: ExpeditionDepthLimit[] = [
    '1f-3', '1f-4',
    '2f-3', '2f-4',
    '3f-3', '3f-4',
    '4f-3', '4f-4',
    '5f-3', '5f-4',
    'beforeBoss',
    'all',
  ];
  return validDepthLimits.includes(value as ExpeditionDepthLimit) ? (value as ExpeditionDepthLimit) : 'all';
}

function normalizeExpeditionDifficultyOffset(value: unknown, maxOffset: number = 40): number {
  return normalizeDifficultyOffset(value, maxOffset);
}

function normalizeExpeditionDifficultyOffsetByDungeon(value: unknown): Record<number, number> {
  if (!value || typeof value !== 'object') return {};
  return Object.entries(value as Record<string, unknown>).reduce<Record<number, number>>((acc, [rawDungeonId, rawOffset]) => {
    const dungeonId = Number(rawDungeonId);
    if (!Number.isFinite(dungeonId)) return acc;
    acc[Math.floor(dungeonId)] = normalizeExpeditionDifficultyOffset(rawOffset);
    return acc;
  }, {});
}

function normalizeJewelAutoEquipPriorityPartyId(value: unknown, unlockedPartyCount: number): number | null {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) return 1;
  const normalizedPartyId = Math.floor(value);
  if (normalizedPartyId < 1 || normalizedPartyId > unlockedPartyCount) return 1;
  return normalizedPartyId;
}

// SpecRef: 8.5 | UI_DIARY | Setting.
function matchesSideQuestDiaryThreshold(rewardRank: number, threshold: DiarySettings['sideQuestThreshold']): boolean {
  if (threshold === 'none') return false;
  if (threshold === 'all') return true;
  if (threshold === 8) return rewardRank === 8;
  return rewardRank >= threshold;
}

type InventoryVariant = InventoryRecord[string];

interface AfkInventoryMutation {
  key: string;
  hadOverlayValue: boolean;
  previousValue: InventoryVariant | undefined;
}

/**
 * SpecRef: 9.2.3 | Runtime retention and transfer | Large temporary datasets should be processed incrementally
 *
 * Worker-local copy-on-write inventory view. Reads fall through to the captured
 * Chunk input while writes retain only changed variants. Checkpoints provide
 * exact per-expedition rollback without cloning the complete inventory.
 */
export class AfkInventoryOverlay {
  readonly record: InventoryRecord;
  private readonly changes = new Map<string, InventoryVariant | undefined>();
  private readonly mutations: AfkInventoryMutation[] = [];

  constructor(private readonly base: InventoryRecord) {
    this.record = new Proxy({} as InventoryRecord, {
      get: (_target, property) => {
        if (typeof property !== 'string') return Reflect.get(this.base, property);
        return this.changes.has(property) ? this.changes.get(property) : this.base[property];
      },
      set: (_target, property, value) => {
        if (typeof property !== 'string') return false;
        this.mutations.push({
          key: property,
          hadOverlayValue: this.changes.has(property),
          previousValue: this.changes.get(property),
        });
        this.changes.set(property, value as InventoryVariant);
        return true;
      },
      deleteProperty: (_target, property) => {
        if (typeof property !== 'string') return false;
        this.mutations.push({
          key: property,
          hadOverlayValue: this.changes.has(property),
          previousValue: this.changes.get(property),
        });
        this.changes.set(property, undefined);
        return true;
      },
      ownKeys: () => {
        const keys = Reflect.ownKeys(this.base);
        this.changes.forEach((_value, key) => {
          if (!Reflect.has(this.base, key)) keys.push(key);
        });
        return keys.filter((key) => typeof key !== 'string' || this.get(key) !== undefined);
      },
      getOwnPropertyDescriptor: (_target, property) => {
        if (typeof property !== 'string' || this.get(property) === undefined) return undefined;
        return { configurable: true, enumerable: true, writable: true, value: this.get(property) };
      },
      has: (_target, property) => typeof property === 'string' && this.get(property) !== undefined,
    });
  }

  private get(key: string): InventoryVariant | undefined {
    return this.changes.has(key) ? this.changes.get(key) : this.base[key];
  }

  checkpoint(): number {
    return this.mutations.length;
  }

  rollback(checkpoint: number): void {
    while (this.mutations.length > checkpoint) {
      const mutation = this.mutations.pop()!;
      if (mutation.hadOverlayValue) this.changes.set(mutation.key, mutation.previousValue);
      else this.changes.delete(mutation.key);
    }
  }

  releaseCheckpoint(): void {
    this.mutations.length = 0;
  }

  createDelta(): AfkInventoryDelta {
    const delta: AfkInventoryDelta = {};
    const append = (key: string, variant: InventoryVariant | undefined) => {
      if (!variant) return;
      const countDelta = variant.count - (this.base[key]?.count ?? 0);
      if (countDelta !== 0 || variant.isNew) {
        delta[key] = { countDelta, isNew: variant.isNew === true, variant };
      }
    };
    // Preserve the former full-diff insertion order exactly: authoritative base
    // keys first, followed by newly introduced overlay keys.
    Object.keys(this.base).forEach((key) => append(key, this.get(key)));
    this.changes.forEach((variant, key) => {
      if (!(key in this.base)) append(key, variant);
    });
    return delta;
  }
}

interface AfkChunkReducerContext {
  inventoryOverlay: AfkInventoryOverlay;
  encounterCache: Map<string, EnemyDef>;
  profitAbilityCache: Map<number, { partyLevel: number; characters: Party['characters']; levels: ProfitAbilityLevels }>;
  hpBaseCache: Map<number, { partyLevel: number; characters: Party['characters']; bonusHp: number }>;
  workerAttribution?: AfkWorkerPhaseAttribution;
}

function addAfkWorkerPhaseDuration(
  attribution: AfkWorkerPhaseAttribution | undefined,
  phase: keyof AfkWorkerPhaseAttribution,
  startedAt: number,
): void {
  if (attribution) attribution[phase] += Math.max(0, performance.now() - startedAt);
}

const afkInventoryDeltaByState = new WeakMap<GameState, AfkInventoryDelta>();

export function getAfkInventoryDeltaForState(state: GameState): AfkInventoryDelta | undefined {
  return afkInventoryDeltaByState.get(state);
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

function formatLoadErrorLog(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}${error.stack ? `\n${error.stack}` : ''}`;
  }
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

type LoadSavedStateResult = {
  state: GameState | null;
  errorLog: string | null;
};

function loadSavedState(encodedState?: string): LoadSavedStateResult {
  try {
    const saved = encodedState ?? localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return { state: null, errorLog: null };
    }

    // SpecRef: 5.1.4 | Save and load | Include the error log details in the popup.
    const missingDiaryRecords: string[] = [];
    const segmentedState = encodedState === undefined
      ? hydrateLogSegmentedSave(saved, localStorage, STORAGE_KEY, {
          onMissingDiaryRecord: (partyId, logId) => missingDiaryRecords.push(`PT${partyId}:${logId}`),
        })
      : null;
    if (missingDiaryRecords.length > 0) {
      console.warn(`Recovered segmented save without ${missingDiaryRecords.length} missing Diary record(s): ${missingDiaryRecords.join(', ')}`);
    }
    const parsed = segmentedState ?? JSON.parse(decodePersistedState(saved));
    if (typeof window !== 'undefined' && window.bokemoDesktop?.aiPlay && parsed?.apiRuntime?.evaluation) {
      return { state: hydrateGameState(parsed), errorLog: null };
    }
    // Validate it has required properties and migrate legacy saves.
    const hasParties = Array.isArray(parsed?.parties);
    const hasBags = parsed?.bags && typeof parsed.bags === 'object';
    if (!hasParties || !hasBags) {
      return {
        state: null,
        errorLog: 'Saved data validation failed: missing required properties `parties` or `bags`.',
      };
    }

    if (saved) {
      if (hasParties && hasBags) {

        parsed.bags = normalizeImportedBags(parsed.bags);

        if (!parsed.global) {
          const firstParty = parsed.parties?.[0];
          parsed.global = {
            gold: firstParty?.gold ?? 200,
            inventory: migrateLegacyInventory(firstParty?.inventory ?? []),
            userId: generateUserId(),
            deityDonations: {},
            unlockedDeities: [...DEFAULT_UNLOCKED_DEITIES],
            challengedGodNames: [],
            revealedItemCompendiumItemIds: [],
            revealedGlossaryAbilityIds: [],
            revealedGlossaryTerrainKeys: [],
            shopPurchases: {},
            jewelShopPurchases: {},
            shopRefreshCounts: {},
            shopIntimacy: 0,
            shopIntimacyLastDecayAt: Date.now(),
            jewels: createStarterJewelInventory(),
            savedEquipmentSets: [],
            enemyBattleStats: {},
            altarVictoriesByEnemyType: {},
            readDeveloperNewsItemIds: [],
          };
        }
        if (Array.isArray(parsed.global.inventory)) {
          parsed.global.inventory = migrateLegacyInventory(parsed.global.inventory);
        }
        if (typeof parsed.global.userId !== 'string' || parsed.global.userId.trim().length === 0) {
          parsed.global.userId = generateUserId();
        }
        parsed.global.deityDonations = getDeityDonationsWithDefaults(parsed.global.deityDonations);
        parsed.global.unlockedDeities = normalizeUnlockedDeities(parsed.global.unlockedDeities);
        parsed.global.challengedGodNames = Array.isArray(parsed.global.challengedGodNames)
          ? parsed.global.challengedGodNames
              .filter((name: unknown): name is string => typeof name === 'string' && name.trim().length > 0)
              .map((name: string) => normalizeChallengedGodName(name))
          : [];
        parsed.global.enemyBattleStats = getEnemyBattleStatsWithDefaults(parsed.global.enemyBattleStats);
        parsed.global.altarVictoriesByEnemyType = getAltarVictoriesWithDefaults(parsed.global.altarVictoriesByEnemyType);
        parsed.global.readDeveloperNewsItemIds = Array.isArray(parsed.global.readDeveloperNewsItemIds)
          ? Array.from(new Set(parsed.global.readDeveloperNewsItemIds.filter((itemId: unknown): itemId is string => typeof itemId === 'string' && itemId.trim().length > 0)))
          : [];
        parsed.global.revealedItemCompendiumItemIds = Array.from(new Set([
          ...normalizeRevealedItemCompendiumItemIds(parsed.global.revealedItemCompendiumItemIds),
          ...collectRevealedItemIdsFromOwnedData(parsed.global.inventory, parsed.parties),
        ]));
        parsed.global.revealedGlossaryAbilityIds = normalizeRevealedGlossaryAbilityIds(parsed.global.revealedGlossaryAbilityIds);
        parsed.global.revealedGlossaryTerrainKeys = normalizeRevealedGlossaryTerrainKeys(parsed.global.revealedGlossaryTerrainKeys);
        parsed.global.shopPurchases = (parsed.global.shopPurchases && typeof parsed.global.shopPurchases === 'object')
          ? Object.entries(parsed.global.shopPurchases as Record<string, unknown>).reduce<Record<string, string[]>>((acc, [hourKey, itemIds]) => {
              if (!Array.isArray(itemIds)) return acc;
              const normalized = itemIds
                .filter((itemId): itemId is string | number => typeof itemId === 'string' || typeof itemId === 'number')
                .map((itemId) => String(itemId));
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
        parsed.global.savedEquipmentSets = normalizeSavedEquipmentSets(parsed.global.savedEquipmentSets);
        parsed.global.equipmentInventoryRevision = Number.isSafeInteger(parsed.global.equipmentInventoryRevision)
          ? Math.max(0, parsed.global.equipmentInventoryRevision)
          : 0;
        parsed.global.jewelInventoryRevision = Number.isSafeInteger(parsed.global.jewelInventoryRevision)
          ? Math.max(0, parsed.global.jewelInventoryRevision)
          : 0;

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
          const defaultParty = defaultParties[Math.min(index, defaultParties.length - 1)];
          if (!party.id) {
            party.id = index + 1;
          }
          if (!party.deity) {
            party.deity = createInitialDeity('Goddess of Restoration');
          }
          party.deity.name = normalizeDeityName(party.deity.name);
          if (typeof party.level !== 'number') party.level = 1;
          if (typeof party.experience !== 'number') party.experience = 0;
          party.lastFullEquipmentRevision = Number.isSafeInteger(party.lastFullEquipmentRevision)
            ? Math.max(-1, party.lastFullEquipmentRevision)
            : -1;
          party.lastFullJewelRevision = Number.isSafeInteger(party.lastFullJewelRevision)
            ? Math.max(-1, party.lastFullJewelRevision)
            : -1;
          if (!party.defeatedBossExpeditions) party.defeatedBossExpeditions = {};
          if (!Array.isArray(party.diaryLogs)) party.diaryLogs = [];
          if (typeof party.pendingDiaryLog === 'undefined') party.pendingDiaryLog = null;
          if (typeof party.hasUnreadDiary !== 'boolean') party.hasUnreadDiary = false;
          if (!Array.isArray(party.characters) || party.characters.length === 0) {
            party.characters = defaultParty.characters.map((character) => ({ ...character }));
          }
          party.characters = party.characters.map((character: Character, charIndex: number) => {
            const fallbackCharacter = defaultParty.characters[Math.min(charIndex, defaultParty.characters.length - 1)];
            return normalizeImportedCharacter(character, fallbackCharacter);
          });
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
          party.expeditionDestinationMode = normalizeExpeditionDestinationMode(party.expeditionDestinationMode);
          party.expeditionDifficultyOffset = normalizeExpeditionDifficultyOffset(party.expeditionDifficultyOffset);
          party.expeditionDifficultyOffsetByDungeon = normalizeExpeditionDifficultyOffsetByDungeon(party.expeditionDifficultyOffsetByDungeon);
          const instantChargeState = getInstantExpeditionChargeState({
            instantExpeditionStock: party.instantExpeditionStock,
            instantExpeditionChargeStartedAt: party.instantExpeditionChargeStartedAt,
            defeatedBossExpeditions: party.defeatedBossExpeditions,
          });
          party.instantExpeditionStock = instantChargeState.stock;
          party.instantExpeditionChargeStartedAt = instantChargeState.chargeStartedAt;
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
          party.bags = normalizeImportedBags((party as Party & { bags?: unknown }).bags ?? parsed.bags);
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

        const challengedGodNamesFromLogs = (parsed.parties as Party[])
          .flatMap((party: Party) => party.diaryLogs ?? [])
          .flatMap((diaryLog: DiaryLog) => diaryLog.expeditionLog ? [diaryLog.expeditionLog] : [])
          .flatMap((log: ExpeditionLog) => log.entries)
          .filter((entry: ExpeditionLogEntry) => hasGodsBattleSuffix(entry.enemyName))
          .map((entry: ExpeditionLogEntry) => normalizeChallengedGodName(entry.enemyName))
          .filter((name: string, index: number, allNames: string[]) => allNames.indexOf(name) === index);
        parsed.global.challengedGodNames = Array.from(new Set([
          ...parsed.global.challengedGodNames,
          ...challengedGodNamesFromLogs,
        ]));

        parsed.global.unlockedDeities = unlockedDeities;
        while (parsed.parties.length < unlockedPartySlots) {
          const nextDefaultParty = createUnlockedPartyWithAvailableDeity(defaultParties[parsed.parties.length], parsed.parties);
          parsed.parties.push(nextDefaultParty);
        }
        parsed.parties = parsed.parties.slice(0, unlockedPartySlots);
        parsed.global.jewelAutoEquipPriorityPartyId = normalizeJewelAutoEquipPriorityPartyId(
          parsed.global.jewelAutoEquipPriorityPartyId,
          parsed.parties.length,
        );
        parsed.selectedPartyIndex = Math.max(0, Math.min(normalizedSelectedPartyIndex, Math.max(0, parsed.parties.length - 1)));
        parsed.buildNumber = typeof parsed.buildNumber === 'number' ? parsed.buildNumber : 0;

        return { state: hydrateGameState(parsed as GameState), errorLog: null };
      }
    }
  } catch (e) {
    console.error('Failed to load saved state:', e);
    return { state: null, errorLog: formatLoadErrorLog(e) };
  }
  return { state: null, errorLog: null };
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
        shortTextKey: party.sideQuest.shortTextKey ?? getSideQuestShortTextKey(party.sideQuest.type),
        assignedAt: Number.isFinite(party.sideQuest.assignedAt) ? party.sideQuest.assignedAt : now,
        expiresAt: Number.isFinite(party.sideQuest.expiresAt) ? party.sideQuest.expiresAt : now + (16 * 60 * 60 * 1000),
      }
    : null;
  return {
    ...party,
    bags: normalizeImportedBags(party.bags),
    characters: party.characters.map((character) => ({
      ...character,
      autoEquipmentMode: normalizeCharacterAutoEquipmentMode(character.autoEquipmentMode),
      gender: normalizeCharacterGender((character as Character & { gender?: CharacterGender }).gender, character),
    })),
    currentHp: partyStats.hp,
    pendingProfit: 0,
    expeditionRewardsPending: false,
    pendingUnlockState: null,
    deityGold: 0,
    expeditionDestinationMode: normalizeExpeditionDestinationMode(party.expeditionDestinationMode),
    expeditionDifficultyOffset: normalizeExpeditionDifficultyOffset(party.expeditionDifficultyOffset),
    expeditionDifficultyOffsetByDungeon: normalizeExpeditionDifficultyOffsetByDungeon(party.expeditionDifficultyOffsetByDungeon),
    instantExpeditionStock: INSTANT_EXPEDITION_MAX_STOCK,
    instantExpeditionChargeStartedAt: null,
    expeditionStats: getExpeditionStatsWithDefaults(party.expeditionStats),
    sleepinessOfPartyBag: normalizeSleepinessPartyBag(party.sleepinessOfPartyBag ?? createSleepinessPartyBag()),
    currentSleepiness: normalizeSleepinessState(party.currentSleepiness),
    lastFullEquipmentRevision: Number.isSafeInteger(party.lastFullEquipmentRevision)
      ? Math.max(-1, party.lastFullEquipmentRevision!)
      : -1,
    lastFullJewelRevision: Number.isSafeInteger(party.lastFullJewelRevision)
      ? Math.max(-1, party.lastFullJewelRevision!)
      : -1,
    condition: normalizePartyCondition(party.condition),
    sideQuest: normalizedSideQuest,
  };
}

function normalizeSleepinessState(raw: unknown): SleepinessState {
  if (raw === 1 || raw === 2) return raw;
  return 0;
}


const UNIQUE_CHARACTER_GENDER_KEYS: Record<string, CharacterGender> = {
  n1: 'male', n2: 'female', n3: 'male', n4: 'female', n5: 'male', n6: 'female',
  n7: 'male', n8: 'male', n9: 'male', n10: 'male', n11: 'male', n12: 'female',
};

function getUniqueCharacterGenderByName(name: string): CharacterGender | undefined {
  for (const [key, gender] of Object.entries(UNIQUE_CHARACTER_GENDER_KEYS)) {
    if (name === characterName(key)) return gender;
  }
  return undefined;
}

function normalizeCharacterGender(raw: unknown, character?: Pick<Character, 'isUnique' | 'name'>): CharacterGender {
  if (raw === 'male' || raw === 'female') return raw;
  if (character?.isUnique) return getUniqueCharacterGenderByName(character.name) ?? 'male';
  return gameplayRandom() < 0.5 ? 'male' : 'female';
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
    { race: 'kemoria', main: 'guardian', sub: 'samurai', pred: 'none', lineage: 'unascertained', name: characterName('n1'), gender: 'male', isUnique: true, equipmentIds: [1101, 1102, 1104, 1105, 1106, 1211] },
    { race: 'vulpinian', main: 'duelist', sub: 'pilgrim', pred: 'aggressive', lineage: 'sandstorm', name: characterName('n13'), gender: 'female', equipmentIds: [1104, 1106] },
    { race: 'leporian', main: 'ranger', sub: 'ninja', pred: 'inquisitive', lineage: 'abyssal_sea', name: characterName('n14'), gender: 'female', equipmentIds: [1107, 1109] },
    { race: 'procyonian', main: 'ninja', sub: 'striker', pred: 'evasive', lineage: 'firmament', name: characterName('n15'), gender: 'male', equipmentIds: [1107, 1109] },
    { race: 'cervin', main: 'wizard', sub: 'alchemist', pred: 'introspective', lineage: 'utopia', name: characterName('n16'), gender: 'female', equipmentIds: [1110, 1112] },
    { race: 'caninian', main: 'sage', sub: 'alchemist', pred: 'none', lineage: 'pioneer', name: characterName('n2'), gender: 'female', isUnique: true, equipmentIds: [1110, 1112] },
  ];

  const characters: Character[] = defaultSetup.map((setup, i) => ({
    id: i + 1,
    name: setup.name,
    gender: (setup as { gender?: CharacterGender }).gender ?? 'male',
    raceId: setup.race as RaceId,
    mainClassId: setup.main as ClassId,
    subClassId: setup.sub as ClassId,
    predispositionId: setup.pred as PredispositionId,
    lineageId: setup.lineage as LineageId,
    isUnique: Boolean((setup as { isUnique?: boolean }).isUnique),
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
    clearGateProgress: {},
    clearGateStatus: {},
    deity: createInitialDeity('Goddess of Restoration'),
    characters,
    selectedDungeonId: 1,
    expeditionDestinationMode: 'auto',
    expeditionDepthLimit: 'all',
    expeditionDifficultyOffset: 0,
    expeditionDifficultyOffsetByDungeon: {},
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
    bags: initializeBags(),
    sleepinessOfPartyBag: createSleepinessPartyBag(),
    currentSleepiness: 0,
    condition: 0,
    sideQuest: null,
  };

  return initializePartyRuntimeState(party);
}

function createSecondParty() {
  const defaultSetup = [
    { race: 'vulpinian', main: 'duelist', sub: 'lord', pred: 'none', lineage: 'meddlesome_fox', name: characterName('n3'), gender: 'male', isUnique: true },
    { race: 'orcinian', main: 'samurai', sub: 'sword-saint', pred: 'none', lineage: 'rowdy_orca_girl', name: characterName('n4'), gender: 'female', isUnique: true },
    { race: 'procyonian', main: 'ranger', sub: 'ranger', pred: 'nimble', lineage: 'frozen_forest', name: characterName('n17'), gender: 'male' },
    { race: 'cervin', main: 'wizard', sub: 'alchemist', pred: 'inquisitive', lineage: 'utopia', name: characterName('n18'), gender: 'male' },
    { race: 'felidian', main: 'alchemist', sub: 'wizard', pred: 'serene', lineage: 'machina', name: characterName('n19'), gender: 'female' },
    { race: 'lupinian', main: 'ninja', sub: 'wizard', pred: 'perceptive', lineage: 'windcross', name: characterName('n20'), gender: 'male' },
  ];

  const characters: Character[] = defaultSetup.map((setup, i) => ({
    id: i + 101,
    name: setup.name,
    gender: (setup as { gender?: CharacterGender }).gender ?? 'male',
    raceId: setup.race as RaceId,
    mainClassId: setup.main as ClassId,
    subClassId: setup.sub as ClassId,
    predispositionId: setup.pred as PredispositionId,
    lineageId: setup.lineage as LineageId,
    isUnique: Boolean((setup as { isUnique?: boolean }).isUnique),
    autoEquipmentMode: 2,
    equipment: [],
  }));

  const party: Party = {
    id: 2,
    name: 'PT2',
    level: 1,
    experience: 0,
    defeatedBossExpeditions: {},
    clearGateProgress: {},
    clearGateStatus: {},
    deity: createInitialDeity('God of Cunning'),
    characters,
    selectedDungeonId: 1,
    expeditionDestinationMode: 'auto',
    expeditionDepthLimit: 'all',
    expeditionDifficultyOffset: 0,
    expeditionDifficultyOffsetByDungeon: {},
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
    bags: initializeBags(),
    sleepinessOfPartyBag: createSleepinessPartyBag(),
    currentSleepiness: 0,
    condition: 0,
    sideQuest: null,
  };

  return initializePartyRuntimeState(party);
}

function createThirdParty() {
  const defaultSetup = [
    { race: 'ursan', main: 'guardian', sub: 'ranger', pred: 'evasive', lineage: 'firmament', name: characterName('n21'), gender: 'male' },
    { race: 'caninian', main: 'lord', sub: 'ninja', pred: 'precise', lineage: 'firmament', name: characterName('n22'), gender: 'male' },
    { race: 'murid', main: 'ninja', sub: 'ranger', pred: 'none', lineage: 'phantom_thief', name: characterName('n5'), gender: 'male', isUnique: true },
    { race: 'felidian', main: 'sword-saint', sub: 'ranger', pred: 'none', lineage: 'crescent_jade', name: characterName('n6'), gender: 'female', isUnique: true },
    { race: 'lupinian', main: 'duelist', sub: 'striker', pred: 'perceptive', lineage: 'frozen_forest', name: characterName('n23'), gender: 'male' },
    { race: 'vulpinian', main: 'sage', sub: 'wizard', pred: 'inquisitive', lineage: 'adaptation', name: characterName('n24'), gender: 'male' },
  ];

  const characters: Character[] = defaultSetup.map((setup, i) => ({
    id: i + 201,
    name: setup.name,
    gender: (setup as { gender?: CharacterGender }).gender ?? 'male',
    raceId: setup.race as RaceId,
    mainClassId: setup.main as ClassId,
    subClassId: setup.sub as ClassId,
    predispositionId: setup.pred as PredispositionId,
    lineageId: setup.lineage as LineageId,
    isUnique: Boolean((setup as { isUnique?: boolean }).isUnique),
    autoEquipmentMode: 2,
    equipment: [],
  }));

  const party: Party = {
    id: 3,
    name: 'PT3',
    level: 1,
    experience: 0,
    defeatedBossExpeditions: {},
    clearGateProgress: {},
    clearGateStatus: {},
    deity: createInitialDeity('Goddess of Fertility'),
    characters,
    selectedDungeonId: 1,
    expeditionDestinationMode: 'auto',
    expeditionDepthLimit: 'all',
    expeditionDifficultyOffset: 0,
    expeditionDifficultyOffsetByDungeon: {},
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
    bags: initializeBags(),
    sleepinessOfPartyBag: createSleepinessPartyBag(),
    currentSleepiness: 0,
    condition: 0,
    sideQuest: null,
  };

  return initializePartyRuntimeState(party);
}

function createFourthParty() {
  const defaultSetup = [
    { race: 'ursan', main: 'lord', sub: 'duelist', pred: 'none', lineage: 'apostate', name: characterName('n7'), gender: 'male', isUnique: true },
    { race: 'avian', main: 'ninja', sub: 'sword-saint', pred: 'none', lineage: 'flamebound_grove', name: characterName('n8'), gender: 'male', isUnique: true },
    { race: 'leporian', main: 'ranger', sub: 'guardian', pred: 'precise', lineage: 'abyssal_sea', name: characterName('n25'), gender: 'female' },
    { race: 'felidian', main: 'striker', sub: 'pilgrim', pred: 'devoted', lineage: 'firmament', name: characterName('n26'), gender: 'female' },
    { race: 'lupinian', main: 'wizard', sub: 'sage', pred: 'introspective', lineage: 'machina', name: characterName('n27'), gender: 'male' },
    { race: 'cervin', main: 'sage', sub: 'wizard', pred: 'resourceful', lineage: 'utopia', name: characterName('n28'), gender: 'female' },
  ];

  const characters: Character[] = defaultSetup.map((setup, i) => ({
    id: i + 301,
    name: setup.name,
    gender: (setup as { gender?: CharacterGender }).gender ?? 'male',
    raceId: setup.race as RaceId,
    mainClassId: setup.main as ClassId,
    subClassId: setup.sub as ClassId,
    predispositionId: setup.pred as PredispositionId,
    lineageId: setup.lineage as LineageId,
    isUnique: Boolean((setup as { isUnique?: boolean }).isUnique),
    autoEquipmentMode: 2,
    equipment: [],
  }));

  const party: Party = {
    id: 4,
    name: 'PT4',
    level: 1,
    experience: 0,
    defeatedBossExpeditions: {},
    clearGateProgress: {},
    clearGateStatus: {},
    deity: createInitialDeity('God of Fortification'),
    characters,
    selectedDungeonId: 1,
    expeditionDestinationMode: 'auto',
    expeditionDepthLimit: 'all',
    expeditionDifficultyOffset: 0,
    expeditionDifficultyOffsetByDungeon: {},
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
    bags: initializeBags(),
    sleepinessOfPartyBag: createSleepinessPartyBag(),
    currentSleepiness: 0,
    condition: 0,
    sideQuest: null,
  };

  return initializePartyRuntimeState(party);
}

function createFifthParty() {
  const defaultSetup = [
    { race: 'procyonian', main: 'samurai', sub: 'guardian', pred: 'none', lineage: 'hidden_grail', name: characterName('n9'), gender: 'male', isUnique: true },
    { race: 'lupinian', main: 'sword-saint', sub: 'samurai', pred: 'none', lineage: 'almighty', name: characterName('n10'), gender: 'male', isUnique: true },
    { race: 'felidian', main: 'wizard', sub: 'ranger', pred: 'precise', lineage: 'abyssal_sea', name: characterName('n29'), gender: 'male' },
    { race: 'murid', main: 'striker', sub: 'striker', pred: 'aggressive', lineage: 'firmament', name: characterName('n30'), gender: 'male' },
    { race: 'caninian', main: 'ninja', sub: 'striker', pred: 'amiable', lineage: 'frozen_forest', name: characterName('n31'), gender: 'female' },
    { race: 'vulpinian', main: 'wizard', sub: 'sage', pred: 'serene', lineage: 'utopia', name: characterName('n32'), gender: 'female' },
  ];

  const characters: Character[] = defaultSetup.map((setup, i) => ({
    id: i + 401,
    name: setup.name,
    gender: (setup as { gender?: CharacterGender }).gender ?? 'male',
    raceId: setup.race as RaceId,
    mainClassId: setup.main as ClassId,
    subClassId: setup.sub as ClassId,
    predispositionId: setup.pred as PredispositionId,
    lineageId: setup.lineage as LineageId,
    isUnique: Boolean((setup as { isUnique?: boolean }).isUnique),
    autoEquipmentMode: 2,
    equipment: [],
  }));

  const party: Party = {
    id: 5,
    name: 'PT5',
    level: 1,
    experience: 0,
    defeatedBossExpeditions: {},
    clearGateProgress: {},
    clearGateStatus: {},
    deity: createInitialDeity('God of Resonance'),
    characters,
    selectedDungeonId: 1,
    expeditionDestinationMode: 'auto',
    expeditionDepthLimit: 'all',
    expeditionDifficultyOffset: 0,
    expeditionDifficultyOffsetByDungeon: {},
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
    bags: initializeBags(),
    sleepinessOfPartyBag: createSleepinessPartyBag(),
    currentSleepiness: 0,
    condition: 0,
    sideQuest: null,
  };

  return initializePartyRuntimeState(party);
}

// SpecRef: 2.1.4.2 | Initial setup | PT6 Party initial condition.
function createSixthParty() {
  const defaultSetup = [
    { race: 'ursan', main: 'pilgrim', sub: 'samurai', pred: 'stubborn', lineage: 'fragment', name: characterName('n33'), gender: 'male' },
    { race: 'caninian', main: 'samurai', sub: 'sword-saint', pred: 'resourceful', lineage: 'abyssal_sea', name: characterName('n34'), gender: 'male' },
    { race: 'leporian', main: 'sword-saint', sub: 'ranger', pred: 'none', lineage: 'unexpected_prince(ss)', name: characterName('n11'), gender: 'male', isUnique: true },
    { race: 'procyonian', main: 'alchemist', sub: 'alchemist', pred: 'inquisitive', lineage: 'adaptation', name: characterName('n35'), gender: 'male' },
    { race: 'cervin', main: 'sage', sub: 'wizard', pred: 'none', lineage: 'incarnation', name: characterName('n12'), gender: 'female', isUnique: true },
    { race: 'murid', main: 'wizard', sub: 'alchemist', pred: 'nimble', lineage: 'utopia', name: characterName('n36'), gender: 'male' },
  ];

  const characters: Character[] = defaultSetup.map((setup, i) => ({
    id: i + 501,
    name: setup.name,
    gender: (setup as { gender?: CharacterGender }).gender ?? 'male',
    raceId: setup.race as RaceId,
    mainClassId: setup.main as ClassId,
    subClassId: setup.sub as ClassId,
    predispositionId: setup.pred as PredispositionId,
    lineageId: setup.lineage as LineageId,
    isUnique: Boolean((setup as { isUnique?: boolean }).isUnique),
    autoEquipmentMode: 2,
    equipment: [],
  }));

  const party: Party = {
    id: 6,
    name: 'PT6',
    level: 1,
    experience: 0,
    defeatedBossExpeditions: {},
    clearGateProgress: {},
    clearGateStatus: {},
    deity: createInitialDeity('Goddess of Precision'),
    characters,
    selectedDungeonId: 1,
    expeditionDestinationMode: 'auto',
    expeditionDepthLimit: 'all',
    expeditionDifficultyOffset: 0,
    expeditionDifficultyOffsetByDungeon: {},
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
    bags: initializeBags(),
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

type InitialStateResult = {
  state: GameState;
  loadErrorLog: string | null;
};

// SpecRef: 12.1.1 | AI Play Regulation | Starting conditions
function createInitialState(): InitialStateResult {
  const result = createInitialStateBase();
  const config = typeof window !== 'undefined' ? window.bokemoDesktop?.aiPlay : null;
  if (!config) return result;
  const existing = result.state.apiRuntime?.evaluation;
  if (existing) {
    if (existing.evaluationId !== config.evaluationId || existing.version !== config.version || existing.build !== config.build)
      return { ...result, loadErrorLog: 'AI Play identity or build mismatch.' };
    // A crash after the final call reservation still exhausts the call budget.
    if (existing.status === 'active' && existing.countedApiCalls >= 200) existing.status = 'failed';
    return result;
  }
  if (config.resume || localStorage.getItem(STORAGE_KEY) || getEnvironmentId() !== 'orca')
    return { ...result, loadErrorLog: 'AI Play requires a fresh organizer-created Orca profile or its matching checkpoint.' };
  result.state.apiRuntime = { ...createApiRuntime(), evaluation: createEvaluation(config.evaluationId, config.concept, config.version, config.build) };
  return result;
}

export function createInitialStateBase(): InitialStateResult {
  // SpecRef: 8.1 | UI_FOUNDATIONS | Mode select (モード切替) Language URL parameter
  const initialLanguage = resolveInitialLanguage();
  persistLanguage(initialLanguage);
  setActiveLanguage(initialLanguage);
  // Try to load saved state first
  const savedStateResult = loadSavedState();
  if (savedStateResult.state) {
    const savedLanguage = normalizeLanguage(savedStateResult.state.global.language);
    // SpecRef: 2.2.1 | Potential default name for player side characters | Potential Default Name Table
    // A URL or persisted language preference can differ from the language stored
    // in the save. Localize recognizable defaults on the first rendered frame.
    const localizedParties = translatePartyCharacterNames(
      savedStateResult.state.parties,
      savedLanguage,
      initialLanguage,
    );
    // Update build number in case it changed
    return {
      state: {
        ...savedStateResult.state,
        parties: localizedParties,
        buildNumber: BUILD_NUMBER,
        global: {
          ...savedStateResult.state.global,
          prana: Number.isFinite(savedStateResult.state.global.prana)
            ? Math.max(0, Math.floor(savedStateResult.state.global.prana))
            : 0,
          unlockedMimorianEnemyIds: Array.isArray(savedStateResult.state.global.unlockedMimorianEnemyIds)
            ? savedStateResult.state.global.unlockedMimorianEnemyIds
            : [],
          language: initialLanguage,
        },
      },
      loadErrorLog: null,
    };
  }

  return {
    loadErrorLog: savedStateResult.errorLog,
    state: {
    scene: 'home',
    global: {
      gold: 200,
      prana: 0,
      unlockedMimorianEnemyIds: [],
      inventory: createStarterInventory(),
      userId: generateUserId(),
      jewels: createStarterJewelInventory(),
      savedEquipmentSets: [],
      jewelAutoEquipPriorityPartyId: 1,
      equipmentInventoryRevision: 0,
      jewelInventoryRevision: 0,
      deityDonations: {},
      unlockedDeities: [...DEFAULT_UNLOCKED_DEITIES],
      challengedGodNames: [],
      revealedItemCompendiumItemIds: [],
      revealedGlossaryAbilityIds: [],
      revealedGlossaryTerrainKeys: [],
      shopPurchases: {},
      jewelShopPurchases: {},
      shopRefreshCounts: {},
      shopIntimacy: 0,
      shopIntimacyLastDecayAt: Date.now(),
      enemyBattleStats: {},
      altarVictoriesByEnemyType: {},
      readDeveloperNewsItemIds: [],
      language: initialLanguage,
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
      commonSuperRareBag: createCommonSuperRareBag(),
      rareSuperRareBag: createRareSuperRareBag(),
      physicalThreatBag: createPhysicalThreatBag(),
      magicalThreatBag: createMagicalThreatBag(),
      sideQuestBag: createSideQuestBag(),
    },
    buildNumber: BUILD_NUMBER,
    },
  };
}


export type {
  ExpeditionForecastBattleDiagnostic,
  ExpeditionForecastResolution,
  ExpeditionResolutionMode,
} from '../game/expeditionApplicationContract';

export interface SimulationSandbox {
  partyIndex: number;
  baseline: GameState;
  authoritativePartyStatus: ComputedPartyStatus;
}

const forecastResolutionByState = new WeakMap<GameState, ExpeditionForecastResolution>();

export type AfkBatchTestOptions = AfkSimulationBatchSlice & {
  elapsedMs: number;
  isAutoRepeatEnabled: boolean;
  gameMode?: RuntimeGameMode;
  simulatedEndAt?: number;
  cycleDurationScale?: number;
};

export type GameAction =
  | { type: 'SELECT_PARTY'; partyIndex: number }
  | { type: 'SELECT_DUNGEON'; partyIndex: number; dungeonId: number; selectionMode?: 'manual' | 'auto' }
  | { type: 'SET_EXPEDITION_DESTINATION_MODE'; partyIndex: number; mode: ExpeditionDestinationMode }
  | { type: 'SET_EXPEDITION_DEPTH_LIMIT'; partyIndex: number; depthLimit: ExpeditionDepthLimit }
  | { type: 'SET_EXPEDITION_DIFFICULTY_OFFSET'; partyIndex: number; difficultyOffset: number }
  | { type: 'RESET_EXPEDITION_STATS'; partyIndex: number }
  | { type: 'UPDATE_PARTY_DEITY'; partyIndex: number; deityName: string }
  | ({ type: 'RUN_EXPEDITION' } & RunExpeditionApplicationCommand)
  | { type: 'RESOLVE_INSTANT_EXPEDITION'; partyIndex: number; simulatedAt: number; gameMode?: RuntimeGameMode; enemyLevelOffset?: number; triggerGodsBattle?: boolean; authoritativePartyStatus?: { party: Party; computed: ComputedPartyStatus } }
  | { type: 'CONSUME_INSTANT_EXPEDITION_STOCK'; partyIndex: number; now?: number; chargeDurationScale?: number }
  | { type: 'FINALIZE_DIARY_LOG'; partyIndex: number; simulatedAt?: number; isAfkSimulation?: boolean }
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
  | { type: 'REMOVE_ALL_EQUIPMENT'; characterId: number; partyIndex?: number }
  | { type: 'SAVE_EQUIPMENT_SET'; characterId: number; name: string; createdAt: number; partyIndex?: number }
  | { type: 'RENAME_EQUIPMENT_SET'; slot: number; name: string }
  | { type: 'DELETE_EQUIPMENT_SET'; slot: number }
  | { type: 'LOAD_EQUIPMENT_SET'; characterId: number; slot: number; mode: EquipmentSetLoadMode; partyIndex?: number }
  | { type: 'TOGGLE_EQUIPMENT_LOCK'; characterId: number; slotIndex: number; partyIndex?: number }
  | { type: 'ATTACH_JEWEL'; characterId: number; slotIndex: number; jewelKey: 'might' | 'arcana' | 'fort' | 'ward' | 'shade' | 'focus'; rank: number; partyIndex?: number }
  | { type: 'STAMP_FULL_AUTO_EQUIPMENT'; partyIndex: number; equipmentRevision: number; jewelRevision: number }
  | { type: 'APPLY_AUTO_EQUIPMENT_ACTIONS'; actions: AutoEquipmentProfileAction[]; attribution?: AutoEquipmentReducerAttribution; hpStrategy?: AutoEquipmentHpStrategy; stateStrategy?: AutoEquipmentStateStrategy }
  | { type: 'UPDATE_CHARACTER'; characterId: number; updates: Partial<Character>; partyIndex?: number; validatedMimorianAssignments?: boolean }
  | { type: 'REORDER_PARTY_CHARACTER'; fromIndex: number; toIndex: number; partyIndex?: number }
  | { type: 'SELL_STACK'; variantKey: string }
  | { type: 'SELL_ALL_OWNED' }
  | { type: 'GRANT_FEEDBACK_REWARD' }
  | { type: 'UNLOCK_MIMORIAN_ENEMY'; enemyId: number }
  | { type: 'BUY_SHOP_ITEM'; itemId: number; stockItemKey: string }
  | { type: 'BUY_DEBUG_STORE_ITEM'; itemId: number }
  | { type: 'REFRESH_SHOP_LINEUP' }
  | { type: 'SET_VARIANT_STATUS'; variantKey: string; status: 'notown' }
  | { type: 'MARK_ITEMS_SEEN' }
  | { type: 'MARK_DIARY_LOG_SEEN'; logId: string }
  | { type: 'MARK_PARTY_DIARY_LOGS_SEEN'; partyIndex: number }
  | { type: 'MARK_DEVELOPER_NEWS_READ'; itemIds: string[] }
  | { type: 'UPDATE_DIARY_SETTINGS'; partyIndex: number; settings: Partial<DiarySettings> }
  | { type: 'SET_JEWEL_AUTO_EQUIP_PRIORITY_PARTY'; partyId: number | null }
  | { type: 'SIMULATE_AFK'; elapsedMs: number; isAutoRepeatEnabled: boolean; gameMode?: RuntimeGameMode; enemyLevelOffset?: number; simulatedEndAt?: number; cycleDurationScale?: number; cycleDurationByParty?: number[]; operationStart?: number; operationCount?: number; finalizeChunk?: boolean; chunkPartyStatus?: Array<{ party: Party; computed: ComputedPartyStatus }>; workerOptimization?: AfkWorkerSimulationStrategy; compactBattleResultOutput?: boolean; workerAttribution?: AfkWorkerPhaseAttribution; onOperationComplete?: (completedOperations: number, operationCount: number) => void }
  | { type: 'COMMIT_AFK_PARTY_CHUNK'; result: AfkPartyChunkResult }
  | { type: 'COMMIT_AFK_PARTY_TRANSACTION'; result: AfkPartyChunkResult; autoEquipment: readonly AutoEquipmentProfileAction[] | AfkPartyTransactionPlanner; attribution?: AfkPartyTransactionAttribution }
  | { type: 'RESET_GAME' }
  | { type: 'IMPORT_GAME_STATE'; state: GameState }
  | { type: 'COMMIT_API_STATE'; state: GameState }
  | { type: 'RESET_COMMON_BAGS'; partyIndex?: number }
  | { type: 'RESET_UNIQUE_BAGS'; partyIndex?: number }
  | { type: 'RESET_COMMON_SUPER_RARE_BAG'; partyIndex?: number }
  | { type: 'RESET_RARE_SUPER_RARE_BAG'; partyIndex?: number }
  | { type: 'RESET_SIDE_QUEST_BAG'; partyIndex?: number }
  | { type: 'SET_LANGUAGE'; language: Language }
  | { type: 'UNLOCK_PARTY_SLOT' };

function applyAfkExpeditionSideQuestOutcome(state: GameState, partyIndex: number, simulatedAt: number): GameState {
  const party = state.parties[partyIndex];
  const afkLog = party?.lastExpeditionLog;
  if (!party?.sideQuest || !afkLog) return state;
  const decision = resolveSideQuestOutcome({
    sideQuestType: party.sideQuest.type,
    finalOutcome: afkLog.finalOutcome,
    rewards: afkLog.rewards,
  });
  if (!decision) return state;
  return decision.type === 'advance'
    ? gameReducer(state, {
        type: 'ADVANCE_SIDE_QUEST',
        partyIndex,
        amount: decision.amount,
        simulatedAt,
      })
    : gameReducer(state, {
        type: 'SET_SIDE_QUEST_PROGRESS',
        partyIndex,
        progress: decision.progress,
      });
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
  // SpecRef: 5.1.1 | Party State Machine | state.move
  // SpecRef: 5.1.1 | Party State Machine | state.return
  const isColosseum = party.selectedDungeonId === 99;
  const expeditionTier = Math.max(0, party.selectedDungeonId);
  const moveSeconds = Math.ceil((isColosseum ? 1 : (1 + expeditionTier)) * stepSeconds);
  const returnSeconds = Math.ceil((isColosseum ? 1 : (5 + expeditionTier)) * stepSeconds);

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

export function hasActiveNonGodBattleClearGateCondition(party: Party): boolean {
  // SpecRef: 5.1.2 | Side Quest | Trigger Condition
  const currentDungeon = DUNGEONS.find((dungeon) => dungeon.id === party.selectedDungeonId);
  if (!currentDungeon || !currentDungeon.floors || currentDungeon.id === 99) return false;

  for (const floor of currentDungeon.floors) {
    if (floor.floorNumber >= 6) continue;
    if (!isClearGateUnlocked(party, getEliteGateKey(currentDungeon.id, floor.floorNumber))) return true;
  }

  if (!isClearGateUnlocked(party, getBossGateKey(currentDungeon.id))) return true;

  const nextDungeon = DUNGEONS.find((dungeon) => dungeon.id === currentDungeon.id + 1);
  if (!nextDungeon) return false;

  const entryUnlocked = isDungeonEntryUnlocked(party, nextDungeon.id);
  return !entryUnlocked;
}



const createExpeditionApplicationAdapters = createDefaultExpeditionApplicationAdapterFactory({
  normalizeBags: normalizeImportedBags,
  getDiarySettings: getDiarySettingsWithDefaults,
  addItemToInventory,
});

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


export function getPartyAbilityLevel(party: Party, abilityId: string): number {
  const { characterStats } = computePartyStats(party);
  return characterStats.reduce((maxLevel, stats) => {
    const abilityLevel = stats.abilities
      .filter((ability) => ability.id === abilityId)
      .reduce((abilityMaxLevel, ability) => Math.max(abilityMaxLevel, ability.level), 0);
    return Math.max(maxLevel, abilityLevel);
  }, 0);
}

type ProfitAbilityLevels = Readonly<{
  cunning: number;
  momentum: number;
  squander: number;
  tithe: number;
}>;

function getProfitAbilityLevels(party: Party): ProfitAbilityLevels {
  return getProfitAbilityLevelsFromStatus(computePartyStats(party));
}

function getProfitAbilityLevelsFromStatus(status: ComputedPartyStatus): ProfitAbilityLevels {
  const levels = { cunning: 0, momentum: 0, squander: 0, tithe: 0 };
  for (const stats of status.characterStats) {
    for (const ability of stats.abilities) {
      if (ability.id === 'cunning') levels.cunning = Math.max(levels.cunning, ability.level);
      else if (ability.id === 'momentum') levels.momentum = Math.max(levels.momentum, ability.level);
      else if (ability.id === 'squander') levels.squander = Math.max(levels.squander, ability.level);
      else if (ability.id === 'tithe') levels.tithe = Math.max(levels.tithe, ability.level);
    }
  }
  return levels;
}

function getPrayerDepositMultiplierFromLevel(party: Party, momentumLevel: number): number {
  const deityDepositMultiplier = getDeityDepositMultiplier(party.deity.name, party.deityGold ?? 0);
  const momentumEmbezzlementRate = momentumLevel > 0 ? 0.1 : 0;
  return Math.max(0, deityDepositMultiplier - momentumEmbezzlementRate);
}

function getCurrentPartyCunningMultiplier(party: Party): number {
  const abilityLevels = getProfitAbilityLevels(party);
  const cunningLevel = abilityLevels.cunning;
  const abilityMultiplier = cunningLevel >= 2 ? 1.3 : cunningLevel >= 1 ? 1.2 : 1;

  return abilityMultiplier * getPrayerDepositMultiplierFromLevel(party, abilityLevels.momentum);
}

function getPrayerDepositMultiplier(party: Party): number {
  const momentumLevel = getPartyAbilityLevel(party, 'momentum');
  const deityDepositMultiplier = getDeityDepositMultiplier(party.deity.name, party.deityGold ?? 0);
  const momentumEmbezzlementRate = momentumLevel > 0 ? 0.1 : 0;

  return Math.max(0, deityDepositMultiplier - momentumEmbezzlementRate);
}

function rollPercentInclusive(min: number, max: number): number {
  const lower = Math.ceil(Math.min(min, max));
  const upper = Math.floor(Math.max(min, max));
  return Math.floor(gameplayRandom() * (upper - lower + 1)) + lower;
}

type PrayerProfitResult = {
  donation: number;
  deposit: number;
  embezzled: number;
};

export function calculatePrayerProfit(
  party: Party,
  pendingProfit: number,
  abilityLevels?: ProfitAbilityLevels,
): PrayerProfitResult {
  // SpecRef: 5.1.1 | Party State Machine | state.pray
  const cyclePendingProfit = Math.max(0, Math.floor(pendingProfit));
  const isNoFaith = isNoFaithDeity(party.deity.name);
  const donationRate = rollPercentInclusive(10, 33);
  const baseDonation = Math.floor((cyclePendingProfit * donationRate) / 100);
  const titheLevel = abilityLevels?.tithe ?? getPartyAbilityLevel(party, 'tithe');
  const titheBonusRate = isNoFaith ? 0 : (titheLevel >= 2 ? 0.15 : titheLevel >= 1 ? 0.1 : 0);
  const titheBonus = Math.floor(cyclePendingProfit * titheBonusRate);
  const donation = isNoFaith ? 0 : Math.min(cyclePendingProfit, baseDonation + titheBonus);
  const rawDeposit = Math.max(0, cyclePendingProfit - donation);
  const deposit = Math.floor(rawDeposit * (
    abilityLevels
      ? getPrayerDepositMultiplierFromLevel(party, abilityLevels.momentum)
      : getPrayerDepositMultiplier(party)
  ));
  const embezzled = Math.max(0, rawDeposit - deposit);

  return { donation, deposit, embezzled };
}

export function calculateFreeActionSpend(
  party: Party,
  pendingProfit: number,
  abilityLevels?: ProfitAbilityLevels,
): number {
  // SpecRef: 5.1.1 | Party State Machine | state.free_action
  const cyclePendingProfit = Math.max(0, Math.floor(pendingProfit));
  const baseSpend = Math.floor((cyclePendingProfit * rollPercentInclusive(20, 40)) / 100);
  const squanderLevel = abilityLevels?.squander ?? getPartyAbilityLevel(party, 'squander');
  const squanderMultiplier = squanderLevel >= 2 ? 1.5 : squanderLevel >= 1 ? 1.3 : 1;

  return Math.min(cyclePendingProfit, Math.floor(baseSpend * squanderMultiplier));
}

function processAfkCycleProfit(
  state: GameState,
  partyIndex: number,
  simulatedAt: number,
  workerOptimization: AfkWorkerSimulationStrategy = 'optimized',
  optimizedAbilityLevels?: ProfitAbilityLevels,
): GameState {
  // SpecRef: 5.1.1 | Party State Machine | state.free_action
  // SpecRef: 5.1.1 | Party State Machine | state.pray
  const party = state.parties[partyIndex];
  if (!party) return state;

  const pendingProfit = Math.max(0, Math.floor(party.pendingProfit ?? 0));
  if (pendingProfit <= 0) return state;

  // Free action and prayer mutate only profit/global values. Equipment, level,
  // deity, and every ability input remain unchanged between them, so one
  // projection is authoritative for the complete Cycle profit transaction.
  const abilityLevels = workerOptimization === 'optimized'
    ? optimizedAbilityLevels ?? getProfitAbilityLevels(party)
    : undefined;
  const spend = calculateFreeActionSpend(party, pendingProfit, abilityLevels);
  let nextState = gameReducer(state, { type: 'SPEND_PENDING_PROFIT', partyIndex, amount: spend });

  if (party.sideQuest?.type === 'q.squander' && spend > 0) {
    nextState = gameReducer(nextState, { type: 'ADVANCE_SIDE_QUEST', partyIndex, amount: spend, simulatedAt });
  }

  const partyAtPrayer = nextState.parties[partyIndex];
  if (!partyAtPrayer) return nextState;
  const prayerPendingProfit = Math.max(0, Math.floor(partyAtPrayer.pendingProfit ?? 0));
  const { donation, deposit, embezzled } = calculatePrayerProfit(partyAtPrayer, prayerPendingProfit, abilityLevels);
  nextState = gameReducer(nextState, { type: 'PROCESS_PENDING_PROFIT', partyIndex, donation, deposit });

  if (partyAtPrayer.sideQuest?.type === 'q.donation' && donation > 0) {
    nextState = gameReducer(nextState, { type: 'ADVANCE_SIDE_QUEST', partyIndex, amount: donation, simulatedAt });
  }
  if (partyAtPrayer.sideQuest?.type === 'q.savings' && deposit > 0) {
    nextState = gameReducer(nextState, { type: 'ADVANCE_SIDE_QUEST', partyIndex, amount: deposit, simulatedAt });
  }
  if (partyAtPrayer.sideQuest?.type === 'q.embezzlement' && embezzled > 0) {
    nextState = gameReducer(nextState, { type: 'ADVANCE_SIDE_QUEST', partyIndex, amount: embezzled, simulatedAt });
  }

  return nextState;
}

interface AutoEquipmentReducerContext {
  hpStrategy: AutoEquipmentHpStrategy;
  stateStrategy: AutoEquipmentStateStrategy;
  maxHpByPartyId: Map<number, number>;
  hpLedgerByPartyId: Map<number, PartyMaxHpLedger>;
  inventoryDraft?: InventoryRecord;
  jewelDraft?: JewelInventory;
  attribution?: AutoEquipmentReducerAttribution;
}

function measureAutoEquipmentReducerWork<T>(
  context: AutoEquipmentReducerContext | undefined,
  phase: 'partyStatsMs' | 'inventoryPreparationMs' | 'inventoryMutationMs' | 'jewelMutationMs',
  operation: () => T,
): T {
  if (!context?.attribution) return operation();
  const startedAt = performance.now();
  try {
    return operation();
  } finally {
    context.attribution[phase] += Math.max(0, performance.now() - startedAt);
  }
}

function getAutoEquipmentInventoryForMutation(
  context: AutoEquipmentReducerContext | undefined,
  inventory: InventoryRecord,
): InventoryRecord {
  if (context?.stateStrategy !== 'copy_once_transaction') return inventory;
  if (!context.inventoryDraft) {
    context.inventoryDraft = measureAutoEquipmentReducerWork(
      context,
      'inventoryPreparationMs',
      () => ({ ...inventory }),
    );
    if (context.attribution) context.attribution.transactionInventoryRecordClones += 1;
  }
  return context.inventoryDraft;
}

function getAutoEquipmentJewelsForMutation(
  context: AutoEquipmentReducerContext | undefined,
  jewels: JewelInventory,
): JewelInventory {
  if (context?.stateStrategy !== 'copy_once_transaction') return jewels;
  if (!context.jewelDraft) {
    context.jewelDraft = measureAutoEquipmentReducerWork(
      context,
      'inventoryPreparationMs',
      () => ({ ...jewels }),
    );
    if (context.attribution) context.attribution.transactionJewelRecordClones += 1;
  }
  return context.jewelDraft;
}

function syncPartyCurrentHpAfterMaxHpChange(
  previousParty: Party,
  nextParty: Party,
  changedCharacterId: number,
  autoEquipmentContext?: AutoEquipmentReducerContext,
): Party {
  if (autoEquipmentContext?.hpStrategy === 'incremental_hp') {
    let ledger = autoEquipmentContext.hpLedgerByPartyId.get(previousParty.id);
    if (!ledger) {
      ledger = measureAutoEquipmentReducerWork(
        autoEquipmentContext,
        'partyStatsMs',
        () => createPartyMaxHpLedger(previousParty),
      );
      autoEquipmentContext.hpLedgerByPartyId.set(previousParty.id, ledger);
      if (autoEquipmentContext.attribution) {
        autoEquipmentContext.attribution.hpLedgerInitializations += 1;
        autoEquipmentContext.attribution.characterHpContributionCalls += previousParty.characters.length;
        autoEquipmentContext.attribution.characterStatsCalls += previousParty.characters.length;
      }
    }
    const previousMaxHp = ledger.maxHp;
    const update = measureAutoEquipmentReducerWork(
      autoEquipmentContext,
      'partyStatsMs',
      () => updatePartyMaxHpLedger(ledger!, previousParty, nextParty, changedCharacterId),
    );
    autoEquipmentContext.hpLedgerByPartyId.set(nextParty.id, update.ledger);
    if (autoEquipmentContext.attribution) {
      if (update.rebuilt) {
        autoEquipmentContext.attribution.hpLedgerRebuilds += 1;
        autoEquipmentContext.attribution.characterHpContributionCalls += nextParty.characters.length;
        autoEquipmentContext.attribution.characterStatsCalls += nextParty.characters.length;
      } else {
        autoEquipmentContext.attribution.hpLedgerUpdates += 1;
        autoEquipmentContext.attribution.characterHpContributionCalls += 1;
        autoEquipmentContext.attribution.characterStatsCalls += 1;
      }
    }
    const nextMaxHp = update.ledger.maxHp;
    if (nextMaxHp <= 0) return nextParty;
    const previousCurrentHp = typeof previousParty.currentHp === 'number'
      ? previousParty.currentHp
      : previousMaxHp;
    const damagedHp = Math.max(0, previousMaxHp - Math.max(0, previousCurrentHp));
    return {
      ...nextParty,
      currentHp: Math.max(1, Math.min(nextMaxHp, nextMaxHp - damagedHp)),
    };
  }

  const cachedPreviousMaxHp = autoEquipmentContext?.maxHpByPartyId.get(previousParty.id);
  const previousMaxHp = cachedPreviousMaxHp ?? measureAutoEquipmentReducerWork(
    autoEquipmentContext,
    'partyStatsMs',
    () => autoEquipmentContext?.hpStrategy === 'whole_party_max_hp'
      ? computePartyMaxHp(previousParty)
      : computePartyStats(previousParty).partyStats.hp,
  );
  if (autoEquipmentContext?.attribution && cachedPreviousMaxHp === undefined) {
    const characterCount = previousParty.characters.length;
    if (autoEquipmentContext.hpStrategy === 'whole_party_max_hp') {
      autoEquipmentContext.attribution.partyMaxHpCalls += 1;
      autoEquipmentContext.attribution.characterHpContributionCalls += characterCount;
      autoEquipmentContext.attribution.characterStatsCalls += characterCount;
    } else {
      autoEquipmentContext.attribution.partyStatsCalls += 1;
      autoEquipmentContext.attribution.characterHpContributionCalls += characterCount;
      autoEquipmentContext.attribution.characterStatsCalls += characterCount * 2;
    }
  }
  const nextMaxHp = measureAutoEquipmentReducerWork(
    autoEquipmentContext,
    'partyStatsMs',
    () => autoEquipmentContext?.hpStrategy === 'whole_party_max_hp'
      ? computePartyMaxHp(nextParty)
      : computePartyStats(nextParty).partyStats.hp,
  );
  if (autoEquipmentContext?.attribution) {
    const characterCount = nextParty.characters.length;
    if (autoEquipmentContext.hpStrategy === 'whole_party_max_hp') {
      autoEquipmentContext.attribution.partyMaxHpCalls += 1;
      autoEquipmentContext.attribution.characterHpContributionCalls += characterCount;
      autoEquipmentContext.attribution.characterStatsCalls += characterCount;
    } else {
      autoEquipmentContext.attribution.partyStatsCalls += 1;
      autoEquipmentContext.attribution.characterHpContributionCalls += characterCount;
      autoEquipmentContext.attribution.characterStatsCalls += characterCount * 2;
    }
  }
  autoEquipmentContext?.maxHpByPartyId.set(nextParty.id, nextMaxHp);
  if (nextMaxHp <= 0) return nextParty;

  const previousCurrentHp = typeof previousParty.currentHp === 'number'
    ? previousParty.currentHp
    : previousMaxHp;
  const damagedHp = Math.max(0, previousMaxHp - Math.max(0, previousCurrentHp));
  const nextCurrentHp = Math.max(1, Math.min(nextMaxHp, nextMaxHp - damagedHp));

  return {
    ...nextParty,
    // SpecRef: 8.2.4 | Equipment management | HP synchronization after equipment changes
    currentHp: nextCurrentHp,
  };
}

function applyInventoryAvailabilityRevisions(
  previous: GameState,
  next: GameState,
  changedKeys?: { equipment: readonly string[]; jewels: readonly string[] },
): GameState {
  if (previous === next) return next;
  const equipmentChanged = hasNewAvailability(previous.global.inventory, next.global.inventory, changedKeys?.equipment);
  const jewelChanged = hasNewAvailability(previous.global.jewels, next.global.jewels, changedKeys?.jewels);
  if (!equipmentChanged && !jewelChanged) return next;
  return {
    ...next,
    global: {
      ...next.global,
      equipmentInventoryRevision: (next.global.equipmentInventoryRevision ?? 0) + (equipmentChanged ? 1 : 0),
      jewelInventoryRevision: (next.global.jewelInventoryRevision ?? 0) + (jewelChanged ? 1 : 0),
    },
  };
}

function commitAfkChunkWithAvailabilityRevisions(state: GameState, result: AfkPartyChunkResult): GameState {
  // SpecRef: 5.1 | Chunk | Coordinator process
  // SpecRef: 7.1.2.1 | Dirty check | equipmentInventoryRevision
  // Only the committed delta can change availability. Compare against current
  // authority, never the stale worker snapshot, before invoking the planner.
  return applyInventoryAvailabilityRevisions(state, commitAfkPartyChunk(state, result), {
    equipment: Object.keys(result.globalDelta.inventory),
    jewels: Object.keys(result.globalDelta.jewels),
  });
}

function reduceGameState(
  state: GameState,
  action: GameAction,
  autoEquipmentContext?: AutoEquipmentReducerContext,
  afkChunkContext?: AfkChunkReducerContext,
): GameState {
  switch (action.type) {

    case 'APPLY_AUTO_EQUIPMENT_ACTIONS': {
      // SpecRef: 7.1.1 | AUTO equipment logic | Processing priority
      const context: AutoEquipmentReducerContext = {
        hpStrategy: action.hpStrategy ?? 'incremental_hp',
        stateStrategy: action.stateStrategy ?? 'copy_once_transaction',
        maxHpByPartyId: new Map(),
        hpLedgerByPartyId: new Map(),
        attribution: action.attribution,
      };
      const startedAt = action.attribution ? performance.now() : 0;
      const nextState = action.actions.reduce((current, nestedAction) => reduceGameState(current, nestedAction, context), state);
      if (action.attribution) {
        const totalMs = Math.max(0, performance.now() - startedAt);
        action.attribution.structuralAndControlMs = Math.max(
          0,
          totalMs
            - action.attribution.partyStatsMs
            - action.attribution.inventoryPreparationMs
            - action.attribution.inventoryMutationMs
            - action.attribution.jewelMutationMs,
        );
      }
      return nextState;
    }
    case 'STAMP_FULL_AUTO_EQUIPMENT': {
      const party = state.parties[action.partyIndex];
      if (!party) return state;
      const parties = [...state.parties];
      parties[action.partyIndex] = {
        ...party,
        lastFullEquipmentRevision: Math.max(0, Math.floor(action.equipmentRevision)),
        lastFullJewelRevision: Math.max(0, Math.floor(action.jewelRevision)),
      };
      return { ...state, parties };
    }
    case 'SET_LANGUAGE': {
      // SpecRef: 8.1 | UI_FOUNDATIONS | Mode select (モード切替) Persist language
      // SpecRef: 5.1.4 | Save and load | Persisted user settings
      const language = normalizeLanguage(action.language);
      persistLanguage(language);
      const sourceLanguage = normalizeLanguage(state.global.language);
      setActiveLanguage(language);
      const parties = translatePartyCharacterNames(state.parties, sourceLanguage, language);
      return { ...state, parties, global: { ...state.global, language } };
    }

    case 'SELECT_PARTY':
      return { ...state, selectedPartyIndex: action.partyIndex };

    case 'MARK_DEVELOPER_NEWS_READ': {
      // SpecRef: 8.6 | UI_SETTING | Developer News Notification (通知)
      const nextReadIds = Array.from(new Set([
        ...(state.global.readDeveloperNewsItemIds ?? []),
        ...action.itemIds.filter((itemId) => itemId.trim().length > 0),
      ]));
      return { ...state, global: { ...state.global, readDeveloperNewsItemIds: nextReadIds } };
    }

    case 'SELECT_DUNGEON': {
      // SpecRef: 8.3 | UI_EXPEDITION | Manual Destination Selection
      const updatedParties = [...state.parties];
      const targetParty = updatedParties[action.partyIndex];
      const selectionMode = action.selectionMode ?? 'manual';
      updatedParties[action.partyIndex] = {
        ...targetParty,
        selectedDungeonId: action.dungeonId,
        expeditionDestinationMode: selectionMode === 'manual' ? 'fixed' : targetParty.expeditionDestinationMode,
        expeditionDifficultyOffset: normalizeExpeditionDifficultyOffset(
          targetParty.expeditionDifficultyOffsetByDungeon?.[action.dungeonId] ?? 0,
        ),
      };
      return { ...state, parties: updatedParties };
    }

    case 'SET_EXPEDITION_DESTINATION_MODE': {
      // SpecRef: 8.3 | UI_EXPEDITION | Toggle Operation
      const updatedParties = [...state.parties];
      updatedParties[action.partyIndex] = {
        ...updatedParties[action.partyIndex],
        expeditionDestinationMode: normalizeExpeditionDestinationMode(action.mode),
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
      const targetParty = updatedParties[action.partyIndex];
      const targetDungeon = getDungeonById(targetParty.selectedDungeonId);
      const normalizedOffset = normalizeExpeditionDifficultyOffset(action.difficultyOffset, getDifficultyOffsetMax(targetDungeon?.expLevel ?? 88));
      updatedParties[action.partyIndex] = {
        ...targetParty,
        expeditionDifficultyOffset: normalizedOffset,
        expeditionDifficultyOffsetByDungeon: {
          ...(targetParty.expeditionDifficultyOffsetByDungeon ?? {}),
          [targetParty.selectedDungeonId]: normalizedOffset,
        },
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

    case 'CONSUME_INSTANT_EXPEDITION_STOCK': {
      const currentParty = state.parties[action.partyIndex];
      if (!currentParty) return state;
      const now = action.now ?? Date.now();
      const nextParty = consumeInstantExpeditionStock(currentParty, now, action.chargeDurationScale);
      if (nextParty.instantExpeditionStock === currentParty.instantExpeditionStock
        && nextParty.instantExpeditionChargeStartedAt === currentParty.instantExpeditionChargeStartedAt) {
        return state;
      }
      const updatedParties = [...state.parties];
      updatedParties[action.partyIndex] = nextParty;
      return {
        ...state,
        parties: updatedParties,
      };
    }

    case 'RESOLVE_INSTANT_EXPEDITION': {
      // SpecRef: 8.5 | UI_DIARY | When a party was defeated, the diary updates.
      // Resolve and finalize as one reducer transaction so another sortie cannot
      // replace the pending defeat entry before it reaches the diary.
      const expeditionState = reduceGameState(state, {
        type: 'RUN_EXPEDITION',
        partyIndex: action.partyIndex,
        simulatedAt: action.simulatedAt,
        gameMode: action.gameMode,
        enemyLevelOffset: action.enemyLevelOffset,
        triggerGodsBattle: action.triggerGodsBattle,
        authoritativePartyStatus: action.authoritativePartyStatus,
      });
      return reduceGameState(expeditionState, {
        type: 'FINALIZE_DIARY_LOG',
        partyIndex: action.partyIndex,
        simulatedAt: action.simulatedAt,
      });
    }

    case 'RUN_EXPEDITION': {
      const result = runExpeditionApplication({
        state,
        command: action,
        authorities: {
          random: gameplayRandom,
          getCommittedAt: () => Date.now(),
        },
        adapters: createExpeditionApplicationAdapters(
          afkChunkContext ? {
            inventoryOverlay: afkChunkContext.inventoryOverlay,
            encounterCache: afkChunkContext.encounterCache,
          } : undefined,
        ),
        ...(AFK_LIVE_PROFILE_BUILD_ENABLED && afkChunkContext?.workerAttribution
          ? { attribution: afkChunkContext.workerAttribution }
          : {}),
      });
      if ('statusAuthoritySupplied' in result) {
        recordRunExpeditionStatusAuthority(result.statusAuthoritySupplied);
      }
      if (result.kind === 'unchanged') return state;
      if (result.kind === 'forecast') {
        forecastResolutionByState.set(result.state, result.resolution);
        return result.state;
      }
      return {
        ...state,
        ...result.projection,
      };
    }

    case 'FINALIZE_DIARY_LOG': {
      const party = state.parties[action.partyIndex];
      if (!party) return state;

      const pendingDiaryLog = party.pendingDiaryLog;
      const pendingUnlockState = party.pendingUnlockState;
      // SpecRef: 8.5 | UI_DIARY | Use the emulated in-game timestamp rather than the device or system timestamp.
      const createdAtBase = pendingDiaryLog?.createdAt ?? action.simulatedAt ?? Date.now();
      const unlockDiaryLog = pendingUnlockState
        ? getUnlockDiaryLog(
            party.lastExpeditionLog,
            state.parties.length,
            pendingUnlockState,
            createdAtBase + 1,
          )
        : null;
      const nextDiaryLogs = addDiaryLogs(party.diaryLogs ?? [], [
        ...(unlockDiaryLog ? [unlockDiaryLog] : []),
        ...(pendingDiaryLog ? [pendingDiaryLog] : []),
      ]);

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
          && conditionBase >= 251
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
        pendingClearGateSnapshot: null,
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


      const challengedGodNamesFromNewLog = (pendingDiaryLog?.expeditionLog?.entries ?? [])
        .filter((entry) => hasGodsBattleSuffix(entry.enemyName))
        .map((entry) => normalizeChallengedGodName(entry.enemyName));
      if (challengedGodNamesFromNewLog.length > 0) {
        nextGlobal = {
          ...nextGlobal,
          challengedGodNames: Array.from(new Set([
            ...(nextGlobal.challengedGodNames ?? []),
            ...challengedGodNamesFromNewLog,
          ])),
        };
      }

      return {
        ...state,
        parties: updatedParties,
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
      let bags = refillBagIfEmpty(normalizeImportedBags(currentParty.bags), 'sideQuestBag');
      const { ticket, newBag } = drawFromBag(bags.sideQuestBag);
      bags = { ...bags, sideQuestBag: newBag };
      if (ticket === 0) {
        const updatedParties = [...state.parties];
        updatedParties[action.partyIndex] = { ...currentParty, bags };
        return { ...state, parties: updatedParties };
      }

      // SpecRef: 5.1.2 | Side Quest | Side quest difficulty
      const def = SIDE_QUEST_RUNTIME_DEFS[ticket];
      if (!def) {
        const updatedParties = [...state.parties];
        updatedParties[action.partyIndex] = { ...currentParty, bags };
        return { ...state, parties: updatedParties };
      }
      const sideQuestLevel = getSideQuestLevelFromExpId(Math.floor(action.rolledTier));
      const multiplier = def.scaleByLevel[sideQuestLevel] ?? 1;
      const scaledMin = Math.round(def.baseMin * multiplier);
      const scaledMax = Math.round(def.baseMax * multiplier);
      const min = Math.min(scaledMin, scaledMax);
      const max = Math.max(scaledMin, scaledMax);
      const target = Math.floor(gameplayRandom() * (max - min + 1)) + min;
      const internalTarget = TIME_BASED_SIDE_QUEST_TYPES.has(def.type) ? target * 60 : target;
      const assignedAt = action.simulatedAt ?? Date.now();
      const expiresAt = def.deadlineHours > 0
        ? assignedAt + (def.deadlineHours * 60 * 60 * 1000)
        : Number.MAX_SAFE_INTEGER;
      const updatedParties = [...state.parties];
      updatedParties[action.partyIndex] = {
        ...currentParty,
        bags,
        sideQuest: {
          id: ticket,
          type: def.type,
          shortTextKey: def.shortTextKey,
          shortText: formatSideQuestShortText(def.type, def.shortTextKey, target),
          target: internalTarget,
          progress: 0,
          rolledTier: Math.max(1, Math.min(8, Math.floor(action.rolledTier))),
          assignedAt,
          expiresAt,
        },
      };
      return { ...state, parties: updatedParties };
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
      const key = jewelKeys[Math.floor(gameplayRandom() * jewelKeys.length)];
      const rewardRank = Math.floor(gameplayRandom() * currentParty.sideQuest.rolledTier) + 1;
      const diaryCreatedAt = action.simulatedAt ?? Date.now();
      const dungeonName = DUNGEONS.find((dungeon) => dungeon.id === currentParty.selectedDungeonId)?.name ?? '';
      const sideQuestLabel = currentParty.sideQuest.shortTextKey
        ? t(currentParty.sideQuest.shortTextKey)
        : currentParty.sideQuest.shortText.replace(/\(([^)]*)\)/, '$1');
      const sideQuestDetail = t('sideQuest.reward.jewelObtained', { dungeon: dungeonName, jewel: getJewelNameByRank(key, rewardRank) });
      const shouldAddSideQuestDiary = matchesSideQuestDiaryThreshold(
        rewardRank,
        getDiarySettingsWithDefaults(currentParty.diarySettings).sideQuestThreshold,
      );
      const sideQuestDiaryLog: DiaryLog | null = shouldAddSideQuestDiary
        ? {
            id: `${diaryCreatedAt}-${gameplayRandom().toString(36).slice(2, 8)}`,
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
          }
        : null;
      const nextDiaryLogs: DiaryLog[] = addDiaryLogs(currentParty.diaryLogs ?? [], [
        ...(sideQuestDiaryLog ? [sideQuestDiaryLog] : []),
      ]);
      updatedParties[action.partyIndex] = {
        ...currentParty,
        sideQuest: null,
        diaryLogs: nextDiaryLogs,
        hasUnreadDiary: sideQuestDiaryLog ? true : currentParty.hasUnreadDiary,
      };
      return {
        ...state,
        parties: updatedParties,
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
      const usesTransactionDraft = autoEquipmentContext?.stateStrategy === 'copy_once_transaction';
      let newInventory = getAutoEquipmentInventoryForMutation(autoEquipmentContext, state.global.inventory);
      let newJewels = state.global.jewels;
      let newGold = state.global.gold;
      if (autoEquipmentContext?.stateStrategy === 'legacy_eager_clone') {
        newInventory = measureAutoEquipmentReducerWork(
          autoEquipmentContext,
          'inventoryPreparationMs',
          () => ({ ...newInventory }),
        );
        newJewels = measureAutoEquipmentReducerWork(
          autoEquipmentContext,
          'inventoryPreparationMs',
          () => ({ ...newJewels }),
        );
        if (autoEquipmentContext.attribution) {
          autoEquipmentContext.attribution.eagerInventoryRecordClones += 1;
          autoEquipmentContext.attribution.eagerJewelRecordClones += 1;
        }
      }

      // Add old item back to inventory
      const oldItem = character.equipment[action.slotIndex];
      if (oldItem) {
        const addResult = measureAutoEquipmentReducerWork(
          autoEquipmentContext,
          'inventoryMutationMs',
          () => addItemToInventory(newInventory, oldItem, newGold, 1, usesTransactionDraft),
        );
        if (autoEquipmentContext?.attribution && addResult.inventory !== newInventory) {
          autoEquipmentContext.attribution.inventoryMutationRecordClones += 1;
        }
        newInventory = addResult.inventory;
        newGold = addResult.gold;
        if (oldItem.jewel) {
          newJewels = getAutoEquipmentJewelsForMutation(autoEquipmentContext, newJewels);
          const previousJewels = newJewels;
          newJewels = measureAutoEquipmentReducerWork(
            autoEquipmentContext,
            'jewelMutationMs',
            () => addJewelToInventory(
              previousJewels,
              oldItem.jewel!.key,
              oldItem.jewel!.rank,
              1,
              usesTransactionDraft,
            ),
          );
          if (autoEquipmentContext?.attribution && newJewels !== previousJewels) {
            autoEquipmentContext.attribution.jewelMutationRecordClones += 1;
          }
        }
      }

      // Remove new item from inventory and equip
      if (action.itemKey) {
        const variant = newInventory[action.itemKey];
        if (variant && variant.count > 0) {
          const previousInventory = newInventory;
          newInventory = measureAutoEquipmentReducerWork(
            autoEquipmentContext,
            'inventoryMutationMs',
            () => removeItemFromInventory(previousInventory, action.itemKey!, usesTransactionDraft),
          );
          if (autoEquipmentContext?.attribution && newInventory !== previousInventory) {
            autoEquipmentContext.attribution.inventoryMutationRecordClones += 1;
          }
          const equippedCharacter = {
            ...replaceCharacterEquipment(character, action.slotIndex, { ...variant.item, jewel: null }),
            autoEquipmentMode: nextAutoEquipmentMode,
          };
          const newCharacters = [...currentParty.characters];
          newCharacters[charIndex] = equippedCharacter;

          const updatedParties = [...state.parties];
          updatedParties[targetPartyIndex] = syncPartyCurrentHpAfterMaxHpChange(currentParty, {
            ...currentParty,
            characters: newCharacters
          }, character.id, autoEquipmentContext);
          if (autoEquipmentContext?.attribution) autoEquipmentContext.attribution.appliedEquipmentActions += 1;

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
      updatedParties[targetPartyIndex] = syncPartyCurrentHpAfterMaxHpChange(currentParty, {
        ...currentParty,
        characters: newCharacters
      }, character.id, autoEquipmentContext);
      if (autoEquipmentContext?.attribution) autoEquipmentContext.attribution.appliedEquipmentActions += 1;

      return {
        ...state,
        parties: updatedParties,
        global: { ...state.global, gold: newGold, inventory: newInventory, jewels: newJewels },
      };
    }

    case 'REMOVE_ALL_EQUIPMENT':
    case 'LOAD_EQUIPMENT_SET': {
      const targetPartyIndex = action.partyIndex ?? state.selectedPartyIndex;
      const currentParty = state.parties[targetPartyIndex];
      if (!currentParty) return state;
      const charIndex = currentParty.characters.findIndex((candidate) => candidate.id === action.characterId);
      if (charIndex === -1) return state;
      const character = currentParty.characters[charIndex];
      const set = action.type === 'LOAD_EQUIPMENT_SET'
        ? state.global.savedEquipmentSets.find((candidate) => candidate.slot === action.slot)
        : { slot: 0, name: '', createdAt: Date.now(), equipment: [] } satisfies SavedEquipmentSet;
      if (!set) return state;
      const maxSlots = computeCharacterStats(character, currentParty.level).maxEquipSlots;
      const result = applyEquipmentSet(
        set,
        character,
        state.global.inventory,
        state.global.jewels,
        state.global.gold,
        maxSlots,
        action.type === 'LOAD_EQUIPMENT_SET' ? action.mode : 'exact',
      );
      const characters = [...currentParty.characters];
      characters[charIndex] = result.character;
      const parties = [...state.parties];
      parties[targetPartyIndex] = syncPartyCurrentHpAfterMaxHpChange(currentParty, {
        ...currentParty,
        characters,
      }, character.id);
      return {
        ...state,
        parties,
        global: {
          ...state.global,
          gold: result.gold,
          inventory: result.inventory,
          jewels: result.jewels,
        },
      };
    }

    case 'SAVE_EQUIPMENT_SET': {
      if (state.global.savedEquipmentSets.length >= MAX_SAVED_EQUIPMENT_SETS) return state;
      const targetPartyIndex = action.partyIndex ?? state.selectedPartyIndex;
      const character = state.parties[targetPartyIndex]?.characters.find((candidate) => candidate.id === action.characterId);
      if (!character) return state;
      const occupied = new Set(state.global.savedEquipmentSets.map((set) => set.slot));
      const slot = Array.from({ length: MAX_SAVED_EQUIPMENT_SETS }, (_, index) => index + 1)
        .find((candidate) => !occupied.has(candidate));
      if (!slot) return state;
      const savedSet: SavedEquipmentSet = {
        slot,
        name: action.name.slice(0, 80),
        createdAt: action.createdAt,
        equipment: character.equipment
          .filter((item): item is Item => item != null)
          .map((item) => ({ item: structuredClone(item), isLocked: item.isLocked === true })),
      };
      return {
        ...state,
        global: {
          ...state.global,
          savedEquipmentSets: [...state.global.savedEquipmentSets, savedSet].sort((a, b) => a.slot - b.slot),
        },
      };
    }

    case 'RENAME_EQUIPMENT_SET': {
      const name = action.name.trim().slice(0, 80);
      if (!name) return state;
      return {
        ...state,
        global: {
          ...state.global,
          savedEquipmentSets: state.global.savedEquipmentSets.map((set) => set.slot === action.slot ? { ...set, name } : set),
        },
      };
    }

    case 'DELETE_EQUIPMENT_SET':
      return {
        ...state,
        global: {
          ...state.global,
          savedEquipmentSets: state.global.savedEquipmentSets.filter((set) => set.slot !== action.slot),
        },
      };

    case 'TOGGLE_EQUIPMENT_LOCK': {
      const targetPartyIndex = action.partyIndex ?? state.selectedPartyIndex;
      const currentParty = state.parties[targetPartyIndex];
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
      updatedParties[targetPartyIndex] = {
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
        const jewelsForMutation = getAutoEquipmentJewelsForMutation(autoEquipmentContext, state.global.jewels);
        const newJewels = measureAutoEquipmentReducerWork(
          autoEquipmentContext,
          'jewelMutationMs',
          () => addJewelToInventory(
            jewelsForMutation,
            action.jewelKey,
            action.rank,
            1,
            autoEquipmentContext?.stateStrategy === 'copy_once_transaction',
          ),
        );
        if (autoEquipmentContext?.attribution && newJewels !== jewelsForMutation) {
          autoEquipmentContext.attribution.jewelMutationRecordClones += 1;
        }
        const replacedItem: Item = { ...item, jewel: null };
        const newCharacters = [...currentParty.characters];
        newCharacters[charIndex] = replaceCharacterEquipment(character, action.slotIndex, replacedItem);

        const updatedParties = [...state.parties];
        updatedParties[targetPartyIndex] = syncPartyCurrentHpAfterMaxHpChange(currentParty, {
          ...currentParty,
          characters: newCharacters,
        }, character.id, autoEquipmentContext);
        if (autoEquipmentContext?.attribution) autoEquipmentContext.attribution.appliedJewelActions += 1;

        return {
          ...state,
          parties: updatedParties,
          global: { ...state.global, jewels: newJewels },
        };
      }

      if (getJewelOwnedCount(state.global.jewels, action.jewelKey, action.rank) <= 0) return state;

      const usesTransactionDraft = autoEquipmentContext?.stateStrategy === 'copy_once_transaction';
      const jewelsForMutation = getAutoEquipmentJewelsForMutation(autoEquipmentContext, state.global.jewels);
      let newJewels = measureAutoEquipmentReducerWork(
        autoEquipmentContext,
        'jewelMutationMs',
        () => removeJewelFromInventory(jewelsForMutation, action.jewelKey, action.rank, usesTransactionDraft),
      );
      if (autoEquipmentContext?.attribution && newJewels !== jewelsForMutation) {
        autoEquipmentContext.attribution.jewelMutationRecordClones += 1;
      }
      if (item.jewel) {
        const previousJewels = newJewels;
        newJewels = measureAutoEquipmentReducerWork(
          autoEquipmentContext,
          'jewelMutationMs',
          () => addJewelToInventory(previousJewels, item.jewel!.key, item.jewel!.rank, 1, usesTransactionDraft),
        );
        if (autoEquipmentContext?.attribution && newJewels !== previousJewels) {
          autoEquipmentContext.attribution.jewelMutationRecordClones += 1;
        }
      }
      const replacedItem: Item = { ...item, jewel: { key: action.jewelKey, rank: action.rank } };
      const newCharacters = [...currentParty.characters];
      newCharacters[charIndex] = replaceCharacterEquipment(character, action.slotIndex, replacedItem);

      const updatedParties = [...state.parties];
      updatedParties[targetPartyIndex] = syncPartyCurrentHpAfterMaxHpChange(currentParty, {
        ...currentParty,
        characters: newCharacters,
      }, character.id, autoEquipmentContext);
      if (autoEquipmentContext?.attribution) autoEquipmentContext.attribution.appliedJewelActions += 1;

      return {
        ...state,
        parties: updatedParties,
        global: { ...state.global, jewels: newJewels },
      };
    }

    case 'UPDATE_CHARACTER': {
      const targetPartyIndex = action.partyIndex ?? state.selectedPartyIndex;
      const currentParty = state.parties[targetPartyIndex];
      const charIndex = currentParty.characters.findIndex(c => c.id === action.characterId);
      if (charIndex === -1) return state;

      const oldChar = currentParty.characters[charIndex];
      // SpecRef: 2.1.4.2 | Initial setup | Unique Character Flag.
      const immutableForUnique: ReadonlySet<keyof Character> = new Set(['name', 'raceId', 'lineageId', 'predispositionId']);
      const sanitizedUpdates = oldChar.isUnique
        ? Object.fromEntries(
          Object.entries(action.updates).filter(([key]) => !immutableForUnique.has(key as keyof Character))
        ) as Partial<Character>
        : action.updates;

      // SpecRef: 8.2.3 | Character Edit Mode | A Mimorian enemy form can be assigned only once.
      // Enforce this in the reducer as well as the selector so non-UI callers cannot bypass it.
      const requestedRaceId = sanitizedUpdates.raceId ?? oldChar.raceId;
      const requestedMimorianEnemyId = sanitizedUpdates.mimorianEnemyId ?? oldChar.mimorianEnemyId;
      const isChangingMimorianAssignment = requestedRaceId === 'mimorian'
        && (oldChar.raceId !== 'mimorian' || requestedMimorianEnemyId !== oldChar.mimorianEnemyId);
      if (isChangingMimorianAssignment && !action.validatedMimorianAssignments) {
        const isUnlockedForm = requestedMimorianEnemyId != null
          && state.global.unlockedMimorianEnemyIds.includes(requestedMimorianEnemyId)
          && ENEMIES.some((enemy) => enemy.id === requestedMimorianEnemyId);
        const isAssignedElsewhere = state.parties.some((party) => party.characters.some((character) =>
          character.id !== oldChar.id
          && character.raceId === 'mimorian'
          && character.mimorianEnemyId === requestedMimorianEnemyId
        ));
        if (!isUnlockedForm || isAssignedElsewhere) return state;
      }
      const newCharacters = [...currentParty.characters];

      let newInventory = state.global.inventory;
      let newJewels = state.global.jewels;
      let newGold = state.global.gold;
      const nextCharacter = { ...oldChar, ...sanitizedUpdates };
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
          const detachedItem = item.jewel ? { ...item, jewel: null } : item;
          const addResult = addItemToInventory(newInventory, detachedItem, newGold);
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

          const detachedItem = item.jewel ? { ...item, jewel: null } : item;
          const addResult = addItemToInventory(newInventory, detachedItem, newGold);
          newInventory = addResult.inventory;
          newGold = addResult.gold;
          if (item.jewel) newJewels = addJewelToInventory(newJewels, item.jewel.key, item.jewel.rank);

          newEquipment[i] = null;
        }
      }

      newCharacters[charIndex] = { ...oldChar, ...sanitizedUpdates, equipment: newEquipment };

      const updatedParties = [...state.parties];
      updatedParties[targetPartyIndex] = syncPartyCurrentHpAfterMaxHpChange(currentParty, {
        ...currentParty,
        characters: newCharacters
      }, oldChar.id);

      return {
        ...state,
        parties: updatedParties,
        global: { ...state.global, gold: newGold, inventory: newInventory, jewels: newJewels },
      };
    }

    case 'REORDER_PARTY_CHARACTER': {
      const targetPartyIndex = action.partyIndex ?? state.selectedPartyIndex;
      const currentParty = state.parties[targetPartyIndex];
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
      updatedParties[targetPartyIndex] = {
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
      const sale = sellInventoryStack(
        state.global.inventory,
        action.variantKey,
        state.global.gold,
        state.global.prana,
        { getPrana: getSuperRareItemPrana },
      );
      if (sale.soldCount === 0) return state;

      const updatedParties = [...state.parties];
      updatedParties[state.selectedPartyIndex] = {
        ...currentParty
      };

      return {
        ...state,
        parties: updatedParties,
        global: {
          ...state.global,
          inventory: sale.inventory,
          gold: sale.gold,
          prana: sale.prana,
        },
      };
    }

    case 'SELL_ALL_OWNED': {
      const sale = sellAllOwnedInventory(
        state.global.inventory,
        state.global.gold,
        state.global.prana,
        { getPrana: getSuperRareItemPrana },
      );
      if (sale.soldCount === 0) return state;

      return {
        ...state,
        global: {
          ...state.global,
          inventory: sale.inventory,
          gold: sale.gold,
          prana: sale.prana,
        },
      };
    }

    case 'GRANT_FEEDBACK_REWARD': {
      // SpecRef: 8.6 | UI_SETTING | フィードバック
      return {
        ...state,
        global: { ...state.global, prana: state.global.prana + 10 },
      };
    }

    case 'UNLOCK_MIMORIAN_ENEMY': {
      // SpecRef: 8.4.5 | Altar (祭壇) | Enemy Form List
      const enemy = ENEMIES.find((candidate) => candidate.id === action.enemyId);
      if (!enemy || state.global.unlockedMimorianEnemyIds.includes(enemy.id)) return state;
      const cost = getEnemyFormPranaCost(enemy);
      const altarLevel = getAltarLevel(getAltarVictoriesForEnemyType(enemy.enemyType, state.global.altarVictoriesByEnemyType));
      if (state.global.prana < cost || altarLevel < getEnemyRequiredAltarLevel(enemy)) return state;
      return {
        ...state,
        global: {
          ...state.global,
          prana: state.global.prana - cost,
          unlockedMimorianEnemyIds: [...state.global.unlockedMimorianEnemyIds, enemy.id],
        },
      };
    }

    case 'BUY_SHOP_ITEM': {
      // SpecRef: 8.4.1 | Shop (お店) | Lineup
      // SpecRef: 8.4.1 | Shop (お店) | Mystery enhancement (same as item drop logic)
      const now = new Date();
      const globalState = applyShopIntimacyDecay(state.global, now);
      const baseItem = getItemById(action.itemId);
      const shopPrice = getShopItemPrice(action.itemId);
      if (!baseItem || globalState.gold < shopPrice) return state;
      const selectedPartyIndex = state.selectedPartyIndex;
      const currentParty = state.parties[selectedPartyIndex];
      let partyBags = normalizeImportedBags(currentParty.bags);

      const hourKey = getShopHourKey(now);
      const refreshCount = globalState.shopRefreshCounts[hourKey] ?? 0;
      const stockKey = getShopStockKey(now, refreshCount);
      const soldOutItemKeys = globalState.shopPurchases[stockKey] ?? [];
      if (soldOutItemKeys.includes(action.stockItemKey)) return state;

      const guaranteedEnhancementResult = drawGuaranteedEnhancement(partyBags);
      const enhancement = guaranteedEnhancementResult.enhancement;
      partyBags = guaranteedEnhancementResult.bags;

      partyBags = refillBagIfEmpty(partyBags, 'superRareBag');
      const { ticket: superRare, newBag: newSuperRareBag } = drawFromBag(partyBags.superRareBag);
      partyBags = { ...partyBags, superRareBag: newSuperRareBag };

      const purchasedItem: Item = {
        ...baseItem,
        enhancement,
        superRare,
      };
      const autoSellMultiplier = getCurrentPartyCunningMultiplier(currentParty);
      const inventoryResult = addItemToInventory(
        globalState.inventory,
        purchasedItem,
        globalState.gold,
        autoSellMultiplier,
      );
      const updatedParties = [...state.parties];
      updatedParties[selectedPartyIndex] = {
        ...currentParty,
        bags: partyBags,
      };

      return {
        ...state,
        parties: updatedParties,
        global: {
          ...globalState,
          inventory: inventoryResult.inventory,
          gold: inventoryResult.gold - shopPrice,
          shopIntimacy: Math.min(99, globalState.shopIntimacy + 1),
          shopPurchases: {
            ...globalState.shopPurchases,
            [stockKey]: [...soldOutItemKeys, action.stockItemKey],
          },
        },
      };
    }


    case 'BUY_DEBUG_STORE_ITEM': {
      // SpecRef: 8.4.3 | Ashen Route Vault(灰路の蔵) | Item purchase (debug purpose only)
      const DEBUG_STORE_PRICE = 1;
      const DEBUG_STORE_STOCK_LIMIT = 99;
      const baseItem = getItemById(action.itemId);
      if (!baseItem) return state;

      const purchaseKey = `item:${baseItem.id}`;
      const purchasedCount = state.global.jewelShopPurchases[purchaseKey] ?? 0;
      if (state.global.gold < DEBUG_STORE_PRICE || purchasedCount >= DEBUG_STORE_STOCK_LIMIT) return state;

      const debugStoreItem: Item = {
        ...baseItem,
        enhancement: 0,
        superRare: 0,
      };
      const grant = grantItemToInventory(state.global.inventory, debugStoreItem);
      if (grant.grantedCount === 0) return state;

      return {
        ...state,
        global: {
          ...state.global,
          gold: state.global.gold - DEBUG_STORE_PRICE,
          inventory: grant.inventory,
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
      const newInventory = setInventoryVariantStatus(
        state.global.inventory,
        action.variantKey,
        action.status,
      );
      if (newInventory === state.global.inventory) return state;

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

    case 'MARK_PARTY_DIARY_LOGS_SEEN': {
      const updatedParties = state.parties.map((party, partyIndex) => {
        if (partyIndex !== action.partyIndex) return party;
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
      const gameMode = action.gameMode ?? 'mode.normal';
      if (!action.isAutoRepeatEnabled) return state;

      const cappedElapsedMs = Math.max(0, Math.min(action.elapsedMs, AFK_MAX_SIMULATION_MS));
      if (cappedElapsedMs < 1000) return state;

      const resolvedCycleDurationScale = Math.max(0.001, action.cycleDurationScale ?? getCycleDurationScale());
      const cycleDurationByParty = action.cycleDurationByParty?.length === state.parties.length
        ? action.cycleDurationByParty.map((durationMs) => Math.max(1, Math.floor(durationMs)))
        : state.parties.map((party) => getApproxAfkCycleDurationMs(party, resolvedCycleDurationScale));
      const runCountByParty = cycleDurationByParty.map((durationMs) => Math.max(0, Math.floor(cappedElapsedMs / durationMs)));
      const runCount = runCountByParty.reduce((maxRuns, count) => Math.max(maxRuns, count), 0);
      if (runCount <= 0) return state;

      const totalOperationCount = runCountByParty.reduce((total, count) => total + count, 0);
      const operationStart = Math.max(0, Math.min(totalOperationCount, Math.floor(action.operationStart ?? 0)));
      const requestedOperationCount = Math.max(0, Math.floor(action.operationCount ?? totalOperationCount));
      const operationEnd = Math.min(totalOperationCount, operationStart + requestedOperationCount);
      if (operationEnd <= operationStart) return state;

      let workingState = state;
      // Each reducer call represents one logical Chunk for worker-backed AFK
      // recovery. Retain these Party objects as the status inputs for every
      // Cycle even as workingState accumulates level, XP, HP, and gate changes.
      const chunkPartyStatus = action.chunkPartyStatus ?? state.parties.map((party) => ({
        party,
        computed: computePartyStats(party),
      }));
      const simulationEndAt = action.simulatedEndAt ?? Date.now();
      const simulationStartAt = simulationEndAt - cappedElapsedMs;
      const partyTimestampStepMs = 1_000;

      const operationWindow = getAfkOperationWindow(
        cycleDurationByParty,
        cappedElapsedMs,
        operationStart,
        requestedOperationCount,
      );
      let completedOperationCount = 0;
      for (const { runIndex, partyIndex, partyCycleDurationMs } of operationWindow) {
          const cycleCompletedAt = simulationStartAt + ((runIndex + 1) * partyCycleDurationMs);
          const simulatedAt = Math.min(
            simulationEndAt,
            cycleCompletedAt + (partyIndex * partyTimestampStepMs)
          );

          const partyForAfkChunk = workingState.parties[partyIndex];
          const chunkStartParty = chunkPartyStatus[partyIndex]?.party ?? partyForAfkChunk;
          const shouldTriggerAfkGodsBattle = chunkStartParty
            ? (
              // SpecRef: 7.1.2 | AUTO progress logic | AFK (during state.reactivate)
              // The prior Chunk's completed condition update is authoritative at
              // this boundary. Do not re-check condition inside the current Chunk.
              runIndex === 0
              && normalizePartyCondition(chunkStartParty.condition) >= 251
              && !chunkStartParty.sideQuest
              && isGodsBattleAvailable(chunkStartParty, chunkStartParty.selectedDungeonId)
            )
            : false;

          // SpecRef: 5.1 | Chunk deterministic execution and terminal partial Chunk
          const isTerminalChunkOperation = completedOperationCount + 1 >= operationWindow.length;
          const expeditionStartedAt = AFK_LIVE_PROFILE_BUILD_ENABLED && action.workerAttribution ? performance.now() : 0;
          workingState = reduceGameState(workingState, {
            type: 'RUN_EXPEDITION',
            partyIndex,
            simulatedAt,
            gameMode,
            enemyLevelOffset: action.enemyLevelOffset,
            isAfkSimulation: true,
            triggerGodsBattle: shouldTriggerAfkGodsBattle,
            chunkPartyStatus: chunkPartyStatus[partyIndex],
            battleOutputMode: action.workerOptimization === 'optimized' && !isTerminalChunkOperation
              ? 'result-only'
              : 'full',
            compactBattleResultOutput: action.compactBattleResultOutput,
          }, undefined, afkChunkContext);
          if (AFK_LIVE_PROFILE_BUILD_ENABLED) addAfkWorkerPhaseDuration(action.workerAttribution, 'expeditionMs', expeditionStartedAt);
          const diaryStartedAt = AFK_LIVE_PROFILE_BUILD_ENABLED && action.workerAttribution ? performance.now() : 0;
          workingState = reduceGameState(workingState, {
            type: 'FINALIZE_DIARY_LOG',
            partyIndex,
            simulatedAt,
            isAfkSimulation: true,
          }, undefined, afkChunkContext);
          if (AFK_LIVE_PROFILE_BUILD_ENABLED) addAfkWorkerPhaseDuration(action.workerAttribution, 'diaryFinalizationMs', diaryStartedAt);

          const preProfitAutomationStartedAt = AFK_LIVE_PROFILE_BUILD_ENABLED && action.workerAttribution ? performance.now() : 0;
          const postFinalizeParty = workingState.parties[partyIndex];
          if (postFinalizeParty) {
            // Condition changes accumulate inside the worker but become logical
            // authority only at the Chunk boundary. Condition-driven decisions
            // within this Chunk therefore retain its captured starting value.
            const autoAdvanceDecision = shouldAutoAdvanceExpeditionDestination({
              ...postFinalizeParty,
              condition: chunkStartParty?.condition ?? postFinalizeParty.condition,
            });
            if (autoAdvanceDecision.shouldAdvance && autoAdvanceDecision.nextDungeonId !== null) {
              workingState = reduceGameState(workingState, {
                type: 'SELECT_DUNGEON',
                partyIndex,
                dungeonId: autoAdvanceDecision.nextDungeonId,
                selectionMode: 'auto',
              }, undefined, afkChunkContext);
            }
          }

          const currentParty = workingState.parties[partyIndex];
          if (!currentParty) continue;
          const activeParty = workingState.parties[partyIndex];
          if (!activeParty) continue;

          if (activeParty.sideQuest && TIME_BASED_SIDE_QUEST_TYPES.has(activeParty.sideQuest.type)) {
            const approximateProgress = getApproxAfkTimeQuestProgressPerCycle(
              activeParty,
              partyCycleDurationMs,
              resolvedCycleDurationScale,
            );
            if (approximateProgress > 0) {
              workingState = reduceGameState(workingState, {
                type: 'ADVANCE_SIDE_QUEST',
                partyIndex,
                amount: approximateProgress,
                simulatedAt,
              }, undefined, afkChunkContext);
            }
          }

          workingState = applyAfkExpeditionSideQuestOutcome(workingState, partyIndex, simulatedAt);
          if (AFK_LIVE_PROFILE_BUILD_ENABLED) addAfkWorkerPhaseDuration(action.workerAttribution, 'sideQuestAutomationMs', preProfitAutomationStartedAt);
          let optimizedProfitAbilityLevels: ProfitAbilityLevels | undefined;
          const profitStartedAt = AFK_LIVE_PROFILE_BUILD_ENABLED && action.workerAttribution ? performance.now() : 0;
          if (action.workerOptimization === 'optimized' && postFinalizeParty) {
            const cached = afkChunkContext?.profitAbilityCache.get(postFinalizeParty.id);
            if (cached?.partyLevel === postFinalizeParty.level && cached.characters === postFinalizeParty.characters) {
              optimizedProfitAbilityLevels = cached.levels;
            } else {
              const chunkStatus = chunkPartyStatus[partyIndex]?.computed;
              const levels = chunkStatus && chunkPartyStatus[partyIndex]?.party.level === postFinalizeParty.level
                ? getProfitAbilityLevelsFromStatus(chunkStatus)
                : getProfitAbilityLevels(postFinalizeParty);
              optimizedProfitAbilityLevels = levels;
              afkChunkContext?.profitAbilityCache.set(postFinalizeParty.id, {
                partyLevel: postFinalizeParty.level,
                characters: postFinalizeParty.characters,
                levels,
              });
            }
          }
          workingState = processAfkCycleProfit(
            workingState,
            partyIndex,
            simulatedAt,
            action.workerOptimization,
            optimizedProfitAbilityLevels,
          );
          if (AFK_LIVE_PROFILE_BUILD_ENABLED) addAfkWorkerPhaseDuration(action.workerAttribution, 'profitProcessingMs', profitStartedAt);

          const hpStartedAt = AFK_LIVE_PROFILE_BUILD_ENABLED && action.workerAttribution ? performance.now() : 0;
          const postCycleParty = workingState.parties[partyIndex];
          if (postCycleParty) {
            let postCycleMaxHp: number;
            if (action.workerOptimization === 'legacy') {
              postCycleMaxHp = computePartyStats(postCycleParty).partyStats.hp;
            } else if (afkChunkContext) {
              const cached = afkChunkContext.hpBaseCache.get(postCycleParty.id);
              let bonusHp: number;
              if (cached?.partyLevel === postCycleParty.level && cached.characters === postCycleParty.characters) {
                bonusHp = cached.bonusHp;
              } else {
                bonusHp = postCycleParty.characters.reduce(
                  (total, character) => total + computeCharacterHpContribution(character, postCycleParty.level).totalHpBonus,
                  0,
                );
                afkChunkContext.hpBaseCache.set(postCycleParty.id, {
                  partyLevel: postCycleParty.level,
                  characters: postCycleParty.characters,
                  bonusHp,
                });
              }
              postCycleMaxHp = Math.floor(bonusHp * getDeityPartyHpMultiplier(
                postCycleParty.deity.name,
                postCycleParty.deityGold ?? 0,
              ));
            } else {
              postCycleMaxHp = computePartyMaxHp(postCycleParty);
            }
            const missingHp = Math.max(0, postCycleMaxHp - (postCycleParty.currentHp ?? 0));
            if (missingHp > 0) {
              if (action.workerOptimization === 'legacy') {
                workingState = reduceGameState(workingState, {
                  type: 'HEAL_PARTY_HP',
                  partyIndex,
                  amount: missingHp,
                }, undefined, afkChunkContext);
              } else {
                const healedParties = [...workingState.parties];
                healedParties[partyIndex] = { ...postCycleParty, currentHp: postCycleMaxHp };
                workingState = { ...workingState, parties: healedParties };
              }
            }
          }
          if (AFK_LIVE_PROFILE_BUILD_ENABLED) addAfkWorkerPhaseDuration(action.workerAttribution, 'hpRecoveryMs', hpStartedAt);

          const postProfitAutomationStartedAt = AFK_LIVE_PROFILE_BUILD_ENABLED && action.workerAttribution ? performance.now() : 0;
          if (postCycleParty && !postCycleParty.sideQuest && !hasActiveNonGodBattleClearGateCondition(postCycleParty)) {
            workingState = reduceGameState(workingState, {
              type: 'ROLL_SIDE_QUEST',
              partyIndex,
              rolledTier: postCycleParty.selectedDungeonId,
              simulatedAt,
            }, undefined, afkChunkContext);
          }

          const latestParty = workingState.parties[partyIndex];
          // SpecRef: 5.1.2 | Side Quest | AFK handling
          if (
            latestParty?.sideQuest
            && simulatedAt >= getScaledSideQuestExpiresAt(latestParty.sideQuest, resolvedCycleDurationScale)
          ) {
            workingState = reduceGameState(workingState, { type: 'CANCEL_SIDE_QUEST', partyIndex }, undefined, afkChunkContext);
          }
          if (AFK_LIVE_PROFILE_BUILD_ENABLED) addAfkWorkerPhaseDuration(action.workerAttribution, 'sideQuestAutomationMs', postProfitAutomationStartedAt);
          completedOperationCount += 1;
          const progressStartedAt = AFK_LIVE_PROFILE_BUILD_ENABLED && action.workerAttribution ? performance.now() : 0;
          action.onOperationComplete?.(completedOperationCount, operationWindow.length);
          if (AFK_LIVE_PROFILE_BUILD_ENABLED) addAfkWorkerPhaseDuration(action.workerAttribution, 'progressCallbackMs', progressStartedAt);
      }

      if (action.finalizeChunk !== false || operationEnd >= totalOperationCount) {
        const finalizationStartedAt = AFK_LIVE_PROFILE_BUILD_ENABLED && action.workerAttribution ? performance.now() : 0;
        const clampedParties = workingState.parties.map((party) => ({
          ...party,
          // SpecRef: 7.1.2 | AUTO progress logic | AFK (during state.reactivate)
          condition: normalizePartyCondition(party.condition),
        }));

        workingState = {
          ...workingState,
          parties: clampedParties,
        };
        if (AFK_LIVE_PROFILE_BUILD_ENABLED) addAfkWorkerPhaseDuration(action.workerAttribution, 'chunkFinalizationMs', finalizationStartedAt);
      }

      return workingState;
    }

    case 'COMMIT_AFK_PARTY_CHUNK':
      return commitAfkChunkWithAvailabilityRevisions(state, action.result);

    case 'COMMIT_AFK_PARTY_TRANSACTION': {
      // One authoritative AFK publication: Chunk merge, pending-setting overlay,
      // automatic-equipment planning against that merged state, then the
      // already-ordered equipment batch. Planning here avoids publishing an
      // intermediate Chunk-only state just so React can feed it back to the
      // planner on the following effect.
      const chunkStartedAt = action.attribution ? performance.now() : 0;
      const committedState = commitAfkChunkWithAvailabilityRevisions(state, action.result);
      if (action.attribution) action.attribution.chunkMergeMs = Math.max(0, performance.now() - chunkStartedAt);
      const planningStartedAt = action.attribution ? performance.now() : 0;
      const plan: AfkPartyTransactionPlan = typeof action.autoEquipment === 'function'
        ? action.autoEquipment(committedState)
        : { actions: action.autoEquipment };
      if (action.attribution) {
        action.attribution.autoEquipmentPlanningMs = Math.max(0, performance.now() - planningStartedAt);
        action.attribution.plannedActionCount = plan.actions.length;
        action.attribution.summary = plan.summary;
      }
      if (plan.actions.length === 0) return committedState;
      const equipmentStartedAt = action.attribution ? performance.now() : 0;
      const nextState = gameReducer(committedState, {
        type: 'APPLY_AUTO_EQUIPMENT_ACTIONS',
        actions: [...plan.actions],
      });
      if (action.attribution) action.attribution.equipmentReducerMs = Math.max(0, performance.now() - equipmentStartedAt);
      return nextState;
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
        removeAllDiaryLogRecords(STORAGE_KEY, localStorage);
      } catch (e) {
        console.error('Failed to clear saved state:', e);
      }
      // Return fresh state (not from localStorage)
      return {
        scene: 'home' as const,
        global: {
          gold: 200,
          prana: 0,
          unlockedMimorianEnemyIds: [],
          inventory: createStarterInventory(),
          userId: generateUserId(),
          jewels: createStarterJewelInventory(),
          savedEquipmentSets: [],
          jewelAutoEquipPriorityPartyId: 1,
          equipmentInventoryRevision: 0,
          jewelInventoryRevision: 0,
          deityDonations: {},
          unlockedDeities: [...DEFAULT_UNLOCKED_DEITIES],
          challengedGodNames: [],
          revealedItemCompendiumItemIds: [],
          revealedGlossaryAbilityIds: [],
          revealedGlossaryTerrainKeys: [],
          shopPurchases: {},
          jewelShopPurchases: {},
          shopRefreshCounts: {},
          shopIntimacy: 0,
          shopIntimacyLastDecayAt: Date.now(),
          enemyBattleStats: {},
          altarVictoriesByEnemyType: {},
          readDeveloperNewsItemIds: [],
          language: state.global.language,
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
          commonSuperRareBag: createCommonSuperRareBag(),
          rareSuperRareBag: createRareSuperRareBag(),
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
        bags: normalizeImportedBags((party as Party & { bags?: unknown }).bags ?? hydrated.bags),
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
      gender: normalizeCharacterGender((character as Character & { gender?: CharacterGender }).gender, character),
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
          userId: typeof hydrated.global.userId === 'string' && hydrated.global.userId.trim().length > 0
            ? hydrated.global.userId
            : generateUserId(),
          unlockedDeities: unlockedDeities,
          readDeveloperNewsItemIds: Array.isArray(hydrated.global.readDeveloperNewsItemIds)
            ? Array.from(new Set(hydrated.global.readDeveloperNewsItemIds.filter((itemId) => typeof itemId === 'string' && itemId.trim().length > 0)))
            : [],
          prana: Number.isFinite(hydrated.global.prana) ? Math.max(0, Math.floor(hydrated.global.prana)) : 0,
          unlockedMimorianEnemyIds: Array.isArray(hydrated.global.unlockedMimorianEnemyIds)
            ? Array.from(new Set(hydrated.global.unlockedMimorianEnemyIds.filter((enemyId) => Number.isInteger(enemyId) && ENEMIES.some((enemy) => enemy.id === enemyId))))
            : [],
          altarVictoriesByEnemyType: getAltarVictoriesWithDefaults(hydrated.global.altarVictoriesByEnemyType),
          jewelAutoEquipPriorityPartyId: normalizeJewelAutoEquipPriorityPartyId(
            hydrated.global.jewelAutoEquipPriorityPartyId,
            trimmedParties.length,
          ),
          equipmentInventoryRevision: Number.isSafeInteger(hydrated.global.equipmentInventoryRevision)
            ? Math.max(0, hydrated.global.equipmentInventoryRevision!)
            : 0,
          jewelInventoryRevision: Number.isSafeInteger(hydrated.global.jewelInventoryRevision)
            ? Math.max(0, hydrated.global.jewelInventoryRevision!)
            : 0,
        },
        parties: trimmedParties,
        selectedPartyIndex: normalizedSelectedPartyIndex,
        bags: normalizeImportedBags(hydrated.bags),
        buildNumber: BUILD_NUMBER,
      };
    }

    case 'COMMIT_API_STATE':
      return action.state;

    case 'SET_JEWEL_AUTO_EQUIP_PRIORITY_PARTY': {
      const normalizedPartyId = normalizeJewelAutoEquipPriorityPartyId(action.partyId, state.parties.length);
      if (state.global.jewelAutoEquipPriorityPartyId === normalizedPartyId) return state;
      return {
        ...state,
        global: {
          ...state.global,
          jewelAutoEquipPriorityPartyId: normalizedPartyId,
        },
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
      const partyIndex = action.partyIndex ?? state.selectedPartyIndex;
      const currentParty = state.parties[partyIndex];
      if (!currentParty) return state;
      const updatedParties = [...state.parties];
      updatedParties[partyIndex] = {
        ...currentParty,
        bags: {
          ...normalizeImportedBags(currentParty.bags),
          commonRewardBag: createCommonRewardBag(),
          commonEnhancementBag: createCommonEnhancementBag(),
          commonSuperRareBag: createCommonSuperRareBag(),
        },
      };
      return {
        ...state,
        parties: updatedParties,
      };
    }

    case 'RESET_UNIQUE_BAGS': {
      const partyIndex = action.partyIndex ?? state.selectedPartyIndex;
      const currentParty = state.parties[partyIndex];
      if (!currentParty) return state;
      const updatedParties = [...state.parties];
      updatedParties[partyIndex] = {
        ...currentParty,
        bags: {
          ...normalizeImportedBags(currentParty.bags),
          commonRewardBag: createCommonRewardBag(),
          uncommonRewardBag: createUncommonRewardBag(),
          eliteRareRewardBag: createEliteRareRewardBag(),
          bossRareRewardBag: createBossRareRewardBag(),
          mythicRareRewardBag: createMythicRareRewardBag(),
          enhancementBag: createEnhancementBag(),
          rareSuperRareBag: createRareSuperRareBag(),
        },
      };
      return {
        ...state,
        parties: updatedParties,
      };
    }

    case 'RESET_COMMON_SUPER_RARE_BAG': {
      const partyIndex = action.partyIndex ?? state.selectedPartyIndex;
      const currentParty = state.parties[partyIndex];
      if (!currentParty) return state;
      const updatedParties = [...state.parties];
      updatedParties[partyIndex] = {
        ...currentParty,
        bags: {
          ...normalizeImportedBags(currentParty.bags),
          commonSuperRareBag: createCommonSuperRareBag(),
        },
      };
      return { ...state, parties: updatedParties };
    }

    case 'RESET_RARE_SUPER_RARE_BAG': {
      const partyIndex = action.partyIndex ?? state.selectedPartyIndex;
      const currentParty = state.parties[partyIndex];
      if (!currentParty) return state;
      const updatedParties = [...state.parties];
      updatedParties[partyIndex] = {
        ...currentParty,
        bags: {
          ...normalizeImportedBags(currentParty.bags),
          rareSuperRareBag: createRareSuperRareBag(),
        },
      };
      return { ...state, parties: updatedParties };
    }

    case 'RESET_SIDE_QUEST_BAG': {
      const partyIndex = action.partyIndex ?? state.selectedPartyIndex;
      const currentParty = state.parties[partyIndex];
      if (!currentParty) return state;
      const updatedParties = [...state.parties];
      updatedParties[partyIndex] = {
        ...currentParty,
        bags: {
          ...normalizeImportedBags(currentParty.bags),
          sideQuestBag: createSideQuestBag(),
        },
      };
      return {
        ...state,
        parties: updatedParties,
      };
    }

    default:
      return state;
  }
}

/** Top-level reducer boundary: availability revisions are derived from committed state. */
export function gameReducer(
  state: GameState,
  action: GameAction,
  autoEquipmentContext?: AutoEquipmentReducerContext,
  afkChunkContext?: AfkChunkReducerContext,
): GameState {
  const reduced = reduceGameState(state, action, autoEquipmentContext, afkChunkContext);
  // AFK commits already account for the Chunk and equipment stages separately.
  // Rechecking the whole transaction here would count new availability twice.
  if (action.type === 'COMMIT_API_STATE' || action.type === 'COMMIT_AFK_PARTY_TRANSACTION' || action.type === 'COMMIT_AFK_PARTY_CHUNK') return reduced;
  const next = applyInventoryAvailabilityRevisions(state, reduced);
  if (action.type !== 'APPLY_AUTO_EQUIPMENT_ACTIONS') return next;
  const stampedPartyIndexes = action.actions
    .filter((nestedAction): nestedAction is Extract<AutoEquipmentProfileAction, { type: 'STAMP_FULL_AUTO_EQUIPMENT' }> => nestedAction.type === 'STAMP_FULL_AUTO_EQUIPMENT')
    .map((nestedAction) => nestedAction.partyIndex);
  if (stampedPartyIndexes.length === 0) return next;
  const parties = next.parties.map((party, partyIndex) => stampedPartyIndexes.includes(partyIndex)
    ? {
      ...party,
      lastFullEquipmentRevision: next.global.equipmentInventoryRevision ?? 0,
      lastFullJewelRevision: next.global.jewelInventoryRevision ?? 0,
    }
    : party);
  return { ...next, parties };
}

export function applyAutoEquipmentProfileActions(
  state: GameState,
  actions: readonly AutoEquipmentProfileAction[],
  attribution?: AutoEquipmentReducerAttribution,
  hpStrategy: AutoEquipmentHpStrategy = 'incremental_hp',
  stateStrategy: AutoEquipmentStateStrategy = 'copy_once_transaction',
): GameState {
  return gameReducer(state, {
    type: 'APPLY_AUTO_EQUIPMENT_ACTIONS',
    actions: [...actions],
    attribution,
    hpStrategy,
    stateStrategy,
  });
}

export function applyAutoEquipmentProfileActionsSequentially(
  state: GameState,
  actions: readonly AutoEquipmentProfileAction[],
): GameState {
  // Test/profile oracle: apply every action independently, then finalize the
  // logical batch's revisions and FULL stamps just like an ordinary commit.
  const next = applyInventoryAvailabilityRevisions(
    state,
    actions.reduce((current, action) => reduceGameState(current, action), state),
  );
  const stampedParties = new Set(actions.flatMap((action) => (
    action.type === 'STAMP_FULL_AUTO_EQUIPMENT' ? [action.partyIndex] : []
  )));
  if (stampedParties.size === 0) return next;
  return {
    ...next,
    parties: next.parties.map((party, partyIndex) => stampedParties.has(partyIndex) ? {
      ...party,
      lastFullEquipmentRevision: next.global.equipmentInventoryRevision ?? 0,
      lastFullJewelRevision: next.global.jewelInventoryRevision ?? 0,
    } : party),
  };
}

export interface AfkPartyTransactionAttribution {
  chunkMergeMs: number;
  autoEquipmentPlanningMs: number;
  equipmentReducerMs: number;
  plannedActionCount: number;
  summary?: AfkPartyTransactionPlanSummary;
}

export interface AfkPartyTransactionPlanSummary {
  processedCharacters: number;
  unequippedCount: number;
  equippedCount: number;
  upgradedCount: number;
  jewelAssignmentCount: number;
}

export interface AfkPartyTransactionPlan {
  actions: readonly AutoEquipmentProfileAction[];
  summary?: AfkPartyTransactionPlanSummary;
}

export type AfkPartyTransactionPlanner = (committedState: GameState) => AfkPartyTransactionPlan;

export function applyAfkPartyTransactionForTesting(
  state: GameState,
  result: AfkPartyChunkResult,
  autoEquipmentActions: readonly AutoEquipmentProfileAction[],
): GameState {
  return gameReducer(state, {
    type: 'COMMIT_AFK_PARTY_TRANSACTION',
    result,
    autoEquipment: [...autoEquipmentActions],
  });
}

export function applyPlannedAfkPartyTransactionForTesting(
  state: GameState,
  result: AfkPartyChunkResult,
  planner: AfkPartyTransactionPlanner,
): GameState {
  return gameReducer(state, {
    type: 'COMMIT_AFK_PARTY_TRANSACTION',
    result,
    autoEquipment: planner,
  });
}

/** Test seam for measuring one authoritative online/Gods Battle reducer transaction. */
export function runExpeditionTransactionForTesting(
  state: GameState,
  partyIndex: number,
  options: {
    gameMode?: RuntimeGameMode;
    triggerGodsBattle?: boolean;
    simulatedAt?: number;
    battleOutputMode?: 'full' | 'result-only';
    resolutionMode?: ExpeditionResolutionMode;
    authoritativePartyStatus?: { party: Party; computed: ComputedPartyStatus };
  } = {},
): GameState {
  return gameReducer(state, { type: 'RUN_EXPEDITION', partyIndex, ...options });
}

/**
 * Runs the same reducer action used by the UI AFK scheduler without requiring a
 * mounted React tree. This deliberately narrow entry point lets save-backed
 * performance tests exercise authoritative expedition, reward, Diary, quest,
 * and automation work instead of substituting a synthetic workload.
 */
export function simulateAfkBatchForTesting(
  state: GameState,
  options: AfkBatchTestOptions,
): GameState {
  return gameReducer(state, { type: 'SIMULATE_AFK', ...options });
}

export function simulateAfkPartyChunkForWorker(
  state: GameState,
  options: {
    partyIndex: number;
    cycleDurationMs: number;
    simulatedCompletedAt: number;
    cycleDurationScale: number;
    gameMode?: RuntimeGameMode;
    enemyLevelOffset?: number;
    operationCount?: number;
    onProgress?: (completedOperations: number, operationCount: number) => void;
    chunkStatusScope?: 'target' | 'all';
    inventoryStrategy?: 'immutable' | 'overlay';
    workerOptimization?: AfkWorkerSimulationStrategy;
    compactBattleResultOutput?: boolean;
    workerAttribution?: AfkWorkerPhaseAttribution;
  },
): GameState {
  const party = state.parties[options.partyIndex];
  if (!party) return state;
  setActiveLanguage(state.global.language);
  const cycleDurationMs = Math.max(1, Math.floor(options.cycleDurationMs));
  const operationCount = Math.max(1, Math.floor(options.operationCount ?? AFK_CHUNK_CYCLE_COUNT));
  const elapsedMs = cycleDurationMs * operationCount;
  const inactiveDurationMs = elapsedMs + 1;
  const cycleDurationByParty = state.parties.map((_, partyIndex) => (
    partyIndex === options.partyIndex ? cycleDurationMs : inactiveDurationMs
  ));
  const statusSnapshotStartedAt = AFK_LIVE_PROFILE_BUILD_ENABLED && options.workerAttribution ? performance.now() : 0;
  const chunkPartyStatus: Array<{ party: Party; computed: ComputedPartyStatus }> = [];
  if (options.chunkStatusScope === 'all') {
    state.parties.forEach((candidate, candidateIndex) => {
      chunkPartyStatus[candidateIndex] = {
        party: candidate,
        computed: computePartyStats(candidate),
      };
    });
  } else {
    // SpecRef: 5.1 | Chunk | Party status is calculated once at the beginning of each Chunk.
    // A party-scoped worker cannot advance inactive parties, so retain only the
    // one authoritative status snapshot consumed by its thirty target Cycles.
    chunkPartyStatus[options.partyIndex] = {
      party,
      computed: computePartyStats(party),
    };
  }
  if (AFK_LIVE_PROFILE_BUILD_ENABLED) addAfkWorkerPhaseDuration(options.workerAttribution, 'statusSnapshotMs', statusSnapshotStartedAt);
  const afkChunkContext: AfkChunkReducerContext | undefined = options.inventoryStrategy === 'immutable'
    ? undefined
    : {
      inventoryOverlay: new AfkInventoryOverlay(state.global.inventory),
      encounterCache: new Map(),
      profitAbilityCache: new Map(),
      hpBaseCache: new Map(),
      ...(AFK_LIVE_PROFILE_BUILD_ENABLED && options.workerAttribution
        ? { workerAttribution: options.workerAttribution }
        : {}),
    };
  const workerOptimization = options.workerOptimization ?? 'optimized';
  if (workerOptimization === 'optimized') {
    const workingState = gameReducer(state, {
      type: 'SIMULATE_AFK',
      elapsedMs,
      isAutoRepeatEnabled: true,
      gameMode: options.gameMode,
      enemyLevelOffset: options.enemyLevelOffset,
      simulatedEndAt: options.simulatedCompletedAt,
      cycleDurationScale: options.cycleDurationScale,
      cycleDurationByParty,
      operationStart: 0,
      operationCount,
      finalizeChunk: true,
      chunkPartyStatus,
      workerOptimization,
      compactBattleResultOutput: options.compactBattleResultOutput,
      workerAttribution: options.workerAttribution,
      onOperationComplete: options.onProgress,
    }, undefined, afkChunkContext);
    if (afkChunkContext) {
      const inventoryDeltaStartedAt = AFK_LIVE_PROFILE_BUILD_ENABLED && options.workerAttribution ? performance.now() : 0;
      afkInventoryDeltaByState.set(workingState, afkChunkContext.inventoryOverlay.createDelta());
      if (AFK_LIVE_PROFILE_BUILD_ENABLED) addAfkWorkerPhaseDuration(options.workerAttribution, 'inventoryDeltaMs', inventoryDeltaStartedAt);
    }
    return workingState;
  }

  let workingState = state;
  for (let operationIndex = 0; operationIndex < operationCount; operationIndex += 1) {
    workingState = gameReducer(workingState, {
      type: 'SIMULATE_AFK',
      elapsedMs,
      isAutoRepeatEnabled: true,
      gameMode: options.gameMode,
      enemyLevelOffset: options.enemyLevelOffset,
      simulatedEndAt: options.simulatedCompletedAt,
      cycleDurationScale: options.cycleDurationScale,
      cycleDurationByParty,
      operationStart: operationIndex,
      operationCount: 1,
      finalizeChunk: operationIndex + 1 === operationCount,
      chunkPartyStatus,
      workerOptimization,
      compactBattleResultOutput: options.compactBattleResultOutput,
      workerAttribution: options.workerAttribution,
    }, undefined, afkChunkContext);
    options.onProgress?.(operationIndex + 1, operationCount);
  }
  if (afkChunkContext) {
    const inventoryDeltaStartedAt = AFK_LIVE_PROFILE_BUILD_ENABLED && options.workerAttribution ? performance.now() : 0;
    afkInventoryDeltaByState.set(workingState, afkChunkContext.inventoryOverlay.createDelta());
    if (AFK_LIVE_PROFILE_BUILD_ENABLED) addAfkWorkerPhaseDuration(options.workerAttribution, 'inventoryDeltaMs', inventoryDeltaStartedAt);
  }
  return workingState;
}

/** Pure authoritative batch used by the serialized Experimental API adapter and stabilization tests. */
export function simulateApiSortieBatchForTesting(
  state: GameState,
  partyIndex: number,
  count: number,
  gameMode: RuntimeGameMode = 'mode.normal',
  simulatedAt: number = Date.now(),
  enemyLevelOffset: number = 0,
): { state: GameState; runs: Array<{ party: Party; log: ExpeditionLog | null; beforeState: GameState; afterState: GameState }> } {
  let stagedState = state;
  const initialParty = stagedState.parties[partyIndex];
  if (!initialParty) throw new Error('party_not_found');
  const charge = {
    instantExpeditionStock: initialParty.instantExpeditionStock,
    instantExpeditionChargeStartedAt: initialParty.instantExpeditionChargeStartedAt,
  };
  const runs: Array<{ party: Party; log: ExpeditionLog | null; beforeState: GameState; afterState: GameState }> = [];
  for (let index = 0; index < count; index += 1) {
    const beforeState = stagedState;
    const beforeParty = beforeState.parties[partyIndex];
    const computed = computePartyStats(beforeParty);
    const maximumHp = computed.partyStats.hp;
    stagedState = gameReducer(stagedState, { type: 'HEAL_PARTY_HP', partyIndex, amount: maximumHp });
    stagedState = gameReducer(stagedState, {
      type: 'RESOLVE_INSTANT_EXPEDITION', partyIndex, gameMode, enemyLevelOffset, triggerGodsBattle: false,
      simulatedAt: simulatedAt + index * APPROX_CYCLE_STEP_COUNT * BASE_STEP_DURATION_MS,
      authoritativePartyStatus: { party: beforeParty, computed },
    });
    const afterState = stagedState;
    const party = afterState.parties[partyIndex];
    runs.push({ party, log: party.lastExpeditionLog, beforeState, afterState });
  }
  const finalParties = [...stagedState.parties];
  finalParties[partyIndex] = {
    ...finalParties[partyIndex],
    instantExpeditionStock: charge.instantExpeditionStock,
    instantExpeditionChargeStartedAt: charge.instantExpeditionChargeStartedAt,
  };
  return { state: { ...stagedState, parties: finalParties }, runs };
}

const EXPEDITION_SIMULATION_SLICE_BUDGET_MS = 10;
const EXPEDITION_SIMULATION_PROGRESS_INTERVAL_MS = 100;

const yieldToExpeditionSimulationUi = () => new Promise<void>((resolve) => {
  setTimeout(resolve, 0);
});

/**
 * Create one private, compact baseline for a forecast batch. Only the selected
 * party is cloned; unrelated parties and master/configuration data are shared
 * read-only. Persistent-only collections are replaced with scratch collections
 * because forecast results are discarded and cannot reveal or commit them.
 */
export function createSimulationSandbox(state: GameState, partyIndex: number): SimulationSandbox {
  const sourceParty = state.parties[partyIndex];
  if (!sourceParty) throw new Error('party_not_found');
  const party = structuredClone(sourceParty);
  const authoritativePartyStatus = computePartyStats(party);
  party.currentHp = authoritativePartyStatus.partyStats.hp;
  party.lastExpeditionLog = null;
  party.pendingDiaryLog = null;
  party.diaryLogs = [];

  const parties = [...state.parties];
  parties[partyIndex] = party;
  return {
    partyIndex,
    authoritativePartyStatus,
    baseline: {
      ...state,
      parties,
      global: {
        ...state.global,
        gold: 0,
        inventory: {},
        enemyBattleStats: {},
        altarVictoriesByEnemyType: {},
        revealedItemCompendiumItemIds: [],
        revealedGlossaryAbilityIds: [],
        revealedGlossaryTerrainKeys: [],
      },
    },
  };
}

export function createSimulationRunState(sandbox: SimulationSandbox): GameState {
  return {
    ...sandbox.baseline,
    parties: [...sandbox.baseline.parties],
    global: {
      ...sandbox.baseline.global,
      inventory: {},
      enemyBattleStats: {},
      altarVictoriesByEnemyType: {},
      revealedItemCompendiumItemIds: [],
      revealedGlossaryAbilityIds: [],
      revealedGlossaryTerrainKeys: [],
    },
  };
}

/** Test seam for exact full/forecast differential coverage. */
export function resolveSimulationRunForTesting(
  state: GameState,
  partyIndex: number,
  resolutionMode: ExpeditionResolutionMode,
): { state: GameState; resolution: ExpeditionForecastResolution } {
  if (resolutionMode === 'forecast') {
    const sandbox = createSimulationSandbox(state, partyIndex);
    const resolvedState = gameReducer(createSimulationRunState(sandbox), {
      type: 'RUN_EXPEDITION',
      partyIndex,
      battleOutputMode: 'result-only',
      resolutionMode,
      authoritativePartyStatus: {
        party: sandbox.baseline.parties[partyIndex],
        computed: sandbox.authoritativePartyStatus,
      },
    });
    const resolution = forecastResolutionByState.get(resolvedState);
    if (!resolution) throw new Error('simulation_failed');
    return { state: resolvedState, resolution };
  }
  const baseline = structuredClone(state);
  const party = baseline.parties[partyIndex];
  if (!party) throw new Error('party_not_found');
  const computed = computePartyStats(party);
  party.currentHp = computed.partyStats.hp;
  party.lastExpeditionLog = null;
  party.pendingDiaryLog = null;
  const resolvedState = gameReducer(baseline, {
    type: 'RUN_EXPEDITION',
    partyIndex,
    battleOutputMode: 'result-only',
    resolutionMode,
    authoritativePartyStatus: { party, computed },
  });
  const log = resolvedState.parties[partyIndex]?.lastExpeditionLog;
  if (!log) throw new Error('simulation_failed');
  return { state: resolvedState, resolution: createExpeditionForecastResolution(log) };
}

/**
 * SpecRef: 8.3 | UI_EXPEDITION | Simulation Run
 *
 * Resolve forecast expeditions only against private clones. Each run starts from
 * the same current configuration and full HP, matching a normal post-rest
 * expedition without committing rewards, progression, Diary entries, or state.
 */
export async function simulateExpeditionRuns(
  state: GameState,
  partyIndex: number,
  gameMode: RuntimeGameMode = 'mode.normal',
  count = EXPEDITION_SIMULATION_RUN_COUNT,
  onProgress?: (completed: number, total: number) => void,
  enemyLevelOffset: number = 0,
): Promise<ExpeditionSimulationResult> {
  void memoryMonitor.recordEvent('simulation_start');
  const total = Math.max(1, Math.floor(count));
  const sandbox = createSimulationSandbox(state, partyIndex);
  const seed = new Uint32Array(1); crypto.getRandomValues(seed);
  const forecastRandom = createApiRandom(seed[0]);

  const result: ExpeditionSimulationResult = {
    Clear: 0,
    Turned_Back: 0,
    Draw_Retreat: 0,
    Wounded_Retreat: 0,
    Defeat: 0,
    total,
  };

  let sliceStartedAt = performance.now();
  let lastProgressAt = sliceStartedAt - EXPEDITION_SIMULATION_PROGRESS_INTERVAL_MS;
  for (let index = 0; index < total; index += 1) {
    const runState = createSimulationRunState(sandbox);
    const resolvedState = withGameplayRandomSource(forecastRandom.next, () => gameReducer(runState, {
      type: 'RUN_EXPEDITION',
      partyIndex,
      gameMode,
      enemyLevelOffset,
      triggerGodsBattle: false,
      battleOutputMode: 'result-only',
      resolutionMode: 'forecast',
      authoritativePartyStatus: {
        party: sandbox.baseline.parties[partyIndex],
        computed: sandbox.authoritativePartyStatus,
      },
    }));
    const resolution = forecastResolutionByState.get(resolvedState);
    if (!resolution) throw new Error('simulation_failed');
    memoryMonitor.incrementBattleCount(resolution.completedRooms);

    if (resolution.outcome === 'Clear') {
      result.Clear += 1;
    } else if (resolution.outcome === 'Escape') {
      result.Turned_Back += 1;
    } else if (resolution.outcome === 'Defeat') {
      result.Defeat += 1;
    } else {
      if (resolution.terminalBattleOutcome === 'draw') result.Draw_Retreat += 1;
      else result.Wounded_Retreat += 1;
    }

    const completed = index + 1;
    const now = performance.now();
    if (completed === total || now - lastProgressAt >= EXPEDITION_SIMULATION_PROGRESS_INTERVAL_MS) {
      onProgress?.(completed, total);
      lastProgressAt = now;
    }
    if (completed < total && now - sliceStartedAt >= EXPEDITION_SIMULATION_SLICE_BUDGET_MS) {
      await yieldToExpeditionSimulationUi();
      sliceStartedAt = performance.now();
    }
  }

  void memoryMonitor.recordEvent('simulation_complete');
  return result;
}

// SpecRef: 5.1.1 | Party State Machine | Time-Based Progress Handling (Online + AFK)
export function useGameState() {
  const initialStateRef = useRef<InitialStateResult | null>(null);
  if (!initialStateRef.current) {
    initialStateRef.current = createInitialState();
  }
  const shouldUseCoordinatorAuthority = useAfkCoordinatorAuthorityCandidate();
  const authorityRef = useRef<GameStateAuthority<GameState, GameAction> | null>(null);
  if (!authorityRef.current) {
    authorityRef.current = new GameStateAuthority(initialStateRef.current.state, gameReducer);
  }
  const authority = authorityRef.current;
  const [reactState, reactDispatch] = useReducer(
    (current: GameState | null, action: GameAction): GameState | null => gameReducer(
      current ?? authority.getAuthoritativeSnapshot().state,
      action,
    ),
    shouldUseCoordinatorAuthority ? null : initialStateRef.current.state,
  );
  const [presentedSnapshot, setPresentedSnapshot] = useState(authority.getPresentedSnapshot);
  useEffect(() => authority.subscribe(() => {
    setPresentedSnapshot(authority.getPresentedSnapshot());
  }), [authority]);
  const state = shouldUseCoordinatorAuthority ? presentedSnapshot.state : (reactState as GameState);
  const latestGameStateRef = useRef(state);
  latestGameStateRef.current = shouldUseCoordinatorAuthority
    ? authority.getAuthoritativeSnapshot().state
    : (reactState as GameState);
  // Do not pin the boot snapshot after either state owner has advanced. The
  // coordinator candidate deliberately leaves its dormant React reducer null,
  // so authority/presentation are its only retained GameState roots.
  initialStateRef.current.state = latestGameStateRef.current;
  const dispatchAuthoritative = useCallback((
    action: GameAction,
    publish: boolean = true,
  ): AuthorityReceipt<GameState> => {
    const receipt = authority.apply(action);
    latestGameStateRef.current = receipt.state;
    if (publish) authority.publishLatest();
    return receipt;
  }, [authority]);
  const dispatch = useCallback((action: GameAction): void => {
    if (shouldUseCoordinatorAuthority) {
      dispatchAuthoritative(action);
    } else {
      reactDispatch(action);
    }
  }, [dispatchAuthoritative, shouldUseCoordinatorAuthority]);
  const [notifications, setNotifications] = useState<GameNotification[]>([]);
  const [saveErrorLog, setSaveErrorLog] = useState<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistenceCoordinatorRef = useRef<PersistenceCoordinator | null>(null);
  const lastSavedAtRef = useRef(0);
  const loadErrorLog = initialStateRef.current.loadErrorLog;
  const isSaveBlockedByLoadFailure = loadErrorLog !== null;

  const createPersistenceCoordinator = useCallback(() => {
    const recordPersistenceTelemetry = (event: PersistenceTelemetryEvent) => {
      if (event.event === 'durability_latency') {
        setSaveErrorLog(null);
        if (saveRetryTimeoutRef.current) {
          clearTimeout(saveRetryTimeoutRef.current);
          saveRetryTimeoutRef.current = null;
        }
      }
      if (!afkRuntimeTrace.isRecoveryActive()) return;
      afkRuntimeTrace.record(`game_save_${event.event}`, {
        phase: event.event.endsWith('error') ? 'error' : 'game_save',
        durationMs: event.durationMs,
        anomaly: event.event.endsWith('error'),
        data: { revision: event.revision, requestId: event.requestId ?? 0, ...event.data },
      });
    };
    return new PersistenceCoordinator({
      storageKey: STORAGE_KEY,
      storage: localStorage,
      workerFactory: createBrowserPersistenceWorker,
      onTelemetry: recordPersistenceTelemetry,
      onError: (error) => {
        console.error('Failed to save state:', error);
        setSaveErrorLog(formatLoadErrorLog(error));
        if (!saveRetryTimeoutRef.current) {
          saveRetryTimeoutRef.current = setTimeout(() => {
            saveRetryTimeoutRef.current = null;
            persistenceCoordinatorRef.current?.retry();
          }, STATE_SAVE_THROTTLE_MS);
        }
      },
    });
  }, []);

  if (!persistenceCoordinatorRef.current && !isSaveBlockedByLoadFailure) {
    persistenceCoordinatorRef.current = createPersistenceCoordinator();
  }

  const flushPendingSave = useCallback((): Promise<void> => {
    // SpecRef: 5.1.4 | Save and load | Do not overwrite state after a load failure.
    if (isSaveBlockedByLoadFailure) return Promise.resolve();
    const flush = persistenceCoordinatorRef.current?.requestDurable(latestGameStateRef.current) ?? Promise.resolve();
    return flush.then(() => {
      lastSavedAtRef.current = Date.now();
      setSaveErrorLog(null);
    });
  }, [isSaveBlockedByLoadFailure]);

  // Save immediately for normal-paced play, while coalescing rapid update bursts (e.g. AFK recovery).
  useEffect(() => {
    if (isSaveBlockedByLoadFailure) {
      return;
    }

    const now = Date.now();
    const msSinceLastSave = now - lastSavedAtRef.current;

    const requestSave = () => {
      persistenceCoordinatorRef.current?.requestOrdinary(latestGameStateRef.current);
      lastSavedAtRef.current = Date.now();
    };

    if (msSinceLastSave >= STATE_SAVE_THROTTLE_MS) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      requestSave();
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    const delayMs = Math.max(0, STATE_SAVE_THROTTLE_MS - msSinceLastSave);
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null;
      requestSave();
    }, delayMs);
  }, [state, isSaveBlockedByLoadFailure]);

  useEffect(() => {
    if (!persistenceCoordinatorRef.current && !isSaveBlockedByLoadFailure) {
      persistenceCoordinatorRef.current = createPersistenceCoordinator();
    }
    const flushOnHidden = () => {
      if (document.visibilityState === 'hidden') {
        void flushPendingSave().catch(() => undefined);
      }
    };

    const requestBestEffortFlush = () => { void flushPendingSave().catch(() => undefined) };
    window.addEventListener('beforeunload', requestBestEffortFlush);
    document.addEventListener('visibilitychange', flushOnHidden);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      if (saveRetryTimeoutRef.current) {
        clearTimeout(saveRetryTimeoutRef.current);
        saveRetryTimeoutRef.current = null;
      }
      window.removeEventListener('beforeunload', requestBestEffortFlush);
      document.removeEventListener('visibilitychange', flushOnHidden);
      // Worker completion is not guaranteed during page teardown; reject durable waiters cleanly.
      persistenceCoordinatorRef.current?.shutdown();
      persistenceCoordinatorRef.current = null;
    };
  }, [createPersistenceCoordinator, flushPendingSave, isSaveBlockedByLoadFailure]);

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
      id: `${Date.now()}-${gameplayRandom().toString(36).substr(2, 9)}`,
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
      id: `${now}-${index}-${gameplayRandom().toString(36).substr(2, 9)}`,
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
      dispatch({ type: 'SELECT_DUNGEON', partyIndex, dungeonId, selectionMode: 'manual' });
    }, []),

    autoSelectDungeon: useCallback((partyIndex: number, dungeonId: number) => {
      dispatch({ type: 'SELECT_DUNGEON', partyIndex, dungeonId, selectionMode: 'auto' });
    }, []),

    setExpeditionDestinationMode: useCallback((partyIndex: number, mode: ExpeditionDestinationMode) => {
      dispatch({ type: 'SET_EXPEDITION_DESTINATION_MODE', partyIndex, mode });
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

    simulateExpedition: useCallback((partyIndex: number, gameMode: RuntimeGameMode = 'mode.normal', onProgress?: (completed: number, total: number) => void, enemyLevelOffset?: number) => (
      simulateExpeditionRuns(latestGameStateRef.current, partyIndex, gameMode, EXPEDITION_SIMULATION_RUN_COUNT, onProgress, enemyLevelOffset)
    ), []),

    updatePartyDeity: useCallback((partyIndex: number, deityName: string) => {
      dispatch({ type: 'UPDATE_PARTY_DEITY', partyIndex, deityName });
    }, []),

    runExpedition: useCallback((partyIndex: number, gameMode: RuntimeGameMode = 'mode.normal', triggerGodsBattle: boolean = false, simulatedAt?: number, enemyLevelOffset?: number) => {
      dispatch({ type: 'RUN_EXPEDITION', partyIndex, gameMode, triggerGodsBattle, simulatedAt, enemyLevelOffset });
    }, []),

    resolveInstantExpedition: useCallback((partyIndex: number, gameMode: RuntimeGameMode = 'mode.normal', triggerGodsBattle: boolean = false, simulatedAt: number = Date.now(), enemyLevelOffset?: number) => {
      dispatch({ type: 'RESOLVE_INSTANT_EXPEDITION', partyIndex, gameMode, triggerGodsBattle, simulatedAt, enemyLevelOffset });
    }, []),

    consumeInstantExpeditionStock: useCallback((partyIndex: number, now?: number, chargeDurationScale?: number) => {
      dispatch({ type: 'CONSUME_INSTANT_EXPEDITION_STOCK', partyIndex, now, chargeDurationScale });
    }, []),

    finalizeDiaryLog: useCallback((partyIndex: number, simulatedAt?: number) => {
      dispatch({ type: 'FINALIZE_DIARY_LOG', partyIndex, simulatedAt });
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

    removeAllEquipment: useCallback((characterId: number, partyIndex?: number) => {
      dispatch({ type: 'REMOVE_ALL_EQUIPMENT', characterId, partyIndex });
    }, []),

    saveEquipmentSet: useCallback((characterId: number, name: string, createdAt: number, partyIndex?: number) => {
      dispatch({ type: 'SAVE_EQUIPMENT_SET', characterId, name, createdAt, partyIndex });
    }, []),

    renameEquipmentSet: useCallback((slot: number, name: string) => {
      dispatch({ type: 'RENAME_EQUIPMENT_SET', slot, name });
    }, []),

    deleteEquipmentSet: useCallback((slot: number) => {
      dispatch({ type: 'DELETE_EQUIPMENT_SET', slot });
    }, []),

    loadEquipmentSet: useCallback((characterId: number, slot: number, mode: EquipmentSetLoadMode, partyIndex?: number) => {
      dispatch({ type: 'LOAD_EQUIPMENT_SET', characterId, slot, mode, partyIndex });
    }, []),

    applyAutoEquipmentActions: useCallback((actions: AutoEquipmentProfileAction[]) => {
      dispatch({ type: 'APPLY_AUTO_EQUIPMENT_ACTIONS', actions });
    }, []),

    toggleEquipmentLock: useCallback((characterId: number, slotIndex: number, partyIndex?: number) => {
      dispatch({ type: 'TOGGLE_EQUIPMENT_LOCK', characterId, slotIndex, partyIndex });
    }, []),

    attachJewel: useCallback((characterId: number, slotIndex: number, jewelKey: 'might' | 'arcana' | 'fort' | 'ward' | 'shade' | 'focus', rank: number, partyIndex?: number) => {
      dispatch({ type: 'ATTACH_JEWEL', characterId, slotIndex, jewelKey, rank, partyIndex });
    }, []),

    updateCharacter: useCallback((characterId: number, updates: Partial<Character>, partyIndex?: number) => {
      dispatch({ type: 'UPDATE_CHARACTER', characterId, updates, partyIndex });
    }, []),

    reorderPartyCharacter: useCallback((fromIndex: number, toIndex: number, partyIndex?: number) => {
      dispatch({ type: 'REORDER_PARTY_CHARACTER', fromIndex, toIndex, partyIndex });
    }, []),

    sellStack: useCallback((variantKey: string) => {
      dispatch({ type: 'SELL_STACK', variantKey });
    }, []),

    sellAllOwned: useCallback(() => {
      dispatch({ type: 'SELL_ALL_OWNED' });
    }, []),

    grantFeedbackReward: useCallback(() => {
      dispatch({ type: 'GRANT_FEEDBACK_REWARD' });
    }, []),

    unlockMimorianEnemy: useCallback((enemyId: number) => {
      dispatch({ type: 'UNLOCK_MIMORIAN_ENEMY', enemyId });
    }, []),

    buyShopItem: useCallback((itemId: number, stockItemKey: string) => {
      dispatch({ type: 'BUY_SHOP_ITEM', itemId, stockItemKey });
    }, []),

    buyDebugStoreItem: useCallback((itemId: number) => {
      dispatch({ type: 'BUY_DEBUG_STORE_ITEM', itemId });
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

    markPartyDiaryLogsSeen: useCallback((partyIndex: number) => {
      dispatch({ type: 'MARK_PARTY_DIARY_LOGS_SEEN', partyIndex });
    }, []),

    markDeveloperNewsRead: useCallback((itemIds: string[]) => {
      dispatch({ type: 'MARK_DEVELOPER_NEWS_READ', itemIds });
    }, []),

    updateDiarySettings: useCallback((partyIndex: number, settings: Partial<DiarySettings>) => {
      dispatch({ type: 'UPDATE_DIARY_SETTINGS', partyIndex, settings });
    }, []),

    setJewelAutoEquipPriorityParty: useCallback((partyId: number | null) => {
      dispatch({ type: 'SET_JEWEL_AUTO_EQUIP_PRIORITY_PARTY', partyId });
    }, []),

    simulateAfk: useCallback((elapsedMs: number, isAutoRepeatEnabled: boolean, gameMode: RuntimeGameMode = 'mode.normal', simulatedEndAt?: number, cycleDurationScale?: number, batchSlice?: AfkSimulationBatchSlice, enemyLevelOffset?: number) => {
      dispatch({ type: 'SIMULATE_AFK', elapsedMs, isAutoRepeatEnabled, gameMode, enemyLevelOffset, simulatedEndAt, cycleDurationScale, ...batchSlice });
    }, []),

    commitAfkPartyChunk: useCallback((result: AfkPartyChunkResult) => {
      dispatch({ type: 'COMMIT_AFK_PARTY_CHUNK', result });
    }, []),

    commitAfkPartyTransaction: useCallback((
      result: AfkPartyChunkResult,
      autoEquipment: readonly AutoEquipmentProfileAction[] | AfkPartyTransactionPlanner,
      attribution?: AfkPartyTransactionAttribution,
    ) => {
      dispatch({ type: 'COMMIT_AFK_PARTY_TRANSACTION', result, autoEquipment, attribution });
    }, []),

    commitAfkPartyTransactionAuthoritatively: useCallback((
      result: AfkPartyChunkResult,
      autoEquipment: readonly AutoEquipmentProfileAction[] | AfkPartyTransactionPlanner,
      attribution?: AfkPartyTransactionAttribution,
    ) => dispatchAuthoritative({
      type: 'COMMIT_AFK_PARTY_TRANSACTION',
      result,
      autoEquipment,
      attribution,
    }, false), [dispatchAuthoritative]),

    getAuthoritativeState: useCallback(() => authority.getAuthoritativeSnapshot(), [authority]),

    publishAuthoritativeState: useCallback(() => {
      const previousPresentedVersion = authority.getPresentedSnapshot().version;
      const authoritative = authority.getAuthoritativeSnapshot();
      const published = authority.publishLatest();
      return {
        published,
        version: authoritative.version,
        previousPresentedVersion,
        delayMs: Math.max(0, performance.now() - authoritative.installedAt),
      };
    }, [authority]),

    // SpecRef: 9.1.3 | Experimental AI API | Evaluation transactions
    getApiReadiness: () => isSaveBlockedByLoadFailure ? 'save_error' as const : 'ready' as const,
    commitApiState: useCallback(async (nextState: GameState) => {
      const coordinator = persistenceCoordinatorRef.current;
      if (!coordinator) throw new Error('persistence_unavailable');
      coordinator.commitAtomic(nextState);
      latestGameStateRef.current = nextState;
      dispatch({ type: 'COMMIT_API_STATE', state: nextState });
    }, []),

    runApiSortieBatch: useCallback((partyIndex: number, count: number, gameMode: RuntimeGameMode = 'mode.normal', simulatedAt: number = Date.now(), enemyLevelOffset?: number) => {
      const batch = simulateApiSortieBatchForTesting(latestGameStateRef.current, partyIndex, count, gameMode, simulatedAt, enemyLevelOffset);
      dispatch({ type: 'COMMIT_API_STATE', state: batch.state });
      return batch;
    }, []),

    resetGame: useCallback(() => {
      dispatch({ type: 'RESET_GAME' });
    }, []),

    importGameState: useCallback(async (nextState: GameState): Promise<LoadSavedStateResult> => {
      try {
        // Unprefixed JSON is intentionally accepted by the normal legacy load path.
        const imported = loadSavedState(JSON.stringify(nextState));
        if (!imported.state) return imported;
        const normalizedState = gameReducer(imported.state, { type: 'IMPORT_GAME_STATE', state: imported.state });
        await persistenceCoordinatorRef.current?.replaceDurable(normalizedState);
        dispatch({ type: 'COMMIT_API_STATE', state: normalizedState });
        setSaveErrorLog(null);
        return { state: normalizedState, errorLog: null };
      } catch (error) {
        const errorLog = formatLoadErrorLog(error);
        setSaveErrorLog(errorLog);
        return { state: null, errorLog };
      }
    }, []),

    getCompressedSavePayload: useCallback(async (): Promise<string> => {
      await persistenceCoordinatorRef.current?.requestDurable(latestGameStateRef.current);
      const coordinator = persistenceCoordinatorRef.current;
      if (!coordinator) throw new Error('Persistence coordinator was unavailable.');
      return coordinator.createExportPayload(latestGameStateRef.current);
    }, []),

    resetCommonBags: useCallback((partyIndex?: number) => {
      dispatch({ type: 'RESET_COMMON_BAGS', partyIndex });
    }, []),

    resetUniqueBags: useCallback((partyIndex?: number) => {
      dispatch({ type: 'RESET_UNIQUE_BAGS', partyIndex });
    }, []),

    resetCommonSuperRareBag: useCallback((partyIndex?: number) => {
      dispatch({ type: 'RESET_COMMON_SUPER_RARE_BAG', partyIndex });
    }, []),

    resetRareSuperRareBag: useCallback((partyIndex?: number) => {
      dispatch({ type: 'RESET_RARE_SUPER_RARE_BAG', partyIndex });
    }, []),

    resetSideQuestBag: useCallback((partyIndex?: number) => {
      dispatch({ type: 'RESET_SIDE_QUEST_BAG', partyIndex });
    }, []),

    setLanguage: useCallback(async (language: Language) => {
      await ensureLanguageLoaded(language);
      dispatch({ type: 'SET_LANGUAGE', language });
    }, []),

    unlockPartySlot: useCallback(() => {
      dispatch({ type: 'UNLOCK_PARTY_SLOT' });
    }, []),

    addNotification,
    addStatNotifications,
    dismissNotification,
    dismissAllNotifications,
    flushSave: flushPendingSave,
  };

  const selectedParty = state.parties[state.selectedPartyIndex];
  return {
    state,
    actions,
    bags: selectedParty?.bags ?? state.bags,
    notifications,
    saveLoadWarning: loadErrorLog
      ? {
          message: t(SAVE_LOAD_WARNING_KEY),
          errorLog: loadErrorLog,
        }
      : null,
    saveWriteWarning: saveErrorLog
      ? {
          message: t('save.writeWarning'),
          errorLog: saveErrorLog,
        }
      : null,
  };
}
