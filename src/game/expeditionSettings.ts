import { DUNGEONS, getDungeonById } from '../data/dungeons';
import type { ExpeditionDepthLimit, Party } from '../types';
import { hasDefeatedDungeonBoss, isDungeonEntryUnlocked } from './clearGate';
import { getDifficultyOffsetMax } from './difficultyOffset';

// SpecRef: 8.3 | UI_EXPEDITION | Auto Destination Change Logic
// SpecRef: 8.3 | UI_EXPEDITION | Expedition Depth Limit (探索深度)
// SpecRef: 8.3 | UI_EXPEDITION | Difficulty Offset (難易度)
// What a party may currently choose as its destination, depth limit, and difficulty offset. The Expedition pane lists these
// choices and the Application API both publishes them and validates a change against them, so they cannot disagree.

export const EXPEDITION_DEPTH_LIMITS: readonly ExpeditionDepthLimit[] = ['1f-3', '1f-4', '2f-3', '2f-4', '3f-3', '3f-4', '4f-3', '4f-4', '5f-3', '5f-4', 'beforeBoss', 'all'];
export const COLOSSEUM_DUNGEON_ID = 99;
export const DIFFICULTY_OFFSET_STEP = 2;

/** The destinations the party may select: its unlocked expeditions, plus the Colosseum only when it is enabled. */
export function getSelectableDestinationIds(party: Pick<Party, 'defeatedBossExpeditions'>, colosseumEnabled: boolean): number[] {
  return DUNGEONS
    .filter((dungeon) => dungeon.id === COLOSSEUM_DUNGEON_ID ? colosseumEnabled : isDungeonEntryUnlocked(party, dungeon.id))
    .map((dungeon) => dungeon.id);
}

/**
 * The largest difficulty offset a party may set for a destination. It is 0 until the party has defeated that destination's
 * boss at least once (lifetime), which leaves only the offset 0 selectable.
 */
export function getSelectableDifficultyOffsetMax(party: Pick<Party, 'defeatedBossExpeditions'>, dungeonId: number): number {
  if (!hasDefeatedDungeonBoss(party, dungeonId)) return 0;
  return getDifficultyOffsetMax(getDungeonById(dungeonId)?.expLevel ?? 88);
}

export interface ExpeditionChangeRequest {
  destination?: number;
  depthLimit?: string;
  difficultyOffset?: number;
}

/**
 * Returns the reason a requested change is not allowed, or `null`. The difficulty offset is validated against the destination
 * the change leaves the party at, so `{destination, difficultyOffset}` is one consistent request.
 */
export function getExpeditionChangeRejection(
  party: Pick<Party, 'selectedDungeonId' | 'defeatedBossExpeditions'>,
  change: ExpeditionChangeRequest,
  colosseumEnabled: boolean,
): { code: 'invalid_request' | 'illegal_action'; reason: string } | null {
  if (change.destination !== undefined) {
    if (!Number.isSafeInteger(change.destination) || !DUNGEONS.some((dungeon) => dungeon.id === change.destination)) return { code: 'invalid_request', reason: 'invalid_destination' };
    if (!getSelectableDestinationIds(party, colosseumEnabled).includes(change.destination)) return { code: 'illegal_action', reason: 'destination_locked' };
  }
  if (change.depthLimit !== undefined && !EXPEDITION_DEPTH_LIMITS.includes(change.depthLimit as ExpeditionDepthLimit)) return { code: 'invalid_request', reason: 'invalid_depth_limit' };
  if (change.difficultyOffset !== undefined) {
    const offset = change.difficultyOffset;
    if (!Number.isSafeInteger(offset) || offset < 0 || offset % DIFFICULTY_OFFSET_STEP !== 0) return { code: 'invalid_request', reason: 'invalid_difficulty_offset' };
    // A destination change resets the offset to that destination's own saved value, so validate against the new destination.
    const targetDungeonId = change.destination ?? party.selectedDungeonId;
    if (offset > getSelectableDifficultyOffsetMax(party, targetDungeonId)) return { code: 'illegal_action', reason: 'difficulty_offset_unavailable' };
  }
  return null;
}
