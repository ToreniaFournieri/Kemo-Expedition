import { abilityLevelValue } from './abilityLevelScales.ts';
import type { EnemyAbility } from '../types';

const MAX_ABILITY_LEVEL = 5;
const MAX_UPGRADE_ALL_ABILITIES_BONUS = 5;

function getUpgradeAllAbilitiesBonus(level: number): number {
  return Math.max(0, Math.min(MAX_UPGRADE_ALL_ABILITIES_BONUS, Math.floor(level)));
}

export function resolveEnemyPassiveAbilities(abilities: EnemyAbility[]): EnemyAbility[] {
  const resolvedAbilities = abilities.map((ability) => ({ ...ability }));
  const upgradeBonus = getUpgradeAllAbilitiesBonus(
    resolvedAbilities.find((ability) => ability.id === 'upgrade_all_abilities')?.level ?? 0,
  );

  if (upgradeBonus <= 0) {
    return resolvedAbilities;
  }

  return resolvedAbilities.map((ability) => (
    ability.id === 'upgrade_all_abilities'
      ? ability
      : { ...ability, level: Math.min(MAX_ABILITY_LEVEL, ability.level + upgradeBonus) }
  ));
}

export function getEnemyCyborgizationAdjustment(level: number): { accuracyBonus: number; evasionBonus: number } {
  return { accuracyBonus: abilityLevelValue('cyborg_accuracy', level), evasionBonus: abilityLevelValue('cyborg_evasion', level) };
}

function getEnemyMeleeConversionRate(level: number): number {
  return abilityLevelValue('melee_conversion', level);
}

export function applyEnemyMeleeConversionAttack(
  meleeAttack: number,
  rangedAttack: number,
  magicalAttack: number,
  abilityLevel: number,
): number {
  const conversionRate = getEnemyMeleeConversionRate(abilityLevel);
  if (conversionRate <= 0) return meleeAttack;
  return meleeAttack + Math.round(rangedAttack * conversionRate) + Math.round(magicalAttack * conversionRate);
}
