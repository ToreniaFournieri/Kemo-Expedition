import { Predisposition } from '../types';

// SpecRef: 8.2.3 | Character Edit Mode (selected member) | Predisposition selection
export const PREDISPOSITIONS: Predisposition[] = [
  { id: 'aggressive', name: '好戦', shortName: '好', category: '外向的', selectable: true, bonuses: [{ type: 'sword_multiplier', value: 1.1 }, { type: 'bolt_multiplier', value: 1.1 }, { type: 'catalyst_multiplier', value: 1.1 }] },
  { id: 'inquisitive', name: '探求', shortName: '探', category: '外向的', selectable: true, bonuses: [{ type: 'katana_multiplier', value: 1.1 }, { type: 'arrow_multiplier', value: 1.1 }, { type: 'grimoire_multiplier', value: 1.1 }] },
  { id: 'amiable', name: '親和', shortName: '和', category: '外向的', selectable: true, bonuses: [{ type: 'ability', value: 1, abilityId: 'null_antagonism', abilityLevel: 1 }, { type: 'gauntlet_multiplier', value: 1.1 }, { type: 'bolt_multiplier', value: 1.1 }] },
  { id: 'stubborn', name: '頑固', shortName: '頑', category: '内向的', selectable: true, bonuses: [{ type: 'shield_multiplier', value: 1.1 }, { type: 'vitality', value: 1 }] },
  { id: 'evasive', name: '責任回避', shortName: '避', category: '内向的', selectable: true, bonuses: [{ type: 'evasion', value: 0.02 }, { type: 'robe_multiplier', value: 1.1 }, { type: 'mind', value: 1 }] },
  { id: 'introspective', name: '内省', shortName: '内', category: '内向的', selectable: true, bonuses: [{ type: 'wand_multiplier', value: 1.1 }, { type: 'armor_multiplier', value: 1.1 }] },
  { id: 'devoted', name: '献身', shortName: '献', category: '適応', selectable: true, bonuses: [{ type: 'ability', value: 1, abilityId: 'first_aid', abilityLevel: 1 }, { type: 'shield_multiplier', value: 1.1 }, { type: 'fire_defense_multiplier_xV', value: 4 / 5 }] },
  { id: 'serene', name: '冷静', shortName: '冷', category: '適応', selectable: true, bonuses: [{ type: 'ability', value: 1, abilityId: 'equation_breaker', abilityLevel: 1 }, { type: 'growth_xV', value: 1.1 }, { type: 'ice_defense_multiplier_xV', value: 4 / 5 }] },
  { id: 'nimble', name: '軽快', shortName: '軽', category: '適応', selectable: true, bonuses: [{ type: 'evasion', value: 0.01 }, { type: 'thunder_defense_multiplier_xV', value: 4 / 5 }] },
  { id: 'perceptive', name: '看破', shortName: '看', category: '機知', selectable: true, bonuses: [{ type: 'ability', value: 1, abilityId: 'true_sight', abilityLevel: 1 }, { type: 'penet', value: 0.1 }, { type: 'bolt_multiplier', value: 1.1 }, { type: 'intelligence', value: 1 }] },
  { id: 'precise', name: '精確', shortName: '精', category: '機知', selectable: true, bonuses: [{ type: 'ability', value: 1, abilityId: 'output_stabilizer', abilityLevel: 1 }, { type: 'accuracy', value: 0.02 }, { type: 'archery_multiplier', value: 1.1 }, { type: 'strength', value: 1 }] },
  { id: 'resourceful', name: '手腕', shortName: '腕', category: '機知', selectable: true, bonuses: [{ type: 'equip_slot', value: 1 }, { type: 'gauntlet_multiplier', value: 1.1 }] },
];

const LEGACY_PREDISPOSITION_ID_ALIASES: Record<string, Predisposition['id']> = {
  sturdy: 'stubborn',
  agile: 'evasive',
  shirk: 'evasive',
  brilliant: 'inquisitive',
  dexterous: 'precise',
  chivalric: 'aggressive',
  shikon: 'amiable',
  pursuing: 'perceptive',
  canny: 'resourceful',
  persistent: 'introspective',
};

export const getPredispositionById = (id: string): Predisposition | undefined => {
  const mappedId = LEGACY_PREDISPOSITION_ID_ALIASES[id] ?? id;
  return PREDISPOSITIONS.find(p => p.id === mappedId);
};
