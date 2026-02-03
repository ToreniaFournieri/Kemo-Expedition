import {
  GameState,
  Party,
  Character,
  Item,
  Dungeon,
  EnemyDef,
} from '../types';
import { initializeBags, drawFromBag, refillBagIfEmpty } from './bags';
import { executeBattle } from './battle';
import { computePartyStats } from './partyComputation';
import { getDungeonById } from '../data/dungeons';
import { getEnemiesByPool, getBossEnemy } from '../data/enemies';
import { getItemById, ENHANCEMENT_TITLES, SUPER_RARE_TITLES } from '../data/items';

// Experience required for each level
const LEVEL_EXP: number[] = [
  0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200,
  4000, 5000, 6200, 7600, 9200, 11000, 13000, 15500, 18500, 22000,
  26000, 30500, 35500, 41000, 47000, 53500, 60500, 68000, 76000
];

export function createInitialParty(): Party {
  // Create 6 default characters
  const characters: Character[] = [];
  const defaultSetup: Array<{
    race: string; main: string; sub: string; pred: string; lineage: string; name: string;
  }> = [
    { race: 'caninian', main: 'fighter', sub: 'fighter', pred: 'sturdy', lineage: 'unmoving', name: 'レオン' },
    { race: 'vulpinian', main: 'duelist', sub: 'ninja', pred: 'chivalric', lineage: 'steel_oath', name: 'キツネ丸' },
    { race: 'leporian', main: 'ranger', sub: 'rogue', pred: 'dexterous', lineage: 'far_sight', name: 'ミミ' },
    { race: 'cervin', main: 'wizard', sub: 'sage', pred: 'brilliant', lineage: 'guiding_thought', name: 'セルヴァ' },
    { race: 'felidian', main: 'sage', sub: 'wizard', pred: 'pursuing', lineage: 'hidden_principles', name: 'ニャンコ' },
    { race: 'mustelid', main: 'pilgrim', sub: 'lord', pred: 'persistent', lineage: 'inherited_oaths', name: 'イタチ' },
  ];

  for (let i = 0; i < 6; i++) {
    const setup = defaultSetup[i];
    characters.push({
      id: i + 1,
      name: setup.name,
      raceId: setup.race as Character['raceId'],
      mainClassId: setup.main as Character['mainClassId'],
      subClassId: setup.sub as Character['subClassId'],
      predispositionId: setup.pred as Character['predispositionId'],
      lineageId: setup.lineage as Character['lineageId'],
      equipment: [],
    });
  }

  // Create some starter items
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
    ],
    inventory: starterItems,
    gold: 100,
  };
}

export function createInitialGameState(): GameState {
  return {
    scene: 'home',
    party: createInitialParty(),
    bags: initializeBags(),
    expedition: null,
    battle: null,
  };
}

export function startExpedition(state: GameState, dungeonId: number): GameState {
  const dungeon = getDungeonById(dungeonId);
  if (!dungeon) return state;

  const { partyStats } = computePartyStats(state.party);

  const quiverQuantities: [number, number] = [
    state.party.quiverSlots[0]?.quantity ?? 0,
    state.party.quiverSlots[1]?.quantity ?? 0,
  ];

  return {
    ...state,
    scene: 'expedition',
    expedition: {
      dungeonId,
      currentRoom: 1,
      partyHp: partyStats.hp,
      quiverQuantities,
      rewards: [],
      experienceGained: 0,
    },
  };
}

export function selectEnemy(dungeon: Dungeon, room: number): EnemyDef {
  if (room > dungeon.numberOfRooms) {
    // Boss room
    return getBossEnemy(dungeon.bossId)!;
  }

  // Random enemy from pool (Tetris-style would need a bag per dungeon)
  const poolId = dungeon.enemyPoolIds[0];
  const enemies = getEnemiesByPool(poolId);
  const randomIndex = Math.floor(Math.random() * enemies.length);
  return enemies[randomIndex];
}

export function processRoom(state: GameState): GameState {
  if (!state.expedition) return state;

  const dungeon = getDungeonById(state.expedition.dungeonId);
  if (!dungeon) return state;

  const enemy = selectEnemy(dungeon, state.expedition.currentRoom);
  const battleResult = executeBattle(
    state.party,
    enemy,
    state.expedition.quiverQuantities
  );

  const newState = {
    ...state,
    battle: battleResult,
    expedition: {
      ...state.expedition,
      partyHp: battleResult.partyHp,
    },
  };

  return newState;
}

export function processBattleOutcome(state: GameState, enemy: EnemyDef): GameState {
  if (!state.expedition || !state.battle) return state;

  const dungeon = getDungeonById(state.expedition.dungeonId);
  if (!dungeon) return state;

  switch (state.battle.outcome) {
    case 'victory': {
      // Add experience
      const newExp = state.expedition.experienceGained + enemy.experience;

      // Check for reward (draw from bag)
      let newBags = state.bags;
      let newRewards = [...state.expedition.rewards];

      // Draw reward ticket
      newBags = refillBagIfEmpty(newBags, 'rewardBag');
      const { ticket: rewardTicket, newBag: newRewardBag } = drawFromBag(newBags.rewardBag);
      newBags = { ...newBags, rewardBag: newRewardBag };

      // Check for unlock ability (additional draw)
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
        // Draw enhancement and super rare
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

      // Check if dungeon complete
      const isBossDefeated = state.expedition.currentRoom > dungeon.numberOfRooms;

      if (isBossDefeated) {
        // Return home with rewards
        return finishExpedition(state, newExp, newRewards, newBags);
      }

      // Proceed to next room
      return {
        ...state,
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
      // Back to home, no rewards
      return {
        ...state,
        scene: 'home',
        expedition: null,
        battle: null,
      };

    case 'draw':
      // Retreat with current rewards
      return finishExpedition(
        state,
        state.expedition.experienceGained,
        state.expedition.rewards,
        state.bags
      );

    default:
      return state;
  }
}

function finishExpedition(
  state: GameState,
  experienceGained: number,
  rewards: Item[],
  bags: GameState['bags']
): GameState {
  // Add experience and check for level up
  let newExp = state.party.experience + experienceGained;
  let newLevel = state.party.level;

  while (newLevel < 29 && newExp >= LEVEL_EXP[newLevel]) {
    newLevel++;
  }

  // Add rewards to inventory
  const newInventory = [...state.party.inventory, ...rewards];

  return {
    ...state,
    scene: 'home',
    bags,
    party: {
      ...state.party,
      level: newLevel,
      experience: newExp,
      inventory: newInventory,
    },
    expedition: null,
    battle: null,
  };
}

export function equipItem(
  state: GameState,
  characterId: number,
  slotIndex: number,
  item: Item | null
): GameState {
  const characterIndex = state.party.characters.findIndex(c => c.id === characterId);
  if (characterIndex === -1) return state;

  const character = state.party.characters[characterIndex];
  const newEquipment = [...character.equipment];

  // If equipping an item, remove it from inventory
  let newInventory = [...state.party.inventory];
  if (item) {
    const inventoryIndex = newInventory.findIndex(
      i => i.id === item.id && i.enhancement === item.enhancement && i.superRare === item.superRare
    );
    if (inventoryIndex !== -1) {
      newInventory.splice(inventoryIndex, 1);
    }
  }

  // If unequipping an item, add it back to inventory
  const oldItem = newEquipment[slotIndex];
  if (oldItem) {
    newInventory.push(oldItem);
  }

  newEquipment[slotIndex] = item;

  const newCharacters = [...state.party.characters];
  newCharacters[characterIndex] = {
    ...character,
    equipment: newEquipment,
  };

  return {
    ...state,
    party: {
      ...state.party,
      characters: newCharacters,
      inventory: newInventory,
    },
  };
}

export function getItemDisplayName(item: Item): string {
  const enhTitle = ENHANCEMENT_TITLES.find(t => t.value === item.enhancement)?.title ?? '';
  const srTitle = SUPER_RARE_TITLES.find(t => t.value === item.superRare)?.title ?? '';
  return `${srTitle}${enhTitle}${item.name}`;
}

export function getItemMultiplier(item: Item): number {
  const enhMult = ENHANCEMENT_TITLES.find(t => t.value === item.enhancement)?.multiplier ?? 1;
  const srMult = SUPER_RARE_TITLES.find(t => t.value === item.superRare)?.multiplier ?? 1;
  return enhMult * srMult;
}
