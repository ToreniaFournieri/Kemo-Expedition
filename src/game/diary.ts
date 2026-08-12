import type { DiaryDefeatNotificationMode } from '../types';

// SpecRef: 8.5 | UI_DIARY | Each Party Diary keeps 24 entries
export const DIARY_LOG_RETENTION_LIMIT = 24;

export type DiaryOutcomeTrigger = 'victory' | 'defeat' | 'draw';

export function getDiaryOutcomeTrigger(
  finalOutcome: string,
  endedWithDrawRetreat: boolean,
  mode: DiaryDefeatNotificationMode,
): DiaryOutcomeTrigger | null {
  if (mode === 'all' && finalOutcome === 'Clear') return 'victory';
  if (mode !== 'none' && finalOutcome === 'Defeat') return 'defeat';
  if ((mode === 'defeatAndDraw' || mode === 'all') && finalOutcome === 'Retreat' && endedWithDrawRetreat) return 'draw';
  return null;
}
