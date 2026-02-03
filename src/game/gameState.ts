import { Item } from '../types';
import { ENHANCEMENT_TITLES, SUPER_RARE_TITLES } from '../data/items';

export function getItemDisplayName(item: Item): string {
  const enhTitle = ENHANCEMENT_TITLES.find(t => t.value === item.enhancement)?.title ?? '';
  const srTitle = SUPER_RARE_TITLES.find(t => t.value === item.superRare)?.title ?? '';
  return `${srTitle}${enhTitle}${item.name}`;
}

export function getItemMultiplier(item: Item): number {
  const enhMult = ENHANCEMENT_TITLES.find(t => t.value === item.enhancement)?.multiplier ?? 1;
  const srMult = SUPER_RARE_TITLES.find(t => t.value === item.superRare)?.multiplier ?? 1;
  return enhMult * srMult;
}
