// SpecRef: 8.3 | UI_EXPEDITION | Difficulty Offset (難易度)
export function normalizeDifficultyOffset(value: unknown, maxOffset: number = 80): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  const maxEvenOffset = Math.floor(Math.max(0, Math.floor(maxOffset)) / 2) * 2;
  const evenOffset = Math.floor(value / 2) * 2;
  return Math.max(0, Math.min(maxEvenOffset, evenOffset));
}

// SpecRef: 8.3 | UI_EXPEDITION | Difficulty Offset (難易度)
export function getDifficultyOffsetMax(enemyLevel: number): number {
  if (!Number.isFinite(enemyLevel)) return 0;
  return Math.max(0, Math.min(80, Math.ceil(88 - enemyLevel)));
}

// SpecRef: 8.3 | UI_EXPEDITION | Difficulty Offset (難易度)
export function getDifficultyOffsetItemChanceTickets(offset: number): number {
  const normalizedOffset = normalizeDifficultyOffset(offset);
  if (normalizedOffset < 2) return 0;
  return Math.floor((normalizedOffset - 2) / 4) + 1;
}

// SpecRef: 8.3 | UI_EXPEDITION | Difficulty Offset (難易度)
export function getDifficultyOffsetSuperRareChanceTickets(offset: number): number {
  const normalizedOffset = normalizeDifficultyOffset(offset);
  if (normalizedOffset < 4) return 0;
  return Math.floor(normalizedOffset / 4);
}
