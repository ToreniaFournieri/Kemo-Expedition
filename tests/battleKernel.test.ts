import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyDomainDamageOverride,
  calculateHitChance,
  calculatePerHitDamage,
  getBattleKernelAbiVersion,
  getBattleRngDoubleSequence,
  getBattleRngSequence,
  getBattleRngVersion,
  resolveHitSequence,
  runBattleStateTestOperations,
  selectBestAutoEquipmentFillCandidate,
  selectBestAutoEquipmentUpgradeCandidate,
} from '../src/game/battleKernel.ts';

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

test('C++ per-hit damage preserves the prior JavaScript formula', () => {
  const cases = [
    [100, 20, [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]],
    [10, 20, [4.2, 1.5, 1.1, 0.7, 0.5, 1.6, 1.3, 0.85, 1.2, 0.7, 1.5, 0.9, 4 / 3]],
    [9_000_000_000, 123, [1.2, 1, 1, 0.8, 0.5, 1.4, 1.1, 1.2, 1, 1.3, 1, 1, 1]],
  ] as const;

  for (const [attack, defense, multipliers] of cases) {
    const expected = Math.max(1, Math.floor(
      (attack - defense) * multipliers.reduce((product, value) => product * value, 1),
    ));
    assert.equal(calculatePerHitDamage(attack, defense, multipliers), expected);
  }
});

test('C++ hit probability preserves focus, terrain, deflection, and stability rules', () => {
  const cases = [
    { phase: 'ranged', nthHit: 1, focus: 0, stability: 0, terrain: null, trueSight: false },
    { phase: 'ranged', nthHit: 4, focus: 2, stability: 0, terrain: 'terrain.fog', trueSight: false },
    { phase: 'ranged', nthHit: 8, focus: 1, stability: 2, terrain: 'terrain.sunny-beach', trueSight: false },
    { phase: 'magical', nthHit: 6, focus: 0, stability: 1, terrain: null, trueSight: false },
    { phase: 'melee', nthHit: 3, focus: 2, stability: 0, terrain: null, trueSight: false },
  ] as const;

  for (const entry of cases) {
    const accuracyBonus = 0.04;
    const focusMultiplier = entry.focus >= 2 ? 1.3 : entry.focus >= 1 ? 1.2 : 1;
    let effectiveAccuracy = entry.focus > 0
      ? Math.ceil((accuracyBonus * focusMultiplier + Number.EPSILON) * 1000) / 1000
      : accuracyBonus;
    if (entry.phase === 'ranged' && entry.terrain === 'terrain.fog' && !entry.trueSight) effectiveAccuracy -= 25;
    if (entry.phase === 'ranged' && entry.terrain === 'terrain.sunny-beach') effectiveAccuracy += 20;
    const decay = Math.max(0.70, Math.min(0.98, 0.90 + effectiveAccuracy - 0.03));
    const baseChance = entry.phase === 'ranged' ? 0.9 - 0.15 : 0.9;
    const stabilityFloor = entry.stability >= 2 ? 0.6 : entry.stability >= 1 ? 0.55 : 0;
    const expected = Math.max(baseChance * Math.pow(decay, entry.nthHit - 1), stabilityFloor);
    const actual = calculateHitChance({
      actorAccuracyPotency: 0.9,
      actorAccuracyBonus: accuracyBonus,
      opponentEvasionBonus: 0.03,
      nthHit: entry.nthHit,
      phase: entry.phase,
      opponentDeflectionLevel: 2,
      actorFocusLevel: entry.focus,
      actorArcaneStabilityLevel: entry.stability,
      terrainEffect: entry.terrain,
      actorHasTrueSight: entry.trueSight,
    });
    assert.ok(Math.abs(actual - expected) < 1e-12, `${entry.phase} hit ${entry.nthHit}`);
  }
});

test('C++ domain overrides preserve large numeric values without i32 truncation', () => {
  assert.equal(applyDomainDamageOverride(2, 'terrain.floor-domain', 1_000, false), 10);
  assert.equal(applyDomainDamageOverride(100, 'terrain.cap-domain', 1_000, false), 50);
  assert.equal(applyDomainDamageOverride(9_000_000_000, 'terrain.cap-domain', 1_000_000_000_000, true), 9_000_000_000);
});

test('C++ batch hit resolution preserves random order across buffer chunks', () => {
  let draws = 0;
  const sequence = resolveHitSequence({
    actorAccuracyPotency: 0.9,
    actorAccuracyBonus: 0.04,
    opponentEvasionBonus: 0.03,
    nthHit: 1,
    phase: 'magical',
    opponentDeflectionLevel: 0,
    actorFocusLevel: 0,
    actorArcaneStabilityLevel: 2,
  }, 5_000, () => {
    draws += 1;
    return draws % 2 === 0 ? 0.59 : 0.61;
  });

  assert.equal(draws, 5_000);
  assert.equal(sequence.length, 5_000);
  assert.equal(sequence[4_096], 0);
  assert.equal(sequence[4_097], 1);
});

test('guaranteed-hit domains do not consume random draws', () => {
  let draws = 0;
  const sequence = resolveHitSequence({
    actorAccuracyPotency: 0,
    actorAccuracyBonus: 0,
    opponentEvasionBonus: 1,
    nthHit: 1,
    phase: 'ranged',
    opponentDeflectionLevel: 2,
    actorFocusLevel: 0,
    actorArcaneStabilityLevel: 0,
    terrainEffect: 'terrain.sniper-domain',
  }, 12, () => {
    draws += 1;
    return 1;
  });
  assert.equal(draws, 0);
  assert.deepEqual([...sequence], Array(12).fill(1));
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
