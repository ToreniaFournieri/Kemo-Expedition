import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../src/data/items.ts', import.meta.url), 'utf8');

test('the Ursan boss wand grants Command as its special bonus', () => {
  assert.match(
    source,
    /'軍配': \[\{ type: 'ability', value: 1, abilityId: 'command', abilityLevel: 1 \}\]/,
  );
});
