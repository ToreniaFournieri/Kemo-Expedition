import {
  getVariantKey,
  type InventoryRecord,
  type Item,
} from '../types/index.ts';

/** Convert the pre-record inventory array while preserving its historical fold order. */
export function migrateLegacyInventory(inventory: readonly Item[] | InventoryRecord): InventoryRecord {
  if (!Array.isArray(inventory)) return inventory as InventoryRecord;

  const migrated: InventoryRecord = {};
  for (const item of inventory) {
    const key = getVariantKey(item);
    const existing = migrated[key];
    if (existing) {
      existing.count += 1;
      continue;
    }
    migrated[key] = {
      item: { ...item, isNew: undefined },
      count: 1,
      status: 'owned',
      isNew: item.isNew,
    };
  }
  return migrated;
}
