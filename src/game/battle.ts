import type { ComputedPartyStats, EnemyDef, GameBags, Party, TerrainEffectKey } from '../types/index.ts';
import {
  executeBattleCandidateFromWindow,
  type BattleCandidateResult,
} from './battleCandidate.ts';
import {
  BATTLE_RANDOM_TAPE_CAPACITY,
  reserveGameplayRandomTape,
} from './gameplayRandom.ts';

export type BattleEnvironment = { terrainEffect?: TerrainEffectKey | null };
export type BattleResult = BattleCandidateResult;

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
  const reservation = reserveGameplayRandomTape(BATTLE_RANDOM_TAPE_CAPACITY);
  let committed = false;
  try {
    const execution = executeBattleCandidateFromWindow(
      party,
      enemy,
      bags,
      reservation.tape,
      initialPartyHp,
      environment,
    );
    // Rendering and validation completed. This is the sole commit point; every
    // earlier failure retains the entire attempted prefix.
    reservation.commit(execution.randomConsumed);
    committed = true;
    telemetry = {
      battles: telemetry.battles + 1,
      randomConsumed: telemetry.randomConsumed + execution.randomConsumed,
      maxRandomConsumed: Math.max(telemetry.maxRandomConsumed, execution.randomConsumed),
      maxSemanticEvents: Math.max(telemetry.maxSemanticEvents, execution.eventCount),
    };
    return execution.result;
  } finally {
    if (!committed) reservation.rollback();
  }
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
