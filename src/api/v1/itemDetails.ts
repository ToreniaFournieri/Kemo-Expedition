import { getJewelCBonusValue, getJewelDRankValue, JEWEL_DEFS } from '../../game/jewel';
import { getSuperRareBonuses } from '../../data/items';
import type { Bonus, BonusType, ElementalOffense, Item, JewelKey } from '../../types';

// SpecRef: 9.1.3 | 2-4-1 searchItems | `details`: `<ability>`, `<cBonus>`, and `<otherBonus>` fields
// Describes an item (or Jewel) as the ability, `c.` bonus, and other (`d.`, `e.`, `r.`, `b.`) bonus IDs the search returns
// and filters on. Values are the master-data (base) values, not enhancement-scaled. An item's Super Rare title bonuses
// follow its own, so a title's `c.evasion+0.015` is listed beside the item's own `c.evasion`.

export interface ItemDetails { ability: string[]; cBonus: string[]; otherBonus: string[] }
export type ItemDetailsMode = 'none' | 'ability' | 'cBonus' | 'otherBonus' | 'abilityAndCBonus' | 'all';

const kebab = (value: string) => value.replace(/_/g, '-');
const signed = (value: number, digits: number) => `${value < 0 ? '-' : '+'}${Math.abs(value).toFixed(digits)}`;
const percent = (value: number) => `${value < 0 ? '-' : '+'}${Math.round(Math.abs(value) * 100)}`;

/** Multipliers print as the fraction the specification uses (2/3, 3/5, ...) when the value is one, otherwise as a decimal. */
const FRACTIONS: ReadonlyArray<[string, number]> = [['1/2', 1 / 2], ['1/3', 1 / 3], ['2/3', 2 / 3], ['3/5', 3 / 5], ['3/4', 3 / 4], ['4/5', 4 / 5], ['1/5', 1 / 5], ['1/4', 1 / 4]];
function multiplier(value: number): string {
  const fraction = FRACTIONS.find(([, candidate]) => Math.abs(candidate - value) < 1e-6);
  return fraction ? fraction[0] : String(Number(value.toFixed(3)));
}

const PERCENT_TYPES: Partial<Record<BonusType, string>> = {
  melee_attack: 'c.melee-attack', ranged_attack: 'c.ranged-attack', magical_attack: 'c.magical-attack', physical_attack: 'c.physical-attack',
  physical_defense: 'c.physical-defense', magical_defense: 'c.magical-defense',
};
const MULTIPLIER_TYPES: Partial<Record<BonusType, string>> = {
  physical_defense_multiplier_xV: 'c.physical-defense', magical_defense_multiplier_xV: 'c.magical-defense',
  fire_defense_multiplier_xV: 'c.fire-defense', ice_defense_multiplier_xV: 'c.ice-defense', thunder_defense_multiplier_xV: 'c.thunder-defense',
  physical_offense_multiplier_xV: 'c.physical-offense', magical_offense_multiplier_xV: 'c.magical-offense',
};
const ELEMENT_OFFENSE: Partial<Record<BonusType, ElementalOffense>> = { fire_offense: 'fire', ice_offense: 'ice', thunder_offense: 'thunder' };
const ELEMENT_DEFENSE: Partial<Record<BonusType, string>> = { fire_defense: 'r.fire', ice_defense: 'r.ice', thunder_defense: 'r.thunder' };
const BASE_STATS: Partial<Record<BonusType, string>> = { vitality: 'b.vitality', strength: 'b.strength', intelligence: 'b.intelligence', mind: 'b.mind' };
// Category flags used only by the character screen, not part of an item's public bonus list.
const INTERNAL_ONLY = new Set<BonusType>(['grit', 'caster', 'pursuit', 'unimplemented_bonus']);

function classifyBonus(bonus: Bonus, details: ItemDetails): void {
  const { type, value } = bonus;
  if (INTERNAL_ONLY.has(type)) return;
  if (type === 'ability') {
    if (bonus.abilityId) details.ability.push(`a.${kebab(bonus.abilityId)}${(bonus.abilityLevel ?? 1) > 1 ? `:${bonus.abilityLevel}` : ''}`);
  } else if (type === 'ability_upgrade') {
    if (bonus.abilityId) details.cBonus.push(`c.upgrade_${kebab(bonus.abilityId)}${value < 0 ? '-' : '+'}${Math.abs(value)}`);
  } else if (PERCENT_TYPES[type]) details.cBonus.push(`${PERCENT_TYPES[type]}${percent(value)}`);
  else if (MULTIPLIER_TYPES[type]) details.cBonus.push(`${MULTIPLIER_TYPES[type]}-x${multiplier(value)}`);
  else if (type === 'penet') details.cBonus.push(`c.penet${signed(value, 2)}`);
  else if (type === 'accuracy' || type === 'evasion') details.cBonus.push(`c.${type}${signed(value, 3)}`);
  else if (type === 'growth_xV') details.cBonus.push(`c.growth_x${multiplier(value)}`);
  else if (type === 'equip_slot') details.cBonus.push(`c.equip-slot${value < 0 ? '-' : '+'}${Math.abs(value)}`);
  else if (type === 'antagonism' || type.startsWith('equip_')) details.cBonus.push(`c.${type}`);
  else if (ELEMENT_OFFENSE[type]) details.otherBonus.push(`e.${ELEMENT_OFFENSE[type]}${signed(value, 3)}`);
  else if (ELEMENT_DEFENSE[type]) details.otherBonus.push(`${ELEMENT_DEFENSE[type]}${value < 0 ? '+' : '-'}${Math.abs(value)}`);
  else if (BASE_STATS[type]) details.otherBonus.push(`${BASE_STATS[type]}${value < 0 ? '-' : '+'}${Math.abs(value)}`);
  else details.cBonus.push(`c.${kebab(type)}`);
}

const D_FIELDS: ReadonlyArray<[keyof Item, string]> = [
  ['meleeAttack', 'd.melee_attack'], ['meleeNoA', 'd.melee_NoA'], ['rangedAttack', 'd.ranged_attack'], ['rangedNoA', 'd.ranged_NoA'],
  ['magicalAttack', 'd.magical_attack'], ['magicalNoA', 'd.magical_NoA'], ['partyHP', 'd.HP'],
  ['physicalDefense', 'd.physical_defense'], ['magicalDefense', 'd.magical_defense'],
];
const C_FIELDS: ReadonlyArray<[keyof Item, string, 'count' | 'ratio']> = [
  ['meleeNoABonus', 'c.melee-NoA', 'count'], ['rangedNoABonus', 'c.ranged-NoA', 'count'], ['magicalNoABonus', 'c.magical-NoA', 'count'],
  ['accuracyBonus', 'c.accuracy', 'ratio'], ['evasionBonus', 'c.evasion', 'ratio'], ['penetBonus', 'c.penet', 'ratio'],
];

/** The `c.`, `d.`, `e.`, `r.`, `b.`, and ability IDs of a bonus list (an enemy's or an item's unique bonuses). */
export function describeBonuses(bonuses: readonly Bonus[]): ItemDetails {
  const details: ItemDetails = { ability: [], cBonus: [], otherBonus: [] };
  for (const bonus of bonuses) classifyBonus(bonus, details);
  return details;
}

export function describeItem(item: Item): ItemDetails {
  const details: ItemDetails = { ability: [], cBonus: [], otherBonus: [] };
  for (const [field, id] of D_FIELDS) {
    const value = item[field];
    if (typeof value === 'number' && value !== 0) details.otherBonus.push(`${id}:${value}`);
  }
  if (item.elementalOffense && item.elementalOffense !== 'none' && item.elementalOffenseBonus) details.otherBonus.push(`e.${item.elementalOffense}${signed(item.elementalOffenseBonus, 3)}`);
  for (const [field, id, kind] of C_FIELDS) {
    const value = item[field];
    if (typeof value === 'number' && value !== 0) details.cBonus.push(kind === 'count' ? `${id}${value < 0 ? '-' : '+'}${Math.abs(value)}` : `${id}${signed(value, id === 'c.penet' ? 2 : 3)}`);
  }
  for (const [field, id] of [['vitalityBonus', 'b.vitality'], ['strengthBonus', 'b.strength'], ['intelligenceBonus', 'b.intelligence'], ['mindBonus', 'b.mind']] as const) {
    const value = item[field];
    if (typeof value === 'number' && value !== 0) details.otherBonus.push(`${id}${value < 0 ? '-' : '+'}${Math.abs(value)}`);
  }
  for (const bonus of item.bonuses ?? []) classifyBonus(bonus, details);
  for (const bonus of getSuperRareBonuses(item.superRare)) classifyBonus(bonus, details);
  return details;
}

/** A Jewel's rank-specific bonuses (3.1.7): its `c.` bonus and its `d.` base bonuses. Jewels carry no abilities. */
export function describeJewel(key: JewelKey, rank: number): ItemDetails {
  const definition = JEWEL_DEFS[key];
  const details: ItemDetails = { ability: [], cBonus: [], otherBonus: [] };
  classifyBonus({ type: definition.cBonusType, value: getJewelCBonusValue(key, rank) }, details);
  for (const { stat, base } of definition.dBaseBonuses) {
    const id = stat === 'partyHP' ? 'd.HP' : stat === 'meleeAttack' ? 'd.melee_attack' : stat === 'rangedAttack' ? 'd.ranged_attack' : stat === 'magicalAttack' ? 'd.magical_attack' : stat === 'physicalDefense' ? 'd.physical_defense' : 'd.magical_defense';
    details.otherBonus.push(`${id}:${getJewelDRankValue(base, rank)}`);
  }
  return details;
}

/** The fields appended after the base format for the selected `details` mode, in the fixed order ability, cBonus, otherBonus. */
export function formatItemDetails(details: ItemDetails, mode: ItemDetailsMode): string[] {
  const fields: string[] = [];
  const wantsAbility = mode === 'ability' || mode === 'abilityAndCBonus' || mode === 'all';
  const wantsC = mode === 'cBonus' || mode === 'abilityAndCBonus' || mode === 'all';
  const wantsOther = mode === 'otherBonus' || mode === 'all';
  if (wantsAbility) fields.push(`ability=[${details.ability.join(', ')}]`);
  if (wantsC) fields.push(`cBonus=[${details.cBonus.join(', ')}]`);
  if (wantsOther) fields.push(`otherBonus=[${details.otherBonus.join(', ')}]`);
  return fields;
}
