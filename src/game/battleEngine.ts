import type { EnemyDef, GameBags, Party, TerrainEffectKey } from '../types/index.ts';
import { executeBattle } from './battle.ts';
import { createBattleRngSourceForTesting, getBattleRngVersion } from './battleKernel.ts';
import { BATTLE_PROTOCOL_VERSION } from './generated/battleProtocol.generated.ts';

export type BattleSeed = bigint;

export type BattleEngineInput = {
  party: Party;
  enemy: EnemyDef;
  bags: GameBags;
  initialPartyHp?: number;
  environment?: { terrainEffect?: TerrainEffectKey | null };
};

export type BattleEngineMetadata = {
  protocolVersion: number;
  rngVersion: number;
  seedHex: string;
  randomDrawCount: number;
};

export type SeededBattleEngineResult = ReturnType<typeof executeBattle> & {
  engineMetadata: BattleEngineMetadata;
};

function normalizeSeed(seed: bigint): bigint {
  return BigInt.asUintN(64, seed);
}

export function formatBattleSeed(seed: bigint): string {
  return normalizeSeed(seed).toString(16).padStart(16, '0');
}

export function createBattleSeed(): BattleSeed {
  const values = new Uint32Array(2);
  globalThis.crypto.getRandomValues(values);
  return (BigInt(values[1]!) << 32n) | BigInt(values[0]!);
}

/**
 * Seeded full-battle validation entry point. Production callers continue to use
 * executeBattle until the one-call C++ coordinator is complete.
 */
export function runBattle(input: BattleEngineInput, seed: BattleSeed): SeededBattleEngineResult {
  const normalizedSeed = normalizeSeed(seed);
  const random = createBattleRngSourceForTesting(normalizedSeed);
  const originalRandom = Math.random;
  let randomDrawCount = 0;
  Math.random = () => {
    randomDrawCount += 1;
    return random();
  };
  try {
    const result = executeBattle(
      structuredClone(input.party),
      structuredClone(input.enemy),
      structuredClone(input.bags),
      input.initialPartyHp,
      input.environment ? structuredClone(input.environment) : undefined,
    );
    return {
      ...result,
      engineMetadata: {
        protocolVersion: BATTLE_PROTOCOL_VERSION,
        rngVersion: getBattleRngVersion(),
        seedHex: formatBattleSeed(normalizedSeed),
        randomDrawCount,
      },
    };
  } finally {
    Math.random = originalRandom;
  }
}
