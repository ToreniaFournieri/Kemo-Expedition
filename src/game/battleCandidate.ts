import type {
  AbilityId,
  AttackType,
  BattleLogEntry,
  BattleOutcome,
  ElementalOffense,
  EnemyDef,
  GameBags,
  Party,
  TerrainEffectKey,
} from '../types/index.ts';
import {
  BATTLE_DEITY_IDS,
  BATTLE_ENGINE_FLAG_END_CHECKPOINT,
  BATTLE_ENGINE_FLAG_SEEDED_RNG,
} from './generated/battleProtocol.generated.ts';
import { computeCharacterStats } from './characterComputation.ts';
import { getAbilityName } from './characterComputation.ts';
import { computePartyStats } from './partyComputation.ts';
import type { ComputedPartyStatus } from './partyComputation.ts';
import { getDeityKey } from './deity.ts';
import { getBaseMultiplier } from './baseMultiplier.ts';
import { consumeBattleProtocolInput, executeBattleProtocol, executeBattleProtocolInput } from './battleKernel.ts';
import { getTerrainEffectGlossaryEntry } from '../data/glossary.ts';
import { t } from '../i18n/index.ts';
import { resolveMagicProfile } from './magic.ts';
import {
  formatDecomposeNote,
  formatRegenerationNote,
  getBattleFlavorTemplateAtIndex,
  type BattleFlavorFamily,
} from './battleNarration.ts';
import {
  encodeBattleProtocolInput,
  recordBattleResultBagEntryObjectAllocations,
  type BattleProtocolCombatant,
  type BattleProtocolEvent,
  type BattleProtocolInput,
  type BattleProtocolOutput,
} from './battleProtocol.ts';
import { requireBattleRngVersion, requireBattleSeed } from './battleReplay.ts';

type BattleEnvironment = {
  terrainEffect?: TerrainEffectKey | null;
  partyStatus?: ComputedPartyStatus;
};

export type BattleCandidateResult = {
  phase: 'combat';
  partyHp: number;
  enemyHp: number;
  log: BattleLogEntry[];
  outcome: BattleOutcome;
  updatedBags: {
    physicalThreatBag: { entries: Array<{ id: number; tickets: number }> };
    magicalThreatBag: { entries: Array<{ id: number; tickets: number }> };
  };
  enemyHitsReceived: number;
};

const deityProtocolKey = {
  'Goddess of Restoration': 'goddess_of_restoration',
  'God of Attrition': 'god_of_attrition',
  'God of Cunning': 'god_of_cunning',
  'God of Fortification': 'god_of_fortification',
  'Goddess of Fertility': 'goddess_of_fertility',
  'God of Resonance': 'god_of_resonance',
  'Goddess of Precision': 'goddess_of_precision',
  'God of Fate': 'god_of_fate',
  'God of Dusk': 'god_of_dusk',
  'Goddess of Mirage': 'goddess_of_mirage',
  'God of Oblivion': 'god_of_oblivion',
  'Goddess of Discord': 'goddess_of_discord',
} as const;

function magicStyleId(style: EnemyDef['magicStyle']): 0 | 1 | 2 | 3 | 4 {
  if (style === 'multi-hit') return 1;
  if (style === 'arc-magic') return 2;
  if (style === 'percentage_damage') return 3;
  if (style === 'debuff') return 4;
  return 0;
}

function projectedEnemyNoA(enemy: EnemyDef, attackType: 'ranged' | 'magical' | 'melee'): number {
  let value = attackType === 'ranged' ? enemy.rangedNoA : attackType === 'magical' ? enemy.magicalNoA : enemy.meleeNoA;
  if (enemy.abilities.some((ability) => ability.id === 'heavy_strike' && ability.level > 0)) value = Math.ceil(value / 2);
  if (attackType === 'magical' && enemy.magicStyle === undefined &&
      enemy.abilities.some((ability) => ability.id === 'arc_magic' && ability.level > 0)) value = Math.ceil(value / 3);
  return value;
}

// SpecRef: 6.1.8 | Universal C++ battle kernel | protocol v3 static numerical projection
export function projectBattleCombatants(
  party: Party,
  enemy: EnemyDef,
  partyHp: number,
  environment: BattleEnvironment = {},
): { combatants: BattleProtocolCombatant[]; partyMaxHp: number } {
  const { partyStats, characterStats } = environment.partyStatus ?? computePartyStats(party);
  const resonanceSuppressedByGehenna = getDeityKey(party.deity.name) === 'God of Resonance'
    && environment.terrainEffect === 'terrain.gehenna';
  const characters: BattleProtocolCombatant[] = characterStats.map((stats, index) => {
    const character = party.characters[index]!;
    const appliedBonusNames = new Set(stats.offenseCBonusNames);
    const uniqueBaseBonus = (kind: 'ranged' | 'magical' | 'melee'): number => {
      let total = 0;
      for (const item of character.equipment) {
        if (!item || (item.baseMultiplier ?? 1) === 1) continue;
        const relevant = kind === 'ranged' ? !!(item.rangedAttack || item.rangedNoA || item.rangedNoABonus)
          : kind === 'magical' ? !!(item.magicalAttack || item.magicalNoA || item.magicalNoABonus)
          : !!(item.meleeAttack || item.meleeNoA || item.meleeNoABonus);
        if (!relevant) continue;
        const percent = Math.round(((item.baseMultiplier ?? 1) - 1) * 1000) / 10;
        const name = `c.${kind}_attack+${percent}`;
        if (appliedBonusNames.has(name)) continue;
        appliedBonusNames.add(name);
        total += (item.baseMultiplier ?? 1) - 1;
      }
      return total;
    };
    const meleeBaseBonus = uniqueBaseBonus('melee');
    const rangedBaseBonus = uniqueBaseBonus('ranged');
    const magicalBaseBonus = uniqueBaseBonus('magical');
    const rangedBonus = stats.rangedAttackCBonus + rangedBaseBonus + stats.physicalAttackCBonus;
    const magicalBonus = stats.magicalAttackCBonus + magicalBaseBonus;
    const meleeBonus = stats.meleeAttackCBonus + meleeBaseBonus + stats.physicalAttackCBonus;
    const physicalScale = getBaseMultiplier(stats.baseStats.strength, 'attack');
    const magicalScale = getBaseMultiplier(stats.baseStats.intelligence, 'attack');
    const foldScale = (bonus: number, amplifier: number, deity: number, scale: number) =>
      ((((1 + bonus) * amplifier + deity) * scale - deity) / amplifier) - 1;
    const baseResonance = resonanceSuppressedByGehenna
      ? computeCharacterStats(party.characters[index]!, party.level, index + 1).abilities
        .find((ability) => ability.id === 'resonance')
      : null;
    const abilities = resonanceSuppressedByGehenna
      ? (baseResonance
        ? stats.abilities.map((ability) => ability.id === 'resonance' ? baseResonance : ability)
        : stats.abilities.filter((ability) => ability.id !== 'resonance'))
      : stats.abilities;
    return {
      id: stats.characterId,
      kind: 'character',
      row: stats.row,
      elementalOffense: stats.elementalOffense,
      flags: stats.hasAntagonism ? 1 : 0,
      hp: partyHp,
      maxHp: partyStats.hp,
      rangedAttack: stats.rangedAttack,
      magicalAttack: stats.magicalAttack,
      meleeAttack: stats.meleeAttack,
      rangedNoA: stats.rangedNoA,
      magicalNoA: stats.magicalNoA,
      meleeNoA: stats.meleeNoA,
      originalRangedNoA: stats.originalRangedNoA,
      originalMagicalNoA: stats.originalMagicalNoA,
      originalMeleeNoA: stats.originalMeleeNoA,
      physicalDefense: stats.physicalDefense,
      magicalDefense: stats.magicalDefense,
      rangedAccuracyPotency: stats.accuracyPotency,
      magicalAccuracyPotency: stats.accuracyPotency,
      meleeAccuracyPotency: stats.accuracyPotency,
      accuracyBonus: stats.accuracyBonus,
      evasionBonus: stats.evasionBonus,
      physicalPenetration: stats.penetMultiplier,
      magicalPenetration: stats.penetMultiplier,
      elementalOffenseValue: stats.elementalOffenseValue,
      fireResistance: stats.elementalDefenseMultipliers.fire,
      thunderResistance: stats.elementalDefenseMultipliers.thunder,
      iceResistance: stats.elementalDefenseMultipliers.ice,
      physicalOffenseAmplifier: stats.physicalOffenseMultiplier,
      magicalOffenseAmplifier: stats.magicalOffenseMultiplier,
      physicalDefenseAmplifier: stats.physicalDefenseAmplifier,
      magicalDefenseAmplifier: stats.magicalDefenseAmplifier,
      startPhaseBonus: 0,
      combatPhaseBonus: 0,
      endPhaseBonus: 0,
      deityOffenseBonus: stats.deityOffenseAmplifierBonus,
      deityPhysicalDefenseBonus: stats.deityDefenseAmplifierBonus.physical,
      deityMagicalDefenseBonus: stats.deityDefenseAmplifierBonus.magical,
      deityAccuracyBonus: 0,
      enemyRangedAmplifier: 1,
      enemyMagicalAmplifier: 1,
      enemyMeleeAmplifier: 1,
      rangedAttackBonus: foldScale(rangedBonus, stats.physicalOffenseMultiplier, stats.deityOffenseAmplifierBonus, physicalScale),
      magicalAttackBonus: foldScale(magicalBonus, stats.magicalOffenseMultiplier, stats.deityOffenseAmplifierBonus, magicalScale),
      meleeAttackBonus: foldScale(meleeBonus, stats.physicalOffenseMultiplier, stats.deityOffenseAmplifierBonus, physicalScale),
      magicStyle: 0,
      abilities: abilities.map(({ id, level }) => ({ id, level })),
    };
  });
  const projectedEnemy: BattleProtocolCombatant = {
    // Party and enemy save IDs occupy independent domains; reserve the high
    // wire bit so protocol ownership/event IDs remain globally unambiguous.
    id: 0x8000_0000 + enemy.id,
    kind: 'enemy',
    row: 0,
    elementalOffense: enemy.elementalOffense,
    flags: 0,
    hp: enemy.hp,
    maxHp: enemy.hp,
    rangedAttack: enemy.rangedAttack,
    magicalAttack: enemy.magicalAttack,
    meleeAttack: enemy.meleeAttack,
    rangedNoA: projectedEnemyNoA(enemy, 'ranged'),
    magicalNoA: projectedEnemyNoA(enemy, 'magical'),
    meleeNoA: projectedEnemyNoA(enemy, 'melee'),
    originalRangedNoA: enemy.rangedNoA,
    originalMagicalNoA: enemy.magicalNoA,
    originalMeleeNoA: enemy.meleeNoA,
    rangedAccuracyPotency: 1,
    magicalAccuracyPotency: 1,
    meleeAccuracyPotency: 1,
    physicalDefense: enemy.physicalDefense,
    magicalDefense: enemy.magicalDefense,
    accuracyBonus: enemy.accuracyBonus,
    evasionBonus: enemy.evasionBonus,
    physicalPenetration: 1,
    magicalPenetration: 1,
    elementalOffenseValue: enemy.elementalOffenseValue,
    fireResistance: enemy.elementalResistance.fire,
    thunderResistance: enemy.elementalResistance.thunder,
    iceResistance: enemy.elementalResistance.ice,
    physicalOffenseAmplifier: 1,
    magicalOffenseAmplifier: 1,
    physicalDefenseAmplifier: enemy.physicalDefenseAmplifier,
    magicalDefenseAmplifier: enemy.magicalDefenseAmplifier,
    startPhaseBonus: 0,
    combatPhaseBonus: 0,
    endPhaseBonus: 0,
    deityOffenseBonus: 0,
    deityPhysicalDefenseBonus: 1,
    deityMagicalDefenseBonus: 1,
    deityAccuracyBonus: 0,
    enemyRangedAmplifier: enemy.rangedAttackAmplifier,
    enemyMagicalAmplifier: enemy.magicalAttackAmplifier,
    enemyMeleeAmplifier: enemy.meleeAttackAmplifier,
    rangedAttackBonus: 0,
    magicalAttackBonus: 0,
    meleeAttackBonus: 0,
    magicStyle: magicStyleId(enemy.magicStyle),
    abilities: enemy.abilities.map(({ id, level }) => ({ id, level })),
  };
  return {
    partyMaxHp: partyStats.hp,
    // The frozen coordinator prepares enemy actions/START owners before party rows.
    combatants: [projectedEnemy, ...characters],
  };
}

export function projectBattleProtocolInput(
  party: Party,
  enemy: EnemyDef,
  bags: GameBags,
  randomValues: readonly number[],
  initialPartyHp?: number,
  environment: BattleEnvironment = {},
  engineFlags = 0,
): BattleProtocolInput {
  const partyHp = initialPartyHp ?? environment.partyStatus?.partyStats.hp ?? computePartyStats(party).partyStats.hp;
  const projection = projectBattleCombatants(party, enemy, partyHp, environment);
  const deityKey = getDeityKey(party.deity.name);
  const protocolDeityKey = deityKey && deityKey !== 'None' ? deityProtocolKey[deityKey] : null;
  return {
    flags: deityKey === 'Goddess of Fertility' ? 1 : 0,
    terrainEffect: environment.terrainEffect,
    partyHp,
    partyMaxHp: projection.partyMaxHp,
    enemyHp: enemy.hp,
    enemyMaxHp: enemy.hp,
    combatants: projection.combatants,
    randomValues,
    physicalThreatBag: bags.physicalThreatBag.entries,
    magicalThreatBag: bags.magicalThreatBag.entries,
    deityId: protocolDeityKey ? BATTLE_DEITY_IDS[protocolDeityKey] : 0,
    engineFlags,
  };
}

/** Encoded protocol-v3 execution used only by the retained tape diagnostic. */
function executeNativeBattleProtocol(input: BattleProtocolInput): BattleProtocolOutput {
  return executeBattleProtocol(encodeBattleProtocolInput(input));
}

type NarrationCombatant = {
  id: number;
  kind: 'character' | 'enemy';
  name: string;
  elementalOffense: ElementalOffense;
  elementalOffenseValue: number;
  magicStyle: EnemyDef['magicStyle'];
  physicalDefense: number;
  abilities: Map<AbilityId, number>;
};

const noteFormatter = new Intl.NumberFormat('ja-JP');
const FLAVOR_ABILITIES = new Set<AbilityId>([
  'illusion', 'illusion_breaker', 'shock', 'null_shock', 'corrode', 'null_corrode',
  'life_drain', 'null_life_drain', 'death_touch', 'null_death_touch', 'burn',
  'null_burn', 'bind', 'null_bind', 'resurrect', 'reanimate', 'requiem',
  'null_requiem', 'regeneration', 'decompose', 'self_destruct', 'soul_reap',
  'free', 'flying', 'pursuit', 'unforgettable', 'equation_breaker',
  'null_antagonism', 'rage',
]);
const CONFUSION_ABILITIES = new Set<AbilityId>([
  'ranged_confusion', 'magic_confusion', 'melee_confusion',
]);

function replaceFlavor(template: string, replacements: Record<string, string>): string {
  return Object.entries(replacements).reduce(
    (text, [key, value]) => text.replace(new RegExp(`\\{${key}\\}`, 'g'), value),
    template,
  );
}

function flavorFamily(abilityId: AbilityId): BattleFlavorFamily | null {
  const family = abilityId.replace(/_/g, '-') as BattleFlavorFamily;
  return FLAVOR_ABILITIES.has(abilityId) && abilityId !== 'rage' ? family : null;
}

type IndexedBattleProtocolOutput = Pick<BattleProtocolOutput,
  'flags' | 'outcome' | 'partyHp' | 'enemyHp' | 'randomConsumed' | 'enemyHitsReceived'
  | 'byteLength' | 'seed' | 'rngVersion' | 'diagnosticDrawCount' | 'protocolError'> & {
  eventCount: number;
  physicalThreatBagCount: number;
  magicalThreatBagCount: number;
  eventOpcode(index: number): BattleProtocolEvent['opcode'];
  eventPhase(index: number): number;
  eventActorKind(index: number): number;
  eventActorId(index: number): number;
  eventTargetId(index: number): number;
  eventAbilityId(index: number): AbilityId | null;
  eventAttackType(index: number): AttackType | null;
  eventFlags(index: number): number;
  eventTiming(index: number): number;
  eventHits(index: number): number;
  eventAttempts(index: number): number;
  eventAux0(index: number): number;
  eventValue0(index: number): number;
  eventValue1(index: number): number;
  eventValue2(index: number): number;
  eventAux1(index: number): number;
  eventAux2(index: number): number;
  physicalThreatBagId(index: number): number;
  physicalThreatBagTickets(index: number): number;
  magicalThreatBagId(index: number): number;
  magicalThreatBagTickets(index: number): number;
};

class OwnedBattleProtocolOutputIndex implements IndexedBattleProtocolOutput {
  constructor(private readonly output: BattleProtocolOutput) {}
  get flags() { return this.output.flags; }
  get outcome() { return this.output.outcome; }
  get partyHp() { return this.output.partyHp; }
  get enemyHp() { return this.output.enemyHp; }
  get randomConsumed() { return this.output.randomConsumed; }
  get enemyHitsReceived() { return this.output.enemyHitsReceived; }
  get byteLength() { return this.output.byteLength; }
  get seed() { return this.output.seed; }
  get rngVersion() { return this.output.rngVersion; }
  get diagnosticDrawCount() { return this.output.diagnosticDrawCount; }
  get protocolError() { return this.output.protocolError; }
  get eventCount() { return this.output.events.length; }
  get physicalThreatBagCount() { return this.output.physicalThreatBag.length; }
  get magicalThreatBagCount() { return this.output.magicalThreatBag.length; }
  eventOpcode(index: number) { return this.output.events[index]!.opcode; }
  eventPhase(index: number) { return this.output.events[index]!.phase; }
  eventActorKind(index: number) { return this.output.events[index]!.actorKind; }
  eventActorId(index: number) { return this.output.events[index]!.actorId; }
  eventTargetId(index: number) { return this.output.events[index]!.targetId; }
  eventAbilityId(index: number) { return this.output.events[index]!.abilityId; }
  eventAttackType(index: number) { return this.output.events[index]!.attackType; }
  eventFlags(index: number) { return this.output.events[index]!.flags; }
  eventTiming(index: number) { return this.output.events[index]!.timing; }
  eventHits(index: number) { return this.output.events[index]!.hits; }
  eventAttempts(index: number) { return this.output.events[index]!.attempts; }
  eventAux0(index: number) { return this.output.events[index]!.aux0; }
  eventValue0(index: number) { return this.output.events[index]!.value0; }
  eventValue1(index: number) { return this.output.events[index]!.value1; }
  eventValue2(index: number) { return this.output.events[index]!.value2; }
  eventAux1(index: number) { return this.output.events[index]!.aux1; }
  eventAux2(index: number) { return this.output.events[index]!.aux2; }
  physicalThreatBagId(index: number) { return this.output.physicalThreatBag[index]!.id; }
  physicalThreatBagTickets(index: number) { return this.output.physicalThreatBag[index]!.tickets; }
  magicalThreatBagId(index: number) { return this.output.magicalThreatBag[index]!.id; }
  magicalThreatBagTickets(index: number) { return this.output.magicalThreatBag[index]!.tickets; }
}

class BattleProtocolEventCursor implements BattleProtocolEvent {
  index = 0;
  constructor(private readonly output: IndexedBattleProtocolOutput) {}
  select(index: number): this { this.index = index; return this; }
  get opcode() { return this.output.eventOpcode(this.index); }
  get phase() { return this.output.eventPhase(this.index); }
  get actorKind() { return this.output.eventActorKind(this.index); }
  get actorId() { return this.output.eventActorId(this.index); }
  get targetId() { return this.output.eventTargetId(this.index); }
  get abilityId() { return this.output.eventAbilityId(this.index); }
  get attackType() { return this.output.eventAttackType(this.index); }
  get flags() { return this.output.eventFlags(this.index); }
  get timing() { return this.output.eventTiming(this.index); }
  get hits() { return this.output.eventHits(this.index); }
  get attempts() { return this.output.eventAttempts(this.index); }
  get aux0() { return this.output.eventAux0(this.index); }
  get value0() { return this.output.eventValue0(this.index); }
  get value1() { return this.output.eventValue1(this.index); }
  get value2() { return this.output.eventValue2(this.index); }
  get aux1() { return this.output.eventAux1(this.index); }
  get aux2() { return this.output.eventAux2(this.index); }
}

function eventIdentity(event: BattleProtocolEvent): string {
  return [event.phase, event.actorId, event.abilityId ?? '-', event.attackType ?? '-', event.timing].join(':');
}

function requireFlavorPairs(output: IndexedBattleProtocolOutput): Map<number, number> {
  const pairs = new Map<number, number>();
  const usedSources = new Set<number>();
  const flavor = new BattleProtocolEventCursor(output);
  const source = new BattleProtocolEventCursor(output);
  for (let index = 0; index < output.eventCount; index += 1) {
    flavor.select(index);
    if (flavor.opcode !== 'random_flavor') continue;
    const sourceIndex = index - 1;
    if (sourceIndex < 0 || source.select(sourceIndex).opcode === 'random_flavor' || usedSources.has(sourceIndex)) {
      throw new Error(`Misordered or duplicate battle flavor fact at event ${index}`);
    }
    if (eventIdentity(source) !== eventIdentity(flavor) || source.aux0 !== flavor.aux1) {
      throw new Error(`Battle flavor fact at event ${index} does not match its source event`);
    }
    usedSources.add(sourceIndex);
    pairs.set(sourceIndex, index);
  }
  for (const sourceIndex of pairs.keys()) {
    source.select(sourceIndex);
    if (!sourceRequiresFlavor(source)) {
      throw new Error(`Unexpected battle flavor fact for ${source.opcode}:${source.abilityId ?? 'terrain'}`);
    }
  }
  return pairs;
}

function sourceRequiresFlavor(event: BattleProtocolEvent): boolean {
  if (event.opcode === 'terrain_effect' && event.phase === 2) return true;
  if (event.opcode === 'target_selected' && event.phase === 2 && (event.flags & 8) !== 0) return true;
  if (event.opcode === 'action_skipped' && event.abilityId === 'bind') return true;
  if (event.opcode === 'ability_mutated' && event.aux0 === 13 && (event.flags & 4) !== 0) return true;
  if (event.opcode === 'ability_activated' && event.phase === 2
      && event.abilityId && (CONFUSION_ABILITIES.has(event.abilityId) || event.abilityId === 'unstable_core')) return true;
  if (!event.abilityId || !FLAVOR_ABILITIES.has(event.abilityId)) return false;
  return event.opcode === 'ability_activated' || event.opcode === 'status_applied'
    || event.opcode === 'status_removed' || event.opcode === 'nullified'
    || event.opcode === 'heal' || event.opcode === 'damage'
    || event.opcode === 'resurrected' || event.opcode === 'reanimated';
}

export function validateBattleSemanticFlavorFacts(events: readonly BattleProtocolEvent[]): void {
  const output = new OwnedBattleProtocolOutputIndex({
    flags: 0, outcome: 'unresolved', partyHp: 0, enemyHp: 0, randomConsumed: 0, enemyHitsReceived: 0,
    events: [...events], physicalThreatBag: [], magicalThreatBag: [], byteLength: 0, seed: 0n,
    rngVersion: 0, diagnosticDrawCount: 0, protocolError: 0,
  });
  const pairs = requireFlavorPairs(output);
  events.forEach((event, index) => {
    if (sourceRequiresFlavor(event) && !pairs.has(index)) {
      throw new Error(`Missing battle flavor fact for ${event.opcode}:${event.abilityId ?? 'terrain'}`);
    }
  });
}

type BattleNativeExecutionResult = {
  result: BattleCandidateResult;
  protocolOutput: BattleProtocolOutput;
  randomConsumed: number;
  diagnosticDrawCount: number;
  protocolError: number;
  eventCount: number;
};

export type SeededBattleCandidateResult = Omit<BattleNativeExecutionResult, 'protocolOutput'> & {
  seed: bigint;
  rngVersion: number;
};

// SpecRef: 6.1.8 | Universal C++ battle kernel | native tape diagnostic
export function executeBattleTapeDiagnostic(
  party: Party,
  enemy: EnemyDef,
  bags: GameBags,
  randomTape: readonly number[],
  initialPartyHp?: number,
  environment: BattleEnvironment = {},
): BattleNativeExecutionResult {
  const output = executeNativeBattleProtocol(projectBattleProtocolInput(
    party, enemy, bags, randomTape, initialPartyHp, environment, BATTLE_ENGINE_FLAG_END_CHECKPOINT,
  ));
  if (output.protocolError !== 0) {
    throw new Error(`C++ battle returned protocol error ${output.protocolError} after ${output.randomConsumed} supplied draws`);
  }
  if (output.randomConsumed !== output.diagnosticDrawCount) {
    throw new Error(`C++ battle cursor mismatch: ${output.randomConsumed}/${output.diagnosticDrawCount}`);
  }
  if (output.randomConsumed < 0 || output.randomConsumed > randomTape.length) {
    throw new Error(`C++ battle cursor ${output.randomConsumed} exceeds the ${randomTape.length}-value tape`);
  }
  const result = convertBattleSemanticEvents(output, party, enemy, initialPartyHp, environment);
  return {
    result,
    protocolOutput: output,
    randomConsumed: output.randomConsumed,
    diagnosticDrawCount: output.diagnosticDrawCount,
    protocolError: output.protocolError,
    eventCount: output.events.length,
  };
}

// SpecRef: 6.1.8 | Universal C++ battle kernel | authoritative native seeded execution
export function executeBattleCandidateFromSeed(
  party: Party,
  enemy: EnemyDef,
  bags: GameBags,
  seed: bigint,
  rngVersion: number,
  initialPartyHp?: number,
  environment: BattleEnvironment = {},
): SeededBattleCandidateResult {
  const normalizedSeed = requireBattleSeed(seed);
  requireBattleRngVersion(rngVersion);
  const input = projectBattleProtocolInput(
    party, enemy, bags, [], initialPartyHp, environment,
    BATTLE_ENGINE_FLAG_END_CHECKPOINT | BATTLE_ENGINE_FLAG_SEEDED_RNG,
  );
  input.seed = normalizedSeed;
  input.rngVersion = rngVersion;
  return consumeBattleProtocolInput(input, (output) => {
    if (output.protocolError !== 0) {
      throw new Error(`C++ seeded battle returned protocol error ${output.protocolError} after ${output.randomConsumed} draws`);
    }
    if (output.seed !== normalizedSeed || output.rngVersion !== rngVersion) {
      throw new Error(`C++ seeded battle replay metadata mismatch: ${output.seed}/${output.rngVersion}`);
    }
    if (output.randomConsumed !== output.diagnosticDrawCount) {
      throw new Error(`C++ seeded battle draw mismatch: ${output.randomConsumed}/${output.diagnosticDrawCount}`);
    }
    return {
      result: convertIndexedBattleSemanticEvents(output, party, enemy, initialPartyHp, environment),
      randomConsumed: output.randomConsumed,
      diagnosticDrawCount: output.diagnosticDrawCount,
      protocolError: output.protocolError,
      eventCount: output.eventCount,
      seed: output.seed,
      rngVersion: output.rngVersion,
    };
  });
}

/** Diagnostic-only seeded execution with fully owned protocol materialization. */
export function executeBattleCandidateDiagnosticFromSeed(
  party: Party,
  enemy: EnemyDef,
  bags: GameBags,
  seed: bigint,
  rngVersion: number,
  initialPartyHp?: number,
  environment: BattleEnvironment = {},
): BattleNativeExecutionResult & { seed: bigint; rngVersion: number } {
  const normalizedSeed = requireBattleSeed(seed);
  requireBattleRngVersion(rngVersion);
  const input = projectBattleProtocolInput(
    party, enemy, bags, [], initialPartyHp, environment,
    BATTLE_ENGINE_FLAG_END_CHECKPOINT | BATTLE_ENGINE_FLAG_SEEDED_RNG,
  );
  input.seed = normalizedSeed;
  input.rngVersion = rngVersion;
  const output = executeBattleProtocolInput(input);
  if (output.protocolError !== 0) {
    throw new Error(`C++ seeded battle returned protocol error ${output.protocolError} after ${output.randomConsumed} draws`);
  }
  if (output.seed !== normalizedSeed || output.rngVersion !== rngVersion) {
    throw new Error(`C++ seeded battle replay metadata mismatch: ${output.seed}/${output.rngVersion}`);
  }
  if (output.randomConsumed !== output.diagnosticDrawCount) {
    throw new Error(`C++ seeded battle draw mismatch: ${output.randomConsumed}/${output.diagnosticDrawCount}`);
  }
  return {
    result: convertBattleSemanticEvents(output, party, enemy, initialPartyHp, environment),
    protocolOutput: output,
    randomConsumed: output.randomConsumed,
    diagnosticDrawCount: output.diagnosticDrawCount,
    protocolError: output.protocolError,
    eventCount: output.events.length,
    seed: output.seed,
    rngVersion: output.rngVersion,
  };
}

function requireFlavor(
  pairs: ReadonlyMap<number, number>,
  sourceIndex: number,
  source: BattleProtocolEvent,
  flavor: BattleProtocolEventCursor,
): BattleProtocolEventCursor {
  const flavorIndex = pairs.get(sourceIndex);
  if (flavorIndex === undefined) throw new Error(`Missing battle flavor fact for ${source.opcode}:${source.abilityId ?? 'terrain'}`);
  return flavor.select(flavorIndex);
}

function magicStyleFor(combatant: NarrationCombatant): NonNullable<EnemyDef['magicStyle']> {
  if (combatant.magicStyle) return combatant.magicStyle;
  return (combatant.abilities.get('arc_magic') ?? 0) > 0 ? 'arc-magic' : 'multi-hit';
}

function spellName(combatant: NarrationCombatant, attempts: number): string {
  return resolveMagicProfile({
    style: magicStyleFor(combatant),
    elementalOffense: combatant.elementalOffense,
    elementalOffenseValue: combatant.elementalOffenseValue,
    magicalNoA: Math.max(1, attempts),
  }).spellName;
}

function initiativeKey(actorId: number, attackType: AttackType): string {
  return `${actorId}:${attackType}`;
}

function actionKey(event: BattleProtocolEvent): string {
  return `${event.actorId}:${event.timing}:${event.attackType}:${event.aux0}`;
}

function reverseActionKey(event: BattleProtocolEvent): string {
  return `${event.targetId}:${event.timing}:${event.attackType}:${event.aux0}`;
}

function attackTargetKey(event: BattleProtocolEvent): string {
  return `${event.actorId}:${event.targetId}:${event.timing}:${event.attackType}:${event.aux0}`;
}

function reverseAttackTargetKey(event: BattleProtocolEvent): string {
  return `${event.targetId}:${event.actorId}:${event.timing}:${event.attackType}:${event.aux0}`;
}

function abilityLabel(abilityId: AbilityId, level: number): string {
  return t('battle.abilityLabel', { name: getAbilityName(abilityId, level) });
}

function fractionMultiplier(value: number): string {
  for (let numerator = 2; numerator <= 6; numerator += 1) {
    if (Math.abs(value - numerator / 7) < 1e-6) return `x${numerator}/7`;
  }
  return `x${value}`;
}

function abilityLevel(combatant: NarrationCombatant | undefined, abilityId: AbilityId): number {
  return combatant?.abilities.get(abilityId) ?? 1;
}

function attackBonusText(facts: ReadonlyMap<number, number>): string {
  const notes: string[] = [];
  const resonance = facts.get(3);
  if (resonance !== undefined) notes.push(t('battleLog.note.resonanceBonus', { percent: resonance }));
  const echo = facts.get(4);
  if (echo !== undefined) notes.push(t('battle.note.echoDomain', { bonusPercent: echo }).replace(/^\(|\)$/g, ''));
  return notes.length > 0 ? `(${notes.map((note) => note.replace(/^\(|\)$/g, '')).join(', ')})` : '';
}

function presentationProperties(facts: ReadonlyMap<number, number>): Pick<BattleLogEntry,
  'rageBonusPercent' | 'momentumBonusPercent' | 'ambushMultiplier' | 'overwatchMultiplier'
  | 'executionMultiplier' | 'swarmActorPenaltyPercent' | 'swarmOpponentBonusPercent'> {
  return {
    ...(facts.has(1) ? { rageBonusPercent: facts.get(1)! } : {}),
    ...(facts.has(2) ? { momentumBonusPercent: facts.get(2)! } : {}),
    ...(facts.has(5) ? { ambushMultiplier: facts.get(5)! } : {}),
    ...(facts.has(6) ? { overwatchMultiplier: facts.get(6)! } : {}),
    ...(facts.has(7) ? { executionMultiplier: facts.get(7)! } : {}),
    ...(facts.has(8) ? { swarmActorPenaltyPercent: facts.get(8)! } : {}),
    ...(facts.has(9) ? { swarmOpponentBonusPercent: facts.get(9)! } : {}),
  };
}

/**
 * Reconstructs the canonical localized result from language-neutral native facts.
 * It never calls the numerical TypeScript battle coordinator or consumes random values.
 */
export function convertBattleSemanticEvents(
  output: BattleProtocolOutput,
  party: Party,
  enemy: EnemyDef,
  initialPartyHp?: number,
  environment: BattleEnvironment = {},
): BattleCandidateResult {
  return convertIndexedBattleSemanticEvents(
    new OwnedBattleProtocolOutputIndex(output), party, enemy, initialPartyHp, environment,
  );
}

function convertIndexedBattleSemanticEvents(
  output: IndexedBattleProtocolOutput,
  party: Party,
  enemy: EnemyDef,
  initialPartyHp?: number,
  environment: BattleEnvironment = {},
): BattleCandidateResult {
  const event = new BattleProtocolEventCursor(output);
  const flavorEvent = new BattleProtocolEventCursor(output);
  const associatedEvent = new BattleProtocolEventCursor(output);
  if (output.eventCount === 0 || event.select(0).opcode !== 'battle_started'
      || event.select(output.eventCount - 1).opcode !== 'battle_finished') {
    throw new Error('Battle semantic stream has invalid terminal ordering');
  }
  if (output.eventCount < 2 || event.select(output.eventCount - 2).opcode !== 'outcome' || output.outcome === 'unresolved') {
    throw new Error('Battle semantic stream is missing its final outcome');
  }
  const flavors = requireFlavorPairs(output);
  const projection = projectBattleCombatants(
    party,
    enemy,
    initialPartyHp ?? environment.partyStatus?.partyStats.hp ?? computePartyStats(party).partyStats.hp,
    environment,
  );
  const combatants = new Map<number, NarrationCombatant>();
  for (const projected of projection.combatants) {
    const character = projected.kind === 'character' ? party.characters.find((entry) => entry.id === projected.id) : null;
    combatants.set(projected.id, {
      id: projected.id,
      kind: projected.kind,
      name: character?.name ?? enemy.name,
      elementalOffense: projected.elementalOffense,
      elementalOffenseValue: projected.elementalOffenseValue,
      magicStyle: projected.kind === 'enemy' ? enemy.magicStyle : undefined,
      physicalDefense: projected.physicalDefense,
      abilities: new Map(projected.abilities.map((ability) => [ability.id, ability.level])),
    });
  }
  const nameOf = (id: number): string => combatants.get(id)?.name ?? t('battle.actor.ally');
  const log: BattleLogEntry[] = [];
  const initiatives = new Map<string, number>();
  const pendingAfterAttack = new Map<string, BattleLogEntry[]>();
  const negatedActionKeys = new Set<string>();
  const appendPending = (event: BattleProtocolEvent): void => {
    const key = actionKey(event);
    const pending = pendingAfterAttack.get(key);
    if (pending) {
      log.push(...pending);
      pendingAfterAttack.delete(key);
    }
  };
  const presentationByTarget = new Map<string, Array<Map<number, number>>>();
  const presentationByAction = new Map<string, Array<{
    facts: Map<number, number>;
    hits: number;
    attempts: number;
    eventIndex: number;
  }>>();
  for (let eventIndex = 0; eventIndex < output.eventCount; eventIndex += 1) {
    event.select(eventIndex);
    if (event.opcode === 'initiative' && event.attackType) {
      initiatives.set(initiativeKey(event.actorId, event.attackType), event.timing);
      continue;
    }
    if (event.opcode !== 'diagnostic' || (event.flags & 128) === 0) continue;
    if ((event.flags & 64) !== 0) {
      const key = actionKey(event);
      const occurrences = presentationByAction.get(key) ?? [];
      if ((event.flags & 32) !== 0) {
        occurrences.push({ facts: new Map<number, number>(), hits: event.hits, attempts: event.attempts, eventIndex });
      }
      const occurrence = occurrences[occurrences.length - 1];
      if (!occurrence) throw new Error(`Native action presentation continuation is missing its start for ${key}`);
      if (occurrence.hits !== event.hits || occurrence.attempts !== event.attempts) {
        throw new Error(`Native action presentation totals drifted within ${key}`);
      }
      let populatedGroups = 0;
      for (let group = 0; group < 3; group += 1) {
        if ((event.aux1 & (0b111 << (group * 3))) !== 0) populatedGroups += 1;
      }
      if ((event.aux1 !== 0 && populatedGroups !== 1) || (event.aux1 & ~0x1ff) !== 0) {
        throw new Error(`Invalid native action presentation mask ${event.aux1} for ${key}`);
      }
      for (let kind = 1; kind <= 9; kind += 1) {
        if ((event.aux1 & (1 << (kind - 1))) === 0) continue;
        if (occurrence.facts.has(kind)) throw new Error(`Duplicate native action presentation fact ${kind} for ${key}`);
        const slot = (kind - 1) % 3;
        occurrence.facts.set(kind, slot === 0 ? event.value0 : slot === 1 ? event.value1 : event.value2);
      }
      presentationByAction.set(key, occurrences);
      continue;
    }
    const key = attackTargetKey(event);
    const occurrences = presentationByTarget.get(key) ?? [new Map<number, number>()];
    let facts = occurrences[occurrences.length - 1]!;
    let group = -1;
    let populatedGroups = 0;
    for (let candidateGroup = 0; candidateGroup < 3; candidateGroup += 1) {
      if ((event.aux1 & (0b111 << (candidateGroup * 3))) === 0) continue;
      group = candidateGroup;
      populatedGroups += 1;
    }
    if (populatedGroups !== 1 || (event.aux1 & ~0x1ff) !== 0) {
      throw new Error(`Invalid native presentation mask ${event.aux1} for ${key}`);
    }
    let duplicate = false;
    for (let slot = 0; slot < 3; slot += 1) {
      const kind = group * 3 + slot + 1;
      if ((event.aux1 & (1 << (kind - 1))) !== 0 && facts.has(kind)) duplicate = true;
    }
    if (duplicate) {
      facts = new Map<number, number>();
      occurrences.push(facts);
    }
    for (let slot = 0; slot < 3; slot += 1) {
      const kind = group * 3 + slot + 1;
      if ((event.aux1 & (1 << (kind - 1))) === 0) continue;
      facts.set(kind, slot === 0 ? event.value0 : slot === 1 ? event.value1 : event.value2);
    }
    presentationByTarget.set(key, occurrences);
  }
  const presentationOccurrence = new Map<string, number>();
  const actionPresentationOccurrence = new Map<string, number>();

  for (let index = 0; index < output.eventCount; index += 1) {
    event.select(index);
    if (event.opcode === 'random_flavor' || event.opcode === 'battle_started' || event.opcode === 'battle_finished'
        || event.opcode === 'phase_started' || event.opcode === 'phase_ended' || event.opcode === 'initiative'
        || event.opcode === 'death' || event.opcode === 'outcome') continue;

    if (event.opcode === 'target_selected') {
      if ((event.flags & 8) === 0) continue;
      const flavor = requireFlavor(flavors, index, event, flavorEvent);
      if (environment.terrainEffect !== 'terrain.chain-lightning') {
        throw new Error('Flavored terrain target selection is missing Chain Lightning context');
      }
      if (flavor.aux0 < 0 || flavor.aux0 >= 10) throw new RangeError(`Invalid terrain flavor index ${flavor.aux0}`);
      const damage = index + 2 < output.eventCount ? associatedEvent.select(index + 2) : null;
      if (!damage || damage.opcode !== 'damage' || eventIdentity(damage) !== eventIdentity(event)
          || damage.targetId !== event.targetId) {
        throw new Error('Chain Lightning flavor fact is missing its associated damage');
      }
      const actor = combatants.get(event.actorId);
      const target = combatants.get(event.targetId);
      const characterId = actor?.kind === 'character' ? actor.id : target?.kind === 'character' ? target.id : null;
      log.push({
        phase: 'combat', actor: 'effect', effectKind: 'terrain',
        ...(characterId !== null ? { characterId } : {}),
        action: t(`battleFlavor.environment.chainLightning.${flavor.aux0 + 1}`, { target: nameOf(event.targetId) }),
        note: `(⚡ ${noteFormatter.format(damage.value0)})`, elementalOffense: 'thunder',
        attackType: event.attackType ?? undefined,
      });
      continue;
    }

    if (event.opcode === 'terrain_effect' && event.phase === 1) {
      const terrain = environment.terrainEffect;
      if (!terrain) throw new Error('Native START terrain fact has no narration context');
      const glossary = getTerrainEffectGlossaryEntry(terrain);
      const labelKey = `terrainEffect.${terrain}.label`;
      const descriptionKey = `terrainEffect.${terrain}.description`;
      const label = t(labelKey);
      const description = t(descriptionKey);
      log.push({
        phase: 'start', actor: 'effect', effectKind: 'terrain',
        action: label === labelKey ? glossary?.label ?? terrain : label,
        note: `(${description === descriptionKey ? glossary?.description ?? '' : description})`, noteTone: 'muted',
      });
      continue;
    }

    if (event.opcode === 'ability_mutated' && event.phase === 1) {
      if (!event.abilityId) throw new Error('Ability mutation is missing its ability ID');
      const actor = combatants.get(event.actorId);
      const target = combatants.get(event.targetId);
      if (event.aux0 === 13 && (event.flags & 4) !== 0) {
        const flavor = requireFlavor(flavors, index, event, flavorEvent);
        const terrain = environment.terrainEffect;
        if (!terrain) throw new Error('Terrain mutation is missing terrain context');
        const prefix = terrain === 'terrain.deletion' ? 'battleFlavor.environment.deletion' : `battleFlavor.environment.${terrain.slice(8)}`;
        if (flavor.aux0 < 0 || flavor.aux0 >= 10) throw new RangeError(`Invalid terrain flavor index ${flavor.aux0}`);
        log.push({
          phase: 'start', actor: 'effect', effectKind: 'terrain',
          ...(target?.kind === 'character' ? { characterId: target.id } : {}),
          action: t(`${prefix}.${flavor.aux0 + 1}`, { target: target?.name ?? nameOf(event.targetId), ability: getAbilityName(event.abilityId, event.value0) }),
        });
      } else if ((event.flags & 4) !== 0) {
        const action = event.timing === 9
          ? t('battle.action.oblivionForget', { owner: actor?.name ?? nameOf(event.actorId), target: target?.name ?? nameOf(event.targetId), ability: abilityLabel(event.abilityId, event.value0) })
          : t('battle.action.fadingMemoryForget', { owner: actor?.name ?? nameOf(event.actorId), target: target?.name ?? nameOf(event.targetId), ability: abilityLabel(event.abilityId, event.value0) });
        log.push({ phase: 'start', actor: 'effect', ...(event.timing !== 9 && target?.kind === 'character' ? { characterId: target.id } : {}), action });
      } else if ((event.flags & 2) !== 0) {
        log.push({
          phase: 'start', actor: 'effect',
          action: t('battle.action.mimic', { owner: actor?.name ?? nameOf(event.actorId), target: target?.name ?? nameOf(event.targetId), ability: abilityLabel(event.abilityId, event.value1) }),
        });
      }
      if (target) {
        if (event.value1 > 0) target.abilities.set(event.abilityId, event.value1);
        else target.abilities.delete(event.abilityId);
      }
      continue;
    }

    if (event.opcode === 'ability_activated' && event.phase === 1 && event.abilityId) {
      const owner = nameOf(event.actorId);
      const level = Math.max(1, Math.round(event.value0));
      if (event.abilityId === 'unforgettable') {
        const flavor = requireFlavor(flavors, index, event, flavorEvent);
        const terrainLabelKey = 'terrainEffect.terrain.deletion.label';
        const terrainLabel = t(terrainLabelKey);
        const source = event.aux0 === 13
          ? (terrainLabel === terrainLabelKey ? getTerrainEffectGlossaryEntry('terrain.deletion')?.label ?? 'terrain.deletion' : terrainLabel)
          : owner;
        log.push({
          phase: 'start', actor: 'effect',
          ...(combatants.get(event.targetId)?.kind === 'character' ? { characterId: event.targetId } : {}),
          action: replaceFlavor(getBattleFlavorTemplateAtIndex('unforgettable', flavor.aux0), { actor: source, target: nameOf(event.targetId) }),
          note: t('battle.note.unforgettable'), noteTone: 'muted',
        });
      } else if (event.abilityId === 'equation_breaker') {
        const flavor = requireFlavor(flavors, index, event, flavorEvent);
        log.push({
          phase: 'start', actor: 'effect',
          ...(combatants.get(event.actorId)?.kind === 'character' ? { characterId: event.actorId } : {}),
          action: replaceFlavor(getBattleFlavorTemplateAtIndex('equation-breaker', flavor.aux0), { actor: owner }),
          note: t('battle.note.equationBreakerSilence'),
        });
      } else if (event.abilityId === 'null_antagonism') {
        const flavor = requireFlavor(flavors, index, event, flavorEvent);
        log.push({
          phase: 'start', actor: 'effect',
          ...(combatants.get(event.targetId)?.kind === 'character' ? { characterId: event.targetId } : {}),
          action: replaceFlavor(getBattleFlavorTemplateAtIndex('null-antagonism', flavor.aux0), { actor: nameOf(event.targetId) }),
          note: t('battle.note.nullAntagonism'),
        });
      } else if (event.abilityId === 'defender' || event.abilityId === 'command' || event.abilityId === 'm_barrier') {
        const multiplier = event.abilityId === 'command' ? (level >= 3 ? '1.6' : level === 2 ? '1.5' : '1.4')
          : (level >= 3 ? '1/2' : level === 2 ? '3/5' : '2/3');
        const noteKey = event.abilityId === 'command' ? 'battle.note.backlinePhysicalDamageDealtMultiplier'
          : event.abilityId === 'm_barrier' ? 'battle.note.backlineMagicDamageMultiplier' : 'battle.note.backlinePhysicalDamageMultiplier';
        log.push({ phase: 'start', actor: 'effect', action: t('battle.action.ownerAbility', { owner, ability: t(`ability.${event.abilityId}.label`) }), note: t(noteKey, { multiplier }) });
      } else if (event.abilityId === 'magic_seal') {
        log.push({ phase: 'start', actor: 'effect', action: t('battle.magicSeal.startAction', { ownerName: owner }), note: t('battle.magicSeal.startNote') });
      } else if (event.abilityId.startsWith('mutual_')) {
        const multipliers: Record<AbilityId, number[]> = {
          mutual_physical_amplify: [1.3, 1.5, 1.6, 1.65, 1.68], mutual_physical_restraint: [0.77, 0.67, 0.63, 0.61, 0.59],
          mutual_magic_amplify: [1.3, 1.5, 1.6, 1.65, 1.68], mutual_magic_restraint: [0.77, 0.67, 0.63, 0.61, 0.59],
        } as Partial<Record<AbilityId, number[]>> as Record<AbilityId, number[]>;
        const effect = event.abilityId.includes('magic') ? t('battle.effect.bothMagicDamage') : t('battle.effect.bothPhysicalDamage');
        log.push({ phase: 'start', actor: 'effect', action: t('battle.action.ownerAbility', { owner, ability: t(`ability.${event.abilityId}.label`) }), note: t('battle.note.effectMultiplier', { effect, multiplier: multipliers[event.abilityId]![level - 1] }) });
      }
      continue;
    }

    if (event.opcode === 'ability_activated' && event.phase === 2 && event.abilityId === 'howl') {
      const numerator = Math.round(event.value0 * 7);
      log.push({ phase: 'combat', initiativeRoll: event.timing, actor: 'triggered', ...(combatants.get(event.actorId)?.kind === 'character' ? { characterId: event.actorId } : {}), action: t('battle.action.howl', { actor: nameOf(event.actorId) }), note: t('battle.note.howl', { numerator }), attackType: event.attackType ?? undefined });
      continue;
    }

    if (event.opcode === 'ability_activated' && event.phase === 2
        && event.abilityId && CONFUSION_ABILITIES.has(event.abilityId)) {
      const flavor = requireFlavor(flavors, index, event, flavorEvent);
      const actor = combatants.get(event.actorId);
      const actorName = nameOf(event.actorId);
      const level = actor?.abilities.get(event.abilityId) ?? 1;
      const character = actor?.kind === 'character' ? { characterId: event.actorId } : {};
      if (event.targetId === 0) {
        log.push({
          phase: 'combat', initiativeRoll: event.timing, actor: 'triggered', ...character,
          action: `${actorName}${getBattleFlavorTemplateAtIndex('confusion-no-target', flavor.aux0)}`,
          note: t('battleFlavor.inline.42'), attackType: event.attackType ?? undefined,
        });
      } else {
        const success = event.value0 > 0;
        const chance = level >= 5 ? 7 : level === 4 ? 5 : level >= 2 ? 3 : 1;
        const family: BattleFlavorFamily = success ? 'confusion-success' : 'confusion-failure';
        const targetName = nameOf(event.targetId);
        const template = getBattleFlavorTemplateAtIndex(family, flavor.aux0);
        const resolved = replaceFlavor(template, { actor: actorName, target: targetName }).split('target').join(targetName);
        const action = template.includes('{actor}') ? resolved : `${actorName}${resolved}`;
        log.push({
          phase: 'combat', initiativeRoll: event.timing, actor: 'triggered', ...character, action,
          note: t('battle.note.confusion', { chance, result: t(success ? 'battle.result.success' : 'battle.result.failure') }),
          attackType: event.attackType ?? undefined,
        });
      }
      continue;
    }

    if (event.opcode === 'ability_activated' && event.phase === 2 && event.abilityId === 'null_antagonism') {
      const flavor = requireFlavor(flavors, index, event, flavorEvent);
      const actor = combatants.get(event.actorId);
      log.push({
        phase: 'combat', initiativeRoll: event.timing, actor: 'triggered',
        ...(actor?.kind === 'character' ? { characterId: event.actorId } : {}),
        action: replaceFlavor(getBattleFlavorTemplateAtIndex('null-antagonism', flavor.aux0), { actor: nameOf(event.targetId) }),
        note: t('battle.note.nullAntagonism'), attackType: event.attackType ?? undefined,
      });
      continue;
    }

    if (event.opcode === 'ability_activated' && event.phase === 2 && event.abilityId === 'unstable_core') {
      const flavor = requireFlavor(flavors, index, event, flavorEvent);
      const actor = combatants.get(event.actorId);
      const level = actor?.abilities.get('unstable_core') ?? 1;
      const percent = level >= 5 ? 12 : level === 4 ? 15 : level === 3 ? 19 : level === 2 ? 24 : 30;
      const family: BattleFlavorFamily = event.attackType === 'magical' ? 'unstable-core-magical' : 'unstable-core-ranged';
      log.push({
        phase: 'combat', initiativeRoll: event.timing, actor: 'triggered',
        ...(actor?.kind === 'character' ? { characterId: event.actorId } : {}),
        action: replaceFlavor(getBattleFlavorTemplateAtIndex(family, flavor.aux0), { actor: nameOf(event.actorId) }),
        note: t('battle.note.unstableCore', { percent }), noteTone: 'muted', damage: event.value0,
        attackType: event.attackType ?? undefined,
      });
      continue;
    }

    if (event.opcode === 'ability_activated' && event.phase === 2 && event.abilityId
        && ['regeneration', 'flying', 'decompose', 'self_destruct', 'soul_reap', 'free', 'pursuit'].includes(event.abilityId)) {
      const flavor = requireFlavor(flavors, index, event, flavorEvent);
      const family = flavorFamily(event.abilityId);
      if (!family) throw new Error(`Missing flavor family for ${event.abilityId}`);
      const actor = combatants.get(event.actorId);
      const target = combatants.get(event.targetId);
      const action = replaceFlavor(getBattleFlavorTemplateAtIndex(family, flavor.aux0), {
        actor: nameOf(event.actorId), target: nameOf(event.targetId),
      });
      let note: string | undefined;
      let noteTone: 'muted' | undefined;
      if (event.abilityId === 'regeneration') note = formatRegenerationNote(event.value0);
      else if (event.abilityId === 'flying') note = t('battle.note.flying', { evasion: Math.round(event.value0 * 100) });
      else if (event.abilityId === 'decompose' && target) {
        note = formatDecomposeNote(target.name, target.physicalDefense, event.value0);
        noteTone = 'muted';
        target.physicalDefense = event.value0;
      } else if (event.abilityId === 'soul_reap') {
        const thresholds = [10, 14, 17, 19, 20];
        note = t('battle.note.soulReap', { percent: thresholds[Math.min(5, Math.max(1, abilityLevel(actor, 'soul_reap'))) - 1] });
      }
      log.push({
        phase: 'combat', initiativeRoll: event.timing, actor: 'triggered',
        ...(actor?.kind === 'character' ? { characterId: actor.id } : {}), action,
        ...(note ? { note } : {}), ...(noteTone ? { noteTone } : {}),
        ...(event.abilityId === 'self_destruct' && event.value0 > 0 ? {
          damage: event.value0,
          damageTarget: target?.kind === 'character' ? 'party' as const : 'enemy' as const,
        } : {}),
        attackType: event.attackType ?? undefined,
      });
      continue;
    }

    if ((event.opcode === 'nullified' && event.abilityId === 'illusion')
        || (event.opcode === 'ability_activated' && event.abilityId === 'illusion_breaker')) {
      const flavor = requireFlavor(flavors, index, event, flavorEvent);
      const broken = event.abilityId === 'illusion_breaker';
      const action = replaceFlavor(getBattleFlavorTemplateAtIndex(broken ? 'illusion-breaker' : 'illusion', flavor.aux0), {
        actor: nameOf(event.actorId), target: nameOf(event.actorId),
      });
      const key = broken ? actionKey(event) : reverseActionKey(event);
      if (!broken) negatedActionKeys.add(reverseAttackTargetKey(event));
      pendingAfterAttack.set(key, [...(pendingAfterAttack.get(key) ?? []), { phase: 'combat', actor: 'effect', action, attackType: event.attackType ?? undefined }]);
      continue;
    }

    if (event.opcode === 'nullified' && event.abilityId === 'stealth') {
      const key = reverseActionKey(event);
      negatedActionKeys.add(reverseAttackTargetKey(event));
      const action = combatants.get(event.actorId)?.kind === 'enemy'
        ? t('battle.action.enemyStealthAvoided', { enemy: nameOf(event.actorId) })
        : t('battle.action.stealthAvoided', { actor: nameOf(event.actorId) });
      pendingAfterAttack.set(key, [...(pendingAfterAttack.get(key) ?? []), { phase: 'combat', actor: 'effect', action, attackType: event.attackType ?? undefined }]);
      continue;
    }

    if ((event.opcode === 'status_applied' || event.opcode === 'nullified') && (event.abilityId === 'shock' || event.abilityId === 'null_shock')) {
      const flavor = requireFlavor(flavors, index, event, flavorEvent);
      const family = event.abilityId === 'shock' ? 'shock' : 'null-shock';
      const action = replaceFlavor(getBattleFlavorTemplateAtIndex(family, flavor.aux0), { actor: nameOf(event.targetId), target: nameOf(event.actorId) });
      const key = reverseActionKey(event);
      pendingAfterAttack.set(key, [...(pendingAfterAttack.get(key) ?? []), {
        phase: 'combat', initiativeRoll: event.timing, actor: 'triggered',
        action, note: t(event.abilityId === 'shock' ? 'battle.note.shockInterrupted' : 'battle.note.nullShockContinue'),
        noteTone: 'muted', hideInitiativeLabel: true, attackType: event.attackType ?? undefined,
      }]);
      continue;
    }

    if (event.opcode === 'nullified' && event.abilityId === 'magic_seal' && event.attackType) {
      if (event.attempts <= 0) throw new Error('Magic Seal fact is missing its attack-attempt count');
      const actor = combatants.get(event.targetId);
      if (!actor) throw new Error('Magic Seal attack references a missing actor');
      const attack = spellName(actor, event.attempts);
      log.push({
        phase: 'combat', initiativeRoll: initiatives.get(initiativeKey(actor.id, event.attackType)) ?? event.timing,
        actor: actor.kind === 'enemy' ? 'enemy' : 'character', ...(actor.kind === 'character' ? { characterId: actor.id } : {}),
        action: actor.kind === 'enemy' ? t('battleLog.action.enemySpellNegated', { enemy: actor.name, attack }) : t('battleLog.action.characterSpellNegated', { actor: actor.name, attack }),
        damage: 0, showZeroDamage: true, hits: 0, totalAttempts: event.attempts, wasNegated: true,
        elementalOffense: actor.elementalOffense, attackType: event.attackType,
      });
      continue;
    }

    if ((event.opcode === 'resurrected' || event.opcode === 'reanimated') && event.abilityId) {
      const flavor = requireFlavor(flavors, index, event, flavorEvent);
      const family = event.opcode === 'resurrected' ? 'resurrect' : 'reanimate';
      log.push({
        phase: 'combat', initiativeRoll: event.timing,
        actor: combatants.get(event.actorId)?.kind === 'enemy' ? 'enemy' : 'character',
        ...(combatants.get(event.actorId)?.kind === 'character' ? { characterId: event.actorId } : {}),
        action: replaceFlavor(getBattleFlavorTemplateAtIndex(family, flavor.aux0), { actor: nameOf(event.actorId) }),
        note: `(${t(`ability.${event.abilityId}.label`)} ✚${noteFormatter.format(event.value0)})`,
        noteTone: 'muted', hideInitiativeLabel: true, attackType: event.attackType ?? undefined,
      });
      continue;
    }

    if (event.opcode === 'heal' && event.abilityId === 'life_drain') {
      const flavor = requireFlavor(flavors, index, event, flavorEvent);
      const level = combatants.get(event.actorId)?.abilities.get('life_drain') ?? 1;
      const portion = ['0.1%', '0.3%', '1%', '3%', '10%', '30%', '100%'][Math.min(7, Math.max(1, level)) - 1]!;
      const targetId = flavor.targetId;
      log.push({
        phase: 'combat', initiativeRoll: event.timing, actor: 'triggered',
        ...(combatants.get(event.actorId)?.kind === 'character' ? { characterId: event.actorId } : {}),
        effectKind: 'life_drain', effectSourceName: nameOf(event.actorId), effectTargetName: nameOf(targetId), effectHealAmount: event.value0,
        action: replaceFlavor(getBattleFlavorTemplateAtIndex('life-drain', flavor.aux0), { actor: nameOf(event.actorId), target: nameOf(targetId) }),
        note: t('battle.note.lifeDrain', { portion, healAmount: event.value0 }), noteTone: 'muted', attackType: event.attackType ?? undefined,
      });
      continue;
    }

    if (flavors.has(index) && event.opcode !== 'action_skipped' && event.abilityId && ['corrode', 'null_corrode', 'null_life_drain', 'death_touch', 'null_death_touch',
      'burn', 'null_burn', 'bind', 'null_bind', 'requiem', 'null_requiem'].includes(event.abilityId)) {
      const flavor = requireFlavor(flavors, index, event, flavorEvent);
      const family = flavorFamily(event.abilityId);
      if (!family) throw new Error(`Missing flavor family for ${event.abilityId}`);
      const actor = combatants.get(event.actorId);
      const target = combatants.get(event.targetId);
      const burn = event.abilityId === 'burn';
      const action = replaceFlavor(getBattleFlavorTemplateAtIndex(family, flavor.aux0), {
        actor: burn ? nameOf(event.targetId) : nameOf(event.actorId),
        target: nameOf(event.targetId),
      });
      let note: string | undefined;
      if (event.abilityId === 'corrode') note = t('battle.note.corrode', { multiplier: fractionMultiplier(event.value0) });
      else if (event.abilityId === 'null_corrode') note = t('battle.note.nullCorrode');
      else if (event.abilityId === 'null_life_drain') note = t('battle.note.nullLifeDrain');
      else if (event.abilityId === 'death_touch') {
        const numerators = [2, 3, 4, 5, 6];
        const level = Math.min(5, Math.max(1, abilityLevel(actor, 'death_touch')));
        note = t('battle.note.deathTouch', { probabilityNumerator: Math.min(256, event.hits * numerators[level - 1]!) });
      } else if (event.abilityId === 'null_death_touch') note = t('battle.note.nullDeathTouch');
      else if (event.abilityId === 'burn') note = t('battle.note.burn');
      else if (event.abilityId === 'null_burn') note = t('battle.note.nullBurn');
      else if (event.abilityId === 'bind') note = t('battle.note.bindIncapacitated');
      else if (event.abilityId === 'null_bind') note = t('battle.note.nullBind');
      const inlineRequiem = event.abilityId === 'requiem' || event.abilityId === 'null_requiem';
      const affectedCharacterId = actor?.kind === 'character' ? actor.id
        : (event.abilityId === 'burn' || event.abilityId === 'null_burn' || event.abilityId === 'bind' || event.abilityId === 'null_bind')
          && target?.kind === 'character' ? target.id : null;
      log.push({
        phase: 'combat', initiativeRoll: event.timing, actor: inlineRequiem
          ? (actor?.kind === 'enemy' ? 'enemy' : 'character') : 'triggered',
        ...(affectedCharacterId !== null ? { characterId: affectedCharacterId } : {}),
        action: inlineRequiem
          ? `${action} ${t(event.abilityId === 'requiem' ? 'battle.note.requiemInline' : 'battle.note.nullRequiemInline')}`
          : action,
        ...(note ? { note, noteTone: 'muted' as const } : {}),
        ...(event.abilityId === 'burn' && event.value0 > 0 ? {
          damage: event.value0, damageTarget: target?.kind === 'character' ? 'party' as const : 'enemy' as const,
          elementalOffense: 'fire' as const,
        } : {}),
        hideInitiativeLabel: !inlineRequiem, attackType: event.attackType ?? undefined,
      });
      continue;
    }

    if (event.opcode === 'action_skipped' && event.abilityId === 'bind') {
      const flavor = requireFlavor(flavors, index, event, flavorEvent);
      const actor = combatants.get(event.actorId);
      log.push({
        phase: 'combat', initiativeRoll: event.timing, actor: 'triggered',
        ...(actor?.kind === 'character' ? { characterId: actor.id } : {}),
        action: replaceFlavor(getBattleFlavorTemplateAtIndex('incapacitated', flavor.aux0), { actor: nameOf(event.actorId) }),
        attackType: event.attackType ?? undefined,
      });
      continue;
    }

    if (event.opcode === 'terrain_effect' && event.phase === 2) {
      const flavor = requireFlavor(flavors, index, event, flavorEvent);
      if (flavor.aux0 < 0 || flavor.aux0 >= 10) throw new RangeError(`Invalid terrain flavor index ${flavor.aux0}`);
      const terrain = environment.terrainEffect;
      if (!terrain) throw new Error('Combat terrain event is missing terrain context');
      const prefixes: Partial<Record<TerrainEffectKey, string>> = {
        'terrain.vine-snare': 'vineSnare', 'terrain.crystal-zone': 'crystalZone', 'terrain.conduction': 'conduction',
        'terrain.mana-burn': 'manaBurn', 'terrain.sacred-judgement': 'sacredJudgement', 'terrain.chain-lightning': 'chainLightning',
      };
      const prefix = prefixes[terrain];
      if (!prefix) throw new Error(`Unsupported narrated terrain event ${terrain}`);
      const action = t(`battleFlavor.environment.${prefix}.${flavor.aux0 + 1}`, { actor: nameOf(event.actorId), target: nameOf(event.targetId) });
      const thunder = terrain === 'terrain.conduction' || terrain === 'terrain.sacred-judgement' || terrain === 'terrain.chain-lightning';
      log.push({ phase: 'combat', actor: 'effect', effectKind: 'terrain', ...(combatants.get(event.actorId)?.kind === 'character' ? { characterId: event.actorId } : {}), action, note: thunder ? t('battle.note.hpLossThunderTemplate').replace('{damage}', noteFormatter.format(event.value0)) : t('battle.note.hpLossTemplate').replace('{damage}', noteFormatter.format(event.value0)), ...(thunder ? { elementalOffense: 'thunder' as const } : {}), attackType: event.attackType ?? undefined });
      continue;
    }

    if (event.opcode === 'attack' && event.attackType) {
      if (event.attempts <= 0) continue;
      const actor = combatants.get(event.actorId);
      const target = combatants.get(event.targetId);
      if (!actor) throw new Error(`Attack event references missing actor ${event.actorId}`);
      const specialAttack = event.abilityId === 'gravity_well' || event.abilityId === 'armor_break' || event.abilityId === 'mana_break'
        ? event.abilityId : null;
      if (specialAttack) {
        const specialName = resolveMagicProfile({
          style: specialAttack === 'gravity_well' ? 'percentage_damage' : 'debuff',
          specialMagic: specialAttack,
          elementalOffense: actor.elementalOffense,
          elementalOffenseValue: actor.elementalOffenseValue,
          magicalNoA: Math.max(1, event.attempts),
        }).spellName;
        const isReAttack = event.aux0 === 3;
        const attackName = `${specialName}${isReAttack ? t('battleLog.action.reAttackSuffix') : ''}`;
        const appliedDamage = event.value0;
        log.push({
          phase: 'combat',
          initiativeRoll: initiatives.get(initiativeKey(actor.id, event.attackType)) ?? event.timing,
          actor: actor.kind === 'enemy' ? 'enemy' : 'character',
          ...(actor.kind === 'character' ? { characterId: actor.id } : {}),
          action: actor.kind === 'enemy'
            ? t('battleLog.action.enemySpellCast', { attack: attackName })
            : t('battleLog.action.characterSpellCast', { actor: actor.name, attack: attackName }),
          damage: appliedDamage,
          ...(actor.kind === 'character' ? { damageTarget: target?.kind === 'character' ? 'party' as const : 'enemy' as const } : {}),
          ...(specialAttack === 'gravity_well' && appliedDamage === 0 ? { showZeroDamage: true } : {}),
          ...(specialAttack === 'gravity_well' ? { hits: 1, totalAttempts: 1 } : {}),
          specialAttack,
          ...(isReAttack ? { isReAttack: true } : {}),
          elementalOffense: 'none',
          attackType: event.attackType,
        });
        appendPending(event);
        continue;
      }
      const groupKey = actionKey(event);
      const presentationKey = attackTargetKey(event);
      const occurrence = presentationOccurrence.get(presentationKey) ?? 0;
      const presentationFacts = presentationByTarget.get(presentationKey)?.[occurrence] ?? new Map<number, number>();
      presentationOccurrence.set(presentationKey, occurrence + 1);
      const bonusText = attackBonusText(presentationFacts);
      const presentation = presentationProperties(presentationFacts);
      const initiativeRoll = initiatives.get(initiativeKey(actor.id, event.attackType)) ?? event.timing;
      const isReAttack = event.aux0 === 3;
      const isCounter = event.aux0 >= 4 && event.aux0 <= 7;
      const negated = negatedActionKeys.has(attackTargetKey(event));

      if (event.abilityId === 'magic_seal') {
        const attack = spellName(actor, event.attempts);
        log.push({
          phase: 'combat', initiativeRoll, actor: actor.kind === 'enemy' ? 'enemy' : 'character',
          ...(actor.kind === 'character' ? { characterId: actor.id } : {}),
          action: actor.kind === 'enemy' ? t('battleLog.action.enemySpellNegated', { enemy: actor.name, attack }) : t('battleLog.action.characterSpellNegated', { actor: actor.name, attack }),
          damage: 0, showZeroDamage: true, hits: 0, totalAttempts: event.attempts, wasNegated: true,
          elementalOffense: actor.elementalOffense, attackType: event.attackType,
        });
        continue;
      }

      const actionOccurrence = actionPresentationOccurrence.get(groupKey) ?? 0;
      const actionPresentation = actor.kind === 'enemy' && event.attackType === 'magical'
        ? presentationByAction.get(groupKey)?.[actionOccurrence]
        : undefined;
      if (actionPresentation && actionPresentation.eventIndex < index) {
        actionPresentationOccurrence.set(groupKey, actionOccurrence + 1);
        const actionBonusText = attackBonusText(actionPresentation.facts);
        const actionProperties = presentationProperties(actionPresentation.facts);
        const attack = `${spellName(actor, actionPresentation.attempts)}${isReAttack ? t('battleLog.action.reAttackSuffix') : ''}`;
        log.push({
          phase: 'combat', initiativeRoll, actor: 'enemy', action: `${t('battleLog.action.enemySpellCast', { attack })}${actionBonusText}`,
          hits: actionPresentation.hits, totalAttempts: actionPresentation.attempts,
          ...(actionProperties.rageBonusPercent !== undefined ? { rageBonusPercent: actionProperties.rageBonusPercent } : {}),
          ...(isReAttack ? { isReAttack: true } : {}), elementalOffense: actor.elementalOffense, attackType: event.attackType,
        });
      }

      let action: string;
      if (actor.kind === 'character') {
        if (event.aux0 === 4 || event.aux0 === 5) action = `${t('battle.action.ownerAbility', { owner: actor.name, ability: t(event.aux0 === 5 ? 'ability.magical_counter.label' : 'ability.counter.label') })}${bonusText}`;
        else if (event.aux0 === 6) action = t('battle.action.reCounter', { actor: actor.name });
        else if (event.aux0 === 7) action = t('battle.action.coveringFire', { actor: actor.name });
        else {
          const attack = event.attackType === 'magical' ? `${spellName(actor, event.attempts)}${isReAttack ? t('battleLog.action.reAttackSuffix') : ''}` : isReAttack ? t('battleLog.action.reAttackName') : t('battleLog.action.attackName');
          action = `${t(event.attackType === 'magical' ? 'battleLog.action.characterSpellCast' : 'battleLog.action.characterAttack', { actor: actor.name, attack })}${bonusText}`;
        }
      } else if (event.aux0 === 4) action = t('battle.action.counterTarget', { target: target?.name ?? nameOf(event.targetId) });
      else if (event.aux0 === 6) action = t('battle.action.reCounterTarget', { target: target?.name ?? nameOf(event.targetId) });
      else if (event.attackType === 'magical') action = t('battleLog.action.targetMagicHit', { target: target?.name ?? nameOf(event.targetId) });
      else action = `${t('battleLog.action.targetAttack', { target: target?.name ?? nameOf(event.targetId), attack: isReAttack ? t('battleLog.action.reAttackName') : t('battleLog.action.attackName') })}${bonusText}`;

      const entry: BattleLogEntry = {
        phase: 'combat', initiativeRoll, actor: actor.kind === 'enemy' ? 'enemy' : 'character',
        ...(actor.kind === 'character' ? { characterId: actor.id } : {}), action,
        ...(actor.kind === 'character' || event.value1 > 0 ? { damage: event.value1 } : {}),
        ...(actor.kind === 'character' && !isCounter ? { damageTarget: target?.kind === 'character' ? 'party' as const : 'enemy' as const } : {}),
        hits: event.hits, totalAttempts: event.attempts,
        ...(negated ? { wasNegated: true } : {}),
        ...(presentation.rageBonusPercent !== undefined ? { rageBonusPercent: presentation.rageBonusPercent } : {}),
        ...(presentation.momentumBonusPercent !== undefined ? { momentumBonusPercent: presentation.momentumBonusPercent } : {}),
        ...(presentation.ambushMultiplier !== undefined ? { ambushMultiplier: presentation.ambushMultiplier } : {}),
        ...(presentation.overwatchMultiplier !== undefined ? { overwatchMultiplier: presentation.overwatchMultiplier } : {}),
        ...(presentation.executionMultiplier !== undefined ? { executionMultiplier: presentation.executionMultiplier } : {}),
        ...(presentation.swarmActorPenaltyPercent !== undefined ? { swarmActorPenaltyPercent: presentation.swarmActorPenaltyPercent } : {}),
        ...(presentation.swarmOpponentBonusPercent !== undefined ? { swarmOpponentBonusPercent: presentation.swarmOpponentBonusPercent } : {}),
        ...(isReAttack ? { isReAttack: true } : {}), ...(isCounter ? { isCounter: true } : {}),
        ...(actor.kind === 'enemy' && event.attackType === 'magical' ? { isEnemyTargetHit: true } : {}),
        elementalOffense: actor.elementalOffense, attackType: event.attackType,
      };
      log.push(entry);
      appendPending(event);
      continue;
    }

    if (event.opcode === 'damage' || event.opcode === 'heal' || event.opcode === 'diagnostic') continue;

    if (event.abilityId && FLAVOR_ABILITIES.has(event.abilityId)) {
      const family = flavorFamily(event.abilityId);
      if (family) {
        requireFlavor(flavors, index, event, flavorEvent);
        throw new Error(`Unhandled battle flavor source ${event.opcode}:${event.abilityId}`);
      }
      continue;
    }
  }
  if (pendingAfterAttack.size > 0) throw new Error('Battle semantic stream ended with unassociated reactive narration');
  recordBattleResultBagEntryObjectAllocations(output.physicalThreatBagCount + output.magicalThreatBagCount);
  return {
    phase: 'combat', partyHp: output.partyHp, enemyHp: output.enemyHp, log,
    outcome: output.outcome as BattleOutcome,
    updatedBags: {
      physicalThreatBag: { entries: Array.from({ length: output.physicalThreatBagCount }, (_, index) => ({
        id: output.physicalThreatBagId(index), tickets: output.physicalThreatBagTickets(index),
      })) },
      magicalThreatBag: { entries: Array.from({ length: output.magicalThreatBagCount }, (_, index) => ({
        id: output.magicalThreatBagId(index), tickets: output.magicalThreatBagTickets(index),
      })) },
    },
    enemyHitsReceived: output.enemyHitsReceived,
  };
}
