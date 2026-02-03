import { Party, Enemy, BattleResult } from '../types';

export type BattlePhase = 'LONG' | 'MID' | 'CLOSE';

/**
 * Calculate damage enemy deals to party
 */
export const calculateEnemyDamage = (
  enemy: Enemy,
  party: Party,
  phase: BattlePhase
): number => {
  let enemyAttack = 0;
  let enemyNoA = 0;
  let partyDefense = 0;

  switch (phase) {
    case 'LONG':
      enemyAttack = enemy.rangedAttack;
      enemyNoA = enemy.rangedNoA;
      partyDefense = party.physicalDefense;
      break;
    case 'MID':
      enemyAttack = enemy.magicalAttack;
      enemyNoA = enemy.magicalNoA;
      partyDefense = party.magicalDefense;
      break;
    case 'CLOSE':
      enemyAttack = enemy.meleeAttack;
      enemyNoA = enemy.meleeNoA;
      partyDefense = party.physicalDefense;
      break;
  }

  const baseDamage = Math.max(1, enemyAttack - partyDefense);
  const damage = baseDamage * enemyNoA;

  return Math.ceil(damage);
};

/**
 * Calculate damage party deals to enemy
 */
export const calculatePartyDamage = (
  party: Party,
  enemy: Enemy,
  phase: BattlePhase
): number => {
  let totalDamage = 0;

  // Sum damage from all characters
  for (const character of party.characters) {
    let characterAttack = 0;
    let characterNoA = 0;
    let enemyDefense = 0;

    switch (phase) {
      case 'LONG':
        characterAttack = 10; // Placeholder
        characterNoA = 1;
        enemyDefense = enemy.physicalDefense;
        break;
      case 'MID':
        characterAttack = 8;
        characterNoA = 1;
        enemyDefense = enemy.magicalDefense;
        break;
      case 'CLOSE':
        characterAttack = 15;
        characterNoA = 2;
        enemyDefense = enemy.physicalDefense;
        break;
    }

    const baseDamage = Math.max(1, characterAttack - enemyDefense);
    const damage = baseDamage * characterNoA;
    totalDamage += damage;
  }

  return Math.ceil(totalDamage);
};

/**
 * Resolve a complete battle between party and enemy
 */
export const resolveBattle = (
  party: Party,
  enemy: Enemy
): {
  partyHpRemaining: number;
  enemyHpRemaining: number;
  phases: Array<{ phase: BattlePhase; partyDamage: number; enemyDamage: number }>;
} => {
  const phases: BattlePhase[] = ['LONG', 'MID', 'CLOSE'];
  let currentPartyHp = party.hp;
  let currentEnemyHp = enemy.maxHp;
  const phaseResults = [];

  for (const phase of phases) {
    // Enemy attacks first
    const enemyDamage = calculateEnemyDamage(enemy, party, phase);
    currentPartyHp -= enemyDamage;

    // Party attacks
    const partyDamage = calculatePartyDamage(party, enemy, phase);
    currentEnemyHp -= partyDamage;

    phaseResults.push({ phase, partyDamage, enemyDamage });

    // Check end conditions
    if (currentPartyHp <= 0 || currentEnemyHp <= 0) {
      break;
    }
  }

  return {
    partyHpRemaining: Math.max(0, currentPartyHp),
    enemyHpRemaining: Math.max(0, currentEnemyHp),
    phases: phaseResults,
  };
};
