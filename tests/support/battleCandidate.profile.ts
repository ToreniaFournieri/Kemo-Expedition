import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { ENEMIES } from '../../src/data/enemies.ts';
import {
  convertBattleSemanticEvents,
  executeBattleStartCheckpoint,
  executeBattleCombatReactiveCheckpoint,
  executeBattleCombatTimedCheckpoint,
  executeBattleEndCheckpoint,
  projectBattleCombatants,
  projectBattleProtocolInput,
  validateBattleSemanticFlavorFacts,
} from '../../src/game/battleCandidate.ts';
import { getBattleFlavorTemplateAtIndex } from '../../src/game/battleNarration.ts';
import type { BattleProtocolEvent } from '../../src/game/battleProtocol.ts';
import { beginBattleKernelMeasurement, endBattleKernelMeasurement } from '../../src/game/battleKernel.ts';
import {
  gameplayRandom,
  getGameplayRandomStateForTesting,
  reserveGameplayRandomTape,
  withGameplayRandomSourceForTesting,
} from '../../src/game/gameplayRandom.ts';
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

const semanticEvent = (overrides: Partial<BattleProtocolEvent> = {}): BattleProtocolEvent => ({
  opcode: 'nullified', phase: 2, actorKind: 1, actorId: 1, targetId: 0x8000_0001,
  abilityId: 'illusion', attackType: 'ranged', flags: 1, timing: 8, hits: 0,
  attempts: 0, aux0: 1, value0: 0, value1: 0, value2: 0, aux1: 0, aux2: 0,
  ...overrides,
});

test('indexed narration accepts the first and final flavor and rejects out-of-range indices', () => {
  assert.equal(typeof getBattleFlavorTemplateAtIndex('illusion', 0), 'string');
  assert.equal(typeof getBattleFlavorTemplateAtIndex('illusion', 9), 'string');
  assert.throws(() => getBattleFlavorTemplateAtIndex('illusion', -1), /Invalid illusion battle flavor index/);
  assert.throws(() => getBattleFlavorTemplateAtIndex('illusion', 10), /Invalid illusion battle flavor index/);
});

test('semantic flavor validation rejects missing, duplicate, and misordered facts', () => {
  const source = semanticEvent();
  const flavor = semanticEvent({ opcode: 'random_flavor', flags: 0, aux0: 9, aux1: 1 });
  assert.doesNotThrow(() => validateBattleSemanticFlavorFacts([source, flavor]));
  assert.throws(() => validateBattleSemanticFlavorFacts([source]), /Missing battle flavor fact/);
  assert.throws(() => validateBattleSemanticFlavorFacts([source, flavor, flavor]), /Misordered or duplicate/);
  assert.throws(() => validateBattleSemanticFlavorFacts([
    source,
    semanticEvent({ opcode: 'diagnostic', abilityId: null }),
    flavor,
  ]), /does not match its source event/);
  const unexpectedSource = semanticEvent({ opcode: 'attack', abilityId: null });
  assert.throws(() => validateBattleSemanticFlavorFacts([
    unexpectedSource,
    semanticEvent({ opcode: 'random_flavor', abilityId: null, flags: 0, aux0: 0, aux1: unexpectedSource.aux0 }),
  ]), /Unexpected battle flavor fact/);
});

test('realm-local random reservoir commits prefixes, preserves suffixes, and rolls failures back', () => {
  const values = Array.from({ length: 20 }, (_, index) => index / 20);
  let cursor = 0;
  withGameplayRandomSourceForTesting(() => values[cursor++]!, () => {
    const first = reserveGameplayRandomTape(8);
    assert.deepEqual(first.tape, values.slice(0, 8));
    assert.throws(() => reserveGameplayRandomTape(1), /Nested or reentrant/);
    first.commit(3);
    assert.equal(gameplayRandom(), values[3]);
    const attempted = reserveGameplayRandomTape(8);
    assert.equal(attempted.tape[0], values[4]);
    attempted.rollback();
    assert.equal(gameplayRandom(), values[4], 'rollback must commit zero values');
    assert.equal(getGameplayRandomStateForTesting().reservationActive, false);
  });
  withGameplayRandomSourceForTesting(() => 0.75, () => {
    assert.equal(gameplayRandom(), 0.75, 'a scoped realm must not inherit another realm suffix');
  });
});

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

test('reactive COMBAT candidate helper uses exactly one native invocation and never falls back', () => {
  const state = sampleState();
  const party = state.parties[0]!;
  const enemy = { ...structuredClone(ENEMIES[0]!), rangedAttack: 0, magicalAttack: 0, meleeAttack: 0 };
  beginBattleKernelMeasurement();
  const output = executeBattleCombatReactiveCheckpoint(party, enemy, state.bags, Array(4_096).fill(0), party.currentHp, {});
  const measurement = endBattleKernelMeasurement();
  assert.equal(measurement.calls, 1);
  assert.ok(output.protocolError === 0 || output.protocolError === 7);
});

test('timed COMBAT candidate helper uses one native invocation without the frozen coordinator', () => {
  const state = sampleState();
  const party = state.parties[0]!;
  const enemy = { ...structuredClone(ENEMIES[0]!), rangedAttack: 0, magicalAttack: 0, meleeAttack: 0 };
  beginBattleKernelMeasurement();
  const output = executeBattleCombatTimedCheckpoint(party, enemy, state.bags, Array(4_096).fill(0), party.currentHp, {});
  const measurement = endBattleKernelMeasurement();
  assert.equal(measurement.calls, 1);
  assert.ok(output.protocolError === 0 || output.protocolError === 7);
});

test('END candidate helper projects once and uses exactly one native invocation', () => {
  const state = sampleState();
  const party = state.parties[0]!;
  const enemy = { ...structuredClone(ENEMIES[0]!), rangedAttack: 0, magicalAttack: 0, meleeAttack: 0 };
  beginBattleKernelMeasurement();
  const output = executeBattleEndCheckpoint(party, enemy, state.bags, Array(4_096).fill(0), party.currentHp, {});
  const measurement = endBattleKernelMeasurement();
  assert.equal(measurement.calls, 1);
  assert.ok(output.protocolError === 0 || output.protocolError === 7);
});

test('renderer rejects invalid terminal ordering and omits absent optional presentation properties', () => {
  const state = sampleState();
  const party = state.parties[0]!;
  const enemy = { ...structuredClone(ENEMIES[0]!), hp: 1, rangedAttack: 0, magicalAttack: 0, meleeAttack: 0 };
  const output = executeBattleEndCheckpoint(party, enemy, state.bags, Array(4_096).fill(0), party.currentHp, {});
  assert.equal(output.protocolError, 0);
  assert.throws(
    () => convertBattleSemanticEvents({ ...output, events: output.events.slice(1) }, party, enemy, party.currentHp, {}),
    /invalid terminal ordering/,
  );
  assert.throws(
    () => convertBattleSemanticEvents({ ...output, events: output.events.slice(0, -1) }, party, enemy, party.currentHp, {}),
    /invalid terminal ordering/,
  );
  const result = convertBattleSemanticEvents(output, party, enemy, party.currentHp, {});
  const unadorned = result.log.find((entry) => entry.hits !== undefined
    && entry.rageBonusPercent === undefined && entry.momentumBonusPercent === undefined);
  assert.ok(unadorned);
  assert.equal('rageBonusPercent' in unadorned, false);
  assert.equal('momentumBonusPercent' in unadorned, false);
  assert.equal('ambushMultiplier' in unadorned, false);
  assert.equal('swarmActorPenaltyPercent' in unadorned, false);
});
