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
import { requireBattleSeed } from './battleReplay.ts';

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
  originalRangedNoA?: number;
  originalMagicalNoA?: number;
  originalMeleeNoA?: number;
  rangedAccuracyPotency?: number;
  magicalAccuracyPotency?: number;
  meleeAccuracyPotency?: number;
  physicalPenetration?: number;
  magicalPenetration?: number;
  fireResistance?: number;
  thunderResistance?: number;
  iceResistance?: number;
  physicalOffenseAmplifier?: number;
  magicalOffenseAmplifier?: number;
  physicalDefenseAmplifier?: number;
  magicalDefenseAmplifier?: number;
  startPhaseBonus?: number;
  combatPhaseBonus?: number;
  endPhaseBonus?: number;
  deityOffenseBonus?: number;
  deityPhysicalDefenseBonus?: number;
  deityMagicalDefenseBonus?: number;
  deityAccuracyBonus?: number;
  enemyRangedAmplifier?: number;
  enemyMagicalAmplifier?: number;
  enemyMeleeAmplifier?: number;
  rangedAttackBonus?: number;
  magicalAttackBonus?: number;
  meleeAttackBonus?: number;
  magicStyle?: 0 | 1 | 2 | 3 | 4;
  abilities: BattleProtocolAbility[];
};

export type BattleProtocolInput = {
  flags?: number;
  terrainEffect?: TerrainEffectKey | null;
  partyHp: number;
  partyMaxHp?: number;
  enemyHp: number;
  enemyMaxHp?: number;
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
export const BATTLE_PROTOCOL_MAX_SEMANTIC_EVENTS = 4_096;

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
  if (count === 0 && offset === 0) return;
  const end = offset + count * recordSize;
  if (!Number.isSafeInteger(end) || offset < BATTLE_OUTPUT_HEADER_SIZE || end > totalSize) {
    throw new Error(`Invalid battle protocol ${label} span`);
  }
}

type BattleProtocolInputLayout = {
  abilityCount: number;
  combatantsOffset: number;
  abilitiesOffset: number;
  randomOffset: number;
  physicalBagOffset: number;
  magicalBagOffset: number;
  totalSize: number;
  terrainId: number;
  seed: bigint;
};

let encodedInputAllocations = 0;
let encodedInputAllocationBytes = 0;
let decodedEventObjectAllocations = 0;
let decodedBagEntryObjectAllocations = 0;
let resultBagEntryObjectAllocations = 0;

export function resetBattleProtocolEncodingMeasurement(): void {
  encodedInputAllocations = 0;
  encodedInputAllocationBytes = 0;
  decodedEventObjectAllocations = 0;
  decodedBagEntryObjectAllocations = 0;
  resultBagEntryObjectAllocations = 0;
}

export function getBattleProtocolEncodingMeasurement(): {
  allocations: number;
  bytes: number;
  decodedEventObjectAllocations: number;
  decodedBagEntryObjectAllocations: number;
  resultBagEntryObjectAllocations: number;
} {
  return {
    allocations: encodedInputAllocations,
    bytes: encodedInputAllocationBytes,
    decodedEventObjectAllocations,
    decodedBagEntryObjectAllocations,
    resultBagEntryObjectAllocations,
  };
}

export function recordBattleResultBagEntryObjectAllocations(count: number): void {
  resultBagEntryObjectAllocations += count;
}

function validateBattleProtocolInput(input: BattleProtocolInput): BattleProtocolInputLayout {
  requireInteger(input.combatants.length, 1, 8, 'combatant count');
  const abilityCount = input.combatants.reduce((total, combatant) => total + combatant.abilities.length, 0);
  requireInteger(abilityCount, 0, 0xffff_ffff, 'ability count');
  requireInteger(input.randomValues.length, 0, 4_096, 'random count');
  requireInteger(input.physicalThreatBag.length, 0, 0xffff_ffff, 'physical threat bag count');
  requireInteger(input.magicalThreatBag.length, 0, 0xffff_ffff, 'magical threat bag count');

  const combatantsOffset = BATTLE_INPUT_HEADER_SIZE;
  const abilitiesOffset = combatantsOffset + input.combatants.length * BATTLE_COMBATANT_RECORD_SIZE;
  const randomOffset = abilitiesOffset + abilityCount * BATTLE_ABILITY_RECORD_SIZE;
  const physicalBagOffset = randomOffset + input.randomValues.length * Float64Array.BYTES_PER_ELEMENT;
  const magicalBagOffset = physicalBagOffset + input.physicalThreatBag.length * BATTLE_BAG_RECORD_SIZE;
  const totalSize = magicalBagOffset + input.magicalThreatBag.length * BATTLE_BAG_RECORD_SIZE;
  if (!Number.isSafeInteger(totalSize) || totalSize > BATTLE_PROTOCOL_ARENA_CAPACITY) {
    throw new RangeError(`Battle protocol input requires ${totalSize} bytes; arena capacity is ${BATTLE_PROTOCOL_ARENA_CAPACITY}`);
  }

  requireInteger(input.flags ?? 0, 0, 0xffff_ffff, 'battle flags');
  const terrainId = input.terrainEffect ? BATTLE_TERRAIN_IDS[input.terrainEffect as keyof typeof BATTLE_TERRAIN_IDS] : 0;
  if (input.terrainEffect && terrainId === undefined) throw new Error(`Unknown battle terrain ID: ${input.terrainEffect}`);
  requireFinite(input.partyHp, 'party HP');
  requireFinite(input.enemyHp, 'enemy HP');
  requireFinite(input.partyMaxHp ?? input.partyHp, 'party max HP');
  requireFinite(input.enemyMaxHp ?? input.enemyHp, 'enemy max HP');
  const seed = requireBattleSeed(input.seed ?? 0n);
  requireInteger(input.deityId ?? 0, 0, 0xffff, 'deity ID');
  requireInteger(input.rngVersion ?? 0, 0, 0xffff, 'RNG version');
  requireInteger(input.engineFlags ?? 0, 0, 0xffff_ffff, 'engine flags');

  input.combatants.forEach((combatant) => {
    requireInteger(combatant.id, 1, 0xffff_ffff, 'combatant ID');
    requireInteger(combatant.row, 0, 0xff, 'combatant row');
    requireInteger(combatant.flags ?? 0, 0, 0xff, 'combatant flags');
    requireInteger(combatant.abilities.length, 0, 0xffff, 'combatant ability count');
    requireInteger(combatant.magicStyle ?? 0, 0, 4, 'magic style');
    if (elementalIds[combatant.elementalOffense] === undefined) {
      throw new Error(`Unknown elemental offense: ${combatant.elementalOffense}`);
    }
    const numericFields: Array<[number, string]> = [
      [combatant.hp, 'combatant HP'], [combatant.maxHp, 'combatant max HP'],
      [combatant.rangedAttack, 'ranged attack'], [combatant.magicalAttack, 'magical attack'],
      [combatant.meleeAttack, 'melee attack'], [combatant.rangedNoA, 'ranged NoA'],
      [combatant.magicalNoA, 'magical NoA'], [combatant.meleeNoA, 'melee NoA'],
      [combatant.physicalDefense, 'physical defense'], [combatant.magicalDefense, 'magical defense'],
      [combatant.accuracyBonus, 'accuracy bonus'], [combatant.evasionBonus, 'evasion bonus'],
      [combatant.elementalOffenseValue, 'elemental offense value'],
      [combatant.originalRangedNoA ?? combatant.rangedNoA, 'original ranged NoA'],
      [combatant.originalMagicalNoA ?? combatant.magicalNoA, 'original magical NoA'],
      [combatant.originalMeleeNoA ?? combatant.meleeNoA, 'original melee NoA'],
      [combatant.rangedAccuracyPotency ?? 1, 'ranged accuracy potency'],
      [combatant.magicalAccuracyPotency ?? 1, 'magical accuracy potency'],
      [combatant.meleeAccuracyPotency ?? 1, 'melee accuracy potency'],
      [combatant.physicalPenetration ?? 1, 'physical penetration'],
      [combatant.magicalPenetration ?? 1, 'magical penetration'],
      [combatant.fireResistance ?? 1, 'fire resistance'],
      [combatant.thunderResistance ?? 1, 'thunder resistance'],
      [combatant.iceResistance ?? 1, 'ice resistance'],
      [combatant.physicalOffenseAmplifier ?? 1, 'physical offense amplifier'],
      [combatant.magicalOffenseAmplifier ?? 1, 'magical offense amplifier'],
      [combatant.physicalDefenseAmplifier ?? 1, 'physical defense amplifier'],
      [combatant.magicalDefenseAmplifier ?? 1, 'magical defense amplifier'],
      [combatant.startPhaseBonus ?? 0, 'START phase bonus'],
      [combatant.combatPhaseBonus ?? 0, 'COMBAT phase bonus'],
      [combatant.endPhaseBonus ?? 0, 'END phase bonus'],
      [combatant.deityOffenseBonus ?? 0, 'deity offense bonus'],
      [combatant.deityPhysicalDefenseBonus ?? 1, 'deity physical defense bonus'],
      [combatant.deityMagicalDefenseBonus ?? 1, 'deity magical defense bonus'],
      [combatant.deityAccuracyBonus ?? 0, 'deity accuracy bonus'],
      [combatant.enemyRangedAmplifier ?? 1, 'enemy ranged amplifier'],
      [combatant.enemyMagicalAmplifier ?? 1, 'enemy magical amplifier'],
      [combatant.enemyMeleeAmplifier ?? 1, 'enemy melee amplifier'],
      [combatant.rangedAttackBonus ?? 0, 'ranged attack bonus'],
      [combatant.magicalAttackBonus ?? 0, 'magical attack bonus'],
      [combatant.meleeAttackBonus ?? 0, 'melee attack bonus'],
    ];
    numericFields.forEach(([value, label]) => requireFinite(value, label));
    combatant.abilities.forEach((ability) => {
      if (BATTLE_ABILITY_IDS[ability.id] === undefined) throw new Error(`Unknown battle ability ID: ${ability.id}`);
      requireInteger(ability.level, 0, 0xff, 'ability level');
      requireInteger(ability.flags ?? 0, 0, 0xff, 'ability flags');
    });
  });
  input.randomValues.forEach((value) => {
    const normalized = requireFinite(value, 'random value');
    if (normalized < 0 || normalized >= 1) throw new RangeError('random value must be in [0, 1)');
  });
  const validateBag = (entries: ReadonlyArray<{ id: number; tickets: number }>, label: string) => entries.forEach((entry) => {
    requireInteger(entry.id, -0x8000_0000, 0x7fff_ffff, `${label} ID`);
    requireInteger(entry.tickets, 0, 0xffff_ffff, `${label} tickets`);
  });
  validateBag(input.physicalThreatBag, 'physical threat bag');
  validateBag(input.magicalThreatBag, 'magical threat bag');
  return { abilityCount, combatantsOffset, abilitiesOffset, randomOffset, physicalBagOffset, magicalBagOffset, totalSize, terrainId: terrainId ?? 0, seed };
}

function writeValidatedBattleProtocolInput(input: BattleProtocolInput, layout: BattleProtocolInputLayout, bytes: Uint8Array): number {
  if (bytes.byteLength < layout.totalSize) {
    throw new RangeError(`Battle protocol input target requires ${layout.totalSize} bytes; target capacity is ${bytes.byteLength}`);
  }
  const { abilityCount, combatantsOffset, abilitiesOffset, randomOffset, physicalBagOffset, magicalBagOffset, totalSize, terrainId, seed } = layout;

  const view = new DataView(bytes.buffer, bytes.byteOffset, totalSize);
  view.setUint32(BATTLE_INPUT_OFFSETS.magic, BATTLE_PROTOCOL_INPUT_MAGIC, littleEndian);
  view.setUint16(BATTLE_INPUT_OFFSETS.version, BATTLE_PROTOCOL_VERSION, littleEndian);
  view.setUint16(BATTLE_INPUT_OFFSETS.headerSize, BATTLE_INPUT_HEADER_SIZE, littleEndian);
  view.setUint32(BATTLE_INPUT_OFFSETS.totalSize, totalSize, littleEndian);
  view.setUint32(BATTLE_INPUT_OFFSETS.flags, input.flags ?? 0, littleEndian);
  view.setUint16(BATTLE_INPUT_OFFSETS.terrainId, terrainId, littleEndian);
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
  view.setFloat64(BATTLE_INPUT_OFFSETS.partyMaxHp, requireFinite(input.partyMaxHp ?? input.partyHp, 'party max HP'), littleEndian);
  view.setFloat64(BATTLE_INPUT_OFFSETS.enemyMaxHp, requireFinite(input.enemyMaxHp ?? input.enemyHp, 'enemy max HP'), littleEndian);
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
    view.setUint8(offset + BATTLE_COMBATANT_OFFSETS.magicStyle, requireInteger(combatant.magicStyle ?? 0, 0, 4, 'magic style'));
    const extendedNumericFields: Array<[number, number, string]> = [
      [BATTLE_COMBATANT_OFFSETS.originalRangedNoA, combatant.originalRangedNoA ?? combatant.rangedNoA, 'original ranged NoA'],
      [BATTLE_COMBATANT_OFFSETS.originalMagicalNoA, combatant.originalMagicalNoA ?? combatant.magicalNoA, 'original magical NoA'],
      [BATTLE_COMBATANT_OFFSETS.originalMeleeNoA, combatant.originalMeleeNoA ?? combatant.meleeNoA, 'original melee NoA'],
      [BATTLE_COMBATANT_OFFSETS.rangedAccuracyPotency, combatant.rangedAccuracyPotency ?? 1, 'ranged accuracy potency'],
      [BATTLE_COMBATANT_OFFSETS.magicalAccuracyPotency, combatant.magicalAccuracyPotency ?? 1, 'magical accuracy potency'],
      [BATTLE_COMBATANT_OFFSETS.meleeAccuracyPotency, combatant.meleeAccuracyPotency ?? 1, 'melee accuracy potency'],
      [BATTLE_COMBATANT_OFFSETS.physicalPenetration, combatant.physicalPenetration ?? 1, 'physical penetration'],
      [BATTLE_COMBATANT_OFFSETS.magicalPenetration, combatant.magicalPenetration ?? 1, 'magical penetration'],
      [BATTLE_COMBATANT_OFFSETS.fireResistance, combatant.fireResistance ?? 1, 'fire resistance'],
      [BATTLE_COMBATANT_OFFSETS.thunderResistance, combatant.thunderResistance ?? 1, 'thunder resistance'],
      [BATTLE_COMBATANT_OFFSETS.iceResistance, combatant.iceResistance ?? 1, 'ice resistance'],
      [BATTLE_COMBATANT_OFFSETS.physicalOffenseAmplifier, combatant.physicalOffenseAmplifier ?? 1, 'physical offense amplifier'],
      [BATTLE_COMBATANT_OFFSETS.magicalOffenseAmplifier, combatant.magicalOffenseAmplifier ?? 1, 'magical offense amplifier'],
      [BATTLE_COMBATANT_OFFSETS.physicalDefenseAmplifier, combatant.physicalDefenseAmplifier ?? 1, 'physical defense amplifier'],
      [BATTLE_COMBATANT_OFFSETS.magicalDefenseAmplifier, combatant.magicalDefenseAmplifier ?? 1, 'magical defense amplifier'],
      [BATTLE_COMBATANT_OFFSETS.startPhaseBonus, combatant.startPhaseBonus ?? 0, 'START phase bonus'],
      [BATTLE_COMBATANT_OFFSETS.combatPhaseBonus, combatant.combatPhaseBonus ?? 0, 'COMBAT phase bonus'],
      [BATTLE_COMBATANT_OFFSETS.endPhaseBonus, combatant.endPhaseBonus ?? 0, 'END phase bonus'],
      [BATTLE_COMBATANT_OFFSETS.deityOffenseBonus, combatant.deityOffenseBonus ?? 0, 'deity offense bonus'],
      [BATTLE_COMBATANT_OFFSETS.deityPhysicalDefenseBonus, combatant.deityPhysicalDefenseBonus ?? 1, 'deity physical defense bonus'],
      [BATTLE_COMBATANT_OFFSETS.deityMagicalDefenseBonus, combatant.deityMagicalDefenseBonus ?? 1, 'deity magical defense bonus'],
      [BATTLE_COMBATANT_OFFSETS.deityAccuracyBonus, combatant.deityAccuracyBonus ?? 0, 'deity accuracy bonus'],
      [BATTLE_COMBATANT_OFFSETS.enemyRangedAmplifier, combatant.enemyRangedAmplifier ?? 1, 'enemy ranged amplifier'],
      [BATTLE_COMBATANT_OFFSETS.enemyMagicalAmplifier, combatant.enemyMagicalAmplifier ?? 1, 'enemy magical amplifier'],
      [BATTLE_COMBATANT_OFFSETS.enemyMeleeAmplifier, combatant.enemyMeleeAmplifier ?? 1, 'enemy melee amplifier'],
      [BATTLE_COMBATANT_OFFSETS.rangedAttackBonus, combatant.rangedAttackBonus ?? 0, 'ranged attack bonus'],
      [BATTLE_COMBATANT_OFFSETS.magicalAttackBonus, combatant.magicalAttackBonus ?? 0, 'magical attack bonus'],
      [BATTLE_COMBATANT_OFFSETS.meleeAttackBonus, combatant.meleeAttackBonus ?? 0, 'melee attack bonus'],
    ];
    extendedNumericFields.forEach(([fieldOffset, value, label]) => view.setFloat64(offset + fieldOffset, requireFinite(value, label), littleEndian));

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
  return totalSize;
}

/** Validates and writes canonical protocol-v3 bytes into caller-owned memory. */
export function writeBattleProtocolInput(input: BattleProtocolInput, target: Uint8Array): number {
  const layout = validateBattleProtocolInput(input);
  return writeValidatedBattleProtocolInput(input, layout, target);
}

export function encodeBattleProtocolInput(input: BattleProtocolInput): Uint8Array {
  const layout = validateBattleProtocolInput(input);
  const bytes = new Uint8Array(layout.totalSize);
  encodedInputAllocations += 1;
  encodedInputAllocationBytes += layout.totalSize;
  writeValidatedBattleProtocolInput(input, layout, bytes);
  return bytes;
}

// SpecRef: 6.1.8 | Universal C++ battle kernel | protocol v3 borrowed output materialization
export class BorrowedBattleProtocolOutputView {
  private readonly borrowedByteLength: number;
  private readonly borrowedEventCount: number;
  private readonly borrowedPhysicalThreatBagCount: number;
  private readonly borrowedMagicalThreatBagCount: number;
  private readonly view: DataView;
  private readonly eventsOffset: number;
  private readonly physicalBagOffset: number;
  private readonly magicalBagOffset: number;
  private active = true;
  private lastEventIndex = -1;
  private lastEventOffset = 0;

  constructor(bytes: Uint8Array) {
  if (bytes.byteLength > BATTLE_PROTOCOL_ARENA_CAPACITY) throw new Error('Battle protocol output exceeds its arena capacity');
  if (bytes.byteLength < BATTLE_OUTPUT_HEADER_SIZE) throw new Error('Battle protocol output is shorter than its header');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(BATTLE_OUTPUT_OFFSETS.magic, littleEndian) !== BATTLE_PROTOCOL_OUTPUT_MAGIC) throw new Error('Invalid battle protocol output magic');
  if (view.getUint16(BATTLE_OUTPUT_OFFSETS.version, littleEndian) !== BATTLE_PROTOCOL_VERSION) throw new Error('Unsupported battle protocol output version');
  if (view.getUint16(BATTLE_OUTPUT_OFFSETS.headerSize, littleEndian) !== BATTLE_OUTPUT_HEADER_SIZE) throw new Error('Invalid battle protocol output header size');
    const totalSize = view.getUint32(BATTLE_OUTPUT_OFFSETS.totalSize, littleEndian);
    if (totalSize < BATTLE_OUTPUT_HEADER_SIZE || totalSize > bytes.byteLength) throw new Error('Invalid battle protocol output size');
  const outcomeId = view.getUint8(BATTLE_OUTPUT_OFFSETS.outcome);
    if (!outcomes[outcomeId]) throw new Error(`Invalid battle protocol outcome ${outcomeId}`);

    this.borrowedEventCount = view.getUint32(BATTLE_OUTPUT_OFFSETS.eventCount, littleEndian);
    if (this.borrowedEventCount > BATTLE_PROTOCOL_MAX_SEMANTIC_EVENTS) throw new Error('Battle protocol event count exceeds its supported capacity');
    this.eventsOffset = view.getUint32(BATTLE_OUTPUT_OFFSETS.eventsOffset, littleEndian);
    requireSpan(this.eventsOffset, this.borrowedEventCount, BATTLE_EVENT_RECORD_SIZE, totalSize, 'events');
    this.borrowedPhysicalThreatBagCount = view.getUint32(BATTLE_OUTPUT_OFFSETS.physicalBagCount, littleEndian);
    this.physicalBagOffset = view.getUint32(BATTLE_OUTPUT_OFFSETS.physicalBagOffset, littleEndian);
    requireSpan(this.physicalBagOffset, this.borrowedPhysicalThreatBagCount, BATTLE_BAG_RECORD_SIZE, totalSize, 'physical bag');
    this.borrowedMagicalThreatBagCount = view.getUint32(BATTLE_OUTPUT_OFFSETS.magicalBagCount, littleEndian);
    this.magicalBagOffset = view.getUint32(BATTLE_OUTPUT_OFFSETS.magicalBagOffset, littleEndian);
    requireSpan(this.magicalBagOffset, this.borrowedMagicalThreatBagCount, BATTLE_BAG_RECORD_SIZE, totalSize, 'magical bag');
    for (let index = 0; index < this.borrowedEventCount; index += 1) {
      const offset = this.eventsOffset + index * BATTLE_EVENT_RECORD_SIZE;
    const opcodeId = view.getUint16(offset + BATTLE_EVENT_OFFSETS.opcode, littleEndian);
      if (!BATTLE_EVENT_NAMES[opcodeId]) throw new Error(`Invalid battle event opcode ${opcodeId}`);
    const abilityId = view.getUint16(offset + BATTLE_EVENT_OFFSETS.abilityId, littleEndian);
    const attackTypeId = view.getUint8(offset + BATTLE_EVENT_OFFSETS.attackType);
    if (abilityId !== 0 && !BATTLE_ABILITY_NAMES[abilityId]) throw new Error(`Invalid battle event ability ${abilityId}`);
    if (attackTypeId >= attackTypes.length) throw new Error(`Invalid battle event attack type ${attackTypeId}`);
    }
    this.view = view;
    this.borrowedByteLength = totalSize;
  }

  invalidate(): void {
    this.active = false;
  }

  private requireActive(): void {
    if (!this.active) throw new Error('Borrowed battle protocol output view is no longer active');
  }

  private eventOffset(index: number): number {
    this.requireActive();
    if (!Number.isInteger(index) || index < 0 || index >= this.borrowedEventCount) {
      throw new RangeError(`Battle protocol event index ${index} is outside 0..${this.borrowedEventCount - 1}`);
    }
    if (index === this.lastEventIndex) return this.lastEventOffset;
    this.lastEventIndex = index;
    this.lastEventOffset = this.eventsOffset + index * BATTLE_EVENT_RECORD_SIZE;
    return this.lastEventOffset;
  }

  private bagOffset(kind: 'physical' | 'magical', index: number): number {
    this.requireActive();
    const count = kind === 'physical' ? this.borrowedPhysicalThreatBagCount : this.borrowedMagicalThreatBagCount;
    if (!Number.isInteger(index) || index < 0 || index >= count) {
      throw new RangeError(`Battle protocol ${kind} bag index ${index} is outside 0..${count - 1}`);
    }
    return (kind === 'physical' ? this.physicalBagOffset : this.magicalBagOffset) + index * BATTLE_BAG_RECORD_SIZE;
  }

  get byteLength(): number { this.requireActive(); return this.borrowedByteLength; }
  get eventCount(): number { this.requireActive(); return this.borrowedEventCount; }
  get generatedSemanticEventCount(): number {
    this.requireActive();
    return this.view.getUint32(BATTLE_OUTPUT_OFFSETS.reserved0, littleEndian);
  }
  get physicalThreatBagCount(): number { this.requireActive(); return this.borrowedPhysicalThreatBagCount; }
  get magicalThreatBagCount(): number { this.requireActive(); return this.borrowedMagicalThreatBagCount; }
  get flags(): number { this.requireActive(); return this.view.getUint32(BATTLE_OUTPUT_OFFSETS.flags, littleEndian); }
  get outcome(): BattleProtocolOutput['outcome'] { this.requireActive(); return outcomes[this.view.getUint8(BATTLE_OUTPUT_OFFSETS.outcome)]!; }
  get partyHp(): number { this.requireActive(); return this.view.getFloat64(BATTLE_OUTPUT_OFFSETS.partyHp, littleEndian); }
  get enemyHp(): number { this.requireActive(); return this.view.getFloat64(BATTLE_OUTPUT_OFFSETS.enemyHp, littleEndian); }
  get randomConsumed(): number { this.requireActive(); return this.view.getUint32(BATTLE_OUTPUT_OFFSETS.randomConsumed, littleEndian); }
  get enemyHitsReceived(): number { this.requireActive(); return this.view.getUint32(BATTLE_OUTPUT_OFFSETS.enemyHitsReceived, littleEndian); }
  get seed(): bigint {
    this.requireActive();
    return (BigInt(this.view.getUint32(BATTLE_OUTPUT_OFFSETS.seedHigh, littleEndian)) << 32n)
      | BigInt(this.view.getUint32(BATTLE_OUTPUT_OFFSETS.seedLow, littleEndian));
  }
  get rngVersion(): number { this.requireActive(); return this.view.getUint32(BATTLE_OUTPUT_OFFSETS.rngVersion, littleEndian); }
  get diagnosticDrawCount(): number { this.requireActive(); return this.view.getUint32(BATTLE_OUTPUT_OFFSETS.diagnosticDrawCount, littleEndian); }
  get protocolError(): number { this.requireActive(); return this.view.getUint32(BATTLE_OUTPUT_OFFSETS.protocolError, littleEndian); }

  eventOpcode(index: number): BattleProtocolEvent['opcode'] {
    return BATTLE_EVENT_NAMES[this.view.getUint16(this.eventOffset(index) + BATTLE_EVENT_OFFSETS.opcode, littleEndian)]!;
  }
  eventPhase(index: number): number { return this.view.getUint8(this.eventOffset(index) + BATTLE_EVENT_OFFSETS.phase); }
  eventActorKind(index: number): number { return this.view.getUint8(this.eventOffset(index) + BATTLE_EVENT_OFFSETS.actorKind); }
  eventActorId(index: number): number { return this.view.getUint32(this.eventOffset(index) + BATTLE_EVENT_OFFSETS.actorId, littleEndian); }
  eventTargetId(index: number): number { return this.view.getUint32(this.eventOffset(index) + BATTLE_EVENT_OFFSETS.targetId, littleEndian); }
  eventAbilityId(index: number): AbilityId | null {
    const id = this.view.getUint16(this.eventOffset(index) + BATTLE_EVENT_OFFSETS.abilityId, littleEndian);
    return id === 0 ? null : BATTLE_ABILITY_NAMES[id] as AbilityId;
  }
  eventAttackType(index: number): AttackType | null {
    return attackTypes[this.view.getUint8(this.eventOffset(index) + BATTLE_EVENT_OFFSETS.attackType)] ?? null;
  }
  eventFlags(index: number): number { return this.view.getUint8(this.eventOffset(index) + BATTLE_EVENT_OFFSETS.flags); }
  eventTiming(index: number): number { return this.view.getInt32(this.eventOffset(index) + BATTLE_EVENT_OFFSETS.timing, littleEndian); }
  eventHits(index: number): number { return this.view.getUint32(this.eventOffset(index) + BATTLE_EVENT_OFFSETS.hits, littleEndian); }
  eventAttempts(index: number): number { return this.view.getUint32(this.eventOffset(index) + BATTLE_EVENT_OFFSETS.attempts, littleEndian); }
  eventAux0(index: number): number { return this.view.getUint32(this.eventOffset(index) + BATTLE_EVENT_OFFSETS.aux0, littleEndian); }
  eventValue0(index: number): number { return this.view.getFloat64(this.eventOffset(index) + BATTLE_EVENT_OFFSETS.value0, littleEndian); }
  eventValue1(index: number): number { return this.view.getFloat64(this.eventOffset(index) + BATTLE_EVENT_OFFSETS.value1, littleEndian); }
  eventValue2(index: number): number { return this.view.getFloat64(this.eventOffset(index) + BATTLE_EVENT_OFFSETS.value2, littleEndian); }
  eventAux1(index: number): number { return this.view.getUint32(this.eventOffset(index) + BATTLE_EVENT_OFFSETS.aux1, littleEndian); }
  eventAux2(index: number): number { return this.view.getUint32(this.eventOffset(index) + BATTLE_EVENT_OFFSETS.aux2, littleEndian); }
  physicalThreatBagId(index: number): number { return this.view.getInt32(this.bagOffset('physical', index) + BATTLE_BAG_OFFSETS.id, littleEndian); }
  physicalThreatBagTickets(index: number): number { return this.view.getUint32(this.bagOffset('physical', index) + BATTLE_BAG_OFFSETS.tickets, littleEndian); }
  magicalThreatBagId(index: number): number { return this.view.getInt32(this.bagOffset('magical', index) + BATTLE_BAG_OFFSETS.id, littleEndian); }
  magicalThreatBagTickets(index: number): number { return this.view.getUint32(this.bagOffset('magical', index) + BATTLE_BAG_OFFSETS.tickets, littleEndian); }
}

export function decodeBattleProtocolOutput(bytes: Uint8Array): BattleProtocolOutput {
  const output = new BorrowedBattleProtocolOutputView(bytes);
  const events = Array.from({ length: output.eventCount }, (_, index): BattleProtocolEvent => {
    decodedEventObjectAllocations += 1;
    return {
      opcode: output.eventOpcode(index), phase: output.eventPhase(index), actorKind: output.eventActorKind(index),
      actorId: output.eventActorId(index), targetId: output.eventTargetId(index), abilityId: output.eventAbilityId(index),
      attackType: output.eventAttackType(index), flags: output.eventFlags(index), timing: output.eventTiming(index),
      hits: output.eventHits(index), attempts: output.eventAttempts(index), aux0: output.eventAux0(index),
      value0: output.eventValue0(index), value1: output.eventValue1(index), value2: output.eventValue2(index),
      aux1: output.eventAux1(index), aux2: output.eventAux2(index),
    };
  });

  const decodeBag = (kind: 'physical' | 'magical', count: number) => {
    return Array.from({ length: count }, (_, index) => {
      decodedBagEntryObjectAllocations += 1;
      return kind === 'physical'
        ? { id: output.physicalThreatBagId(index), tickets: output.physicalThreatBagTickets(index) }
        : { id: output.magicalThreatBagId(index), tickets: output.magicalThreatBagTickets(index) };
    });
  };

  return {
    flags: output.flags, outcome: output.outcome, partyHp: output.partyHp, enemyHp: output.enemyHp,
    randomConsumed: output.randomConsumed, enemyHitsReceived: output.enemyHitsReceived,
    events,
    physicalThreatBag: decodeBag('physical', output.physicalThreatBagCount),
    magicalThreatBag: decodeBag('magical', output.magicalThreatBagCount),
    byteLength: output.byteLength, seed: output.seed, rngVersion: output.rngVersion,
    diagnosticDrawCount: output.diagnosticDrawCount, protocolError: output.protocolError,
  };
}

export function getBattleProtocolTerrainName(id: number): string | null {
  return id === 0 ? null : BATTLE_TERRAIN_NAMES[id] ?? null;
}
