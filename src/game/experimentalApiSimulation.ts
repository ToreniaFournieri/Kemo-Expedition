import type { ExpeditionSimulationResult } from '../types';
import { requireApi } from './experimentalApiSession.ts';

export type SimulationOutput = {
  detail: 'summary' | 'rooms' | 'hp';
  candidate: 'full' | 'changes';
};

// SpecRef: 9.1.3 | Experimental AI API | Simulation output
export function parseSimulationOutput(value: unknown): SimulationOutput | undefined {
  if (value === undefined) return undefined;
  requireApi(value !== null && typeof value === 'object' && !Array.isArray(value), 'invalid_request', 'output must be an object.', 400);
  const output = value as Record<string, unknown>;
  requireApi(Object.keys(output).every(key => ['detail', 'candidate'].includes(key)), 'invalid_request', 'Unknown output property.', 400);
  const detail = output.detail === undefined ? 'rooms' : output.detail;
  const candidate = output.candidate === undefined ? 'full' : output.candidate;
  requireApi(detail === 'summary' || detail === 'rooms' || detail === 'hp', 'invalid_request', 'Invalid output.detail.', 400);
  requireApi(candidate === 'full' || candidate === 'changes', 'invalid_request', 'Invalid output.candidate.', 400);
  return { detail, candidate };
}

// SpecRef: 9.1.3 | Experimental AI API | Simulation output
export function formatApiSimulation(result: ExpeditionSimulationResult, output?: SimulationOutput) {
  if (!output) return { outcomes: result, total: result.total };
  const { Clear, Turned_Back, Draw_Retreat, Wounded_Retreat, Defeat, total } = result;
  const summary = { total, outcomes: { Clear, Turned_Back, Draw_Retreat, Wounded_Retreat, Defeat } };
  if (output.detail === 'summary') return summary;
  const columns = ['Victory', 'Clear', 'Return', 'Draw', 'Retreat', 'Defeat'] as const;
  let lastReached = -1;
  result.rooms.forEach((room, index) => { if (room.reached > 0) lastReached = index; });
  const rooms = result.rooms.slice(0, lastReached + 1);
  const roomTable = {
    roomCount: result.rooms.length,
    columns: ['room', ...columns],
    rows: rooms.map(room => [room.room, ...columns.map(key => room[key])]),
  };
  if (output.detail === 'rooms') return { ...summary, rooms: roomTable };
  const successKeys = ['Full', 'From90', 'From80', 'From70', 'From60', 'From50', 'From40', 'Below40'] as const;
  const retreatKeys = ['From30', 'From20', 'From10', 'Below10'] as const;
  return {
    ...summary,
    rooms: roomTable,
    hp: {
      successful: {
        columns: ['room', ...successKeys],
        rows: rooms.map(room => [room.room, ...successKeys.map(key => room.successfulHp[key])]),
      },
      retreat: {
        columns: ['room', ...retreatKeys],
        rows: rooms.map(room => [room.room, ...retreatKeys.map(key => room.retreatHp[key])]),
      },
    },
  };
}
