import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isTimedTriggerSlot,
  resolvePeriodicDeityHpEffectKernel,
  resolveTimedConfusion,
  resolveTimedFormula,
  resolveTimedTerrainEffect,
  selectTimedIndex,
} from '../src/game/battleTimed.ts';

test('START and combat trigger slots are authoritative in C++', () => {
  assert.equal(isTimedTriggerSlot('oblivion', 'start', 9), true);
  assert.equal(isTimedTriggerSlot('oblivion', 'start', 8), false);
  assert.equal(isTimedTriggerSlot('regeneration', 'melee', 3), true);
  assert.equal(isTimedTriggerSlot('soul-reap', 'ranged', 2), true);
  assert.equal(isTimedTriggerSlot('soul-reap', 'magical', 2), false);
});

test('timed random selection and confusion preserve exact draw counts', () => {
  let draws = 0;
  assert.deepEqual(selectTimedIndex(4, () => { draws += 1; return 0.74; }), { index: 2, randomConsumed: 1 });
  assert.deepEqual(resolveTimedConfusion({
    attackType: 'ranged', level: 5, targetCount: 3,
    random: () => [0.8, 0.1][draws++ - 1] ?? 0,
  }), { timing: 8, targetIndex: 2, success: true, chance: 7 / 32, randomConsumed: 2 });
  const fixed = resolveTimedConfusion({ attackType: 'melee', level: 2, targetCount: 1, fixedTarget: true, random: () => 0.05 });
  assert.equal(fixed.randomConsumed, 1);
  assert.equal(fixed.success, true);
});

test('C++ computes regeneration, Soul Reap, and remaining timed formulas', () => {
  assert.deepEqual(resolveTimedFormula({ kind: 'regeneration', level: 3, currentHp: 700, maxHp: 1_000, damageTaken: 900 }), {
    value: 19, amount: 171, triggered: false,
  });
  assert.equal(resolveTimedFormula({ kind: 'soul-reap', level: 5, currentHp: 199, maxHp: 1_000 }).triggered, true);
  assert.equal(resolveTimedFormula({ kind: 'unstable-core', level: 2, currentHp: 101, maxHp: 1_000 }).amount, 25);
  assert.equal(resolveTimedFormula({ kind: 'decompose', level: 5 }).value, 2 / 7);
  assert.equal(resolveTimedFormula({ kind: 'self-destruct', level: 4, currentHp: 1_000, targetDefense: 100, targetDefenseAmplifier: 0.5 }).amount, 315);
});

test('C++ computes action terrain and END deity HP effects', () => {
  assert.deepEqual(resolveTimedTerrainEffect({
    terrainEffect: 'terrain.conduction', attackType: 'magical', elementalOffense: 'thunder',
    currentHp: 500, maxHp: 1_000, totalDamage: 999,
  }), { effect: 'conduction', damage: 49, chainDamage: 0 });
  assert.deepEqual(resolvePeriodicDeityHpEffectKernel({
    deity: 'restoration', isEliteFourthRoom: true, isGehenna: false, isRotwood: false,
    currentHp: 500, maxHp: 1_000, deityRank: 10,
  }), { hp: 605, healAmount: 105, attritionAmount: 0 });
  assert.deepEqual(resolvePeriodicDeityHpEffectKernel({
    deity: 'attrition', isEliteFourthRoom: true, isGehenna: false, isRotwood: false,
    currentHp: 101, maxHp: 1_000, deityRank: 0,
  }), { hp: 95, healAmount: 0, attritionAmount: 6 });
});
