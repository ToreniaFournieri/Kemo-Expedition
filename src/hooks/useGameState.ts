import { useReducer, useCallback, useEffect, useState } from 'react';
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
  EnemyDef,
  ExpeditionDepthLimit,
} from '../types';
import { computePartyStats } from '../game/partyComputation';
import { executeBattle, calculateEnemyAttackValues } from '../game/battle';
import { applyEnemyEncounterScaling, getRoomMultiplier } from '../game/enemyScaling';
import { replaceCharacterEquipment } from '../game/equipment';
import { DUNGEONS, getDungeonById, getEffectiveEnemyLevel, getEffectiveEnemyMultipliers, getEffectiveExpeditionTier } from '../data/dungeons';
import { CLASS_SHORT_NAMES } from '../data/classes';
import { getEnemiesByPool, getElitesByPool, getBossEnemy, getEnemyDropCandidates } from '../data/enemies';
import { getGodProfileForDungeon } from '../data/dropTables';
import { buildGodRuntimeEnemy } from '../game/godEnemy';
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
import { getDeityKey, getDeityRank, getEffectiveDeityTier, isNoFaithDeity, normalizeDeityName } from '../game/deity';
import { RACES } from '../data/races';
import { CLASSES } from '../data/classes';
import { PREDISPOSITIONS } from '../data/predispositions';
import { LINEAGES } from '../data/lineages';
import {
  ELITE_GATE_REQUIREMENTS,
  ENTRY_GATE_REQUIRED,
  BOSS_GATE_REQUIRED,
  getGodsBattleRequired,
  getEntryGateKey,
  getEliteGateKey,
  getBossGateKey,
  getLootCollectionCount,
  getLootCollectionKey,
  isLootGateUnlocked,
  addRecoveredItemsToLootProgress,
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

const BUILD_NUMBER = 1;
const STORAGE_KEY = createEnvironmentStorageKey('kemo-expedition-save');
const AFK_MAX_SIMULATION_MS = 600 * 60 * 1000;
const DEBUG_CYCLE_DURATION_SCALE = 0.2;
const ITEM_MAX_STACK = 99;
const TIME_BASED_SIDE_QUEST_TYPES = new Set(['q.sleeping', 'q.exercise', 'q.healing', 'q.AFK']);

const PARTY_UNLOCK_BY_GOD_NAME: Record<string, number> = {
  Garv: 2,
  'ガーヴ': 2,
  'Kyōen': 3,
  'キョウエン': 3,
  Dolvar: 4,
  'ドルヴァ': 4,
  Miora: 5,
  'ミオラ': 5,
  Rondel: 6,
  'ロンデル': 6,
};

const UNLOCKABLE_DEITY_BY_GOD_NAME: Record<string, string> = {
  Seiran: 'Goddess of Restoration',
  'セイラン': 'Goddess of Restoration',
  Garv: 'God of Attrition',
  'ガーヴ': 'God of Attrition',
  'Kyōen': 'God of Cunning',
  'キョウエン': 'God of Cunning',
  Dolvar: 'God of Fortification',
  'ドルヴァ': 'God of Fortification',
  Miora: 'Goddess of Fertility',
  'ミオラ': 'Goddess of Fertility',
  Rondel: 'God of Resonance',
  'ロンデル': 'God of Resonance',
  Lira: 'Goddess of Precision',
  'リラ': 'Goddess of Precision',
  Forne: 'God of Fate',
  'フォルネ': 'God of Fate',
  Skuva: 'God of Dusk',
  'スクヴァ': 'God of Dusk',
  Tanue: 'Goddess of Mirage',
  'タヌエ': 'Goddess of Mirage',
  Noctyra: 'God of Oblivion',
  'ノクティラ': 'God of Oblivion',
  Eris: 'Goddess of Discord',
  'エリス': 'Goddess of Discord',
};

function getGodNameFromLogEnemyName(enemyName: string): string {
  const token = enemyName.split(' ')[0] ?? enemyName;
  return token.replace(/\(.*?\)/g, '');
}

const DEFAULT_UNLOCKED_DEITIES: string[] = [];

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

function ensureUnlockedDeity(unlockedDeities: string[], deityName: string): string[] {
  const normalized = normalizeDeityName(deityName);
  if (isNoFaithDeity(normalized) || unlockedDeities.includes(normalized)) return unlockedDeities;
  return [...unlockedDeities, normalized];
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

function getUnlockedStateFromEntries(entries: ExpeditionLogEntry[], initialUnlockedDeities: string[], initialPartySlots: number): { unlockedDeities: string[]; unlockedPartySlots: number } {
  let unlockedDeities = [...initialUnlockedDeities];
  let unlockedPartySlots = initialPartySlots;

  for (const entry of entries) {
    if (entry.outcome !== 'victory') continue;
    if (!entry.enemyName.includes('(神魔戦)')) continue;
    const enemyName = getGodNameFromLogEnemyName(entry.enemyName);
    const unlockDeityName = UNLOCKABLE_DEITY_BY_GOD_NAME[enemyName];
    if (unlockDeityName) {
      unlockedDeities = ensureUnlockedDeity(unlockedDeities, unlockDeityName);
    }
    const unlockPartySlot = PARTY_UNLOCK_BY_GOD_NAME[enemyName];
    if (unlockPartySlot) {
      unlockedPartySlots = Math.max(unlockedPartySlots, unlockPartySlot);
    }
  }

  return { unlockedDeities, unlockedPartySlots };
}


function getUnlockDiaryLog(
  log: ExpeditionLog | null,
  previousUnlockedDeities: string[],
  previousPartySlots: number,
  pendingUnlockState: NonNullable<Party['pendingUnlockState']>,
  createdAt: number,
): DiaryLog | null {
  if (!log) return null;

  const newDeityNames = normalizeUnlockedDeities(pendingUnlockState.deityNames)
    .filter((deityName) => !previousUnlockedDeities.includes(deityName));
  const unlockedPartySlot = pendingUnlockState.partySlotCount > previousPartySlots
    ? pendingUnlockState.partySlotCount
    : null;
  if (newDeityNames.length === 0 && !unlockedPartySlot) return null;

  const godVictoryEntry = [...log.entries]
    .reverse()
    .find((entry) => entry.outcome === 'victory' && entry.enemyName.includes('(神魔戦)'));

  const godName = godVictoryEntry ? getGodNameFromLogEnemyName(godVictoryEntry.enemyName) : null;
  const godProfile = godName ? getGodProfileForDungeon(log.dungeonId, log.dungeonName) : null;

  const unlockDeityLabel = newDeityNames[0] ? `信仰:${normalizeDeityName(newDeityNames[0])} 解禁` : '';
  const unlockPartyLabel = unlockedPartySlot ? `PT${unlockedPartySlot}解放` : '';
  const unlockDetail = [unlockDeityLabel, unlockPartyLabel].filter(Boolean).join('、');

  return {
    id: `${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
    expeditionLog: log,
    triggers: ['unlock'],
    unlockHeadline: godProfile ? `${godProfile.displayName}撃破` : '神魔撃破',
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
  const formatNumber = (value: number) => Math.floor(value).toLocaleString('en-US');
  const valueByType: Partial<Record<string, string>> = {
    'q.squander': `${formatNumber(target)}G`,
    'q.sleeping': `${formatNumber(target)}分`,
    'q.exercise': `${formatNumber(target)}分`,
    'q.embezzlement': `${formatNumber(target)}G`,
    'q.donation': `${formatNumber(target)}G`,
    'q.healing': `${formatNumber(target)}分`,
    'q.AFK': `${formatNumber(target)}分`,
    'q.treasure_super_rare': `${formatNumber(target)}個`,
    'q.treasure_boss_rare': `${formatNumber(target)}個`,
    'q.poor_kid': `${formatNumber(target)}回`,
    'q.consecutive_wins': `${formatNumber(target)}連`,
    'q.losers': `${formatNumber(target)}回`,
    'q.savings': `${formatNumber(target)}G`,
  };

  return `${shortText}(${valueByType[type] ?? formatNumber(target)})`;
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
  return getLootCollectionCount(party, dungeonId, 'bossRare') >= getGodsBattleRequired(getEnvironmentId());
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

function getCharacterCombatBonusLevels(character: Character): { grit: number; pursuit: number; caster: number } {
  const race = RACES.find(r => r.id === character.raceId);
  const mainClass = CLASSES.find(c => c.id === character.mainClassId);
  const subClass = CLASSES.find(c => c.id === character.subClassId);
  const predisposition = PREDISPOSITIONS.find(p => p.id === character.predispositionId);
  const lineage = LINEAGES.find(l => l.id === character.lineageId);

  if (!race || !mainClass || !subClass || !predisposition || !lineage) {
    return { grit: 0, pursuit: 0, caster: 0 };
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

  let grit = 0;
  let caster = 0;
  let pursuit = 0;
  for (const bonuses of bonusSources) {
    for (const bonus of bonuses) {
      if (bonus.type === 'grit') {
        grit = Math.max(grit, bonus.value);
      } else if (bonus.type === 'caster') {
        caster = Math.max(caster, bonus.value);
      } else if (bonus.type === 'pursuit') {
        pursuit += bonus.value;
      }
    }
  }

  return { grit, pursuit, caster };
}

function formatEnemyNameWithClass(name: string, classId: keyof typeof CLASS_SHORT_NAMES): string {
  const shortName = CLASS_SHORT_NAMES[classId];
  return shortName ? `${name}(${shortName})` : name;
}

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
    return { victories: 0, returns: 0, retreats: 0, defeats: 0, donatedGold: 0, savedGold: 0 };
  }
  const raw = value as Record<string, unknown>;
  return {
    victories: typeof raw.victories === 'number' ? raw.victories : 0,
    returns: typeof raw.returns === 'number' ? raw.returns : 0,
    retreats: typeof raw.retreats === 'number' ? raw.retreats : 0,
    defeats: typeof raw.defeats === 'number' ? raw.defeats : 0,
    donatedGold: typeof raw.donatedGold === 'number' ? raw.donatedGold : 0,
    savedGold: typeof raw.savedGold === 'number' ? raw.savedGold : 0,
  };
}

function getExpeditionDepthLimitWithDefault(value: unknown): ExpeditionDepthLimit {
  const validDepthLimits: ExpeditionDepthLimit[] = ['1f-3', '1f-4', '2f-3', '2f-4', '3f-3', '3f-4', '4f-3', '4f-4', '5f-3', '5f-4', 'beforeBoss', 'all'];
  return validDepthLimits.includes(value as ExpeditionDepthLimit) ? (value as ExpeditionDepthLimit) : 'all';
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

function loadSavedState(): GameState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
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

        const initialUnlockedDeities = parsed.global.unlockedDeities.length > 0
          ? parsed.global.unlockedDeities
          : [...DEFAULT_UNLOCKED_DEITIES];
        let unlockedDeities = [...initialUnlockedDeities];
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
            }))
            .slice(0, DIARY_LOG_RETENTION_LIMIT);
          party.hasUnreadDiary = party.diaryLogs.some((log: DiaryLog) => !log.isRead);
          party.diarySettings = getDiarySettingsWithDefaults(party.diarySettings);
          if (typeof party.currentHp !== 'number') {
            const computed = computePartyStats(party).partyStats;
            party.currentHp = computed.hp;
          }
          party.expeditionDepthLimit = getExpeditionDepthLimitWithDefault(party.expeditionDepthLimit);
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
          party.sleepinessOfPartyBag = normalizeSleepinessPartyBag(party.sleepinessOfPartyBag ?? createSleepinessPartyBag());
          party.currentSleepiness = normalizeSleepinessState(party.currentSleepiness);
          if (typeof party.sideQuest === 'undefined') party.sideQuest = null;
          if (party.sideQuest && TIME_BASED_SIDE_QUEST_TYPES.has(party.sideQuest.type) && party.sideQuest.target < 1000) {
            party.sideQuest = {
              ...party.sideQuest,
              target: Math.max(1, Math.floor(party.sideQuest.target * 60)),
              progress: Math.max(0, Math.floor(party.sideQuest.progress * 60)),
            };
          }

          unlockedDeities = ensureUnlockedDeity(unlockedDeities, party.deity.name);

          const allLogEntries: ExpeditionLogEntry[] = [
            ...(party.lastExpeditionLog?.entries ?? []),
            ...party.diaryLogs.flatMap((log: DiaryLog) => log.expeditionLog?.entries ?? []),
            ...(party.pendingDiaryLog?.expeditionLog?.entries ?? []),
          ];
          const unlockedState = getUnlockedStateFromEntries(allLogEntries, unlockedDeities, unlockedPartySlots);
          unlockedDeities = unlockedState.unlockedDeities;
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeGameState(state)));

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
  return {
    ...party,
    currentHp: partyStats.hp,
    pendingProfit: 0,
    expeditionRewardsPending: false,
    pendingUnlockState: null,
    deityGold: 0,
    expeditionStats: getExpeditionStatsWithDefaults(party.expeditionStats),
    sleepinessOfPartyBag: normalizeSleepinessPartyBag(party.sleepinessOfPartyBag ?? createSleepinessPartyBag()),
    currentSleepiness: normalizeSleepinessState(party.currentSleepiness),
    sideQuest: party.sideQuest ?? null,
  };
}

function normalizeSleepinessState(raw: unknown): SleepinessState {
  if (raw === 1 || raw === 2) return raw;
  return 0;
}

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

function createInitialParty() {
  const defaultSetup = [
    { race: 'caninian', main: 'fighter', sub: 'lord', pred: 'sturdy', lineage: 'unmoving', name: 'ケモ', equipmentIds: [1101, 1103] },
    { race: 'vulpinian', main: 'duelist', sub: 'samurai', pred: 'chivalric', lineage: 'war_spirit', name: 'ゴン', equipmentIds: [1104] },
    { race: 'murid', main: 'ninja', sub: 'rogue', pred: 'persistent', lineage: 'breaking_hand', name: 'イタチ', equipmentIds: [1104] },
    { race: 'leporian', main: 'ranger', sub: 'sage', pred: 'dexterous', lineage: 'far_sight', name: 'ロップ', equipmentIds: [1107, 1108, 1109] },
    { race: 'felidian', main: 'sage', sub: 'pilgrim', pred: 'pursuing', lineage: 'hidden_principles', name: 'ラス', equipmentIds: [1110, 1111, 1112] },
    { race: 'cervin', main: 'wizard', sub: 'wizard', pred: 'canny', lineage: 'guiding_thought', name: 'セルヴァ', equipmentIds: [1110] },
  ];

  const characters: Character[] = defaultSetup.map((setup, i) => ({
    id: i + 1,
    name: setup.name,
    raceId: setup.race as RaceId,
    mainClassId: setup.main as ClassId,
    subClassId: setup.sub as ClassId,
    predispositionId: setup.pred as PredispositionId,
    lineageId: setup.lineage as LineageId,
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
    lootGateProgress: {},
    lootGateStatus: {},
    deity: createInitialDeity('None'),
    characters,
    selectedDungeonId: 1,
    expeditionDepthLimit: 'all',
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
    sideQuest: null,
  };

  return initializePartyRuntimeState(party);
}

function createSecondParty() {
  const defaultSetup = [
    { race: 'lupinian', main: 'samurai', sub: 'samurai', pred: 'chivalric', lineage: 'war_spirit', name: 'ルプ' },
    { race: 'lupinian', main: 'fighter', sub: 'lord', pred: 'sturdy', lineage: 'unmoving', name: 'ガル' },
    { race: 'lupinian', main: 'duelist', sub: 'ranger', pred: 'dexterous', lineage: 'far_sight', name: 'ヴォルフ' },
    { race: 'lupinian', main: 'rogue', sub: 'ninja', pred: 'persistent', lineage: 'breaking_hand', name: 'ライカ' },
    { race: 'lupinian', main: 'pilgrim', sub: 'sage', pred: 'pursuing', lineage: 'hidden_principles', name: 'フェン' },
    { race: 'lupinian', main: 'wizard', sub: 'sage', pred: 'canny', lineage: 'guiding_thought', name: 'ノア' },
  ];

  const characters: Character[] = defaultSetup.map((setup, i) => ({
    id: i + 101,
    name: setup.name,
    raceId: setup.race as RaceId,
    mainClassId: setup.main as ClassId,
    subClassId: setup.sub as ClassId,
    predispositionId: setup.pred as PredispositionId,
    lineageId: setup.lineage as LineageId,
    equipment: [],
  }));

  const party: Party = {
    id: 2,
    name: 'PT2',
    level: 1,
    experience: 0,
    lootGateProgress: {},
    lootGateStatus: {},
    deity: createInitialDeity('God of Attrition'),
    characters,
    selectedDungeonId: 1,
    expeditionDepthLimit: 'all',
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
    sideQuest: null,
  };

  return initializePartyRuntimeState(party);
}

function createThirdParty() {
  const defaultSetup = [
    { race: 'vulpinian', main: 'duelist', sub: 'samurai', pred: 'chivalric', lineage: 'war_spirit', name: 'キツネ' },
    { race: 'vulpinian', main: 'rogue', sub: 'ninja', pred: 'persistent', lineage: 'breaking_hand', name: 'ヨウ' },
    { race: 'vulpinian', main: 'ranger', sub: 'sage', pred: 'dexterous', lineage: 'far_sight', name: 'シュン' },
    { race: 'vulpinian', main: 'lord', sub: 'fighter', pred: 'sturdy', lineage: 'unmoving', name: 'コン' },
    { race: 'vulpinian', main: 'pilgrim', sub: 'sage', pred: 'pursuing', lineage: 'hidden_principles', name: 'ミコ' },
    { race: 'vulpinian', main: 'wizard', sub: 'sage', pred: 'canny', lineage: 'guiding_thought', name: 'イナ' },
  ];

  const characters: Character[] = defaultSetup.map((setup, i) => ({
    id: i + 201,
    name: setup.name,
    raceId: setup.race as RaceId,
    mainClassId: setup.main as ClassId,
    subClassId: setup.sub as ClassId,
    predispositionId: setup.pred as PredispositionId,
    lineageId: setup.lineage as LineageId,
    equipment: [],
  }));

  const party: Party = {
    id: 3,
    name: 'PT3',
    level: 1,
    experience: 0,
    lootGateProgress: {},
    lootGateStatus: {},
    deity: createInitialDeity('God of Cunning'),
    characters,
    selectedDungeonId: 1,
    expeditionDepthLimit: 'all',
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
    sideQuest: null,
  };

  return initializePartyRuntimeState(party);
}

function createFourthParty() {
  const defaultSetup = [
    { race: 'ursan', main: 'fighter', sub: 'lord', pred: 'sturdy', lineage: 'unmoving', name: 'グロウ' },
    { race: 'ursan', main: 'samurai', sub: 'fighter', pred: 'chivalric', lineage: 'war_spirit', name: 'バル' },
    { race: 'ursan', main: 'duelist', sub: 'ranger', pred: 'dexterous', lineage: 'far_sight', name: 'ロア' },
    { race: 'ursan', main: 'rogue', sub: 'ninja', pred: 'persistent', lineage: 'breaking_hand', name: 'グリズ' },
    { race: 'ursan', main: 'sage', sub: 'pilgrim', pred: 'pursuing', lineage: 'hidden_principles', name: 'ウル' },
    { race: 'ursan', main: 'wizard', sub: 'sage', pred: 'canny', lineage: 'guiding_thought', name: 'ドルト' },
  ];

  const characters: Character[] = defaultSetup.map((setup, i) => ({
    id: i + 301,
    name: setup.name,
    raceId: setup.race as RaceId,
    mainClassId: setup.main as ClassId,
    subClassId: setup.sub as ClassId,
    predispositionId: setup.pred as PredispositionId,
    lineageId: setup.lineage as LineageId,
    equipment: [],
  }));

  const party: Party = {
    id: 4,
    name: 'PT4',
    level: 1,
    experience: 0,
    lootGateProgress: {},
    lootGateStatus: {},
    deity: createInitialDeity('God of Fortification'),
    characters,
    selectedDungeonId: 1,
    expeditionDepthLimit: 'all',
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
    sideQuest: null,
  };

  return initializePartyRuntimeState(party);
}

function createFifthParty() {
  const defaultSetup = [
    { race: 'felidian', main: 'sage', sub: 'pilgrim', pred: 'pursuing', lineage: 'hidden_principles', name: 'ミャオ' },
    { race: 'felidian', main: 'ranger', sub: 'sage', pred: 'dexterous', lineage: 'far_sight', name: 'ニル' },
    { race: 'felidian', main: 'duelist', sub: 'samurai', pred: 'chivalric', lineage: 'war_spirit', name: 'フェル' },
    { race: 'felidian', main: 'rogue', sub: 'ninja', pred: 'persistent', lineage: 'breaking_hand', name: 'シロ' },
    { race: 'felidian', main: 'lord', sub: 'fighter', pred: 'sturdy', lineage: 'unmoving', name: 'カリン' },
    { race: 'felidian', main: 'wizard', sub: 'sage', pred: 'canny', lineage: 'guiding_thought', name: 'ネイ' },
  ];

  const characters: Character[] = defaultSetup.map((setup, i) => ({
    id: i + 401,
    name: setup.name,
    raceId: setup.race as RaceId,
    mainClassId: setup.main as ClassId,
    subClassId: setup.sub as ClassId,
    predispositionId: setup.pred as PredispositionId,
    lineageId: setup.lineage as LineageId,
    equipment: [],
  }));

  const party: Party = {
    id: 5,
    name: 'PT5',
    level: 1,
    experience: 0,
    lootGateProgress: {},
    lootGateStatus: {},
    deity: createInitialDeity('Goddess of Fertility'),
    characters,
    selectedDungeonId: 1,
    expeditionDepthLimit: 'all',
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
    sideQuest: null,
  };

  return initializePartyRuntimeState(party);
}

function createSixthParty() {
  const defaultSetup = [
    { race: 'mustelid', main: 'wizard', sub: 'sage', pred: 'canny', lineage: 'guiding_thought', name: 'ミン' },
    { race: 'mustelid', main: 'rogue', sub: 'ninja', pred: 'persistent', lineage: 'breaking_hand', name: 'トロ' },
    { race: 'mustelid', main: 'duelist', sub: 'samurai', pred: 'chivalric', lineage: 'war_spirit', name: 'ネル' },
    { race: 'mustelid', main: 'ranger', sub: 'sage', pred: 'dexterous', lineage: 'far_sight', name: 'マル' },
    { race: 'mustelid', main: 'fighter', sub: 'lord', pred: 'sturdy', lineage: 'unmoving', name: 'タル' },
    { race: 'mustelid', main: 'pilgrim', sub: 'sage', pred: 'pursuing', lineage: 'hidden_principles', name: 'リン' },
  ];

  const characters: Character[] = defaultSetup.map((setup, i) => ({
    id: i + 501,
    name: setup.name,
    raceId: setup.race as RaceId,
    mainClassId: setup.main as ClassId,
    subClassId: setup.sub as ClassId,
    predispositionId: setup.pred as PredispositionId,
    lineageId: setup.lineage as LineageId,
    equipment: [],
  }));

  const party: Party = {
    id: 6,
    name: 'PT6',
    level: 1,
    experience: 0,
    lootGateProgress: {},
    lootGateStatus: {},
    deity: createInitialDeity('God of Resonance'),
    characters,
    selectedDungeonId: 1,
    expeditionDepthLimit: 'all',
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

type GameAction =
  | { type: 'SELECT_PARTY'; partyIndex: number }
  | { type: 'SELECT_DUNGEON'; partyIndex: number; dungeonId: number }
  | { type: 'SET_EXPEDITION_DEPTH_LIMIT'; partyIndex: number; depthLimit: ExpeditionDepthLimit }
  | { type: 'UPDATE_PARTY_DEITY'; partyIndex: number; deityName: string }
  | { type: 'RUN_EXPEDITION'; partyIndex: number; simulatedAt?: number; isLunaMode?: boolean; triggerGodsBattle?: boolean }
  | { type: 'FINALIZE_DIARY_LOG'; partyIndex: number }
  | { type: 'HEAL_PARTY_HP'; partyIndex: number; amount: number }
  | { type: 'CLEAR_PENDING_PROFIT'; partyIndex: number }
  | { type: 'PROCESS_PENDING_PROFIT'; partyIndex: number; donation: number; deposit: number }
  | { type: 'SPEND_PENDING_PROFIT'; partyIndex: number; amount: number }
  | { type: 'ROLL_PARTY_SLEEPINESS'; partyIndex: number }
  | { type: 'ROLL_SIDE_QUEST'; partyIndex: number; rolledTier: number }
  | { type: 'CANCEL_SIDE_QUEST'; partyIndex: number }
  | { type: 'ADVANCE_SIDE_QUEST'; partyIndex: number; amount: number; simulatedAt?: number }
  | { type: 'SET_SIDE_QUEST_PROGRESS'; partyIndex: number; progress: number }
  | { type: 'EQUIP_ITEM'; characterId: number; slotIndex: number; itemKey: string | null; partyIndex?: number }
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
  | { type: 'SIMULATE_AFK'; elapsedMs: number; isAutoRepeatEnabled: boolean; isLunaMode?: boolean; simulatedEndAt?: number }
  | { type: 'RESET_GAME' }
  | { type: 'IMPORT_GAME_STATE'; state: GameState }
  | { type: 'RESET_COMMON_BAGS' }
  | { type: 'RESET_UNIQUE_BAGS' }
  | { type: 'RESET_SUPER_RARE_BAG' }
  | { type: 'RESET_SIDE_QUEST_BAG' };

// Select enemy based on room type and pool
function selectEnemyForRoom(
  roomType: RoomType,
  poolId?: number,
  bossId?: number,
  floorNumber?: number,
  roomIndex?: number
): EnemyDef | null {
  if (roomType === 'battle_Boss' && bossId) {
    return getBossEnemy(bossId) ?? null;
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

function createGodEnemy(enemy: EnemyDef, dungeonId: number, dungeonName: string, isLunaMode: boolean): EnemyDef {
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
      defenseAmplifier: enemy.defenseAmplifier * 1.15,
      experience: Math.floor(enemy.experience * 2.2),
    };
  }

  const runtimeGodEnemy = buildGodRuntimeEnemy(godProfile, isLunaMode);

  if (!runtimeGodEnemy) {
    return {
      ...enemy,
      name: godName,
      enemyClass: godProfile.enemyClass,
      abilities: godProfile.abilities,
      dropItemId: getGodMythicDropId(godProfile.dropItemTier, godProfile.dropItemCategories, enemy.id),
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
  isLunaMode: boolean,
  autoSellMultiplier: number,
  hasExtraRewardRollBlessing: boolean = false
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
} {
  let bags = currentBags;
  let inventory = currentInventory;
  let gold = currentGold;
  let autoSellProfit = 0;
  const rewards: Item[] = [];
  const recoveredItems: Item[] = [];
  const rewardNames: string[] = [];
  const rewardLogEntries: { itemName: string; autoSellProfit?: number }[] = [];
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

    const bonusRollCount =
      (hasUnlock ? 1 : 0)
      + (isLunaMode ? 1 : 0)
      + (hasExtraRewardRollBlessing ? 1 : 0);
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

    let srVal = 0;
    if (enhVal >= 1) {
      bags = refillBagIfEmpty(bags, 'superRareBag');
      const { ticket: drawnSrVal, newBag: newSRBag } = drawFromBag(bags.superRareBag);
      bags = { ...bags, superRareBag: newSRBag };
      srVal = drawnSrVal;
    }

    const newItem: Item = { ...baseItem, enhancement: enhVal, superRare: srVal };
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

    if (result.wasAutoSold) autoSellItemCount += 1;

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
  if (deityKey !== 'God of Cunning') return 1;

  // God of Cunning embezzles exactly 50% of the remaining cycle profit.
  return 0.5;
}

function rollPercentInclusive(min: number, max: number): number {
  return min + Math.random() * (max - min + Number.EPSILON);
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

function buildRewardLogEntries(
  rewards: { itemName: string; autoSellProfit?: number }[],
  unlockActorName?: string
): BattleLogEntry[] {
  const groupedRewards = new Map<string, { itemName: string; autoSellProfit?: number; count: number }>();
  for (const reward of rewards) {
    const key = `${reward.itemName}|${reward.autoSellProfit ?? 0}`;
    const existing = groupedRewards.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }
    groupedRewards.set(key, { ...reward, count: 1 });
  }

  return Array.from(groupedRewards.values()).map(reward => ({
    phase: 'long',
    actor: 'deity',
    action: unlockActorName
      ? `${unlockActorName}の解錠 ${reward.itemName}${reward.count > 1 ? ` x${reward.count}` : ''} を獲得した！`
      : `${reward.itemName}${reward.count > 1 ? ` x${reward.count}` : ''} を獲得した！`,
    note: reward.autoSellProfit ? `(自動売却対象: ${reward.autoSellProfit * reward.count}G)` : undefined,
  }));
}

function applyPeriodicDeityHpEffect(
  deityName: string,
  totalDonatedGold: number,
  roomNumber: number,
  totalRooms: number,
  currentHp: number,
  maxHp: number
): { hp: number; healAmount?: number; attritionAmount?: number } {
  if (roomNumber % 4 !== 0 || roomNumber >= totalRooms) {
    return { hp: currentHp };
  }

  const deityKey = getDeityKey(deityName);
  const effectiveTier = getEffectiveDeityTier(totalDonatedGold);
  if (deityKey === 'Goddess of Restoration') {
    const missingHp = maxHp - currentHp;
    const healAmount = Math.floor(missingHp * (0.2 + 0.001 * effectiveTier));
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
      phase: 'long',
      actor: 'deity',
      action: '再生の女神の効果！',
      note: `(HP回復+${healAmount})`,
    };
  }

  if (deityKey === 'God of Attrition' && attritionAmount && attritionAmount > 0) {
    return {
      phase: 'long',
      actor: 'deity',
      action: '消耗の神の効果！',
      note: `(HP消耗-${attritionAmount})`,
    };
  }

  return null;
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

    case 'UPDATE_PARTY_DEITY': {
      const normalizedDeityName = normalizeDeityName(action.deityName);
      const isUnlockedDeity = isNoFaithDeity(normalizedDeityName)
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
      const currentParty = state.parties[action.partyIndex];
      const dungeon = getDungeonById(currentParty.selectedDungeonId);
      if (!dungeon) return state;
      const isGodsBattle = action.triggerGodsBattle === true && isGodsBattleAvailable(currentParty, dungeon.id);
      const { partyStats } = computePartyStats(currentParty);
      const persistedCurrentHp = currentParty.currentHp ?? partyStats.hp;
      if (persistedCurrentHp <= 0 || partyStats.hp <= 0) {
        return state;
      }
      let currentHp = Math.max(0, Math.min(persistedCurrentHp, partyStats.hp));

      const entries: ExpeditionLogEntry[] = [];
      const rewards: Item[] = [];
      const recoveredItems: Item[] = [];
      let totalExp = 0;
      let bags = state.bags;
      let finalOutcome: 'victory' | 'return' | 'defeat' | 'retreat' = 'victory';
      let currentInventory = state.global.inventory;
      let currentGold = state.global.gold;
      let totalAutoSellProfit = 0;
      let totalAutoSellItemCount = 0;
      let roomCounter = 0;
      let expeditionEnded = false;

      // Use new floor structure if available
      if (dungeon.floors && dungeon.floors.length > 0) {
        const totalRooms = dungeon.floors.reduce((sum, floor) => sum + floor.rooms.length, 0);
        // New v0.2.0 floor-based expedition
        for (const floor of dungeon.floors) {
          if (expeditionEnded) break;

          for (let roomIndex = 0; roomIndex < floor.rooms.length; roomIndex++) {
            if (expeditionEnded) break;

            const roomDef = floor.rooms[roomIndex];
            roomCounter++;

            const tier = dungeon.enemyPoolIds[0]; // dungeon tier
            // Loot-Gate check before entering (floor 1, room 1)
            if (floor.floorNumber === 1 && roomIndex === 0 && tier > 1) {
              const prevTier = tier - 1;
              const prevDungeonName = getDungeonById(prevTier)?.name ?? '前回の探検地';
              const gateRequired = ENTRY_GATE_REQUIRED;
              const entryGateKey = getEntryGateKey(dungeon.id);
              const collected = getLootCollectionCount(currentParty, prevTier, 'bossRare');
              const currentCollected = collected;
              const gateUnlocked = isLootGateUnlocked(currentParty, entryGateKey) || currentCollected >= gateRequired;
              if (!gateUnlocked) {
                const gateEntry: ExpeditionLogEntry = {
                  room: roomCounter,
                  floor: floor.floorNumber,
                  roomInFloor: roomIndex + 1,
                  roomType: roomDef.type,
                  floorMultiplier: getRoomMultiplier(floor.floorNumber, roomDef.type, floor.multiplier),
                  enemyName: '[扉が封印されている]',
                  enemyHP: 0,
                  enemyAttackValues: '',
                  outcome: 'draw', // Not a battle - displayed as 未到達
                  damageDealt: 0,
                  damageTaken: 0,
                  remainingPartyHP: currentHp,
                  maxPartyHP: partyStats.hp,
                  details: [],
                  gateInfo: `${prevDungeonName}のボスレアアイテム(持ち帰り) ${currentCollected}/${gateRequired}（判定時）`,
                };
                entries.push(gateEntry);
                finalOutcome = 'return';
                expeditionEnded = true;
                break;
              }
            }

            // Loot-Gate check before Elite/Boss rooms (room 4 of each floor)
            if (roomDef.type === 'battle_Elite' || roomDef.type === 'battle_Boss') {
              let gateRequired: number;
              let gateRarity: 'uncommon' | 'eliteRare';
              if (roomDef.type === 'battle_Boss') {
                gateRequired = BOSS_GATE_REQUIRED;
                gateRarity = 'eliteRare';
              } else {
                gateRequired = ELITE_GATE_REQUIREMENTS[floor.floorNumber] ?? 3;
                gateRarity = 'uncommon';
              }
              const gateKey = roomDef.type === 'battle_Boss'
                ? getBossGateKey(dungeon.id)
                : getEliteGateKey(dungeon.id, floor.floorNumber);
              const collected = getLootCollectionCount(currentParty, tier, gateRarity);
              const currentCollected = collected;
              const gateUnlocked = isLootGateUnlocked(currentParty, gateKey) || currentCollected >= gateRequired;
              if (!gateUnlocked) {
                // Gate locked - expedition ends
                const rarityLabel = gateRarity === 'eliteRare' ? 'エリートレアアイテム' : 'アンコモンアイテム';
                const gateEntry: ExpeditionLogEntry = {
                  room: roomCounter,
                  floor: floor.floorNumber,
                  roomInFloor: roomIndex + 1,
                  roomType: roomDef.type,
                  floorMultiplier: getRoomMultiplier(floor.floorNumber, roomDef.type, floor.multiplier),
                  enemyName: '[扉が封印されている]',
                  enemyHP: 0,
                  enemyAttackValues: '',
                  outcome: 'draw', // Not a battle - displayed as 未到達
                  damageDealt: 0,
                  damageTaken: 0,
                  remainingPartyHP: currentHp,
                  maxPartyHP: partyStats.hp,
                  details: [],
                  gateInfo: `${rarityLabel}(持ち帰り) ${currentCollected}/${gateRequired}（判定時）`,
                };
                entries.push(gateEntry);
                finalOutcome = 'return';
                expeditionEnded = true;
                break;
              }
            }

            // Select enemy for this room
            const baseEnemy = selectEnemyForRoom(roomDef.type, roomDef.poolId, roomDef.bossId, floor.floorNumber, roomIndex);
            if (!baseEnemy) continue;

            const roomMultiplier = getRoomMultiplier(floor.floorNumber, roomDef.type, floor.multiplier);
            const effectiveTier = getEffectiveExpeditionTier(dungeon.id, !!action.isLunaMode);
            const effectiveDungeon = {
              ...dungeon,
              tier: effectiveTier,
              enemyMultipliers: getEffectiveEnemyMultipliers(dungeon, !!action.isLunaMode),
            };
            let enemy = applyEnemyEncounterScaling(baseEnemy, effectiveDungeon, floor.floorNumber, roomDef.type);
            if (isGodsBattle && roomDef.type === 'battle_Boss') {
              enemy = createGodEnemy(enemy, dungeon.id, dungeon.name, !!action.isLunaMode);
            }

            // Pass currentHp to maintain HP persistence during expedition
            const battleResult = executeBattle(currentParty, enemy, bags, currentHp);

            // Update threat bags from battle result
            bags = {
              ...bags,
              physicalThreatBag: battleResult.updatedBags.physicalThreatBag,
              magicalThreatBag: battleResult.updatedBags.magicalThreatBag,
            };

            const damageDealt = enemy.hp - Math.max(0, battleResult.enemyHp);
            const damageTaken = Math.max(0, currentHp - battleResult.partyHp);

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
              floorMultiplier: roomMultiplier,
              enemyName: formatEnemyNameWithClass(enemy.name, enemy.enemyClass) + roomSuffix,
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
              const enemyLevelFinal = getEffectiveEnemyLevel(dungeon.expLevel, floor.floorNumber, !!action.isLunaMode);
              totalExp += calculateExperience(
                enemy.experience,
                roomDef.type,
                effectiveDungeon.tier,
                currentParty.level,
                enemyLevelFinal
              );

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
              const rewardResult = resolveEnemyRewards(
                enemy,
                bags,
                currentInventory,
                currentGold,
                hasUnlock,
                !!action.isLunaMode,
                autoSellMultiplier,
                hasExtraRewardRollBlessing
              );
              bags = rewardResult.bags;
              currentInventory = rewardResult.inventory;
              currentGold = rewardResult.gold;
              totalAutoSellProfit += rewardResult.autoSellProfit;
              totalAutoSellItemCount += rewardResult.autoSellItemCount;
              rewards.push(...rewardResult.rewards);
              recoveredItems.push(...rewardResult.recoveredItems);
              if (rewardResult.rewardNames.length > 0) {
                entry.reward = rewardResult.rewardNames.join(' / ');
                entry.rewardItems = [...rewardResult.rewards];
                entry.rewardRarity = rewardResult.highestRewardRarity;
                entry.rewardIsSuperRare = rewardResult.hasSuperRareReward;
              }

              currentHp = battleResult.partyHp;
              entries.push(entry);

              const deityHpEffect = applyPeriodicDeityHpEffect(currentParty.deity.name, state.global.deityDonations[normalizeDeityName(currentParty.deity.name)] ?? currentParty.deityGold ?? 0, roomCounter, totalRooms, currentHp, partyStats.hp);
              currentHp = deityHpEffect.hp;
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
              entry.details.push(...buildRewardLogEntries(rewardResult.rewardLogEntries, unlockActorName));

              const isFinalBossRoom =
                roomDef.type === 'battle_Boss'
                && floor.floorNumber === dungeon.floors.length
                && roomIndex === floor.rooms.length - 1;

              if (!isFinalBossRoom && isRetreatHpThresholdReached(currentHp, partyStats.hp)) {
                finalOutcome = 'retreat';
                expeditionEnded = true;
                entry.details.push({
                  phase: 'close',
                  actor: 'deity',
                  action: '撤退',
                  note: 'HPが30%以下のため、戦利品を持ち帰ります。',
                });
              } else {
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
                  finalOutcome = 'return';
                  expeditionEnded = true;
                  entry.details.push({
                    phase: 'close',
                    actor: 'deity',
                    action: '探索深度に到達した為帰還します',
                  });
                }
              }
            } else if (battleResult.outcome === 'defeat') {
              entries.push(entry);
              finalOutcome = 'defeat';
              expeditionEnded = true;
            } else {
              // Draw
              entries.push(entry);
              finalOutcome = 'retreat';
              expeditionEnded = true;
            }
          }
        }
      }

      // On defeat: revert inventory and gold (no item rewards), but keep experience
      const isDefeat = finalOutcome === 'defeat';
      const finalInventory = isDefeat ? state.global.inventory : currentInventory;
      const finalRewards = isDefeat ? [] : rewards;
      const finalAutoSellProfit = isDefeat ? 0 : totalAutoSellProfit;
      const finalAutoSellItemCount = isDefeat ? 0 : totalAutoSellItemCount;
      const finalGold = isDefeat ? state.global.gold : (currentGold - finalAutoSellProfit);

      const nextLootGateProgressBase = isDefeat
        ? currentParty.lootGateProgress
        : addRecoveredItemsToLootProgress(currentParty.lootGateProgress ?? {}, recoveredItems);
      const nextLootGateProgress = { ...(nextLootGateProgressBase ?? {}) };
      if (isGodsBattle && finalOutcome === 'victory') {
        nextLootGateProgress[getLootCollectionKey(dungeon.id, 'bossRare')] = 0;
      }
      const nextLootGateStatus = unlockAvailableLootGates(
        currentParty.lootGateStatus ?? {},
        nextLootGateProgress,
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
        totalExperience: totalExpGain,
        totalRooms: dungeon.floors.reduce((sum, f) => sum + f.rooms.length, 0),
        completedRooms: entries.length,
        finalOutcome,
        entries,
        rewards: finalRewards,
        autoSellProfit: finalAutoSellProfit,
        autoSellCount: finalAutoSellItemCount,
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
      if (finalOutcome === 'defeat' && diarySettings.notifyDefeat) diaryTriggers.push('defeat');

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
      updatedParties[action.partyIndex] = {
        ...currentParty,
        expeditionRewardsPending: true,
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
          victories: currentParty.expeditionStats.victories + (finalOutcome === 'victory' ? 1 : 0),
          returns: currentParty.expeditionStats.returns + (finalOutcome === 'return' ? 1 : 0),
          retreats: currentParty.expeditionStats.retreats + (finalOutcome === 'retreat' ? 1 : 0),
          defeats: currentParty.expeditionStats.defeats + (finalOutcome === 'defeat' ? 1 : 0),
        },
      };

      const currentUnlockedDeities = normalizeUnlockedDeities(state.global.unlockedDeities);
      const currentUnlockedPartySlots = state.parties.length;
      const unlockedState = getUnlockedStateFromEntries(entries, currentUnlockedDeities, currentUnlockedPartySlots);
      const pendingUnlockState = (
        unlockedState.unlockedDeities.length > currentUnlockedDeities.length
        || unlockedState.unlockedPartySlots > currentUnlockedPartySlots
      )
        ? {
            deityNames: unlockedState.unlockedDeities,
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
            normalizeUnlockedDeities(state.global.unlockedDeities),
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
      if (party.expeditionRewardsPending && party.lastExpeditionLog) {
        nextExperience += party.lastExpeditionLog.totalExperience;
        if (nextLevel < MAX_LEVEL && nextExperience >= getXpToNextLevel(nextLevel)) {
          nextLevel += 1;
          nextExperience = 0;
        }
      }

      const updatedParties = [...state.parties];
      updatedParties[action.partyIndex] = {
        ...party,
        level: nextLevel,
        experience: nextExperience,
        expeditionRewardsPending: false,
        pendingDiaryLog: null,
        diaryLogs: nextDiaryLogs,
        hasUnreadDiary: nextDiaryLogs.some((diaryLog) => !diaryLog.isRead),
      };

      let nextGlobal = state.global;
      if (pendingUnlockState) {
        const nextUnlockedDeities = normalizeUnlockedDeities(pendingUnlockState.deityNames);
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
          unlockedDeities: nextUnlockedDeities,
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
      let bags = refillBagIfEmpty(state.bags, 'sideQuestBag');
      const { ticket, newBag } = drawFromBag(bags.sideQuestBag);
      bags = { ...bags, sideQuestBag: newBag };
      if (ticket === 0) return { ...state, bags };

      const questById: Record<number, { type: string; shortText: string; min: number; max: number }> = {
        1: { type: 'q.squander', shortText: '散財', min: 500, max: 2000 },
        2: { type: 'q.sleeping', shortText: '安眠', min: 20, max: 60 },
        3: { type: 'q.exercise', shortText: '運動', min: 45, max: 150 },
        4: { type: 'q.embezzlement', shortText: '横領', min: 100, max: 400 },
        5: { type: 'q.donation', shortText: '寄付', min: 400, max: 2000 },
        6: { type: 'q.healing', shortText: '治療', min: 60, max: 120 },
        7: { type: 'q.AFK', shortText: '放置', min: 180, max: 360 },
        8: { type: 'q.treasure_super_rare', shortText: '超レア獲得', min: 1, max: 2 },
        9: { type: 'q.treasure_boss_rare', shortText: 'ボスレア獲得', min: 5, max: 15 },
        10: { type: 'q.poor_kid', shortText: '空振り', min: 100, max: 300 },
        11: { type: 'q.consecutive_wins', shortText: '連続踏破', min: 15, max: 60 },
        12: { type: 'q.losers', shortText: '敗北', min: 3, max: 6 },
        13: { type: 'q.savings', shortText: '貯金', min: 800, max: 4000 },
      };
      const def = questById[ticket];
      if (!def) return { ...state, bags };
      const target = Math.floor(Math.random() * (def.max - def.min + 1)) + def.min;
      const internalTarget = TIME_BASED_SIDE_QUEST_TYPES.has(def.type) ? target * 60 : target;
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
          totalExperience: 0,
          totalRooms: 0,
          completedRooms: 0,
          finalOutcome: 'return',
          entries: [],
          rewards: [],
          autoSellProfit: 0,
          autoSellCount: 0,
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
          const equippedCharacter = replaceCharacterEquipment(character, action.slotIndex, { ...variant.item, jewel: null });
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

      const unequippedCharacter = replaceCharacterEquipment(character, action.slotIndex, null);
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
      const lostMeleeAptitude = oldCombatBonuses.grit > 0 && nextCombatBonuses.grit <= 0;
      const lostRangedAptitude = oldCombatBonuses.pursuit > 0 && nextCombatBonuses.pursuit <= 0;
      const lostMagicAptitude = oldCombatBonuses.caster > 0 && nextCombatBonuses.caster <= 0;

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
      if (!action.isAutoRepeatEnabled) return state;

      const cappedElapsedMs = Math.max(0, Math.min(action.elapsedMs, AFK_MAX_SIMULATION_MS));
      if (cappedElapsedMs < 1000) return state;

      const approxCycleDurationMs = Math.floor(460_000 * getCycleDurationScale());
      const simulatedCycleSeconds = Math.max(1, Math.floor(approxCycleDurationMs / 1000));
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

          workingState = gameReducer(workingState, { type: 'RUN_EXPEDITION', partyIndex, simulatedAt, isLunaMode: action.isLunaMode });
          workingState = gameReducer(workingState, { type: 'FINALIZE_DIARY_LOG', partyIndex });

          const currentParty = workingState.parties[partyIndex];
          if (!currentParty) continue;

          if (currentParty.sideQuest && TIME_BASED_SIDE_QUEST_TYPES.has(currentParty.sideQuest.type)) {
            workingState = gameReducer(workingState, {
              type: 'ADVANCE_SIDE_QUEST',
              partyIndex,
              amount: simulatedCycleSeconds,
              simulatedAt,
            });
          }

          const { partyStats: restStartStats } = computePartyStats(currentParty);
          const hpRatioAtRestStart = restStartStats.hp > 0 ? ((currentParty.currentHp ?? 0) / restStartStats.hp) : 0;
          const shouldSkipFeast = (currentParty.pendingProfit ?? 0) <= 0 || hpRatioAtRestStart < 0.3;
          const pendingProfit = currentParty.pendingProfit ?? 0;
          const baseSpend = shouldSkipFeast ? 0 : Math.floor((pendingProfit * rollPercentInclusive(33, 67)) / 100);
          const squanderLevel = getPartyAbilityLevel(currentParty, 'squander');
          const squanderMultiplier = squanderLevel >= 2 ? 1.5 : squanderLevel >= 1 ? 1.3 : 1;
          const spend = shouldSkipFeast ? 0 : Math.min(pendingProfit, Math.floor(baseSpend * squanderMultiplier));
          if (spend > 0) {
            workingState = gameReducer(workingState, { type: 'SPEND_PENDING_PROFIT', partyIndex, amount: spend });
            if (currentParty.sideQuest?.type === 'q.squander') {
              workingState = gameReducer(workingState, { type: 'ADVANCE_SIDE_QUEST', partyIndex, amount: spend, simulatedAt });
            }
          }

          const afterSpend = workingState.parties[partyIndex];
          if (!afterSpend) continue;
          const isNoFaith = isNoFaithDeity(afterSpend.deity.name);
          const donationRate = rollPercentInclusive(10, 33);
          const baseDonation = Math.floor(((afterSpend.pendingProfit ?? 0) * donationRate) / 100);
          const titheLevel = getPartyAbilityLevel(afterSpend, 'tithe');
          const titheBonusRate = isNoFaith ? 0 : (titheLevel >= 2 ? 0.15 : titheLevel >= 1 ? 0.1 : 0);
          const titheBonus = Math.floor((afterSpend.pendingProfit ?? 0) * titheBonusRate);
          const donation = isNoFaith ? 0 : Math.min(afterSpend.pendingProfit ?? 0, baseDonation + titheBonus);
          const rawDeposit = Math.max(0, (afterSpend.pendingProfit ?? 0) - donation);
          const deposit = Math.floor(rawDeposit * getPrayerDepositMultiplier(afterSpend));
          const embezzled = Math.max(0, rawDeposit - deposit);
          workingState = gameReducer(workingState, { type: 'PROCESS_PENDING_PROFIT', partyIndex, donation, deposit });

          if (afterSpend.sideQuest?.type === 'q.donation' && donation > 0) {
            workingState = gameReducer(workingState, { type: 'ADVANCE_SIDE_QUEST', partyIndex, amount: donation, simulatedAt });
          }
          if (afterSpend.sideQuest?.type === 'q.savings' && deposit > 0) {
            workingState = gameReducer(workingState, { type: 'ADVANCE_SIDE_QUEST', partyIndex, amount: deposit, simulatedAt });
          }
          if (afterSpend.sideQuest?.type === 'q.embezzlement' && embezzled > 0) {
            workingState = gameReducer(workingState, { type: 'ADVANCE_SIDE_QUEST', partyIndex, amount: embezzled, simulatedAt });
          }

          const partyAfterProfit = workingState.parties[partyIndex];
          if (!partyAfterProfit) continue;
          const shouldSkipSleepForLowHp = hpRatioAtRestStart < 0.1;
          let partyAfterSleepinessRoll = partyAfterProfit;

          if (!shouldSkipSleepForLowHp) {
            const sleepinessResult = drawPartySleepiness(partyAfterProfit);
            partyAfterSleepinessRoll = sleepinessResult.party;

            if (partyAfterSleepinessRoll !== partyAfterProfit) {
              const rolledParties = [...workingState.parties];
              rolledParties[partyIndex] = partyAfterSleepinessRoll;
              workingState = {
                ...workingState,
                parties: rolledParties,
              };
            }
          }

          const { partyStats } = computePartyStats(partyAfterProfit);
          const missingHp = Math.max(0, partyStats.hp - (partyAfterProfit.currentHp ?? partyStats.hp));

          if (missingHp > 0) {
            workingState = gameReducer(workingState, { type: 'HEAL_PARTY_HP', partyIndex, amount: missingHp });
          }

          const afkProcessedParty = workingState.parties[partyIndex];
          const afkLog = afkProcessedParty?.lastExpeditionLog;
          if (afkProcessedParty?.sideQuest && afkLog) {
            if (afkProcessedParty.sideQuest.type === 'q.treasure_super_rare') {
              const gained = afkLog.rewards.filter((item) => item.superRare > 0).length;
              if (gained > 0) {
                workingState = gameReducer(workingState, { type: 'ADVANCE_SIDE_QUEST', partyIndex, amount: gained, simulatedAt });
              }
            }
            if (afkProcessedParty.sideQuest.type === 'q.treasure_boss_rare') {
              const gained = afkLog.rewards.filter((item) => getItemRarityById(item.id) === 'bossRare').length;
              if (gained > 0) {
                workingState = gameReducer(workingState, { type: 'ADVANCE_SIDE_QUEST', partyIndex, amount: gained, simulatedAt });
              }
            }
            if (afkProcessedParty.sideQuest.type === 'q.poor_kid' && (afkLog.rewards.length ?? 0) === 0) {
              workingState = gameReducer(workingState, { type: 'ADVANCE_SIDE_QUEST', partyIndex, amount: 1, simulatedAt });
            }
            if (afkProcessedParty.sideQuest.type === 'q.consecutive_wins') {
              if (afkLog.finalOutcome === 'victory') {
                workingState = gameReducer(workingState, { type: 'ADVANCE_SIDE_QUEST', partyIndex, amount: 1, simulatedAt });
              } else {
                workingState = gameReducer(workingState, { type: 'SET_SIDE_QUEST_PROGRESS', partyIndex, progress: 0 });
              }
            }
            if (afkProcessedParty.sideQuest.type === 'q.losers' && afkLog.finalOutcome === 'defeat') {
              workingState = gameReducer(workingState, { type: 'ADVANCE_SIDE_QUEST', partyIndex, amount: 1, simulatedAt });
            }
          }

          const postCycleParty = workingState.parties[partyIndex];
          if (postCycleParty && !postCycleParty.sideQuest) {
            workingState = gameReducer(workingState, {
              type: 'ROLL_SIDE_QUEST',
              partyIndex,
              rolledTier: postCycleParty.selectedDungeonId,
            });
          }
        }
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
      const normalizedUnlockedDeities = normalizeUnlockedDeities(hydrated.global.unlockedDeities);
      const unlockedBase = normalizedUnlockedDeities.length > 0 ? normalizedUnlockedDeities : [...DEFAULT_UNLOCKED_DEITIES];
      let unlockedDeities = [...unlockedBase];
      let unlockedPartySlots = Math.max(1, Math.min(6, normalizedParties.length || 1));
      for (const party of normalizedParties) {
        unlockedDeities = ensureUnlockedDeity(unlockedDeities, party.deity.name);
        const allEntries = [
          ...(party.lastExpeditionLog?.entries ?? []),
          ...party.diaryLogs.flatMap((log) => log.expeditionLog?.entries ?? []),
          ...(party.pendingDiaryLog?.expeditionLog?.entries ?? []),
        ];
        const unlockedState = getUnlockedStateFromEntries(allEntries, unlockedDeities, unlockedPartySlots);
        unlockedDeities = unlockedState.unlockedDeities;
        unlockedPartySlots = Math.max(unlockedPartySlots, unlockedState.unlockedPartySlots);
      }
      while (normalizedParties.length < unlockedPartySlots) {
        const nextDefaultParty = createUnlockedPartyWithAvailableDeity(defaultParties[normalizedParties.length], normalizedParties);
        normalizedParties.push(nextDefaultParty);
      }
      const trimmedParties = normalizedParties.slice(0, unlockedPartySlots);
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

// SpecRef: 4.1 | Time-Based Progress Handling (Online + AFK) | useGameState
export function useGameState() {
  const [state, dispatch] = useReducer(gameReducer, null, createInitialState);
  const [notifications, setNotifications] = useState<GameNotification[]>([]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    saveState(state);
  }, [state]);

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

    updatePartyDeity: useCallback((partyIndex: number, deityName: string) => {
      dispatch({ type: 'UPDATE_PARTY_DEITY', partyIndex, deityName });
    }, []),

    runExpedition: useCallback((partyIndex: number, isLunaMode: boolean = false, triggerGodsBattle: boolean = false) => {
      dispatch({ type: 'RUN_EXPEDITION', partyIndex, isLunaMode, triggerGodsBattle });
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

    rollSideQuest: useCallback((partyIndex: number, rolledTier: number) => {
      dispatch({ type: 'ROLL_SIDE_QUEST', partyIndex, rolledTier });
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

    simulateAfk: useCallback((elapsedMs: number, isAutoRepeatEnabled: boolean, isLunaMode: boolean = false, simulatedEndAt?: number) => {
      dispatch({ type: 'SIMULATE_AFK', elapsedMs, isAutoRepeatEnabled, isLunaMode, simulatedEndAt });
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

    addNotification,
    addStatNotifications,
    dismissNotification,
    dismissAllNotifications,
  };

  return { state, actions, bags: state.bags, notifications };
}
