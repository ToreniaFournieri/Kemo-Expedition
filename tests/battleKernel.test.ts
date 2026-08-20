import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyDomainDamageOverride,
  calculateHitChance,
  calculatePerHitDamage,
  getBattleKernelAbiVersion,
  resolveHitSequence,
} from '../src/game/battleKernel.ts';

test('the checked-in C++ battle kernel exposes the expected ABI', () => {
  assert.equal(getBattleKernelAbiVersion(), 1);
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
