import assert from 'node:assert/strict';
import test from 'node:test';
import { hasNewAvailability } from '../src/game/inventoryAvailability.ts';

test('availability revisions track new positive counts, not quantity increases or exhaustion', () => {
  for (const wrap of [(count: number) => count, (count: number) => ({ count })]) {
    assert.equal(hasNewAvailability({}, { item: wrap(1) }), true);
    assert.equal(hasNewAvailability({ item: wrap(0) }, { item: wrap(2) }), true);
    assert.equal(hasNewAvailability({ item: wrap(1) }, { item: wrap(2) }), false);
    assert.equal(hasNewAvailability({ item: wrap(1) }, { item: wrap(0) }), false);
    assert.equal(hasNewAvailability({ item: wrap(1) }, {}), false);
    assert.equal(hasNewAvailability({}, { item: wrap(0) }), false);
  }
  assert.equal(hasNewAvailability(undefined, undefined), false);
  assert.equal(hasNewAvailability(undefined, { jewel: 1 }), true);
});

test('unchanged inventory and Jewel records are never enumerated', () => {
  const shared = new Proxy({}, {
    ownKeys() { throw new Error('Inventory-neutral action enumerated shared inventory'); },
  });
  assert.equal(hasNewAvailability(shared, shared), false);
});

test('distinct snapshots detect availability even when an existing item is unchanged', () => {
  const existing = { count: 4 };
  assert.equal(hasNewAvailability({ old: existing }, { old: existing, new: { count: 1 } }), true);
});

test('committed delta checks read only touched keys without enumerating the inventory', () => {
  const previous = { unchanged: { count: 5 }, added: { count: 0 } };
  const next = new Proxy({ ...previous, added: { count: 1 } }, {
    ownKeys() { throw new Error('Delta check enumerated the entire inventory'); },
  });
  assert.equal(hasNewAvailability(previous, next, ['added']), true);
  assert.equal(hasNewAvailability(previous, next, ['unchanged']), false);
  assert.equal(hasNewAvailability(previous, next, []), false);
});
