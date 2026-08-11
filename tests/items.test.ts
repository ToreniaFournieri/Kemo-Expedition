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

test('special spell equipment grants the requested passive abilities', () => {
  assert.match(source, /'光の剣': \[\{ type: 'ability', value: 1, abilityId: 'armor_break', abilityLevel: 1 \}\]/);
  assert.match(source, /'冥核': \[\{ type: 'ability', value: 1, abilityId: 'gravity_well', abilityLevel: 1 \}\]/);
  assert.match(source, /'月兎の破魔杖': \[\{ type: 'ability', value: 1, abilityId: 'mana_break', abilityLevel: 1 \}\]/);
});
