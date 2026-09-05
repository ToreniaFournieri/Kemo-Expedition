import assert from 'node:assert/strict';
import test from 'node:test';
import { AfkEquipmentPlanningTotals } from '../src/game/afkEquipmentAttribution.ts';

test('AFK equipment phase totals survive many transactions with bounded retention', () => {
  const totals = new AfkEquipmentPlanningTotals();
  for (let index = 0; index < 10_000; index += 1) {
    totals.record({ inventoryScan: 2, actionDispatch: 1, [`unexpected${index}`]: 999 });
  }
  assert.deepEqual(totals.snapshot(), { inventoryScan: 20_000, actionDispatch: 10_000 });
});

test('AFK equipment snapshots are detached and reset between profile sessions', () => {
  const totals = new AfkEquipmentPlanningTotals();
  const input = { inventoryClone: 3, notificationPlanning: 0 };
  totals.record(input);
  input.inventoryClone = 900;
  const snapshot = totals.snapshot();
  totals.record({ inventoryClone: 2, inventoryScan: NaN, nativeRanking: -1 });
  assert.deepEqual(snapshot, { inventoryClone: 3, notificationPlanning: 0 });
  assert.deepEqual(totals.snapshot(), { inventoryClone: 5, notificationPlanning: 0 });
  totals.reset();
  assert.deepEqual(totals.snapshot(), {});
  assert.deepEqual(snapshot, { inventoryClone: 3, notificationPlanning: 0 });
});
