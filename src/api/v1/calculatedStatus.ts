import { getAttackRollProfile } from '../../game/attackProfile.ts';
import { getUnlockedRaceAbilitiesFromBonuses } from '../../game/characterComputation.ts';
import { computeCharacterHpContribution } from '../../game/partyComputation.ts';
import { deriveStatusFacts, type StatusFacts } from '../../game/statusFacts.ts';
import type { AttackType, Character, ComputedCharacterStats } from '../../types/index.ts';
import type { AbilityFact, BonusFact, CalculatedStatus, NumericFact } from './contracts.ts';

// SpecRef: 8.2.2 | Party member details | Status pane
// SpecRef: 9.1.4.14 | Parameter and payload schema conventions | Concrete payload schema definitions
// Projects the shared, already-computed character stats into the public CalculatedStatus fact model. No formula is
// recomputed here: every value comes from computeCharacterStats/computePartyStats, the same source the Party pane uses.

const fact = (key: string, value: number, unit: NumericFact['unit'] = 'number'): NumericFact => ({ key, value, unit });

const ATTACKS: { attackType: AttackType; api: 'melee' | 'ranged' | 'magical'; attack: keyof ComputedCharacterStats; noa: keyof ComputedCharacterStats; originalNoa: keyof ComputedCharacterStats; cBonus: keyof ComputedCharacterStats }[] = [
  { attackType: 'melee', api: 'melee', attack: 'meleeAttack', noa: 'meleeNoA', originalNoa: 'originalMeleeNoA', cBonus: 'meleeAttackCBonus' },
  { attackType: 'ranged', api: 'ranged', attack: 'rangedAttack', noa: 'rangedNoA', originalNoa: 'originalRangedNoA', cBonus: 'rangedAttackCBonus' },
  { attackType: 'magical', api: 'magical', attack: 'magicalAttack', noa: 'magicalNoA', originalNoa: 'originalMagicalNoA', cBonus: 'magicalAttackCBonus' },
];

export function buildCalculatedStatus(character: Character, stats: ComputedCharacterStats, partyLevel: number): CalculatedStatus {
  const numeric = (key: keyof ComputedCharacterStats) => stats[key] as number;
  const derived = deriveStatusFacts(character, stats);
  // SpecRef: 2.1.2 | Party | Party.d.HP contribution of one character (the Party pane's HP breakdown)
  const hpContribution = computeCharacterHpContribution(character, partyLevel);
  // SpecRef: 8.1.1 | Popup Notification Logic & Display | unlock ability (the character's own race unlock is active)
  const raceUnlockActive = getUnlockedRaceAbilitiesFromBonuses(character.equipment.flatMap((item) => item?.bonuses ?? [])).has(character.raceId);

  const statFacts: NumericFact[] = [
    fact('b.vitality', stats.baseStats.vitality),
    fact('b.strength', stats.baseStats.strength),
    fact('b.intelligence', stats.baseStats.intelligence),
    fact('b.mind', stats.baseStats.mind),
    fact('d.physical_defense', stats.physicalDefense),
    fact('d.magical_defense', stats.magicalDefense),
    fact('f.defense_amplifier.physical', derived.defenseAmplifier.physical, 'ratio'),
    fact('f.defense_amplifier.magical', derived.defenseAmplifier.magical, 'ratio'),
    fact('f.offense_amplifier.melee', derived.offenseAmplifier.melee, 'ratio'),
    fact('f.offense_amplifier.ranged', derived.offenseAmplifier.ranged, 'ratio'),
    fact('f.offense_amplifier.magical', derived.offenseAmplifier.magical, 'ratio'),
    fact('f.c_accuracy', derived.effectiveAccuracyBonus, 'ratio'),
    fact('f.accuracy_decay', derived.accuracyDecay, 'ratio'),
    fact('f.penetration', derived.penetration, 'ratio'),
    fact('d.accuracy_potency', stats.accuracyPotency, 'ratio'),
    fact('c.accuracy', stats.accuracyBonus, 'ratio'),
    fact('c.evasion', stats.evasionBonus, 'ratio'),
    fact('c.penet', stats.penetMultiplier, 'ratio'),
    fact(`e.${stats.elementalOffense}`, stats.elementalOffenseValue, 'ratio'),
    fact('r.fire', stats.elementalDefenseMultipliers.fire, 'ratio'),
    fact('r.ice', stats.elementalDefenseMultipliers.ice, 'ratio'),
    fact('r.thunder', stats.elementalDefenseMultipliers.thunder, 'ratio'),
    fact('f.equipment_slots', stats.maxEquipSlots),
    fact('f.hp_contribution.base', hpContribution.baseHpBonus),
    fact('f.hp_contribution.item', hpContribution.itemHpBonus),
    fact('f.race_unlock_active', raceUnlockActive ? 1 : 0),
  ];

  // Level-zero abilities are inert and are not part of the character's ability list.
  const abilities: AbilityFact[] = stats.abilities
    .filter((ability) => ability.level >= 1)
    .map((ability) => ({ abilityId: `a.${ability.id.replace(/_/g, '-')}`, level: ability.level }));

  const bonuses: BonusFact[] = [
    { bonusId: 'c.melee-attack', value: stats.meleeAttackCBonus },
    { bonusId: 'c.ranged-attack', value: stats.rangedAttackCBonus },
    { bonusId: 'c.magical-attack', value: stats.magicalAttackCBonus },
    { bonusId: 'c.physical-attack', value: stats.physicalAttackCBonus },
    { bonusId: 'c.physical-offense-multiplier', value: stats.physicalOffenseMultiplier },
    { bonusId: 'c.magical-offense-multiplier', value: stats.magicalOffenseMultiplier },
    { bonusId: 'c.physical-defense-multiplier', value: stats.physicalDefenseMultiplier },
    { bonusId: 'c.magical-defense-multiplier', value: stats.magicalDefenseMultiplier },
    { bonusId: 'c.fire-defense-multiplier', value: stats.elementalDefenseMultipliers.fire },
    { bonusId: 'c.ice-defense-multiplier', value: stats.elementalDefenseMultipliers.ice },
    { bonusId: 'c.thunder-defense-multiplier', value: stats.elementalDefenseMultipliers.thunder },
  ];

  const attacks = ATTACKS.map((entry) => {
    const attack = numeric(entry.attack);
    const noa = numeric(entry.noa);
    const available = attack > 0 || noa > 0 || numeric(entry.originalNoa) > 0;
    if (!available) return { attackType: entry.api, available, facts: [] as NumericFact[], speed: null };
    const profile = getAttackRollProfile(entry.attackType);
    return {
      attackType: entry.api,
      available,
      facts: [
        fact(`d.${entry.api}_attack`, attack),
        fact(`d.${entry.api}_NoA`, noa),
        fact(`d.${entry.api}_NoA.original`, numeric(entry.originalNoa)),
      ],
      speed: { min: profile.minimum, max: profile.maximum, diceCount: profile.diceCount, dieSize: profile.dieSize },
    };
  });

  return { stats: statFacts, abilities, bonuses, attacks };
}

/**
 * The exact inverse of the derived facts above: reads the status-pane values back out of a `CalculatedStatus`, so the
 * Party pane renders from the projection and cannot disagree with the game function that produced it.
 */
export function readStatusFacts(status: CalculatedStatus): StatusFacts {
  const value = (key: string): number => {
    const found = status.stats.find((entry) => entry.key === key);
    if (!found) throw new Error(`Missing calculated status fact ${key}`);
    return found.value;
  };
  return {
    offenseAmplifier: { melee: value('f.offense_amplifier.melee'), ranged: value('f.offense_amplifier.ranged'), magical: value('f.offense_amplifier.magical') },
    defenseAmplifier: { physical: value('f.defense_amplifier.physical'), magical: value('f.defense_amplifier.magical') },
    effectiveAccuracyBonus: value('f.c_accuracy'),
    accuracyDecay: value('f.accuracy_decay'),
    penetration: value('f.penetration'),
  };
}
