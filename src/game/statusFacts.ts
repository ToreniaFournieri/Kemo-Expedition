import type { Ability, Character, ComputedCharacterStats, Item } from '../types';
import { abilityLevelValue } from './abilityLevelScales';
import { getBaseMultiplier } from './baseMultiplier';

// SpecRef: 2.1.1.2 | Multiplier and Functions | character.f.offense_amplifier
// SpecRef: 2.1.1.2 | Multiplier and Functions | character.f.defense_amplifier
// SpecRef: 8.2.2 | Party member details | Status pane
// The values the Party status pane and its change notifications display, derived once from a character and its computed
// stats. The UI, the read models, and the API's `calculatedStatus` all use this one function, so they cannot disagree.

export function getBaseOffenseScale(value: number): number {
  return getBaseMultiplier(value, 'attack');
}

export function getBaseDefenseScale(value: number): number {
  return getBaseMultiplier(value, 'defense');
}

/** Focus scales the accuracy bonus, rounded up to the third decimal. */
export function getEffectiveAccuracyBonus(accuracyBonus: number, abilities: ComputedCharacterStats['abilities']): number {
  const focusLevel = abilities.find((ability) => ability.id === 'focus')?.level ?? 0;
  if (focusLevel <= 0) return accuracyBonus;
  const focusMultiplier = abilityLevelValue('focus', focusLevel);
  return Math.ceil((accuracyBonus * focusMultiplier + Number.EPSILON) * 1000) / 1000;
}

export function getOffenseMultiplierSum(
  items: Item[],
  kind: 'melee' | 'ranged' | 'magical',
  initialAppliedBonusNames?: Iterable<string>,
): number {
  const appliedBonusNames = new Set<string>(initialAppliedBonusNames ?? []);
  const relevant = items.filter((item) => {
    if (kind === 'melee') return item.meleeAttack || item.meleeNoA || item.meleeNoABonus;
    if (kind === 'ranged') return item.rangedAttack || item.rangedNoA || item.rangedNoABonus;
    return item.magicalAttack || item.magicalNoA || item.magicalNoABonus;
  });

  return relevant.reduce((sum, item) => {
    const baseMultiplier = item.baseMultiplier ?? 1;
    if (baseMultiplier === 1) return sum;

    const percent = Math.round((baseMultiplier - 1) * 1000) / 10;
    const bonusName = `c.${kind}_attack+${percent}`;
    if (appliedBonusNames.has(bonusName)) return sum;
    appliedBonusNames.add(bonusName);
    return sum + (baseMultiplier - 1);
  }, 0);
}

export function getArcMagicAbilityLevel(abilities: Ability[]): number {
  return abilities
    .filter((ability) => ability.id === 'arc_magic')
    .reduce((maxLevel, ability) => Math.max(maxLevel, ability.level), 0);
}

export function getArcMagicOffenseAmplifier(level: number): number {
  return abilityLevelValue('arc_magic', level);
}

// a.arc-magic: magical offense amplifier xN (Lv1:3.0, Lv2:3.6, Lv3:4.2); a.heavy-strike: x1.4.
export function getCharacterDisplayedMagicalAttackAmplifier(baseAmplifier: number, abilities: Ability[]): number {
  const heavyStrikeAmplifier = abilities.some((ability) => ability.id === 'heavy_strike' && ability.level > 0) ? 1.4 : 1.0;
  return baseAmplifier * heavyStrikeAmplifier * getArcMagicOffenseAmplifier(getArcMagicAbilityLevel(abilities));
}

export interface StatusFacts {
  /** `f.offense_amplifier`: the multiplier shown after each attack (base scale, deity, Iaigiri, Heavy Strike, Arc Magic). */
  offenseAmplifier: { melee: number; ranged: number; magical: number };
  /** `f.defense_amplifier`: the damage-taken multiplier including the deity, never below 0.01. */
  defenseAmplifier: { physical: number; magical: number };
  /** `f.c_accuracy+v`: the accuracy bonus after Focus. */
  effectiveAccuracyBonus: number;
  /** Per-hit accuracy decay: 0.90 plus the effective accuracy bonus. */
  accuracyDecay: number;
  /** Total penetration: `c.penet` plus the Heavy Strike conversion of the highest number of attacks. */
  penetration: number;
}

export function deriveStatusFacts(character: Character, stats: ComputedCharacterStats): StatusFacts {
  const equippedItems = character.equipment.filter((item): item is Item => item != null);
  const abilityLevel = (id: string) => stats.abilities.filter((ability) => ability.id === id).reduce((level, ability) => Math.max(level, ability.level), 0);
  const iaigiriLevel = abilityLevel('iaigiri');
  const iaigiriMultiplier = iaigiriLevel >= 3 ? 3.0 : iaigiriLevel >= 2 ? 2.5 : iaigiriLevel >= 1 ? 2.0 : 1.0;
  const heavyStrikeLevel = abilityLevel('heavy_strike');
  const heavyStrikeMultiplier = heavyStrikeLevel > 0 ? 1.4 : 1.0;
  const strengthScale = getBaseOffenseScale(stats.baseStats.strength);
  const intelligenceScale = getBaseOffenseScale(stats.baseStats.intelligence);

  const physicalAmplifier = (kind: 'melee' | 'ranged') => {
    const attackBonus = kind === 'melee' ? stats.meleeAttackCBonus : stats.rangedAttackCBonus;
    const base = attackBonus + getOffenseMultiplierSum(equippedItems, kind, stats.offenseCBonusNames);
    const scaled = iaigiriLevel > 0
      ? iaigiriMultiplier * (1 + base) * stats.physicalOffenseMultiplier
      : (1 + base + stats.physicalAttackCBonus) * stats.physicalOffenseMultiplier;
    return (scaled + stats.deityOffenseAmplifierBonus) * strengthScale * heavyStrikeMultiplier;
  };
  const magicalBase = stats.magicalAttackCBonus + getOffenseMultiplierSum(equippedItems, 'magical', stats.offenseCBonusNames);

  const effectiveAccuracyBonus = getEffectiveAccuracyBonus(stats.accuracyBonus, stats.abilities);
  const heavyStrikePenetPerNoA = heavyStrikeLevel <= 0 ? 0 : heavyStrikeLevel >= 2 ? 0.015 : 0.01;
  const heavyStrikePenetBonus = heavyStrikeLevel > 0 ? Math.max(stats.rangedNoA, stats.magicalNoA, stats.meleeNoA) * heavyStrikePenetPerNoA : 0;

  return {
    offenseAmplifier: {
      melee: physicalAmplifier('melee'),
      ranged: physicalAmplifier('ranged'),
      magical: getCharacterDisplayedMagicalAttackAmplifier(
        (((1 + magicalBase) * stats.magicalOffenseMultiplier) + stats.deityOffenseAmplifierBonus) * intelligenceScale,
        stats.abilities,
      ),
    },
    defenseAmplifier: {
      physical: Math.max(0.01, stats.physicalDefenseAmplifier * stats.deityDefenseAmplifierBonus.physical),
      magical: Math.max(0.01, stats.magicalDefenseAmplifier * stats.deityDefenseAmplifierBonus.magical),
    },
    effectiveAccuracyBonus,
    accuracyDecay: 0.90 + effectiveAccuracyBonus,
    penetration: stats.penetMultiplier + heavyStrikePenetBonus,
  };
}
