import type { Item, JewelKey } from '../../types/index.ts';
import type { EquippedItemProjection, InventoryProjection } from './baseView.ts';
import { parseItemFormat } from './itemFormat.ts';

// SpecRef: 8.4.2 | Inventory(所持品)
// The renderer-side view of the Base projection's inventory facts: items rebuilt from their Item Format and master data, so the
// pane holds no game state.

export interface InventoryVariantView {
  variantKey: string;
  /** The Item Format the commands (`sellInventoryItems`, `unlockSoldItems`) identify this variant by. */
  format: string;
  item: Item;
  count: number;
  isNew: boolean;
  sale: { gold: number; prana: number } | null;
}

export interface WornItemView {
  key: string;
  item: Item;
  partyNumber: number;
  member: number;
  slotIndex: number;
  owner: EquippedItemProjection['owner'];
  /** A slot beyond the character's slot count keeps its item, but its Jewel is not counted. */
  active: boolean;
  jewel: { key: JewelKey; rank: number } | null;
}

export interface InventoryView {
  owned: InventoryVariantView[];
  sold: InventoryVariantView[];
  jewels: { jewelKey: JewelKey; rank: number; count: number }[];
  worn: WornItemView[];
  jewelPriorityParty: number | null;
  /** The variants currently highlighted as new; acknowledging them is `markItemsAsSeen`. */
  newVariantKeys: string[];
}

export function buildInventoryView(projection: InventoryProjection): InventoryView {
  const variants = projection.inventory.flatMap((entry) => {
    const item = parseItemFormat(entry.item);
    return item ? [{ entry, view: { variantKey: entry.variantKey, format: entry.item, item, count: entry.quantity, isNew: entry.isNew, sale: entry.sale } satisfies InventoryVariantView }] : [];
  });
  return {
    owned: variants.filter(({ entry }) => entry.status === 'owned' && entry.quantity > 0).map(({ view }) => view),
    sold: variants.filter(({ entry }) => entry.status === 'sold').map(({ view }) => view),
    jewels: projection.jewels.map((jewel) => ({ jewelKey: jewel.jewelKey as JewelKey, rank: jewel.rank, count: jewel.quantity })),
    worn: projection.equippedItems.flatMap((entry) => {
      const item = parseItemFormat(entry.item);
      if (!item) return [];
      const [jewelKey, jewelRank] = entry.jewel ? entry.jewel.split(':') : [];
      const jewel = jewelKey ? { key: jewelKey as JewelKey, rank: Number(jewelRank) } : null;
      return [{
        key: `${entry.partyNumber}-${entry.characterId}-${entry.slotIndex}-${entry.item}-${entry.jewel ?? ''}`,
        item: jewel ? { ...item, jewel } : item,
        partyNumber: entry.partyNumber,
        member: entry.member,
        slotIndex: entry.slotIndex,
        owner: entry.owner,
        active: entry.active,
        jewel,
      }];
    }),
    jewelPriorityParty: projection.jewelPriorityParty === 'none' ? null : projection.jewelPriorityParty,
    newVariantKeys: projection.inventory.filter((entry) => entry.isNew).map((entry) => entry.variantKey),
  };
}
