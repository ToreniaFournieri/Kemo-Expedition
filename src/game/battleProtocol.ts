import type { AbilityId, AttackType, ElementalOffense, TerrainEffectKey } from '../types/index.ts';
import {
  BATTLE_ABILITY_IDS,
  BATTLE_ABILITY_NAMES,
  BATTLE_ABILITY_OFFSETS,
  BATTLE_ABILITY_RECORD_SIZE,
  BATTLE_BAG_OFFSETS,
  BATTLE_BAG_RECORD_SIZE,
  BATTLE_COMBATANT_OFFSETS,
  BATTLE_COMBATANT_RECORD_SIZE,
  BATTLE_EVENT_NAMES,
  BATTLE_EVENT_OFFSETS,
  BATTLE_EVENT_RECORD_SIZE,
  BATTLE_INPUT_HEADER_SIZE,
  BATTLE_INPUT_OFFSETS,
  BATTLE_OUTPUT_HEADER_SIZE,
  BATTLE_OUTPUT_OFFSETS,
  BATTLE_PROTOCOL_ARENA_CAPACITY,
  BATTLE_PROTOCOL_INPUT_MAGIC,
  BATTLE_PROTOCOL_OUTPUT_MAGIC,
  BATTLE_PROTOCOL_VERSION,
  BATTLE_TERRAIN_IDS,
  BATTLE_TERRAIN_NAMES,
} from './generated/battleProtocol.generated.ts';

export type BattleProtocolAbility = {
  id: AbilityId;
  level: number;
  flags?: number;
};

export type BattleProtocolCombatant = {
  id: number;
  kind: 'character' | 'enemy';
  row: number;
  elementalOffense: ElementalOffense;
  flags?: number;
  hp: number;
  maxHp: number;
  rangedAttack: number;
  magicalAttack: number;
  meleeAttack: number;
  rangedNoA: number;
  magicalNoA: number;
  meleeNoA: number;
  physicalDefense: number;
  magicalDefense: number;
  accuracyBonus: number;
  evasionBonus: number;
  elementalOffenseValue: number;
  abilities: BattleProtocolAbility[];
};

export type BattleProtocolInput = {
  flags?: number;
  terrainEffect?: TerrainEffectKey | null;
  partyHp: number;
  enemyHp: number;
  combatants: BattleProtocolCombatant[];
  randomValues: readonly number[];
  physicalThreatBag: ReadonlyArray<{ id: number; tickets: number }>;
  magicalThreatBag: ReadonlyArray<{ id: number; tickets: number }>;
  seed?: bigint;
  deityId?: number;
  rngVersion?: number;
  engineFlags?: number;
};

export type BattleProtocolEvent = {
  opcode: keyof typeof import('./generated/battleProtocol.generated.ts').BATTLE_EVENT_OPCODES;
  phase: number;
  actorKind: number;
  actorId: number;
  targetId: number;
  abilityId: AbilityId | null;
  attackType: AttackType | null;
  flags: number;
  timing: number;
  hits: number;
  attempts: number;
  aux0: number;
  value0: number;
  value1: number;
  value2: number;
  aux1: number;
  aux2: number;
};

export type BattleProtocolOutput = {
  flags: number;
  outcome: 'unresolved' | 'victory' | 'defeat' | 'draw';
  partyHp: number;
  enemyHp: number;
  randomConsumed: number;
  enemyHitsReceived: number;
  events: BattleProtocolEvent[];
  physicalThreatBag: Array<{ id: number; tickets: number }>;
  magicalThreatBag: Array<{ id: number; tickets: number }>;
  byteLength: number;
  seed: bigint;
  rngVersion: number;
  diagnosticDrawCount: number;
  protocolError: number;
};

const littleEndian = true;
const elementalIds: Record<ElementalOffense, number> = { none: 0, fire: 1, thunder: 2, ice: 3 };
const attackTypes: Array<AttackType | null> = [null, 'ranged', 'magical', 'melee'];
const outcomes = ['unresolved', 'victory', 'defeat', 'draw'] as const;

function requireInteger(value: number, minimum: number, maximum: number, label: string): number {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${label} must be an integer from ${minimum} through ${maximum}`);
  }
  return value;
}

function requireFinite(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new RangeError(`${label} must be finite`);
  return value;
}

function requireSpan(offset: number, count: number, recordSize: number, totalSize: number, label: string): void {
  const end = offset + count * recordSize;
  if (!Number.isSafeInteger(end) || offset < BATTLE_OUTPUT_HEADER_SIZE || end > totalSize) {
    throw new Error(`Invalid battle protocol ${label} span`);
  }
}

export function encodeBattleProtocolInput(input: BattleProtocolInput): Uint8Array {
  requireInteger(input.combatants.length, 1, 0xffff, 'combatant count');
  const abilityCount = input.combatants.reduce((total, combatant) => total + combatant.abilities.length, 0);
  requireInteger(abilityCount, 0, 0xffff_ffff, 'ability count');
  requireInteger(input.randomValues.length, 0, 0xffff_ffff, 'random count');

  const combatantsOffset = BATTLE_INPUT_HEADER_SIZE;
  const abilitiesOffset = combatantsOffset + input.combatants.length * BATTLE_COMBATANT_RECORD_SIZE;
  const randomOffset = abilitiesOffset + abilityCount * BATTLE_ABILITY_RECORD_SIZE;
  const physicalBagOffset = randomOffset + input.randomValues.length * Float64Array.BYTES_PER_ELEMENT;
  const magicalBagOffset = physicalBagOffset + input.physicalThreatBag.length * BATTLE_BAG_RECORD_SIZE;
  const totalSize = magicalBagOffset + input.magicalThreatBag.length * BATTLE_BAG_RECORD_SIZE;
  if (totalSize > BATTLE_PROTOCOL_ARENA_CAPACITY) {
    throw new RangeError(`Battle protocol input requires ${totalSize} bytes; arena capacity is ${BATTLE_PROTOCOL_ARENA_CAPACITY}`);
  }

  const bytes = new Uint8Array(totalSize);
  const view = new DataView(bytes.buffer);
  view.setUint32(BATTLE_INPUT_OFFSETS.magic, BATTLE_PROTOCOL_INPUT_MAGIC, littleEndian);
  view.setUint16(BATTLE_INPUT_OFFSETS.version, BATTLE_PROTOCOL_VERSION, littleEndian);
  view.setUint16(BATTLE_INPUT_OFFSETS.headerSize, BATTLE_INPUT_HEADER_SIZE, littleEndian);
  view.setUint32(BATTLE_INPUT_OFFSETS.totalSize, totalSize, littleEndian);
  view.setUint32(BATTLE_INPUT_OFFSETS.flags, input.flags ?? 0, littleEndian);
  const terrainId = input.terrainEffect ? BATTLE_TERRAIN_IDS[input.terrainEffect as keyof typeof BATTLE_TERRAIN_IDS] : 0;
  if (input.terrainEffect && terrainId === undefined) throw new Error(`Unknown battle terrain ID: ${input.terrainEffect}`);
  view.setUint16(BATTLE_INPUT_OFFSETS.terrainId, terrainId ?? 0, littleEndian);
  view.setUint16(BATTLE_INPUT_OFFSETS.combatantCount, input.combatants.length, littleEndian);
  view.setUint32(BATTLE_INPUT_OFFSETS.abilityCount, abilityCount, littleEndian);
  view.setUint32(BATTLE_INPUT_OFFSETS.randomCount, input.randomValues.length, littleEndian);
  view.setUint32(BATTLE_INPUT_OFFSETS.combatantsOffset, combatantsOffset, littleEndian);
  view.setUint32(BATTLE_INPUT_OFFSETS.abilitiesOffset, abilitiesOffset, littleEndian);
  view.setUint32(BATTLE_INPUT_OFFSETS.randomOffset, randomOffset, littleEndian);
  view.setUint32(BATTLE_INPUT_OFFSETS.physicalBagCount, input.physicalThreatBag.length, littleEndian);
  view.setUint32(BATTLE_INPUT_OFFSETS.physicalBagOffset, physicalBagOffset, littleEndian);
  view.setUint32(BATTLE_INPUT_OFFSETS.magicalBagCount, input.magicalThreatBag.length, littleEndian);
  view.setUint32(BATTLE_INPUT_OFFSETS.magicalBagOffset, magicalBagOffset, littleEndian);
  view.setFloat64(BATTLE_INPUT_OFFSETS.partyHp, requireFinite(input.partyHp, 'party HP'), littleEndian);
  view.setFloat64(BATTLE_INPUT_OFFSETS.enemyHp, requireFinite(input.enemyHp, 'enemy HP'), littleEndian);
  const seed = BigInt.asUintN(64, input.seed ?? 0n);
  view.setUint32(BATTLE_INPUT_OFFSETS.seedLow, Number(seed & 0xffff_ffffn), littleEndian);
  view.setUint32(BATTLE_INPUT_OFFSETS.seedHigh, Number(seed >> 32n), littleEndian);
  view.setUint16(BATTLE_INPUT_OFFSETS.deityId, requireInteger(input.deityId ?? 0, 0, 0xffff, 'deity ID'), littleEndian);
  view.setUint16(BATTLE_INPUT_OFFSETS.rngVersion, requireInteger(input.rngVersion ?? 0, 0, 0xffff, 'RNG version'), littleEndian);
  view.setUint32(BATTLE_INPUT_OFFSETS.engineFlags, requireInteger(input.engineFlags ?? 0, 0, 0xffff_ffff, 'engine flags'), littleEndian);

  let abilityStart = 0;
  input.combatants.forEach((combatant, combatantIndex) => {
    requireInteger(combatant.id, 1, 0xffff_ffff, 'combatant ID');
    requireInteger(combatant.row, 0, 0xff, 'combatant row');
    requireInteger(combatant.abilities.length, 0, 0xffff, 'combatant ability count');
    const offset = combatantsOffset + combatantIndex * BATTLE_COMBATANT_RECORD_SIZE;
    view.setUint32(offset + BATTLE_COMBATANT_OFFSETS.id, combatant.id, littleEndian);
    view.setUint8(offset + BATTLE_COMBATANT_OFFSETS.kind, combatant.kind === 'character' ? 1 : 2);
    view.setUint8(offset + BATTLE_COMBATANT_OFFSETS.row, combatant.row);
    view.setUint8(offset + BATTLE_COMBATANT_OFFSETS.elementalOffense, elementalIds[combatant.elementalOffense]);
    view.setUint8(offset + BATTLE_COMBATANT_OFFSETS.flags, combatant.flags ?? 0);
    const numericFields: Array<[number, number, string]> = [
      [BATTLE_COMBATANT_OFFSETS.hp, combatant.hp, 'combatant HP'],
      [BATTLE_COMBATANT_OFFSETS.maxHp, combatant.maxHp, 'combatant max HP'],
      [BATTLE_COMBATANT_OFFSETS.rangedAttack, combatant.rangedAttack, 'ranged attack'],
      [BATTLE_COMBATANT_OFFSETS.magicalAttack, combatant.magicalAttack, 'magical attack'],
      [BATTLE_COMBATANT_OFFSETS.meleeAttack, combatant.meleeAttack, 'melee attack'],
      [BATTLE_COMBATANT_OFFSETS.rangedNoA, combatant.rangedNoA, 'ranged NoA'],
      [BATTLE_COMBATANT_OFFSETS.magicalNoA, combatant.magicalNoA, 'magical NoA'],
      [BATTLE_COMBATANT_OFFSETS.meleeNoA, combatant.meleeNoA, 'melee NoA'],
      [BATTLE_COMBATANT_OFFSETS.physicalDefense, combatant.physicalDefense, 'physical defense'],
      [BATTLE_COMBATANT_OFFSETS.magicalDefense, combatant.magicalDefense, 'magical defense'],
      [BATTLE_COMBATANT_OFFSETS.accuracyBonus, combatant.accuracyBonus, 'accuracy bonus'],
      [BATTLE_COMBATANT_OFFSETS.evasionBonus, combatant.evasionBonus, 'evasion bonus'],
      [BATTLE_COMBATANT_OFFSETS.elementalOffenseValue, combatant.elementalOffenseValue, 'elemental offense value'],
    ];
    numericFields.forEach(([fieldOffset, value, label]) => view.setFloat64(offset + fieldOffset, requireFinite(value, label), littleEndian));
    view.setUint32(offset + BATTLE_COMBATANT_OFFSETS.abilityStart, abilityStart, littleEndian);
    view.setUint16(offset + BATTLE_COMBATANT_OFFSETS.abilityCount, combatant.abilities.length, littleEndian);

    combatant.abilities.forEach((ability, localIndex) => {
      const abilityId = BATTLE_ABILITY_IDS[ability.id];
      if (abilityId === undefined) throw new Error(`Unknown battle ability ID: ${ability.id}`);
      const abilityOffset = abilitiesOffset + (abilityStart + localIndex) * BATTLE_ABILITY_RECORD_SIZE;
      view.setUint16(abilityOffset + BATTLE_ABILITY_OFFSETS.id, abilityId, littleEndian);
      view.setUint8(abilityOffset + BATTLE_ABILITY_OFFSETS.level, requireInteger(ability.level, 0, 0xff, 'ability level'));
      view.setUint8(abilityOffset + BATTLE_ABILITY_OFFSETS.flags, ability.flags ?? 0);
      view.setUint32(abilityOffset + BATTLE_ABILITY_OFFSETS.ownerId, combatant.id, littleEndian);
    });
    abilityStart += combatant.abilities.length;
  });

  input.randomValues.forEach((value, index) => {
    const normalized = requireFinite(value, 'random value');
    if (normalized < 0 || normalized >= 1) throw new RangeError('random value must be in [0, 1)');
    view.setFloat64(randomOffset + index * Float64Array.BYTES_PER_ELEMENT, normalized, littleEndian);
  });
  const encodeBag = (entries: ReadonlyArray<{ id: number; tickets: number }>, offset: number, label: string) => {
    entries.forEach((entry, index) => {
      const recordOffset = offset + index * BATTLE_BAG_RECORD_SIZE;
      view.setInt32(recordOffset + BATTLE_BAG_OFFSETS.id, requireInteger(entry.id, -0x8000_0000, 0x7fff_ffff, `${label} ID`), littleEndian);
      view.setUint32(recordOffset + BATTLE_BAG_OFFSETS.tickets, requireInteger(entry.tickets, 0, 0xffff_ffff, `${label} tickets`), littleEndian);
    });
  };
  encodeBag(input.physicalThreatBag, physicalBagOffset, 'physical threat bag');
  encodeBag(input.magicalThreatBag, magicalBagOffset, 'magical threat bag');
  return bytes;
}

export function decodeBattleProtocolOutput(bytes: Uint8Array): BattleProtocolOutput {
  if (bytes.byteLength < BATTLE_OUTPUT_HEADER_SIZE) throw new Error('Battle protocol output is shorter than its header');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(BATTLE_OUTPUT_OFFSETS.magic, littleEndian) !== BATTLE_PROTOCOL_OUTPUT_MAGIC) throw new Error('Invalid battle protocol output magic');
  if (view.getUint16(BATTLE_OUTPUT_OFFSETS.version, littleEndian) !== BATTLE_PROTOCOL_VERSION) throw new Error('Unsupported battle protocol output version');
  if (view.getUint16(BATTLE_OUTPUT_OFFSETS.headerSize, littleEndian) !== BATTLE_OUTPUT_HEADER_SIZE) throw new Error('Invalid battle protocol output header size');
  const totalSize = view.getUint32(BATTLE_OUTPUT_OFFSETS.totalSize, littleEndian);
  if (totalSize < BATTLE_OUTPUT_HEADER_SIZE || totalSize > bytes.byteLength) throw new Error('Invalid battle protocol output size');
  const outcomeId = view.getUint8(BATTLE_OUTPUT_OFFSETS.outcome);
  const outcome = outcomes[outcomeId];
  if (!outcome) throw new Error(`Invalid battle protocol outcome ${outcomeId}`);

  const eventCount = view.getUint32(BATTLE_OUTPUT_OFFSETS.eventCount, littleEndian);
  const eventsOffset = view.getUint32(BATTLE_OUTPUT_OFFSETS.eventsOffset, littleEndian);
  requireSpan(eventsOffset, eventCount, BATTLE_EVENT_RECORD_SIZE, totalSize, 'events');
  const events = Array.from({ length: eventCount }, (_, index): BattleProtocolEvent => {
    const offset = eventsOffset + index * BATTLE_EVENT_RECORD_SIZE;
    const opcodeId = view.getUint16(offset + BATTLE_EVENT_OFFSETS.opcode, littleEndian);
    const opcode = BATTLE_EVENT_NAMES[opcodeId];
    if (!opcode) throw new Error(`Invalid battle event opcode ${opcodeId}`);
    const abilityId = view.getUint16(offset + BATTLE_EVENT_OFFSETS.abilityId, littleEndian);
    const attackTypeId = view.getUint8(offset + BATTLE_EVENT_OFFSETS.attackType);
    if (abilityId !== 0 && !BATTLE_ABILITY_NAMES[abilityId]) throw new Error(`Invalid battle event ability ${abilityId}`);
    if (attackTypeId >= attackTypes.length) throw new Error(`Invalid battle event attack type ${attackTypeId}`);
    return {
      opcode,
      phase: view.getUint8(offset + BATTLE_EVENT_OFFSETS.phase),
      actorKind: view.getUint8(offset + BATTLE_EVENT_OFFSETS.actorKind),
      actorId: view.getUint32(offset + BATTLE_EVENT_OFFSETS.actorId, littleEndian),
      targetId: view.getUint32(offset + BATTLE_EVENT_OFFSETS.targetId, littleEndian),
      abilityId: abilityId === 0 ? null : BATTLE_ABILITY_NAMES[abilityId] as AbilityId,
      attackType: attackTypes[attackTypeId] ?? null,
      flags: view.getUint8(offset + BATTLE_EVENT_OFFSETS.flags),
      timing: view.getInt32(offset + BATTLE_EVENT_OFFSETS.timing, littleEndian),
      hits: view.getUint32(offset + BATTLE_EVENT_OFFSETS.hits, littleEndian),
      attempts: view.getUint32(offset + BATTLE_EVENT_OFFSETS.attempts, littleEndian),
      aux0: view.getUint32(offset + BATTLE_EVENT_OFFSETS.aux0, littleEndian),
      value0: view.getFloat64(offset + BATTLE_EVENT_OFFSETS.value0, littleEndian),
      value1: view.getFloat64(offset + BATTLE_EVENT_OFFSETS.value1, littleEndian),
      value2: view.getFloat64(offset + BATTLE_EVENT_OFFSETS.value2, littleEndian),
      aux1: view.getUint32(offset + BATTLE_EVENT_OFFSETS.aux1, littleEndian),
      aux2: view.getUint32(offset + BATTLE_EVENT_OFFSETS.aux2, littleEndian),
    };
  });

  const decodeBag = (countOffset: number, recordsOffset: number, label: string) => {
    const count = view.getUint32(countOffset, littleEndian);
    const offset = view.getUint32(recordsOffset, littleEndian);
    if (count === 0) return [];
    requireSpan(offset, count, BATTLE_BAG_RECORD_SIZE, totalSize, label);
    return Array.from({ length: count }, (_, index) => ({
      id: view.getInt32(offset + index * BATTLE_BAG_RECORD_SIZE + BATTLE_BAG_OFFSETS.id, littleEndian),
      tickets: view.getUint32(offset + index * BATTLE_BAG_RECORD_SIZE + BATTLE_BAG_OFFSETS.tickets, littleEndian),
    }));
  };

  return {
    flags: view.getUint32(BATTLE_OUTPUT_OFFSETS.flags, littleEndian),
    outcome,
    partyHp: view.getFloat64(BATTLE_OUTPUT_OFFSETS.partyHp, littleEndian),
    enemyHp: view.getFloat64(BATTLE_OUTPUT_OFFSETS.enemyHp, littleEndian),
    randomConsumed: view.getUint32(BATTLE_OUTPUT_OFFSETS.randomConsumed, littleEndian),
    enemyHitsReceived: view.getUint32(BATTLE_OUTPUT_OFFSETS.enemyHitsReceived, littleEndian),
    events,
    physicalThreatBag: decodeBag(BATTLE_OUTPUT_OFFSETS.physicalBagCount, BATTLE_OUTPUT_OFFSETS.physicalBagOffset, 'physical bag'),
    magicalThreatBag: decodeBag(BATTLE_OUTPUT_OFFSETS.magicalBagCount, BATTLE_OUTPUT_OFFSETS.magicalBagOffset, 'magical bag'),
    byteLength: totalSize,
    seed: (BigInt(view.getUint32(BATTLE_OUTPUT_OFFSETS.seedHigh, littleEndian)) << 32n)
      | BigInt(view.getUint32(BATTLE_OUTPUT_OFFSETS.seedLow, littleEndian)),
    rngVersion: view.getUint32(BATTLE_OUTPUT_OFFSETS.rngVersion, littleEndian),
    diagnosticDrawCount: view.getUint32(BATTLE_OUTPUT_OFFSETS.diagnosticDrawCount, littleEndian),
    protocolError: view.getUint32(BATTLE_OUTPUT_OFFSETS.protocolError, littleEndian),
  };
}

export function getBattleProtocolTerrainName(id: number): string | null {
  return id === 0 ? null : BATTLE_TERRAIN_NAMES[id] ?? null;
}
