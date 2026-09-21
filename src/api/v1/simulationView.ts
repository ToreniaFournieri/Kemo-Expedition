import { getExpeditionSimulationRoomCoordinate } from '../../game/expeditionSimulation.ts';
import type { ExpeditionSimulationResult } from '../../types/index.ts';

// SpecRef: 9.1.3 | Read | 2-2-3 {p}/simulationRun
// SpecRef: 9.1.4.9 | Operation-specific completion rules | simulationRun structured percentages
// The public shape of a private expedition forecast: the two compact strings of 9.1.3 and the structured numbers behind
// them. Successes are not split into Clear and Return in the compact strings; the structured rooms keep the split.

const percent = (count: number, total: number): number => (total > 0 ? Math.round((count / total) * 1000) / 10 : 0);
const label = (value: number): string => value.toFixed(1);

/** `1f-1` .. `6f-4` for room 1..24 (four rooms per floor). */
export function floorRoomLabel(room: number): string {
  const { floor, roomInFloor } = getExpeditionSimulationRoomCoordinate(room);
  return `${floor}f-${roomInFloor}`;
}

export function buildSimulationRunData(result: ExpeditionSimulationResult, simulatedRevision: number, seedDomain: string) {
  const total = result.total;
  const success = percent(result.Clear + result.Return, total);
  const draw = percent(result.Draw, total);
  const retreat = percent(result.Retreat, total);
  const defeat = percent(result.Defeat, total);
  return {
    simulatedRevision,
    seedDomain,
    runs: total,
    overview: `Success ${label(success)}% / Draw ${label(draw)}% / Retreat ${label(retreat)}% / Defeat ${label(defeat)}%`,
    // Exact terminal counts (Clear and Return are split here even though the compact strings are not), so a client can rebuild
    // the whole forecast without rounding.
    counts: { clear: result.Clear, return: result.Return, draw: result.Draw, retreat: result.Retreat, defeat: result.Defeat },
    overviewPercent: { success, clear: percent(result.Clear, total), return: percent(result.Return, total), draw, retreat, defeat },
    detail: result.rooms.map((room) => {
      const won = room.Victory + room.Clear + room.Return;
      return `${floorRoomLabel(room.room)}/Success ${label(percent(won, total))}% / Draw ${label(percent(room.Draw, total))}% / Retreat ${label(percent(room.Retreat, total))}% / Defeat ${label(percent(room.Defeat, total))}% / Not reached ${label(percent(room.NotReached, total))}%`;
    }),
    rooms: result.rooms.map((room) => ({
      room: room.room,
      floorRoom: floorRoomLabel(room.room),
      reached: room.reached,
      notReached: room.NotReached,
      victory: room.Victory,
      clear: room.Clear,
      return: room.Return,
      draw: room.Draw,
      retreat: room.Retreat,
      defeat: room.Defeat,
      successfulHp: {
        full: room.successfulHp.Full, from90: room.successfulHp.From90, from80: room.successfulHp.From80, from70: room.successfulHp.From70,
        from60: room.successfulHp.From60, from50: room.successfulHp.From50, from40: room.successfulHp.From40, below40: room.successfulHp.Below40,
      },
      retreatHp: { from30: room.retreatHp.From30, from20: room.retreatHp.From20, from10: room.retreatHp.From10, below10: room.retreatHp.Below10 },
    })),
  };
}

/** The wire shape of `buildSimulationRunData`, as far as the Expedition pane needs it back. */
export type SimulationRunData = ReturnType<typeof buildSimulationRunData>;

/** Rebuilds the forecast the Expedition pane draws from the projection; the exact inverse of `buildSimulationRunData`. */
export function parseSimulationRunData(data: SimulationRunData): ExpeditionSimulationResult {
  const total = data.runs;
  return {
    Clear: data.counts.clear,
    Return: data.counts.return,
    Draw: data.counts.draw,
    Retreat: data.counts.retreat,
    Defeat: data.counts.defeat,
    total,
    rooms: data.rooms.map((room) => ({
      room: room.room,
      Victory: room.victory,
      Clear: room.clear,
      Return: room.return,
      Draw: room.draw,
      Retreat: room.retreat,
      Defeat: room.defeat,
      NotReached: room.notReached,
      reached: room.reached,
      total,
      successfulHp: {
        Full: room.successfulHp.full, From90: room.successfulHp.from90, From80: room.successfulHp.from80, From70: room.successfulHp.from70,
        From60: room.successfulHp.from60, From50: room.successfulHp.from50, From40: room.successfulHp.from40, Below40: room.successfulHp.below40,
      },
      retreatHp: { From30: room.retreatHp.from30, From20: room.retreatHp.from20, From10: room.retreatHp.from10, Below10: room.retreatHp.below10 },
    })),
  };
}
