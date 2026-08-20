import type {
  AbilityId,
  BattleLogEntry,
  BattleOutcome,
  EnemyDef,
  GameBags,
  Party,
  RandomBag,
  TerrainEffectKey,
} from '../types/index.ts';
import { executeBattle as executeCppBattle } from './battle.ts';
import { executeBattle as executeTypeScriptBattle } from './battleTypeScriptReference.ts';

type AbilityState = {
  partyAbilities: Array<{ characterId: number; abilities: Array<{ id: AbilityId; level: number }> }>;
  enemyAbilities: Array<{ id: AbilityId; level: number }>;
};

type BattleEnvironment = {
  terrainEffect?: TerrainEffectKey | null;
  shadowCapture?: (state: AbilityState) => void;
};

export type ShadowBattleResult = {
  partyHp: number;
  enemyHp: number;
  outcome?: BattleOutcome;
  log: BattleLogEntry[];
  updatedBags: { physicalThreatBag: RandomBag; magicalThreatBag: RandomBag };
  enemyHitsReceived: number;
};

export type ShadowBattleRunner = (
  party: Party,
  enemy: EnemyDef,
  bags: GameBags,
  initialPartyHp?: number,
  environment?: BattleEnvironment,
) => ShadowBattleResult;

export type BattleShadowCategory =
  | 'random-draw-count'
  | 'random-draw-order'
  | 'hp-outcome'
  | 'ability-state'
  | 'threat-bags'
  | 'events';

export class BattleShadowMismatchError extends Error {
  readonly category: BattleShadowCategory;
  readonly path: string;
  readonly typescriptValue: unknown;
  readonly cppValue: unknown;

  constructor(
    category: BattleShadowCategory,
    path: string,
    typescriptValue: unknown,
    cppValue: unknown,
  ) {
    super(`Battle shadow mismatch [${category}] at ${path}: TypeScript=${JSON.stringify(typescriptValue)} C++=${JSON.stringify(cppValue)}`);
    this.name = 'BattleShadowMismatchError';
    this.category = category;
    this.path = path;
    this.typescriptValue = typescriptValue;
    this.cppValue = cppValue;
  }
}

export type BattleEngineShadowSnapshot = {
  result: ShadowBattleResult;
  abilityState: AbilityState;
  randomTrace: number[];
};

function clone<T>(value: T): T {
  return structuredClone(value);
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return Object.is(value, -0) ? 0 : value;
}

function firstDifference(left: unknown, right: unknown, path = '$'): { path: string; left: unknown; right: unknown } | null {
  if (Object.is(left, right)) return null;
  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) return { path: `${path}.length`, left: left.length, right: right.length };
    for (let index = 0; index < left.length; index += 1) {
      const difference = firstDifference(left[index], right[index], `${path}[${index}]`);
      if (difference) return difference;
    }
    return null;
  }
  if (left && right && typeof left === 'object' && typeof right === 'object') {
    const leftRecord = left as Record<string, unknown>;
    const rightRecord = right as Record<string, unknown>;
    const keys = [...new Set([...Object.keys(leftRecord), ...Object.keys(rightRecord)])].sort();
    for (const key of keys) {
      const difference = firstDifference(leftRecord[key], rightRecord[key], `${path}.${key}`);
      if (difference) return difference;
    }
    return null;
  }
  return { path, left, right };
}

function assertCategory(category: BattleShadowCategory, typescriptValue: unknown, cppValue: unknown): void {
  const difference = firstDifference(canonicalize(typescriptValue), canonicalize(cppValue));
  if (difference) throw new BattleShadowMismatchError(category, difference.path, difference.left, difference.right);
}

function runWithRandom(
  runner: ShadowBattleRunner,
  args: [Party, EnemyDef, GameBags, number | undefined, BattleEnvironment | undefined],
  random: () => number,
): BattleEngineShadowSnapshot {
  const originalRandom = Math.random;
  const randomTrace: number[] = [];
  let abilityState: AbilityState = { partyAbilities: [], enemyAbilities: [] };
  const environment: BattleEnvironment = {
    ...(args[4] ?? {}),
    shadowCapture: (state) => { abilityState = clone(state); },
  };
  Math.random = () => {
    const value = random();
    randomTrace.push(value);
    return value;
  };
  try {
    const result = runner(clone(args[0]), clone(args[1]), clone(args[2]), args[3], environment);
    return { result, abilityState, randomTrace };
  } finally {
    Math.random = originalRandom;
  }
}

export function assertBattleShadowSnapshots(typescript: BattleEngineShadowSnapshot, cpp: BattleEngineShadowSnapshot): void {
  assertCategory('random-draw-count', typescript.randomTrace.length, cpp.randomTrace.length);
  assertCategory('random-draw-order', typescript.randomTrace, cpp.randomTrace);
  assertCategory('hp-outcome', {
    partyHp: typescript.result.partyHp,
    enemyHp: typescript.result.enemyHp,
    outcome: typescript.result.outcome,
  }, {
    partyHp: cpp.result.partyHp,
    enemyHp: cpp.result.enemyHp,
    outcome: cpp.result.outcome,
  });
  assertCategory('ability-state', typescript.abilityState, cpp.abilityState);
  assertCategory('threat-bags', typescript.result.updatedBags, cpp.result.updatedBags);
  assertCategory('events', typescript.result.log, cpp.result.log);
}

export function executeBattleWithDevelopmentShadow(
  party: Party,
  enemy: EnemyDef,
  bags: GameBags,
  initialPartyHp?: number,
  environment?: BattleEnvironment,
  options: {
    random?: () => number;
    typescriptRunner?: ShadowBattleRunner;
    cppRunner?: ShadowBattleRunner;
  } = {},
): ShadowBattleResult {
  const sourceRandom = options.random ?? Math.random;
  const randomTape: number[] = [];
  const args: [Party, EnemyDef, GameBags, number | undefined, BattleEnvironment | undefined] = [
    party, enemy, bags, initialPartyHp, environment,
  ];
  const typescript = runWithRandom(options.typescriptRunner ?? executeTypeScriptBattle, args, () => {
    const value = sourceRandom();
    randomTape.push(value);
    return value;
  });
  let cursor = 0;
  const cpp = runWithRandom(options.cppRunner ?? executeCppBattle, args, () => {
    if (cursor >= randomTape.length) {
      throw new BattleShadowMismatchError('random-draw-count', `$.randomTrace[${cursor}]`, undefined, 'unexpected C++ draw');
    }
    return randomTape[cursor++]!;
  });
  if (cursor !== randomTape.length) {
    throw new BattleShadowMismatchError('random-draw-count', '$.randomTrace.length', randomTape.length, cursor);
  }
  assertBattleShadowSnapshots(typescript, cpp);
  return cpp.result;
}
