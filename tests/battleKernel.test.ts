import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getBattleKernelAbiVersion,
  getBattleRngDoubleSequence,
  getBattleRngSequence,
  getBattleRngVersion,
  runBattleStateTestOperations,
  selectBestAutoEquipmentFillCandidate,
  selectBestAutoEquipmentUpgradeCandidate,
} from '../src/game/battleKernel.ts';

const U64_MASK = (1n << 64n) - 1n;

function splitmix64Expansion(seed: bigint): bigint[] {
  let state = BigInt.asUintN(64, seed);
  return Array.from({ length: 4 }, () => {
    state = (state + 0x9e3779b97f4a7c15n) & U64_MASK;
    let value = state;
    value = ((value ^ (value >> 30n)) * 0xbf58476d1ce4e5b9n) & U64_MASK;
    value = ((value ^ (value >> 27n)) * 0x94d049bb133111ebn) & U64_MASK;
    return (value ^ (value >> 31n)) & U64_MASK;
  });
}

test('splitmix64 expands seed zero into the retained xoshiro256** state words', () => {
  assert.deepEqual(splitmix64Expansion(0n), [
    0xe220a8397b1dcdafn,
    0x6e789e6aa1b965f4n,
    0x06c45d188009454fn,
    0xf88bb8a8724c81ecn,
  ]);
});

test('the checked-in C++ battle kernel exposes the expected ABI', () => {
  assert.equal(getBattleKernelAbiVersion(), 8);
  assert.equal(getBattleRngVersion(), 1);
});

test('C++ xoshiro256** has stable splitmix64-seeded known-answer output', () => {
  assert.deepEqual(getBattleRngSequence(0n, 5), [
    0x99ec5f36cb75f2b4n,
    0xbf6e1f784956452an,
    0x1a5f849d4933e6e0n,
    0x6aa594f1262d2d2cn,
    0xbba5ad4a1f842e59n,
  ]);
  assert.deepEqual(getBattleRngSequence(0n, 5), getBattleRngSequence(0n, 5));
  assert.notDeepEqual(getBattleRngSequence(0n, 5), getBattleRngSequence(1n, 5));
  assert.deepEqual(getBattleRngSequence(0xffff_ffff_ffff_ffffn, 5), [
    0x8f5520d52a7ead08n,
    0xc476a018caa1802dn,
    0x81de31c0d260469en,
    0xbf658d7e065f3c2fn,
    0x913593fda1bca32an,
  ]);
});

test('C++ RNG uniform doubles use the specified top-53-bit conversion', () => {
  const raw = getBattleRngSequence(0x0123456789abcdefn, 8);
  const actual = getBattleRngDoubleSequence(0x0123456789abcdefn, 8);
  const expected = raw.map(value => Number(value >> 11n) / 0x20_0000_0000_0000);
  assert.deepEqual(actual, expected);
  assert.ok(actual.every(value => value >= 0 && value < 1));
});

test('C++ auto-equipment fill ranking preserves score and legacy tie-break order', () => {
  const selected = selectBestAutoEquipmentFillCandidate([
    { index: 10, tier: 4, enhancement: 6, coreConcept: 900, superRare: 4, itemId: 4002, selectionValue: 100 },
    { index: 11, tier: 3, enhancement: 5, coreConcept: 800, superRare: 0, itemId: 3002, selectionValue: 101 },
    { index: 12, tier: 2, enhancement: 3, coreConcept: 700, superRare: 0, itemId: 2002, selectionValue: 101 },
    { index: 13, tier: 2, enhancement: 2, coreConcept: 600, superRare: 0, itemId: 2001, selectionValue: 101 },
  ]);
  assert.equal(selected, 13);
  assert.equal(selectBestAutoEquipmentFillCandidate([]), null);
});

test('C++ auto-equipment upgrade ranking preserves enhancement and core priority', () => {
  const selected = selectBestAutoEquipmentUpgradeCandidate([
    { index: 20, tier: 2, enhancement: 4, coreConcept: 900, superRare: 0, itemId: 2001 },
    { index: 21, tier: 5, enhancement: 5, coreConcept: 700, superRare: 0, itemId: 5001 },
    { index: 22, tier: 4, enhancement: 5, coreConcept: 800, superRare: 0, itemId: 4001 },
  ]);
  assert.equal(selected, 22);
  assert.equal(selectBestAutoEquipmentUpgradeCandidate([]), null);
});

test('internal mutable battle state clamps zero, nonlethal, exact-lethal, and excessive damage without i32 truncation', () => {
  const output = runBattleStateTestOperations([
    [2, 1, 1, 1, 9_000_000_000, 9_000_000_000],
    [3, 1, 0, 1],
    [3, 1, 4, 1],
    [3, 1, 8_999_999_996, 1],
    [3, 1, 1, 1],
  ]);
  assert.deepEqual([...output.slice(5, 10)], [0, 9_000_000_000, 0, 0, 0]);
  assert.deepEqual([...output.slice(10, 15)], [4, 8_999_999_996, 4, 1, 0]);
  assert.deepEqual([...output.slice(15, 20)], [8_999_999_996, 0, 9_000_000_000, 2, 1]);
  assert.deepEqual([...output.slice(20, 25)], [0, 0, 9_000_000_000, 2, 1]);
});

test('internal mutable battle state bounds healing and counts enemy hits only for applied positive damage', () => {
  const output = runBattleStateTestOperations([
    [2, 1, 1, 1, 4, 10],
    [3, 1, 3, 1],
    [4, 1, 20],
    [3, 1, -2, 1],
  ]);
  assert.equal(output[5], 3);
  assert.equal(output[10], 9);
  assert.equal(output[11], 10);
  assert.equal(output[18], 1);
});

test('internal mutable battle state handles ability caps, removal, and idempotent one-shot consumption', () => {
  const output = runBattleStateTestOperations([
    [2, 1, 0, 2, 10, 10],
    [5, 1, 41, 2],
    [7, 1, 41, 9, 5],
    [17, 1, 5, 41],
    [6, 1, 41],
    [7, 1, 41, 1, 5],
    [8, 1, 0],
    [8, 1, 0],
  ]);
  assert.equal(output[15], 5);
  assert.equal(output[20], 1);
  assert.equal(output[25], 0);
  assert.equal(output[30], 1);
  assert.equal(output[35], 0);
});

test('internal mutable battle state resets temporary modifiers and preserves scheduler, tape, and semantic-event order', () => {
  const output = runBattleStateTestOperations([
    [2, 1, 0, 3, 10, 10],
    [9, 1, 0.04, 0.07, 4 / 3, 5 / 4],
    [17, 1, 1],
    [17, 1, 3],
    [10, 1],
    [17, 1, 1],
    [17, 1, 3],
    [13, 1, 12, 2, 7],
    [14, 0, 0.25],
    [14, 0, 0.75],
    [15],
    [16, 91, 1, 2, 3],
    [16, 92, 2, 1, 4],
    [18, 1], [18, 2], [18, 3], [18, 4], [18, 5], [18, 6], [18, 7], [18, 8],
  ]);
  assert.equal(output[10], 0.04);
  assert.equal(output[15], 4 / 3);
  assert.equal(output[25], 0);
  assert.equal(output[30], 1);
  assert.equal(output[50], 0.25);
  assert.deepEqual([...output.slice(65, 105).filter((_, index) => index % 5 === 0)], [1, 2, 2, 1, 12, 7, 91, 92]);
});

test('internal mutable battle state applies repeated and competing defeat recovery in priority order', () => {
  const output = runBattleStateTestOperations([
    [2, 1, 1, 1, 0, 200],
    [5, 1, 1, 2],
    [5, 1, 2, 3],
    [11, 1, 1, 2],
    [3, 1, 2, 0],
    [11, 1, 1, 2],
    [3, 1, 62, 0],
    [11, 1, 1, 2],
  ]);
  assert.equal(output[15], 1);
  assert.equal(output[16], 2);
  assert.equal(output[25], 1);
  assert.equal(output[26], 62);
  assert.equal(output[35], 0);
});

test('internal mutable battle state reports semantic-event capacity without truncating accepted events', () => {
  const operations = Array.from({ length: 4_097 }, (_, index) => [16, index + 1, 1, 2, index]);
  const output = runBattleStateTestOperations(operations);
  assert.equal(output[(4_096 - 1) * 5], 1);
  assert.equal(output[4_096 * 5], 0);
});
