import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const partyTabSource = readFileSync(new URL('../src/components/home/tabs/PartyTab.tsx', import.meta.url), 'utf8');

test('Party tabs stay in layout but are hidden and unfocusable until a second party unlocks', () => {
  assert.match(partyTabSource, /parties\.length <= 1 \? 'invisible pointer-events-none' : ''/);
  assert.match(partyTabSource, /aria-hidden=\{parties\.length <= 1\}/);
  assert.match(partyTabSource, /tabIndex=\{parties\.length <= 1 \? -1 : 0\}/);
});
