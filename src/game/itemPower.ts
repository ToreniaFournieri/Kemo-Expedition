import { ENHANCEMENT_TITLES, SUPER_RARE_TITLES, getSuperRareBonuses } from '../data/items';
import type { BonusType, Item, ItemCategory } from '../types';
import { getJewelDRankBonus } from './jewel';

// SpecRef: 3.1.1 | Item category | `base_power` of each item category
// SpecRef: 8.4.2 | Inventory(所持品) | Equipment status values display the item's base status only
// The item power shown in the Inventory: the base stat scaled by enhancement, Super Rare title, and the item's own
// multipliers, without any character equipment bonus such as `c.katana_x1.4`.

const SELF_CATEGORY_MULTIPLIER: Partial<Record<ItemCategory, BonusType>> = {
  sword: 'sword_multiplier', katana: 'katana_multiplier', archery: 'archery_multiplier', armor: 'armor_multiplier', gauntlet: 'gauntlet_multiplier',
  wand: 'wand_multiplier', robe: 'robe_multiplier', shield: 'shield_multiplier', bolt: 'bolt_multiplier', grimoire: 'grimoire_multiplier',
  catalyst: 'catalyst_multiplier', arrow: 'arrow_multiplier',
};

export function getItemDisplayMultiplier(item: Item, categoryMultiplier: number = 1): number {
  const enhancementMultiplier = ENHANCEMENT_TITLES.find((title) => title.value === item.enhancement)?.multiplier ?? 1;
  const superRareMultiplier = SUPER_RARE_TITLES.find((title) => title.value === item.superRare)?.multiplier ?? 1;
  const selfCategoryBonusType = SELF_CATEGORY_MULTIPLIER[item.category];
  const selfCategoryMultiplier = selfCategoryBonusType
    ? getSuperRareBonuses(item.superRare).filter((bonus) => bonus.type === selfCategoryBonusType).reduce((total, bonus) => total * bonus.value, 1)
    : 1;
  return enhancementMultiplier * superRareMultiplier * (item.baseMultiplier ?? 1) * categoryMultiplier * selfCategoryMultiplier;
}

type BasePowerStat = 'physicalDefense' | 'magicalDefense' | 'partyHP' | 'meleeAttack' | 'meleeNoA' | 'rangedAttack' | 'rangedNoA' | 'magicalAttack' | 'magicalNoA';
const BASE_POWER_STAT: Record<ItemCategory, BasePowerStat> = {
  armor: 'physicalDefense', robe: 'magicalDefense', shield: 'partyHP', sword: 'meleeAttack', katana: 'meleeAttack', gauntlet: 'meleeNoA',
  arrow: 'rangedAttack', bolt: 'rangedAttack', archery: 'rangedNoA', wand: 'magicalAttack', grimoire: 'magicalAttack', catalyst: 'magicalNoA',
};

/**
 * The item's calculated `base_power`: only the `d.` stat that defines its category, scaled as the Inventory shows it.
 * An attached Jewel adds its own `d.` value for that stat before scaling. Attack, defense, and HP are whole numbers;
 * a positive NoA scales and keeps two decimals, a penalty stays fixed.
 */
export function getItemBasePower(item: Item): number {
  const stat = BASE_POWER_STAT[item.category];
  const multiplier = getItemDisplayMultiplier(item);
  const base = (item[stat] as number | undefined) ?? 0;
  if (stat === 'meleeNoA' || stat === 'rangedNoA' || stat === 'magicalNoA') {
    const scaled = base > 0 ? base * multiplier : base;
    return Math.round(scaled * 100) / 100;
  }
  if (stat === 'partyHP') {
    // Base and Jewel HP are rounded separately, as the party HP computation does.
    return Math.round(base * multiplier) + Math.round(getJewelDRankBonus(item.jewel, 'partyHP') * multiplier);
  }
  return Math.round((base + getJewelDRankBonus(item.jewel, stat)) * multiplier);
}
