import { getAbilityDescription, getAbilityName } from '../../game/characterComputation';
import type { Ability, AbilityId, ElementalOffense } from '../../types';
import { readStatusFacts } from './calculatedStatus';
import type { CalculatedStatus } from './contracts';

// SpecRef: 8.2.2 | Party member details | Status pane
// SpecRef: 8.1.1 | Popup Notification Logic & Display | Status Changes
// The numbers the Party status-change notifications compare, built only from a projected `CalculatedStatus`. Building
// them from the projection alone (and never from the local game state) keeps two consecutive notifications consistent
// with each other while a projection refresh is in flight.

export interface CombatTotals {
  vitality: number; strength: number; intelligence: number; mind: number;
  meleeAtk: number; rangedAtk: number; magicalAtk: number;
  meleeNoA: number; rangedNoA: number; magicalNoA: number;
  physDef: number; magDef: number;
  physicalDefenseResistPercent: number; magicalDefenseResistPercent: number;
  fireDefenseResistPercent: number; iceDefenseResistPercent: number; thunderDefenseResistPercent: number;
  meleeAttackAmp: number; rangedAttackAmp: number; magicalAttackAmp: number;
  accuracy: number; evasion: number; penet: number; hp: number;
  elementalOffense: ElementalOffense; elementalOffensePercent: number;
  abilityLevels: Record<string, number>;
}

const ELEMENTS: ElementalOffense[] = ['none', 'fire', 'ice', 'thunder'];

export function buildCombatTotals(status: CalculatedStatus, partyHp: number): CombatTotals {
  const stat = (key: string): number => {
    const found = status.stats.find((entry) => entry.key === key);
    if (!found) throw new Error(`Missing calculated status fact ${key}`);
    return found.value;
  };
  const attack = (attackType: 'melee' | 'ranged' | 'magical', key: 'attack' | 'NoA'): number => {
    const facts = status.attacks.find((entry) => entry.attackType === attackType)?.facts ?? [];
    return facts.find((entry) => entry.key === `d.${attackType}_${key}`)?.value ?? 0;
  };
  const derived = readStatusFacts(status);
  const element = ELEMENTS.find((candidate) => status.stats.some((entry) => entry.key === `e.${candidate}`)) ?? 'none';
  const abilityLevels: Record<string, number> = {};
  for (const ability of status.abilities) {
    const id = ability.abilityId.replace(/^a\./, '').replace(/-/g, '_');
    abilityLevels[id] = Math.max(abilityLevels[id] ?? 0, ability.level);
  }
  const resist = (key: string) => Math.round(Math.max(0.01, stat(key)) * 100);
  return {
    vitality: stat('b.vitality'), strength: stat('b.strength'), intelligence: stat('b.intelligence'), mind: stat('b.mind'),
    meleeAtk: Math.round(attack('melee', 'attack')), rangedAtk: Math.round(attack('ranged', 'attack')), magicalAtk: Math.round(attack('magical', 'attack')),
    meleeNoA: attack('melee', 'NoA'), rangedNoA: attack('ranged', 'NoA'), magicalNoA: attack('magical', 'NoA'),
    physDef: Math.round(stat('d.physical_defense')), magDef: Math.round(stat('d.magical_defense')),
    physicalDefenseResistPercent: Math.round(derived.defenseAmplifier.physical * 100),
    magicalDefenseResistPercent: Math.round(derived.defenseAmplifier.magical * 100),
    fireDefenseResistPercent: resist('r.fire'), iceDefenseResistPercent: resist('r.ice'), thunderDefenseResistPercent: resist('r.thunder'),
    meleeAttackAmp: derived.offenseAmplifier.melee, rangedAttackAmp: derived.offenseAmplifier.ranged, magicalAttackAmp: derived.offenseAmplifier.magical,
    accuracy: Math.round(derived.effectiveAccuracyBonus * 1000),
    evasion: Math.round(stat('c.evasion') * 1000),
    penet: Math.round(derived.penetration * 100),
    hp: Math.floor(partyHp),
    elementalOffense: element,
    elementalOffensePercent: Math.round((stat(`e.${element}`) - 1) * 100),
    abilityLevels,
  };
}

/**
 * The character numbers the Party tab reads, rebuilt from a projected `CalculatedStatus` alone. The tab receives no
 * `ComputedCharacterStats`: every value is a published fact, and ability names and descriptions are resolved from the
 * ability id and level in the current language.
 */
export interface PartyStatsView {
  baseStats: { vitality: number; strength: number; intelligence: number; mind: number };
  maxEquipSlots: number;
  physicalDefense: number; magicalDefense: number;
  evasionBonus: number; accuracyPotency: number;
  meleeAttack: number; rangedAttack: number; magicalAttack: number;
  meleeNoA: number; rangedNoA: number; magicalNoA: number;
  elementalOffense: ElementalOffense; elementalOffenseValue: number;
  elementalDefenseMultipliers: { fire: number; ice: number; thunder: number };
  /** The character's HP contribution to the party, split as the Party pane's breakdown shows it. */
  hpBaseIncrease: number; hpItemIncrease: number;
  /** Whether the character's own race unlock ability is currently unlocked by equipment. */
  raceUnlockActive: boolean;
  abilities: Ability[];
}

export function buildPartyStatsView(status: CalculatedStatus): PartyStatsView {
  const stat = (key: string): number => {
    const found = status.stats.find((entry) => entry.key === key);
    if (!found) throw new Error(`Missing calculated status fact ${key}`);
    return found.value;
  };
  const attack = (attackType: 'melee' | 'ranged' | 'magical', key: 'attack' | 'NoA'): number =>
    status.attacks.find((entry) => entry.attackType === attackType)?.facts.find((entry) => entry.key === `d.${attackType}_${key}`)?.value ?? 0;
  const element = ELEMENTS.find((candidate) => status.stats.some((entry) => entry.key === `e.${candidate}`)) ?? 'none';
  return {
    baseStats: { vitality: stat('b.vitality'), strength: stat('b.strength'), intelligence: stat('b.intelligence'), mind: stat('b.mind') },
    maxEquipSlots: stat('f.equipment_slots'),
    physicalDefense: stat('d.physical_defense'), magicalDefense: stat('d.magical_defense'),
    evasionBonus: stat('c.evasion'), accuracyPotency: stat('d.accuracy_potency'),
    meleeAttack: attack('melee', 'attack'), rangedAttack: attack('ranged', 'attack'), magicalAttack: attack('magical', 'attack'),
    meleeNoA: attack('melee', 'NoA'), rangedNoA: attack('ranged', 'NoA'), magicalNoA: attack('magical', 'NoA'),
    elementalOffense: element, elementalOffenseValue: stat(`e.${element}`),
    elementalDefenseMultipliers: { fire: stat('r.fire'), ice: stat('r.ice'), thunder: stat('r.thunder') },
    hpBaseIncrease: stat('f.hp_contribution.base'), hpItemIncrease: stat('f.hp_contribution.item'),
    raceUnlockActive: stat('f.race_unlock_active') === 1,
    abilities: status.abilities.map((ability) => {
      const id = ability.abilityId.replace(/^a\./, '').replace(/-/g, '_') as AbilityId;
      return { id, level: ability.level, name: getAbilityName(id, ability.level), description: getAbilityDescription(id, ability.level) };
    }),
  };
}
