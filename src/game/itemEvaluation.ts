import type { Character, Item } from '../types';
import { canCharacterEquipCategory } from './equipmentSets';
import { computeCharacterStats } from './characterComputation';
import { getItemDisplayMultiplier } from './itemPower';
import { getJewelCBonusValue, getJewelDRankBonus, JEWEL_DEFS } from './jewel';
import { getCharacterGrowthMultiplier, getCharacterMultiplier } from './partyComputation';

// SpecRef: 9.1.3 | Read | 2-3-5 character/{characterId}/equipmentEvaluation
// SpecRef: 8.2.4 | Equipment management | Inventory in party tab respects `item_category_x1.x` amplifier
// The status one item would show for one character: its own `d.` stats scaled by enhancement, Super Rare title, and the
// item's multipliers plus the character's equipment-category bonus (for example `c.katana_x1.4`) and, for HP, the
// character's growth and vitality/mind scale. Values are the ones the Party pane prints for that item.

export interface ItemStatusFact { key: string; value: number; unit: 'number' | 'ratio' }
export interface EvaluatedItemStatus {
  /** The character has the equipment aptitude (`c.equip_melee`, `c.equip_ranged`, `c.equip_magic`) for the item's category. */
  equippable: boolean;
  stats: ItemStatusFact[];
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

export function evaluateItemForCharacter(character: Character, item: Item, partyLevel: number): EvaluatedItemStatus {
  const categoryMultiplier = getCharacterMultiplier(character, item.category);
  const multiplier = getItemDisplayMultiplier(item, categoryMultiplier);
  const baseStats = computeCharacterStats(character, partyLevel).baseStats;
  const hpScale = ((baseStats.vitality + baseStats.mind) / 20) * getCharacterGrowthMultiplier(character);
  // A positive attack-count bonus scales with the multipliers; a penalty stays fixed.
  const scaledNoA = (value: number): number => round2(value > 0 ? value * multiplier : value);
  const jewelCBonus = item.jewel ? getJewelCBonusValue(item.jewel.key, item.jewel.rank) : 0;
  const jewelCType = item.jewel ? JEWEL_DEFS[item.jewel.key].cBonusType : null;

  const stats: ItemStatusFact[] = [];
  const add = (key: string, value: number | undefined, unit: ItemStatusFact['unit'] = 'number') => {
    if (typeof value === 'number' && value !== 0) stats.push({ key, value, unit });
  };
  add('d.melee_attack', Math.round(((item.meleeAttack ?? 0) + getJewelDRankBonus(item.jewel, 'meleeAttack')) * multiplier));
  add('d.ranged_attack', Math.round(((item.rangedAttack ?? 0) + getJewelDRankBonus(item.jewel, 'rangedAttack')) * multiplier));
  add('d.magical_attack', Math.round(((item.magicalAttack ?? 0) + getJewelDRankBonus(item.jewel, 'magicalAttack')) * multiplier));
  add('d.melee_NoA', scaledNoA(item.meleeNoA ?? 0));
  add('d.ranged_NoA', scaledNoA(item.rangedNoA ?? 0));
  add('d.magical_NoA', scaledNoA(item.magicalNoA ?? 0));
  add('d.physical_defense', Math.round(((item.physicalDefense ?? 0) + getJewelDRankBonus(item.jewel, 'physicalDefense')) * multiplier));
  add('d.magical_defense', Math.round(((item.magicalDefense ?? 0) + getJewelDRankBonus(item.jewel, 'magicalDefense')) * multiplier));
  add('d.HP', Math.round((item.partyHP ?? 0) * multiplier * hpScale) + Math.round(getJewelDRankBonus(item.jewel, 'partyHP') * multiplier * hpScale));
  add('c.melee_NoA', item.meleeNoABonus);
  add('c.ranged_NoA', item.rangedNoABonus);
  add('c.magical_NoA', item.magicalNoABonus);
  add('c.physical_attack', jewelCType === 'physical_attack' ? jewelCBonus : 0, 'ratio');
  add('c.magical_attack', jewelCType === 'magical_attack' ? jewelCBonus : 0, 'ratio');
  add('c.physical_defense', jewelCType === 'physical_defense' ? jewelCBonus : 0, 'ratio');
  add('c.magical_defense', jewelCType === 'magical_defense' ? jewelCBonus : 0, 'ratio');
  add('c.accuracy', (item.accuracyBonus ?? 0) + (jewelCType === 'accuracy' ? jewelCBonus : 0), 'ratio');
  add('c.evasion', (item.evasionBonus ?? 0) + (jewelCType === 'evasion' ? jewelCBonus : 0), 'ratio');
  add('c.penet', item.penetBonus, 'ratio');
  add('b.vitality', item.vitalityBonus);
  add('b.strength', item.strengthBonus);
  add('b.intelligence', item.intelligenceBonus);
  add('b.mind', item.mindBonus);
  if (item.elementalOffense && item.elementalOffense !== 'none') add(`e.${item.elementalOffense}`, item.elementalOffenseBonus, 'ratio');
  stats.push({ key: 'f.category_multiplier', value: categoryMultiplier, unit: 'ratio' });
  stats.push({ key: 'f.item_multiplier', value: multiplier, unit: 'ratio' });
  return { equippable: canCharacterEquipCategory(character, item.category), stats };
}
