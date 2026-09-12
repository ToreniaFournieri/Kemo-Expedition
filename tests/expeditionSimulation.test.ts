import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  aggregateExpeditionSimulationRooms,
  createExpeditionSimulationRoomResults,
  EXPEDITION_SIMULATION_ROOM_COUNT,
} from '../src/game/expeditionSimulation.ts';

const hookSource = readFileSync(new URL('../src/hooks/useGameState.ts', import.meta.url), 'utf8');
const tabSource = readFileSync(new URL('../src/components/home/tabs/ExpeditionTab.tsx', import.meta.url), 'utf8');
const simulationSource = readFileSync(new URL('../src/game/expeditionSimulation.ts', import.meta.url), 'utf8');

test('expedition simulations resolve isolated authoritative runs and yield asynchronously', () => {
  assert.match(simulationSource, /EXPEDITION_SIMULATION_RUN_COUNT = 1_000/);
  assert.match(hookSource, /count = EXPEDITION_SIMULATION_RUN_COUNT/);
  assert.match(hookSource, /simulateExpeditionRuns\(latestGameStateRef\.current, partyIndex, gameMode, EXPEDITION_SIMULATION_RUN_COUNT, onProgress, enemyLevelOffset\)/);
  assert.match(hookSource, /export async function simulateExpeditionRuns/);
  assert.match(hookSource, /export function createSimulationSandbox/);
  assert.match(hookSource, /const party = structuredClone\(sourceParty\)/);
  assert.match(hookSource, /const runState = createSimulationRunState\(sandbox\)/);
  assert.match(hookSource, /gameReducer\(runState, \{[\s\S]*type: 'RUN_EXPEDITION'/);
  assert.match(
    hookSource.match(/export async function simulateExpeditionRuns[\s\S]*?return result;\n\}/)?.[0] ?? '',
    /battleOutputMode: 'result-only'/,
  );
  assert.match(hookSource, /resolutionMode: 'forecast'/);
  assert.match(hookSource, /now - sliceStartedAt >= EXPEDITION_SIMULATION_SLICE_BUDGET_MS[\s\S]*await yieldToExpeditionSimulationUi\(\)/);
  assert.doesNotMatch(
    hookSource.match(/export async function simulateExpeditionRuns[\s\S]*?return result;\n\}/)?.[0] ?? '',
    /dispatch\(|saveState\(/,
  );
});

test('expedition simulation UI exposes asynchronous progress and conditional success labels', () => {
  assert.match(tabSource, /total: EXPEDITION_SIMULATION_RUN_COUNT/);
  assert.match(tabSource, /party\.expedition\.simulationRun/);
  assert.match(tabSource, /party\.expedition\.simulationRunning/);
  assert.match(tabSource, /party\.expedition\.simulationResult\.clear/);
  assert.match(tabSource, /party\.expedition\.simulationResult\.return/);
  assert.match(tabSource, /simulation\.result\.Turned_Back === 0/);
  assert.match(tabSource, /activeSimulationResultBubble/);
  assert.match(tabSource, /role="tooltip"/);
  assert.match(tabSource, /var\(--outcome-success\)/);
  assert.match(tabSource, /var\(--outcome-draw\)/);
  assert.match(tabSource, /var\(--outcome-retreat\)/);
  assert.match(tabSource, /var\(--outcome-defeat\)/);
  assert.match(tabSource, /simulation\.result\.Draw_Retreat \/ simulation\.result\.total/);
  assert.match(tabSource, /formatDecimal\(simulation\.result\.Draw_Retreat \/ simulation\.result\.total \* 100, 1\)/);
  assert.match(tabSource, /formatDecimal\(simulation\.result\.Wounded_Retreat \/ simulation\.result\.total \* 100, 1\)/);
  assert.match(tabSource, /formatDecimal\(simulation\.result\.Defeat \/ simulation\.result\.total \* 100, 1\)/);
  assert.match(tabSource, /simulation\.result\.rooms\.map/);
  assert.match(tabSource, /party\.expedition\.simulationRoomReached/);
  assert.match(tabSource, /party\.expedition\.simulationRoomBreakdown/);
  assert.match(tabSource, /room\.NotReached/);
});

test('room aggregation assigns one status per run to every room', () => {
  const rooms = createExpeditionSimulationRoomResults(5);
  aggregateExpeditionSimulationRooms(rooms, 24, 'Clear');
  aggregateExpeditionSimulationRooms(rooms, 8, 'Return');
  aggregateExpeditionSimulationRooms(rooms, 5, 'Draw');
  aggregateExpeditionSimulationRooms(rooms, 3, 'Retreat');
  aggregateExpeditionSimulationRooms(rooms, 1, 'Defeat');

  assert.equal(rooms.length, EXPEDITION_SIMULATION_ROOM_COUNT);
  assert.deepEqual(rooms[0], {
    room: 1, Victory: 4, Clear: 0, Return: 0, Draw: 0, Retreat: 0, Defeat: 1,
    NotReached: 0, reached: 5, total: 5,
  });
  assert.equal(rooms[2].Retreat, 1);
  assert.equal(rooms[4].Draw, 1);
  assert.equal(rooms[7].Return, 1);
  assert.equal(rooms[23].Clear, 1);
  for (const room of rooms) {
    const statusTotal = room.Victory + room.Clear + room.Return + room.Draw
      + room.Retreat + room.Defeat + room.NotReached;
    assert.equal(statusTotal, room.total, `room ${room.room} must be a 100% stack`);
    assert.equal(room.reached + room.NotReached, room.total, `room ${room.room} reach total`);
  }
});
