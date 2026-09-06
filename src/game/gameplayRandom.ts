export type GameplayRandomSource = () => number;

let source: GameplayRandomSource = () => Math.random();

function drawUnderlying(): number {
  const value = source();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError('Gameplay random source must return a finite value in [0, 1)');
  }
  return value;
}

/** The realm-local logical gameplay stream. Visual-only randomness must not use this. */
export function gameplayRandom(): number {
  return drawUnderlying();
}

/** Scoped source isolation for deterministic tests; prior realm state is restored afterward. */
export function withGameplayRandomSourceForTesting<T>(testSource: GameplayRandomSource, operation: () => T): T {
  const previousSource = source;
  source = testSource;
  try {
    return operation();
  } finally {
    source = previousSource;
  }
}

export function resetGameplayRandomForTesting(testSource: GameplayRandomSource = () => Math.random()): void {
  source = testSource;
}

// SpecRef: 9.1.3 | Experimental AI API | Evaluation transactions
export const withGameplayRandomSource = withGameplayRandomSourceForTesting;
export function createApiRandom(seed: number) {
  let state = seed >>> 0;
  return { get state() { return state; }, next: () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  } };
}
