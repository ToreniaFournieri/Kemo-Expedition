import assert from 'node:assert/strict';
import test from 'node:test';
import type { Item } from '../src/types/index.ts';
import { resolveSideQuestOutcome } from '../src/game/expeditionEffects/sideQuestOutcome.ts';

const item = (id: number, superRare = 0) => ({ id, superRare } as Item);

test('treasure quests count only their matching recovered reward class', () => {
  const rewards = [item(1401), item(1402, 7), item(1501, 3)];
  assert.deepEqual(resolveSideQuestOutcome({
    sideQuestType: 'q.treasure-super-rare',
    finalOutcome: 'Escape',
    rewards,
  }), { type: 'advance', amount: 2 });
  assert.deepEqual(resolveSideQuestOutcome({
    sideQuestType: 'q.treasure_boss_rare',
    finalOutcome: 'Escape',
    rewards,
  }), { type: 'advance', amount: 2 });
});

test('treasure quests do nothing when no matching item was retained', () => {
  assert.equal(resolveSideQuestOutcome({
    sideQuestType: 'q.treasure-super-rare',
    finalOutcome: 'Clear',
    rewards: [item(101)],
  }), null);
});

test('Poor Kid advances only for an expedition with no rewards', () => {
  assert.deepEqual(resolveSideQuestOutcome({
    sideQuestType: 'q.poor-kid',
    finalOutcome: 'Defeat',
    rewards: [],
  }), { type: 'advance', amount: 1 });
  assert.equal(resolveSideQuestOutcome({
    sideQuestType: 'q.poor_kid',
    finalOutcome: 'Defeat',
    rewards: [item(101)],
  }), null);
});

test('Consecutive Wins advances on Clear and resets on every other outcome', () => {
  assert.deepEqual(resolveSideQuestOutcome({
    sideQuestType: 'q.consecutive-wins',
    finalOutcome: 'Clear',
    rewards: [],
  }), { type: 'advance', amount: 1 });
  for (const finalOutcome of ['Escape', 'Retreat', 'Defeat'] as const) {
    assert.deepEqual(resolveSideQuestOutcome({
      sideQuestType: 'q.consecutive_wins',
      finalOutcome,
      rewards: [],
    }), { type: 'set', progress: 0 });
  }
});

test('Losers advances only on Defeat and unrelated quests have no outcome action', () => {
  assert.deepEqual(resolveSideQuestOutcome({
    sideQuestType: 'q.losers',
    finalOutcome: 'Defeat',
    rewards: [],
  }), { type: 'advance', amount: 1 });
  assert.equal(resolveSideQuestOutcome({
    sideQuestType: 'q.losers',
    finalOutcome: 'Clear',
    rewards: [],
  }), null);
  assert.equal(resolveSideQuestOutcome({
    sideQuestType: 'q.healing',
    finalOutcome: 'Clear',
    rewards: [],
  }), null);
});
