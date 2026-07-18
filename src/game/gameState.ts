import { Item } from '../types';
import { ENHANCEMENT_TITLES, SUPER_RARE_TITLES } from '../data/items';
import { jewelLabel } from './jewel';
import { t } from '../i18n';

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

// SpecRef: 3.2.1 | Item drop | Localized item display name
export function getLocalizedItemName(item: Pick<Item, 'name'>): string {
  return t(`item.name.${item.name}`);
}

// SpecRef: 3.1.3 | Item variation | Localized enhancement title
export function getLocalizedEnhancementTitle(value: number): string {
  const title = ENHANCEMENT_TITLES.find(t => t.value === value)?.title ?? '';
  return title ? t(`item.enhancementTitle.${title}`) : '';
}

// SpecRef: 3.1.3 | Item variation | Localized Super Rare title
export function getLocalizedSuperRareTitle(value: number): string {
  const title = SUPER_RARE_TITLES.find(t => t.value === value)?.title ?? '';
  return title ? t(`item.superRareTitle.${title}`) : '';
}

// SpecRef: 3.1.3 | Item variation | getItemDisplayName
export function getItemDisplayName(item: Item): string {
  const enhTitle = getLocalizedEnhancementTitle(item.enhancement);
  const srTitle = getLocalizedSuperRareTitle(item.superRare);
  return `${srTitle}${enhTitle}${getLocalizedItemName(item)}${jewelLabel(item.jewel)}`;
}

// SpecRef: 3.1.3 | Item variation | getItemMultiplier
function getItemMultiplier(item: Item): number {
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
