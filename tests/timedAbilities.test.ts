import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const battleSource = readFileSync(new URL('../native/battle_protocol.cpp', import.meta.url), 'utf8');

test('Soul Reap resolves once at COMBAT2 rather than at magic end', () => {
  assert.match(
    battleSource,
    /auto trigger_soul_reap = \[&\]\(\) -> CombatResult \{[\s\S]*?attack != 1 \|\| timing != 2/,
  );
  assert.match(battleSource, /timing == 2[\s\S]*?run\(trigger_soul_reap\)/);
  assert.doesNotMatch(battleSource, /trigger_soul_reap_at_end/);
});
