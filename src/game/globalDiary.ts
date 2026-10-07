import type { GlobalDiaryKind, GlobalDiaryLog } from '../types/index.ts';

// SpecRef: 8.5 | UI_DIARY | Global Diary keeps a maximum of 99 entries.
export const GLOBAL_DIARY_RETENTION_LIMIT = 99;

// SpecRef: 9.1.3 | Path Parameters | `{p}` = 0 is the Global Diary scope.
export const GLOBAL_DIARY_PARTY_NUMBER = 0;

const GLOBAL_DIARY_KINDS: readonly GlobalDiaryKind[] = ['accountCreated', 'bossFirstClear'];

// SpecRef: 8.5 | UI_DIARY | Retention runs only when a new Global Diary entry is created.
export function addGlobalDiaryLogs(existing: readonly GlobalDiaryLog[] | undefined, added: readonly GlobalDiaryLog[]): GlobalDiaryLog[] {
  const current = existing ?? [];
  if (added.length === 0) return current as GlobalDiaryLog[];
  const known = new Set(current.map((entry) => entry.id));
  const fresh = added.filter((entry) => !known.has(entry.id));
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
