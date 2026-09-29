import { t } from '../i18n/index.ts';
import type { DiaryTrigger } from '../types/index.ts';
import { diaryItemName, type DiaryItem } from './compactDiary.ts';
import { getItemRarityById } from './itemRarity.ts';

// SpecRef: 8.5 | UI_DIARY | Diary headline: `[PT1] Boss Rare acquired (Item)`
/** The drops a rare-drop trigger is about: what the Diary headline names for it (`null` for a trigger that is not a rare drop). */
export function getRewardsNamedByTrigger(trigger: DiaryTrigger, rewards: readonly DiaryItem[]): DiaryItem[] | null {
  if (trigger === 'superRare') return rewards.filter((item) => item.superRare > 0);
  if (trigger === 'mythicRare') return rewards.filter((item) => getItemRarityById(item.id) === 'mythicRare');
  if (trigger === 'bossRare') return rewards.filter((item) => getItemRarityById(item.id) === 'bossRare');
  if (trigger === 'eliteRare') return rewards.filter((item) => getItemRarityById(item.id) === 'eliteRare');
  return null;
}

export const joinDiaryItemNames = (items: readonly DiaryItem[]): string => items.map((item) => diaryItemName(item)).join('、');

/**
 * The headline of an entry whose trigger is a rare drop, naming the dropped items, or `null` when the entry is not a reward entry.
 * The Diary tab and the API's compact `unreadDiaryTitle` share it, so both name the same items.
 */
export function getDiaryRewardHeadline(partyName: string, triggers: readonly DiaryTrigger[], rewards: readonly DiaryItem[]): string | null {
  const named = (matches: (item: DiaryItem) => boolean) => joinDiaryItemNames(rewards.filter(matches));
  const headline = (rewardType: string, rewardNames: string) => rewardNames
    ? t('diary.headline.rewardNamed', { party: partyName, rewardType, rewards: rewardNames })
    : t('diary.headline.reward', { party: partyName, rewardType });

  if (triggers.includes('superRare') || triggers.includes('mythicRare') || triggers.includes('bossRare')) {
    const rewardType = triggers.includes('superRare') ? t('diary.reward.superRare') : triggers.includes('mythicRare') ? t('diary.reward.mythicRare') : t('diary.reward.bossRare');
    return headline(rewardType, named((item) => {
      if (triggers.includes('superRare')) return item.superRare > 0;
      if (triggers.includes('mythicRare')) return getItemRarityById(item.id) === 'mythicRare';
      return getItemRarityById(item.id) === 'bossRare';
    }));
  }
  if (triggers.includes('eliteRare')) return headline(t('diary.reward.eliteRare'), named((item) => getItemRarityById(item.id) === 'eliteRare'));

  const fallbackBossNames = named((item) => getItemRarityById(item.id) === 'bossRare');
  return fallbackBossNames ? headline(t('diary.reward.bossRare'), fallbackBossNames) : null;
}
