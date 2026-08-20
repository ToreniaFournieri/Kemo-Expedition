import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getRestHealPerStep,
  getRestInitialTotalSteps,
  REST_HEAL_MAX_HP_RATIO,
  REST_HEAL_MIN_HP,
} from '../src/game/restHealing.ts';

test('rest heals max(200, 2% MaxHP) per Step', () => {
  assert.equal(REST_HEAL_MIN_HP, 200);
  assert.equal(REST_HEAL_MAX_HP_RATIO, 0.02);
  assert.equal(getRestHealPerStep(5_000), 200);
  assert.equal(getRestHealPerStep(20_000), 400);
});

test('rest captures the initial total Steps needed to reach full HP', () => {
  assert.equal(getRestInitialTotalSteps(0, 5_000), 25);
  assert.equal(getRestInitialTotalSteps(19_001, 20_000), 3);
  assert.equal(getRestInitialTotalSteps(20_000, 20_000), 1);
});
