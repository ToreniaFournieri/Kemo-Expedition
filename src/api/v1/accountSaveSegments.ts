import type { GameState } from '../../types';

// SpecRef: 9.1.4.12 | API account storage | Segmented save transfer
// Expedition logs dominate a late-game save (about 95%) and are immutable once recorded, yet every changed commit used to
// re-stringify, transfer, and compress them. The renderer instead sends the save as ordered items: ordinary JSON text plus
// references to large logs the host already holds (serialized text is sent once per log). The host reassembles
// byte-identical JSON, so the stored save is the same as `JSON.stringify(serializeGameState(state))`.

export type ApiSaveSegmentItem = string | { id: number; text?: string };
export interface ApiSaveSegments { nonce: string; items: ApiSaveSegmentItem[] }

const MINIMUM_SEGMENT_CHARACTERS = 4096;
const nonce = Math.random().toString(36).slice(2, 10);
const tokenPattern = new RegExp(`"@@L:${nonce}:(\\d+)@@"`, 'g');
const logEntries = new WeakMap<object, { id: number; text: string }>();
let nextId = 1;
// Ids the host is known to hold. Cleared whenever the host reports a miss.
const hostHeld = new Set<number>();

function register(log: unknown): void {
  if (!log || typeof log !== 'object' || logEntries.has(log)) return;
  const text = JSON.stringify(log);
  if (text !== undefined && text.length >= MINIMUM_SEGMENT_CHARACTERS) logEntries.set(log, { id: nextId++, text });
}

export function buildApiSaveSegments(serialized: GameState): { segments: ApiSaveSegments; defined: number[] } {
  for (const party of serialized.parties) {
    for (const diary of party.diaryLogs ?? []) register(diary.expeditionLog);
    register(party.lastExpeditionLog);
    register(party.pendingDiaryLog?.expeditionLog);
  }
  const used = new Map<number, string>();
  const json = JSON.stringify(serialized, (_key, value: unknown) => {
    if (value && typeof value === 'object') {
      const entry = logEntries.get(value);
      if (entry) {
        used.set(entry.id, entry.text);
        return `@@L:${nonce}:${entry.id}@@`;
      }
    }
    return value;
  });
  const items: ApiSaveSegmentItem[] = [];
  const defined: number[] = [];
  const definedNow = new Set<number>();
  let cursor = 0;
  for (const match of json.matchAll(tokenPattern)) {
    if (match.index > cursor) items.push(json.slice(cursor, match.index));
    const id = Number(match[1]);
    if (hostHeld.has(id) || definedNow.has(id)) items.push({ id });
    else {
      items.push({ id, text: used.get(id)! });
      definedNow.add(id);
      defined.push(id);
    }
    cursor = match.index + match[0].length;
  }
  if (cursor < json.length) items.push(json.slice(cursor));
  return { segments: { nonce, items }, defined };
}

export function markApiSaveSegmentsHeld(ids: readonly number[]): void {
  for (const id of ids) hostHeld.add(id);
}

export function forgetApiSaveSegmentsHeld(): void {
  hostHeld.clear();
}

export const API_SAVE_SEGMENT_MISS = 'segment_cache_miss';
