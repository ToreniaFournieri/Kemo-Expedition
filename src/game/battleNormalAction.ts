import type { AttackType, ElementalOffense, TerrainEffectKey } from '../types/index.ts';
import type { SpecialMagicKey } from './magic.ts';
import { isDomainTerrainGuaranteedHit } from './domainTerrain.ts';
import { BATTLE_TERRAIN_IDS } from './generated/battleProtocol.generated.ts';
import {
  runNormalActionKernel,
  runNormalActionKernelWithState,
  type NormalActionKernelBagEntry,
  type NormalActionKernelTarget,
} from './battleKernel.ts';

const attackTypeId = (attackType: AttackType): number => (
  attackType === 'ranged' ? 0 : attackType === 'magical' ? 1 : 2
);

const domainMode = (terrainEffect: TerrainEffectKey | null | undefined): number => (
  terrainEffect === 'terrain.floor-domain' ? 1 : terrainEffect === 'terrain.cap-domain' ? 2 : 0
);

export type NormalActionDamageInput = {
  attackType: AttackType;
  attempts: number;
  firstHit?: number;
  attack: number;
  effectiveDefense: number;
  multipliers: readonly [number, number, number, number, number, number, number, number, number, number, number, number, number];
  opponentMaxHp: number;
  actorAccuracyPotency: number;
  actorAccuracyBonus: number;
  opponentEvasionBonus: number;
  opponentDeflectionLevel: number;
  actorFocusLevel: number;
  actorArcaneStabilityLevel: number;
  resonanceLevel?: number;
  elementalOffense: ElementalOffense;
  elementalOffenseValue: number;
  elementalResistance: number;
  echoDomainElementalUsageCount?: number;
  actorHasDryproof?: boolean;
  terrainEffect?: TerrainEffectKey | null;
  actorHasTrueSight?: boolean;
  actorHasDomainBreaker?: boolean;
  opponentHasDomainBreaker?: boolean;
};

export function resolveNormalActionDamage(
  input: NormalActionDamageInput,
  random: () => number = Math.random,
): { damage: number; hits: number; totalAttempts: number; randomConsumed: number; perHitDamage: number } {
  const attempts = Math.max(0, Math.trunc(input.attempts));
  const guaranteed = isDomainTerrainGuaranteedHit(
    input.attackType,
    input.terrainEffect,
    input.actorHasDomainBreaker ?? false,
    input.opponentHasDomainBreaker ?? false,
  );
  const randomValues = guaranteed ? [] : Array.from({ length: attempts }, () => random());
  const terrainModifier = input.attackType !== 'ranged'
    ? 0
    : input.terrainEffect === 'terrain.fog' && !input.actorHasTrueSight
      ? -25
      : input.terrainEffect === 'terrain.sunny-beach' ? 20 : 0;
  const values = Array(64).fill(0);
  values[0] = 1;
  values[1] = (guaranteed ? 1 : 0)
    | (input.actorHasDryproof ? 16 : 0)
    | (input.actorHasDomainBreaker ? 32 : 0);
  values[2] = attackTypeId(input.attackType);
  values[3] = attempts;
  values[4] = input.firstHit ?? 1;
  values[5] = input.attack;
  values[6] = input.effectiveDefense;
  input.multipliers.forEach((value, index) => { values[7 + index] = value; });
  values[20] = input.opponentMaxHp;
  values[21] = domainMode(input.terrainEffect);
  values[22] = input.actorHasDomainBreaker || input.opponentHasDomainBreaker ? 1 : 0;
  values[23] = input.actorAccuracyPotency;
  values[24] = input.actorAccuracyBonus;
  values[25] = input.opponentEvasionBonus;
  values[26] = input.opponentDeflectionLevel;
  values[27] = input.actorFocusLevel;
  values[28] = input.actorArcaneStabilityLevel;
  values[29] = input.resonanceLevel ?? 0;
  values[35] = randomValues.length;
  values[36] = terrainModifier;
  values[38] = input.elementalOffense === 'fire' ? 1 : input.elementalOffense === 'thunder' ? 2 : input.elementalOffense === 'ice' ? 3 : 0;
  values[39] = input.elementalResistance;
  values[40] = input.elementalOffenseValue;
  values[41] = input.terrainEffect
    ? BATTLE_TERRAIN_IDS[input.terrainEffect as keyof typeof BATTLE_TERRAIN_IDS]
    : 0;
  values[42] = input.echoDomainElementalUsageCount ?? 0;
  const output = runNormalActionKernel(values, randomValues);
  return {
    damage: output[1]!,
    hits: output[2]!,
    totalAttempts: output[3]!,
    randomConsumed: output[4]!,
    perHitDamage: output[7]!,
  };
}

export function resolveNormalActionTarget(
  targetRow: number,
  candidates: readonly NormalActionKernelTarget[],
  options: {
    attackType: AttackType;
    actorHasBulwarkBreaker?: boolean;
    fallbackToRandomCandidate?: boolean;
    threatBag?: readonly NormalActionKernelBagEntry[];
    random?: () => number;
  },
): { targetId: number | null; targetRow: number; randomConsumed: number; threatBag: NormalActionKernelBagEntry[] } {
  const random = options.random ?? Math.random;
  const sortedBag = options.threatBag ? [...options.threatBag].sort((a, b) => a.id - b.id) : [];
  const totalTickets = sortedBag.reduce((sum, entry) => sum + Math.max(0, entry.tickets), 0);
  const drawValue = sortedBag.length > 0 ? random() : null;
  let resolvedRow = targetRow;
  if (drawValue !== null) {
    const roll = Math.floor(drawValue * totalTickets) + 1;
    let cumulative = 0;
    for (const entry of sortedBag) {
      cumulative += entry.tickets;
      if (entry.tickets > 0 && roll <= cumulative) {
        resolvedRow = entry.id;
        break;
      }
    }
  }
  const needsFallback = options.fallbackToRandomCandidate
    && !candidates.some((candidate) => candidate.row === resolvedRow)
    && candidates.length > 0;
  const randomValues = [
    ...(drawValue === null ? [] : [drawValue]),
    ...(needsFallback ? [random()] : []),
  ];
  const values = Array(64).fill(0);
  values[0] = 2;
  values[1] = (options.fallbackToRandomCandidate ? 2 : 0)
    | (options.actorHasBulwarkBreaker ? 4 : 0)
    | (sortedBag.length > 0 ? 8 : 0);
  values[2] = attackTypeId(options.attackType);
  values[32] = targetRow;
  values[33] = candidates.length;
  values[37] = sortedBag.length;
  const state = runNormalActionKernelWithState(values, randomValues, candidates, sortedBag);
  const output = state.output;
  return {
    targetId: output[6] === 0 ? null : output[6]!,
    targetRow: output[9]!,
    randomConsumed: output[4]!,
    threatBag: state.bagEntries,
  };
}

export function resolveNormalActionSpecialMagic(
  abilities: ReadonlyArray<{ id: string; level: number }>,
  magicalNoA: number,
  targetHp: number,
  forceGravityWell = false,
): { specialMagic: SpecialMagicKey | null; damage: number; defenseMultiplier: number } {
  const has = (id: string): boolean => abilities.some((ability) => ability.id === id && ability.level > 0);
  const values = Array(64).fill(0);
  values[0] = 3;
  values[3] = magicalNoA;
  values[30] = (forceGravityWell || has('gravity_well') ? 1 : 0)
    | (has('armor_break') ? 2 : 0)
    | (has('mana_break') ? 4 : 0);
  values[31] = targetHp;
  const output = runNormalActionKernel(values);
  const specialMagic = output[5] === 1
    ? 'gravity_well'
    : output[5] === 2 ? 'armor_break' : output[5] === 3 ? 'mana_break' : null;
  return {
    specialMagic,
    damage: output[1]!,
    defenseMultiplier: output[8] || 1,
  };
}
