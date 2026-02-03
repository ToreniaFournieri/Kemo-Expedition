// Game types and interfaces

export type Race = 'Caninian' | 'Lupinian' | 'Vulpinian' | 'Ursan' | 'Felidian' | 'Mustelid' | 'Leporian' | 'Cervin' | 'Murid';
export type Class = 'Fighter' | 'Duelist' | 'Ninja' | 'Samurai' | 'Lord' | 'Ranger' | 'Wizard' | 'Sage' | 'Rogue' | 'Pilgrim';
export type ElementalType = 'none' | 'fire' | 'ice' | 'thunder';
export type ItemType = 'sword' | 'katana' | 'archery' | 'armor' | 'gauntlet' | 'wand' | 'robe' | 'amulet' | 'arrow';

export interface Character {
  id: number;
  name: string;
  race: Race;
  mainClass: Class;
  subClass: Class;
}

export interface Party {
  deityName: string;
  level: number;
  experience: number;
  hp: number;
  maxHp: number;
  characters: Character[];
}

export interface Enemy {
  id: number;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  damage: number;
}

export interface BattleResult {
  room: number;
  enemy: Enemy;
  victory: boolean;
  partyHpBefore: number;
  partyHpAfter: number;
  expGained: number;
}

export interface Dungeon {
  id: number;
  name: string;
  rooms: number;
  currentRoom: number;
  isActive: boolean;
}

export interface GameState {
  party: Party;
  dungeon: Dungeon | null;
  battleLog: BattleResult[];
  gold: number;
  inventory: any[];
}
