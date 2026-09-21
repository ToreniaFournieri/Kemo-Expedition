const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const test = require('node:test');
const { buildSync } = require('esbuild');

const bundlePath = '/tmp/bokemo-equipment-sets-test.mjs';
buildSync({
  entryPoints: ['src/game/equipmentSets.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: bundlePath,
});
const modulePromise = import(`${pathToFileURL(bundlePath).href}?${Date.now()}`);

function item(id, enhancement = 0, superRare = 0, category = 'sword') {
  return { id, name: `item-${id}`, category, enhancement, superRare };
}

function character(equipment, mainClassId = 'duelist') {
  return {
    id: 1, name: 'Rita', gender: 'female', raceId: 'lupinian',
    mainClassId, subClassId: mainClassId, predispositionId: 'aggressive',
    lineageId: 'sandstorm', autoEquipmentMode: 2, equipment,
  };
}

function setOf(...items) {
  return { slot: 1, name: 'set', createdAt: 1, equipment: items.map((value, index) => ({ item: value, isLocked: index === 0 })) };
}

function inventoryOf(...items) {
  return items.reduce((inventory, value) => {
    const key = `${value.id}-${value.enhancement}-${value.superRare}`;
    inventory[key] = { item: value, count: (inventory[key]?.count ?? 0) + 1, status: 'owned' };
    return inventory;
  }, {});
}

test('equipment-set availability includes current equipment and enforces slots and aptitude', async () => {
  const { evaluateEquipmentSet } = await modulePromise;
  const sword = item(10, 2);
  const armor = item(20, 0, 0, 'armor');
  const saved = setOf(sword, armor);
  assert.deepEqual(evaluateEquipmentSet(saved, character([sword]), inventoryOf(armor), 2).entries.map((entry) => entry.available), [true, true]);
  const slotLimited = evaluateEquipmentSet(saved, character([sword]), inventoryOf(armor), 1);
  assert.deepEqual(slotLimited.entries.map((entry) => entry.available), [true, false]);
  assert.equal(slotLimited.entries[1].unavailableReason, 'slot_unavailable');
  const wrongAptitude = evaluateEquipmentSet(setOf(sword), character([], 'guardian'), inventoryOf(sword), 2);
  assert.equal(wrongAptitude.allAvailable, false);
  assert.equal(wrongAptitude.entries[0].unavailableReason, 'not_equippable');
});

test('equipment history snapshots use the saved-set availability contract', async () => {
  const { createEquipmentSetSnapshot, evaluateEquipmentSet } = await modulePromise;
  const sword = item(10, 2);
  const snapshot = createEquipmentSetSnapshot([sword, null]);
  assert.equal(evaluateEquipmentSet(snapshot, character([]), inventoryOf(sword), 2).allAvailable, true);
  assert.equal(evaluateEquipmentSet(snapshot, character([], 'guardian'), inventoryOf(sword), 2).allAvailable, false);
  const missing = evaluateEquipmentSet(snapshot, character([]), {}, 2);
  assert.equal(missing.allAvailable, false);
  assert.equal(missing.entries[0].unavailableReason, 'unavailable');
});

test('exact load restores locks and assigns Jewels independently, strongest first', async () => {
  const { applyEquipmentSet } = await modulePromise;
  const armor = item(10, 2, 0, 'armor');
  // A stored Jewel is ignored: Jewels are assigned afresh, from the inventory, every time equipment is set.
  const saved = setOf({ ...armor, jewel: { key: 'fort', rank: 2 } });
  const result = applyEquipmentSet(saved, character([]), inventoryOf(armor), { 'fort:2': 1, 'fort:8': 1 }, 0, 2, 'exact');
  assert.equal(result.character.equipment[0]?.id, armor.id);
  assert.equal(result.character.equipment[0]?.isLocked, true);
  assert.deepEqual(result.character.equipment[0]?.jewel, { key: 'fort', rank: 8 });
  assert.equal(result.jewels['fort:8'] ?? 0, 0);
  assert.equal(result.jewels['fort:2'], 1, 'the weaker Jewel stays in the inventory');
});

test('a stored Jewel never makes an entry unavailable or skipped', async () => {
  const { applyEquipmentSet, evaluateEquipmentSet } = await modulePromise;
  const armor = item(10, 2, 0, 'armor');
  const saved = setOf({ ...armor, jewel: { key: 'fort', rank: 2 } });
  assert.equal(evaluateEquipmentSet(saved, character([]), inventoryOf(armor), 2).allAvailable, true, 'no Jewel is needed for availability');
  const result = applyEquipmentSet(saved, character([]), inventoryOf(armor), {}, 0, 2, 'exact');
  assert.equal(result.character.equipment[0]?.id, armor.id, 'the item is equipped even with no Jewel to assign');
  assert.equal(result.character.equipment[0]?.jewel, null);
});

test('availability counts items only, including copies already worn', async () => {
  const { evaluateEquipmentSet } = await modulePromise;
  const armor = item(10, 2, 0, 'armor');
  const saved = setOf({ ...armor, jewel: { key: 'fort', rank: 2 } }, { ...armor, jewel: { key: 'fort', rank: 2 } });
  assert.deepEqual(evaluateEquipmentSet(saved, character([]), inventoryOf(armor, armor), 2).entries.map((entry) => entry.available), [true, true]);
  assert.deepEqual(evaluateEquipmentSet(saved, character([]), inventoryOf(armor), 2).entries.map((entry) => entry.available), [true, false], 'a second copy is still needed');
  const worn = { ...armor, jewel: { key: 'fort', rank: 2 } };
  assert.equal(evaluateEquipmentSet(setOf(armor), character([worn]), {}, 2).allAvailable, true);
});

test('a Jewel worn before a restore returns to the inventory and is assigned again on validity', async () => {
  const { applyEquipmentSet } = await modulePromise;
  const armor = item(10, 2, 0, 'armor');
  const worn = { ...armor, jewel: { key: 'ward', rank: 3 } };
  const result = applyEquipmentSet(setOf(armor), character([worn]), {}, { 'fort:1': 1 }, 0, 2, 'exact');
  // The worn Jewel is detached first; auto-assignment follows the Jewel Category Mapping (armor takes `fort`).
  assert.deepEqual(result.character.equipment[0]?.jewel, { key: 'fort', rank: 1 });
  assert.equal(result.jewels['ward:3'], 1, 'the detached Jewel is back in the inventory');
});

test('a Jewel the item category does not accept is never assigned', async () => {
  const { applyEquipmentSet } = await modulePromise;
  const armor = item(10, 2, 0, 'armor');
  // Armor accepts fort, ward, and shade only.
  const result = applyEquipmentSet(setOf(armor), character([]), inventoryOf(armor), { 'might:8': 1, 'arcana:8': 1 }, 0, 2, 'exact');
  assert.equal(result.character.equipment[0]?.jewel, null);
  assert.equal(result.jewels['might:8'], 1);
});

test('saved snapshots and saved sets carry no Jewels', async () => {
  const { createEquipmentSetSnapshot, normalizeSavedEquipmentSets } = await modulePromise;
  const armor = { ...item(10, 2, 0, 'armor'), jewel: { key: 'fort', rank: 2 } };
  assert.equal(createEquipmentSetSnapshot([armor]).equipment[0].item.jewel, null);
  const migrated = normalizeSavedEquipmentSets([setOf(armor)]);
  assert.equal(migrated[0].equipment[0].item.jewel, null, 'an older save that stored a Jewel is normalized');
});

test('saved snapshots and exact loads preserve sparse equipment slots', async () => {
  const { applyEquipmentSet, createEquipmentSetSnapshot } = await modulePromise;
  const armor = item(10, 2, 0, 'armor');
  const snapshot = createEquipmentSetSnapshot([null, armor]);
  assert.equal(snapshot.equipment[0].slotIndex, 1);
  const result = applyEquipmentSet(snapshot, character([]), inventoryOf(armor), {}, 0, 2, 'exact');
  assert.equal(result.character.equipment[0], null);
  assert.equal(result.character.equipment[1]?.id, armor.id);
});

test('similar loads assign Jewels the same way as exact loads', async () => {
  const { applyEquipmentSet } = await modulePromise;
  const armor = item(10, 2, 0, 'armor');
  const saved = setOf({ ...armor, jewel: { key: 'fort', rank: 2 } });
  const result = applyEquipmentSet(saved, character([]), inventoryOf(armor), { 'fort:2': 1, 'fort:8': 1 }, 0, 2, 'similar');
  assert.deepEqual(result.character.equipment[0]?.jewel, { key: 'fort', rank: 8 });
});

test('similar load accepts lower enhancement and excludes Super Rare substitution', async () => {
  const { applyEquipmentSet } = await modulePromise;
  const lowerSword = item(10, 2);
  const similar = applyEquipmentSet(setOf(item(10, 4)), character([]), inventoryOf(lowerSword), {}, 0, 2, 'similar');
  assert.equal(similar.character.equipment[0]?.enhancement, 2);
  const excluded = applyEquipmentSet(setOf(item(10, 4, 3)), character([]), inventoryOf(lowerSword), {}, 0, 2, 'similar');
  assert.equal(excluded.character.equipment[0], null);
});

test('saved equipment migration keeps only unique valid slots in the 1-99 range', async () => {
  const { normalizeSavedEquipmentSets } = await modulePromise;
  const saved = setOf(item(10));
  assert.deepEqual(normalizeSavedEquipmentSets([saved, { ...saved, name: 'duplicate' }, { ...saved, slot: 100 }]).map((set) => set.name), ['set']);
});

test('an Undo/Redo state records the Jewel assignment and restores it exactly', async () => {
  const { createEquipmentSetSnapshot, evaluateEquipmentState, applyEquipmentState } = await modulePromise;
  const armor = item(10, 2, 0, 'armor');
  const worn = { ...armor, jewel: { key: 'fort', rank: 2 } };
  const state = createEquipmentSetSnapshot([worn], true);
  assert.deepEqual(state.equipment[0].item.jewel, { key: 'fort', rank: 2 });
  assert.equal(createEquipmentSetSnapshot([worn]).equipment[0].item.jewel, null, 'a saved set still carries no Jewel');
  // After Remove All: the item and the Jewel are both back in their inventories.
  const jewels = { 'fort:2': 1, 'fort:8': 1 };
  assert.equal(evaluateEquipmentState(state, character([]), inventoryOf(armor), jewels, 2).allAvailable, true);
  const restored = applyEquipmentState(state, character([]), inventoryOf(armor), jewels, 0, 2);
  assert.deepEqual(restored.character.equipment[0]?.jewel, { key: 'fort', rank: 2 }, 'the recorded Jewel, not the strongest one');
  assert.equal(restored.jewels['fort:2'] ?? 0, 0);
  assert.equal(restored.jewels['fort:8'], 1, 'no other Jewel is consumed');
});

test('an Undo/Redo state without a Jewel restores without one', async () => {
  const { createEquipmentSetSnapshot, applyEquipmentState } = await modulePromise;
  const armor = item(10, 2, 0, 'armor');
  const restored = applyEquipmentState(createEquipmentSetSnapshot([armor], true), character([]), inventoryOf(armor), { 'fort:8': 1 }, 0, 2);
  assert.equal(restored.character.equipment[0]?.jewel, null, 'no spare Jewel is assigned');
  assert.equal(restored.jewels['fort:8'], 1);
});

test('one unavailable Jewel makes the whole Undo/Redo state unavailable', async () => {
  const { createEquipmentSetSnapshot, evaluateEquipmentState } = await modulePromise;
  const armor = item(10, 2, 0, 'armor');
  const sword = item(11, 0, 0, 'sword');
  const state = createEquipmentSetSnapshot([{ ...armor, jewel: { key: 'fort', rank: 2 } }, sword], true);
  const inventory = inventoryOf(armor, sword);
  const result = evaluateEquipmentState(state, character([]), inventory, { 'fort:3': 1 }, 2);
  assert.equal(result.allAvailable, false);
  assert.deepEqual(result.entries.map((entry) => entry.available), [false, true]);
  // A Jewel the item's category does not accept is never valid.
  const invalid = createEquipmentSetSnapshot([{ ...armor, jewel: { key: 'might', rank: 1 } }], true);
  assert.equal(evaluateEquipmentState(invalid, character([]), inventoryOf(armor), { 'might:1': 1 }, 2).allAvailable, false);
});

test('Jewel availability counts the copies already worn and each Jewel only once', async () => {
  const { createEquipmentSetSnapshot, evaluateEquipmentState } = await modulePromise;
  const armor = item(10, 2, 0, 'armor');
  const wornJewel = { ...armor, jewel: { key: 'fort', rank: 2 } };
  const state = createEquipmentSetSnapshot([wornJewel], true);
  assert.equal(evaluateEquipmentState(state, character([wornJewel]), {}, {}, 2).allAvailable, true, 'the worn copy and its Jewel are available');
  const two = createEquipmentSetSnapshot([wornJewel, { ...armor, jewel: { key: 'fort', rank: 2 } }], true);
  assert.equal(evaluateEquipmentState(two, character([]), inventoryOf(armor, armor), { 'fort:2': 1 }, 2).allAvailable, false, 'two attachments need two Jewels');
});
