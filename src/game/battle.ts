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
  AbilityId,
} from '../types';
import { computePartyStats } from './partyComputation';
import { getBaseMultiplier } from './baseMultiplier';
import { drawFromBag, createPhysicalThreatBag, createMagicalThreatBag, getBagTicketTotal } from './bags';
import { getDeityKey } from './deity';
import { resolveMagicProfile } from './magic';

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

function getCharacterRageAmplifier(charStats: ComputedCharacterStats, partyHp: number, maxPartyHp: number): number {
  const rageLevel = charStats.abilities.find(a => a.id === 'rage')?.level ?? 0;
  if (rageLevel <= 0) return 1.0;
  if (maxPartyHp <= 0) return 1.0;
  const hpRatio = Math.max(0, Math.min(1, partyHp / maxPartyHp));
  const multiplierPerDamageRate = rageLevel >= 2 ? 1.2 : 1.0;
  return Math.min(2.0, 1.0 + (multiplierPerDamageRate * (1.0 - hpRatio)));
}

function getEnemyRageAmplifier(enemy: EnemyDef, enemyHp: number): number {
  const rageLevel = getEnemyAbilityLevel(enemy, 'rage');
  if (rageLevel <= 0) return 1.0;
  if (enemy.hp <= 0) return 1.0;
  const hpRatio = Math.max(0, Math.min(1, enemyHp / enemy.hp));
  const multiplierPerDamageRate = rageLevel >= 2 ? 1.2 : 1.0;
  return Math.min(2.0, 1.0 + (multiplierPerDamageRate * (1.0 - hpRatio)));
}

function toRageBonusPercent(rageAmplifier: number): number {
  return Math.max(0, Math.round((rageAmplifier - 1.0) * 100));
}



function hasStealth(charStats: ComputedCharacterStats): boolean {
  return charStats.abilities.some(a => a.id === 'stealth');
}

function getStealthLevel(charStats: ComputedCharacterStats): number {
  return charStats.abilities.find(a => a.id === 'stealth')?.level ?? 0;
}

function hasIllusion(charStats: ComputedCharacterStats): boolean {
  return charStats.abilities.some(a => a.id === 'illusion');
}

function getIllusionLevel(charStats: ComputedCharacterStats): number {
  return charStats.abilities.find(a => a.id === 'illusion')?.level ?? 0;
}

function partyHasIllusionLevel(characterStats: ComputedCharacterStats[], requiredLevel: number): boolean {
  return characterStats.some(cs => getIllusionLevel(cs) >= requiredLevel);
}

function isIllusionActive(
  phase: BattlePhase,
  hasIllusionAbility: boolean,
  illusionStateId: string,
  consumedIllusionStateIds: Set<string>,
): boolean {
  return phase === 'long' && hasIllusionAbility && !consumedIllusionStateIds.has(illusionStateId);
}

function isPartyIllusionActive(
  phase: BattlePhase,
  characterStats: ComputedCharacterStats[],
  consumedPartyIllusion: boolean,
): boolean {
  return phase === 'long' && !consumedPartyIllusion && partyHasIllusionLevel(characterStats, 2);
}

function isStealthActive(charStats: ComputedCharacterStats, partyHp: number, maxPartyHp: number): boolean {
  if (!hasStealth(charStats)) return false;
  if (maxPartyHp <= 0) return false;
  const threshold = getStealthLevel(charStats) >= 2 ? 0.29 : 0.24;
  return (partyHp / maxPartyHp) <= threshold;
}

function hasBulwark(charStats: ComputedCharacterStats): boolean {
  return charStats.abilities.some(a => a.id === 'bulwark');
}

function getBulwarkLevel(charStats: ComputedCharacterStats): number {
  return charStats.abilities.find(a => a.id === 'bulwark')?.level ?? 0;
}

function resolveEnemyTarget(
  targetRow: number,
  characterStats: ComputedCharacterStats[],
  phase: BattlePhase
): ComputedCharacterStats | null {
  const selectedTarget = characterStats.find(cs => cs.row === targetRow);
  if (!selectedTarget) return null;

  const allowsBulwarkRedirect = phase === 'long' || phase === 'close';
  if (!allowsBulwarkRedirect) {
    return selectedTarget;
  }

  const frontCharacter = characterStats.find(cs => cs.row === selectedTarget.row - 1);
  const frontBulwarkLevel = frontCharacter ? getBulwarkLevel(frontCharacter) : 0;
  if (
    frontCharacter
    && hasBulwark(frontCharacter)
    && (
      phase === 'long'
      || (phase === 'close' && frontBulwarkLevel >= 2)
    )
  ) {
    return frontCharacter;
  }

  return selectedTarget;
}

function getCharacterMomentumAmplifier(charStats: ComputedCharacterStats, partyHp: number, maxPartyHp: number): number {
  const momentumLevel = charStats.abilities.find(a => a.id === 'momentum')?.level ?? 0;
  if (momentumLevel <= 0) return 1.0;
  if (maxPartyHp <= 0) return 1.0;
  const hpRatio = Math.max(0, Math.min(1, partyHp / maxPartyHp));
  if (momentumLevel >= 2) {
    return 1.5 - ((1.0 - hpRatio) * 0.75);
  }
  return Math.max(0.5, 1.5 - (1.0 - hpRatio));
}

function toMomentumBonusPercent(momentumAmplifier: number): number {
  return Math.round((momentumAmplifier - 1.0) * 100);
}

// Get target row index (1-6) using threat bag
function getTargetRow(ctx: BattleContext, phase: BattlePhase): { row: number; newCtx: BattleContext } {
  const isPhysical = phase === 'long' || phase === 'close';

  // Refill bag if empty
  let bag = isPhysical ? ctx.physicalThreatBag : ctx.magicalThreatBag;
  if (getBagTicketTotal(bag) === 0) {
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
  targetCharStats: ComputedCharacterStats,
  enemyHp: number
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

  const elementalMultiplier = enemy.elementalOffense === 'none'
    ? 1.0
    : targetCharStats.elementalDefenseMultipliers[enemy.elementalOffense] ?? 1.0;

  const partyDefenseAbilityAmplifier = getPartyDefenseAbilityAmplifier(phase, partyStats);
  const rageAmplifier = getEnemyRageAmplifier(enemy, enemyHp);
  const rawDamage = (attack - defense) * amplifier * elementalMultiplier * defenseAmplifier * partyDefenseAbilityAmplifier * rageAmplifier;
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

function calculateCharacterFriendlyFireDamage(
  phase: BattlePhase,
  attacker: ComputedCharacterStats,
  target: ComputedCharacterStats,
  partyStats: ComputedPartyStats,
  partyHp: number,
  noAMultiplier: number = 1.0
): CharacterAttackResult {
  let attack = 0;
  let noA = 0;
  let defense = 0;
  let defenseAmplifier = 1.0;

  if (phase === 'long') {
    attack = attacker.rangedAttack;
    noA = attacker.rangedNoA;
    defense = target.physicalDefense;
    defenseAmplifier = Math.max(0.01, target.physicalDefenseAmplifier + target.deityDefenseAmplifierBonus.physical);
  } else if (phase === 'mid') {
    attack = attacker.magicalAttack;
    noA = attacker.magicalNoA;
    defense = target.magicalDefense;
    defenseAmplifier = Math.max(0.01, target.magicalDefenseAmplifier + target.deityDefenseAmplifierBonus.magical);
  } else {
    attack = attacker.meleeAttack;
    noA = attacker.meleeNoA;
    defense = target.physicalDefense;
    defenseAmplifier = Math.max(0.01, target.physicalDefenseAmplifier + target.deityDefenseAmplifierBonus.physical);
  }

  noA = Math.ceil(noA * noAMultiplier);
  if (noA <= 0 || attack <= 0) return { damage: 0, totalAttempts: 0, hits: 0 };

  const effectiveDefense = defense * (1 - attacker.penetMultiplier);
  const phaseAttackScale = phase === 'mid'
    ? getBaseMultiplier(attacker.baseStats.intelligence, 'attack')
    : getBaseMultiplier(attacker.baseStats.strength, 'attack');

  const iaigiri = attacker.abilities.find(a => a.id === 'iaigiri');
  const iaigiriMultiplier = iaigiri ? (iaigiri.level >= 3 ? 3.0 : iaigiri.level >= 2 ? 2.5 : 2.0) : 1.0;
  const phaseBonusSum = phase === 'mid'
    ? attacker.magicalAttackCBonus
    : (phase === 'long' ? attacker.rangedAttackCBonus : attacker.meleeAttackCBonus);

  let offenseAmplifier = 1.0;
  if (phase === 'mid') {
    offenseAmplifier = ((1.0 + phaseBonusSum) * attacker.magicalOffenseMultiplier + attacker.deityOffenseAmplifierBonus) * phaseAttackScale;
  } else if (iaigiri) {
    offenseAmplifier = (iaigiriMultiplier * (1.0 + phaseBonusSum) * attacker.physicalOffenseMultiplier + attacker.deityOffenseAmplifierBonus) * phaseAttackScale;
  } else {
    offenseAmplifier = ((1.0 + phaseBonusSum + attacker.physicalAttackCBonus) * attacker.physicalOffenseMultiplier + attacker.deityOffenseAmplifierBonus) * phaseAttackScale;
  }

  const elementalMultiplier = attacker.elementalOffense === 'none'
    ? 1.0
    : target.elementalDefenseMultipliers[attacker.elementalOffense] ?? 1.0;

  const rageAmplifier = getCharacterRageAmplifier(attacker, partyHp, partyStats.hp);
  const momentumAmplifier = getCharacterMomentumAmplifier(attacker, partyHp, partyStats.hp);

  const basePerHitDamage = Math.max(1, Math.floor(
    (attack - effectiveDefense)
      * offenseAmplifier
      * attacker.elementalOffenseValue
      * elementalMultiplier
      * defenseAmplifier
      * partyStats.offenseAmplifier
      * rageAmplifier
      * momentumAmplifier
  ));

  const actorAccuracyPotency = phase === 'mid' ? 1.0 : attacker.accuracyPotency;
  const actorFocusLevel = attacker.abilities.find(a => a.id === 'focus')?.level ?? 0;
  const targetDeflectionLevel = getDeflectionLevel(target);
  const resonance = attacker.abilities.find(a => a.id === 'resonance');

  let hits = 0;
  let damage = 0;
  for (let i = 1; i <= noA; i++) {
    if (hitDetection(actorAccuracyPotency, attacker.accuracyBonus, target.evasionBonus, i, phase, targetDeflectionLevel, actorFocusLevel)) {
      hits += 1;
      damage += Math.max(1, Math.floor(basePerHitDamage * getResonanceAmplifier(resonance?.level, hits)));
    }
  }

  return { damage, totalAttempts: noA, hits };
}


interface CharacterAttackResult {
  damage: number;
  totalAttempts: number;
  hits: number;
  wasNegatedByEnemyIllusion?: boolean;
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
  actorAbilities: Array<{ id: AbilityId; level: number }>,
  successfulHits: number
): string {
  if (phase !== 'mid' || successfulHits <= 0) {
    return '';
  }

  const resonance = actorAbilities.find(a => a.id === 'resonance');
  if (!resonance) {
    return '';
  }

  const bonusPercent = getResonanceBonusPerHit(resonance.level) * successfulHits;
  return `(共鳴+${bonusPercent}%)`;
}

// Hit detection for physical attacks (LONG and CLOSE phases)
// decay_of_accuracy = clamp(0.86, 0.90 + actor.accuracy - opponent.evasion, 0.98)
// chance = d.accuracy_potency * (decay_of_accuracy)^(Nth_hit - 1)
function roundUpToThirdDecimal(value: number): number {
  return Math.ceil((value + Number.EPSILON) * 1000) / 1000;
}

function hitDetection(
  actorAccuracyPotency: number,
  actorAccuracyBonus: number,
  opponentEvasionBonus: number,
  nthHit: number, // 1-indexed
  phase: BattlePhase,
  opponentDeflectionLevel: number,
  actorFocusLevel: number
): boolean {
  const focusMultiplier = actorFocusLevel >= 2 ? 1.3 : actorFocusLevel >= 1 ? 1.2 : 1.0;
  const effectiveAccuracyBonus = actorFocusLevel > 0
    ? roundUpToThirdDecimal(actorAccuracyBonus * focusMultiplier)
    : actorAccuracyBonus;
  const decayOfAccuracy = Math.max(0.86, Math.min(0.98, 0.90 + effectiveAccuracyBonus - opponentEvasionBonus));
  let baseChance = actorAccuracyPotency;
  if (phase === 'long') {
    if (opponentDeflectionLevel >= 2) {
      baseChance -= 0.15;
    } else if (opponentDeflectionLevel >= 1) {
      baseChance -= 0.10;
    }
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
  partyHp: number,
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

  const getUniqueOffenseBonusSum = (
    kind: 'melee' | 'ranged' | 'magical',
    appliedBonusNames: Set<string>
  ): number => {
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

  const iaigiri = charStats.abilities.find(a => a.id === 'iaigiri');
  const iaigiriMultiplier = iaigiri
    ? iaigiri.level >= 3
      ? 3.0
      : iaigiri.level >= 2
        ? 2.5
        : 2.0
    : 1.0;
  const appliedOffenseBonusNames = new Set<string>(charStats.offenseCBonusNames);
  const meleeBonusSum = charStats.meleeAttackCBonus + getUniqueOffenseBonusSum('melee', appliedOffenseBonusNames);
  const rangedBonusSum = charStats.rangedAttackCBonus + getUniqueOffenseBonusSum('ranged', appliedOffenseBonusNames);
  const magicalBonusSum = charStats.magicalAttackCBonus + getUniqueOffenseBonusSum('magical', appliedOffenseBonusNames);

  const phaseAttackScale = phase === 'mid'
    ? getBaseMultiplier(charStats.baseStats.intelligence, 'attack')
    : getBaseMultiplier(charStats.baseStats.strength, 'attack');

  let offenseAmplifier = 1;
  if (phase === 'mid') {
    offenseAmplifier = ((1.0 + magicalBonusSum) * charStats.magicalOffenseMultiplier + charStats.deityOffenseAmplifierBonus) * phaseAttackScale;
  } else if (iaigiri) {
    const phaseBonusSum = phase === 'long' ? rangedBonusSum : meleeBonusSum;
    offenseAmplifier = (iaigiriMultiplier * (1.0 + phaseBonusSum) * charStats.physicalOffenseMultiplier + charStats.deityOffenseAmplifierBonus) * phaseAttackScale;
  } else {
    const phaseBonusSum = phase === 'long' ? rangedBonusSum : meleeBonusSum;
    const physicalBonusSum = phaseBonusSum + charStats.physicalAttackCBonus;
    offenseAmplifier = ((1.0 + physicalBonusSum) * charStats.physicalOffenseMultiplier + charStats.deityOffenseAmplifierBonus) * phaseAttackScale;
  }

  const resonance = charStats.abilities.find(a => a.id === 'resonance');

  const elementalMultiplier = getElementalMultiplier(
    charStats.elementalOffense,
    enemy.elementalResistance
  );

  const rageAmplifier = getCharacterRageAmplifier(charStats, partyHp, partyStats.hp);
  const momentumAmplifier = getCharacterMomentumAmplifier(charStats, partyHp, partyStats.hp);

  const basePerHitDamage = Math.max(1, Math.floor(
    (attack - effectiveDefense) * offenseAmplifier * charStats.elementalOffenseValue *
    elementalMultiplier * defenseAmplifier * partyStats.offenseAmplifier * rageAmplifier * momentumAmplifier
  ));

  // All phases now use hit detection.
  // MID phase ignores row-based accuracy potency and uses fixed potency (1.0).
  const actorAccuracyPotency = phase === 'mid' ? 1.0 : charStats.accuracyPotency;
  const enemyEvasion = enemy.evasionBonus;

  const actorFocusLevel = charStats.abilities.find(a => a.id === 'focus')?.level ?? 0;
  const enemyDeflectionLevel = getEnemyAbilityLevel(enemy, 'deflection');

  let hits = 0;
  let damage = 0;
  for (let i = 1; i <= noA; i++) {
    if (hitDetection(actorAccuracyPotency, charStats.accuracyBonus, enemyEvasion, i, phase, enemyDeflectionLevel, actorFocusLevel)) {
      hits++;
      damage += Math.max(1, Math.floor(basePerHitDamage * getResonanceAmplifier(resonance?.level, hits)));
    }
  }

  return { damage, totalAttempts: noA, hits };
}

function getFirstStrikeLevel(charStats: ComputedCharacterStats): number {
  return charStats.abilities.find(a => a.id === 'first_strike')?.level ?? 0;
}

function rollInitiative(firstStrikeLevel: number, bonus = 0): number {
  const diceCount = firstStrikeLevel >= 3 ? 4 : firstStrikeLevel >= 2 ? 3 : firstStrikeLevel === 1 ? 2 : 1;
  let total = 0;
  for (let i = 0; i < diceCount; i++) {
    total += Math.floor(Math.random() * 3) + 1;
  }

  return Math.min(9, total + bonus);
}

function getEnemyFirstStrikeLevel(enemy: EnemyDef): number {
  return getEnemyAbilityLevel(enemy, 'first_strike');
}

function getDeflectionLevel(charStats: ComputedCharacterStats): number {
  return charStats.abilities.find(a => a.id === 'deflection')?.level ?? 0;
}

function getEnemyFocusLevel(enemy: EnemyDef): number {
  return getEnemyAbilityLevel(enemy, 'focus');
}

type AbilityLike = { id: AbilityId; level: number };

function getAbilityLevelFromList(abilities: AbilityLike[], abilityId: AbilityId): number {
  return abilities.find((ability) => ability.id === abilityId)?.level ?? 0;
}

function getEnemyAbilityLevel(enemy: EnemyDef, abilityId: AbilityId): number {
  return getAbilityLevelFromList(enemy.abilities, abilityId);
}

function getCounterNoAMultiplierForLevel(level: number): number {
  if (level <= 0) return 0;
  if (level >= 3) return 1.5;
  if (level === 2) return 1.0;
  return 0.5;
}

function getTierTwoNoAMultiplierForLevel(level: number): number {
  if (level <= 0) return 0;
  return level >= 2 ? 1.0 : 0.5;
}

function createNullCounterPool(characterStats: ComputedCharacterStats[]): Map<number, number> {
  const pool = new Map<number, number>();
  for (const stats of characterStats) {
    const level = getAbilityLevel(stats, 'null_counter');
    if (level <= 0) continue;
    pool.set(stats.characterId, Math.min(3, level));
  }
  return pool;
}

function getAvailableNullCounterOwner(
  characterStats: ComputedCharacterStats[],
  remainingNullCounterByCharacterId: Map<number, number>,
): ComputedCharacterStats | null {
  for (const stats of characterStats) {
    if ((remainingNullCounterByCharacterId.get(stats.characterId) ?? 0) > 0) {
      return stats;
    }
  }
  return null;
}

function consumeNullCounter(
  ownerCharacterId: number,
  remainingNullCounterByCharacterId: Map<number, number>,
): void {
  const remaining = remainingNullCounterByCharacterId.get(ownerCharacterId) ?? 0;
  if (remaining <= 0) return;
  remainingNullCounterByCharacterId.set(ownerCharacterId, remaining - 1);
}

function enemyHasReAttack(enemy: EnemyDef): boolean {
  return getEnemyAbilityLevel(enemy, 're_attack') > 0;
}

function getEnemyReAttackNoAMultiplier(enemy: EnemyDef): number {
  const level = getEnemyAbilityLevel(enemy, 're_attack');
  if (level <= 0) return 0;
  if (level >= 3) return 1.0;
  if (level === 2) return 0.7;
  return 0.5;
}

function hasCounter(charStats: ComputedCharacterStats, phase: BattlePhase): boolean {
  const ability = charStats.abilities.find(a => a.id === 'counter');
  if (!ability) return false;
  return phase === 'close';
}

function getCounterNoAMultiplier(charStats: ComputedCharacterStats): number {
  return getCounterNoAMultiplierForLevel(getAbilityLevel(charStats, 'counter'));
}


function getResurrectLevel(charStats: ComputedCharacterStats): number {
  return charStats.abilities.find(a => a.id === 'resurrect')?.level ?? 0;
}

function hasResurrect(charStats: ComputedCharacterStats): boolean {
  return getResurrectLevel(charStats) > 0;
}

function getAbilityLevel(charStats: ComputedCharacterStats, abilityId: AbilityId): number {
  return getAbilityLevelFromList(charStats.abilities, abilityId);
}

function getReAttackProfile(charStats: ComputedCharacterStats): { count: number; noAMultiplier: number } {
  const ability = charStats.abilities.find(a => a.id === 're_attack');
  if (!ability) return { count: 0, noAMultiplier: 0.5 };
  if (ability.level >= 3) return { count: 1, noAMultiplier: 1.0 };
  if (ability.level === 2) return { count: 1, noAMultiplier: 0.7 };
  return { count: 1, noAMultiplier: 0.5 };
}

function getReCounterNoAMultiplier(charStats: ComputedCharacterStats): number {
  return getTierTwoNoAMultiplierForLevel(getAbilityLevel(charStats, 're_counter'));
}

function getMagicalCounterNoAMultiplier(charStats: ComputedCharacterStats): number {
  return getTierTwoNoAMultiplierForLevel(getAbilityLevel(charStats, 'magical_counter'));
}

function getCoveringFireNoAMultiplier(charStats: ComputedCharacterStats): number {
  return getTierTwoNoAMultiplierForLevel(getAbilityLevel(charStats, 'covering_fire'));
}

function getEnemyCounterNoAMultiplier(enemy: EnemyDef): number {
  return getCounterNoAMultiplierForLevel(getEnemyAbilityLevel(enemy, 'counter'));
}

function getEnemyReCounterNoAMultiplier(enemy: EnemyDef): number {
  return getTierTwoNoAMultiplierForLevel(getEnemyAbilityLevel(enemy, 're_counter'));
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
  const { partyStats, characterStats: computedCharacterStats } = computePartyStats(party);
  let characterStats = computedCharacterStats;

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

  if (getDeityKey(party.deity.name) === 'Goddess of Discord' && characterStats.length > 0) {
    const targetIndex = Math.floor(Math.random() * characterStats.length);
    const targetStats = characterStats[targetIndex];
    const targetName = party.characters.find(c => c.id === targetStats.characterId)?.name ?? '???';

    characterStats = characterStats.map((stats, index) => (
      index === targetIndex
        ? { ...stats, hasAntagonism: true }
        : stats
    ));

    log.push({
      phase: 'long',
      actor: 'effect',
      action: '不和の神の効果！',
      note: `([⚠️敵対]${targetName}が仲違いした)`,
    });

    ctx = {
      ...ctx,
      characterStats,
    };
  }

  const remainingNullCounterByCharacterId = createNullCounterPool(characterStats);
  const consumedResurrectCharacterIds = new Set<number>();
  let consumedEnemyResurrect = false;
  const consumedIllusionStateIds = new Set<string>();
  let consumedPartyIllusion = false;

  const triggerEnemyResurrect = (phase: BattlePhase, initiativeRoll?: number): void => {
    if (enemyHp > 0 || consumedEnemyResurrect) return;

    const resurrectLevel = getEnemyAbilityLevel(enemy, 'resurrect');
    if (resurrectLevel <= 0) return;

    enemyHp = resurrectLevel >= 2
      ? Math.max(1, Math.ceil(enemy.hp * 0.01))
      : 1;
    consumedEnemyResurrect = true;

    log.push({
      phase,
      initiativeRoll,
      actor: 'enemy',
      action: `${enemy.name} は致命ダメージを食いしばって耐えた！`,
    });
  };

  const createPartyEffectEntry = (
    classId: 'fighter' | 'lord' | 'sage',
    abilityId: 'defender' | 'command' | 'm_barrier',
    label: (level: number) => string,
    noteText: (level: number) => string,
  ): BattleLogEntry | null => {
    let bestLevel = 0;
    let ownerName: string | null = null;

    for (const char of party.characters) {
      if (char.mainClassId !== classId) continue;
      const stats = characterStats.find((candidate) => candidate.characterId === char.id);
      const level = stats?.abilities
        .filter((ability) => ability.id === abilityId)
        .reduce((maxLevel, ability) => Math.max(maxLevel, ability.level), 0) ?? 0;
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
    createPartyEffectEntry('fighter', 'defender', level => `守護者${level}`, level => `(パーティへの物理ダメージ × ${level >= 3 ? '1/2' : level === 2 ? '3/5' : '2/3'})`),
    createPartyEffectEntry('lord', 'command', level => `指揮${level}`, level => `(パーティ攻撃力 × ${level >= 3 ? '2.0' : level === 2 ? '1.6' : '1.3'})`),
    createPartyEffectEntry('sage', 'm_barrier', level => `魔法障壁${level}`, level => `(パーティへの魔法ダメージ × ${level >= 3 ? '1/2' : level === 2 ? '3/5' : '2/3'})`),
  ];

  for (const partyEffect of partyEffects) {
    if (partyEffect) {
      log.push(partyEffect);
    }
  }

  const triggerEnemyCounter = (targetCharStats: ComputedCharacterStats, dealtDamage: number, initiativeRoll: number): void => {
    const counterNoAMultiplier = getEnemyCounterNoAMultiplier(enemy);
    if (dealtDamage <= 0 || counterNoAMultiplier <= 0) return;

    const nullifierStats = getAvailableNullCounterOwner(characterStats, remainingNullCounterByCharacterId);
    const nullifiedByParty = !!nullifierStats;
    const targetChar = party.characters.find(c => c.id === targetCharStats.characterId);

    if (nullifiedByParty) {
      const nullifier = party.characters.find(c => c.id === nullifierStats?.characterId);
      if (nullifierStats) {
        consumeNullCounter(nullifierStats.characterId, remainingNullCounterByCharacterId);
      }
      log.push({
        phase: 'close',
        actor: 'effect',
        action: `${nullifier?.name ?? '味方'}の反撃無効化により、${enemy.name}の反撃は防がれた！`,
      });
      return;
    }

    const singleDamage = calculateSingleEnemyAttackDamage('close', enemy, partyStats, targetCharStats, enemyHp);
    const attempts = Math.ceil(getEnemyNoA('close', enemy) * counterNoAMultiplier);
    let hits = 0;
    for (let i = 1; i <= attempts; i++) {
      const didHit = hitDetection(1.0, enemy.accuracyBonus, targetCharStats.evasionBonus, i, 'close', getDeflectionLevel(targetCharStats), getEnemyFocusLevel(enemy));
      if (didHit) {
        hits += 1;
      }
    }

    const targetName = targetChar?.name ?? '???';
    let damage = 0;
    let appliedHits = 0;
    let avoidedByStealth = false;
    const avoidedByIllusion = isIllusionActive(
      'close',
      hasIllusion(targetCharStats),
      `character:${targetCharStats.characterId}`,
      consumedIllusionStateIds,
    );

    if (avoidedByIllusion) {
      consumedIllusionStateIds.add(`character:${targetCharStats.characterId}`);
    } else {
      for (let i = 0; i < hits; i++) {
        if (isStealthActive(targetCharStats, partyHp, partyStats.hp)) {
          avoidedByStealth = true;
          continue;
        }
        appliedHits += 1;
        damage += singleDamage;
        partyHp -= singleDamage;
      }
    }

    const triggeredResurrect = (
      partyHp <= 0
      && hasResurrect(targetCharStats)
      && !consumedResurrectCharacterIds.has(targetCharStats.characterId)
    );

    if (triggeredResurrect) {
      const resurrectLevel = getResurrectLevel(targetCharStats);
      partyHp = resurrectLevel >= 2
        ? Math.max(1, Math.ceil(partyStats.hp * 0.01))
        : 1;
      consumedResurrectCharacterIds.add(targetCharStats.characterId);
    }

    const enemyCounterRageBonusPercent = toRageBonusPercent(getEnemyRageAmplifier(enemy, enemyHp));
    log.push({
      phase: 'close',
      initiativeRoll,
      actor: 'enemy',
      action: `${targetName} に反撃！`,
      damage: damage > 0 ? damage : undefined,
      hits: appliedHits,
      totalAttempts: attempts,
      wasNegated: appliedHits === 0 && (avoidedByIllusion || avoidedByStealth) ? true : undefined,
      rageBonusPercent: enemyCounterRageBonusPercent > 0 ? enemyCounterRageBonusPercent : undefined,
      isCounter: true,
      elementalOffense: enemy.elementalOffense,
    });

    if (avoidedByIllusion) {
      log.push({
        phase: 'close',
        actor: 'effect',
        action: `${targetName} への攻撃はすべて幻だった！`,
      });
    }

    if (avoidedByStealth) {
      log.push({
        phase: 'close',
        actor: 'effect',
        action: `${targetName} は物陰に隠れて攻撃をやり過ごせたのだ！`,
      });
    }

    if (triggeredResurrect) {
      log.push({
        phase: 'close',
        actor: 'character',
        characterId: targetCharStats.characterId,
        isCounter: true,
        action: `${targetChar?.name ?? '???'} は致命ダメージを食いしばって耐えた！`,
      });
    }

    const reCounterNoAMultiplier = getReCounterNoAMultiplier(targetCharStats);
    if (partyHp <= 0 || enemyHp <= 0 || !targetChar || reCounterNoAMultiplier <= 0 || getEnemyAbilityLevel(enemy, 'null_counter') > 0) {
      return;
    }

    const reCounterResult = calculateCharacterDamage('close', targetCharStats, targetChar, enemy, partyStats, partyHp, reCounterNoAMultiplier);
    if (reCounterResult.totalAttempts <= 0) {
      return;
    }

    const reCounterDealtDamage = reCounterResult.damage > 0;
    if (reCounterDealtDamage) {
      enemyHp -= reCounterResult.damage;
    }

    const characterReCounterRageBonusPercent = toRageBonusPercent(getCharacterRageAmplifier(targetCharStats, partyHp, partyStats.hp));
    const characterReCounterMomentumBonusPercent = toMomentumBonusPercent(getCharacterMomentumAmplifier(targetCharStats, partyHp, partyStats.hp));
    log.push({
      phase: 'close',
      actor: 'character',
      characterId: targetCharStats.characterId,
      action: `${targetChar.name} の再反撃！`,
      damage: reCounterResult.damage,
      hits: reCounterResult.hits,
      totalAttempts: reCounterResult.totalAttempts,
      rageBonusPercent: characterReCounterRageBonusPercent > 0 ? characterReCounterRageBonusPercent : undefined,
      momentumBonusPercent: targetCharStats.abilities.some(a => a.id === 'momentum')
        ? characterReCounterMomentumBonusPercent
        : undefined,
      isCounter: true,
      elementalOffense: targetCharStats.elementalOffense,
    });

    if (reCounterDealtDamage) {
      triggerEnemyResurrect('close', initiativeRoll);
    }
  };

  const triggerCoveringFire = (
    phase: BattlePhase,
    sourceCharStats: ComputedCharacterStats,
    sourceHits: number,
    initiativeRoll: number,
  ): void => {
    if (phase !== 'close' || sourceHits !== 1 || enemyHp <= 0 || partyHp <= 0) return;

    for (const coverCharStats of characterStats) {
      if (coverCharStats.characterId === sourceCharStats.characterId) continue;
      const coveringFireNoAMultiplier = getCoveringFireNoAMultiplier(coverCharStats);
      if (coveringFireNoAMultiplier <= 0) continue;

      const coverChar = party.characters.find(c => c.id === coverCharStats.characterId);
      if (!coverChar) continue;

      const coveringFireResult = calculateCharacterDamage('long', coverCharStats, coverChar, enemy, partyStats, partyHp, coveringFireNoAMultiplier);
      if (coveringFireResult.totalAttempts <= 0) continue;

      if (isIllusionActive('long', getEnemyAbilityLevel(enemy, 'illusion') > 0, 'enemy', consumedIllusionStateIds)) {
        consumedIllusionStateIds.add('enemy');
        coveringFireResult.damage = 0;
        coveringFireResult.hits = 0;
        coveringFireResult.wasNegatedByEnemyIllusion = true;
      }

      const coveringFireDealtDamage = coveringFireResult.damage > 0;
      if (coveringFireDealtDamage) {
        enemyHp -= coveringFireResult.damage;
      }

      const coverFireRageBonusPercent = toRageBonusPercent(getCharacterRageAmplifier(coverCharStats, partyHp, partyStats.hp));
      const coverFireMomentumBonusPercent = toMomentumBonusPercent(getCharacterMomentumAmplifier(coverCharStats, partyHp, partyStats.hp));
      log.push({
        phase,
        initiativeRoll,
        actor: 'character',
        characterId: coverCharStats.characterId,
        action: `${coverChar.name} の援護射撃！`,
        damage: coveringFireResult.damage,
        hits: coveringFireResult.hits,
        totalAttempts: coveringFireResult.totalAttempts,
        rageBonusPercent: coverFireRageBonusPercent > 0 ? coverFireRageBonusPercent : undefined,
        momentumBonusPercent: coverCharStats.abilities.some(a => a.id === 'momentum')
          ? coverFireMomentumBonusPercent
          : undefined,
        isCounter: true,
        wasNegated: coveringFireResult.wasNegatedByEnemyIllusion || undefined,
        elementalOffense: coverCharStats.elementalOffense,
      });

      if (coveringFireResult.wasNegatedByEnemyIllusion) {
        log.push({
          phase,
          actor: 'effect',
          action: `${enemy.name} への攻撃はすべて幻だった！`,
        });
      }

      if (coveringFireDealtDamage) {
        triggerEnemyResurrect(phase, initiativeRoll);
      }

      if (enemyHp <= 0) {
        break;
      }
    }
  };

  const phases: BattlePhase[] = ['long', 'mid', 'close'];
  const hasFertilityInitiativeBonus = getDeityKey(party.deity.name) === 'Goddess of Fertility';

  for (const phase of phases) {
    const enemyInitiativeRoll = rollInitiative(getEnemyFirstStrikeLevel(enemy));
    const characterInitiative = characterStats.map(cs => ({
      stats: cs,
      roll: rollInitiative(getFirstStrikeLevel(cs), hasFertilityInitiativeBonus ? 1 : 0),
    }));

    const initiativeByCharacter = new Map<number, number>(
      characterInitiative.map(ci => [ci.stats.characterId, ci.roll])
    );

    const turnOrder: Array<{ kind: 'enemy'; roll: number } | { kind: 'character'; roll: number; stats: ComputedCharacterStats }> = [
      { kind: 'enemy' as const, roll: enemyInitiativeRoll },
      ...characterInitiative.map(ci => ({ kind: 'character' as const, roll: ci.roll, stats: ci.stats })),
    ].sort((a, b) => {
      if (b.roll !== a.roll) return b.roll - a.roll;
      if (a.kind !== b.kind) return a.kind === 'enemy' ? -1 : 1;
      if (a.kind === 'enemy' && b.kind === 'enemy') return 0;
      if (!('stats' in a) || !('stats' in b)) return 0;
      const aFront = a.stats.row <= 3;
      const bFront = b.stats.row <= 3;
      if (aFront !== bFront) return aFront ? -1 : 1;
      return a.stats.row - b.stats.row;
    });

    for (const turn of turnOrder) {
      if (enemyHp <= 0 || partyHp <= 0) break;

      if (turn.kind === 'enemy') {
        const noA = getEnemyNoA(phase, enemy);
        if (noA <= 0) continue;

        const magicalCounterCandidates = new Map<number, ComputedCharacterStats>();

        const runEnemyAttack = (attempts: number, isReAttack = false): void => {
          if (attempts <= 0 || partyHp <= 0 || enemyHp <= 0) return;

          const attacksByTarget = new Map<number, { hitDamages: number[]; totalAttempts: number; charStats: ComputedCharacterStats }>();
          const enemyAccuracyPotency = 1.0;
          const enemyAccuracyBonus = enemy.accuracyBonus;
          const enemyResonanceLevel = getEnemyAbilityLevel(enemy, 'resonance');
          let enemyHitIndex = 1;
          let enemySuccessfulHits = 0;

          for (let i = 0; i < attempts; i++) {
            const { row: targetRow, newCtx } = getTargetRow(ctx, phase);
            ctx = newCtx;
            const targetCharStats = resolveEnemyTarget(targetRow, characterStats, phase);
            if (!targetCharStats) {
              enemyHitIndex += 1;
              continue;
            }

            const existing = attacksByTarget.get(targetCharStats.characterId);
            const didHit = hitDetection(
              enemyAccuracyPotency,
              enemyAccuracyBonus,
              targetCharStats.evasionBonus,
              enemyHitIndex,
              phase,
              getDeflectionLevel(targetCharStats),
              getEnemyFocusLevel(enemy)
            );
            enemyHitIndex += 1;

            const targetAttack = existing ?? {
              hitDamages: [],
              totalAttempts: 0,
              charStats: targetCharStats,
            };
            targetAttack.totalAttempts += 1;

            if (didHit) {
              enemySuccessfulHits += 1;
              const resonanceAmplifier = phase === 'mid'
                ? getResonanceAmplifier(enemyResonanceLevel, enemySuccessfulHits)
                : 1.0;
              const singleDamage = calculateSingleEnemyAttackDamage(phase, enemy, partyStats, targetCharStats, enemyHp);
              targetAttack.hitDamages.push(Math.max(1, Math.floor(singleDamage * resonanceAmplifier)));
            }

            if (!existing) {
              attacksByTarget.set(targetCharStats.characterId, targetAttack);
            }
          }

          const magicProfile = resolveMagicProfile({
            style: 'multi-hit',
            elementalOffense: enemy.elementalOffense,
            elementalOffenseValue: 1.0,
            magicalNoA: attempts,
          });
          const resonanceActor = enemyResonanceLevel > 0
            ? { abilities: [{ id: 'resonance' as const, level: enemyResonanceLevel }] }
            : { abilities: [] };
          const enemyResonanceLogText = getResonanceLogText(phase, resonanceActor.abilities, enemySuccessfulHits);

          if (phase === 'mid') {
            log.push({
              phase,
              initiativeRoll: turn.roll,
              actor: 'enemy',
              action: `${magicProfile.spellName}${isReAttack ? '連撃' : ''}を唱えた！${enemyResonanceLogText}`,
              hits: enemySuccessfulHits,
              totalAttempts: attempts,
              rageBonusPercent: toRageBonusPercent(getEnemyRageAmplifier(enemy, enemyHp)) || undefined,
              isReAttack: isReAttack || undefined,
              elementalOffense: enemy.elementalOffense,
            });
          }

          for (const [charId, attack] of attacksByTarget) {
            if (enemyHp <= 0 || partyHp <= 0) break;

            const targetChar = party.characters.find(c => c.id === charId);
            const attackName = isReAttack
              ? (phase === 'mid' ? `${magicProfile.spellName}連撃` : '連撃')
              : (phase === 'mid' ? `${magicProfile.spellName}` : '攻撃');

            const targetName = targetChar?.name ?? '???';
            let appliedHits = 0;
            let appliedDamage = 0;
            let avoidedByStealth = false;
            const avoidedByPartyIllusion = isPartyIllusionActive(phase, characterStats, consumedPartyIllusion);
            const avoidedByIllusion = avoidedByPartyIllusion || isIllusionActive(
              phase,
              hasIllusion(attack.charStats),
              `character:${charId}`,
              consumedIllusionStateIds,
            );

            if (avoidedByIllusion) {
              if (avoidedByPartyIllusion) {
                consumedPartyIllusion = true;
              } else {
                consumedIllusionStateIds.add(`character:${charId}`);
              }
            } else {
              for (const hitDamage of attack.hitDamages) {
                if (isStealthActive(attack.charStats, partyHp, partyStats.hp)) {
                  avoidedByStealth = true;
                  continue;
                }
                appliedHits += 1;
                appliedDamage += hitDamage;
                partyHp -= hitDamage;
              }
            }


            const triggeredResurrect = (
              partyHp <= 0
              && hasResurrect(attack.charStats)
              && !consumedResurrectCharacterIds.has(charId)
            );

            if (triggeredResurrect) {
              const resurrectLevel = getResurrectLevel(attack.charStats);
              partyHp = resurrectLevel >= 2
                ? Math.max(1, Math.ceil(partyStats.hp * 0.01))
                : 1;
              consumedResurrectCharacterIds.add(charId);
            }

            const enemyAttackRageBonusPercent = toRageBonusPercent(getEnemyRageAmplifier(enemy, enemyHp));
            log.push({
              phase,
              initiativeRoll: turn.roll,
              actor: 'enemy',
              action: phase === 'mid'
                ? `${targetName} に命中！`
                : `${targetName} に${attackName}！${enemyResonanceLogText}`,
              damage: appliedDamage > 0 ? appliedDamage : undefined,
              hits: appliedHits,
              totalAttempts: attack.totalAttempts,
              wasNegated: appliedHits === 0 && (avoidedByIllusion || avoidedByStealth) ? true : undefined,
              rageBonusPercent: phase === 'mid' ? undefined : (enemyAttackRageBonusPercent > 0 ? enemyAttackRageBonusPercent : undefined),
              isReAttack: isReAttack || undefined,
              isEnemyTargetHit: phase === 'mid' ? true : undefined,
              elementalOffense: enemy.elementalOffense,
            });

            if (avoidedByIllusion) {
              log.push({
                phase,
                actor: 'effect',
                action: `${targetName} への攻撃はすべて幻だった！`,
              });
            }

            if (avoidedByStealth) {
              log.push({
                phase,
                actor: 'effect',
                action: `${targetName} は物陰に隠れて攻撃をやり過ごせたのだ！`,
              });
            }

            if (triggeredResurrect) {
              const resurrectedChar = party.characters.find(c => c.id === charId);
              log.push({
                phase,
                actor: 'character',
                characterId: charId,
                isCounter: true,
                action: `${resurrectedChar?.name ?? '???'} は致命ダメージを食いしばって耐えた！`,
              });
            }

            if (
              phase === 'mid'
              && appliedDamage > 0
              && getMagicalCounterNoAMultiplier(attack.charStats) > 0
              && getEnemyAbilityLevel(enemy, 'null_counter') <= 0
            ) {
              magicalCounterCandidates.set(charId, attack.charStats);
            }

            if (partyHp <= 0 || enemyHp <= 0) continue;
            if (appliedDamage <= 0 || !hasCounter(attack.charStats, phase)) continue;

            if (getEnemyAbilityLevel(enemy, 'null_counter') > 0) {
              log.push({
                phase,
                actor: 'effect',
                action: `${enemy.name}の反撃無効化により、${targetChar?.name ?? '???'}の反撃は防がれた！`,
              });
              continue;
            }

            const attackChar = party.characters.find(c => c.id === charId);
            if (!attackChar) continue;

            const counterResult = calculateCharacterDamage(
              phase,
              attack.charStats,
              attackChar,
              enemy,
              partyStats,
              partyHp,
              getCounterNoAMultiplier(attack.charStats),
            );
            if (counterResult.totalAttempts <= 0) continue;

            const counterDealtDamage = counterResult.damage > 0;
            if (counterDealtDamage) {
              enemyHp -= counterResult.damage;
            }

            const counterType = phase === 'mid' ? '魔法反撃' : '反撃';
            const resonanceLogText = getResonanceLogText(phase, attack.charStats.abilities, counterResult.hits);
            const characterCounterRageBonusPercent = toRageBonusPercent(getCharacterRageAmplifier(attack.charStats, partyHp, partyStats.hp));
            const characterCounterMomentumBonusPercent = toMomentumBonusPercent(getCharacterMomentumAmplifier(attack.charStats, partyHp, partyStats.hp));
            log.push({
              phase,
              initiativeRoll: initiativeByCharacter.get(charId),
              actor: 'character',
              characterId: charId,
              action: `${targetChar?.name ?? '???'} の${counterType}！${resonanceLogText}`,
              damage: counterResult.damage,
              hits: counterResult.hits,
              totalAttempts: counterResult.totalAttempts,
              rageBonusPercent: characterCounterRageBonusPercent > 0 ? characterCounterRageBonusPercent : undefined,
              momentumBonusPercent: attack.charStats.abilities.some(a => a.id === 'momentum')
                ? characterCounterMomentumBonusPercent
                : undefined,
              isCounter: true,
              elementalOffense: attack.charStats.elementalOffense,
            });

            if (counterDealtDamage) {
              triggerEnemyResurrect(phase, turn.roll);
            }

            if (enemyHp <= 0) break;

            const availableNullCounterStats = getAvailableNullCounterOwner(characterStats, remainingNullCounterByCharacterId);
            const enemyReCounterNoAMultiplier = getEnemyReCounterNoAMultiplier(enemy);
            if (partyHp <= 0 || enemyReCounterNoAMultiplier <= 0 || availableNullCounterStats) {
              if (availableNullCounterStats) {
                const nullifier = party.characters.find(c => c.id === availableNullCounterStats.characterId);
                consumeNullCounter(availableNullCounterStats.characterId, remainingNullCounterByCharacterId);
                log.push({
                  phase,
                  actor: 'effect',
                  action: `${nullifier?.name ?? '味方'}の反撃無効化により、${enemy.name}の再反撃は防がれた！`,
                });
              }
              continue;
            }

            const reCounterAttempts = Math.ceil(getEnemyNoA(phase, enemy) * enemyReCounterNoAMultiplier);
            if (reCounterAttempts <= 0) {
              continue;
            }

            let reCounterDamage = 0;
            let reCounterHits = 0;
            for (let i = 1; i <= reCounterAttempts; i++) {
              const didHit = hitDetection(1.0, enemy.accuracyBonus, attack.charStats.evasionBonus, i, phase, getDeflectionLevel(attack.charStats), getEnemyFocusLevel(enemy));
              if (!didHit) continue;
              reCounterHits += 1;
              reCounterDamage += calculateSingleEnemyAttackDamage(phase, enemy, partyStats, attack.charStats, enemyHp);
            }

            const avoidedByPartyIllusionOnReCounter = isPartyIllusionActive(phase, characterStats, consumedPartyIllusion);
            const avoidedReCounterByIllusion = avoidedByPartyIllusionOnReCounter || isIllusionActive(
              phase,
              hasIllusion(attack.charStats),
              `character:${charId}`,
              consumedIllusionStateIds,
            );
            const avoidedReCounterByStealth = !avoidedReCounterByIllusion && isStealthActive(attack.charStats, partyHp, partyStats.hp);
            if (avoidedReCounterByIllusion) {
              if (avoidedByPartyIllusionOnReCounter) {
                consumedPartyIllusion = true;
              } else {
                consumedIllusionStateIds.add(`character:${charId}`);
              }
              reCounterDamage = 0;
              reCounterHits = 0;
            } else if (avoidedReCounterByStealth) {
              reCounterDamage = 0;
              reCounterHits = 0;
            }

            if (reCounterDamage > 0) {
              partyHp -= reCounterDamage;
            }

            const reCounterResurrect = (
              partyHp <= 0
              && hasResurrect(attack.charStats)
              && !consumedResurrectCharacterIds.has(charId)
            );

            if (reCounterResurrect) {
              const resurrectLevel = getResurrectLevel(attack.charStats);
              partyHp = resurrectLevel >= 2
                ? Math.max(1, Math.ceil(partyStats.hp * 0.01))
                : 1;
              consumedResurrectCharacterIds.add(charId);
            }

            const enemyReCounterRageBonusPercent = toRageBonusPercent(getEnemyRageAmplifier(enemy, enemyHp));
            log.push({
              phase,
              initiativeRoll: turn.roll,
              actor: 'enemy',
              action: `${targetChar?.name ?? '???'} に再反撃！`,
              damage: reCounterDamage > 0 ? reCounterDamage : undefined,
              hits: reCounterHits,
              totalAttempts: reCounterAttempts,
              wasNegated: reCounterHits === 0 && (avoidedReCounterByIllusion || avoidedReCounterByStealth) ? true : undefined,
              rageBonusPercent: enemyReCounterRageBonusPercent > 0 ? enemyReCounterRageBonusPercent : undefined,
              isCounter: true,
              elementalOffense: enemy.elementalOffense,
            });

            if (avoidedReCounterByIllusion) {
              log.push({
                phase,
                actor: 'effect',
                action: `${targetChar?.name ?? '???'} への攻撃はすべて幻だった！`,
              });
            }

            if (avoidedReCounterByStealth) {
              log.push({
                phase,
                actor: 'effect',
                action: `${targetChar?.name ?? '???'} は物陰に隠れて攻撃をやり過ごせたのだ！`,
              });
            }

            if (reCounterResurrect) {
              log.push({
                phase,
                actor: 'character',
                characterId: charId,
                isCounter: true,
                action: `${targetChar?.name ?? '???'} は致命ダメージを食いしばって耐えた！`,
              });
            }

            if (partyHp <= 0) break;
          }
        };

        runEnemyAttack(noA, false);
        if (enemyHasReAttack(enemy) && enemyHp > 0 && partyHp > 0) {
          runEnemyAttack(Math.ceil(noA * getEnemyReAttackNoAMultiplier(enemy)), true);
        }

        if (phase === 'mid' && enemyHp > 0 && partyHp > 0 && getEnemyAbilityLevel(enemy, 'null_counter') <= 0) {
          for (const [charId, magicalCounterStats] of magicalCounterCandidates) {
            if (enemyHp <= 0 || partyHp <= 0) break;

            const magicalCounterChar = party.characters.find(c => c.id === charId);
            if (!magicalCounterChar) continue;

            const magicalCounterNoAMultiplier = getMagicalCounterNoAMultiplier(magicalCounterStats);
            if (magicalCounterNoAMultiplier <= 0) continue;

            const magicalCounterResult = calculateCharacterDamage('mid', magicalCounterStats, magicalCounterChar, enemy, partyStats, partyHp, magicalCounterNoAMultiplier);
            if (magicalCounterResult.totalAttempts <= 0) continue;

            const magicalCounterDealtDamage = magicalCounterResult.damage > 0;
            if (magicalCounterDealtDamage) {
              enemyHp -= magicalCounterResult.damage;
            }

            const resonanceLogText = getResonanceLogText('mid', magicalCounterStats.abilities, magicalCounterResult.hits);
            const magicalCounterRageBonusPercent = toRageBonusPercent(getCharacterRageAmplifier(magicalCounterStats, partyHp, partyStats.hp));
            const magicalCounterMomentumBonusPercent = toMomentumBonusPercent(getCharacterMomentumAmplifier(magicalCounterStats, partyHp, partyStats.hp));
            log.push({
              phase,
              initiativeRoll: initiativeByCharacter.get(charId),
              actor: 'character',
              characterId: charId,
              action: `${magicalCounterChar.name} の魔法反撃！${resonanceLogText}`,
              damage: magicalCounterResult.damage,
              hits: magicalCounterResult.hits,
              totalAttempts: magicalCounterResult.totalAttempts,
              rageBonusPercent: magicalCounterRageBonusPercent > 0 ? magicalCounterRageBonusPercent : undefined,
              momentumBonusPercent: magicalCounterStats.abilities.some(a => a.id === 'momentum')
                ? magicalCounterMomentumBonusPercent
                : undefined,
              isCounter: true,
              elementalOffense: magicalCounterStats.elementalOffense,
            });

            if (magicalCounterDealtDamage) {
              triggerEnemyResurrect(phase, turn.roll);
            }
          }
        }

        continue;
      }

      const cs = turn.stats;
      const char = party.characters.find(c => c.id === cs.characterId);
      if (!char) continue;

      const runCharacterAttack = (noAMultiplier: number, isReAttack = false): CharacterAttackResult | null => {
        const isAntagonism = cs.hasAntagonism;
        let result: CharacterAttackResult;
        let antagonismTarget: ComputedCharacterStats | null = null;

        if (isAntagonism) {
          const candidates = characterStats.filter(target => target.characterId !== cs.characterId);
          if (candidates.length === 0) return null;
          const { row: targetRow, newCtx } = getTargetRow(ctx, phase);
          ctx = newCtx;
          const selected = resolveEnemyTarget(targetRow, candidates, phase) ?? candidates[Math.floor(Math.random() * candidates.length)];
          antagonismTarget = selected;
          result = calculateCharacterFriendlyFireDamage(phase, cs, selected, partyStats, partyHp, noAMultiplier);
          if (result.damage > 0) {
            partyHp -= result.damage;

            const triggeredResurrect = (
              partyHp <= 0
              && hasResurrect(selected)
              && !consumedResurrectCharacterIds.has(selected.characterId)
            );

            if (triggeredResurrect) {
              const resurrectLevel = getResurrectLevel(selected);
              partyHp = resurrectLevel >= 2
                ? Math.max(1, Math.ceil(partyStats.hp * 0.01))
                : 1;
              consumedResurrectCharacterIds.add(selected.characterId);

              const resurrectedChar = party.characters.find(c => c.id === selected.characterId);
              log.push({
                phase,
                actor: 'character',
                characterId: selected.characterId,
                action: `${resurrectedChar?.name ?? '???'} は致命ダメージを食いしばって耐えた！`,
              });
            }
          }
        } else {
          result = calculateCharacterDamage(phase, cs, char, enemy, partyStats, partyHp, noAMultiplier);
          if (
            result.totalAttempts > 0
            && isIllusionActive(phase, getEnemyAbilityLevel(enemy, 'illusion') > 0, 'enemy', consumedIllusionStateIds)
          ) {
            consumedIllusionStateIds.add('enemy');
            result.damage = 0;
            result.hits = 0;
            result.wasNegatedByEnemyIllusion = true;
          }
          if (result.damage > 0) {
            enemyHp -= result.damage;
          }
        }

        if (result.totalAttempts <= 0) return null;

        const magicProfile = resolveMagicProfile({
          style: 'multi-hit',
          elementalOffense: cs.elementalOffense,
          elementalOffenseValue: cs.elementalOffenseValue,
          magicalNoA: result.totalAttempts,
        });
        const attackType = isReAttack
          ? (phase === 'mid' ? `${magicProfile.spellName}連撃` : '連撃')
          : (phase === 'mid' ? `${magicProfile.spellName}` : '攻撃');
        const resonanceLogText = getResonanceLogText(phase, cs.abilities, result.hits);
        const characterAttackRageBonusPercent = toRageBonusPercent(getCharacterRageAmplifier(cs, partyHp, partyStats.hp));
        const characterAttackMomentumBonusPercent = toMomentumBonusPercent(getCharacterMomentumAmplifier(cs, partyHp, partyStats.hp));
        const antagonismTargetName = antagonismTarget
          ? (party.characters.find(c => c.id === antagonismTarget.characterId)?.name ?? '???')
          : null;
        log.push({
          phase,
          initiativeRoll: turn.roll,
          actor: 'character',
          characterId: cs.characterId,
          action: isAntagonism
            ? `${char.name} は敵対状態！${antagonismTargetName} へ${phase === 'mid' ? `${attackType}を唱えた` : attackType}！${resonanceLogText}`
            : phase === 'mid'
              ? `${char.name} が${attackType}を唱えた！${resonanceLogText}`
              : `${char.name} の${attackType}！${resonanceLogText}`,
          damage: result.damage,
          hits: result.hits,
          totalAttempts: result.totalAttempts,
          rageBonusPercent: characterAttackRageBonusPercent > 0 ? characterAttackRageBonusPercent : undefined,
          momentumBonusPercent: cs.abilities.some(a => a.id === 'momentum')
            ? characterAttackMomentumBonusPercent
            : undefined,
          isReAttack: isReAttack || undefined,
          wasNegated: result.wasNegatedByEnemyIllusion || undefined,
          elementalOffense: cs.elementalOffense,
        });

        if (!isAntagonism && result.wasNegatedByEnemyIllusion) {
          log.push({
            phase,
            actor: 'effect',
            action: `${enemy.name} への攻撃はすべて幻だった！`,
          });
        }

        if (!isAntagonism && result.damage > 0) {
          triggerEnemyResurrect(phase, turn.roll);
        }

        if (!isAntagonism && enemyHp > 0 && phase === 'close') {
          triggerEnemyCounter(cs, result.damage, enemyInitiativeRoll);
        }

        return result;
      };

      const firstAttackResult = runCharacterAttack(1.0, false);
      if (firstAttackResult && enemyHp > 0 && partyHp > 0) {
        triggerCoveringFire(phase, cs, firstAttackResult.hits, turn.roll);
      }

      if (enemyHp <= 0 || partyHp <= 0) continue;

      const reAttackProfile = getReAttackProfile(cs);
      for (let i = 0; i < reAttackProfile.count && enemyHp > 0 && partyHp > 0; i++) {
        const reAttackResult = runCharacterAttack(reAttackProfile.noAMultiplier, true);
        if (reAttackResult && enemyHp > 0 && partyHp > 0) {
          triggerCoveringFire(phase, cs, reAttackResult.hits, turn.roll);
        }
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
