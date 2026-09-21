import { getItemById } from '../../data/items';
import type { Item, JewelAttachment, JewelKey, SavedEquipmentEntry, SavedEquipmentSet } from '../../types';

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
export function parseEquipmentEntry(entry: string | 0): ParsedEquipmentEntry | null {
  if (entry === 0) return null;
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

/** Rebuilds a saved equipment set from its projection (`equipmentSet` read with detail). */
export function parseSavedEquipmentSet(projection: { equipmentSetId: number; equipmentSet: { name: string; createdAt: string; equipment?: string[] } }): SavedEquipmentSet {
  const entries: SavedEquipmentEntry[] = (projection.equipmentSet.equipment ?? []).flatMap((entry) => {
    const parsed = parseEquipmentEntry(entry);
    return parsed ? [{ slotIndex: parsed.slotIndex, item: parsed.item, isLocked: parsed.isLocked }] : [];
  });
  return { slot: projection.equipmentSetId, name: projection.equipmentSet.name, createdAt: Date.parse(projection.equipmentSet.createdAt), equipment: entries };
}
