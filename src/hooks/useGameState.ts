import { useReducer, useCallback, useEffect, useState } from 'react';
import {
  GameState,
  Item,
  Character,
  RaceId,
  ClassId,
  PredispositionId,
  LineageId,
  ExpeditionLog,
  ExpeditionLogEntry,
  InventoryRecord,
  InventoryVariant,
  getVariantKey,
  GameNotification,
  NotificationStyle,
  NotificationCategory,
  RoomType,
  EnemyDef,
} from '../types';
import { computePartyStats } from '../game/partyComputation';
import { executeBattle, calculateEnemyAttackValues } from '../game/battle';
import { applyEnemyEncounterScaling, getRoomMultiplier } from '../game/enemyScaling';
import { DUNGEONS, getDungeonById } from '../data/dungeons';
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
} from '../game/bags';
import { getItemById, ENHANCEMENT_TITLES, SUPER_RARE_TITLES } from '../data/items';
import { getItemDisplayName } from '../game/gameState';
import { getDeityKey, normalizeDeityName } from '../game/deity';
import {
  ELITE_GATE_REQUIREMENTS,
  ENTRY_GATE_REQUIRED,
  BOSS_GATE_REQUIRED,
  getEntryGateKey,
  getEliteGateKey,
  getBossGateKey,
  getLootCollectionCount,
  isLootGateUnlocked,
  addRecoveredItemsToLootProgress,
  unlockAvailableLootGates,
} from '../game/lootGate';

const BUILD_NUMBER = 43;
const STORAGE_KEY = 'kemo-expedition-save';

// Helper to calculate sell price for an item
function calculateSellPrice(item: Item): number {
  const enhMult = ENHANCEMENT_TITLES.find(t => t.value === item.enhancement)?.multiplier ?? 1;
  const srMult = SUPER_RARE_TITLES.find(t => t.value === item.superRare)?.multiplier ?? 1;
  return Math.floor(10 * enhMult * srMult);
}

// Helper to add item to inventory (handles stacking and auto-sell)
function addItemToInventory(
  inventory: InventoryRecord,
  item: Item,
  currentGold: number
): { inventory: InventoryRecord; gold: number; wasAutoSold: boolean; autoSellProfit: number } {
  const key = getVariantKey(item);
  const existing = inventory[key];

  // If this variant is marked as sold, auto-sell it
  if (existing?.status === 'sold') {
    const sellPrice = calculateSellPrice(item);
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
      isNew: true,
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

function loadSavedState(): GameState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Validate it has required properties
      if ((parsed.party || parsed.parties) && parsed.bags && parsed.buildNumber) {
        // Migrate old single party format to new multiple parties format
        if (parsed.party && !parsed.parties) {
          parsed.parties = [parsed.party, createSecondParty()];
          parsed.selectedPartyIndex = 0;
          delete parsed.party;
        }

        if (!parsed.bags.uncommonRewardBag) parsed.bags.uncommonRewardBag = createUncommonRewardBag();
        if (!parsed.bags.rareRewardBag) parsed.bags.rareRewardBag = createRareRewardBag();
        if (!parsed.bags.mythicRewardBag) parsed.bags.mythicRewardBag = createMythicRewardBag();

        const mergeWithBaseItem = (item: Item): Item => {
          const baseItem = getItemById(item.id);
          if (!baseItem) return item;
          return {
            ...baseItem,
            enhancement: item.enhancement,
            superRare: item.superRare,
            isNew: item.isNew,
          };
        };

        if (!parsed.global) {
          const firstParty = parsed.parties?.[0];
          parsed.global = {
            gold: firstParty?.gold ?? 200,
            inventory: migrateOldInventory(firstParty?.inventory ?? []),
          };
        }
        if (Array.isArray(parsed.global.inventory)) {
          parsed.global.inventory = migrateOldInventory(parsed.global.inventory);
        }

        // Process all parties (whether single or array)
        const partiesToProcess = parsed.parties ?? [];
        for (const [index, party] of partiesToProcess.entries()) {
          if (!party.id) {
            party.id = index + 1;
          }
          if (!party.deity) {
            party.deity = createInitialDeity('God of Restoration');
            if (party.deityName) party.deity.name = normalizeDeityName(party.deityName);
          }
          party.deity.name = normalizeDeityName(party.deity.name);
          if (typeof party.level !== 'number') party.level = party.deity.level ?? 1;
          if (typeof party.experience !== 'number') party.experience = party.deity.experience ?? 0;
          if (!party.lootGateStatus) party.lootGateStatus = party.deity.lootGateStatus ?? {};
          if (!party.lootGateProgress) party.lootGateProgress = party.deity.lootGateProgress ?? {};

          // Merge latest item definitions onto saved items (for new fields like baseMultiplier)
          for (const character of party.characters ?? []) {
            if (Array.isArray(character.equipment)) {
              character.equipment = character.equipment.map((item: Item | null) => {
                if (!item) return null;
                return mergeWithBaseItem(item);
              });
            }
          }
        }

        for (const variant of Object.values(parsed.global.inventory) as InventoryVariant[]) {
          if (variant?.item) {
            variant.item = mergeWithBaseItem(variant.item);
          }
        }

        return parsed as GameState;
      }
    }
  } catch (e) {
    console.error('Failed to load saved state:', e);
  }
  return null;
}

function saveState(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state:', e);
  }
}

const LEVEL_EXP: number[] = [
  0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200,
  4000, 5000, 6200, 7600, 9200, 11000, 13000, 15500, 18500, 22000,
  26000, 30500, 35500, 41000, 47000, 53500, 60500, 68000, 76000
];

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

  return {
    id: 1,
    name: 'PT1',
    level: 1,
    experience: 0,
    lootGateProgress: {},
    lootGateStatus: {},
    deity: createInitialDeity('God of Restoration'),
    characters,
    selectedDungeonId: 1,
    lastExpeditionLog: null,
  };
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

  return {
    id: 2,
    name: 'PT2',
    level: 1,
    experience: 0,
    lootGateProgress: {},
    lootGateStatus: {},
    deity: createInitialDeity('God of Attrition'),
    characters,
    selectedDungeonId: 2,
    lastExpeditionLog: null,
  };
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
  | { type: 'UPDATE_PARTY_DEITY'; partyIndex: number; deityName: string }
  | { type: 'RUN_EXPEDITION'; partyIndex: number }
  | { type: 'EQUIP_ITEM'; characterId: number; slotIndex: number; itemKey: string | null }
  | { type: 'UPDATE_CHARACTER'; characterId: number; updates: Partial<Character> }
  | { type: 'SELL_STACK'; variantKey: string }
  | { type: 'SET_VARIANT_STATUS'; variantKey: string; status: 'notown' }
  | { type: 'MARK_ITEMS_SEEN' }
  | { type: 'RESET_GAME' }
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
  hasUnlock: boolean
): {
  bags: GameState['bags'];
  inventory: InventoryRecord;
  gold: number;
  autoSellProfit: number;
  rewards: Item[];
  recoveredItems: Item[];
  rewardNames: string[];
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
    if (hasUnlock) {
      bags = refillBagIfEmpty(bags, rewardBagType);
      const { ticket: unlockTicket, newBag } = drawFromBag(bags[rewardBagType]);
      bags = { ...bags, [rewardBagType]: newBag };
      gotReward = gotReward || unlockTicket === 1;
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
    const result = addItemToInventory(inventory, newItem, gold);
    recoveredItems.push(newItem);
    inventory = result.inventory;
    gold = result.gold;
    autoSellProfit += result.autoSellProfit;

    if (!result.wasAutoSold) {
      rewards.push(newItem);
      rewardNames.push(getItemDisplayName(newItem));
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
    highestRewardRarity,
    hasSuperRareReward,
  };
}

// Legacy function for backward compatibility
function selectEnemy(dungeonId: number, room: number, totalRooms: number) {
  const dungeon = getDungeonById(dungeonId);
  if (!dungeon) return null;

  if (room > totalRooms) {
    return getBossEnemy(dungeon.bossId);
  }

  const poolId = dungeon.enemyPoolIds[0];
  const enemies = getEnemiesByPool(poolId);
  const randomIndex = Math.floor(Math.random() * enemies.length);
  return enemies[randomIndex];
}

function applyPeriodicDeityHpEffect(
  deityName: string,
  roomNumber: number,
  totalRooms: number,
  currentHp: number,
  maxHp: number
): { hp: number; healAmount?: number; attritionAmount?: number } {
  if (roomNumber % 4 !== 0 || roomNumber >= totalRooms) {
    return { hp: currentHp };
  }

  const deityKey = getDeityKey(deityName);
  if (deityKey === 'God of Restoration') {
    const missingHp = maxHp - currentHp;
    const healAmount = Math.floor(missingHp * 0.2);
    return {
      hp: Math.min(maxHp, currentHp + healAmount),
      healAmount: healAmount > 0 ? healAmount : undefined,
    };
  }

  if (deityKey === 'God of Attrition') {
    const nextHp = Math.max(1, Math.floor(currentHp * 0.95));
    const attritionAmount = Math.max(0, currentHp - nextHp);
    return {
      hp: nextHp,
      attritionAmount: attritionAmount > 0 ? attritionAmount : undefined,
    };
  }

  return { hp: currentHp };
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
      let newInventory = { ...state.global.inventory };

      const resetCharacters = targetParty.characters.map((character) => {
        for (const equippedItem of character.equipment) {
          if (!equippedItem) continue;
          const key = getVariantKey(equippedItem);
          const existing = newInventory[key];
          if (existing) {
            newInventory[key] = {
              ...existing,
              count: existing.count + 1,
              status: 'owned',
            };
          } else {
            newInventory[key] = {
              item: { ...equippedItem, isNew: undefined },
              count: 1,
              status: 'owned',
            };
          }
        }

        return {
          ...character,
          equipment: [],
        };
      });

      updatedParties[action.partyIndex] = {
        ...targetParty,
        deity: {
          ...targetParty.deity,
          name: normalizedDeityName,
        },
        characters: resetCharacters,
      };

      return {
        ...state,
        parties: updatedParties,
        global: {
          ...state.global,
          inventory: newInventory,
        },
      };
    }

    case 'RUN_EXPEDITION': {
      const currentParty = state.parties[action.partyIndex];
      const dungeon = getDungeonById(currentParty.selectedDungeonId);
      if (!dungeon) return state;
      const { partyStats } = computePartyStats(currentParty);
      let currentHp = partyStats.hp;

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
              const gateUnlocked = isLootGateUnlocked(currentParty, entryGateKey) || collected >= gateRequired;
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
                  gateInfo: `${prevDungeonName}の神魔レアアイテム(持ち帰り) ${collected}/${gateRequired}`,
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
              const gateUnlocked = isLootGateUnlocked(currentParty, gateKey) || collected >= gateRequired;
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
                  gateInfo: `${rarityLabel}(持ち帰り) ${collected}/${gateRequired}`,
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
            const enemy = applyEnemyEncounterScaling(baseEnemy, dungeon, floor.floorNumber, roomDef.type);

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
              enemyName: enemy.name + roomSuffix,
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
              totalExp += enemy.experience;

              const { characterStats } = computePartyStats(currentParty);
              const hasUnlock = characterStats.some(cs => cs.abilities.some(a => a.id === 'unlock'));
              const rewardResult = resolveEnemyRewards(enemy, bags, currentInventory, currentGold, hasUnlock);
              bags = rewardResult.bags;
              currentInventory = rewardResult.inventory;
              currentGold = rewardResult.gold;
              totalAutoSellProfit += rewardResult.autoSellProfit;
              rewards.push(...rewardResult.rewards);
              recoveredItems.push(...rewardResult.recoveredItems);

              if (rewardResult.rewardNames.length > 0) {
                entry.reward = rewardResult.rewardNames.join(' / ');
                entry.rewardRarity = rewardResult.highestRewardRarity;
                entry.rewardIsSuperRare = rewardResult.hasSuperRareReward;
              }

              currentHp = battleResult.partyHp;
              entries.push(entry);

              const deityHpEffect = applyPeriodicDeityHpEffect(currentParty.deity.name, roomCounter, totalRooms, currentHp, partyStats.hp);
              currentHp = deityHpEffect.hp;
              entry.remainingPartyHP = currentHp;
              if (deityHpEffect.healAmount) {
                entry.healAmount = deityHpEffect.healAmount;
              }
              if (deityHpEffect.attritionAmount) {
                entry.attritionAmount = deityHpEffect.attritionAmount;
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
      } else {
        // Legacy expedition logic for backward compatibility
        const totalRooms = dungeon.numberOfRooms;
        const totalRoomsIncludingBoss = totalRooms + 1;

        for (let room = 1; room <= totalRoomsIncludingBoss; room++) {
          const enemy = selectEnemy(dungeon.id, room, totalRooms);
          if (!enemy) break;

          const battleResult = executeBattle(currentParty, enemy, bags, currentHp);
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

          const entry: ExpeditionLogEntry = {
            room,
            enemyName: enemy.name + (room > totalRooms ? ' (BOSS)' : ''),
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
            totalExp += enemy.experience;

            const { characterStats } = computePartyStats(currentParty);
            const hasUnlock = characterStats.some(cs => cs.abilities.some(a => a.id === 'unlock'));
            const rewardResult = resolveEnemyRewards(enemy, bags, currentInventory, currentGold, hasUnlock);
            bags = rewardResult.bags;
            currentInventory = rewardResult.inventory;
            currentGold = rewardResult.gold;
            totalAutoSellProfit += rewardResult.autoSellProfit;
            rewards.push(...rewardResult.rewards);
            recoveredItems.push(...rewardResult.recoveredItems);

            if (rewardResult.rewardNames.length > 0) {
              entry.reward = rewardResult.rewardNames.join(' / ');
              entry.rewardRarity = rewardResult.highestRewardRarity;
              entry.rewardIsSuperRare = rewardResult.hasSuperRareReward;
            }

            currentHp = battleResult.partyHp;
            entries.push(entry);

            const deityHpEffect = applyPeriodicDeityHpEffect(currentParty.deity.name, room, totalRoomsIncludingBoss, currentHp, partyStats.hp);
            currentHp = deityHpEffect.hp;
            entry.remainingPartyHP = currentHp;
            if (deityHpEffect.healAmount) {
              entry.healAmount = deityHpEffect.healAmount;
            }
            if (deityHpEffect.attritionAmount) {
              entry.attritionAmount = deityHpEffect.attritionAmount;
            }
          } else if (battleResult.outcome === 'defeat') {
            entries.push(entry);
            finalOutcome = 'defeat';
            break;
          } else {
            entries.push(entry);
            finalOutcome = 'retreat';
            break;
          }
        }
        roomCounter = entries.length;
      }

      // On defeat: revert inventory and gold (no item rewards), but keep experience
      const isDefeat = finalOutcome === 'defeat';
      const finalInventory = isDefeat ? state.global.inventory : currentInventory;
      const finalGold = isDefeat ? state.global.gold : currentGold;
      const finalRewards = isDefeat ? [] : rewards;
      const finalAutoSellProfit = isDefeat ? 0 : totalAutoSellProfit;

      const nextLootGateProgress = isDefeat
        ? currentParty.lootGateProgress
        : addRecoveredItemsToLootProgress(currentParty.lootGateProgress ?? {}, recoveredItems);
      const nextLootGateStatus = unlockAvailableLootGates(
        currentParty.lootGateStatus ?? {},
        nextLootGateProgress,
        DUNGEONS.length
      );

      // Update level
      let newExp = currentParty.experience + totalExp;
      let newLevel = currentParty.level;
      while (newLevel < 29 && newExp >= LEVEL_EXP[newLevel]) {
        newLevel++;
      }

      const finalRemainingPartyHP = entries.length > 0
        ? entries[entries.length - 1].remainingPartyHP
        : currentHp;

      const log: ExpeditionLog = {
        dungeonId: dungeon.id,
        dungeonName: dungeon.name,
        totalExperience: totalExp,
        totalRooms: dungeon.floors ? dungeon.floors.reduce((sum, f) => sum + f.rooms.length, 0) : dungeon.numberOfRooms + 1,
        completedRooms: entries.length,
        finalOutcome,
        entries,
        rewards: finalRewards,
        autoSellProfit: finalAutoSellProfit,
        remainingPartyHP: finalRemainingPartyHP,
        maxPartyHP: partyStats.hp,
      };

      const updatedParties = [...state.parties];
      updatedParties[action.partyIndex] = {
        ...currentParty,
        level: newLevel,
        experience: newExp,
        lootGateProgress: nextLootGateProgress,
        lootGateStatus: nextLootGateStatus,
        lastExpeditionLog: log,
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

      // If race/class/etc changed, remove all equipment
      const isCharacterChanged =
        (action.updates.raceId && action.updates.raceId !== oldChar.raceId) ||
        (action.updates.mainClassId && action.updates.mainClassId !== oldChar.mainClassId) ||
        (action.updates.subClassId && action.updates.subClassId !== oldChar.subClassId) ||
        (action.updates.predispositionId && action.updates.predispositionId !== oldChar.predispositionId) ||
        (action.updates.lineageId && action.updates.lineageId !== oldChar.lineageId);

      let newInventory = state.global.inventory;
      let newEquipment = oldChar.equipment;

      if (isCharacterChanged) {
        // Return equipment to inventory
        newInventory = { ...state.global.inventory };
        for (const item of oldChar.equipment.filter((e): e is Item => e !== null)) {
          const key = getVariantKey(item);
          const existing = newInventory[key];
          if (existing) {
            newInventory[key] = { ...existing, count: existing.count + 1, status: 'owned' };
          } else {
            newInventory[key] = { item, count: 1, status: 'owned' };
          }
        }
        newEquipment = [];
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

    updatePartyDeity: useCallback((partyIndex: number, deityName: string) => {
      dispatch({ type: 'UPDATE_PARTY_DEITY', partyIndex, deityName });
    }, []),

    runExpedition: useCallback((partyIndex: number) => {
      dispatch({ type: 'RUN_EXPEDITION', partyIndex });
    }, []),

    equipItem: useCallback((characterId: number, slotIndex: number, itemKey: string | null) => {
      dispatch({ type: 'EQUIP_ITEM', characterId, slotIndex, itemKey });
    }, []),

    updateCharacter: useCallback((characterId: number, updates: Partial<Character>) => {
      dispatch({ type: 'UPDATE_CHARACTER', characterId, updates });
    }, []),

    sellStack: useCallback((variantKey: string) => {
      dispatch({ type: 'SELL_STACK', variantKey });
    }, []),

    setVariantStatus: useCallback((variantKey: string, status: 'notown') => {
      dispatch({ type: 'SET_VARIANT_STATUS', variantKey, status });
    }, []),

    markItemsSeen: useCallback(() => {
      dispatch({ type: 'MARK_ITEMS_SEEN' });
    }, []),

    resetGame: useCallback(() => {
      dispatch({ type: 'RESET_GAME' });
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
