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

const COMMON_SUPER_RARE_BAG_DEFAULT: WeightedBagEntry[] = SUPER_RARE_TITLES.map((title) => ({
  id: title.value,
  tickets: title.value === 0 ? 409_918 : 1,
}));

const RARE_SUPER_RARE_BAG_DEFAULT: WeightedBagEntry[] = SUPER_RARE_TITLES.map((title) => ({
  id: title.value,
  tickets: title.value === 0 ? 40_918 : 1,
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
  { id: 0, tickets: 99 * 13 },
  ...Array.from({ length: 13 }, (_, i) => ({ id: i + 1, tickets: 1 })),
];

const SLEEPINESS_PARTY_BAG_DEFAULT: WeightedBagEntry[] = [
  { id: 0, tickets: 9 },
  { id: 1, tickets: 2 },
  { id: 2, tickets: 1 },
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
  commonSuperRareBag: () => createBagFromEntries(COMMON_SUPER_RARE_BAG_DEFAULT),
  rareSuperRareBag: () => createBagFromEntries(RARE_SUPER_RARE_BAG_DEFAULT),
  physicalThreatBag: () => createBagFromEntries(PHYSICAL_THREAT_WEIGHT_BAG_DEFAULT),
  magicalThreatBag: () => createBagFromEntries(MAGICAL_THREAT_WEIGHT_BAG_DEFAULT),
  sideQuestBag: () => createBagFromEntries(SIDE_QUEST_BAG_DEFAULT),
} as const;

export type BagType = keyof typeof BAG_DEFAULT_CREATORS;

function getDefaultEntriesForBagType(bagType: BagType): WeightedBagEntry[] {
  return BAG_DEFAULT_CREATORS[bagType]().entries;
}

// SpecRef: 6.1.6 | REWARD | normalizeBagForType
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


// SpecRef: 6.1.6 | REWARD | normalizeGameBags
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
    commonSuperRareBag: normalizeBagForType(bags.commonSuperRareBag, 'commonSuperRareBag'),
    rareSuperRareBag: normalizeBagForType(bags.rareSuperRareBag, 'rareSuperRareBag'),
    physicalThreatBag: normalizeBagForType(bags.physicalThreatBag, 'physicalThreatBag'),
    magicalThreatBag: normalizeBagForType(bags.magicalThreatBag, 'magicalThreatBag'),
    sideQuestBag: normalizeBagForType(bags.sideQuestBag, 'sideQuestBag'),
  };
}

// SpecRef: 6.1.6 | REWARD | createCommonRewardBag
export function createCommonRewardBag(): RandomBag {
  return BAG_DEFAULT_CREATORS.commonRewardBag();
}

// SpecRef: 6.1.6 | REWARD | createCommonEnhancementBag
export function createCommonEnhancementBag(): RandomBag {
  return BAG_DEFAULT_CREATORS.commonEnhancementBag();
}

// SpecRef: 6.1.6 | REWARD | createUncommonRewardBag
export function createUncommonRewardBag(): RandomBag {
  return BAG_DEFAULT_CREATORS.uncommonRewardBag();
}

// SpecRef: 6.1.6 | REWARD | createEliteRareRewardBag
export function createEliteRareRewardBag(): RandomBag {
  return BAG_DEFAULT_CREATORS.eliteRareRewardBag();
}

// SpecRef: 6.1.6 | REWARD | createBossRareRewardBag
export function createBossRareRewardBag(): RandomBag {
  return BAG_DEFAULT_CREATORS.bossRareRewardBag();
}

// SpecRef: 6.1.6 | REWARD | createMythicRareRewardBag
export function createMythicRareRewardBag(): RandomBag {
  return BAG_DEFAULT_CREATORS.mythicRareRewardBag();
}

// SpecRef: 6.1.6 | REWARD | createEnhancementBag
export function createEnhancementBag(): RandomBag {
  return BAG_DEFAULT_CREATORS.enhancementBag();
}

// SpecRef: 6.1.6 | REWARD | createSuperRareBag
export function createSuperRareBag(): RandomBag {
  return BAG_DEFAULT_CREATORS.superRareBag();
}

// SpecRef: 6.1.6 | REWARD | createCommonSuperRareBag
export function createCommonSuperRareBag(): RandomBag {
  return BAG_DEFAULT_CREATORS.commonSuperRareBag();
}

// SpecRef: 6.1.6 | REWARD | createRareSuperRareBag
export function createRareSuperRareBag(): RandomBag {
  return BAG_DEFAULT_CREATORS.rareSuperRareBag();
}

// SpecRef: 6.1.6 | REWARD | createPhysicalThreatBag
export function createPhysicalThreatBag(): RandomBag {
  return BAG_DEFAULT_CREATORS.physicalThreatBag();
}

// SpecRef: 6.1.6 | REWARD | createMagicalThreatBag
export function createMagicalThreatBag(): RandomBag {
  return BAG_DEFAULT_CREATORS.magicalThreatBag();
}

export function createSideQuestBag(): RandomBag {
  return BAG_DEFAULT_CREATORS.sideQuestBag();
}

export function createSleepinessPartyBag(): RandomBag {
  return createBagFromEntries(SLEEPINESS_PARTY_BAG_DEFAULT);
}

export function normalizeSleepinessPartyBag(bag: RandomBag): RandomBag {
  const currentById = new Map<number, number>();

  for (const entry of bag.entries) {
    if (!Number.isFinite(entry.id)) continue;
    const id = Math.floor(entry.id);
    const tickets = Math.max(0, Math.floor(entry.tickets));
    currentById.set(id, (currentById.get(id) ?? 0) + tickets);
  }

  const normalizedEntries = SLEEPINESS_PARTY_BAG_DEFAULT.map((defaultEntry) => ({
    id: defaultEntry.id,
    tickets: currentById.get(defaultEntry.id) ?? 0,
  }));

  return { entries: normalizedEntries };
}

// SpecRef: 6.1.6 | REWARD | initializeBags
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
    commonSuperRareBag: createCommonSuperRareBag(),
    rareSuperRareBag: createRareSuperRareBag(),
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

// SpecRef: 6.1.6 | REWARD | drawFromBag
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

// SpecRef: 6.1.6 | REWARD | refillBagIfEmpty
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

// SpecRef: 6.1.6 | REWARD | getBagTicketTotal
export function getBagTicketTotal(bag: RandomBag): number {
  return getTotalTickets(bag);
}

// SpecRef: 6.1.6 | REWARD | getBagEntryTickets
export function getBagEntryTickets(bag: RandomBag, id: number): number {
  return bag.entries.find((entry) => entry.id === id)?.tickets ?? 0;
}
