import { useReducer, useCallback, useEffect, useRef, useState } from 'react';
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
  DiaryDefeatNotificationMode,
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
  ExpeditionDestinationMode,
} from '../types';
import { computeCharacterHpContribution, computePartyStats } from '../game/partyComputation';
import { executeBattle, calculateEnemyAttackValues } from '../game/battle';
import { getEncounterEnemyWithScaling, getRoomMultiplier } from '../game/enemyScaling';
import { buildColosseumEnemy, getColosseumEnemySettings } from '../game/colosseum';
import { replaceCharacterEquipment } from '../game/equipment';
import { DUNGEONS, getDungeonById, getEffectiveEnemyLevel, getEffectiveEnemyMultipliers, getEffectiveExpeditionTier } from '../data/dungeons';
import { ENEMIES, getEnemiesByPool, getElitesByPool, getBossEnemy, getEnemyDropCandidates } from '../data/enemies';
import { getGodProfileForDungeon } from '../data/dropTables';
import { buildGodRuntimeEnemy } from '../game/godEnemy';
import { getDifficultyOffsetItemChanceTickets, getDifficultyOffsetMax, getDifficultyOffsetSuperRareChanceTickets, normalizeDifficultyOffset } from '../game/difficultyOffset';
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
  createCommonSuperRareBag,
  createRareSuperRareBag,
  createPhysicalThreatBag,
  createMagicalThreatBag,
  createSideQuestBag,
  createSleepinessPartyBag,
  normalizeSleepinessPartyBag,
  normalizeBagForType,
  BagType,
  normalizeGameBags,
  initializeBags,
} from '../game/bags';
import { getItemById } from '../data/items';
import { hydrateGameState, serializeGameState } from '../game/saveCodec';
import { getItemDisplayName } from '../game/gameState';
import { INSTANT_EXPEDITION_MAX_STOCK, consumeInstantExpeditionStock, getInstantExpeditionChargeState } from '../game/instantExpedition';
import { DEITY_OPTIONS, getDeityDepositMultiplier, getDeityKey, getDeityRank, getDeityRewardDrawBonuses, isNoFaithDeity, normalizeDeityName } from '../game/deity';
import { RACES } from '../data/races';
import { CLASSES } from '../data/classes';
import { PREDISPOSITIONS } from '../data/predispositions';
import { LINEAGES } from '../data/lineages';
import { BONUS_ABILITY_GLOSSARY_ENTRIES } from '../data/bonusAbilityGlossary';
import { TERRAIN_EFFECT_GLOSSARY_SECTION } from '../data/glossary';
import {
  getGodsBattleRequired,
  getGodsBattleProgress,
  getGodsBattleProgressKey,
  getEliteGateKey,
  getBossGateKey,
  getClearGateRequired,
  isClearGateUnlocked,
  checkClearGateRequirement,
  addRecoveredBossRaresToGodsBattleProgress,
  applyClearGateOutcome,
  hasDefeatedDungeonBoss,
  isDungeonEntryUnlocked,
} from '../game/clearGate';
import { calculateExperience, getXpToNextLevel } from '../game/partyLevel';
import { MAX_LEVEL } from '../types';
import { createEnvironmentStorageKey, getEnvironmentId } from '../game/environment';
import { DIARY_LOG_RETENTION_LIMIT, getDiaryOutcomeTrigger } from '../game/diary';
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
import { getAltarLevel, getAltarVictoriesForEnemyType, getEnemyFormPranaCost, getEnemyRequiredAltarLevel, getSuperRareItemPrana } from '../game/prana';
import {
  addJewelToInventory,
  createStarterJewelInventory,
  getJewelOwnedCount,
  isJewelAllowedForCategory,
  removeJewelFromInventory,
  getJewelNameByRank,
} from '../game/jewel';
import { decodePersistedState, encodePersistedState } from '../game/storageCompression';
import { Language, normalizeLanguage, persistLanguage, resolveInitialLanguage, setLanguage as setActiveLanguage, getRandomTranslation, t, translate } from '../i18n';
import { getAfkOperationWindow, getApproxAfkCycleDurationMs, type AfkSimulationBatchSlice } from '../game/afkScheduler';

const BUILD_NUMBER = __BUILD_NUMBER__;
const STORAGE_KEY = createEnvironmentStorageKey('kemo-expedition-save');
const AFK_MAX_SIMULATION_MS = 600 * 60 * 1000;
const STATE_SAVE_THROTTLE_MS = 5000;
const DEBUG_CYCLE_DURATION_SCALE = 0.05;
const ITEM_MAX_STACK = 99;
const TIME_BASED_SIDE_QUEST_TYPES = new Set(['q.exercise', 'q.healing', 'q.AFK']);
const BASE_STEP_DURATION_MS = 15_000;

function generateUserId(): string {
  // SpecRef: 1.2 | CONSTANTS_GLOBAL | User ID (UUID)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `uuid-${Date.now()}-${Math.floor(Math.random() * 1_000_000_000)}`;
}
const APPROX_CYCLE_STEP_COUNT = 30;
const SAVE_LOAD_WARNING_KEY = 'save.loadWarning';
const VALID_GLOSSARY_ABILITY_IDS = new Set(BONUS_ABILITY_GLOSSARY_ENTRIES.map((entry) => entry.abilityId));
const VALID_GLOSSARY_TERRAIN_KEYS = new Set(
  (TERRAIN_EFFECT_GLOSSARY_SECTION?.entries ?? []).map((entry) => entry.key as TerrainEffectKey),
);

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

// SpecRef: 1.0.3 | Glossary Reveal Rule | revealed
function normalizeRevealedGlossaryAbilityIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(
    value.filter((abilityId): abilityId is string => (
      typeof abilityId === 'string' && VALID_GLOSSARY_ABILITY_IDS.has(abilityId as typeof BONUS_ABILITY_GLOSSARY_ENTRIES[number]['abilityId'])
    )),
  ));
}

// SpecRef: 1.0.3 | Glossary Reveal Rule | revealed
function normalizeRevealedGlossaryTerrainKeys(value: unknown): TerrainEffectKey[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(
    value.filter((terrainKey): terrainKey is TerrainEffectKey => (
      typeof terrainKey === 'string' && VALID_GLOSSARY_TERRAIN_KEYS.has(terrainKey as TerrainEffectKey)
    )),
  ));
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

// SpecRef: 1.0.3 | Glossary Reveal Rule | reveal by encounter
function revealGlossaryFromEncounter(
  global: GameState['global'],
  abilityIds: Iterable<string>,
  terrainEffect?: TerrainEffectKey | 'none',
): Pick<GameState['global'], 'revealedGlossaryAbilityIds' | 'revealedGlossaryTerrainKeys'> {
  const nextAbilityIds = new Set(global.revealedGlossaryAbilityIds);
  const nextTerrainKeys = new Set(global.revealedGlossaryTerrainKeys);

  for (const abilityId of abilityIds) {
    if (VALID_GLOSSARY_ABILITY_IDS.has(abilityId as typeof BONUS_ABILITY_GLOSSARY_ENTRIES[number]['abilityId'])) {
      nextAbilityIds.add(abilityId);
    }
  }
  if (terrainEffect && terrainEffect !== 'none' && VALID_GLOSSARY_TERRAIN_KEYS.has(terrainEffect)) {
    nextTerrainKeys.add(terrainEffect);
  }

  return {
    revealedGlossaryAbilityIds: Array.from(nextAbilityIds),
    revealedGlossaryTerrainKeys: Array.from(nextTerrainKeys),
  };
}

const PARTY_UNLOCK_BY_DUNGEON_ID: Record<number, number> = {
  3: 2,
  4: 3,
  5: 4,
  6: 5,
  7: 6,
};

function getUnlockedPartySlotFromEntry(entry: ExpeditionLogEntry, dungeonId?: number): number | null {
  // SpecRef: 5.1.3.2 | Unlock party | Party unlock condition
  if (entry.outcome !== 'victory' || entry.roomType !== 'battle_Boss') return null;
  if (typeof dungeonId !== 'number') return null;
  return PARTY_UNLOCK_BY_DUNGEON_ID[dungeonId] ?? null;
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

// SpecRef: 8.5 | UI_DIARY | Each Party has an independent 24-entry Diary.
function enforceGlobalDiaryLogRetention(parties: Party[]): Party[] {
  return parties.map((party) => {
    const diaryLogs = party.diaryLogs ?? [];
    const nextDiaryLogs = diaryLogs
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, DIARY_LOG_RETENTION_LIMIT);
    if (nextDiaryLogs.length === diaryLogs.length && nextDiaryLogs.every((log, index) => log === diaryLogs[index])) {
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
      const partyUnlock = getUnlockedPartySlotFromEntry(entry, log.dungeonId);
      return !!partyUnlock;
    });

  const unlockHeadline = unlockSourceEntry?.enemyName.includes('(BOSS)')
    ? t('unlock.condition.dungeonCleared', { dungeon: log.dungeonName })
    : t('unlock.condition.met');

  const unlockPartyLabel = unlockedPartySlot ? t('unlock.partySlot', { slot: unlockedPartySlot }) : '';
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

const DEFAULT_DIARY_SETTINGS: DiarySettings = {
  superRareThreshold: 'all',
  bossThreshold: 'all',
  mythicThreshold: 'all',
  rareThreshold: 5,
  sideQuestThreshold: 'all',
  notifyGodsBattle: true,
  defeatNotificationMode: 'defeatOnly',
  notifyCyclePopup: true,
  notifyItemDropPopup: true,
  notifyAutoEquipmentPopup: true,
  notifySideQuestPopup: true,
};

const MELEE_CATEGORIES = new Set<Item['category']>(['sword', 'katana', 'gauntlet']);
const RANGED_CATEGORIES = new Set<Item['category']>(['arrow', 'bolt', 'archery']);
const MAGIC_CATEGORIES = new Set<Item['category']>(['wand', 'grimoire', 'catalyst']);


function isGodsBattleAvailable(party: Party, dungeonId: number): boolean {
  // SpecRef: 5.1.3.1 | "Clear-Gate" progression system specification | Gods battle gate
  return getGodsBattleProgress(party, dungeonId) >= getGodsBattleRequired()
    && hasDefeatedDungeonBoss(party, dungeonId);
}

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

  const nextDungeon = DUNGEONS.find((dungeon) => dungeon.id === party.selectedDungeonId + 1 && dungeon.id <= 8);
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

function normalizeDiaryDefeatNotificationMode(
  value: unknown,
  legacyNotifyDefeat: unknown,
): DiaryDefeatNotificationMode {
  if (value === 'defeatOnly' || value === 'defeatAndDraw' || value === 'defeatDrawRetreat' || value === 'all' || value === 'none') return value;
  if (legacyNotifyDefeat === false) return 'none';
  return 'defeatOnly';
}

// SpecRef: 8.5 | UI_DIARY | Setting.
function getDiarySettingsWithDefaults(value: Partial<DiarySettings> | undefined): DiarySettings {
  const raw = value as (Partial<DiarySettings> & { notifyDefeat?: unknown }) | undefined;
  return {
    ...DEFAULT_DIARY_SETTINGS,
    ...(value ?? {}),
    defeatNotificationMode: normalizeDiaryDefeatNotificationMode(raw?.defeatNotificationMode, raw?.notifyDefeat),
    notifyCyclePopup: typeof raw?.notifyCyclePopup === 'boolean' ? raw.notifyCyclePopup : true,
    notifyItemDropPopup: typeof raw?.notifyItemDropPopup === 'boolean' ? raw.notifyItemDropPopup : true,
    notifyAutoEquipmentPopup: typeof raw?.notifyAutoEquipmentPopup === 'boolean' ? raw.notifyAutoEquipmentPopup : true,
    notifySideQuestPopup: typeof raw?.notifySideQuestPopup === 'boolean' ? raw.notifySideQuestPopup : true,
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

function matchesDiaryThreshold(item: Item, threshold: DiarySettings['superRareThreshold']): boolean {
  if (threshold === 'none') return false;
  if (threshold === 'all') return true;
  return item.enhancement >= threshold;
}

// SpecRef: 8.5 | UI_DIARY | Setting.
function matchesSideQuestDiaryThreshold(rewardRank: number, threshold: DiarySettings['sideQuestThreshold']): boolean {
  if (threshold === 'none') return false;
  if (threshold === 'all') return true;
  if (threshold === 8) return rewardRank === 8;
  return rewardRank >= threshold;
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
        .map((entry) => {
          if (Array.isArray(entry) && entry.length >= 2) {
            const [id, tickets] = entry;
            if (typeof id === 'number' && typeof tickets === 'number') {
              return {
                id,
                tickets: Math.max(0, Math.floor(tickets)),
              };
            }
            return null;
          }
          if (entry && typeof entry === 'object' && 'id' in entry && 'tickets' in entry) {
            const typedEntry = entry as { id: unknown; tickets: unknown };
            return {
              id: typeof typedEntry.id === 'number' ? typedEntry.id : 0,
              tickets: Math.max(0, Math.floor(typeof typedEntry.tickets === 'number' ? typedEntry.tickets : 0)),
            };
          }
          return null;
        })
        .filter((entry): entry is { id: number; tickets: number } => entry !== null),
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
    commonSuperRareBag: migrateLegacyBag(bags.commonSuperRareBag ?? bags.superRareBag, createCommonSuperRareBag, 'commonSuperRareBag'),
    rareSuperRareBag: migrateLegacyBag(bags.rareSuperRareBag ?? bags.superRareBag, createRareSuperRareBag, 'rareSuperRareBag'),
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
    const parsed = JSON.parse(decodePersistedState(saved));
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

        parsed.bags = normalizeGameBags({
          commonRewardBag: migrateLegacyBag(parsed.bags.commonRewardBag, createCommonRewardBag, 'commonRewardBag'),
          commonEnhancementBag: migrateLegacyBag(parsed.bags.commonEnhancementBag, createCommonEnhancementBag, 'commonEnhancementBag'),
          uncommonRewardBag: migrateLegacyBag(parsed.bags.uncommonRewardBag, createUncommonRewardBag, 'uncommonRewardBag'),
          eliteRareRewardBag: migrateLegacyBag(parsed.bags.eliteRareRewardBag, createEliteRareRewardBag, 'eliteRareRewardBag'),
          bossRareRewardBag: migrateLegacyBag(parsed.bags.bossRareRewardBag, createBossRareRewardBag, 'bossRareRewardBag'),
          mythicRareRewardBag: migrateLegacyBag(parsed.bags.mythicRareRewardBag, createMythicRareRewardBag, 'mythicRareRewardBag'),
          enhancementBag: migrateLegacyBag(parsed.bags.enhancementBag, createEnhancementBag, 'enhancementBag'),
          superRareBag: migrateLegacyBag(parsed.bags.superRareBag, createSuperRareBag, 'superRareBag'),
          commonSuperRareBag: migrateLegacyBag(parsed.bags.commonSuperRareBag ?? parsed.bags.superRareBag, createCommonSuperRareBag, 'commonSuperRareBag'),
          rareSuperRareBag: migrateLegacyBag(parsed.bags.rareSuperRareBag ?? parsed.bags.superRareBag, createRareSuperRareBag, 'rareSuperRareBag'),
          physicalThreatBag: migrateLegacyBag(parsed.bags.physicalThreatBag, createPhysicalThreatBag, 'physicalThreatBag'),
          magicalThreatBag: migrateLegacyBag(parsed.bags.magicalThreatBag, createMagicalThreatBag, 'magicalThreatBag'),
          sideQuestBag: migrateLegacyBag(parsed.bags.sideQuestBag, createSideQuestBag, 'sideQuestBag'),
        });

        if (!parsed.global) {
          const firstParty = parsed.parties?.[0];
          parsed.global = {
            gold: firstParty?.gold ?? 200,
            inventory: migrateOldInventory(firstParty?.inventory ?? []),
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
            enemyBattleStats: {},
            altarVictoriesByEnemyType: {},
            readDeveloperNewsItemIds: [],
          };
        }
        if (Array.isArray(parsed.global.inventory)) {
          parsed.global.inventory = migrateOldInventory(parsed.global.inventory);
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
        parsed.parties = enforceGlobalDiaryLogRetention(parsed.parties);
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

type SaveStateResult = { ok: true } | { ok: false; errorLog: string };

function saveState(state: GameState): SaveStateResult {
  try {
    const payload = JSON.stringify(serializeGameState(state));
    localStorage.setItem(STORAGE_KEY, encodePersistedState(payload));
    return { ok: true };
  } catch (e) {
    console.error('Failed to save state:', e);
    return { ok: false, errorLog: formatLoadErrorLog(e) };
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
  return Math.random() < 0.5 ? 'male' : 'female';
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

function createInitialState(): InitialStateResult {
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
      jewelAutoEquipPriorityPartyId: 1,
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

type GameMode = 'm.kemo' | 'm.luna' | 'm.laika';

type GameAction =
  | { type: 'SELECT_PARTY'; partyIndex: number }
  | { type: 'SELECT_DUNGEON'; partyIndex: number; dungeonId: number; selectionMode?: 'manual' | 'auto' }
  | { type: 'SET_EXPEDITION_DESTINATION_MODE'; partyIndex: number; mode: ExpeditionDestinationMode }
  | { type: 'SET_EXPEDITION_DEPTH_LIMIT'; partyIndex: number; depthLimit: ExpeditionDepthLimit }
  | { type: 'SET_EXPEDITION_DIFFICULTY_OFFSET'; partyIndex: number; difficultyOffset: number }
  | { type: 'RESET_EXPEDITION_STATS'; partyIndex: number }
  | { type: 'UPDATE_PARTY_DEITY'; partyIndex: number; deityName: string }
  | { type: 'RUN_EXPEDITION'; partyIndex: number; simulatedAt?: number; gameMode?: GameMode; triggerGodsBattle?: boolean; isAfkSimulation?: boolean }
  | { type: 'RESOLVE_INSTANT_EXPEDITION'; partyIndex: number; simulatedAt: number; gameMode?: GameMode; triggerGodsBattle?: boolean }
  | { type: 'CONSUME_INSTANT_EXPEDITION_STOCK'; partyIndex: number; now?: number }
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
  | { type: 'TOGGLE_EQUIPMENT_LOCK'; characterId: number; slotIndex: number; partyIndex?: number }
  | { type: 'ATTACH_JEWEL'; characterId: number; slotIndex: number; jewelKey: 'might' | 'arcana' | 'fort' | 'ward' | 'shade' | 'focus'; rank: number; partyIndex?: number }
  | { type: 'UPDATE_CHARACTER'; characterId: number; updates: Partial<Character>; partyIndex?: number }
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
  | { type: 'SIMULATE_AFK'; elapsedMs: number; isAutoRepeatEnabled: boolean; gameMode?: GameMode; simulatedEndAt?: number; cycleDurationScale?: number; cycleDurationByParty?: number[]; operationStart?: number; operationCount?: number; finalizeChunk?: boolean }
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

// Select enemy based on room type and pool
function selectEnemyForRoom(
  roomType: RoomType,
  poolId?: number,
  bossId?: number,
  floorNumber?: number,
  roomIndex?: number,
  roomEnemyIds: number[] = [],
  usedEnemyIdsInRange: ReadonlySet<number> = new Set(),
): EnemyDef | null {
  if (poolId === 99 || bossId === 9901) {
    return buildColosseumEnemy(getColosseumEnemySettings());
  }

  if (roomType === 'battle_Boss' && bossId) {
    return getBossEnemy(bossId) ?? null;
  }

  if (roomEnemyIds.length > 0) {
    // SpecRef: 4.2 | EXPEDITION_&_ENEMY_MASTER_DATA | Room range enemy uniqueness
    const explicitEnemies = roomEnemyIds
      .map((enemyId) => ENEMIES.find((enemy) => enemy.id === enemyId))
      .filter((enemy): enemy is EnemyDef => enemy !== undefined)
      .sort((a, b) => a.id - b.id);
    const availableEnemies = explicitEnemies.filter((enemy) => !usedEnemyIdsInRange.has(enemy.id));
    const selectableEnemies = availableEnemies.length > 0 ? availableEnemies : explicitEnemies;
    if (selectableEnemies.length > 0) {
      const randomIndex = Math.floor(Math.random() * selectableEnemies.length);
      return selectableEnemies[randomIndex] ?? selectableEnemies[0] ?? null;
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
  return displayName.split(/[ ,]/)[0] ?? displayName;
}

function createGodEnemy(
  enemy: EnemyDef,
  dungeonId: number,
  dungeonName: string,
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

  const godItemIds = godProfile.itemIds;

  const runtimeGodEnemy = buildGodRuntimeEnemy(godProfile, difficultyOffset);

  if (!runtimeGodEnemy) {
    return {
      ...enemy,
      name: godName,
      nameKey: undefined,
      enemyClass: godProfile.enemyClass,
      abilities: godProfile.abilities,
      itemIds: godItemIds,
      isGodEnemy: true,
    };
  }

  return {
    ...enemy,
    ...runtimeGodEnemy,
    id: godProfile.enemyId,
    type: enemy.type,
    spawnTier: enemy.spawnTier,
    spawnPool: enemy.spawnPool,
    poolId: enemy.poolId,
    itemIds: godItemIds,
    isGodEnemy: true,
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

function hasActiveNonGodBattleClearGateCondition(party: Party): boolean {
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

function getSuperRareBagTypeForRarity(rarity: 'common' | 'uncommon' | 'eliteRare' | 'bossRare' | 'mythicRare'): 'commonSuperRareBag' | 'rareSuperRareBag' {
  return rarity === 'common' ? 'commonSuperRareBag' : 'rareSuperRareBag';
}

function resolveEnemyRewards(
  enemy: EnemyDef,
  currentBags: GameState['bags'],
  currentInventory: InventoryRecord,
  currentGold: number,
  hasUnlock: boolean,
  autoSellMultiplier: number,
  terrainEffect: TerrainEffectKey | undefined,
  deityItemChanceTickets: number = 0,
  auriferousBonusRolls: number = 0,
  difficultyItemChanceTickets: number = 0,
  difficultySuperRareChanceTickets: number = 0,
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
  const baseDropItems = dropCandidates;

  for (const baseItem of baseDropItems) {
    const baseRarity = getItemRarityById(baseItem.id);
    const rewardBagType = getRewardBagTypeForRarity(baseRarity);
    const superRareBagType = getSuperRareBagTypeForRarity(baseRarity);
    const enhancementBagType = rewardBagType === 'commonRewardBag' ? 'commonEnhancementBag' : 'enhancementBag';

    bags = refillBagIfEmpty(bags, rewardBagType);
    const { ticket: rewardTicket, newBag: newRewardBag } = drawFromBag(bags[rewardBagType]);
    bags = { ...bags, [rewardBagType]: newRewardBag };

    let gotReward = rewardTicket === 1;

    // SpecRef: 6.1.6 | REWARD | Ticket calculation
    const totalTicketCount =
      2
      + (hasUnlock ? 1 : 0)
      + (terrainEffect !== 'terrain.gehenna' ? Math.max(0, deityItemChanceTickets) : 0)
      + difficultyItemChanceTickets
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

    const normalizedEnhancement = enhVal;

    // SpecRef: 6.1.6 | REWARD | A Super Rare draw is only available when the
    // rarity-specific enhancement threshold has been met.
    let srVal = 0;
    const qualifiesForSuperRare = baseRarity === 'common'
      ? normalizedEnhancement >= 2
      : normalizedEnhancement >= 1;
    const superRareRollCount = qualifiesForSuperRare
      ? 1 + Math.max(0, difficultySuperRareChanceTickets)
      : 0;
    for (let srRollIndex = 0; srRollIndex < superRareRollCount; srRollIndex++) {
      bags = refillBagIfEmpty(bags, superRareBagType);
      const { ticket: drawnSrVal, newBag: newSRBag } = drawFromBag(bags[superRareBagType]);
      bags = { ...bags, [superRareBagType]: newSRBag };
      srVal = Math.max(srVal, drawnSrVal);
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
  const momentumLevel = getPartyAbilityLevel(party, 'momentum');
  const deityDepositMultiplier = getDeityDepositMultiplier(party.deity.name, party.deityGold ?? 0);
  const momentumEmbezzlementRate = momentumLevel > 0 ? 0.1 : 0;

  return Math.max(0, deityDepositMultiplier - momentumEmbezzlementRate);
}

function rollPercentInclusive(min: number, max: number): number {
  const lower = Math.ceil(Math.min(min, max));
  const upper = Math.floor(Math.max(min, max));
  return Math.floor(Math.random() * (upper - lower + 1)) + lower;
}

type PrayerProfitResult = {
  donation: number;
  deposit: number;
  embezzled: number;
};

function calculatePrayerProfit(party: Party, pendingProfit: number): PrayerProfitResult {
  // SpecRef: 5.1.1 | Party State Machine | state.pray
  const cyclePendingProfit = Math.max(0, Math.floor(pendingProfit));
  const isNoFaith = isNoFaithDeity(party.deity.name);
  const donationRate = rollPercentInclusive(10, 33);
  const baseDonation = Math.floor((cyclePendingProfit * donationRate) / 100);
  const titheLevel = getPartyAbilityLevel(party, 'tithe');
  const titheBonusRate = isNoFaith ? 0 : (titheLevel >= 2 ? 0.15 : titheLevel >= 1 ? 0.1 : 0);
  const titheBonus = Math.floor(cyclePendingProfit * titheBonusRate);
  const donation = isNoFaith ? 0 : Math.min(cyclePendingProfit, baseDonation + titheBonus);
  const rawDeposit = Math.max(0, cyclePendingProfit - donation);
  const deposit = Math.floor(rawDeposit * getPrayerDepositMultiplier(party));
  const embezzled = Math.max(0, rawDeposit - deposit);

  return { donation, deposit, embezzled };
}

function calculateFreeActionSpend(party: Party, pendingProfit: number): number {
  // SpecRef: 5.1.1 | Party State Machine | state.free_action
  const cyclePendingProfit = Math.max(0, Math.floor(pendingProfit));
  const baseSpend = Math.floor((cyclePendingProfit * rollPercentInclusive(20, 40)) / 100);
  const squanderLevel = getPartyAbilityLevel(party, 'squander');
  const squanderMultiplier = squanderLevel >= 2 ? 1.5 : squanderLevel >= 1 ? 1.3 : 1;

  return Math.min(cyclePendingProfit, Math.floor(baseSpend * squanderMultiplier));
}

function processAfkCycleProfit(state: GameState, partyIndex: number, simulatedAt: number): GameState {
  // SpecRef: 5.1.1 | Party State Machine | state.free_action
  // SpecRef: 5.1.1 | Party State Machine | state.pray
  const party = state.parties[partyIndex];
  if (!party) return state;

  const pendingProfit = Math.max(0, Math.floor(party.pendingProfit ?? 0));
  if (pendingProfit <= 0) return state;

  const spend = calculateFreeActionSpend(party, pendingProfit);
  let nextState = gameReducer(state, { type: 'SPEND_PENDING_PROFIT', partyIndex, amount: spend });

  if (party.sideQuest?.type === 'q.squander' && spend > 0) {
    nextState = gameReducer(nextState, { type: 'ADVANCE_SIDE_QUEST', partyIndex, amount: spend, simulatedAt });
  }

  const partyAtPrayer = nextState.parties[partyIndex];
  if (!partyAtPrayer) return nextState;
  const prayerPendingProfit = Math.max(0, Math.floor(partyAtPrayer.pendingProfit ?? 0));
  const { donation, deposit, embezzled } = calculatePrayerProfit(partyAtPrayer, prayerPendingProfit);
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
  totalDonatedGold: number,
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
    const healRate = 0.2 + 0.001 * getDeityRank(totalDonatedGold);
    const healAmount = Math.floor(missingHp * healRate);
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
      action: t('auto.jp.b871f82e74'),
      note: t('game.log.hpHeal', { amount: healAmount }),
    };
  }

  if (deityKey === 'God of Attrition' && attritionAmount && attritionAmount > 0) {
    return {
      phase: 'end',
      actor: 'effect',
      action: t('auto.jp.f8c08c2728'),
      note: t('game.log.hpAttrition', { amount: attritionAmount }),
    };
  }

  return null;
}

const TERRAIN_REJUVENATION_LOG_COUNT = 10;
const TERRAIN_ROTWOOD_LOG_COUNT = 10;
const TERRAIN_ABUNDANT_LOG_COUNT = 10;
const TERRAIN_DECAY_LOG_COUNT = 10;
const TERRAIN_LEAKAGE_LOG_COUNT = 10;
const TERRAIN_HEATWAVE_LOG_COUNT = 10;
const FIRST_AID_LOG_COUNT = 10;

function getFirstAidHealRate(level: number): number {
  if (level >= 5) return 0.06;
  if (level === 4) return 0.05;
  if (level === 3) return 0.04;
  if (level === 2) return 0.03;
  if (level === 1) return 0.02;
  return 0;
}

// SpecRef: 6.1.5 | Outcome | a.first-aid
function applyFirstAidHpEffect(
  party: Party,
  characterStats: ReturnType<typeof computePartyStats>['characterStats'],
  floorNumber: number,
  roomInFloor: number,
  roomType: RoomType,
  currentHp: number,
  maxHp: number,
): { hp: number; logs: BattleLogEntry[] } {
  const isEliteRoom = floorNumber >= 1 && floorNumber <= 5
    && roomInFloor === 4
    && roomType === 'battle_Elite';
  if (!isEliteRoom) {
    return { hp: currentHp, logs: [] };
  }

  let nextHp = currentHp;
  const logs: BattleLogEntry[] = [];

  for (const character of party.characters) {
    const stats = characterStats.find((entry) => entry.characterId === character.id);
    const firstAidLevel = stats?.abilities
      .filter((ability) => ability.id === 'first_aid')
      .reduce((maxLevel, ability) => Math.max(maxLevel, ability.level), 0)
      ?? 0;
    if (firstAidLevel <= 0) continue;

    const healRate = getFirstAidHealRate(firstAidLevel);
    if (healRate <= 0) continue;

    const hpContribution = computeCharacterHpContribution(character, party.level);
    const healAmount = Math.floor(hpContribution.totalHpBonus * healRate);
    if (healAmount <= 0) continue;

    const flavorText = getRandomTranslation('battleFlavor.passive.firstAid', FIRST_AID_LOG_COUNT, { actor: character.name });
    logs.push({
      phase: 'end',
      actor: 'effect',
      action: flavorText,
      note: t('game.log.hpHeal', { amount: healAmount }),
    });

    nextHp = Math.min(maxHp, nextHp + healAmount);
  }

  return { hp: nextHp, logs };
}

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
  const flavorText = getRandomTranslation('battleFlavor.environment.abundant', TERRAIN_ABUNDANT_LOG_COUNT);
  return {
    phase: 'end',
    actor: 'effect',
    action: flavorText,
    note: t('game.log.hpHeal', { amount: healAmount }),
  };
}

function buildTerrainDecayLogEntry(damageAmount?: number): BattleLogEntry | null {
  if (!damageAmount || damageAmount <= 0) return null;
  const flavorText = getRandomTranslation('battleFlavor.environment.decay', TERRAIN_DECAY_LOG_COUNT);
  return {
    phase: 'end',
    actor: 'effect',
    action: flavorText,
    note: t('game.log.hpDamage', { amount: damageAmount }),
  };
}

// SpecRef: 6.2.2 | Terrain flavor text | log.terrain.rejuvenation
function buildTerrainRejuvenationLogEntry(actorName: string, healAmount?: number): BattleLogEntry | null {
  if (!healAmount || healAmount <= 0) return null;
  const flavorText = getRandomTranslation('battleFlavor.environment.regeneration', TERRAIN_REJUVENATION_LOG_COUNT, { actor: actorName });
  return {
    phase: 'end',
    actor: 'effect',
    action: flavorText,
    note: t('game.log.hpHeal', { amount: healAmount }),
  };
}

// SpecRef: 6.2.2 | Terrain flavor text | log.terrain.rotwood
function buildTerrainRotwoodLogEntry(): BattleLogEntry {
  const flavorText = getRandomTranslation('battleFlavor.environment.decayBlocked', TERRAIN_ROTWOOD_LOG_COUNT);
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
  const flavorText = getRandomTranslation('battleFlavor.environment.heatwave', TERRAIN_HEATWAVE_LOG_COUNT, { actor: actorName });
  return {
    phase: 'end',
    actor: 'effect',
    effectKind: 'terrain',
    action: flavorText,
    note: t('game.log.hpDamage', { amount: damageAmount }),
  };
}

// SpecRef: 6.2.2 | Terrain flavor text | log.terrain.leakage
function buildTerrainLeakageLogEntry(targetName: string, damageAmount?: number): BattleLogEntry | null {
  if (!damageAmount || damageAmount <= 0) return null;
  const flavorText = getRandomTranslation('battleFlavor.environment.shock', TERRAIN_LEAKAGE_LOG_COUNT, { target: targetName });
  return {
    phase: 'end',
    actor: 'effect',
    action: flavorText,
    note: t('game.log.hpThunderDamage', { amount: damageAmount }),
  };
}

function buildRewardLogEntries(
  rewardLogEntries: { itemName: string; autoSellProfit?: number }[]
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

const AURIFEROUS_LOGS = [
  t('auto.jp.6210566513'),
  t('auto.jp.fe83eae722'),
  t('auto.jp.ca50cc6a99'),
  t('auto.jp.24a6922d44'),
  t('auto.jp.cd3b6f0501'),
  t('auto.jp.daafdc6596'),
  t('auto.jp.9932e8fabf'),
  t('auto.jp.8a3caa810b'),
  t('auto.jp.01bba62abd'),
  t('auto.jp.dc0d0cd51a'),
] as const;

function buildAuriferousLogEntry(actorName: string, totalHitsReceived: number, bonusRolls: number): BattleLogEntry | null {
  const flavorText = AURIFEROUS_LOGS[Math.floor(Math.random() * AURIFEROUS_LOGS.length)]
    ?? t('auto.jp.dc0d0cd51a');

  return {
    phase: 'end',
    actor: 'effect',
    action: flavorText.replace('{actor}', actorName),
    note: t('game.log.auriferousBonus', { totalHits: totalHitsReceived, bonusRolls }),
  };
}

function isRetreatHpThresholdReached(currentHp: number, maxHp: number): boolean {
  return currentHp <= maxHp * 0.3;
}

function syncPartyCurrentHpAfterMaxHpChange(previousParty: Party, nextParty: Party): Party {
  const previousMaxHp = computePartyStats(previousParty).partyStats.hp;
  const nextMaxHp = computePartyStats(nextParty).partyStats.hp;
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

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
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
      const nextParty = consumeInstantExpeditionStock(currentParty, now);
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
      const expeditionState = gameReducer(state, {
        type: 'RUN_EXPEDITION',
        partyIndex: action.partyIndex,
        simulatedAt: action.simulatedAt,
        gameMode: action.gameMode,
        triggerGodsBattle: action.triggerGodsBattle,
      });
      return gameReducer(expeditionState, {
        type: 'FINALIZE_DIARY_LOG',
        partyIndex: action.partyIndex,
        simulatedAt: action.simulatedAt,
      });
    }

    case 'RUN_EXPEDITION': {
      const currentParty = state.parties[action.partyIndex];
      const dungeon = getDungeonById(currentParty.selectedDungeonId);
      if (!dungeon) return state;
      const isGodsBattle = action.triggerGodsBattle === true && isGodsBattleAvailable(currentParty, dungeon.id);
      const { partyStats, characterStats } = computePartyStats(currentParty);
      const persistedCurrentHp = currentParty.currentHp ?? partyStats.hp;
      if (persistedCurrentHp <= 0 || partyStats.hp <= 0) {
        return state;
      }
      // SpecRef: 5.1.1 | Party State Machine | state.explore
      // RUN_EXPEDITION is shared by Online and AFK resolution, so restoring HP
      // here guarantees that every exploration begins at the party's current MaxHP.
      let currentHp = partyStats.hp;
      // SpecRef: 8.3 | UI_EXPEDITION | Difficulty Offset (難易度)
      const difficultyOffsetMax = getDifficultyOffsetMax(dungeon.expLevel);
      const effectiveDifficultyOffset = hasDefeatedDungeonBoss(currentParty, dungeon.id)
        ? normalizeExpeditionDifficultyOffset(currentParty.expeditionDifficultyOffsetByDungeon?.[dungeon.id] ?? currentParty.expeditionDifficultyOffset, difficultyOffsetMax)
        : 0;
      const difficultyItemChanceTickets = getDifficultyOffsetItemChanceTickets(effectiveDifficultyOffset);
      const difficultySuperRareChanceTickets = getDifficultyOffsetSuperRareChanceTickets(effectiveDifficultyOffset);

      const entries: ExpeditionLogEntry[] = [];
      const rewards: Item[] = [];
      const recoveredItems: Item[] = [];
      let totalExp = 0;
      let bags = normalizeImportedBags(currentParty.bags);
      let finalOutcome: 'Clear' | 'Escape' | 'Defeat' | 'Retreat' = 'Clear';
      let currentInventory = state.global.inventory;
      let currentGold = state.global.gold;
      let totalAutoSellProfit = 0;
      let totalAutoSellItemCount = 0;
      let totalAutoSellItems: { itemName: string; autoSellProfit: number }[] = [];
      let roomCounter = 0;
      let expeditionEnded = false;
      let nextEnemyBattleStats = { ...(state.global.enemyBattleStats ?? {}) };
      const revealedItemCompendiumItemIds = new Set<number>(state.global.revealedItemCompendiumItemIds ?? []);
      const revealedAbilityIds = new Set<string>(state.global.revealedGlossaryAbilityIds);
      characterStats.forEach((stats) => {
        stats.abilities.forEach((ability) => {
          revealedAbilityIds.add(ability.id);
        });
      });
      const revealedTerrainKeys = new Set<TerrainEffectKey>(state.global.revealedGlossaryTerrainKeys);

      // Use new floor structure if available
      if (dungeon.floors && dungeon.floors.length > 0) {
        // New v0.2.0 floor-based expedition
        for (const floor of dungeon.floors) {
          if (expeditionEnded) break;

          const selectedEnemyIdsByRoomRange = new Map<string, Set<number>>();

          for (let roomIndex = 0; roomIndex < floor.rooms.length; roomIndex++) {
            if (expeditionEnded) break;

            const roomDef = floor.rooms[roomIndex];
            roomCounter++;

            // SpecRef: 5.1.3.1 | "Clear-Gate" progression system specification | Gate `x.floor`,`x.room`
            const gateCheck = checkClearGateRequirement({
              dungeonId: dungeon.id,
              floorNumber: floor.floorNumber,
              roomInFloor: roomIndex + 1,
              roomType: roomDef.type,
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
                  false,
                  effectiveDifficultyOffset,
                ),
                enemyName: t('auto.jp.270d06353e'),
                enemyHP: 0,
                enemyAttackValues: '',
                outcome: 'draw', // Not a battle - displayed as 未到達
                damageDealt: 0,
                damageTaken: 0,
                remainingPartyHP: currentHp,
                maxPartyHP: partyStats.hp,
                details: [],
                gateInfo: roomDef.type === 'battle_Boss'
                  ? t('game.log.gateInfo.boss', { label: gateCheck.label, required: gateCheck.required })
                  : roomIndex === 0
                    ? t('game.log.gateInfo.dungeon', { label: gateCheck.label, current: gateCheck.current, required: gateCheck.required, dungeon: dungeon.name })
                    : t('game.log.gateInfo.floor', { label: gateCheck.label, required: gateCheck.required, floor: floor.floorNumber }),
              };
              entries.push(gateEntry);
              finalOutcome = 'Escape';
              expeditionEnded = true;
              break;
            }

            // Select enemy for this room
            // SpecRef: 4.2 | EXPEDITION_&_ENEMY_MASTER_DATA | Room range enemy uniqueness
            const explicitRoomEnemyIds = roomDef.enemyIds ?? [];
            const roomRangeKey = explicitRoomEnemyIds.length > 1
              ? `${floor.floorNumber}:${explicitRoomEnemyIds.slice().sort((a, b) => a - b).join(',')}`
              : null;
            const usedEnemyIdsInRange = roomRangeKey
              ? (selectedEnemyIdsByRoomRange.get(roomRangeKey) ?? new Set<number>())
              : new Set<number>();
            const baseEnemy = selectEnemyForRoom(
              roomDef.type,
              roomDef.poolId,
              roomDef.bossId,
              floor.floorNumber,
              roomIndex,
              explicitRoomEnemyIds,
              usedEnemyIdsInRange,
            );
            if (!baseEnemy) continue;
            if (roomRangeKey) {
              const nextUsedEnemyIds = selectedEnemyIdsByRoomRange.get(roomRangeKey) ?? new Set<number>();
              nextUsedEnemyIds.add(baseEnemy.id);
              selectedEnemyIdsByRoomRange.set(roomRangeKey, nextUsedEnemyIds);
            }

            const roomMultiplier = getRoomMultiplier(
              dungeon.expLevel,
              floor.floorNumber,
              roomDef.type,
              false,
              effectiveDifficultyOffset,
            );
            const effectiveTier = getEffectiveExpeditionTier(dungeon.id, false);
            const effectiveDungeon = {
              ...dungeon,
              tier: effectiveTier,
              enemyMultipliers: getEffectiveEnemyMultipliers(dungeon, false),
            };
            let enemy = getEncounterEnemyWithScaling(baseEnemy, effectiveDungeon, floor.floorNumber, roomDef.type, {
              isLunaMode: false,
              difficultyOffset: effectiveDifficultyOffset,
            });
            if (isGodsBattle && roomDef.type === 'battle_Boss') {
              enemy = createGodEnemy(
                enemy,
                dungeon.id,
                dungeon.name,
                effectiveDifficultyOffset,
              );
            }
            enemy.abilities.forEach((ability) => {
              revealedAbilityIds.add(ability.id);
            });
            // SpecRef: 3.1 | ITEM | Item Compendium (アイテム図鑑)
            // SpecRef: 3.1 | ITEM | Item Reveal Rule
            getEnemyDropCandidates(enemy).forEach((item) => {
              revealedItemCompendiumItemIds.add(item.id);
            });

            // Pass currentHp to maintain HP persistence during expedition
            const roomStartHp = currentHp;
            const colosseumTerrainEffect = dungeon.id === 99 ? getColosseumEnemySettings().terrainEffect : 'none';
            const terrainEffect = colosseumTerrainEffect !== 'none'
              ? colosseumTerrainEffect
              : floor.terrainEffect;
            if (terrainEffect) {
              revealedTerrainKeys.add(terrainEffect);
            }
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
            if (roomDef.type === 'battle_Boss') roomSuffix = isGodsBattle ? ` ${getGodsBattleSuffix()}` : ' (BOSS)';

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

            const currentEnemyStats = nextEnemyBattleStats[enemy.id] ?? { defeats: 0, encounters: 0 };
            nextEnemyBattleStats[enemy.id] = {
              defeats: currentEnemyStats.defeats + (battleResult.outcome === 'victory' ? 1 : 0),
              encounters: currentEnemyStats.encounters + 1,
            };

            if (battleResult.outcome === 'victory') {
              const isColosseumBattle = dungeon.id === 99;
              if (!isColosseumBattle) {
                const enemyLevelFinal = getEffectiveEnemyLevel(
                  dungeon.expLevel,
                  floor.floorNumber,
                  roomDef.type,
                  false,
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
              const deityDonation =
                state.global.deityDonations[normalizeDeityName(currentParty.deity.name)]
                ?? currentParty.deityGold
                ?? 0;
              // SpecRef: 1.1.7 | g. gods, religions | God of Oblivion
              // SpecRef: 1.1.7 | g. gods, religions | Goddess of Discord
              const deityRewardDrawBonuses = getDeityRewardDrawBonuses(currentParty.deity.name, deityDonation);
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
                  autoSellMultiplier,
                  terrainEffect,
                  deityRewardDrawBonuses.itemChanceTickets,
                  auriferousBonusRolls,
                  difficultyItemChanceTickets,
                  difficultySuperRareChanceTickets
                    + (terrainEffect !== 'terrain.gehenna' ? deityRewardDrawBonuses.superRareChanceTickets : 0),
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
                const auriferousLogEntry = enemyAuriferousLevel > 0
                  ? buildAuriferousLogEntry(
                    enemy.name,
                    battleResult.enemyHitsReceived,
                    auriferousBonusRolls,
                  )
                  : null;
                if (auriferousLogEntry) {
                  entry.details.push(auriferousLogEntry);
                }
              }

              currentHp = battleResult.partyHp;
              entries.push(entry);

              const deityHpEffect = applyPeriodicDeityHpEffect(
                currentParty.deity.name,
                deityDonation,
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

              const firstAidHpEffect = applyFirstAidHpEffect(
                currentParty,
                characterStats,
                floor.floorNumber,
                roomIndex + 1,
                roomDef.type,
                currentHp,
                partyStats.hp
              );
              currentHp = firstAidHpEffect.hp;
              entry.remainingPartyHP = currentHp;
              if (firstAidHpEffect.logs.length > 0) {
                entry.details.push(...firstAidHpEffect.logs);
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
                  action: t('auto.jp.2660ad39fa'),
                  note: t('auto.jp.36cbc2e27f'),
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
                    action: t('auto.jp.96b6003d0c'),
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

      const endedWithDrawRetreat = entries.length > 0 && entries[entries.length - 1].outcome === 'draw';
      const canonicalGateOutcome = finalOutcome === 'Clear'
        ? 'Clear'
        : finalOutcome === 'Escape'
          ? 'Turned_Back'
          : finalOutcome === 'Defeat'
            ? 'Defeat'
            : endedWithDrawRetreat
              ? 'Draw_Retreat'
              : 'Wounded_Retreat';
      const progressWithGodsBattleItems = isDefeat
        ? { ...(currentParty.clearGateProgress ?? {}) }
        : addRecoveredBossRaresToGodsBattleProgress(
            currentParty.clearGateProgress ?? {},
            dungeon.id,
            recoveredItems,
          );
      const clearGateOutcomeState = isGodsBattle
        ? {
            progress: progressWithGodsBattleItems,
            status: { ...(currentParty.clearGateStatus ?? {}) },
            gateKey: null,
          }
        : applyClearGateOutcome(
            {
              clearGateProgress: progressWithGodsBattleItems,
              clearGateStatus: currentParty.clearGateStatus ?? {},
            },
            dungeon.id,
            canonicalGateOutcome,
          );
      const nextClearGateProgress = { ...clearGateOutcomeState.progress };
      if (isGodsBattle && finalOutcome === 'Clear') {
        nextClearGateProgress[getGodsBattleProgressKey(dungeon.id)] = 0;
      }
      const nextDefeatedBossExpeditions = {
        ...(currentParty.defeatedBossExpeditions ?? {}),
      };
      if (!isGodsBattle && finalOutcome === 'Clear') {
        nextDefeatedBossExpeditions[dungeon.id] = true;
      }
      const nextClearGateStatus = clearGateOutcomeState.status;

      // SpecRef: 5.1.3.1 | A gate completed by this turned-back run remains
      // unreachable until the next expedition, but its retained locked-room text
      // must immediately disclose that the route has now been unlocked.
      const clearedGateKey = clearGateOutcomeState.gateKey;
      if (
        clearedGateKey !== null
        && !isClearGateUnlocked(currentParty, clearedGateKey)
        && isClearGateUnlocked(
          {
            clearGateProgress: nextClearGateProgress,
            clearGateStatus: nextClearGateStatus,
          },
          clearedGateKey,
        )
      ) {
        const gatePosition = clearedGateKey % 1000;
        const clearedBossGate = gatePosition === 604;
        const clearedFloor = clearedBossGate ? 6 : Math.floor(gatePosition / 10);
        for (let entryIndex = entries.length - 1; entryIndex >= 0; entryIndex -= 1) {
          const entry = entries[entryIndex];
          if (!entry.gateInfo || entry.floor !== clearedFloor || entry.roomInFloor !== 4) continue;
          entry.gateInfo = clearedBossGate
            ? t('game.log.gateInfo.bossCleared', {
                label: t('home.gate.consecutiveSuccesses'),
                required: getClearGateRequired(clearedGateKey),
              })
            : t('game.log.gateInfo.floorCleared', {
                label: t('home.gate.consecutiveSuccesses'),
                required: getClearGateRequired(clearedGateKey),
                floor: clearedFloor,
              });
          break;
        }
      }

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
      // SpecRef: 8.5 | UI_DIARY | Setting.
      const outcomeTrigger = getDiaryOutcomeTrigger(finalOutcome, endedWithDrawRetreat, diarySettings.defeatNotificationMode);
      if (outcomeTrigger) diaryTriggers.push(outcomeTrigger);
      // SpecRef: 8.5 | UI_DIARY | Setting.
      if (isGodsBattle && diarySettings.notifyGodsBattle) diaryTriggers.push('godsBattle');

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

      // SpecRef: 8.4.5 | Altar (祭壇) | Alter level
      const nextAltarVictoriesByEnemyType = { ...(state.global.altarVictoriesByEnemyType ?? {}) };
      if (finalOutcome === 'Clear') {
        const assignedEnemyTypes = new Set(
          currentParty.characters
            .filter((character) => character.raceId === 'mimorian')
            .map((character) => ENEMIES.find((enemy) => enemy.id === character.mimorianEnemyId)?.enemyType)
            .filter((enemyType): enemyType is string => Boolean(enemyType)),
        );
        assignedEnemyTypes.forEach((enemyType) => {
          nextAltarVictoriesByEnemyType[enemyType] = (nextAltarVictoriesByEnemyType[enemyType] ?? 0) + 1;
        });
      }

      const updatedParties = [...state.parties];
      updatedParties[action.partyIndex] = {
        ...currentParty,
        bags,
        expeditionRewardsPending: true,
        pendingClearGateSnapshot: {
          progress: { ...(currentParty.clearGateProgress ?? {}) },
          status: { ...(currentParty.clearGateStatus ?? {}) },
          defeatedBossExpeditions: { ...(currentParty.defeatedBossExpeditions ?? {}) },
        },
        defeatedBossExpeditions: nextDefeatedBossExpeditions,
        clearGateProgress: nextClearGateProgress,
        clearGateStatus: nextClearGateStatus,
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
        parties: nextParties,
        global: {
          ...state.global,
          inventory: finalInventory,
          gold: finalGold,
          revealedItemCompendiumItemIds: Array.from(revealedItemCompendiumItemIds),
          ...revealGlossaryFromEncounter(state.global, revealedAbilityIds, undefined),
          revealedGlossaryTerrainKeys: Array.from(revealedTerrainKeys),
          enemyBattleStats: nextEnemyBattleStats,
          altarVictoriesByEnemyType: nextAltarVictoriesByEnemyType,
        },
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
      const target = Math.floor(Math.random() * (max - min + 1)) + min;
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
      const key = jewelKeys[Math.floor(Math.random() * jewelKeys.length)];
      const rewardRank = Math.floor(Math.random() * currentParty.sideQuest.rolledTier) + 1;
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
          }
        : null;
      const nextDiaryLogs: DiaryLog[] = [
        ...(sideQuestDiaryLog ? [sideQuestDiaryLog] : []),
        ...(currentParty.diaryLogs ?? []),
      ].slice(0, DIARY_LOG_RETENTION_LIMIT);
      updatedParties[action.partyIndex] = {
        ...currentParty,
        sideQuest: null,
        diaryLogs: nextDiaryLogs,
        hasUnreadDiary: sideQuestDiaryLog ? true : currentParty.hasUnreadDiary,
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
          updatedParties[targetPartyIndex] = syncPartyCurrentHpAfterMaxHpChange(currentParty, {
            ...currentParty,
            characters: newCharacters
          });

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
      });

      return {
        ...state,
        parties: updatedParties,
        global: { ...state.global, gold: newGold, inventory: newInventory, jewels: newJewels },
      };
    }

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
        const newJewels = addJewelToInventory(state.global.jewels, action.jewelKey, action.rank);
        const replacedItem: Item = { ...item, jewel: null };
        const newCharacters = [...currentParty.characters];
        newCharacters[charIndex] = replaceCharacterEquipment(character, action.slotIndex, replacedItem);

        const updatedParties = [...state.parties];
        updatedParties[targetPartyIndex] = syncPartyCurrentHpAfterMaxHpChange(currentParty, {
          ...currentParty,
          characters: newCharacters,
        });

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
      updatedParties[targetPartyIndex] = syncPartyCurrentHpAfterMaxHpChange(currentParty, {
        ...currentParty,
        characters: newCharacters,
      });

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
      if (isChangingMimorianAssignment) {
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
      });

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
      const variant = state.global.inventory[action.variantKey];
      if (!variant || variant.count <= 0) return state;

      const sellPrice = calculateSellPrice(variant.item) * variant.count;
      const pranaGranted = getSuperRareItemPrana(variant.item) * variant.count;

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
        global: {
          ...state.global,
          inventory: newInventory,
          gold: state.global.gold + (pranaGranted > 0 ? 0 : sellPrice),
          prana: state.global.prana + pranaGranted,
        },
      };
    }

    case 'SELL_ALL_OWNED': {
      let totalSellPrice = 0;
      const newInventory = { ...state.global.inventory };

      let totalPrana = 0;

      for (const [variantKey, variant] of Object.entries(state.global.inventory)) {
        if (variant.status !== 'owned' || variant.count <= 0) continue;
        const pranaGranted = getSuperRareItemPrana(variant.item) * variant.count;
        if (pranaGranted > 0) totalPrana += pranaGranted;
        else totalSellPrice += calculateSellPrice(variant.item) * variant.count;
        newInventory[variantKey] = {
          ...variant,
          count: 0,
          status: 'sold',
        };
      }

      if (totalSellPrice <= 0 && totalPrana <= 0) return state;

      return {
        ...state,
        global: {
          ...state.global,
          inventory: newInventory,
          gold: state.global.gold + totalSellPrice,
          prana: state.global.prana + totalPrana,
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
      const autoSellMultiplier = getPartyCunningMultiplier(currentParty);
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
      const variantKey = getVariantKey(debugStoreItem);
      const previousVariant = state.global.inventory[variantKey];
      const nextCount = Math.min(ITEM_MAX_STACK, (previousVariant?.count ?? 0) + 1);
      if ((previousVariant?.count ?? 0) >= ITEM_MAX_STACK) return state;

      return {
        ...state,
        global: {
          ...state.global,
          gold: state.global.gold - DEBUG_STORE_PRICE,
          inventory: {
            ...state.global.inventory,
            [variantKey]: {
              item: debugStoreItem,
              count: nextCount,
              status: 'owned',
              isNew: previousVariant?.isNew ?? true,
            },
          },
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
      const gameMode = action.gameMode ?? 'm.kemo';
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
      const simulationEndAt = action.simulatedEndAt ?? Date.now();
      const simulationStartAt = simulationEndAt - cappedElapsedMs;
      const partyTimestampStepMs = 1_000;

      const operationWindow = getAfkOperationWindow(
        cycleDurationByParty,
        cappedElapsedMs,
        operationStart,
        requestedOperationCount,
      );
      for (const { runIndex, partyIndex, partyCycleDurationMs } of operationWindow) {
          const cycleCompletedAt = simulationStartAt + ((runIndex + 1) * partyCycleDurationMs);
          const simulatedAt = Math.min(
            simulationEndAt,
            cycleCompletedAt + (partyIndex * partyTimestampStepMs)
          );

          const partyForAfkChunk = workingState.parties[partyIndex];
          const shouldTriggerAfkGodsBattle = partyForAfkChunk
            ? (
              // SpecRef: 7.1.2 | AUTO progress logic | AFK (during state.reactivate)
              normalizePartyCondition(partyForAfkChunk.condition) >= 251
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
          workingState = gameReducer(workingState, {
            type: 'FINALIZE_DIARY_LOG',
            partyIndex,
            simulatedAt,
            isAfkSimulation: true,
          });

          const postFinalizeParty = workingState.parties[partyIndex];
          if (postFinalizeParty) {
            const autoAdvanceDecision = shouldAutoAdvanceExpeditionDestination(postFinalizeParty);
            if (autoAdvanceDecision.shouldAdvance && autoAdvanceDecision.nextDungeonId !== null) {
              workingState = gameReducer(workingState, {
                type: 'SELECT_DUNGEON',
                partyIndex,
                dungeonId: autoAdvanceDecision.nextDungeonId,
                selectionMode: 'auto',
              });
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
              workingState = gameReducer(workingState, {
                type: 'ADVANCE_SIDE_QUEST',
                partyIndex,
                amount: approximateProgress,
                simulatedAt,
              });
            }
          }

          workingState = advanceAfkLogSideQuestProgress(workingState, partyIndex, simulatedAt);
          workingState = processAfkCycleProfit(workingState, partyIndex, simulatedAt);

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

          if (postCycleParty && !postCycleParty.sideQuest && !hasActiveNonGodBattleClearGateCondition(postCycleParty)) {
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

      if (action.finalizeChunk !== false || operationEnd >= totalOperationCount) {
        const clampedParties = workingState.parties.map((party) => ({
          ...party,
          // SpecRef: 7.1.2 | AUTO progress logic | AFK (during state.reactivate)
          condition: normalizePartyCondition(party.condition),
        }));

        workingState = {
          ...workingState,
          parties: clampedParties,
        };
      }

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
          prana: 0,
          unlockedMimorianEnemyIds: [],
          inventory: createStarterInventory(),
          userId: generateUserId(),
          jewels: createStarterJewelInventory(),
          jewelAutoEquipPriorityPartyId: 1,
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

// SpecRef: 5.1.1 | Party State Machine | Time-Based Progress Handling (Online + AFK)
export function useGameState() {
  const initialStateRef = useRef<InitialStateResult | null>(null);
  if (!initialStateRef.current) {
    initialStateRef.current = createInitialState();
  }
  const [state, dispatch] = useReducer(gameReducer, initialStateRef.current.state);
  const [notifications, setNotifications] = useState<GameNotification[]>([]);
  const [saveErrorLog, setSaveErrorLog] = useState<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveStateRef = useRef<GameState | null>(null);
  const lastSavedAtRef = useRef(0);
  const loadErrorLog = initialStateRef.current.loadErrorLog;
  const isSaveBlockedByLoadFailure = loadErrorLog !== null;

  const flushPendingSave = useCallback(function flushPendingSaveAttempt() {
    // SpecRef: 5.1.4 | Save and load | Do not overwrite or save the current runtime state.
    if (isSaveBlockedByLoadFailure) return;
    if (!pendingSaveStateRef.current) return;
    const result = saveState(pendingSaveStateRef.current);
    if (!result.ok) {
      setSaveErrorLog(result.errorLog);
      if (!saveTimeoutRef.current) {
        saveTimeoutRef.current = setTimeout(() => {
          saveTimeoutRef.current = null;
          flushPendingSaveAttempt();
        }, STATE_SAVE_THROTTLE_MS);
      }
      return;
    }
    pendingSaveStateRef.current = null;
    lastSavedAtRef.current = Date.now();
    setSaveErrorLog(null);
  }, [isSaveBlockedByLoadFailure]);

  // Save immediately for normal-paced play, while coalescing rapid update bursts (e.g. AFK recovery).
  useEffect(() => {
    if (isSaveBlockedByLoadFailure) {
      pendingSaveStateRef.current = null;
      return;
    }
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
  }, [state, flushPendingSave, isSaveBlockedByLoadFailure]);

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

    updatePartyDeity: useCallback((partyIndex: number, deityName: string) => {
      dispatch({ type: 'UPDATE_PARTY_DEITY', partyIndex, deityName });
    }, []),

    runExpedition: useCallback((partyIndex: number, gameMode: GameMode = 'm.kemo', triggerGodsBattle: boolean = false, simulatedAt?: number) => {
      dispatch({ type: 'RUN_EXPEDITION', partyIndex, gameMode, triggerGodsBattle, simulatedAt });
    }, []),

    resolveInstantExpedition: useCallback((partyIndex: number, gameMode: GameMode = 'm.kemo', triggerGodsBattle: boolean = false, simulatedAt: number = Date.now()) => {
      dispatch({ type: 'RESOLVE_INSTANT_EXPEDITION', partyIndex, gameMode, triggerGodsBattle, simulatedAt });
    }, []),

    consumeInstantExpeditionStock: useCallback((partyIndex: number, now?: number) => {
      dispatch({ type: 'CONSUME_INSTANT_EXPEDITION_STOCK', partyIndex, now });
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

    simulateAfk: useCallback((elapsedMs: number, isAutoRepeatEnabled: boolean, gameMode: GameMode = 'm.kemo', simulatedEndAt?: number, cycleDurationScale?: number, batchSlice?: AfkSimulationBatchSlice) => {
      dispatch({ type: 'SIMULATE_AFK', elapsedMs, isAutoRepeatEnabled, gameMode, simulatedEndAt, cycleDurationScale, ...batchSlice });
    }, []),

    runApiSortieBatch: useCallback((partyIndex: number, count: number, gameMode: GameMode = 'm.kemo', simulatedAt: number = Date.now()) => {
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
        const maximumHp = computePartyStats(beforeParty).partyStats.hp;
        stagedState = gameReducer(stagedState, { type: 'HEAL_PARTY_HP', partyIndex, amount: maximumHp });
        stagedState = gameReducer(stagedState, {
          type: 'RESOLVE_INSTANT_EXPEDITION',
          partyIndex,
          gameMode,
          triggerGodsBattle: false,
          simulatedAt: simulatedAt + index * APPROX_CYCLE_STEP_COUNT * BASE_STEP_DURATION_MS,
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
      stagedState = { ...stagedState, parties: finalParties };
      dispatch({ type: 'COMMIT_API_STATE', state: stagedState });
      return { state: stagedState, runs };
    }, [state]),

    resetGame: useCallback(() => {
      dispatch({ type: 'RESET_GAME' });
    }, []),

    importGameState: useCallback((nextState: GameState): LoadSavedStateResult => {
      try {
        const imported = loadSavedState(encodePersistedState(JSON.stringify(nextState)));
        if (!imported.state) return imported;
        const normalizedState = gameReducer(imported.state, { type: 'IMPORT_GAME_STATE', state: imported.state });
        const persisted = saveState(normalizedState);
        if (!persisted.ok) {
          setSaveErrorLog(persisted.errorLog);
          return { state: null, errorLog: persisted.errorLog };
        }
        dispatch({ type: 'COMMIT_API_STATE', state: normalizedState });
        setSaveErrorLog(null);
        return { state: normalizedState, errorLog: null };
      } catch (error) {
        return { state: null, errorLog: formatLoadErrorLog(error) };
      }
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

    setLanguage: useCallback((language: Language) => {
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
