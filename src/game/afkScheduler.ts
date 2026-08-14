import { DUNGEONS } from '../data/dungeons';
import type { Party } from '../types';
import { getDeityStateDurationMultiplier } from './deity';
import { createAfkReplaySeed, type AfkChunkPlan } from './afkSchedulerCore';
export * from './afkSchedulerCore';

const BASE_STEP_DURATION_MS = 15_000;
const APPROX_CYCLE_STEP_COUNT = 30;
function getExploreTerrainDurationMultiplier(party: Party): number {
  const dungeon = DUNGEONS.find((entry) => entry.id === party.selectedDungeonId);
  if (!dungeon) return 1;

  const roomMultiplier = (terrainEffect?: string): number => (
    terrainEffect === 'terrain.chill' || terrainEffect === 'terrain.looping-path' ? 2 : 1
  );
  const floorByNumber = new Map(dungeon.floors.map((floor) => [floor.floorNumber, floor]));
  const loggedRooms = party.lastExpeditionLog?.dungeonId === dungeon.id
    ? party.lastExpeditionLog.entries
    : [];

  if (loggedRooms.length > 0) {
    return loggedRooms.reduce((total, room) => (
      total + roomMultiplier(floorByNumber.get(room.floor ?? 0)?.terrainEffect)
    ), 0) / loggedRooms.length;
  }

  const total = dungeon.floors.reduce((sum, floor) => sum + (4 * roomMultiplier(floor.terrainEffect)), 0);
  const rooms = dungeon.floors.length * 4;
  return rooms > 0 ? total / rooms : 1;
}

export function getApproxAfkCycleDurationMs(party: Party, cycleDurationScale: number): number {
  const safeScale = Math.max(0.001, cycleDurationScale);
  const baseCycleDurationMs = BASE_STEP_DURATION_MS * APPROX_CYCLE_STEP_COUNT * safeScale;
  const deityMultiplier = getDeityStateDurationMultiplier(
    party.deity.name,
    party.deityGold ?? 0,
    'explore',
  );
  return Math.max(1, Math.ceil(baseCycleDurationMs * deityMultiplier * getExploreTerrainDurationMultiplier(party)));
}

export function createAfkChunkPlan(
  parties: Party[],
  elapsedMs: number,
  simulatedEndAt: number,
  cycleDurationScale: number,
  randomSeed?: number,
): AfkChunkPlan {
  const normalizedElapsedMs = Math.max(0, Math.floor(elapsedMs));
  const normalizedScale = Math.max(0.001, cycleDurationScale);
  const cycleDurationByParty = parties.map((party) => getApproxAfkCycleDurationMs(party, normalizedScale));
  const operationCount = cycleDurationByParty.reduce((total, durationMs) => (
    total + Math.max(0, Math.floor(normalizedElapsedMs / durationMs))
  ), 0);
  const derivedRandomSeed = createAfkReplaySeed(normalizedElapsedMs, simulatedEndAt, operationCount);

  return {
    elapsedMs: normalizedElapsedMs,
    simulatedEndAt,
    randomSeed: Number.isFinite(randomSeed) ? Math.floor(Number(randomSeed)) >>> 0 : derivedRandomSeed,
    cycleDurationScale: normalizedScale,
    cycleDurationByParty,
    operationCount,
  };
}
