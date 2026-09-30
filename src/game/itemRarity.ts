import type { ItemRarity } from '../types';

// SpecRef: 3.2.1 | Item drop | `x.item_id` rarity band
// The item id's last three digits select the rarity: 1xx common, 2xx uncommon, 3xx elite rare, 4xx boss rare, 5xx mythic rare.
export function getItemRarityById(itemId: number): ItemRarity {
  const rarityCode = itemId % 1000;
  if (rarityCode >= 500) return 'mythicRare';
  if (rarityCode >= 400) return 'bossRare';
  if (rarityCode >= 300) return 'eliteRare';
  if (rarityCode >= 200) return 'uncommon';
  return 'common';
}
