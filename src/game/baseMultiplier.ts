export type BaseMultiplierType = 'attack' | 'defense';

const MIN_BASE_VALUE = 6;
const MAX_BASE_VALUE = 23;
const BASE_MULTIPLIER_UNIT = 1.1;

function clampBaseValue(value: number): number {
  return Math.max(MIN_BASE_VALUE, Math.min(MAX_BASE_VALUE, Math.floor(value)));
}

function roundScale(value: number): number {
  return Math.round(value * 100) / 100;
}

// SpecRef: 2.1.1.2 | Multiplier and Functions | getBaseMultiplier
export function getBaseMultiplier(baseValue: number, baseType: BaseMultiplierType): number {
  const clampedValue = clampBaseValue(baseValue);
  const exponent = clampedValue - 10;
  const scale = baseType === 'attack'
    ? BASE_MULTIPLIER_UNIT ** exponent
    : 1 / (BASE_MULTIPLIER_UNIT ** exponent);

  return roundScale(scale);
}
