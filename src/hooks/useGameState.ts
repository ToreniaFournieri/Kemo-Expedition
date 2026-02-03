import { useReducer, useCallback } from 'react';
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
} from '../types';
import { computePartyStats } from '../game/partyComputation';
import { executeBattle } from '../game/battle';
import { getDungeonById } from '../data/dungeons';
import { getEnemiesByPool, getBossEnemy } from '../data/enemies';
import { drawFromBag, refillBagIfEmpty, createRewardBag, createEnhancementBag, createSuperRareBag } from '../game/bags';
import { getItemById, ENHANCEMENT_TITLES, SUPER_RARE_TITLES } from '../data/items';
import { getItemDisplayName } from '../game/gameState';

const BUILD_NUMBER = 1;

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

  return {
    deityName: '再生の神',
    level: 1,
    experience: 0,
    characters,
    quiverSlots: [
      { item: { ...getItemById(80)!, enhancement: 0, superRare: 0 }, quantity: 50 },
      null,
    ] as [{ item: Item; quantity: number } | null, { item: Item; quantity: number } | null],
    inventory: starterItems,
    gold: 100,
  };
}

function createInitialState(): GameState {
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
  | { type: 'EQUIP_ITEM'; characterId: number; slotIndex: number; item: Item | null }
  | { type: 'UPDATE_CHARACTER'; characterId: number; updates: Partial<Character> }
  | { type: 'SELL_ITEM'; itemIndex: number }
  | { type: 'BUY_ARROWS'; arrowId: number; quantity: number }
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

      // Run through all rooms + boss
      for (let room = 1; room <= totalRooms + 1; room++) {
        const enemy = selectEnemy(dungeon.id, room, totalRooms);
        if (!enemy) break;

        const battleResult = executeBattle(state.party, enemy, quiverQty);
        const damageDealt = enemy.hp - Math.max(0, battleResult.enemyHp);
        const damageTaken = currentHp - battleResult.partyHp;

        const entry: ExpeditionLogEntry = {
          room,
          enemyName: enemy.name + (room > totalRooms ? ' (BOSS)' : ''),
          outcome: battleResult.outcome!,
          damageDealt,
          damageTaken,
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
              const newItem: Item = { ...baseItem, enhancement: enhVal, superRare: srVal, isNew: true };
              rewards.push(newItem);
              entry.reward = getItemDisplayName(newItem);
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
      };

      return {
        ...state,
        bags,
        party: {
          ...state.party,
          level: newLevel,
          experience: newExp,
          inventory: [...state.party.inventory, ...rewards],
        },
        lastExpeditionLog: log,
      };
    }

    case 'EQUIP_ITEM': {
      const charIndex = state.party.characters.findIndex(c => c.id === action.characterId);
      if (charIndex === -1) return state;

      const character = state.party.characters[charIndex];
      const newEquipment = [...character.equipment];
      let newInventory = [...state.party.inventory];

      // Add old item back to inventory
      const oldItem = newEquipment[action.slotIndex];
      if (oldItem) {
        newInventory.push(oldItem);
      }

      // Remove new item from inventory and equip
      if (action.item) {
        const invIndex = newInventory.findIndex(
          i => i.id === action.item!.id && i.enhancement === action.item!.enhancement && i.superRare === action.item!.superRare
        );
        if (invIndex !== -1) {
          newInventory.splice(invIndex, 1);
        }
      }

      newEquipment[action.slotIndex] = action.item;

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
        newInventory = [...state.party.inventory, ...oldChar.equipment.filter((e): e is Item => e !== null)];
        newEquipment = [];
      }

      newCharacters[charIndex] = { ...oldChar, ...action.updates, equipment: newEquipment };

      return {
        ...state,
        party: { ...state.party, characters: newCharacters, inventory: newInventory },
      };
    }

    case 'SELL_ITEM': {
      const item = state.party.inventory[action.itemIndex];
      if (!item) return state;

      const enhMult = ENHANCEMENT_TITLES.find(t => t.value === item.enhancement)?.multiplier ?? 1;
      const srMult = SUPER_RARE_TITLES.find(t => t.value === item.superRare)?.multiplier ?? 1;
      const sellPrice = Math.floor(10 * enhMult * srMult);

      const newInventory = [...state.party.inventory];
      newInventory.splice(action.itemIndex, 1);

      return {
        ...state,
        party: { ...state.party, inventory: newInventory, gold: state.party.gold + sellPrice },
      };
    }

    case 'BUY_ARROWS': {
      const arrowDef = getItemById(action.arrowId);
      if (!arrowDef || arrowDef.category !== 'arrow') return state;

      const cost = action.quantity * 2;
      if (state.party.gold < cost) return state;

      const newQuiverSlots = [...state.party.quiverSlots] as typeof state.party.quiverSlots;

      // Find matching or empty slot
      let targetSlot = -1;
      for (let i = 0; i < 2; i++) {
        if (newQuiverSlots[i]?.item.id === action.arrowId) {
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

      if (targetSlot === -1) return state;

      const maxStack = arrowDef.maxStack ?? 99;
      if (newQuiverSlots[targetSlot]) {
        newQuiverSlots[targetSlot] = {
          ...newQuiverSlots[targetSlot]!,
          quantity: Math.min(newQuiverSlots[targetSlot]!.quantity + action.quantity, maxStack),
        };
      } else {
        newQuiverSlots[targetSlot] = {
          item: { ...arrowDef, enhancement: 0, superRare: 0 },
          quantity: action.quantity,
        };
      }

      return {
        ...state,
        party: { ...state.party, quiverSlots: newQuiverSlots, gold: state.party.gold - cost },
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
      const newInventory = state.party.inventory.map(item => ({ ...item, isNew: false }));
      return {
        ...state,
        party: { ...state.party, inventory: newInventory },
      };
    }

    case 'RESET_GAME':
      return createInitialState();

    default:
      return state;
  }
}

export function useGameState() {
  const [state, dispatch] = useReducer(gameReducer, null, createInitialState);

  const actions = {
    selectDungeon: useCallback((dungeonId: number) => {
      dispatch({ type: 'SELECT_DUNGEON', dungeonId });
    }, []),

    runExpedition: useCallback(() => {
      dispatch({ type: 'RUN_EXPEDITION' });
    }, []),

    equipItem: useCallback((characterId: number, slotIndex: number, item: Item | null) => {
      dispatch({ type: 'EQUIP_ITEM', characterId, slotIndex, item });
    }, []),

    updateCharacter: useCallback((characterId: number, updates: Partial<Character>) => {
      dispatch({ type: 'UPDATE_CHARACTER', characterId, updates });
    }, []),

    sellItem: useCallback((itemIndex: number) => {
      dispatch({ type: 'SELL_ITEM', itemIndex });
    }, []),

    buyArrows: useCallback((arrowId: number, quantity: number) => {
      dispatch({ type: 'BUY_ARROWS', arrowId, quantity });
    }, []),

    removeQuiverSlot: useCallback((slotIndex: number) => {
      dispatch({ type: 'REMOVE_QUIVER_SLOT', slotIndex });
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
