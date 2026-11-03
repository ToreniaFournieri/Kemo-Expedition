import type { Item, Party } from '../types/index.ts';
import { getItemRarityById } from './itemRarity.ts';

export type ClearGateOutcome = 'Clear' | 'Return' | 'Draw' | 'Retreat' | 'Defeat';

export const ELITE_GATE_REQUIREMENTS: Readonly<Record<number, number>> = {
  1: 7,
  2: 6,
  3: 5,
  4: 4,
  5: 3,
};
export const BOSS_GATE_REQUIRED = 2;

const LEGACY_ELITE_GATE_REQUIREMENTS: Record<number, number> = {
  1: 2,
  2: 6,
  3: 12,
  4: 20,
  5: 30,
};
const LEGACY_BOSS_GATE_REQUIRED = 3;

export function getEntryGateKey(dungeonId: number): number {
  return dungeonId * 1000 + 101;
}

export function getEliteGateKey(dungeonId: number, floorNumber: number): number {
  return dungeonId * 1000 + floorNumber * 10 + 4;
}

export function getBossGateKey(dungeonId: number): number {
  return dungeonId * 1000 + 604;
}

export function getClearGateRequired(gateKey: number): number {
  const gatePosition = gateKey % 1000;
  if (gatePosition === 604) return BOSS_GATE_REQUIRED;
  const floorNumber = Math.floor(gatePosition / 10);
  return ELITE_GATE_REQUIREMENTS[floorNumber] ?? BOSS_GATE_REQUIRED;
}

export function getRoomPosition(floorNumber: number, roomInFloor: number): number {
  return floorNumber * 10 + roomInFloor;
}

// SpecRef: 5.1.3.1 | "Clear-Gate" progression system specification | Runs through X,3
export function getClearGateQualifyingPosition(gateKey: number): number {
  const gatePosition = gateKey % 1000;
  // The boss gate key uses 604 (not 64), so its floor is not gatePosition / 10.
  const floorNumber = gatePosition === 604 ? 6 : Math.floor(gatePosition / 10);
  return getRoomPosition(floorNumber, 3);
}

export function getGodsBattleProgressKey(dungeonId: number): string {
  return `godBattle:${dungeonId}:epic`;
}

// Saves written before the item rarity rename count Gods Battle progress under `godBattle:<dungeonId>:bossRare`.
const LEGACY_GODS_BATTLE_PROGRESS_SUFFIX = ':bossRare';

/** Returns a copy of a Clear-Gate progress record with legacy Gods Battle keys renamed (a current key wins). */
export function upgradeLegacyGodsBattleProgressKeys(progress: Readonly<Record<string, number>>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(progress)) {
    if (!key.startsWith('godBattle:') || !key.endsWith(LEGACY_GODS_BATTLE_PROGRESS_SUFFIX)) {
      result[key] = value;
      continue;
    }
    const currentKey = `${key.slice(0, -LEGACY_GODS_BATTLE_PROGRESS_SUFFIX.length)}:epic`;
    if (!(currentKey in progress)) result[currentKey] = value;
  }
  return result;
}

export function getClearGateProgress(
  party: Pick<Party, 'clearGateProgress'>,
  gateKey: number,
): number {
  return Math.max(0, Math.floor(party.clearGateProgress?.[String(gateKey)] ?? 0));
}

export function getGodsBattleProgress(
  party: Pick<Party, 'clearGateProgress'>,
  dungeonId: number,
): number {
  return Math.max(0, Math.floor(party.clearGateProgress?.[getGodsBattleProgressKey(dungeonId)] ?? 0));
}

export function isClearGateUnlocked(
  party: Pick<Party, 'clearGateStatus' | 'clearGateProgress'>,
  gateKey: number,
): boolean {
  return Boolean(party.clearGateStatus?.[gateKey])
    || getClearGateProgress(party, gateKey) >= getClearGateRequired(gateKey);
}

export function getNextLockedClearGateKey(
  party: Pick<Party, 'clearGateProgress' | 'clearGateStatus'>,
  dungeonId: number,
): number | null {
  if (dungeonId === 99) return null;
  for (let floor = 1; floor <= 5; floor += 1) {
    const gateKey = getEliteGateKey(dungeonId, floor);
    if (!isClearGateUnlocked(party, gateKey)) return gateKey;
  }
  const bossGateKey = getBossGateKey(dungeonId);
  return isClearGateUnlocked(party, bossGateKey) ? null : bossGateKey;
}

// SpecRef: 5.1.3.1 | "Clear-Gate" progression system specification | Consecutive outcomes
export function applyClearGateOutcome(
  party: Pick<Party, 'clearGateProgress' | 'clearGateStatus'>,
  dungeonId: number,
  outcome: ClearGateOutcome,
  deepestClearedPosition: number,
): { progress: Record<string, number>; status: Record<number, boolean>; gateKey: number | null } {
  const progress = { ...(party.clearGateProgress ?? {}) };
  const status = { ...(party.clearGateStatus ?? {}) };
  const gateKey = getNextLockedClearGateKey(party, dungeonId);
  if (gateKey === null) return { progress, status, gateKey };

  const key = String(gateKey);
  const required = getClearGateRequired(gateKey);
  if (outcome === 'Clear' || outcome === 'Return') {
    // A success counts only when the run cleared the room just before the gate
    // (X,3); shallower returns neither count nor break the streak.
    if (outcome === 'Return' && deepestClearedPosition < getClearGateQualifyingPosition(gateKey)) {
      return { progress, status, gateKey };
    }
    const nextCount = Math.min(required, getClearGateProgress(party, gateKey) + 1);
    progress[key] = nextCount;
    if (nextCount >= required) status[gateKey] = true;
  } else {
    progress[key] = 0;
  }
  return { progress, status, gateKey };
}

export function addRecoveredEpicsToGodsBattleProgress(
  currentProgress: Readonly<Record<string, number>>,
  dungeonId: number,
  recoveredItems: readonly Item[],
): Record<string, number> {
  const nextProgress = { ...currentProgress };
  const recoveredEpics = recoveredItems.filter((item) => getItemRarityById(item.id) === 'epic').length;
  if (recoveredEpics > 0) {
    const key = getGodsBattleProgressKey(dungeonId);
    nextProgress[key] = (nextProgress[key] ?? 0) + recoveredEpics;
  }
  return nextProgress;
}

export type LegacyGateState = {
  clearGateProgress?: Record<string, number>;
  clearGateStatus?: Record<number, boolean>;
  lootGateProgress?: Record<string, number>;
  lootGateStatus?: Record<number, boolean>;
};

// SpecRef: 5.1.4 | Save and load | Loot-Gate to Clear-Gate migration
export function migrateLegacyGateState(source: LegacyGateState, maxDungeonId = 9): {
  progress: Record<string, number>;
  status: Record<number, boolean>;
} {
  const progress = upgradeLegacyGodsBattleProgressKeys(source.clearGateProgress ?? {});
  const status = { ...(source.lootGateStatus ?? {}), ...(source.clearGateStatus ?? {}) };
  const legacyProgress = source.lootGateProgress ?? {};

  for (let dungeonId = 1; dungeonId <= maxDungeonId; dungeonId += 1) {
    const legacyUncommonCount = Math.max(0, legacyProgress[`${dungeonId}:uncommon`] ?? 0);
    for (let floor = 1; floor <= 5; floor += 1) {
      const gateKey = getEliteGateKey(dungeonId, floor);
      if (legacyUncommonCount >= LEGACY_ELITE_GATE_REQUIREMENTS[floor]) status[gateKey] = true;
    }
    // Loot-Gate saves predate the item rarity rename, so their keys keep the old rarity names.
    if ((legacyProgress[`${dungeonId}:eliteRare`] ?? 0) >= LEGACY_BOSS_GATE_REQUIRED) {
      status[getBossGateKey(dungeonId)] = true;
    }
    const legacyEpicCount = Math.max(0, legacyProgress[`${dungeonId}:bossRare`] ?? 0);
    const godsBattleKey = getGodsBattleProgressKey(dungeonId);
    if (!(godsBattleKey in progress) && legacyEpicCount > 0) progress[godsBattleKey] = legacyEpicCount;
  }

  return { progress, status };
}
