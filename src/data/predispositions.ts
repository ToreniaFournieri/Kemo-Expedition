import { t } from '../i18n';
import { Predisposition } from '../types';

// SpecRef: 2.1.1 | Main elements | predisposition
// SpecRef: 8.2.3 | Character Edit Mode (selected member) | Predisposition selection
export const PREDISPOSITIONS: Predisposition[] = [
  { id: 'none', get name() { return t('data.predispositions.none.name'); }, shortName: '-', category: '-', selectable: false, bonuses: [] },
  { id: 'aggressive', get name() { return t('data.predispositions.aggressive.name'); }, get shortName() { return t('party.predispositionShort.aggressive'); }, get category() { return t('home.party.filter.extroverted'); }, selectable: true, bonuses: [{ type: 'sword_multiplier', value: 1.1 }, { type: 'bolt_multiplier', value: 1.1 }, { type: 'physical_offense_multiplier_xV', value: 1.1 }] },
  { id: 'inquisitive', get name() { return t('data.predispositions.inquisitive.name'); }, get shortName() { return t('party.predispositionShort.inquisitive'); }, get category() { return t('home.party.filter.extroverted'); }, selectable: true, bonuses: [{ type: 'arrow_multiplier', value: 1.1 }, { type: 'grimoire_multiplier', value: 1.1 }, { type: 'magical_offense_multiplier_xV', value: 1.1 }] },
  { id: 'amiable', get name() { return t('data.predispositions.amiable.name'); }, get shortName() { return t('party.predispositionShort.amiable'); }, get category() { return t('home.party.filter.extroverted'); }, selectable: true, bonuses: [{ type: 'gauntlet_multiplier', value: 1.1 }, { type: 'bolt_multiplier', value: 1.1 }, { type: 'magical_defense', value: 0.1 }] },
  { id: 'stubborn', get name() { return t('data.predispositions.stubborn.name'); }, get shortName() { return t('party.predispositionShort.stubborn'); }, get category() { return t('home.party.filter.introverted'); }, selectable: true, bonuses: [{ type: 'shield_multiplier', value: 1.1 }, { type: 'physical_defense', value: 0.1 }, { type: 'vitality', value: 1 }] },
  { id: 'evasive', get name() { return t('data.predispositions.evasive.name'); }, get shortName() { return t('party.predispositionShort.evasive'); }, get category() { return t('home.party.filter.introverted'); }, selectable: true, bonuses: [{ type: 'ability', value: 1, abilityId: 'null_antagonism', abilityLevel: 1 }, { type: 'evasion', value: 0.02 }, { type: 'robe_multiplier', value: 1.1 }] },
  { id: 'introspective', get name() { return t('data.predispositions.introspective.name'); }, get shortName() { return t('party.predispositionShort.introspective'); }, get category() { return t('home.party.filter.introverted'); }, selectable: true, bonuses: [{ type: 'ability', value: 1, abilityId: 'unforgettable', abilityLevel: 1 }, { type: 'wand_multiplier', value: 1.1 }, { type: 'armor_multiplier', value: 1.1 }] },
  { id: 'devoted', get name() { return t('data.predispositions.devoted.name'); }, get shortName() { return t('party.predispositionShort.devoted'); }, get category() { return t('home.party.filter.adaptation'); }, selectable: true, bonuses: [{ type: 'ability', value: 1, abilityId: 'first_aid', abilityLevel: 1 }, { type: 'shield_multiplier', value: 1.1 }, { type: 'fire_defense_multiplier_xV', value: 4 / 5 }] },
  { id: 'serene', get name() { return t('data.predispositions.serene.name'); }, get shortName() { return t('party.predispositionShort.serene'); }, get category() { return t('home.party.filter.adaptation'); }, selectable: true, bonuses: [{ type: 'ability', value: 1, abilityId: 'equation_breaker', abilityLevel: 1 }, { type: 'growth_xV', value: 1.1 }, { type: 'catalyst_multiplier', value: 1.1 }, { type: 'ice_defense_multiplier_xV', value: 4 / 5 }] },
  { id: 'nimble', get name() { return t('data.predispositions.nimble.name'); }, get shortName() { return t('party.predispositionShort.nimble'); }, get category() { return t('home.party.filter.adaptation'); }, selectable: true, bonuses: [{ type: 'ability', value: 1, abilityId: 'boost', abilityLevel: 1 }, { type: 'evasion', value: 0.01 }, { type: 'katana_multiplier', value: 1.1 }, { type: 'thunder_defense_multiplier_xV', value: 4 / 5 }] },
  { id: 'perceptive', get name() { return t('data.predispositions.perceptive.name'); }, get shortName() { return t('party.predispositionShort.perceptive'); }, get category() { return t('home.party.filter.wit'); }, selectable: true, bonuses: [{ type: 'ability', value: 1, abilityId: 'true_sight', abilityLevel: 1 }, { type: 'penet', value: 0.1 }, { type: 'bolt_multiplier', value: 1.1 }, { type: 'intelligence', value: 1 }] },
  { id: 'precise', get name() { return t('data.predispositions.precise.name'); }, get shortName() { return t('party.predispositionShort.precise'); }, get category() { return t('home.party.filter.wit'); }, selectable: true, bonuses: [{ type: 'ability', value: 1, abilityId: 'output_stabilizer', abilityLevel: 1 }, { type: 'accuracy', value: 0.02 }, { type: 'archery_multiplier', value: 1.1 }, { type: 'strength', value: 1 }] },
  { id: 'resourceful', get name() { return t('data.predispositions.resourceful.name'); }, get shortName() { return t('party.predispositionShort.resourceful'); }, get category() { return t('home.party.filter.wit'); }, selectable: true, bonuses: [{ type: 'equip_slot', value: 1 }, { type: 'gauntlet_multiplier', value: 1.1 }] },
];

const LEGACY_PREDISPOSITION_ID_ALIASES: Record<string, Predisposition['id']> = {
  None: 'none',
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
