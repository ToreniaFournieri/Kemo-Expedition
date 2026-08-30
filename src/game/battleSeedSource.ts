import { requireBattleSeed } from './battleReplay.ts';

export type BattleSeedSource = () => bigint;

let injectedSource: BattleSeedSource | null = null;

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
  return requireBattleSeed((injectedSource ?? createWebCryptoBattleSeed)());
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
