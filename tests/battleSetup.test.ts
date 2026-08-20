import assert from 'node:assert/strict';
import test from 'node:test';
import {
  prepareBattleInitiative,
  transformBattleAbilitiesForTerrain,
  type BattleSetupCombatant,
} from '../src/game/battleSetup.ts';

function combatant(
  id: number,
  kind: 'character' | 'enemy',
  row: number,
  overrides: Partial<BattleSetupCombatant> = {},
): BattleSetupCombatant {
  return {
    id,
    kind,
    row,
    rangedAttack: 0,
    magicalAttack: 0,
    meleeAttack: 0,
    rangedNoA: 0,
    magicalNoA: 0,
    meleeNoA: 0,
    abilities: [],
    ...overrides,
  };
}

test('C++ prepares terrain ability levels with caps, floors, and Defiance', () => {
  const source = [
    combatant(900, 'enemy', 0, {
      abilities: [
        { id: 'counter', level: 4 },
        { id: 'slow', level: 1 },
        { id: 'domain_breaker', level: 2 },
      ],
    }),
    combatant(1, 'character', 1, {
      abilities: [{ id: 'counter', level: 3 }, { id: 'defiance', level: 1 }],
    }),
  ];

  assert.deepEqual(
    transformBattleAbilitiesForTerrain(source, 'terrain.transcendence')
      .map(({ combatantId, abilityId, previousLevel, nextLevel }) => ({ combatantId, abilityId, previousLevel, nextLevel })),
    [
      { combatantId: 900, abilityId: 'counter', previousLevel: 4, nextLevel: 5 },
      { combatantId: 900, abilityId: 'slow', previousLevel: 1, nextLevel: 2 },
      { combatantId: 1, abilityId: 'counter', previousLevel: 3, nextLevel: 4 },
    ],
  );
  assert.deepEqual(
    transformBattleAbilitiesForTerrain(source, 'terrain.suppression')
      .map(({ combatantId, abilityId, previousLevel, nextLevel }) => ({ combatantId, abilityId, previousLevel, nextLevel })),
    [{ combatantId: 900, abilityId: 'counter', previousLevel: 4, nextLevel: 3 }],
  );
});

test('C++ expands attack capabilities and owns deterministic initiative ties', () => {
  const source = [
    combatant(900, 'enemy', 0, { rangedAttack: 10, rangedNoA: 1 }),
    combatant(1, 'character', 1, {
      rangedAttack: 10,
      rangedNoA: 1,
      abilities: [{ id: 'first_strike', level: 3 }],
    }),
    combatant(2, 'character', 4, { rangedAttack: 10, rangedNoA: 1 }),
    combatant(3, 'character', 2, {
      magicalAttack: 10,
      magicalNoA: 1,
      meleeAttack: 10,
      meleeNoA: 0,
    }),
  ];
  let draws = 0;
  const prepared = prepareBattleInitiative(source, {
    random: () => {
      draws += 1;
      return 0;
    },
  });

  assert.equal(draws, 18);
  assert.equal(prepared.randomConsumed, 18);
  assert.deepEqual(
    prepared.actions.map(({ combatantId, combatantKind, attackType, initiative, order }) => ({
      combatantId,
      combatantKind,
      attackType,
      initiative,
      order,
    })),
    [
      { combatantId: 1, combatantKind: 'character', attackType: 'ranged', initiative: 7, order: 0 },
      { combatantId: 900, combatantKind: 'enemy', attackType: 'ranged', initiative: 4, order: 1 },
      { combatantId: 2, combatantKind: 'character', attackType: 'ranged', initiative: 4, order: 2 },
      { combatantId: 3, combatantKind: 'character', attackType: 'magical', initiative: 3, order: 3 },
    ],
  );
});

test('C++ initiative preserves modifier and terrain random order', () => {
  const source = [
    combatant(900, 'enemy', 0, {
      rangedAttack: 10,
      rangedNoA: 1,
      abilities: [{ id: 'frostbite', level: 1 }],
    }),
    combatant(1, 'character', 1, {
      rangedAttack: 10,
      rangedNoA: 1,
      abilities: [
        { id: 'first_strike', level: 2 },
        { id: 'slow', level: 1 },
        { id: 'boost', level: 2 },
        { id: 'wind_rider', level: 1 },
      ],
    }),
  ];
  const tape = [0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0, 0];
  let cursor = 0;
  const prepared = prepareBattleInitiative(source, {
    terrainEffect: 'terrain.tailwind',
    fertilityInitiative: true,
    random: () => tape[cursor++]!,
  });

  assert.equal(cursor, tape.length);
  assert.deepEqual(
    prepared.actions.map(({ combatantId, initiative }) => ({ combatantId, initiative })),
    [{ combatantId: 1, initiative: 15 }, { combatantId: 900, initiative: 4 }],
  );
});
