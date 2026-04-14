import { ClassDef, ClassId } from '../types';

export const CLASS_SHORT_NAMES: Record<ClassId | 'fighter' | 'rogue', string> = {
  fighter: '戦',
  guardian: '防',
  duelist: '剣',
  samurai: '侍',
  'sword-saint': '聖',
  ranger: '狩',
  striker: '弩',
  ninja: '忍',
  wizard: '魔',
  sage: '賢',
  alchemist: '錬',
  pilgrim: '巡',
  lord: '君',
  rogue: '盗',
};

// SpecRef: 2.2 | CHARACTER_&_PARTY_MASTER_DATA | class.master_data
export const CLASSES: ClassDef[] = [
  {
    id: 'guardian',
    name: '防人',
    mainSubBonuses: [
      { type: 'armor_multiplier', value: 1.4 },
      { type: 'equip_slot', value: 2 },
    ],
    mainBonuses: [
      { type: 'ability', value: 1, abilityId: 'defender', abilityLevel: 1 },
    ],
    masterBonuses: [
      { type: 'ability', value: 1, abilityId: 'defender', abilityLevel: 2 },
    ],
  },
  {
    id: 'duelist',
    name: '剣士',
    mainSubBonuses: [
      { type: 'equip_melee', value: 1 },
      { type: 'sword_multiplier', value: 1.4 },
      { type: 'bolt_multiplier', value: 1.1 },
    ],
    mainBonuses: [
      { type: 'ability', value: 1, abilityId: 'counter', abilityLevel: 1 },
    ],
    masterBonuses: [
      { type: 'ability', value: 1, abilityId: 'counter', abilityLevel: 2 },
    ],
  },
  {
    id: 'samurai',
    name: '侍',
    mainSubBonuses: [
      { type: 'equip_melee', value: 1 },
      { type: 'katana_multiplier', value: 1.4 },
      { type: 'archery_multiplier', value: 1.2 },
    ],
    mainBonuses: [
      { type: 'ability', value: 1, abilityId: 'iaigiri', abilityLevel: 1 },
    ],
    masterBonuses: [
      { type: 'ability', value: 1, abilityId: 'iaigiri', abilityLevel: 2 },
    ],
  },
  {
    id: 'sword-saint',
    name: '剣聖',
    mainSubBonuses: [
      { type: 'equip_melee', value: 1 },
      { type: 'gauntlet_multiplier', value: 1.4 },
      { type: 'grimoire_multiplier', value: 1.1 },
      { type: 'equip_slot', value: 1 },
    ],
    mainBonuses: [
      { type: 'ability', value: 1, abilityId: 're_attack', abilityLevel: 1 },
    ],
    masterBonuses: [
      { type: 'ability', value: 1, abilityId: 're_attack', abilityLevel: 2 },
    ],
  },
  {
    id: 'ranger',
    name: '狩人',
    mainSubBonuses: [
      { type: 'equip_ranged', value: 1 },
      { type: 'arrow_multiplier', value: 1.4 },
      { type: 'sword_multiplier', value: 1.1 },
    ],
    mainBonuses: [
      { type: 'ability', value: 1, abilityId: 'hunter', abilityLevel: 1 },
    ],
    masterBonuses: [
      { type: 'ability', value: 1, abilityId: 'hunter', abilityLevel: 2 },
    ],
  },
  {
    id: 'striker',
    name: '弩手',
    mainSubBonuses: [
      { type: 'equip_ranged', value: 1 },
      { type: 'bolt_multiplier', value: 1.4 },
      { type: 'katana_multiplier', value: 1.1 },
    ],
    mainBonuses: [
      { type: 'ability', value: 1, abilityId: 'heavy_strike', abilityLevel: 1 },
    ],
    masterBonuses: [
      { type: 'ability', value: 1, abilityId: 'heavy_strike', abilityLevel: 2 },
    ],
  },
  {
    id: 'ninja',
    name: '忍者',
    mainSubBonuses: [
      { type: 'equip_ranged', value: 1 },
      { type: 'archery_multiplier', value: 1.4 },
      { type: 'wand_multiplier', value: 1.1 },
      { type: 'equip_slot', value: 1 },
    ],
    mainBonuses: [
      { type: 'ability', value: 1, abilityId: 'first_strike', abilityLevel: 1 },
    ],
    masterBonuses: [
      { type: 'ability', value: 1, abilityId: 'first_strike', abilityLevel: 2 },
    ],
  },
  {
    id: 'wizard',
    name: '魔法使い',
    mainSubBonuses: [
      { type: 'equip_magic', value: 1 },
      { type: 'wand_multiplier', value: 1.4 },
      { type: 'bolt_multiplier', value: 1.1 },
    ],
    mainBonuses: [
      { type: 'ability', value: 1, abilityId: 'resonance', abilityLevel: 1 },
    ],
    masterBonuses: [
      { type: 'ability', value: 1, abilityId: 'resonance', abilityLevel: 2 },
    ],
  },
  {
    id: 'sage',
    name: '賢者',
    mainSubBonuses: [
      { type: 'equip_magic', value: 1 },
      { type: 'grimoire_multiplier', value: 1.4 },
      { type: 'sword_multiplier', value: 1.2 },
    ],
    mainBonuses: [
      { type: 'ability', value: 1, abilityId: 'arc_magic', abilityLevel: 1 },
    ],
    masterBonuses: [
      { type: 'ability', value: 1, abilityId: 'arc_magic', abilityLevel: 2 },
    ],
  },
  {
    id: 'alchemist',
    name: '錬金術師',
    mainSubBonuses: [
      { type: 'equip_magic', value: 1 },
      { type: 'catalyst_multiplier', value: 1.4 },
      { type: 'robe_multiplier', value: 1.1 },
      { type: 'equip_slot', value: 1 },
    ],
    mainBonuses: [
      { type: 'ability', value: 1, abilityId: 'arcane_stability', abilityLevel: 1 },
    ],
    masterBonuses: [
      { type: 'ability', value: 1, abilityId: 'arcane_stability', abilityLevel: 2 },
    ],
  },
  {
    id: 'pilgrim',
    name: '巡礼者',
    mainSubBonuses: [
      { type: 'robe_multiplier', value: 1.4 },
      { type: 'equip_slot', value: 2 },
    ],
    mainBonuses: [
      { type: 'ability', value: 1, abilityId: 'm_barrier', abilityLevel: 1 },
      { type: 'ability', value: 1, abilityId: 'tithe', abilityLevel: 1 },
    ],
    masterBonuses: [
      { type: 'ability', value: 1, abilityId: 'm_barrier', abilityLevel: 2 },
      { type: 'ability', value: 1, abilityId: 'tithe', abilityLevel: 1 },
    ],
  },
  {
    id: 'lord',
    name: '君主',
    mainSubBonuses: [
      { type: 'shield_multiplier', value: 1.4 },
      { type: 'equip_slot', value: 2 },
    ],
    mainBonuses: [
      { type: 'ability', value: 1, abilityId: 'command', abilityLevel: 1 },
      { type: 'ability', value: 1, abilityId: 'squander', abilityLevel: 1 },
    ],
    masterBonuses: [
      { type: 'ability', value: 1, abilityId: 'command', abilityLevel: 2 },
      { type: 'ability', value: 1, abilityId: 'squander', abilityLevel: 1 },
    ],
  },
];

export const getClassById = (id: string): ClassDef | undefined =>
  CLASSES.find(c => c.id === id);
