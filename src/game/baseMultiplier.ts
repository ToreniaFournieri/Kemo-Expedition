export type BaseMultiplierType = 'attack' | 'defense';

const ATTACK_SCALE_TABLE: Record<number, number> = {
  6: 0.81,
  7: 0.86,
  8: 0.90,
  9: 0.95,
  10: 1.00,
  11: 1.05,
  12: 1.10,
  13: 1.16,
  14: 1.22,
  15: 1.28,
  16: 1.34,
  17: 1.41,
  18: 1.48,
  19: 1.55,
  20: 1.63,
  21: 1.71,
  22: 1.80,
  23: 1.89,
};

const DEFENSE_SCALE_TABLE: Record<number, number> = {
  6: 1.22,
  7: 1.16,
  8: 1.10,
  9: 1.05,
  10: 1.00,
  11: 0.95,
  12: 0.90,
  13: 0.86,
  14: 0.81,
  15: 0.77,
  16: 0.73,
  17: 0.69,
  18: 0.66,
  19: 0.63,
  20: 0.60,
  21: 0.57,
  22: 0.54,
  23: 0.51,
};

const MIN_BASE_VALUE = 6;
const MAX_BASE_VALUE = 23;

function clampBaseValue(value: number): number {
  return Math.max(MIN_BASE_VALUE, Math.min(MAX_BASE_VALUE, Math.floor(value)));
}

export function getBaseMultiplier(baseValue: number, baseType: BaseMultiplierType): number {
  const clampedValue = clampBaseValue(baseValue);
  const table = baseType === 'attack' ? ATTACK_SCALE_TABLE : DEFENSE_SCALE_TABLE;
  return table[clampedValue] ?? 1.0;
}
