import { Item } from '../types';
import { ENHANCEMENT_TITLES, SUPER_RARE_TITLES } from '../data/items';
import { jewelLabel } from './jewel';

const CORE_CONCEPT_KEY_BY_CATEGORY = {
  armor: 'physicalDefense',
  robe: 'magicalDefense',
  shield: 'partyHP',
  sword: 'meleeAttack',
  katana: 'meleeAttack',
  gauntlet: 'meleeNoA',
  arrow: 'rangedAttack',
  bolt: 'rangedAttack',
  archery: 'rangedNoA',
  wand: 'magicalAttack',
  grimoire: 'magicalAttack',
  catalyst: 'magicalNoA',
} as const satisfies Record<Item['category'], keyof Item>;

// SpecRef: 3.1.3 | Item variation | getItemDisplayName
export function getItemDisplayName(item: Item): string {
  const enhTitle = ENHANCEMENT_TITLES.find(t => t.value === item.enhancement)?.title ?? '';
  const srTitle = SUPER_RARE_TITLES.find(t => t.value === item.superRare)?.title ?? '';
  return `${srTitle}${enhTitle}${item.name}${jewelLabel(item.jewel)}`;
}

// SpecRef: 3.1.3 | Item variation | getItemMultiplier
export function getItemMultiplier(item: Item): number {
  const enhMult = ENHANCEMENT_TITLES.find(t => t.value === item.enhancement)?.multiplier ?? 1;
  const srMult = SUPER_RARE_TITLES.find(t => t.value === item.superRare)?.multiplier ?? 1;
  const baseMult = item.baseMultiplier ?? 1;
  return enhMult * srMult * baseMult;
}

// SpecRef: 3.1.2 | Item list | Item type
export function getItemCoreConceptValue(item: Item): number {
  const key = CORE_CONCEPT_KEY_BY_CATEGORY[item.category];
  const rawValue = item[key];
  const baseValue = typeof rawValue === 'number' ? rawValue : 0;
  return baseValue * getItemMultiplier(item);
}

// SpecRef: 7.1.1.2 | Equipping into empty slots | Search for a candidate item
export function getItemAutoEquipmentSelectionValue(item: Item): number {
  const coreConceptValue = getItemCoreConceptValue(item);
  switch (item.category) {
    case 'gauntlet':
      return coreConceptValue + (item.meleeNoABonus ?? 0);
    case 'archery':
      return coreConceptValue + (item.rangedNoABonus ?? 0);
    case 'catalyst':
      return coreConceptValue + (item.magicalNoABonus ?? 0);
    default:
      return coreConceptValue;
  }
}
