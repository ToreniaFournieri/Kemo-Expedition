import { Lineage } from '../types';

// SpecRef: 2.1 | CHARACTER_&_PARTY | lineage(系譜)
// SpecRef: 8.2.3 | Character Edit Mode (selected member) | Lineage selection
export const LINEAGES: Lineage[] = [
  { id: 'sandstorm', name: '砂塵の系譜', shortName: '砂', category: '動乱', selectable: true, bonuses: [{ type: 'sword_multiplier', value: 1.2 }] },
  { id: 'ashen_capital', name: '灰都の系譜', shortName: '灰', category: '動乱', selectable: true, bonuses: [{ type: 'katana_multiplier', value: 1.2 }] },
  { id: 'blaze_peak', name: '焔嶺の系譜', shortName: '焔', category: '動乱', selectable: true, bonuses: [{ type: 'gauntlet_multiplier', value: 1.2 }, { type: 'fire_defense_multiplier_xV', value: 4 / 5 }] },
  { id: 'abyssal_sea', name: '深海の系譜', shortName: '海', category: '狩猟', selectable: true, bonuses: [{ type: 'arrow_multiplier', value: 1.2 }] },
  { id: 'firmament', name: '天穹の系譜', shortName: '穹', category: '狩猟', selectable: true, bonuses: [{ type: 'bolt_multiplier', value: 1.2 }] },
  { id: 'frozen_forest', name: '凍森の系譜', shortName: '凍', category: '狩猟', selectable: true, bonuses: [{ type: 'archery_multiplier', value: 1.2 }, { type: 'ice_defense_multiplier_xV', value: 4 / 5 }] },
  { id: 'utopia', name: '桃源の系譜', shortName: '桃', category: '学識', selectable: true, bonuses: [{ type: 'wand_multiplier', value: 1.2 }] },
  { id: 'machina', name: '機骸の系譜', shortName: '機', category: '学識', selectable: true, bonuses: [{ type: 'grimoire_multiplier', value: 1.2 }] },
  { id: 'adaptation', name: '適応の系譜', shortName: '適', category: '学識', selectable: true, bonuses: [{ type: 'catalyst_multiplier', value: 1.2 }, { type: 'thunder_defense_multiplier_xV', value: 3 / 4 }] },
  { id: 'fragment', name: '断章の系譜', shortName: '断', category: '生存', selectable: true, bonuses: [{ type: 'armor_multiplier', value: 1.2 }] },
  { id: 'windcross', name: '風渡の系譜', shortName: '風', category: '生存', selectable: true, bonuses: [{ type: 'robe_multiplier', value: 1.2 }] },
  { id: 'oath', name: '誓約の系譜', shortName: '誓', category: '生存', selectable: true, bonuses: [{ type: 'shield_multiplier', value: 1.2 }] },
  { id: 'unascertained', name: '不詳', shortName: '不', category: '-', selectable: false, bonuses: [{ type: 'armor_multiplier', value: 1.3 }, { type: 'robe_multiplier', value: 1.3 }] },
  { id: 'pioneer', name: '先駆者', shortName: '先', category: '-', selectable: false, bonuses: [{ type: 'wand_multiplier', value: 1.3 }, { type: 'ability', value: 1, abilityId: 'seeker', abilityLevel: 1 }] },
  { id: 'almighty', name: '全能', shortName: '全', category: '-', selectable: false, bonuses: [{ type: 'growth_xV', value: 1.3 }, { type: 'sword_multiplier', value: 1.3 }, { type: 'arrow_multiplier', value: 1.3 }, { type: 'wand_multiplier', value: 1.3 }, { type: 'vitality', value: 1 }, { type: 'strength', value: 1 }, { type: 'intelligence', value: 1 }, { type: 'mind', value: 1 }] },
  { id: 'hidden_grail', name: '隠された杯', shortName: '杯', category: '-', selectable: false, bonuses: [{ type: 'evasion', value: 0.01 }, { type: 'robe_multiplier', value: 1.3 }, { type: 'vitality', value: 1 }] },
  { id: 'rowdy_orca_girl', name: 'わんぱくシャチ娘', shortName: 'わ', category: '-', selectable: false, bonuses: [{ type: 'ability', value: 1, abilityId: 'bind', abilityLevel: 1 }, { type: 'sword_multiplier', value: 1.2 }, { type: 'arrow_multiplier', value: 1.2 }, { type: 'intelligence', value: -1 }] },
  { id: 'meddlesome_fox', name: '世話焼き狐', shortName: '世', category: '-', selectable: false, bonuses: [{ type: 'ability', value: 1, abilityId: 'defender', abilityLevel: 1 }, { type: 'shield_multiplier', value: 1.3 }] },
  { id: 'crescent_jade', name: '三日月瑶', shortName: '月', category: '-', selectable: false, bonuses: [{ type: 'ability', value: 1, abilityId: 'death_touch', abilityLevel: 1 }, { type: 'wand_multiplier', value: 1.1 }, { type: 'robe_multiplier', value: 1.1 }] },
  { id: 'phantom_thief', name: '怪盗', shortName: '怪', category: '-', selectable: false, bonuses: [{ type: 'ability', value: 1, abilityId: 'ranged_reflect', abilityLevel: 1 }, { type: 'gauntlet_multiplier', value: 1.2 }, { type: 'mind', value: 1 }] },
  { id: 'flamebound_grove', name: '炎の杜', shortName: '炎', category: '-', selectable: false, bonuses: [{ type: 'ability', value: 1, abilityId: 'fire_absorb', abilityLevel: 1 }, { type: 'sword_multiplier', value: 1.1 }] },
  { id: 'apostate', name: '背教者', shortName: '背', category: '-', selectable: false, bonuses: [{ type: 'grimoire_multiplier', value: 1.3 }, { type: 'bolt_multiplier', value: 1.2 }, { type: 'mind', value: 3 }] },
  { id: 'incarnation', name: '化身', shortName: '化', category: '-', selectable: false, bonuses: [{ type: 'ability', value: 1, abilityId: 'boost', abilityLevel: 1 }, { type: 'ability', value: 1, abilityId: 'resonance', abilityLevel: 1 }, { type: 'ability', value: 1, abilityId: 'prophecy', abilityLevel: 1 }, { type: 'intelligence', value: 1 }] },
  { id: 'unexpected_prince(ss)', name: 'UNEXPECTED PRINCE(SS)', shortName: 'U', category: '-', selectable: false, bonuses: [{ type: 'ability', value: 1, abilityId: 'melee_conversion', abilityLevel: 1 }, { type: 'equip_melee', value: 1 }, { type: 'strength', value: 1 }] },
];

const LEGACY_LINEAGE_ID_ALIASES: Record<string, Lineage['id']> = {
  steel_oath: 'sandstorm',
  war_spirit: 'ashen_capital',
  breaking_hand: 'blaze_peak',
  far_sight: 'abyssal_sea',
  guiding_thought: 'firmament',
  hidden_principles: 'utopia',
  unmoving: 'fragment',
  inherited_oaths: 'oath',
  usurper: 'meddlesome_fox',
  apex_predator: 'crescent_jade',
  true_heir: 'unexpected_prince(ss)',
};

export const getLineageById = (id: string): Lineage | undefined => {
  const mappedId = LEGACY_LINEAGE_ID_ALIASES[id] ?? id;
  return LINEAGES.find(l => l.id === mappedId);
};
