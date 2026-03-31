import { Lineage } from '../types';

// SpecRef: 8.2.3 | Character Edit Mode (selected member) | Lineage selection
export const LINEAGES: Lineage[] = [
  { id: 'sandstorm', name: '砂塵の系譜', shortName: '砂', category: '動乱', bonuses: [{ type: 'sword_multiplier', value: 1.2 }] },
  { id: 'ashen_capital', name: '灰都の系譜', shortName: '灰', category: '動乱', bonuses: [{ type: 'katana_multiplier', value: 1.2 }] },
  { id: 'blaze_peak', name: '焔嶺の系譜', shortName: '焔', category: '動乱', bonuses: [{ type: 'gauntlet_multiplier', value: 1.2 }, { type: 'fire_defense_multiplier_xV', value: 4 / 5 }] },
  { id: 'abyssal_sea', name: '深海の系譜', shortName: '海', category: '狩猟', bonuses: [{ type: 'arrow_multiplier', value: 1.2 }] },
  { id: 'firmament', name: '天穹の系譜', shortName: '穹', category: '狩猟', bonuses: [{ type: 'bolt_multiplier', value: 1.2 }] },
  { id: 'frozen_forest', name: '凍森の系譜', shortName: '凍', category: '狩猟', bonuses: [{ type: 'archery_multiplier', value: 1.2 }, { type: 'ice_defense_multiplier_xV', value: 4 / 5 }] },
  { id: 'utopia', name: '桃源の系譜', shortName: '桃', category: '学識', bonuses: [{ type: 'wand_multiplier', value: 1.2 }] },
  { id: 'machina', name: '機骸の系譜', shortName: '機', category: '学識', bonuses: [{ type: 'grimoire_multiplier', value: 1.2 }] },
  { id: 'adaptation', name: '適応の系譜', shortName: '適', category: '学識', bonuses: [{ type: 'catalyst_multiplier', value: 1.2 }, { type: 'thunder_defense_multiplier_xV', value: 3 / 4 }] },
  { id: 'fragment', name: '断章の系譜', shortName: '断', category: '生存', bonuses: [{ type: 'armor_multiplier', value: 1.2 }] },
  { id: 'windcross', name: '風渡の系譜', shortName: '風', category: '生存', bonuses: [{ type: 'robe_multiplier', value: 1.2 }] },
  { id: 'oath', name: '誓約の系譜', shortName: '誓', category: '生存', bonuses: [{ type: 'shield_multiplier', value: 1.2 }] },
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
};

export const getLineageById = (id: string): Lineage | undefined => {
  const mappedId = LEGACY_LINEAGE_ID_ALIASES[id] ?? id;
  return LINEAGES.find(l => l.id === mappedId);
};
