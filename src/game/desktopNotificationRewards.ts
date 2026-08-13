import type { DiaryLog, Item } from '../types';

function getItemRarity(item: Item): 'common' | 'uncommon' | 'eliteRare' | 'bossRare' | 'mythicRare' {
  const rarityCode = item.id % 1000;
  if (rarityCode >= 500) return 'mythicRare';
  if (rarityCode >= 400) return 'bossRare';
  if (rarityCode >= 300) return 'eliteRare';
  if (rarityCode >= 200) return 'uncommon';
  return 'common';
}

// SpecRef: 9.1.1 | macOS background lifecycle and native notifications | Exact item-drop titles
export function getDesktopNotificationRewardItems(log: DiaryLog): Item[] {
  const { rewards } = log.expeditionLog;
  if (log.triggers.includes('superRare')) return rewards.filter((item) => item.superRare > 0);
  if (log.triggers.includes('mythicRare')) return rewards.filter((item) => getItemRarity(item) === 'mythicRare');
  if (log.triggers.includes('bossRare')) return rewards.filter((item) => getItemRarity(item) === 'bossRare');
  if (log.triggers.includes('eliteRare')) return rewards.filter((item) => getItemRarity(item) === 'eliteRare');
  return [];
}
