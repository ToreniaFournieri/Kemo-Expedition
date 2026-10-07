import { getDungeonById } from '../data/dungeons.ts';
import { t } from '../i18n/index.ts';
import type { GlobalDiaryLog } from '../types/index.ts';

export interface GlobalDiaryTitle {
  readonly headline: string;
  /** Left-aligned gray text of line 2 (empty when the entry has none). */
  readonly detail: string;
}

// SpecRef: 8.5 | UI_DIARY | Title of global diary: `[PT1] <expedition> 初踏破` / `PT2解放`, or `ケモは目覚めた`.
export function renderGlobalDiaryTitle(entry: GlobalDiaryLog): GlobalDiaryTitle {
  if (entry.kind === 'accountCreated') return { headline: t('diary.global.accountCreated'), detail: '' };
  const dungeonId = entry.dungeonId ?? 0;
  const dungeon = getDungeonById(dungeonId)?.name ?? String(dungeonId);
  return {
    headline: t('diary.global.bossFirstClear', { party: `PT${entry.partyNumber ?? 1}`, dungeon }),
    detail: entry.unlockedPartyNumber ? t('diary.global.partyUnlocked', { party: `PT${entry.unlockedPartyNumber}` }) : '',
  };
}
