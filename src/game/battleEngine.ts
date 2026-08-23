import type { EnemyDef, GameBags, Party, TerrainEffectKey } from '../types/index.ts';
import { executeBattleWithSeed } from './battle.ts';
import { getBattleRngVersion } from './battleKernel.ts';
import { formatBattleSeed, requireBattleSeed, type BattleReplayMetadata } from './battleReplay.ts';
import { acquireBattleSeed } from './battleSeedSource.ts';

export type BattleSeed = bigint;

export type BattleEngineInput = {
  party: Party;
  enemy: EnemyDef;
  bags: GameBags;
  initialPartyHp?: number;
  environment?: { terrainEffect?: TerrainEffectKey | null };
};

export type BattleEngineMetadata = BattleReplayMetadata;

export type SeededBattleEngineResult = ReturnType<typeof executeBattleWithSeed> & {
  engineMetadata: BattleEngineMetadata;
};

export function createBattleSeed(): BattleSeed {
  return acquireBattleSeed();
}

/** Explicit deterministic replay through native seeded execution. */
export function runBattle(input: BattleEngineInput, seed: BattleSeed): SeededBattleEngineResult {
  const validatedSeed = requireBattleSeed(seed);
  const result = executeBattleWithSeed(
    structuredClone(input.party), structuredClone(input.enemy), structuredClone(input.bags),
    validatedSeed, getBattleRngVersion(), input.initialPartyHp,
    input.environment ? structuredClone(input.environment) : undefined,
  );
  return { ...result, engineMetadata: result.replayMetadata };
}

export { formatBattleSeed };
