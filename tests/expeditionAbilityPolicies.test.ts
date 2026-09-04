import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import {
  getPeddlerTravelDurationMs,
  getProphecyControlAccess,
} from '../src/game/expeditionAbilityPolicies.ts';

test('Peddler applies its exact level factors, ceiling, and minimum duration', () => {
  assert.equal(getPeddlerTravelDurationMs(15_001, 0), 15_001);
  assert.equal(getPeddlerTravelDurationMs(15_001, 1), 10_001);
  assert.equal(getPeddlerTravelDurationMs(15_001, 2), 9_001);
  assert.equal(getPeddlerTravelDurationMs(15_001, 99), 9_001);
  assert.equal(getPeddlerTravelDurationMs(1, 2), 100);
});

test('Prophecy exposes visibility at level one and bag reset at level two', () => {
  assert.deepEqual(getProphecyControlAccess(0, false), { isVisible: false, canResetBags: false });
  assert.deepEqual(getProphecyControlAccess(1, false), { isVisible: true, canResetBags: false });
  assert.deepEqual(getProphecyControlAccess(2, false), { isVisible: true, canResetBags: true });
  assert.deepEqual(getProphecyControlAccess(0, true), { isVisible: true, canResetBags: true });
});

test('presentation components delegate Peddler and Prophecy policy formulas', () => {
  const homeSource = readFileSync(resolve(process.cwd(), 'src/components/HomeScreen.tsx'), 'utf8');
  const settingSource = readFileSync(resolve(process.cwd(), 'src/components/home/tabs/SettingTab.tsx'), 'utf8');
  assert.match(homeSource, /getPeddlerTravelDurationMs\(baseDurationMs, peddlerLevel\)/);
  assert.doesNotMatch(homeSource, /peddlerLevel >= [12]/);
  assert.match(settingSource, /getProphecyControlAccess\(/);
  assert.doesNotMatch(settingSource, /prophecyLevel >= [12]/);
});
