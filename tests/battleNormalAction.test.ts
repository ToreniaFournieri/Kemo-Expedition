import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveNormalActionDamage,
  resolveNormalActionSpecialMagic,
  resolveNormalActionTarget,
} from '../src/game/battleNormalAction.ts';

test('stateful C++ normal actions combine elemental multipliers, hits, and resonance', () => {
  const resolution = resolveNormalActionDamage({
    attackType: 'magical',
    attempts: 3,
    attack: 100,
    effectiveDefense: 20,
    multipliers: [1.2, 1, 1.5, 0.5, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    opponentMaxHp: 1_000,
    actorAccuracyPotency: 1,
    actorAccuracyBonus: 0,
    opponentEvasionBonus: 0,
    opponentDeflectionLevel: 0,
    actorFocusLevel: 0,
    actorArcaneStabilityLevel: 0,
    resonanceLevel: 2,
    elementalOffense: 'fire',
    elementalOffenseValue: 1.5,
    elementalResistance: 0.5,
  }, () => 0);

  assert.equal(resolution.perHitDamage, 72);
  assert.equal(resolution.hits, 3);
  assert.equal(resolution.damage, 72 + 77 + 82);
  assert.equal(resolution.randomConsumed, 3);
});

test('guaranteed-hit domains consume no normal-action random values', () => {
  let draws = 0;
  const resolution = resolveNormalActionDamage({
    attackType: 'ranged',
    attempts: 4,
    attack: 1,
    effectiveDefense: 100,
    multipliers: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    opponentMaxHp: 1_000,
    actorAccuracyPotency: 0,
    actorAccuracyBonus: 0,
    opponentEvasionBonus: 1,
    opponentDeflectionLevel: 2,
    actorFocusLevel: 0,
    actorArcaneStabilityLevel: 0,
    elementalOffense: 'none',
    elementalOffenseValue: 1,
    elementalResistance: 1,
    terrainEffect: 'terrain.sniper-domain',
  }, () => {
    draws += 1;
    return 1;
  });

  assert.equal(draws, 0);
  assert.equal(resolution.hits, 4);
  assert.equal(resolution.damage, 4);
});

test('C++ applies normal-action elemental terrain rules', () => {
  const resolution = resolveNormalActionDamage({
    attackType: 'magical',
    attempts: 1,
    attack: 100,
    effectiveDefense: 0,
    multipliers: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    opponentMaxHp: 1_000,
    actorAccuracyPotency: 1,
    actorAccuracyBonus: 0,
    opponentEvasionBonus: 0,
    opponentDeflectionLevel: 0,
    actorFocusLevel: 0,
    actorArcaneStabilityLevel: 0,
    elementalOffense: 'thunder',
    elementalOffenseValue: 1,
    elementalResistance: 1,
    terrainEffect: 'terrain.thunderstorm',
  }, () => 0);

  assert.equal(resolution.perHitDamage, 150);
  assert.equal(resolution.damage, 150);
});

test('C++ targeting owns Bulwark redirects and antagonism fallback', () => {
  const candidates = [
    { id: 1, row: 1, bulwarkLevel: 1 },
    { id: 2, row: 2, bulwarkLevel: 0 },
    { id: 3, row: 4, bulwarkLevel: 0 },
  ];
  assert.deepEqual(
    resolveNormalActionTarget(2, candidates, { attackType: 'ranged' }),
    { targetId: 1, targetRow: 2, randomConsumed: 0, threatBag: [] },
  );
  assert.deepEqual(
    resolveNormalActionTarget(2, candidates, { attackType: 'melee' }),
    { targetId: 2, targetRow: 2, randomConsumed: 0, threatBag: [] },
  );
  assert.deepEqual(
    resolveNormalActionTarget(6, candidates, {
      attackType: 'magical',
      fallbackToRandomCandidate: true,
      random: () => 0.8,
    }),
    { targetId: 3, targetRow: 6, randomConsumed: 1, threatBag: [] },
  );
  assert.deepEqual(
    resolveNormalActionTarget(0, candidates, {
      attackType: 'ranged',
      threatBag: [{ id: 1, tickets: 1 }, { id: 2, tickets: 1 }],
      random: () => 0.75,
    }),
    {
      targetId: 1,
      targetRow: 2,
      randomConsumed: 1,
      threatBag: [{ id: 1, tickets: 1 }, { id: 2, tickets: 0 }],
    },
  );
});

test('C++ resolves special-magic priority and state deltas', () => {
  assert.deepEqual(
    resolveNormalActionSpecialMagic([
      { id: 'mana_break', level: 1 },
      { id: 'armor_break', level: 1 },
      { id: 'gravity_well', level: 1 },
    ], 20, 101),
    { specialMagic: 'gravity_well', damage: 40, defenseMultiplier: 1 },
  );
  assert.deepEqual(
    resolveNormalActionSpecialMagic([{ id: 'armor_break', level: 1 }], 12, 101),
    { specialMagic: 'armor_break', damage: 0, defenseMultiplier: 4 / 3 },
  );
  assert.deepEqual(
    resolveNormalActionSpecialMagic([{ id: 'mana_break', level: 1 }], 9, 101),
    { specialMagic: null, damage: 0, defenseMultiplier: 1 },
  );
});
