import type { AbilityId, AttackType, ElementalOffense, TerrainEffectKey } from '../types/index.ts';
import { runNormalActionKernel } from './battleKernel.ts';
import { resolveNormalActionDamage } from './battleNormalAction.ts';

type AbilityLike = { id: string; level: number };

const attackTypeId = (attackType: AttackType): number => (
  attackType === 'ranged' ? 0 : attackType === 'magical' ? 1 : 2
);

const elementalId = (elemental: ElementalOffense): number => (
  elemental === 'fire' ? 1 : elemental === 'thunder' ? 2 : elemental === 'ice' ? 3 : 0
);

const reactionAbilityIds: readonly AbilityId[] = [
  'ice_absorb', 'fire_absorb', 'thunder_absorb', 'magical_absorb',
  'ice_null', 'fire_null', 'thunder_null', 'ranged_null', 'magical_null', 'melee_null',
  'ice_reflect', 'fire_reflect', 'thunder_reflect', 'ranged_reflect', 'magical_reflect', 'melee_reflect',
];

const abilityLevel = (abilities: readonly AbilityLike[], id: string): number => (
  abilities.reduce((level, ability) => ability.id === id ? Math.max(level, ability.level) : level, 0)
);

export function resolveDefensiveReactionKernel(
  attackType: AttackType,
  elementalOffense: ElementalOffense,
  defenderAbilities: readonly AbilityLike[],
  attackerAbilities: readonly AbilityLike[],
): { type: 'absorb' | 'nullify' | 'reflect'; abilityId: AbilityId; amplifier: number } | null {
  const values = Array(64).fill(0);
  values[0] = 4;
  values[1] = (abilityLevel(attackerAbilities, 'ice_protect_breaker') > 0 ? 1 : 0)
    | (abilityLevel(attackerAbilities, 'fire_protect_breaker') > 0 ? 2 : 0)
    | (abilityLevel(attackerAbilities, 'thunder_protect_breaker') > 0 ? 4 : 0)
    | (abilityLevel(attackerAbilities, 'm_barrier_breaker') > 0 ? 8 : 0);
  values[2] = attackTypeId(attackType);
  values[38] = elementalId(elementalOffense);
  reactionAbilityIds.forEach((id, index) => { values[43 + index] = abilityLevel(defenderAbilities, id); });
  const output = runNormalActionKernel(values);
  const type = output[5] === 1 ? 'absorb' : output[5] === 2 ? 'nullify' : output[5] === 3 ? 'reflect' : null;
  const abilityId = reactionAbilityIds[output[6]! - 1];
  return type && abilityId ? { type, abilityId, amplifier: output[8]! } : null;
}

export function applyDefensiveReactionKernel(
  sourceDamage: number,
  reaction: 'absorb' | 'nullify' | 'reflect' | null,
  amplifier: number,
  reflectionDefenseAmplifier = 1,
  reflectionElementalResistance = 1,
): { remainingDamage: number; reflectedDamage: number; absorbedDamage: number } {
  const values = Array(64).fill(0);
  values[0] = 5;
  values[1] = reaction === 'absorb' ? 1 : reaction === 'nullify' ? 2 : reaction === 'reflect' ? 3 : 0;
  values[5] = sourceDamage;
  values[8] = amplifier;
  values[11] = reflectionDefenseAmplifier;
  values[12] = reflectionElementalResistance;
  const output = runNormalActionKernel(values);
  return { remainingDamage: output[1]!, reflectedDamage: output[2]!, absorbedDamage: output[3]! };
}

export function resolveCloseReactiveEffects(input: {
  hits: number;
  damage: number;
  actorMaxHp: number;
  fireResistance: number;
  lifeDrainLevel?: number;
  burnLevel?: number;
  bindLevel?: number;
  targetHasNullLifeDrain?: boolean;
  targetHasNullBurn?: boolean;
  targetHasNullBind?: boolean;
  random?: () => number;
}): { lifeDrainHeal: number; burnDamage: number; bindTriggered: boolean; bindChance: number; randomConsumed: number } {
  const values = Array(64).fill(0);
  values[0] = 6;
  values[1] = (input.targetHasNullLifeDrain ? 16 : 0)
    | (input.targetHasNullBurn ? 32 : 0)
    | (input.targetHasNullBind ? 64 : 0);
  values[3] = input.hits;
  values[5] = input.damage;
  values[20] = input.actorMaxHp;
  values[39] = input.fireResistance;
  values[43] = input.lifeDrainLevel ?? 0;
  values[44] = input.burnLevel ?? 0;
  values[45] = input.bindLevel ?? 0;
  const shouldDraw = (input.bindLevel ?? 0) > 0 && input.hits > 0 && !input.targetHasNullBind;
  const randomValues = shouldDraw ? [(input.random ?? Math.random)()] : [];
  const output = runNormalActionKernel(values, randomValues);
  return {
    lifeDrainHeal: output[1]!,
    burnDamage: output[2]!,
    bindTriggered: output[5] === 1,
    bindChance: output[7]!,
    randomConsumed: output[4]!,
  };
}

export function resolveShockKernel(
  damage: number,
  hits: number,
  available: boolean,
  nullified: boolean,
): { damage: number; hits: number; consumed: boolean } {
  const values = Array(64).fill(0);
  values[0] = 7;
  values[1] = (available ? 1 : 0) | (nullified ? 2 : 0);
  values[3] = hits;
  values[5] = damage;
  const output = runNormalActionKernel(values);
  return { damage: output[1]!, hits: output[2]!, consumed: output[5] === 1 };
}

export function resolveReactiveProfile(
  kind: 'counter' | 'tier-two' | 're-attack',
  level: number,
): { count: number; noAMultiplier: number } {
  const values = Array(64).fill(0);
  values[0] = 8;
  values[43] = level;
  values[44] = kind === 'counter' ? 1 : kind === 'tier-two' ? 2 : 3;
  const output = runNormalActionKernel(values);
  return { count: output[3]!, noAMultiplier: output[8]! };
}

export function resolveDefeatRecoveryKernel(input: {
  maxHp: number;
  resurrectLevel: number;
  reanimateLevel: number;
  resurrectConsumed: boolean;
  reanimateConsumed: boolean;
}): { type: 'resurrect' | 'reanimate'; healAmount: number } | null {
  const values = Array(64).fill(0);
  values[0] = 9;
  values[1] = (input.resurrectConsumed ? 1 : 0) | (input.reanimateConsumed ? 2 : 0);
  values[20] = input.maxHp;
  values[43] = input.resurrectLevel;
  values[44] = input.reanimateLevel;
  const output = runNormalActionKernel(values);
  return output[5] === 1
    ? { type: 'resurrect', healAmount: output[1]! }
    : output[5] === 2 ? { type: 'reanimate', healAmount: output[1]! } : null;
}

export function resolveReactiveHitCount(input: {
  attackType: AttackType;
  attempts: number;
  actorAccuracyPotency: number;
  actorAccuracyBonus: number;
  opponentEvasionBonus: number;
  opponentDeflectionLevel: number;
  actorFocusLevel: number;
  terrainEffect?: TerrainEffectKey | null;
  actorHasTrueSight?: boolean;
  actorHasDomainBreaker?: boolean;
  opponentHasDomainBreaker?: boolean;
}): number {
  return resolveNormalActionDamage({
    ...input,
    attack: 1,
    effectiveDefense: 0,
    multipliers: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    opponentMaxHp: 1,
    actorArcaneStabilityLevel: 0,
    elementalOffense: 'none',
    elementalOffenseValue: 1,
    elementalResistance: 1,
  }).hits;
}
