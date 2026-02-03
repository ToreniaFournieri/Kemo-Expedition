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

export function initializeBags(): GameBags {
  return {
    rewardBag: createRewardBag(),
    enhancementBag: createEnhancementBag(),
    superRareBag: createSuperRareBag(),
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
  bagType: 'rewardBag' | 'enhancementBag' | 'superRareBag'
): GameBags {
  if (bags[bagType].tickets.length === 0) {
    switch (bagType) {
      case 'rewardBag':
        return { ...bags, rewardBag: createRewardBag() };
      case 'enhancementBag':
        return { ...bags, enhancementBag: createEnhancementBag() };
      case 'superRareBag':
        return { ...bags, superRareBag: createSuperRareBag() };
    }
  }
  return bags;
}
