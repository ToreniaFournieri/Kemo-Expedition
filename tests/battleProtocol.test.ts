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
  BATTLE_ENGINE_FLAG_START_CHECKPOINT,
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
