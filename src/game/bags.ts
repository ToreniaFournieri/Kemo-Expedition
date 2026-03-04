import { GameBags, RandomBag, WeightedBagEntry } from '../types';
import { ENHANCEMENT_TITLES, SUPER_RARE_TITLES } from '../data/items';

function cloneEntries(entries: WeightedBagEntry[]): WeightedBagEntry[] {
  return entries.map((entry) => ({ ...entry }));
}

function createBagFromEntries(entries: WeightedBagEntry[]): RandomBag {
  return { entries: sortEntriesStable(cloneEntries(entries)) };
}

const COMMON_REWARD_BAG_DEFAULT: WeightedBagEntry[] = [
  { id: 0, tickets: 90 },
  { id: 1, tickets: 10 },
];

const COMMON_ENHANCEMENT_BAG_DEFAULT: WeightedBagEntry[] = ENHANCEMENT_TITLES.map((title) => ({
  id: title.value,
  tickets: title.tickets,
}));

const UNCOMMON_REWARD_BAG_DEFAULT: WeightedBagEntry[] = [
  { id: 0, tickets: 99 },
  { id: 1, tickets: 1 },
];

const ELITE_RARE_REWARD_BAG_DEFAULT: WeightedBagEntry[] = [
  { id: 0, tickets: 99 },
  { id: 1, tickets: 1 },
];

const BOSS_RARE_REWARD_BAG_DEFAULT: WeightedBagEntry[] = [
  { id: 0, tickets: 99 },
  { id: 1, tickets: 1 },
];

const MYTHIC_RARE_REWARD_BAG_DEFAULT: WeightedBagEntry[] = [
  { id: 0, tickets: 49 },
  { id: 1, tickets: 1 },
];

const ENHANCEMENT_BAG_DEFAULT: WeightedBagEntry[] = ENHANCEMENT_TITLES.map((title) => ({
  id: title.value,
  tickets: title.value === 0 ? 5490 : title.tickets,
}));

const SUPER_RARE_BAG_DEFAULT: WeightedBagEntry[] = SUPER_RARE_TITLES.map((title) => ({
  id: title.value,
  tickets: title.tickets,
}));

const PHYSICAL_THREAT_WEIGHT_BAG_DEFAULT: WeightedBagEntry[] = [
  { id: 1, tickets: 16 },
  { id: 2, tickets: 8 },
  { id: 3, tickets: 4 },
  { id: 4, tickets: 2 },
  { id: 5, tickets: 1 },
  { id: 6, tickets: 1 },
];

const MAGICAL_THREAT_WEIGHT_BAG_DEFAULT: WeightedBagEntry[] = [
  { id: 1, tickets: 2 },
  { id: 2, tickets: 2 },
  { id: 3, tickets: 2 },
  { id: 4, tickets: 2 },
  { id: 5, tickets: 2 },
  { id: 6, tickets: 2 },
];

const SIDE_QUEST_BAG_DEFAULT: WeightedBagEntry[] = [
  { id: 0, tickets: 99 * 12 },
  ...Array.from({ length: 12 }, (_, i) => ({ id: i + 1, tickets: 1 })),
];

const BAG_DEFAULT_CREATORS = {
  commonRewardBag: () => createBagFromEntries(COMMON_REWARD_BAG_DEFAULT),
  commonEnhancementBag: () => createBagFromEntries(COMMON_ENHANCEMENT_BAG_DEFAULT),
  uncommonRewardBag: () => createBagFromEntries(UNCOMMON_REWARD_BAG_DEFAULT),
  eliteRareRewardBag: () => createBagFromEntries(ELITE_RARE_REWARD_BAG_DEFAULT),
  bossRareRewardBag: () => createBagFromEntries(BOSS_RARE_REWARD_BAG_DEFAULT),
  mythicRareRewardBag: () => createBagFromEntries(MYTHIC_RARE_REWARD_BAG_DEFAULT),
  enhancementBag: () => createBagFromEntries(ENHANCEMENT_BAG_DEFAULT),
  superRareBag: () => createBagFromEntries(SUPER_RARE_BAG_DEFAULT),
  physicalThreatBag: () => createBagFromEntries(PHYSICAL_THREAT_WEIGHT_BAG_DEFAULT),
  magicalThreatBag: () => createBagFromEntries(MAGICAL_THREAT_WEIGHT_BAG_DEFAULT),
  sideQuestBag: () => createBagFromEntries(SIDE_QUEST_BAG_DEFAULT),
} as const;

export type BagType = keyof typeof BAG_DEFAULT_CREATORS;

function getDefaultEntriesForBagType(bagType: BagType): WeightedBagEntry[] {
  return BAG_DEFAULT_CREATORS[bagType]().entries;
}

// SpecRef: 7 | REWARD | normalizeBagForType
export function normalizeBagForType(bag: RandomBag, bagType: BagType): RandomBag {
  const defaultEntries = getDefaultEntriesForBagType(bagType);
  const currentById = new Map<number, number>();

  for (const entry of bag.entries) {
    if (!Number.isFinite(entry.id)) continue;
    const id = Math.floor(entry.id);
    const tickets = Math.max(0, Math.floor(entry.tickets));
    currentById.set(id, (currentById.get(id) ?? 0) + tickets);
  }

  const normalizedEntries = defaultEntries.map((defaultEntry) => ({
    id: defaultEntry.id,
    tickets: currentById.get(defaultEntry.id) ?? 0,
  }));

  return { entries: normalizedEntries };
}


// SpecRef: 7 | REWARD | normalizeGameBags
export function normalizeGameBags(bags: GameBags): GameBags {
  return {
    commonRewardBag: normalizeBagForType(bags.commonRewardBag, 'commonRewardBag'),
    commonEnhancementBag: normalizeBagForType(bags.commonEnhancementBag, 'commonEnhancementBag'),
    uncommonRewardBag: normalizeBagForType(bags.uncommonRewardBag, 'uncommonRewardBag'),
    eliteRareRewardBag: normalizeBagForType(bags.eliteRareRewardBag, 'eliteRareRewardBag'),
    bossRareRewardBag: normalizeBagForType(bags.bossRareRewardBag, 'bossRareRewardBag'),
    mythicRareRewardBag: normalizeBagForType(bags.mythicRareRewardBag, 'mythicRareRewardBag'),
    enhancementBag: normalizeBagForType(bags.enhancementBag, 'enhancementBag'),
    superRareBag: normalizeBagForType(bags.superRareBag, 'superRareBag'),
    physicalThreatBag: normalizeBagForType(bags.physicalThreatBag, 'physicalThreatBag'),
    magicalThreatBag: normalizeBagForType(bags.magicalThreatBag, 'magicalThreatBag'),
    sideQuestBag: normalizeBagForType(bags.sideQuestBag, 'sideQuestBag'),
  };
}

// SpecRef: 7 | REWARD | createCommonRewardBag
export function createCommonRewardBag(): RandomBag {
  return BAG_DEFAULT_CREATORS.commonRewardBag();
}

// SpecRef: 7 | REWARD | createCommonEnhancementBag
export function createCommonEnhancementBag(): RandomBag {
  return BAG_DEFAULT_CREATORS.commonEnhancementBag();
}

// SpecRef: 7 | REWARD | createUncommonRewardBag
export function createUncommonRewardBag(): RandomBag {
  return BAG_DEFAULT_CREATORS.uncommonRewardBag();
}

// SpecRef: 7 | REWARD | createEliteRareRewardBag
export function createEliteRareRewardBag(): RandomBag {
  return BAG_DEFAULT_CREATORS.eliteRareRewardBag();
}

// SpecRef: 7 | REWARD | createBossRareRewardBag
export function createBossRareRewardBag(): RandomBag {
  return BAG_DEFAULT_CREATORS.bossRareRewardBag();
}

// SpecRef: 7 | REWARD | createMythicRareRewardBag
export function createMythicRareRewardBag(): RandomBag {
  return BAG_DEFAULT_CREATORS.mythicRareRewardBag();
}

// SpecRef: 7 | REWARD | createEnhancementBag
export function createEnhancementBag(): RandomBag {
  return BAG_DEFAULT_CREATORS.enhancementBag();
}

// SpecRef: 7 | REWARD | createSuperRareBag
export function createSuperRareBag(): RandomBag {
  return BAG_DEFAULT_CREATORS.superRareBag();
}

// SpecRef: 7 | REWARD | createPhysicalThreatBag
export function createPhysicalThreatBag(): RandomBag {
  return BAG_DEFAULT_CREATORS.physicalThreatBag();
}

// SpecRef: 7 | REWARD | createMagicalThreatBag
export function createMagicalThreatBag(): RandomBag {
  return BAG_DEFAULT_CREATORS.magicalThreatBag();
}

export function createSideQuestBag(): RandomBag {
  return BAG_DEFAULT_CREATORS.sideQuestBag();
}

// SpecRef: 7 | REWARD | initializeBags
export function initializeBags(): GameBags {
  return {
    commonRewardBag: createCommonRewardBag(),
    commonEnhancementBag: createCommonEnhancementBag(),
    uncommonRewardBag: createUncommonRewardBag(),
    eliteRareRewardBag: createEliteRareRewardBag(),
    bossRareRewardBag: createBossRareRewardBag(),
    mythicRareRewardBag: createMythicRareRewardBag(),
    enhancementBag: createEnhancementBag(),
    superRareBag: createSuperRareBag(),
    physicalThreatBag: createPhysicalThreatBag(),
    magicalThreatBag: createMagicalThreatBag(),
    sideQuestBag: createSideQuestBag(),
  };
}

function sortEntriesStable(entries: WeightedBagEntry[]): WeightedBagEntry[] {
  return [...entries].sort((a, b) => a.id - b.id);
}

function getTotalTickets(bag: RandomBag): number {
  return bag.entries.reduce((sum, entry) => sum + Math.max(0, entry.tickets), 0);
}

// SpecRef: 7 | REWARD | drawFromBag
export function drawFromBag(bag: RandomBag): { ticket: number; newBag: RandomBag } {
  const totalTickets = getTotalTickets(bag);
  if (totalTickets <= 0) {
    throw new Error('Bag is empty');
  }

  const sortedEntries = sortEntriesStable(bag.entries);
  const roll = Math.floor(Math.random() * totalTickets) + 1;
  let cumulative = 0;

  const newEntries = sortedEntries.map((entry) => ({ ...entry }));
  for (let i = 0; i < newEntries.length; i++) {
    const entry = newEntries[i];
    if (entry.tickets <= 0) continue;

    cumulative += entry.tickets;
    if (roll <= cumulative) {
      newEntries[i] = { ...entry, tickets: entry.tickets - 1 };
      return {
        ticket: entry.id,
        newBag: { entries: newEntries },
      };
    }
  }

  throw new Error('Failed to draw from weighted bag');
}

// SpecRef: 7 | REWARD | refillBagIfEmpty
export function refillBagIfEmpty(bags: GameBags, bagType: BagType): GameBags {
  const currentBag = bags[bagType];
  if (getTotalTickets(currentBag) > 0) {
    return bags;
  }

  return {
    ...bags,
    [bagType]: BAG_DEFAULT_CREATORS[bagType](),
  };
}

// SpecRef: 7 | REWARD | getBagTicketTotal
export function getBagTicketTotal(bag: RandomBag): number {
  return getTotalTickets(bag);
}

// SpecRef: 7 | REWARD | getBagEntryTickets
export function getBagEntryTickets(bag: RandomBag, id: number): number {
  return bag.entries.find((entry) => entry.id === id)?.tickets ?? 0;
}
