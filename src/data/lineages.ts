import { t } from '../i18n';
import { Lineage } from '../types';

// SpecRef: 2.1 | CHARACTER_&_PARTY | lineage(系譜)
// SpecRef: 8.2.3 | Character Edit Mode (selected member) | Lineage selection
export const LINEAGES: Lineage[] = [
  { id: 'sandstorm', get name() { return t('data.lineages.sandstorm.name'); }, get shortName() { return t('data.lineages.sandstorm.shortName'); }, get category() { return t('data.lineages.sandstorm.category'); }, selectable: true, bonuses: [{ type: 'ability', value: 1, abilityId: 'null_corrode', abilityLevel: 1 }, { type: 'sword_multiplier', value: 1.2 }, { type: 'grimoire_multiplier', value: 1.2 }] },
  { id: 'ashen_capital', get name() { return t('data.lineages.ashen_capital.name'); }, get shortName() { return t('data.lineages.ashen_capital.shortName'); }, get category() { return t('data.lineages.ashen_capital.category'); }, selectable: true, bonuses: [{ type: 'ability', value: 1, abilityId: 'null_life_drain', abilityLevel: 1 }, { type: 'katana_multiplier', value: 1.2 }, { type: 'arrow_multiplier', value: 1.2 }] },
  { id: 'blaze_peak', get name() { return t('data.lineages.blaze_peak.name'); }, get shortName() { return t('data.lineages.blaze_peak.shortName'); }, get category() { return t('data.lineages.blaze_peak.category'); }, selectable: true, bonuses: [{ type: 'ability', value: 1, abilityId: 'null_burn', abilityLevel: 1 }, { type: 'gauntlet_multiplier', value: 1.2 }, { type: 'armor_multiplier', value: 1.2 }, { type: 'fire_defense_multiplier_xV', value: 4 / 5 }] },
  { id: 'abyssal_sea', get name() { return t('data.lineages.abyssal_sea.name'); }, get shortName() { return t('data.lineages.abyssal_sea.shortName'); }, get category() { return t('data.lineages.abyssal_sea.category'); }, selectable: true, bonuses: [{ type: 'ability', value: 1, abilityId: 'null_bind', abilityLevel: 1 }, { type: 'arrow_multiplier', value: 1.2 }, { type: 'catalyst_multiplier', value: 1.2 }] },
  { id: 'firmament', get name() { return t('data.lineages.firmament.name'); }, get shortName() { return t('data.lineages.firmament.shortName'); }, get category() { return t('data.lineages.firmament.category'); }, selectable: true, bonuses: [{ type: 'ability', value: 1, abilityId: 'siege', abilityLevel: 1 }, { type: 'bolt_multiplier', value: 1.2 }, { type: 'shield_multiplier', value: 1.2 }] },
  { id: 'frozen_forest', get name() { return t('data.lineages.frozen_forest.name'); }, get shortName() { return t('data.lineages.frozen_forest.shortName'); }, get category() { return t('data.lineages.frozen_forest.category'); }, selectable: true, bonuses: [{ type: 'ability', value: 1, abilityId: 'coldproof', abilityLevel: 1 }, { type: 'archery_multiplier', value: 1.2 }, { type: 'robe_multiplier', value: 1.2 }, { type: 'ice_defense_multiplier_xV', value: 4 / 5 }] },
  { id: 'utopia', get name() { return t('data.lineages.utopia.name'); }, get shortName() { return t('data.lineages.utopia.shortName'); }, get category() { return t('data.lineages.utopia.category'); }, selectable: true, bonuses: [{ type: 'ability', value: 1, abilityId: 'null_death_touch', abilityLevel: 1 }, { type: 'wand_multiplier', value: 1.2 }, { type: 'bolt_multiplier', value: 1.2 }] },
  { id: 'machina', get name() { return t('data.lineages.machina.name'); }, get shortName() { return t('data.lineages.machina.shortName'); }, get category() { return t('data.lineages.machina.category'); }, selectable: true, bonuses: [{ type: 'ability', value: 1, abilityId: 'null_shock', abilityLevel: 1 }, { type: 'grimoire_multiplier', value: 1.2 }, { type: 'gauntlet_multiplier', value: 1.2 }] },
  { id: 'adaptation', get name() { return t('data.lineages.adaptation.name'); }, get shortName() { return t('data.lineages.adaptation.shortName'); }, get category() { return t('data.lineages.adaptation.category'); }, selectable: true, bonuses: [{ type: 'catalyst_multiplier', value: 1.2 }, { type: 'archery_multiplier', value: 1.2 }, { type: 'evasion', value: 0.02 }, { type: 'thunder_defense_multiplier_xV', value: 3 / 4 }] },
  { id: 'fragment', get name() { return t('data.lineages.fragment.name'); }, get shortName() { return t('data.lineages.fragment.shortName'); }, get category() { return t('data.lineages.fragment.category'); }, selectable: true, bonuses: [{ type: 'ability', value: 1, abilityId: 'unforgettable', abilityLevel: 1 }, { type: 'armor_multiplier', value: 1.2 }, { type: 'wand_multiplier', value: 1.2 }] },
  { id: 'windcross', get name() { return t('data.lineages.windcross.name'); }, get shortName() { return t('data.lineages.windcross.shortName'); }, get category() { return t('data.lineages.windcross.category'); }, selectable: true, bonuses: [{ type: 'ability', value: 1, abilityId: 'wind_rider', abilityLevel: 1 }, { type: 'robe_multiplier', value: 1.2 }, { type: 'katana_multiplier', value: 1.2 }] },
  { id: 'oath', get name() { return t('data.lineages.oath.name'); }, get shortName() { return t('data.lineages.oath.shortName'); }, get category() { return t('data.lineages.oath.category'); }, selectable: true, bonuses: [{ type: 'ability', value: 1, abilityId: 'requiem', abilityLevel: 1 }, { type: 'shield_multiplier', value: 1.2 }, { type: 'sword_multiplier', value: 1.2 }] },
  { id: 'unascertained', get name() { return t('data.lineages.unascertained.name'); }, get shortName() { return t('data.lineages.unascertained.shortName'); }, category: '-', selectable: false, bonuses: [{ type: 'equip_slot', value: 3 }] },
  { id: 'pioneer', get name() { return t('data.lineages.pioneer.name'); }, get shortName() { return t('data.lineages.pioneer.shortName'); }, category: '-', selectable: false, bonuses: [{ type: 'wand_multiplier', value: 1.3 }, { type: 'ability', value: 1, abilityId: 'seeker', abilityLevel: 1 }] },
  { id: 'almighty', get name() { return t('data.lineages.almighty.name'); }, get shortName() { return t('data.lineages.almighty.shortName'); }, category: '-', selectable: false, bonuses: [{ type: 'growth_xV', value: 1.3 }, { type: 'sword_multiplier', value: 1.3 }, { type: 'arrow_multiplier', value: 1.3 }, { type: 'wand_multiplier', value: 1.3 }, { type: 'vitality', value: 1 }, { type: 'strength', value: 1 }, { type: 'intelligence', value: 1 }, { type: 'mind', value: 1 }] },
  { id: 'hidden_grail', get name() { return t('data.lineages.hidden_grail.name'); }, get shortName() { return t('data.lineages.hidden_grail.shortName'); }, category: '-', selectable: false, bonuses: [{ type: 'evasion', value: 0.01 }, { type: 'robe_multiplier', value: 1.3 }, { type: 'vitality', value: 1 }] },
  { id: 'rowdy_orca_girl', get name() { return t('data.lineages.rowdy_orca_girl.name'); }, get shortName() { return t('data.lineages.rowdy_orca_girl.shortName'); }, category: '-', selectable: false, bonuses: [{ type: 'ability', value: 1, abilityId: 'bind', abilityLevel: 1 }, { type: 'sword_multiplier', value: 1.2 }, { type: 'arrow_multiplier', value: 1.2 }, { type: 'intelligence', value: -1 }] },
  { id: 'meddlesome_fox', get name() { return t('data.lineages.meddlesome_fox.name'); }, get shortName() { return t('data.lineages.meddlesome_fox.shortName'); }, category: '-', selectable: false, bonuses: [{ type: 'ability', value: 1, abilityId: 'defender', abilityLevel: 1 }, { type: 'shield_multiplier', value: 1.3 }] },
  { id: 'crescent_jade', get name() { return t('data.lineages.crescent_jade.name'); }, get shortName() { return t('data.lineages.crescent_jade.shortName'); }, category: '-', selectable: false, bonuses: [{ type: 'ability', value: 1, abilityId: 'death_touch', abilityLevel: 1 }, { type: 'wand_multiplier', value: 1.1 }, { type: 'robe_multiplier', value: 1.1 }] },
  { id: 'phantom_thief', get name() { return t('data.lineages.phantom_thief.name'); }, get shortName() { return t('data.lineages.phantom_thief.shortName'); }, category: '-', selectable: false, bonuses: [{ type: 'ability', value: 1, abilityId: 'ranged_reflect', abilityLevel: 1 }, { type: 'gauntlet_multiplier', value: 1.2 }, { type: 'mind', value: 1 }] },
  { id: 'flamebound_grove', get name() { return t('data.lineages.flamebound_grove.name'); }, get shortName() { return t('data.lineages.flamebound_grove.shortName'); }, category: '-', selectable: false, bonuses: [{ type: 'ability', value: 1, abilityId: 'fire_absorb', abilityLevel: 1 }, { type: 'sword_multiplier', value: 1.1 }] },
  { id: 'apostate', get name() { return t('data.lineages.apostate.name'); }, get shortName() { return t('data.lineages.apostate.shortName'); }, category: '-', selectable: false, bonuses: [{ type: 'grimoire_multiplier', value: 1.3 }, { type: 'bolt_multiplier', value: 1.2 }, { type: 'mind', value: 3 }] },
  { id: 'incarnation', get name() { return t('data.lineages.incarnation.name'); }, get shortName() { return t('data.lineages.incarnation.shortName'); }, category: '-', selectable: false, bonuses: [{ type: 'ability', value: 1, abilityId: 'boost', abilityLevel: 2 }, { type: 'ability', value: 1, abilityId: 'resonance', abilityLevel: 1 }, { type: 'ability', value: 1, abilityId: 'prophecy', abilityLevel: 1 }, { type: 'intelligence', value: 1 }] },
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
