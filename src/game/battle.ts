import {
  BattleState,
  BattlePhase,
  BattleLogEntry,
  BattleOutcome,
  ComputedPartyStats,
  ComputedCharacterStats,
  Character,
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

  if (resonanceLevel >= 5) {
    return 1.0 + (0.15 * (hitNumber - 1));
  }

  if (resonanceLevel === 4) {
    return 1.0 + (0.13 * (hitNumber - 1));
  }

  if (resonanceLevel === 3) {
    return 1.0 + (0.11 * (hitNumber - 1));
  }

  if (resonanceLevel === 2) {
    return 1.0 + (0.08 * (hitNumber - 1));
  }

  return 1.0 + (0.05 * (hitNumber - 1));
}

function getResonanceBonusPerHit(resonanceLevel: number | undefined): number {
  if (!resonanceLevel) {
    return 0;
  }

  if (resonanceLevel >= 5) return 15;
  if (resonanceLevel === 4) return 13;
  if (resonanceLevel === 3) return 11;
  if (resonanceLevel === 2) return 8;
  return 5;
}

function getResonanceLogText(
  phase: BattlePhase,
  charStats: ComputedCharacterStats,
  successfulHits: number
): string {
  if (phase !== 'mid' || successfulHits <= 0) {
    return '';
  }

  const resonance = charStats.abilities.find(a => a.id === 'resonance');
  if (!resonance) {
    return '';
  }

  const bonusPercent = getResonanceBonusPerHit(resonance.level) * successfulHits;
  return `(共鳴+${bonusPercent}%)`;
}

// Hit detection for physical attacks (LONG and CLOSE phases)
// decay_of_accuracy = clamp(0.86, 0.90 + actor.accuracy - opponent.evasion, 0.98)
// chance = d.accuracy_potency * (decay_of_accuracy)^(Nth_hit)
function hitDetection(
  actorAccuracyPotency: number,
  actorAccuracyBonus: number,
  opponentEvasionBonus: number,
  nthHit: number, // 1-indexed
  phase: BattlePhase,
  opponentHasDeflection: boolean
): boolean {
  const decayOfAccuracy = Math.max(0.86, Math.min(0.98, 0.90 + actorAccuracyBonus - opponentEvasionBonus));
  let baseChance = actorAccuracyPotency;
  if (opponentHasDeflection && phase === 'long') {
    baseChance -= 0.10;
  }
  const chance = Math.max(0.0, Math.min(1.0, baseChance)) * Math.pow(decayOfAccuracy, nthHit - 1);
  return Math.random() <= chance;
}

function calculateCharacterDamage(
  phase: BattlePhase,
  charStats: ComputedCharacterStats,
  character: Character,
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

  const getUniqueOffenseBonusSum = (kind: 'melee' | 'ranged' | 'magical'): number => {
    const appliedBonusNames = new Set<string>();
    let bonusSum = 0;

    for (const item of character.equipment) {
      if (!item) continue;
      const baseMultiplier = item.baseMultiplier ?? 1;
      if (baseMultiplier === 1) continue;

      const isRelevant = kind === 'melee'
        ? !!(item.meleeAttack || item.meleeNoA || item.meleeNoABonus)
        : kind === 'ranged'
          ? !!(item.rangedAttack || item.rangedNoA || item.rangedNoABonus)
          : !!(item.magicalAttack || item.magicalNoA || item.magicalNoABonus);
      if (!isRelevant) continue;

      const percent = Math.round((baseMultiplier - 1) * 1000) / 10;
      const bonusName = `c.${kind}_attack+${percent}`;
      if (appliedBonusNames.has(bonusName)) continue;
      appliedBonusNames.add(bonusName);
      bonusSum += baseMultiplier - 1;
    }

    return bonusSum;
  };

  // Offense amplifier: iaigiri scales with ability level on CLOSE phase
  const cBonus = phase === 'close'
    ? getUniqueOffenseBonusSum('melee')
    : phase === 'long'
      ? getUniqueOffenseBonusSum('ranged')
      : getUniqueOffenseBonusSum('magical');
  let offenseAmplifier = 1.0 + cBonus + charStats.deityOffenseAmplifierBonus;
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
    if (hitDetection(actorAccuracyPotency, charStats.accuracyBonus, enemyEvasion, i, phase, enemy.abilities.includes('deflection'))) {
      hits++;
      damage += Math.max(1, Math.floor(basePerHitDamage * getResonanceAmplifier(resonance?.level, hits)));
    }
  }

  return { damage, totalAttempts: noA, hits };
}

function getFirstStrikeLevel(charStats: ComputedCharacterStats): number {
  return charStats.abilities.find(a => a.id === 'first_strike')?.level ?? 0;
}

function rollInitiative(firstStrikeLevel: number): number {
  const diceCount = firstStrikeLevel >= 2 ? 3 : firstStrikeLevel === 1 ? 2 : 1;
  let total = 0;
  for (let i = 0; i < diceCount; i++) {
    total += Math.floor(Math.random() * 3) + 1;
  }
  return total;
}

function getEnemyFirstStrikeLevel(enemy: EnemyDef): number {
  return enemy.abilities.includes('first_strike') ? 1 : 0;
}

function hasDeflection(charStats: ComputedCharacterStats): boolean {
  return charStats.abilities.some(a => a.id === 'deflection');
}

function partyHasNullCounter(characterStats: ComputedCharacterStats[]): boolean {
  return characterStats.some(cs => cs.abilities.some(a => a.id === 'null_counter'));
}

function enemyHasCounter(enemy: EnemyDef): boolean {
  return enemy.abilities.includes('counter');
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
    classId: 'fighter' | 'lord' | 'sage',
    label: (level: number) => string,
    noteText: (level: number) => string,
  ): BattleLogEntry | null => {
    let bestLevel = 0;
    let ownerName: string | null = null;

    for (const char of party.characters) {
      if (char.mainClassId !== classId) continue;
      const level = char.subClassId === classId ? 2 : 1;
      if (level < bestLevel) continue;
      if (level > bestLevel || !ownerName) {
        bestLevel = level;
        ownerName = char.name;
      }
    }

    if (!ownerName || bestLevel === 0) return null;

    return {
      phase: 'long',
      actor: 'effect',
      action: `${ownerName}の ${label(bestLevel)}！`,
      note: noteText(bestLevel),
    };
  };

  const partyEffects = [
    createPartyEffectEntry('fighter', level => `守護者${level}`, level => `(パーティへの物理ダメージ × ${level === 2 ? '3/5' : '2/3'})`),
    createPartyEffectEntry('lord', level => `指揮${level}`, level => `(パーティ攻撃力 × ${level === 2 ? '1.6' : '1.3'})`),
    createPartyEffectEntry('sage', level => `魔法障壁${level}`, level => `(パーティへの魔法ダメージ × ${level === 2 ? '3/5' : '2/3'})`),
  ];

  for (const partyEffect of partyEffects) {
    if (partyEffect) {
      log.push(partyEffect);
    }
  }

  const triggerEnemyCounter = (targetCharStats: ComputedCharacterStats, dealtDamage: number, initiativeRoll: number): void => {
    if (dealtDamage <= 0 || !enemyHasCounter(enemy)) return;

    const nullifiedByParty = partyHasNullCounter(characterStats);
    const targetChar = party.characters.find(c => c.id === targetCharStats.characterId);

    if (nullifiedByParty) {
      const nullifier = party.characters.find(c => {
        const stats = characterStats.find(cs => cs.characterId === c.id);
        return stats?.abilities.some(a => a.id === 'null_counter');
      });
      log.push({
        phase: 'close',
        actor: 'effect',
        action: `${nullifier?.name ?? '味方'}の反撃無効化により、${enemy.name}のカウンターは防がれた！`,
      });
      return;
    }

    const singleDamage = calculateSingleEnemyAttackDamage('close', enemy, partyStats, targetCharStats);
    const attempts = Math.ceil(enemy.meleeNoA * 0.5);
    let damage = 0;
    let hits = 0;
    for (let i = 1; i <= attempts; i++) {
      const didHit = hitDetection(1.0, enemy.accuracyBonus, targetCharStats.evasionBonus, i, 'close', hasDeflection(targetCharStats));
      if (didHit) {
        hits += 1;
        damage += singleDamage;
      }
    }

    if (damage > 0) {
      partyHp -= damage;
    }

    log.push({
      phase: 'close',
      initiativeRoll,
      actor: 'enemy',
      action: `${targetChar?.name ?? '???'} にカウンター！`,
      damage: damage > 0 ? damage : undefined,
      hits,
      totalAttempts: attempts,
      isCounter: true,
      elementalOffense: enemy.elementalOffense,
    });
  };

  const phases: BattlePhase[] = ['long', 'mid', 'close'];

  for (const phase of phases) {
    const enemyInitiativeRoll = rollInitiative(getEnemyFirstStrikeLevel(enemy));
    const characterInitiative = characterStats.map(cs => ({
      stats: cs,
      roll: rollInitiative(getFirstStrikeLevel(cs)),
    }));

    const initiativeByCharacter = new Map<number, number>(
      characterInitiative.map(ci => [ci.stats.characterId, ci.roll])
    );

    const turnOrder: Array<{ kind: 'enemy'; roll: number } | { kind: 'character'; roll: number; stats: ComputedCharacterStats }> = [
      { kind: 'enemy', roll: enemyInitiativeRoll },
      ...characterInitiative.map(ci => ({ kind: 'character' as const, roll: ci.roll, stats: ci.stats })),
    ];

    turnOrder.sort((a, b) => {
      if (b.roll !== a.roll) return b.roll - a.roll;
      if (a.kind !== b.kind) return a.kind === 'enemy' ? -1 : 1;
      if (a.kind === 'character' && b.kind === 'character') {
        const aFront = a.stats.row <= 3;
        const bFront = b.stats.row <= 3;
        if (aFront !== bFront) return aFront ? -1 : 1;
        return a.stats.row - b.stats.row;
      }
      return 0;
    });

    for (const turn of turnOrder) {
      if (enemyHp <= 0 || partyHp <= 0) break;

      if (turn.kind === 'enemy') {
        const noA = getEnemyNoA(phase, enemy);
        if (noA <= 0) continue;

        const attacksByTarget = new Map<number, { damage: number; hits: number; totalAttempts: number; charStats: ComputedCharacterStats }>();
        const enemyAccuracyPotency = 1.0;
        const enemyAccuracyBonus = enemy.accuracyBonus;

        for (let i = 0; i < noA; i++) {
          const { row: targetRow, newCtx } = getTargetRow(ctx, phase);
          ctx = newCtx;
          const targetCharStats = characterStats.find(cs => cs.row === targetRow);
          if (!targetCharStats) continue;

          const singleDamage = calculateSingleEnemyAttackDamage(phase, enemy, partyStats, targetCharStats);
          const existing = attacksByTarget.get(targetCharStats.characterId);
          const didHit = hitDetection(enemyAccuracyPotency, enemyAccuracyBonus, targetCharStats.evasionBonus, i + 1, phase, hasDeflection(targetCharStats));

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

        for (const [charId, attack] of attacksByTarget) {
          const targetChar = party.characters.find(c => c.id === charId);
          const attackName = phase === 'mid' ? '魔法攻撃' : '攻撃';

          if (attack.damage > 0) {
            partyHp -= attack.damage;
          }

          log.push({
            phase,
            initiativeRoll: turn.roll,
            actor: 'enemy',
            action: `${targetChar?.name ?? '???'} に${attackName}！`,
            damage: attack.damage > 0 ? attack.damage : undefined,
            hits: attack.hits,
            totalAttempts: attack.totalAttempts,
            elementalOffense: enemy.elementalOffense,
          });

          if (partyHp <= 0 || enemyHp <= 0) continue;
          if (attack.damage <= 0 || !hasCounter(attack.charStats, phase)) continue;

          if (enemy.abilities.includes('null_counter')) {
            log.push({
              phase,
              actor: 'effect',
              action: `${enemy.name}の反撃無効化により、${targetChar?.name ?? '???'}のカウンターは防がれた！`,
            });
            continue;
          }

          const attackChar = party.characters.find(c => c.id === charId);
          if (!attackChar) continue;

          const counterResult = calculateCharacterDamage(phase, attack.charStats, attackChar, enemy, partyStats, 0.5);
          if (counterResult.totalAttempts <= 0) continue;

          if (counterResult.damage > 0) {
            enemyHp -= counterResult.damage;
          }

          const counterType = phase === 'mid' ? '魔法カウンター' : 'カウンター';
          const resonanceLogText = getResonanceLogText(phase, attack.charStats, counterResult.hits);
          log.push({
            phase,
            initiativeRoll: initiativeByCharacter.get(charId),
            actor: 'character',
            characterId: charId,
            action: `${targetChar?.name ?? '???'} の${counterType}！${resonanceLogText}`,
            damage: counterResult.damage,
            hits: counterResult.hits,
            totalAttempts: counterResult.totalAttempts,
            isCounter: true,
            elementalOffense: attack.charStats.elementalOffense,
          });
        }

        continue;
      }

      const cs = turn.stats;
      const char = party.characters.find(c => c.id === cs.characterId);
      if (!char) continue;

      const runCharacterAttack = (noAMultiplier: number, isReAttack = false) => {
        const result = calculateCharacterDamage(phase, cs, char, enemy, partyStats, noAMultiplier);
        if (result.totalAttempts <= 0) return;

        if (result.damage > 0) {
          enemyHp -= result.damage;
        }

        const attackType = isReAttack
          ? (phase === 'mid' ? '魔法連撃' : '連撃')
          : (phase === 'mid' ? '魔法攻撃' : '攻撃');
        const resonanceLogText = getResonanceLogText(phase, cs, result.hits);
        log.push({
          phase,
          initiativeRoll: turn.roll,
          actor: 'character',
          characterId: cs.characterId,
          action: `${char.name} の${attackType}！${resonanceLogText}`,
          damage: result.damage,
          hits: result.hits,
          totalAttempts: result.totalAttempts,
          isReAttack: isReAttack || undefined,
          elementalOffense: cs.elementalOffense,
        });

        if (enemyHp > 0 && phase === 'close') {
          triggerEnemyCounter(cs, result.damage, enemyInitiativeRoll);
        }
      };

      runCharacterAttack(1.0, false);
      if (enemyHp <= 0 || partyHp <= 0) continue;

      const reAttackCount = hasReAttack(cs);
      for (let i = 0; i < reAttackCount && enemyHp > 0 && partyHp > 0; i++) {
        runCharacterAttack(0.5, true);
      }
    }

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
