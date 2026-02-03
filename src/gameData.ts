import { Race, Class, Enemy } from './types';

export const RACES: Record<Race, { emoji: string; name: string }> = {
  Caninian: { emoji: '🐶', name: 'Caninian' },
  Lupinian: { emoji: '🐺', name: 'Lupinian' },
  Vulpinian: { emoji: '🦊', name: 'Vulpinian' },
  Ursan: { emoji: '🐻', name: 'Ursan' },
  Felidian: { emoji: '😺', name: 'Felidian' },
  Mustelid: { emoji: '🦡', name: 'Mustelid' },
  Leporian: { emoji: '🐰', name: 'Leporian' },
  Cervin: { emoji: '🦌', name: 'Cervin' },
  Murid: { emoji: '🐭', name: 'Murid' },
};

export const CLASSES: Class[] = ['Fighter', 'Duelist', 'Ninja', 'Samurai', 'Lord', 'Ranger', 'Wizard', 'Sage', 'Rogue', 'Pilgrim'];

export const SAMPLE_ENEMIES: Enemy[] = [
  { id: 1, name: 'Goblin', level: 1, hp: 50, maxHp: 50, damage: 10 },
  { id: 2, name: 'Orc', level: 2, hp: 80, maxHp: 80, damage: 15 },
  { id: 3, name: 'Dark Mage', level: 3, hp: 60, maxHp: 60, damage: 20 },
  { id: 4, name: 'Goblin Knight', level: 4, hp: 100, maxHp: 100, damage: 25 },
  { id: 5, name: 'Demon Lord', level: 5, hp: 200, maxHp: 200, damage: 40 },
];

export const DUNGEONS = [
  { id: 1, name: 'Forest of Whispers', rooms: 5 },
  { id: 2, name: 'Crystal Cavern', rooms: 5 },
  { id: 3, name: 'Cursed Temple', rooms: 5 },
];
