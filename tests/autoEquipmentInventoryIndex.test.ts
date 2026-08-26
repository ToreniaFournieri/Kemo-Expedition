import assert from 'node:assert/strict';
import test from 'node:test';
import { AutoEquipmentInventoryIndex } from '../src/game/autoEquipmentInventoryIndex.ts';
import type { InventoryRecord, InventoryVariant, ItemCategory } from '../src/types/index.ts';

function variant(id: number, category: ItemCategory): InventoryVariant {
  return {
    item: { id, category, name: `${category}-${id}`, enhancement: 0, superRare: 0 },
    count: 1,
    status: 'owned',
  };
}

test('automatic-equipment inventory index preserves global order across category merges', () => {
  const inventory: InventoryRecord = {
    '100-0-0': variant(100, 'arrow'),
    '200-0-0': variant(200, 'sword'),
    '300-0-0': variant(300, 'bolt'),
    '400-0-0': variant(400, 'arrow'),
  };
  const index = new AutoEquipmentInventoryIndex(inventory);

  assert.deepEqual(index.keysForCategories(['arrow', 'bolt']), ['100-0-0', '300-0-0', '400-0-0']);
  assert.deepEqual(index.keysForItemId(200), ['200-0-0']);
});

test('automatic-equipment inventory index mirrors delete-and-reinsert order', () => {
  const first = variant(100, 'arrow');
  const second = variant(200, 'bolt');
  const inventory: InventoryRecord = { '100-0-0': first, '200-0-0': second };
  const index = new AutoEquipmentInventoryIndex(inventory);

  index.remove('100-0-0', first);
  index.addIfAbsent('100-0-0', first);

  assert.deepEqual(index.keysForCategories(['arrow', 'bolt']), ['200-0-0', '100-0-0']);
});
