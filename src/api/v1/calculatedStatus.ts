import { getAttackRollProfile } from '../../game/attackProfile.ts';
import type { AttackType, ComputedCharacterStats } from '../../types/index.ts';
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

export function buildCalculatedStatus(stats: ComputedCharacterStats): CalculatedStatus {
  const numeric = (key: keyof ComputedCharacterStats) => stats[key] as number;

  const statFacts: NumericFact[] = [
    fact('b.vitality', stats.baseStats.vitality),
    fact('b.strength', stats.baseStats.strength),
    fact('b.intelligence', stats.baseStats.intelligence),
    fact('b.mind', stats.baseStats.mind),
    fact('d.physical_defense', stats.physicalDefense),
    fact('d.magical_defense', stats.magicalDefense),
    fact('f.defense_amplifier.physical', stats.physicalDefenseAmplifier, 'ratio'),
    fact('f.defense_amplifier.magical', stats.magicalDefenseAmplifier, 'ratio'),
    fact('d.accuracy_potency', stats.accuracyPotency, 'ratio'),
    fact('c.accuracy', stats.accuracyBonus, 'ratio'),
    fact('c.evasion', stats.evasionBonus, 'ratio'),
    fact('c.penet', stats.penetMultiplier, 'ratio'),
    fact(`e.${stats.elementalOffense}`, stats.elementalOffenseValue, 'ratio'),
    fact('r.fire', stats.elementalDefenseMultipliers.fire, 'ratio'),
    fact('r.ice', stats.elementalDefenseMultipliers.ice, 'ratio'),
    fact('r.thunder', stats.elementalDefenseMultipliers.thunder, 'ratio'),
    fact('f.equipment_slots', stats.maxEquipSlots),
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
