import { getItemById } from '../../data/items';
import { getVariantKey, type InventoryRecord, type Item, type JewelAttachment, type JewelKey, type SavedEquipmentEntry, type SavedEquipmentSet } from '../../types';

// SpecRef: 9.1.3 | Item Format | `<lockStatus>/<itemId>/<enhancement>/<superRare>`
// SpecRef: 9.1.3 | 2-3-3 read/build/character/{characterId}/equipment | `<slotIndex>/<Item Format>[/<jewelType>:<jewelRank>]`
// The single definition of the compact item and equipment-entry wire formats. Read models format with it and UI
// adapters parse with it, so a projection carries exactly the facts needed to rebuild a display item from master data.

type ItemFacts = Pick<Item, 'id' | 'enhancement' | 'superRare'>;

export function formatItem(item: ItemFacts, isLocked: boolean): string {
  return `${isLocked ? 1 : 0}/${item.id}/${item.enhancement}/${item.superRare}`;
}

export function formatEquipmentEntry(slotIndex: number, item: ItemFacts, isLocked: boolean, jewel?: JewelAttachment | null): string {
  return `${slotIndex}/${formatItem(item, isLocked)}${jewel ? `/${jewel.key}:${jewel.rank}` : ''}`;
}

const JEWEL_KEYS: readonly string[] = ['might', 'arcana', 'fort', 'ward', 'shade', 'focus'];
const ENTRY = /^(\d+)\/([01])\/(\d+)\/([0-6])\/(\d+)(?:\/([a-z]+):([1-8]))?$/;

export interface ParsedEquipmentEntry { slotIndex: number; item: Item; isLocked: boolean }

/** Rebuilds the display item for an equipment entry from master data; `null` for an empty slot (`0`) or a bad entry. */
/** An empty slot is the string `0` (Spec 9.1.3, Item Format). */
export function parseEquipmentEntry(entry: string): ParsedEquipmentEntry | null {
  if (entry === '0') return null;
  const match = ENTRY.exec(entry);
  if (!match) return null;
  const [, slot, lock, itemId, enhancement, superRare, jewelKey, jewelRank] = match;
  const definition = getItemById(Number(itemId));
  if (!definition || (jewelKey !== undefined && !JEWEL_KEYS.includes(jewelKey))) return null;
  const isLocked = lock === '1';
  return {
    slotIndex: Number(slot),
    isLocked,
    item: {
      ...definition,
      enhancement: Number(enhancement),
      superRare: Number(superRare),
      isLocked,
      jewel: jewelKey !== undefined ? { key: jewelKey as JewelKey, rank: Number(jewelRank) } : null,
    },
  };
}

/** Rebuilds a display item from `Item Format` (`<lockStatus>/<itemId>/<enhancement>/<superRare>`, no Jewel); `null` for `0` or a bad entry. */
export function parseItemFormat(value: string): Item | null {
  const match = /^([01])\/(\d+)\/([0-6])\/(\d+)$/.exec(value);
  if (!match) return null;
  const definition = getItemById(Number(match[2]));
  if (!definition) return null;
  return { ...definition, enhancement: Number(match[3]), superRare: Number(match[4]), isLocked: match[1] === '1', jewel: null };
}

/** Rebuilds an evaluation target from `<Item Format>/<jewelType>:<jewelRank>`; `null` for a malformed or unknown value. */
export function parseEvaluatedItemFormat(value: string): Item | null {
  const match = /^([01])\/(\d+)\/([0-6])\/(\d+)\/([a-z]+):([1-8])$/.exec(value);
  if (!match || !JEWEL_KEYS.includes(match[5])) return null;
  const definition = getItemById(Number(match[2]));
  if (!definition) return null;
  return {
    ...definition,
    enhancement: Number(match[3]),
    superRare: Number(match[4]),
    isLocked: match[1] === '1',
    jewel: { key: match[5] as JewelKey, rank: Number(match[6]) },
  };
}

/** Rebuilds a saved equipment set from its projection (`equipmentSet` read with detail). */
export function parseSavedEquipmentSet(projection: { equipmentSetId: number; equipmentSet: { name: string; createdAt: string; equipment?: string[] } }): SavedEquipmentSet {
  const entries: SavedEquipmentEntry[] = (projection.equipmentSet.equipment ?? []).flatMap((entry) => {
    const parsed = parseEquipmentEntry(entry);
    return parsed ? [{ slotIndex: parsed.slotIndex, item: parsed.item, isLocked: parsed.isLocked }] : [];
  });
  return { slot: projection.equipmentSetId, name: projection.equipmentSet.name, createdAt: Date.parse(projection.equipmentSet.createdAt), equipment: entries };
}

// `<Item Format>/<quantity>/<calculatedBasePower>`; the power is derived data, so the rebuilt item ignores it.
const ITEM_STACK = /^([01])\/(\d+)\/([0-6])\/(\d+)\/(\d+)\/-?\d+(?:\.\d+)?$/;
const JEWEL_STACK = /^([a-z]+):([1-8])\/(\d+)$/;

/** Rebuilds the owned inventory from `searchItems` stacks (`details: none`); unknown items are skipped. */
export function parseInventoryStacks(stacks: readonly string[]): InventoryRecord {
  const inventory: InventoryRecord = {};
  for (const stack of stacks) {
    const match = ITEM_STACK.exec(stack);
    if (!match) continue;
    const definition = getItemById(Number(match[2]));
    if (!definition) continue;
    const item: Item = { ...definition, enhancement: Number(match[3]), superRare: Number(match[4]), isLocked: match[1] === '1', jewel: null };
    const key = getVariantKey(item);
    inventory[key] = { item, count: (inventory[key]?.count ?? 0) + Number(match[5]), status: 'owned' };
  }
  return inventory;
}

/** Rebuilds the Jewel counts from the `jewel` category stacks (`<jewelType>:<jewelRank>/<quantity>`). */
export function parseJewelStacks(stacks: readonly string[]): Record<string, number> {
  const jewels: Record<string, number> = {};
  for (const stack of stacks) {
    const match = JEWEL_STACK.exec(stack);
    if (!match || !JEWEL_KEYS.includes(match[1])) continue;
    jewels[`${match[1]}:${match[2]}`] = (jewels[`${match[1]}:${match[2]}`] ?? 0) + Number(match[3]);
  }
  return jewels;
}
