import { Predisposition } from '../types';

export const PREDISPOSITIONS: Predisposition[] = [
  {
    id: 'sturdy',
    name: '頑強',
    bonuses: [
      { type: 'vitality', value: 2 },
      { type: 'armor_multiplier', value: 1.1 },
      { type: 'shield_multiplier', value: 1.1 },
    ],
  },
  {
    id: 'agile',
    name: '俊敏',
    bonuses: [
      { type: 'gauntlet_multiplier', value: 1.2 },
      { type: 'pursuit', value: 0.1 },
    ],
  },
  {
    id: 'brilliant',
    name: '聡明',
    bonuses: [
      { type: 'wand_multiplier', value: 1.2 },
      { type: 'catalyst_multiplier', value: 1.1 },
    ],
  },
  {
    id: 'dexterous',
    name: '器用',
    bonuses: [
      { type: 'archery_multiplier', value: 1.2 },
      { type: 'arrow_multiplier', value: 1.1 },
      { type: 'bolt_multiplier', value: 1.1 },
    ],
  },
  {
    id: 'chivalric',
    name: '騎士道',
    bonuses: [
      { type: 'sword_multiplier', value: 1.2 },
      { type: 'shield_multiplier', value: 1.1 },
    ],
  },
  {
    id: 'shikon',
    name: '士魂',
    bonuses: [
      { type: 'strength', value: 2 },
      { type: 'katana_multiplier', value: 1.1 },
    ],
  },
  {
    id: 'pursuing',
    name: '追求',
    bonuses: [
      { type: 'intelligence', value: 2 },
      { type: 'grimoire_multiplier', value: 1.1 },
    ],
  },
  {
    id: 'canny',
    name: '商才',
    bonuses: [
      { type: 'equip_slot', value: 1 },
    ],
  },
  {
    id: 'persistent',
    name: '忍耐',
    bonuses: [
      { type: 'mind', value: 2 },
      { type: 'robe_multiplier', value: 1.1 },
    ],
  },
];

export const getPredispositionById = (id: string): Predisposition | undefined =>
  PREDISPOSITIONS.find(p => p.id === id);
