import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AURIFEROUS_REWARD_HANDLER_ORDER,
  drawAuriferousNarrationFact,
  getAuriferousLevel,
  resolveAuriferousRewardEffect,
} from '../src/game/expeditionEffects/auriferousEffect.ts';

test('Auriferous reward preparation has an explicit stable handler order', () => {
  assert.deepEqual(AURIFEROUS_REWARD_HANDLER_ORDER, ['core:auriferous']);
});

test('Auriferous selects the highest active level without changing its fixed formula', () => {
  assert.equal(getAuriferousLevel([
    { id: 'auriferous', level: 1 },
    { id: 'other', level: 9 },
    { id: 'auriferous', level: 3 },
  ]), 3);
  assert.equal(resolveAuriferousRewardEffect({
    actorName: 'Enemy',
    abilities: [{ id: 'auriferous', level: 1 }],
    totalHitsReceived: 29,
  })?.bonusRolls, 2);
});

test('inactive Auriferous emits no effect and consumes no narration draw', () => {
  const effect = resolveAuriferousRewardEffect({
    actorName: 'Enemy',
    abilities: [{ id: 'auriferous', level: 0 }],
    totalHitsReceived: 100,
  });
  assert.equal(effect, null);
});

test('active Auriferous retains its log fact and one draw even below ten hits', () => {
  const effect = resolveAuriferousRewardEffect({
    actorName: 'Enemy',
    abilities: [{ id: 'auriferous', level: 1 }],
    totalHitsReceived: 9,
  });
  assert.ok(effect);
  let draws = 0;
  const fact = drawAuriferousNarrationFact(effect, () => {
    draws += 1;
    return 0.999;
  });
  assert.equal(draws, 1);
  assert.deepEqual(fact, {
    actorName: 'Enemy',
    totalHitsReceived: 9,
    bonusRolls: 0,
    flavorIndex: 9,
  });
});
