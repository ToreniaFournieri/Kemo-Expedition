import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const homeSource = readFileSync(new URL('../src/components/HomeScreen.tsx', import.meta.url), 'utf8');

test('Party tabs stay in layout but are hidden and unfocusable until a second party unlocks', () => {
  assert.match(homeSource, /parties\.length <= 1 \? 'invisible pointer-events-none' : ''/);
  assert.match(homeSource, /aria-hidden=\{parties\.length <= 1\}/);
  assert.match(homeSource, /tabIndex=\{parties\.length <= 1 \? -1 : 0\}/);
});
