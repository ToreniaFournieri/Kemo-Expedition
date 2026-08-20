import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertBattleShadowSnapshots,
  BattleShadowMismatchError,
  type BattleEngineShadowSnapshot,
  type BattleShadowCategory,
} from '../../src/game/battleShadow.ts';

const baseSnapshot = (): BattleEngineShadowSnapshot => ({
  randomTrace: [0.1, 0.2],
  abilityState: {
    partyAbilities: [{ characterId: 1, abilities: [{ id: 'rage', level: 1 }] }],
    enemyAbilities: [{ id: 'focus', level: 1 }],
  },
  result: {
    partyHp: 90,
    enemyHp: 40,
    outcome: 'victory',
    log: [{ phase: 'combat', actor: 'character', action: 'hit', damage: 12 }],
    updatedBags: {
      physicalThreatBag: { entries: [{ id: 1, tickets: 2 }] },
      magicalThreatBag: { entries: [{ id: 2, tickets: 3 }] },
    },
    enemyHitsReceived: 1,
  },
});

function expectCategory(category: BattleShadowCategory, mutate: (snapshot: BattleEngineShadowSnapshot) => void): void {
  const reference = baseSnapshot();
  const candidate = structuredClone(reference);
  mutate(candidate);
  assert.throws(
    () => assertBattleShadowSnapshots(reference, candidate),
    (error) => error instanceof BattleShadowMismatchError && error.category === category,
  );
}

test('shadow mode rejects random draw count and order drift', () => {
  expectCategory('random-draw-count', snapshot => { snapshot.randomTrace.push(0.3); });
  expectCategory('random-draw-order', snapshot => { snapshot.randomTrace.reverse(); });
});

test('shadow mode rejects HP/outcome, ability, threat-bag, and event drift', () => {
  expectCategory('hp-outcome', snapshot => { snapshot.result.partyHp += 1; });
  expectCategory('ability-state', snapshot => { snapshot.abilityState.enemyAbilities[0]!.level += 1; });
  expectCategory('threat-bags', snapshot => { snapshot.result.updatedBags.physicalThreatBag.entries[0]!.tickets -= 1; });
  expectCategory('events', snapshot => { snapshot.result.log[0]!.damage = 13; });
  expectCategory('events', snapshot => { snapshot.result.log.push({ phase: 'end', actor: 'effect', action: 'late' }); });
});
