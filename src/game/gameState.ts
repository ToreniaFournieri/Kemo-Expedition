import { Item } from '../types';
import { ENHANCEMENT_TITLES, SUPER_RARE_TITLES } from '../data/items';
import { jewelLabel } from './jewel';

// SpecRef: 2.5.3 | Item variation | getItemDisplayName
export function getItemDisplayName(item: Item): string {
  const enhTitle = ENHANCEMENT_TITLES.find(t => t.value === item.enhancement)?.title ?? '';
  const srTitle = SUPER_RARE_TITLES.find(t => t.value === item.superRare)?.title ?? '';
  return `${srTitle}${enhTitle}${item.name}${jewelLabel(item.jewel)}`;
}

// SpecRef: 2.5.3 | Item variation | getItemMultiplier
export function getItemMultiplier(item: Item): number {
  const enhMult = ENHANCEMENT_TITLES.find(t => t.value === item.enhancement)?.multiplier ?? 1;
  const srMult = SUPER_RARE_TITLES.find(t => t.value === item.superRare)?.multiplier ?? 1;
  const baseMult = item.baseMultiplier ?? 1;
  return enhMult * srMult * baseMult;
}
