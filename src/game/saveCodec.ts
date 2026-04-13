import { getItemById } from '../data/items';
import { ClassId, GameState, InventoryRecord, InventoryVariant, Item, RandomBag, WeightedBagEntry } from '../types';

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
    bags: {
      commonRewardBag: compactBagEntries(state.bags.commonRewardBag) as RandomBag,
      commonEnhancementBag: compactBagEntries(state.bags.commonEnhancementBag) as RandomBag,
      uncommonRewardBag: compactBagEntries(state.bags.uncommonRewardBag) as RandomBag,
      eliteRareRewardBag: compactBagEntries(state.bags.eliteRareRewardBag) as RandomBag,
      bossRareRewardBag: compactBagEntries(state.bags.bossRareRewardBag) as RandomBag,
      mythicRareRewardBag: compactBagEntries(state.bags.mythicRareRewardBag) as RandomBag,
      enhancementBag: compactBagEntries(state.bags.enhancementBag) as RandomBag,
      superRareBag: compactBagEntries(state.bags.superRareBag) as RandomBag,
      commonSuperRareBag: compactBagEntries(state.bags.commonSuperRareBag) as RandomBag,
      rareSuperRareBag: compactBagEntries(state.bags.rareSuperRareBag) as RandomBag,
      physicalThreatBag: compactBagEntries(state.bags.physicalThreatBag) as RandomBag,
      magicalThreatBag: compactBagEntries(state.bags.magicalThreatBag) as RandomBag,
      sideQuestBag: compactBagEntries(state.bags.sideQuestBag) as RandomBag,
    },
    global: {
      ...state.global,
      inventory: compactInventory,
    },
    parties: state.parties.map((party) => ({
      ...party,
      sleepinessOfPartyBag: compactBagEntries(party.sleepinessOfPartyBag) as RandomBag,
      characters: party.characters.map((character) => ({
        ...character,
        equipment: character.equipment.map((item) => (item ? (toItemReference(item) as Item) : null)),
      })),
    })),
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
    bags: {
      commonRewardBag: hydrateBagEntries(state.bags.commonRewardBag),
      commonEnhancementBag: hydrateBagEntries(state.bags.commonEnhancementBag),
      uncommonRewardBag: hydrateBagEntries(state.bags.uncommonRewardBag),
      eliteRareRewardBag: hydrateBagEntries(state.bags.eliteRareRewardBag),
      bossRareRewardBag: hydrateBagEntries(state.bags.bossRareRewardBag),
      mythicRareRewardBag: hydrateBagEntries(state.bags.mythicRareRewardBag),
      enhancementBag: hydrateBagEntries(state.bags.enhancementBag),
      superRareBag: hydrateBagEntries(state.bags.superRareBag),
      commonSuperRareBag: hydrateBagEntries(state.bags.commonSuperRareBag),
      rareSuperRareBag: hydrateBagEntries(state.bags.rareSuperRareBag),
      physicalThreatBag: hydrateBagEntries(state.bags.physicalThreatBag),
      magicalThreatBag: hydrateBagEntries(state.bags.magicalThreatBag),
      sideQuestBag: hydrateBagEntries(state.bags.sideQuestBag),
    },
    global: {
      ...state.global,
      inventory: hydratedInventory,
    },
    parties: state.parties.map((party) => ({
      ...party,
      sleepinessOfPartyBag: hydrateBagEntries(party.sleepinessOfPartyBag),
      characters: party.characters.map((character) => ({
        ...character,
        mainClassId: migrateObsoleteClassId(character.mainClassId as string),
        subClassId: migrateObsoleteClassId(character.subClassId as string),
        equipment: character.equipment.map((item) => (item ? hydrateItem(item) : null)),
      })),
    })),
  };
}
