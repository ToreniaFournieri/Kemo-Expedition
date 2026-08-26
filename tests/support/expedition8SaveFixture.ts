import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { hydrateGameState } from '../../src/game/saveCodec.ts';
import { decodePersistedState } from '../../src/game/storageCompression.ts';
import type { GameState } from '../../src/types.ts';

export const EXPEDITION_8_SAVE_PATH = resolve(
  process.cwd(),
  'sample_savedata/ALL_Exp8_v0.9.3_dev_20260816.kemoz',
);
export const EXPEDITION_8_SAVE_SHA256 = '87c837fda20d7159d87a68cfc5877d95722aae5719b10e860775dd3ed221662f';

interface SaveEnvelope {
  meta: {
    app: string;
    version: string;
    env: string;
    format: string;
  };
  saveDataCompressed: string;
}

export interface Expedition8FixtureIdentity {
  path: string;
  sha256: string;
  appVersion: string;
  environment: string;
  format: string;
  buildNumber: number;
  partyCount: number;
  partyIds: number[];
  partyNames: string[];
  selectedDungeonIds: number[];
  characterCounts: number[];
  inventoryVariantCount: number;
}

export function loadAndValidateExpedition8Fixture(): {
  state: GameState;
  identity: Expedition8FixtureIdentity;
} {
  const source = readFileSync(EXPEDITION_8_SAVE_PATH);
  const sha256 = createHash('sha256').update(source).digest('hex');
  assert.equal(sha256, EXPEDITION_8_SAVE_SHA256, 'Expedition 8 fixture content changed');

  const envelope = JSON.parse(source.toString('utf8')) as SaveEnvelope;
  assert.equal(envelope.meta.app, 'Kemo-Expedition');
  assert.equal(envelope.meta.version, 'v0.9.3');
  assert.equal(envelope.meta.env, 'dev');
  assert.equal(envelope.meta.format, 'compressed-v1');

  const state = hydrateGameState(
    JSON.parse(decodePersistedState(envelope.saveDataCompressed)) as GameState,
  );
  const partyIds = state.parties.map((party) => party.id);
  const partyNames = state.parties.map((party) => party.name);
  const selectedDungeonIds = state.parties.map((party) => party.selectedDungeonId);
  const characterCounts = state.parties.map((party) => party.characters.length);

  assert.equal(state.buildNumber, 9);
  assert.equal(state.parties.length, 6);
  assert.deepEqual(partyIds, [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(partyNames, ['PT1', 'PT2', 'PT3', 'PT4', 'PT5', 'PT6']);
  assert.deepEqual(selectedDungeonIds, [8, 8, 8, 8, 8, 8]);
  assert.deepEqual(characterCounts, [6, 6, 6, 6, 6, 6]);
  assert.equal(Object.keys(state.global.inventory).length, 2_308);

  return {
    state,
    identity: {
      path: EXPEDITION_8_SAVE_PATH,
      sha256,
      appVersion: envelope.meta.version,
      environment: envelope.meta.env,
      format: envelope.meta.format,
      buildNumber: state.buildNumber,
      partyCount: state.parties.length,
      partyIds,
      partyNames,
      selectedDungeonIds,
      characterCounts,
      inventoryVariantCount: Object.keys(state.global.inventory).length,
    },
  };
}
