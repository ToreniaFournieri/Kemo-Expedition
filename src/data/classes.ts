import { ClassDef } from '../types';

export const CLASSES: ClassDef[] = [
  {
    id: 'fighter',
    name: '戦士',
    mainSubBonuses: [
      { type: 'grit', value: 1 },
      { type: 'equip_slot', value: 1 },
      { type: 'armor_multiplier', value: 1.4 },
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
      { type: 'grit', value: 1 },
      { type: 'sword_multiplier', value: 1.4 },
    ],
    mainBonuses: [
      { type: 'ability', value: 1, abilityId: 'counter', abilityLevel: 1 },
    ],
    masterBonuses: [
      { type: 'ability', value: 1, abilityId: 'counter', abilityLevel: 2 },
    ],
  },
  {
    id: 'ninja',
    name: '忍者',
    mainSubBonuses: [
      { type: 'grit', value: 1 },
      { type: 'penet', value: 0.15 },
    ],
    mainBonuses: [
      { type: 'ability', value: 1, abilityId: 're_attack', abilityLevel: 1 },
    ],
    masterBonuses: [
      { type: 'ability', value: 1, abilityId: 're_attack', abilityLevel: 2 },
    ],
  },
  {
    id: 'samurai',
    name: '侍',
    mainSubBonuses: [
      { type: 'grit', value: 1 },
      { type: 'katana_multiplier', value: 1.4 },
    ],
    mainBonuses: [
      { type: 'ability', value: 1, abilityId: 'iaigiri', abilityLevel: 1 },
    ],
    masterBonuses: [
      { type: 'ability', value: 1, abilityId: 'iaigiri', abilityLevel: 2 },
    ],
  },
  {
    id: 'lord',
    name: '君主',
    mainSubBonuses: [
      { type: 'grit', value: 1 },
      { type: 'gauntlet_multiplier', value: 1.4 },
      { type: 'equip_slot', value: 1 },
    ],
    mainBonuses: [
      { type: 'ability', value: 1, abilityId: 'command', abilityLevel: 1 },
    ],
    masterBonuses: [
      { type: 'ability', value: 1, abilityId: 'command', abilityLevel: 2 },
    ],
  },
  {
    id: 'ranger',
    name: '狩人',
    mainSubBonuses: [
      { type: 'pursuit', value: 2 },
      { type: 'arrow_multiplier', value: 1.4 },
    ],
    mainBonuses: [
      { type: 'ability', value: 1, abilityId: 'hunter', abilityLevel: 1 },
    ],
    masterBonuses: [
      { type: 'ability', value: 1, abilityId: 'hunter', abilityLevel: 2 },
    ],
  },
  {
    id: 'wizard',
    name: '魔法使い',
    mainSubBonuses: [
      { type: 'caster', value: 1 },
      { type: 'wand_multiplier', value: 1.4 },
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
      { type: 'caster', value: 2 },
      { type: 'robe_multiplier', value: 1.4 },
      { type: 'grimoire_multiplier', value: 1.2 },
      { type: 'equip_slot', value: 2 },
    ],
    mainBonuses: [
      { type: 'ability', value: 1, abilityId: 'm_barrier', abilityLevel: 1 },
    ],
    masterBonuses: [
      { type: 'ability', value: 1, abilityId: 'm_barrier', abilityLevel: 2 },
    ],
  },
  {
    id: 'rogue',
    name: '盗賊',
    mainSubBonuses: [
      { type: 'pursuit', value: 1 },
      { type: 'ability', value: 1, abilityId: 'unlock', abilityLevel: 1 },
    ],
    mainBonuses: [
      { type: 'ability', value: 1, abilityId: 'first_strike', abilityLevel: 1 },
    ],
    masterBonuses: [
      { type: 'ability', value: 1, abilityId: 'first_strike', abilityLevel: 2 },
    ],
  },
  {
    id: 'pilgrim',
    name: '巡礼者',
    mainSubBonuses: [
      { type: 'caster', value: 1 },
      { type: 'grit', value: 1 },
      { type: 'evasion', value: 0.02 },
      { type: 'equip_slot', value: 1 },
    ],
    mainBonuses: [
      { type: 'ability', value: 1, abilityId: 'null_counter', abilityLevel: 1 },
    ],
    masterBonuses: [
      { type: 'ability', value: 1, abilityId: 'null_counter', abilityLevel: 1 },
    ],
  },
];

export const getClassById = (id: string): ClassDef | undefined =>
  CLASSES.find(c => c.id === id);
