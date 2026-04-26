import { AbilityId, EnemyAbility, EnemyClassId } from '../types';

type EnemyClassModifier = {
  hpModifier: number;
  abilityAdd?: AbilityId;
  accuracyAdd: number;
  evasionAdd: number;
  rangedAttackModifier: number;
  rangedAttackAmplifierModifier: number;
  rangedNoA: number;
  magicalAttackModifier: number;
  magicalAttackAmplifierModifier: number;
  magicalNoA: number;
  meleeAttackModifier: number;
  meleeAttackAmplifierModifier: number;
  meleeNoA: number;
  physicalDefenseModifier: number;
  magicalDefenseModifier: number;
  experienceModifier: number;
};

type EnemyClassMasterStats = {
  hp: number;
  abilities: EnemyAbility[];
  accuracyBonus: number;
  evasionBonus: number;
  rangedAttack: number;
  rangedNoA: number;
  magicalAttack: number;
  magicalNoA: number;
  meleeAttack: number;
  meleeNoA: number;
  rangedAttackAmplifier: number;
  magicalAttackAmplifier: number;
  meleeAttackAmplifier: number;
  physicalDefense: number;
  magicalDefense: number;
  experience: number;
};

// SpecRef: 4.1.4 | Base data structure (enemy) | Base status
const ENEMY_BASE_STATUS = {
  hp: 80,
  accuracy: 0,
  evasion: 0,
  rangedAttack: 31,
  magicalAttack: 29,
  meleeAttack: 40,
  rangedAttackAmplifier: 1,
  magicalAttackAmplifier: 1,
  meleeAttackAmplifier: 1,
  physicalDefense: 12,
  magicalDefense: 12,
  experience: 5,
};

// SpecRef: 4.1.4 | Base data structure (enemy) | Class modifier
const ENEMY_CLASS_MODIFIERS: Record<EnemyClassId, EnemyClassModifier> = {
  duelist: { hpModifier: 1.1, abilityAdd: 'counter', accuracyAdd: 0.0, evasionAdd: 0.0, rangedAttackModifier: 0.9, rangedAttackAmplifierModifier: 0.8, rangedNoA: 0, magicalAttackModifier: 0.9, magicalAttackAmplifierModifier: 0.8, magicalNoA: 0, meleeAttackModifier: 1.0, meleeAttackAmplifierModifier: 1.2, meleeNoA: 4, physicalDefenseModifier: 1.05, magicalDefenseModifier: 0.8, experienceModifier: 1.0 },
  samurai: { hpModifier: 0.92, abilityAdd: 'iaigiri', accuracyAdd: 0.0, evasionAdd: -0.02, rangedAttackModifier: 0.9, rangedAttackAmplifierModifier: 0.8, rangedNoA: 0, magicalAttackModifier: 0.9, magicalAttackAmplifierModifier: 0.8, magicalNoA: 0, meleeAttackModifier: 2.0, meleeAttackAmplifierModifier: 1.0, meleeNoA: 1, physicalDefenseModifier: 1.0, magicalDefenseModifier: 0.7, experienceModifier: 0.8 },
  'sword-saint': { hpModifier: 1.18, abilityAdd: 're_attack', accuracyAdd: 0.0, evasionAdd: 0.0, rangedAttackModifier: 0.9, rangedAttackAmplifierModifier: 0.8, rangedNoA: 0, magicalAttackModifier: 0.9, magicalAttackAmplifierModifier: 0.8, magicalNoA: 0, meleeAttackModifier: 0.8, meleeAttackAmplifierModifier: 1.3, meleeNoA: 6, physicalDefenseModifier: 1.0, magicalDefenseModifier: 0.75, experienceModifier: 1.0 },
  ranger: { hpModifier: 0.94, accuracyAdd: 0.03, evasionAdd: 0.01, rangedAttackModifier: 1.3, rangedAttackAmplifierModifier: 1.2, rangedNoA: 4, magicalAttackModifier: 0.9, magicalAttackAmplifierModifier: 0.8, magicalNoA: 0, meleeAttackModifier: 0.9, meleeAttackAmplifierModifier: 0.8, meleeNoA: 0, physicalDefenseModifier: 0.8, magicalDefenseModifier: 0.8, experienceModifier: 1.2 },
  striker: { hpModifier: 1.05, abilityAdd: 'heavy_strike', accuracyAdd: 0.0, evasionAdd: -0.02, rangedAttackModifier: 1.5, rangedAttackAmplifierModifier: 1.0, rangedNoA: 2, magicalAttackModifier: 0.9, magicalAttackAmplifierModifier: 0.8, magicalNoA: 0, meleeAttackModifier: 0.9, meleeAttackAmplifierModifier: 0.8, meleeNoA: 0, physicalDefenseModifier: 0.76, magicalDefenseModifier: 0.76, experienceModifier: 0.8 },
  ninja: { hpModifier: 0.87, abilityAdd: 'first_strike', accuracyAdd: 0.05, evasionAdd: 0.03, rangedAttackModifier: 0.8, rangedAttackAmplifierModifier: 1.3, rangedNoA: 5, magicalAttackModifier: 0.9, magicalAttackAmplifierModifier: 0.8, magicalNoA: 0, meleeAttackModifier: 0.9, meleeAttackAmplifierModifier: 0.8, meleeNoA: 0, physicalDefenseModifier: 0.82, magicalDefenseModifier: 0.93, experienceModifier: 1.0 },
  wizard: { hpModifier: 0.72, abilityAdd: 'resonance', accuracyAdd: 0.0, evasionAdd: -0.015, rangedAttackModifier: 0.9, rangedAttackAmplifierModifier: 0.8, rangedNoA: 0, magicalAttackModifier: 1.2, magicalAttackAmplifierModifier: 1.0, magicalNoA: 2, meleeAttackModifier: 0.9, meleeAttackAmplifierModifier: 0.8, meleeNoA: 0, physicalDefenseModifier: 0.63, magicalDefenseModifier: 1.1, experienceModifier: 0.8 },
  sage: { hpModifier: 0.94, abilityAdd: 'arc_magic', accuracyAdd: 0.0, evasionAdd: 0.0, rangedAttackModifier: 0.9, rangedAttackAmplifierModifier: 0.8, rangedNoA: 0, magicalAttackModifier: 0.8, magicalAttackAmplifierModifier: 1.3, magicalNoA: 4, meleeAttackModifier: 0.9, meleeAttackAmplifierModifier: 0.8, meleeNoA: 0, physicalDefenseModifier: 0.8, magicalDefenseModifier: 1.3, experienceModifier: 1.0 },
  alchemist: { hpModifier: 0.83, abilityAdd: 'arcane_stability', accuracyAdd: 0.0, evasionAdd: 0.0, rangedAttackModifier: 0.9, rangedAttackAmplifierModifier: 0.8, rangedNoA: 0, magicalAttackModifier: 1.2, magicalAttackAmplifierModifier: 1.0, magicalNoA: 5, meleeAttackModifier: 0.9, meleeAttackAmplifierModifier: 0.8, meleeNoA: 0, physicalDefenseModifier: 0.7, magicalDefenseModifier: 1.0, experienceModifier: 1.2 },
  guardian: { hpModifier: 1.40, accuracyAdd: 0.0, evasionAdd: 0.0, rangedAttackModifier: 0.9, rangedAttackAmplifierModifier: 0.8, rangedNoA: 0, magicalAttackModifier: 0.8, magicalAttackAmplifierModifier: 0.8, magicalNoA: 0, meleeAttackModifier: 0.9, meleeAttackAmplifierModifier: 0.8, meleeNoA: 2, physicalDefenseModifier: 1.2, magicalDefenseModifier: 0.6, experienceModifier: 1.0 },
  pilgrim: { hpModifier: 1.22, accuracyAdd: 0.0, evasionAdd: 0.0, rangedAttackModifier: 0.9, rangedAttackAmplifierModifier: 0.8, rangedNoA: 0, magicalAttackModifier: 0.9, magicalAttackAmplifierModifier: 0.85, magicalNoA: 2, meleeAttackModifier: 0.9, meleeAttackAmplifierModifier: 0.9, meleeNoA: 0, physicalDefenseModifier: 1.1, magicalDefenseModifier: 1.1, experienceModifier: 0.4 },
  lord: { hpModifier: 1.18, accuracyAdd: 0.0, evasionAdd: 0.0, rangedAttackModifier: 0.9, rangedAttackAmplifierModifier: 0.8, rangedNoA: 0, magicalAttackModifier: 0.9, magicalAttackAmplifierModifier: 0.8, magicalNoA: 0, meleeAttackModifier: 1.0, meleeAttackAmplifierModifier: 0.9, meleeNoA: 2, physicalDefenseModifier: 1.2, magicalDefenseModifier: 1.0, experienceModifier: 1.6 },
  fighter: { hpModifier: 1.5, accuracyAdd: 0.0, evasionAdd: 0.0, rangedAttackModifier: 1.0, rangedAttackAmplifierModifier: 1.0, rangedNoA: 0, magicalAttackModifier: 1.0, magicalAttackAmplifierModifier: 1.0, magicalNoA: 0, meleeAttackModifier: 1.0, meleeAttackAmplifierModifier: 1.0, meleeNoA: 2, physicalDefenseModifier: 1.3, magicalDefenseModifier: 0.6, experienceModifier: 1.0 },
  rogue: { hpModifier: 0.75, abilityAdd: 'first_strike', accuracyAdd: 0.05, evasionAdd: 0.03, rangedAttackModifier: 0.7, rangedAttackAmplifierModifier: 1.3, rangedNoA: 5, magicalAttackModifier: 1.0, magicalAttackAmplifierModifier: 1.0, magicalNoA: 0, meleeAttackModifier: 1.0, meleeAttackAmplifierModifier: 1.0, meleeNoA: 0, physicalDefenseModifier: 0.5, magicalDefenseModifier: 0.5, experienceModifier: 1.0 },
};

// SpecRef: 4.1.4 | Base data structure (enemy) | Calculation of master value
export function buildEnemyClassMasterStats(mainClass: EnemyClassId, subClass: EnemyClassId | 'none' = 'none'): EnemyClassMasterStats {
  const main = ENEMY_CLASS_MODIFIERS[mainClass];
  const sub = subClass === 'none' ? null : ENEMY_CLASS_MODIFIERS[subClass];
  const abilities: EnemyAbility[] = [];
  if (main.abilityAdd) {
    const abilityLevel = subClass !== 'none' && mainClass === subClass ? 2 : 1;
    abilities.push({ id: main.abilityAdd, level: abilityLevel });
  }
  return {
    hp: ENEMY_BASE_STATUS.hp * main.hpModifier * (sub?.hpModifier ?? 1),
    abilities,
    accuracyBonus: ENEMY_BASE_STATUS.accuracy + main.accuracyAdd + (sub?.accuracyAdd ?? 0),
    evasionBonus: ENEMY_BASE_STATUS.evasion + main.evasionAdd + (sub?.evasionAdd ?? 0),
    rangedAttack: ENEMY_BASE_STATUS.rangedAttack * main.rangedAttackModifier * (sub?.rangedAttackModifier ?? 1),
    rangedNoA: main.rangedNoA + ((sub?.rangedNoA ?? 0) * 0.5),
    magicalAttack: ENEMY_BASE_STATUS.magicalAttack * main.magicalAttackModifier * (sub?.magicalAttackModifier ?? 1),
    magicalNoA: main.magicalNoA + ((sub?.magicalNoA ?? 0) * 0.5),
    meleeAttack: ENEMY_BASE_STATUS.meleeAttack * main.meleeAttackModifier * (sub?.meleeAttackModifier ?? 1),
    meleeNoA: main.meleeNoA + ((sub?.meleeNoA ?? 0) * 0.5),
    rangedAttackAmplifier: ENEMY_BASE_STATUS.rangedAttackAmplifier * main.rangedAttackAmplifierModifier * (sub?.rangedAttackAmplifierModifier ?? 1),
    magicalAttackAmplifier: ENEMY_BASE_STATUS.magicalAttackAmplifier * main.magicalAttackAmplifierModifier * (sub?.magicalAttackAmplifierModifier ?? 1),
    meleeAttackAmplifier: ENEMY_BASE_STATUS.meleeAttackAmplifier * main.meleeAttackAmplifierModifier * (sub?.meleeAttackAmplifierModifier ?? 1),
    physicalDefense: ENEMY_BASE_STATUS.physicalDefense * main.physicalDefenseModifier * (sub?.physicalDefenseModifier ?? 1),
    magicalDefense: ENEMY_BASE_STATUS.magicalDefense * main.magicalDefenseModifier * (sub?.magicalDefenseModifier ?? 1),
    experience: ENEMY_BASE_STATUS.experience * main.experienceModifier * (sub?.experienceModifier ?? 1),
  };
}
