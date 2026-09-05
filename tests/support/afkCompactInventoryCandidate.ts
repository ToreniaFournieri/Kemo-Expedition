import { getItemById } from '../../src/data/items.ts';
import {
  createAfkPartyChunkWorkerState,
  type AfkInventoryDelta,
} from '../../src/game/afkChunkCoordinator.ts';
import type { GameState, InventoryRecord } from '../../src/types/index.ts';

function compactItem(item: InventoryRecord[string]['item']): InventoryRecord[string]['item'] {
  return {
    id: item.id,
    enhancement: item.enhancement,
    superRare: item.superRare,
    ...(Object.prototype.hasOwnProperty.call(item, 'isLocked') ? { isLocked: item.isLocked } : {}),
    ...(Object.prototype.hasOwnProperty.call(item, 'jewel') ? { jewel: item.jewel } : {}),
    ...(Object.prototype.hasOwnProperty.call(item, 'isNew') ? { isNew: item.isNew } : {}),
  } as InventoryRecord[string]['item'];
}

function materializeVariant(variant: InventoryRecord[string]): InventoryRecord[string] {
  const item = variant.item;
  if ('name' in item && 'category' in item) return variant;
  const baseItem = getItemById(item.id);
  if (!baseItem) return variant;
  return {
    ...variant,
    item: {
      ...baseItem,
      enhancement: item.enhancement,
      superRare: item.superRare,
      ...(Object.prototype.hasOwnProperty.call(item, 'isLocked') ? { isLocked: item.isLocked } : {}),
      ...(Object.prototype.hasOwnProperty.call(item, 'jewel') ? { jewel: item.jewel } : {}),
      ...(Object.prototype.hasOwnProperty.call(item, 'isNew') ? { isNew: item.isNew } : {}),
    },
  };
}

export function createAfkCompactInventoryCandidateState(
  state: GameState,
  partyIndex: number,
  historyStrategy: 'full' | 'placeholders' = 'placeholders',
): GameState {
  const workerState = createAfkPartyChunkWorkerState(state, partyIndex, historyStrategy);
  return {
    ...workerState,
    global: {
      ...workerState.global,
      inventory: Object.fromEntries(Object.entries(workerState.global.inventory).map(([key, variant]) => [key, {
        ...variant,
        item: compactItem(variant.item),
      }])) as InventoryRecord,
    },
  };
}

export function materializeAfkCompactInventoryCandidateDelta(delta: AfkInventoryDelta): AfkInventoryDelta {
  return Object.fromEntries(Object.entries(delta).map(([key, entry]) => [key, {
    ...entry,
    variant: materializeVariant(entry.variant),
  }])) as AfkInventoryDelta;
}
