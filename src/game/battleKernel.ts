import { BATTLE_KERNEL_WASM } from './battleKernelBinary.ts';
import type { AttackType, TerrainEffectKey } from '../types';
import {
  decodeBattleProtocolOutput,
  getBattleProtocolEncodingMeasurement,
  resetBattleProtocolEncodingMeasurement,
  writeBattleProtocolInput,
  type BattleProtocolInput,
  type BattleProtocolOutput,
} from './battleProtocol.ts';
import { BATTLE_PROTOCOL_VERSION } from './generated/battleProtocol.generated.ts';

const ABI_VERSION = 8;
const RNG_VERSION = 1;

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
  battle_state_test_input_buffer(): number;
  battle_state_test_output_buffer(): number;
  battle_state_test_operation_capacity(): number;
  battle_run_state_test_operations(operationCount: number): number;
  battle_rng_version(): number;
  battle_rng_seed(seedLow: number, seedHigh: number): void;
  battle_rng_next_u64(): bigint;
  battle_rng_next_double(): number;
  battle_protocol_input_arena(): number;
  battle_protocol_output_arena(): number;
  battle_protocol_arena_capacity(): number;
  battle_protocol_version(): number;
  battle_protocol_validate_input(byteLength: number): number;
  battle_protocol_probe(byteLength: number): number;
  battle_protocol_transform_abilities(byteLength: number): number;
  battle_protocol_initiative_random_count(byteLength: number): number;
  battle_protocol_prepare_initiative(byteLength: number): number;
  battle_protocol_execute(byteLength: number): number;
};

const module = new WebAssembly.Module(BATTLE_KERNEL_WASM);
const kernel = new WebAssembly.Instance(module, {}).exports as KernelExports;
let measurementEnabled = false;
let measuredCalls = 0;
let measuredInputBytes = 0;
let measuredOutputBytes = 0;
let measuredInputArenaCopies = 0;
let measuredInputArenaCopyBytes = 0;
let measuredOutputBufferCopies = 0;
let measuredOutputBufferCopyBytes = 0;
let measurementSuppressionDepth = 0;
let protocolInvocationActive = false;

export type BattleKernelMeasurement = {
  calls: number;
  inputBytes: number;
  outputBytes: number;
  encodedInputAllocations: number;
  encodedInputAllocationBytes: number;
  inputArenaCopies: number;
  inputArenaCopyBytes: number;
  outputBufferCopies: number;
  outputBufferCopyBytes: number;
};

function recordKernelCall(inputBytes = 0, outputBytes = 0): void {
  if (!measurementEnabled || measurementSuppressionDepth > 0) return;
  measuredCalls += 1;
  measuredInputBytes += inputBytes;
  measuredOutputBytes += outputBytes;
}

/** Keeps the frozen TypeScript oracle outside shadow-candidate boundary metrics. */
export function withBattleKernelMeasurementSuppressed<T>(operation: () => T): T {
  measurementSuppressionDepth += 1;
  try {
    return operation();
  } finally {
    measurementSuppressionDepth -= 1;
  }
}

export function beginBattleKernelMeasurement(): void {
  measuredCalls = 0;
  measuredInputBytes = 0;
  measuredOutputBytes = 0;
  measuredInputArenaCopies = 0;
  measuredInputArenaCopyBytes = 0;
  measuredOutputBufferCopies = 0;
  measuredOutputBufferCopyBytes = 0;
  resetBattleProtocolEncodingMeasurement();
  measurementEnabled = true;
}

export function endBattleKernelMeasurement(): BattleKernelMeasurement {
  measurementEnabled = false;
  const encoding = getBattleProtocolEncodingMeasurement();
  return {
    calls: measuredCalls,
    inputBytes: measuredInputBytes,
    outputBytes: measuredOutputBytes,
    encodedInputAllocations: encoding.allocations,
    encodedInputAllocationBytes: encoding.bytes,
    inputArenaCopies: measuredInputArenaCopies,
    inputArenaCopyBytes: measuredInputArenaCopyBytes,
    outputBufferCopies: measuredOutputBufferCopies,
    outputBufferCopyBytes: measuredOutputBufferCopyBytes,
  };
}
if (kernel.battle_kernel_abi_version() !== ABI_VERSION) {
  throw new Error('Unsupported C++ battle kernel ABI');
}
if (kernel.battle_protocol_version() !== BATTLE_PROTOCOL_VERSION) {
  throw new Error('Unsupported C++ battle protocol version');
}
if (kernel.battle_rng_version() !== RNG_VERSION) {
  throw new Error('Unsupported C++ battle RNG version');
}

function seedKernelTestRng(seed: bigint): void {
  const normalized = BigInt.asUintN(64, seed);
  kernel.battle_rng_seed(Number(normalized & 0xffff_ffffn), Number(normalized >> 32n));
}

/** Test/diagnostic access to the versioned generator; battle execution owns separate RNG state. */
export function getBattleRngSequence(seed: bigint, count: number): bigint[] {
  if (!Number.isInteger(count) || count < 0) throw new RangeError('RNG count must be a non-negative integer');
  seedKernelTestRng(seed);
  return Array.from({ length: count }, () => BigInt.asUintN(64, kernel.battle_rng_next_u64()));
}

/** Test/diagnostic access to the exact uniform-double conversion. */
export function getBattleRngDoubleSequence(seed: bigint, count: number): number[] {
  if (!Number.isInteger(count) || count < 0) throw new RangeError('RNG count must be a non-negative integer');
  seedKernelTestRng(seed);
  return Array.from({ length: count }, () => kernel.battle_rng_next_double());
}

export function getBattleRngVersion(): number {
  return kernel.battle_rng_version();
}

/**
 * Creates an isolated-use synchronous RNG callback for seeded-engine validation.
 * The callback owns the module's diagnostic RNG state until its battle returns;
 * callers must not interleave two callbacks in the same JavaScript realm.
 */
export function createBattleRngSourceForTesting(seed: bigint): () => number {
  seedKernelTestRng(seed);
  return () => kernel.battle_rng_next_double();
}

export function calculatePerHitDamage(
  attack: number,
  effectiveDefense: number,
  multipliers: readonly [number, number, number, number, number, number, number, number, number, number, number, number, number],
): number {
  recordKernelCall();
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
  recordKernelCall();
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
    recordKernelCall(chunkSize * Float64Array.BYTES_PER_ELEMENT, chunkSize);
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
  recordKernelCall();
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
  new Float64Array(kernel.memory.buffer, kernel.battle_hit_random_buffer(), randomValues.length).set(randomValues);
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

  recordKernelCall((values.length + randomValues.length) * Float64Array.BYTES_PER_ELEMENT);
  const status = kernel.battle_resolve_normal_action();
  if (status !== 0) throw new Error(`C++ normal-action resolver rejected input (${status})`);
  return {
    output: new Float64Array(new Float64Array(kernel.memory.buffer, kernel.battle_normal_action_output_buffer(), valueCapacity)),
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

/** Test-only grouped access to the internal C++ mutable battle-state core. */
export function runBattleStateTestOperations(
  operations: readonly (readonly number[])[],
): Float64Array {
  const capacity = kernel.battle_state_test_operation_capacity();
  if (operations.length > capacity) throw new RangeError('C++ battle-state test operation list is too large');
  const stride = 8;
  const input = new Float64Array(kernel.memory.buffer, kernel.battle_state_test_input_buffer(), capacity * stride);
  input.fill(0);
  operations.forEach((operation, index) => {
    if (operation.length > stride) throw new RangeError('C++ battle-state test operation is too large');
    input.set(operation, index * stride);
  });
  const status = kernel.battle_run_state_test_operations(operations.length);
  if (status !== 0) throw new Error(`C++ battle-state test core rejected input (${status})`);
  return new Float64Array(new Float64Array(kernel.memory.buffer, kernel.battle_state_test_output_buffer(), operations.length * 5));
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

type ProtocolArenaCache = {
  buffer: ArrayBuffer;
  inputPointer: number;
  outputPointer: number;
  capacity: number;
  input: Uint8Array;
  output: Uint8Array;
};

let protocolArenaCache: ProtocolArenaCache | null = null;

function getProtocolArenaCache(): ProtocolArenaCache {
  const buffer = kernel.memory.buffer;
  if (protocolArenaCache?.buffer === buffer) return protocolArenaCache;
  const { inputPointer, outputPointer, capacity } = getBattleProtocolArenaInfo();
  if (!Number.isInteger(inputPointer) || !Number.isInteger(outputPointer) || !Number.isInteger(capacity) || capacity < 0) {
    throw new Error('C++ battle protocol returned invalid arena metadata');
  }
  if (inputPointer < 0 || outputPointer < 0 || inputPointer + capacity > buffer.byteLength || outputPointer + capacity > buffer.byteLength) {
    throw new Error('C++ battle protocol arena lies outside Wasm memory');
  }
  protocolArenaCache = {
    buffer,
    inputPointer,
    outputPointer,
    capacity,
    input: new Uint8Array(buffer, inputPointer, capacity),
    output: new Uint8Array(buffer, outputPointer, capacity),
  };
  return protocolArenaCache;
}

export function probeBattleProtocol(input: Uint8Array): BattleProtocolOutput {
  return invokeBattleProtocol(input, (byteLength) => kernel.battle_protocol_probe(byteLength));
}

function invokeBattleProtocol(
  input: Uint8Array,
  operation: (byteLength: number) => number,
): BattleProtocolOutput {
  return invokeBattleProtocolWithWriter((arena) => {
    if (input.byteLength > arena.capacity) {
      throw new RangeError(`Battle protocol input exceeds the ${arena.capacity}-byte arena`);
    }
    arena.input.subarray(0, input.byteLength).set(input);
    if (measurementEnabled && measurementSuppressionDepth === 0) {
      measuredInputArenaCopies += 1;
      measuredInputArenaCopyBytes += input.byteLength;
    }
    return input.byteLength;
  }, operation, true);
}

function invokeBattleProtocolWithWriter(
  writeInput: (arena: ProtocolArenaCache) => number,
  operation: (byteLength: number) => number,
  copyOutput: boolean,
): BattleProtocolOutput {
  if (protocolInvocationActive) throw new Error('Nested or reentrant Wasm battle protocol execution is not supported');
  protocolInvocationActive = true;
  try {
    let arena = getProtocolArenaCache();
    const inputByteLength = writeInput(arena);
    if (!Number.isInteger(inputByteLength) || inputByteLength < 0 || inputByteLength > arena.capacity) {
      throw new RangeError(`Battle protocol input exceeds the ${arena.capacity}-byte arena`);
    }
    const outputByteLength = operation(inputByteLength);
    if (!Number.isInteger(outputByteLength) || outputByteLength < 0) {
      throw new Error(`C++ battle protocol rejected input (${outputByteLength})`);
    }
    arena = getProtocolArenaCache();
    if (outputByteLength > arena.capacity) throw new Error('C++ battle protocol returned an oversized output');
    recordKernelCall(inputByteLength, outputByteLength);
    const outputView = arena.output.subarray(0, outputByteLength);
    if (!copyOutput) return decodeBattleProtocolOutput(outputView);
    const output = new Uint8Array(outputByteLength);
    output.set(outputView);
    if (measurementEnabled && measurementSuppressionDepth === 0) {
      measuredOutputBufferCopies += 1;
      measuredOutputBufferCopyBytes += outputByteLength;
    }
    return decodeBattleProtocolOutput(output);
  } finally {
    protocolInvocationActive = false;
  }
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
  recordKernelCall(input.byteLength);
  const count = kernel.battle_protocol_initiative_random_count(input.byteLength);
  if (count < 0) throw new Error(`C++ battle protocol rejected initiative input (${count})`);
  return count;
}

export function prepareBattleProtocolInitiative(input: Uint8Array): BattleProtocolOutput {
  return invokeBattleProtocol(input, (byteLength) => kernel.battle_protocol_prepare_initiative(byteLength));
}

/** One measured Wasm boundary call for the protocol-v3 shadow full-engine path. */
export function executeBattleProtocol(input: Uint8Array): BattleProtocolOutput {
  return invokeBattleProtocol(input, (byteLength) => kernel.battle_protocol_execute(byteLength));
}

/** One measured Wasm call with canonical structured input written directly into its arena. */
export function executeBattleProtocolInput(input: BattleProtocolInput): BattleProtocolOutput {
  return invokeBattleProtocolWithWriter(
    (arena) => writeBattleProtocolInput(input, arena.input),
    (byteLength) => kernel.battle_protocol_execute(byteLength),
    false,
  );
}

/** Test-only proof that cached protocol views are recreated after Wasm memory growth. */
export function growBattleProtocolMemoryForTesting(): void {
  kernel.memory.grow(1);
}
