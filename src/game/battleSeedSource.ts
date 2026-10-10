import { requireBattleSeed } from './battleReplay.ts';

export type BattleSeedSource = () => bigint;

let injectedSource: BattleSeedSource | null = null;
let forecastSource: BattleSeedSource | null = null;

/** Low word is values[0], high word is values[1], matching the protocol fields. */
function createWebCryptoBattleSeed(): bigint {
  const crypto = globalThis.crypto;
  if (!crypto || typeof crypto.getRandomValues !== 'function') {
    throw new Error('Web Crypto is unavailable for battle seed generation');
  }
  const values = new Uint32Array(2);
  crypto.getRandomValues(values);
  return (BigInt(values[1]!) << 32n) | BigInt(values[0]!);
}

export function createWebCryptoBattleSeedForTesting(crypto: Pick<Crypto, 'getRandomValues'> | undefined): bigint {
  if (!crypto || typeof crypto.getRandomValues !== 'function') {
    throw new Error('Web Crypto is unavailable for battle seed generation');
  }
  const values = new Uint32Array(2);
  crypto.getRandomValues(values);
  return (BigInt(values[1]!) << 32n) | BigInt(values[0]!);
}

export function acquireBattleSeed(): bigint {
  return requireBattleSeed((forecastSource ?? injectedSource ?? createWebCryptoBattleSeed)());
}

// SpecRef: 9.1.3 | Read | 2-3-2 party/{p}/gaSearch | builds are compared on the same random numbers.
/**
 * Runs one synchronous private forecast whose battles take their seeds from `source` (a seeded forecast stream), so a
 * fixed forecast seed repeats every battle. It takes precedence over any other source only for the duration of `operation`.
 */
export function withForecastBattleSeedSource<T>(source: BattleSeedSource, operation: () => T): T {
  const previous = forecastSource;
  forecastSource = source;
  try {
    return operation();
  } finally {
    forecastSource = previous;
  }
}

/** Scoped, realm-local deterministic seed injection for tests only. */
export function withBattleSeedSourceForTesting<T>(source: BattleSeedSource, operation: () => T): T {
  if (injectedSource) throw new Error('A battle seed source is already injected in this realm');
  injectedSource = source;
  try {
    return operation();
  } finally {
    injectedSource = null;
  }
}

/** Installs a realm-local source for long-lived integration profiles. */
export function resetBattleSeedSourceForTesting(source: BattleSeedSource | null = null): void {
  injectedSource = source;
}

// SpecRef: 9.1.4.4 | Commit, revision, and idempotency contract | one serialized transaction
export const withBattleSeedSource = withBattleSeedSourceForTesting;
