import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { ENEMIES } from '../../src/data/enemies.ts';
import {
  executeBattleStartCheckpoint,
  projectBattleCombatants,
  projectBattleProtocolInput,
} from '../../src/game/battleCandidate.ts';
import { beginBattleKernelMeasurement, endBattleKernelMeasurement } from '../../src/game/battleKernel.ts';
import { computeCharacterStats } from '../../src/game/characterComputation.ts';
import { getDeityKey } from '../../src/game/deity.ts';
import { hydrateGameState } from '../../src/game/saveCodec.ts';
import { decodePersistedState } from '../../src/game/storageCompression.ts';
import type { GameState } from '../../src/types/index.ts';

type SaveEnvelope = { saveDataCompressed: string };

function sampleState(): GameState {
  const envelope = JSON.parse(readFileSync(
    'sample_savedata/ALL_Exp8_v0.9.3_dev_20260816.kemoz',
    'utf8',
  )) as SaveEnvelope;
  return hydrateGameState(JSON.parse(decodePersistedState(envelope.saveDataCompressed)) as GameState);
}

test('candidate projection is complete, non-mutating, and excludes object/UI payloads', () => {
  const state = sampleState();
  const party = state.parties[0]!;
  const enemy = structuredClone(ENEMIES[0]!);
  const beforeParty = structuredClone(party);
  const beforeEnemy = structuredClone(enemy);
  const input = projectBattleProtocolInput(party, enemy, state.bags, [0.25], party.currentHp, {});

  assert.deepEqual(party, beforeParty);
  assert.deepEqual(enemy, beforeEnemy);
  assert.equal(input.combatants[0]?.kind, 'enemy');
  assert.equal(input.combatants.length, party.characters.length + 1);
  for (const combatant of input.combatants) {
    for (const [key, value] of Object.entries(combatant)) {
      if (key === 'abilities' || key === 'kind' || key === 'elementalOffense') continue;
      assert.equal(typeof value, 'number', `${key} must be projected numerically`);
      assert.ok(Number.isFinite(value as number), `${key} must be finite`);
    }
    assert.equal('name' in combatant, false);
    assert.equal('equipment' in combatant, false);
  }
});

test('Gehenna projection removes the God of Resonance-derived ability upgrade', () => {
  const state = sampleState();
  const party = state.parties.find((candidate) => getDeityKey(candidate.deity.name) === 'God of Resonance');
  assert.ok(party);
  const enemy = structuredClone(ENEMIES[0]!);
  const projection = projectBattleCombatants(party, enemy, party.currentHp, { terrainEffect: 'terrain.gehenna' });
  projection.combatants.filter((combatant) => combatant.kind === 'character').forEach((combatant, index) => {
    const expected = computeCharacterStats(party.characters[index]!, party.level, index + 1).abilities
      .find((ability) => ability.id === 'resonance')?.level;
    assert.equal(combatant.abilities.find((ability) => ability.id === 'resonance')?.level, expected);
  });
});

test('START checkpoint uses one measured Wasm invocation', () => {
  const state = sampleState();
  const party = state.parties[0]!;
  const enemy = { ...structuredClone(ENEMIES[0]!), rangedAttack: 0, magicalAttack: 0, meleeAttack: 0 };
  const quietParty = {
    ...structuredClone(party),
    characters: party.characters.map((character) => ({ ...structuredClone(character), equipment: [] })),
  };
  beginBattleKernelMeasurement();
  const output = executeBattleStartCheckpoint(quietParty, enemy, state.bags, Array(4_096).fill(0), undefined, {});
  const measurement = endBattleKernelMeasurement();
  assert.equal(output.protocolError, 0);
  assert.equal(output.outcome, 'unresolved');
  assert.equal(measurement.calls, 1);
});
