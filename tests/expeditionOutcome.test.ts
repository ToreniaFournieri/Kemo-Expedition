import assert from 'node:assert/strict';
import test from 'node:test';
import type { Item } from '../src/types/index.ts';
import {
  getCanonicalClearGateOutcome,
  resolveExpeditionOutcome,
} from '../src/game/expeditionEffects/expeditionOutcome.ts';
import {
  getClearGateRequired,
  getEliteGateKey,
  getGodsBattleProgressKey,
} from '../src/game/clearGateCore.ts';

const BOSS_RARE = { id: 1401 } as Item;

function resolve(overrides: Partial<Parameters<typeof resolveExpeditionOutcome>[0]> = {}) {
  return resolveExpeditionOutcome({
    finalOutcome: 'Escape',
    endedWithDrawRetreat: false,
    isGodsBattle: false,
    dungeonId: 1,
    recoveredItems: [],
    clearGateProgress: {},
    clearGateStatus: {},
    defeatedBossExpeditions: {},
    ...overrides,
  });
}

test('runtime outcomes map to the five canonical Clear-Gate outcomes', () => {
  assert.equal(getCanonicalClearGateOutcome('Clear', false), 'Clear');
  assert.equal(getCanonicalClearGateOutcome('Escape', false), 'Turned_Back');
  assert.equal(getCanonicalClearGateOutcome('Defeat', false), 'Defeat');
  assert.equal(getCanonicalClearGateOutcome('Retreat', true), 'Draw_Retreat');
  assert.equal(getCanonicalClearGateOutcome('Retreat', false), 'Wounded_Retreat');
});

test('a successful return unlocks the active gate and reports the transition once', () => {
  const gateKey = getEliteGateKey(1, 1);
  const required = getClearGateRequired(gateKey);
  const result = resolve({ clearGateProgress: { [String(gateKey)]: required - 1 } });
  assert.equal(result.canonicalGateOutcome, 'Turned_Back');
  assert.equal(result.clearGateProgress[String(gateKey)], required);
  assert.equal(result.clearGateStatus[gateKey], true);
  assert.equal(result.evaluatedGateKey, gateKey);
  assert.equal(result.newlyUnlockedGateKey, gateKey);
});

test('defeat neither counts recovered Boss Rare items nor preserves the active streak', () => {
  const gateKey = getEliteGateKey(1, 1);
  const result = resolve({
    finalOutcome: 'Defeat',
    recoveredItems: [BOSS_RARE],
    clearGateProgress: { [String(gateKey)]: 4 },
  });
  assert.equal(result.clearGateProgress[String(gateKey)], 0);
  assert.equal(result.clearGateProgress[getGodsBattleProgressKey(1)], undefined);
});

test('a normal clear records the defeated dungeon while evaluating its next gate', () => {
  const gateKey = getEliteGateKey(2, 1);
  const result = resolve({ finalOutcome: 'Clear', dungeonId: 2 });
  assert.equal(result.defeatedBossExpeditions[2], true);
  assert.equal(result.clearGateProgress[String(gateKey)], 1);
});

test('a cleared Gods Battle resets its Boss Rare gate without changing normal gates', () => {
  const gateKey = getEliteGateKey(1, 1);
  const godKey = getGodsBattleProgressKey(1);
  const result = resolve({
    finalOutcome: 'Clear',
    isGodsBattle: true,
    recoveredItems: [BOSS_RARE],
    clearGateProgress: { [String(gateKey)]: 3, [godKey]: 2 },
  });
  assert.equal(result.clearGateProgress[String(gateKey)], 3);
  assert.equal(result.clearGateProgress[godKey], 0);
  assert.equal(result.evaluatedGateKey, null);
  assert.equal(result.newlyUnlockedGateKey, null);
  assert.equal(result.defeatedBossExpeditions[1], undefined);
});

test('a non-defeat Gods Battle retains recovered Boss Rare progress', () => {
  const godKey = getGodsBattleProgressKey(1);
  const result = resolve({
    finalOutcome: 'Retreat',
    isGodsBattle: true,
    recoveredItems: [BOSS_RARE],
    clearGateProgress: { [godKey]: 2 },
  });
  assert.equal(result.clearGateProgress[godKey], 3);
});
