import { BATTLE_KERNEL_WASM } from './battleKernelBinary.ts';
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
  if (!measurementEnabled) return;
  measuredCalls += 1;
  measuredInputBytes += inputBytes;
  measuredOutputBytes += outputBytes;
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
    if (measurementEnabled) {
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
    if (measurementEnabled) {
      measuredOutputBufferCopies += 1;
      measuredOutputBufferCopyBytes += outputByteLength;
    }
    return decodeBattleProtocolOutput(output);
  } finally {
    protocolInvocationActive = false;
  }
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
