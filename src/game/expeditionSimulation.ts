// SpecRef: 8.3 | UI_EXPEDITION | Simulation Run
import type { ExpeditionSimulationRoomResult } from '../types';

export const EXPEDITION_SIMULATION_RUN_COUNT = 1_000;
export const EXPEDITION_SIMULATION_ROOM_COUNT = 24;

export type ExpeditionSimulationTerminalStatus = 'Clear' | 'Return' | 'Draw' | 'Retreat' | 'Defeat';

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
  }));
}

/** Add one run to all 24 graph bars, including rooms after termination. */
export function aggregateExpeditionSimulationRooms(
  rooms: ExpeditionSimulationRoomResult[],
  completedRooms: number,
  terminalStatus: ExpeditionSimulationTerminalStatus,
): void {
  const reachedRooms = Math.min(EXPEDITION_SIMULATION_ROOM_COUNT, Math.max(0, Math.floor(completedRooms)));
  rooms.forEach((room, index) => {
    if (index >= reachedRooms) {
      room.NotReached += 1;
      return;
    }
    room.reached += 1;
    if (index === reachedRooms - 1) room[terminalStatus] += 1;
    else room.Victory += 1;
  });
}
