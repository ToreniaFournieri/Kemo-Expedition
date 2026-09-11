const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const test = require('node:test');
const { buildSync } = require('esbuild');

const bundlePath = '/tmp/bokemo-equipment-history-test.mjs';
buildSync({ entryPoints: ['src/game/equipmentHistory.ts'], bundle: true, platform: 'node', format: 'esm', outfile: bundlePath });
const modulePromise = import(`${pathToFileURL(bundlePath).href}?${Date.now()}`);

function state(index) {
  return { slot: 0, name: String(index), createdAt: index, equipment: [] };
}

test('equipment history restores and reapplies up to thirty states in LIFO order', async () => {
  const { EMPTY_EQUIPMENT_STATE_HISTORY, recordEquipmentState, undoEquipmentState, redoEquipmentState } = await modulePromise;
  let history = EMPTY_EQUIPMENT_STATE_HISTORY;
  for (let index = 1; index <= 31; index += 1) history = recordEquipmentState(history, state(index));
  assert.equal(history.undo.length, 30);
  assert.equal(history.undo[0].name, '2');

  let current = state(32);
  for (let index = 31; index >= 2; index -= 1) {
    const transition = undoEquipmentState(history, current);
    assert.equal(transition?.target.name, String(index));
    current = transition.target;
    history = transition.history;
  }
  assert.equal(history.undo.length, 0);
  assert.equal(history.redo.length, 30);

  for (let index = 2; index <= 31; index += 1) {
    const transition = redoEquipmentState(history, current);
    assert.equal(transition?.target.name, String(index + 1));
    current = transition.target;
    history = transition.history;
  }
  assert.equal(history.redo.length, 0);
  assert.equal(history.undo.length, 30);
});

test('a new equipment state clears the redo branch', async () => {
  const { recordEquipmentState, undoEquipmentState } = await modulePromise;
  let history = recordEquipmentState({ undo: [], redo: [] }, state(1));
  history = undoEquipmentState(history, state(2)).history;
  assert.equal(history.redo.length, 1);
  assert.deepEqual(recordEquipmentState(history, state(3)).redo, []);
});
