import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  aggregateExpeditionSimulationRooms,
  createExpeditionSimulationRoomResults,
  EXPEDITION_SIMULATION_ROOM_COUNT,
  getExpeditionSimulationFloorLabel,
  getExpeditionSimulationRetreatHpBucket,
  getExpeditionSimulationRoomCoordinate,
  getExpeditionSimulationSuccessfulHpBucket,
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
  assert.match(tabSource, /\[room\.successfulHp\.Full, 'rgb\(var\(--color-sub\)\)'\]/);
  for (const retainedSubPercent of [88, 84, 80, 76, 72, 68, 64]) {
    assert.match(tabSource, new RegExp(`color-mix\\(in srgb, rgb\\(var\\(--color-sub\\)\\) ${retainedSubPercent}%, white\\)`));
  }
  assert.match(tabSource, /color-mix\(in srgb, color-mix\(in srgb, rgb\(var\(--color-sub\)\) 50%, rgb\(var\(--color-accent\)\)\) 60%, white\)/);
  for (const retainedAccentPercent of [65, 70, 75, 80]) {
    assert.match(tabSource, new RegExp(`color-mix\\(in srgb, rgb\\(var\\(--color-accent\\)\\) ${retainedAccentPercent}%, white\\)`));
  }
  assert.match(tabSource, /\[room\.Defeat, 'rgb\(var\(--color-accent\)\)'\]/);
  assert.match(tabSource, /simulation\.result\.Draw_Retreat \/ simulation\.result\.total/);
  assert.match(tabSource, /formatDecimal\(simulation\.result\.Draw_Retreat \/ simulation\.result\.total \* 100, 1\)/);
  assert.match(tabSource, /formatDecimal\(simulation\.result\.Wounded_Retreat \/ simulation\.result\.total \* 100, 1\)/);
  assert.match(tabSource, /formatDecimal\(simulation\.result\.Defeat \/ simulation\.result\.total \* 100, 1\)/);
  assert.match(tabSource, /simulation\.result\.rooms\.map/);
  assert.match(tabSource, /party\.expedition\.simulationRoomReached/);
  assert.match(tabSource, /party\.expedition\.simulationRoomBreakdown/);
  assert.match(tabSource, /getExpeditionSimulationRoomCoordinate\(room\.room\)/);
  assert.match(tabSource, /floor: formatNumber\(coordinate\.floor\)/);
  assert.match(tabSource, /roomInFloor: formatNumber\(coordinate\.roomInFloor\)/);
  assert.match(tabSource, /room\.Clear > 0[\s\S]*?expedition\.outcome\.clear[\s\S]*?room\.Return > 0[\s\S]*?expedition\.outcome\.return[\s\S]*?expedition\.outcome\.victory/);
  assert.match(tabSource, /successfulLabel: successfulOutcome\.label/);
  assert.match(tabSource, /successful: percent\(successfulOutcome\.value\)/);
  assert.match(tabSource, /room\.NotReached/);
});

test('simulation graph labels floor starts and has only the required percentage guides', () => {
  assert.match(tabSource, /top-1\/4 border-t border-dashed/);
  assert.match(tabSource, /top-1\/2 border-t border-dashed/);
  assert.match(tabSource, /top-3\/4 border-t border-dashed/);
  assert.doesNotMatch(tabSource, /<span>100%<\/span><span>50%<\/span><span>0%<\/span>/);
  assert.match(tabSource, /room\.room % 4 === 1 \? getExpeditionSimulationFloorLabel\(room\.room\) : ''/);

  assert.deepEqual(getExpeditionSimulationRoomCoordinate(1), { floor: 1, roomInFloor: 1 });
  assert.deepEqual(getExpeditionSimulationRoomCoordinate(5), { floor: 2, roomInFloor: 1 });
  assert.deepEqual(getExpeditionSimulationRoomCoordinate(17), { floor: 5, roomInFloor: 1 });
  assert.deepEqual(getExpeditionSimulationRoomCoordinate(24), { floor: 6, roomInFloor: 4 });
  assert.equal(getExpeditionSimulationFloorLabel(1), '1F');
  assert.equal(getExpeditionSimulationFloorLabel(5), '2F');
  assert.equal(getExpeditionSimulationFloorLabel(9), '3F');
  assert.equal(getExpeditionSimulationFloorLabel(13), '4F');
  assert.equal(getExpeditionSimulationFloorLabel(17), '5F');
  assert.equal(getExpeditionSimulationFloorLabel(21), '6F');
});

test('successful HP ranges use exact half-open boundaries', () => {
  const bucket = (remainingHp: number) => getExpeditionSimulationSuccessfulHpBucket(remainingHp, 100);
  assert.equal(bucket(101), 'Full');
  assert.equal(bucket(100), 'Full');
  assert.equal(bucket(99.999), 'From90');
  assert.equal(bucket(90), 'From90');
  assert.equal(bucket(89.999), 'From80');
  assert.equal(bucket(80), 'From80');
  assert.equal(bucket(70), 'From70');
  assert.equal(bucket(60), 'From60');
  assert.equal(bucket(50), 'From50');
  assert.equal(bucket(40), 'From40');
  assert.equal(bucket(39.999), 'Below40');
  assert.equal(bucket(-1), 'Below40');
});

test('retreat HP ranges use exact half-open boundaries', () => {
  const bucket = (remainingHp: number) => getExpeditionSimulationRetreatHpBucket(remainingHp, 100);
  assert.equal(bucket(100), 'From30');
  assert.equal(bucket(30), 'From30');
  assert.equal(bucket(29.999), 'From20');
  assert.equal(bucket(20), 'From20');
  assert.equal(bucket(19.999), 'From10');
  assert.equal(bucket(10), 'From10');
  assert.equal(bucket(9.999), 'Below10');
  assert.equal(bucket(-1), 'Below10');
});

test('room aggregation assigns one status per run to every room and buckets terminal HP', () => {
  const rooms = createExpeditionSimulationRoomResults(5);
  const battles = (remainingHp: number[]) => remainingHp.map((remainingPartyHP) => ({ remainingPartyHP }));
  aggregateExpeditionSimulationRooms(rooms, 24, 'Clear', battles(Array(24).fill(100)), 100);
  aggregateExpeditionSimulationRooms(rooms, 8, 'Return', battles(Array(8).fill(95)), 100);
  aggregateExpeditionSimulationRooms(rooms, 5, 'Draw', battles([85, 75, 65, 55, 35]), 100);
  aggregateExpeditionSimulationRooms(rooms, 3, 'Retreat', battles([45, 35, 25]), 100);
  aggregateExpeditionSimulationRooms(rooms, 1, 'Defeat', battles([0]), 100);

  assert.equal(rooms.length, EXPEDITION_SIMULATION_ROOM_COUNT);
  assert.deepEqual(rooms[0], {
    room: 1, Victory: 4, Clear: 0, Return: 0, Draw: 0, Retreat: 0, Defeat: 1,
    NotReached: 0, reached: 5, total: 5,
    successfulHp: { Full: 1, From90: 1, From80: 1, From70: 0, From60: 0, From50: 0, From40: 1, Below40: 0 },
    retreatHp: { From30: 0, From20: 0, From10: 0, Below10: 0 },
  });
  assert.equal(rooms[2].Retreat, 1);
  assert.deepEqual(rooms[2].retreatHp, { From30: 0, From20: 1, From10: 0, Below10: 0 });
  assert.equal(rooms[4].Draw, 1);
  assert.equal(rooms[7].Return, 1);
  assert.equal(rooms[23].Clear, 1);
  for (const room of rooms) {
    const statusTotal = room.Victory + room.Clear + room.Return + room.Draw
      + room.Retreat + room.Defeat + room.NotReached;
    assert.equal(statusTotal, room.total, `room ${room.room} must be a 100% stack`);
    assert.equal(room.reached + room.NotReached, room.total, `room ${room.room} reach total`);
    const successfulHpTotal = Object.values(room.successfulHp).reduce((sum, value) => sum + value, 0);
    assert.equal(successfulHpTotal, room.Victory + room.Clear + room.Return, `room ${room.room} successful HP total`);
    const retreatHpTotal = Object.values(room.retreatHp).reduce((sum, value) => sum + value, 0);
    assert.equal(retreatHpTotal, room.Retreat, `room ${room.room} retreat HP total`);
  }
});
