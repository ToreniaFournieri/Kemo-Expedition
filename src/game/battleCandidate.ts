import type { EnemyDef, GameBags, Party, TerrainEffectKey } from '../types/index.ts';
import { BATTLE_DEITY_IDS } from './generated/battleProtocol.generated.ts';
import { computePartyStats } from './partyComputation.ts';
import { getDeityKey } from './deity.ts';
import { executeBattle as executeTypeScriptReference } from './battleTypeScriptReference.ts';
import {
  executeBattleProtocol,
  withBattleKernelMeasurementSuppressed,
} from './battleKernel.ts';
import {
  encodeBattleProtocolInput,
  type BattleProtocolCombatant,
  type BattleProtocolEvent,
} from './battleProtocol.ts';

type BattleEnvironment = { terrainEffect?: TerrainEffectKey | null };
type ReferenceBattleResult = ReturnType<typeof executeTypeScriptReference>;

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

// SpecRef: 6.1.8 | Universal C++ battle kernel | protocol v3 static numerical projection
function projectCombatants(
  party: Party,
  enemy: EnemyDef,
  partyHp: number,
): { combatants: BattleProtocolCombatant[]; partyMaxHp: number } {
  const { partyStats, characterStats } = computePartyStats(structuredClone(party));
  const characters: BattleProtocolCombatant[] = characterStats.map((stats) => ({
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
    fireResistance: partyStats.elementalResistance.fire * stats.elementalDefenseMultipliers.fire,
    thunderResistance: partyStats.elementalResistance.thunder * stats.elementalDefenseMultipliers.thunder,
    iceResistance: partyStats.elementalResistance.ice * stats.elementalDefenseMultipliers.ice,
    physicalOffenseAmplifier: stats.physicalOffenseMultiplier * partyStats.offenseAmplifier,
    magicalOffenseAmplifier: stats.magicalOffenseMultiplier,
    physicalDefenseAmplifier: stats.physicalDefenseAmplifier * stats.physicalDefenseMultiplier * partyStats.defenseAmplifiers.physical,
    magicalDefenseAmplifier: stats.magicalDefenseAmplifier * stats.magicalDefenseMultiplier * partyStats.defenseAmplifiers.magical,
    deityOffenseBonus: stats.deityOffenseAmplifierBonus,
    deityPhysicalDefenseBonus: stats.deityDefenseAmplifierBonus.physical,
    deityMagicalDefenseBonus: stats.deityDefenseAmplifierBonus.magical,
    rangedAttackBonus: stats.rangedAttackCBonus + stats.physicalAttackCBonus,
    magicalAttackBonus: stats.magicalAttackCBonus,
    meleeAttackBonus: stats.meleeAttackCBonus + stats.physicalAttackCBonus,
    abilities: stats.abilities.map(({ id, level }) => ({ id, level })),
  }));
  return {
    partyMaxHp: partyStats.hp,
    combatants: [
      ...characters,
      {
        // Party and enemy save IDs occupy independent domains; reserve the high
        // wire bit so protocol ownership/event IDs remain globally unambiguous.
        id: 0x8000_0000 + enemy.id,
        kind: 'enemy',
        row: 0,
        elementalOffense: enemy.elementalOffense,
        hp: enemy.hp,
        maxHp: enemy.hp,
        rangedAttack: enemy.rangedAttack,
        magicalAttack: enemy.magicalAttack,
        meleeAttack: enemy.meleeAttack,
        rangedNoA: enemy.rangedNoA,
        magicalNoA: enemy.magicalNoA,
        meleeNoA: enemy.meleeNoA,
        physicalDefense: enemy.physicalDefense,
        magicalDefense: enemy.magicalDefense,
        accuracyBonus: enemy.accuracyBonus,
        evasionBonus: enemy.evasionBonus,
        elementalOffenseValue: enemy.elementalOffenseValue,
        fireResistance: enemy.elementalResistance.fire,
        thunderResistance: enemy.elementalResistance.thunder,
        iceResistance: enemy.elementalResistance.ice,
        physicalDefenseAmplifier: enemy.physicalDefenseAmplifier,
        magicalDefenseAmplifier: enemy.magicalDefenseAmplifier,
        enemyRangedAmplifier: enemy.rangedAttackAmplifier,
        enemyMagicalAmplifier: enemy.magicalAttackAmplifier,
        enemyMeleeAmplifier: enemy.meleeAttackAmplifier,
        magicStyle: magicStyleId(enemy.magicStyle),
        abilities: enemy.abilities.map(({ id, level }) => ({ id, level })),
      },
    ],
  };
}

/**
 * The shadow narrator owns localization. During migration the frozen oracle is
 * retained as the canonical renderer while semantic-event renderers are filled
 * opcode-by-opcode; no names or translated strings cross the v3 wire boundary.
 */
export function convertBattleSemanticEvents(
  _events: readonly BattleProtocolEvent[],
  localizedReference: ReferenceBattleResult,
): ReferenceBattleResult {
  return localizedReference;
}

// SpecRef: 6.1.8 | Universal C++ battle kernel | shadow candidate runner
export function executeBattleCandidate(
  party: Party,
  enemy: EnemyDef,
  bags: GameBags,
  initialPartyHp?: number,
  environment: BattleEnvironment = {},
): ReferenceBattleResult {
  const randomTape: number[] = [];
  const originalRandom = Math.random;
  let reference: ReferenceBattleResult;
  Math.random = () => {
    const value = originalRandom();
    randomTape.push(value);
    return value;
  };
  try {
    reference = withBattleKernelMeasurementSuppressed(() => executeTypeScriptReference(
      structuredClone(party),
      structuredClone(enemy),
      structuredClone(bags),
      initialPartyHp,
      structuredClone(environment),
    ));
  } finally {
    Math.random = originalRandom;
  }

  const partyHp = initialPartyHp ?? computePartyStats(structuredClone(party)).partyStats.hp;
  const projection = projectCombatants(party, enemy, partyHp);
  const deityKey = getDeityKey(party.deity.name);
  const protocolDeityKey = deityKey && deityKey !== 'None' ? deityProtocolKey[deityKey] : null;
  const output = executeBattleProtocol(encodeBattleProtocolInput({
    terrainEffect: environment.terrainEffect,
    partyHp,
    partyMaxHp: projection.partyMaxHp,
    enemyHp: enemy.hp,
    enemyMaxHp: enemy.hp,
    combatants: projection.combatants,
    randomValues: randomTape,
    physicalThreatBag: bags.physicalThreatBag.entries,
    magicalThreatBag: bags.magicalThreatBag.entries,
    deityId: protocolDeityKey ? BATTLE_DEITY_IDS[protocolDeityKey] : 0,
  }));
  if (output.protocolError !== 0) {
    throw new Error(`C++ shadow battle returned protocol error ${output.protocolError}`);
  }
  if (output.randomConsumed !== randomTape.length || output.diagnosticDrawCount !== randomTape.length) {
    throw new Error(`C++ shadow battle consumed ${output.randomConsumed} of ${randomTape.length} supplied random values`);
  }
  return convertBattleSemanticEvents(output.events, reference);
}
