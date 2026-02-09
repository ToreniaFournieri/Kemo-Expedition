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
import { getDungeonById } from '../data/dungeons';
import { getEnemiesByPool, getElitesByPool, getBossEnemy } from '../data/enemies';
import { drawFromBag, refillBagIfEmpty, createCommonRewardBag, createCommonEnhancementBag, createRewardBag, createEnhancementBag, createSuperRareBag, createPhysicalThreatBag, createMagicalThreatBag } from '../game/bags';
import { getItemById, getItemsByTierAndRarity, ENHANCEMENT_TITLES, SUPER_RARE_TITLES } from '../data/items';
import { getItemDisplayName } from '../game/gameState';

const BUILD_NUMBER = 31;
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
      if (parsed.party && parsed.bags && parsed.buildNumber) {
        // Migrate old inventory format if needed
        if (Array.isArray(parsed.party.inventory)) {
          parsed.party.inventory = migrateOldInventory(parsed.party.inventory);
        }
        // Merge latest item definitions onto saved items (for new fields like baseMultiplier)
        for (const character of parsed.party.characters ?? []) {
          if (Array.isArray(character.equipment)) {
            character.equipment = character.equipment.map((item: Item | null) => {
              if (!item) return null;
              const baseItem = getItemById(item.id);
              return baseItem ? { ...baseItem, ...item } : item;
            });
          }
        }
        if (parsed.party.inventory) {
          for (const variant of Object.values(parsed.party.inventory) as InventoryVariant[]) {
            if (variant?.item) {
              const baseItem = getItemById(variant.item.id);
              if (baseItem) {
                variant.item = { ...baseItem, ...variant.item };
              }
            }
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

  // Create starter items as inventory record
  // 3 Tier-1 common items of each item type (IDs 1101-1112)
  const starterItemIds = [
    1101, // 鎧 (armor)
    1102, // ローブ (robe)
    1103, // 盾 (shield)
    1104, // 剣 (sword)
    1105, // 刀 (katana)
    1106, // 籠手 (gauntlet)
    1107, // 矢 (arrow)
    1108, // ボルト (bolt)
    1109, // 弓 (archery)
    1110, // ワンド (wand)
    1111, // 魔導書 (grimoire)
    1112, // 触媒 (catalyst)
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

  return {
    deityName: '再生の神',
    level: 1,
    experience: 0,
    characters,
    inventory,
    gold: 200,
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
    party: createInitialParty(),
    bags: {
      commonRewardBag: createCommonRewardBag(),
      commonEnhancementBag: createCommonEnhancementBag(),
      rewardBag: createRewardBag(),
      enhancementBag: createEnhancementBag(),
      superRareBag: createSuperRareBag(),
      physicalThreatBag: createPhysicalThreatBag(),
      magicalThreatBag: createMagicalThreatBag(),
    },
    selectedDungeonId: 1,
    lastExpeditionLog: null,
    buildNumber: BUILD_NUMBER,
  };
}

type GameAction =
  | { type: 'SELECT_DUNGEON'; dungeonId: number }
  | { type: 'RUN_EXPEDITION' }
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
  bossId?: number
): EnemyDef | null {
  if (roomType === 'battle_Boss' && bossId) {
    return getBossEnemy(bossId) ?? null;
  }

  if (roomType === 'battle_Elite' && poolId) {
    const elites = getElitesByPool(poolId);
    if (elites.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * elites.length);
    return elites[randomIndex];
  }

  if (poolId) {
    const enemies = getEnemiesByPool(poolId);
    if (enemies.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * enemies.length);
    return enemies[randomIndex];
  }

  return null;
}

// Loot-Gate check: count total items of a rarity the player owns for a tier
function countItemsOfRarity(
  inventory: InventoryRecord,
  tier: number,
  rarity: 'uncommon' | 'rare'
): number {
  const rarityItems = getItemsByTierAndRarity(tier, rarity);
  const rarityIds = new Set(rarityItems.map(i => i.id));
  let count = 0;
  for (const variant of Object.values(inventory)) {
    if (variant.status === 'owned' && variant.count > 0 && rarityIds.has(variant.item.id)) {
      count += variant.count;
    }
  }
  return count;
}

// Gate requirements per floor number
const ELITE_GATE_REQUIREMENTS: Record<number, number> = {
  1: 6,
  2: 18,
  3: 36,
  4: 60,
  5: 90,
};

// Apply floor multiplier to enemy stats
function applyFloorMultiplier(enemy: EnemyDef, multiplier: number): EnemyDef {
  if (multiplier === 1.0) return enemy;

  return {
    ...enemy,
    hp: Math.floor(enemy.hp * multiplier),
    rangedAttack: Math.floor(enemy.rangedAttack * multiplier),
    magicalAttack: Math.floor(enemy.magicalAttack * multiplier),
    meleeAttack: Math.floor(enemy.meleeAttack * multiplier),
    physicalDefense: Math.floor(enemy.physicalDefense * multiplier),
    magicalDefense: Math.floor(enemy.magicalDefense * multiplier),
    experience: Math.floor(enemy.experience * multiplier),
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

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SELECT_DUNGEON':
      return { ...state, selectedDungeonId: action.dungeonId };

    case 'RUN_EXPEDITION': {
      const dungeon = getDungeonById(state.selectedDungeonId);
      if (!dungeon) return state;

      const { partyStats } = computePartyStats(state.party);
      let currentHp = partyStats.hp;

      const entries: ExpeditionLogEntry[] = [];
      const rewards: Item[] = [];
      let totalExp = 0;
      let bags = state.bags;
      let finalOutcome: 'victory' | 'defeat' | 'retreat' = 'victory';
      let currentInventory = state.party.inventory;
      let currentGold = state.party.gold;
      let totalAutoSellProfit = 0;
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

            // Loot-Gate check before Elite/Boss rooms (room 4 of each floor)
            if (roomDef.type === 'battle_Elite' || roomDef.type === 'battle_Boss') {
              const tier = dungeon.enemyPoolIds[0]; // dungeon tier
              let gateRequired: number;
              let gateRarity: 'uncommon' | 'rare';
              if (roomDef.type === 'battle_Boss') {
                gateRequired = 5;
                gateRarity = 'rare';
              } else {
                gateRequired = ELITE_GATE_REQUIREMENTS[floor.floorNumber] ?? 6;
                gateRarity = 'uncommon';
              }
              const collected = countItemsOfRarity(currentInventory, tier, gateRarity);
              if (collected < gateRequired) {
                // Gate locked - expedition ends
                const rarityLabel = gateRarity === 'rare' ? 'レアアイテム' : 'アンコモンアイテム';
                const gateEntry: ExpeditionLogEntry = {
                  room: roomCounter,
                  floor: floor.floorNumber,
                  roomInFloor: roomIndex + 1,
                  roomType: roomDef.type,
                  floorMultiplier: floor.multiplier,
                  enemyName: '[扉が封印されている]',
                  enemyHP: 0,
                  enemyAttackValues: '',
                  outcome: 'draw', // Not a battle - displayed as 未到達
                  damageDealt: 0,
                  damageTaken: 0,
                  remainingPartyHP: currentHp,
                  maxPartyHP: partyStats.hp,
                  details: [],
                  gateInfo: `${rarityLabel} ${collected}/${gateRequired} 収集`,
                };
                entries.push(gateEntry);
                finalOutcome = 'retreat';
                expeditionEnded = true;
                break;
              }
            }

            // Select enemy for this room
            const baseEnemy = selectEnemyForRoom(roomDef.type, roomDef.poolId, roomDef.bossId);
            if (!baseEnemy) continue;

            // Apply floor multiplier to enemy stats
            const enemy = applyFloorMultiplier(baseEnemy, floor.multiplier);

            // Pass currentHp to maintain HP persistence during expedition
            const battleResult = executeBattle(state.party, enemy, bags, currentHp);

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
              floorMultiplier: floor.multiplier,
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

              // Reward logic based on room type
              const isNormalRoom = roomDef.type === 'battle_Normal';
              const rewardBagType = isNormalRoom ? 'commonRewardBag' : 'rewardBag';
              const enhancementBagType = isNormalRoom ? 'commonEnhancementBag' : 'enhancementBag';

              // Check for reward
              bags = refillBagIfEmpty(bags, rewardBagType);
              const { ticket: rewardTicket, newBag: newRewardBag } = drawFromBag(bags[rewardBagType]);
              bags = { ...bags, [rewardBagType]: newRewardBag };

              const { characterStats } = computePartyStats(state.party);
              const hasUnlock = characterStats.some(cs => cs.abilities.some(a => a.id === 'unlock'));

              let gotReward = rewardTicket === 1;
              if (!gotReward && hasUnlock) {
                bags = refillBagIfEmpty(bags, rewardBagType);
                const { ticket: unlockTicket, newBag } = drawFromBag(bags[rewardBagType]);
                bags = { ...bags, [rewardBagType]: newBag };
                gotReward = unlockTicket === 1;
              }

              if (gotReward && enemy.dropItemId) {
                bags = refillBagIfEmpty(bags, enhancementBagType);
                const { ticket: enhVal, newBag: newEnhBag } = drawFromBag(bags[enhancementBagType]);
                bags = { ...bags, [enhancementBagType]: newEnhBag };

                bags = refillBagIfEmpty(bags, 'superRareBag');
                const { ticket: srVal, newBag: newSRBag } = drawFromBag(bags.superRareBag);
                bags = { ...bags, superRareBag: newSRBag };

                const baseItem = getItemById(enemy.dropItemId);
                if (baseItem) {
                  const newItem: Item = { ...baseItem, enhancement: enhVal, superRare: srVal };
                  entry.reward = getItemDisplayName(newItem);

                  const result = addItemToInventory(currentInventory, newItem, currentGold);
                  currentInventory = result.inventory;
                  currentGold = result.gold;
                  totalAutoSellProfit += result.autoSellProfit;

                  if (!result.wasAutoSold) {
                    rewards.push(newItem);
                  }
                }
              }

              currentHp = battleResult.partyHp;
              entries.push(entry);

              // Heal 20% of missing HP after Elite rooms
              if (roomDef.type === 'battle_Elite') {
                const missingHp = partyStats.hp - currentHp;
                const healAmount = Math.floor(missingHp * 0.2);
                if (healAmount > 0) {
                  currentHp = currentHp + healAmount;
                  entry.healAmount = healAmount;
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
      } else {
        // Legacy expedition logic for backward compatibility
        const totalRooms = dungeon.numberOfRooms;

        for (let room = 1; room <= totalRooms + 1; room++) {
          const enemy = selectEnemy(dungeon.id, room, totalRooms);
          if (!enemy) break;

          const battleResult = executeBattle(state.party, enemy, bags, currentHp);
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

            bags = refillBagIfEmpty(bags, 'rewardBag');
            const { ticket: rewardTicket, newBag: newRewardBag } = drawFromBag(bags.rewardBag);
            bags = { ...bags, rewardBag: newRewardBag };

            const { characterStats } = computePartyStats(state.party);
            const hasUnlock = characterStats.some(cs => cs.abilities.some(a => a.id === 'unlock'));

            let gotReward = rewardTicket === 1;
            if (!gotReward && hasUnlock) {
              bags = refillBagIfEmpty(bags, 'rewardBag');
              const { ticket: unlockTicket, newBag } = drawFromBag(bags.rewardBag);
              bags = { ...bags, rewardBag: newBag };
              gotReward = unlockTicket === 1;
            }

            if (gotReward && enemy.dropItemId) {
              bags = refillBagIfEmpty(bags, 'enhancementBag');
              const { ticket: enhVal, newBag: newEnhBag } = drawFromBag(bags.enhancementBag);
              bags = { ...bags, enhancementBag: newEnhBag };

              bags = refillBagIfEmpty(bags, 'superRareBag');
              const { ticket: srVal, newBag: newSRBag } = drawFromBag(bags.superRareBag);
              bags = { ...bags, superRareBag: newSRBag };

              const baseItem = getItemById(enemy.dropItemId);
              if (baseItem) {
                const newItem: Item = { ...baseItem, enhancement: enhVal, superRare: srVal };
                entry.reward = getItemDisplayName(newItem);

                const result = addItemToInventory(currentInventory, newItem, currentGold);
                currentInventory = result.inventory;
                currentGold = result.gold;
                totalAutoSellProfit += result.autoSellProfit;

                if (!result.wasAutoSold) {
                  rewards.push(newItem);
                }
              }
            }

            currentHp = battleResult.partyHp;
            entries.push(entry);
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
      const finalInventory = isDefeat ? state.party.inventory : currentInventory;
      const finalGold = isDefeat ? state.party.gold : currentGold;
      const finalRewards = isDefeat ? [] : rewards;
      const finalAutoSellProfit = isDefeat ? 0 : totalAutoSellProfit;

      // Update level
      let newExp = state.party.experience + totalExp;
      let newLevel = state.party.level;
      while (newLevel < 29 && newExp >= LEVEL_EXP[newLevel]) {
        newLevel++;
      }

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
        remainingPartyHP: currentHp,
        maxPartyHP: partyStats.hp,
      };

      return {
        ...state,
        bags,
        party: {
          ...state.party,
          level: newLevel,
          experience: newExp,
          inventory: finalInventory,
          gold: finalGold,
        },
        lastExpeditionLog: log,
      };
    }

    case 'EQUIP_ITEM': {
      const charIndex = state.party.characters.findIndex(c => c.id === action.characterId);
      if (charIndex === -1) return state;

      const character = state.party.characters[charIndex];
      const newEquipment = [...character.equipment];
      let newInventory = { ...state.party.inventory };

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

      const newCharacters = [...state.party.characters];
      newCharacters[charIndex] = { ...character, equipment: newEquipment };

      return {
        ...state,
        party: { ...state.party, characters: newCharacters, inventory: newInventory },
      };
    }

    case 'UPDATE_CHARACTER': {
      const charIndex = state.party.characters.findIndex(c => c.id === action.characterId);
      if (charIndex === -1) return state;

      const oldChar = state.party.characters[charIndex];
      const newCharacters = [...state.party.characters];

      // If race/class/etc changed, remove all equipment
      const isCharacterChanged =
        (action.updates.raceId && action.updates.raceId !== oldChar.raceId) ||
        (action.updates.mainClassId && action.updates.mainClassId !== oldChar.mainClassId) ||
        (action.updates.subClassId && action.updates.subClassId !== oldChar.subClassId) ||
        (action.updates.predispositionId && action.updates.predispositionId !== oldChar.predispositionId) ||
        (action.updates.lineageId && action.updates.lineageId !== oldChar.lineageId);

      let newInventory = state.party.inventory;
      let newEquipment = oldChar.equipment;

      if (isCharacterChanged) {
        // Return equipment to inventory
        newInventory = { ...state.party.inventory };
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

      return {
        ...state,
        party: { ...state.party, characters: newCharacters, inventory: newInventory },
      };
    }

    case 'SELL_STACK': {
      const variant = state.party.inventory[action.variantKey];
      if (!variant || variant.count <= 0) return state;

      const sellPrice = calculateSellPrice(variant.item) * variant.count;

      const newInventory = { ...state.party.inventory };
      newInventory[action.variantKey] = {
        ...variant,
        count: 0,
        status: 'sold',
      };

      return {
        ...state,
        party: { ...state.party, inventory: newInventory, gold: state.party.gold + sellPrice },
      };
    }

    case 'SET_VARIANT_STATUS': {
      const variant = state.party.inventory[action.variantKey];
      if (!variant) return state;

      const newInventory = { ...state.party.inventory };
      newInventory[action.variantKey] = {
        ...variant,
        status: action.status,
      };

      return {
        ...state,
        party: { ...state.party, inventory: newInventory },
      };
    }

    case 'MARK_ITEMS_SEEN': {
      const newInventory: InventoryRecord = {};
      for (const [key, variant] of Object.entries(state.party.inventory)) {
        newInventory[key] = { ...variant, isNew: false };
      }
      return {
        ...state,
        party: { ...state.party, inventory: newInventory },
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
        party: createInitialParty(),
        bags: {
          commonRewardBag: createCommonRewardBag(),
          commonEnhancementBag: createCommonEnhancementBag(),
          rewardBag: createRewardBag(),
          enhancementBag: createEnhancementBag(),
          superRareBag: createSuperRareBag(),
          physicalThreatBag: createPhysicalThreatBag(),
          magicalThreatBag: createMagicalThreatBag(),
        },
        selectedDungeonId: 1,
        lastExpeditionLog: null,
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
          rewardBag: createRewardBag(),
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
    isPositive?: boolean
  ) => {
    const notification: GameNotification = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message,
      style,
      category,
      isPositive,
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
    selectDungeon: useCallback((dungeonId: number) => {
      dispatch({ type: 'SELECT_DUNGEON', dungeonId });
    }, []),

    runExpedition: useCallback(() => {
      dispatch({ type: 'RUN_EXPEDITION' });
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
