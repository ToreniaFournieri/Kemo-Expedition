import { getItemById } from '../data/items';
import { getInstantExpeditionChargeState } from './instantExpedition';
import { ClassId, GameState, InventoryRecord, InventoryVariant, Item, Party, RandomBag, WeightedBagEntry } from '../types';
import { normalizeLanguage } from '../i18n';

type ItemReference = Pick<Item, 'id' | 'enhancement' | 'superRare' | 'jewel' | 'isLocked'>;
type CompactBagEntry = [number, number];

type PersistedBagEntry = WeightedBagEntry | CompactBagEntry;

type PersistedRandomBag = Omit<RandomBag, 'entries'> & {
  entries: PersistedBagEntry[];
};

function toItemReference(item: Item): ItemReference {
  return {
    id: item.id,
    enhancement: item.enhancement,
    superRare: item.superRare,
    isLocked: item.isLocked === true,
    jewel: item.jewel ?? null,
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
      isLocked: item.isLocked === true,
      jewel: item.jewel ?? null,
    };
  }

  return {
    ...baseItem,
    enhancement,
    superRare,
    isLocked: item.isLocked === true,
    jewel: item.jewel ?? null,
    isNew: item.isNew,
  };
}

function compactBagEntries(bag: RandomBag): PersistedRandomBag {
  return {
    ...bag,
    entries: bag.entries.map((entry) => [entry.id, entry.tickets]),
  };
}

function isCompactBagEntry(entry: PersistedBagEntry): entry is CompactBagEntry {
  return Array.isArray(entry)
    && entry.length >= 2
    && typeof entry[0] === 'number'
    && typeof entry[1] === 'number';
}

function hydrateBagEntries(bag: PersistedRandomBag | RandomBag | undefined): RandomBag {
  if (!bag || !Array.isArray(bag.entries)) {
    return { entries: [] };
  }
  return {
    ...bag,
    entries: bag.entries.reduce<WeightedBagEntry[]>((acc, entry) => {
      if (isCompactBagEntry(entry)) {
        acc.push({ id: entry[0], tickets: entry[1] });
        return acc;
      }
      if (entry && typeof entry.id === 'number' && typeof entry.tickets === 'number') {
        acc.push({ id: entry.id, tickets: entry.tickets });
      }
      return acc;
    }, []),
  };
}

function compactBagCollection<T extends object>(bags: T): T {
  const compacted = {} as T;
  for (const bagName of Object.keys(bags) as Array<keyof T>) {
    compacted[bagName] = compactBagEntries(bags[bagName] as RandomBag) as T[keyof T];
  }
  return compacted;
}

function hydrateBagCollection<T extends object>(bags: T): T {
  const hydrated = {} as T;
  for (const bagName of Object.keys(bags) as Array<keyof T>) {
    hydrated[bagName] = hydrateBagEntries(bags[bagName] as RandomBag) as T[keyof T];
  }
  return hydrated;
}

// SpecRef: 5.1.4 | Save and load | Data persistence
// SpecRef: 8.3 | UI_EXPEDITION | Charge
function normalizePartyInstantExpeditionCharge<
  T extends Pick<Party, 'instantExpeditionStock' | 'instantExpeditionChargeStartedAt'> & Partial<Pick<Party, 'defeatedBossExpeditions'>>
>(party: T): T & { instantExpeditionStock: number; instantExpeditionChargeStartedAt: number | null } {
  const instantChargeState = getInstantExpeditionChargeState(party);
  return {
    ...party,
    instantExpeditionStock: instantChargeState.stock,
    instantExpeditionChargeStartedAt: instantChargeState.chargeStartedAt,
  };
}

function migrateObsoleteClassId(classId: string): ClassId {
  if (classId === 'fighter') return 'guardian';
  if (classId === 'rogue') return 'ninja';
  return classId as ClassId;
}

// SpecRef: 9 | Environment | serializeGameState
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
    bags: compactBagCollection(state.bags),
    global: {
      ...state.global,
      inventory: compactInventory,
    },
    parties: state.parties.map((party) => {
      const normalizedParty = normalizePartyInstantExpeditionCharge(party);
      const partyBags = normalizedParty.bags ?? state.bags;
      return {
        ...normalizedParty,
        bags: compactBagCollection(partyBags),
        sleepinessOfPartyBag: compactBagEntries(party.sleepinessOfPartyBag) as RandomBag,
        characters: party.characters.map((character) => ({
          ...character,
          equipment: character.equipment.map((item) => (item ? (toItemReference(item) as Item) : null)),
        })),
      };
    }),
  };
}

// SpecRef: 9 | Environment | hydrateGameState
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
    bags: hydrateBagCollection(state.bags),
    global: {
      ...state.global,
      inventory: hydratedInventory,
      language: normalizeLanguage(state.global.language),
    },
    parties: state.parties.map((party) => {
      const normalizedParty = normalizePartyInstantExpeditionCharge(party);
      const partyBags = normalizedParty.bags ?? state.bags;
      return {
        ...normalizedParty,
        bags: hydrateBagCollection(partyBags),
        sleepinessOfPartyBag: hydrateBagEntries(party.sleepinessOfPartyBag),
        characters: party.characters.map((character) => ({
          ...character,
          mainClassId: migrateObsoleteClassId(character.mainClassId as string),
          subClassId: migrateObsoleteClassId(character.subClassId as string),
          equipment: character.equipment.map((item) => (item ? hydrateItem(item) : null)),
        })),
      };
    }),
  };
}
