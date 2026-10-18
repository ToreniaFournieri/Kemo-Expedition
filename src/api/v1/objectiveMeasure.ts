import { getDungeonById } from '../../data/dungeons.ts';
import { checkClearGateRequirement } from '../../game/clearGate.ts';
import { getBossGateKey, getEliteGateKey } from '../../game/clearGateCore.ts';
import { hasReachedExpeditionDepthLimit } from '../../game/expeditionEffects/expeditionContinuation.ts';
import type { ExpeditionSimulationOptions, ExpeditionSimulationResult, GameState, Party } from '../../types/index.ts';

// SpecRef: 7.1.5 | General rules | Score and Luck check (the per-run variance)
// SpecRef: 9.1.3 | Read | 2-2-3 simulationRun `objective`; 2-3-2 gaSearch `objective`; 2-3-8 stagedEquipmentTuning `objective`
// The measured value of each objective over one forecast and its per-run variance. `simulationRun`, `gaSearch`, and
// `stagedEquipmentTuning` share it, so the three report the same number for the same build, runs, and seed.

export const MEASURED_OBJECTIVES = ['success', 'minDefeat', 'bossDamage', 'gateDamage', 'experience', 'progress'] as const;
export type MeasuredObjective = typeof MEASURED_OBJECTIVES[number];

// SpecRef: 9.1.3 | 2-0 `gateDamage` | a battle-alone objective: `bossDamage` fights the boss room, `gateDamage` the `gateRoom`.
/** Whether `objective` fights one room alone (from `startHp`) instead of running the route. */
export const isRoomObjective = (objective: string): boolean => objective === 'bossDamage' || objective === 'gateDamage';

/** A gate room: an elite room `X,4` (floors 1 to 5) or the boss room `6,4`. */
export interface GateRoom { floorNumber: number; roomInFloor: number }
export const gateRoomLabel = (room: GateRoom): string => `${room.floorNumber}f-${room.roomInFloor}`;
// SpecRef: 9.1.3 | 2-0 `gateRoom` | `next` (default), `boss`, or an elite gate room `1f-4` .. `5f-4` (`6f-4` is the boss).
export const GATE_ROOM_VALUES = ['next', 'boss', '1f-4', '2f-4', '3f-4', '4f-4', '5f-4', '6f-4'] as const;

/**
 * The settings every forecast of one request shares (Spec 9.1.3, 2-0): the room `gateDamage` fights, and the HP share a
 * room-only forecast (`bossDamage`, `gateDamage`) starts with. A route forecast of a search always starts at full HP.
 */
export interface ForecastSettings { gateRoom: GateRoom | null; startHp: number | null }
export const DEFAULT_FORECAST_SETTINGS: ForecastSettings = { gateRoom: null, startHp: null };

/** The room of the destination's next closed Clear-Gate, or the boss room when every gate is open (`gateRoom: next`). */
export function nextGateRoom(party: Party): GateRoom {
  const dungeon = getDungeonById(party.selectedDungeonId);
  for (const floor of dungeon?.floors ?? []) {
    for (let roomIndex = 0; roomIndex < floor.rooms.length; roomIndex += 1) {
      const roomInFloor = roomIndex + 1;
      // The entry gate (1f-1) is not a gate room: a destination the party cannot enter has no gate to fight.
      if (roomInFloor !== 4) continue;
      if (checkClearGateRequirement({ dungeonId: dungeon!.id, floorNumber: floor.floorNumber, roomInFloor, roomType: floor.rooms[roomIndex].type, party }).blocked) {
        return { floorNumber: floor.floorNumber, roomInFloor };
      }
    }
  }
  return { floorNumber: 6, roomInFloor: 4 };
}

/**
 * Validates the `gateRoom` and `startHp` request members (Spec 9.1.3, 2-0). `gateRoom` is accepted only when `gateDamage`
 * is measured (`roomObjectives` includes it); `startHp` only when a room-only objective is measured, unless `startHpAlways`
 * (`simulationRun`, where it sets the start of every run).
 */
export function parseForecastSettings(raw: Record<string, unknown>, party: Party, roomObjectives: readonly string[], startHpAlways = false): ForecastSettings {
  const usesGate = roomObjectives.includes('gateDamage');
  let gateRoom: GateRoom | null = null;
  if (raw.gateRoom !== undefined) {
    if (typeof raw.gateRoom !== 'string' || !(GATE_ROOM_VALUES as readonly string[]).includes(raw.gateRoom)) throw new Error('invalid_request:gateRoom');
    if (!usesGate) throw new Error('invalid_request:gateRoom.not_used');
  }
  if (usesGate) {
    const value = (raw.gateRoom as string | undefined) ?? 'next';
    gateRoom = value === 'next' ? nextGateRoom(party) : value === 'boss' ? { floorNumber: 6, roomInFloor: 4 } : { floorNumber: Number(value[0]), roomInFloor: 4 };
  }
  let startHp: number | null = null;
  if (raw.startHp !== undefined && raw.startHp !== 'full') {
    if (typeof raw.startHp !== 'number' || !Number.isFinite(raw.startHp) || raw.startHp <= 0 || raw.startHp > 1) throw new Error('invalid_request:startHp');
    startHp = raw.startHp === 1 ? null : raw.startHp;
  }
  // `full` is the default, so sending it is never an error.
  if (startHp !== null && !startHpAlways && !roomObjectives.some(isRoomObjective)) throw new Error('invalid_request:startHp.not_used');
  return { gateRoom, startHp };
}

/** The settings' public echo: `gateRoom` as a room label and `startHp` as `full` or the share. */
export function describeForecastSettings(settings: ForecastSettings): { gateRoom?: string; startHp: number | 'full' } {
  return { ...(settings.gateRoom ? { gateRoom: gateRoomLabel(settings.gateRoom) } : {}), startHp: settings.startHp ?? 'full' };
}

export interface ObjectiveMeasure {
  /** The objective's value: a rate, an average share, or average EXP per run. */
  rate: number;
  /** The variance of one run's value. */
  variance: number;
}

/** The room a room-only objective fights: the boss room for `bossDamage`, `gateRoom` for `gateDamage`. */
function foughtRoom(objective: string, settings: ForecastSettings): GateRoom {
  return objective === 'gateDamage' && settings.gateRoom ? settings.gateRoom : { floorNumber: 6, roomInFloor: 4 };
}

/**
 * The state a forecast of `objective` simulates. A room-only objective opens every Clear-Gate of the destination so its
 * room (`objectiveSimulationOptions`) is reachable whatever the party's own settings; the depth limit is `all` for the boss
 * room and that room for an elite gate room, so the run ends after its battle.
 */
export function prepareObjectiveState(state: GameState, partyIndex: number, objective: string, settings: ForecastSettings = DEFAULT_FORECAST_SETTINGS): GameState {
  if (!isRoomObjective(objective)) return state;
  const party = state.parties[partyIndex];
  const dungeonId = party.selectedDungeonId;
  const clearGateStatus = { ...party.clearGateStatus };
  for (let floor = 1; floor <= 5; floor += 1) clearGateStatus[getEliteGateKey(dungeonId, floor)] = true;
  clearGateStatus[getBossGateKey(dungeonId)] = true;
  const room = foughtRoom(objective, settings);
  const expeditionDepthLimit = room.floorNumber >= 6 ? 'all' : gateRoomLabel(room) as Party['expeditionDepthLimit'];
  const parties = [...state.parties];
  parties[partyIndex] = { ...party, clearGateStatus, expeditionDepthLimit };
  return { ...state, parties };
}

/**
 * `bossDamage` fights only the boss battle and `gateDamage` only its gate room, from `startHp` (full HP by default); every
 * other objective runs the whole route from full HP.
 */
export function objectiveSimulationOptions(objective: string, settings: ForecastSettings = DEFAULT_FORECAST_SETTINGS): ExpeditionSimulationOptions {
  if (!isRoomObjective(objective)) return {};
  const startHp = settings.startHp === null ? {} : { startHpShare: settings.startHp };
  return objective === 'bossDamage' ? { bossRoomOnly: true, ...startHp } : { onlyRoom: foughtRoom(objective, settings), ...startHp };
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
  if (objective === 'gateDamage') return perRun(result.gateRoom?.damageShare ?? 0, result.gateRoom?.damageShareSquareSum ?? 0);
  if (objective === 'experience') return perRun(result.totals?.experience ?? 0, result.experienceSquareSum ?? 0);
  return perRun(result.progress?.sum ?? 0, result.progress?.squareSum ?? 0, Math.max(1, routeRooms));
}

export interface ForecastScope {
  from: string | null;
  to: string | null;
  rooms: number;
  endsAt: 'clearGate' | 'depthLimit' | 'dungeonEnd' | 'bossRoom' | 'gateRoom';
}

// SpecRef: 9.1.3 | 2-3-2 `forecast.scope` | the rooms a forecast of `objective` simulates, walked as `routeRoomCount` does.
export function forecastScope(state: GameState, partyIndex: number, objective: string, settings: ForecastSettings = DEFAULT_FORECAST_SETTINGS): ForecastScope {
  if (objective === 'gateDamage') {
    const label = gateRoomLabel(foughtRoom(objective, settings));
    return { from: label, to: label, rooms: 1, endsAt: 'gateRoom' };
  }
  const party = prepareObjectiveState(state, partyIndex, objective, settings).parties[partyIndex];
  const dungeon = getDungeonById(party.selectedDungeonId);
  if (!dungeon) return { from: null, to: null, rooms: 0, endsAt: objective === 'bossDamage' ? 'bossRoom' : 'dungeonEnd' };
  const labels: string[] = [];
  for (const floor of dungeon.floors) {
    for (let roomIndex = 0; roomIndex < floor.rooms.length; roomIndex += 1) {
      const roomInFloor = roomIndex + 1;
      const label = `${floor.floorNumber}f-${roomInFloor}`;
      if (objective === 'bossDamage') {
        if (floor.rooms[roomIndex].type === 'battle_Boss') return { from: label, to: label, rooms: 1, endsAt: 'bossRoom' };
        continue;
      }
      if (checkClearGateRequirement({ dungeonId: dungeon.id, floorNumber: floor.floorNumber, roomInFloor, roomType: floor.rooms[roomIndex].type, party }).blocked) {
        return { from: labels[0] ?? null, to: labels[labels.length - 1] ?? null, rooms: labels.length, endsAt: 'clearGate' };
      }
      labels.push(label);
      if (hasReachedExpeditionDepthLimit(party.expeditionDepthLimit, floor.floorNumber, roomInFloor)) {
        return { from: labels[0], to: label, rooms: labels.length, endsAt: 'depthLimit' };
      }
    }
  }
  if (objective === 'bossDamage') return { from: null, to: null, rooms: 0, endsAt: 'bossRoom' };
  return { from: labels[0] ?? null, to: labels[labels.length - 1] ?? null, rooms: labels.length, endsAt: 'dungeonEnd' };
}
