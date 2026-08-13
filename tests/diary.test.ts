import assert from 'node:assert/strict';
import test from 'node:test';

import { getDiaryOutcomeTrigger } from '../src/game/diary.ts';

test('Diary defeat notification modes select the specified expedition outcomes', () => {
  assert.equal(getDiaryOutcomeTrigger('Defeat', false, 'defeatOnly'), 'defeat');
  assert.equal(getDiaryOutcomeTrigger('Retreat', true, 'defeatOnly'), null);
  assert.equal(getDiaryOutcomeTrigger('Retreat', true, 'defeatAndDraw'), 'draw');
  assert.equal(getDiaryOutcomeTrigger('Clear', false, 'defeatAndDraw'), null);
  assert.equal(getDiaryOutcomeTrigger('Retreat', true, 'defeatDrawRetreat'), 'draw');
  assert.equal(getDiaryOutcomeTrigger('Retreat', false, 'defeatDrawRetreat'), 'retreat');
  assert.equal(getDiaryOutcomeTrigger('Escape', false, 'defeatDrawRetreat'), null);
  assert.equal(getDiaryOutcomeTrigger('Clear', false, 'all'), 'victory');
  assert.equal(getDiaryOutcomeTrigger('Escape', false, 'all'), 'return');
  assert.equal(getDiaryOutcomeTrigger('Defeat', false, 'all'), 'defeat');
  assert.equal(getDiaryOutcomeTrigger('Retreat', true, 'all'), 'draw');
  assert.equal(getDiaryOutcomeTrigger('Retreat', false, 'all'), 'retreat');
  assert.equal(getDiaryOutcomeTrigger('Defeat', false, 'none'), null);
  assert.equal(getDiaryOutcomeTrigger('Clear', false, 'none'), null);
});
