import type { DiaryTrigger, ItemRarity } from '../types';

// SpecRef: 3.2.1 | Item drop | `x.item_id` rarity band
// The item id's last three digits select the rarity: 1xx common, 2xx uncommon, 3xx rare, 4xx epic, 5xx mythic.
export function getItemRarityById(itemId: number): ItemRarity {
  const rarityCode = itemId % 1000;
  if (rarityCode >= 500) return 'mythic';
  if (rarityCode >= 400) return 'epic';
  if (rarityCode >= 300) return 'rare';
  if (rarityCode >= 200) return 'uncommon';
  return 'common';
}

// SpecRef: 1.1 | 1.0.3 Item rarity tier
// Saves and runtime snapshots written before the item rarity rename store `eliteRare`, `bossRare`, and `mythicRare`
// as rarity values and Diary triggers. Loading upgrades them; nothing writes them any more.
const LEGACY_ITEM_RARITY: ReadonlyMap<string, ItemRarity & DiaryTrigger> = new Map<string, ItemRarity & DiaryTrigger>([
  ['eliteRare', 'rare'],
  ['bossRare', 'epic'],
  ['mythicRare', 'mythic'],
]);

/** Returns the current rarity name for a legacy one, or the value unchanged. */
export function upgradeLegacyItemRarity<T>(value: T): T | ItemRarity {
  return (typeof value === 'string' ? LEGACY_ITEM_RARITY.get(value) : undefined) ?? value;
}

/** Returns the Diary triggers with legacy rarity triggers renamed, or the same array when none is legacy. */
export function upgradeLegacyDiaryTriggers(triggers: readonly DiaryTrigger[]): DiaryTrigger[] {
  if (!triggers.some((trigger) => LEGACY_ITEM_RARITY.has(trigger))) return triggers as DiaryTrigger[];
  return triggers.map((trigger) => upgradeLegacyItemRarity(trigger) as DiaryTrigger);
}
