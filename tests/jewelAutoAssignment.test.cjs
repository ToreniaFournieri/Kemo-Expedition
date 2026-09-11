const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const test = require('node:test');
const { buildSync } = require('esbuild');

const bundlePath = '/tmp/bokemo-jewel-auto-assignment-test.mjs';
buildSync({
  entryPoints: ['src/game/jewel.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: bundlePath,
});
const modulePromise = import(`${pathToFileURL(bundlePath).href}?${Date.now()}`);

function character(equipment) {
  return { id: 5, name: 'Rabimeru', equipment };
}

function wand(rank) {
  return {
    id: 1,
    category: 'wand',
    jewel: rank == null ? null : { key: 'arcana', rank },
  };
}

function applyAssignments(target, jewels, assignments) {
  const nextCharacter = structuredClone(target);
  const nextJewels = { ...jewels };
  assignments.forEach(({ slotIndex, key, rank }) => {
    const item = nextCharacter.equipment[slotIndex];
    const nextKey = `${key}:${rank}`;
    nextJewels[nextKey] -= 1;
    if (nextJewels[nextKey] === 0) delete nextJewels[nextKey];
    if (item.jewel) {
      const previousKey = `${item.jewel.key}:${item.jewel.rank}`;
      nextJewels[previousKey] = (nextJewels[previousKey] ?? 0) + 1;
    }
    item.jewel = { key, rank };
  });
  return { character: nextCharacter, jewels: nextJewels };
}

test('pooled auto-jewel allocation retains an equipped rank 8 and is idempotent', async () => {
  const { planAutoJewelAssignmentsForCharacter } = await modulePromise;
  const original = character([wand(8), wand(5)]);
  const jewels = { 'arcana:8': 1, 'arcana:7': 1 };

  const first = planAutoJewelAssignmentsForCharacter(original, jewels);
  assert.deepEqual(first, [{ slotIndex: 1, key: 'arcana', rank: 7 }]);

  const afterFirst = applyAssignments(original, jewels, first);
  assert.equal(afterFirst.character.equipment[0].jewel.rank, 8);
  assert.equal(afterFirst.character.equipment[1].jewel.rank, 7);
  assert.deepEqual(planAutoJewelAssignmentsForCharacter(afterFirst.character, afterFirst.jewels), []);
});

test('pooled allocation can move an equipped jewel through the detach-then-attach commit', async () => {
  const { planAutoJewelAssignmentsForCharacter } = await modulePromise;
  const original = character([wand(5), wand(8)]);
  const jewels = { 'arcana:7': 1 };

  assert.deepEqual(planAutoJewelAssignmentsForCharacter(original, jewels), [
    { slotIndex: 0, key: 'arcana', rank: 8 },
    { slotIndex: 1, key: 'arcana', rank: 7 },
  ]);
});
