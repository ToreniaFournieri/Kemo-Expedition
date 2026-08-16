import assert from 'node:assert/strict';
import test from 'node:test';

import { BASE_STEP_DURATION_MS } from '../src/game/progressTiming.ts';

test('the base runtime Step lasts 20 seconds', () => {
  assert.equal(BASE_STEP_DURATION_MS, 20_000);
});
