import type { ComputedPartyStats, EnemyDef, GameBags, Party, TerrainEffectKey } from '../types/index.ts';
import {
  executeBattleCandidateFromSeed,
  type BattleCandidateResult,
} from './battleCandidate.ts';
import { getBattleRngVersion } from './battleKernel.ts';
import { createBattleReplayMetadata, requireBattleRngVersion, requireBattleSeed, type BattleReplayMetadata } from './battleReplay.ts';
import { acquireBattleSeed } from './battleSeedSource.ts';

export type BattleEnvironment = { terrainEffect?: TerrainEffectKey | null };
export type BattleResult = BattleCandidateResult & { replayMetadata: BattleReplayMetadata };

export type ProductionBattleTelemetry = {
  battles: number;
  randomConsumed: number;
  maxRandomConsumed: number;
  maxSemanticEvents: number;
};

let telemetry: ProductionBattleTelemetry = {
  battles: 0,
  randomConsumed: 0,
  maxRandomConsumed: 0,
  maxSemanticEvents: 0,
};

// SpecRef: 6.1.8 | Universal C++ battle kernel | deterministic production adapter
export function executeBattle(
  party: Party,
  enemy: EnemyDef,
  bags: GameBags,
  initialPartyHp?: number,
  environment: BattleEnvironment = {},
): BattleResult {
  return executeBattleWithSeed(party, enemy, bags, acquireBattleSeed(), getBattleRngVersion(), initialPartyHp, environment);
}

/** Explicit deterministic replay. The supplied seed is never normalized or wrapped. */
export function executeBattleWithSeed(
  party: Party,
  enemy: EnemyDef,
  bags: GameBags,
  seed: unknown,
  rngVersion: unknown = getBattleRngVersion(),
  initialPartyHp?: number,
  environment: BattleEnvironment = {},
): BattleResult {
  const validatedSeed = requireBattleSeed(seed);
  const validatedRngVersion = requireBattleRngVersion(rngVersion);
  const execution = executeBattleCandidateFromSeed(
    party, enemy, bags, validatedSeed, validatedRngVersion, initialPartyHp, environment,
  );
  const replayMetadata = createBattleReplayMetadata(
    execution.seed, execution.rngVersion, execution.randomConsumed,
  );
  telemetry = {
    battles: telemetry.battles + 1,
    randomConsumed: telemetry.randomConsumed + execution.randomConsumed,
    maxRandomConsumed: Math.max(telemetry.maxRandomConsumed, execution.randomConsumed),
    maxSemanticEvents: Math.max(telemetry.maxSemanticEvents, execution.eventCount),
  };
  return { ...execution.result, replayMetadata };
}

export function getProductionBattleTelemetry(): Readonly<ProductionBattleTelemetry> {
  return { ...telemetry };
}

export function resetProductionBattleTelemetryForTesting(): void {
  telemetry = { battles: 0, randomConsumed: 0, maxRandomConsumed: 0, maxSemanticEvents: 0 };
}

// Numerical display summary only; this function does not resolve mechanics.
// SpecRef: 6.1.4.1 | Function of attack | f.damage_calculation
export function calculateEnemyAttackValues(enemy: EnemyDef, _partyStats: ComputedPartyStats): string {
  return [enemy.rangedAttack, enemy.magicalAttack, enemy.meleeAttack].join('/');
}
