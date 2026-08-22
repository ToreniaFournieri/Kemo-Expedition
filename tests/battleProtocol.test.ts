import assert from 'node:assert/strict';
import test from 'node:test';
import {
  encodeBattleProtocolInput,
  getBattleProtocolTerrainName,
  type BattleProtocolInput,
} from '../src/game/battleProtocol.ts';
import { getBattleProtocolArenaInfo, probeBattleProtocol } from '../src/game/battleKernel.ts';
import {
  BATTLE_ABILITY_IDS,
  BATTLE_ACTION_IDS,
  BATTLE_DEITY_IDS,
  BATTLE_EVENT_OPCODES,
  BATTLE_INPUT_OFFSETS,
  BATTLE_PROTOCOL_ARENA_CAPACITY,
  BATTLE_PROTOCOL_INPUT_MAGIC,
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
  assert.equal(BATTLE_PROTOCOL_VERSION, 2);
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
});
