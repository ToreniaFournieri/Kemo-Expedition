import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(
  new URL('./support/expedition8StartupDiagnostics.profile.ts', import.meta.url),
  'utf8',
);

test('Expedition 8 startup diagnostics pin and enforce every seeded simulation hash', () => {
  assert.match(source, /EXPECTED_SIX_PARTY_SHA256/);
  assert.match(source, /EXPECTED_ONE_PARTY_SHA256/);
  assert.doesNotMatch(source, /sampleHashes\[0\]/);
  assert.match(source, /Missing pinned deterministic hash/);
  assert.match(source, /Deterministic hash mismatch/);
  assert.match(source, /J_production_compact_concurrency_2/);
  assert.match(source, /J_production_compact_concurrency_3/);
  assert.match(source, /hydrateAfkPartyChunkResult/);
});
