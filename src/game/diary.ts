import type { DiaryDefeatNotificationMode, DiaryLog } from '../types';

// SpecRef: 8.5 | UI_DIARY | Each Party Diary keeps a maximum of 12 entries.
export const DIARY_LOG_RETENTION_LIMIT = 12;

// SpecRef: 8.5 | UI_DIARY | Existing older records are preserved until the
// Party creates a new Diary entry, including records written before this cap.
export const DIARY_LEGACY_LOG_LOAD_LIMIT = 24;

// SpecRef: 8.5 | UI_DIARY | The main Diary unread badge displays 49+ at 49 or more.
export const DIARY_UNREAD_BADGE_DISPLAY_LIMIT = 49;

export function formatDiaryUnreadBadge(unreadCount: number): string {
  return unreadCount >= DIARY_UNREAD_BADGE_DISPLAY_LIMIT
    ? `${DIARY_UNREAD_BADGE_DISPLAY_LIMIT}+`
    : `${unreadCount}`;
}

// SpecRef: 8.5 | UI_DIARY | Retention runs only when a new Party Diary entry is created.
export function addDiaryLogs(existingLogs: DiaryLog[], newLogs: DiaryLog[]): DiaryLog[] {
  if (newLogs.length === 0) return existingLogs;

  return [...newLogs, ...existingLogs]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, DIARY_LOG_RETENTION_LIMIT);
}

export type DiaryOutcomeTrigger = 'victory' | 'return' | 'defeat' | 'draw' | 'retreat';

// SpecRef: 8.5 | UI_DIARY | Setting.
export function getDiaryOutcomeTrigger(
  finalOutcome: string,
  endedWithDrawRetreat: boolean,
  mode: DiaryDefeatNotificationMode,
): DiaryOutcomeTrigger | null {
  if (mode === 'all' && finalOutcome === 'Clear') return 'victory';
  if (mode === 'all' && finalOutcome === 'Escape') return 'return';
  if (mode !== 'none' && finalOutcome === 'Defeat') return 'defeat';
  if ((mode === 'defeatAndDraw' || mode === 'defeatDrawRetreat' || mode === 'all') && finalOutcome === 'Retreat' && endedWithDrawRetreat) return 'draw';
  if ((mode === 'defeatDrawRetreat' || mode === 'all') && finalOutcome === 'Retreat' && !endedWithDrawRetreat) return 'retreat';
  return null;
}
