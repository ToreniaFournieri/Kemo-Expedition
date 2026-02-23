import { getItemById } from '../data/items';
import { ExpeditionLog, ExpeditionLogEntry, GameState, InventoryRecord, InventoryVariant, Item } from '../types';

const MAX_PERSISTED_BATTLE_LOGS_PER_ROOM = 100;
const MAX_PRESERVED_DIARY_LOGS = 10;

type ItemReference = Pick<Item, 'id' | 'enhancement' | 'superRare'>;

function toItemReference(item: Item): ItemReference {
  return {
    id: item.id,
    enhancement: item.enhancement,
    superRare: item.superRare,
  };
}

function parseVariantKey(key: string): Partial<Pick<Item, 'enhancement' | 'superRare'>> {
  const [, enhancement, superRare] = key.split('-').map(Number);
  return {
    enhancement: Number.isFinite(enhancement) ? enhancement : undefined,
    superRare: Number.isFinite(superRare) ? superRare : undefined,
  };
}

function hydrateItem(item: Partial<Item>, keyHint?: string): Item {
  const baseItem = typeof item.id === 'number' ? getItemById(item.id) : null;
  const keyValues = keyHint ? parseVariantKey(keyHint) : {};
  const enhancement = item.enhancement ?? keyValues.enhancement ?? 0;
  const superRare = item.superRare ?? keyValues.superRare ?? 0;

  if (!baseItem) {
    return {
      ...(item as Item),
      enhancement,
      superRare,
    };
  }

  return {
    ...baseItem,
    enhancement,
    superRare,
    isNew: item.isNew,
  };
}

function trimBattleLogEntries(entry: ExpeditionLogEntry): ExpeditionLogEntry {
  if (!Array.isArray(entry.details) || entry.details.length <= MAX_PERSISTED_BATTLE_LOGS_PER_ROOM) {
    return entry;
  }

  return {
    ...entry,
    details: entry.details.slice(-MAX_PERSISTED_BATTLE_LOGS_PER_ROOM),
  };
}

function trimExpeditionLog(log: ExpeditionLog): ExpeditionLog {
  return {
    ...log,
    entries: log.entries.map(trimBattleLogEntries),
  };
}

export function serializeGameState(state: GameState): GameState {
  const compactInventory = Object.entries(state.global.inventory).reduce<InventoryRecord>((acc, [key, variant]) => {
    acc[key] = {
      ...variant,
      item: toItemReference(variant.item) as Item,
    };
    return acc;
  }, {});

  return {
    ...state,
    global: {
      ...state.global,
      inventory: compactInventory,
    },
    parties: state.parties.map((party) => ({
      ...party,
      lastExpeditionLog: party.lastExpeditionLog ? trimExpeditionLog(party.lastExpeditionLog) : null,
      diaryLogs: party.diaryLogs.slice(0, MAX_PRESERVED_DIARY_LOGS),
      characters: party.characters.map((character) => ({
        ...character,
        equipment: character.equipment.map((item) => (item ? (toItemReference(item) as Item) : null)),
      })),
    })),
  };
}

export function hydrateGameState(state: GameState): GameState {
  const hydratedInventory = Object.entries(state.global.inventory).reduce<InventoryRecord>((acc, [key, variant]) => {
    const resolvedVariant: InventoryVariant = {
      ...variant,
      item: hydrateItem((variant.item ?? {}) as Partial<Item>, key),
    };
    acc[key] = resolvedVariant;
    return acc;
  }, {});

  return {
    ...state,
    global: {
      ...state.global,
      inventory: hydratedInventory,
    },
    parties: state.parties.map((party) => ({
      ...party,
      lastExpeditionLog: party.lastExpeditionLog ? trimExpeditionLog(party.lastExpeditionLog) : null,
      diaryLogs: party.diaryLogs.slice(0, MAX_PRESERVED_DIARY_LOGS),
      characters: party.characters.map((character) => ({
        ...character,
        equipment: character.equipment.map((item) => (item ? hydrateItem(item) : null)),
      })),
    })),
  };
}
