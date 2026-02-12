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

interface BattleContext {
  partyStats: ComputedPartyStats;
  characterStats: ComputedCharacterStats[];
  enemy: EnemyDef;
  party: Party;
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
      defenseAmplifier = Math.max(0.01, targetCharStats.physicalDefenseAmplifier + targetCharStats.deityDefenseAmplifierBonus.physical);
      break;
    case 'mid':
      attack = enemy.magicalAttack;
      amplifier = enemy.magicalAttackAmplifier;
      defense = targetCharStats.magicalDefense;
      defenseAmplifier = Math.max(0.01, targetCharStats.magicalDefenseAmplifier + targetCharStats.deityDefenseAmplifierBonus.magical);
      break;
    case 'close':
      attack = enemy.meleeAttack;
      amplifier = enemy.meleeAttackAmplifier;
      defense = targetCharStats.physicalDefense;
      defenseAmplifier = Math.max(0.01, targetCharStats.physicalDefenseAmplifier + targetCharStats.deityDefenseAmplifierBonus.physical);
      break;
  }

  if (attack === 0) return 0;

  const elementalMultiplier = getElementalMultiplier(
    enemy.elementalOffense,
    partyStats.elementalResistance
  );

  const partyDefenseAbilityAmplifier = getPartyDefenseAbilityAmplifier(phase, partyStats);
  const rawDamage = (attack - defense) * amplifier * elementalMultiplier * defenseAmplifier * partyDefenseAbilityAmplifier;
  const totalDamage = Math.max(1, rawDamage);

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


function getPartyDefenseAbilityAmplifier(phase: BattlePhase, partyStats: ComputedPartyStats): number {
  if (phase === 'mid') {
    return partyStats.defenseAmplifiers.magical;
  }
  return partyStats.defenseAmplifiers.physical;
}


interface CharacterAttackResult {
  damage: number;
  totalAttempts: number;
  hits: number;
}


function getResonanceAmplifier(resonanceLevel: number | undefined, hitNumber: number): number {
  if (!resonanceLevel || hitNumber <= 1) {
    return 1.0;
  }

  if (resonanceLevel >= 3) {
    return 1.0 + (0.11 * (hitNumber - 1));
  }

  if (resonanceLevel === 2) {
    return 1.0 + (0.08 * (hitNumber - 1));
  }

  return 1.0 + (0.05 * (hitNumber - 1));
}

// Hit detection for physical attacks (LONG and CLOSE phases)
// decay_of_accuracy = clamp(0.86, 0.90 + actor.accuracy - opponent.evasion, 0.98)
// chance = d.accuracy_potency * (decay_of_accuracy)^(Nth_hit)
function hitDetection(
  actorAccuracyPotency: number,
  actorAccuracyBonus: number,
  opponentEvasionBonus: number,
  nthHit: number // 1-indexed
): boolean {
  const decayOfAccuracy = Math.max(0.86, Math.min(0.98, 0.90 + actorAccuracyBonus - opponentEvasionBonus));
  const chance = actorAccuracyPotency * Math.pow(decayOfAccuracy, nthHit);
  return Math.random() <= chance;
}

function calculateCharacterDamage(
  phase: BattlePhase,
  charStats: ComputedCharacterStats,
  enemy: EnemyDef,
  partyStats: ComputedPartyStats,
  noAMultiplier: number = 1.0 // For counter/re-attack, use 0.5
): CharacterAttackResult {
  let attack = 0;
  let noA = 0;
  let defense = 0;
  let defenseAmplifier = enemy.defenseAmplifier;

  switch (phase) {
    case 'long':
      attack = charStats.rangedAttack;
      noA = charStats.rangedNoA;
      defense = enemy.physicalDefense;
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

  // Apply NoA multiplier and round up
  noA = Math.ceil(noA * noAMultiplier);

  if (noA === 0 || attack <= 0) return { damage: 0, totalAttempts: 0, hits: 0 };

  // Apply penetration
  const effectiveDefense = defense * (1 - charStats.penetMultiplier);

  // Offense amplifier: iaigiri scales with ability level on CLOSE phase
  let offenseAmplifier = 1.0 + charStats.deityOffenseAmplifierBonus;
  const iaigiri = charStats.abilities.find(a => a.id === 'iaigiri');
  if (iaigiri && phase === 'close') {
    offenseAmplifier *= iaigiri.level >= 2 ? 2.5 : 2.0;
  }

  const resonance = charStats.abilities.find(a => a.id === 'resonance');

  const elementalMultiplier = getElementalMultiplier(
    charStats.elementalOffense,
    enemy.elementalResistance
  );

  const basePerHitDamage = Math.max(1, Math.floor(
    (attack - effectiveDefense) * offenseAmplifier * charStats.elementalOffenseValue *
    elementalMultiplier * defenseAmplifier * (phase === 'mid' ? 1.0 : partyStats.offenseAmplifier)
  ));

  // All phases now use hit detection.
  // MID phase ignores row-based accuracy potency and uses fixed potency (1.0).
  const actorAccuracyPotency = phase === 'mid' ? 1.0 : charStats.accuracyPotency;
  const enemyEvasion = enemy.evasionBonus;

  let hits = 0;
  let damage = 0;
  for (let i = 1; i <= noA; i++) {
    if (hitDetection(actorAccuracyPotency, charStats.accuracyBonus, enemyEvasion, i)) {
      hits++;
      damage += Math.max(1, Math.floor(basePerHitDamage * getResonanceAmplifier(resonance?.level, i)));
    }
  }

  return { damage, totalAttempts: noA, hits };
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

// Hit detection functions are available for future use when implementing
// per-hit accuracy rolls. Currently the game uses deterministic damage calculation.

export interface BattleResult extends BattleState {
  updatedBags: {
    physicalThreatBag: RandomBag;
    magicalThreatBag: RandomBag;
  };
}

export function executeBattle(
  party: Party,
  enemy: EnemyDef,
  bags: GameBags,
  initialPartyHp?: number // Optional: for HP persistence during expedition
): BattleResult {
  const { partyStats, characterStats } = computePartyStats(party);

  let ctx: BattleContext = {
    partyStats,
    characterStats,
    enemy,
    party,
    physicalThreatBag: { ...bags.physicalThreatBag },
    magicalThreatBag: { ...bags.magicalThreatBag },
  };

  // Use provided HP if available (for HP persistence), otherwise use max HP
  let partyHp = initialPartyHp !== undefined ? initialPartyHp : partyStats.hp;
  let enemyHp = enemy.hp;
  const log: BattleLogEntry[] = [];

  const createPartyEffectEntry = (
    abilityId: 'defender' | 'command' | 'm_barrier',
    label: string,
    noteText: (level: number) => string,
  ): BattleLogEntry | null => {
    let bestLevel = 0;
    let ownerName: string | null = null;

    for (const cs of characterStats) {
      const ability = cs.abilities.find(a => a.id === abilityId);
      if (!ability || ability.level < bestLevel) continue;
      const char = party.characters.find(c => c.id === cs.characterId);
      if (ability.level > bestLevel || !ownerName) {
        bestLevel = ability.level;
        ownerName = char?.name ?? '???';
      }
    }

    if (!ownerName || bestLevel === 0) return null;

    return {
      phase: 'long',
      actor: 'effect',
      action: `${ownerName}の ${label}！`,
      note: noteText(bestLevel),
    };
  };

  const partyEffects = [
    createPartyEffectEntry('defender', '守護者', level => `(パーティへの物理ダメージ × ${level === 2 ? '3/5' : '2/3'})`),
    createPartyEffectEntry('command', '指揮', level => `(パーティ攻撃力 × ${level === 2 ? '1.6' : '1.3'})`),
    createPartyEffectEntry('m_barrier', '魔法障壁', level => `(パーティへの魔法ダメージ × ${level === 2 ? '3/5' : '2/3'})`),
  ];

  for (const partyEffect of partyEffects) {
    if (partyEffect) {
      log.push(partyEffect);
    }
  }

  const phases: BattlePhase[] = ['long', 'mid', 'close'];

  for (const phase of phases) {
    // First strike characters act first
    const firstStrikeChars = characterStats.filter(cs => hasFirstStrike(cs, phase));
    for (const cs of firstStrikeChars) {
      if (enemyHp <= 0) break;
      const result = calculateCharacterDamage(phase, cs, enemy, partyStats);
      if (result.totalAttempts > 0) {
        if (result.damage > 0) {
          enemyHp -= result.damage;
        }
        const char = party.characters.find(c => c.id === cs.characterId);
        const attackType = phase === 'mid' ? '魔法先制攻撃' : '先制攻撃';
        log.push({
          phase,
          actor: 'character',
          characterId: cs.characterId,
          action: `${char?.name ?? '???'} の${attackType}！`,
          damage: result.damage,
          hits: result.hits,
          totalAttempts: result.totalAttempts,
          isFirstStrike: true,
          elementalOffense: cs.elementalOffense,
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
    // Nth_hit is global for all enemy attacks in this phase
    const noA = getEnemyNoA(phase, enemy);

    // Track attacks grouped by target: Map<characterId, { damage, hits, totalAttempts, charStats }>
    const attacksByTarget = new Map<number, { damage: number; hits: number; totalAttempts: number; charStats: ComputedCharacterStats }>();

    // Enemy accuracy potency (currently fixed row-equivalent)
    const enemyAccuracyPotency = 1.0;
    const enemyAccuracyBonus = enemy.accuracyBonus;

    for (let i = 0; i < noA; i++) {
      const { row: targetRow, newCtx } = getTargetRow(ctx, phase);
      ctx = newCtx;
      const targetCharStats = characterStats.find(cs => cs.row === targetRow);

      if (targetCharStats) {
        const singleDamage = calculateSingleEnemyAttackDamage(phase, enemy, partyStats, targetCharStats);
        const existing = attacksByTarget.get(targetCharStats.characterId);

        // All phases use hit detection for enemy attacks as well.
        // Enemy d.accuracy_potency is fixed at 1.0 in all phases.
        // Nth_hit is (i + 1) - global across all enemy attacks.
        const didHit = hitDetection(enemyAccuracyPotency, enemyAccuracyBonus, targetCharStats.evasionBonus, i + 1);

        if (existing) {
          existing.totalAttempts += 1;
          if (didHit) {
            existing.damage += singleDamage;
            existing.hits += 1;
          }
        } else {
          attacksByTarget.set(targetCharStats.characterId, {
            damage: didHit ? singleDamage : 0,
            hits: didHit ? 1 : 0,
            totalAttempts: 1,
            charStats: targetCharStats,
          });
        }
      }
    }

    // Apply damage and generate logs grouped by target
    let totalEnemyDamage = 0;
    for (const [charId, attack] of attacksByTarget) {
      const targetChar = party.characters.find(c => c.id === charId);
      const attackName = phase === 'mid' ? '魔法攻撃' : '攻撃';

      if (attack.damage > 0) {
        partyHp -= attack.damage;
        totalEnemyDamage += attack.damage;
      }

      // Always log the attack attempt (even if all missed)
      log.push({
        phase,
        actor: 'enemy',
        action: `${targetChar?.name ?? '???'} に${attackName}！`,
        damage: attack.damage > 0 ? attack.damage : undefined,
        hits: attack.hits,
        totalAttempts: attack.totalAttempts,
        elementalOffense: enemy.elementalOffense,
      });
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
    // Counter uses NoA x 0.5 (rounded up)
    for (const [charId, attack] of attacksByTarget) {
      if (attack.damage > 0 && hasCounter(attack.charStats, phase)) {
        const result = calculateCharacterDamage(phase, attack.charStats, enemy, partyStats, 0.5);
        if (result.totalAttempts > 0) {
          if (result.damage > 0) {
            enemyHp -= result.damage;
          }
          const targetChar = party.characters.find(c => c.id === charId);
          const counterType = phase === 'mid' ? '魔法カウンター' : 'カウンター';
          log.push({
            phase,
            actor: 'character',
            characterId: charId,
            action: `${targetChar?.name ?? '???'} の${counterType}！`,
            damage: result.damage,
            hits: result.hits,
            totalAttempts: result.totalAttempts,
            isCounter: true,
            elementalOffense: attack.charStats.elementalOffense,
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
      const result = calculateCharacterDamage(phase, cs, enemy, partyStats);
      if (result.totalAttempts > 0) {
        if (result.damage > 0) {
          enemyHp -= result.damage;
        }
        const char = party.characters.find(c => c.id === cs.characterId);
        const attackType = phase === 'mid' ? '魔法攻撃' : '攻撃';
        log.push({
          phase,
          actor: 'character',
          characterId: cs.characterId,
          action: `${char?.name ?? '???'} の${attackType}！`,
          damage: result.damage,
          hits: result.hits,
          totalAttempts: result.totalAttempts,
          elementalOffense: cs.elementalOffense,
        });
      }
    }

    // Re-attack ability
    // Re-attack uses NoA x 0.5 (rounded up)
    for (const cs of characterStats) {
      const reAttackCount = hasReAttack(cs);
      for (let i = 0; i < reAttackCount && enemyHp > 0; i++) {
        const result = calculateCharacterDamage(phase, cs, enemy, partyStats, 0.5);
        if (result.totalAttempts > 0) {
          if (result.damage > 0) {
            enemyHp -= result.damage;
          }
          const char = party.characters.find(c => c.id === cs.characterId);
          const reAttackType = phase === 'mid' ? '魔法連撃' : '連撃';
          log.push({
            phase,
            actor: 'character',
            characterId: cs.characterId,
            action: `${char?.name ?? '???'} の${reAttackType}！`,
            damage: result.damage,
            hits: result.hits,
            totalAttempts: result.totalAttempts,
            isReAttack: true,
            elementalOffense: cs.elementalOffense,
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
