import assert from 'node:assert/strict';
import test from 'node:test';
import {
  encodeBattleProtocolInput,
  getBattleProtocolTerrainName,
  type BattleProtocolInput,
} from '../src/game/battleProtocol.ts';
import { executeBattleProtocol, getBattleProtocolArenaInfo, probeBattleProtocol } from '../src/game/battleKernel.ts';
import { BATTLE_KERNEL_WASM } from '../src/game/battleKernelBinary.ts';
import {
  BATTLE_ABILITY_IDS,
  BATTLE_ACTION_IDS,
  BATTLE_DEITY_IDS,
  BATTLE_EVENT_OPCODES,
  BATTLE_INPUT_OFFSETS,
  BATTLE_COMBATANT_OFFSETS,
  BATTLE_COMBATANT_RECORD_SIZE,
  BATTLE_PROTOCOL_ARENA_CAPACITY,
  BATTLE_PROTOCOL_INPUT_MAGIC,
  BATTLE_PROTOCOL_ERROR_CODES,
  BATTLE_PROTOCOL_VERSION,
  BATTLE_TERRAIN_IDS,
} from '../src/game/generated/battleProtocol.generated.ts';

const protocolInput: BattleProtocolInput = {
  flags: 5,
  terrainEffect: 'terrain.echo-domain',
  partyHp: 9_000_000_000,
  enemyHp: 12_345.5,
  combatants: [
    {
      id: 101,
      kind: 'character',
      row: 1,
      elementalOffense: 'fire',
      hp: 5_000,
      maxHp: 6_000,
      rangedAttack: 100,
      magicalAttack: 200,
      meleeAttack: 300,
      rangedNoA: 4,
      magicalNoA: 3,
      meleeNoA: 2,
      physicalDefense: 80,
      magicalDefense: 90,
      accuracyBonus: 0.04,
      evasionBonus: 0.03,
      elementalOffenseValue: 1.2,
      abilities: [{ id: 'counter', level: 2 }, { id: 'resonance', level: 3 }],
    },
    {
      id: 9001,
      kind: 'enemy',
      row: 0,
      elementalOffense: 'ice',
      hp: 12_345.5,
      maxHp: 12_345.5,
      rangedAttack: 400,
      magicalAttack: 500,
      meleeAttack: 600,
      rangedNoA: 6,
      magicalNoA: 5,
      meleeNoA: 4,
      physicalDefense: 120,
      magicalDefense: 140,
      accuracyBonus: 0.05,
      evasionBonus: 0.02,
      elementalOffenseValue: 1.3,
      abilities: [{ id: 're_counter', level: 1 }, { id: 'oblivion', level: 1 }],
    },
  ],
  randomValues: [0, 0.25, 0.5, 0.999999],
  physicalThreatBag: [{ id: 1, tickets: 16 }, { id: 6, tickets: 1 }],
  magicalThreatBag: [{ id: 1, tickets: 2 }, { id: 6, tickets: 2 }],
  seed: 0x0123456789abcdefn,
  deityId: 12,
  rngVersion: 1,
};

test('stable protocol IDs map abilities, terrain, and event opcodes', () => {
  assert.equal(BATTLE_PROTOCOL_VERSION, 3);
  assert.equal(BATTLE_ABILITY_IDS.defender, 1);
  assert.equal(BATTLE_ABILITY_IDS.unlock, 126);
  assert.equal(BATTLE_TERRAIN_IDS['terrain.rejuvenation'], 1);
  assert.equal(BATTLE_TERRAIN_IDS['terrain.duelist-domain'], 46);
  assert.equal(BATTLE_EVENT_OPCODES.protocol_ready, 1);
  assert.equal(BATTLE_EVENT_OPCODES.outcome, 21);
  assert.equal(BATTLE_DEITY_IDS.goddess_of_restoration, 1);
  assert.equal(BATTLE_DEITY_IDS.goddess_of_discord, 12);
  assert.equal(BATTLE_ACTION_IDS.normal_attack, 1);
  assert.equal(BATTLE_ACTION_IDS.timed_ability, 15);
  assert.equal(getBattleProtocolTerrainName(BATTLE_TERRAIN_IDS['terrain.echo-domain']), 'terrain.echo-domain');
});

test('TypeScript encoder and C++ decoder share one binary input layout', () => {
  const encoded = encodeBattleProtocolInput(protocolInput);
  const view = new DataView(encoded.buffer, encoded.byteOffset, encoded.byteLength);
  assert.equal(view.getUint32(BATTLE_INPUT_OFFSETS.magic, true), BATTLE_PROTOCOL_INPUT_MAGIC);
  assert.equal(view.getUint16(BATTLE_INPUT_OFFSETS.version, true), BATTLE_PROTOCOL_VERSION);
  assert.equal(view.getUint16(BATTLE_INPUT_OFFSETS.combatantCount, true), 2);
  assert.equal(view.getUint32(BATTLE_INPUT_OFFSETS.abilityCount, true), 4);
  assert.equal(view.getUint32(BATTLE_INPUT_OFFSETS.randomCount, true), 4);

  const output = probeBattleProtocol(encoded);
  assert.equal(output.outcome, 'unresolved');
  assert.equal(output.partyHp, protocolInput.partyHp);
  assert.equal(output.enemyHp, protocolInput.enemyHp);
  assert.equal(output.randomConsumed, 0);
  assert.equal(output.enemyHitsReceived, 0);
  assert.equal(output.seed, protocolInput.seed);
  assert.equal(output.rngVersion, protocolInput.rngVersion);
  assert.equal(output.diagnosticDrawCount, 0);
  assert.equal(output.protocolError, 0);
  assert.deepEqual(output.events.map((event) => event.opcode), ['protocol_ready']);
  assert.deepEqual(output.physicalThreatBag, protocolInput.physicalThreatBag);
  assert.deepEqual(output.magicalThreatBag, protocolInput.magicalThreatBag);
});

test('the Wasm protocol reuses fixed input and output arenas', () => {
  const before = getBattleProtocolArenaInfo();
  probeBattleProtocol(encodeBattleProtocolInput(protocolInput));
  const after = getBattleProtocolArenaInfo();
  assert.deepEqual(after, before);
  assert.equal(after.capacity, BATTLE_PROTOCOL_ARENA_CAPACITY);
  assert.notEqual(after.inputPointer, after.outputPointer);
});

test('TypeScript and C++ reject invalid binary protocol data', () => {
  assert.throws(
    () => encodeBattleProtocolInput({ ...protocolInput, terrainEffect: 'terrain.unknown' }),
    /Unknown battle terrain ID/,
  );
  assert.throws(
    () => encodeBattleProtocolInput({ ...protocolInput, randomValues: [1] }),
    /random value must be in \[0, 1\)/,
  );

  const corrupted = encodeBattleProtocolInput(protocolInput);
  new DataView(corrupted.buffer).setUint16(BATTLE_INPUT_OFFSETS.terrainId, 0xffff, true);
  assert.throws(() => probeBattleProtocol(corrupted), /rejected input \(-5\)/);

  const versionTwo = encodeBattleProtocolInput(protocolInput);
  new DataView(versionTwo.buffer).setUint16(BATTLE_INPUT_OFFSETS.version, 2, true);
  assert.throws(() => probeBattleProtocol(versionTwo), /rejected input \(-3\)/);

  const malformedSpan = encodeBattleProtocolInput(protocolInput);
  new DataView(malformedSpan.buffer).setUint32(BATTLE_INPUT_OFFSETS.abilitiesOffset, 113, true);
  assert.throws(() => probeBattleProtocol(malformedSpan), /rejected input \(-15\)/);

  const nonFinite = encodeBattleProtocolInput(protocolInput);
  const combatantsOffset = new DataView(nonFinite.buffer).getUint32(BATTLE_INPUT_OFFSETS.combatantsOffset, true);
  new DataView(nonFinite.buffer).setFloat64(combatantsOffset + BATTLE_COMBATANT_OFFSETS.physicalPenetration, Number.NaN, true);
  assert.throws(() => probeBattleProtocol(nonFinite), /rejected input \(-9\)/);
});

test('protocol v3 encodes the complete projected profile without narrowing large floats', () => {
  const large = 9_007_199_254_740_000;
  const encoded = encodeBattleProtocolInput({
    ...protocolInput,
    partyMaxHp: large,
    enemyMaxHp: large - 1,
    enemyHp: protocolInput.enemyHp,
    combatants: protocolInput.combatants.map((combatant, index) => ({
      ...combatant,
      maxHp: large,
      originalRangedNoA: large - index,
      rangedAccuracyPotency: 0.875,
      physicalPenetration: 1.125,
      fireResistance: 0.625,
      physicalOffenseAmplifier: 3.5,
      deityOffenseBonus: 0.42,
      enemyRangedAmplifier: 7.25,
      magicStyle: index === 1 ? 4 : 0,
    })),
  });
  const view = new DataView(encoded.buffer, encoded.byteOffset, encoded.byteLength);
  const first = view.getUint32(BATTLE_INPUT_OFFSETS.combatantsOffset, true);
  const second = first + BATTLE_COMBATANT_RECORD_SIZE;
  assert.equal(view.getFloat64(BATTLE_INPUT_OFFSETS.partyMaxHp, true), large);
  assert.equal(view.getFloat64(first + BATTLE_COMBATANT_OFFSETS.originalRangedNoA, true), large);
  assert.equal(view.getFloat64(first + BATTLE_COMBATANT_OFFSETS.physicalPenetration, true), 1.125);
  assert.equal(view.getFloat64(first + BATTLE_COMBATANT_OFFSETS.fireResistance, true), 0.625);
  assert.equal(view.getFloat64(first + BATTLE_COMBATANT_OFFSETS.physicalOffenseAmplifier, true), 3.5);
  assert.equal(view.getFloat64(first + BATTLE_COMBATANT_OFFSETS.deityOffenseBonus, true), 0.42);
  assert.equal(view.getFloat64(first + BATTLE_COMBATANT_OFFSETS.enemyRangedAmplifier, true), 7.25);
  assert.equal(view.getUint8(second + BATTLE_COMBATANT_OFFSETS.magicStyle), 4);
  assert.equal(probeBattleProtocol(encoded).protocolError, 0);
});

test('protocol v3 enforces fixed combatant and random-tape capacities', () => {
  assert.throws(
    () => encodeBattleProtocolInput({ ...protocolInput, combatants: Array(9).fill(protocolInput.combatants[0]) }),
    /combatant count must be an integer from 1 through 8/,
  );
  assert.throws(
    () => encodeBattleProtocolInput({ ...protocolInput, randomValues: Array(4_097).fill(0.5) }),
    /random count must be an integer from 0 through 4096/,
  );
  const abilityOverflow = executeBattleProtocol(encodeBattleProtocolInput({
    ...protocolInput,
    combatants: [{
      ...protocolInput.combatants[0]!,
      abilities: Object.keys(BATTLE_ABILITY_IDS).slice(0, 65).map((id) => ({
        id: id as keyof typeof BATTLE_ABILITY_IDS,
        level: 1,
      })),
    }],
  }));
  assert.equal(abilityOverflow.protocolError, BATTLE_PROTOCOL_ERROR_CODES.abilityCapacity);
  assert.equal(abilityOverflow.events.length, 0, 'capacity errors must not return truncated events');
});

test('full-battle execution resets state, consumes the supplied tape exactly, and emits ordered phases', () => {
  const first = executeBattleProtocol(encodeBattleProtocolInput(protocolInput));
  assert.equal(first.randomConsumed, protocolInput.randomValues.length);
  assert.equal(first.diagnosticDrawCount, protocolInput.randomValues.length);
  assert.equal(first.events[0]?.opcode, 'battle_started');
  assert.equal(first.events.at(-1)?.opcode, 'battle_finished');
  assert.ok(first.events.some((event) => event.opcode === 'initiative'));
  assert.deepEqual(first.physicalThreatBag, protocolInput.physicalThreatBag);

  const second = executeBattleProtocol(encodeBattleProtocolInput({
    ...protocolInput,
    partyHp: 77,
    partyMaxHp: 77,
    enemyHp: 88,
    enemyMaxHp: 88,
    randomValues: [],
    combatants: protocolInput.combatants.map((combatant) => ({ ...combatant, rangedAttack: 0, magicalAttack: 0, meleeAttack: 0 })),
  }));
  assert.equal(second.randomConsumed, 0);
  assert.equal(second.partyHp, 77);
  assert.equal(second.enemyHp, 88);
});

test('checked-in full-battle Wasm has no imports and exports the v3 executor', () => {
  const module = new WebAssembly.Module(BATTLE_KERNEL_WASM);
  assert.deepEqual(WebAssembly.Module.imports(module), []);
  assert.ok(WebAssembly.Module.exports(module).some((entry) => entry.name === 'battle_protocol_execute' && entry.kind === 'function'));
});
