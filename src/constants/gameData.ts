import { Race, Class, Predisposition, Lineage, Item, Dungeon, Enemy } from '../types';

// Race data with emoji and base stats
export const RACES: Record<Race, { emoji: string; baseStats: Record<string, number> }> = {
  Caninian: { emoji: '🐶', baseStats: { vitality: 10, strength: 10, intelligence: 10, mind: 10 } },
  Lupinian: { emoji: '🐺', baseStats: { vitality: 9, strength: 12, intelligence: 8, mind: 7 } },
  Vulpinian: { emoji: '🦊', baseStats: { vitality: 10, strength: 10, intelligence: 12, mind: 8 } },
  Ursan: { emoji: '🐻', baseStats: { vitality: 13, strength: 12, intelligence: 5, mind: 7 } },
  Felidian: { emoji: '😺', baseStats: { vitality: 9, strength: 9, intelligence: 10, mind: 12 } },
  Mustelid: { emoji: '🦡', baseStats: { vitality: 10, strength: 10, intelligence: 9, mind: 11 } },
  Leporian: { emoji: '🐰', baseStats: { vitality: 9, strength: 8, intelligence: 11, mind: 10 } },
  Cervin: { emoji: '🦌', baseStats: { vitality: 6, strength: 7, intelligence: 13, mind: 10 } },
  Murid: { emoji: '🐭', baseStats: { vitality: 9, strength: 8, intelligence: 10, mind: 10 } },
};

export const CLASSES: Class[] = ['Fighter', 'Duelist', 'Ninja', 'Samurai', 'Lord', 'Ranger', 'Wizard', 'Sage', 'Rogue', 'Pilgrim'];

export const PREDISPOSITIONS: Predisposition[] = ['Sturdy', 'Agile', 'Brilliant', 'Dexterous', 'Chivalric', 'Shikon', 'Pursuing', 'Canny', 'Persistent'];

export const LINEAGES: Lineage[] = ['SteelOath', 'WarSpirit', 'FarSight', 'Unmoving', 'BreakingHand', 'GuidingThought', 'HiddenPrinciples', 'InheritedOaths'];

// Sample items (5 per type as per spec)
export const ITEMS: Item[] = [
  // Swords
  { id: 1, category: 'sword', name: 'Iron Sword', enhancement: 0, superRare: 0, baseStats: { meleeAttack: 15 }, quantity: 1 },
  { id: 2, category: 'sword', name: 'Steel Sword', enhancement: 1, superRare: 0, baseStats: { meleeAttack: 20 }, quantity: 1 },
  { id: 3, category: 'sword', name: 'Mithril Sword', enhancement: 2, superRare: 0, baseStats: { meleeAttack: 30 }, quantity: 1 },
  { id: 4, category: 'sword', name: 'Crystal Sword', enhancement: 3, superRare: 0, baseStats: { meleeAttack: 45 }, quantity: 1 },
  { id: 5, category: 'sword', name: 'Legendary Sword', enhancement: 4, superRare: 1, baseStats: { meleeAttack: 60 }, quantity: 1 },

  // Katanas
  { id: 11, category: 'katana', name: 'Wooden Katana', enhancement: 0, superRare: 0, baseStats: { meleeAttack: 18, meleeNoA: -1 }, quantity: 1 },
  { id: 12, category: 'katana', name: 'Iron Katana', enhancement: 1, superRare: 0, baseStats: { meleeAttack: 25, meleeNoA: -1 }, quantity: 1 },
  { id: 13, category: 'katana', name: 'Noble Katana', enhancement: 2, superRare: 0, baseStats: { meleeAttack: 35, meleeNoA: -1 }, quantity: 1 },
  { id: 14, category: 'katana', name: 'Demon Katana', enhancement: 3, superRare: 1, baseStats: { meleeAttack: 50, meleeNoA: -1 }, quantity: 1 },
  { id: 15, category: 'katana', name: 'Divine Katana', enhancement: 4, superRare: 2, baseStats: { meleeAttack: 70, meleeNoA: -1 }, quantity: 1 },

  // Armor
  { id: 21, category: 'armor', name: 'Leather Armor', enhancement: 0, superRare: 0, baseStats: { physicalDefense: 20 }, quantity: 1 },
  { id: 22, category: 'armor', name: 'Iron Armor', enhancement: 1, superRare: 0, baseStats: { physicalDefense: 30 }, quantity: 1 },
  { id: 23, category: 'armor', name: 'Steel Armor', enhancement: 2, superRare: 0, baseStats: { physicalDefense: 45 }, quantity: 1 },
  { id: 24, category: 'armor', name: 'Mithril Armor', enhancement: 3, superRare: 0, baseStats: { physicalDefense: 60 }, quantity: 1 },
  { id: 25, category: 'armor', name: 'Legendary Armor', enhancement: 4, superRare: 1, baseStats: { physicalDefense: 80 }, quantity: 1 },

  // Amulets
  { id: 31, category: 'amulet', name: 'Bronze Amulet', enhancement: 0, superRare: 0, baseStats: { partyHp: 50 }, quantity: 1 },
  { id: 32, category: 'amulet', name: 'Silver Amulet', enhancement: 1, superRare: 0, baseStats: { partyHp: 80 }, quantity: 1 },
  { id: 33, category: 'amulet', name: 'Gold Amulet', enhancement: 2, superRare: 0, baseStats: { partyHp: 120 }, quantity: 1 },
  { id: 34, category: 'amulet', name: 'Crystal Amulet', enhancement: 3, superRare: 1, baseStats: { partyHp: 180 }, quantity: 1 },
  { id: 35, category: 'amulet', name: 'Divine Amulet', enhancement: 4, superRare: 2, baseStats: { partyHp: 250 }, quantity: 1 },

  // Wands
  { id: 41, category: 'wand', name: 'Wooden Wand', enhancement: 0, superRare: 0, baseStats: { magicalAttack: 12 }, quantity: 1 },
  { id: 42, category: 'wand', name: 'Crystal Wand', enhancement: 1, superRare: 0, baseStats: { magicalAttack: 18 }, quantity: 1 },
  { id: 43, category: 'wand', name: 'Mystic Wand', enhancement: 2, superRare: 0, baseStats: { magicalAttack: 28 }, quantity: 1 },
  { id: 44, category: 'wand', name: 'Arcane Wand', enhancement: 3, superRare: 1, baseStats: { magicalAttack: 40 }, quantity: 1 },
  { id: 45, category: 'wand', name: 'Celestial Wand', enhancement: 4, superRare: 2, baseStats: { magicalAttack: 55 }, quantity: 1 },

  // Arrows
  { id: 51, category: 'arrow', name: 'Iron Arrow', enhancement: 0, superRare: 0, baseStats: { rangedAttack: 5 }, maxStack: 50, quantity: 20 },
  { id: 52, category: 'arrow', name: 'Steel Arrow', enhancement: 1, superRare: 0, baseStats: { rangedAttack: 8 }, maxStack: 50, quantity: 20 },
  { id: 53, category: 'arrow', name: 'Fire Arrow', enhancement: 0, superRare: 0, baseStats: { rangedAttack: 10 }, elementalAttribute: 'fire', maxStack: 50, quantity: 15 },
  { id: 54, category: 'arrow', name: 'Ice Arrow', enhancement: 0, superRare: 0, baseStats: { rangedAttack: 10 }, elementalAttribute: 'ice', maxStack: 50, quantity: 15 },
  { id: 55, category: 'arrow', name: 'Thunder Arrow', enhancement: 1, superRare: 0, baseStats: { rangedAttack: 12 }, elementalAttribute: 'thunder', maxStack: 50, quantity: 10 },
];

// Sample enemies (5 per dungeon)
export const SAMPLE_ENEMIES: Enemy[] = [
  {
    id: 1,
    name: 'Goblin',
    level: 1,
    type: 'Normal',
    poolId: 1,
    hp: 50,
    maxHp: 50,
    rangedAttack: 10,
    rangedNoA: 1,
    magicalAttack: 5,
    magicalNoA: 0,
    meleeAttack: 15,
    meleeNoA: 2,
    physicalDefense: 5,
    magicalDefense: 3,
    elementalAttribute: 'none',
    elementalResistance: { fire: 1, ice: 1, thunder: 1 },
    experience: 50,
  },
  {
    id: 2,
    name: 'Orc Warrior',
    level: 3,
    type: 'Normal',
    poolId: 1,
    hp: 100,
    maxHp: 100,
    rangedAttack: 15,
    rangedNoA: 1,
    magicalAttack: 8,
    magicalNoA: 0,
    meleeAttack: 25,
    meleeNoA: 2,
    physicalDefense: 10,
    magicalDefense: 5,
    elementalAttribute: 'fire',
    elementalResistance: { fire: 0.8, ice: 1.2, thunder: 1 },
    experience: 100,
  },
  {
    id: 3,
    name: 'Dark Mage',
    level: 4,
    type: 'Normal',
    poolId: 1,
    hp: 60,
    maxHp: 60,
    rangedAttack: 8,
    rangedNoA: 1,
    magicalAttack: 35,
    magicalNoA: 2,
    meleeAttack: 8,
    meleeNoA: 1,
    physicalDefense: 5,
    magicalDefense: 20,
    elementalAttribute: 'ice',
    elementalResistance: { fire: 1.2, ice: 0.8, thunder: 1 },
    experience: 120,
  },
  {
    id: 4,
    name: 'Goblin Knight',
    level: 5,
    type: 'Normal',
    poolId: 1,
    hp: 120,
    maxHp: 120,
    rangedAttack: 20,
    rangedNoA: 2,
    magicalAttack: 10,
    magicalNoA: 0,
    meleeAttack: 30,
    meleeNoA: 2,
    physicalDefense: 15,
    magicalDefense: 8,
    elementalAttribute: 'thunder',
    elementalResistance: { fire: 1, ice: 1, thunder: 0.8 },
    experience: 150,
  },
  {
    id: 5,
    name: 'Demon Lord',
    level: 7,
    type: 'Boss',
    poolId: 0,
    hp: 300,
    maxHp: 300,
    rangedAttack: 40,
    rangedNoA: 2,
    magicalAttack: 50,
    magicalNoA: 2,
    meleeAttack: 60,
    meleeNoA: 3,
    physicalDefense: 25,
    magicalDefense: 30,
    elementalAttribute: 'fire',
    elementalResistance: { fire: 0.5, ice: 2, thunder: 1 },
    experience: 500,
  },
];

// Sample dungeon
export const SAMPLE_DUNGEONS: Dungeon[] = [
  {
    id: 1,
    name: 'Forest of Whispers',
    numberOfRooms: 5,
    poolsOfEnemies: [[1, 2, 3], [2, 3, 4], [1, 4], [3, 4]],
    bossEnemy: SAMPLE_ENEMIES[4],
  },
];

export const ENHANCEMENT_TITLES: Record<number, string> = {
  0: '',
  1: '名工の',
  2: '魔性の',
  3: '宿った',
  4: '伝説の',
  5: '恐ろしい',
  6: '究極の',
};

export const SUPER_RARE_TITLES: Record<number, string> = {
  0: '',
  1: '世界を征する',
  2: '天に与えられし',
  3: '混沌の',
  4: '知られざる',
  5: '血に飢えし',
};
