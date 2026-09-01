import type { RandomBag } from '../types/index.ts';

function getTotalTickets(bag: RandomBag): number {
  return bag.entries.reduce((sum, entry) => sum + Math.max(0, entry.tickets), 0);
}

export function drawFromBagWithRandom(
  bag: RandomBag,
  random: () => number,
): { ticket: number; newBag: RandomBag } {
  const totalTickets = getTotalTickets(bag);
  if (totalTickets <= 0) throw new Error('Bag is empty');

  const newEntries = [...bag.entries]
    .sort((left, right) => left.id - right.id)
    .map((entry) => ({ ...entry }));
  const roll = Math.floor(random() * totalTickets) + 1;
  let cumulative = 0;

  for (let index = 0; index < newEntries.length; index++) {
    const entry = newEntries[index];
    if (entry.tickets <= 0) continue;
    cumulative += entry.tickets;
    if (roll <= cumulative) {
      newEntries[index] = { ...entry, tickets: entry.tickets - 1 };
      return { ticket: entry.id, newBag: { entries: newEntries } };
    }
  }

  throw new Error('Failed to draw from weighted bag');
}
