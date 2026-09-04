import assert from 'node:assert/strict';
import test from 'node:test';

import { getTimeSpeedScale, type DebugSettings } from '../src/game/debugSettings.ts';

const settings = (timeSpeed: DebugSettings['timeSpeed']): DebugSettings => ({
  runtimeDiagnosticsEnabled: false,
  clairvoyanceEnabled: false,
  timeSpeed,
  godsBattleCondition: 'normal',
  godStrength: 'normal',
  jewelShopOpen: false,
  displayCondition: false,
  displayAfkDuration: false,
  colosseumEnabled: false,
  displayAllBestiary: false,
  displayAllCompendium: false,
  displayAllGlossary: false,
});

const assertScale = (actual: number, expected: number) => {
  assert.ok(Math.abs(actual - expected) < Number.EPSILON);
};

test('Progress Report bonus multiplies the currently selected time speed', () => {
  assertScale(getTimeSpeedScale(settings('realtime'), true), 1 / 1.2);
  assertScale(getTimeSpeedScale(settings('x5'), true), 1 / 6);
  assertScale(getTimeSpeedScale(settings('x20'), true), 1 / 24);
  assertScale(getTimeSpeedScale(settings('x100'), true), 1 / 120);
});

test('base Debug-pane speeds remain unchanged without a report bonus', () => {
  assert.equal(getTimeSpeedScale(settings('realtime')), 1);
  assert.equal(getTimeSpeedScale(settings('x5')), 1 / 5);
  assert.equal(getTimeSpeedScale(settings('x20')), 1 / 20);
  assert.equal(getTimeSpeedScale(settings('x100')), 1 / 100);
});

test('Unlimited time remains unlimited when the report bonus is active', () => {
  assert.equal(getTimeSpeedScale(settings('unlimited'), true), 0);
});
