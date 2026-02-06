import { Race } from '../types';

export const RACES: Race[] = [
  {
    id: 'caninian',
    name: 'ケイナイアン',
    emoji: '🐶',
    stats: { vitality: 10, strength: 10, intelligence: 10, mind: 10 },
    bonuses: [
      { type: 'amulet_multiplier', value: 1.3 },
      { type: 'shield_multiplier', value: 1.3 },
    ],
  },
  {
    id: 'lupinian',
    name: 'ルピニアン',
    emoji: '🐺',
    stats: { vitality: 9, strength: 12, intelligence: 8, mind: 7 },
    bonuses: [
      { type: 'equip_slot', value: 1 },
      { type: 'katana_multiplier', value: 1.3 },
    ],
  },
  {
    id: 'vulpinian',
    name: 'ヴァルピニアン',
    emoji: '🦊',
    stats: { vitality: 10, strength: 10, intelligence: 12, mind: 8 },
    bonuses: [
      { type: 'equip_slot', value: 1 },
      { type: 'sword_multiplier', value: 1.3 },
    ],
  },
  {
    id: 'ursan',
    name: 'ウルサン',
    emoji: '🐻',
    stats: { vitality: 13, strength: 12, intelligence: 5, mind: 7 },
    bonuses: [
      { type: 'equip_slot', value: 2 },
      { type: 'shield_multiplier', value: 1.3 },
    ],
  },
  {
    id: 'felidian',
    name: 'フェリディアン',
    emoji: '😺',
    stats: { vitality: 9, strength: 9, intelligence: 10, mind: 12 },
    bonuses: [
      { type: 'robe_multiplier', value: 1.3 },
      { type: 'catalyst_multiplier', value: 1.2 },
    ],
  },
  {
    id: 'mustelid',
    name: 'マステリド',
    emoji: '🦡',
    stats: { vitality: 10, strength: 10, intelligence: 9, mind: 11 },
    bonuses: [
      { type: 'gauntlet_multiplier', value: 1.3 },
      { type: 'ability', value: 1, abilityId: 'hunter', abilityLevel: 1 },
    ],
  },
  {
    id: 'leporian',
    name: 'レポリアン',
    emoji: '🐰',
    stats: { vitality: 9, strength: 8, intelligence: 11, mind: 10 },
    bonuses: [
      { type: 'archery_multiplier', value: 1.3 },
      { type: 'bolt_multiplier', value: 1.3 },
    ],
  },
  {
    id: 'cervin',
    name: 'セルヴィン',
    emoji: '🦌',
    stats: { vitality: 6, strength: 7, intelligence: 13, mind: 10 },
    bonuses: [
      { type: 'wand_multiplier', value: 1.3 },
      { type: 'grimoire_multiplier', value: 1.2 },
    ],
  },
  {
    id: 'murid',
    name: 'ミュリッド',
    emoji: '🐭',
    stats: { vitality: 9, strength: 8, intelligence: 10, mind: 10 },
    bonuses: [
      { type: 'penet', value: 0.10 },
      { type: 'catalyst_multiplier', value: 1.2 },
    ],
  },
];

export const getRaceById = (id: string): Race | undefined =>
  RACES.find(r => r.id === id);
