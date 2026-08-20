import { BATTLE_KERNEL_WASM } from './battleKernelBinary.ts';
import type { AttackType, TerrainEffectKey } from '../types';

const ABI_VERSION = 1;

type KernelExports = WebAssembly.Exports & {
  memory: WebAssembly.Memory;
  battle_kernel_abi_version(): number;
  battle_calculate_per_hit_damage(...values: number[]): number;
  battle_hit_chance(...values: number[]): number;
  battle_hit_random_buffer(): number;
  battle_hit_result_buffer(): number;
  battle_resolve_hit_sequence(...values: number[]): number;
  battle_apply_domain_damage_override(...values: number[]): number;
};

const module = new WebAssembly.Module(BATTLE_KERNEL_WASM);
const kernel = new WebAssembly.Instance(module, {}).exports as KernelExports;
if (kernel.battle_kernel_abi_version() !== ABI_VERSION) {
  throw new Error('Unsupported C++ battle kernel ABI');
}

export function calculatePerHitDamage(
  attack: number,
  effectiveDefense: number,
  multipliers: readonly [number, number, number, number, number, number, number, number, number, number, number, number, number],
): number {
  return kernel.battle_calculate_per_hit_damage(attack, effectiveDefense, ...multipliers);
}

export function calculateHitChance(params: {
  actorAccuracyPotency: number;
  actorAccuracyBonus: number;
  opponentEvasionBonus: number;
  nthHit: number;
  phase: AttackType;
  opponentDeflectionLevel: number;
  actorFocusLevel: number;
  actorArcaneStabilityLevel: number;
  terrainEffect?: TerrainEffectKey | null;
  actorHasTrueSight?: boolean;
}): number {
  const attackType = params.phase === 'ranged' ? 0 : params.phase === 'magical' ? 1 : 2;
  const terrainModifier = params.phase !== 'ranged'
    ? 0
    : params.terrainEffect === 'terrain.fog' && !params.actorHasTrueSight
      ? -25
      : params.terrainEffect === 'terrain.sunny-beach' ? 20 : 0;
  return kernel.battle_hit_chance(
    params.actorAccuracyPotency,
    params.actorAccuracyBonus,
    params.opponentEvasionBonus,
    params.nthHit,
    attackType,
    params.opponentDeflectionLevel,
    params.actorFocusLevel,
    params.actorArcaneStabilityLevel,
    terrainModifier,
  );
}

type HitSequenceParams = Parameters<typeof calculateHitChance>[0] & {
  actorHasDomainBreaker?: boolean;
  opponentHasDomainBreaker?: boolean;
};

export function resolveHitSequence(
  params: HitSequenceParams,
  hitCount: number,
  random: () => number = Math.random,
): Uint8Array {
  const normalizedHitCount = Math.max(0, Math.trunc(hitCount));
  const resolved = new Uint8Array(normalizedHitCount);
  if (normalizedHitCount === 0) return resolved;
  const domainGuaranteesHit = !params.actorHasDomainBreaker
    && !params.opponentHasDomainBreaker
    && ((params.phase === 'ranged' && params.terrainEffect === 'terrain.sniper-domain')
      || (params.phase === 'magical' && params.terrainEffect === 'terrain.spell-domain')
      || (params.phase === 'melee' && params.terrainEffect === 'terrain.duelist-domain'));
  if (domainGuaranteesHit) {
    resolved.fill(1);
    return resolved;
  }

  const attackType = params.phase === 'ranged' ? 0 : params.phase === 'magical' ? 1 : 2;
  const terrainModifier = params.phase !== 'ranged'
    ? 0
    : params.terrainEffect === 'terrain.fog' && !params.actorHasTrueSight
      ? -25
      : params.terrainEffect === 'terrain.sunny-beach' ? 20 : 0;
  const randomBufferPointer = kernel.battle_hit_random_buffer();
  const resultBufferPointer = kernel.battle_hit_result_buffer();
  const capacity = 4096;

  for (let offset = 0; offset < normalizedHitCount; offset += capacity) {
    const chunkSize = Math.min(capacity, normalizedHitCount - offset);
    const rolls = new Float64Array(kernel.memory.buffer, randomBufferPointer, chunkSize);
    for (let index = 0; index < chunkSize; index += 1) rolls[index] = random();
    const hitTotal = kernel.battle_resolve_hit_sequence(
      params.actorAccuracyPotency,
      params.actorAccuracyBonus,
      params.opponentEvasionBonus,
      offset + 1,
      chunkSize,
      attackType,
      params.opponentDeflectionLevel,
      params.actorFocusLevel,
      params.actorArcaneStabilityLevel,
      terrainModifier,
    );
    if (hitTotal < 0) throw new Error('C++ battle kernel rejected hit sequence');
    resolved.set(
      new Uint8Array(kernel.memory.buffer, resultBufferPointer, chunkSize),
      offset,
    );
  }
  return resolved;
}

export function applyDomainDamageOverride(
  perHitDamage: number,
  terrainEffect: string | null | undefined,
  opponentMaxHp: number,
  domainIsIgnored: boolean,
): number {
  const terrainMode = terrainEffect === 'terrain.floor-domain'
    ? 1
    : terrainEffect === 'terrain.cap-domain' ? 2 : 0;
  return kernel.battle_apply_domain_damage_override(
    perHitDamage,
    terrainMode,
    opponentMaxHp,
    domainIsIgnored ? 1 : 0,
  );
}

export function getBattleKernelAbiVersion(): number {
  return kernel.battle_kernel_abi_version();
}
