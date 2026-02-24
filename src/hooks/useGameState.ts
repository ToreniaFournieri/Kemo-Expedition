import { useReducer, useCallback, useEffect, useState } from 'react';
import {
  GameState,
  Item,
  Character,
  Party,
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
import { DUNGEONS, getDungeonById, getEffectiveExpeditionTier, getExpeditionEnemyMultipliersForTier } from '../data/dungeons';
import { CLASS_SHORT_NAMES } from '../data/classes';
import { getEnemiesByPool, getElitesByPool, getBossEnemy, getEnemyDropCandidates } from '../data/enemies';
import {
  drawFromBag,
  refillBagIfEmpty,
  createCommonRewardBag,
  createCommonEnhancementBag,
  createUncommonRewardBag,
  createRareRewardBag,
  createMythicRewardBag,
  createEnhancementBag,
  createSuperRareBag,
  createPhysicalThreatBag,
  createMagicalThreatBag,
  normalizeBagForType,
  BagType,
  normalizeGameBags,
} from '../game/bags';
import { getItemById, ENHANCEMENT_TITLES, SUPER_RARE_TITLES } from '../data/items';
import { hydrateGameState, serializeGameState } from '../game/saveCodec';
import { getItemDisplayName } from '../game/gameState';
import { getDeityKey, getEffectiveDeityTier, normalizeDeityName } from '../game/deity';
import { RACES } from '../data/races';
import { CLASSES } from '../data/classes';
import { PREDISPOSITIONS } from '../data/predispositions';
import { LINEAGES } from '../data/lineages';
import {
  ELITE_GATE_REQUIREMENTS,
  ENTRY_GATE_REQUIRED,
  BOSS_GATE_REQUIRED,
  getEntryGateKey,
  getEliteGateKey,
  getBossGateKey,
  getLootCollectionKey,
  getLootCollectionCount,
  isLootGateUnlocked,
  addRecoveredItemsToLootProgress,
  unlockAvailableLootGates,
} from '../game/lootGate';
import { calculateExperience, getXpToNextLevel } from '../game/partyLevel';
import { MAX_LEVEL } from '../types';
import { createEnvironmentStorageKey } from '../game/environment';
import { computeCharacterStats } from '../game/characterComputation';
import {
  getShopItemPrice,
  getShopHourKey,
  getShopStockKey,
  getShopRefreshPrice,
  countElapsedShopRefreshes,
  getCurrentShopRefreshDate,
} from '../game/shop';

const BUILD_NUMBER = 1;
const STORAGE_KEY = createEnvironmentStorageKey('kemo-expedition-save');

const DEFAULT_DIARY_SETTINGS: DiarySettings = {
  superRareThreshold: 'all',
  mythicThreshold: 'all',
  rareThreshold: 5,
  notifyDefeat: true,
};

const MELEE_CATEGORIES = new Set<Item['category']>(['sword', 'katana', 'gauntlet']);
const RANGED_CATEGORIES = new Set<Item['category']>(['arrow', 'bolt', 'archery']);
const MAGIC_CATEGORIES = new Set<Item['category']>(['wand', 'grimoire', 'catalyst']);


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
    return { victories: 0, retreats: 0, defeats: 0, donatedGold: 0, savedGold: 0 };
  }
  const raw = value as Record<string, unknown>;
  return {
    victories: typeof raw.victories === 'number' ? raw.victories : 0,
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

function getItemRarityCode(item: Item): 'common' | 'uncommon' | 'rare' | 'mythic' {
  const rarityCode = item.id % 1000;
  if (rarityCode >= 400) return 'mythic';
  if (rarityCode >= 300) return 'rare';
  if (rarityCode >= 200) return 'uncommon';
  return 'common';
}

// Helper to calculate sell price for an item
function calculateSellPrice(item: Item, autoSellMultiplier: number = 1): number {
  const enhMult = ENHANCEMENT_TITLES.find(t => t.value === item.enhancement)?.multiplier ?? 1;
  const srMult = SUPER_RARE_TITLES.find(t => t.value === item.superRare)?.multiplier ?? 1;
  return Math.floor(10 * enhMult * srMult * autoSellMultiplier);
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

function loadSavedState(): GameState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Validate it has required properties
      if (parsed.parties && parsed.bags && parsed.buildNumber) {

        parsed.bags = normalizeGameBags({
          commonRewardBag: migrateLegacyBag(parsed.bags.commonRewardBag, createCommonRewardBag, 'commonRewardBag'),
          commonEnhancementBag: migrateLegacyBag(parsed.bags.commonEnhancementBag, createCommonEnhancementBag, 'commonEnhancementBag'),
          uncommonRewardBag: migrateLegacyBag(parsed.bags.uncommonRewardBag, createUncommonRewardBag, 'uncommonRewardBag'),
          rareRewardBag: migrateLegacyBag(parsed.bags.rareRewardBag, createRareRewardBag, 'rareRewardBag'),
          mythicRewardBag: migrateLegacyBag(parsed.bags.mythicRewardBag, createMythicRewardBag, 'mythicRewardBag'),
          enhancementBag: migrateLegacyBag(parsed.bags.enhancementBag, createEnhancementBag, 'enhancementBag'),
          superRareBag: migrateLegacyBag(parsed.bags.superRareBag, createSuperRareBag, 'superRareBag'),
          physicalThreatBag: migrateLegacyBag(parsed.bags.physicalThreatBag, createPhysicalThreatBag, 'physicalThreatBag'),
          magicalThreatBag: migrateLegacyBag(parsed.bags.magicalThreatBag, createMagicalThreatBag, 'magicalThreatBag'),
        });

        if (!parsed.global) {
          const firstParty = parsed.parties?.[0];
          parsed.global = {
            gold: firstParty?.gold ?? 200,
            inventory: migrateOldInventory(firstParty?.inventory ?? []),
            deityDonations: {},
            shopPurchases: {},
            shopRefreshCounts: {},
            shopIntimacy: 0,
            shopIntimacyLastDecayAt: Date.now(),
          };
        }
        if (Array.isArray(parsed.global.inventory)) {
          parsed.global.inventory = migrateOldInventory(parsed.global.inventory);
        }
        parsed.global.deityDonations = getDeityDonationsWithDefaults(parsed.global.deityDonations);
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

        // Process all parties (whether single or array)
        const partiesToProcess = parsed.parties ?? [];
        for (const [index, party] of partiesToProcess.entries()) {
          if (!party.id) {
            party.id = index + 1;
          }
          if (!party.deity) {
            party.deity = createInitialDeity('God of Restoration');
          }
          party.deity.name = normalizeDeityName(party.deity.name);
          if (typeof party.level !== 'number') party.level = 1;
          if (typeof party.experience !== 'number') party.experience = 0;
          if (!party.lootGateStatus) party.lootGateStatus = {};
          if (!party.lootGateProgress) party.lootGateProgress = {};
          if (!Array.isArray(party.diaryLogs)) party.diaryLogs = [];
          if (typeof party.pendingDiaryLog === 'undefined') party.pendingDiaryLog = null;
          if (typeof party.hasUnreadDiary !== 'boolean') party.hasUnreadDiary = false;
          party.diaryLogs = party.diaryLogs.map((log: DiaryLog) => ({
            ...log,
            isRead: typeof log.isRead === 'boolean' ? log.isRead : !party.hasUnreadDiary,
          }));
          party.hasUnreadDiary = party.diaryLogs.some((log: DiaryLog) => !log.isRead);
          party.diarySettings = getDiarySettingsWithDefaults(party.diarySettings);
          if (typeof party.currentHp !== 'number') {
            const computed = computePartyStats(party).partyStats;
            party.currentHp = computed.hp;
          }
          party.expeditionDepthLimit = getExpeditionDepthLimitWithDefault(party.expeditionDepthLimit);
          if (typeof party.pendingProfit !== 'number') party.pendingProfit = 0;
          if (typeof party.expeditionRewardsPending !== 'boolean') party.expeditionRewardsPending = false;
          if (typeof party.deityGold !== 'number') party.deityGold = 0;
          party.expeditionStats = getExpeditionStatsWithDefaults(party.expeditionStats);

          const normalizedDeityName = normalizeDeityName(party.deity.name);
          if (typeof parsed.global.deityDonations[normalizedDeityName] !== 'number') {
            parsed.global.deityDonations[normalizedDeityName] = party.deityGold;
          }
          party.deityGold = parsed.global.deityDonations[normalizedDeityName] ?? 0;

        }

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
  const starterItems: Item[] = starterItemIds.flatMap(id =>
    Array.from({ length: 3 }, () => ({ ...getItemById(id)!, enhancement: 0, superRare: 0 }))
  );

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
    deityGold: 0,
    expeditionStats: getExpeditionStatsWithDefaults(party.expeditionStats),
  };
}

function createInitialParty() {
  const defaultSetup = [
    { race: 'caninian', main: 'fighter', sub: 'lord', pred: 'sturdy', lineage: 'unmoving', name: 'ケモ' },
    { race: 'vulpinian', main: 'duelist', sub: 'samurai', pred: 'chivalric', lineage: 'war_spirit', name: 'ゴン' },
    { race: 'murid', main: 'ninja', sub: 'rogue', pred: 'persistent', lineage: 'breaking_hand', name: 'イタチ' },
    { race: 'leporian', main: 'ranger', sub: 'sage', pred: 'dexterous', lineage: 'far_sight', name: 'ロップ' },
    { race: 'felidian', main: 'sage', sub: 'pilgrim', pred: 'pursuing', lineage: 'hidden_principles', name: 'ラス' },
    { race: 'cervin', main: 'wizard', sub: 'wizard', pred: 'canny', lineage: 'guiding_thought', name: 'セルヴァ' },
  ];

  const characters: Character[] = defaultSetup.map((setup, i) => ({
    id: i + 1,
    name: setup.name,
    raceId: setup.race as RaceId,
    mainClassId: setup.main as ClassId,
    subClassId: setup.sub as ClassId,
    predispositionId: setup.pred as PredispositionId,
    lineageId: setup.lineage as LineageId,
    equipment: [],
  }));

  const party: Party = {
    id: 1,
    name: 'PT1',
    level: 1,
    experience: 0,
    lootGateProgress: {},
    lootGateStatus: {},
    deity: createInitialDeity('God of Restoration'),
    characters,
    selectedDungeonId: 1,
    expeditionDepthLimit: 'all',
    currentHp: 0,
    pendingProfit: 0,
    expeditionRewardsPending: false,
    deityGold: 0,
    lastExpeditionLog: null,
    pendingDiaryLog: null,
    diaryLogs: [],
    hasUnreadDiary: false,
    diarySettings: getDiarySettingsWithDefaults(undefined),
    expeditionStats: getExpeditionStatsWithDefaults(null),
  };

  return initializePartyRuntimeState(party);
}

function createSecondParty() {
  // Create a second test party with different setup
  const defaultSetup = [
    { race: 'lupinian', main: 'samurai', sub: 'samurai', pred: 'chivalric', lineage: 'war_spirit', name: 'ウルフ' },
    { race: 'ursan', main: 'lord', sub: 'fighter', pred: 'sturdy', lineage: 'unmoving', name: 'ベア' },
    { race: 'felidian', main: 'pilgrim', sub: 'sage', pred: 'pursuing', lineage: 'hidden_principles', name: 'ニャン' },
    { race: 'leporian', main: 'sage', sub: 'wizard', pred: 'brilliant', lineage: 'guiding_thought', name: 'ウサギ' },
    { race: 'murid', main: 'rogue', sub: 'ninja', pred: 'dexterous', lineage: 'breaking_hand', name: 'ネズミ' },
    { race: 'cervin', main: 'wizard', sub: 'sage', pred: 'canny', lineage: 'far_sight', name: 'シカ' },
  ];

  const characters: Character[] = defaultSetup.map((setup, i) => ({
    id: i + 101, // Different IDs for second party
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
    deity: createInitialDeity('God of Evasion'),
    characters,
    selectedDungeonId: 1,
    expeditionDepthLimit: 'all',
    currentHp: 0,
    pendingProfit: 0,
    expeditionRewardsPending: false,
    deityGold: 0,
    lastExpeditionLog: null,
    pendingDiaryLog: null,
    diaryLogs: [],
    hasUnreadDiary: false,
    diarySettings: getDiarySettingsWithDefaults(undefined),
    expeditionStats: getExpeditionStatsWithDefaults(null),
  };

  return initializePartyRuntimeState(party);
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
      deityDonations: {},
      shopPurchases: {},
      shopRefreshCounts: {},
      shopIntimacy: 0,
      shopIntimacyLastDecayAt: Date.now(),
    },
    parties: [createInitialParty(), createSecondParty()],
    selectedPartyIndex: 0,
    bags: {
      commonRewardBag: createCommonRewardBag(),
      commonEnhancementBag: createCommonEnhancementBag(),
      uncommonRewardBag: createUncommonRewardBag(),
      rareRewardBag: createRareRewardBag(),
      mythicRewardBag: createMythicRewardBag(),
      enhancementBag: createEnhancementBag(),
      superRareBag: createSuperRareBag(),
      physicalThreatBag: createPhysicalThreatBag(),
      magicalThreatBag: createMagicalThreatBag(),
    },
    buildNumber: BUILD_NUMBER,
  };
}

type GameAction =
  | { type: 'SELECT_PARTY'; partyIndex: number }
  | { type: 'SELECT_DUNGEON'; partyIndex: number; dungeonId: number }
  | { type: 'SET_EXPEDITION_DEPTH_LIMIT'; partyIndex: number; depthLimit: ExpeditionDepthLimit }
  | { type: 'UPDATE_PARTY_DEITY'; partyIndex: number; deityName: string }
  | { type: 'RUN_EXPEDITION'; partyIndex: number; simulatedAt?: number; isLunaMode?: boolean }
  | { type: 'FINALIZE_DIARY_LOG'; partyIndex: number }
  | { type: 'HEAL_PARTY_HP'; partyIndex: number; amount: number }
  | { type: 'CLEAR_PENDING_PROFIT'; partyIndex: number }
  | { type: 'PROCESS_PENDING_PROFIT'; partyIndex: number; donation: number; deposit: number }
  | { type: 'SPEND_PENDING_PROFIT'; partyIndex: number; amount: number }
  | { type: 'EQUIP_ITEM'; characterId: number; slotIndex: number; itemKey: string | null }
  | { type: 'UPDATE_CHARACTER'; characterId: number; updates: Partial<Character> }
  | { type: 'REORDER_PARTY_CHARACTER'; fromIndex: number; toIndex: number }
  | { type: 'SELL_STACK'; variantKey: string }
  | { type: 'BUY_SHOP_ITEM'; itemId: number }
  | { type: 'REFRESH_SHOP_LINEUP' }
  | { type: 'SET_VARIANT_STATUS'; variantKey: string; status: 'notown' }
  | { type: 'MARK_ITEMS_SEEN' }
  | { type: 'MARK_DIARY_LOG_SEEN'; logId: string }
  | { type: 'MARK_ALL_DIARY_LOGS_SEEN' }
  | { type: 'UPDATE_DIARY_SETTINGS'; partyIndex: number; settings: Partial<DiarySettings> }
  | { type: 'SIMULATE_AFK'; elapsedMs: number; isAutoRepeatEnabled: boolean; isLunaMode?: boolean }
  | { type: 'RESET_GAME' }
  | { type: 'IMPORT_GAME_STATE'; state: GameState }
  | { type: 'RESET_COMMON_BAGS' }
  | { type: 'RESET_UNIQUE_BAGS' }
  | { type: 'RESET_SUPER_RARE_BAG' };

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

function getItemRarityById(itemId: number): 'common' | 'uncommon' | 'rare' | 'mythic' {
  const rarityCode = itemId % 1000;
  if (rarityCode >= 400) return 'mythic';
  if (rarityCode >= 300) return 'rare';
  if (rarityCode >= 200) return 'uncommon';
  return 'common';
}

type RewardBagType = 'commonRewardBag' | 'uncommonRewardBag' | 'rareRewardBag' | 'mythicRewardBag';




function getRewardBagTypeForRarity(rarity: 'common' | 'uncommon' | 'rare' | 'mythic'): RewardBagType {
  if (rarity === 'uncommon') return 'uncommonRewardBag';
  if (rarity === 'rare') return 'rareRewardBag';
  if (rarity === 'mythic') return 'mythicRewardBag';
  return 'commonRewardBag';
}

function getRarityRank(rarity: 'common' | 'uncommon' | 'rare' | 'mythic'): number {
  if (rarity === 'mythic') return 4;
  if (rarity === 'rare') return 3;
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
  autoSellMultiplier: number
): {
  bags: GameState['bags'];
  inventory: InventoryRecord;
  gold: number;
  autoSellProfit: number;
  rewards: Item[];
  recoveredItems: Item[];
  rewardNames: string[];
  rewardLogEntries: { itemName: string; autoSellProfit?: number }[];
  highestRewardRarity?: 'common' | 'uncommon' | 'rare' | 'mythic';
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
  let highestRewardRarity: 'common' | 'uncommon' | 'rare' | 'mythic' | undefined;
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

    const bonusRollCount = (hasUnlock ? 1 : 0) + (isLunaMode ? 1 : 0);
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
  if (cunningLevel >= 2) return 1.3;
  if (cunningLevel >= 1) return 1.2;
  return 1;
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
  if (deityKey === 'God of Restoration') {
    const missingHp = maxHp - currentHp;
    const healAmount = Math.floor(missingHp * Math.min(0.3, Math.max(0.2, 0.2 + 0.005 * effectiveTier)));
    return {
      hp: Math.min(maxHp, currentHp + healAmount),
      healAmount: healAmount > 0 ? healAmount : undefined,
    };
  }

  if (deityKey === 'God of Attrition') {
    const hpLossPct = Math.max(0.03, 0.05 - 0.001 * effectiveTier);
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
  if (deityKey === 'God of Restoration' && healAmount && healAmount > 0) {
    return {
      phase: 'long',
      actor: 'deity',
      action: '再生の神の効果！',
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
      const isUsedByOtherParty = state.parties.some((party, index) =>
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
      let roomCounter = 0;
      let expeditionEnded = false;
      let expeditionLootGateProgress = { ...(currentParty.lootGateProgress ?? {}) };

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
              const collected = getLootCollectionCount(currentParty, prevTier, 'mythic');
              const currentCollected = expeditionLootGateProgress[getLootCollectionKey(prevTier, 'mythic')] ?? collected;
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
                  gateInfo: `${prevDungeonName}の神魔レアアイテム(持ち帰り) ${currentCollected}/${gateRequired}（判定時）`,
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
              let gateRarity: 'uncommon' | 'rare';
              if (roomDef.type === 'battle_Boss') {
                gateRequired = BOSS_GATE_REQUIRED;
                gateRarity = 'rare';
              } else {
                gateRequired = ELITE_GATE_REQUIREMENTS[floor.floorNumber] ?? 3;
                gateRarity = 'uncommon';
              }
              const gateKey = roomDef.type === 'battle_Boss'
                ? getBossGateKey(dungeon.id)
                : getEliteGateKey(dungeon.id, floor.floorNumber);
              const collected = getLootCollectionCount(currentParty, tier, gateRarity);
              const currentCollected = expeditionLootGateProgress[getLootCollectionKey(tier, gateRarity)] ?? collected;
              const gateUnlocked = isLootGateUnlocked(currentParty, gateKey) || currentCollected >= gateRequired;
              if (!gateUnlocked) {
                // Gate locked - expedition ends
                const rarityLabel = gateRarity === 'rare' ? 'レアアイテム' : 'アンコモンアイテム';
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
              enemyMultipliers: getExpeditionEnemyMultipliersForTier(effectiveTier),
            };
            const enemy = applyEnemyEncounterScaling(baseEnemy, effectiveDungeon, floor.floorNumber, roomDef.type);

            // Pass currentHp to maintain HP persistence during expedition
            const battleResult = executeBattle(currentParty, enemy, bags, currentHp);

            // Update threat bags from battle result
            bags = {
              ...bags,
              physicalThreatBag: battleResult.updatedBags.physicalThreatBag,
              magicalThreatBag: battleResult.updatedBags.magicalThreatBag,
            };

            const damageDealt = enemy.hp - Math.max(0, battleResult.enemyHp);
            const damageTaken = battleResult.log
              .filter(entry => entry.actor === 'enemy' && entry.damage !== undefined)
              .reduce((sum, entry) => sum + (entry.damage ?? 0), 0);

            const enemyAttackValues = calculateEnemyAttackValues(enemy, partyStats);

            // Room type suffix for display
            let roomSuffix = '';
            if (roomDef.type === 'battle_Elite') roomSuffix = ' (ELITE)';
            if (roomDef.type === 'battle_Boss') roomSuffix = ' (BOSS)';

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
              const enemyLevelFinal = dungeon.expLevel + (floor.floorNumber - 1);
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
              const rewardResult = resolveEnemyRewards(
                enemy,
                bags,
                currentInventory,
                currentGold,
                hasUnlock,
                !!action.isLunaMode,
                autoSellMultiplier
              );
              bags = rewardResult.bags;
              currentInventory = rewardResult.inventory;
              currentGold = rewardResult.gold;
              totalAutoSellProfit += rewardResult.autoSellProfit;
              rewards.push(...rewardResult.rewards);
              recoveredItems.push(...rewardResult.recoveredItems);
              expeditionLootGateProgress = addRecoveredItemsToLootProgress(expeditionLootGateProgress, rewardResult.recoveredItems);

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
      const finalGold = isDefeat ? state.global.gold : (currentGold - finalAutoSellProfit);

      const nextLootGateProgress = isDefeat
        ? currentParty.lootGateProgress
        : addRecoveredItemsToLootProgress(currentParty.lootGateProgress ?? {}, recoveredItems);
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
        autoSellMultiplier: expeditionAutoSellMultiplier > 1 ? expeditionAutoSellMultiplier : undefined,
        remainingPartyHP: finalRemainingPartyHP,
        maxPartyHP: partyStats.hp,
      };

      const diarySettings = getDiarySettingsWithDefaults(currentParty.diarySettings);
      const hasSuperRareMatch = finalRewards.some((item) => item.superRare > 0 && matchesDiaryThreshold(item, diarySettings.superRareThreshold));
      const hasMythicMatch = finalRewards.some((item) => getItemRarityCode(item) === 'mythic' && matchesDiaryThreshold(item, diarySettings.mythicThreshold));
      const hasRareMatch = finalRewards.some((item) => getItemRarityCode(item) === 'rare' && matchesDiaryThreshold(item, diarySettings.rareThreshold));

      const diaryTriggers: DiaryLog['triggers'] = [];
      if (finalOutcome === 'defeat' && diarySettings.notifyDefeat) diaryTriggers.push('defeat');

      if (hasSuperRareMatch) {
        diaryTriggers.push('superRare');
      } else {
        if (hasMythicMatch) diaryTriggers.push('mythic');
        if (hasRareMatch) diaryTriggers.push('rare');
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
          retreats: currentParty.expeditionStats.retreats + ((finalOutcome === 'retreat' || finalOutcome === 'return') ? 1 : 0),
          defeats: currentParty.expeditionStats.defeats + (finalOutcome === 'defeat' ? 1 : 0),
        },
      };

      return {
        ...state,
        bags,
        parties: updatedParties,
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
      const nextDiaryLogs = pendingDiaryLog
        ? [pendingDiaryLog, ...(party.diaryLogs ?? [])].slice(0, 10)
        : party.diaryLogs;

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

      return {
        ...state,
        parties: updatedParties,
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

    case 'PROCESS_PENDING_PROFIT': {
      const currentParty = state.parties[action.partyIndex];
      if (!currentParty) return state;
      const donation = Math.max(0, Math.floor(action.donation));
      const deposit = Math.max(0, Math.floor(action.deposit));
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
      const currentParty = state.parties[state.selectedPartyIndex];
      const charIndex = currentParty.characters.findIndex(c => c.id === action.characterId);
      if (charIndex === -1) return state;

      const character = currentParty.characters[charIndex];
      const newEquipment = [...character.equipment];
      let newInventory = { ...state.global.inventory };

      // Add old item back to inventory
      const oldItem = newEquipment[action.slotIndex];
      if (oldItem) {
        const oldKey = getVariantKey(oldItem);
        const existing = newInventory[oldKey];
        if (existing) {
          newInventory[oldKey] = { ...existing, count: existing.count + 1, status: 'owned' };
        } else {
          newInventory[oldKey] = { item: oldItem, count: 1, status: 'owned' };
        }
      }

      // Remove new item from inventory and equip
      if (action.itemKey) {
        const variant = newInventory[action.itemKey];
        if (variant && variant.count > 0) {
          newInventory = removeItemFromInventory(newInventory, action.itemKey);
          newEquipment[action.slotIndex] = { ...variant.item };
        } else {
          newEquipment[action.slotIndex] = null;
        }
      } else {
        newEquipment[action.slotIndex] = null;
      }

      const newCharacters = [...currentParty.characters];
      newCharacters[charIndex] = { ...character, equipment: newEquipment };

      const updatedParties = [...state.parties];
      updatedParties[state.selectedPartyIndex] = {
        ...currentParty,
        characters: newCharacters
      };

      return {
        ...state,
        parties: updatedParties,
        global: { ...state.global, inventory: newInventory },
      };
    }

    case 'UPDATE_CHARACTER': {
      const currentParty = state.parties[state.selectedPartyIndex];
      const charIndex = currentParty.characters.findIndex(c => c.id === action.characterId);
      if (charIndex === -1) return state;

      const oldChar = currentParty.characters[charIndex];
      const newCharacters = [...currentParty.characters];

      let newInventory = state.global.inventory;
      const nextCharacter = { ...oldChar, ...action.updates };
      const oldMaxEquipSlots = computeCharacterStats(oldChar, currentParty.level).maxEquipSlots;
      const nextMaxEquipSlots = computeCharacterStats(nextCharacter, currentParty.level).maxEquipSlots;
      let newEquipment = [...oldChar.equipment];

      if (nextMaxEquipSlots < oldMaxEquipSlots) {
        newInventory = { ...state.global.inventory };
        for (const item of oldChar.equipment.slice(nextMaxEquipSlots).filter((e): e is Item => e != null)) {
          const key = getVariantKey(item);
          const existing = newInventory[key];
          if (existing) {
            newInventory[key] = { ...existing, count: existing.count + 1, status: 'owned' };
          } else {
            newInventory[key] = { item, count: 1, status: 'owned' };
          }
        }
        for (let i = nextMaxEquipSlots; i < newEquipment.length; i++) {
          newEquipment[i] = null;
        }
      }

      const oldCombatBonuses = getCharacterCombatBonusLevels(oldChar);
      const nextCombatBonuses = getCharacterCombatBonusLevels(nextCharacter);
      const lostMeleeAptitude = oldCombatBonuses.grit > 0 && nextCombatBonuses.grit <= 0;
      const lostRangedAptitude = oldCombatBonuses.pursuit > 0 && nextCombatBonuses.pursuit <= 0;
      const lostMagicAptitude = oldCombatBonuses.caster > 0 && nextCombatBonuses.caster <= 0;

      if (lostMeleeAptitude || lostRangedAptitude || lostMagicAptitude) {
        newInventory = { ...newInventory };
        for (let i = 0; i < newEquipment.length; i++) {
          const item = newEquipment[i];
          if (!item) continue;

          const shouldRemove = (lostMeleeAptitude && MELEE_CATEGORIES.has(item.category))
            || (lostRangedAptitude && RANGED_CATEGORIES.has(item.category))
            || (lostMagicAptitude && MAGIC_CATEGORIES.has(item.category));
          if (!shouldRemove) continue;

          const key = getVariantKey(item);
          const existing = newInventory[key];
          if (existing) {
            newInventory[key] = { ...existing, count: existing.count + 1, status: 'owned' };
          } else {
            newInventory[key] = { item, count: 1, status: 'owned' };
          }

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
        global: { ...state.global, inventory: newInventory },
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
      if (!variant || variant.count <= 0) return state;

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

      const cappedElapsedMs = Math.max(0, Math.min(action.elapsedMs, 60 * 60 * 1000));
      if (cappedElapsedMs < 1000) return state;

      const approxCycleDurationMs = 44_000;
      const runCount = Math.max(0, Math.floor(cappedElapsedMs / approxCycleDurationMs));
      if (runCount <= 0) return state;

      let workingState = state;
      const simulationStartAt = Date.now() - cappedElapsedMs;
      const simulationEndAt = simulationStartAt + (runCount * approxCycleDurationMs);
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

          const pendingProfit = currentParty.pendingProfit ?? 0;
          const baseSpend = Math.floor((pendingProfit * (33 + Math.random() * 34)) / 100);
          const squanderLevel = getPartyAbilityLevel(currentParty, 'squander');
          const squanderMultiplier = squanderLevel >= 2 ? 2 : squanderLevel >= 1 ? 1.5 : 1;
          const spend = Math.min(pendingProfit, Math.floor(baseSpend * squanderMultiplier));
          if (spend > 0) {
            workingState = gameReducer(workingState, { type: 'SPEND_PENDING_PROFIT', partyIndex, amount: spend });
          }

          const afterSpend = workingState.parties[partyIndex];
          if (!afterSpend) continue;
          const donationRate = 10 + Math.random() * 23;
          const baseDonation = Math.floor(((afterSpend.pendingProfit ?? 0) * donationRate) / 100);
          const titheLevel = getPartyAbilityLevel(afterSpend, 'tithe');
          const titheBonusRate = titheLevel >= 2 ? 0.15 : titheLevel >= 1 ? 0.1 : 0;
          const titheBonus = Math.floor((afterSpend.pendingProfit ?? 0) * titheBonusRate);
          const donation = Math.min(afterSpend.pendingProfit ?? 0, baseDonation + titheBonus);
          const deposit = Math.max(0, (afterSpend.pendingProfit ?? 0) - donation);
          workingState = gameReducer(workingState, { type: 'PROCESS_PENDING_PROFIT', partyIndex, donation, deposit });

          const partyAfterProfit = workingState.parties[partyIndex];
          if (!partyAfterProfit) continue;
          const { partyStats } = computePartyStats(partyAfterProfit);
          const missingHp = Math.max(0, partyStats.hp - (partyAfterProfit.currentHp ?? partyStats.hp));
          if (missingHp > 0) {
            workingState = gameReducer(workingState, { type: 'HEAL_PARTY_HP', partyIndex, amount: missingHp });
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
          deityDonations: {},
          shopPurchases: {},
          shopRefreshCounts: {},
          shopIntimacy: 0,
          shopIntimacyLastDecayAt: Date.now(),
        },
        parties: [createInitialParty(), createSecondParty()],
        selectedPartyIndex: 0,
        bags: {
          commonRewardBag: createCommonRewardBag(),
          commonEnhancementBag: createCommonEnhancementBag(),
          uncommonRewardBag: createUncommonRewardBag(),
          rareRewardBag: createRareRewardBag(),
          mythicRewardBag: createMythicRewardBag(),
          enhancementBag: createEnhancementBag(),
          superRareBag: createSuperRareBag(),
          physicalThreatBag: createPhysicalThreatBag(),
          magicalThreatBag: createMagicalThreatBag(),
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
      }));
      const normalizedSelectedPartyIndex = Math.min(
        Math.max(0, hydrated.selectedPartyIndex),
        Math.max(0, normalizedParties.length - 1),
      );

      return {
        ...hydrated,
        parties: normalizedParties,
        selectedPartyIndex: normalizedSelectedPartyIndex,
        bags: normalizeGameBags(hydrated.bags),
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
          rareRewardBag: createRareRewardBag(),
          mythicRewardBag: createMythicRewardBag(),
          enhancementBag: createEnhancementBag(),
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

    default:
      return state;
  }
}

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
    options?: { rarity?: 'common' | 'uncommon' | 'rare' | 'mythic'; isSuperRareItem?: boolean }
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

    runExpedition: useCallback((partyIndex: number, isLunaMode: boolean = false) => {
      dispatch({ type: 'RUN_EXPEDITION', partyIndex, isLunaMode });
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

    equipItem: useCallback((characterId: number, slotIndex: number, itemKey: string | null) => {
      dispatch({ type: 'EQUIP_ITEM', characterId, slotIndex, itemKey });
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

    buyShopItem: useCallback((itemId: number) => {
      dispatch({ type: 'BUY_SHOP_ITEM', itemId });
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

    simulateAfk: useCallback((elapsedMs: number, isAutoRepeatEnabled: boolean, isLunaMode: boolean = false) => {
      dispatch({ type: 'SIMULATE_AFK', elapsedMs, isAutoRepeatEnabled, isLunaMode });
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

    addNotification,
    addStatNotifications,
    dismissNotification,
    dismissAllNotifications,
  };

  return { state, actions, bags: state.bags, notifications };
}
