import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const battleSource = readFileSync(new URL('../src/game/battle.ts', import.meta.url), 'utf8');

test('Soul Reap resolves once at COMBAT2 rather than at magic end', () => {
  assert.match(
    battleSource,
    /const triggerSoulReapAtTiming = \(timing: number\): void => \{[\s\S]*?phase !== 'ranged' \|\| timing !== 2/,
  );
  assert.match(battleSource, /triggerSoulReapAtTiming\(2\);/);
  assert.doesNotMatch(battleSource, /triggerSoulReapAtEnd|initiativeRoll: 0,[\s\S]{0,200}buildSoulReapAction/);
});
