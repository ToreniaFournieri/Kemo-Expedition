import type { EnemyAbility, EnemyDef } from '../types';

export const RUNTIME_GAME_MODES = ['mode.normal', 'mode.orca'] as const;
export type RuntimeGameMode = typeof RUNTIME_GAME_MODES[number];

export const DEFAULT_RUNTIME_GAME_MODE: RuntimeGameMode = 'mode.normal';
export const ORCA_ENEMY_LEVEL_OFFSET_MIN = 0;
export const ORCA_ENEMY_LEVEL_OFFSET_MAX = 20;

export function isRuntimeGameMode(value: unknown): value is RuntimeGameMode {
  return typeof value === 'string' && RUNTIME_GAME_MODES.includes(value as RuntimeGameMode);
}

export function normalizeOrcaEnemyLevelOffset(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return ORCA_ENEMY_LEVEL_OFFSET_MIN;
  return Math.max(
    ORCA_ENEMY_LEVEL_OFFSET_MIN,
    Math.min(ORCA_ENEMY_LEVEL_OFFSET_MAX, Math.floor(numeric)),
  );
}

function mergeRequiredAbility(abilities: EnemyAbility[], required: EnemyAbility): EnemyAbility[] {
  const existingIndex = abilities.findIndex((ability) => ability.id === required.id);
  if (existingIndex < 0) return [...abilities, required];
  return abilities.map((ability, index) => index === existingIndex
    ? { ...ability, level: Math.max(ability.level, required.level) }
    : ability);
}

/** Adds the two raw Orca abilities. Passive resolution subsequently upgrades First Strike 0 to 1. */
export function addOrcaEnemyAbilities(enemy: EnemyDef): EnemyDef {
  const withFirstStrike = mergeRequiredAbility(enemy.abilities, { id: 'first_strike', level: 0 });
  return {
    ...enemy,
    abilities: mergeRequiredAbility(withFirstStrike, { id: 'upgrade_all_abilities', level: 1 }),
  };
}
