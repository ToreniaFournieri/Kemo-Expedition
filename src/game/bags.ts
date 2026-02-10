import { GameBags, RandomBag } from '../types';
import { ENHANCEMENT_TITLES, SUPER_RARE_TITLES } from '../data/items';

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Common reward bag: 90 no item, 10 win (10% chance)
export function createCommonRewardBag(): RandomBag {
  const tickets = [...Array(10).fill(1), ...Array(90).fill(0)];
  return { tickets: shuffleArray(tickets) };
}

// Common enhancement bag: Uses standard ENHANCEMENT_TITLES tickets
export function createCommonEnhancementBag(): RandomBag {
  const tickets: number[] = [];
  for (const title of ENHANCEMENT_TITLES) {
    for (let i = 0; i < title.tickets; i++) {
      tickets.push(title.value);
    }
  }
  return { tickets: shuffleArray(tickets) };
}

// Uncommon reward bag: 99 no item, 1 win (1% chance)
export function createUncommonRewardBag(): RandomBag {
  const tickets = [1, ...Array(99).fill(0)];
  return { tickets: shuffleArray(tickets) };
}

// Rare reward bag: 99 no item, 1 win (1% chance)
export function createRareRewardBag(): RandomBag {
  const tickets = [1, ...Array(99).fill(0)];
  return { tickets: shuffleArray(tickets) };
}

// Mythic reward bag: 99 no item, 1 win (1% chance)
export function createMythicRewardBag(): RandomBag {
  const tickets = [1, ...Array(99).fill(0)];
  return { tickets: shuffleArray(tickets) };
}

// Unique enhancement bag: 5490 none instead of 1390
// This makes enhancement titles rarer for unique rewards
export function createEnhancementBag(): RandomBag {
  const tickets: number[] = [];
  for (const title of ENHANCEMENT_TITLES) {
    // For value 0 (none), use 5490 tickets instead of 1390
    const ticketCount = title.value === 0 ? 5490 : title.tickets;
    for (let i = 0; i < ticketCount; i++) {
      tickets.push(title.value);
    }
  }
  return { tickets: shuffleArray(tickets) };
}

export function createSuperRareBag(): RandomBag {
  const tickets: number[] = [];
  for (const title of SUPER_RARE_TITLES) {
    for (let i = 0; i < title.tickets; i++) {
      tickets.push(title.value);
    }
  }
  return { tickets: shuffleArray(tickets) };
}

// Physical threat weight: Row 1=16, Row 2=8, Row 3=4, Row 4=2, Row 5=1, Row 6=1
export function createPhysicalThreatBag(): RandomBag {
  const tickets = [
    ...Array(16).fill(1), // Row 1: 16 tickets
    ...Array(8).fill(2),  // Row 2: 8 tickets
    ...Array(4).fill(3),  // Row 3: 4 tickets
    ...Array(2).fill(4),  // Row 4: 2 tickets
    5,                    // Row 5: 1 ticket
    6,                    // Row 6: 1 ticket
  ];
  return { tickets: shuffleArray(tickets) };
}

// Magical threat weight: All rows equal (1 ticket each)
export function createMagicalThreatBag(): RandomBag {
  const tickets = [1, 2, 3, 4, 5, 6];
  return { tickets: shuffleArray(tickets) };
}

export function initializeBags(): GameBags {
  return {
    commonRewardBag: createCommonRewardBag(),
    commonEnhancementBag: createCommonEnhancementBag(),
    uncommonRewardBag: createUncommonRewardBag(),
    rareRewardBag: createRareRewardBag(),
    mythicRewardBag: createMythicRewardBag(),
    enhancementBag: createEnhancementBag(),
    superRareBag: createSuperRareBag(),
    physicalThreatBag: createPhysicalThreatBag(),
    magicalThreatBag: createMagicalThreatBag(),
  };
}

export function drawFromBag(bag: RandomBag): { ticket: number; newBag: RandomBag } {
  if (bag.tickets.length === 0) {
    throw new Error('Bag is empty');
  }
  const [ticket, ...remaining] = bag.tickets;
  return {
    ticket,
    newBag: { tickets: remaining },
  };
}

export type BagType =
  | 'commonRewardBag'
  | 'commonEnhancementBag'
  | 'uncommonRewardBag'
  | 'rareRewardBag'
  | 'mythicRewardBag'
  | 'enhancementBag'
  | 'superRareBag'
  | 'physicalThreatBag'
  | 'magicalThreatBag';

export function refillBagIfEmpty(
  bags: GameBags,
  bagType: BagType
): GameBags {
  if (bags[bagType].tickets.length === 0) {
    switch (bagType) {
      case 'commonRewardBag':
        return { ...bags, commonRewardBag: createCommonRewardBag() };
      case 'commonEnhancementBag':
        return { ...bags, commonEnhancementBag: createCommonEnhancementBag() };
      case 'uncommonRewardBag':
        return { ...bags, uncommonRewardBag: createUncommonRewardBag() };
      case 'rareRewardBag':
        return { ...bags, rareRewardBag: createRareRewardBag() };
      case 'mythicRewardBag':
        return { ...bags, mythicRewardBag: createMythicRewardBag() };
      case 'enhancementBag':
        return { ...bags, enhancementBag: createEnhancementBag() };
      case 'superRareBag':
        return { ...bags, superRareBag: createSuperRareBag() };
      case 'physicalThreatBag':
        return { ...bags, physicalThreatBag: createPhysicalThreatBag() };
      case 'magicalThreatBag':
        return { ...bags, magicalThreatBag: createMagicalThreatBag() };
    }
  }
  return bags;
}
