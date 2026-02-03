import { Lineage } from '../types';

export const LINEAGES: Lineage[] = [
  {
    id: 'steel_oath',
    name: '鋼誓の家',
    bonuses: [
      { type: 'sword_multiplier', value: 1.3 },
    ],
  },
  {
    id: 'war_spirit',
    name: '戦魂の家',
    bonuses: [
      { type: 'katana_multiplier', value: 1.2 },
      { type: 'mind', value: 1 },
    ],
  },
  {
    id: 'far_sight',
    name: '遠眼の家',
    bonuses: [
      { type: 'archery_multiplier', value: 1.3 },
    ],
  },
  {
    id: 'unmoving',
    name: '不動の家',
    bonuses: [
      { type: 'armor_multiplier', value: 1.2 },
      { type: 'vitality', value: 1 },
    ],
  },
  {
    id: 'breaking_hand',
    name: '砕手の家',
    bonuses: [
      { type: 'gauntlet_multiplier', value: 1.2 },
      { type: 'strength', value: 1 },
    ],
  },
  {
    id: 'guiding_thought',
    name: '導智の家',
    bonuses: [
      { type: 'wand_multiplier', value: 1.3 },
    ],
  },
  {
    id: 'hidden_principles',
    name: '秘理の家',
    bonuses: [
      { type: 'robe_multiplier', value: 1.2 },
      { type: 'intelligence', value: 1 },
    ],
  },
  {
    id: 'inherited_oaths',
    name: '継誓の家',
    bonuses: [
      { type: 'amulet_multiplier', value: 1.2 },
      { type: 'vitality', value: 1 },
    ],
  },
];

export const getLineageById = (id: string): Lineage | undefined =>
  LINEAGES.find(l => l.id === id);
