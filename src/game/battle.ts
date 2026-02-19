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
import { getBaseMultiplier } from './baseMultiplier';
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

function getCharacterRageAmplifier(charStats: ComputedCharacterStats, partyHp: number, maxPartyHp: number): number {
  if (!charStats.abilities.some(a => a.id === 'rage')) return 1.0;
  if (maxPartyHp <= 0) return 1.0;
  const hpRatio = Math.max(0, Math.min(1, partyHp / maxPartyHp));
  return Math.min(2.0, 1.0 + (1.0 - hpRatio));
}

function getEnemyRageAmplifier(enemy: EnemyDef, enemyHp: number): number {
  if (!enemy.abilities.includes('rage')) return 1.0;
  if (enemy.hp <= 0) return 1.0;
  const hpRatio = Math.max(0, Math.min(1, enemyHp / enemy.hp));
  return Math.min(2.0, 1.0 + (1.0 - hpRatio));
}

function toRageBonusPercent(rageAmplifier: number): number {
  return Math.max(0, Math.round((rageAmplifier - 1.0) * 100));
}



function hasStealth(charStats: ComputedCharacterStats): boolean {
  return charStats.abilities.some(a => a.id === 'stealth');
}

function isStealthActive(charStats: ComputedCharacterStats, partyHp: number, maxPartyHp: number): boolean {
  if (!hasStealth(charStats)) return false;
  if (maxPartyHp <= 0) return false;
  return (partyHp / maxPartyHp) <= 0.24;
}

function hasBulwark(charStats: ComputedCharacterStats): boolean {
  return charStats.abilities.some(a => a.id === 'bulwark');
}

function resolveEnemyTarget(
  targetRow: number,
  characterStats: ComputedCharacterStats[],
  phase: BattlePhase
): ComputedCharacterStats | null {
  const selectedTarget = characterStats.find(cs => cs.row === targetRow);
  if (!selectedTarget) return null;

  if (phase !== 'long') {
    return selectedTarget;
  }

  const frontCharacter = characterStats.find(cs => cs.row === selectedTarget.row - 1);
  if (frontCharacter && hasBulwark(frontCharacter)) {
    return frontCharacter;
  }

  return selectedTarget;
}

function getCharacterMomentumAmplifier(charStats: ComputedCharacterStats, partyHp: number, maxPartyHp: number): number {
  if (!charStats.abilities.some(a => a.id === 'momentum')) return 1.0;
  if (maxPartyHp <= 0) return 1.0;
  const hpRatio = Math.max(0, Math.min(1, partyHp / maxPartyHp));
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

  const elementalMultiplier = getElementalMultiplier(
    enemy.elementalOffense,
    partyStats.elementalResistance
  );

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
  opponentHasDeflection: boolean,
  actorHasFocus: boolean
): boolean {
  const effectiveAccuracyBonus = actorHasFocus
    ? roundUpToThirdDecimal(actorAccuracyBonus * 1.2)
    : actorAccuracyBonus;
  const decayOfAccuracy = Math.max(0.86, Math.min(0.98, 0.90 + effectiveAccuracyBonus - opponentEvasionBonus));
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

  const iaigiri = charStats.abilities.find(a => a.id === 'iaigiri');
  const iaigiriMultiplier = iaigiri ? (iaigiri.level >= 2 ? 2.5 : 2.0) : 1.0;
  const cBonus = phase === 'mid'
    ? getUniqueOffenseBonusSum('magical')
    : phase === 'long'
      ? getUniqueOffenseBonusSum('ranged')
      : getUniqueOffenseBonusSum('melee');
  const phaseAttackScale = phase === 'mid'
    ? getBaseMultiplier(charStats.baseStats.intelligence, 'attack')
    : getBaseMultiplier(charStats.baseStats.strength, 'attack');
  const phaseMultiplier = phase === 'mid' ? 1.0 : iaigiriMultiplier;
  const offenseAmplifier = (phaseMultiplier * (1.0 + cBonus) + charStats.deityOffenseAmplifierBonus) * phaseAttackScale;

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

  let hits = 0;
  let damage = 0;
  for (let i = 1; i <= noA; i++) {
    if (hitDetection(actorAccuracyPotency, charStats.accuracyBonus, enemyEvasion, i, phase, enemy.abilities.includes('deflection'), charStats.abilities.some(a => a.id === 'focus'))) {
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

function enemyHasFocus(enemy: EnemyDef): boolean {
  return enemy.abilities.includes('focus');
}

function partyHasNullCounter(characterStats: ComputedCharacterStats[]): boolean {
  return characterStats.some(cs => cs.abilities.some(a => a.id === 'null_counter'));
}

function enemyHasCounter(enemy: EnemyDef): boolean {
  return enemy.abilities.includes('counter');
}

function enemyHasReAttack(enemy: EnemyDef): boolean {
  return enemy.abilities.includes('re_attack');
}

function hasCounter(charStats: ComputedCharacterStats, phase: BattlePhase): boolean {
  const ability = charStats.abilities.find(a => a.id === 'counter');
  if (!ability) return false;
  if (ability.level === 2) return phase === 'close' || phase === 'mid';
  return phase === 'close';
}


function hasResurrect(charStats: ComputedCharacterStats): boolean {
  return charStats.abilities.some(a => a.id === 'resurrect');
}

function hasReAttack(charStats: ComputedCharacterStats): number {
  const ability = charStats.abilities.find(a => a.id === 're_attack');
  if (!ability) return 0;
  return ability.level === 2 ? 2 : 1;
}


function hasReCounter(charStats: ComputedCharacterStats): boolean {
  return charStats.abilities.some(a => a.id === 're_counter');
}

function hasMagicalCounter(charStats: ComputedCharacterStats): boolean {
  return charStats.abilities.some(a => a.id === 'magical_counter');
}

function hasCoveringFire(charStats: ComputedCharacterStats): boolean {
  return charStats.abilities.some(a => a.id === 'covering_fire');
}

function enemyHasReCounter(enemy: EnemyDef): boolean {
  return enemy.abilities.includes('re_counter');
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
  const consumedResurrectCharacterIds = new Set<number>();

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
        action: `${nullifier?.name ?? '味方'}の反撃無効化により、${enemy.name}の反撃は防がれた！`,
      });
      return;
    }

    const singleDamage = calculateSingleEnemyAttackDamage('close', enemy, partyStats, targetCharStats, enemyHp);
    const attempts = Math.ceil(enemy.meleeNoA * 0.5);
    let damage = 0;
    let hits = 0;
    for (let i = 1; i <= attempts; i++) {
      const didHit = hitDetection(1.0, enemy.accuracyBonus, targetCharStats.evasionBonus, i, 'close', hasDeflection(targetCharStats), enemyHasFocus(enemy));
      if (didHit) {
        hits += 1;
        damage += singleDamage;
      }
    }

    const targetName = targetChar?.name ?? '???';
    const avoidedByStealth = isStealthActive(targetCharStats, partyHp, partyStats.hp);
    if (avoidedByStealth) {
      damage = 0;
      hits = 0;
    }

    if (damage > 0) {
      partyHp -= damage;
    }

    const triggeredResurrect = (
      partyHp <= 0
      && hasResurrect(targetCharStats)
      && !consumedResurrectCharacterIds.has(targetCharStats.characterId)
    );

    if (triggeredResurrect) {
      partyHp = 1;
      consumedResurrectCharacterIds.add(targetCharStats.characterId);
    }

    const enemyCounterRageBonusPercent = toRageBonusPercent(getEnemyRageAmplifier(enemy, enemyHp));
    log.push({
      phase: 'close',
      initiativeRoll,
      actor: 'enemy',
      action: `${targetName} に反撃！`,
      damage: damage > 0 ? damage : undefined,
      hits,
      totalAttempts: attempts,
      rageBonusPercent: enemyCounterRageBonusPercent > 0 ? enemyCounterRageBonusPercent : undefined,
      isCounter: true,
      elementalOffense: enemy.elementalOffense,
    });

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
        action: `${targetChar?.name ?? '???'} は即死攻撃を食いしばって耐えた！`,
      });
    }

    if (partyHp <= 0 || enemyHp <= 0 || !targetChar || !hasReCounter(targetCharStats) || enemy.abilities.includes('null_counter')) {
      return;
    }

    const reCounterResult = calculateCharacterDamage('close', targetCharStats, targetChar, enemy, partyStats, partyHp, 0.5);
    if (reCounterResult.totalAttempts <= 0) {
      return;
    }

    if (reCounterResult.damage > 0) {
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
      if (!hasCoveringFire(coverCharStats)) continue;

      const coverChar = party.characters.find(c => c.id === coverCharStats.characterId);
      if (!coverChar) continue;

      const coveringFireResult = calculateCharacterDamage('long', coverCharStats, coverChar, enemy, partyStats, partyHp, 0.5);
      if (coveringFireResult.totalAttempts <= 0) continue;

      if (coveringFireResult.damage > 0) {
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
        elementalOffense: coverCharStats.elementalOffense,
      });

      if (enemyHp <= 0) {
        break;
      }
    }
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

    const characterTurnOrder = characterInitiative
      .map(ci => ({ kind: 'character' as const, roll: ci.roll, stats: ci.stats }))
      .sort((a, b) => {
        if (b.roll !== a.roll) return b.roll - a.roll;
        const aFront = a.stats.row <= 3;
        const bFront = b.stats.row <= 3;
        if (aFront !== bFront) return aFront ? -1 : 1;
        return a.stats.row - b.stats.row;
      });

    const turnOrder: Array<{ kind: 'enemy'; roll: number } | { kind: 'character'; roll: number; stats: ComputedCharacterStats }> = [
      { kind: 'enemy', roll: enemyInitiativeRoll },
      ...characterTurnOrder,
    ];

    for (const turn of turnOrder) {
      if (enemyHp <= 0 || partyHp <= 0) break;

      if (turn.kind === 'enemy') {
        const noA = getEnemyNoA(phase, enemy);
        if (noA <= 0) continue;

        const magicalCounterCandidates = new Map<number, ComputedCharacterStats>();

        const runEnemyAttack = (attempts: number, isReAttack = false): void => {
          if (attempts <= 0 || partyHp <= 0 || enemyHp <= 0) return;

          const attacksByTarget = new Map<number, { damage: number; hits: number; totalAttempts: number; charStats: ComputedCharacterStats }>();
          const enemyAccuracyPotency = 1.0;
          const enemyAccuracyBonus = enemy.accuracyBonus;
          // Nth hit is counted per attack sequence; re-attacks/counters do not inherit prior hit decay.
          let enemyHitIndex = 1;

          for (let i = 0; i < attempts; i++) {
            const { row: targetRow, newCtx } = getTargetRow(ctx, phase);
            ctx = newCtx;
            const targetCharStats = resolveEnemyTarget(targetRow, characterStats, phase);
            if (!targetCharStats) {
              enemyHitIndex += 1;
              continue;
            }

            const singleDamage = calculateSingleEnemyAttackDamage(phase, enemy, partyStats, targetCharStats, enemyHp);
            const existing = attacksByTarget.get(targetCharStats.characterId);
            const didHit = hitDetection(
              enemyAccuracyPotency,
              enemyAccuracyBonus,
              targetCharStats.evasionBonus,
              enemyHitIndex,
              phase,
              hasDeflection(targetCharStats),
              enemyHasFocus(enemy)
            );
            enemyHitIndex += 1;

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
            if (enemyHp <= 0 || partyHp <= 0) break;

            const targetChar = party.characters.find(c => c.id === charId);
            const attackName = isReAttack
              ? (phase === 'mid' ? '魔法連撃' : '連撃')
              : (phase === 'mid' ? '魔法攻撃' : '攻撃');

            const targetName = targetChar?.name ?? '???';
            const avoidedByStealth = isStealthActive(attack.charStats, partyHp, partyStats.hp);
            if (avoidedByStealth) {
              attack.damage = 0;
              attack.hits = 0;
            }

            if (attack.damage > 0) {
              partyHp -= attack.damage;
            }

            const triggeredResurrect = (
              partyHp <= 0
              && hasResurrect(attack.charStats)
              && !consumedResurrectCharacterIds.has(charId)
            );

            if (triggeredResurrect) {
              partyHp = 1;
              consumedResurrectCharacterIds.add(charId);
            }

            const enemyAttackRageBonusPercent = toRageBonusPercent(getEnemyRageAmplifier(enemy, enemyHp));
            log.push({
              phase,
              initiativeRoll: turn.roll,
              actor: 'enemy',
              action: `${targetName} に${attackName}！`,
              damage: attack.damage > 0 ? attack.damage : undefined,
              hits: attack.hits,
              totalAttempts: attack.totalAttempts,
              rageBonusPercent: enemyAttackRageBonusPercent > 0 ? enemyAttackRageBonusPercent : undefined,
              isReAttack: isReAttack || undefined,
              elementalOffense: enemy.elementalOffense,
            });

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
                action: `${resurrectedChar?.name ?? '???'} は即死攻撃を食いしばって耐えた！`,
              });
            }

            if (
              phase === 'mid'
              && attack.damage > 0
              && hasMagicalCounter(attack.charStats)
              && !enemy.abilities.includes('null_counter')
            ) {
              magicalCounterCandidates.set(charId, attack.charStats);
            }

            if (partyHp <= 0 || enemyHp <= 0) continue;
            if (attack.damage <= 0 || !hasCounter(attack.charStats, phase)) continue;

            if (enemy.abilities.includes('null_counter')) {
              log.push({
                phase,
                actor: 'effect',
                action: `${enemy.name}の反撃無効化により、${targetChar?.name ?? '???'}の反撃は防がれた！`,
              });
              continue;
            }

            const attackChar = party.characters.find(c => c.id === charId);
            if (!attackChar) continue;

            const counterResult = calculateCharacterDamage(phase, attack.charStats, attackChar, enemy, partyStats, partyHp, 0.5);
            if (counterResult.totalAttempts <= 0) continue;

            if (counterResult.damage > 0) {
              enemyHp -= counterResult.damage;
            }

            const counterType = phase === 'mid' ? '魔法反撃' : '反撃';
            const resonanceLogText = getResonanceLogText(phase, attack.charStats, counterResult.hits);
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

            if (enemyHp <= 0) break;

            if (partyHp <= 0 || !enemyHasReCounter(enemy) || partyHasNullCounter(characterStats)) {
              continue;
            }

            const reCounterAttempts = Math.ceil(getEnemyNoA(phase, enemy) * 0.5);
            if (reCounterAttempts <= 0) {
              continue;
            }

            let reCounterDamage = 0;
            let reCounterHits = 0;
            for (let i = 1; i <= reCounterAttempts; i++) {
              const didHit = hitDetection(1.0, enemy.accuracyBonus, attack.charStats.evasionBonus, i, phase, hasDeflection(attack.charStats), enemyHasFocus(enemy));
              if (!didHit) continue;
              reCounterHits += 1;
              reCounterDamage += calculateSingleEnemyAttackDamage(phase, enemy, partyStats, attack.charStats, enemyHp);
            }

            const avoidedReCounterByStealth = isStealthActive(attack.charStats, partyHp, partyStats.hp);
            if (avoidedReCounterByStealth) {
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
              partyHp = 1;
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
              rageBonusPercent: enemyReCounterRageBonusPercent > 0 ? enemyReCounterRageBonusPercent : undefined,
              isCounter: true,
              elementalOffense: enemy.elementalOffense,
            });

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
                action: `${targetChar?.name ?? '???'} は即死攻撃を食いしばって耐えた！`,
              });
            }

            if (partyHp <= 0) break;
          }
        };

        runEnemyAttack(noA, false);
        if (enemyHasReAttack(enemy) && enemyHp > 0 && partyHp > 0) {
          runEnemyAttack(Math.ceil(noA * 0.5), true);
        }

        if (phase === 'mid' && enemyHp > 0 && partyHp > 0 && !enemy.abilities.includes('null_counter')) {
          for (const [charId, magicalCounterStats] of magicalCounterCandidates) {
            if (enemyHp <= 0 || partyHp <= 0) break;

            const magicalCounterChar = party.characters.find(c => c.id === charId);
            if (!magicalCounterChar) continue;

            const magicalCounterResult = calculateCharacterDamage('mid', magicalCounterStats, magicalCounterChar, enemy, partyStats, partyHp, 0.5);
            if (magicalCounterResult.totalAttempts <= 0) continue;

            if (magicalCounterResult.damage > 0) {
              enemyHp -= magicalCounterResult.damage;
            }

            const resonanceLogText = getResonanceLogText('mid', magicalCounterStats, magicalCounterResult.hits);
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
          }
        }

        continue;
      }

      const cs = turn.stats;
      const char = party.characters.find(c => c.id === cs.characterId);
      if (!char) continue;

      const runCharacterAttack = (noAMultiplier: number, isReAttack = false): CharacterAttackResult | null => {
        const result = calculateCharacterDamage(phase, cs, char, enemy, partyStats, partyHp, noAMultiplier);
        if (result.totalAttempts <= 0) return null;

        if (result.damage > 0) {
          enemyHp -= result.damage;
        }

        const attackType = isReAttack
          ? (phase === 'mid' ? '魔法連撃' : '連撃')
          : (phase === 'mid' ? '魔法攻撃' : '攻撃');
        const resonanceLogText = getResonanceLogText(phase, cs, result.hits);
        const characterAttackRageBonusPercent = toRageBonusPercent(getCharacterRageAmplifier(cs, partyHp, partyStats.hp));
        const characterAttackMomentumBonusPercent = toMomentumBonusPercent(getCharacterMomentumAmplifier(cs, partyHp, partyStats.hp));
        log.push({
          phase,
          initiativeRoll: turn.roll,
          actor: 'character',
          characterId: cs.characterId,
          action: `${char.name} の${attackType}！${resonanceLogText}`,
          damage: result.damage,
          hits: result.hits,
          totalAttempts: result.totalAttempts,
          rageBonusPercent: characterAttackRageBonusPercent > 0 ? characterAttackRageBonusPercent : undefined,
          momentumBonusPercent: cs.abilities.some(a => a.id === 'momentum')
            ? characterAttackMomentumBonusPercent
            : undefined,
          isReAttack: isReAttack || undefined,
          elementalOffense: cs.elementalOffense,
        });

        if (enemyHp > 0 && phase === 'close') {
          triggerEnemyCounter(cs, result.damage, enemyInitiativeRoll);
        }

        return result;
      };

      const firstAttackResult = runCharacterAttack(1.0, false);
      if (firstAttackResult && enemyHp > 0 && partyHp > 0) {
        triggerCoveringFire(phase, cs, firstAttackResult.hits, turn.roll);
      }

      if (enemyHp <= 0 || partyHp <= 0) continue;

      const reAttackCount = hasReAttack(cs);
      for (let i = 0; i < reAttackCount && enemyHp > 0 && partyHp > 0; i++) {
        const reAttackResult = runCharacterAttack(0.5, true);
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
