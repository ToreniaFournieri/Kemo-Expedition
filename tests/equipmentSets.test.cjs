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
  assert.deepEqual(evaluateEquipmentSet(saved, character([sword]), inventoryOf(armor), 1).entries.map((entry) => entry.available), [true, false]);
  assert.equal(evaluateEquipmentSet(setOf(sword), character([], 'guardian'), inventoryOf(sword), 2).allAvailable, false);
});

test('exact load restores locks and assigns jewels independently through auto-equipment logic', async () => {
  const { applyEquipmentSet } = await modulePromise;
  const sword = item(10, 2);
  const saved = setOf({ ...sword, jewel: { key: 'ward', rank: 1 } });
  const result = applyEquipmentSet(saved, character([]), inventoryOf(sword), { 'might:8': 1 }, 0, 2, 'exact');
  assert.equal(result.character.equipment[0]?.id, sword.id);
  assert.equal(result.character.equipment[0]?.isLocked, true);
  assert.deepEqual(result.character.equipment[0]?.jewel, { key: 'might', rank: 8 });
  assert.equal(result.jewels['might:8'] ?? 0, 0);
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
