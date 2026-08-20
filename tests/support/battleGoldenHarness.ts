import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import type { EnemyDef, GameBags, Party, TerrainEffectKey } from '../../src/types/index.ts';

export type BattleEnvironment = {
  terrainEffect?: TerrainEffectKey | null;
};

export type BattleRunner<TResult> = (
  party: Party,
  enemy: EnemyDef,
  bags: GameBags,
  initialPartyHp?: number,
  environment?: BattleEnvironment,
) => TResult;

export type BattleGoldenCase = {
  id: string;
  seed: number;
  party: Party;
  enemy: EnemyDef;
  bags: GameBags;
  initialPartyHp?: number;
  environment?: BattleEnvironment;
};

export type BattleGoldenSnapshot = {
  randomDrawCount: number;
  result: unknown;
};

export type BattleGoldenDigest = {
  digest: string;
  randomDrawCount: number;
  outcome: string | null;
  partyHp: number | null;
  enemyHp: number | null;
  logCount: number;
};

function clone<T>(value: T): T {
  return structuredClone(value);
}

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  if (state === 0) state = 0x9e3779b9;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
}

function withRandomSource<T>(random: () => number, operation: () => T): T {
  const originalRandom = Math.random;
  Math.random = random;
  try {
    return operation();
  } finally {
    Math.random = originalRandom;
  }
}

function runBattle<TResult>(
  runner: BattleRunner<TResult>,
  fixture: BattleGoldenCase,
  random: () => number,
): TResult {
  return withRandomSource(random, () => runner(
    clone(fixture.party),
    clone(fixture.enemy),
    clone(fixture.bags),
    fixture.initialPartyHp,
    fixture.environment ? clone(fixture.environment) : undefined,
  ));
}

export function recordBattleGolden<TResult>(
  runner: BattleRunner<TResult>,
  fixture: BattleGoldenCase,
): { snapshot: BattleGoldenSnapshot; randomTape: number[] } {
  const seededRandom = createSeededRandom(fixture.seed);
  const randomTape: number[] = [];
  const result = runBattle(runner, fixture, () => {
    const value = seededRandom();
    randomTape.push(value);
    return value;
  });
  return {
    snapshot: { randomDrawCount: randomTape.length, result },
    randomTape,
  };
}

export function replayBattleGolden<TResult>(
  runner: BattleRunner<TResult>,
  fixture: BattleGoldenCase,
  randomTape: readonly number[],
): BattleGoldenSnapshot {
  let cursor = 0;
  const result = runBattle(runner, fixture, () => {
    if (cursor >= randomTape.length) {
      throw new Error(`${fixture.id}: runner consumed an unexpected random draw at index ${cursor}`);
    }
    return randomTape[cursor++]!;
  });
  assert.equal(
    cursor,
    randomTape.length,
    `${fixture.id}: runner consumed ${cursor} of ${randomTape.length} recorded random draws`,
  );
  return { randomDrawCount: cursor, result };
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return Object.is(value, -0) ? 0 : value;
}

export function canonicalBattleJson(snapshot: BattleGoldenSnapshot): string {
  return JSON.stringify(canonicalize(snapshot));
}

export function digestBattleGolden(snapshot: BattleGoldenSnapshot): BattleGoldenDigest {
  const result = snapshot.result as {
    outcome?: unknown;
    partyHp?: unknown;
    enemyHp?: unknown;
    log?: unknown;
  };
  return {
    digest: createHash('sha256').update(canonicalBattleJson(snapshot)).digest('hex'),
    randomDrawCount: snapshot.randomDrawCount,
    outcome: typeof result?.outcome === 'string' ? result.outcome : null,
    partyHp: typeof result?.partyHp === 'number' ? result.partyHp : null,
    enemyHp: typeof result?.enemyHp === 'number' ? result.enemyHp : null,
    logCount: Array.isArray(result?.log) ? result.log.length : 0,
  };
}

export function assertBattleRunnerParity<TResult>(
  referenceRunner: BattleRunner<TResult>,
  candidateRunner: BattleRunner<TResult>,
  fixture: BattleGoldenCase,
): void {
  const reference = recordBattleGolden(referenceRunner, fixture);
  const candidate = replayBattleGolden(candidateRunner, fixture, reference.randomTape);
  assert.equal(
    canonicalBattleJson(candidate),
    canonicalBattleJson(reference.snapshot),
    `${fixture.id}: candidate battle result differs from the reference`,
  );
}
