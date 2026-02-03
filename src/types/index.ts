// Enums and types based on specification

export type Race = 'Caninian' | 'Lupinian' | 'Vulpinian' | 'Ursan' | 'Felidian' | 'Mustelid' | 'Leporian' | 'Cervin' | 'Murid';

export type Class = 'Fighter' | 'Duelist' | 'Ninja' | 'Samurai' | 'Lord' | 'Ranger' | 'Wizard' | 'Sage' | 'Rogue' | 'Pilgrim';

export type Predisposition = 'Sturdy' | 'Agile' | 'Brilliant' | 'Dexterous' | 'Chivalric' | 'Shikon' | 'Pursuing' | 'Canny' | 'Persistent';

export type Lineage = 'SteelOath' | 'WarSpirit' | 'FarSight' | 'Unmoving' | 'BreakingHand' | 'GuidingThought' | 'HiddenPrinciples' | 'InheritedOaths';

export type ElementalAttribute = 'none' | 'fire' | 'ice' | 'thunder';

export type ItemCategory = 'sword' | 'katana' | 'archery' | 'armor' | 'gauntlet' | 'wand' | 'robe' | 'amulet' | 'arrow';

export type EnhancementTier = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type SuperRareTier = 0 | 1 | 2 | 3 | 4 | 5;

export interface Character {
  id: number;
  name: string;
  race: Race;
  mainClass: Class;
  subClass: Class;
  predisposition: Predisposition;
  lineage: Lineage;
  baseVitality: number;
  baseStrength: number;
  baseIntelligence: number;
  baseMind: number;
  equipmentSlots: number[];
  maximumEquippedItem: number;
}

export interface Party {
  number: number;
  deityName: string;
  level: number;
  experience: number;
  hp: number;
  maxHp: number;
  physicalDefense: number;
  magicalDefense: number;
  quiverSlots: number[];
  characters: Character[];
}

export interface Item {
  id: number;
  category: ItemCategory;
  name: string;
  enhancement: EnhancementTier;
  superRare: SuperRareTier;
  baseStats: {
    meleeAttack?: number;
    rangedAttack?: number;
    magicalAttack?: number;
    physicalDefense?: number;
    magicalDefense?: number;
    partyHp?: number;
    rangedNoA?: number;
    meleeNoA?: number;
  };
  elementalAttribute?: ElementalAttribute;
  maxStack?: number;
  quantity?: number;
}

export interface Enemy {
  id: number;
  name: string;
  level: number;
  type: 'Normal' | 'Boss';
  poolId: number;
  hp: number;
  maxHp: number;
  rangedAttack: number;
  rangedNoA: number;
  magicalAttack: number;
  magicalNoA: number;
  meleeAttack: number;
  meleeNoA: number;
  physicalDefense: number;
  magicalDefense: number;
  elementalAttribute: ElementalAttribute;
  elementalResistance: {
    fire: number;
    ice: number;
    thunder: number;
  };
  experience: number;
}

export interface Dungeon {
  id: number;
  name: string;
  numberOfRooms: number;
  poolsOfEnemies: number[][];
  bossEnemy: Enemy;
}

export interface BattleResult {
  roomNumber: number;
  enemyName: string;
  enemyLevel: number;
  victory: boolean;
  partyHpBefore: number;
  partyHpAfter: number;
  experienceGained: number;
  reward?: Item;
}

export interface ExpeditionState {
  currentDungeon: Dungeon;
  currentRoom: number;
  battleLog: BattleResult[];
  isActive: boolean;
  isPaused: boolean;
}
