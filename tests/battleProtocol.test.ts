import assert from 'node:assert/strict';
import test from 'node:test';
import {
  encodeBattleProtocolInput,
  decodeBattleProtocolOutput,
  getBattleProtocolTerrainName,
  writeBattleProtocolInput,
  BATTLE_PROTOCOL_MAX_SEMANTIC_EVENTS,
  BorrowedBattleProtocolOutputView,
  type BattleProtocolInput,
} from '../src/game/battleProtocol.ts';
import {
  beginBattleKernelMeasurement,
  consumeBattleProtocolInput,
  endBattleKernelMeasurement,
  executeBattleProtocol,
  executeBattleProtocolInput,
  getBattleProtocolArenaInfo,
  growBattleProtocolMemoryForTesting,
  probeBattleProtocol,
} from '../src/game/battleKernel.ts';
import { BATTLE_KERNEL_WASM } from '../src/game/battleKernelBinary.ts';
import {
  BATTLE_ABILITY_IDS,
  BATTLE_ACTION_IDS,
  BATTLE_BAG_OFFSETS,
  BATTLE_DEITY_IDS,
  BATTLE_ENGINE_FLAG_COMBAT_BASE_CHECKPOINT,
  BATTLE_ENGINE_FLAG_COMBAT_NORMAL_CHECKPOINT,
  BATTLE_ENGINE_FLAG_COMBAT_REACTIVE_CHECKPOINT,
  BATTLE_ENGINE_FLAG_COMBAT_TIMED_CHECKPOINT,
  BATTLE_ENGINE_FLAG_COMPACT_RESULT_OUTPUT,
  BATTLE_ENGINE_FLAG_END_CHECKPOINT,
  BATTLE_ENGINE_FLAG_SEEDED_RNG,
  BATTLE_ENGINE_FLAG_START_CHECKPOINT,
  BATTLE_EVENT_OPCODES,
  BATTLE_EVENT_OFFSETS,
  BATTLE_EVENT_RECORD_SIZE,
  BATTLE_INPUT_OFFSETS,
  BATTLE_COMBATANT_OFFSETS,
  BATTLE_COMBATANT_RECORD_SIZE,
  BATTLE_PROTOCOL_ARENA_CAPACITY,
  BATTLE_PROTOCOL_INPUT_MAGIC,
  BATTLE_PROTOCOL_OUTPUT_MAGIC,
  BATTLE_OUTPUT_HEADER_SIZE,
  BATTLE_OUTPUT_OFFSETS,
  BATTLE_PROTOCOL_ERROR_CODES,
  BATTLE_PROTOCOL_VERSION,
  BATTLE_TERRAIN_IDS,
} from '../src/game/generated/battleProtocol.generated.ts';
import { BATTLE_ABILITY_OWNERSHIP, BATTLE_ABILITY_OWNERSHIP_IDS } from '../src/game/battleAbilityOwnership.ts';

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

function syntheticOutput(eventCount: number, physicalBagCount = 0, magicalBagCount = 0): Uint8Array {
  const eventsOffset = BATTLE_OUTPUT_HEADER_SIZE;
  const physicalBagOffset = eventsOffset + eventCount * BATTLE_EVENT_RECORD_SIZE;
  const magicalBagOffset = physicalBagOffset + physicalBagCount * 8;
  const totalSize = magicalBagOffset + magicalBagCount * 8;
  const bytes = new Uint8Array(totalSize);
  const view = new DataView(bytes.buffer);
  view.setUint32(BATTLE_OUTPUT_OFFSETS.magic, BATTLE_PROTOCOL_OUTPUT_MAGIC, true);
  view.setUint16(BATTLE_OUTPUT_OFFSETS.version, BATTLE_PROTOCOL_VERSION, true);
  view.setUint16(BATTLE_OUTPUT_OFFSETS.headerSize, BATTLE_OUTPUT_HEADER_SIZE, true);
  view.setUint32(BATTLE_OUTPUT_OFFSETS.totalSize, totalSize, true);
  view.setUint8(BATTLE_OUTPUT_OFFSETS.outcome, 1);
  view.setUint32(BATTLE_OUTPUT_OFFSETS.eventCount, eventCount, true);
  view.setUint32(BATTLE_OUTPUT_OFFSETS.eventsOffset, eventsOffset, true);
  view.setUint32(BATTLE_OUTPUT_OFFSETS.physicalBagCount, physicalBagCount, true);
  view.setUint32(BATTLE_OUTPUT_OFFSETS.physicalBagOffset, physicalBagCount === 0 ? 0 : physicalBagOffset, true);
  view.setUint32(BATTLE_OUTPUT_OFFSETS.magicalBagCount, magicalBagCount, true);
  view.setUint32(BATTLE_OUTPUT_OFFSETS.magicalBagOffset, magicalBagCount === 0 ? 0 : magicalBagOffset, true);
  for (let index = 0; index < eventCount; index += 1) {
    view.setUint16(eventsOffset + index * BATTLE_EVENT_RECORD_SIZE + BATTLE_EVENT_OFFSETS.opcode, BATTLE_EVENT_OPCODES.protocol_ready, true);
  }
  return bytes;
}

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
  assert.equal(BATTLE_ENGINE_FLAG_START_CHECKPOINT, 1 << 0);
  assert.equal(BATTLE_ENGINE_FLAG_COMBAT_BASE_CHECKPOINT, 1 << 1);
  assert.equal(BATTLE_ENGINE_FLAG_COMBAT_NORMAL_CHECKPOINT, 1 << 2);
  assert.equal(BATTLE_ENGINE_FLAG_COMBAT_REACTIVE_CHECKPOINT, 1 << 3);
  assert.equal(BATTLE_ENGINE_FLAG_COMBAT_TIMED_CHECKPOINT, 1 << 4);
  assert.equal(BATTLE_ENGINE_FLAG_END_CHECKPOINT, 1 << 5);
  assert.equal(BATTLE_ENGINE_FLAG_SEEDED_RNG, 1 << 6);
  assert.equal(BATTLE_ENGINE_FLAG_COMPACT_RESULT_OUTPUT, 1 << 7);
  assert.equal(BATTLE_PROTOCOL_ERROR_CODES.unsupportedCombatFeature, 7);
  assert.equal(BATTLE_PROTOCOL_ERROR_CODES.seededModeConflict, 8);
  assert.equal(BATTLE_PROTOCOL_ERROR_CODES.unsupportedRngVersion, 9);
  assert.equal(getBattleProtocolTerrainName(BATTLE_TERRAIN_IDS['terrain.echo-domain']), 'terrain.echo-domain');
});

test('advanced COMBAT ownership matrix classifies every append-only ability exactly once', () => {
  const classified = Object.values(BATTLE_ABILITY_OWNERSHIP_IDS).flat();
  assert.equal(classified.length, Object.keys(BATTLE_ABILITY_IDS).length);
  assert.equal(new Set(classified).size, classified.length);
  assert.deepEqual([...classified].sort(), Object.keys(BATTLE_ABILITY_IDS).sort());
  assert.equal(Object.keys(BATTLE_ABILITY_OWNERSHIP).length, classified.length);
  assert.equal(BATTLE_ABILITY_OWNERSHIP.counter, 'reactive_chain');
  assert.equal(BATTLE_ABILITY_OWNERSHIP.resurrect, 'defeat_recovery');
  assert.equal(BATTLE_ABILITY_OWNERSHIP.gravity_well, 'normal_action');
  assert.equal(BATTLE_ABILITY_OWNERSHIP.first_aid, 'external_post_battle');
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

test('structured and retained byte execution paths produce identical owned output', () => {
  const encoded = encodeBattleProtocolInput(protocolInput);
  const expected = executeBattleProtocol(encoded);
  const actual = executeBattleProtocolInput(protocolInput);
  assert.deepEqual(actual, expected);
  const retained = structuredClone(actual);
  executeBattleProtocolInput({ ...protocolInput, partyHp: 77, partyMaxHp: 77 });
  assert.deepEqual(actual, retained, 'later arena reuse must not mutate returned objects or arrays');
});

test('owned diagnostic decoding reports its exact event and bag materializations', () => {
  beginBattleKernelMeasurement();
  const output = executeBattleProtocolInput(protocolInput);
  const measurement = endBattleKernelMeasurement();
  assert.equal(measurement.decodedEventObjectAllocations, output.events.length);
  assert.equal(
    measurement.decodedBagEntryObjectAllocations,
    output.physicalThreatBag.length + output.magicalThreatBag.length,
  );
  assert.equal(measurement.resultBagEntryObjectAllocations, 0);
});

test('canonical direct writer enforces the exact input-arena ceiling before writing', () => {
  const base = encodeBattleProtocolInput({ ...protocolInput, randomValues: [], physicalThreatBag: [], magicalThreatBag: [] });
  const bagRecords = (BATTLE_PROTOCOL_ARENA_CAPACITY - base.byteLength) / 8;
  assert.ok(Number.isInteger(bagRecords));
  const maximumInput = {
    ...protocolInput,
    randomValues: [],
    physicalThreatBag: Array.from({ length: bagRecords }, () => ({ id: 1, tickets: 1 })),
    magicalThreatBag: [],
  };
  const exactArena = new Uint8Array(BATTLE_PROTOCOL_ARENA_CAPACITY);
  assert.equal(writeBattleProtocolInput(maximumInput, exactArena), BATTLE_PROTOCOL_ARENA_CAPACITY);
  const sentinel = new Uint8Array(base.byteLength).fill(0xa5);
  assert.throws(() => writeBattleProtocolInput({ ...protocolInput, randomValues: [], physicalThreatBag: [], magicalThreatBag: [] }, sentinel.subarray(0, -1)), /target capacity/);
  assert.ok(sentinel.every((value) => value === 0xa5), 'one-byte target overflow must fail before writing');
  const recordOverflow = { ...maximumInput, physicalThreatBag: [...maximumInput.physicalThreatBag, { id: 1, tickets: 1 }] };
  assert.throws(
    () => encodeBattleProtocolInput(recordOverflow),
    /arena capacity/,
  );
  beginBattleKernelMeasurement();
  assert.throws(() => executeBattleProtocolInput(recordOverflow), /arena capacity/);
  assert.equal(endBattleKernelMeasurement().calls, 0, 'record overflow must reject before native execution');
  assert.deepEqual(executeBattleProtocolInput(protocolInput), executeBattleProtocol(encodeBattleProtocolInput(protocolInput)));
});

test('decoder accepts the exact semantic-event ceiling and rejects one-record overflow', () => {
  const makeOutput = (eventCount: number) => {
    const totalSize = BATTLE_OUTPUT_HEADER_SIZE + eventCount * BATTLE_EVENT_RECORD_SIZE;
    const bytes = new Uint8Array(totalSize);
    const view = new DataView(bytes.buffer);
    view.setUint32(BATTLE_OUTPUT_OFFSETS.magic, BATTLE_PROTOCOL_OUTPUT_MAGIC, true);
    view.setUint16(BATTLE_OUTPUT_OFFSETS.version, BATTLE_PROTOCOL_VERSION, true);
    view.setUint16(BATTLE_OUTPUT_OFFSETS.headerSize, BATTLE_OUTPUT_HEADER_SIZE, true);
    view.setUint32(BATTLE_OUTPUT_OFFSETS.totalSize, totalSize, true);
    view.setUint32(BATTLE_OUTPUT_OFFSETS.eventCount, eventCount, true);
    view.setUint32(BATTLE_OUTPUT_OFFSETS.eventsOffset, BATTLE_OUTPUT_HEADER_SIZE, true);
    for (let index = 0; index < eventCount; index += 1) {
      view.setUint16(BATTLE_OUTPUT_HEADER_SIZE + index * BATTLE_EVENT_RECORD_SIZE + BATTLE_EVENT_OFFSETS.opcode, BATTLE_EVENT_OPCODES.protocol_ready, true);
    }
    return bytes;
  };
  const maximum = decodeBattleProtocolOutput(makeOutput(BATTLE_PROTOCOL_MAX_SEMANTIC_EVENTS));
  assert.equal(maximum.events.length, BATTLE_PROTOCOL_MAX_SEMANTIC_EVENTS);
  assert.throws(() => decodeBattleProtocolOutput(makeOutput(BATTLE_PROTOCOL_MAX_SEMANTIC_EVENTS + 1)), /event count exceeds/);
  assert.equal(executeBattleProtocolInput(checkpointInput()).protocolError, 0, 'output overflow must not contaminate the next battle');
});

test('borrowed reader validates headers, spans, enums, exact capacity, indexed fields, and bags once', () => {
  const bytes = syntheticOutput(BATTLE_PROTOCOL_MAX_SEMANTIC_EVENTS);
  const view = new DataView(bytes.buffer);
  const lastOffset = BATTLE_OUTPUT_HEADER_SIZE + (BATTLE_PROTOCOL_MAX_SEMANTIC_EVENTS - 1) * BATTLE_EVENT_RECORD_SIZE;
  view.setUint32(BATTLE_OUTPUT_HEADER_SIZE + BATTLE_EVENT_OFFSETS.actorId, 11, true);
  view.setUint32(lastOffset + BATTLE_EVENT_OFFSETS.actorId, 99, true);
  const borrowed = new BorrowedBattleProtocolOutputView(bytes);
  assert.equal(borrowed.eventCount, 4_096);
  assert.equal(borrowed.eventActorId(0), 11);
  assert.equal(borrowed.eventActorId(4_095), 99);
  const bagBytes = syntheticOutput(1, 1, 1);
  const bagData = new DataView(bagBytes.buffer);
  const physicalOffset = bagData.getUint32(BATTLE_OUTPUT_OFFSETS.physicalBagOffset, true);
  const magicalOffset = bagData.getUint32(BATTLE_OUTPUT_OFFSETS.magicalBagOffset, true);
  bagData.setInt32(physicalOffset, -7, true);
  bagData.setUint32(physicalOffset + 4, 16, true);
  bagData.setInt32(magicalOffset, 6, true);
  bagData.setUint32(magicalOffset + 4, 2, true);
  const bagView = new BorrowedBattleProtocolOutputView(bagBytes);
  assert.deepEqual([bagView.physicalThreatBagId(0), bagView.physicalThreatBagTickets(0)], [-7, 16]);
  assert.deepEqual([bagView.magicalThreatBagId(0), bagView.magicalThreatBagTickets(0)], [6, 2]);

  assert.throws(() => new BorrowedBattleProtocolOutputView(syntheticOutput(4_097)), /event count exceeds/);
  const corrupt = (mutate: (data: DataView) => void, pattern: RegExp) => {
    const candidate = syntheticOutput(1);
    mutate(new DataView(candidate.buffer));
    assert.throws(() => new BorrowedBattleProtocolOutputView(candidate), pattern);
  };
  corrupt((data) => data.setUint32(BATTLE_OUTPUT_OFFSETS.magic, 0, true), /magic/);
  corrupt((data) => data.setUint16(BATTLE_OUTPUT_OFFSETS.version, 2, true), /version/);
  corrupt((data) => data.setUint16(BATTLE_OUTPUT_OFFSETS.headerSize, 0, true), /header size/);
  corrupt((data) => data.setUint32(BATTLE_OUTPUT_OFFSETS.totalSize, 0, true), /output size/);
  corrupt((data) => data.setUint8(BATTLE_OUTPUT_OFFSETS.outcome, 9), /outcome/);
  corrupt((data) => data.setUint32(BATTLE_OUTPUT_OFFSETS.eventsOffset, 0, true), /events span/);
  corrupt((data) => data.setUint16(BATTLE_OUTPUT_HEADER_SIZE + BATTLE_EVENT_OFFSETS.opcode, 0xffff, true), /opcode/);
  corrupt((data) => data.setUint16(BATTLE_OUTPUT_HEADER_SIZE + BATTLE_EVENT_OFFSETS.abilityId, 0xffff, true), /ability/);
  corrupt((data) => data.setUint8(BATTLE_OUTPUT_HEADER_SIZE + BATTLE_EVENT_OFFSETS.attackType, 0xff), /attack type/);
  const empty = new BorrowedBattleProtocolOutputView(syntheticOutput(1));
  assert.equal(empty.physicalThreatBagCount + empty.magicalThreatBagCount, 0);
});

test('borrowed indexed getters reject every invalid index without contaminating cached access', () => {
  const bytes = syntheticOutput(2, 1, 1);
  const data = new DataView(bytes.buffer);
  data.setUint32(BATTLE_OUTPUT_HEADER_SIZE + BATTLE_EVENT_OFFSETS.actorId, 11, true);
  data.setUint32(BATTLE_OUTPUT_HEADER_SIZE + BATTLE_EVENT_RECORD_SIZE + BATTLE_EVENT_OFFSETS.actorId, 99, true);
  const physicalOffset = data.getUint32(BATTLE_OUTPUT_OFFSETS.physicalBagOffset, true);
  const magicalOffset = data.getUint32(BATTLE_OUTPUT_OFFSETS.magicalBagOffset, true);
  data.setInt32(physicalOffset, -7, true);
  data.setUint32(physicalOffset + BATTLE_BAG_OFFSETS.tickets, 16, true);
  data.setInt32(magicalOffset, 6, true);
  data.setUint32(magicalOffset + BATTLE_BAG_OFFSETS.tickets, 2, true);

  const firstAccessInvalidIndices = [-1, 2, 0.5, Number.NaN, Number.POSITIVE_INFINITY];
  for (const invalidIndex of firstAccessInvalidIndices) {
    const fresh = new BorrowedBattleProtocolOutputView(bytes);
    assert.throws(() => fresh.eventActorId(invalidIndex), RangeError);
    assert.equal(fresh.eventActorId(0), 11, 'a rejected first access must not contaminate the reader');
  }

  const eventGetters: Array<(view: BorrowedBattleProtocolOutputView, index: number) => unknown> = [
    (view, index) => view.eventOpcode(index),
    (view, index) => view.eventPhase(index),
    (view, index) => view.eventActorKind(index),
    (view, index) => view.eventActorId(index),
    (view, index) => view.eventTargetId(index),
    (view, index) => view.eventAbilityId(index),
    (view, index) => view.eventAttackType(index),
    (view, index) => view.eventFlags(index),
    (view, index) => view.eventTiming(index),
    (view, index) => view.eventHits(index),
    (view, index) => view.eventAttempts(index),
    (view, index) => view.eventAux0(index),
    (view, index) => view.eventValue0(index),
    (view, index) => view.eventValue1(index),
    (view, index) => view.eventValue2(index),
    (view, index) => view.eventAux1(index),
    (view, index) => view.eventAux2(index),
  ];
  for (const getter of eventGetters) {
    const reader = new BorrowedBattleProtocolOutputView(bytes);
    getter(reader, 1);
    assert.throws(() => getter(reader, -1), RangeError);
    assert.throws(() => getter(reader, reader.eventCount), RangeError);
    assert.equal(reader.eventActorId(1), 99, 'rejection after a cached access must preserve the cached record');
  }

  const bagGetters: Array<(view: BorrowedBattleProtocolOutputView, index: number) => unknown> = [
    (view, index) => view.physicalThreatBagId(index),
    (view, index) => view.physicalThreatBagTickets(index),
    (view, index) => view.magicalThreatBagId(index),
    (view, index) => view.magicalThreatBagTickets(index),
  ];
  for (const getter of bagGetters) {
    const reader = new BorrowedBattleProtocolOutputView(bytes);
    assert.throws(() => getter(reader, -1), RangeError);
    assert.throws(() => getter(reader, 1), RangeError);
    assert.throws(() => getter(reader, 0.5), RangeError);
  }
  const recovered = new BorrowedBattleProtocolOutputView(bytes);
  assert.throws(() => recovered.physicalThreatBagId(Number.NaN), RangeError);
  assert.throws(() => recovered.magicalThreatBagId(Number.POSITIVE_INFINITY), RangeError);
  assert.deepEqual([recovered.physicalThreatBagId(0), recovered.physicalThreatBagTickets(0)], [-7, 16]);
  assert.deepEqual([recovered.magicalThreatBagId(0), recovered.magicalThreatBagTickets(0)], [6, 2]);
});

test('borrowed consumer invalidates escaped views and releases its guard after consumer and narration failures', () => {
  const baseline = executeBattleProtocolInput(checkpointInput());
  let escaped: BorrowedBattleProtocolOutputView | undefined;
  consumeBattleProtocolInput(checkpointInput(), (output) => {
    escaped = output;
    assert.ok(output.eventCount > 0);
    return output.outcome;
  });
  assert.throws(() => escaped!.eventOpcode(0), /no longer active/);
  assert.throws(() => escaped!.eventCount, /no longer active/);
  assert.throws(() => escaped!.byteLength, /no longer active/);
  assert.throws(() => consumeBattleProtocolInput(checkpointInput(), () => {
    throw new Error('consumer failed');
  }), /consumer failed/);
  assert.deepEqual(executeBattleProtocolInput(checkpointInput()), baseline);
  assert.throws(() => consumeBattleProtocolInput(checkpointInput(), (output) => {
    output.eventOpcode(0);
    throw new Error('narration failed');
  }), /narration failed/);
  assert.deepEqual(executeBattleProtocolInput(checkpointInput()), baseline);
  growBattleProtocolMemoryForTesting();
  assert.equal(consumeBattleProtocolInput(checkpointInput(), (output) => output.protocolError), 0);
});

test('shared reentrancy guard rejects nested structured execution before arena mutation and recovers', () => {
  const baseline = executeBattleProtocolInput(protocolInput);
  const reentrant = { ...protocolInput } as BattleProtocolInput;
  Object.defineProperty(reentrant, 'combatants', {
    get() {
      executeBattleProtocolInput(protocolInput);
      return protocolInput.combatants;
    },
  });
  beginBattleKernelMeasurement();
  assert.throws(() => executeBattleProtocolInput(reentrant), /Nested or reentrant/);
  assert.equal(endBattleKernelMeasurement().calls, 0);
  assert.deepEqual(executeBattleProtocolInput(protocolInput), baseline);
});

test('the Wasm protocol reuses fixed input and output arenas', () => {
  const before = getBattleProtocolArenaInfo();
  probeBattleProtocol(encodeBattleProtocolInput(protocolInput));
  const after = getBattleProtocolArenaInfo();
  assert.deepEqual(after, before);
  assert.equal(after.capacity, BATTLE_PROTOCOL_ARENA_CAPACITY);
  assert.notEqual(after.inputPointer, after.outputPointer);
});

test('direct arena views are recreated after Wasm memory growth', () => {
  const before = executeBattleProtocolInput(protocolInput);
  growBattleProtocolMemoryForTesting();
  assert.deepEqual(executeBattleProtocolInput(protocolInput), before);
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
    engineFlags: BATTLE_ENGINE_FLAG_START_CHECKPOINT,
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

test('full seeded battle execution resets state and emits ordered phases', () => {
  const input = seededEndInput(0x1234n);
  const first = executeBattleProtocol(encodeBattleProtocolInput(input));
  assert.equal(first.protocolError, 0);
  assert.equal(first.randomConsumed, first.diagnosticDrawCount);
  assert.equal(first.events[0]?.opcode, 'battle_started');
  assert.equal(first.events.at(-1)?.opcode, 'battle_finished');
  assert.ok(first.events.some((event) => event.opcode === 'initiative'));
  assert.ok(first.physicalThreatBag.length > 0);
  assert.deepEqual(executeBattleProtocol(encodeBattleProtocolInput(input)), first);
});

test('compact seeded output preserves resolution and bags without serializing semantic records', () => {
  const input = seededEndInput(0x1234n);
  const full = executeBattleProtocolInput(input);
  const compact = executeBattleProtocolInput({
    ...input,
    engineFlags: input.engineFlags! | BATTLE_ENGINE_FLAG_COMPACT_RESULT_OUTPUT,
  });
  assert.deepEqual(compact.events, []);
  assert.deepEqual({
    outcome: compact.outcome,
    partyHp: compact.partyHp,
    enemyHp: compact.enemyHp,
    enemyHitsReceived: compact.enemyHitsReceived,
    randomConsumed: compact.randomConsumed,
    diagnosticDrawCount: compact.diagnosticDrawCount,
    physicalThreatBag: compact.physicalThreatBag,
    magicalThreatBag: compact.magicalThreatBag,
  }, {
    outcome: full.outcome,
    partyHp: full.partyHp,
    enemyHp: full.enemyHp,
    enemyHitsReceived: full.enemyHitsReceived,
    randomConsumed: full.randomConsumed,
    diagnosticDrawCount: full.diagnosticDrawCount,
    physicalThreatBag: full.physicalThreatBag,
    magicalThreatBag: full.magicalThreatBag,
  });
  assert.ok(compact.byteLength < full.byteLength * 0.25);
  assert.equal(executeBattleProtocolInput({
    ...input,
    engineFlags: BATTLE_ENGINE_FLAG_END_CHECKPOINT | BATTLE_ENGINE_FLAG_COMPACT_RESULT_OUTPUT,
  }).protocolError, BATTLE_PROTOCOL_ERROR_CODES.unsupportedCombatFeature);
});

test('seeded mode rejects mixed tapes, unsupported versions, and non-END checkpoints transactionally', () => {
  const mixed = executeBattleProtocol(encodeBattleProtocolInput({
    ...protocolInput,
    engineFlags: BATTLE_ENGINE_FLAG_END_CHECKPOINT | BATTLE_ENGINE_FLAG_SEEDED_RNG,
  }));
  assert.equal(mixed.protocolError, BATTLE_PROTOCOL_ERROR_CODES.seededModeConflict);
  assert.equal(mixed.randomConsumed, 0);
  assert.equal(mixed.diagnosticDrawCount, 0);
  assert.deepEqual(mixed.events, []);
  assert.deepEqual(mixed.physicalThreatBag, []);
  assert.deepEqual(mixed.magicalThreatBag, []);

  const unsupported = executeBattleProtocol(encodeBattleProtocolInput({
    ...protocolInput,
    randomValues: [],
    rngVersion: 2,
    engineFlags: BATTLE_ENGINE_FLAG_END_CHECKPOINT | BATTLE_ENGINE_FLAG_SEEDED_RNG,
  }));
  assert.equal(unsupported.protocolError, BATTLE_PROTOCOL_ERROR_CODES.unsupportedRngVersion);
  assert.equal(unsupported.randomConsumed, 0);
  assert.deepEqual(unsupported.events, []);

  const checkpointConflict = executeBattleProtocol(encodeBattleProtocolInput({
    ...protocolInput,
    randomValues: [],
    engineFlags: BATTLE_ENGINE_FLAG_START_CHECKPOINT | BATTLE_ENGINE_FLAG_SEEDED_RNG,
  }));
  assert.equal(checkpointConflict.protocolError, BATTLE_PROTOCOL_ERROR_CODES.seededModeConflict);

  const noCoordinator = executeBattleProtocol(encodeBattleProtocolInput({
    ...protocolInput,
    seed: 0xffff_ffff_ffff_ffffn,
    rngVersion: 1,
    engineFlags: 0,
  }));
  assert.equal(noCoordinator.protocolError, BATTLE_PROTOCOL_ERROR_CODES.unsupportedCombatFeature);
  assert.equal(noCoordinator.randomConsumed, 0);
  assert.equal(noCoordinator.diagnosticDrawCount, 0);
  assert.deepEqual(noCoordinator.events, []);
  assert.deepEqual(noCoordinator.physicalThreatBag, []);
  assert.deepEqual(noCoordinator.magicalThreatBag, []);

  const validAfterRejection = executeBattleProtocol(encodeBattleProtocolInput(seededEndInput(0xffff_ffff_ffff_ffffn)));
  assert.equal(validAfterRejection.protocolError, 0);
  assert.ok(validAfterRejection.events.length > 0);
});

function checkpointInput(overrides: Partial<BattleProtocolInput> = {}): BattleProtocolInput {
  return {
    partyHp: 100,
    partyMaxHp: 100,
    enemyHp: 100,
    enemyMaxHp: 100,
    engineFlags: BATTLE_ENGINE_FLAG_START_CHECKPOINT,
    combatants: [
      {
        id: 900,
        kind: 'enemy',
        row: 0,
        elementalOffense: 'none',
        hp: 100,
        maxHp: 100,
        rangedAttack: 0,
        magicalAttack: 0,
        meleeAttack: 0,
        rangedNoA: 0,
        magicalNoA: 0,
        meleeNoA: 0,
        physicalDefense: 0,
        magicalDefense: 0,
        accuracyBonus: 0,
        evasionBonus: 0,
        elementalOffenseValue: 1,
        abilities: [],
      },
      {
        id: 1,
        kind: 'character',
        row: 1,
        elementalOffense: 'none',
        hp: 100,
        maxHp: 100,
        rangedAttack: 0,
        magicalAttack: 0,
        meleeAttack: 0,
        rangedNoA: 0,
        magicalNoA: 0,
        meleeNoA: 0,
        physicalDefense: 0,
        magicalDefense: 0,
        accuracyBonus: 0,
        evasionBonus: 0,
        elementalOffenseValue: 1,
        abilities: [],
      },
    ],
    randomValues: [],
    physicalThreatBag: [],
    magicalThreatBag: [],
    ...overrides,
  };
}

function seededEndInput(seed: bigint): BattleProtocolInput {
  const base = checkpointInput();
  return checkpointInput({
    seed,
    rngVersion: 1,
    engineFlags: BATTLE_ENGINE_FLAG_END_CHECKPOINT | BATTLE_ENGINE_FLAG_SEEDED_RNG,
    physicalThreatBag: [{ id: 1, tickets: 1 }],
    magicalThreatBag: [{ id: 1, tickets: 1 }],
    combatants: [
      { ...base.combatants[0]!, rangedAttack: 10, rangedNoA: 2 },
      { ...base.combatants[1]!, meleeAttack: 10, meleeNoA: 2 },
    ],
  });
}

function executeInIndependentInstance(input: BattleProtocolInput) {
  const instance = new WebAssembly.Instance(new WebAssembly.Module(BATTLE_KERNEL_WASM), {});
  const exports = instance.exports as WebAssembly.Exports & {
    memory: WebAssembly.Memory;
    battle_protocol_input_arena(): number;
    battle_protocol_output_arena(): number;
    battle_protocol_execute(byteLength: number): number;
  };
  const encoded = encodeBattleProtocolInput(input);
  new Uint8Array(exports.memory.buffer, exports.battle_protocol_input_arena(), encoded.length).set(encoded);
  const outputLength = exports.battle_protocol_execute(encoded.length);
  assert.ok(outputLength > 0);
  const bytes = new Uint8Array(outputLength);
  bytes.set(new Uint8Array(exports.memory.buffer, exports.battle_protocol_output_arena(), outputLength));
  return decodeBattleProtocolOutput(bytes);
}

test('seeded battles reset after failures and remain isolated across Wasm instances', () => {
  const input = seededEndInput(0xffff_ffff_ffff_ffffn);
  const baseline = executeBattleProtocol(encodeBattleProtocolInput(input));
  assert.equal(baseline.protocolError, 0);
  assert.equal(baseline.randomConsumed, baseline.diagnosticDrawCount);

  const failed = executeBattleProtocol(encodeBattleProtocolInput({ ...input, rngVersion: 2 }));
  assert.equal(failed.protocolError, BATTLE_PROTOCOL_ERROR_CODES.unsupportedRngVersion);
  assert.equal(failed.randomConsumed, 0);
  assert.deepEqual(failed.events, []);
  assert.deepEqual(executeBattleProtocol(encodeBattleProtocolInput(input)), baseline);

  const firstInstance = executeInIndependentInstance(input);
  const secondInstance = executeInIndependentInstance(input);
  assert.deepEqual(firstInstance, baseline);
  assert.deepEqual(secondInstance, baseline);

  const divergent = executeBattleProtocol(encodeBattleProtocolInput(seededEndInput(1n)));
  assert.equal(divergent.protocolError, 0);
  assert.notDeepEqual(divergent.events, baseline.events);
});

test('START checkpoint resolves an empty slice and leaves outcome unresolved', () => {
  const output = executeBattleProtocol(encodeBattleProtocolInput(checkpointInput()));
  assert.equal(output.protocolError, 0);
  assert.equal(output.outcome, 'unresolved');
  assert.equal(output.randomConsumed, 0);
  assert.equal(output.diagnosticDrawCount, 0);
  assert.deepEqual(output.events.map((event) => event.opcode), ['battle_started', 'phase_started', 'phase_ended']);
});

test('START checkpoint preserves immediate terrain, initiative, then timed draw order', () => {
  const randomValues = [0, 0, 0.39, 0, 0.1, 0.2, 0.3, 0.4, 0.75, 0.25];
  const input = checkpointInput({
    terrainEffect: 'terrain.deletion',
    randomValues,
    combatants: [
      {
        ...checkpointInput().combatants[0]!,
        rangedAttack: 10,
        rangedNoA: 1,
        abilities: [{ id: 'oblivion', level: 1 }],
      },
      {
        ...checkpointInput().combatants[1]!,
        meleeAttack: 10,
        meleeNoA: 1,
        abilities: [{ id: 'fading_memory', level: 1 }],
      },
    ],
  });
  const output = executeBattleProtocol(encodeBattleProtocolInput(input));
  assert.equal(output.protocolError, 0);
  assert.equal(output.randomConsumed, randomValues.length);
  assert.equal(output.diagnosticDrawCount, randomValues.length);
  const deletion = output.events.find((event) => event.opcode === 'ability_mutated' && (event.flags & 8) !== 0);
  assert.equal(deletion?.targetId, 900);
  assert.equal(deletion?.abilityId, 'oblivion');
  assert.equal(output.events.find((event) => event.opcode === 'random_flavor')?.aux0, 3);
  assert.deepEqual(
    output.events.filter((event) => event.opcode === 'initiative').map((event) => [event.actorId, event.attackType, event.timing]),
    [[900, 'ranged', 4], [1, 'melee', 2]],
  );
  assert.ok(output.events.find((event) => event.opcode === 'ability_mutated' && event.timing === 8));

  const exhausted = executeBattleProtocol(encodeBattleProtocolInput({ ...input, randomValues: randomValues.slice(0, -1) }));
  assert.equal(exhausted.protocolError, BATTLE_PROTOCOL_ERROR_CODES.tapeExhausted);
  assert.equal(exhausted.randomConsumed, randomValues.length - 1);
  assert.equal(exhausted.diagnosticDrawCount, randomValues.length - 1);
  assert.equal(exhausted.events.length, 0, 'errors must not expose truncated semantic output');
});

test('START checkpoint emits Deletion prevention, transformations, Silence exceptions, and deity statuses', () => {
  const unforgettable = executeBattleProtocol(encodeBattleProtocolInput(checkpointInput({
    terrainEffect: 'terrain.deletion',
    randomValues: [0],
    combatants: [
      { ...checkpointInput().combatants[0]!, abilities: [{ id: 'unforgettable', level: 1 }] },
      checkpointInput().combatants[1]!,
    ],
  })));
  assert.equal(unforgettable.randomConsumed, 1);
  assert.ok(unforgettable.events.some((event) => event.abilityId === 'unforgettable' && (event.flags & 1) !== 0));

  const emptyDeletion = executeBattleProtocol(encodeBattleProtocolInput(checkpointInput({
    terrainEffect: 'terrain.deletion',
    randomValues: [0, 0],
  })));
  assert.equal(emptyDeletion.randomConsumed, 2, 'an empty Deletion target still consumes the frozen ability-selection draw');
  assert.equal(emptyDeletion.events.some((event) => event.opcode === 'ability_mutated'), false);

  const transformed = executeBattleProtocol(encodeBattleProtocolInput(checkpointInput({
    terrainEffect: 'terrain.transcendence',
    combatants: [
      { ...checkpointInput().combatants[0]!, abilities: [{ id: 'oblivion', level: 5 }] },
      { ...checkpointInput().combatants[1]!, abilities: [{ id: 'magic_seal', level: 2 }] },
    ],
    randomValues: [0, 0],
  })));
  const mutation = transformed.events.find((event) => event.abilityId === 'magic_seal' && event.opcode === 'ability_mutated');
  assert.deepEqual([mutation?.value0, mutation?.value1], [2, 3]);
  assert.equal(transformed.events.some((event) => event.abilityId === 'oblivion' && event.opcode === 'ability_mutated'), false);

  const suppressed = executeBattleProtocol(encodeBattleProtocolInput(checkpointInput({
    terrainEffect: 'terrain.suppression',
    combatants: [
      checkpointInput().combatants[0]!,
      { ...checkpointInput().combatants[1]!, abilities: [{ id: 'magic_seal', level: 3 }, { id: 'defiance', level: 1 }] },
    ],
  })));
  assert.equal(suppressed.events.some((event) => event.opcode === 'ability_mutated'), false);
  const suppressionApplied = executeBattleProtocol(encodeBattleProtocolInput(checkpointInput({
    terrainEffect: 'terrain.suppression',
    combatants: [
      checkpointInput().combatants[0]!,
      { ...checkpointInput().combatants[1]!, abilities: [{ id: 'magic_seal', level: 3 }] },
    ],
  })));
  const suppressedMutation = suppressionApplied.events.find((event) => event.opcode === 'ability_mutated');
  assert.deepEqual([suppressedMutation?.value0, suppressedMutation?.value1], [3, 2]);

  const silence = executeBattleProtocol(encodeBattleProtocolInput(checkpointInput({
    terrainEffect: 'terrain.silence-field',
    combatants: [
      { ...checkpointInput().combatants[0]!, abilities: [{ id: 'magic_seal', level: 1 }] },
      { ...checkpointInput().combatants[1]!, abilities: [{ id: 'magic_seal', level: 1 }, { id: 'equation_breaker', level: 1 }, { id: 'domain_breaker', level: 1 }] },
    ],
  })));
  assert.equal(silence.events.filter((event) => event.abilityId === 'magic_seal').length, 1);
  assert.ok(silence.events.some((event) => event.abilityId === 'equation_breaker'));
  assert.ok(silence.events.some((event) => event.abilityId === 'domain_breaker'));

  const discord = executeBattleProtocol(encodeBattleProtocolInput(checkpointInput({ deityId: BATTLE_DEITY_IDS.goddess_of_discord, randomValues: [0] })));
  assert.ok(discord.events.some((event) => event.opcode === 'status_applied' && event.targetId === 1));
  const nullDiscord = executeBattleProtocol(encodeBattleProtocolInput(checkpointInput({
    deityId: BATTLE_DEITY_IDS.goddess_of_discord,
    randomValues: [0],
    combatants: [checkpointInput().combatants[0]!, { ...checkpointInput().combatants[1]!, abilities: [{ id: 'null_antagonism', level: 1 }] }],
  })));
  assert.ok(nullDiscord.events.some((event) => event.abilityId === 'null_antagonism' && (event.flags & 1) !== 0));

  const oblivionDeity = executeBattleProtocol(encodeBattleProtocolInput(checkpointInput({
    deityId: BATTLE_DEITY_IDS.god_of_oblivion,
    randomValues: [0, 0],
  })));
  assert.ok(oblivionDeity.events.some((event) => event.abilityId === 'fading_memory' && (event.flags & 16) !== 0));
  const gehenna = executeBattleProtocol(encodeBattleProtocolInput(checkpointInput({
    deityId: BATTLE_DEITY_IDS.god_of_oblivion,
    terrainEffect: 'terrain.gehenna',
  })));
  assert.equal(gehenna.events.some((event) => event.abilityId === 'fading_memory'), false);
});

test('START checkpoint resolves Oblivion, Fading Memory, Mimic, and timing-3 facts in owner order', () => {
  const output = executeBattleProtocol(encodeBattleProtocolInput(checkpointInput({
    randomValues: [0, 0, 0, 0, 0, 0],
    combatants: [
      { ...checkpointInput().combatants[0]!, abilities: [{ id: 'fading_memory', level: 1 }, { id: 'mimic', level: 1 }, { id: 'frostbite', level: 1 }] },
      { ...checkpointInput().combatants[1]!, abilities: [{ id: 'oblivion', level: 1 }, { id: 'magic_seal', level: 1 }, { id: 'mutual_magic_amplify', level: 2 }] },
    ],
  })));
  assert.equal(output.protocolError, 0);
  const timedMutations = output.events.filter((event) => event.opcode === 'ability_mutated');
  assert.ok(timedMutations.some((event) => event.timing === 9 && event.actorId === 1 && event.targetId === 900));
  assert.ok(timedMutations.some((event) => event.timing === 8));
  assert.ok(output.events.some((event) => event.timing === 3 && event.abilityId === 'magic_seal'));
  assert.ok(output.events.some((event) => event.timing === 3 && event.abilityId === 'frostbite'));
  assert.ok(output.events.some((event) => event.timing === 3 && event.abilityId === 'mutual_magic_amplify' && (event.flags & 32) !== 0));

  const mimic = executeBattleProtocol(encodeBattleProtocolInput(checkpointInput({
    randomValues: [0, 0],
    combatants: [
      { ...checkpointInput().combatants[0]!, abilities: [{ id: 'mimic', level: 1 }] },
      { ...checkpointInput().combatants[1]!, abilities: [{ id: 'magic_seal', level: 2 }] },
    ],
  })));
  assert.ok(mimic.events.some((event) => event.timing === 8 && event.actorId === 900
    && event.targetId === 1 && event.abilityId === 'magic_seal' && (event.flags & 2) !== 0));

  const reset = executeBattleProtocol(encodeBattleProtocolInput(checkpointInput()));
  assert.deepEqual(reset.events.map((event) => event.opcode), ['battle_started', 'phase_started', 'phase_ended']);
  assert.equal(reset.randomConsumed, 0);
});

test('checked-in full-battle Wasm has no imports and exports the v3 executor', () => {
  const module = new WebAssembly.Module(BATTLE_KERNEL_WASM);
  assert.deepEqual(WebAssembly.Module.imports(module), []);
  assert.ok(WebAssembly.Module.exports(module).some((entry) => entry.name === 'battle_protocol_execute' && entry.kind === 'function'));
});

function combatBaseInput(overrides: Partial<BattleProtocolInput> = {}): BattleProtocolInput {
  const base = checkpointInput();
  return {
    ...base,
    engineFlags: BATTLE_ENGINE_FLAG_COMBAT_BASE_CHECKPOINT,
    physicalThreatBag: [{ id: 1, tickets: 8 }, { id: 2, tickets: 8 }],
    magicalThreatBag: [{ id: 1, tickets: 8 }, { id: 2, tickets: 8 }],
    combatants: [
      {
        ...base.combatants[0]!,
        rangedAccuracyPotency: 1,
        magicalAccuracyPotency: 1,
        meleeAccuracyPotency: 1,
        physicalPenetration: 0,
        magicalPenetration: 0,
        physicalOffenseAmplifier: 1,
        magicalOffenseAmplifier: 1,
        physicalDefenseAmplifier: 1,
        magicalDefenseAmplifier: 1,
        deityPhysicalDefenseBonus: 1,
        deityMagicalDefenseBonus: 1,
        enemyRangedAmplifier: 1,
        enemyMagicalAmplifier: 1,
        enemyMeleeAmplifier: 1,
      },
      {
        ...base.combatants[1]!,
        rangedAccuracyPotency: 1,
        magicalAccuracyPotency: 1,
        meleeAccuracyPotency: 1,
        physicalPenetration: 0,
        magicalPenetration: 0,
        physicalOffenseAmplifier: 1,
        magicalOffenseAmplifier: 1,
        physicalDefenseAmplifier: 1,
        magicalDefenseAmplifier: 1,
        deityPhysicalDefenseBonus: 1,
        deityMagicalDefenseBonus: 1,
      },
      {
        ...base.combatants[1]!, id: 2, row: 2,
        rangedAccuracyPotency: 1,
        magicalAccuracyPotency: 1,
        meleeAccuracyPotency: 1,
        physicalPenetration: 0,
        magicalPenetration: 0,
        physicalOffenseAmplifier: 1,
        magicalOffenseAmplifier: 1,
        physicalDefenseAmplifier: 1,
        magicalDefenseAmplifier: 1,
        deityPhysicalDefenseBonus: 1,
        deityMagicalDefenseBonus: 1,
      },
    ],
    ...overrides,
  };
}

function combatNormalInput(overrides: Partial<BattleProtocolInput> = {}): BattleProtocolInput {
  const base = combatBaseInput();
  return {
    ...base,
    engineFlags: BATTLE_ENGINE_FLAG_COMBAT_NORMAL_CHECKPOINT,
    combatants: base.combatants.slice(0, 2),
    physicalThreatBag: [{ id: 1, tickets: 32 }],
    magicalThreatBag: [{ id: 1, tickets: 32 }],
    ...overrides,
  };
}

function combatReactiveInput(overrides: Partial<BattleProtocolInput> = {}): BattleProtocolInput {
  return {
    ...combatNormalInput(),
    engineFlags: BATTLE_ENGINE_FLAG_COMBAT_REACTIVE_CHECKPOINT,
    ...overrides,
  };
}

function combatTimedInput(overrides: Partial<BattleProtocolInput> = {}): BattleProtocolInput {
  return { ...combatReactiveInput(), engineFlags: BATTLE_ENGINE_FLAG_COMBAT_TIMED_CHECKPOINT, ...overrides };
}

function endCheckpointInput(overrides: Partial<BattleProtocolInput> = {}): BattleProtocolInput {
  return { ...combatTimedInput(), engineFlags: BATTLE_ENGINE_FLAG_END_CHECKPOINT, ...overrides };
}

test('END checkpoint flag is exclusive and unknown bits reject transactionally', () => {
  const earlier = [
    BATTLE_ENGINE_FLAG_START_CHECKPOINT,
    BATTLE_ENGINE_FLAG_COMBAT_BASE_CHECKPOINT,
    BATTLE_ENGINE_FLAG_COMBAT_NORMAL_CHECKPOINT,
    BATTLE_ENGINE_FLAG_COMBAT_REACTIVE_CHECKPOINT,
    BATTLE_ENGINE_FLAG_COMBAT_TIMED_CHECKPOINT,
  ];
  for (const flags of [...earlier.map((flag) => flag | BATTLE_ENGINE_FLAG_END_CHECKPOINT), 2 ** 31]) {
    const output = executeBattleProtocol(encodeBattleProtocolInput(endCheckpointInput({ engineFlags: flags, randomValues: [0.5] })));
    assert.equal(output.protocolError, BATTLE_PROTOCOL_ERROR_CODES.unsupportedCombatFeature);
    assert.equal(output.randomConsumed, 0);
    assert.equal(output.diagnosticDrawCount, 0);
    assert.deepEqual(output.events, []);
    assert.deepEqual(output.physicalThreatBag, []);
    assert.deepEqual(output.magicalThreatBag, []);
  }
});

test('END checkpoint traverses reserved END once without drawing and finalizes surviving combat as draw', () => {
  const input = endCheckpointInput({
    partyHp: 9_000_000_000,
    partyMaxHp: 9_000_000_000,
    enemyHp: 8_000_000_000,
    enemyMaxHp: 8_000_000_000,
    randomValues: [0.75],
  });
  const output = executeBattleProtocol(encodeBattleProtocolInput(input));
  assert.equal(output.protocolError, 0);
  assert.equal(output.outcome, 'draw');
  assert.deepEqual([output.partyHp, output.enemyHp], [input.partyHp, input.enemyHp]);
  assert.equal(output.randomConsumed, 0);
  assert.equal(output.diagnosticDrawCount, 0);
  assert.deepEqual(output.physicalThreatBag, input.physicalThreatBag);
  assert.deepEqual(output.magicalThreatBag, input.magicalThreatBag);
  assert.deepEqual(output.events.slice(-4).map((event) => [event.opcode, event.phase, event.timing]), [
    ['phase_started', 3, 49],
    ['phase_ended', 3, 0],
    ['outcome', 3, 0],
    ['battle_finished', 3, 0],
  ]);
  assert.deepEqual(output.events.slice(-2).map((event) => event.value0), [3, 3]);
  assert.equal(output.events.filter((event) => event.opcode === 'phase_started' && event.phase === 3).length, 1);
  assert.equal(output.events.filter((event) => event.opcode === 'phase_ended' && event.phase === 3).length, 1);
});

test('END checkpoint skips END after COMBAT victory or defeat and leaves the tape suffix untouched', () => {
  const cases = [
    {
      expected: 'victory',
      input: endCheckpointInput({
        enemyHp: 1, enemyMaxHp: 100,
        combatants: endCheckpointInput().combatants.map((combatant, index) => index === 1
          ? { ...combatant, rangedAttack: 100, rangedNoA: 1 } : combatant),
        randomValues: [0, 0, 0, 0, 0, 0.75, 0.875],
      }),
    },
    {
      expected: 'defeat',
      input: endCheckpointInput({
        partyHp: 1, partyMaxHp: 100,
        combatants: endCheckpointInput().combatants.map((combatant, index) => index === 0
          ? { ...combatant, rangedAttack: 100, rangedNoA: 1 } : combatant),
        randomValues: [0, 0, 0, 0, 0, 0.75, 0.875],
      }),
    },
  ] as const;
  for (const { expected, input } of cases) {
    const output = executeBattleProtocol(encodeBattleProtocolInput(input));
    assert.equal(output.protocolError, 0);
    assert.equal(output.outcome, expected);
    assert.equal(output.events.some((event) => event.phase === 3), false);
    assert.deepEqual(output.events.slice(-2).map((event) => event.opcode), ['outcome', 'battle_finished']);
    assert.ok(output.randomConsumed < input.randomValues.length);
  }
});

test('END checkpoint gives simultaneous lethality to defeat and preserves exact final state', () => {
  const output = executeBattleProtocol(encodeBattleProtocolInput(endCheckpointInput({
    partyHp: 1,
    partyMaxHp: 100,
    enemyHp: 1,
    enemyMaxHp: 100,
    combatants: endCheckpointInput().combatants.map((combatant, index) => index === 0
      ? { ...combatant, abilities: [{ id: 'self_destruct', level: 5 }], physicalDefense: 0 }
      : { ...combatant, abilities: [], physicalDefense: 0 }),
    physicalThreatBag: [{ id: 1, tickets: 2 }],
    randomValues: [0, 0.2],
  })));
  assert.equal(output.protocolError, 0);
  assert.deepEqual([output.partyHp, output.enemyHp, output.outcome], [0, 0, 'defeat']);
  assert.equal(output.randomConsumed, 2);
  assert.deepEqual(
    output.events.filter((event) => event.opcode === 'random_flavor').map((event) => event.aux0),
    [2],
  );
  assert.equal(output.events.some((event) => event.phase === 3), false);
  assert.deepEqual(output.events.slice(-2).map((event) => event.opcode), ['outcome', 'battle_finished']);
});

test('END checkpoint preserves forced Free draw at source position without entering END', () => {
  const output = executeBattleProtocol(encodeBattleProtocolInput(endCheckpointInput({
    combatants: endCheckpointInput().combatants.map((combatant, index) => index === 0
      ? { ...combatant, abilities: [{ id: 'free', level: 4 }] } : combatant),
    randomValues: [0.875],
  })));
  assert.equal(output.outcome, 'draw');
  assert.equal(output.randomConsumed, 1);
  assert.deepEqual(
    output.events.filter((event) => event.opcode === 'random_flavor').map((event) => event.aux0),
    [8],
  );
  assert.equal(output.events.some((event) => event.phase === 3), false);
  assert.deepEqual(output.events.slice(-2).map((event) => event.opcode), ['outcome', 'battle_finished']);
});

test('END flavor draws use source-order zero-based array boundaries and skipped branches draw nothing', () => {
  for (const [random, expectedIndex] of [[0, 0], [0.999999, 9]] as const) {
    const output = executeBattleProtocol(encodeBattleProtocolInput(endCheckpointInput({
      combatants: endCheckpointInput().combatants.map((combatant, index) => index === 0
        ? { ...combatant, abilities: [{ id: 'free', level: 4 }] } : combatant),
      randomValues: [random],
    })));
    assert.equal(output.protocolError, 0);
    assert.equal(output.randomConsumed, 1);
    assert.deepEqual(
      output.events.filter((event) => event.opcode === 'random_flavor').map((event) => event.aux0),
      [expectedIndex],
    );
  }

  const skipped = executeBattleProtocol(encodeBattleProtocolInput(endCheckpointInput({ randomValues: [0.999999] })));
  assert.equal(skipped.protocolError, 0);
  assert.equal(skipped.randomConsumed, 0);
  assert.equal(skipped.events.some((event) => event.opcode === 'random_flavor'), false);

  const startFlavor = executeBattleProtocol(encodeBattleProtocolInput(endCheckpointInput({
    terrainEffect: 'terrain.deletion',
    combatants: endCheckpointInput().combatants.map((combatant, index) => index === 0
      ? { ...combatant, abilities: [{ id: 'unforgettable', level: 1 }] } : combatant),
    randomValues: [0, 0.999999],
  })));
  assert.equal(startFlavor.protocolError, 0);
  assert.equal(startFlavor.randomConsumed, 2);
  assert.deepEqual(
    startFlavor.events.filter((event) => event.opcode === 'random_flavor').map((event) => [event.abilityId, event.aux0]),
    [['unforgettable', 9]],
  );
});

test('END Burn and Null Burn flavor facts preserve their reversed source ownership', () => {
  const base = endCheckpointInput();
  const executeBurnCase = (nullified: boolean) => executeBattleProtocol(encodeBattleProtocolInput(endCheckpointInput({
    partyHp: 1_000,
    partyMaxHp: 1_000,
    enemyHp: 100,
    enemyMaxHp: 100,
    combatants: base.combatants.map((combatant, index) => index === 0
      ? { ...combatant, abilities: [{ id: 'burn', level: 1 }] }
      : {
        ...combatant,
        meleeAttack: 10,
        meleeNoA: 1,
        abilities: nullified ? [{ id: 'null_burn', level: 1 }] : [],
      }),
    physicalThreatBag: [{ id: 1, tickets: 32 }],
    randomValues: Array(32).fill(0),
  })));

  for (const [nullified, abilityId, opcode] of [
    [false, 'burn', 'damage'],
    [true, 'null_burn', 'nullified'],
  ] as const) {
    const output = executeBurnCase(nullified);
    assert.equal(output.protocolError, 0);
    const sourceIndex = output.events.findIndex((event) => event.opcode === opcode && event.abilityId === abilityId);
    assert.ok(sourceIndex >= 0);
    const source = output.events[sourceIndex]!;
    const flavor = output.events[sourceIndex + 1]!;
    assert.equal(flavor.opcode, 'random_flavor');
    assert.deepEqual(
      [flavor.phase, flavor.actorId, flavor.targetId, flavor.abilityId, flavor.attackType, flavor.timing, flavor.aux1],
      [source.phase, source.actorId, source.targetId, source.abilityId, source.attackType, source.timing, source.aux0],
    );
    assert.deepEqual([source.actorId, source.targetId], [base.combatants[0]!.id, base.combatants[1]!.id]);
  }

  const zeroDamage = executeBattleProtocol(encodeBattleProtocolInput(endCheckpointInput({
    partyHp: 100,
    partyMaxHp: 100,
    combatants: base.combatants.map((combatant, index) => index === 0
      ? { ...combatant, abilities: [{ id: 'burn', level: 1 }] }
      : { ...combatant, meleeAttack: 10, meleeNoA: 1 }),
    physicalThreatBag: [{ id: 1, tickets: 32 }],
    randomValues: Array(32).fill(0),
  })));
  assert.equal(zeroDamage.protocolError, 0);
  assert.equal(zeroDamage.events.some((event) => event.abilityId === 'burn'), false);
});

test('END Equation Breaker flavor fact retains the Silence Field source position', () => {
  const base = endCheckpointInput();
  const output = executeBattleProtocol(encodeBattleProtocolInput(endCheckpointInput({
    terrainEffect: 'terrain.silence-field',
    combatants: [
      base.combatants[0]!,
      { ...base.combatants[1]!, abilities: [{ id: 'equation_breaker', level: 1 }] },
    ],
    randomValues: [0],
  })));
  assert.equal(output.protocolError, 0);
  const sourceIndex = output.events.findIndex((event) => event.opcode === 'ability_activated'
    && event.abilityId === 'equation_breaker');
  assert.ok(sourceIndex >= 0);
  const source = output.events[sourceIndex]!;
  const flavor = output.events[sourceIndex + 1]!;
  assert.equal(flavor.opcode, 'random_flavor');
  assert.deepEqual(
    [flavor.phase, flavor.actorId, flavor.targetId, flavor.abilityId, flavor.attackType, flavor.timing, flavor.aux1],
    [source.phase, source.actorId, source.targetId, source.abilityId, source.attackType, source.timing, source.aux0],
  );
  assert.equal(source.aux0, 13);
});

test('END Discord nullification emits an adjacent flavor fact with matching identity', () => {
  const base = endCheckpointInput();
  const output = executeBattleProtocol(encodeBattleProtocolInput(endCheckpointInput({
    deityId: BATTLE_DEITY_IDS.goddess_of_discord,
    combatants: base.combatants.map((combatant, index) => ({
      ...combatant,
      rangedAttack: 0, magicalAttack: 0, meleeAttack: 0,
      rangedNoA: 0, magicalNoA: 0, meleeNoA: 0,
      abilities: index === 1 ? [{ id: 'null_antagonism', level: 1 }] : [],
    })),
    randomValues: [0, 0.999999],
  })));
  assert.equal(output.protocolError, 0);
  assert.equal(output.randomConsumed, 2);
  const sourceIndex = output.events.findIndex((event) => event.opcode === 'ability_activated'
    && event.abilityId === 'null_antagonism');
  assert.ok(sourceIndex >= 0);
  const source = output.events[sourceIndex]!;
  const flavor = output.events[sourceIndex + 1]!;
  assert.deepEqual(
    [flavor.opcode, flavor.actorId, flavor.targetId, flavor.abilityId, flavor.timing, flavor.aux0, flavor.aux1],
    ['random_flavor', source.actorId, source.targetId, source.abilityId, source.timing, 9, source.aux0],
  );
});

test('END no-target Confusion can select all thirteen flavor entries', () => {
  const base = endCheckpointInput();
  const output = executeBattleProtocol(encodeBattleProtocolInput(endCheckpointInput({
    combatants: base.combatants.map((combatant, index) => ({
      ...combatant,
      rangedAttack: 0, magicalAttack: 0, meleeAttack: 0,
      rangedNoA: 0, magicalNoA: 0, meleeNoA: 0,
      abilities: index === 0 ? [{ id: 'melee_confusion', level: 3 }] : [],
    })),
    randomValues: [0.999999],
  })));
  assert.equal(output.protocolError, 0);
  assert.equal(output.randomConsumed, 1);
  const flavor = output.events.find((event) => event.opcode === 'random_flavor'
    && event.abilityId === 'melee_confusion');
  assert.deepEqual([flavor?.targetId, flavor?.aux0], [0, 12]);
});

test('END finalization preserves timed threat refill, hit bookkeeping, and externally-owned First Aid', () => {
  const output = executeBattleProtocol(encodeBattleProtocolInput(endCheckpointInput({
    physicalThreatBag: EMPTY_THREAT_BAG,
    combatants: endCheckpointInput().combatants.map((combatant, index) => index === 0
      ? { ...combatant, abilities: [{ id: 'decompose', level: 1 }] }
      : { ...combatant, rangedAttack: 1, rangedNoA: 1, abilities: [{ id: 'first_aid', level: 1 }] }),
    randomValues: [0, 0, 0, 0, 0, 0, 0.875],
  })));
  assert.equal(output.protocolError, 0);
  assert.equal(output.outcome, 'draw');
  assert.equal(output.enemyHitsReceived, 1);
  assert.deepEqual(output.physicalThreatBag, PHYSICAL_THREAT_BAG_AFTER_ROW_1_DRAW);
  assert.equal(output.events.some((event) => event.abilityId === 'first_aid'), false);
  assert.equal(output.randomConsumed, 7);
  assert.equal(output.diagnosticDrawCount, 7);
  assert.deepEqual(
    output.events.filter((event) => event.opcode === 'random_flavor').map((event) => event.aux0),
    [8],
  );
});

test('END checkpoint failures stay transactional and repeated calls reset finalization state', () => {
  const exhausted = executeBattleProtocol(encodeBattleProtocolInput(endCheckpointInput({
    combatants: endCheckpointInput().combatants.map((combatant, index) => index === 0
      ? { ...combatant, abilities: [{ id: 'decompose', level: 1 }] } : combatant),
    randomValues: [],
  })));
  assert.equal(exhausted.protocolError, BATTLE_PROTOCOL_ERROR_CODES.tapeExhausted);
  assert.equal(exhausted.randomConsumed, 0);
  assert.deepEqual(exhausted.events, []);
  assert.deepEqual(exhausted.physicalThreatBag, []);
  assert.deepEqual(exhausted.magicalThreatBag, []);

  const flavorExhausted = executeBattleProtocol(encodeBattleProtocolInput(endCheckpointInput({
    combatants: endCheckpointInput().combatants.map((combatant, index) => index === 0
      ? { ...combatant, abilities: [{ id: 'decompose', level: 1 }] } : combatant),
    randomValues: [0],
  })));
  assert.equal(flavorExhausted.protocolError, BATTLE_PROTOCOL_ERROR_CODES.tapeExhausted);
  assert.equal(flavorExhausted.randomConsumed, 1);
  assert.deepEqual(flavorExhausted.events, []);
  assert.deepEqual(flavorExhausted.physicalThreatBag, []);
  assert.deepEqual(flavorExhausted.magicalThreatBag, []);

  const unsupported = executeBattleProtocol(encodeBattleProtocolInput(endCheckpointInput({
    combatants: endCheckpointInput().combatants.map((combatant, index) => index === 1
      ? { ...combatant, flags: 2 }
      : combatant),
    randomValues: [0.5],
  })));
  assert.equal(unsupported.protocolError, BATTLE_PROTOCOL_ERROR_CODES.unsupportedCombatFeature);
  assert.equal(unsupported.randomConsumed, 0);
  assert.deepEqual(unsupported.events, []);
  assert.deepEqual(unsupported.physicalThreatBag, []);

  const first = executeBattleProtocol(encodeBattleProtocolInput(endCheckpointInput({
    partyHp: 71, partyMaxHp: 71, enemyHp: 83, enemyMaxHp: 83,
  })));
  const second = executeBattleProtocol(encodeBattleProtocolInput(endCheckpointInput({
    partyHp: 91, partyMaxHp: 91, enemyHp: 97, enemyMaxHp: 97,
  })));
  assert.deepEqual([first.partyHp, first.enemyHp, first.outcome], [71, 83, 'draw']);
  assert.deepEqual([second.partyHp, second.enemyHp, second.outcome], [91, 97, 'draw']);
  assert.equal(second.events.filter((event) => event.opcode === 'battle_finished').length, 1);
});

const EMPTY_THREAT_BAG = Array.from({ length: 6 }, (_, index) => ({ id: index + 1, tickets: 0 }));
const PHYSICAL_THREAT_BAG_AFTER_ROW_1_DRAW = [
  { id: 1, tickets: 15 }, { id: 2, tickets: 8 }, { id: 3, tickets: 4 },
  { id: 4, tickets: 2 }, { id: 5, tickets: 1 }, { id: 6, tickets: 1 },
];
const MAGICAL_THREAT_BAG_AFTER_ROW_1_DRAW = Array.from(
  { length: 6 },
  (_, index) => ({ id: index + 1, tickets: index === 0 ? 1 : 2 }),
);

test('timed COMBAT flag is exclusive, accepts externally-owned First Aid, and resolves before normal actions', () => {
  const exclusive = executeBattleProtocol(encodeBattleProtocolInput(combatTimedInput({
    engineFlags: BATTLE_ENGINE_FLAG_COMBAT_TIMED_CHECKPOINT | BATTLE_ENGINE_FLAG_COMBAT_REACTIVE_CHECKPOINT,
    randomValues: [0.5],
  })));
  assert.equal(exclusive.protocolError, BATTLE_PROTOCOL_ERROR_CODES.unsupportedCombatFeature);
  assert.equal(exclusive.randomConsumed, 0);

  const input = combatTimedInput({
    enemyHp: 20, enemyMaxHp: 100,
    combatants: combatTimedInput().combatants.map((combatant, index) => index === 1 ? {
      ...combatant, meleeAttack: 10, meleeNoA: 1,
      abilities: [{ id: 'predator_sense', level: 1 }, { id: 'first_aid', level: 1 }],
    } : combatant),
    randomValues: [0, 0, 0, 0, 0.75],
  });
  const output = executeBattleProtocol(encodeBattleProtocolInput(input));
  assert.equal(output.protocolError, 0);
  assert.equal(output.events.some((event) => event.abilityId === 'first_aid'), false);
  const timed = output.events.findIndex((event) => event.abilityId === 'predator_sense');
  const attack = output.events.findIndex((event) => event.opcode === 'attack');
  assert.ok(timed >= 0 && timed < attack);
});

test('timed COMBAT gates Unstable Core to ranged 4 and magical 0', () => {
  const base = combatTimedInput({
    enemyHp: 100,
    enemyMaxHp: 100,
    combatants: combatTimedInput().combatants.map((combatant, index) => index === 0
      ? { ...combatant, rangedAttack: 0, magicalAttack: 0, meleeAttack: 0,
        abilities: [{ id: 'unstable_core', level: 1 }] }
      : { ...combatant, rangedAttack: 0, magicalAttack: 0, meleeAttack: 0 }),
    randomValues: [],
  });
  const output = executeBattleProtocol(encodeBattleProtocolInput(base));
  assert.equal(output.protocolError, 0);
  const cores = output.events.filter((event) => event.abilityId === 'unstable_core');
  assert.deepEqual(cores.map((event) => [event.attackType, event.timing]), [['ranged', 4], ['magical', 0]]);
  assert.equal(cores.some((event) => event.attackType === 'melee'), false);
});

test('timed COMBAT Soul Reap draws exactly one party target and party Soul Reap draws none', () => {
  const enemyOutput = executeBattleProtocol(encodeBattleProtocolInput(combatTimedInput({
    partyHp: 1,
    partyMaxHp: 100,
    combatants: combatTimedInput().combatants.map((combatant, index) => index === 0
      ? { ...combatant, abilities: [{ id: 'soul_reap', level: 1 }], rangedAttack: 0, magicalAttack: 0, meleeAttack: 0 }
      : { ...combatant, row: 1, hp: 1, maxHp: 100 }),
    randomValues: [0.75],
  })));
  assert.equal(enemyOutput.protocolError, 0);
  assert.equal(enemyOutput.randomConsumed, 1);
  assert.equal(enemyOutput.events.find((event) => event.abilityId === 'soul_reap')?.targetId, 1);
  const partyOutput = executeBattleProtocol(encodeBattleProtocolInput(combatTimedInput({
    enemyHp: 9,
    enemyMaxHp: 100,
    combatants: combatTimedInput().combatants.map((combatant, index) => index === 0
      ? { ...combatant, hp: 9, maxHp: 100 }
      : { ...combatant, abilities: [{ id: 'soul_reap', level: 1 }], rangedAttack: 0, magicalAttack: 0, meleeAttack: 0 }),
    randomValues: [],
  })));
  assert.equal(partyOutput.protocolError, 0);
  assert.equal(partyOutput.randomConsumed, 0);
});

test('timed Self Destruct clamps semantic damage at zero below target defense', () => {
  const output = executeBattleProtocol(encodeBattleProtocolInput(combatTimedInput({
    enemyHp: 10,
    enemyMaxHp: 10,
    combatants: combatTimedInput().combatants.map((combatant, index) => index === 0
      ? { ...combatant, physicalDefense: 100, meleeAttack: 0, rangedAttack: 0, magicalAttack: 0 }
      : { ...combatant, abilities: [{ id: 'self_destruct', level: 5 }], meleeAttack: 0, rangedAttack: 0, magicalAttack: 0 }),
    physicalThreatBag: [{ id: 1, tickets: 1 }],
    randomValues: [0],
  })));
  assert.equal(output.protocolError, 0);
  assert.equal(output.events.find((event) => event.abilityId === 'self_destruct')?.value0, 0);
});

test('timed melee 4 preserves Predator Sense before a Free-forced draw', () => {
  const output = executeBattleProtocol(encodeBattleProtocolInput(combatTimedInput({
    enemyHp: 20,
    enemyMaxHp: 100,
    combatants: combatTimedInput().combatants.map((combatant, index) => index === 0
      ? { ...combatant, abilities: [{ id: 'free', level: 4 }] }
      : { ...combatant, abilities: [{ id: 'predator_sense', level: 1 }] }),
    randomValues: [],
  })));
  assert.equal(output.protocolError, 0);
  assert.equal(output.outcome, 'draw');
  assert.deepEqual(
    output.events.filter((event) => event.aux0 === BATTLE_ACTION_IDS.timed_ability)
      .map((event) => event.abilityId),
    ['predator_sense', 'free'],
  );
  assert.equal(output.randomConsumed, 0);
});

test('timed timing 4 resolves ranged Unstable Core and magic Confusion before melee Free', () => {
  const input = combatTimedInput({
    enemyHp: 20,
    enemyMaxHp: 100,
    combatants: combatTimedInput().combatants.map((combatant, index) => index === 0
      ? { ...combatant, abilities: [
          { id: 'unstable_core', level: 1 },
          { id: 'magic_confusion', level: 1 },
          { id: 'free', level: 4 },
        ] }
      : {
          ...combatant,
          magicalAttack: 1,
          magicalNoA: 1,
          abilities: [{ id: 'predator_sense', level: 1 }],
        }),
    randomValues: [
      0, 0, 0.34, // party magical initiative = timing 4
      0, 0.99, // Confusion target, then failure
      0, // party magical hit before the melee timing-4 slot
    ],
  });
  const output = executeBattleProtocol(encodeBattleProtocolInput(input));
  assert.equal(output.protocolError, 0);
  assert.equal(output.outcome, 'draw');
  assert.equal(output.randomConsumed, input.randomValues.length);
  assert.equal(output.diagnosticDrawCount, input.randomValues.length);
  assert.deepEqual([output.partyHp, output.enemyHp], [100, 13]);
  const orderedAbilities = new Set(['unstable_core', 'magic_confusion', 'predator_sense', 'free']);
  assert.deepEqual(
    output.events.filter((event) => event.timing === 4 && orderedAbilities.has(event.abilityId ?? ''))
      .map((event) => event.abilityId),
    ['unstable_core', 'magic_confusion', 'predator_sense', 'free'],
  );
});

test('timed melee 2 preserves Free, Decompose, Confusion, then Self Destruct and draw order', () => {
  const input = combatTimedInput({
    enemyHp: 100,
    enemyMaxHp: 100,
    partyHp: 1_000,
    partyMaxHp: 1_000,
    physicalThreatBag: [{ id: 1, tickets: 1 }, { id: 2, tickets: 1 }],
    combatants: combatBaseInput().combatants.map((combatant, index) => index === 0
      ? {
          ...combatant,
          abilities: [
            { id: 'free', level: 2 },
            { id: 'decompose', level: 1 },
            { id: 'melee_confusion', level: 3 },
            { id: 'self_destruct', level: 1 },
          ],
        }
      : index === 1
        ? { ...combatant, meleeAttack: 1, meleeNoA: 1, abilities: [{ id: 'pursuit', level: 1 }] }
        : combatant),
    randomValues: [
      0.5, // party row 1 initiative = timing 2
      0.99, // Decompose threat draw = row 2
      0, 0.99, // Confusion target row 1, then failure
      0, // Self Destruct threat draw = remaining row 1
    ],
  });
  const output = executeBattleProtocol(encodeBattleProtocolInput(input));
  assert.equal(output.protocolError, 0);
  assert.equal(output.randomConsumed, input.randomValues.length);
  assert.equal(output.diagnosticDrawCount, input.randomValues.length);
  assert.deepEqual([output.partyHp, output.enemyHp], [990, 0]);
  const orderedAbilities = new Set(['pursuit', 'decompose', 'melee_confusion', 'self_destruct']);
  assert.deepEqual(
    output.events.filter((event) => event.aux0 === BATTLE_ACTION_IDS.timed_ability)
      .filter((event) => orderedAbilities.has(event.abilityId ?? ''))
      .map((event) => [event.abilityId, event.targetId]),
    [
      ['pursuit', 900],
      ['decompose', 2],
      ['melee_confusion', 1],
      ['self_destruct', 1],
    ],
  );
  assert.deepEqual(output.physicalThreatBag, [{ id: 1, tickets: 0 }, { id: 2, tickets: 0 }]);
});

test('timed threat targeting refills an empty physical bag and returns the decremented defaults', () => {
  const output = executeBattleProtocol(encodeBattleProtocolInput(combatTimedInput({
    physicalThreatBag: EMPTY_THREAT_BAG,
    combatants: combatTimedInput().combatants.map((combatant, index) => index === 0
      ? { ...combatant, abilities: [{ id: 'decompose', level: 1 }] }
      : combatant),
    randomValues: [0],
  })));
  assert.equal(output.protocolError, 0);
  assert.equal(output.randomConsumed, 1);
  assert.equal(output.diagnosticDrawCount, 1);
  assert.deepEqual([output.partyHp, output.enemyHp], [100, 100]);
  assert.equal(output.events.find((event) => event.abilityId === 'decompose')?.targetId, 1);
  assert.deepEqual(output.physicalThreatBag, PHYSICAL_THREAT_BAG_AFTER_ROW_1_DRAW);
});

test('timed normal targeting refills an empty magical bag with canonical weights', () => {
  const input = combatTimedInput({
    magicalThreatBag: EMPTY_THREAT_BAG,
    combatants: combatTimedInput().combatants.map((combatant, index) => index === 0
      ? { ...combatant, magicalAttack: 1, magicalNoA: 1 }
      : combatant),
    randomValues: [0, 0, 0, 0, 0],
  });
  const output = executeBattleProtocol(encodeBattleProtocolInput(input));
  assert.equal(output.protocolError, 0);
  assert.equal(output.randomConsumed, input.randomValues.length);
  assert.equal(output.events.find((event) => event.opcode === 'target_selected')?.targetId, 1);
  assert.deepEqual(output.magicalThreatBag, MAGICAL_THREAT_BAG_AFTER_ROW_1_DRAW);
});

test('timed Decompose exhaustion refills before immediately following Self Destruct', () => {
  const output = executeBattleProtocol(encodeBattleProtocolInput(combatTimedInput({
    physicalThreatBag: [{ id: 2, tickets: 1 }],
    combatants: combatBaseInput().combatants.map((combatant, index) => index === 0
      ? { ...combatant, abilities: [{ id: 'decompose', level: 1 }, { id: 'self_destruct', level: 1 }] }
      : combatant),
    randomValues: [0.5, 0],
  })));
  assert.equal(output.protocolError, 0);
  assert.equal(output.randomConsumed, 2);
  assert.equal(output.diagnosticDrawCount, 2);
  assert.deepEqual([output.partyHp, output.enemyHp], [90, 0]);
  assert.deepEqual(
    output.events.filter((event) => ['decompose', 'self_destruct'].includes(event.abilityId ?? ''))
      .map((event) => [event.abilityId, event.targetId]),
    [['decompose', 2], ['self_destruct', 1]],
  );
  assert.deepEqual(output.physicalThreatBag, PHYSICAL_THREAT_BAG_AFTER_ROW_1_DRAW);
});

test('timed melee threat effects apply Bulwark redirection and Bulwark Breaker bypass', () => {
  for (const ability of ['decompose', 'self_destruct'] as const) {
    for (const breaker of [false, true]) {
      const output = executeBattleProtocol(encodeBattleProtocolInput(combatTimedInput({
        physicalThreatBag: [{ id: 2, tickets: 1 }],
        partyHp: 1_000,
        partyMaxHp: 1_000,
        combatants: combatBaseInput().combatants.map((combatant, index) => index === 0
          ? { ...combatant, abilities: [
              { id: ability, level: 1 },
              ...(breaker ? [{ id: 'bulwark_breaker' as const, level: 1 }] : []),
            ] }
          : index === 1
            ? { ...combatant, abilities: [{ id: 'bulwark', level: 2 }] }
            : combatant),
        randomValues: [0],
      })));
      assert.equal(output.protocolError, 0);
      assert.equal(output.randomConsumed, 1);
      assert.equal(output.events.find((event) => event.abilityId === ability)?.targetId, breaker ? 2 : 1);
    }
  }
});

test('timed threat refill and later conditional draw failures are transactional', () => {
  const refillExhausted = executeBattleProtocol(encodeBattleProtocolInput(combatTimedInput({
    physicalThreatBag: EMPTY_THREAT_BAG,
    combatants: combatTimedInput().combatants.map((combatant, index) => index === 0
      ? { ...combatant, abilities: [{ id: 'decompose', level: 1 }] }
      : combatant),
    randomValues: [],
  })));
  assert.equal(refillExhausted.protocolError, BATTLE_PROTOCOL_ERROR_CODES.tapeExhausted);
  assert.equal(refillExhausted.randomConsumed, 0);
  assert.deepEqual(refillExhausted.events, []);
  assert.deepEqual(refillExhausted.physicalThreatBag, []);

  const laterExhausted = executeBattleProtocol(encodeBattleProtocolInput(combatTimedInput({
    physicalThreatBag: [{ id: 2, tickets: 1 }],
    combatants: combatBaseInput().combatants.map((combatant, index) => index === 0
      ? { ...combatant, abilities: [{ id: 'decompose', level: 1 }, { id: 'self_destruct', level: 1 }] }
      : combatant),
    randomValues: [0.5],
  })));
  assert.equal(laterExhausted.protocolError, BATTLE_PROTOCOL_ERROR_CODES.tapeExhausted);
  assert.equal(laterExhausted.randomConsumed, 1);
  assert.deepEqual(laterExhausted.events, []);
  assert.deepEqual(laterExhausted.physicalThreatBag, []);
});

test('reactive COMBAT flag is exclusive and preflights timed and Mimic-copyable mechanics before draws', () => {
  for (const flags of [
    BATTLE_ENGINE_FLAG_COMBAT_REACTIVE_CHECKPOINT | BATTLE_ENGINE_FLAG_START_CHECKPOINT,
    BATTLE_ENGINE_FLAG_COMBAT_REACTIVE_CHECKPOINT | BATTLE_ENGINE_FLAG_COMBAT_BASE_CHECKPOINT,
    BATTLE_ENGINE_FLAG_COMBAT_REACTIVE_CHECKPOINT | BATTLE_ENGINE_FLAG_COMBAT_NORMAL_CHECKPOINT,
  ]) {
    const output = executeBattleProtocol(encodeBattleProtocolInput(combatReactiveInput({ engineFlags: flags, randomValues: [0.5] })));
    assert.equal(output.protocolError, BATTLE_PROTOCOL_ERROR_CODES.unsupportedCombatFeature);
    assert.equal(output.randomConsumed, 0);
    assert.deepEqual(output.events, []);
  }
  const timed = executeBattleProtocol(encodeBattleProtocolInput(combatReactiveInput({
    randomValues: [0.5],
    combatants: combatReactiveInput().combatants.map((combatant, index) => index === 0
      ? { ...combatant, abilities: [{ id: 'howl', level: 1 }] }
      : { ...combatant, abilities: [{ id: 'mimic', level: 1 }] }),
  })));
  assert.equal(timed.protocolError, BATTLE_PROTOCOL_ERROR_CODES.unsupportedCombatFeature);
  assert.equal(timed.randomConsumed, 0);
  assert.deepEqual(timed.physicalThreatBag, []);
});

test('reactive COMBAT applies enemy Heavy Strike penetration and global nth-hit decay before grouped damage', () => {
  const base = combatReactiveInput();
  const output = executeBattleProtocol(encodeBattleProtocolInput(combatReactiveInput({
    partyHp: 1_000,
    partyMaxHp: 1_000,
    combatants: base.combatants.map((combatant, index) => index === 0
      ? {
          ...combatant,
          rangedAttack: 100,
          rangedNoA: 2,
          originalRangedNoA: 4,
          enemyRangedAmplifier: 1,
          abilities: [{ id: 'heavy_strike', level: 1 }],
        }
      : {
          ...combatant,
          physicalDefense: 50,
          rangedNoA: 0,
          magicalNoA: 0,
          meleeNoA: 0,
          abilities: [],
        }),
    physicalThreatBag: [{ id: 1, tickets: 32 }],
    randomValues: [0, 0, 0, 0, 0, 0.95, 0, 0.95, 0.25],
  })));
  assert.equal(output.protocolError, 0);
  assert.equal(output.partyHp, 929);
  assert.equal(output.randomConsumed, 8);
  const attack = output.events.find((event) => event.opcode === 'attack' && event.actorId === 900);
  assert.deepEqual([attack?.value0, attack?.hits, attack?.attempts], [71, 1, 2]);
});

test('reactive COMBAT executes re-attacks without another initiative roll and preserves action identity', () => {
  const output = executeBattleProtocol(encodeBattleProtocolInput(combatReactiveInput({
    enemyHp: 1_000,
    enemyMaxHp: 1_000,
    combatants: combatReactiveInput().combatants.map((combatant, index) => index === 1 ? {
      ...combatant, rangedAttack: 10, rangedNoA: 2, abilities: [{ id: 're_attack', level: 2 }],
    } : combatant),
    randomValues: [0, 0, 0, 0, 0, 0, 0, 0, 0.75],
  })));
  assert.equal(output.protocolError, 0);
  assert.equal(output.events.filter((event) => event.opcode === 'initiative').length, 1);
  const attacks = output.events.filter((event) => event.opcode === 'attack');
  assert.deepEqual(attacks.map((event) => [event.aux0, event.attempts]), [
    [BATTLE_ACTION_IDS.normal_attack, 2],
    [BATTLE_ACTION_IDS.re_attack, 2],
  ]);
  assert.equal(output.randomConsumed, 8);
  assert.equal(output.randomConsumed < 9, true);
});

test('reactive COMBAT resolves counter, Null Counter exhaustion, and one terminating re-counter', () => {
  const input = combatReactiveInput({
    partyHp: 1_000, partyMaxHp: 1_000, enemyHp: 1_000, enemyMaxHp: 1_000,
    combatants: combatReactiveInput().combatants.map((combatant, index) => index === 0 ? {
      ...combatant, rangedAttack: 10, rangedNoA: 1,
      abilities: [{ id: 'counter', level: 1 }, { id: 're_counter', level: 1 }],
    } : {
      ...combatant, rangedAttack: 10, rangedNoA: 1,
      abilities: [{ id: 'counter', level: 2 }, { id: 're_counter', level: 2 }],
    }),
    randomValues: Array(32).fill(0),
  });
  const output = executeBattleProtocol(encodeBattleProtocolInput(input));
  assert.equal(output.protocolError, 0);
  assert.ok(output.events.some((event) => event.aux0 === BATTLE_ACTION_IDS.counter && event.opcode === 'attack'));
  assert.ok(output.events.some((event) => event.aux0 === BATTLE_ACTION_IDS.re_counter && event.opcode === 'attack'));
  assert.equal(output.events.filter((event) => event.aux0 === BATTLE_ACTION_IDS.re_counter && event.opcode === 'attack').length <= 2, true);

  const nullified = executeBattleProtocol(encodeBattleProtocolInput({
    ...input,
    combatants: input.combatants.map((combatant, index) => index === 1
      ? { ...combatant, abilities: [...combatant.abilities, { id: 'null_counter', level: 1 }] }
      : combatant),
  }));
  assert.ok(nullified.events.some((event) => event.opcode === 'nullified' && event.abilityId === 'null_counter'));
});

test('reactive COMBAT applies close nullifiers without draws and recovery priority with bookkeeping events', () => {
  const nullified = executeBattleProtocol(encodeBattleProtocolInput(combatReactiveInput({
    combatants: combatReactiveInput().combatants.map((combatant, index) => index === 1 ? {
      ...combatant, meleeAttack: 10, meleeNoA: 3,
      abilities: [{ id: 'corrode', level: 1 }, { id: 'life_drain', level: 7 },
        { id: 'death_touch', level: 5 }, { id: 'bind', level: 5 }],
    } : {
      ...combatant, abilities: [{ id: 'null_corrode', level: 1 }, { id: 'null_life_drain', level: 1 },
        { id: 'null_death_touch', level: 1 }, { id: 'null_bind', level: 1 }],
    }),
    randomValues: [0, 0, 0, 0, 0, 0, 0.75],
  })));
  assert.equal(nullified.protocolError, 0);
  assert.equal(nullified.randomConsumed, 4, 'melee initiative plus hits; paired nullifiers add no draws');
  for (const ability of ['null_corrode', 'null_life_drain', 'null_death_touch', 'null_bind'] as const) {
    assert.ok(nullified.events.some((event) => event.opcode === 'nullified' && event.abilityId === ability));
  }

  const recovered = executeBattleProtocol(encodeBattleProtocolInput(combatReactiveInput({
    enemyHp: 5, enemyMaxHp: 1_001,
    combatants: combatReactiveInput().combatants.map((combatant, index) => index === 1
      ? { ...combatant, meleeAttack: 20, meleeNoA: 1 }
      : { ...combatant, maxHp: 1_001, abilities: [{ id: 'resurrect', level: 2 }, { id: 'reanimate', level: 5 }] }),
    randomValues: [0, 0, 0, 0, 0, 0.75],
  })));
  assert.equal(recovered.protocolError, 0);
  assert.ok(recovered.events.some((event) => event.opcode === 'resurrected' && event.value0 === 11));
  assert.equal(recovered.events.some((event) => event.opcode === 'reanimated'), false);
  assert.ok(recovered.events.some((event) => event.opcode === 'heal' && event.abilityId === 'resurrect'));
});

test('reactive COMBAT delays magical counters until the enemy re-attack completes and uses party row order', () => {
  const base = combatBaseInput();
  const output = executeBattleProtocol(encodeBattleProtocolInput(combatReactiveInput({
    partyHp: 1_000, partyMaxHp: 1_000, enemyHp: 1_000, enemyMaxHp: 1_000,
    combatants: [
      { ...base.combatants[0]!, magicalAttack: 5, magicalNoA: 1, abilities: [{ id: 're_attack', level: 1 }] },
      { ...base.combatants[1]!, magicalAttack: 5, magicalNoA: 1, abilities: [{ id: 'magical_counter', level: 1 }] },
      { ...base.combatants[2]!, magicalAttack: 5, magicalNoA: 1, abilities: [{ id: 'magical_counter', level: 2 }] },
    ],
    physicalThreatBag: [{ id: 1, tickets: 32 }, { id: 2, tickets: 32 }],
    magicalThreatBag: [{ id: 1, tickets: 32 }, { id: 2, tickets: 32 }],
    randomValues: [...Array(9).fill(0), 0, 0, 0.99, 0, ...Array(52).fill(0)],
  })));
  assert.equal(output.protocolError, 0);
  const actions = output.events.filter((event) => event.opcode === 'attack').map((event) => [event.aux0, event.actorId]);
  const reAttackIndex = actions.reduce((last, [action], index) => action === BATTLE_ACTION_IDS.re_attack ? index : last, -1);
  const magicalCounters = actions.map(([action], index) => ({ action, index, actor: actions[index]?.[1] }))
    .filter(({ action }) => action === BATTLE_ACTION_IDS.magical_counter);
  assert.ok(magicalCounters.every(({ index }) => index > reAttackIndex));
  assert.deepEqual(magicalCounters.map(({ actor }) => actor), [1, 2]);
});

test('reactive COMBAT executes every qualifying covering-fire owner front-to-back after one melee hit', () => {
  const base = combatBaseInput();
  const output = executeBattleProtocol(encodeBattleProtocolInput(combatReactiveInput({
    enemyHp: 1_000, enemyMaxHp: 1_000,
    combatants: [
      base.combatants[0]!,
      { ...base.combatants[1]!, meleeAttack: 5, meleeNoA: 1 },
      { ...base.combatants[2]!, rangedAttack: 5, rangedNoA: 1, abilities: [{ id: 'covering_fire', level: 1 }] },
      { ...base.combatants[2]!, id: 3, row: 3, rangedAttack: 5, rangedNoA: 1, abilities: [{ id: 'covering_fire', level: 2 }] },
    ],
    physicalThreatBag: [{ id: 1, tickets: 32 }, { id: 2, tickets: 32 }, { id: 3, tickets: 32 }],
    magicalThreatBag: [{ id: 1, tickets: 32 }, { id: 2, tickets: 32 }, { id: 3, tickets: 32 }],
    randomValues: Array(64).fill(0),
  })));
  assert.equal(output.protocolError, 0);
  assert.deepEqual(
    output.events.filter((event) => event.opcode === 'attack' && event.aux0 === BATTLE_ACTION_IDS.covering_fire)
      .map((event) => event.actorId).slice(0, 2),
    [2, 3],
  );
});

test('reactive COMBAT consumes Shock once, preserves Null Shock, and applies Burn recovery', () => {
  const shockBase = combatReactiveInput({
    enemyHp: 1_000, enemyMaxHp: 1_000,
    combatants: combatReactiveInput().combatants.map((combatant, index) => index === 0
      ? { ...combatant, abilities: [{ id: 'shock', level: 1 }] }
      : { ...combatant, meleeAttack: 10, meleeNoA: 3, abilities: [{ id: 're_attack', level: 3 }] }),
    randomValues: Array(32).fill(0),
  });
  const shocked = executeBattleProtocol(encodeBattleProtocolInput(shockBase));
  assert.equal(shocked.events.filter((event) => event.abilityId === 'shock').length, 1);
  assert.equal(shocked.events.find((event) => event.opcode === 'attack' && event.aux0 === BATTLE_ACTION_IDS.normal_attack)?.hits, 1);
  assert.equal(shocked.events.find((event) => event.opcode === 'attack' && event.aux0 === BATTLE_ACTION_IDS.re_attack)?.hits, 3);

  const nullShock = executeBattleProtocol(encodeBattleProtocolInput({
    ...shockBase,
    combatants: shockBase.combatants.map((combatant, index) => index === 1
      ? { ...combatant, abilities: [...combatant.abilities, { id: 'null_shock', level: 1 }] }
      : combatant),
  }));
  assert.ok(nullShock.events.some((event) => event.opcode === 'nullified' && event.abilityId === 'null_shock'));
  assert.equal(nullShock.events.find((event) => event.opcode === 'attack' && event.aux0 === BATTLE_ACTION_IDS.normal_attack)?.hits, 3);

  const burn = executeBattleProtocol(encodeBattleProtocolInput(combatReactiveInput({
    partyHp: 2, partyMaxHp: 100, enemyHp: 1_000, enemyMaxHp: 1_000,
    combatants: combatReactiveInput().combatants.map((combatant, index) => index === 0
      ? { ...combatant, abilities: [{ id: 'burn', level: 5 }] }
      : { ...combatant, meleeAttack: 5, meleeNoA: 2, abilities: [{ id: 'resurrect', level: 1 }] }),
    randomValues: Array(16).fill(0),
  })));
  assert.ok(burn.events.some((event) => event.opcode === 'damage' && event.abilityId === 'burn'));
  assert.ok(burn.events.some((event) => event.opcode === 'resurrected'));
  assert.equal(burn.partyHp, 1);
});

test('reactive COMBAT applies Requiem only after consumed Reanimate and honors Null Requiem', () => {
  const input = combatReactiveInput({
    enemyHp: 5, enemyMaxHp: 100,
    combatants: combatReactiveInput().combatants.map((combatant, index) => index === 0
      ? { ...combatant, abilities: [{ id: 'reanimate', level: 1 }] }
      : { ...combatant, meleeAttack: 10, meleeNoA: 1, abilities: [{ id: 'requiem', level: 1 }] }),
    randomValues: Array(16).fill(0),
  });
  const requiem = executeBattleProtocol(encodeBattleProtocolInput(input));
  const reanimatedIndex = requiem.events.findIndex((event) => event.opcode === 'reanimated');
  const requiemIndex = requiem.events.findIndex((event) => event.abilityId === 'requiem');
  assert.ok(reanimatedIndex >= 0 && requiemIndex > reanimatedIndex);
  assert.equal(requiem.enemyHp, 0);

  const blocked = executeBattleProtocol(encodeBattleProtocolInput({
    ...input,
    combatants: input.combatants.map((combatant, index) => index === 0
      ? { ...combatant, abilities: [...combatant.abilities, { id: 'null_requiem', level: 1 }] }
      : combatant),
  }));
  assert.ok(blocked.events.some((event) => event.opcode === 'nullified' && event.abilityId === 'null_requiem'));
  assert.equal(blocked.enemyHp, 20);
});

test('reactive COMBAT recovers from lethal immediate terrain and fails transactionally on an exhausted conditional draw', () => {
  const terrain = executeBattleProtocol(encodeBattleProtocolInput(combatReactiveInput({
    terrainEffect: 'terrain.mana-burn', partyHp: 1, partyMaxHp: 100, enemyHp: 1_000, enemyMaxHp: 1_000,
    combatants: combatReactiveInput().combatants.map((combatant, index) => index === 1
      ? { ...combatant, magicalAttack: 5, magicalNoA: 1, abilities: [{ id: 'resurrect', level: 1 }] }
      : combatant),
    randomValues: [0, 0, 0, 0, 0.4],
  })));
  assert.equal(terrain.protocolError, 0);
  assert.ok(terrain.events.some((event) => event.opcode === 'damage' && (event.flags & 8) !== 0));
  assert.ok(terrain.events.some((event) => event.opcode === 'resurrected'));
  assert.equal(terrain.partyHp, 1);

  const exhausted = executeBattleProtocol(encodeBattleProtocolInput(combatReactiveInput({
    enemyHp: 100, enemyMaxHp: 100,
    combatants: combatReactiveInput().combatants.map((combatant, index) => index === 1
      ? { ...combatant, meleeAttack: 5, meleeNoA: 1, abilities: [{ id: 'death_touch', level: 1 }] }
      : combatant),
    randomValues: [0, 0],
  })));
  assert.equal(exhausted.protocolError, BATTLE_PROTOCOL_ERROR_CODES.tapeExhausted);
  assert.deepEqual(exhausted.events, []);
  assert.deepEqual(exhausted.physicalThreatBag, []);
  assert.deepEqual(exhausted.magicalThreatBag, []);
});

test('reactive COMBAT supports a seven-member multi-owner covering-fire chain with deterministic capacity', () => {
  const base = combatBaseInput();
  const party = Array.from({ length: 7 }, (_, index) => ({
    ...base.combatants[1]!,
    id: index + 1,
    row: index + 1,
    rangedAttack: index === 0 ? 0 : 2,
    rangedNoA: index === 0 ? 0 : 1,
    meleeAttack: index === 0 ? 2 : 0,
    meleeNoA: index === 0 ? 1 : 0,
    abilities: index === 0 ? [] : [{ id: 'covering_fire' as const, level: index % 2 + 1 }],
  }));
  const output = executeBattleProtocol(encodeBattleProtocolInput(combatReactiveInput({
    enemyHp: 100_000, enemyMaxHp: 100_000,
    combatants: [base.combatants[0]!, ...party],
    physicalThreatBag: party.map(({ row }) => ({ id: row, tickets: 64 })),
    magicalThreatBag: party.map(({ row }) => ({ id: row, tickets: 64 })),
    randomValues: Array(256).fill(0),
  })));
  assert.equal(output.protocolError, 0);
  assert.deepEqual(
    output.events.filter((event) => event.opcode === 'attack' && event.aux0 === BATTLE_ACTION_IDS.covering_fire)
      .map((event) => event.actorId).slice(0, 6),
    [2, 3, 4, 5, 6, 7],
  );
  assert.ok(output.events.length < 4_096);
});

test('advanced COMBAT rejects deferred abilities and every mixed checkpoint flag before drawing', () => {
  for (const ability of ['counter', 'howl', 'resurrect'] as const) {
    const input = combatNormalInput({
      randomValues: [0.5],
      combatants: combatNormalInput().combatants.map((combatant, index) => index === 1
        ? { ...combatant, abilities: [{ id: ability, level: 1 }] } : combatant),
    });
    const output = executeBattleProtocol(encodeBattleProtocolInput(input));
    assert.equal(output.protocolError, BATTLE_PROTOCOL_ERROR_CODES.unsupportedCombatFeature);
    assert.equal(output.randomConsumed, 0);
    assert.deepEqual(output.events, []);
    assert.deepEqual(output.physicalThreatBag, []);
  }
  for (const other of [BATTLE_ENGINE_FLAG_START_CHECKPOINT, BATTLE_ENGINE_FLAG_COMBAT_BASE_CHECKPOINT]) {
    const output = executeBattleProtocol(encodeBattleProtocolInput(combatNormalInput({
      engineFlags: BATTLE_ENGINE_FLAG_COMBAT_NORMAL_CHECKPOINT | other,
      randomValues: [0.5],
    })));
    assert.equal(output.protocolError, BATTLE_PROTOCOL_ERROR_CODES.unsupportedCombatFeature);
    assert.equal(output.randomConsumed, 0);
  }
});

test('advanced COMBAT reuses START initiative and owns terrain NoA, guaranteed hits, and exact undrained cursor', () => {
  const input = combatNormalInput({
    terrainEffect: 'terrain.sniper-domain',
    partyHp: 100,
    partyMaxHp: 100,
    enemyHp: 10,
    enemyMaxHp: 10,
    combatants: combatNormalInput().combatants.map((combatant, index) => index === 1 ? {
      ...combatant,
      rangedAttack: 10,
      rangedNoA: 2,
      originalRangedNoA: 4,
      abilities: [{ id: 'heavy_strike', level: 1 }, { id: 'focus', level: 1 }],
    } : combatant),
    randomValues: [0, 0, 0, 0, 0.875],
  });
  const output = executeBattleProtocol(encodeBattleProtocolInput(input));
  assert.equal(output.protocolError, 0);
  assert.equal(output.outcome, 'victory');
  assert.equal(output.randomConsumed, 4, 'guaranteed hits and terminal scheduling leave the tail untouched');
  assert.equal(output.diagnosticDrawCount, 4);
  const attack = output.events.find((event) => event.opcode === 'attack');
  assert.equal(attack?.attempts, 2);
  assert.equal(attack?.hits, 2);
  assert.equal(output.events.at(-1)?.opcode, 'phase_ended');
});

test('advanced COMBAT preserves target-before-hit and defensive absorb values', () => {
  const input = combatNormalInput({
    enemyHp: 100,
    enemyMaxHp: 100,
    partyHp: 50,
    partyMaxHp: 100,
    combatants: combatNormalInput().combatants.map((combatant, index) => index === 0 ? {
      ...combatant, rangedAttack: 20, rangedNoA: 1, elementalOffense: 'fire',
    } : {
      ...combatant, abilities: [{ id: 'fire_absorb', level: 5 }],
    }),
    randomValues: [0, 0, 0, 0, 0, 0],
  });
  const output = executeBattleProtocol(encodeBattleProtocolInput(input));
  assert.equal(output.protocolError, 0);
  const selected = output.events.findIndex((event) => event.opcode === 'target_selected');
  const attack = output.events.findIndex((event) => event.opcode === 'attack');
  assert.ok(selected >= 0 && selected < attack);
  const absorbed = output.events.find((event) => event.opcode === 'absorbed');
  assert.equal(absorbed?.abilityId, 'fire_absorb');
  assert.ok((absorbed?.value0 ?? 0) > 0);
  assert.equal(output.partyHp, 70);
});

test('advanced COMBAT preflights Mimic copies and consumes Magic Seal in START owner order', () => {
  const unsafe = executeBattleProtocol(encodeBattleProtocolInput(combatNormalInput({
    randomValues: [0.5],
    combatants: combatNormalInput().combatants.map((combatant, index) => index === 0
      ? { ...combatant, abilities: [{ id: 'counter', level: 1 }] }
      : { ...combatant, abilities: [{ id: 'mimic', level: 1 }] }),
  })));
  assert.equal(unsafe.protocolError, BATTLE_PROTOCOL_ERROR_CODES.unsupportedCombatFeature);
  assert.equal(unsafe.randomConsumed, 0);

  const input = combatNormalInput({
    combatants: combatNormalInput().combatants.map((combatant, index) => index === 0 ? {
      ...combatant, magicalAttack: 10, magicalNoA: 1, abilities: [{ id: 'magic_seal', level: 1 }],
    } : {
      ...combatant, magicalAttack: 10, magicalNoA: 1, abilities: [{ id: 'magic_seal', level: 1 }],
    }),
    randomValues: [0, 0, 0, 0, 0, 0],
  });
  const output = executeBattleProtocol(encodeBattleProtocolInput(input));
  assert.equal(output.protocolError, 0);
  assert.deepEqual(
    output.events.filter((event) => event.opcode === 'nullified' && event.abilityId === 'magic_seal')
      .map((event) => [event.actorId, event.targetId]),
    [[1, 900], [900, 1]],
  );
  assert.equal(output.randomConsumed, 6);
});

test('advanced COMBAT owns Illusion consumption, reflected lethality, and immediate terrain flavor draws', () => {
  const illusionInput = combatNormalInput({
    combatants: combatNormalInput().combatants.map((combatant, index) => index === 1
      ? { ...combatant, rangedAttack: 10, rangedNoA: 1 }
      : { ...combatant, abilities: [{ id: 'illusion', level: 1 }] }),
    randomValues: [0, 0, 0, 0, 0.9],
  });
  const illusion = executeBattleProtocol(encodeBattleProtocolInput(illusionInput));
  assert.equal(illusion.protocolError, 0);
  assert.equal(illusion.randomConsumed, 4, 'Illusion prevents the hit draw and leaves its tape suffix untouched');
  assert.ok(illusion.events.some((event) => event.opcode === 'nullified' && event.abilityId === 'illusion'));

  const reflected = executeBattleProtocol(encodeBattleProtocolInput(combatNormalInput({
    partyHp: 1,
    partyMaxHp: 100,
    combatants: combatNormalInput().combatants.map((combatant, index) => index === 1
      ? { ...combatant, rangedAttack: 20, rangedNoA: 1 }
      : { ...combatant, abilities: [{ id: 'ranged_reflect', level: 5 }] }),
    randomValues: [0, 0, 0, 0, 0, 0.75],
  })));
  assert.equal(reflected.outcome, 'defeat');
  assert.equal(reflected.partyHp, 0);
  assert.ok(reflected.events.some((event) => event.opcode === 'reflected' && event.value0 === 1));
  assert.equal(reflected.randomConsumed, 5);

  const terrain = executeBattleProtocol(encodeBattleProtocolInput(combatNormalInput({
    terrainEffect: 'terrain.vine-snare',
    combatants: combatNormalInput().combatants.map((combatant, index) => index === 1
      ? { ...combatant, rangedAttack: 2, rangedNoA: 1 } : combatant),
    randomValues: [0, 0, 0, 0, 0, 0.6],
  })));
  assert.equal(terrain.protocolError, 0);
  assert.equal(terrain.partyHp, 99);
  assert.equal(terrain.randomConsumed, 6);
  assert.equal(terrain.events.find((event) => event.opcode === 'random_flavor')?.aux0, 6);
});

test('advanced COMBAT resets native state and uses one measured Wasm invocation', () => {
  beginBattleKernelMeasurement();
  const first = executeBattleProtocol(encodeBattleProtocolInput(combatNormalInput()));
  const measurement = endBattleKernelMeasurement();
  assert.equal(first.protocolError, 0);
  assert.equal(measurement.calls, 1);
  const second = executeBattleProtocol(encodeBattleProtocolInput(combatNormalInput({ partyHp: 71, partyMaxHp: 71, enemyHp: 83, enemyMaxHp: 83 })));
  assert.equal(second.partyHp, 71);
  assert.equal(second.enemyHp, 83);
  assert.equal(second.randomConsumed, 0);
});

test('base COMBAT rejects unsupported features and mutually exclusive flags before drawing', () => {
  for (const input of [
    combatBaseInput({ terrainEffect: 'terrain.fog', randomValues: [0.5] }),
    combatBaseInput({ deityId: 1, randomValues: [0.5] }),
    combatBaseInput({ flags: 1, randomValues: [0.5] }),
    combatBaseInput({ engineFlags: BATTLE_ENGINE_FLAG_COMBAT_BASE_CHECKPOINT | BATTLE_ENGINE_FLAG_START_CHECKPOINT, randomValues: [0.5] }),
    combatBaseInput({ combatants: combatBaseInput().combatants.map((combatant, index) => index === 1
      ? { ...combatant, abilities: [{ id: 'focus', level: 1 }] } : combatant), randomValues: [0.5] }),
  ]) {
    const output = executeBattleProtocol(encodeBattleProtocolInput(input));
    assert.equal(output.protocolError, BATTLE_PROTOCOL_ERROR_CODES.unsupportedCombatFeature);
    assert.equal(output.randomConsumed, 0);
    assert.equal(output.diagnosticDrawCount, 0);
    assert.deepEqual(output.events, []);
    assert.deepEqual(output.physicalThreatBag, []);
    assert.deepEqual(output.magicalThreatBag, []);
  }
});

test('base COMBAT reuses START initiative and resolves enemy target-before-hit in first-target group order', () => {
  const input = combatBaseInput({
    enemyHp: 1_000,
    enemyMaxHp: 1_000,
    partyHp: 1_000,
    partyMaxHp: 1_000,
    physicalThreatBag: [{ id: 2, tickets: 1 }, { id: 1, tickets: 1 }],
    combatants: combatBaseInput().combatants.map((combatant, index) => index === 0
      ? { ...combatant, rangedAttack: 10, rangedNoA: 2, physicalDefense: 5, enemyRangedAmplifier: 2 }
      : index === 1
        ? {
            ...combatant, rangedAttack: 20, rangedNoA: 2, physicalDefense: 2,
            physicalPenetration: 0.2, physicalOffenseAmplifier: 2, rangedAttackBonus: 0.5,
            elementalOffense: 'fire', elementalOffenseValue: 1.5,
          }
        : { ...combatant, physicalDefense: 4 }),
    randomValues: [
      0, 0, 0, 0, // enemy ranged initiative = 4
      0, 0, 0, 0, // party ranged initiative = 4; enemy wins the tie
      0, 0,        // enemy target row 1, then hit
      0.99, 0,     // remaining row 2, then hit
      0, 0.99,     // party hit then miss
    ],
  });
  const output = executeBattleProtocol(encodeBattleProtocolInput(input));
  assert.equal(output.protocolError, 0);
  assert.equal(output.outcome, 'unresolved');
  assert.equal(output.randomConsumed, input.randomValues.length);
  assert.equal(output.diagnosticDrawCount, input.randomValues.length);
  assert.deepEqual(
    output.events.filter((event) => event.opcode === 'initiative').map((event) => [event.actorId, event.timing]),
    [[900, 4], [1, 4]],
  );
  assert.deepEqual(
    output.events.filter((event) => event.opcode === 'target_selected').map((event) => event.targetId),
    [1, 2, 900],
  );
  const groupedEnemy = output.events.filter((event) => event.opcode === 'attack' && event.actorId === 900);
  assert.deepEqual(groupedEnemy.map((event) => [event.targetId, event.attempts, event.hits]), [[1, 1, 1], [2, 1, 1]]);
  assert.deepEqual(output.physicalThreatBag, [{ id: 1, tickets: 0 }, { id: 2, tickets: 0 }]);
  assert.equal(output.partyHp, 972);
  assert.equal(output.enemyHp, 928);
  assert.equal(output.enemyHitsReceived, 1);
  assert.equal(output.events.at(-1)?.opcode, 'phase_ended');
});

test('base COMBAT applies minimum damage, large finite values, lethal scheduling, and exact cursor', () => {
  const large = 5_000_000_000;
  const input = combatBaseInput({
    enemyHp: 1,
    enemyMaxHp: large,
    partyHp: large,
    partyMaxHp: large,
    combatants: combatBaseInput().combatants.map((combatant, index) => index === 1
      ? { ...combatant, rangedAttack: large, rangedNoA: 1, physicalPenetration: 0, physicalOffenseAmplifier: 1 }
      : index === 0 ? { ...combatant, physicalDefense: large * 2 } : combatant),
    randomValues: [0, 0, 0, 0, 0, 0.75],
  });
  const output = executeBattleProtocol(encodeBattleProtocolInput(input));
  assert.equal(output.protocolError, 0);
  assert.equal(output.outcome, 'victory');
  assert.equal(output.enemyHp, 0);
  assert.equal(output.enemyHitsReceived, 1);
  assert.equal(output.randomConsumed, 5);
  assert.equal(output.randomConsumed < input.randomValues.length, true, 'unused tape must remain untouched');

  const exhausted = executeBattleProtocol(encodeBattleProtocolInput({ ...input, randomValues: input.randomValues.slice(0, 4) }));
  assert.equal(exhausted.protocolError, BATTLE_PROTOCOL_ERROR_CODES.tapeExhausted);
  assert.deepEqual(exhausted.events, []);
  assert.deepEqual(exhausted.physicalThreatBag, []);
  assert.deepEqual(exhausted.magicalThreatBag, []);
});

test('base COMBAT selects the magical bag and applies elemental and defense amplifiers', () => {
  const input = combatBaseInput({
    physicalThreatBag: [{ id: 1, tickets: 3 }, { id: 2, tickets: 3 }],
    magicalThreatBag: [{ id: 1, tickets: 1 }, { id: 2, tickets: 1 }],
    combatants: combatBaseInput().combatants.map((combatant, index) => index === 0
      ? {
          ...combatant, magicalAttack: 10, magicalNoA: 1, magicalAccuracyPotency: 0.5,
          enemyMagicalAmplifier: 2, elementalOffense: 'thunder', elementalOffenseValue: 2,
        }
      : index === 1
        ? { ...combatant, magicalDefense: 4, thunderResistance: 0.5, magicalDefenseAmplifier: 0.5, deityMagicalDefenseBonus: 0.5 }
        : combatant),
    randomValues: [0, 0, 0, 0, 0.5],
  });
  const output = executeBattleProtocol(encodeBattleProtocolInput(input));
  assert.equal(output.protocolError, 0);
  assert.equal(output.partyHp, 97);
  assert.deepEqual(output.physicalThreatBag, input.physicalThreatBag);
  assert.deepEqual(output.magicalThreatBag, [{ id: 1, tickets: 0 }, { id: 2, tickets: 1 }]);
  const attack = output.events.find((event) => event.opcode === 'attack');
  assert.deepEqual([attack?.attackType, attack?.attempts, attack?.hits, attack?.value0], ['magical', 1, 1, 3]);
});

test('base COMBAT lethal damage prevents later scheduled actions without draining their tape', () => {
  const input = combatBaseInput({
    enemyHp: 1,
    enemyMaxHp: 100,
    combatants: combatBaseInput().combatants.map((combatant, index) => index === 0
      ? { ...combatant, meleeAttack: 100, meleeNoA: 1 }
      : index === 1 ? { ...combatant, rangedAttack: 100, rangedNoA: 1 } : combatant),
    randomValues: [0.999, 0.999, 0.999, 0.999, 0, 0, 0.25, 0.75],
  });
  const output = executeBattleProtocol(encodeBattleProtocolInput(input));
  assert.equal(output.outcome, 'victory');
  assert.equal(output.randomConsumed, 6);
  assert.deepEqual(output.events.filter((event) => event.opcode === 'attack').map((event) => event.actorId), [1]);
});

test('base COMBAT resets native state and uses one measured Wasm call', () => {
  beginBattleKernelMeasurement();
  const first = executeBattleProtocol(encodeBattleProtocolInput(combatBaseInput()));
  const measurement = endBattleKernelMeasurement();
  assert.equal(first.protocolError, 0);
  assert.equal(measurement.calls, 1);

  const second = executeBattleProtocol(encodeBattleProtocolInput(combatBaseInput({ partyHp: 77, partyMaxHp: 77, enemyHp: 88, enemyMaxHp: 88 })));
  assert.equal(second.partyHp, 77);
  assert.equal(second.enemyHp, 88);
  assert.equal(second.randomConsumed, 0);
  assert.deepEqual(second.events.map((event) => event.opcode), [
    'battle_started', 'phase_started', 'phase_ended', 'phase_started', 'phase_ended',
  ]);
});
