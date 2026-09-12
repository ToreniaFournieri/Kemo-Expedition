import assert from 'node:assert/strict';
import test from 'node:test';
import { aggregateExpeditionSimulationRooms, createExpeditionSimulationRoomResults } from '../src/game/expeditionSimulation.ts';
import { formatApiSimulation, parseSimulationOutput } from '../src/game/experimentalApiSimulation.ts';

test('compact HP projection reconstructs every UI graph count without changing its source', () => {
  const result = { Clear: 1, Turned_Back: 1, Draw_Retreat: 1, Wounded_Retreat: 1, Defeat: 1, total: 5, rooms: createExpeditionSimulationRoomResults(5) };
  for (const [index, status] of (['Clear', 'Return', 'Draw', 'Retreat', 'Defeat'] as const).entries()) {
    aggregateExpeditionSimulationRooms(result.rooms, index + 1, status, Array.from({ length: index + 1 }, () => ({ remainingPartyHP: 25 + index * 15 })), 100);
  }
  const before = structuredClone(result);
  const formatted = formatApiSimulation(result, { detail: 'hp', candidate: 'changes' });
  assert.ok('rooms' in formatted && 'hp' in formatted);
  assert.equal(formatted.rooms.roomCount, 24);
  assert.equal(formatted.rooms.rows.length, 5);
  for (const room of result.rooms) {
    const row = formatted.rooms.rows[room.room - 1] ?? [room.room, 0, 0, 0, 0, 0, 0];
    assert.deepEqual(row, [room.room, room.Victory, room.Clear, room.Return, room.Draw, room.Retreat, room.Defeat]);
    assert.equal(row.slice(1).reduce((a, b) => a + b, 0), room.reached);
    assert.equal(result.total - row.slice(1).reduce((a, b) => a + b, 0), room.NotReached);
    if (room.reached) {
      assert.deepEqual(formatted.hp.successful.rows[room.room - 1].slice(1), Object.values(room.successfulHp));
      assert.deepEqual(formatted.hp.retreat.rows[room.room - 1].slice(1), Object.values(room.retreatHp));
    }
  }
  assert.deepEqual(result, before);
  assert.deepEqual(formatApiSimulation(result), { outcomes: result, total: 5 });
  const summary = formatApiSimulation(result, { detail: 'summary', candidate: 'full' });
  assert.deepEqual(summary, { total: 5, outcomes: { Clear: 1, Turned_Back: 1, Draw_Retreat: 1, Wounded_Retreat: 1, Defeat: 1 } });
  const compact = formatApiSimulation(result, { detail: 'rooms', candidate: 'full' });
  assert.ok(!('hp' in compact));
  assert.ok(JSON.stringify(compact).length < JSON.stringify(formatApiSimulation(result)).length / 2);
});

test('output validates strictly and defaults only omitted values', () => {
  assert.equal(parseSimulationOutput(undefined), undefined);
  assert.deepEqual(parseSimulationOutput({}), { detail: 'rooms', candidate: 'full' });
  for (const value of [null, [], 'hp', { detail: null }, { detail: 'all' }, { candidate: 'none' }, { seed: 1 }]) {
    assert.throws(() => parseSimulationOutput(value), /output/);
  }
  for (const detail of ['summary', 'rooms', 'hp']) {
    for (const candidate of ['full', 'changes']) assert.deepEqual(parseSimulationOutput({ detail, candidate }), { detail, candidate });
  }
});
