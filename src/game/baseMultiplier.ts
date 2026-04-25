export type BaseMultiplierType = 'attack' | 'defense';

const ATTACK_SCALE_TABLE: Record<number, number> = {
  6: 0.70,
  7: 0.76,
  8: 0.83,
  9: 0.91,
  10: 1.00,
  11: 1.10,
  12: 1.20,
  13: 1.32,
  14: 1.45,
  15: 1.59,
  16: 1.75,
  17: 1.93,
  18: 2.12,
  19: 2.33,
  20: 2.56,
  21: 2.82,
  22: 3.10,
  23: 3.41,
};

const DEFENSE_SCALE_TABLE: Record<number, number> = {
  6: 1.43,
  7: 1.32,
  8: 1.20,
  9: 1.10,
  10: 1.00,
  11: 0.91,
  12: 0.83,
  13: 0.76,
  14: 0.69,
  15: 0.63,
  16: 0.57,
  17: 0.52,
  18: 0.47,
  19: 0.43,
  20: 0.39,
  21: 0.35,
  22: 0.32,
  23: 0.29,
};

const MIN_BASE_VALUE = 6;
const MAX_BASE_VALUE = 23;

function clampBaseValue(value: number): number {
  return Math.max(MIN_BASE_VALUE, Math.min(MAX_BASE_VALUE, Math.floor(value)));
}

// SpecRef: 2.1.1.2 | Multiplier and Functions | f.base_multiplier
export function getBaseMultiplier(baseValue: number, baseType: BaseMultiplierType): number {
  const clampedValue = clampBaseValue(baseValue);
  const table = baseType === 'attack' ? ATTACK_SCALE_TABLE : DEFENSE_SCALE_TABLE;
  return table[clampedValue] ?? 1.0;
}
