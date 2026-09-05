import assert from 'node:assert/strict';
import test from 'node:test';

import { formatInstantExpeditionChargeDisplay, getInstantExpeditionChargeState } from '../src/game/instantExpedition.ts';

const fullyClearedParty = {
  instantExpeditionStock: 5,
  instantExpeditionChargeStartedAt: 0,
  defeatedBossExpeditions: { 1: true, 2: true, 3: true },
};

test('Instant Expedition Charge duration is reduced by Speed of Time', () => {
  const charge = getInstantExpeditionChargeState(fullyClearedParty, 0, 1 / 5);

  assert.equal(charge.nextChargeDurationMs, 38.4 * 60 * 1000);
  assert.equal(charge.remainingMs, 38.4 * 60 * 1000);
  assert.equal(formatInstantExpeditionChargeDisplay(charge).timerText, '39');
});

test('Instant Expedition Charge retains the normal duration without a speed boost', () => {
  const charge = getInstantExpeditionChargeState(fullyClearedParty, 0);

  assert.equal(charge.nextChargeDurationMs, 192 * 60 * 1000);
  assert.equal(formatInstantExpeditionChargeDisplay(charge).timerText, '192');
});

test('a full Instant Expedition Charge displays MAX after its filled cells', () => {
  const charge = getInstantExpeditionChargeState({ ...fullyClearedParty, instantExpeditionStock: 6 }, 0, 1 / 5);

  assert.deepEqual(formatInstantExpeditionChargeDisplay(charge), {
    cells: '▰▰▰▰▰▰',
    timerText: 'MAX',
    label: '▰▰▰▰▰▰MAX',
  });
});
