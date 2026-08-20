import assert from 'node:assert/strict';
import test from 'node:test';

import { getFreeActionStepCount } from '../src/game/partyStateDuration.ts';

test('free action uses 40 Steps plus rounded condition divided by 10', () => {
  assert.equal(getFreeActionStepCount(-400), 0);
  assert.equal(getFreeActionStepCount(-55), 35);
  assert.equal(getFreeActionStepCount(0), 40);
  assert.equal(getFreeActionStepCount(55), 46);
  assert.equal(getFreeActionStepCount(400), 80);
});

test('free action condition input is bounded to AUTO progress limits', () => {
  assert.equal(getFreeActionStepCount(-401), 0);
  assert.equal(getFreeActionStepCount(401), 80);
  assert.equal(getFreeActionStepCount(Number.NaN), 40);
});
