import type { GlobalAchievementMetric, GlobalDiaryKind, GlobalDiaryLog, GlobalState } from '../types/index.ts';

// SpecRef: 8.5 | UI_DIARY | Global Diary keeps a maximum of 99 entries.
export const GLOBAL_DIARY_RETENTION_LIMIT = 99;

// SpecRef: 9.1.3 | Path Parameters | `{p}` = 0 is the Global Diary scope.
export const GLOBAL_DIARY_PARTY_NUMBER = 0;

const GLOBAL_DIARY_KINDS: readonly GlobalDiaryKind[] = ['accountCreated', 'bossFirstClear', 'godFirstDefeat', 'achievement'];

// SpecRef: 8.5 | UI_DIARY | Retention runs only when a new Global Diary entry is created.
export function addGlobalDiaryLogs(existing: readonly GlobalDiaryLog[] | undefined, added: readonly GlobalDiaryLog[]): GlobalDiaryLog[] {
  const current = existing ?? [];
  if (added.length === 0) return current as GlobalDiaryLog[];
  // A one-time event (boss, god, milestone) is recorded once even when parallel AFK Chunks both report it.
  const known = new Set(current.flatMap((entry) => [entry.id, globalDiaryEventKey(entry)]));
  const fresh = added.filter((entry) => {
    const keys = [entry.id, globalDiaryEventKey(entry)];
    if (keys.some((key) => known.has(key))) return false;
    keys.forEach((key) => known.add(key));
    return true;
  });
  if (fresh.length === 0) return current as GlobalDiaryLog[];
  return [...fresh, ...current]
    .sort((left, right) => right.createdAt - left.createdAt)
    .slice(0, GLOBAL_DIARY_RETENTION_LIMIT);
}

// SpecRef: 8.5 | UI_DIARY | The global Diary is updated when the account is created.
export function createAccountCreatedDiaryLog(createdAt: number, idToken: string): GlobalDiaryLog {
  // A new account has nothing to catch up on, so its first line starts read.
  return { id: `${createdAt}-${idToken}`, kind: 'accountCreated', createdAt, isRead: true };
}

// SpecRef: 8.5 | UI_DIARY | A party defeats an expedition boss for the first time.
export function createBossFirstClearDiaryLog(input: {
  createdAt: number;
  idToken: string;
  partyNumber: number;
  dungeonId: number;
  unlockedPartyNumber?: number | null;
}): GlobalDiaryLog {
  return {
    id: `${input.createdAt}-${input.idToken}`,
    kind: 'bossFirstClear',
    partyNumber: input.partyNumber,
    dungeonId: input.dungeonId,
    ...(input.unlockedPartyNumber ? { unlockedPartyNumber: input.unlockedPartyNumber } : {}),
    createdAt: input.createdAt,
    isRead: false,
  };
}

/** Drops malformed entries from a loaded save; valid entries are kept untouched and never trimmed on load. */
export function normalizeGlobalDiaryLogs(value: unknown): GlobalDiaryLog[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is GlobalDiaryLog => !!entry
      && typeof entry === 'object'
      && typeof (entry as GlobalDiaryLog).id === 'string'
      && GLOBAL_DIARY_KINDS.includes((entry as GlobalDiaryLog).kind)
      && Number.isFinite((entry as GlobalDiaryLog).createdAt))
    .map((entry) => ({ ...entry, isRead: entry.isRead === true }))
    .sort((left, right) => right.createdAt - left.createdAt);
}

export function countUnreadGlobalDiaryLogs(logs: readonly GlobalDiaryLog[] | undefined): number {
  return (logs ?? []).reduce((count, entry) => count + (entry.isRead ? 0 : 1), 0);
}

/** Identity of a one-time event, independent of its entry ID and timestamp. */
export function globalDiaryEventKey(entry: GlobalDiaryLog): string {
  switch (entry.kind) {
    case 'accountCreated': return 'account';
    case 'bossFirstClear': return `boss:${entry.dungeonId}`;
    case 'godFirstDefeat': return `god:${entry.dungeonId}`;
    case 'achievement': return `achievement:${entry.metric}:${entry.threshold}`;
  }
}

// SpecRef: 8.5 | UI_DIARY | First god defeat.
export function createGodFirstDefeatDiaryLog(input: { createdAt: number; partyNumber: number; godExpeditionId: number }): GlobalDiaryLog {
  return {
    id: `${input.createdAt}-god${input.godExpeditionId}`,
    kind: 'godFirstDefeat',
    partyNumber: input.partyNumber,
    dungeonId: input.godExpeditionId,
    createdAt: input.createdAt,
    isRead: false,
  };
}

// SpecRef: 8.5 | UI_DIARY | Achievements: Clear 100 ... 1,000,000; Super Rare 1 ... 10,000; Jewel 1 ... 10,000.
export const GLOBAL_ACHIEVEMENT_THRESHOLDS: Readonly<Record<GlobalAchievementMetric, readonly number[]>> = {
  clear: [100, 1_000, 10_000, 100_000, 1_000_000],
  superRare: [1, 10, 100, 1_000, 10_000],
  jewel: [1, 10, 100, 1_000, 10_000],
};

type AchievementSource = Pick<GlobalState, 'inventory' | 'jewels' | 'achievementClearTotal' | 'achievementMilestones'>;

/** Super Rare items and jewels are counted as held in the inventory; Clear is the lifetime counter. */
export function getAchievementValues(global: AchievementSource): Record<GlobalAchievementMetric, number> {
  let superRare = 0;
  for (const variant of Object.values(global.inventory ?? {})) {
    if (variant.item.superRare > 0) superRare += variant.count;
  }
  const jewel = Object.values(global.jewels ?? {}).reduce((sum, count) => sum + (Number.isFinite(count) ? count : 0), 0);
  return { clear: global.achievementClearTotal ?? 0, superRare, jewel };
}

const milestoneKey = (metric: GlobalAchievementMetric, threshold: number) => `${metric}:${threshold}`;

function reachedMilestones(global: AchievementSource, recorded: ReadonlySet<string>): { metric: GlobalAchievementMetric; threshold: number }[] {
  const values = getAchievementValues(global);
  return (Object.keys(GLOBAL_ACHIEVEMENT_THRESHOLDS) as GlobalAchievementMetric[]).flatMap((metric) => (
    GLOBAL_ACHIEVEMENT_THRESHOLDS[metric]
      .filter((threshold) => values[metric] >= threshold && !recorded.has(milestoneKey(metric, threshold)))
      .map((threshold) => ({ metric, threshold }))
  ));
}

/**
 * Records every newly reached milestone once, oldest threshold first so the highest sits on top. A milestone that
 * was recorded earlier is never recorded again, even if the held value later drops and returns.
 */
export function applyAchievementMilestones<T extends AchievementSource & { globalDiary?: GlobalDiaryLog[] }>(global: T, createdAt: number): T {
  const recorded = new Set(global.achievementMilestones ?? []);
  const reached = reachedMilestones(global, recorded);
  if (reached.length === 0) return global;
  const entries: GlobalDiaryLog[] = reached.map(({ metric, threshold }, index) => ({
    id: `${createdAt}-${metric}${threshold}`,
    kind: 'achievement',
    metric,
    threshold,
    // A same-instant batch keeps its order under the newest-first sort.
    createdAt: createdAt + index,
    isRead: false,
  }));
  return {
    ...global,
    achievementMilestones: [...recorded, ...reached.map(({ metric, threshold }) => milestoneKey(metric, threshold))],
    globalDiary: addGlobalDiaryLogs(global.globalDiary, entries),
  };
}

/**
 * Saves written before achievements existed start from their current state: milestones already satisfied are
 * recorded silently, so only new achievements reach the Diary.
 */
export function seedAchievementState<T extends AchievementSource>(global: T, clearTotalFallback: number): T {
  const withClear = typeof global.achievementClearTotal === 'number' && Number.isFinite(global.achievementClearTotal)
    ? global
    : { ...global, achievementClearTotal: Math.max(0, Math.floor(clearTotalFallback)) };
  if (Array.isArray(withClear.achievementMilestones)) return withClear;
  const reached = reachedMilestones({ ...withClear, achievementMilestones: [] }, new Set());
  return { ...withClear, achievementMilestones: reached.map(({ metric, threshold }) => milestoneKey(metric, threshold)) };
}
