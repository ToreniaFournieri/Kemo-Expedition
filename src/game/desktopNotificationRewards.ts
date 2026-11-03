import type { DiaryLog, Item, ItemRarity } from '../types';
import { getItemRarityById } from './itemRarity.ts';

function getItemRarity(item: Item): ItemRarity {
  return getItemRarityById(item.id);
}

// SpecRef: 9.1.1 | macOS background lifecycle and native notifications | Exact item-drop titles
export function getDesktopNotificationRewardItems(log: DiaryLog): Item[] {
  const { rewards } = log.expeditionLog;
  if (log.triggers.includes('superRare')) return rewards.filter((item) => item.superRare > 0);
  if (log.triggers.includes('mythic')) return rewards.filter((item) => getItemRarity(item) === 'mythic');
  if (log.triggers.includes('epic')) return rewards.filter((item) => getItemRarity(item) === 'epic');
  if (log.triggers.includes('rare')) return rewards.filter((item) => getItemRarity(item) === 'rare');
  return [];
}
