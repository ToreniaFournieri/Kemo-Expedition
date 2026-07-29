import assert from 'node:assert/strict';
import test from 'node:test';
import { formatAttackSpeedHelp, getAttackRollProfile, rollAttackSpeedDice } from '../src/game/attackProfile.ts';

const messages: Record<string, string> = {
  'combat.attackSpeed.ranged': 'Ranged attack speed',
  'combat.attackSpeed.magical': 'Magical attack speed',
  'combat.attackSpeed.melee': 'Melee attack speed',
  'combat.attackSpeed.template': '{label}: {minimum}~{maximum} ({diceCount}d{dieSize})',
};
const translate = (key: string, params: Record<string, string | number> = {}) =>
  Object.entries(params).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), messages[key] ?? key);

test('all attack profiles expose the specified range and dice notation', () => {
  assert.equal(formatAttackSpeedHelp('ranged', translate), 'Ranged attack speed: 4~12 (4d3)');
  assert.equal(formatAttackSpeedHelp('magical', translate), 'Magical attack speed: 3~9 (3d3)');
  assert.equal(formatAttackSpeedHelp('melee', translate), 'Melee attack speed: 1~3 (1d3)');
});

test('a profile drives both its battle roll and displayed range', () => {
  const profiles = {
    ranged: { diceCount: 2, dieSize: 5 },
    magical: { diceCount: 3, dieSize: 3 },
    melee: { diceCount: 1, dieSize: 3 },
  } as const;
  const changed = getAttackRollProfile('ranged', profiles);
  assert.deepEqual(changed, { diceCount: 2, dieSize: 5, minimum: 2, maximum: 10 });
  assert.equal(rollAttackSpeedDice(changed, () => 0.999), changed.maximum);
  assert.equal(
    formatAttackSpeedHelp('ranged', translate, profiles),
    'Ranged attack speed: 2~10 (2d5)',
  );
});
