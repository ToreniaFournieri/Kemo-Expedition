import assert from 'node:assert/strict';
import test from 'node:test';
import { applyEnemyMeleeConversionAttack, getEnemyCyborgizationAdjustment, resolveEnemyPassiveAbilities } from '../src/game/enemyPassiveAbilities.ts';

test('upgraded enemy abilities use the new stat tiers and stop at Lv5', () => {
  const original = [{ id: 'upgrade_all_abilities' as const, level: 5 }, { id: 'cyborgization' as const, level: 1 }];
  const upgraded = resolveEnemyPassiveAbilities(original);
  assert.deepEqual(upgraded.map(ability => ability.level), [5, 5]);
  assert.equal(original[1].level, 1);
  assert.deepEqual(getEnemyCyborgizationAdjustment(upgraded[1].level), { accuracyBonus: 0.06, evasionBonus: -0.008 });
  assert.equal(applyEnemyMeleeConversionAttack(100, 200, 300, 5), 375);
  assert.equal(applyEnemyMeleeConversionAttack(100, 200, 300, 3), 325);
});
