import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldMarkDeveloperNewsReadOnPaneChange } from '../src/game/developerNewsReadState.ts';

test('marks developer news read when the expanded pane closes', () => {
  assert.equal(shouldMarkDeveloperNewsReadOnPaneChange(true, false), true);
});

test('does not mark developer news read for initial, opening, or unchanged pane state', () => {
  assert.equal(shouldMarkDeveloperNewsReadOnPaneChange(false, false), false);
  assert.equal(shouldMarkDeveloperNewsReadOnPaneChange(false, true), false);
  assert.equal(shouldMarkDeveloperNewsReadOnPaneChange(true, true), false);
});
