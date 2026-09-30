import { createExpeditionSimulationRoomResults, getExpeditionSimulationRoomCoordinate } from '../../game/expeditionSimulation.ts';
import { checkClearGateRequirement } from '../../game/clearGate.ts';
import { hasReachedExpeditionDepthLimit } from '../../game/expeditionEffects/expeditionContinuation.ts';
import { getDungeonById } from '../../data/dungeons.ts';
import type { ExpeditionSimulationResult, ExpeditionSimulationRoomResult, Party } from '../../types/index.ts';

// SpecRef: 9.1.3 | Read | 2-2-3 {p}/simulationRun
// SpecRef: 9.1.4.9 | Operation-specific completion rules | simulationRun structured percentages
// The public shape of a private expedition forecast: the two compact strings of 9.1.3 and the structured numbers behind
// them. Successes are not split into Clear and Return in the compact strings; the structured rooms keep the split.

const percent = (count: number, total: number): number => (total > 0 ? Math.round((count / total) * 1000) / 10 : 0);
const label = (value: number): string => value.toFixed(1);

const floorRoomNumber = (floorRoom: string): number => (Number(floorRoom[0]) - 1) * 4 + Number(floorRoom[floorRoom.length - 1]);

/** `1f-1` .. `6f-4` for room 1..24 (four rooms per floor). */
export function floorRoomLabel(room: number): string {
  const { floor, roomInFloor } = getExpeditionSimulationRoomCoordinate(room);
  return `${floor}f-${roomInFloor}`;
}

export interface SimulationDepthReach {
  /** The party's `depthLimit` setting. */
  requested: string;
  /** The last room a run can reach before a closed Clear-Gate stops it (`null`: the gate is the first room). */
  reachable: string | null;
  /** The closed gate that stops every run short of `requested`, or `null` when `requested` is reachable. */
  blockedByGate: { floorRoom: string; current: number; required: number } | null;
}

// SpecRef: 5.1.3.1 | Clear-Gate gate check; 9.1.4.9 | simulationRun reports a depth limit a closed gate makes unreachable.
/** Walks the party's destination the way a run does and reports the first closed Clear-Gate before its depth limit. */
export function describeSimulationDepthReach(party: Party): SimulationDepthReach | null {
  const dungeon = getDungeonById(party.selectedDungeonId);
  if (!dungeon) return null;
  let previous: string | null = null;
  for (const floor of dungeon.floors) {
    for (let roomIndex = 0; roomIndex < floor.rooms.length; roomIndex += 1) {
      const roomInFloor = roomIndex + 1;
      const floorRoom = `${floor.floorNumber}f-${roomInFloor}`;
      const gate = checkClearGateRequirement({ dungeonId: dungeon.id, floorNumber: floor.floorNumber, roomInFloor, roomType: floor.rooms[roomIndex].type, party });
      if (gate.blocked) {
        return { requested: party.expeditionDepthLimit, reachable: previous, blockedByGate: { floorRoom, current: gate.current, required: gate.required } };
      }
      if (hasReachedExpeditionDepthLimit(party.expeditionDepthLimit, floor.floorNumber, roomInFloor)) {
        return { requested: party.expeditionDepthLimit, reachable: party.expeditionDepthLimit, blockedByGate: null };
      }
      previous = floorRoom;
    }
  }
  return { requested: party.expeditionDepthLimit, reachable: party.expeditionDepthLimit, blockedByGate: null };
}

/** The bar of a room no run reached: every run is `notReached` and nothing else was counted. */
function unreachedRoom(room: number, total: number): ExpeditionSimulationRoomResult {
  return { ...createExpeditionSimulationRoomResults(total)[room - 1], NotReached: total };
}

function isUnreachedRoom(room: ExpeditionSimulationRoomResult, total: number): boolean {
  return JSON.stringify(room) === JSON.stringify(unreachedRoom(room.room, total));
}

/**
 * The column order of `rooms.rows`: each room is one row of plain values, and the names are stated once in `rooms.columns`.
 * `reached` is not a column; it is the run count minus `notReached`.
 */
export const SIMULATION_ROOM_COLUMNS = [
  'floorRoom', 'notReached', 'victory', 'clear', 'return', 'draw', 'retreat', 'defeat',
  'successfulHp.full', 'successfulHp.from90', 'successfulHp.from80', 'successfulHp.from70', 'successfulHp.from60', 'successfulHp.from50', 'successfulHp.from40', 'successfulHp.below40',
  'retreatHp.from30', 'retreatHp.from20', 'retreatHp.from10', 'retreatHp.below10',
] as const;

const perRun = (sum: number, total: number): number => (total > 0 ? Math.round((sum / total) * 10) / 10 : 0);

export type SimulationRoomRow = [
  floorRoom: string, notReached: number, victory: number, clear: number, return_: number, draw: number, retreat: number, defeat: number,
  full: number, from90: number, from80: number, from70: number, from60: number, from50: number, from40: number, below40: number,
  from30: number, from20: number, from10: number, below10: number,
];

export function buildSimulationRunData(result: ExpeditionSimulationResult, simulatedRevision: number, seedDomain: string, depthReach: SimulationDepthReach | null = null) {
  const total = result.total;
  const totals = result.totals ?? { experience: 0, itemDrops: 0, dropSaleValue: 0 };
  const success = percent(result.Clear + result.Return, total);
  const draw = percent(result.Draw, total);
  const retreat = percent(result.Retreat, total);
  const defeat = percent(result.Defeat, total);
  // Rooms no run reached (past the depth limit or a closed gate) carry nothing but `notReached = runs`, so they are left out
  // of `detail` and `rooms`; `omittedRooms` counts them and a client rebuilds them from that.
  const reachedRooms = result.rooms.filter((room) => !isUnreachedRoom(room, total));
  return {
    simulatedRevision,
    seedDomain,
    runs: total,
    overview: `Success ${label(success)}% / Draw ${label(draw)}% / Retreat ${label(retreat)}% / Defeat ${label(defeat)}%`,
    // Exact terminal counts (Clear and Return are split here even though the compact strings are not), so a client can rebuild
    // the whole forecast without rounding.
    counts: { clear: result.Clear, return: result.Return, draw: result.Draw, retreat: result.Retreat, defeat: result.Defeat },
    overviewPercent: { success, clear: percent(result.Clear, total), return: percent(result.Return, total), draw, retreat, defeat },
    // A `return` counts as a success, so a closed gate before the depth limit shows up here rather than as a failure.
    depthLimit: depthReach,
    // Expected rewards of one run (the mean over all runs). Gold is realized only when the drops are sold or auto-sold.
    expectedPerRun: { experience: perRun(totals.experience, total), itemDrops: perRun(totals.itemDrops, total), dropSaleValue: perRun(totals.dropSaleValue, total) },
    totals: { ...totals },
    omittedRooms: result.rooms.length - reachedRooms.length,
    detail: reachedRooms.map((room) => {
      const won = room.Victory + room.Clear + room.Return;
      return `${floorRoomLabel(room.room)}/Success ${label(percent(won, total))}% / Draw ${label(percent(room.Draw, total))}% / Retreat ${label(percent(room.Retreat, total))}% / Defeat ${label(percent(room.Defeat, total))}% / Not reached ${label(percent(room.NotReached, total))}%`;
    }),
    rooms: {
      columns: SIMULATION_ROOM_COLUMNS,
      rows: reachedRooms.map((room): SimulationRoomRow => [
        floorRoomLabel(room.room), room.NotReached, room.Victory, room.Clear, room.Return, room.Draw, room.Retreat, room.Defeat,
        room.successfulHp.Full, room.successfulHp.From90, room.successfulHp.From80, room.successfulHp.From70,
        room.successfulHp.From60, room.successfulHp.From50, room.successfulHp.From40, room.successfulHp.Below40,
        room.retreatHp.From30, room.retreatHp.From20, room.retreatHp.From10, room.retreatHp.Below10,
      ]),
    },
  };
}

/** The wire shape of `buildSimulationRunData`, as far as the Expedition pane needs it back. */
export type SimulationRunData = ReturnType<typeof buildSimulationRunData>;

/**
 * Rebuilds the forecast the Expedition pane draws from the projection; the exact inverse of `buildSimulationRunData`. The
 * omitted rooms come back as bars no run reached.
 */
export function parseSimulationRunData(data: SimulationRunData): ExpeditionSimulationResult {
  const total = data.runs;
  const returnedRooms = new Set(data.rooms.rows.map((row) => floorRoomNumber(row[0])));
  const omittedRooms = createExpeditionSimulationRoomResults(total)
    .filter((room) => !returnedRooms.has(room.room))
    .map((room) => unreachedRoom(room.room, total));
  return {
    Clear: data.counts.clear,
    Return: data.counts.return,
    Draw: data.counts.draw,
    Retreat: data.counts.retreat,
    Defeat: data.counts.defeat,
    total,
    totals: { ...data.totals },
    rooms: [...data.rooms.rows.map((row) => ({
      room: floorRoomNumber(row[0]),
      Victory: row[2],
      Clear: row[3],
      Return: row[4],
      Draw: row[5],
      Retreat: row[6],
      Defeat: row[7],
      NotReached: row[1],
      reached: total - row[1],
      total,
      successfulHp: { Full: row[8], From90: row[9], From80: row[10], From70: row[11], From60: row[12], From50: row[13], From40: row[14], Below40: row[15] },
      retreatHp: { From30: row[16], From20: row[17], From10: row[18], Below10: row[19] },
    })), ...omittedRooms].sort((left, right) => left.room - right.room),
  };
}
