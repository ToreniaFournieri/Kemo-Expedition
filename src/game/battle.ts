import {
  BattleState,
  BattleActionPhase,
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
  TerrainEffectKey,
} from '../types';
import { getTerrainEffectGlossaryEntry } from '../data/glossary';
import { TERRAIN_REACTIVE_AND_TIMED_ABILITY_IDS } from '../data/abilityNames';
import { computePartyStats } from './partyComputation';
import { getBaseMultiplier } from './baseMultiplier';
import { drawFromBag, createPhysicalThreatBag, createMagicalThreatBag, getBagTicketTotal } from './bags';
import { getDeityKey } from './deity';
import { resolveMagicProfile } from './magic';
import { getAbilityDescription, getAbilityName } from './characterComputation';
import {
  buildAntagonismAction,
  buildBindAction,
  buildBurnAction,
  buildConfusionAction,
  buildCorrodeAction,
  buildDeathTouchAction,
  buildDecomposeAction,
  buildEquationBreakerAction,
  buildFlyingAction,
  buildFreeAction,
  buildIncapacitatedAction,
  buildIllusionAction,
  buildIllusionBreakerAction,
  buildLifeDrainAction,
  buildNullBindAction,
  buildNullBurnAction,
  buildNullCorrodeAction,
  buildNullDeathTouchAction,
  buildNullLifeDrainAction,
  buildNullRequiemAction,
  buildNullShockAction,
  buildNullAntagonismAction,
  buildPursuitAction,
  buildRequiemAction,
  buildRegenerationAction,
  buildReanimateAction,
  buildResurrectAction,
  buildSelfDestructAction,
  buildShockAction,
  buildUnforgettableAction,
  buildSoulReapAction,
  buildUnstableCoreAction,
  formatDecomposeNote,
  formatDefeatRecoveryNote,
  formatRegenerationNote,
  getConfusionNoTargetLog,
} from './battleNarration';
import { getRandomTranslation } from '../i18n';

interface BattleContext {
  partyStats: ComputedPartyStats;
  characterStats: ComputedCharacterStats[];
  enemy: EnemyDef;
  party: Party;
  physicalThreatBag: RandomBag;
  magicalThreatBag: RandomBag;
}

interface PendingHowlEffect {
  multiplier: number;
  ownerName: string;
  note: string;
  characterId?: number;
}

function getHeavyStrikePenetPerNoA(level: number): number {
  if (level >= 2) return 0.015;
  if (level >= 1) return 0.01;
  return 0;
}

function getArcaneStabilityHitFloor(level: number): number {
  if (level >= 2) return 0.60;
  if (level >= 1) return 0.55;
  return 0;
}

function getArcMagicOffenseAmplifier(level: number): number {
  if (level >= 3) return 4.2;
  if (level >= 2) return 3.6;
  if (level >= 1) return 3.0;
  return 1.0;
}

function getElementalMultiplier(
  offense: ElementalOffense,
  resistance: Record<'fire' | 'thunder' | 'ice', number>
): number {
  if (offense === 'none') return 1.0;
  return resistance[offense] ?? 1.0;
}

// SpecRef: 6.1.4.1 | Function of attack | f.rage_amplifier
function getCharacterRageAmplifier(
  charStats: ComputedCharacterStats,
  partyHp: number,
  maxPartyHp: number,
  opponentAbilities: AbilityLike[] = [],
): number {
  const rageLevel = charStats.abilities.find(a => a.id === 'rage')?.level ?? 0;
  if (rageLevel <= 0) return 1.0;
  if (hasAbility(opponentAbilities, 'rage_breaker')) return 1.0;
  if (maxPartyHp <= 0) return 1.0;
  const hpRatio = Math.max(0, Math.min(1, partyHp / maxPartyHp));
  const multiplierPerDamageRate = rageLevel >= 2 ? 0.6 : 0.5;
  return Math.min(2.0, 1.0 + (multiplierPerDamageRate * (1.0 - hpRatio)));
}

// SpecRef: 6.1.4.1 | Function of attack | f.rage_amplifier
function getEnemyRageAmplifier(enemy: EnemyDef, enemyHp: number, opponentAbilities: AbilityLike[] = []): number {
  const rageLevel = getEnemyAbilityLevel(enemy, 'rage');
  if (rageLevel <= 0) return 1.0;
  if (hasAbility(opponentAbilities, 'rage_breaker')) return 1.0;
  if (enemy.hp <= 0) return 1.0;
  const hpRatio = Math.max(0, Math.min(1, enemyHp / enemy.hp));
  const multiplierPerDamageRate = rageLevel >= 2 ? 0.6 : 0.5;
  return Math.min(2.0, 1.0 + (multiplierPerDamageRate * (1.0 - hpRatio)));
}

// SpecRef: 6.1.4.1 | Function of attack | f.momentum_amplifer
function getEnemyMomentumAmplifier(enemy: EnemyDef, enemyHp: number, opponentAbilities: AbilityLike[] = []): number {
  const momentumLevel = getEnemyAbilityLevel(enemy, 'momentum');
  if (momentumLevel <= 0) return 1.0;
  if (hasAbility(opponentAbilities, 'momentum_breaker')) return 1.0;
  if (enemy.hp <= 0) return 1.0;
  const hpRatio = Math.max(0, Math.min(1, enemyHp / enemy.hp));
  if (momentumLevel >= 2) {
    return Math.max(0.01, 1.25 - ((1.0 - hpRatio) * 0.4));
  }
  return Math.max(0.01, 1.25 - ((1.0 - hpRatio) * 0.5));
}

function toRageBonusPercent(rageAmplifier: number): number {
  return Math.max(0, Math.round((rageAmplifier - 1.0) * 100));
}

function getClampedHpRatio(currentHp: number, maxHp: number): number {
  if (maxHp <= 0) return 1.0;
  return Math.max(0, Math.min(1, currentHp / maxHp));
}

// SpecRef: 6.1.4.1 | Function of attack | f.swarm.amplifier
function getSwarmAmplifier(
  actorAbilities: AbilityLike[],
  actorCurrentHp: number,
  actorMaxHp: number,
  opponentAbilities: AbilityLike[],
  opponentCurrentHp: number,
  opponentMaxHp: number,
): number {
  let amplifier = 1.0;

  if (hasAbility(actorAbilities, 'swarm')) {
    amplifier *= 1.0 - ((1.0 - getClampedHpRatio(actorCurrentHp, actorMaxHp)) * 0.5);
  }

  if (hasAbility(opponentAbilities, 'swarm')) {
    amplifier *= 1.0 + ((1.0 - getClampedHpRatio(opponentCurrentHp, opponentMaxHp)) * 0.5);
  }

  return amplifier;
}

function getSwarmLogBonuses(
  actorAbilities: AbilityLike[],
  actorCurrentHp: number,
  actorMaxHp: number,
  opponentAbilities: AbilityLike[],
  opponentCurrentHp: number,
  opponentMaxHp: number,
): Pick<BattleLogEntry, 'swarmActorPenaltyPercent' | 'swarmOpponentBonusPercent'> {
  const bonuses: Pick<BattleLogEntry, 'swarmActorPenaltyPercent' | 'swarmOpponentBonusPercent'> = {};

  if (hasAbility(actorAbilities, 'swarm')) {
    bonuses.swarmActorPenaltyPercent = Math.max(
      0,
      Math.round((1.0 - (1.0 - ((1.0 - getClampedHpRatio(actorCurrentHp, actorMaxHp)) * 0.5))) * 100),
    );
  }

  if (hasAbility(opponentAbilities, 'swarm')) {
    bonuses.swarmOpponentBonusPercent = Math.max(
      0,
      Math.round(((1.0 + ((1.0 - getClampedHpRatio(opponentCurrentHp, opponentMaxHp)) * 0.5)) - 1.0) * 100),
    );
  }

  return bonuses;
}

const MUTUAL_MAGIC_AMPLIFY_MULTIPLIERS: Record<number, number> = {
  1: 1.3,
  2: 1.5,
  3: 1.6,
  4: 1.65,
  5: 1.68,
};

const MUTUAL_MAGIC_RESTRAINT_MULTIPLIERS: Record<number, number> = {
  1: 0.77,
  2: 0.67,
  3: 0.63,
  4: 0.61,
  5: 0.59,
};

const MUTUAL_PHYSICAL_AMPLIFY_MULTIPLIERS: Record<number, number> = {
  1: 1.3,
  2: 1.5,
  3: 1.6,
  4: 1.65,
  5: 1.68,
};

const MUTUAL_PHYSICAL_RESTRAINT_MULTIPLIERS: Record<number, number> = {
  1: 0.77,
  2: 0.67,
  3: 0.63,
  4: 0.61,
  5: 0.59,
};

const CORRODE_MULTIPLIERS: Record<number, number> = {
  1: 6 / 7,
  2: 5 / 7,
  3: 4 / 7,
  4: 3 / 7,
  5: 2 / 7,
};

const LIFE_DRAIN_MULTIPLIERS: Record<number, number> = {
  1: 1 / 1000,
  2: 3 / 1000,
  3: 10 / 1000,
  4: 30 / 1000,
  5: 100 / 1000,
  6: 300 / 1000,
  7: 1.0,
};

const AMBUSH_MULTIPLIERS: Record<number, number> = {
  1: 1.3,
  2: 1.5,
  3: 1.6,
  4: 1.65,
  5: 1.68,
};

const OVERWATCH_MULTIPLIERS: Record<number, number> = {
  1: 1.3,
  2: 1.5,
  3: 1.6,
  4: 1.65,
  5: 1.68,
};

const DEATH_TOUCH_NUMERATORS: Record<number, number> = {
  1: 2,
  2: 3,
  3: 4,
  4: 5,
  5: 6,
};

const BURN_PERCENTS: Record<number, number> = {
  1: 0.5,
  2: 0.9,
  3: 1.2,
  4: 1.4,
  5: 1.5,
};

const BIND_NUMERATORS: Record<number, number> = {
  1: 2,
  2: 3,
  3: 4,
  4: 5,
  5: 6,
};

function getHighestAbilityLevel(
  abilities: AbilityLike[],
  abilityId: AbilityId,
): number {
  return abilities
    .filter((ability) => ability.id === abilityId)
    .reduce((maxLevel, ability) => Math.max(maxLevel, ability.level), 0);
}

function getMutualAbilityMultiplier(
  actorAbilities: AbilityLike[],
  opponentAbilities: AbilityLike[],
  abilityId: AbilityId,
  multipliersByLevel: Record<number, number>,
): number | null {
  const highestLevel = Math.max(
    getHighestAbilityLevel(actorAbilities, abilityId),
    getHighestAbilityLevel(opponentAbilities, abilityId),
  );

  return highestLevel > 0 ? (multipliersByLevel[highestLevel] ?? null) : null;
}

// SpecRef: 6.1.4.1 | Function of attack | f.ambush_amplifier
function getAmbushAmplifier(
  actorAbilities: AbilityLike[],
  opponentAbilities: AbilityLike[],
  opponentHasActedInBattle: boolean,
  isNormalAction: boolean,
): number {
  if (!isNormalAction || opponentHasActedInBattle) {
    return 1.0;
  }
  if (hasAbility(opponentAbilities, 'anti_ambush')) {
    return 1.0;
  }

  const ambushLevel = getHighestAbilityLevel(actorAbilities, 'ambush');
  if (ambushLevel <= 0) {
    return 1.0;
  }

  return AMBUSH_MULTIPLIERS[Math.min(5, ambushLevel)] ?? 1.0;
}

// SpecRef: 6.1.4.1 | Function of attack | f.overwatch_amplifier
function getOverwatchAmplifier(
  actorAbilities: AbilityLike[],
  opponentAbilities: AbilityLike[],
  opponentHasActedInBattle: boolean,
  alliedOthersHaveActedInBattle: boolean,
  isNormalAction: boolean,
): number {
  if (!isNormalAction || opponentHasActedInBattle || alliedOthersHaveActedInBattle) {
    return 1.0;
  }
  if (hasAbility(opponentAbilities, 'anti_overwatch')) {
    return 1.0;
  }

  const overwatchLevel = getHighestAbilityLevel(actorAbilities, 'overwatch');
  if (overwatchLevel <= 0) {
    return 1.0;
  }

  return OVERWATCH_MULTIPLIERS[Math.min(5, overwatchLevel)] ?? 1.0;
}

// SpecRef: 6.1.4.1 | Function of attack | f.execution_amplifier
function getExecutionAmplifier(
  actorAbilities: AbilityLike[],
  opponentAbilities: AbilityLike[],
  opponentCurrentHp: number,
  opponentMaxHp: number,
): number {
  const executionLevel = getHighestAbilityLevel(actorAbilities, 'execution');
  if (executionLevel <= 0 || opponentMaxHp <= 0) {
    return 1.0;
  }
  if (hasAbility(opponentAbilities, 'execution_null')) {
    return 1.0;
  }

  const thresholdRate = executionLevel >= 2 ? 0.5 : 0.4;
  const executionMultiplier = executionLevel >= 2 ? 1.8 : 1.5;
  return opponentCurrentHp <= (opponentMaxHp * thresholdRate) ? executionMultiplier : 1.0;
}

// SpecRef: 6.1.4.1 | Function of attack | f.mutual_amplifer
function getMutualAmplifier(
  phase: BattleActionPhase,
  actorAbilities: AbilityLike[],
  opponentAbilities: AbilityLike[],
): number {
  if (phase === 'mid') {
    return getMutualAbilityMultiplier(
      actorAbilities,
      opponentAbilities,
      'mutual_magic_amplify',
      MUTUAL_MAGIC_AMPLIFY_MULTIPLIERS,
    ) ?? getMutualAbilityMultiplier(
      actorAbilities,
      opponentAbilities,
      'mutual_magic_restraint',
      MUTUAL_MAGIC_RESTRAINT_MULTIPLIERS,
    ) ?? 1.0;
  }

  if (phase === 'long' || phase === 'close') {
    return getMutualAbilityMultiplier(
      actorAbilities,
      opponentAbilities,
      'mutual_physical_amplify',
      MUTUAL_PHYSICAL_AMPLIFY_MULTIPLIERS,
    ) ?? getMutualAbilityMultiplier(
      actorAbilities,
      opponentAbilities,
      'mutual_physical_restraint',
      MUTUAL_PHYSICAL_RESTRAINT_MULTIPLIERS,
    ) ?? 1.0;
  }

  return 1.0;
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
  phase: BattleActionPhase,
  hasIllusionAbility: boolean,
  illusionStateId: string,
  consumedIllusionStateIds: Set<string>,
): boolean {
  return phase === 'long' && hasIllusionAbility && !consumedIllusionStateIds.has(illusionStateId);
}

function isPartyIllusionActive(
  phase: BattleActionPhase,
  characterStats: ComputedCharacterStats[],
  consumedPartyIllusion: boolean,
): boolean {
  return phase === 'long' && !consumedPartyIllusion && partyHasIllusionLevel(characterStats, 2);
}

function isStealthActive(
  charStats: ComputedCharacterStats,
  partyHp: number,
  maxPartyHp: number,
  actorAbilities: AbilityLike[] = [],
): boolean {
  if (hasAbility(actorAbilities, 'pursuit')) return false;
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

function isEnemyStealthActive(
  enemy: EnemyDef,
  enemyHp: number,
  attackerAbilities: AbilityLike[] = [],
): boolean {
  if (hasAbility(attackerAbilities, 'pursuit')) return false;
  const stealthLevel = getEnemyAbilityLevel(enemy, 'stealth');
  if (stealthLevel <= 0 || enemy.hp <= 0) return false;
  const threshold = stealthLevel >= 2 ? 0.29 : 0.24;
  return (enemyHp / enemy.hp) <= threshold;
}

// SpecRef: 6.1.4.2 | Function of targeting | f.targeting
function resolveEnemyTarget(
  targetRow: number,
  characterStats: ComputedCharacterStats[],
  phase: BattleActionPhase,
  actorAbilities: AbilityLike[] = [],
): ComputedCharacterStats | null {
  const selectedTarget = characterStats.find(cs => cs.row === targetRow);
  if (!selectedTarget) return null;

  const allowsBulwarkRedirect = phase === 'long' || phase === 'close';
  if (!allowsBulwarkRedirect || hasAbility(actorAbilities, 'bulwark_breaker')) {
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

// SpecRef: 6.1.4.1 | Function of attack | f.momentum_amplifer
function getCharacterMomentumAmplifier(
  charStats: ComputedCharacterStats,
  partyHp: number,
  maxPartyHp: number,
  opponentAbilities: AbilityLike[] = [],
): number {
  const momentumLevel = charStats.abilities.find(a => a.id === 'momentum')?.level ?? 0;
  if (momentumLevel <= 0) return 1.0;
  if (hasAbility(opponentAbilities, 'momentum_breaker')) return 1.0;
  if (maxPartyHp <= 0) return 1.0;
  const hpRatio = Math.max(0, Math.min(1, partyHp / maxPartyHp));
  if (momentumLevel >= 2) {
    return Math.max(0.01, 1.25 - ((1.0 - hpRatio) * 0.4));
  }
  return Math.max(0.01, 1.25 - ((1.0 - hpRatio) * 0.5));
}

function toMomentumBonusPercent(momentumAmplifier: number): number {
  return Math.round((momentumAmplifier - 1.0) * 100);
}

// SpecRef: 6.1.4.2 | Function of targeting | f.targeting
// Get target row index (1-6) using threat bag
function getTargetRow(ctx: BattleContext, phase: BattleActionPhase): { row: number; newCtx: BattleContext } {
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

// SpecRef: 6.1.4.1 | Function of attack | f.damage_calculation
// Calculate single attack damage (without NoA multiplier)
function calculateSingleEnemyAttackDamage(
  phase: BattleActionPhase,
  enemy: EnemyDef,
  characterStats: ComputedCharacterStats[],
  targetCharStats: ComputedCharacterStats,
  enemyHp: number,
  partyHp: number,
  maxPartyHp: number,
  terrainEffect?: TerrainEffectKey | null,
  runtimeOffenseMultiplier: number = 1.0,
  echoDomainElementalUsageCount: number = 0,
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
      defenseAmplifier = Math.max(0.01, targetCharStats.physicalDefenseAmplifier * targetCharStats.deityDefenseAmplifierBonus.physical);
      break;
    case 'mid':
      attack = enemy.magicalAttack;
      amplifier = enemy.magicalAttackAmplifier;
      defense = targetCharStats.magicalDefense;
      defenseAmplifier = Math.max(0.01, targetCharStats.magicalDefenseAmplifier * targetCharStats.deityDefenseAmplifierBonus.magical);
      break;
    case 'close':
      attack = enemy.meleeAttack;
      amplifier = enemy.meleeAttackAmplifier;
      defense = targetCharStats.physicalDefense;
      defenseAmplifier = Math.max(0.01, targetCharStats.physicalDefenseAmplifier * targetCharStats.deityDefenseAmplifierBonus.physical);
      break;
  }

  if (attack === 0) return 0;

  const enemyHeavyStrikeLevel = getEnemyAbilityLevel(enemy, 'heavy_strike');
  const heavyStrikePenetPerNoA = getHeavyStrikePenetPerNoA(enemyHeavyStrikeLevel);
  const baseNoA = getEnemyBaseNoA(phase, enemy);
  const adjustedNoA = getEnemyNoA(phase, enemy);
  const heavyStrikeNoALoss = Math.max(0, baseNoA - adjustedNoA);
  const effectiveDefense = defense * (1 - (heavyStrikeNoALoss * heavyStrikePenetPerNoA));
  if (enemyHeavyStrikeLevel > 0) {
    amplifier *= 1.4;
  }
  // SpecRef: 2.1.1.2 | Multiplier and Functions | character.f.offense_amplifier
  // a.arc-magic: magical offense amplifier xN (Lv1:3.0, Lv2:3.6, Lv3:4.2).
  if (phase === 'mid') {
    amplifier *= getArcMagicOffenseAmplifier(getEnemyAbilityLevel(enemy, 'arc_magic'));
  }

  const elementalMultiplier = enemy.elementalOffense === 'none'
    ? 1.0
    : targetCharStats.elementalDefenseMultipliers[enemy.elementalOffense] ?? 1.0;

  const partyDefenseAbilityAmplifier = getPartyDefenseAbilityAmplifier(phase, characterStats, targetCharStats.row, enemy.abilities);
  const rageAmplifier = getEnemyRageAmplifier(enemy, enemyHp, targetCharStats.abilities);
  const momentumAmplifier = getEnemyMomentumAmplifier(enemy, enemyHp, targetCharStats.abilities);
  const mutualAmplifier = getMutualAmplifier(phase, enemy.abilities, targetCharStats.abilities);
  const terrainAmplifier = getTerrainAmplifier(phase, terrainEffect, false, enemy.abilities);
  const elementalOffenseAttributeAmplifier = getElementalOffenseAttributeAmplifier(terrainEffect, enemy.elementalOffense, echoDomainElementalUsageCount, enemy.abilities);
  const swarmAmplifier = getSwarmAmplifier(
    enemy.abilities,
    enemyHp,
    enemy.hp,
    targetCharStats.abilities,
    partyHp,
    maxPartyHp,
  );
  const rawDamage = (attack - effectiveDefense) * amplifier * runtimeOffenseMultiplier * enemy.elementalOffenseValue * elementalMultiplier * defenseAmplifier * partyDefenseAbilityAmplifier * rageAmplifier * momentumAmplifier * mutualAmplifier * terrainAmplifier * elementalOffenseAttributeAmplifier * swarmAmplifier;
  const totalDamage = Math.max(1, rawDamage);

  return applyTerrainDamageOverride(Math.floor(totalDamage), terrainEffect, maxPartyHp, enemy.abilities);
}

function getEnemyBaseNoA(phase: BattleActionPhase, enemy: EnemyDef): number {
  switch (phase) {
    case 'long': return enemy.rangedNoA;
    case 'mid': return enemy.magicalNoA;
    case 'close': return enemy.meleeNoA;
  }
}

function hasEnemyArcMagic(enemy: EnemyDef): boolean {
  return getEnemyAbilityLevel(enemy, 'arc_magic') > 0;
}

// Get number of attacks for enemy in a phase
function getEnemyNoA(phase: BattleActionPhase, enemy: EnemyDef): number {
  // SpecRef: 2.1.1.2 | Multiplier and Functions | character.f.NoA
  let adjustedNoA = getEnemyBaseNoA(phase, enemy);
  const heavyStrikeLevel = getEnemyAbilityLevel(enemy, 'heavy_strike');
  if (heavyStrikeLevel > 0) {
    adjustedNoA = Math.ceil(adjustedNoA / 2);
  }
  if (phase === 'mid' && hasEnemyArcMagic(enemy)) {
    adjustedNoA = Math.ceil(adjustedNoA / 3);
  }
  return adjustedNoA;
}


function getFrontRowAbilityLevel(
  characterStats: ComputedCharacterStats[],
  actorRow: number,
  abilityId: 'defender' | 'command' | 'm_barrier',
): number {
  let bestLevel = 0;
  for (const stats of characterStats) {
    if (stats.row >= actorRow) continue;
    const level = stats.abilities
      .filter((ability) => ability.id === abilityId)
      .reduce((maxLevel, ability) => Math.max(maxLevel, ability.level), 0);
    bestLevel = Math.max(bestLevel, level);
  }
  return bestLevel;
}

function getPartyOffenseAbilityAmplifier(
  phase: BattleActionPhase,
  characterStats: ComputedCharacterStats[],
  actorRow: number,
): number {
  if (phase !== 'long' && phase !== 'close') return 1.0;
  const commandLevel = getFrontRowAbilityLevel(characterStats, actorRow, 'command');
  return commandLevel >= 3 ? 1.6 : commandLevel === 2 ? 1.5 : commandLevel === 1 ? 1.4 : 1.0;
}

function getPartyDefenseAbilityAmplifier(
  phase: BattleActionPhase,
  characterStats: ComputedCharacterStats[],
  actorRow: number,
  opponentAbilities: AbilityLike[] = [],
): number {
  // SpecRef: 6.1.2 | Function of battle | party.f.abilities_defense_amplifier
  // SpecRef: 6.1.2 | Function of battle | a.m-barrier-breaker
  if (phase === 'mid') {
    if (hasAbility(opponentAbilities, 'm_barrier_breaker')) {
      return 1.0;
    }
    const mBarrierLevel = getFrontRowAbilityLevel(characterStats, actorRow, 'm_barrier');
    return mBarrierLevel >= 3 ? 1 / 2 : mBarrierLevel === 2 ? 3 / 5 : mBarrierLevel === 1 ? 2 / 3 : 1.0;
  }

  const defenderLevel = getFrontRowAbilityLevel(characterStats, actorRow, 'defender');
  return defenderLevel >= 3 ? 1 / 2 : defenderLevel === 2 ? 3 / 5 : defenderLevel === 1 ? 2 / 3 : 1.0;
}

// SpecRef: 6.1.4.1 | Function of attack | f.terrain_amplifier
function getTerrainAmplifier(
  phase: BattleActionPhase,
  terrainEffect?: TerrainEffectKey | null,
  isOpponentEnemy: boolean = false,
  actorAbilities: AbilityLike[] = [],
): number {
  if (!terrainEffect) return 1.0;
  if ((phase === 'long' || phase === 'close') && terrainEffect === 'terrain.exposure') return 1.3;
  if ((phase === 'long' || phase === 'close') && terrainEffect === 'terrain.dark-field') return 1.45;
  if (terrainEffect === 'terrain.frenzy') return 1.25;
  if (phase === 'mid' && terrainEffect === 'terrain.light-field') return 1.45;
  if (phase === 'mid' && terrainEffect === 'terrain.sanctuary') return 0.67;
  if (isOpponentEnemy && terrainEffect === 'terrain.fortified' && !hasAbility(actorAbilities, 'siege')) return 0.75;
  return 1.0;
}

// SpecRef: 6.1.4.1 | Function of attack | f.elemental_offense_attribute_amplifier
function getElementalOffenseAttributeAmplifier(
  terrainEffect: TerrainEffectKey | null | undefined,
  elementalOffense: ElementalOffense,
  echoDomainElementalUsageCount: number = 0,
  actorAbilities: AbilityLike[] = [],
): number {
  if (!terrainEffect) return 1.0;
  if (terrainEffect === 'terrain.thunderstorm' && elementalOffense === 'thunder') return 1.5;
  // SpecRef: 6.1.4.1 | Function of attack | a.dryproof
  if (terrainEffect === 'terrain.dry' && elementalOffense === 'ice' && !hasAbility(actorAbilities, 'dryproof')) return 0.5;
  // SpecRef: 6.1.4.1 | Function of attack | a.domain-breaker
  if (terrainEffect === 'terrain.echo-domain' && elementalOffense !== 'none' && !hasAbility(actorAbilities, 'domain_breaker')) {
    return 1.0 + (0.1 * Math.max(0, echoDomainElementalUsageCount - 1));
  }
  return 1.0;
}

type ElementalOffenseUsageCounter = Record<'fire' | 'ice' | 'thunder', number>;

function countElementalOffenseUsage(
  terrainEffect: TerrainEffectKey | null | undefined,
  elementalOffense: ElementalOffense,
  usageCounter: ElementalOffenseUsageCounter | undefined,
  actorAbilities: AbilityLike[] = [],
): number {
  if (
    terrainEffect !== 'terrain.echo-domain'
    || elementalOffense === 'none'
    || !usageCounter
    || hasAbility(actorAbilities, 'domain_breaker')
  ) return 0;
  const nextCount = (usageCounter[elementalOffense] ?? 0) + 1;
  usageCounter[elementalOffense] = nextCount;
  return nextCount;
}

// SpecRef: 6.1.3.1 | Actor action | f.NoA
function getTerrainNoAAmplifier(
  phase: BattleActionPhase,
  terrainEffect?: TerrainEffectKey | null,
  actorAbilities: AbilityLike[] = [],
): number {
  // SpecRef: 6.1.3.1 | Actor action | f.NoA
  // a.output-stabilizer: Ignore terrain-based NoA amplification/reduction.
  if (hasAbility(actorAbilities, 'output_stabilizer')) return 1.0;
  if (!terrainEffect) return 1.0;
  if (phase === 'close' && terrainEffect === 'terrain.rough-waves') return 0.75;
  if (phase === 'long' && terrainEffect === 'terrain.heavy-wind') {
    return hasAbility(actorAbilities, 'wind_rider') ? 0.5 : 0.75;
  }
  if (phase === 'long' && terrainEffect === 'terrain.burrow') return 0.5;
  if (terrainEffect === 'terrain.low-gravity') return 1.3;
  if (terrainEffect === 'terrain.gravity') return 0.7;
  if ((phase === 'mid' || phase === 'close') && terrainEffect === 'terrain.limestone-cave') return 1.5;
  return 1.0;
}

// SpecRef: 6.1.4.1 | Function of attack | f.damage_calculation
function applyTerrainDamageOverride(
  perHitDamage: number,
  terrainEffect: TerrainEffectKey | null | undefined,
  opponentMaxHp: number,
  actorAbilities: AbilityLike[] = [],
): number {
  // SpecRef: 6.1.4.1 | Function of attack | a.domain-breaker
  if (hasAbility(actorAbilities, 'domain_breaker')) return perHitDamage;
  if (terrainEffect === 'terrain.floor-domain') {
    return Math.max(Math.floor(opponentMaxHp * 0.01), perHitDamage);
  }

  if (terrainEffect === 'terrain.cap-domain') {
    return Math.min(Math.floor(opponentMaxHp * 0.05), perHitDamage);
  }

  return perHitDamage;
}

// SpecRef: 6.1.4.1 | Function of attack | f.damage_calculation
// SpecRef: 6.1.4.2 | Function of targeting | f.hit_detection
function calculateCharacterFriendlyFireDamage(
  phase: BattleActionPhase,
  attacker: ComputedCharacterStats,
  target: ComputedCharacterStats,
  characterStats: ComputedCharacterStats[],
  partyStats: ComputedPartyStats,
  partyHp: number,
  partyDeityKey: string | null,
  terrainEffect?: TerrainEffectKey | null,
  noAMultiplier: number = 1.0,
  temporaryAccuracyBonus: number = 0,
  runtimeOffenseMultiplier: number = 1.0,
  echoDomainElementalUsageCount: number = 0,
): CharacterAttackResult {
  let attack = 0;
  let noA = 0;
  let defense = 0;
  let defenseAmplifier = 1.0;

  if (phase === 'long') {
    attack = attacker.rangedAttack;
    noA = attacker.rangedNoA;
    defense = target.physicalDefense;
    defenseAmplifier = Math.max(0.01, target.physicalDefenseAmplifier * target.deityDefenseAmplifierBonus.physical);
  } else if (phase === 'mid') {
    attack = attacker.magicalAttack;
    noA = attacker.magicalNoA;
    defense = target.magicalDefense;
    defenseAmplifier = Math.max(0.01, target.magicalDefenseAmplifier * target.deityDefenseAmplifierBonus.magical);
  } else {
    attack = attacker.meleeAttack;
    noA = attacker.meleeNoA;
    defense = target.physicalDefense;
    defenseAmplifier = Math.max(0.01, target.physicalDefenseAmplifier * target.deityDefenseAmplifierBonus.physical);
  }

  noA = Math.ceil(noA * noAMultiplier * getTerrainNoAAmplifier(phase, terrainEffect, attacker.abilities));
  if (noA <= 0 || attack <= 0) return { damage: 0, totalAttempts: 0, hits: 0 };

  const phaseAttackScale = phase === 'mid'
    ? getBaseMultiplier(attacker.baseStats.intelligence, 'attack')
    : getBaseMultiplier(attacker.baseStats.strength, 'attack');

  const iaigiri = attacker.abilities.find(a => a.id === 'iaigiri');
  const heavyStrike = attacker.abilities.find(a => a.id === 'heavy_strike');
  const heavyStrikePenetPerNoA = getHeavyStrikePenetPerNoA(heavyStrike?.level ?? 0);
  const heavyStrikeNoALoss = phase === 'long'
    ? Math.max(0, attacker.originalRangedNoA - attacker.rangedNoA)
    : phase === 'mid'
      ? Math.max(0, attacker.originalMagicalNoA - attacker.magicalNoA)
    : phase === 'close'
      ? Math.max(0, attacker.originalMeleeNoA - attacker.meleeNoA)
      : 0;
  const effectiveDefenseWithHeavyStrike = defense * (1 - (attacker.penetMultiplier + (heavyStrikeNoALoss * heavyStrikePenetPerNoA)));
  const iaigiriMultiplier = iaigiri ? (iaigiri.level >= 3 ? 2.0 : iaigiri.level >= 2 ? 1.8 : 1.6) : 1.0;
  const phaseBonusSum = phase === 'mid'
    ? attacker.magicalAttackCBonus
    : (phase === 'long' ? attacker.rangedAttackCBonus : attacker.meleeAttackCBonus);

  let offenseAmplifier = 1.0;
  const arcMagicLevel = getAbilityLevelFromList(attacker.abilities, 'arc_magic');
  if (phase === 'mid') {
    offenseAmplifier = ((1.0 + phaseBonusSum) * attacker.magicalOffenseMultiplier + attacker.deityOffenseAmplifierBonus) * phaseAttackScale;
    // SpecRef: 2.1.1.2 | Multiplier and Functions | character.f.offense_amplifier
    // a.arc-magic: magical offense amplifier xN (Lv1:3.0, Lv2:3.6, Lv3:4.2).
    offenseAmplifier *= getArcMagicOffenseAmplifier(arcMagicLevel);
  } else if (iaigiri) {
    offenseAmplifier = (iaigiriMultiplier * (1.0 + phaseBonusSum) * attacker.physicalOffenseMultiplier + attacker.deityOffenseAmplifierBonus) * phaseAttackScale;
  } else {
    offenseAmplifier = ((1.0 + phaseBonusSum + attacker.physicalAttackCBonus) * attacker.physicalOffenseMultiplier + attacker.deityOffenseAmplifierBonus) * phaseAttackScale;
  }
  if (heavyStrike) {
    offenseAmplifier *= 1.4;
  }

  const elementalMultiplier = attacker.elementalOffense === 'none'
    ? 1.0
    : target.elementalDefenseMultipliers[attacker.elementalOffense] ?? 1.0;

  const rageAmplifier = getCharacterRageAmplifier(attacker, partyHp, partyStats.hp, target.abilities);
  const momentumAmplifier = getCharacterMomentumAmplifier(attacker, partyHp, partyStats.hp, target.abilities);
  const mutualAmplifier = getMutualAmplifier(phase, attacker.abilities, target.abilities);
  const terrainAmplifier = getTerrainAmplifier(phase, terrainEffect, false, attacker.abilities);
  const elementalOffenseAttributeAmplifier = getElementalOffenseAttributeAmplifier(terrainEffect, attacker.elementalOffense, echoDomainElementalUsageCount, attacker.abilities);
  const swarmAmplifier = getSwarmAmplifier(
    attacker.abilities,
    partyHp,
    partyStats.hp,
    target.abilities,
    partyHp,
    partyStats.hp,
  );

  const partyOffenseAmplifier = getPartyOffenseAbilityAmplifier(phase, characterStats, attacker.row);
  const basePerHitDamage = Math.max(1, Math.floor(
    (attack - effectiveDefenseWithHeavyStrike)
      * offenseAmplifier
      * runtimeOffenseMultiplier
      * attacker.elementalOffenseValue
      * elementalMultiplier
      * defenseAmplifier
      * partyOffenseAmplifier
      * rageAmplifier
      * momentumAmplifier
      * mutualAmplifier
      * terrainAmplifier
      * elementalOffenseAttributeAmplifier
      * swarmAmplifier
  ));
  const terrainAdjustedPerHitDamage = applyTerrainDamageOverride(basePerHitDamage, terrainEffect, partyStats.hp, attacker.abilities);

  const actorAccuracyPotency = phase === 'mid' ? 1.0 : attacker.accuracyPotency;
  const actorFocusLevel = attacker.abilities.find(a => a.id === 'focus')?.level ?? 0;
  const targetDeflectionLevel = getDeflectionLevel(target);
  const resonance = attacker.abilities.find(a => a.id === 'resonance');
  const canApplyResonance = phase === 'mid'
    || (phase === 'long' && partyDeityKey === 'God of Resonance' && terrainEffect !== 'terrain.gehenna');

  let hits = 0;
  let damage = 0;
  for (let i = 1; i <= noA; i++) {
    if (hitDetection(
      actorAccuracyPotency,
      attacker.accuracyBonus + temporaryAccuracyBonus,
      target.evasionBonus,
      i,
      phase,
      targetDeflectionLevel,
      actorFocusLevel,
      terrainEffect,
      attacker.abilities.find((ability) => ability.id === 'arcane_stability')?.level ?? 0,
      hasAbility(attacker.abilities, 'true_sight'),
      hasAbility(attacker.abilities, 'domain_breaker'),
    )) {
      hits += 1;
      const resonanceAmplifier = canApplyResonance ? getResonanceAmplifier(resonance?.level, hits) : 1.0;
      damage += Math.max(1, Math.floor(terrainAdjustedPerHitDamage * resonanceAmplifier));
    }
  }

  return { damage, totalAttempts: noA, hits };
}


interface CharacterAttackResult {
  damage: number;
  totalAttempts: number;
  hits: number;
  wasNegatedByEnemyIllusion?: boolean;
  wasNegatedByEnemyStealth?: boolean;
  wasNegatedByMagicSeal?: boolean;
  reflectedDamage?: number;
  reflectedSourceDamage?: number;
  nullifiedBy?: NullDescriptor;
  absorbedDamage?: number;
  absorbedBy?: AbsorbDescriptor;
}

type ReflectDescriptor = {
  abilityId: AbilityId;
  name: '氷結反射' | '火炎反射' | '雷撃反射' | '魔法反射' | '矢返し' | '打ち返し';
  summary: '氷属性' | '火属性' | '雷属性' | '魔法' | '遠距離' | '近接';
  amplifier: number;
  reflectedPortionText: string;
  receivedPortionText: string;
};

type NullDescriptor = {
  abilityId: AbilityId;
  name: '氷結無効' | '火炎無効' | '雷撃無効' | '魔法無効' | '遠距離無効' | '近接無効';
  summary: '氷属性' | '火属性' | '雷属性' | '魔法' | '遠距離' | '近接';
};

type AbsorbDescriptor = {
  abilityId: AbilityId;
  name: '氷結吸収' | '火炎吸収' | '雷撃吸収' | '魔法吸収';
  summary: '氷属性' | '火属性' | '雷属性' | '魔法';
  amplifier: number;
  absorbedPortionText: string;
};

type DefensiveReaction =
  | { type: 'reflect'; descriptor: ReflectDescriptor }
  | { type: 'absorb'; descriptor: AbsorbDescriptor }
  | { type: 'nullify'; descriptor: NullDescriptor };

function getElementalReflectAmplifier(level: number): number {
  if (level >= 5) return 0.5;
  if (level === 4) return 0.35;
  if (level === 3) return 0.2;
  if (level === 2) return 0.1;
  return 0.05;
}

function getReflectPortionText(amplifier: number): string {
  if (amplifier >= 1.0) return '全';
  return `${Math.round(amplifier * 10)}/10`;
}

function getPercentPortionText(amplifier: number): string {
  return `${Math.round(amplifier * 100)}%`;
}

function getAbsorbAmplifier(level: number): number {
  if (level >= 5) return 1.0;
  if (level === 4) return 0.7;
  if (level === 3) return 0.5;
  if (level === 2) return 0.3;
  return 0.1;
}

function getReflectDescriptor(
  phase: BattleActionPhase,
  elementalOffense: ElementalOffense,
  defenderAbilities: AbilityLike[],
  attackerAbilities: AbilityLike[],
): ReflectDescriptor | null {
  const iceLevel = getAbilityLevelFromList(defenderAbilities, 'ice_reflect');
  if (elementalOffense === 'ice' && iceLevel > 0 && !hasAbility(attackerAbilities, 'ice_protect_breaker')) {
    const amplifier = getElementalReflectAmplifier(iceLevel);
    return {
      abilityId: 'ice_reflect',
      name: '氷結反射',
      summary: '氷属性',
      amplifier,
      reflectedPortionText: getPercentPortionText(amplifier),
      receivedPortionText: getPercentPortionText(1 - amplifier),
    };
  }

  const fireLevel = getAbilityLevelFromList(defenderAbilities, 'fire_reflect');
  if (elementalOffense === 'fire' && fireLevel > 0 && !hasAbility(attackerAbilities, 'fire_protect_breaker')) {
    const amplifier = getElementalReflectAmplifier(fireLevel);
    return {
      abilityId: 'fire_reflect',
      name: '火炎反射',
      summary: '火属性',
      amplifier,
      reflectedPortionText: getPercentPortionText(amplifier),
      receivedPortionText: getPercentPortionText(1 - amplifier),
    };
  }

  const thunderLevel = getAbilityLevelFromList(defenderAbilities, 'thunder_reflect');
  if (elementalOffense === 'thunder' && thunderLevel > 0 && !hasAbility(attackerAbilities, 'thunder_protect_breaker')) {
    const amplifier = getElementalReflectAmplifier(thunderLevel);
    return {
      abilityId: 'thunder_reflect',
      name: '雷撃反射',
      summary: '雷属性',
      amplifier,
      reflectedPortionText: getPercentPortionText(amplifier),
      receivedPortionText: getPercentPortionText(1 - amplifier),
    };
  }

  const rangedLevel = getAbilityLevelFromList(defenderAbilities, 'ranged_reflect');
  if (phase === 'long' && rangedLevel > 0) {
    const amplifier = getElementalReflectAmplifier(rangedLevel);
    return {
      abilityId: 'ranged_reflect',
      name: '矢返し',
      summary: '遠距離',
      amplifier,
      reflectedPortionText: getPercentPortionText(amplifier),
      receivedPortionText: getPercentPortionText(1 - amplifier),
    };
  }

  const magicalLevel = getAbilityLevelFromList(defenderAbilities, 'magical_reflect');
  if (phase === 'mid' && magicalLevel > 0 && !hasAbility(attackerAbilities, 'm_barrier_breaker')) {
    const amplifier = getElementalReflectAmplifier(magicalLevel);
    return {
      abilityId: 'magical_reflect',
      name: '魔法反射',
      summary: '魔法',
      amplifier,
      reflectedPortionText: getPercentPortionText(amplifier),
      receivedPortionText: getPercentPortionText(1 - amplifier),
    };
  }

  const meleeLevel = getAbilityLevelFromList(defenderAbilities, 'melee_reflect');
  if (phase === 'close' && meleeLevel > 0) {
    const amplifier = getElementalReflectAmplifier(meleeLevel);
    return {
      abilityId: 'melee_reflect',
      name: '打ち返し',
      summary: '近接',
      amplifier,
      reflectedPortionText: getPercentPortionText(amplifier),
      receivedPortionText: getPercentPortionText(1 - amplifier),
    };
  }

  return null;
}

function getAbsorbDescriptor(
  phase: BattleActionPhase,
  elementalOffense: ElementalOffense,
  defenderAbilities: AbilityLike[],
  attackerAbilities: AbilityLike[],
): AbsorbDescriptor | null {
  const iceLevel = getAbilityLevelFromList(defenderAbilities, 'ice_absorb');
  if (elementalOffense === 'ice' && iceLevel > 0 && !hasAbility(attackerAbilities, 'ice_protect_breaker')) {
    const amplifier = getAbsorbAmplifier(iceLevel);
    return {
      abilityId: 'ice_absorb',
      name: '氷結吸収',
      summary: '氷属性',
      amplifier,
      absorbedPortionText: getReflectPortionText(amplifier),
    };
  }

  const fireLevel = getAbilityLevelFromList(defenderAbilities, 'fire_absorb');
  if (elementalOffense === 'fire' && fireLevel > 0 && !hasAbility(attackerAbilities, 'fire_protect_breaker')) {
    const amplifier = getAbsorbAmplifier(fireLevel);
    return {
      abilityId: 'fire_absorb',
      name: '火炎吸収',
      summary: '火属性',
      amplifier,
      absorbedPortionText: getReflectPortionText(amplifier),
    };
  }

  const thunderLevel = getAbilityLevelFromList(defenderAbilities, 'thunder_absorb');
  if (elementalOffense === 'thunder' && thunderLevel > 0 && !hasAbility(attackerAbilities, 'thunder_protect_breaker')) {
    const amplifier = getAbsorbAmplifier(thunderLevel);
    return {
      abilityId: 'thunder_absorb',
      name: '雷撃吸収',
      summary: '雷属性',
      amplifier,
      absorbedPortionText: getReflectPortionText(amplifier),
    };
  }

  const magicalLevel = getAbilityLevelFromList(defenderAbilities, 'magical_absorb');
  if (phase === 'mid' && magicalLevel > 0 && !hasAbility(attackerAbilities, 'm_barrier_breaker')) {
    const amplifier = getAbsorbAmplifier(magicalLevel);
    return {
      abilityId: 'magical_absorb',
      name: '魔法吸収',
      summary: '魔法',
      amplifier,
      absorbedPortionText: getReflectPortionText(amplifier),
    };
  }

  return null;
}

function getNullDescriptor(
  phase: BattleActionPhase,
  elementalOffense: ElementalOffense,
  defenderAbilities: AbilityLike[],
): NullDescriptor | null {
  const iceLevel = getAbilityLevelFromList(defenderAbilities, 'ice_null');
  if (elementalOffense === 'ice' && iceLevel > 0) {
    return {
      abilityId: 'ice_null',
      name: '氷結無効',
      summary: '氷属性',
    };
  }

  const fireLevel = getAbilityLevelFromList(defenderAbilities, 'fire_null');
  if (elementalOffense === 'fire' && fireLevel > 0) {
    return {
      abilityId: 'fire_null',
      name: '火炎無効',
      summary: '火属性',
    };
  }

  const thunderLevel = getAbilityLevelFromList(defenderAbilities, 'thunder_null');
  if (elementalOffense === 'thunder' && thunderLevel > 0) {
    return {
      abilityId: 'thunder_null',
      name: '雷撃無効',
      summary: '雷属性',
    };
  }

  const rangedLevel = getAbilityLevelFromList(defenderAbilities, 'ranged_null');
  if (phase === 'long' && rangedLevel > 0) {
    return {
      abilityId: 'ranged_null',
      name: '遠距離無効',
      summary: '遠距離',
    };
  }

  const magicalLevel = getAbilityLevelFromList(defenderAbilities, 'magical_null');
  if (phase === 'mid' && magicalLevel > 0) {
    return {
      abilityId: 'magical_null',
      name: '魔法無効',
      summary: '魔法',
    };
  }

  const meleeLevel = getAbilityLevelFromList(defenderAbilities, 'melee_null');
  if (phase === 'close' && meleeLevel > 0) {
    return {
      abilityId: 'melee_null',
      name: '近接無効',
      summary: '近接',
    };
  }

  return null;
}

function getDefensiveReaction(
  phase: BattleActionPhase,
  elementalOffense: ElementalOffense,
  defenderAbilities: AbilityLike[],
  attackerAbilities: AbilityLike[],
): DefensiveReaction | null {
  // SpecRef: 6.1.2 | Function of battle | intercept
  // SpecRef: 6.1.2 | Function of battle | a.fire-protect-breaker
  // SpecRef: 6.1.2 | Function of battle | a.ice-protect-breaker
  // SpecRef: 6.1.2 | Function of battle | a.thunder-protect-breaker
  // SpecRef: 6.1.2 | Function of battle | a.m-barrier-breaker
  const absorb = getAbsorbDescriptor(phase, elementalOffense, defenderAbilities, attackerAbilities);
  if (absorb) {
    return { type: 'absorb', descriptor: absorb };
  }

  const nullify = getNullDescriptor(phase, elementalOffense, defenderAbilities);
  if (nullify) {
    return { type: 'nullify', descriptor: nullify };
  }

  const reflect = getReflectDescriptor(phase, elementalOffense, defenderAbilities, attackerAbilities);
  if (reflect) {
    return { type: 'reflect', descriptor: reflect };
  }

  return null;
}

// SpecRef: 6.1.4.1 | Function of attack | f.resonance_amplifier
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
  actorAbilities: Array<{ id: AbilityId; level: number }>,
  successfulHits: number,
  canApplyResonance: boolean
): string {
  if (!canApplyResonance || successfulHits <= 0) {
    return '';
  }

  const resonance = actorAbilities.find(a => a.id === 'resonance');
  if (!resonance) {
    return '';
  }

  const bonusPercent = getResonanceBonusPerHit(resonance.level) * successfulHits;
  return `(共鳴+${bonusPercent}%)`;
}

function mergeAttackBonusLogText(...bonusTexts: string[]): string {
  const normalized = bonusTexts
    .map((text) => text.trim())
    .filter((text) => text.length > 0)
    .map((text) => (text.startsWith('(') && text.endsWith(')')) ? text.slice(1, -1) : text);

  if (normalized.length === 0) return '';
  return `(${normalized.join(', ')})`;
}

// Hit detection for physical attacks (LONG and CLOSE phases)
// decay_of_accuracy = clamp(0.86, 0.90 + actor.accuracy - opponent.evasion, 0.98)
// chance = d.accuracy_potency * (decay_of_accuracy)^(Nth_hit - 1)
function roundUpToThirdDecimal(value: number): number {
  return Math.ceil((value + Number.EPSILON) * 1000) / 1000;
}

// SpecRef: 6.1.4.2 | Function of targeting | f.hit_detection
function hitDetection(
  actorAccuracyPotency: number,
  actorAccuracyBonus: number,
  opponentEvasionBonus: number,
  nthHit: number, // 1-indexed
  phase: BattleActionPhase,
  opponentDeflectionLevel: number,
  actorFocusLevel: number,
  terrainEffect?: TerrainEffectKey | null,
  actorArcaneStabilityLevel: number = 0,
  actorHasTrueSight: boolean = false,
  actorHasDomainBreaker: boolean = false,
): boolean {
  if (!actorHasDomainBreaker && (
    (phase === 'long' && terrainEffect === 'terrain.sniper-domain')
    || (phase === 'mid' && terrainEffect === 'terrain.spell-domain')
    || (phase === 'close' && terrainEffect === 'terrain.duelist-domain')
  )) {
    return true;
  }

  const focusMultiplier = actorFocusLevel >= 2 ? 1.3 : actorFocusLevel >= 1 ? 1.2 : 1.0;
  let effectiveAccuracyBonus = actorFocusLevel > 0
    ? roundUpToThirdDecimal(actorAccuracyBonus * focusMultiplier)
    : actorAccuracyBonus;
  if (phase === 'long' && terrainEffect === 'terrain.fog' && !actorHasTrueSight) {
    effectiveAccuracyBonus -= 25;
  } else if (phase === 'long' && terrainEffect === 'terrain.sunny-beach') {
    effectiveAccuracyBonus += 20;
  }
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
  const minChanceByArcaneStability = getArcaneStabilityHitFloor(actorArcaneStabilityLevel);
  return Math.random() <= Math.max(chance, minChanceByArcaneStability);
}

// SpecRef: 6.1.4.1 | Function of attack | f.damage_calculation
// SpecRef: 6.1.4.2 | Function of targeting | f.hit_detection
function calculateCharacterDamage(
  phase: BattleActionPhase,
  charStats: ComputedCharacterStats,
  character: Character,
  enemy: EnemyDef,
  enemyHp: number,
  characterStats: ComputedCharacterStats[],
  partyStats: ComputedPartyStats,
  partyHp: number,
  partyDeityKey: string | null,
  terrainEffect?: TerrainEffectKey | null,
  noAMultiplier: number = 1.0, // For counter/re-attack, use 0.5
  temporaryAccuracyBonus: number = 0,
  temporaryTargetEvasionBonus: number = 0,
  runtimeOffenseMultiplier: number = 1.0,
  echoDomainElementalUsageCount: number = 0,
): CharacterAttackResult {
  let attack = 0;
  let noA = 0;
  let defense = 0;
  let defenseAmplifier = enemy.physicalDefenseAmplifier;

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
      defenseAmplifier = enemy.magicalDefenseAmplifier;
      break;
    case 'close':
      attack = charStats.meleeAttack;
      noA = charStats.meleeNoA;
      defense = enemy.physicalDefense;
      break;
  }

  // Apply NoA multiplier and round up
  noA = Math.ceil(noA * noAMultiplier * getTerrainNoAAmplifier(phase, terrainEffect, charStats.abilities));

  if (noA === 0 || attack <= 0) return { damage: 0, totalAttempts: 0, hits: 0 };

  // Apply penetration
  const heavyStrike = charStats.abilities.find((ability) => ability.id === 'heavy_strike');
  const heavyStrikePenetPerNoA = getHeavyStrikePenetPerNoA(heavyStrike?.level ?? 0);
  const heavyStrikeNoALoss = phase === 'long'
    ? Math.max(0, charStats.originalRangedNoA - charStats.rangedNoA)
    : phase === 'mid'
      ? Math.max(0, charStats.originalMagicalNoA - charStats.magicalNoA)
    : phase === 'close'
      ? Math.max(0, charStats.originalMeleeNoA - charStats.meleeNoA)
      : 0;
  const effectiveDefense = defense * (1 - (charStats.penetMultiplier + (heavyStrikeNoALoss * heavyStrikePenetPerNoA)));

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
      ? 2.0
      : iaigiri.level >= 2
        ? 1.8
        : 1.6
    : 1.0;
  const appliedOffenseBonusNames = new Set<string>(charStats.offenseCBonusNames);
  const meleeBonusSum = charStats.meleeAttackCBonus + getUniqueOffenseBonusSum('melee', appliedOffenseBonusNames);
  const rangedBonusSum = charStats.rangedAttackCBonus + getUniqueOffenseBonusSum('ranged', appliedOffenseBonusNames);
  const magicalBonusSum = charStats.magicalAttackCBonus + getUniqueOffenseBonusSum('magical', appliedOffenseBonusNames);

  const phaseAttackScale = phase === 'mid'
    ? getBaseMultiplier(charStats.baseStats.intelligence, 'attack')
    : getBaseMultiplier(charStats.baseStats.strength, 'attack');

  let offenseAmplifier = 1;
  const arcMagicLevel = getAbilityLevelFromList(charStats.abilities, 'arc_magic');
  if (phase === 'mid') {
    offenseAmplifier = ((1.0 + magicalBonusSum) * charStats.magicalOffenseMultiplier + charStats.deityOffenseAmplifierBonus) * phaseAttackScale;
    // SpecRef: 2.1.1.2 | Multiplier and Functions | character.f.offense_amplifier
    // a.arc-magic: magical offense amplifier xN (Lv1:3.0, Lv2:3.6, Lv3:4.2).
    offenseAmplifier *= getArcMagicOffenseAmplifier(arcMagicLevel);
  } else if (iaigiri) {
    const phaseBonusSum = phase === 'long' ? rangedBonusSum : meleeBonusSum;
    offenseAmplifier = (iaigiriMultiplier * (1.0 + phaseBonusSum) * charStats.physicalOffenseMultiplier + charStats.deityOffenseAmplifierBonus) * phaseAttackScale;
  } else {
    const phaseBonusSum = phase === 'long' ? rangedBonusSum : meleeBonusSum;
    const physicalBonusSum = phaseBonusSum + charStats.physicalAttackCBonus;
    offenseAmplifier = ((1.0 + physicalBonusSum) * charStats.physicalOffenseMultiplier + charStats.deityOffenseAmplifierBonus) * phaseAttackScale;
  }
  if (heavyStrike) {
    offenseAmplifier *= 1.4;
  }

  const resonance = charStats.abilities.find(a => a.id === 'resonance');
  const canApplyResonance = phase === 'mid'
    || (phase === 'long' && partyDeityKey === 'God of Resonance' && terrainEffect !== 'terrain.gehenna');

  const elementalMultiplier = getElementalMultiplier(
    charStats.elementalOffense,
    enemy.elementalResistance
  );

  const rageAmplifier = getCharacterRageAmplifier(charStats, partyHp, partyStats.hp, enemy.abilities);
  const momentumAmplifier = getCharacterMomentumAmplifier(charStats, partyHp, partyStats.hp, enemy.abilities);
  const mutualAmplifier = getMutualAmplifier(phase, charStats.abilities, enemy.abilities);
  const terrainAmplifier = getTerrainAmplifier(phase, terrainEffect, true, charStats.abilities);
  const elementalOffenseAttributeAmplifier = getElementalOffenseAttributeAmplifier(terrainEffect, charStats.elementalOffense, echoDomainElementalUsageCount, charStats.abilities);
  const swarmAmplifier = getSwarmAmplifier(
    charStats.abilities,
    partyHp,
    partyStats.hp,
    enemy.abilities,
    enemyHp,
    enemy.hp,
  );

  const partyOffenseAmplifier = getPartyOffenseAbilityAmplifier(phase, characterStats, charStats.row);
  const basePerHitDamage = Math.max(1, Math.floor(
    (attack - effectiveDefense) * offenseAmplifier * runtimeOffenseMultiplier * charStats.elementalOffenseValue *
    elementalMultiplier * defenseAmplifier * partyOffenseAmplifier * rageAmplifier * momentumAmplifier * mutualAmplifier * terrainAmplifier * elementalOffenseAttributeAmplifier * swarmAmplifier
  ));
  const terrainAdjustedPerHitDamage = applyTerrainDamageOverride(basePerHitDamage, terrainEffect, enemy.hp, charStats.abilities);

  // All phases now use hit detection.
  // MID phase ignores row-based accuracy potency and uses fixed potency (1.0).
  const actorAccuracyPotency = phase === 'mid' ? 1.0 : charStats.accuracyPotency;
  const enemyEvasion = enemy.evasionBonus + temporaryTargetEvasionBonus;

  const actorFocusLevel = charStats.abilities.find(a => a.id === 'focus')?.level ?? 0;
  const enemyDeflectionLevel = getEnemyAbilityLevel(enemy, 'deflection');

  let hits = 0;
  let damage = 0;
  for (let i = 1; i <= noA; i++) {
    if (hitDetection(
      actorAccuracyPotency,
      charStats.accuracyBonus + temporaryAccuracyBonus,
      enemyEvasion,
      i,
      phase,
      enemyDeflectionLevel,
      actorFocusLevel,
      terrainEffect,
      charStats.abilities.find((ability) => ability.id === 'arcane_stability')?.level ?? 0,
      hasAbility(charStats.abilities, 'true_sight'),
      hasAbility(charStats.abilities, 'domain_breaker'),
    )) {
      hits++;
      const resonanceAmplifier = canApplyResonance ? getResonanceAmplifier(resonance?.level, hits) : 1.0;
      damage += Math.max(1, Math.floor(terrainAdjustedPerHitDamage * resonanceAmplifier));
    }
  }

  return { damage, totalAttempts: noA, hits };
}

function getFirstStrikeLevel(charStats: ComputedCharacterStats): number {
  return charStats.abilities.find(a => a.id === 'first_strike')?.level ?? 0;
}

function hasAbility(abilities: AbilityLike[], abilityId: AbilityId): boolean {
  return abilities.some(ability => ability.id === abilityId && ability.level > 0);
}

// SpecRef: 6.1.1.1 | START phase | terrain.silence-field
function isActorAbilitySuppressedBySilenceField(
  terrainEffect: TerrainEffectKey | null | undefined,
  abilities: AbilityLike[],
): boolean {
  if (terrainEffect !== 'terrain.silence-field') return false;
  return !hasAbility(abilities, 'equation_breaker') && !hasAbility(abilities, 'domain_breaker');
}

function isDomainTerrainEffect(terrainEffect: TerrainEffectKey | null | undefined): boolean {
  return terrainEffect === 'terrain.floor-domain'
    || terrainEffect === 'terrain.cap-domain'
    || terrainEffect === 'terrain.echo-domain'
    || terrainEffect === 'terrain.silence-field'
    || terrainEffect === 'terrain.duelist-domain'
    || terrainEffect === 'terrain.sniper-domain'
    || terrainEffect === 'terrain.spell-domain';
}

function rollInitiative(
  firstStrikeLevel: number,
  options?: {
    terrainEffect?: TerrainEffectKey | null;
    actorType?: 'enemy' | 'party';
    fertilityBonus?: number;
    slowPenalty?: number;
    boostBonus?: number;
    frostbitePenalty?: number;
    actorHasTrueSight?: boolean;
    actorHasEquationBreaker?: boolean;
    actorHasWindRider?: boolean;
  },
): number {
  // SpecRef: 6.1.1.2 | LONG, MID, CLOSE phase | Speed & Turn Order (Rolling Dice Rule)
  const isMachineLogic = options?.terrainEffect === 'terrain.machine-logic';
  const firstStrikeEnabled = (!isMachineLogic || (options?.actorHasEquationBreaker ?? false))
    && (options?.terrainEffect !== 'terrain.ash-haze' || (options?.actorHasTrueSight ?? false));
  const effectiveFirstStrikeLevel = firstStrikeEnabled ? firstStrikeLevel : 0;
  const diceCount = effectiveFirstStrikeLevel >= 3 ? 4 : effectiveFirstStrikeLevel >= 2 ? 3 : effectiveFirstStrikeLevel === 1 ? 2 : 1;
  let total = 0;
  for (let i = 0; i < diceCount; i++) {
    total += Math.floor(Math.random() * 3) + 1;
  }

  let result = effectiveFirstStrikeLevel >= 3 ? Math.min(9, total) : total;

  if (!isMachineLogic && (options?.fertilityBonus ?? 0) > 0) {
    result = Math.min(9, result + (options?.fertilityBonus ?? 0));
  }
  if (!isMachineLogic && (options?.slowPenalty ?? 0) > 0) {
    result = Math.max(1, result - (options?.slowPenalty ?? 0));
  }
  if (!isMachineLogic && (options?.boostBonus ?? 0) > 0) {
    result = Math.min(9, result + (options?.boostBonus ?? 0));
  }
  if (!isMachineLogic && (options?.frostbitePenalty ?? 0) > 0) {
    result = Math.max(1, result - (options?.frostbitePenalty ?? 0));
  }
  if (!isMachineLogic && options?.terrainEffect === 'terrain.tailwind' && options?.actorType === 'party') {
    const tailwindDiceCount = options?.actorHasWindRider ? 2 : 1;
    for (let i = 0; i < tailwindDiceCount; i++) {
      result = Math.min(9, result + (Math.floor(Math.random() * 3) + 1));
    }
  }
  if (!isMachineLogic && options?.terrainEffect === 'terrain.enemy-high-ground' && options?.actorType === 'enemy') {
    result = Math.min(9, result + (Math.floor(Math.random() * 3) + 1));
  }

  return result;
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

function getPredatorSenseThresholdPercent(level: number): number {
  if (level >= 5) return 50;
  if (level === 4) return 48;
  if (level === 3) return 44;
  if (level === 2) return 38;
  if (level === 1) return 30;
  return 0;
}

function getPredatorSenseNote(level: number): string {
  const threshold = getPredatorSenseThresholdPercent(level);
  return `(HP ${threshold}%未満で命中+40)`;
}

function getRegenerationPercent(level: number): number {
  if (level >= 5) return 24;
  if (level === 4) return 22;
  if (level === 3) return 19;
  if (level === 2) return 15;
  if (level === 1) return 10;
  return 0;
}

function getFlyingEvasionBonus(level: number): number {
  if (level >= 3) return 0.50;
  if (level === 2) return 0.45;
  if (level === 1) return 0.40;
  return 0;
}

function getFlyingNote(level: number): string {
  if (level >= 3) return '(飛行:回避+50)';
  if (level === 2) return '(飛行:回避+45)';
  if (level === 1) return '(飛行:回避+40)';
  return '(飛行:回避+0)';
}

function getFreeTimingForPhase(
  phase: BattleActionPhase,
  level: number,
): number | null {
  if (phase === 'close') {
    if (level >= 3) return 3;
    if (level === 2) return 2;
    if (level === 1) return 1;
    return null;
  }

  if (phase === 'mid') {
    if (level >= 5) return 2;
    if (level === 4) return 1;
  }

  return null;
}

function getDecomposeDefenseMultiplier(level: number): number {
  if (level >= 5) return 2 / 7;
  if (level === 4) return 3 / 7;
  if (level === 3) return 4 / 7;
  if (level === 2) return 5 / 7;
  return level >= 1 ? 6 / 7 : 1.0;
}

function roundDecomposeDefenseValue(value: number): number {
  return Math.round(value);
}

function getCorrodeMultiplier(level: number): number {
  return CORRODE_MULTIPLIERS[Math.min(5, Math.max(1, level))] ?? 1.0;
}

function getLifeDrainMultiplier(level: number): number {
  return LIFE_DRAIN_MULTIPLIERS[Math.min(7, Math.max(1, level))] ?? 0;
}

function formatLifeDrainMultiplierLabel(level: number): string {
  const clampedLevel = Math.min(7, Math.max(1, level));
  const percentByLevel: Record<number, string> = {
    1: '0.1%',
    2: '0.3%',
    3: '1%',
    4: '3%',
    5: '10%',
    6: '30%',
    7: '100%',
  };
  return percentByLevel[clampedLevel] ?? '0%';
}

function getDeathTouchChance(level: number, hits: number): number {
  const numerator = DEATH_TOUCH_NUMERATORS[Math.min(5, Math.max(1, level))] ?? 0;
  return Math.max(0, Math.min(1, (hits * numerator) / 256));
}

function formatDeathTouchProbabilityNote(level: number, hits: number): string {
  const numerator = DEATH_TOUCH_NUMERATORS[Math.min(5, Math.max(1, level))] ?? 0;
  const successfulHits = Math.max(0, hits);
  const probabilityNumerator = Math.min(256, successfulHits * numerator);
  return `(接死:有効 ${probabilityNumerator}/256 の確率で即死)`;
}

function getBindChance(level: number, hits: number): number {
  const numerator = BIND_NUMERATORS[Math.min(5, Math.max(1, level))] ?? 0;
  return Math.max(0, Math.min(1, (hits * numerator) / 64));
}

function getBurnPercent(level: number): number {
  return BURN_PERCENTS[Math.min(5, Math.max(1, level))] ?? 0;
}

function formatMultiplierAsFraction(multiplier: number): string {
  const seventhFractions = [2 / 7, 3 / 7, 4 / 7, 5 / 7, 6 / 7];
  const matched = seventhFractions.find((candidate) => Math.abs(candidate - multiplier) < 1e-6);
  if (matched !== undefined) {
    return `x${Math.round(matched * 7)}/7`;
  }

  if (Math.abs(multiplier - 1.0) < 1e-6) {
    return 'x1.0';
  }

  return `x${multiplier.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}`;
}

type AbilityLike = { id: AbilityId; level: number };
const TERRAIN_TIMED_OR_REACTIVE_ABILITY_IDS = new Set<AbilityId>(TERRAIN_REACTIVE_AND_TIMED_ABILITY_IDS);

function formatAbilityLabel(ability: AbilityLike): string {
  return `${getAbilityName(ability.id, ability.level)}アビリティ`;
}

function grantCharacterAbility(charStats: ComputedCharacterStats, ability: AbilityLike): void {
  const existingAbility = charStats.abilities.find((ownedAbility) => ownedAbility.id === ability.id);

  if (existingAbility) {
    existingAbility.level = Math.max(existingAbility.level, ability.level);
    existingAbility.name = getAbilityName(existingAbility.id, existingAbility.level);
    existingAbility.description = getAbilityDescription(existingAbility.id, existingAbility.level);
    return;
  }

  charStats.abilities.push({
    id: ability.id,
    level: ability.level,
    name: getAbilityName(ability.id, ability.level),
    description: getAbilityDescription(ability.id, ability.level),
  });
}

function grantEnemyAbility(enemy: EnemyDef, ability: AbilityLike): void {
  const existingAbility = enemy.abilities.find((ownedAbility) => ownedAbility.id === ability.id);

  if (existingAbility) {
    existingAbility.level = Math.max(existingAbility.level, ability.level);
    return;
  }

  enemy.abilities.push({
    id: ability.id,
    level: ability.level,
  });
}

function adjustCharacterAbilityLevel(
  charStats: ComputedCharacterStats,
  abilityId: AbilityId,
  delta: number,
): void {
  const ability = charStats.abilities.find((ownedAbility) => ownedAbility.id === abilityId);
  if (!ability || ability.level <= 0) return;
  ability.level = Math.max(1, Math.min(5, ability.level + delta));
  ability.name = getAbilityName(ability.id, ability.level);
  ability.description = getAbilityDescription(ability.id, ability.level);
}

function adjustEnemyAbilityLevel(enemy: EnemyDef, abilityId: AbilityId, delta: number): void {
  const ability = enemy.abilities.find((ownedAbility) => ownedAbility.id === abilityId);
  if (!ability || ability.level <= 0) return;
  ability.level = Math.max(1, Math.min(5, ability.level + delta));
}

function getAbilityLevelFromList(abilities: AbilityLike[], abilityId: AbilityId): number {
  return abilities.find((ability) => ability.id === abilityId)?.level ?? 0;
}

function getEnemyAbilityLevel(enemy: EnemyDef, abilityId: AbilityId): number {
  return getAbilityLevelFromList(enemy.abilities, abilityId);
}

function createMagicSealQueue(
  party: Party,
  characterStats: ComputedCharacterStats[],
  enemy: EnemyDef,
  terrainEffect?: TerrainEffectKey | null,
): string[] {
  const queue: string[] = [];

  for (const stats of characterStats) {
    if (isActorAbilitySuppressedBySilenceField(terrainEffect, stats.abilities)) continue;
    if (getAbilityLevel(stats, 'magic_seal') <= 0) continue;
    const ownerName = party.characters.find((char) => char.id === stats.characterId)?.name ?? '味方';
    queue.push(ownerName);
  }

  if (isActorAbilitySuppressedBySilenceField(terrainEffect, enemy.abilities)) {
    return queue;
  }

  if (getEnemyAbilityLevel(enemy, 'magic_seal') > 0) {
    queue.push(enemy.name);
  }

  return queue;
}

function getMagicSealStartLog(ownerName: string): BattleLogEntry {
  return {
    phase: 'start',
    actor: 'effect',
    action: `${ownerName} の魔封！`,
    note: '(この場で最初に唱える魔法は無効化される)',
  };
}

function isMagicSealTargetForCharacter(
  phase: BattleActionPhase,
  charStats: ComputedCharacterStats,
  noAMultiplier: number,
): boolean {
  if (phase !== 'mid') return false;
  return charStats.magicalAttack > 0 && Math.ceil(charStats.magicalNoA * noAMultiplier) > 0;
}

function isMagicSealTargetForEnemy(
  phase: BattleActionPhase,
  enemy: EnemyDef,
  noA: number,
): boolean {
  if (phase !== 'mid') return false;
  return enemy.magicalAttack > 0 && noA > 0;
}

function getCounterNoAMultiplierForLevel(level: number): number {
  if (level <= 0) return 0;
  if (level >= 3) return 2.0;
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

function hasNoOffense(charStats: ComputedCharacterStats): boolean {
  return getAbilityLevel(charStats, 'no_offense') > 0;
}

function enemyHasNoOffense(enemy: EnemyDef): boolean {
  return getEnemyAbilityLevel(enemy, 'no_offense') > 0;
}

function hasNullShock(charStats: ComputedCharacterStats): boolean {
  return getAbilityLevel(charStats, 'null_shock') > 0;
}

function enemyHasNullShock(enemy: EnemyDef): boolean {
  return getEnemyAbilityLevel(enemy, 'null_shock') > 0;
}

function hasNullCorrode(charStats: ComputedCharacterStats): boolean {
  return getAbilityLevel(charStats, 'null_corrode') > 0;
}

function enemyHasNullCorrode(enemy: EnemyDef): boolean {
  return getEnemyAbilityLevel(enemy, 'null_corrode') > 0;
}

function hasNullLifeDrain(charStats: ComputedCharacterStats): boolean {
  return getAbilityLevel(charStats, 'null_life_drain') > 0;
}

function enemyHasNullLifeDrain(enemy: EnemyDef): boolean {
  return getEnemyAbilityLevel(enemy, 'null_life_drain') > 0;
}

function hasNullDeathTouch(charStats: ComputedCharacterStats): boolean {
  return getAbilityLevel(charStats, 'null_death_touch') > 0;
}

function enemyHasNullDeathTouch(enemy: EnemyDef): boolean {
  return getEnemyAbilityLevel(enemy, 'null_death_touch') > 0;
}

function hasNullBurn(charStats: ComputedCharacterStats): boolean {
  return getAbilityLevel(charStats, 'null_burn') > 0;
}

function enemyHasNullBurn(enemy: EnemyDef): boolean {
  return getEnemyAbilityLevel(enemy, 'null_burn') > 0;
}

function hasNullBind(charStats: ComputedCharacterStats): boolean {
  return getAbilityLevel(charStats, 'null_bind') > 0;
}

function enemyHasNullBind(enemy: EnemyDef): boolean {
  return getEnemyAbilityLevel(enemy, 'null_bind') > 0;
}

function hasCounter(charStats: ComputedCharacterStats, phase: BattleActionPhase): boolean {
  // SpecRef: 6.1.4.3 | Function of Reactive ability | f.counter
  const ability = charStats.abilities.find(a => a.id === 'counter');
  if (!ability) return false;
  return phase === 'long' || phase === 'close';
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

const REANIMATE_HP_PERCENTS: Record<number, number> = {
  1: 20,
  2: 26,
  3: 31,
  4: 35,
  5: 38,
};

function getReanimateLevel(charStats: ComputedCharacterStats): number {
  return charStats.abilities.find(a => a.id === 'reanimate')?.level ?? 0;
}

function hasReanimate(charStats: ComputedCharacterStats): boolean {
  return getReanimateLevel(charStats) > 0;
}

function hasRequiem(charStats: ComputedCharacterStats): boolean {
  return getAbilityLevel(charStats, 'requiem') > 0;
}

function enemyHasRequiem(enemy: EnemyDef): boolean {
  return getEnemyAbilityLevel(enemy, 'requiem') > 0;
}

function hasNullRequiem(charStats: ComputedCharacterStats): boolean {
  return getAbilityLevel(charStats, 'null_requiem') > 0;
}

function enemyHasNullRequiem(enemy: EnemyDef): boolean {
  return getEnemyAbilityLevel(enemy, 'null_requiem') > 0;
}

function getReanimateHpPercent(level: number): number {
  return REANIMATE_HP_PERCENTS[level] ?? REANIMATE_HP_PERCENTS[5];
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

function getHowlNoAMultiplier(level: number): number {
  if (level <= 0) return 1.0;
  if (level >= 5) return 1 / 7;
  if (level === 4) return 2 / 7;
  if (level === 3) return 3 / 7;
  if (level === 2) return 4 / 7;
  return 5 / 7;
}

function getHowlNote(level: number): string {
  if (level >= 5) return '(相手の次の攻撃回数1/7)';
  if (level === 4) return '(相手の次の攻撃回数2/7)';
  if (level === 3) return '(相手の次の攻撃回数3/7)';
  if (level === 2) return '(相手の次の攻撃回数4/7)';
  return '(相手の次の攻撃回数5/7)';
}

function getConfusionChance(level: number): number {
  if (level >= 5) return 7;
  if (level === 4) return 5;
  if (level >= 2) return 3;
  return level === 1 ? 1 : 0;
}

function getConfusionTiming(level: number): number | null {
  if (level <= 0) return null;
  return level <= 2 ? 1 : 2;
}

function getConfusionAbilityIdForPhase(phase: BattleActionPhase): AbilityId {
  switch (phase) {
    case 'long':
      return 'ranged_confusion';
    case 'mid':
      return 'magic_confusion';
    case 'close':
      return 'melee_confusion';
  }
}

function getConfusionNote(level: number, success: boolean): string {
  return `(混乱確率${getConfusionChance(level)}/32: ${success ? '成功' : '失敗'})`;
}

function getNullAntagonismNote(): string {
  return '(敵対無効化)';
}

function getUnstableCoreDamagePercent(level: number): number {
  if (level >= 5) return 12;
  if (level === 4) return 15;
  if (level === 3) return 19;
  if (level === 2) return 24;
  return level >= 1 ? 30 : 0;
}

function getSoulReapThresholdPercent(level: number): number {
  if (level >= 5) return 20;
  if (level === 4) return 19;
  if (level === 3) return 17;
  if (level === 2) return 14;
  return level >= 1 ? 10 : 0;
}

function getUnstableCoreNote(level: number): string {
  return `(残HP ${getUnstableCoreDamagePercent(level)}%の自傷ダメージ)`;
}

function getShockAdjustedDamage(damage: number, hits: number): number {
  if (hits <= 1 || damage <= 0) return damage;
  return Math.floor(damage / hits);
}

function getRandomPartyMemberName(party: Party): string {
  if (party.characters.length === 0) return party.name;
  const targetIndex = Math.floor(Math.random() * party.characters.length);
  return party.characters[targetIndex].name;
}

function getSoulReapNote(level: number): string {
  return `(HP ${getSoulReapThresholdPercent(level)}％未満で即死)`;
}

function getSelfDestructRatio(level: number): { numerator: number; denominator: number } | null {
  if (level <= 0) return null;
  if (level >= 5) return { numerator: 1, denominator: 1 };
  if (level === 4) return { numerator: 7, denominator: 10 };
  if (level === 3) return { numerator: 5, denominator: 10 };
  if (level === 2) return { numerator: 3, denominator: 10 };
  return { numerator: 1, denominator: 10 };
}

function calculateSelfDestructDamage(
  level: number,
  actorRemainingHp: number,
  targetPhysicalDefense: number,
  targetDefenseAmplifier: number,
): number {
  const ratio = getSelfDestructRatio(level);
  if (!ratio) return 0;

  const baseDamage = actorRemainingHp - targetPhysicalDefense;
  if (baseDamage <= 0) return 0;

  return Math.max(
    0,
    Math.floor((ratio.numerator / ratio.denominator) * baseDamage * Math.max(0.01, targetDefenseAmplifier)),
  );
}

function getCharacterNoAForPhase(phase: BattleActionPhase, charStats: ComputedCharacterStats): number {
  switch (phase) {
    case 'long':
      return charStats.rangedNoA;
    case 'mid':
      return charStats.magicalNoA;
    case 'close':
      return charStats.meleeNoA;
  }
}

function getCharacterAttackForPhase(phase: BattleActionPhase, charStats: ComputedCharacterStats): number {
  switch (phase) {
    case 'long':
      return charStats.rangedAttack;
    case 'mid':
      return charStats.magicalAttack;
    case 'close':
      return charStats.meleeAttack;
  }
}

function getEnemyAttackForPhase(phase: BattleActionPhase, enemy: EnemyDef): number {
  switch (phase) {
    case 'long':
      return enemy.rangedAttack;
    case 'mid':
      return enemy.magicalAttack;
    case 'close':
      return enemy.meleeAttack;
  }
}

function isEligibleCharacterForPhase(
  phase: BattleActionPhase,
  charStats: ComputedCharacterStats,
  hasMovedInPhase = false,
): boolean {
  return !hasMovedInPhase && getCharacterAttackForPhase(phase, charStats) > 0 && getCharacterNoAForPhase(phase, charStats) > 0;
}

function isEligibleEnemyForPhase(
  phase: BattleActionPhase,
  enemy: EnemyDef,
  hasMovedInPhase = false,
): boolean {
  return !hasMovedInPhase && getEnemyAttackForPhase(phase, enemy) > 0 && getEnemyNoA(phase, enemy) > 0;
}

// Hit detection functions are available for future use when implementing
// per-hit accuracy rolls. Currently the game uses deterministic damage calculation.

interface BattleResult extends BattleState {
  updatedBags: {
    physicalThreatBag: RandomBag;
    magicalThreatBag: RandomBag;
  };
  enemyHitsReceived: number;
}

interface BattleEnvironment {
  terrainEffect?: TerrainEffectKey | null;
}

const TRIGGER_TIMINGS_DESC = [9, 8, 7, 6, 5, 4, 3, 2, 1, 0] as const;
const battleTerrainNoteValueFormatter = new Intl.NumberFormat('ja-JP');

const TERRAIN_FLAVOR_LOG_COUNT = 10;

function pickRandomTerrainFlavorText(
  prefix: string,
  replacements: Record<string, string>,
): string {
  return getRandomTranslation(prefix, TERRAIN_FLAVOR_LOG_COUNT, replacements);
}

// SpecRef: 6.1.1.1 | START phase | actor.a.oblivion
// SpecRef: 6.1.1.1 | START phase | actor.a.fading_memory
// SpecRef: 6.1.1.1 | START phase | actor.a.mimic
// SpecRef: 6.1.1.1 | START phase | floor.terrain.*
// SpecRef: 6.1.1.2 | LONG, MID, CLOSE phase | Speed & Turn Order (Rolling Dice Rule)
// SpecRef: 6.1.1.3 | END phase | Goddess of Restoration effect
// SpecRef: 6.1.1.3 | END phase | God of Attrition effect
// SpecRef: 6.1.1.3 | END phase | c.unlock, reward log
// SpecRef: 6.1.3.1 | Actor action | f.NoA
// SpecRef: 6.1.3.1 | Actor action | f.targeting
// SpecRef: 6.1.3.1 | Actor action | f.hit_detection
// SpecRef: 6.1.3.1 | Actor action | f.damage_calculation
// SpecRef: 6.1.3.1 | Actor action | actor.a.no-offense
// SpecRef: 6.1.3.2 | Chain move trigger | Counter
// SpecRef: 6.1.3.2 | Chain move trigger | Re-counter
// SpecRef: 6.1.3.2 | Chain move trigger | Re-attack
// SpecRef: 6.1.3.2 | Chain move trigger | Magical counter
// SpecRef: 6.1.3.2 | Chain move trigger | Covering fire
export function executeBattle(
  party: Party,
  enemy: EnemyDef,
  bags: GameBags,
  initialPartyHp?: number, // Optional: for HP persistence during expedition
  environment: BattleEnvironment = {},
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
  let partyDamageTakenInBattle = 0;
  let enemyDamageTakenInBattle = 0;
  let enemyHasAntagonism = false;
  let enemyHitsReceived = 0;
  let enemyHasActedInBattle = false;
  const characterActedInBattleIds = new Set<number>();
  let firstActorInBattle: 'enemy' | number | null = null;
  let sacredJudgementTriggered = false;
  const log: BattleLogEntry[] = [];

  const partyDeityKey = getDeityKey(party.deity.name);
  const terrainEntry = environment.terrainEffect ? getTerrainEffectGlossaryEntry(environment.terrainEffect) : undefined;

  if (terrainEntry) {
    const terrainDescription = environment.terrainEffect === 'terrain.chill'
      ? '部屋の継続時間が1.5倍になる'
      : terrainEntry.description;

    log.push({
      phase: 'start',
      actor: 'effect',
      effectKind: 'terrain',
      action: terrainEntry.label,
      note: `(${terrainDescription})`,
      noteTone: 'muted',
    });
  }

  // SpecRef: 6.1.1.1 | START phase | actor.a.domain-breaker
  if (isDomainTerrainEffect(environment.terrainEffect)) {
    const domainLabel = terrainEntry?.label ?? '領域';
    const domainBreakerOwners = [
      ...characterStats
        .filter((stats) => hasAbility(stats.abilities, 'domain_breaker'))
        .map((stats) => ({
          name: party.characters.find((char) => char.id === stats.characterId)?.name ?? '味方',
          characterId: stats.characterId,
        })),
      ...(hasAbility(enemy.abilities, 'domain_breaker')
        ? [{ name: enemy.name, characterId: undefined as number | undefined }]
        : []),
    ];

    for (const owner of domainBreakerOwners) {
      log.push({
        phase: 'start',
        actor: 'effect',
        characterId: owner.characterId,
        action: `${owner.name} は${domainLabel}の影響を受けない`,
      });
    }
  }

  if (environment.terrainEffect === 'terrain.deletion') {
    const terrainDeletionTargets: Array<
      { kind: 'enemy'; name: string; abilities: AbilityLike[] }
      | { kind: 'character'; name: string; stats: ComputedCharacterStats; abilities: AbilityLike[] }
    > = [
      { kind: 'enemy', name: enemy.name, abilities: enemy.abilities },
      ...characterStats.map((stats) => ({
        kind: 'character' as const,
        name: party.characters.find((char) => char.id === stats.characterId)?.name ?? '味方',
        stats,
        abilities: stats.abilities,
      })),
    ];

    const target = terrainDeletionTargets[Math.floor(Math.random() * terrainDeletionTargets.length)];
    if (target) {
      const validAbilities = target.abilities.filter((ability) => ability.level > 0);
      const selectedAbility = validAbilities[Math.floor(Math.random() * validAbilities.length)];
      if (selectedAbility) {
        const selectedIndex = target.abilities.findIndex(
          (ability) => ability.id === selectedAbility.id && ability.level === selectedAbility.level,
        );
        if (selectedIndex >= 0) {
          target.abilities.splice(selectedIndex, 1);
        }
        log.push({
          phase: 'start',
          actor: 'effect',
          effectKind: 'terrain',
          characterId: target.kind === 'character' ? target.stats.characterId : undefined,
          action: pickRandomTerrainFlavorText(
            'battleFlavor.environment.deletion',
            {
              target: target.name,
              ability: getAbilityName(selectedAbility.id, selectedAbility.level),
            },
          ),
        });
      }
    }
  } else if (environment.terrainEffect === 'terrain.transcendence' || environment.terrainEffect === 'terrain.suppression') {
    const isSuppression = environment.terrainEffect === 'terrain.suppression';
    const delta = isSuppression ? -1 : 1;

    for (const stats of characterStats) {
      // SpecRef: 6.1.1.1 | START phase | terrain.suppression
      if (isSuppression && hasAbility(stats.abilities, 'defiance')) continue;
      for (const abilityId of TERRAIN_TIMED_OR_REACTIVE_ABILITY_IDS) {
        adjustCharacterAbilityLevel(stats, abilityId, delta);
      }
    }
    // SpecRef: 6.1.1.1 | START phase | terrain.suppression
    if (isSuppression && hasAbility(enemy.abilities, 'defiance')) {
      // a.defiance ignores suppression effect.
    } else {
      for (const abilityId of TERRAIN_TIMED_OR_REACTIVE_ABILITY_IDS) {
        adjustEnemyAbilityLevel(enemy, abilityId, delta);
      }
    }
  } else if (environment.terrainEffect === 'terrain.silence-field') {
    const equationBreakerOwners = [
      ...characterStats
        .filter((stats) => hasAbility(stats.abilities, 'equation_breaker'))
        .map((stats) => ({
          name: party.characters.find((char) => char.id === stats.characterId)?.name ?? '味方',
          characterId: stats.characterId,
        })),
      ...(hasAbility(enemy.abilities, 'equation_breaker')
        ? [{ name: enemy.name, characterId: undefined as number | undefined }]
        : []),
    ];

    for (const owner of equationBreakerOwners) {
      log.push({
        phase: 'start',
        actor: 'effect',
        characterId: owner.characterId,
        action: buildEquationBreakerAction(owner.name),
        note: '(式破り:静寂領域無効化)',
      });
    }
  }

  // SpecRef: 6.1.1.1 | START phase | Deity effects
  if (partyDeityKey === 'God of Resonance' && environment.terrainEffect !== 'terrain.gehenna') {
    characterStats = characterStats.map((stats) => {
      adjustCharacterAbilityLevel(stats, 'resonance', 1);
      return stats;
    });

    ctx = {
      ...ctx,
      characterStats,
    };
  }

  // SpecRef: 6.1.1.1 | START phase | Deity effects
  if (partyDeityKey === 'Goddess of Discord' && environment.terrainEffect !== 'terrain.gehenna' && characterStats.length > 0) {
    const targetIndex = Math.floor(Math.random() * characterStats.length);
    const targetStats = characterStats[targetIndex];
    const targetName = party.characters.find(c => c.id === targetStats.characterId)?.name ?? '???';
    const hasNullAntagonism = getAbilityLevel(targetStats, 'null_antagonism') >= 1;

    // SpecRef: 6.1.1.1 | START phase | Deity effects
    if (!hasNullAntagonism) {
      characterStats = characterStats.map((stats, index) => (
        index === targetIndex
          ? { ...stats, hasAntagonism: true }
          : stats
      ));
      log.push({
        phase: 'start',
        actor: 'effect',
        action: '不和の神の効果！',
        note: `([⚠️敵対]${targetName}が仲違いした)`,
      });
    } else {
      log.push({
        phase: 'start',
        actor: 'effect',
        characterId: targetStats.characterId,
        action: buildNullAntagonismAction(targetName),
        note: getNullAntagonismNote(),
      });
    }

    ctx = {
      ...ctx,
      characterStats,
    };
  }

  const isEnemyActorAbilitiesSuppressed = (): boolean => (
    isActorAbilitySuppressedBySilenceField(environment.terrainEffect, enemy.abilities)
  );

  const getOblivionOwners = (): Array<{ name: string; stats: ComputedCharacterStats }> => (
    characterStats
      .filter((stats) => !isActorAbilitySuppressedBySilenceField(environment.terrainEffect, stats.abilities))
      .filter((stats) => getAbilityLevel(stats, 'oblivion') >= 1)
      .map((stats) => ({
        name: party.characters.find((char) => char.id === stats.characterId)?.name ?? '味方',
        stats,
      }))
  );

  const getMimicOwners = (): Array<{ name: string; stats: ComputedCharacterStats }> => (
    characterStats
      .filter((stats) => !isActorAbilitySuppressedBySilenceField(environment.terrainEffect, stats.abilities))
      .filter((stats) => getAbilityLevel(stats, 'mimic') >= 1)
      .map((stats) => ({
        name: party.characters.find((char) => char.id === stats.characterId)?.name ?? '味方',
        stats,
      }))
  );

  const getFadingMemoryOwners = (): Array<{ name: string; stats: ComputedCharacterStats }> => (
    characterStats
      .filter((stats) => !isActorAbilitySuppressedBySilenceField(environment.terrainEffect, stats.abilities))
      .filter((stats) => getAbilityLevel(stats, 'fading_memory') >= 1)
      .map((stats) => ({
        name: party.characters.find((char) => char.id === stats.characterId)?.name ?? '味方',
        stats,
      }))
  );

  const enemyHasOblivion = (): boolean => !isEnemyActorAbilitiesSuppressed() && getEnemyAbilityLevel(enemy, 'oblivion') >= 1;
  const enemyHasFadingMemory = (): boolean => !isEnemyActorAbilitiesSuppressed() && getEnemyAbilityLevel(enemy, 'fading_memory') >= 1;
  const enemyHasMimic = (): boolean => !isEnemyActorAbilitiesSuppressed() && getEnemyAbilityLevel(enemy, 'mimic') >= 1;

  const remainingNullCounterByCharacterId = createNullCounterPool(characterStats);
  const consumedResurrectCharacterIds = new Set<number>();
  const consumedReanimateCharacterIds = new Set<number>();
  let consumedEnemyResurrect = false;
  let consumedEnemyReanimate = false;
  const consumedIllusionStateIds = new Set<string>();
  let consumedPartyIllusion = false;
  let consumedEnemyShock = false;
  const consumedCharacterShockIds = new Set<number>();
  let activeMagicSealQueue: string[] = [];
  let pendingEnemyHowlEffects: PendingHowlEffect[] = [];
  let pendingPartyHowlEffects: PendingHowlEffect[] = [];
  let enemyTemporaryEvasionBonus = 0;
  let enemyTemporaryAccuracyBonus = 0;
  const temporaryAccuracyBonusByCharacterId = new Map<number, number>();
  const temporaryEvasionBonusByCharacterId = new Map<number, number>();
  let enemyOffenseAmplifierMultiplier = 1.0;
  const elementalOffenseUsageCounter: ElementalOffenseUsageCounter = { fire: 0, ice: 0, thunder: 0 };
  const registerElementalOffenseUsage = (elementalOffense: ElementalOffense, actorAbilities: AbilityLike[]): number => (
    countElementalOffenseUsage(environment.terrainEffect, elementalOffense, elementalOffenseUsageCounter, actorAbilities)
  );
  const getEchoDomainLogText = (elementalOffense: ElementalOffense, actorAbilities: AbilityLike[]): string => {
    if (environment.terrainEffect !== 'terrain.echo-domain' || elementalOffense === 'none') return '';
    if (hasAbility(actorAbilities, 'domain_breaker')) return '';
    const count = elementalOffenseUsageCounter[elementalOffense] ?? 0;
    const bonusPercent = Math.max(0, (count - 1) * 10);
    if (bonusPercent <= 0) return '';
    return `(残響+${bonusPercent}%)`;
  };
  const characterOffenseAmplifierMultiplierById = new Map<number, number>(
    characterStats.map((stats) => [stats.characterId, 1.0]),
  );
  let enemyIncapacitated = false;
  const incapacitatedCharacterIds = new Set<number>();
  let forcedOutcome: BattleOutcome | null = null;
  let forcedOutcomePhase: BattleActionPhase = 'close';

  const consumeMagicSeal = (): boolean => activeMagicSealQueue.shift() !== undefined;

  const consumePendingEnemyHowlEffect = (): PendingHowlEffect | null => {
    const effect = pendingEnemyHowlEffects.length > 0
      ? pendingEnemyHowlEffects[pendingEnemyHowlEffects.length - 1]
      : null;
    pendingEnemyHowlEffects = [];
    return effect;
  };

  const consumePendingPartyHowlEffect = (): PendingHowlEffect | null => {
    const effect = pendingPartyHowlEffects.length > 0
      ? pendingPartyHowlEffects[pendingPartyHowlEffects.length - 1]
      : null;
    pendingPartyHowlEffects = [];
    return effect;
  };

  const isEnemyShockAvailable = (): boolean => !consumedEnemyShock && getEnemyAbilityLevel(enemy, 'shock') > 0;

  const isCharacterShockAvailable = (charStats: ComputedCharacterStats): boolean => (
    !consumedCharacterShockIds.has(charStats.characterId)
    && getAbilityLevel(charStats, 'shock') > 0
  );

  const consumeEnemyShock = (): void => {
    consumedEnemyShock = true;
  };

  const consumeCharacterShock = (characterId: number): void => {
    consumedCharacterShockIds.add(characterId);
  };

  const applyPartyDamage = (amount: number): number => {
    const actualDamage = Math.max(0, Math.min(partyHp, amount));
    if (actualDamage <= 0) return 0;
    partyHp -= actualDamage;
    partyDamageTakenInBattle += actualDamage;
    return actualDamage;
  };

  const applyEnemyDamage = (amount: number): number => {
    const actualDamage = Math.max(0, Math.min(enemyHp, amount));
    if (actualDamage <= 0) return 0;
    enemyHp -= actualDamage;
    enemyDamageTakenInBattle += actualDamage;
    return actualDamage;
  };

  const addEnemyHitsReceived = (hits: number): void => {
    if (hits > 0) {
      enemyHitsReceived += hits;
    }
  };

  const healParty = (amount: number): number => {
    const actualHeal = Math.max(0, Math.min(partyStats.hp - partyHp, amount));
    if (actualHeal <= 0) return 0;
    partyHp += actualHeal;
    partyDamageTakenInBattle = Math.max(0, partyDamageTakenInBattle - actualHeal);
    return actualHeal;
  };

  const healEnemy = (amount: number): number => {
    const actualHeal = Math.max(0, Math.min(enemy.hp - enemyHp, amount));
    if (actualHeal <= 0) return 0;
    enemyHp += actualHeal;
    enemyDamageTakenInBattle = Math.max(0, enemyDamageTakenInBattle - actualHeal);
    return actualHeal;
  };

  const triggerPartyDefeatRecovery = (
    targetStats: ComputedCharacterStats,
    phase: BattleActionPhase,
    initiativeRoll?: number,
    isCounter?: boolean,
  ): boolean => {
    if (partyHp > 0) return false;

    const targetName = party.characters.find(c => c.id === targetStats.characterId)?.name ?? '???';
    if (hasResurrect(targetStats) && !consumedResurrectCharacterIds.has(targetStats.characterId)) {
      const resurrectLevel = getResurrectLevel(targetStats);
      const healAmount = resurrectLevel >= 2
        ? Math.max(1, Math.ceil(partyStats.hp * 0.01))
        : 1;
      healParty(healAmount);
      consumedResurrectCharacterIds.add(targetStats.characterId);
      log.push({
        phase,
        initiativeRoll,
        actor: 'character',
        characterId: targetStats.characterId,
        isCounter: isCounter || undefined,
        action: buildResurrectAction(targetName),
        note: formatDefeatRecoveryNote('再起', healAmount),
        noteTone: 'muted',
        hideInitiativeLabel: true,
      });
      return true;
    }

    if (hasReanimate(targetStats) && !consumedReanimateCharacterIds.has(targetStats.characterId)) {
      const reanimateLevel = getReanimateLevel(targetStats);
      const healAmount = Math.max(1, Math.ceil((partyStats.hp * getReanimateHpPercent(reanimateLevel)) / 100));
      healParty(healAmount);
      consumedReanimateCharacterIds.add(targetStats.characterId);
      log.push({
        phase,
        initiativeRoll,
        actor: 'character',
        characterId: targetStats.characterId,
        isCounter: isCounter || undefined,
        action: buildReanimateAction(targetName),
        note: formatDefeatRecoveryNote('即時蘇生', healAmount),
        noteTone: 'muted',
        hideInitiativeLabel: true,
      });
      return true;
    }

    return false;
  };

  const triggerEnemyDefeatRecovery = (
    phase: BattleActionPhase,
    initiativeRoll?: number,
  ): boolean => {
    if (enemyHp > 0) return false;

    const resurrectLevel = getEnemyAbilityLevel(enemy, 'resurrect');
    if (resurrectLevel > 0 && !consumedEnemyResurrect) {
      const healAmount = resurrectLevel >= 2
        ? Math.max(1, Math.ceil(enemy.hp * 0.01))
        : 1;
      healEnemy(healAmount);
      consumedEnemyResurrect = true;
      log.push({
        phase,
        initiativeRoll,
        actor: 'enemy',
        action: buildResurrectAction(enemy.name),
        note: formatDefeatRecoveryNote('再起', healAmount),
        noteTone: 'muted',
        hideInitiativeLabel: true,
      });
      return true;
    }

    const reanimateLevel = getEnemyAbilityLevel(enemy, 'reanimate');
    if (reanimateLevel > 0 && !consumedEnemyReanimate) {
      const healAmount = Math.max(1, Math.ceil((enemy.hp * getReanimateHpPercent(reanimateLevel)) / 100));
      healEnemy(healAmount);
      consumedEnemyReanimate = true;
      log.push({
        phase,
        initiativeRoll,
        actor: 'enemy',
        action: buildReanimateAction(enemy.name),
        note: formatDefeatRecoveryNote('即時蘇生', healAmount),
        noteTone: 'muted',
        hideInitiativeLabel: true,
      });
      return true;
    }

    return false;
  };

  // SpecRef: 6.1.3.1 | Actor action | self-inflicted damage
  const applyTerrainSelfInflictedDamage = (
    actor: { kind: 'character'; stats: ComputedCharacterStats; name: string } | { kind: 'enemy'; name: string },
    phase: BattleActionPhase,
    totalDamage: number,
    elementalOffense: ElementalOffense,
  ): void => {
    const terrainEffect = environment.terrainEffect;
    if (!terrainEffect) return;

    const currentHp = actor.kind === 'enemy' ? enemyHp : partyHp;
    const maxHp = actor.kind === 'enemy' ? enemy.hp : partyStats.hp;
    const appliedDamage = (amount: number): number => (
      actor.kind === 'enemy' ? applyEnemyDamage(amount) : applyPartyDamage(amount)
    );

    let selfDamage = 0;
    let actionText = '';
    let noteTextTemplate = '';
    let elementalTag: ElementalOffense | undefined;
    const actorAbilities = actor.kind === 'enemy' ? enemy.abilities : actor.stats.abilities;

    // SpecRef: 6.1.3.1 | Actor action | a.vine-cutter
    if (terrainEffect === 'terrain.vine-snare' && !hasAbility(actorAbilities, 'vine_cutter')) {
      selfDamage = Math.floor(currentHp * 0.01);
      actionText = pickRandomTerrainFlavorText(
        'battleFlavor.environment.vineSnare',
        { actor: actor.name },
      );
      noteTextTemplate = '(HP減少-{damage})';
    // SpecRef: 6.1.3.1 | Actor action | a.mana-ward
    } else if (terrainEffect === 'terrain.crystal-zone' && phase === 'mid' && !hasAbility(actorAbilities, 'mana_ward')) {
      selfDamage = Math.floor(totalDamage * 0.05);
      actionText = pickRandomTerrainFlavorText(
        'battleFlavor.environment.crystalZone',
        { actor: actor.name },
      );
      noteTextTemplate = '(HP減少-{damage})';
    } else if (terrainEffect === 'terrain.conduction' && elementalOffense === 'thunder') {
      selfDamage = Math.floor(totalDamage * 0.05);
      actionText = pickRandomTerrainFlavorText(
        'battleFlavor.environment.conduction',
        { actor: actor.name },
      );
      noteTextTemplate = '(HP減少 ⚡-{damage})';
      elementalTag = 'thunder';
    } else if (terrainEffect === 'terrain.mana-burn' && phase === 'mid' && !hasAbility(actorAbilities, 'mana_ward')) {
      selfDamage = Math.floor(maxHp * 0.02);
      actionText = pickRandomTerrainFlavorText(
        'battleFlavor.environment.manaBurn',
        { actor: actor.name },
      );
      noteTextTemplate = '(HP減少-{damage})';
    } else if (
      terrainEffect === 'terrain.sacred-judgement'
      && !sacredJudgementTriggered
      && (
        (actor.kind === 'enemy' && firstActorInBattle === 'enemy')
        || (actor.kind === 'character' && firstActorInBattle === actor.stats.characterId)
      )
    ) {
      selfDamage = Math.floor(currentHp * 0.05);
      actionText = pickRandomTerrainFlavorText(
        'battleFlavor.environment.sacredJudgement',
        { actor: actor.name },
      );
      noteTextTemplate = '(HP減少 ⚡-{damage})';
      elementalTag = 'thunder';
      sacredJudgementTriggered = true;
    }

    if (selfDamage <= 0) return;

    const actualSelfDamage = appliedDamage(selfDamage);
    if (actualSelfDamage <= 0) return;

    log.push({
      phase,
      actor: 'effect',
      effectKind: 'terrain',
      characterId: actor.kind === 'character' ? actor.stats.characterId : undefined,
      action: actionText,
      note: noteTextTemplate.replace('{damage}', battleTerrainNoteValueFormatter.format(actualSelfDamage)),
      elementalOffense: elementalTag,
    });

    if (actor.kind === 'enemy') {
      triggerEnemyDefeatRecovery(phase);
    } else {
      triggerPartyDefeatRecovery(actor.stats, phase);
    }
  };

  // SpecRef: 6.1.3.1 | Actor action | terrain.chain-lightning
  const applyTerrainChainLightningDamage = (
    actor: { kind: 'character'; stats: ComputedCharacterStats; name: string } | { kind: 'enemy'; name: string },
    phase: BattleActionPhase,
    thunderDamage: number,
    excludedPartyMemberId?: number,
  ): void => {
    if (environment.terrainEffect !== 'terrain.chain-lightning') return;
    if (thunderDamage <= 0) return;

    const chainDamage = Math.floor(thunderDamage * 0.30);
    if (chainDamage <= 0) return;

    if (actor.kind === 'character') {
      const appliedDamage = applyEnemyDamage(chainDamage);
      if (appliedDamage <= 0) return;

      log.push({
        phase,
        actor: 'effect',
        effectKind: 'terrain',
        characterId: actor.stats.characterId,
        action: pickRandomTerrainFlavorText(
          'battleFlavor.environment.chainLightning',
          { target: enemy.name },
        ),
        note: `(⚡ ${battleTerrainNoteValueFormatter.format(appliedDamage)})`,
        elementalOffense: 'thunder',
      });
      triggerEnemyDefeatRecovery(phase);
      return;
    }

    const chainTargetCandidates = characterStats.filter(stats => stats.characterId !== excludedPartyMemberId);
    const chainTarget = chainTargetCandidates[Math.floor(Math.random() * chainTargetCandidates.length)] ?? characterStats[0];
    if (!chainTarget) return;
    const chainTargetName = party.characters.find((c) => c.id === chainTarget.characterId)?.name ?? '味方';

    const appliedDamage = applyPartyDamage(chainDamage);
    if (appliedDamage <= 0) return;

    log.push({
      phase,
      actor: 'effect',
      effectKind: 'terrain',
      characterId: chainTarget.characterId,
      action: pickRandomTerrainFlavorText(
        'battleFlavor.environment.chainLightning',
        { target: chainTargetName },
      ),
      note: `(⚡ ${battleTerrainNoteValueFormatter.format(appliedDamage)})`,
      elementalOffense: 'thunder',
    });
    triggerPartyDefeatRecovery(chainTarget, phase);
  };

  const buildBattleResult = (phase: BattleActionPhase, outcome: BattleOutcome): BattleResult => ({
    phase,
    partyHp: Math.max(0, partyHp),
    enemyHp: Math.max(0, enemyHp),
    log,
    outcome,
    updatedBags: {
      physicalThreatBag: ctx.physicalThreatBag,
      magicalThreatBag: ctx.magicalThreatBag,
    },
    enemyHitsReceived,
  });

  const resolveCharacterOffenseAmplifierMultiplier = (characterId: number): number => (
    characterOffenseAmplifierMultiplierById.get(characterId) ?? 1.0
  );

  const applyCharacterCloseReactiveAbilities = (
    actorStats: ComputedCharacterStats,
    actorName: string,
    result: CharacterAttackResult,
    initiativeRoll: number,
  ): void => {
    if (result.hits <= 0) return;

    const corrodeLevel = getAbilityLevel(actorStats, 'corrode');
    if (corrodeLevel > 0 && result.hits >= 3) {
      const targetNullCorrode = enemyHasNullCorrode(enemy);
      const multiplier = getCorrodeMultiplier(corrodeLevel);
      log.push({
        phase: 'close',
        initiativeRoll,
        actor: 'triggered',
        characterId: actorStats.characterId,
        action: targetNullCorrode
          ? buildNullCorrodeAction(actorName, enemy.name)
          : buildCorrodeAction(actorName, enemy.name),
        note: targetNullCorrode
          ? '(防腐)'
          : `(腐食:相手の攻撃倍率が${formatMultiplierAsFraction(multiplier)})`,
        noteTone: 'muted',
        hideInitiativeLabel: true,
      });
      if (!targetNullCorrode) {
        enemyOffenseAmplifierMultiplier *= multiplier;
      }
    }

    const lifeDrainLevel = getAbilityLevel(actorStats, 'life_drain');
    if (lifeDrainLevel > 0 && result.damage > 0) {
      const drainMultiplier = getLifeDrainMultiplier(lifeDrainLevel);
      const targetNullLifeDrain = enemyHasNullLifeDrain(enemy);
      const healAmount = targetNullLifeDrain ? 0 : healParty(Math.floor(result.damage * drainMultiplier));
      log.push({
        phase: 'close',
        initiativeRoll,
        actor: 'triggered',
        characterId: actorStats.characterId,
        effectKind: 'life_drain',
        effectSourceName: actorName,
        effectTargetName: enemy.name,
        effectHealAmount: healAmount,
        action: targetNullLifeDrain
          ? buildNullLifeDrainAction(actorName, enemy.name)
          : buildLifeDrainAction(actorName, enemy.name),
        note: targetNullLifeDrain
          ? '(吸血無効)'
          : `(吸血: 与ダメージの${formatLifeDrainMultiplierLabel(lifeDrainLevel)}回復: ✚${healAmount})`,
        noteTone: 'muted',
      });
    }

    const deathTouchLevel = getAbilityLevel(actorStats, 'death_touch');
    if (deathTouchLevel > 0 && enemyHp > 0) {
      const targetNullDeathTouch = enemyHasNullDeathTouch(enemy);
      if (targetNullDeathTouch) {
        log.push({
          phase: 'close',
          initiativeRoll,
          actor: 'triggered',
          characterId: actorStats.characterId,
          action: buildNullDeathTouchAction(actorName, enemy.name),
          note: '(即死無効)',
          noteTone: 'muted',
        });
      } else if (Math.random() < getDeathTouchChance(deathTouchLevel, result.hits)) {
        enemyDamageTakenInBattle += enemyHp;
        enemyHp = 0;
        log.push({
          phase: 'close',
          initiativeRoll,
          actor: 'triggered',
          characterId: actorStats.characterId,
          action: buildDeathTouchAction(actorName, enemy.name),
          note: formatDeathTouchProbabilityNote(deathTouchLevel, result.hits),
          noteTone: 'muted',
        });
        triggerEnemyDefeatRecovery('close', initiativeRoll);
      }
    }

    const burnLevel = getEnemyAbilityLevel(enemy, 'burn');
    if (burnLevel > 0) {
      const actorNullBurn = hasNullBurn(actorStats);
      const reflectedDamage = actorNullBurn ? 0 : Math.floor(
        partyStats.hp
        * result.hits
        * (getBurnPercent(burnLevel) / 100)
        * (actorStats.elementalDefenseMultipliers.fire ?? 1.0),
      );
      if (reflectedDamage > 0 || actorNullBurn) {
        if (reflectedDamage > 0) {
          applyPartyDamage(reflectedDamage);
        }
        log.push({
          phase: 'close',
          initiativeRoll,
          actor: 'triggered',
          characterId: actorStats.characterId,
          action: actorNullBurn ? buildNullBurnAction(enemy.name, actorName) : buildBurnAction(actorName),
          damage: reflectedDamage > 0 ? reflectedDamage : undefined,
          damageTarget: reflectedDamage > 0 ? 'party' : undefined,
          note: actorNullBurn ? '(火傷無効)' : '(火傷)',
          noteTone: 'muted',
          hideInitiativeLabel: true,
          elementalOffense: reflectedDamage > 0 ? 'fire' : undefined,
        });

        if (reflectedDamage > 0) {
          triggerPartyDefeatRecovery(actorStats, 'close');
        }
      }
    }

    const bindLevel = getAbilityLevel(actorStats, 'bind');
    if (bindLevel > 0 && enemyHp > 0) {
      const targetNullBind = enemyHasNullBind(enemy);
      if (targetNullBind) {
        log.push({
          phase: 'close',
          initiativeRoll,
          actor: 'triggered',
          characterId: actorStats.characterId,
          action: buildNullBindAction(actorName, enemy.name),
          note: '(拘束無効)',
          noteTone: 'muted',
          hideInitiativeLabel: true,
        });
      } else if (Math.random() < getBindChance(bindLevel, result.hits)) {
        enemyIncapacitated = true;
        log.push({
          phase: 'close',
          initiativeRoll,
          actor: 'triggered',
          characterId: actorStats.characterId,
          action: buildBindAction(actorName, enemy.name),
          note: '(拘束:行動不能)',
          noteTone: 'muted',
          hideInitiativeLabel: true,
        });
      }
    }
  };

  const applyEnemyCloseReactiveAbilities = (
    targetStats: ComputedCharacterStats,
    targetName: string,
    appliedHits: number,
    appliedDamage: number,
    initiativeRoll: number,
  ): void => {
    if (appliedHits <= 0) return;

    const enemyCorrodeLevel = getEnemyAbilityLevel(enemy, 'corrode');
    if (enemyCorrodeLevel > 0 && appliedHits >= 3) {
      const targetNullCorrode = hasNullCorrode(targetStats);
      const multiplier = getCorrodeMultiplier(enemyCorrodeLevel);
      log.push({
        phase: 'close',
        initiativeRoll,
        actor: 'triggered',
        action: targetNullCorrode
          ? buildNullCorrodeAction(enemy.name, targetName)
          : buildCorrodeAction(enemy.name, targetName),
        note: targetNullCorrode
          ? '(防腐)'
          : `(腐食:相手の攻撃倍率が${formatMultiplierAsFraction(multiplier)})`,
        noteTone: 'muted',
        hideInitiativeLabel: true,
      });
      if (!targetNullCorrode) {
        characterOffenseAmplifierMultiplierById.set(
          targetStats.characterId,
          resolveCharacterOffenseAmplifierMultiplier(targetStats.characterId) * multiplier,
        );
      }
    }

    const enemyLifeDrainLevel = getEnemyAbilityLevel(enemy, 'life_drain');
    if (enemyLifeDrainLevel > 0 && appliedDamage > 0) {
      const drainMultiplier = getLifeDrainMultiplier(enemyLifeDrainLevel);
      const targetNullLifeDrain = hasNullLifeDrain(targetStats);
      const healAmount = targetNullLifeDrain ? 0 : healEnemy(Math.floor(appliedDamage * drainMultiplier));
      log.push({
        phase: 'close',
        initiativeRoll,
        actor: 'triggered',
        effectKind: 'life_drain',
        effectSourceName: enemy.name,
        effectTargetName: targetName,
        effectHealAmount: healAmount,
        action: targetNullLifeDrain
          ? buildNullLifeDrainAction(enemy.name, targetName)
          : buildLifeDrainAction(enemy.name, targetName),
        note: targetNullLifeDrain
          ? '(吸血無効)'
          : `(吸血: 与ダメージの${formatLifeDrainMultiplierLabel(enemyLifeDrainLevel)}回復: ✚${healAmount})`,
        noteTone: 'muted',
      });
    }

    const enemyDeathTouchLevel = getEnemyAbilityLevel(enemy, 'death_touch');
    if (enemyDeathTouchLevel > 0 && partyHp > 0) {
      const targetNullDeathTouch = hasNullDeathTouch(targetStats);
      if (targetNullDeathTouch) {
        log.push({
          phase: 'close',
          initiativeRoll,
          actor: 'triggered',
          action: buildNullDeathTouchAction(enemy.name, targetName),
          note: '(即死無効)',
          noteTone: 'muted',
        });
      } else if (Math.random() < getDeathTouchChance(enemyDeathTouchLevel, appliedHits)) {
        partyDamageTakenInBattle += partyHp;
        partyHp = 0;
        log.push({
          phase: 'close',
          initiativeRoll,
          actor: 'triggered',
          action: buildDeathTouchAction(enemy.name, targetName),
          note: formatDeathTouchProbabilityNote(enemyDeathTouchLevel, appliedHits),
          noteTone: 'muted',
        });
        triggerPartyDefeatRecovery(targetStats, 'close', initiativeRoll);
      }
    }

    const burnLevel = getAbilityLevel(targetStats, 'burn');
    if (burnLevel > 0 && enemyHp > 0) {
      const actorNullBurn = enemyHasNullBurn(enemy);
      const reflectedDamage = actorNullBurn ? 0 : Math.floor(
        enemy.hp
        * appliedHits
        * (getBurnPercent(burnLevel) / 100)
        * (enemy.elementalResistance.fire ?? 1.0),
      );
      if (reflectedDamage > 0 || actorNullBurn) {
        if (reflectedDamage > 0) {
          applyEnemyDamage(reflectedDamage);
        }
        log.push({
          phase: 'close',
          initiativeRoll,
          actor: 'triggered',
          characterId: targetStats.characterId,
          action: actorNullBurn ? buildNullBurnAction(targetName, enemy.name) : buildBurnAction(enemy.name),
          damage: reflectedDamage > 0 ? reflectedDamage : undefined,
          damageTarget: reflectedDamage > 0 ? 'enemy' : undefined,
          note: actorNullBurn ? '(火傷無効)' : '(火傷)',
          noteTone: 'muted',
          hideInitiativeLabel: true,
          elementalOffense: reflectedDamage > 0 ? 'fire' : undefined,
        });
        if (reflectedDamage > 0) {
          triggerEnemyDefeatRecovery('close', initiativeRoll);
        }
      }
    }

    const enemyBindLevel = getEnemyAbilityLevel(enemy, 'bind');
    if (enemyBindLevel > 0 && partyHp > 0) {
      const targetNullBind = hasNullBind(targetStats);
      if (targetNullBind) {
        log.push({
          phase: 'close',
          initiativeRoll,
          actor: 'triggered',
          characterId: targetStats.characterId,
          action: buildNullBindAction(enemy.name, targetName),
          note: '(拘束無効)',
          noteTone: 'muted',
          hideInitiativeLabel: true,
        });
      } else if (Math.random() < getBindChance(enemyBindLevel, appliedHits)) {
        incapacitatedCharacterIds.add(targetStats.characterId);
        log.push({
          phase: 'close',
          initiativeRoll,
          actor: 'triggered',
          characterId: targetStats.characterId,
          action: buildBindAction(enemy.name, targetName),
          note: '(拘束:行動不能)',
          noteTone: 'muted',
          hideInitiativeLabel: true,
        });
      }
    }
  };

  const triggerFreeAtTiming = (phase: BattleActionPhase, timing: number): boolean => {
    // SpecRef: 6.1.2 | Function of battle | a.free
    // SpecRef: 1.1 | CONSTANTS_GLOSSARY | a.pursuit
    if (forcedOutcome || partyHp <= 0 || enemyHp <= 0) {
      return false;
    }

    const enemyFreeLevel = getEnemyAbilityLevel(enemy, 'free');
    const partyPursuitOwner = characterStats
      .map((stats) => ({
        stats,
        level: getAbilityLevel(stats, 'pursuit'),
        ownerName: party.characters.find((char) => char.id === stats.characterId)?.name ?? '味方',
      }))
      .filter((entry) => entry.level > 0)
      .sort((a, b) => a.stats.row - b.stats.row)[0];
    if (!partyPursuitOwner && getFreeTimingForPhase(phase, enemyFreeLevel) === timing) {
      forcedOutcome = 'draw';
      forcedOutcomePhase = phase;
      log.push({
        phase,
        initiativeRoll: timing,
        actor: 'triggered',
        action: buildFreeAction(enemy.name),
      });
      return true;
    }
    if (partyPursuitOwner && getFreeTimingForPhase(phase, enemyFreeLevel) === timing) {
      log.push({
        phase,
        initiativeRoll: timing,
        actor: 'triggered',
        characterId: partyPursuitOwner.stats.characterId,
        action: buildPursuitAction(partyPursuitOwner.ownerName, enemy.name),
      });
      return false;
    }

    const partyFreeEntries = characterStats
      .map((stats) => ({
        stats,
        level: getAbilityLevel(stats, 'free'),
        ownerName: party.characters.find((char) => char.id === stats.characterId)?.name ?? '味方',
      }))
      .filter((entry) => getFreeTimingForPhase(phase, entry.level) === timing)
      .sort((a, b) => a.stats.row - b.stats.row);

    const freeOwner = partyFreeEntries[0];
    if (!freeOwner) {
      return false;
    }
    const enemyHasPursuit = getEnemyAbilityLevel(enemy, 'pursuit') > 0;
    if (enemyHasPursuit) {
      log.push({
        phase,
        initiativeRoll: timing,
        actor: 'triggered',
        action: buildPursuitAction(enemy.name, freeOwner.ownerName),
      });
      return false;
    }

    forcedOutcome = 'draw';
    forcedOutcomePhase = phase;
    log.push({
      phase,
      initiativeRoll: timing,
      actor: 'triggered',
      characterId: freeOwner.stats.characterId,
      action: buildFreeAction(freeOwner.ownerName),
    });
    return true;
  };

  const createPartyEffectEntry = (
    abilityId: 'defender' | 'command' | 'm_barrier',
    label: (level: number) => string,
    noteText: (level: number) => string,
  ): BattleLogEntry | null => {
    let bestLevel = 0;
    let ownerName: string | null = null;

    for (const char of party.characters) {
      const stats = characterStats.find((candidate) => candidate.characterId === char.id);
      if (!stats || isActorAbilitySuppressedBySilenceField(environment.terrainEffect, stats.abilities)) continue;
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
      phase: 'start',
      actor: 'effect',
      action: `${ownerName}の ${label(bestLevel)}！`,
      note: noteText(bestLevel),
    };
  };

  const createPartyAbilityEffectEntry = (
    abilityId: AbilityId,
    label: (level: number) => string,
    noteText: (level: number) => string,
  ): BattleLogEntry | null => {
    let bestLevel = 0;
    let ownerName: string | null = null;

    for (const char of party.characters) {
      const stats = characterStats.find((candidate) => candidate.characterId === char.id);
      if (!stats || isActorAbilitySuppressedBySilenceField(environment.terrainEffect, stats.abilities)) continue;
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
      phase: 'start',
      actor: 'effect',
      action: `${ownerName}の ${label(bestLevel)}！`,
      note: noteText(bestLevel),
    };
  };

  const mBarrierEffectEntry = createPartyEffectEntry('m_barrier', () => '魔法障壁', level => `(後列の味方への魔法ダメージ × ${level >= 3 ? '1/2' : level === 2 ? '3/5' : '2/3'})`);
  const partyEffects = [
    createPartyEffectEntry('defender', () => '守護者', level => `(後列の味方への物理ダメージ × ${level >= 3 ? '1/2' : level === 2 ? '3/5' : '2/3'})`),
    createPartyEffectEntry('command', () => '指揮', level => `(後列の味方が与える物理ダメージ × ${level >= 3 ? '1.6' : level === 2 ? '1.5' : '1.4'})`),
    mBarrierEffectEntry && hasAbility(enemy.abilities, 'm_barrier_breaker')
      ? {
        phase: 'start',
        actor: 'effect',
        action: `${enemy.name}は魔法障壁を打ち破り無効化した(魔法障壁破り)`,
      } as BattleLogEntry
      : mBarrierEffectEntry,
    createPartyAbilityEffectEntry('deflection', () => '矢払い', level => `(敵の遠距離攻撃の命中率を${level >= 2 ? '15' : '10'}%低下)`),
  ];

  const triggerEnemyCounter = (
    phase: BattleActionPhase,
    targetCharStats: ComputedCharacterStats,
    dealtDamage: number,
    initiativeRoll?: number,
  ): void => {
    // SpecRef: 6.1.4.3 | Function of Reactive ability | f.counter
    const counterNoAMultiplier = getEnemyCounterNoAMultiplier(enemy);
    if (dealtDamage <= 0 || counterNoAMultiplier <= 0 || (phase !== 'long' && phase !== 'close')) return;

    const nullifierStats = getAvailableNullCounterOwner(characterStats, remainingNullCounterByCharacterId);
    const nullifiedByParty = !!nullifierStats;
    const targetChar = party.characters.find(c => c.id === targetCharStats.characterId);

    if (nullifiedByParty) {
      const nullifier = party.characters.find(c => c.id === nullifierStats?.characterId);
      if (nullifierStats) {
        consumeNullCounter(nullifierStats.characterId, remainingNullCounterByCharacterId);
      }
      log.push({
        phase,
        actor: 'effect',
        action: `${nullifier?.name ?? '味方'}の反撃無効化により、${enemy.name}の反撃は防がれた！`,
      });
      return;
    }

    const enemyEchoDomainUsageCount = registerElementalOffenseUsage(enemy.elementalOffense, enemy.abilities);
    const singleDamage = calculateSingleEnemyAttackDamage(phase, enemy, characterStats, targetCharStats, enemyHp, partyHp, partyStats.hp, environment.terrainEffect, enemyOffenseAmplifierMultiplier, enemyEchoDomainUsageCount);
    const enemyPhaseAccuracyBonus = phase === 'close' ? enemyTemporaryAccuracyBonus : 0;
    const attempts = Math.ceil(
      getEnemyNoA(phase, enemy)
      * counterNoAMultiplier
      * getTerrainNoAAmplifier(phase, environment.terrainEffect, enemy.abilities)
    );
    if (attempts <= 0) {
      return;
    }
    let hits = 0;
    for (let i = 1; i <= attempts; i++) {
      const didHit = hitDetection(1.0, enemy.accuracyBonus + enemyPhaseAccuracyBonus, targetCharStats.evasionBonus + (phase === 'close' ? (temporaryEvasionBonusByCharacterId.get(targetCharStats.characterId) ?? 0) : 0), i, phase, getDeflectionLevel(targetCharStats), getEnemyFocusLevel(enemy), environment.terrainEffect, 0, hasAbility(enemy.abilities, 'true_sight'), hasAbility(enemy.abilities, 'domain_breaker'));
      if (didHit) {
        hits += 1;
      }
    }

    const targetName = targetChar?.name ?? '???';
    let damage = 0;
    let appliedHits = 0;
    let avoidedByStealth = false;
    const illusionIsActive = isIllusionActive(
      phase,
      hasIllusion(targetCharStats),
      `character:${targetCharStats.characterId}`,
      consumedIllusionStateIds,
    );
    const avoidedByIllusion = illusionIsActive && !hasAbility(enemy.abilities, 'illusion_breaker');

    if (illusionIsActive && hasAbility(enemy.abilities, 'illusion_breaker')) {
      consumedIllusionStateIds.add(`character:${targetCharStats.characterId}`);
      log.push({
        phase,
        actor: 'effect',
        action: buildIllusionBreakerAction(enemy.name),
      });
    } else if (avoidedByIllusion) {
      consumedIllusionStateIds.add(`character:${targetCharStats.characterId}`);
    } else {
      for (let i = 0; i < hits; i++) {
        if (isStealthActive(targetCharStats, partyHp, partyStats.hp, enemy.abilities)) {
          avoidedByStealth = true;
          continue;
        }
        appliedHits += 1;
        damage += singleDamage;
        applyPartyDamage(singleDamage);
      }
    }

    triggerPartyDefeatRecovery(targetCharStats, phase, initiativeRoll, true);

    const enemyCounterRageBonusPercent = toRageBonusPercent(getEnemyRageAmplifier(enemy, enemyHp, targetCharStats.abilities));
    const enemyCounterSwarmBonuses = getSwarmLogBonuses(enemy.abilities, enemyHp, enemy.hp, targetCharStats.abilities, partyHp, partyStats.hp);
    log.push({
      phase,
      initiativeRoll,
      actor: 'enemy',
      action: `${targetName} に反撃！`,
      damage: damage > 0 ? damage : undefined,
      hits: appliedHits,
      totalAttempts: attempts,
      wasNegated: appliedHits === 0 && (avoidedByIllusion || avoidedByStealth) ? true : undefined,
      rageBonusPercent: enemyCounterRageBonusPercent > 0 ? enemyCounterRageBonusPercent : undefined,
      ...enemyCounterSwarmBonuses,
      isCounter: true,
      elementalOffense: enemy.elementalOffense,
    });

    if (avoidedByIllusion) {
      log.push({
        phase,
        actor: 'effect',
        action: buildIllusionAction(targetName),
      });
    }

    if (avoidedByStealth) {
      log.push({
        phase,
        actor: 'effect',
        action: `${targetName} は物陰に隠れて攻撃をやり過ごせたのだ！`,
      });
    }

    const reCounterNoAMultiplier = getReCounterNoAMultiplier(targetCharStats);
    if (partyHp <= 0 || enemyHp <= 0 || !targetChar || reCounterNoAMultiplier <= 0 || getEnemyAbilityLevel(enemy, 'null_counter') > 0) {
      return;
    }

    const reCounterEchoDomainUsageCount = registerElementalOffenseUsage(targetCharStats.elementalOffense, targetCharStats.abilities);
    const reCounterResult = calculateCharacterDamage(phase, targetCharStats, targetChar, enemy, enemyHp, characterStats, partyStats, partyHp, partyDeityKey, environment.terrainEffect, reCounterNoAMultiplier, phase === 'close' ? (temporaryAccuracyBonusByCharacterId.get(targetCharStats.characterId) ?? 0) : 0, phase === 'close' ? enemyTemporaryEvasionBonus : 0, resolveCharacterOffenseAmplifierMultiplier(targetCharStats.characterId), reCounterEchoDomainUsageCount);
    if (reCounterResult.totalAttempts <= 0) {
      return;
    }

    const reCounterDealtDamage = reCounterResult.damage > 0;
    addEnemyHitsReceived(reCounterResult.hits);
    if (reCounterDealtDamage) {
      applyEnemyDamage(reCounterResult.damage);
    }

    const characterReCounterRageBonusPercent = toRageBonusPercent(getCharacterRageAmplifier(targetCharStats, partyHp, partyStats.hp, enemy.abilities));
    const characterReCounterMomentumBonusPercent = toMomentumBonusPercent(getCharacterMomentumAmplifier(targetCharStats, partyHp, partyStats.hp, enemy.abilities));
    const characterReCounterSwarmBonuses = getSwarmLogBonuses(targetCharStats.abilities, partyHp, partyStats.hp, enemy.abilities, enemyHp, enemy.hp);
    log.push({
      phase,
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
      ...characterReCounterSwarmBonuses,
      isCounter: true,
      elementalOffense: targetCharStats.elementalOffense,
    });

    if (reCounterDealtDamage) {
      triggerEnemyDefeatRecovery(phase, initiativeRoll);
    }
  };

  const triggerCoveringFire = (
    phase: BattleActionPhase,
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

      const coveringFireEchoDomainUsageCount = registerElementalOffenseUsage(coverCharStats.elementalOffense, coverCharStats.abilities);
      const coveringFireResult = calculateCharacterDamage('long', coverCharStats, coverChar, enemy, enemyHp, characterStats, partyStats, partyHp, partyDeityKey, environment.terrainEffect, coveringFireNoAMultiplier, 0, 0, resolveCharacterOffenseAmplifierMultiplier(coverCharStats.characterId), coveringFireEchoDomainUsageCount);
      if (coveringFireResult.totalAttempts <= 0) continue;

      const enemyIllusionIsActiveForCoveringFire = isIllusionActive('long', getEnemyAbilityLevel(enemy, 'illusion') > 0, 'enemy', consumedIllusionStateIds);
      if (enemyIllusionIsActiveForCoveringFire && hasAbility(coverCharStats.abilities, 'illusion_breaker')) {
        consumedIllusionStateIds.add('enemy');
        log.push({
          phase,
          actor: 'effect',
          action: buildIllusionBreakerAction(coverChar.name),
        });
      } else if (enemyIllusionIsActiveForCoveringFire) {
        consumedIllusionStateIds.add('enemy');
        coveringFireResult.damage = 0;
        coveringFireResult.hits = 0;
        coveringFireResult.wasNegatedByEnemyIllusion = true;
      } else if (isEnemyStealthActive(enemy, enemyHp, coverCharStats.abilities)) {
        coveringFireResult.damage = 0;
        coveringFireResult.hits = 0;
        coveringFireResult.wasNegatedByEnemyStealth = true;
      }

      addEnemyHitsReceived(coveringFireResult.hits);
      const coveringFireDealtDamage = coveringFireResult.damage > 0;
      if (coveringFireDealtDamage) {
        applyEnemyDamage(coveringFireResult.damage);
      }

      const coverFireRageBonusPercent = toRageBonusPercent(getCharacterRageAmplifier(coverCharStats, partyHp, partyStats.hp, enemy.abilities));
      const coverFireMomentumBonusPercent = toMomentumBonusPercent(getCharacterMomentumAmplifier(coverCharStats, partyHp, partyStats.hp, enemy.abilities));
      const coverFireSwarmBonuses = getSwarmLogBonuses(coverCharStats.abilities, partyHp, partyStats.hp, enemy.abilities, enemyHp, enemy.hp);
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
        ...coverFireSwarmBonuses,
        isCounter: true,
        wasNegated: coveringFireResult.wasNegatedByEnemyIllusion || coveringFireResult.wasNegatedByEnemyStealth || undefined,
        elementalOffense: coverCharStats.elementalOffense,
      });

      if (coveringFireResult.wasNegatedByEnemyIllusion) {
        log.push({
          phase,
          actor: 'effect',
          action: buildIllusionAction(enemy.name),
        });
      }
      if (coveringFireResult.wasNegatedByEnemyStealth) {
        log.push({
          phase,
          actor: 'effect',
          action: `${enemy.name} は神隠れした。もう攻撃はこれ以上あたらない！`,
        });
      }

      if (coveringFireDealtDamage) {
        triggerEnemyDefeatRecovery(phase, initiativeRoll);
      }

      if (enemyHp <= 0) {
        break;
      }
    }
  };

  const phases: BattleActionPhase[] = ['long', 'mid', 'close'];
  const hasFertilityInitiativeBonus = getDeityKey(party.deity.name) === 'Goddess of Fertility'
    && environment.terrainEffect !== 'terrain.gehenna';

  const partyHasFrostbite = (): boolean => characterStats.some((cs) => (
    !isActorAbilitySuppressedBySilenceField(environment.terrainEffect, cs.abilities)
    && hasAbility(cs.abilities, 'frostbite')
  ));
  const enemyHasFrostbite = (): boolean => !isEnemyActorAbilitiesSuppressed() && hasAbility(enemy.abilities, 'frostbite');

  const pushFrostbiteLog = (ownerName: string): void => {
    log.push({
      phase: 'start',
      actor: 'effect',
      action: `${ownerName} の凍傷！`,
      note: '(相手の行動を少し遅らせる)',
    });
  };

  const mutualOwners: Array<{ name: string; abilities: AbilityLike[] }> = [
    ...party.characters
      .map((c) => ({
        name: c.name,
        abilities: characterStats.find((cs) => cs.characterId === c.id)?.abilities ?? [],
      }))
      .filter((owner) => !isActorAbilitySuppressedBySilenceField(environment.terrainEffect, owner.abilities)),
    ...(isEnemyActorAbilitiesSuppressed() ? [] : [{ name: enemy.name, abilities: enemy.abilities }]),
  ];
  const startPhaseEffects: Array<{ abilityId: AbilityId; actionName: string; effectLabel: string; multipliersByLevel: Record<number, number> }> = [
    { abilityId: 'mutual_physical_amplify', actionName: '物理増幅', effectLabel: '双方物理ダメージ', multipliersByLevel: MUTUAL_PHYSICAL_AMPLIFY_MULTIPLIERS },
    { abilityId: 'mutual_physical_restraint', actionName: '物理抑制', effectLabel: '双方物理ダメージ', multipliersByLevel: MUTUAL_PHYSICAL_RESTRAINT_MULTIPLIERS },
    { abilityId: 'mutual_magic_amplify', actionName: '魔法増幅', effectLabel: '双方魔法ダメージ', multipliersByLevel: MUTUAL_MAGIC_AMPLIFY_MULTIPLIERS },
    { abilityId: 'mutual_magic_restraint', actionName: '魔法抑制', effectLabel: '双方魔法ダメージ', multipliersByLevel: MUTUAL_MAGIC_RESTRAINT_MULTIPLIERS },
  ];

  type FadingMemoryTarget =
    | { kind: 'enemy'; name: string; abilities: AbilityLike[] }
    | { kind: 'character'; name: string; stats: ComputedCharacterStats; abilities: AbilityLike[] };

  const resolveFadingMemory = (ownerName: string): void => {
    const targets: FadingMemoryTarget[] = [
      { kind: 'enemy', name: enemy.name, abilities: enemy.abilities },
      ...characterStats.map((stats) => ({
        kind: 'character' as const,
        name: party.characters.find((char) => char.id === stats.characterId)?.name ?? '味方',
        stats,
        abilities: stats.abilities,
      })),
    ];

    const target = targets[Math.floor(Math.random() * targets.length)];
    if (!target) return;

    const targetHasUnforgettable = target.kind === 'enemy'
      ? getEnemyAbilityLevel(enemy, 'unforgettable') >= 1
      : getAbilityLevel(target.stats, 'unforgettable') >= 1;
    if (targetHasUnforgettable) {
      log.push({
        phase: 'start',
        actor: 'effect',
        characterId: target.kind === 'character' ? target.stats.characterId : undefined,
        action: buildUnforgettableAction(ownerName, target.name),
        note: '(忘却無効)',
        noteTone: 'muted',
      });
      return;
    }

    const validAbilities = target.abilities.filter((ability) => ability.level > 0);
    if (validAbilities.length === 0) return;

    const selectedAbility = validAbilities[Math.floor(Math.random() * validAbilities.length)];
    const selectedAbilityIndex = target.abilities.findIndex(
      (ability) => ability.id === selectedAbility.id && ability.level === selectedAbility.level,
    );

    if (selectedAbilityIndex >= 0) {
      target.abilities.splice(selectedAbilityIndex, 1);
    }

    log.push({
      phase: 'start',
      actor: 'effect',
      characterId: target.kind === 'character' ? target.stats.characterId : undefined,
      action: `${ownerName} の薄れる記憶が ${target.name} の ${formatAbilityLabel(selectedAbility)} を忘却の彼方に消し去った！`,
    });
  };

  const resolveStartPhaseTriggerTiming = (timing: number): void => {
    if (timing === 9) {
      if (enemyHasOblivion() && characterStats.length > 0) {
        const targetIndex = Math.floor(Math.random() * characterStats.length);
        const target = characterStats[targetIndex];
        const targetName = party.characters.find((char) => char.id === target.characterId)?.name ?? '味方';
        const targetHasUnforgettable = getAbilityLevel(target, 'unforgettable') >= 1;
        if (targetHasUnforgettable) {
          log.push({
            phase: 'start',
            actor: 'effect',
            characterId: target.characterId,
            action: buildUnforgettableAction(enemy.name, targetName),
            note: '(忘却無効)',
            noteTone: 'muted',
          });
        }
        const targetValidAbilities = target.abilities.filter((ability) => ability.level > 0);

        if (!targetHasUnforgettable && targetValidAbilities.length > 0) {
          const selectedTargetAbility = targetValidAbilities[Math.floor(Math.random() * targetValidAbilities.length)];
          const selectedTargetAbilityIndex = target.abilities.findIndex(
            (ability) => ability.id === selectedTargetAbility.id && ability.level === selectedTargetAbility.level,
          );

          if (selectedTargetAbilityIndex >= 0) {
            target.abilities.splice(selectedTargetAbilityIndex, 1);
          }

          log.push({
            phase: 'start',
            actor: 'effect',
            action: `${enemy.name} が ${targetName} の ${formatAbilityLabel(selectedTargetAbility)} を忘却の彼方に消し去った！`,
          });
        }
      }

      for (const owner of getOblivionOwners().sort((a, b) => a.stats.row - b.stats.row)) {
        const enemyHasUnforgettable = getEnemyAbilityLevel(enemy, 'unforgettable') >= 1;
        if (enemyHasUnforgettable) {
          log.push({
            phase: 'start',
            actor: 'effect',
            action: buildUnforgettableAction(owner.name, enemy.name),
            note: '(忘却無効)',
            noteTone: 'muted',
          });
          continue;
        }

        const enemyValidAbilities = enemy.abilities.filter((ability) => ability.level > 0);
        if (enemyValidAbilities.length === 0) continue;

        const selectedEnemyAbility = enemyValidAbilities[Math.floor(Math.random() * enemyValidAbilities.length)];
        const selectedEnemyAbilityIndex = enemy.abilities.findIndex(
          (ability) => ability.id === selectedEnemyAbility.id && ability.level === selectedEnemyAbility.level,
        );

        if (selectedEnemyAbilityIndex >= 0) {
          enemy.abilities.splice(selectedEnemyAbilityIndex, 1);
        }

        log.push({
          phase: 'start',
          actor: 'effect',
          action: `${owner.name} が ${enemy.name} の ${formatAbilityLabel(selectedEnemyAbility)} を忘却の彼方に消し去った！`,
        });
      }
    }

    if (timing === 8) {
      if (enemyHasFadingMemory()) {
        resolveFadingMemory(enemy.name);
      }

      for (const owner of getFadingMemoryOwners().sort((a, b) => a.stats.row - b.stats.row)) {
        resolveFadingMemory(owner.name);
      }

      if (enemyHasMimic() && characterStats.length > 0) {
        const targetIndex = Math.floor(Math.random() * characterStats.length);
        const target = characterStats[targetIndex];
        const targetName = party.characters.find((char) => char.id === target.characterId)?.name ?? '味方';
        const targetValidAbilities = target.abilities.filter(
          (ability) => ability.level > 0 && ability.id !== 'mimic' && ability.id !== 'oblivion' && ability.id !== 'fading_memory',
        );

        if (targetValidAbilities.length > 0) {
          const selectedTargetAbility = targetValidAbilities[Math.floor(Math.random() * targetValidAbilities.length)];
          grantEnemyAbility(enemy, selectedTargetAbility);

          log.push({
            phase: 'start',
            actor: 'effect',
            action: `${enemy.name} が ${targetName} の ${formatAbilityLabel(selectedTargetAbility)} を模倣した！`,
          });
        }
      }

      for (const owner of getMimicOwners().sort((a, b) => a.stats.row - b.stats.row)) {
        const enemyValidAbilities = enemy.abilities.filter(
          (ability) => ability.level > 0 && ability.id !== 'mimic' && ability.id !== 'oblivion' && ability.id !== 'fading_memory',
        );
        if (enemyValidAbilities.length === 0) continue;

        const selectedEnemyAbility = enemyValidAbilities[Math.floor(Math.random() * enemyValidAbilities.length)];
        grantCharacterAbility(owner.stats, selectedEnemyAbility);

        log.push({
          phase: 'start',
          actor: 'effect',
          action: `${owner.name} が ${enemy.name} の ${formatAbilityLabel(selectedEnemyAbility)} を模倣した！`,
        });
      }
    }

    if (timing === 7) {
      for (const partyEffect of partyEffects) {
        if (partyEffect) {
          log.push(partyEffect);
        }
      }
    }

    if (timing === 3) {
      activeMagicSealQueue = createMagicSealQueue(party, characterStats, enemy, environment.terrainEffect);

      for (const ownerName of activeMagicSealQueue) {
        log.push(getMagicSealStartLog(ownerName));
      }

      if (partyHasFrostbite()) {
        const frostbiteOwner = party.characters.find(c => {
          const stats = characterStats.find(candidate => candidate.characterId === c.id);
          return stats ? hasAbility(stats.abilities, 'frostbite') : false;
        });
        pushFrostbiteLog(frostbiteOwner?.name ?? '味方');
      }

      if (enemyHasFrostbite()) {
        pushFrostbiteLog(enemy.name);
      }

      for (const effect of startPhaseEffects) {
        for (const owner of mutualOwners) {
          const abilityLevel = getHighestAbilityLevel(owner.abilities, effect.abilityId);
          const multiplier = effect.multipliersByLevel[abilityLevel];
          if (abilityLevel > 0 && multiplier !== undefined) {
            log.push({
              phase: 'start',
              actor: 'effect',
              action: `${owner.name} の${effect.actionName}！`,
              note: `(${effect.effectLabel}${multiplier}倍)`,
            });
          }
        }
      }
    }
  };

  for (const timing of TRIGGER_TIMINGS_DESC) {
    resolveStartPhaseTriggerTiming(timing);
  }

  const resolveEndPhaseTriggerTiming = (_timing: number): void => {
    // END-phase trigger slots are reserved so new END abilities can be added
    // without changing the phase-resolution loop structure.
  };

  for (const phase of phases) {
    const enemyIsEligibleActor = isEligibleEnemyForPhase(phase, enemy);
    const enemyInitiativeRoll = enemyIsEligibleActor
      ? rollInitiative(getEnemyFirstStrikeLevel(enemy), {
        terrainEffect: environment.terrainEffect,
        actorType: 'enemy',
        slowPenalty: getHighestAbilityLevel(enemy.abilities, 'slow'),
        boostBonus: getHighestAbilityLevel(enemy.abilities, 'boost'),
        frostbitePenalty: partyHasFrostbite() && !hasAbility(enemy.abilities, 'coldproof') ? 1 : 0,
        actorHasTrueSight: hasAbility(enemy.abilities, 'true_sight'),
        actorHasEquationBreaker: hasAbility(enemy.abilities, 'equation_breaker'),
        actorHasWindRider: hasAbility(enemy.abilities, 'wind_rider'),
      })
      : null;
    const characterInitiative = characterStats
      .filter(cs => isEligibleCharacterForPhase(phase, cs))
      .map(cs => ({
        stats: cs,
        roll: rollInitiative(getFirstStrikeLevel(cs), {
          terrainEffect: environment.terrainEffect,
          actorType: 'party',
          fertilityBonus: hasFertilityInitiativeBonus ? 1 : 0,
          slowPenalty: getHighestAbilityLevel(cs.abilities, 'slow'),
          boostBonus: getHighestAbilityLevel(cs.abilities, 'boost'),
          frostbitePenalty: enemyHasFrostbite() && !hasAbility(cs.abilities, 'coldproof') ? 1 : 0,
          actorHasTrueSight: hasAbility(cs.abilities, 'true_sight'),
          actorHasEquationBreaker: hasAbility(cs.abilities, 'equation_breaker'),
          actorHasWindRider: hasAbility(cs.abilities, 'wind_rider'),
        }),
      }));

    const initiativeByCharacter = new Map<number, number>(
      characterInitiative.map(ci => [ci.stats.characterId, ci.roll])
    );

    let hasTriggeredLongPhaseHowl = false;
    let enemyHasMovedInPhase = false;
    const movedCharacterIds = new Set<number>();
    const triggeredConfusionTimings = new Set<number>();
    let hasTriggeredDecompose = false;
    let hasTriggeredRegeneration = false;
    let hasTriggeredPredatorSense = false;
    let hasTriggeredFlying = false;
    const triggerLongPhaseHowl = (): void => {
      if (phase !== 'long' || hasTriggeredLongPhaseHowl) return;
      hasTriggeredLongPhaseHowl = true;

      // SpecRef: 1.1 | CONSTANTS_GLOSSARY | a.howl
      // `a.howl` triggers only while the opponent side has not acted yet in this battle.
      const enemyHowlLevel = getEnemyAbilityLevel(enemy, 'howl');
      const canEnemyTriggerHowl = characterActedInBattleIds.size === 0;
      if (enemyHowlLevel > 0 && canEnemyTriggerHowl) {
        pendingEnemyHowlEffects = [{
          multiplier: getHowlNoAMultiplier(enemyHowlLevel),
          ownerName: enemy.name,
          note: getHowlNote(enemyHowlLevel),
        }];
      }

      const canPartyTriggerHowl = !enemyHasActedInBattle;
      const partyHowlEntries = characterStats
        .map((stats) => ({
          level: getAbilityLevel(stats, 'howl'),
          ownerName: party.characters.find((char) => char.id === stats.characterId)?.name ?? '味方',
          stats,
        }))
        .filter((entry) => entry.level > 0 && canPartyTriggerHowl)
        .sort((a, b) => a.stats.row - b.stats.row);

      if (enemyHowlLevel > 0 && canEnemyTriggerHowl) {
        log.push({
          phase,
          initiativeRoll: 2,
          actor: 'triggered',
          action: `${enemy.name} が遠吠えをした！`,
          note: getHowlNote(enemyHowlLevel),
        });
      }

      for (const entry of partyHowlEntries) {
        pendingPartyHowlEffects.push({
          multiplier: getHowlNoAMultiplier(entry.level),
          ownerName: entry.ownerName,
          note: getHowlNote(entry.level),
          characterId: entry.stats.characterId,
        });
        log.push({
          phase,
          initiativeRoll: 2,
          actor: 'triggered',
          characterId: entry.stats.characterId,
          action: `${entry.ownerName} が遠吠えをした！`,
          note: getHowlNote(entry.level),
        });
      }
    };

    const triggerPredatorSenseAtTiming = (timing: number): void => {
      if (phase !== 'close' || timing !== 9 || hasTriggeredPredatorSense) return;
      hasTriggeredPredatorSense = true;

      const enemyPredatorSenseLevel = getEnemyAbilityLevel(enemy, 'predator_sense');
      const enemyThreshold = getPredatorSenseThresholdPercent(enemyPredatorSenseLevel);
      if (enemyThreshold > 0 && partyHp < (partyStats.hp * enemyThreshold) / 100) {
        enemyTemporaryAccuracyBonus += 0.04;
        log.push({
          phase,
          initiativeRoll: timing,
          actor: 'triggered',
          action: `${enemy.name} の捕食！`,
          note: getPredatorSenseNote(enemyPredatorSenseLevel),
        });
      }

      const partyPredatorSenseEntries = characterStats
        .map((stats) => ({
          stats,
          level: getAbilityLevel(stats, 'predator_sense'),
          ownerName: party.characters.find((char) => char.id === stats.characterId)?.name ?? '味方',
        }))
        .filter((entry) => {
          const threshold = getPredatorSenseThresholdPercent(entry.level);
          return threshold > 0 && enemyHp < (enemy.hp * threshold) / 100;
        })
        .sort((a, b) => a.stats.row - b.stats.row);

      for (const entry of partyPredatorSenseEntries) {
        temporaryAccuracyBonusByCharacterId.set(
          entry.stats.characterId,
          (temporaryAccuracyBonusByCharacterId.get(entry.stats.characterId) ?? 0) + 0.04,
        );
        log.push({
          phase,
          initiativeRoll: timing,
          actor: 'triggered',
          characterId: entry.stats.characterId,
          action: `${entry.ownerName} の捕食！`,
          note: getPredatorSenseNote(entry.level),
        });
      }
    };

    const triggerRegenerationAtTiming = (timing: number): void => {
      if (phase !== 'close' || timing !== 9 || hasTriggeredRegeneration) return;
      hasTriggeredRegeneration = true;

      const enemyRegenerationLevel = getEnemyAbilityLevel(enemy, 'regeneration');
      const enemyRegenerationPercent = getRegenerationPercent(enemyRegenerationLevel);
      if (enemyHp > 0 && enemyRegenerationPercent > 0 && enemyDamageTakenInBattle > 0) {
        const healAmount = Math.min(
          enemy.hp - enemyHp,
          Math.floor((enemyDamageTakenInBattle * enemyRegenerationPercent) / 100),
        );
        if (healAmount > 0) {
          enemyHp = Math.min(enemy.hp, enemyHp + healAmount);
          log.push({
            phase,
            initiativeRoll: timing,
            actor: 'triggered',
            action: buildRegenerationAction(enemy.name),
            note: formatRegenerationNote(healAmount),
          });
        }
      }

      const partyRegenerationEntries = characterStats
        .map((stats) => ({
          stats,
          level: getAbilityLevel(stats, 'regeneration'),
          ownerName: party.characters.find((char) => char.id === stats.characterId)?.name ?? '味方',
        }))
        .filter((entry) => getRegenerationPercent(entry.level) > 0)
        .sort((a, b) => a.stats.row - b.stats.row);

      for (const entry of partyRegenerationEntries) {
        if (partyHp <= 0 || partyDamageTakenInBattle <= 0) {
          continue;
        }

        const healAmount = Math.min(
          partyStats.hp - partyHp,
          Math.floor((partyDamageTakenInBattle * getRegenerationPercent(entry.level)) / 100),
        );

        if (healAmount <= 0) {
          continue;
        }

        partyHp = Math.min(partyStats.hp, partyHp + healAmount);
        log.push({
          phase,
          initiativeRoll: timing,
          actor: 'triggered',
          characterId: entry.stats.characterId,
          action: buildRegenerationAction(entry.ownerName),
          note: formatRegenerationNote(healAmount),
        });
      }
    };

    // SpecRef: 6.1.3.1 | Actor action | actor.a.flying
    const triggerFlyingAtTiming = (timing: number): void => {
      if (phase !== 'close' || timing !== 9 || hasTriggeredFlying) return;
      hasTriggeredFlying = true;
      if (enemyHp <= 0 || partyHp <= 0) return;

      const enemyFlyingLevel = getEnemyAbilityLevel(enemy, 'flying');
      if (enemyFlyingLevel > 0) {
        enemyTemporaryEvasionBonus += getFlyingEvasionBonus(enemyFlyingLevel);
        log.push({
          phase,
          initiativeRoll: timing,
          actor: 'triggered',
          action: buildFlyingAction(enemy.name),
          note: getFlyingNote(enemyFlyingLevel),
        });
      }

      const partyFlyingEntries = characterStats
        .map((stats) => ({
          stats,
          level: getAbilityLevel(stats, 'flying'),
          ownerName: party.characters.find((char) => char.id === stats.characterId)?.name ?? '味方',
        }))
        .filter((entry) => entry.level > 0)
        .sort((a, b) => a.stats.row - b.stats.row);

      for (const entry of partyFlyingEntries) {
        temporaryEvasionBonusByCharacterId.set(
          entry.stats.characterId,
          (temporaryEvasionBonusByCharacterId.get(entry.stats.characterId) ?? 0) + getFlyingEvasionBonus(entry.level),
        );
        log.push({
          phase,
          initiativeRoll: timing,
          actor: 'triggered',
          characterId: entry.stats.characterId,
          action: buildFlyingAction(entry.ownerName),
          note: getFlyingNote(entry.level),
        });
      }
    };

    const triggerDecomposeAtTiming = (timing: number): void => {
      if (phase !== 'close' || timing !== 2 || hasTriggeredDecompose) return;
      hasTriggeredDecompose = true;
      if (enemyHp <= 0 || partyHp <= 0) return;

      const enemyDecomposeLevel = getEnemyAbilityLevel(enemy, 'decompose');
      if (enemyDecomposeLevel > 0) {
        const { row, newCtx } = getTargetRow(ctx, 'close');
        ctx = newCtx;
        const target = resolveEnemyTarget(row, characterStats, 'close', enemy.abilities);
        if (target) {
          const multiplier = getDecomposeDefenseMultiplier(enemyDecomposeLevel);
          const previousDefense = target.physicalDefense;
          const nextDefense = roundDecomposeDefenseValue(previousDefense * multiplier);
          const targetName = party.characters.find((char) => char.id === target.characterId)?.name ?? '味方';
          characterStats = characterStats.map((stats) => (
            stats.characterId === target.characterId
              ? { ...stats, physicalDefense: nextDefense }
              : stats
          ));
          log.push({
            phase,
            initiativeRoll: timing,
            actor: 'triggered',
            action: buildDecomposeAction(enemy.name, targetName),
            note: formatDecomposeNote(targetName, previousDefense, nextDefense),
            noteTone: 'muted',
          });
          ctx = {
            ...ctx,
            characterStats,
          };
        }
      }

      const partyDecomposeEntries = characterStats
        .map((stats) => ({
          stats,
          level: getAbilityLevel(stats, 'decompose'),
          ownerName: party.characters.find((char) => char.id === stats.characterId)?.name ?? '味方',
        }))
        .filter((entry) => entry.level > 0)
        .sort((a, b) => a.stats.row - b.stats.row);

      for (const entry of partyDecomposeEntries) {
        if (enemyHp <= 0 || partyHp <= 0) break;

        const previousDefense = enemy.physicalDefense;
        const nextDefense = roundDecomposeDefenseValue(previousDefense * getDecomposeDefenseMultiplier(entry.level));
        enemy.physicalDefense = nextDefense;
        log.push({
          phase,
          initiativeRoll: timing,
          actor: 'triggered',
          characterId: entry.stats.characterId,
          action: buildDecomposeAction(entry.ownerName, enemy.name),
          note: formatDecomposeNote(enemy.name, previousDefense, nextDefense),
          noteTone: 'muted',
        });
      }
    };

    const triggerConfusionAtTiming = (timing: number): void => {
      if (triggeredConfusionTimings.has(timing)) return;
      triggeredConfusionTimings.add(timing);

      const confusionAbilityId = getConfusionAbilityIdForPhase(phase);
      const eligibleEnemyTarget = isEligibleEnemyForPhase(phase, enemy, enemyHasMovedInPhase);

      const enemyConfusionLevel = getEnemyAbilityLevel(enemy, confusionAbilityId);
      if (getConfusionTiming(enemyConfusionLevel) === timing) {
        const eligiblePartyTargets = characterStats.filter((stats) => (
          isEligibleCharacterForPhase(phase, stats, movedCharacterIds.has(stats.characterId))
        ));
        const target = eligiblePartyTargets.length > 0
          ? eligiblePartyTargets[Math.floor(Math.random() * eligiblePartyTargets.length)]
          : null;

        if (!target) {
          const noTargetLog = getConfusionNoTargetLog(enemy.name);
          log.push({
            phase,
            initiativeRoll: timing,
            actor: 'triggered',
            action: noTargetLog.action,
            note: noTargetLog.note,
          });
        } else {
          const success = Math.random() < (getConfusionChance(enemyConfusionLevel) / 32);
          let nullAntagonismBlocked = false;
          if (success) {
            const hasNullAntagonism = getAbilityLevel(target, 'null_antagonism') >= 1;
            if (!hasNullAntagonism) {
              characterStats = characterStats.map((stats) => (
                stats.characterId === target.characterId
                  ? { ...stats, hasAntagonism: true }
                  : stats
              ));
              ctx = {
                ...ctx,
                characterStats,
              };
            } else {
              nullAntagonismBlocked = true;
            }
          }

          const targetName = party.characters.find((char) => char.id === target.characterId)?.name ?? '味方';
          log.push({
            phase,
            initiativeRoll: timing,
            actor: 'triggered',
            action: nullAntagonismBlocked
              ? buildNullAntagonismAction(targetName)
              : buildConfusionAction(enemy.name, targetName, success),
            note: nullAntagonismBlocked
              ? getNullAntagonismNote()
              : getConfusionNote(enemyConfusionLevel, success),
          });
        }
      }

      const partyConfusionEntries = characterStats
        .map((stats) => ({
          stats,
          level: getAbilityLevel(stats, confusionAbilityId),
          ownerName: party.characters.find((char) => char.id === stats.characterId)?.name ?? '味方',
        }))
        .filter((entry) => getConfusionTiming(entry.level) === timing)
        .sort((a, b) => a.stats.row - b.stats.row);

      for (const entry of partyConfusionEntries) {
        if (!eligibleEnemyTarget) {
          const noTargetLog = getConfusionNoTargetLog(entry.ownerName);
          log.push({
            phase,
            initiativeRoll: timing,
            actor: 'triggered',
            characterId: entry.stats.characterId,
            action: noTargetLog.action,
            note: noTargetLog.note,
          });
          continue;
        }
        const success = Math.random() < (getConfusionChance(entry.level) / 32);
        let nullAntagonismBlocked = false;
        if (success) {
          const hasNullAntagonism = getEnemyAbilityLevel(enemy, 'null_antagonism') >= 1;
          if (!hasNullAntagonism) {
            enemyHasAntagonism = true;
          } else {
            nullAntagonismBlocked = true;
          }
        }

        log.push({
          phase,
          initiativeRoll: timing,
          actor: 'triggered',
          characterId: entry.stats.characterId,
          action: nullAntagonismBlocked
            ? buildNullAntagonismAction(enemy.name)
            : buildConfusionAction(entry.ownerName, enemy.name, success),
          note: nullAntagonismBlocked
            ? getNullAntagonismNote()
            : getConfusionNote(entry.level, success),
        });
      }
    };

    // SpecRef: 6.1.2 | Self destruct
    const triggerSelfDestructAtTiming = (timing: number): void => {
      if (phase !== 'close' || timing !== 2) return;
      if (enemyHp <= 0 || partyHp <= 0) return;

      const enemySelfDestructLevel = getEnemyAbilityLevel(enemy, 'self_destruct');
      if (enemySelfDestructLevel > 0) {
        const { row: targetRow, newCtx } = getTargetRow(ctx, 'close');
        ctx = newCtx;
        const target = resolveEnemyTarget(targetRow, characterStats, 'close', enemy.abilities)
          ?? characterStats[Math.floor(Math.random() * characterStats.length)]
          ?? null;

        const targetName = target
          ? party.characters.find((char) => char.id === target.characterId)?.name ?? '味方'
          : '味方';
        const targetDefenseAmplifier = target
          ? Math.max(0.01, target.physicalDefenseAmplifier * target.deityDefenseAmplifierBonus.physical)
          : 1.0;
        const damage = target
          ? calculateSelfDestructDamage(
            enemySelfDestructLevel,
            enemyHp,
            target.physicalDefense,
            targetDefenseAmplifier,
          )
          : 0;

        enemyDamageTakenInBattle += enemyHp;
        enemyHp = 0;

        if (damage > 0) {
          applyPartyDamage(damage);
        }
        log.push({
          phase,
          initiativeRoll: timing,
          actor: 'triggered',
          action: buildSelfDestructAction(enemy.name, targetName),
          damage: damage > 0 ? damage : undefined,
          damageTarget: 'party',
        });
        triggerEnemyDefeatRecovery(phase, timing);
        if (target) {
          triggerPartyDefeatRecovery(target, phase, timing);
        }
      }

      const partySelfDestructEntries = characterStats
        .map((stats) => ({
          stats,
          level: getAbilityLevel(stats, 'self_destruct'),
          ownerName: party.characters.find((char) => char.id === stats.characterId)?.name ?? '味方',
        }))
        .filter((entry) => entry.level > 0)
        .sort((a, b) => a.stats.row - b.stats.row);

      for (const entry of partySelfDestructEntries) {
        if (enemyHp <= 0 || partyHp <= 0) break;

        const damage = calculateSelfDestructDamage(
          entry.level,
          partyHp,
          enemy.physicalDefense,
          enemy.physicalDefenseAmplifier,
        );

        partyDamageTakenInBattle += partyHp;
        partyHp = 0;

        if (damage > 0) {
          applyEnemyDamage(damage);
        }
        log.push({
          phase,
          initiativeRoll: timing,
          actor: 'triggered',
          characterId: entry.stats.characterId,
          action: buildSelfDestructAction(entry.ownerName, enemy.name),
          damage: damage > 0 ? damage : undefined,
          damageTarget: 'enemy',
        });
        triggerPartyDefeatRecovery(entry.stats, phase, timing);
        triggerEnemyDefeatRecovery(phase, timing);
      }
    };

    // SpecRef: 6.1.2 | Unstable core
    const triggerUnstableCoreAtEnd = (): void => {
      if (phase !== 'long' && phase !== 'mid') return;
      if (enemyHp <= 0 || partyHp <= 0) return;

      const unstablePhase = phase;
      const enemyUnstableCoreLevel = getEnemyAbilityLevel(enemy, 'unstable_core');
      if (enemyUnstableCoreLevel > 0) {
        const damage = Math.min(
          enemyHp,
          Math.ceil((enemyHp * getUnstableCoreDamagePercent(enemyUnstableCoreLevel)) / 100),
        );
        applyEnemyDamage(damage);
        log.push({
          phase,
          initiativeRoll: 0,
          actor: 'triggered',
          action: buildUnstableCoreAction(unstablePhase, enemy.name),
          note: getUnstableCoreNote(enemyUnstableCoreLevel),
          noteTone: 'muted',
          damage,
        });
        triggerEnemyDefeatRecovery(phase, 0);
      }

      const partyUnstableCoreEntries = characterStats
        .map((stats) => ({
          stats,
          level: getAbilityLevel(stats, 'unstable_core'),
          ownerName: party.characters.find((char) => char.id === stats.characterId)?.name ?? '味方',
        }))
        .filter((entry) => entry.level > 0)
        .sort((a, b) => a.stats.row - b.stats.row);

      for (const entry of partyUnstableCoreEntries) {
        if (partyHp <= 0 || enemyHp <= 0) break;

        const damage = Math.min(
          partyHp,
          Math.ceil((partyHp * getUnstableCoreDamagePercent(entry.level)) / 100),
        );
        applyPartyDamage(damage);
        log.push({
          phase,
          initiativeRoll: 0,
          actor: 'triggered',
          characterId: entry.stats.characterId,
          action: buildUnstableCoreAction(unstablePhase, entry.ownerName),
          note: getUnstableCoreNote(entry.level),
          noteTone: 'muted',
          damage,
        });
        triggerPartyDefeatRecovery(entry.stats, phase, 0);
      }
    };

    // SpecRef: 6.1.2 | Soul reap
    const triggerSoulReapAtEnd = (): void => {
      if (phase !== 'mid') return;
      if (enemyHp <= 0 || partyHp <= 0) return;

      const enemySoulReapLevel = getEnemyAbilityLevel(enemy, 'soul_reap');
      const enemySoulReapThreshold = getSoulReapThresholdPercent(enemySoulReapLevel);
      if (enemySoulReapThreshold > 0 && partyHp < (partyStats.hp * enemySoulReapThreshold) / 100) {
        partyHp = 0;
        log.push({
          phase,
          initiativeRoll: 0,
          actor: 'triggered',
          action: buildSoulReapAction(enemy.name, getRandomPartyMemberName(party)),
          note: getSoulReapNote(enemySoulReapLevel),
        });
      }

      const partySoulReapEntries = characterStats
        .map((stats) => ({
          stats,
          level: getAbilityLevel(stats, 'soul_reap'),
          ownerName: party.characters.find((char) => char.id === stats.characterId)?.name ?? '味方',
        }))
        .filter((entry) => entry.level > 0)
        .sort((a, b) => a.stats.row - b.stats.row);

      for (const entry of partySoulReapEntries) {
        if (enemyHp <= 0 || partyHp <= 0) break;

        const threshold = getSoulReapThresholdPercent(entry.level);
        if (enemyHp >= (enemy.hp * threshold) / 100) continue;

        enemyHp = 0;
        log.push({
          phase,
          initiativeRoll: 0,
          actor: 'triggered',
          characterId: entry.stats.characterId,
          action: buildSoulReapAction(entry.ownerName, enemy.name),
          note: getSoulReapNote(entry.level),
        });
      }
    };

    const turnOrder: Array<{ kind: 'enemy'; roll: number } | { kind: 'character'; roll: number; stats: ComputedCharacterStats }> = [
      ...(enemyInitiativeRoll !== null ? [{ kind: 'enemy' as const, roll: enemyInitiativeRoll }] : []),
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

    for (const timing of TRIGGER_TIMINGS_DESC) {
      if (enemyHp <= 0 || partyHp <= 0) break;

      if (phase === 'long' && timing === 2) {
        triggerLongPhaseHowl();
      }
      if (timing === 9) {
        triggerRegenerationAtTiming(9);
        triggerPredatorSenseAtTiming(9);
        triggerFlyingAtTiming(9);
      }
      if (timing === 3) {
        if (triggerFreeAtTiming(phase, 3)) {
          return buildBattleResult(forcedOutcomePhase, forcedOutcome!);
        }
      }
      if (timing === 2) {
        if (triggerFreeAtTiming(phase, 2)) {
          return buildBattleResult(forcedOutcomePhase, forcedOutcome!);
        }
        triggerDecomposeAtTiming(2);
        triggerConfusionAtTiming(2);
        triggerSelfDestructAtTiming(2);
      }
      if (timing === 1) {
        if (triggerFreeAtTiming(phase, 1)) {
          return buildBattleResult(forcedOutcomePhase, forcedOutcome!);
        }
        triggerConfusionAtTiming(1);
      }
      if (timing === 0) {
        triggerUnstableCoreAtEnd();
        triggerSoulReapAtEnd();
      }

      if (forcedOutcome) {
        return buildBattleResult(forcedOutcomePhase, forcedOutcome);
      }

      if (enemyHp <= 0 || partyHp <= 0) break;

      for (const turn of turnOrder.filter((candidate) => candidate.roll === timing)) {
        if (enemyHp <= 0 || partyHp <= 0) break;

        if (turn.kind === 'enemy') {
          enemyHasMovedInPhase = true;

        if (enemyIncapacitated) {
          enemyIncapacitated = false;
          log.push({
            phase,
            initiativeRoll: turn.roll,
            actor: 'triggered',
            action: buildIncapacitatedAction(enemy.name),
          });
          continue;
        }

        const baseNoA = getEnemyNoA(phase, enemy);
        const enemyPhaseAccuracyBonus = phase === 'close' ? enemyTemporaryAccuracyBonus : 0;
        // SpecRef: 6.1.3.1 | Actor action | a.howl
        // Acting always consumes opponent active howl; if present, apply to this action's f.NoA.
        const howlEffect = consumePendingPartyHowlEffect();
        const noA = Math.ceil(
          baseNoA
          * (howlEffect?.multiplier ?? 1.0)
          * getTerrainNoAAmplifier(phase, environment.terrainEffect, enemy.abilities)
        );
        if (noA <= 0) continue;
        if (enemyHasNoOffense(enemy)) continue;
        if (enemyHasAntagonism) continue;

        const magicalCounterCandidates = new Map<number, ComputedCharacterStats>();

        const runEnemyAttack = (attempts: number, isReAttack = false): void => {
          if (attempts <= 0 || partyHp <= 0 || enemyHp <= 0) return;
          const enemyEchoDomainUsageCount = registerElementalOffenseUsage(enemy.elementalOffense, enemy.abilities);
          const enemyEchoDomainLogText = getEchoDomainLogText(enemy.elementalOffense, enemy.abilities);

          const attacksByTarget = new Map<number, {
            hitDamages: number[];
            totalAttempts: number;
            charStats: ComputedCharacterStats;
            ambushMultiplier: number;
            overwatchMultiplier: number;
            executionMultiplier: number;
          }>();
          const enemyAccuracyPotency = 1.0;
          const enemyAccuracyBonus = enemy.accuracyBonus + enemyPhaseAccuracyBonus;
          const enemyResonanceLevel = getEnemyAbilityLevel(enemy, 'resonance');
          let enemyHitIndex = 1;
          let enemySuccessfulHits = 0;

          for (let i = 0; i < attempts; i++) {
            const { row: targetRow, newCtx } = getTargetRow(ctx, phase);
            ctx = newCtx;
            const targetCharStats = resolveEnemyTarget(targetRow, characterStats, phase, enemy.abilities);
            if (!targetCharStats) {
              enemyHitIndex += 1;
              continue;
            }

            const existing = attacksByTarget.get(targetCharStats.characterId);
            const didHit = hitDetection(
              enemyAccuracyPotency,
              enemyAccuracyBonus,
              targetCharStats.evasionBonus + (phase === 'close' ? (temporaryEvasionBonusByCharacterId.get(targetCharStats.characterId) ?? 0) : 0),
              enemyHitIndex,
              phase,
              getDeflectionLevel(targetCharStats),
              getEnemyFocusLevel(enemy),
              environment.terrainEffect,
              0,
              hasAbility(enemy.abilities, 'true_sight'),
              hasAbility(enemy.abilities, 'domain_breaker'),
            );
            enemyHitIndex += 1;

            const targetAttack = existing ?? {
              hitDamages: [],
              totalAttempts: 0,
              charStats: targetCharStats,
              ambushMultiplier: 1.0,
              overwatchMultiplier: 1.0,
              executionMultiplier: 1.0,
            };
            targetAttack.totalAttempts += 1;

            const ambushAmplifier = getAmbushAmplifier(
              enemy.abilities,
              targetCharStats.abilities,
              // When the enemy attacks, the "opponent" for a.ambush is the targeted party member.
              characterActedInBattleIds.has(targetCharStats.characterId),
              !isReAttack,
            );
            const overwatchAmplifier = getOverwatchAmplifier(
              enemy.abilities,
              targetCharStats.abilities,
              characterActedInBattleIds.size > 0,
              false,
              !isReAttack,
            );
            const executionAmplifier = getExecutionAmplifier(
              enemy.abilities,
              targetCharStats.abilities,
              partyHp,
              partyStats.hp,
            );

            if (didHit) {
              enemySuccessfulHits += 1;
              const resonanceAmplifier = phase === 'mid'
                ? getResonanceAmplifier(enemyResonanceLevel, enemySuccessfulHits)
                : 1.0;
              const singleDamage = calculateSingleEnemyAttackDamage(
                phase,
                enemy,
                characterStats,
                targetCharStats,
                enemyHp,
                partyHp,
                partyStats.hp,
                environment.terrainEffect,
                enemyOffenseAmplifierMultiplier * ambushAmplifier * overwatchAmplifier * executionAmplifier,
                enemyEchoDomainUsageCount,
              );
              targetAttack.hitDamages.push(Math.max(1, Math.floor(singleDamage * resonanceAmplifier)));
            }

            targetAttack.ambushMultiplier = Math.max(targetAttack.ambushMultiplier, ambushAmplifier);
            targetAttack.overwatchMultiplier = Math.max(targetAttack.overwatchMultiplier, overwatchAmplifier);
            targetAttack.executionMultiplier = Math.max(targetAttack.executionMultiplier, executionAmplifier);

            if (!existing) {
              attacksByTarget.set(targetCharStats.characterId, targetAttack);
            }
          }

          const magicProfile = resolveMagicProfile({
            style: hasEnemyArcMagic(enemy) ? 'arc-magic' : 'multi-hit',
            elementalOffense: enemy.elementalOffense,
            elementalOffenseValue: enemy.elementalOffenseValue,
            magicalNoA: attempts,
          });
          const resonanceActor = enemyResonanceLevel > 0
            ? { abilities: [{ id: 'resonance' as const, level: enemyResonanceLevel }] }
            : { abilities: [] };
          const enemyResonanceLogText = getResonanceLogText(resonanceActor.abilities, enemySuccessfulHits, phase === 'mid');
          const enemyAttackBonusLogText = mergeAttackBonusLogText(enemyResonanceLogText, enemyEchoDomainLogText);
          let totalDamageDealt = 0;

          if (isMagicSealTargetForEnemy(phase, enemy, attempts) && consumeMagicSeal()) {
            log.push({
              phase,
              initiativeRoll: turn.roll,
              actor: 'enemy',
              action: `${enemy.name} が${magicProfile.spellName}${isReAttack ? '連撃' : ''}を唱えたがかき消された！`,
              damage: 0,
              showZeroDamage: true,
              hits: 0,
              totalAttempts: attempts,
              wasNegated: true,
              isReAttack: isReAttack || undefined,
              elementalOffense: enemy.elementalOffense,
            });
            applyTerrainSelfInflictedDamage(
              { kind: 'enemy', name: enemy.name },
              phase,
              0,
              enemy.elementalOffense,
            );
            return;
          }

          if (phase === 'mid') {
            log.push({
              phase,
              initiativeRoll: turn.roll,
              actor: 'enemy',
              action: `${magicProfile.spellName}${isReAttack ? '連撃' : ''}を唱えた！${enemyAttackBonusLogText}`,
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
            let reflectedDamage = 0;
            let reflectedSourceDamage = 0;
            let absorbedDamage = 0;
            let avoidedByStealth = false;
            const partyIllusionIsActive = isPartyIllusionActive(phase, characterStats, consumedPartyIllusion);
            const personalIllusionIsActive = isIllusionActive(
              phase,
              hasIllusion(attack.charStats),
              `character:${charId}`,
              consumedIllusionStateIds,
            );
            const enemyHasIllusionBreaker = hasAbility(enemy.abilities, 'illusion_breaker');
            const avoidedByPartyIllusion = partyIllusionIsActive && !enemyHasIllusionBreaker;
            const avoidedByPersonalIllusion = personalIllusionIsActive && !enemyHasIllusionBreaker;
            const avoidedByIllusion = avoidedByPartyIllusion || avoidedByPersonalIllusion;

            const defensiveReaction = getDefensiveReaction(phase, enemy.elementalOffense, attack.charStats.abilities, enemy.abilities);
            const reflect = defensiveReaction?.type === 'reflect' ? defensiveReaction.descriptor : null;
            const absorb = defensiveReaction?.type === 'absorb' ? defensiveReaction.descriptor : null;
            const nullify = defensiveReaction?.type === 'nullify' ? defensiveReaction.descriptor : null;
            // SpecRef: 6.1.2 | Function of battle | Shock resolve
            const shouldTriggerShock = !isReAttack && phase === 'close' && isCharacterShockAvailable(attack.charStats);
            const actorIsNullShock = enemyHasNullShock(enemy);
            const hitDamagesToApply = shouldTriggerShock && !actorIsNullShock && attack.hitDamages.length > 1
              ? attack.hitDamages.slice(0, 1)
              : attack.hitDamages;
            if (enemyHasIllusionBreaker && (partyIllusionIsActive || personalIllusionIsActive)) {
              if (partyIllusionIsActive) {
                consumedPartyIllusion = true;
              }
              if (personalIllusionIsActive) {
                consumedIllusionStateIds.add(`character:${charId}`);
              }
              log.push({
                phase,
                actor: 'effect',
                action: buildIllusionBreakerAction(enemy.name),
              });
            } else if (avoidedByIllusion) {
              if (avoidedByPartyIllusion) {
                consumedPartyIllusion = true;
              } else {
                consumedIllusionStateIds.add(`character:${charId}`);
              }
            } else {
              for (const hitDamage of hitDamagesToApply) {
                if (isStealthActive(attack.charStats, partyHp, partyStats.hp, enemy.abilities)) {
                  avoidedByStealth = true;
                  continue;
                }

                appliedHits += 1;
                if (reflect) {
                  const reflectedHitDamage = Math.max(1, Math.floor(hitDamage * reflect.amplifier));
                  const remainingHitDamage = Math.max(0, hitDamage - reflectedHitDamage);
                  reflectedSourceDamage += hitDamage;
                  reflectedDamage += reflectedHitDamage;
                  appliedDamage += remainingHitDamage;
                  applyPartyDamage(remainingHitDamage);
                  continue;
                }

                if (absorb) {
                  const absorbedHitDamage = Math.max(1, Math.floor(hitDamage * absorb.amplifier));
                  absorbedDamage += absorbedHitDamage;
                  partyHp = Math.min(partyStats.hp, partyHp + absorbedHitDamage);
                  continue;
                }

                if (nullify) {
                  continue;
                }

                appliedDamage += hitDamage;
                applyPartyDamage(hitDamage);
              }
            }

            if (reflectedDamage > 0) {
              applyEnemyDamage(reflectedDamage);
              triggerEnemyDefeatRecovery(phase, turn.roll);
            }

            const shockEffectLog = shouldTriggerShock
              ? (() => {
                  consumeCharacterShock(charId);
                  return {
                    phase,
                    initiativeRoll: turn.roll,
                    actor: 'triggered' as const,
                    characterId: charId,
                    action: actorIsNullShock
                      ? buildNullShockAction(enemy.name, targetName)
                      : buildShockAction(enemy.name, targetName),
                    note: actorIsNullShock ? '(感電予防:攻撃継続)' : '(感電:攻撃中断)',
                    noteTone: 'muted' as const,
                    hideInitiativeLabel: true,
                  };
                })()
              : null;

            const reflectedAttemptText = enemyAttackBonusLogText
              ? `${appliedHits}/${attack.totalAttempts}回, ${enemyAttackBonusLogText.slice(1, -1)}`
              : `${appliedHits}/${attack.totalAttempts}回`;

            triggerPartyDefeatRecovery(attack.charStats, phase, turn.roll, true);
            // SpecRef: 6.1.3.1 | Actor action | actor.a.requiem
            if (
              appliedHits > 0
              && enemyHasRequiem(enemy)
              && consumedReanimateCharacterIds.has(charId)
              && partyHp > 0
            ) {
              log.push({
                phase,
                initiativeRoll: turn.roll,
                actor: 'enemy',
                action: hasNullRequiem(attack.charStats)
                  ? `${buildNullRequiemAction(enemy.name, targetName)} (鎮魂無効)`
                  : `${buildRequiemAction(enemy.name, targetName)} (鎮魂歌)`,
              });
              if (!hasNullRequiem(attack.charStats)) {
                partyHp = 0;
              }
            }

            const enemyAttackRageBonusPercent = toRageBonusPercent(getEnemyRageAmplifier(enemy, enemyHp));
            const enemyAttackMomentumBonusPercent = toMomentumBonusPercent(getEnemyMomentumAmplifier(enemy, enemyHp, attack.charStats.abilities));
            const enemyAttackSwarmBonuses = getSwarmLogBonuses(enemy.abilities, enemyHp, enemy.hp, attack.charStats.abilities, partyHp, partyStats.hp);
            const enemyAttackAmbushMultiplier = attack.ambushMultiplier;
            const enemyAttackOverwatchMultiplier = attack.overwatchMultiplier;
            const enemyAttackExecutionMultiplier = attack.executionMultiplier;
            if (reflectedDamage > 0 && reflect) {
              log.push({
                phase,
                initiativeRoll: turn.roll,
                actor: 'enemy',
                action: phase === 'mid'
                  ? `${enemy.name} が${attackName}を唱えたが反射された！ (${reflectedAttemptText})`
                  : `${targetName}に攻撃したが、${reflect.summary}攻撃は反射された！ (${reflectedAttemptText})`,
                damage: appliedDamage,
                reflectedDamage,
                reflectedSourceDamage,
                reflectTarget: 'enemy',
                hits: appliedHits,
                totalAttempts: attack.totalAttempts,
                wasNegated: appliedHits === 0 && (avoidedByIllusion || avoidedByStealth) ? true : undefined,
                rageBonusPercent: phase === 'mid' ? undefined : (enemyAttackRageBonusPercent > 0 ? enemyAttackRageBonusPercent : undefined),
                momentumBonusPercent: phase === 'mid' ? undefined : (enemyAttackMomentumBonusPercent > 0 ? enemyAttackMomentumBonusPercent : undefined),
                ambushMultiplier: enemyAttackAmbushMultiplier > 1.0 ? enemyAttackAmbushMultiplier : undefined,
                overwatchMultiplier: enemyAttackOverwatchMultiplier > 1.0 ? enemyAttackOverwatchMultiplier : undefined,
                executionMultiplier: enemyAttackExecutionMultiplier > 1.0 ? enemyAttackExecutionMultiplier : undefined,
                ...enemyAttackSwarmBonuses,
                isReAttack: isReAttack || undefined,
                isEnemyTargetHit: phase === 'mid' ? true : undefined,
                elementalOffense: enemy.elementalOffense,
              });
            } else if (absorbedDamage > 0 && absorb) {
              log.push({
                phase,
                initiativeRoll: turn.roll,
                actor: 'enemy',
                action: phase === 'mid'
                  ? `${enemy.name} が${attackName}を唱えたが吸収された！ (${reflectedAttemptText})`
                  : `${enemy.name} の${absorb.summary}攻撃は吸収された！ (${reflectedAttemptText})`,
                damage: 0,
                showZeroDamage: true,
                absorbedDamage,
                absorbTarget: 'party',
                hits: appliedHits,
                totalAttempts: attack.totalAttempts,
                wasNegated: appliedHits === 0 && (avoidedByIllusion || avoidedByStealth) ? true : undefined,
                rageBonusPercent: phase === 'mid' ? undefined : (enemyAttackRageBonusPercent > 0 ? enemyAttackRageBonusPercent : undefined),
                momentumBonusPercent: phase === 'mid' ? undefined : (enemyAttackMomentumBonusPercent > 0 ? enemyAttackMomentumBonusPercent : undefined),
                ambushMultiplier: enemyAttackAmbushMultiplier > 1.0 ? enemyAttackAmbushMultiplier : undefined,
                overwatchMultiplier: enemyAttackOverwatchMultiplier > 1.0 ? enemyAttackOverwatchMultiplier : undefined,
                executionMultiplier: enemyAttackExecutionMultiplier > 1.0 ? enemyAttackExecutionMultiplier : undefined,
                ...enemyAttackSwarmBonuses,
                isReAttack: isReAttack || undefined,
                isEnemyTargetHit: phase === 'mid' ? true : undefined,
                elementalOffense: enemy.elementalOffense,
              });
            } else if (nullify) {
              log.push({
                phase,
                initiativeRoll: turn.roll,
                actor: 'enemy',
                action: phase === 'mid'
                  ? `${enemy.name} が${attackName}を唱えたが無効化された！ (${reflectedAttemptText})`
                  : `${enemy.name} の${nullify.summary}攻撃は無効化された！ (${reflectedAttemptText})`,
                damage: 0,
                showZeroDamage: true,
                hits: appliedHits,
                totalAttempts: attack.totalAttempts,
                wasNegated: appliedHits === 0 && (avoidedByIllusion || avoidedByStealth) ? true : undefined,
                rageBonusPercent: phase === 'mid' ? undefined : (enemyAttackRageBonusPercent > 0 ? enemyAttackRageBonusPercent : undefined),
                momentumBonusPercent: phase === 'mid' ? undefined : (enemyAttackMomentumBonusPercent > 0 ? enemyAttackMomentumBonusPercent : undefined),
                ambushMultiplier: enemyAttackAmbushMultiplier > 1.0 ? enemyAttackAmbushMultiplier : undefined,
                overwatchMultiplier: enemyAttackOverwatchMultiplier > 1.0 ? enemyAttackOverwatchMultiplier : undefined,
                executionMultiplier: enemyAttackExecutionMultiplier > 1.0 ? enemyAttackExecutionMultiplier : undefined,
                ...enemyAttackSwarmBonuses,
                isReAttack: isReAttack || undefined,
                isEnemyTargetHit: phase === 'mid' ? true : undefined,
                elementalOffense: enemy.elementalOffense,
              });
            } else {
              log.push({
                phase,
                initiativeRoll: turn.roll,
                actor: 'enemy',
                action: phase === 'mid'
                  ? `${targetName} に命中！`
                  : `${targetName} に${attackName}！${enemyAttackBonusLogText}`,
                damage: appliedDamage > 0 ? appliedDamage : undefined,
                hits: appliedHits,
                totalAttempts: attack.totalAttempts,
                wasNegated: appliedHits === 0 && (avoidedByIllusion || avoidedByStealth) ? true : undefined,
                rageBonusPercent: phase === 'mid' ? undefined : (enemyAttackRageBonusPercent > 0 ? enemyAttackRageBonusPercent : undefined),
                momentumBonusPercent: phase === 'mid' ? undefined : (enemyAttackMomentumBonusPercent > 0 ? enemyAttackMomentumBonusPercent : undefined),
                ambushMultiplier: enemyAttackAmbushMultiplier > 1.0 ? enemyAttackAmbushMultiplier : undefined,
                overwatchMultiplier: enemyAttackOverwatchMultiplier > 1.0 ? enemyAttackOverwatchMultiplier : undefined,
                executionMultiplier: enemyAttackExecutionMultiplier > 1.0 ? enemyAttackExecutionMultiplier : undefined,
                ...enemyAttackSwarmBonuses,
                isReAttack: isReAttack || undefined,
                isEnemyTargetHit: phase === 'mid' ? true : undefined,
                elementalOffense: enemy.elementalOffense,
              });
            }

            totalDamageDealt += Math.max(0, appliedDamage);

            if (shockEffectLog) {
              log.push(shockEffectLog);
            }

            if (avoidedByIllusion) {
              log.push({
                phase,
                actor: 'effect',
                action: buildIllusionAction(targetName),
              });
            }

            if (avoidedByStealth) {
              log.push({
                phase,
                actor: 'effect',
                action: `${targetName} は物陰に隠れて攻撃をやり過ごせたのだ！`,
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

            if (phase === 'close') {
              applyEnemyCloseReactiveAbilities(
                attack.charStats,
                targetName,
                appliedHits,
                appliedDamage,
                turn.roll,
              );
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
              enemyHp,
              characterStats,
              partyStats,
              partyHp,
              partyDeityKey,
              environment.terrainEffect,
              getCounterNoAMultiplier(attack.charStats),
              phase === 'close' ? (temporaryAccuracyBonusByCharacterId.get(charId) ?? 0) : 0,
              phase === 'close' ? enemyTemporaryEvasionBonus : 0,
              resolveCharacterOffenseAmplifierMultiplier(charId),
              registerElementalOffenseUsage(attack.charStats.elementalOffense, attack.charStats.abilities),
            );
            if (counterResult.totalAttempts <= 0) continue;

            addEnemyHitsReceived(counterResult.hits);
            const counterDealtDamage = counterResult.damage > 0;
            if (counterDealtDamage) {
              applyEnemyDamage(counterResult.damage);
            }

            const counterType = phase === 'mid' ? '魔法反撃' : '反撃';
            const resonanceLogText = getResonanceLogText(
              attack.charStats.abilities,
              counterResult.hits,
              phase === 'mid'
                || (phase === 'long' && partyDeityKey === 'God of Resonance' && environment.terrainEffect !== 'terrain.gehenna'),
            );
            const echoDomainLogText = getEchoDomainLogText(attack.charStats.elementalOffense, attack.charStats.abilities);
            const counterBonusLogText = mergeAttackBonusLogText(resonanceLogText, echoDomainLogText);
            const characterCounterRageBonusPercent = toRageBonusPercent(getCharacterRageAmplifier(attack.charStats, partyHp, partyStats.hp, enemy.abilities));
            const characterCounterMomentumBonusPercent = toMomentumBonusPercent(getCharacterMomentumAmplifier(attack.charStats, partyHp, partyStats.hp, enemy.abilities));
            const characterCounterSwarmBonuses = getSwarmLogBonuses(attack.charStats.abilities, partyHp, partyStats.hp, enemy.abilities, enemyHp, enemy.hp);
            log.push({
              phase,
              initiativeRoll: initiativeByCharacter.get(charId),
              actor: 'character',
              characterId: charId,
              action: `${targetChar?.name ?? '???'} の${counterType}！${counterBonusLogText}`,
              damage: counterResult.damage,
              hits: counterResult.hits,
              totalAttempts: counterResult.totalAttempts,
              rageBonusPercent: characterCounterRageBonusPercent > 0 ? characterCounterRageBonusPercent : undefined,
              momentumBonusPercent: attack.charStats.abilities.some(a => a.id === 'momentum')
                ? characterCounterMomentumBonusPercent
                : undefined,
              ...characterCounterSwarmBonuses,
              isCounter: true,
              elementalOffense: attack.charStats.elementalOffense,
            });

            if (counterDealtDamage) {
              triggerEnemyDefeatRecovery(phase, turn.roll);
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

            const reCounterAttempts = Math.ceil(
              getEnemyNoA(phase, enemy)
              * enemyReCounterNoAMultiplier
              * getTerrainNoAAmplifier(phase, environment.terrainEffect, enemy.abilities)
            );
            if (reCounterAttempts <= 0) {
              continue;
            }

            let reCounterDamage = 0;
            let reCounterHits = 0;
            const enemyReCounterEchoDomainUsageCount = registerElementalOffenseUsage(enemy.elementalOffense, enemy.abilities);
            for (let i = 1; i <= reCounterAttempts; i++) {
              const didHit = hitDetection(1.0, enemy.accuracyBonus + enemyPhaseAccuracyBonus, attack.charStats.evasionBonus + (phase === 'close' ? (temporaryEvasionBonusByCharacterId.get(charId) ?? 0) : 0), i, phase, getDeflectionLevel(attack.charStats), getEnemyFocusLevel(enemy), environment.terrainEffect, 0, hasAbility(enemy.abilities, 'true_sight'), hasAbility(enemy.abilities, 'domain_breaker'));
              if (!didHit) continue;
              reCounterHits += 1;
              reCounterDamage += calculateSingleEnemyAttackDamage(phase, enemy, characterStats, attack.charStats, enemyHp, partyHp, partyStats.hp, environment.terrainEffect, enemyOffenseAmplifierMultiplier, enemyReCounterEchoDomainUsageCount);
            }

            const partyIllusionIsActiveOnReCounter = isPartyIllusionActive(phase, characterStats, consumedPartyIllusion);
            const personalIllusionIsActiveOnReCounter = isIllusionActive(
              phase,
              hasIllusion(attack.charStats),
              `character:${charId}`,
              consumedIllusionStateIds,
            );
            const enemyHasIllusionBreakerOnReCounter = hasAbility(enemy.abilities, 'illusion_breaker');
            const avoidedByPartyIllusionOnReCounter = partyIllusionIsActiveOnReCounter && !enemyHasIllusionBreakerOnReCounter;
            const avoidedByPersonalIllusionOnReCounter = personalIllusionIsActiveOnReCounter && !enemyHasIllusionBreakerOnReCounter;
            const avoidedReCounterByIllusion = avoidedByPartyIllusionOnReCounter || avoidedByPersonalIllusionOnReCounter;
            const avoidedReCounterByStealth = !avoidedReCounterByIllusion && isStealthActive(attack.charStats, partyHp, partyStats.hp, enemy.abilities);
            if (enemyHasIllusionBreakerOnReCounter && (partyIllusionIsActiveOnReCounter || personalIllusionIsActiveOnReCounter)) {
              if (partyIllusionIsActiveOnReCounter) {
                consumedPartyIllusion = true;
              }
              if (personalIllusionIsActiveOnReCounter) {
                consumedIllusionStateIds.add(`character:${charId}`);
              }
              log.push({
                phase,
                actor: 'effect',
                action: buildIllusionBreakerAction(enemy.name),
              });
            } else if (avoidedReCounterByIllusion) {
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
              applyPartyDamage(reCounterDamage);
            }

            triggerPartyDefeatRecovery(
              attack.charStats,
              phase,
              turn.roll,
              true,
            );

            const enemyReCounterRageBonusPercent = toRageBonusPercent(getEnemyRageAmplifier(enemy, enemyHp, attack.charStats.abilities));
            const enemyReCounterMomentumBonusPercent = toMomentumBonusPercent(getEnemyMomentumAmplifier(enemy, enemyHp, attack.charStats.abilities));
            const enemyReCounterSwarmBonuses = getSwarmLogBonuses(enemy.abilities, enemyHp, enemy.hp, attack.charStats.abilities, partyHp, partyStats.hp);
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
              momentumBonusPercent: enemyReCounterMomentumBonusPercent > 0 ? enemyReCounterMomentumBonusPercent : undefined,
              ...enemyReCounterSwarmBonuses,
              isCounter: true,
              elementalOffense: enemy.elementalOffense,
            });

            if (avoidedReCounterByIllusion) {
              log.push({
                phase,
                actor: 'effect',
                action: buildIllusionAction(targetChar?.name ?? '???'),
              });
            }

            if (avoidedReCounterByStealth) {
              log.push({
                phase,
                actor: 'effect',
                action: `${targetChar?.name ?? '???'} は物陰に隠れて攻撃をやり過ごせたのだ！`,
              });
            }

            if (partyHp <= 0) break;
          }

          applyTerrainSelfInflictedDamage(
            { kind: 'enemy', name: enemy.name },
            phase,
            totalDamageDealt,
            enemy.elementalOffense,
          );
          if (enemy.elementalOffense === 'thunder') {
            const firstTargetCharacterId = Array.from(attacksByTarget.keys())[0];
            applyTerrainChainLightningDamage(
              { kind: 'enemy', name: enemy.name },
              phase,
              totalDamageDealt,
              firstTargetCharacterId,
            );
          }
        };

        enemyHasActedInBattle = true;
        if (firstActorInBattle === null) {
          firstActorInBattle = 'enemy';
        }
        runEnemyAttack(noA, false);
        if (enemyHasReAttack(enemy) && enemyHp > 0 && partyHp > 0) {
          runEnemyAttack(Math.ceil(
            baseNoA
            * getEnemyReAttackNoAMultiplier(enemy)
            * getTerrainNoAAmplifier(phase, environment.terrainEffect, enemy.abilities)
          ), true);
        }

        if (phase === 'mid' && enemyHp > 0 && partyHp > 0 && getEnemyAbilityLevel(enemy, 'null_counter') <= 0) {
          for (const [charId, magicalCounterStats] of magicalCounterCandidates) {
            if (enemyHp <= 0 || partyHp <= 0) break;

            const magicalCounterChar = party.characters.find(c => c.id === charId);
            if (!magicalCounterChar) continue;

            const magicalCounterNoAMultiplier = getMagicalCounterNoAMultiplier(magicalCounterStats);
            if (magicalCounterNoAMultiplier <= 0) continue;

            const magicalCounterEchoDomainUsageCount = registerElementalOffenseUsage(magicalCounterStats.elementalOffense, magicalCounterStats.abilities);
            const magicalCounterResult = calculateCharacterDamage('mid', magicalCounterStats, magicalCounterChar, enemy, enemyHp, characterStats, partyStats, partyHp, partyDeityKey, environment.terrainEffect, magicalCounterNoAMultiplier, 0, 0, resolveCharacterOffenseAmplifierMultiplier(charId), magicalCounterEchoDomainUsageCount);
            if (magicalCounterResult.totalAttempts <= 0) continue;

            addEnemyHitsReceived(magicalCounterResult.hits);
            const magicalCounterDealtDamage = magicalCounterResult.damage > 0;
            if (magicalCounterDealtDamage) {
              applyEnemyDamage(magicalCounterResult.damage);
            }

            const resonanceLogText = getResonanceLogText(magicalCounterStats.abilities, magicalCounterResult.hits, true);
            const echoDomainLogText = getEchoDomainLogText(magicalCounterStats.elementalOffense, magicalCounterStats.abilities);
            const magicalCounterBonusLogText = mergeAttackBonusLogText(resonanceLogText, echoDomainLogText);
            const magicalCounterRageBonusPercent = toRageBonusPercent(getCharacterRageAmplifier(magicalCounterStats, partyHp, partyStats.hp, enemy.abilities));
            const magicalCounterMomentumBonusPercent = toMomentumBonusPercent(getCharacterMomentumAmplifier(magicalCounterStats, partyHp, partyStats.hp, enemy.abilities));
            const magicalCounterSwarmBonuses = getSwarmLogBonuses(magicalCounterStats.abilities, partyHp, partyStats.hp, enemy.abilities, enemyHp, enemy.hp);
            log.push({
              phase,
              initiativeRoll: initiativeByCharacter.get(charId),
              actor: 'character',
              characterId: charId,
              action: `${magicalCounterChar.name} の魔法反撃！${magicalCounterBonusLogText}`,
              damage: magicalCounterResult.damage,
              hits: magicalCounterResult.hits,
              totalAttempts: magicalCounterResult.totalAttempts,
              rageBonusPercent: magicalCounterRageBonusPercent > 0 ? magicalCounterRageBonusPercent : undefined,
              momentumBonusPercent: magicalCounterStats.abilities.some(a => a.id === 'momentum')
                ? magicalCounterMomentumBonusPercent
                : undefined,
              ...magicalCounterSwarmBonuses,
              isCounter: true,
              elementalOffense: magicalCounterStats.elementalOffense,
            });

            if (magicalCounterDealtDamage) {
              triggerEnemyDefeatRecovery(phase, turn.roll);
            }
          }
        }

          continue;
        }

        const cs = characterStats.find((stats) => stats.characterId === turn.stats.characterId) ?? turn.stats;
        const char = party.characters.find(c => c.id === cs.characterId);
        if (!char) continue;

      if (incapacitatedCharacterIds.has(cs.characterId)) {
        incapacitatedCharacterIds.delete(cs.characterId);
        log.push({
          phase,
          initiativeRoll: turn.roll,
          actor: 'triggered',
          characterId: cs.characterId,
          action: buildIncapacitatedAction(char.name),
        });
        continue;
      }

      // SpecRef: 6.1.3.1 | Actor action | a.howl
      // Acting always consumes opponent active howl; if present, apply to this action's f.NoA.
      const howlEffect = consumePendingEnemyHowlEffect();
      if (hasNoOffense(cs)) continue;

      const characterPhaseAccuracyBonus = phase === 'close' ? (temporaryAccuracyBonusByCharacterId.get(cs.characterId) ?? 0) : 0;
      const alliedPartyMembersActedInBattle = Array.from(characterActedInBattleIds).some((actedId) => actedId !== cs.characterId);

      const runCharacterAttack = (noAMultiplier: number, isReAttack = false): CharacterAttackResult | null => {
        const isAntagonism = cs.hasAntagonism;
        const magicProfile = resolveMagicProfile({
          style: getAbilityLevel(cs, 'arc_magic') > 0 ? 'arc-magic' : 'multi-hit',
          elementalOffense: cs.elementalOffense,
          elementalOffenseValue: cs.elementalOffenseValue,
          magicalNoA: Math.max(1, Math.ceil(cs.magicalNoA * noAMultiplier)),
        });
        const attackType = isReAttack
          ? (phase === 'mid' ? `${magicProfile.spellName}連撃` : '連撃')
          : (phase === 'mid' ? `${magicProfile.spellName}` : '攻撃');

        if (isMagicSealTargetForCharacter(phase, cs, noAMultiplier) && consumeMagicSeal()) {
          const characterMagicSealSwarmBonuses = getSwarmLogBonuses(cs.abilities, partyHp, partyStats.hp, enemy.abilities, enemyHp, enemy.hp);
          log.push({
            phase,
            initiativeRoll: turn.roll,
            actor: 'character',
            characterId: cs.characterId,
            action: `${char.name} が${attackType}を唱えたがかき消された！`,
            damage: 0,
            showZeroDamage: true,
            hits: 0,
            totalAttempts: Math.max(1, Math.ceil(cs.magicalNoA * noAMultiplier)),
            rageBonusPercent: toRageBonusPercent(getCharacterRageAmplifier(cs, partyHp, partyStats.hp, enemy.abilities)) || undefined,
            momentumBonusPercent: cs.abilities.some(a => a.id === 'momentum')
              ? toMomentumBonusPercent(getCharacterMomentumAmplifier(cs, partyHp, partyStats.hp, enemy.abilities))
              : undefined,
            ...characterMagicSealSwarmBonuses,
            isReAttack: isReAttack || undefined,
            wasNegated: true,
            elementalOffense: cs.elementalOffense,
          });

          applyTerrainSelfInflictedDamage(
            { kind: 'character', stats: cs, name: char.name },
            phase,
            0,
            cs.elementalOffense,
          );

          return {
            damage: 0,
            totalAttempts: Math.max(1, Math.ceil(cs.magicalNoA * noAMultiplier)),
            hits: 0,
            wasNegatedByMagicSeal: true,
          };
        }

        let result: CharacterAttackResult;
        let antagonismTarget: ComputedCharacterStats | null = null;
        let antagonismTargetName: string | null = null;
        let shockEffectLog: BattleLogEntry | null = null;
        let ambushMultiplier = 1.0;
        let overwatchMultiplier = 1.0;
        let executionMultiplier = 1.0;

        if (isAntagonism) {
          const candidates = characterStats.filter(target => target.characterId !== cs.characterId);
          if (candidates.length === 0) return null;
          const { row: targetRow, newCtx } = getTargetRow(ctx, phase);
          ctx = newCtx;
          const selected = resolveEnemyTarget(targetRow, candidates, phase, enemy.abilities) ?? candidates[Math.floor(Math.random() * candidates.length)];
          antagonismTarget = selected;
          antagonismTargetName = party.characters.find(c => c.id === selected.characterId)?.name ?? '???';
          ambushMultiplier = getAmbushAmplifier(
            cs.abilities,
            selected.abilities,
            characterActedInBattleIds.has(selected.characterId),
            !isReAttack,
          );
          overwatchMultiplier = getOverwatchAmplifier(
            cs.abilities,
            selected.abilities,
            characterActedInBattleIds.size > 0 || enemyHasActedInBattle,
            alliedPartyMembersActedInBattle,
            !isReAttack,
          );
          executionMultiplier = getExecutionAmplifier(
            cs.abilities,
            selected.abilities,
            partyHp,
            partyStats.hp,
          );
          result = calculateCharacterFriendlyFireDamage(
            phase,
            cs,
            selected,
            characterStats,
            partyStats,
            partyHp,
            partyDeityKey,
            environment.terrainEffect,
            noAMultiplier,
            characterPhaseAccuracyBonus,
            resolveCharacterOffenseAmplifierMultiplier(cs.characterId) * ambushMultiplier * overwatchMultiplier * executionMultiplier,
            registerElementalOffenseUsage(cs.elementalOffense, cs.abilities),
          );

          // SpecRef: 6.1.2 | Function of battle | Shock resolve
          shockEffectLog = phase === 'close' && !isReAttack && isCharacterShockAvailable(selected)
            ? (() => {
                const actorIsNullShock = hasNullShock(cs);
                if (!actorIsNullShock && result.hits > 1) {
                  result.damage = getShockAdjustedDamage(result.damage, result.hits);
                  result.hits = 1;
                }
                consumeCharacterShock(selected.characterId);
                return {
                  phase,
                  initiativeRoll: turn.roll,
                  actor: 'triggered' as const,
                  characterId: selected.characterId,
                  action: actorIsNullShock
                    ? buildNullShockAction(char.name, antagonismTargetName)
                    : buildShockAction(char.name, antagonismTargetName),
                  note: actorIsNullShock ? '(感電予防:攻撃継続)' : '(感電:攻撃中断)',
                  noteTone: 'muted' as const,
                  hideInitiativeLabel: true,
                };
              })()
            : null;
          if (result.damage > 0) {
            applyPartyDamage(result.damage);

            triggerPartyDefeatRecovery(selected, phase, turn.roll);
          }
        } else {
          ambushMultiplier = getAmbushAmplifier(
            cs.abilities,
            enemy.abilities,
            // When a character attacks, the "opponent" for a.ambush is the enemy actor.
            enemyHasActedInBattle,
            !isReAttack,
          );
          overwatchMultiplier = getOverwatchAmplifier(
            cs.abilities,
            enemy.abilities,
            enemyHasActedInBattle,
            alliedPartyMembersActedInBattle,
            !isReAttack,
          );
          executionMultiplier = getExecutionAmplifier(
            cs.abilities,
            enemy.abilities,
            enemyHp,
            enemy.hp,
          );
          result = calculateCharacterDamage(
            phase,
            cs,
            char,
            enemy,
            enemyHp,
            characterStats,
            partyStats,
            partyHp,
            partyDeityKey,
            environment.terrainEffect,
            noAMultiplier,
            characterPhaseAccuracyBonus,
            phase === 'close' ? enemyTemporaryEvasionBonus : 0,
            resolveCharacterOffenseAmplifierMultiplier(cs.characterId) * ambushMultiplier * overwatchMultiplier * executionMultiplier,
            registerElementalOffenseUsage(cs.elementalOffense, cs.abilities),
          );
          // SpecRef: 6.1.2 | Function of battle | Shock resolve
          shockEffectLog = phase === 'close' && !isReAttack && isEnemyShockAvailable()
            ? (() => {
                const actorIsNullShock = hasNullShock(cs);
                if (!actorIsNullShock && result.hits > 1) {
                  result.damage = getShockAdjustedDamage(result.damage, result.hits);
                  result.hits = 1;
                }
                consumeEnemyShock();
                return {
                  phase,
                  initiativeRoll: turn.roll,
                  actor: 'triggered' as const,
                  action: actorIsNullShock
                    ? buildNullShockAction(char.name, enemy.name)
                    : buildShockAction(char.name, enemy.name),
                  note: actorIsNullShock ? '(感電予防:攻撃継続)' : '(感電:攻撃中断)',
                  noteTone: 'muted' as const,
                  hideInitiativeLabel: true,
                };
              })()
            : null;

          if (
            result.totalAttempts > 0
            && isIllusionActive(phase, getEnemyAbilityLevel(enemy, 'illusion') > 0, 'enemy', consumedIllusionStateIds)
          ) {
            if (hasAbility(cs.abilities, 'illusion_breaker')) {
              consumedIllusionStateIds.add('enemy');
              log.push({
                phase,
                actor: 'effect',
                action: buildIllusionBreakerAction(char.name),
              });
            } else {
              consumedIllusionStateIds.add('enemy');
              result.damage = 0;
              result.hits = 0;
              result.wasNegatedByEnemyIllusion = true;
            }
          }
          if (
            result.totalAttempts > 0
            && !result.wasNegatedByEnemyIllusion
            && isEnemyStealthActive(enemy, enemyHp, cs.abilities)
          ) {
            result.damage = 0;
            result.hits = 0;
            result.wasNegatedByEnemyStealth = true;
          }

          const defensiveReaction = getDefensiveReaction(phase, cs.elementalOffense, enemy.abilities, cs.abilities);
          const reflect = defensiveReaction?.type === 'reflect' ? defensiveReaction.descriptor : null;
          const absorb = defensiveReaction?.type === 'absorb' ? defensiveReaction.descriptor : null;
          const nullify = defensiveReaction?.type === 'nullify' ? defensiveReaction.descriptor : null;
          if (result.damage > 0 && reflect) {
            const reflectedSourceDamage = result.damage;
            result.reflectedDamage = Math.max(1, Math.floor(result.damage * reflect.amplifier));
            result.reflectedSourceDamage = reflectedSourceDamage;
            applyPartyDamage(result.reflectedDamage);
            result.damage = Math.max(0, reflectedSourceDamage - result.reflectedDamage);
          } else if (result.damage > 0 && absorb) {
            result.absorbedDamage = Math.max(1, Math.floor(result.damage * absorb.amplifier));
            result.absorbedBy = absorb;
            enemyHp = Math.min(enemy.hp, enemyHp + result.absorbedDamage);
            result.damage = 0;
          } else if (result.damage > 0 && nullify) {
            result.damage = 0;
            result.nullifiedBy = nullify;
          }

          addEnemyHitsReceived(result.hits);
          if (result.damage > 0) {
            applyEnemyDamage(result.damage);
          }

          if ((result.reflectedDamage ?? 0) > 0) {
            triggerPartyDefeatRecovery(cs, phase, turn.roll);
          }
        }

        if (result.totalAttempts <= 0) return null;

        const resonanceLogText = getResonanceLogText(
          cs.abilities,
          result.hits,
          phase === 'mid'
            || (phase === 'long' && partyDeityKey === 'God of Resonance' && environment.terrainEffect !== 'terrain.gehenna'),
        );
        const echoDomainLogText = getEchoDomainLogText(cs.elementalOffense, cs.abilities);
        const characterAttackBonusLogText = mergeAttackBonusLogText(resonanceLogText, echoDomainLogText);
        const characterAttackRageBonusPercent = toRageBonusPercent(getCharacterRageAmplifier(cs, partyHp, partyStats.hp, enemy.abilities));
        const characterAttackMomentumBonusPercent = toMomentumBonusPercent(getCharacterMomentumAmplifier(cs, partyHp, partyStats.hp, enemy.abilities));
        const characterAttackSwarmBonuses = getSwarmLogBonuses(
          cs.abilities,
          partyHp,
          partyStats.hp,
          antagonismTarget?.abilities ?? enemy.abilities,
          antagonismTarget ? partyHp : enemyHp,
          antagonismTarget ? partyStats.hp : enemy.hp,
        );
        antagonismTargetName = antagonismTargetName ?? (
          antagonismTarget
            ? (party.characters.find(c => c.id === antagonismTarget.characterId)?.name ?? '???')
            : null
        );
        const reflect = !isAntagonism && result.reflectedDamage && result.reflectedDamage > 0
          ? getReflectDescriptor(phase, cs.elementalOffense, enemy.abilities, cs.abilities)
          : null;
        const absorb = !isAntagonism && result.absorbedDamage && result.absorbedDamage > 0
          ? result.absorbedBy ?? getAbsorbDescriptor(phase, cs.elementalOffense, enemy.abilities, cs.abilities)
          : null;
        const nullify = !isAntagonism && result.nullifiedBy ? result.nullifiedBy : null;

        if (reflect) {
          log.push({
            phase,
            initiativeRoll: turn.roll,
            actor: 'character',
            characterId: cs.characterId,
            action: phase === 'mid'
              ? `${char.name} が${attackType}を唱えたが反射された！${characterAttackBonusLogText}`
              : `${char.name} の${reflect.summary}攻撃は反射された！${characterAttackBonusLogText}`,
            damage: result.damage,
            reflectedDamage: result.reflectedDamage,
            reflectedSourceDamage: result.reflectedSourceDamage,
            reflectTarget: 'party',
            hits: result.hits,
            totalAttempts: result.totalAttempts,
            rageBonusPercent: characterAttackRageBonusPercent > 0 ? characterAttackRageBonusPercent : undefined,
            momentumBonusPercent: cs.abilities.some(a => a.id === 'momentum')
              ? characterAttackMomentumBonusPercent
              : undefined,
            ambushMultiplier: ambushMultiplier > 1.0 ? ambushMultiplier : undefined,
            overwatchMultiplier: overwatchMultiplier > 1.0 ? overwatchMultiplier : undefined,
            executionMultiplier: executionMultiplier > 1.0 ? executionMultiplier : undefined,
            ...characterAttackSwarmBonuses,
            isReAttack: isReAttack || undefined,
            wasNegated: result.wasNegatedByEnemyIllusion || result.wasNegatedByEnemyStealth || undefined,
            elementalOffense: cs.elementalOffense,
          });
        } else if (absorb) {
          log.push({
            phase,
            initiativeRoll: turn.roll,
            actor: 'character',
            characterId: cs.characterId,
            action: phase === 'mid'
              ? `${char.name} が${attackType}を唱えたが吸収された！${characterAttackBonusLogText}`
              : `${char.name} の${absorb.summary}攻撃は吸収された！${characterAttackBonusLogText}`,
            damage: 0,
            showZeroDamage: true,
            absorbedDamage: result.absorbedDamage,
            absorbTarget: 'enemy',
            hits: result.hits,
            totalAttempts: result.totalAttempts,
            rageBonusPercent: characterAttackRageBonusPercent > 0 ? characterAttackRageBonusPercent : undefined,
            momentumBonusPercent: cs.abilities.some(a => a.id === 'momentum')
              ? characterAttackMomentumBonusPercent
              : undefined,
            ambushMultiplier: ambushMultiplier > 1.0 ? ambushMultiplier : undefined,
            overwatchMultiplier: overwatchMultiplier > 1.0 ? overwatchMultiplier : undefined,
            executionMultiplier: executionMultiplier > 1.0 ? executionMultiplier : undefined,
            ...characterAttackSwarmBonuses,
            isReAttack: isReAttack || undefined,
            wasNegated: result.wasNegatedByEnemyIllusion || result.wasNegatedByEnemyStealth || undefined,
            elementalOffense: cs.elementalOffense,
          });
        } else if (nullify) {
          log.push({
            phase,
            initiativeRoll: turn.roll,
            actor: 'character',
            characterId: cs.characterId,
            action: phase === 'mid'
              ? `${char.name} が${attackType}を唱えたが無効化された！${characterAttackBonusLogText}`
              : `${char.name} の${nullify.summary}攻撃は無効化された！${characterAttackBonusLogText}`,
            damage: 0,
            showZeroDamage: true,
            hits: result.hits,
            totalAttempts: result.totalAttempts,
            rageBonusPercent: characterAttackRageBonusPercent > 0 ? characterAttackRageBonusPercent : undefined,
            momentumBonusPercent: cs.abilities.some(a => a.id === 'momentum')
              ? characterAttackMomentumBonusPercent
              : undefined,
            ambushMultiplier: ambushMultiplier > 1.0 ? ambushMultiplier : undefined,
            overwatchMultiplier: overwatchMultiplier > 1.0 ? overwatchMultiplier : undefined,
            executionMultiplier: executionMultiplier > 1.0 ? executionMultiplier : undefined,
            ...characterAttackSwarmBonuses,
            isReAttack: isReAttack || undefined,
            wasNegated: result.wasNegatedByEnemyIllusion || result.wasNegatedByEnemyStealth || undefined,
            elementalOffense: cs.elementalOffense,
          });
        } else {
          const antagonismAction = isAntagonism && antagonismTargetName
            ? buildAntagonismAction(phase, char.name, antagonismTargetName, phase === 'mid' ? attackType : null)
            : null;
          log.push({
            phase,
            initiativeRoll: turn.roll,
            actor: 'character',
            characterId: cs.characterId,
            action: isAntagonism
              ? `${antagonismAction ?? `${char.name} は敵対状態！${antagonismTargetName} へ${phase === 'mid' ? `${attackType}を唱えた` : attackType}！`}${characterAttackBonusLogText}`
              : phase === 'mid'
                ? `${char.name} が${attackType}を唱えた！${characterAttackBonusLogText}`
                : `${char.name} の${attackType}！${characterAttackBonusLogText}`,
            damage: result.damage,
            damageTarget: isAntagonism ? 'party' : 'enemy',
            hits: result.hits,
            totalAttempts: result.totalAttempts,
            rageBonusPercent: characterAttackRageBonusPercent > 0 ? characterAttackRageBonusPercent : undefined,
            momentumBonusPercent: cs.abilities.some(a => a.id === 'momentum')
              ? characterAttackMomentumBonusPercent
              : undefined,
            ambushMultiplier: ambushMultiplier > 1.0 ? ambushMultiplier : undefined,
            overwatchMultiplier: overwatchMultiplier > 1.0 ? overwatchMultiplier : undefined,
            executionMultiplier: executionMultiplier > 1.0 ? executionMultiplier : undefined,
            ...characterAttackSwarmBonuses,
            isReAttack: isReAttack || undefined,
            wasNegated: result.wasNegatedByEnemyIllusion || result.wasNegatedByEnemyStealth || undefined,
            elementalOffense: cs.elementalOffense,
          });
        }

        if (shockEffectLog) {
          log.push(shockEffectLog);
        }

        if (!isAntagonism && result.wasNegatedByEnemyIllusion) {
          log.push({
            phase,
            actor: 'effect',
            action: buildIllusionAction(enemy.name),
          });
        }
        if (!isAntagonism && result.wasNegatedByEnemyStealth) {
          log.push({
            phase,
            actor: 'effect',
            action: `${enemy.name} は神隠れした。もう攻撃はこれ以上あたらない！`,
          });
        }

        if (!isAntagonism && result.damage > 0) {
          triggerEnemyDefeatRecovery(phase, turn.roll);
        }
        // SpecRef: 6.1.3.1 | Actor action | actor.a.requiem
        if (
          !isAntagonism
          && result.hits > 0
          && hasRequiem(cs)
          && consumedEnemyReanimate
          && enemyHp > 0
        ) {
          log.push({
            phase,
            initiativeRoll: turn.roll,
            actor: 'character',
            characterId: cs.characterId,
            action: enemyHasNullRequiem(enemy)
              ? `${buildNullRequiemAction(char.name, enemy.name)} (鎮魂無効)`
              : `${buildRequiemAction(char.name, enemy.name)} (鎮魂歌)`,
          });
          if (!enemyHasNullRequiem(enemy)) {
            enemyHp = 0;
          }
        }

        if (!isAntagonism && phase === 'close') {
          applyCharacterCloseReactiveAbilities(cs, char.name, result, turn.roll);
        }

        if (!isAntagonism && enemyHp > 0 && (phase === 'long' || phase === 'close')) {
          triggerEnemyCounter(phase, cs, result.damage, enemyInitiativeRoll ?? undefined);
        }

        applyTerrainSelfInflictedDamage(
          { kind: 'character', stats: cs, name: char.name },
          phase,
          result.damage,
          cs.elementalOffense,
        );
        if (cs.elementalOffense === 'thunder') {
          applyTerrainChainLightningDamage(
            { kind: 'character', stats: cs, name: char.name },
            phase,
            result.damage,
          );
        }

        return result;
      };

        movedCharacterIds.add(cs.characterId);
        characterActedInBattleIds.add(cs.characterId);
        if (firstActorInBattle === null) {
          firstActorInBattle = cs.characterId;
        }
        const firstAttackResult = runCharacterAttack(howlEffect?.multiplier ?? 1.0, false);
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
    }

    if (partyHp <= 0) {
      return buildBattleResult(phase, 'defeat');
    }

    if (enemyHp <= 0) {
      return buildBattleResult(phase, 'victory');
    }
  }

  for (const timing of TRIGGER_TIMINGS_DESC) {
    resolveEndPhaseTriggerTiming(timing);
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

  return buildBattleResult('close', outcome);
}

// Calculate enemy attack values for all phases (for display)
// Shows raw attack values: rangedAttack/magicalAttack/meleeAttack
// SpecRef: 6.1.4.1 | Function of attack | f.damage_calculation
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
