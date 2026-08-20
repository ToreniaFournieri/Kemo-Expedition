import { BATTLE_KERNEL_WASM } from './battleKernelBinary.ts';
import type { AttackType, TerrainEffectKey } from '../types';
import { decodeBattleProtocolOutput, type BattleProtocolOutput } from './battleProtocol.ts';
import { BATTLE_PROTOCOL_VERSION } from './generated/battleProtocol.generated.ts';

const ABI_VERSION = 4;

type KernelExports = WebAssembly.Exports & {
  memory: WebAssembly.Memory;
  battle_kernel_abi_version(): number;
  equipment_candidate_int_buffer(): number;
  equipment_candidate_score_buffer(): number;
  equipment_candidate_capacity(): number;
  equipment_select_best_fill_candidate(candidateCount: number): number;
  equipment_select_best_upgrade_candidate(candidateCount: number): number;
  battle_calculate_per_hit_damage(...values: number[]): number;
  battle_hit_chance(...values: number[]): number;
  battle_hit_random_buffer(): number;
  battle_hit_result_buffer(): number;
  battle_resolve_hit_sequence(...values: number[]): number;
  battle_apply_domain_damage_override(...values: number[]): number;
  battle_protocol_input_arena(): number;
  battle_protocol_output_arena(): number;
  battle_protocol_arena_capacity(): number;
  battle_protocol_version(): number;
  battle_protocol_validate_input(byteLength: number): number;
  battle_protocol_probe(byteLength: number): number;
  battle_protocol_transform_abilities(byteLength: number): number;
  battle_protocol_initiative_random_count(byteLength: number): number;
  battle_protocol_prepare_initiative(byteLength: number): number;
};

const module = new WebAssembly.Module(BATTLE_KERNEL_WASM);
const kernel = new WebAssembly.Instance(module, {}).exports as KernelExports;
if (kernel.battle_kernel_abi_version() !== ABI_VERSION) {
  throw new Error('Unsupported C++ battle kernel ABI');
}
if (kernel.battle_protocol_version() !== BATTLE_PROTOCOL_VERSION) {
  throw new Error('Unsupported C++ battle protocol version');
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

export type EquipmentRankingCandidate = {
  index: number;
  tier: number;
  enhancement: number;
  coreConcept: number;
  superRare: number;
  itemId: number;
  selectionValue?: number;
};

const EQUIPMENT_CANDIDATE_STRIDE = 6;

function selectBestEquipmentCandidate(
  candidates: readonly EquipmentRankingCandidate[],
  operation: (candidateCount: number) => number,
): number | null {
  if (candidates.length === 0) return null;
  const capacity = kernel.equipment_candidate_capacity();
  if (candidates.length > capacity) {
    throw new RangeError(`Auto-equipment candidate count exceeds the C++ kernel capacity of ${capacity}`);
  }

  const integerValues = new Int32Array(
    kernel.memory.buffer,
    kernel.equipment_candidate_int_buffer(),
    candidates.length * EQUIPMENT_CANDIDATE_STRIDE,
  );
  const scores = new Float64Array(
    kernel.memory.buffer,
    kernel.equipment_candidate_score_buffer(),
    candidates.length,
  );
  candidates.forEach((candidate, candidateIndex) => {
    const offset = candidateIndex * EQUIPMENT_CANDIDATE_STRIDE;
    integerValues[offset] = candidate.index;
    integerValues[offset + 1] = candidate.tier;
    integerValues[offset + 2] = candidate.enhancement;
    integerValues[offset + 3] = candidate.coreConcept;
    integerValues[offset + 4] = candidate.superRare;
    integerValues[offset + 5] = candidate.itemId;
    scores[candidateIndex] = candidate.selectionValue ?? 0;
  });

  const selectedIndex = operation(candidates.length);
  if (selectedIndex === -1) return null;
  if (selectedIndex < -1) throw new Error(`C++ auto-equipment kernel rejected candidate input (${selectedIndex})`);
  return selectedIndex;
}

export function selectBestAutoEquipmentFillCandidate(
  candidates: readonly EquipmentRankingCandidate[],
): number | null {
  return selectBestEquipmentCandidate(
    candidates,
    (candidateCount) => kernel.equipment_select_best_fill_candidate(candidateCount),
  );
}

export function selectBestAutoEquipmentUpgradeCandidate(
  candidates: readonly EquipmentRankingCandidate[],
): number | null {
  return selectBestEquipmentCandidate(
    candidates,
    (candidateCount) => kernel.equipment_select_best_upgrade_candidate(candidateCount),
  );
}

export function getBattleProtocolArenaInfo(): {
  inputPointer: number;
  outputPointer: number;
  capacity: number;
} {
  return {
    inputPointer: kernel.battle_protocol_input_arena(),
    outputPointer: kernel.battle_protocol_output_arena(),
    capacity: kernel.battle_protocol_arena_capacity(),
  };
}

export function probeBattleProtocol(input: Uint8Array): BattleProtocolOutput {
  return invokeBattleProtocol(input, (byteLength) => kernel.battle_protocol_probe(byteLength));
}

function invokeBattleProtocol(
  input: Uint8Array,
  operation: (byteLength: number) => number,
): BattleProtocolOutput {
  const arena = getBattleProtocolArenaInfo();
  if (input.byteLength > arena.capacity) {
    throw new RangeError(`Battle protocol input exceeds the ${arena.capacity}-byte arena`);
  }
  new Uint8Array(kernel.memory.buffer, arena.inputPointer, input.byteLength).set(input);
  const outputByteLength = operation(input.byteLength);
  if (outputByteLength < 0) throw new Error(`C++ battle protocol rejected input (${outputByteLength})`);
  if (outputByteLength > arena.capacity) throw new Error('C++ battle protocol returned an oversized output');
  const output = new Uint8Array(outputByteLength);
  output.set(new Uint8Array(kernel.memory.buffer, arena.outputPointer, outputByteLength));
  return decodeBattleProtocolOutput(output);
}

export function transformBattleProtocolAbilities(input: Uint8Array): BattleProtocolOutput {
  return invokeBattleProtocol(input, (byteLength) => kernel.battle_protocol_transform_abilities(byteLength));
}

export function getBattleProtocolInitiativeRandomCount(input: Uint8Array): number {
  const arena = getBattleProtocolArenaInfo();
  if (input.byteLength > arena.capacity) {
    throw new RangeError(`Battle protocol input exceeds the ${arena.capacity}-byte arena`);
  }
  new Uint8Array(kernel.memory.buffer, arena.inputPointer, input.byteLength).set(input);
  const count = kernel.battle_protocol_initiative_random_count(input.byteLength);
  if (count < 0) throw new Error(`C++ battle protocol rejected initiative input (${count})`);
  return count;
}

export function prepareBattleProtocolInitiative(input: Uint8Array): BattleProtocolOutput {
  return invokeBattleProtocol(input, (byteLength) => kernel.battle_protocol_prepare_initiative(byteLength));
}
