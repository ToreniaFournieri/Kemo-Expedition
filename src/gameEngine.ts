import { GameState, Party, Character, Enemy, BattleResult, Dungeon } from './types';
import { SAMPLE_ENEMIES, DUNGEONS, RACES, CLASSES } from './gameData';

export function initializeGame(): GameState {
  const party: Party = {
    deityName: 'God of Restoration',
    level: 1,
    experience: 0,
    hp: 1000,
    maxHp: 1000,
    characters: [
      { id: 1, name: 'Fighter1', race: 'Lupinian', mainClass: 'Fighter', subClass: 'Fighter' },
      { id: 2, name: 'Ranger1', race: 'Leporian', mainClass: 'Ranger', subClass: 'Ranger' },
      { id: 3, name: 'Wizard1', race: 'Cervin', mainClass: 'Wizard', subClass: 'Wizard' },
      { id: 4, name: 'Sage1', race: 'Felidian', mainClass: 'Sage', subClass: 'Sage' },
    ],
  };

  return {
    party,
    dungeon: null,
    battleLog: [],
    gold: 1000,
    inventory: [],
  };
}

export function startDungeon(dungeonId: number, state: GameState): GameState {
  const dungeon = DUNGEONS.find(d => d.id === dungeonId);
  if (!dungeon) return state;

  return {
    ...state,
    dungeon: {
      ...dungeon,
      currentRoom: 0,
      isActive: true,
    },
    battleLog: [],
  };
}

export function resolveBattle(state: GameState): GameState {
  if (!state.dungeon || !state.dungeon.isActive) return state;

  // Select random enemy
  const enemy = SAMPLE_ENEMIES[Math.floor(Math.random() * SAMPLE_ENEMIES.length)];
  const enemyCopy = { ...enemy };

  // Simple battle: party deals 30 damage per round, enemy deals its damage
  let partyHp = state.party.hp;
  let enemyHp = enemyCopy.hp;

  // 3 phases of combat
  for (let phase = 0; phase < 3; phase++) {
    // Enemy attacks
    partyHp -= enemyCopy.damage;
    if (partyHp <= 0) break;

    // Party attacks
    enemyHp -= 30;
    if (enemyHp <= 0) break;
  }

  const victory = enemyHp <= 0 && partyHp > 0;
  const result: BattleResult = {
    room: state.dungeon.currentRoom + 1,
    enemy: enemy,
    victory,
    partyHpBefore: state.party.hp,
    partyHpAfter: Math.max(0, partyHp),
    expGained: victory ? enemy.level * 50 : 0,
  };

  const newBattleLog = [...state.battleLog, result];
  const nextRoom = state.dungeon.currentRoom + 1;
  const dungeonComplete = nextRoom >= state.dungeon.rooms;
  const expeditionActive = victory && !dungeonComplete;

  let newExperience = state.party.experience + result.expGained;
  let newLevel = state.party.level;
  if (newExperience >= 100) {
    newLevel += Math.floor(newExperience / 100);
    newExperience = newExperience % 100;
  }

  return {
    ...state,
    party: {
      ...state.party,
      hp: Math.max(0, partyHp),
      level: Math.min(29, newLevel),
      experience: newExperience,
    },
    dungeon: {
      ...state.dungeon,
      currentRoom: nextRoom,
      isActive: expeditionActive,
    },
    battleLog: newBattleLog,
  };
}

export function retreat(state: GameState): GameState {
  return {
    ...state,
    dungeon: state.dungeon ? { ...state.dungeon, isActive: false } : null,
  };
}

export function restorePartyHp(state: GameState): GameState {
  return {
    ...state,
    party: {
      ...state.party,
      hp: state.party.maxHp,
    },
    dungeon: null,
  };
}
