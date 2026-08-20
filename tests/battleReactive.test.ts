import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  applyDefensiveReactionKernel,
  resolveCloseReactiveEffects,
  resolveDefeatRecoveryKernel,
  resolveDefensiveReactionKernel,
  resolveReactiveProfile,
  resolveShockKernel,
} from '../src/game/battleReactive.ts';

const battleSource = readFileSync(new URL('../src/game/battle.ts', import.meta.url), 'utf8');
const kernelSource = readFileSync(new URL('../native/battle_kernel.cpp', import.meta.url), 'utf8');

test('runtime reactive chains use the stateful C++ boundary', () => {
  assert.doesNotMatch(battleSource, /resolveHitSequence\(/);
  assert.match(battleSource, /resolveReactiveHitCount\(/);
  assert.match(battleSource, /resolveDefensiveReactionKernel\(/);
  assert.match(battleSource, /resolveCloseReactiveEffects\(/);
  assert.match(battleSource, /resolveDefeatRecoveryKernel\(/);
  assert.match(kernelSource, /Mode 4: defensive reaction priority/);
  assert.match(kernelSource, /Mode 9: defeat recovery priority/);
});

test('C++ owns absorb, nullification, and reflection priority with breakers', () => {
  const defender = [
    { id: 'fire_absorb', level: 3 },
    { id: 'fire_null', level: 1 },
    { id: 'fire_reflect', level: 5 },
  ];
  assert.deepEqual(
    resolveDefensiveReactionKernel('magical', 'fire', defender, []),
    { type: 'absorb', abilityId: 'fire_absorb', amplifier: 0.5 },
  );
  assert.deepEqual(
    resolveDefensiveReactionKernel('magical', 'fire', defender, [{ id: 'fire_protect_breaker', level: 1 }]),
    { type: 'nullify', abilityId: 'fire_null', amplifier: 0 },
  );
});

test('C++ applies reflection, absorption, and nullification damage deltas', () => {
  assert.deepEqual(applyDefensiveReactionKernel(101, 'reflect', 0.2, 0.5, 0.8), {
    remainingDamage: 80,
    reflectedDamage: 8,
    absorbedDamage: 0,
  });
  assert.deepEqual(applyDefensiveReactionKernel(101, 'absorb', 0.3), {
    remainingDamage: 0,
    reflectedDamage: 0,
    absorbedDamage: 30,
  });
  assert.equal(applyDefensiveReactionKernel(101, 'nullify', 0).remainingDamage, 0);
});

test('C++ resolves life drain, burn, and bind with an exact random tape', () => {
  let draws = 0;
  const result = resolveCloseReactiveEffects({
    hits: 3,
    damage: 1_000,
    actorMaxHp: 2_000,
    fireResistance: 0.5,
    lifeDrainLevel: 5,
    burnLevel: 3,
    bindLevel: 2,
    random: () => { draws += 1; return 0.1; },
  });
  assert.deepEqual(result, {
    lifeDrainHeal: 100,
    burnDamage: 36,
    bindTriggered: true,
    bindChance: 9 / 64,
    randomConsumed: 1,
  });
  assert.equal(draws, 1);
});

test('C++ resolves Shock, chain profiles, and defeat recovery priority', () => {
  assert.deepEqual(resolveShockKernel(103, 4, true, false), { damage: 25, hits: 1, consumed: true });
  assert.deepEqual(resolveShockKernel(103, 4, true, true), { damage: 103, hits: 4, consumed: true });
  assert.deepEqual(resolveReactiveProfile('counter', 3), { count: 0, noAMultiplier: 2 });
  assert.deepEqual(resolveReactiveProfile('tier-two', 1), { count: 0, noAMultiplier: 0.5 });
  assert.deepEqual(resolveReactiveProfile('re-attack', 2), { count: 1, noAMultiplier: 0.7 });
  assert.deepEqual(resolveDefeatRecoveryKernel({
    maxHp: 1_001,
    resurrectLevel: 2,
    reanimateLevel: 5,
    resurrectConsumed: false,
    reanimateConsumed: false,
  }), { type: 'resurrect', healAmount: 11 });
  assert.deepEqual(resolveDefeatRecoveryKernel({
    maxHp: 1_001,
    resurrectLevel: 2,
    reanimateLevel: 2,
    resurrectConsumed: true,
    reanimateConsumed: false,
  }), { type: 'reanimate', healAmount: 261 });
});
