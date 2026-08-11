import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../src/data/dungeons.ts', import.meta.url), 'utf8');

test('runtime enemy attack and attack amplifier formulas match the specification', () => {
  assert.match(source, /const attackGrowth = applyEnemyLevelGrowth\(n, 1\.09, 25, 0\.00049, 49, 0\.00007\);/);
  assert.match(source, /const attackAmplifierGrowth = applyEnemyLevelGrowth\(n, 1\.03, 25, 0\.000151, 49, 0\.000052\);/);
  assert.match(source, /attack: round2\(1\.4 \* attackGrowth\),/);
  assert.match(source, /attackAmplifier: round2\(1 \+ \(attackAmplifierGrowth - 1\) \/ 2\),/);
});
