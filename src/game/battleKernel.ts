import { BATTLE_KERNEL_WASM } from './battleKernelBinary.ts';
import type { AttackType, TerrainEffectKey } from '../types';
import { decodeBattleProtocolOutput, type BattleProtocolOutput } from './battleProtocol.ts';
import { BATTLE_PROTOCOL_VERSION } from './generated/battleProtocol.generated.ts';

const ABI_VERSION = 4;

type KernelExports = WebAssembly.Exports & {
  memory: WebAssembly.Memory;
  battle_kernel_abi_version(): number;
  battle_calculate_per_hit_damage(...values: number[]): number;
  battle_hit_chance(...values: number[]): number;
  battle_hit_random_buffer(): number;
  battle_hit_result_buffer(): number;
  battle_resolve_hit_sequence(...values: number[]): number;
  battle_apply_domain_damage_override(...values: number[]): number;
  battle_normal_action_input_buffer(): number;
  battle_normal_action_output_buffer(): number;
  battle_normal_action_target_id_buffer(): number;
  battle_normal_action_target_row_buffer(): number;
  battle_normal_action_target_bulwark_buffer(): number;
  battle_normal_action_bag_id_buffer(): number;
  battle_normal_action_bag_ticket_buffer(): number;
  battle_normal_action_value_capacity(): number;
  battle_normal_action_target_capacity(): number;
  battle_resolve_normal_action(): number;
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

export type NormalActionKernelTarget = { id: number; row: number; bulwarkLevel: number };
export type NormalActionKernelBagEntry = { id: number; tickets: number };

export function runNormalActionKernelWithState(
  values: readonly number[],
  randomValues: readonly number[] = [],
  targets: readonly NormalActionKernelTarget[] = [],
  bagEntries: readonly NormalActionKernelBagEntry[] = [],
): { output: Float64Array; bagEntries: NormalActionKernelBagEntry[] } {

  const valueCapacity = kernel.battle_normal_action_value_capacity();
  const targetCapacity = kernel.battle_normal_action_target_capacity();
  if (values.length > valueCapacity) throw new RangeError('C++ normal-action input is too large');
  if (targets.length > targetCapacity) throw new RangeError('C++ normal-action target list is too large');
  if (bagEntries.length > targetCapacity) throw new RangeError('C++ normal-action bag is too large');
  if (randomValues.length > 4096) throw new RangeError('C++ normal-action random tape is too large');
  const input = new Float64Array(kernel.memory.buffer, kernel.battle_normal_action_input_buffer(), valueCapacity);
  input.fill(0);
  input.set(values);
  const randomBuffer = new Float64Array(kernel.memory.buffer, kernel.battle_hit_random_buffer(), randomValues.length);
  randomBuffer.set(randomValues);
  const targetIds = new Uint32Array(kernel.memory.buffer, kernel.battle_normal_action_target_id_buffer(), targetCapacity);
  const targetRows = new Uint32Array(kernel.memory.buffer, kernel.battle_normal_action_target_row_buffer(), targetCapacity);
  const targetBulwark = new Uint32Array(kernel.memory.buffer, kernel.battle_normal_action_target_bulwark_buffer(), targetCapacity);
  targetIds.fill(0);
  targetRows.fill(0);
  targetBulwark.fill(0);
  targets.forEach((target, index) => {
    targetIds[index] = target.id;
    targetRows[index] = target.row;
    targetBulwark[index] = target.bulwarkLevel;
  });
  const bagIds = new Uint32Array(kernel.memory.buffer, kernel.battle_normal_action_bag_id_buffer(), targetCapacity);
  const bagTickets = new Uint32Array(kernel.memory.buffer, kernel.battle_normal_action_bag_ticket_buffer(), targetCapacity);
  bagIds.fill(0);
  bagTickets.fill(0);
  bagEntries.forEach((entry, index) => {
    bagIds[index] = entry.id;
    bagTickets[index] = entry.tickets;
  });
  const status = kernel.battle_resolve_normal_action();
  if (status !== 0) throw new Error(`C++ normal-action resolver rejected input (${status})`);
  return {
    output: new Float64Array(
      new Float64Array(kernel.memory.buffer, kernel.battle_normal_action_output_buffer(), valueCapacity),
    ),
    bagEntries: bagEntries.map((entry, index) => ({ id: entry.id, tickets: bagTickets[index]! })),
  };
}

export function runNormalActionKernel(
  values: readonly number[],
  randomValues: readonly number[] = [],
  targets: readonly NormalActionKernelTarget[] = [],
): Float64Array {
  return runNormalActionKernelWithState(values, randomValues, targets).output;
}

export function getBattleKernelAbiVersion(): number {
  return kernel.battle_kernel_abi_version();
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
