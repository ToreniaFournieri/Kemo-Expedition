// SpecRef: 8.3 | UI_EXPEDITION | Simulation Run
import type {
  ExpeditionSimulationRetreatHpBuckets,
  ExpeditionSimulationRoomResult,
  ExpeditionSimulationSuccessfulHpBuckets,
} from '../types';

export const EXPEDITION_SIMULATION_RUN_COUNT = 1_000;
export const EXPEDITION_SIMULATION_ROOM_COUNT = 24;

export type ExpeditionSimulationTerminalStatus = 'Clear' | 'Return' | 'Draw' | 'Retreat' | 'Defeat';
export type ExpeditionSimulationSuccessfulHpBucket = keyof ExpeditionSimulationSuccessfulHpBuckets;
export type ExpeditionSimulationRetreatHpBucket = keyof ExpeditionSimulationRetreatHpBuckets;

/** Convert the one-based graph room number into its expedition floor position. */
export function getExpeditionSimulationRoomCoordinate(room: number): { floor: number; roomInFloor: number } {
  const normalizedRoom = Math.min(EXPEDITION_SIMULATION_ROOM_COUNT, Math.max(1, Math.floor(room)));
  return {
    floor: Math.floor((normalizedRoom - 1) / 4) + 1,
    roomInFloor: (normalizedRoom - 1) % 4 + 1,
  };
}

export function getExpeditionSimulationFloorLabel(room: number): string {
  return `${getExpeditionSimulationRoomCoordinate(room).floor}F`;
}

export function getExpeditionSimulationSuccessfulHpBucket(
  remainingHp: number,
  maxHp: number,
): ExpeditionSimulationSuccessfulHpBucket {
  const percent = Math.min(100, Math.max(0, remainingHp / Math.max(1, maxHp) * 100));
  if (percent >= 100) return 'Full';
  if (percent >= 90) return 'From90';
  if (percent >= 80) return 'From80';
  if (percent >= 70) return 'From70';
  if (percent >= 60) return 'From60';
  if (percent >= 50) return 'From50';
  if (percent >= 40) return 'From40';
  return 'Below40';
}

export function getExpeditionSimulationRetreatHpBucket(
  remainingHp: number,
  maxHp: number,
): ExpeditionSimulationRetreatHpBucket {
  const percent = Math.min(100, Math.max(0, remainingHp / Math.max(1, maxHp) * 100));
  if (percent >= 30) return 'From30';
  if (percent >= 20) return 'From20';
  if (percent >= 10) return 'From10';
  return 'Below10';
}

export function createExpeditionSimulationRoomResults(
  total: number,
): ExpeditionSimulationRoomResult[] {
  return Array.from({ length: EXPEDITION_SIMULATION_ROOM_COUNT }, (_, index) => ({
    room: index + 1,
    Victory: 0,
    Clear: 0,
    Return: 0,
    Draw: 0,
    Retreat: 0,
    Defeat: 0,
    NotReached: 0,
    reached: 0,
    total,
    successfulHp: {
      Full: 0,
      From90: 0,
      From80: 0,
      From70: 0,
      From60: 0,
      From50: 0,
      From40: 0,
      Below40: 0,
    },
    retreatHp: {
      From30: 0,
      From20: 0,
      From10: 0,
      Below10: 0,
    },
  }));
}

/** Add one run to all 24 graph bars, including rooms after termination. */
export function aggregateExpeditionSimulationRooms(
  rooms: ExpeditionSimulationRoomResult[],
  completedRooms: number,
  terminalStatus: ExpeditionSimulationTerminalStatus,
  battlesByRoom: readonly { remainingPartyHP: number }[],
  maxPartyHp: number,
): void {
  const reachedRooms = Math.min(EXPEDITION_SIMULATION_ROOM_COUNT, Math.max(0, Math.floor(completedRooms)));
  rooms.forEach((room, index) => {
    if (index >= reachedRooms) {
      room.NotReached += 1;
      return;
    }
    room.reached += 1;
    const status = index === reachedRooms - 1 ? terminalStatus : 'Victory';
    room[status] += 1;
    if (status === 'Victory' || status === 'Clear' || status === 'Return') {
      const bucket = getExpeditionSimulationSuccessfulHpBucket(battlesByRoom[index]?.remainingPartyHP ?? 0, maxPartyHp);
      room.successfulHp[bucket] += 1;
    } else if (status === 'Retreat') {
      const bucket = getExpeditionSimulationRetreatHpBucket(battlesByRoom[index]?.remainingPartyHP ?? 0, maxPartyHp);
      room.retreatHp[bucket] += 1;
    }
  });
}
