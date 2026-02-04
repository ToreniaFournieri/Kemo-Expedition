import { useReducer, useCallback, useEffect } from 'react';
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
  getVariantKey,
} from '../types';
import { computePartyStats } from '../game/partyComputation';
import { executeBattle, calculateEnemyAttackValues } from '../game/battle';
import { getDungeonById } from '../data/dungeons';
import { getEnemiesByPool, getBossEnemy } from '../data/enemies';
import { drawFromBag, refillBagIfEmpty, createRewardBag, createEnhancementBag, createSuperRareBag } from '../game/bags';
import { getItemById, ENHANCEMENT_TITLES, SUPER_RARE_TITLES } from '../data/items';
import { getItemDisplayName } from '../game/gameState';

const BUILD_NUMBER = 10;
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
    { race: 'caninian', main: 'fighter', sub: 'fighter', pred: 'sturdy', lineage: 'unmoving', name: 'レオン' },
    { race: 'vulpinian', main: 'duelist', sub: 'ninja', pred: 'chivalric', lineage: 'steel_oath', name: 'キツネ丸' },
    { race: 'leporian', main: 'ranger', sub: 'rogue', pred: 'dexterous', lineage: 'far_sight', name: 'ミミ' },
    { race: 'cervin', main: 'wizard', sub: 'sage', pred: 'brilliant', lineage: 'guiding_thought', name: 'セルヴァ' },
    { race: 'felidian', main: 'sage', sub: 'wizard', pred: 'pursuing', lineage: 'hidden_principles', name: 'ニャンコ' },
    { race: 'mustelid', main: 'pilgrim', sub: 'lord', pred: 'persistent', lineage: 'inherited_oaths', name: 'イタチ' },
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
  const starterItems: Item[] = [
    { ...getItemById(1)!, enhancement: 0, superRare: 0 },
    { ...getItemById(1)!, enhancement: 0, superRare: 0 },
    { ...getItemById(20)!, enhancement: 0, superRare: 0 },
    { ...getItemById(50)!, enhancement: 0, superRare: 0 },
    { ...getItemById(30)!, enhancement: 0, superRare: 0 },
    { ...getItemById(60)!, enhancement: 0, superRare: 0 },
    { ...getItemById(70)!, enhancement: 0, superRare: 0 },
    { ...getItemById(40)!, enhancement: 0, superRare: 0 },
  ];

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
    quiverSlots: [
      { item: { ...getItemById(80)!, enhancement: 0, superRare: 0 }, quantity: 50 },
      null,
    ] as [{ item: Item; quantity: number } | null, { item: Item; quantity: number } | null],
    inventory,
    gold: 100,
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
      rewardBag: createRewardBag(),
      enhancementBag: createEnhancementBag(),
      superRareBag: createSuperRareBag(),
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
  | { type: 'BUY_ARROWS'; arrowId: number; quantity: number }
  | { type: 'ASSIGN_ARROW_TO_QUIVER'; variantKey: string; quantity: number }
  | { type: 'REMOVE_QUIVER_SLOT'; slotIndex: number }
  | { type: 'MARK_ITEMS_SEEN' }
  | { type: 'RESET_GAME' };

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
      const quiverQty: [number, number] = [
        state.party.quiverSlots[0]?.quantity ?? 0,
        state.party.quiverSlots[1]?.quantity ?? 0,
      ];

      const entries: ExpeditionLogEntry[] = [];
      const rewards: Item[] = [];
      let totalExp = 0;
      let bags = state.bags;
      let finalOutcome: 'victory' | 'defeat' | 'retreat' = 'victory';
      const totalRooms = dungeon.numberOfRooms;
      let currentInventory = state.party.inventory;
      let currentGold = state.party.gold;
      let totalAutoSellProfit = 0;

      // Run through all rooms + boss
      for (let room = 1; room <= totalRooms + 1; room++) {
        const enemy = selectEnemy(dungeon.id, room, totalRooms);
        if (!enemy) break;

        const battleResult = executeBattle(state.party, enemy, quiverQty);
        const damageDealt = enemy.hp - Math.max(0, battleResult.enemyHp);
        const damageTaken = currentHp - battleResult.partyHp;

        // Calculate enemy attack values for display
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

          // Check for reward
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
              rewards.push(newItem);
              entry.reward = getItemDisplayName(newItem);

              // Add to inventory (handles auto-sell)
              const result = addItemToInventory(currentInventory, newItem, currentGold);
              currentInventory = result.inventory;
              currentGold = result.gold;
              totalAutoSellProfit += result.autoSellProfit;
            }
          }

          currentHp = battleResult.partyHp;
          entries.push(entry);
        } else if (battleResult.outcome === 'defeat') {
          entries.push(entry);
          finalOutcome = 'defeat';
          break;
        } else {
          // Draw
          entries.push(entry);
          finalOutcome = 'retreat';
          break;
        }
      }

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
        totalRooms: totalRooms + 1,
        completedRooms: entries.length,
        finalOutcome,
        entries,
        rewards,
        autoSellProfit: totalAutoSellProfit,
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
          inventory: currentInventory,
          gold: currentGold,
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

    case 'BUY_ARROWS': {
      // Buy arrows and add to inventory
      const arrowDef = getItemById(action.arrowId);
      if (!arrowDef || arrowDef.category !== 'arrow') return state;

      const cost = action.quantity * 2;
      if (state.party.gold < cost) return state;

      const arrowItem: Item = { ...arrowDef, enhancement: 0, superRare: 0 };
      const key = getVariantKey(arrowItem);
      const newInventory = { ...state.party.inventory };
      const existing = newInventory[key];

      if (existing) {
        newInventory[key] = {
          ...existing,
          count: existing.count + action.quantity,
          status: 'owned',
        };
      } else {
        newInventory[key] = {
          item: arrowItem,
          count: action.quantity,
          status: 'owned',
        };
      }

      return {
        ...state,
        party: { ...state.party, inventory: newInventory, gold: state.party.gold - cost },
      };
    }

    case 'ASSIGN_ARROW_TO_QUIVER': {
      // Move arrows from inventory to quiver slot
      const variant = state.party.inventory[action.variantKey];
      if (!variant || variant.count < action.quantity || variant.item.category !== 'arrow') return state;

      const newQuiverSlots = [...state.party.quiverSlots] as typeof state.party.quiverSlots;

      // Find matching slot or empty slot
      let targetSlot = -1;
      for (let i = 0; i < 2; i++) {
        if (newQuiverSlots[i]?.item.id === variant.item.id) {
          targetSlot = i;
          break;
        }
      }
      if (targetSlot === -1) {
        for (let i = 0; i < 2; i++) {
          if (!newQuiverSlots[i]) {
            targetSlot = i;
            break;
          }
        }
      }

      if (targetSlot === -1) return state; // No available slot

      const maxStack = variant.item.maxStack ?? 99;
      const currentQty = newQuiverSlots[targetSlot]?.quantity ?? 0;
      const canAdd = Math.min(action.quantity, maxStack - currentQty);

      if (canAdd <= 0) return state; // Slot is full

      // Update quiver slot
      if (newQuiverSlots[targetSlot]) {
        newQuiverSlots[targetSlot] = {
          ...newQuiverSlots[targetSlot]!,
          quantity: currentQty + canAdd,
        };
      } else {
        newQuiverSlots[targetSlot] = {
          item: { ...variant.item },
          quantity: canAdd,
        };
      }

      // Remove from inventory
      const newInventory = { ...state.party.inventory };
      const newCount = variant.count - canAdd;
      if (newCount <= 0) {
        newInventory[action.variantKey] = { ...variant, count: 0, status: 'notown' };
      } else {
        newInventory[action.variantKey] = { ...variant, count: newCount };
      }

      return {
        ...state,
        party: { ...state.party, quiverSlots: newQuiverSlots, inventory: newInventory },
      };
    }

    case 'REMOVE_QUIVER_SLOT': {
      const newQuiverSlots = [...state.party.quiverSlots] as typeof state.party.quiverSlots;
      newQuiverSlots[action.slotIndex] = null;

      // Move slot 2 to slot 1 if slot 1 is removed
      if (action.slotIndex === 0 && newQuiverSlots[1]) {
        newQuiverSlots[0] = newQuiverSlots[1];
        newQuiverSlots[1] = null;
      }

      return {
        ...state,
        party: { ...state.party, quiverSlots: newQuiverSlots },
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
          rewardBag: createRewardBag(),
          enhancementBag: createEnhancementBag(),
          superRareBag: createSuperRareBag(),
        },
        selectedDungeonId: 1,
        lastExpeditionLog: null,
        buildNumber: BUILD_NUMBER,
      };
    }

    default:
      return state;
  }
}

export function useGameState() {
  const [state, dispatch] = useReducer(gameReducer, null, createInitialState);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    saveState(state);
  }, [state]);

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

    buyArrows: useCallback((arrowId: number, quantity: number) => {
      dispatch({ type: 'BUY_ARROWS', arrowId, quantity });
    }, []),

    removeQuiverSlot: useCallback((slotIndex: number) => {
      dispatch({ type: 'REMOVE_QUIVER_SLOT', slotIndex });
    }, []),

    assignArrowToQuiver: useCallback((variantKey: string, quantity: number) => {
      dispatch({ type: 'ASSIGN_ARROW_TO_QUIVER', variantKey, quantity });
    }, []),

    markItemsSeen: useCallback(() => {
      dispatch({ type: 'MARK_ITEMS_SEEN' });
    }, []),

    resetGame: useCallback(() => {
      dispatch({ type: 'RESET_GAME' });
    }, []),
  };

  return { state, actions, bags: state.bags };
}
