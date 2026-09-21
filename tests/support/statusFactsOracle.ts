import { getBaseOffenseScale, getCharacterDisplayedMagicalAttackAmplifier, getEffectiveAccuracyBonus, getOffenseMultiplierSum } from '../../src/game/statusFacts.ts';
import type { computePartyStats } from '../../src/game/partyComputation.ts';
import type { Character } from '../../src/types/index.ts';

// A frozen copy of the formulas the Party tab used to hold inline (the status-pane version). It is the oracle the
// shared `deriveStatusFacts` is checked against; it must not be changed when the game function changes.
type Stats = ReturnType<typeof computePartyStats>['characterStats'][number];

export const oracleStatusFacts = (character: Character, stats: Stats) => {
const items = character.equipment.filter((item): item is NonNullable<typeof item> => item != null);
const iaigiri = stats.abilities.find((ability) => ability.id === 'iaigiri');
const heavyStrike = stats.abilities.find((ability) => ability.id === 'heavy_strike');
const iaigiriMultiplier = iaigiri ? (iaigiri.level >= 3 ? 3.0 : iaigiri.level >= 2 ? 2.5 : 2.0) : 1.0;
const heavyStrikeMultiplier = heavyStrike ? 1.4 : 1.0;
const strength = getBaseOffenseScale(stats.baseStats.strength);
const intelligence = getBaseOffenseScale(stats.baseStats.intelligence);
const mult = (kind: 'melee' | 'ranged' | 'magical', bonus: number) => bonus + getOffenseMultiplierSum(items, kind, stats.offenseCBonusNames);
const physical = (base: number) => (((iaigiri ? iaigiriMultiplier * (1.0 + base) * stats.physicalOffenseMultiplier : (1.0 + base + stats.physicalAttackCBonus) * stats.physicalOffenseMultiplier) + stats.deityOffenseAmplifierBonus) * strength * heavyStrikeMultiplier);
const heavyStrikeAbility = stats.abilities.find((ability) => ability.id === 'heavy_strike' && ability.level > 0);
const perNoA = heavyStrikeAbility ? (heavyStrikeAbility.level >= 2 ? 0.015 : 0.01) : 0;
const penetBonus = heavyStrikeAbility ? Math.max(stats.rangedNoA, stats.magicalNoA, stats.meleeNoA) * perNoA : 0;
const effective = getEffectiveAccuracyBonus(stats.accuracyBonus, stats.abilities);
return {
  melee: physical(mult('melee', stats.meleeAttackCBonus)),
  ranged: physical(mult('ranged', stats.rangedAttackCBonus)),
  magical: getCharacterDisplayedMagicalAttackAmplifier(((1.0 + mult('magical', stats.magicalAttackCBonus)) * stats.magicalOffenseMultiplier + stats.deityOffenseAmplifierBonus) * intelligence, stats.abilities),
  physicalDefense: Math.max(0.01, stats.physicalDefenseAmplifier * stats.deityDefenseAmplifierBonus.physical),
  magicalDefense: Math.max(0.01, stats.magicalDefenseAmplifier * stats.deityDefenseAmplifierBonus.magical),
  effective,
  decay: 0.90 + effective,
  penetration: stats.penetMultiplier + penetBonus,
};
};

