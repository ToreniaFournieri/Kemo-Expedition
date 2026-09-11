import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const apiSource = readFileSync(new URL('../src/game/experimentalApi.ts', import.meta.url), 'utf8');
const homeSource = readFileSync(new URL('../src/game/experimentalApiStrategy.ts', import.meta.url), 'utf8');

test('the deity catalog normalizes localized unlock names and exposes assignments', () => {
  assert.match(apiSource, /unlockedDeities\.map\(getDeityKey\)/);
  assert.match(apiSource, /unlockedKeys\.add\('None'\)/);
  assert.match(apiSource, /assignedPartyId: assignedParty\?\.id \?\? null/);
  assert.match(apiSource, /assignedPartyName: assignedParty\?\.name \?\? null/);
});

test('deity assignment conflicts return a friendly party-specific diagnostic', () => {
  assert.match(homeSource, /const assignedPartySlot = `PT\$\{assignedParty\.id\}`/);
  assert.match(homeSource, /This deity is already used by another party \(\$\{assignedPartyLabel\}\)\. Choose another deity\./);
  assert.match(homeSource, /reason: 'assigned_to_party'/);
  assert.match(homeSource, /assignedPartyId: assignedParty\.id/);
});
