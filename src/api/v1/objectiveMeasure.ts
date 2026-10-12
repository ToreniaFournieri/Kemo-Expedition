import { getDungeonById } from '../../data/dungeons.ts';
import { checkClearGateRequirement } from '../../game/clearGate.ts';
import { getBossGateKey, getEliteGateKey } from '../../game/clearGateCore.ts';
import { hasReachedExpeditionDepthLimit } from '../../game/expeditionEffects/expeditionContinuation.ts';
import type { ExpeditionSimulationOptions, ExpeditionSimulationResult, GameState, Party } from '../../types/index.ts';

// SpecRef: 7.1.5 | General rules | Score and Luck check (the per-run variance)
// SpecRef: 9.1.3 | Read | 2-2-3 simulationRun `objective`; 2-3-2 gaSearch `objective`; 2-3-7 stagedEquipmentTuning `objective`
// The measured value of each objective over one forecast and its per-run variance. `simulationRun`, `gaSearch`, and
// `stagedEquipmentTuning` share it, so the three report the same number for the same build, runs, and seed.

export const MEASURED_OBJECTIVES = ['success', 'minDefeat', 'bossDamage', 'experience', 'progress'] as const;
export type MeasuredObjective = typeof MEASURED_OBJECTIVES[number];

export interface ObjectiveMeasure {
  /** The objective's value: a rate, an average share, or average EXP per run. */
  rate: number;
  /** The variance of one run's value. */
  variance: number;
}

/**
 * The state a forecast of `objective` simulates. `bossDamage` opens every Clear-Gate of the destination and sets the depth
 * limit to `all`, so its boss battle (`objectiveSimulationOptions`) is reachable whatever the party's own settings.
 */
export function prepareObjectiveState(state: GameState, partyIndex: number, objective: string): GameState {
  if (objective !== 'bossDamage') return state;
  const party = state.parties[partyIndex];
  const dungeonId = party.selectedDungeonId;
  const clearGateStatus = { ...party.clearGateStatus };
  for (let floor = 1; floor <= 5; floor += 1) clearGateStatus[getEliteGateKey(dungeonId, floor)] = true;
  clearGateStatus[getBossGateKey(dungeonId)] = true;
  const parties = [...state.parties];
  parties[partyIndex] = { ...party, clearGateStatus, expeditionDepthLimit: 'all' };
  return { ...state, parties };
}

/** `bossDamage` fights only the boss battle, from full party HP; every other objective runs the whole route. */
export function objectiveSimulationOptions(objective: string): ExpeditionSimulationOptions {
  return objective === 'bossDamage' ? { bossRoomOnly: true } : {};
}

/** The rooms on the route: up to the depth limit, or up to the first closed Clear-Gate (that room excluded). */
export function routeRoomCount(party: Party): number {
  const dungeon = getDungeonById(party.selectedDungeonId);
  if (!dungeon) return 0;
  let rooms = 0;
  for (const floor of dungeon.floors) {
    for (let roomIndex = 0; roomIndex < floor.rooms.length; roomIndex += 1) {
      const roomInFloor = roomIndex + 1;
      if (checkClearGateRequirement({ dungeonId: dungeon.id, floorNumber: floor.floorNumber, roomInFloor, roomType: floor.rooms[roomIndex].type, party }).blocked) return rooms;
      rooms += 1;
      if (hasReachedExpeditionDepthLimit(party.expeditionDepthLimit, floor.floorNumber, roomInFloor)) return rooms;
    }
  }
  return rooms;
}

/**
 * The objective's value over a forecast and its per-run variance. `success` and `minDefeat` score each run 0 or 1, so their
 * variance is `p(1 - p)`; `bossDamage`, `experience`, and `progress` use the per-run sums of squares. `routeRooms` divides
 * `progress` (its runs are counted in rooms) into a value from 0 to 1.
 */
export function measureObjective(objective: MeasuredObjective, result: ExpeditionSimulationResult, routeRooms: number): ObjectiveMeasure {
  const runs = Math.max(1, result.total);
  const binary = (rate: number): ObjectiveMeasure => ({ rate, variance: rate * (1 - rate) });
  const perRun = (sum: number, squareSum: number, scale = 1): ObjectiveMeasure => {
    const mean = sum / runs;
    return { rate: mean / scale, variance: Math.max(0, squareSum / runs - mean * mean) / (scale * scale) };
  };
  if (objective === 'success') return binary((result.Clear + result.Return) / runs);
  if (objective === 'minDefeat') return binary(result.Defeat / runs);
  if (objective === 'bossDamage') {
    const share = result.boss?.damageShare ?? 0;
    // A forecast without per-run squares falls back to the Bernoulli bound, the largest variance a [0, 1] value can have.
    if (result.boss?.damageShareSquareSum === undefined) return binary(share / runs);
    return perRun(share, result.boss.damageShareSquareSum);
  }
  if (objective === 'experience') return perRun(result.totals?.experience ?? 0, result.experienceSquareSum ?? 0);
  return perRun(result.progress?.sum ?? 0, result.progress?.squareSum ?? 0, Math.max(1, routeRooms));
}
