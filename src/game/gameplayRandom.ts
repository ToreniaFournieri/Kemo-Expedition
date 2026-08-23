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
