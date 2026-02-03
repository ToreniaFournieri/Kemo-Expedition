import { useReducer, useCallback } from 'react';
import {
  GameState,
  Item,
  Character,
  RaceId,
  ClassId,
  PredispositionId,
  LineageId,
} from '../types';
import {
  createInitialGameState,
  startExpedition,
  equipItem,
} from '../game/gameState';
import { computePartyStats } from '../game/partyComputation';
import { executeBattle } from '../game/battle';
import { getDungeonById } from '../data/dungeons';
import { getEnemiesByPool, getBossEnemy } from '../data/enemies';
import { drawFromBag, refillBagIfEmpty } from '../game/bags';
import { getItemById, ENHANCEMENT_TITLES, SUPER_RARE_TITLES } from '../data/items';

type GameAction =
  | { type: 'START_EXPEDITION'; dungeonId: number }
  | { type: 'ENTER_ROOM' }
  | { type: 'PROCEED_AFTER_BATTLE' }
  | { type: 'RETREAT' }
  | { type: 'EQUIP_ITEM'; characterId: number; slotIndex: number; item: Item | null }
  | { type: 'UPDATE_CHARACTER'; characterId: number; updates: Partial<Character> }
  | { type: 'SELL_ITEM'; item: Item }
  | { type: 'BUY_ARROWS'; arrowId: number; quantity: number }
  | { type: 'SET_QUIVER'; slotIndex: number; item: Item | null; quantity: number }
  | { type: 'RESET_GAME' };

function selectEnemy(dungeonId: number, room: number) {
  const dungeon = getDungeonById(dungeonId);
  if (!dungeon) return null;

  if (room > dungeon.numberOfRooms) {
    return getBossEnemy(dungeon.bossId);
  }

  const poolId = dungeon.enemyPoolIds[0];
  const enemies = getEnemiesByPool(poolId);
  const randomIndex = Math.floor(Math.random() * enemies.length);
  return enemies[randomIndex];
}

const LEVEL_EXP: number[] = [
  0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200,
  4000, 5000, 6200, 7600, 9200, 11000, 13000, 15500, 18500, 22000,
  26000, 30500, 35500, 41000, 47000, 53500, 60500, 68000, 76000
];

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_EXPEDITION':
      return startExpedition(state, action.dungeonId);

    case 'ENTER_ROOM': {
      if (!state.expedition) return state;

      const enemy = selectEnemy(state.expedition.dungeonId, state.expedition.currentRoom);
      if (!enemy) return state;

      const battleResult = executeBattle(
        state.party,
        enemy,
        state.expedition.quiverQuantities
      );

      return {
        ...state,
        scene: 'battle',
        battle: battleResult,
        expedition: {
          ...state.expedition,
          partyHp: battleResult.partyHp,
        },
      };
    }

    case 'PROCEED_AFTER_BATTLE': {
      if (!state.expedition || !state.battle) return state;

      const dungeon = getDungeonById(state.expedition.dungeonId);
      if (!dungeon) return state;

      const enemy = selectEnemy(state.expedition.dungeonId, state.expedition.currentRoom);
      if (!enemy) return state;

      switch (state.battle.outcome) {
        case 'victory': {
          const newExp = state.expedition.experienceGained + enemy.experience;
          let newBags = state.bags;
          let newRewards = [...state.expedition.rewards];

          // Draw reward ticket
          newBags = refillBagIfEmpty(newBags, 'rewardBag');
          const { ticket: rewardTicket, newBag: newRewardBag } = drawFromBag(newBags.rewardBag);
          newBags = { ...newBags, rewardBag: newRewardBag };

          const { characterStats } = computePartyStats(state.party);
          const hasUnlock = characterStats.some(cs => cs.abilities.some(a => a.id === 'unlock'));

          let gotReward = rewardTicket === 1;
          if (!gotReward && hasUnlock) {
            newBags = refillBagIfEmpty(newBags, 'rewardBag');
            const { ticket: unlockTicket, newBag } = drawFromBag(newBags.rewardBag);
            newBags = { ...newBags, rewardBag: newBag };
            gotReward = unlockTicket === 1;
          }

          if (gotReward && enemy.dropItemId) {
            newBags = refillBagIfEmpty(newBags, 'enhancementBag');
            const { ticket: enhancementValue, newBag: newEnhBag } = drawFromBag(newBags.enhancementBag);
            newBags = { ...newBags, enhancementBag: newEnhBag };

            newBags = refillBagIfEmpty(newBags, 'superRareBag');
            const { ticket: superRareValue, newBag: newSRBag } = drawFromBag(newBags.superRareBag);
            newBags = { ...newBags, superRareBag: newSRBag };

            const baseItem = getItemById(enemy.dropItemId);
            if (baseItem) {
              newRewards.push({
                ...baseItem,
                enhancement: enhancementValue,
                superRare: superRareValue,
              });
            }
          }

          const isBossDefeated = state.expedition.currentRoom > dungeon.numberOfRooms;

          if (isBossDefeated) {
            let finalExp = state.party.experience + newExp;
            let finalLevel = state.party.level;
            while (finalLevel < 29 && finalExp >= LEVEL_EXP[finalLevel]) {
              finalLevel++;
            }

            return {
              ...state,
              scene: 'home',
              bags: newBags,
              party: {
                ...state.party,
                level: finalLevel,
                experience: finalExp,
                inventory: [...state.party.inventory, ...newRewards],
              },
              expedition: null,
              battle: null,
            };
          }

          return {
            ...state,
            scene: 'expedition',
            bags: newBags,
            battle: null,
            expedition: {
              ...state.expedition,
              currentRoom: state.expedition.currentRoom + 1,
              experienceGained: newExp,
              rewards: newRewards,
            },
          };
        }

        case 'defeat':
          return {
            ...state,
            scene: 'home',
            expedition: null,
            battle: null,
          };

        case 'draw': {
          let finalExp = state.party.experience + state.expedition.experienceGained;
          let finalLevel = state.party.level;
          while (finalLevel < 29 && finalExp >= LEVEL_EXP[finalLevel]) {
            finalLevel++;
          }

          return {
            ...state,
            scene: 'home',
            party: {
              ...state.party,
              level: finalLevel,
              experience: finalExp,
              inventory: [...state.party.inventory, ...state.expedition.rewards],
            },
            expedition: null,
            battle: null,
          };
        }

        default:
          return state;
      }
    }

    case 'RETREAT': {
      if (!state.expedition) return state;

      let finalExp = state.party.experience + state.expedition.experienceGained;
      let finalLevel = state.party.level;
      while (finalLevel < 29 && finalExp >= LEVEL_EXP[finalLevel]) {
        finalLevel++;
      }

      return {
        ...state,
        scene: 'home',
        party: {
          ...state.party,
          level: finalLevel,
          experience: finalExp,
          inventory: [...state.party.inventory, ...state.expedition.rewards],
        },
        expedition: null,
        battle: null,
      };
    }

    case 'EQUIP_ITEM':
      return equipItem(state, action.characterId, action.slotIndex, action.item);

    case 'UPDATE_CHARACTER': {
      const charIndex = state.party.characters.findIndex(c => c.id === action.characterId);
      if (charIndex === -1) return state;

      const newCharacters = [...state.party.characters];
      newCharacters[charIndex] = {
        ...newCharacters[charIndex],
        ...action.updates,
      };

      return {
        ...state,
        party: {
          ...state.party,
          characters: newCharacters,
        },
      };
    }

    case 'SELL_ITEM': {
      const itemIndex = state.party.inventory.findIndex(
        i => i.id === action.item.id &&
          i.enhancement === action.item.enhancement &&
          i.superRare === action.item.superRare
      );
      if (itemIndex === -1) return state;

      const enhMult = ENHANCEMENT_TITLES.find(t => t.value === action.item.enhancement)?.multiplier ?? 1;
      const srMult = SUPER_RARE_TITLES.find(t => t.value === action.item.superRare)?.multiplier ?? 1;
      const sellPrice = Math.floor(10 * enhMult * srMult);

      const newInventory = [...state.party.inventory];
      newInventory.splice(itemIndex, 1);

      return {
        ...state,
        party: {
          ...state.party,
          inventory: newInventory,
          gold: state.party.gold + sellPrice,
        },
      };
    }

    case 'BUY_ARROWS': {
      const arrowDef = getItemById(action.arrowId);
      if (!arrowDef || arrowDef.category !== 'arrow') return state;

      const cost = action.quantity * 2; // 2 gold per arrow
      if (state.party.gold < cost) return state;

      // Add to quiver
      const newQuiverSlots = [...state.party.quiverSlots] as typeof state.party.quiverSlots;

      // Find matching slot or empty slot
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

      if (newQuiverSlots[targetSlot]) {
        const maxStack = arrowDef.maxStack ?? 99;
        const newQty = Math.min(newQuiverSlots[targetSlot]!.quantity + action.quantity, maxStack);
        newQuiverSlots[targetSlot] = {
          ...newQuiverSlots[targetSlot]!,
          quantity: newQty,
        };
      } else {
        newQuiverSlots[targetSlot] = {
          item: { ...arrowDef, enhancement: 0, superRare: 0 },
          quantity: action.quantity,
        };
      }

      return {
        ...state,
        party: {
          ...state.party,
          quiverSlots: newQuiverSlots,
          gold: state.party.gold - cost,
        },
      };
    }

    case 'SET_QUIVER': {
      const newQuiverSlots = [...state.party.quiverSlots] as typeof state.party.quiverSlots;
      if (action.item) {
        newQuiverSlots[action.slotIndex] = {
          item: action.item,
          quantity: action.quantity,
        };
      } else {
        newQuiverSlots[action.slotIndex] = null;
      }

      return {
        ...state,
        party: {
          ...state.party,
          quiverSlots: newQuiverSlots,
        },
      };
    }

    case 'RESET_GAME':
      return createInitialGameState();

    default:
      return state;
  }
}

export function useGameState() {
  const [state, dispatch] = useReducer(gameReducer, null, createInitialGameState);

  const actions = {
    startExpedition: useCallback((dungeonId: number) => {
      dispatch({ type: 'START_EXPEDITION', dungeonId });
    }, []),

    enterRoom: useCallback(() => {
      dispatch({ type: 'ENTER_ROOM' });
    }, []),

    proceedAfterBattle: useCallback(() => {
      dispatch({ type: 'PROCEED_AFTER_BATTLE' });
    }, []),

    retreat: useCallback(() => {
      dispatch({ type: 'RETREAT' });
    }, []),

    equipItem: useCallback((characterId: number, slotIndex: number, item: Item | null) => {
      dispatch({ type: 'EQUIP_ITEM', characterId, slotIndex, item });
    }, []),

    updateCharacter: useCallback((characterId: number, updates: {
      name?: string;
      raceId?: RaceId;
      mainClassId?: ClassId;
      subClassId?: ClassId;
      predispositionId?: PredispositionId;
      lineageId?: LineageId;
    }) => {
      dispatch({ type: 'UPDATE_CHARACTER', characterId, updates });
    }, []),

    sellItem: useCallback((item: Item) => {
      dispatch({ type: 'SELL_ITEM', item });
    }, []),

    buyArrows: useCallback((arrowId: number, quantity: number) => {
      dispatch({ type: 'BUY_ARROWS', arrowId, quantity });
    }, []),

    setQuiver: useCallback((slotIndex: number, item: Item | null, quantity: number) => {
      dispatch({ type: 'SET_QUIVER', slotIndex, item, quantity });
    }, []),

    resetGame: useCallback(() => {
      dispatch({ type: 'RESET_GAME' });
    }, []),
  };

  return { state, actions };
}
