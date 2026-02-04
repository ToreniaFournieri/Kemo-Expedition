import {
  BattleState,
  BattlePhase,
  BattleLogEntry,
  BattleOutcome,
  ComputedPartyStats,
  ComputedCharacterStats,
  EnemyDef,
  Party,
  ElementalOffense,
  GameBags,
  RandomBag,
} from '../types';
import { computePartyStats } from './partyComputation';
import { drawFromBag, createPhysicalThreatBag, createMagicalThreatBag } from './bags';

// Attack potency based on row position (1-6)
const ATTACK_POTENCY: Record<number, number> = {
  1: 1.00,
  2: 0.85,
  3: 0.72,
  4: 0.61,
  5: 0.52,
  6: 0.44,
};

interface BattleContext {
  partyStats: ComputedPartyStats;
  characterStats: ComputedCharacterStats[];
  enemy: EnemyDef;
  party: Party;
  arrowsConsumed: number;
  quiverQuantities: [number, number];
  physicalThreatBag: RandomBag;
  magicalThreatBag: RandomBag;
}

function getElementalMultiplier(
  offense: ElementalOffense,
  resistance: Record<'fire' | 'thunder' | 'ice', number>
): number {
  if (offense === 'none') return 1.0;
  return resistance[offense] ?? 1.0;
}

// Get target row index (1-6) using threat bag
function getTargetRow(ctx: BattleContext, phase: BattlePhase): { row: number; newCtx: BattleContext } {
  const isPhysical = phase === 'long' || phase === 'close';

  // Refill bag if empty
  let bag = isPhysical ? ctx.physicalThreatBag : ctx.magicalThreatBag;
  if (bag.tickets.length === 0) {
    bag = isPhysical ? createPhysicalThreatBag() : createMagicalThreatBag();
  }

  const { ticket, newBag } = drawFromBag(bag);

  const newCtx = {
    ...ctx,
    ...(isPhysical
      ? { physicalThreatBag: newBag }
      : { magicalThreatBag: newBag }
    ),
  };

  return { row: ticket, newCtx };
}

// Calculate single attack damage (without NoA multiplier)
function calculateSingleEnemyAttackDamage(
  phase: BattlePhase,
  enemy: EnemyDef,
  partyStats: ComputedPartyStats,
  targetCharStats: ComputedCharacterStats
): number {
  let attack = 0;
  let amplifier = 1.0;
  let defense = 0;
  let defenseAmplifier = 1.0;

  switch (phase) {
    case 'long':
      attack = enemy.rangedAttack;
      amplifier = enemy.rangedAttackAmplifier;
      defense = targetCharStats.physicalDefense;
      defenseAmplifier = partyStats.defenseAmplifiers.physical;
      break;
    case 'mid':
      attack = enemy.magicalAttack;
      amplifier = enemy.magicalAttackAmplifier;
      defense = targetCharStats.magicalDefense;
      defenseAmplifier = partyStats.defenseAmplifiers.magical;
      break;
    case 'close':
      attack = enemy.meleeAttack;
      amplifier = enemy.meleeAttackAmplifier;
      defense = targetCharStats.physicalDefense;
      defenseAmplifier = partyStats.defenseAmplifiers.physical;
      break;
  }

  if (attack === 0) return 0;

  const elementalMultiplier = getElementalMultiplier(
    enemy.elementalOffense,
    partyStats.elementalResistance
  );

  const baseDamage = Math.max(1, attack - defense);
  const totalDamage = baseDamage * amplifier * elementalMultiplier * defenseAmplifier;

  return Math.floor(totalDamage);
}

// Get number of attacks for enemy in a phase
function getEnemyNoA(phase: BattlePhase, enemy: EnemyDef): number {
  switch (phase) {
    case 'long': return enemy.rangedNoA;
    case 'mid': return enemy.magicalNoA;
    case 'close': return enemy.meleeNoA;
  }
}

function calculateCharacterDamage(
  phase: BattlePhase,
  charStats: ComputedCharacterStats,
  enemy: EnemyDef,
  partyStats: ComputedPartyStats,
  ctx: BattleContext
): { damage: number; arrowsUsed: number } {
  let attack = 0;
  let noA = 0;
  let defense = 0;
  let arrowsUsed = 0;

  switch (phase) {
    case 'long':
      attack = charStats.rangedAttack;
      noA = charStats.rangedNoA;
      defense = enemy.physicalDefense;
      // Arrow consumption
      if (noA > 0) {
        const availableArrows = ctx.quiverQuantities[0] + ctx.quiverQuantities[1];
        arrowsUsed = Math.min(noA, availableArrows);
        if (arrowsUsed < noA) {
          noA = arrowsUsed; // Reduced NoA due to insufficient arrows
        }
      }
      break;
    case 'mid':
      attack = charStats.magicalAttack;
      noA = charStats.magicalNoA;
      defense = enemy.magicalDefense;
      break;
    case 'close':
      attack = charStats.meleeAttack;
      noA = charStats.meleeNoA;
      defense = enemy.physicalDefense;
      break;
  }

  if (noA === 0) return { damage: 0, arrowsUsed: 0 };

  // Apply penetration
  const effectiveDefense = defense * (1 - charStats.penetMultiplier);

  // Check for iaigiri ability (damage amplifier)
  let abilityAmplifier = 1.0;
  const iaigiri = charStats.abilities.find(a => a.id === 'iaigiri');
  if (iaigiri && phase === 'close') {
    abilityAmplifier = iaigiri.level === 2 ? 2.5 : 2.0;
  }

  // Attack potency based on row position (only for LONG and CLOSE phases)
  const attackPotency = (phase === 'long' || phase === 'close')
    ? (ATTACK_POTENCY[charStats.row] ?? 1.0)
    : 1.0;

  const elementalMultiplier = getElementalMultiplier(
    charStats.elementalOffense,
    enemy.elementalResistance
  );

  const baseDamage = Math.max(1, attack - effectiveDefense);
  const totalDamage = baseDamage * noA * abilityAmplifier * charStats.elementalOffenseValue *
    elementalMultiplier * partyStats.offenseAmplifier * attackPotency;

  return { damage: Math.floor(totalDamage), arrowsUsed };
}

function hasFirstStrike(charStats: ComputedCharacterStats, phase: BattlePhase): boolean {
  const ability = charStats.abilities.find(a => a.id === 'first_strike');
  if (!ability) return false;
  if (ability.level === 2) return true; // All phases
  return phase === 'close'; // Level 1 only close phase
}

function hasCounter(charStats: ComputedCharacterStats, phase: BattlePhase): boolean {
  const ability = charStats.abilities.find(a => a.id === 'counter');
  if (!ability) return false;
  if (ability.level === 2) return phase === 'close' || phase === 'mid';
  return phase === 'close';
}

function hasReAttack(charStats: ComputedCharacterStats): number {
  const ability = charStats.abilities.find(a => a.id === 're_attack');
  if (!ability) return 0;
  return ability.level === 2 ? 2 : 1;
}

function consumeArrows(ctx: BattleContext, amount: number): void {
  let remaining = amount;
  if (ctx.quiverQuantities[0] >= remaining) {
    ctx.quiverQuantities[0] -= remaining;
  } else {
    remaining -= ctx.quiverQuantities[0];
    ctx.quiverQuantities[0] = 0;
    ctx.quiverQuantities[1] = Math.max(0, ctx.quiverQuantities[1] - remaining);
  }
  ctx.arrowsConsumed += amount;
}

export interface BattleResult extends BattleState {
  updatedBags: {
    physicalThreatBag: RandomBag;
    magicalThreatBag: RandomBag;
  };
}

export function executeBattle(
  party: Party,
  enemy: EnemyDef,
  initialQuiverQuantities: [number, number],
  bags: GameBags
): BattleResult {
  const { partyStats, characterStats } = computePartyStats(party);

  let ctx: BattleContext = {
    partyStats,
    characterStats,
    enemy,
    party,
    arrowsConsumed: 0,
    quiverQuantities: [...initialQuiverQuantities],
    physicalThreatBag: { ...bags.physicalThreatBag },
    magicalThreatBag: { ...bags.magicalThreatBag },
  };

  let partyHp = partyStats.hp;
  let enemyHp = enemy.hp;
  const log: BattleLogEntry[] = [];

  const phases: BattlePhase[] = ['long', 'mid', 'close'];

  for (const phase of phases) {
    // First strike characters act first
    const firstStrikeChars = characterStats.filter(cs => hasFirstStrike(cs, phase));
    for (const cs of firstStrikeChars) {
      if (enemyHp <= 0) break;
      const { damage, arrowsUsed } = calculateCharacterDamage(phase, cs, enemy, partyStats, ctx);
      if (arrowsUsed > 0) consumeArrows(ctx, arrowsUsed);
      if (damage > 0) {
        enemyHp -= damage;
        const char = party.characters.find(c => c.id === cs.characterId);
        log.push({
          phase,
          actor: 'character',
          characterId: cs.characterId,
          action: `${char?.name ?? '???'} の先制攻撃！`,
          damage,
          isFirstStrike: true,
        });
      }
    }

    // Check if enemy is defeated
    if (enemyHp <= 0) {
      return {
        phase,
        partyHp,
        enemyHp: 0,
        log,
        outcome: 'victory',
        updatedBags: {
          physicalThreatBag: ctx.physicalThreatBag,
          magicalThreatBag: ctx.magicalThreatBag,
        },
      };
    }

    // Enemy attacks with targeting (each attack draws a new target)
    const noA = getEnemyNoA(phase, enemy);

    // Track attacks grouped by target: Map<characterId, { damage: number, count: number, charStats: ComputedCharacterStats }>
    const attacksByTarget = new Map<number, { damage: number; count: number; charStats: ComputedCharacterStats }>();

    for (let i = 0; i < noA; i++) {
      const { row: targetRow, newCtx } = getTargetRow(ctx, phase);
      ctx = newCtx;
      const targetCharStats = characterStats.find(cs => cs.row === targetRow);

      if (targetCharStats) {
        const singleDamage = calculateSingleEnemyAttackDamage(phase, enemy, partyStats, targetCharStats);
        const existing = attacksByTarget.get(targetCharStats.characterId);
        if (existing) {
          existing.damage += singleDamage;
          existing.count += 1;
        } else {
          attacksByTarget.set(targetCharStats.characterId, {
            damage: singleDamage,
            count: 1,
            charStats: targetCharStats,
          });
        }
      }
    }

    // Apply damage and generate logs grouped by target
    let totalEnemyDamage = 0;
    for (const [charId, attack] of attacksByTarget) {
      if (attack.damage > 0) {
        partyHp -= attack.damage;
        totalEnemyDamage += attack.damage;
        const targetChar = party.characters.find(c => c.id === charId);
        log.push({
          phase,
          actor: 'enemy',
          action: `${enemy.name} が ${targetChar?.name ?? '???'} に攻撃(${attack.count}回)！`,
          damage: attack.damage,
        });
      }
    }

    // Check for defeat
    if (partyHp <= 0) {
      return {
        phase,
        partyHp: 0,
        enemyHp,
        log,
        outcome: 'defeat',
        updatedBags: {
          physicalThreatBag: ctx.physicalThreatBag,
          magicalThreatBag: ctx.magicalThreatBag,
        },
      };
    }

    // Counter attacks (for each targeted character with counter ability)
    for (const [charId, attack] of attacksByTarget) {
      if (attack.damage > 0 && hasCounter(attack.charStats, phase)) {
        const { damage } = calculateCharacterDamage(phase, attack.charStats, enemy, partyStats, ctx);
        if (damage > 0) {
          enemyHp -= damage;
          const targetChar = party.characters.find(c => c.id === charId);
          log.push({
            phase,
            actor: 'character',
            characterId: charId,
            action: `${targetChar?.name ?? '???'} のカウンター！`,
            damage,
            isCounter: true,
          });
        }
      }
    }

    // Check if enemy is defeated after counters
    if (enemyHp <= 0) {
      return {
        phase,
        partyHp,
        enemyHp: 0,
        log,
        outcome: 'victory',
        updatedBags: {
          physicalThreatBag: ctx.physicalThreatBag,
          magicalThreatBag: ctx.magicalThreatBag,
        },
      };
    }

    // Regular party attacks (excluding first strike characters who already attacked)
    const regularChars = characterStats.filter(cs => !hasFirstStrike(cs, phase));
    for (const cs of regularChars) {
      if (enemyHp <= 0) break;
      const { damage, arrowsUsed } = calculateCharacterDamage(phase, cs, enemy, partyStats, ctx);
      if (arrowsUsed > 0) consumeArrows(ctx, arrowsUsed);
      if (damage > 0) {
        enemyHp -= damage;
        const char = party.characters.find(c => c.id === cs.characterId);
        log.push({
          phase,
          actor: 'character',
          characterId: cs.characterId,
          action: `${char?.name ?? '???'} の攻撃！`,
          damage,
        });
      }
    }

    // Re-attack ability
    for (const cs of characterStats) {
      const reAttackCount = hasReAttack(cs);
      for (let i = 0; i < reAttackCount && enemyHp > 0; i++) {
        const { damage, arrowsUsed } = calculateCharacterDamage(phase, cs, enemy, partyStats, ctx);
        if (arrowsUsed > 0) consumeArrows(ctx, arrowsUsed);
        if (damage > 0) {
          enemyHp -= damage;
          const char = party.characters.find(c => c.id === cs.characterId);
          log.push({
            phase,
            actor: 'character',
            characterId: cs.characterId,
            action: `${char?.name ?? '???'} の連撃！`,
            damage,
            isReAttack: true,
          });
        }
      }
    }

    // Check if enemy is defeated
    if (enemyHp <= 0) {
      return {
        phase,
        partyHp,
        enemyHp: 0,
        log,
        outcome: 'victory',
        updatedBags: {
          physicalThreatBag: ctx.physicalThreatBag,
          magicalThreatBag: ctx.magicalThreatBag,
        },
      };
    }
  }

  // After all phases, determine outcome
  let outcome: BattleOutcome;
  if (partyHp <= 0) {
    outcome = 'defeat';
  } else if (enemyHp <= 0) {
    outcome = 'victory';
  } else {
    outcome = 'draw';
  }

  return {
    phase: 'close',
    partyHp: Math.max(0, partyHp),
    enemyHp: Math.max(0, enemyHp),
    log,
    outcome,
    updatedBags: {
      physicalThreatBag: ctx.physicalThreatBag,
      magicalThreatBag: ctx.magicalThreatBag,
    },
  };
}

export function calculateArrowRecovery(
  arrowsConsumed: number,
  characterStats: ComputedCharacterStats[]
): number {
  // Find the highest hunter ability level
  let maxHunterLevel = 0;
  for (const cs of characterStats) {
    const hunter = cs.abilities.find(a => a.id === 'hunter');
    if (hunter && hunter.level > maxHunterLevel) {
      maxHunterLevel = hunter.level;
    }
  }

  const recoveryRate = maxHunterLevel === 3 ? 0.36 : maxHunterLevel === 2 ? 0.30 : maxHunterLevel === 1 ? 0.20 : 0;
  return Math.floor(arrowsConsumed * recoveryRate);
}

// Calculate enemy attack values for all phases (for display)
// Shows raw attack values: rangedAttack/magicalAttack/meleeAttack
export function calculateEnemyAttackValues(
  enemy: EnemyDef,
  _partyStats: ComputedPartyStats
): string {
  const attacks = [
    enemy.rangedAttack,
    enemy.magicalAttack,
    enemy.meleeAttack,
  ];
  return attacks.join('/');
}
