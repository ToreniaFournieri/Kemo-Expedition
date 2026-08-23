const BATTLE_RANDOM_TAPE_CAPACITY = 4_096;

export type GameplayRandomSource = () => number;

type Reservation = {
  readonly tape: readonly number[];
  commit(consumed: number): void;
  rollback(): void;
};

let source: GameplayRandomSource = () => Math.random();
let buffered: number[] = [];
let reservationActive = false;

function drawUnderlying(): number {
  const value = source();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError('Gameplay random source must return a finite value in [0, 1)');
  }
  return value;
}

/** The realm-local logical gameplay stream. Visual-only randomness must not use this. */
export function gameplayRandom(): number {
  if (reservationActive) throw new Error('Gameplay random draw attempted during an active battle reservation');
  return buffered.length > 0 ? buffered.shift()! : drawUnderlying();
}

/**
 * Reserves a non-destructive prefix of the realm-local stream. A failed battle
 * rolls back the reservation and commits zero values; success commits exactly
 * the native cursor and preserves the unused suffix for subsequent callers.
 */
export function reserveGameplayRandomTape(capacity = BATTLE_RANDOM_TAPE_CAPACITY): Reservation {
  if (reservationActive) throw new Error('Nested or reentrant battle execution is not supported in one JavaScript realm');
  if (!Number.isInteger(capacity) || capacity < 0 || capacity > BATTLE_RANDOM_TAPE_CAPACITY) {
    throw new RangeError(`Battle random tape capacity must be from 0 through ${BATTLE_RANDOM_TAPE_CAPACITY}`);
  }
  reservationActive = true;
  try {
    while (buffered.length < capacity) buffered.push(drawUnderlying());
  } catch (error) {
    reservationActive = false;
    throw error;
  }
  let closed = false;
  const close = (): void => {
    if (closed) throw new Error('Battle random reservation is already closed');
    closed = true;
    reservationActive = false;
  };
  return {
    tape: buffered.slice(0, capacity),
    commit(consumed: number): void {
      if (!Number.isInteger(consumed) || consumed < 0 || consumed > capacity) {
        throw new RangeError(`Battle random cursor ${consumed} is outside the reserved window`);
      }
      buffered.splice(0, consumed);
      close();
    },
    rollback(): void { close(); },
  };
}

/** Scoped source isolation for deterministic tests; prior realm state is restored afterward. */
export function withGameplayRandomSourceForTesting<T>(testSource: GameplayRandomSource, operation: () => T): T {
  if (reservationActive) throw new Error('Cannot replace the gameplay random source during an active reservation');
  const previousSource = source;
  const previousBuffered = buffered;
  source = testSource;
  buffered = [];
  try {
    return operation();
  } finally {
    if (reservationActive) {
      reservationActive = false;
      buffered = [];
    }
    source = previousSource;
    buffered = previousBuffered;
  }
}

export function resetGameplayRandomForTesting(testSource: GameplayRandomSource = () => Math.random()): void {
  if (reservationActive) throw new Error('Cannot reset the gameplay random source during an active reservation');
  source = testSource;
  buffered = [];
}

export function getGameplayRandomStateForTesting(): { buffered: readonly number[]; reservationActive: boolean } {
  return { buffered: [...buffered], reservationActive };
}

export { BATTLE_RANDOM_TAPE_CAPACITY };
