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

export function createRewardBag(): RandomBag {
  // 1 win ticket (1) and 9 lose tickets (0) = 10% chance
  const tickets = [1, ...Array(9).fill(0)];
  return { tickets: shuffleArray(tickets) };
}

export function createEnhancementBag(): RandomBag {
  const tickets: number[] = [];
  for (const title of ENHANCEMENT_TITLES) {
    for (let i = 0; i < title.tickets; i++) {
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
    rewardBag: createRewardBag(),
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

export function refillBagIfEmpty(
  bags: GameBags,
  bagType: 'rewardBag' | 'enhancementBag' | 'superRareBag' | 'physicalThreatBag' | 'magicalThreatBag'
): GameBags {
  if (bags[bagType].tickets.length === 0) {
    switch (bagType) {
      case 'rewardBag':
        return { ...bags, rewardBag: createRewardBag() };
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
