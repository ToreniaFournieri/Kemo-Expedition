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
  buildFlyingAction,
  buildFreeAction,
  buildIncapacitatedAction,
  buildLifeDrainAction,
  buildRegenerationAction,
  buildReanimateAction,
  buildResurrectAction,
  buildSelfDestructAction,
  buildShockAction,
  buildSoulReapAction,
  buildUnstableCoreAction,
  formatDecomposeNote,
  formatDefeatRecoveryNote,
  formatRegenerationNote,
  getConfusionNoTargetLog,
} from './battleNarration';

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

function getElementalMultiplier(
  offense: ElementalOffense,
  resistance: Record<'fire' | 'thunder' | 'ice', number>
): number {
  if (offense === 'none') return 1.0;
  return resistance[offense] ?? 1.0;
}

// SpecRef: 6.1.4.1 | Function of attack | f.rage_amplifier
function getCharacterRageAmplifier(charStats: ComputedCharacterStats, partyHp: number, maxPartyHp: number): number {
  const rageLevel = charStats.abilities.find(a => a.id === 'rage')?.level ?? 0;
  if (rageLevel <= 0) return 1.0;
  if (maxPartyHp <= 0) return 1.0;
  const hpRatio = Math.max(0, Math.min(1, partyHp / maxPartyHp));
  const multiplierPerDamageRate = rageLevel >= 2 ? 0.6 : 0.5;
  return Math.min(2.0, 1.0 + (multiplierPerDamageRate * (1.0 - hpRatio)));
}

// SpecRef: 6.1.4.1 | Function of attack | f.rage_amplifier
function getEnemyRageAmplifier(enemy: EnemyDef, enemyHp: number): number {
  const rageLevel = getEnemyAbilityLevel(enemy, 'rage');
  if (rageLevel <= 0) return 1.0;
  if (enemy.hp <= 0) return 1.0;
  const hpRatio = Math.max(0, Math.min(1, enemyHp / enemy.hp));
  const multiplierPerDamageRate = rageLevel >= 2 ? 0.6 : 0.5;
  return Math.min(2.0, 1.0 + (multiplierPerDamageRate * (1.0 - hpRatio)));
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
  1: 1 / 10,
  2: 3 / 10,
  3: 5 / 10,
  4: 7 / 10,
  5: 1.0,
};

const AMBUSH_MULTIPLIERS: Record<number, number> = {
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
  opponentHasActedInBattle: boolean,
  isNormalAction: boolean,
): number {
  if (!isNormalAction || opponentHasActedInBattle) {
    return 1.0;
  }

  const ambushLevel = getHighestAbilityLevel(actorAbilities, 'ambush');
  if (ambushLevel <= 0) {
    return 1.0;
  }

  return AMBUSH_MULTIPLIERS[Math.min(5, ambushLevel)] ?? 1.0;
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

// SpecRef: 6.1.4.2 | Function of targeting | f.targeting
function resolveEnemyTarget(
  targetRow: number,
  characterStats: ComputedCharacterStats[],
  phase: BattleActionPhase
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

// SpecRef: 6.1.4.1 | Function of attack | f.momentum_amplifer
function getCharacterMomentumAmplifier(charStats: ComputedCharacterStats, partyHp: number, maxPartyHp: number): number {
  const momentumLevel = charStats.abilities.find(a => a.id === 'momentum')?.level ?? 0;
  if (momentumLevel <= 0) return 1.0;
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

  const partyDefenseAbilityAmplifier = getPartyDefenseAbilityAmplifier(phase, characterStats, targetCharStats.row);
  const rageAmplifier = getEnemyRageAmplifier(enemy, enemyHp);
  const mutualAmplifier = getMutualAmplifier(phase, enemy.abilities, targetCharStats.abilities);
  const terrainAmplifier = getTerrainAmplifier(phase, terrainEffect);
  const swarmAmplifier = getSwarmAmplifier(
    enemy.abilities,
    enemyHp,
    enemy.hp,
    targetCharStats.abilities,
    partyHp,
    maxPartyHp,
  );
  const rawDamage = (attack - defense) * amplifier * runtimeOffenseMultiplier * elementalMultiplier * defenseAmplifier * partyDefenseAbilityAmplifier * rageAmplifier * mutualAmplifier * terrainAmplifier * swarmAmplifier;
  const totalDamage = Math.max(1, rawDamage);

  return Math.floor(totalDamage);
}

// Get number of attacks for enemy in a phase
function getEnemyNoA(phase: BattleActionPhase, enemy: EnemyDef): number {
  switch (phase) {
    case 'long': return enemy.rangedNoA;
    case 'mid': return enemy.magicalNoA;
    case 'close': return enemy.meleeNoA;
  }
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
  return commandLevel >= 3 ? 2.43 : commandLevel === 2 ? 1.35 : commandLevel === 1 ? 1.2 : 1.0;
}

function getPartyDefenseAbilityAmplifier(
  phase: BattleActionPhase,
  characterStats: ComputedCharacterStats[],
  actorRow: number,
): number {
  if (phase === 'mid') {
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
): number {
  if (!terrainEffect) return 1.0;
  if ((phase === 'long' || phase === 'close') && terrainEffect === 'terrain.exposure') return 1.3;
  if ((phase === 'long' || phase === 'close') && terrainEffect === 'terrain.dark-field') return 1.45;
  if (phase === 'mid' && terrainEffect === 'terrain.light-field') return 1.45;
  if (phase === 'mid' && terrainEffect === 'terrain.sanctuary') return 0.67;
  return 1.0;
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
  const iaigiriMultiplier = iaigiri ? (iaigiri.level >= 3 ? 2.0 : iaigiri.level >= 2 ? 1.8 : 1.6) : 1.0;
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
  const mutualAmplifier = getMutualAmplifier(phase, attacker.abilities, target.abilities);
  const terrainAmplifier = getTerrainAmplifier(phase, terrainEffect);
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
    (attack - effectiveDefense)
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
      * swarmAmplifier
  ));

  const actorAccuracyPotency = phase === 'mid' ? 1.0 : attacker.accuracyPotency;
  const actorFocusLevel = attacker.abilities.find(a => a.id === 'focus')?.level ?? 0;
  const targetDeflectionLevel = getDeflectionLevel(target);
  const resonance = attacker.abilities.find(a => a.id === 'resonance');
  const canApplyResonance = phase === 'mid' || (phase === 'long' && partyDeityKey === 'God of Resonance');

  let hits = 0;
  let damage = 0;
  for (let i = 1; i <= noA; i++) {
    if (hitDetection(actorAccuracyPotency, attacker.accuracyBonus + temporaryAccuracyBonus, target.evasionBonus, i, phase, targetDeflectionLevel, actorFocusLevel)) {
      hits += 1;
      const resonanceAmplifier = canApplyResonance ? getResonanceAmplifier(resonance?.level, hits) : 1.0;
      damage += Math.max(1, Math.floor(basePerHitDamage * resonanceAmplifier));
    }
  }

  return { damage, totalAttempts: noA, hits };
}


interface CharacterAttackResult {
  damage: number;
  totalAttempts: number;
  hits: number;
  wasNegatedByEnemyIllusion?: boolean;
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

function getReflectAmplifier(level: number): number {
  if (level >= 5) return 1.0;
  if (level === 4) return 0.7;
  if (level === 3) return 0.5;
  if (level === 2) return 0.3;
  return 0.1;
}

function getReflectPortionText(amplifier: number): string {
  if (amplifier >= 1.0) return '全';
  return `${Math.round(amplifier * 10)}/10`;
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
): ReflectDescriptor | null {
  const iceLevel = getAbilityLevelFromList(defenderAbilities, 'ice_reflect');
  if (elementalOffense === 'ice' && iceLevel > 0) {
    const amplifier = getReflectAmplifier(iceLevel);
    return {
      abilityId: 'ice_reflect',
      name: '氷結反射',
      summary: '氷属性',
      amplifier,
      reflectedPortionText: getReflectPortionText(amplifier),
      receivedPortionText: getReflectPortionText(1 - amplifier),
    };
  }

  const fireLevel = getAbilityLevelFromList(defenderAbilities, 'fire_reflect');
  if (elementalOffense === 'fire' && fireLevel > 0) {
    const amplifier = getReflectAmplifier(fireLevel);
    return {
      abilityId: 'fire_reflect',
      name: '火炎反射',
      summary: '火属性',
      amplifier,
      reflectedPortionText: getReflectPortionText(amplifier),
      receivedPortionText: getReflectPortionText(1 - amplifier),
    };
  }

  const thunderLevel = getAbilityLevelFromList(defenderAbilities, 'thunder_reflect');
  if (elementalOffense === 'thunder' && thunderLevel > 0) {
    const amplifier = getReflectAmplifier(thunderLevel);
    return {
      abilityId: 'thunder_reflect',
      name: '雷撃反射',
      summary: '雷属性',
      amplifier,
      reflectedPortionText: getReflectPortionText(amplifier),
      receivedPortionText: getReflectPortionText(1 - amplifier),
    };
  }

  const rangedLevel = getAbilityLevelFromList(defenderAbilities, 'ranged_reflect');
  if (phase === 'long' && rangedLevel > 0) {
    const amplifier = getReflectAmplifier(rangedLevel);
    return {
      abilityId: 'ranged_reflect',
      name: '矢返し',
      summary: '遠距離',
      amplifier,
      reflectedPortionText: getReflectPortionText(amplifier),
      receivedPortionText: getReflectPortionText(1 - amplifier),
    };
  }

  const magicalLevel = getAbilityLevelFromList(defenderAbilities, 'magical_reflect');
  if (phase === 'mid' && magicalLevel > 0) {
    const amplifier = getReflectAmplifier(magicalLevel);
    return {
      abilityId: 'magical_reflect',
      name: '魔法反射',
      summary: '魔法',
      amplifier,
      reflectedPortionText: getReflectPortionText(amplifier),
      receivedPortionText: getReflectPortionText(1 - amplifier),
    };
  }

  const meleeLevel = getAbilityLevelFromList(defenderAbilities, 'melee_reflect');
  if (phase === 'close' && meleeLevel > 0) {
    const amplifier = getReflectAmplifier(meleeLevel);
    return {
      abilityId: 'melee_reflect',
      name: '打ち返し',
      summary: '近接',
      amplifier,
      reflectedPortionText: getReflectPortionText(amplifier),
      receivedPortionText: getReflectPortionText(1 - amplifier),
    };
  }

  return null;
}

function getAbsorbDescriptor(
  phase: BattleActionPhase,
  elementalOffense: ElementalOffense,
  defenderAbilities: AbilityLike[],
): AbsorbDescriptor | null {
  const iceLevel = getAbilityLevelFromList(defenderAbilities, 'ice_absorb');
  if (elementalOffense === 'ice' && iceLevel > 0) {
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
  if (elementalOffense === 'fire' && fireLevel > 0) {
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
  if (elementalOffense === 'thunder' && thunderLevel > 0) {
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
  if (phase === 'mid' && magicalLevel > 0) {
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
): DefensiveReaction | null {
  const absorb = getAbsorbDescriptor(phase, elementalOffense, defenderAbilities);
  if (absorb) {
    return { type: 'absorb', descriptor: absorb };
  }

  const nullify = getNullDescriptor(phase, elementalOffense, defenderAbilities);
  if (nullify) {
    return { type: 'nullify', descriptor: nullify };
  }

  const reflect = getReflectDescriptor(phase, elementalOffense, defenderAbilities);
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
  runtimeOffenseMultiplier: number = 1.0,
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
  const canApplyResonance = phase === 'mid' || (phase === 'long' && partyDeityKey === 'God of Resonance');

  const elementalMultiplier = getElementalMultiplier(
    charStats.elementalOffense,
    enemy.elementalResistance
  );

  const rageAmplifier = getCharacterRageAmplifier(charStats, partyHp, partyStats.hp);
  const momentumAmplifier = getCharacterMomentumAmplifier(charStats, partyHp, partyStats.hp);
  const mutualAmplifier = getMutualAmplifier(phase, charStats.abilities, enemy.abilities);
  const terrainAmplifier = getTerrainAmplifier(phase, terrainEffect);
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
    elementalMultiplier * defenseAmplifier * partyOffenseAmplifier * rageAmplifier * momentumAmplifier * mutualAmplifier * terrainAmplifier * swarmAmplifier
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
    if (hitDetection(actorAccuracyPotency, charStats.accuracyBonus + temporaryAccuracyBonus, enemyEvasion, i, phase, enemyDeflectionLevel, actorFocusLevel)) {
      hits++;
      const resonanceAmplifier = canApplyResonance ? getResonanceAmplifier(resonance?.level, hits) : 1.0;
      damage += Math.max(1, Math.floor(basePerHitDamage * resonanceAmplifier));
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

function rollInitiative(
  firstStrikeLevel: number,
  options?: {
    fertilityBonus?: number;
    hasSlow?: boolean;
    affectedByFrostbite?: boolean;
  },
): number {
  const diceCount = firstStrikeLevel >= 3 ? 4 : firstStrikeLevel >= 2 ? 3 : firstStrikeLevel === 1 ? 2 : 1;
  let total = 0;
  for (let i = 0; i < diceCount; i++) {
    total += Math.floor(Math.random() * 3) + 1;
  }

  let result = firstStrikeLevel >= 3 ? Math.min(9, total) : total;
  if ((options?.fertilityBonus ?? 0) > 0) {
    result = Math.min(9, result + (options?.fertilityBonus ?? 0));
  }
  if (options?.hasSlow) {
    result = Math.max(1, result - 1);
  }
  if (options?.affectedByFrostbite) {
    result = Math.max(1, result - 1);
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

function getFlyingNoAMultiplier(level: number): number {
  if (level <= 0) return 1.0;
  return 1 / 4;
}

function getFlyingNote(level: number): string {
  if (level <= 0) return '(飛行:相手の攻撃回数x1)';
  return '(飛行:相手の攻撃回数x1/4)';
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
  return LIFE_DRAIN_MULTIPLIERS[Math.min(5, Math.max(1, level))] ?? 0;
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

function formatFractionPercentLabel(value: number): string {
  const percentage = value * 100;
  if (Number.isInteger(percentage)) {
    return `${percentage}%`;
  }
  return `${percentage.toFixed(1).replace(/\.0$/, '')}%`;
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
): string[] {
  const queue: string[] = [];

  for (const stats of characterStats) {
    if (getAbilityLevel(stats, 'magic_seal') <= 0) continue;
    const ownerName = party.characters.find((char) => char.id === stats.characterId)?.name ?? '味方';
    queue.push(ownerName);
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

function hasNoOffense(charStats: ComputedCharacterStats): boolean {
  return getAbilityLevel(charStats, 'no_offense') > 0;
}

function enemyHasNoOffense(enemy: EnemyDef): boolean {
  return getEnemyAbilityLevel(enemy, 'no_offense') > 0;
}

function hasCounter(charStats: ComputedCharacterStats, phase: BattleActionPhase): boolean {
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

export interface BattleResult extends BattleState {
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

// SpecRef: 6.1.1.1 | START phase | actor.a.oblivion
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
  const log: BattleLogEntry[] = [];

  const partyDeityKey = getDeityKey(party.deity.name);
  const terrainEntry = environment.terrainEffect ? getTerrainEffectGlossaryEntry(environment.terrainEffect) : undefined;

  if (terrainEntry) {
    log.push({
      phase: 'start',
      actor: 'effect',
      effectKind: 'terrain',
      action: terrainEntry.label,
      note: `(${terrainEntry.description})`,
      noteTone: 'muted',
    });
  }

  if (partyDeityKey === 'Goddess of Discord' && characterStats.length > 0) {
    const targetIndex = Math.floor(Math.random() * characterStats.length);
    const targetStats = characterStats[targetIndex];
    const targetName = party.characters.find(c => c.id === targetStats.characterId)?.name ?? '???';

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

    ctx = {
      ...ctx,
      characterStats,
    };
  }

  const oblivionOwners = characterStats
    .filter((stats) => getAbilityLevel(stats, 'oblivion') >= 1)
    .map((stats) => ({
      name: party.characters.find((char) => char.id === stats.characterId)?.name ?? '味方',
    }));
  const enemyHasOblivion = getEnemyAbilityLevel(enemy, 'oblivion') >= 1;

  const mimicOwners = characterStats
    .filter((stats) => getAbilityLevel(stats, 'mimic') >= 1)
    .map((stats) => ({
      name: party.characters.find((char) => char.id === stats.characterId)?.name ?? '味方',
      stats,
    }));
  const enemyHasMimic = getEnemyAbilityLevel(enemy, 'mimic') >= 1;

  const remainingNullCounterByCharacterId = createNullCounterPool(characterStats);
  const consumedResurrectCharacterIds = new Set<number>();
  const consumedReanimateCharacterIds = new Set<number>();
  let consumedEnemyResurrect = false;
  let consumedEnemyReanimate = false;
  const consumedIllusionStateIds = new Set<string>();
  let consumedPartyIllusion = false;
  let consumedEnemyShock = false;
  const consumedCharacterShockIds = new Set<number>();
  const activeMagicSealQueue = createMagicSealQueue(party, characterStats, enemy);
  let pendingEnemyHowlEffect: PendingHowlEffect | null = null;
  let pendingPartyHowlEffect: PendingHowlEffect | null = null;
  let enemyFlyingNoAMultiplier = 1.0;
  let partyFlyingNoAMultiplier = 1.0;
  let enemyTemporaryAccuracyBonus = 0;
  const temporaryAccuracyBonusByCharacterId = new Map<number, number>();
  let enemyOffenseAmplifierMultiplier = 1.0;
  const characterOffenseAmplifierMultiplierById = new Map<number, number>(
    characterStats.map((stats) => [stats.characterId, 1.0]),
  );
  let enemyIncapacitated = false;
  const incapacitatedCharacterIds = new Set<number>();
  let forcedOutcome: BattleOutcome | null = null;
  let forcedOutcomePhase: BattleActionPhase = 'close';

  const consumeMagicSeal = (): boolean => activeMagicSealQueue.shift() !== undefined;

  const consumePendingEnemyHowlEffect = (): PendingHowlEffect | null => {
    const effect = pendingEnemyHowlEffect;
    pendingEnemyHowlEffect = null;
    return effect;
  };

  const consumePendingPartyHowlEffect = (): PendingHowlEffect | null => {
    const effect = pendingPartyHowlEffect;
    pendingPartyHowlEffect = null;
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
      const multiplier = getCorrodeMultiplier(corrodeLevel);
      enemyOffenseAmplifierMultiplier *= multiplier;
      log.push({
        phase: 'close',
        initiativeRoll,
        actor: 'triggered',
        characterId: actorStats.characterId,
        action: buildCorrodeAction(actorName, enemy.name),
        note: `(腐食:相手の攻撃倍率が${formatMultiplierAsFraction(multiplier)})`,
        noteTone: 'muted',
        hideInitiativeLabel: true,
      });
    }

    const lifeDrainLevel = getAbilityLevel(actorStats, 'life_drain');
    if (lifeDrainLevel > 0 && result.damage > 0) {
      const drainMultiplier = getLifeDrainMultiplier(lifeDrainLevel);
      const healAmount = healParty(Math.floor(result.damage * drainMultiplier));
      log.push({
        phase: 'close',
        initiativeRoll,
        actor: 'triggered',
        characterId: actorStats.characterId,
        effectKind: 'life_drain',
        effectSourceName: actorName,
        effectTargetName: enemy.name,
        effectHealAmount: healAmount,
        action: buildLifeDrainAction(actorName, enemy.name),
        note: `(吸血: 与ダメージの${formatFractionPercentLabel(drainMultiplier)}回復: ✚${healAmount})`,
        noteTone: 'muted',
      });
    }

    const deathTouchLevel = getAbilityLevel(actorStats, 'death_touch');
    if (deathTouchLevel > 0 && enemyHp > 0 && Math.random() < getDeathTouchChance(deathTouchLevel, result.hits)) {
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

    const burnLevel = getEnemyAbilityLevel(enemy, 'burn');
    if (burnLevel > 0) {
      const reflectedDamage = Math.floor(
        partyStats.hp
        * result.hits
        * (getBurnPercent(burnLevel) / 100)
        * (actorStats.elementalDefenseMultipliers.fire ?? 1.0),
      );
      if (reflectedDamage > 0) {
        applyPartyDamage(reflectedDamage);
        log.push({
          phase: 'close',
          initiativeRoll,
          actor: 'triggered',
          characterId: actorStats.characterId,
          action: buildBurnAction(actorName),
          damage: reflectedDamage,
          damageTarget: 'party',
          note: '(火傷)',
          noteTone: 'muted',
          hideInitiativeLabel: true,
          elementalOffense: 'fire',
        });

        triggerPartyDefeatRecovery(actorStats, 'close');
      }
    }

    const bindLevel = getAbilityLevel(actorStats, 'bind');
    if (bindLevel > 0 && enemyHp > 0 && Math.random() < getBindChance(bindLevel, result.hits)) {
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
      const multiplier = getCorrodeMultiplier(enemyCorrodeLevel);
      characterOffenseAmplifierMultiplierById.set(
        targetStats.characterId,
        resolveCharacterOffenseAmplifierMultiplier(targetStats.characterId) * multiplier,
      );
      log.push({
        phase: 'close',
        initiativeRoll,
        actor: 'triggered',
        action: buildCorrodeAction(enemy.name, targetName),
        note: `(腐食:相手の攻撃倍率が${formatMultiplierAsFraction(multiplier)})`,
        noteTone: 'muted',
        hideInitiativeLabel: true,
      });
    }

    const enemyLifeDrainLevel = getEnemyAbilityLevel(enemy, 'life_drain');
    if (enemyLifeDrainLevel > 0 && appliedDamage > 0) {
      const drainMultiplier = getLifeDrainMultiplier(enemyLifeDrainLevel);
      const healAmount = healEnemy(Math.floor(appliedDamage * drainMultiplier));
      log.push({
        phase: 'close',
        initiativeRoll,
        actor: 'triggered',
        effectKind: 'life_drain',
        effectSourceName: enemy.name,
        effectTargetName: targetName,
        effectHealAmount: healAmount,
        action: buildLifeDrainAction(enemy.name, targetName),
        note: `(吸血: 与ダメージの${formatFractionPercentLabel(drainMultiplier)}回復: ✚${healAmount})`,
        noteTone: 'muted',
      });
    }

    const enemyDeathTouchLevel = getEnemyAbilityLevel(enemy, 'death_touch');
    if (enemyDeathTouchLevel > 0 && partyHp > 0 && Math.random() < getDeathTouchChance(enemyDeathTouchLevel, appliedHits)) {
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

    const burnLevel = getAbilityLevel(targetStats, 'burn');
    if (burnLevel > 0 && enemyHp > 0) {
      const reflectedDamage = Math.floor(
        enemy.hp
        * appliedHits
        * (getBurnPercent(burnLevel) / 100)
        * (enemy.elementalResistance.fire ?? 1.0),
      );
      if (reflectedDamage > 0) {
        applyEnemyDamage(reflectedDamage);
        log.push({
          phase: 'close',
          initiativeRoll,
          actor: 'triggered',
          characterId: targetStats.characterId,
          action: buildBurnAction(enemy.name),
          damage: reflectedDamage,
          damageTarget: 'enemy',
          note: '(火傷)',
          noteTone: 'muted',
          hideInitiativeLabel: true,
          elementalOffense: 'fire',
        });
        triggerEnemyDefeatRecovery('close', initiativeRoll);
      }
    }

    const enemyBindLevel = getEnemyAbilityLevel(enemy, 'bind');
    if (enemyBindLevel > 0 && partyHp > 0 && Math.random() < getBindChance(enemyBindLevel, appliedHits)) {
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
  };

  const triggerFreeAtTiming = (phase: BattleActionPhase, timing: number): boolean => {
    if (forcedOutcome || partyHp <= 0 || enemyHp <= 0) {
      return false;
    }

    const enemyFreeLevel = getEnemyAbilityLevel(enemy, 'free');
    if (getFreeTimingForPhase(phase, enemyFreeLevel) === timing) {
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

  const partyEffects = [
    createPartyEffectEntry('fighter', 'defender', () => '守護者', level => `(後列の味方への物理ダメージ × ${level >= 3 ? '1/2' : level === 2 ? '3/5' : '2/3'})`),
    createPartyEffectEntry('lord', 'command', () => '指揮', level => `(後列の味方が与える物理ダメージ × ${level >= 3 ? '1.43' : level === 2 ? '1.35' : '1.2'})`),
    createPartyEffectEntry('sage', 'm_barrier', () => '魔法障壁', level => `(後列の味方への魔法ダメージ × ${level >= 3 ? '1/2' : level === 2 ? '3/5' : '2/3'})`),
    createPartyAbilityEffectEntry('deflection', () => '矢払い', level => `(敵の遠距離攻撃の命中率を${level >= 2 ? '15' : '10'}%低下)`),
  ];

  const triggerEnemyCounter = (targetCharStats: ComputedCharacterStats, dealtDamage: number, initiativeRoll?: number): void => {
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

    const singleDamage = calculateSingleEnemyAttackDamage('close', enemy, characterStats, targetCharStats, enemyHp, partyHp, partyStats.hp, environment.terrainEffect, enemyOffenseAmplifierMultiplier);
    const enemyCloseAccuracyBonus = enemyTemporaryAccuracyBonus;
    const attempts = Math.ceil(getEnemyNoA('close', enemy) * enemyFlyingNoAMultiplier * counterNoAMultiplier);
    let hits = 0;
    for (let i = 1; i <= attempts; i++) {
      const didHit = hitDetection(1.0, enemy.accuracyBonus + enemyCloseAccuracyBonus, targetCharStats.evasionBonus, i, 'close', getDeflectionLevel(targetCharStats), getEnemyFocusLevel(enemy));
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
        applyPartyDamage(singleDamage);
      }
    }

    triggerPartyDefeatRecovery(targetCharStats, 'close', initiativeRoll, true);

    const enemyCounterRageBonusPercent = toRageBonusPercent(getEnemyRageAmplifier(enemy, enemyHp));
    const enemyCounterSwarmBonuses = getSwarmLogBonuses(enemy.abilities, enemyHp, enemy.hp, targetCharStats.abilities, partyHp, partyStats.hp);
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
      ...enemyCounterSwarmBonuses,
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

    const reCounterNoAMultiplier = getReCounterNoAMultiplier(targetCharStats);
    if (partyHp <= 0 || enemyHp <= 0 || !targetChar || reCounterNoAMultiplier <= 0 || getEnemyAbilityLevel(enemy, 'null_counter') > 0) {
      return;
    }

    const reCounterResult = calculateCharacterDamage('close', targetCharStats, targetChar, enemy, enemyHp, characterStats, partyStats, partyHp, partyDeityKey, environment.terrainEffect, reCounterNoAMultiplier * partyFlyingNoAMultiplier, temporaryAccuracyBonusByCharacterId.get(targetCharStats.characterId) ?? 0, resolveCharacterOffenseAmplifierMultiplier(targetCharStats.characterId));
    if (reCounterResult.totalAttempts <= 0) {
      return;
    }

    const reCounterDealtDamage = reCounterResult.damage > 0;
    addEnemyHitsReceived(reCounterResult.hits);
    if (reCounterDealtDamage) {
      applyEnemyDamage(reCounterResult.damage);
    }

    const characterReCounterRageBonusPercent = toRageBonusPercent(getCharacterRageAmplifier(targetCharStats, partyHp, partyStats.hp));
    const characterReCounterMomentumBonusPercent = toMomentumBonusPercent(getCharacterMomentumAmplifier(targetCharStats, partyHp, partyStats.hp));
    const characterReCounterSwarmBonuses = getSwarmLogBonuses(targetCharStats.abilities, partyHp, partyStats.hp, enemy.abilities, enemyHp, enemy.hp);
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
      ...characterReCounterSwarmBonuses,
      isCounter: true,
      elementalOffense: targetCharStats.elementalOffense,
    });

    if (reCounterDealtDamage) {
      triggerEnemyDefeatRecovery('close', initiativeRoll);
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

      const coveringFireResult = calculateCharacterDamage('long', coverCharStats, coverChar, enemy, enemyHp, characterStats, partyStats, partyHp, partyDeityKey, environment.terrainEffect, coveringFireNoAMultiplier, 0, resolveCharacterOffenseAmplifierMultiplier(coverCharStats.characterId));
      if (coveringFireResult.totalAttempts <= 0) continue;

      if (isIllusionActive('long', getEnemyAbilityLevel(enemy, 'illusion') > 0, 'enemy', consumedIllusionStateIds)) {
        consumedIllusionStateIds.add('enemy');
        coveringFireResult.damage = 0;
        coveringFireResult.hits = 0;
        coveringFireResult.wasNegatedByEnemyIllusion = true;
      }

      addEnemyHitsReceived(coveringFireResult.hits);
      const coveringFireDealtDamage = coveringFireResult.damage > 0;
      if (coveringFireDealtDamage) {
        applyEnemyDamage(coveringFireResult.damage);
      }

      const coverFireRageBonusPercent = toRageBonusPercent(getCharacterRageAmplifier(coverCharStats, partyHp, partyStats.hp));
      const coverFireMomentumBonusPercent = toMomentumBonusPercent(getCharacterMomentumAmplifier(coverCharStats, partyHp, partyStats.hp));
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
        triggerEnemyDefeatRecovery(phase, initiativeRoll);
      }

      if (enemyHp <= 0) {
        break;
      }
    }
  };

  const phases: BattleActionPhase[] = ['long', 'mid', 'close'];
  const hasFertilityInitiativeBonus = getDeityKey(party.deity.name) === 'Goddess of Fertility';

  const partyHasFrostbite = characterStats.some(cs => hasAbility(cs.abilities, 'frostbite'));
  const enemyHasFrostbite = hasAbility(enemy.abilities, 'frostbite');

  const pushFrostbiteLog = (ownerName: string): void => {
    log.push({
      phase: 'start',
      actor: 'effect',
      action: `${ownerName} の凍傷！`,
      note: '(相手の行動を少し遅らせる)',
    });
  };

  const mutualOwners: Array<{ name: string; abilities: AbilityLike[] }> = [
    ...party.characters.map((c) => ({
      name: c.name,
      abilities: characterStats.find((cs) => cs.characterId === c.id)?.abilities ?? [],
    })),
    { name: enemy.name, abilities: enemy.abilities },
  ];
  const startPhaseEffects: Array<{ abilityId: AbilityId; actionName: string; effectLabel: string; multipliersByLevel: Record<number, number> }> = [
    { abilityId: 'mutual_physical_amplify', actionName: '物理増幅', effectLabel: '双方物理ダメージ', multipliersByLevel: MUTUAL_PHYSICAL_AMPLIFY_MULTIPLIERS },
    { abilityId: 'mutual_physical_restraint', actionName: '物理抑制', effectLabel: '双方物理ダメージ', multipliersByLevel: MUTUAL_PHYSICAL_RESTRAINT_MULTIPLIERS },
    { abilityId: 'mutual_magic_amplify', actionName: '魔法増幅', effectLabel: '双方魔法ダメージ', multipliersByLevel: MUTUAL_MAGIC_AMPLIFY_MULTIPLIERS },
    { abilityId: 'mutual_magic_restraint', actionName: '魔法抑制', effectLabel: '双方魔法ダメージ', multipliersByLevel: MUTUAL_MAGIC_RESTRAINT_MULTIPLIERS },
  ];

  const resolveStartPhaseTriggerTiming = (timing: number): void => {
    if (timing === 9) {
      for (const owner of oblivionOwners) {
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

      if (enemyHasOblivion && characterStats.length > 0) {
        const targetIndex = Math.floor(Math.random() * characterStats.length);
        const target = characterStats[targetIndex];
        const targetName = party.characters.find((char) => char.id === target.characterId)?.name ?? '味方';
        const targetValidAbilities = target.abilities.filter((ability) => ability.level > 0);

        if (targetValidAbilities.length > 0) {
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
    }

    if (timing === 8) {
      for (const owner of mimicOwners) {
        const enemyValidAbilities = enemy.abilities.filter(
          (ability) => ability.level > 0 && ability.id !== 'mimic' && ability.id !== 'oblivion',
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

      if (enemyHasMimic && characterStats.length > 0) {
        const targetIndex = Math.floor(Math.random() * characterStats.length);
        const target = characterStats[targetIndex];
        const targetName = party.characters.find((char) => char.id === target.characterId)?.name ?? '味方';
        const targetValidAbilities = target.abilities.filter(
          (ability) => ability.level > 0 && ability.id !== 'mimic' && ability.id !== 'oblivion',
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
    }

    if (timing === 7) {
      for (const partyEffect of partyEffects) {
        if (partyEffect) {
          log.push(partyEffect);
        }
      }
    }

    if (timing === 3) {
      for (const ownerName of activeMagicSealQueue) {
        log.push(getMagicSealStartLog(ownerName));
      }

      if (partyHasFrostbite) {
        const frostbiteOwner = party.characters.find(c => {
          const stats = characterStats.find(candidate => candidate.characterId === c.id);
          return stats ? hasAbility(stats.abilities, 'frostbite') : false;
        });
        pushFrostbiteLog(frostbiteOwner?.name ?? '味方');
      }

      if (enemyHasFrostbite) {
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
        hasSlow: hasAbility(enemy.abilities, 'slow'),
        affectedByFrostbite: partyHasFrostbite,
      })
      : null;
    const characterInitiative = characterStats
      .filter(cs => isEligibleCharacterForPhase(phase, cs))
      .map(cs => ({
        stats: cs,
        roll: rollInitiative(getFirstStrikeLevel(cs), {
          fertilityBonus: hasFertilityInitiativeBonus ? 1 : 0,
          hasSlow: hasAbility(cs.abilities, 'slow'),
          affectedByFrostbite: enemyHasFrostbite,
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

      const enemyHowlLevel = getEnemyAbilityLevel(enemy, 'howl');
      if (enemyHowlLevel > 0) {
        pendingEnemyHowlEffect = {
          multiplier: getHowlNoAMultiplier(enemyHowlLevel),
          ownerName: enemy.name,
          note: getHowlNote(enemyHowlLevel),
        };
      }

      const partyHowlEntries = characterStats
        .map((stats) => ({
          level: getAbilityLevel(stats, 'howl'),
          ownerName: party.characters.find((char) => char.id === stats.characterId)?.name ?? '味方',
          stats,
        }))
        .filter((entry) => entry.level > 0)
        .sort((a, b) => a.stats.row - b.stats.row);

      if (enemyHowlLevel > 0) {
        log.push({
          phase,
          initiativeRoll: 2,
          actor: 'triggered',
          action: `${enemy.name} が遠吠えをした！`,
          note: getHowlNote(enemyHowlLevel),
        });
      }

      for (const entry of partyHowlEntries) {
        pendingPartyHowlEffect = {
          multiplier: getHowlNoAMultiplier(entry.level),
          ownerName: entry.ownerName,
          note: getHowlNote(entry.level),
          characterId: entry.stats.characterId,
        };
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

    const triggerFlyingAtTiming = (timing: number): void => {
      if (phase !== 'close' || timing !== 9 || hasTriggeredFlying) return;
      hasTriggeredFlying = true;
      if (enemyHp <= 0 || partyHp <= 0) return;

      const enemyFlyingLevel = getEnemyAbilityLevel(enemy, 'flying');
      if (enemyFlyingLevel > 0) {
        partyFlyingNoAMultiplier *= getFlyingNoAMultiplier(enemyFlyingLevel);
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
        enemyFlyingNoAMultiplier *= getFlyingNoAMultiplier(entry.level);
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
        const target = resolveEnemyTarget(row, characterStats, 'close');
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
          if (success) {
            characterStats = characterStats.map((stats) => (
              stats.characterId === target.characterId
                ? { ...stats, hasAntagonism: true }
                : stats
            ));
            ctx = {
              ...ctx,
              characterStats,
            };
          }

          const targetName = party.characters.find((char) => char.id === target.characterId)?.name ?? '味方';
          log.push({
            phase,
            initiativeRoll: timing,
            actor: 'triggered',
            action: buildConfusionAction(enemy.name, targetName, success),
            note: getConfusionNote(enemyConfusionLevel, success),
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
        if (success) {
          enemyHasAntagonism = true;
        }

        log.push({
          phase,
          initiativeRoll: timing,
          actor: 'triggered',
          characterId: entry.stats.characterId,
          action: buildConfusionAction(entry.ownerName, enemy.name, success),
          note: getConfusionNote(entry.level, success),
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
        const target = resolveEnemyTarget(targetRow, characterStats, 'close')
          ?? characterStats[Math.floor(Math.random() * characterStats.length)]
          ?? null;

        const targetName = target
          ? party.characters.find((char) => char.id === target.characterId)?.name ?? '味方'
          : '味方';
        const targetDefenseAmplifier = target
          ? Math.max(0.01, target.physicalDefenseAmplifier + target.deityDefenseAmplifierBonus.physical)
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
          enemyHasActedInBattle = true;

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
        const howlEffect = baseNoA > 0 ? consumePendingPartyHowlEffect() : null;
        const noA = Math.ceil(baseNoA * (howlEffect?.multiplier ?? 1.0) * (phase === 'close' ? enemyFlyingNoAMultiplier : 1.0));
        if (noA <= 0) continue;
        if (enemyHasNoOffense(enemy)) continue;
        if (enemyHasAntagonism) continue;

        const magicalCounterCandidates = new Map<number, ComputedCharacterStats>();

        const runEnemyAttack = (attempts: number, isReAttack = false): void => {
          if (attempts <= 0 || partyHp <= 0 || enemyHp <= 0) return;

          const attacksByTarget = new Map<number, {
            hitDamages: number[];
            totalAttempts: number;
            charStats: ComputedCharacterStats;
            ambushMultiplier: number;
          }>();
          const enemyAccuracyPotency = 1.0;
          const enemyAccuracyBonus = enemy.accuracyBonus + enemyPhaseAccuracyBonus;
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
              ambushMultiplier: 1.0,
            };
            targetAttack.totalAttempts += 1;

            const ambushAmplifier = getAmbushAmplifier(
              enemy.abilities,
              // When the enemy attacks, the "opponent" for a.ambush is the targeted party member.
              characterActedInBattleIds.has(targetCharStats.characterId),
              !isReAttack,
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
                enemyOffenseAmplifierMultiplier * ambushAmplifier,
              );
              targetAttack.hitDamages.push(Math.max(1, Math.floor(singleDamage * resonanceAmplifier)));
            }

            targetAttack.ambushMultiplier = Math.max(targetAttack.ambushMultiplier, ambushAmplifier);

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
          const enemyResonanceLogText = getResonanceLogText(resonanceActor.abilities, enemySuccessfulHits, phase === 'mid');

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
            return;
          }

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
            let reflectedDamage = 0;
            let reflectedSourceDamage = 0;
            let absorbedDamage = 0;
            let avoidedByStealth = false;
            const avoidedByPartyIllusion = isPartyIllusionActive(phase, characterStats, consumedPartyIllusion);
            const avoidedByIllusion = avoidedByPartyIllusion || isIllusionActive(
              phase,
              hasIllusion(attack.charStats),
              `character:${charId}`,
              consumedIllusionStateIds,
            );

            const defensiveReaction = getDefensiveReaction(phase, enemy.elementalOffense, attack.charStats.abilities);
            const reflect = defensiveReaction?.type === 'reflect' ? defensiveReaction.descriptor : null;
            const absorb = defensiveReaction?.type === 'absorb' ? defensiveReaction.descriptor : null;
            const nullify = defensiveReaction?.type === 'nullify' ? defensiveReaction.descriptor : null;
            const shouldTriggerShock = !isReAttack && phase === 'close' && isCharacterShockAvailable(attack.charStats);
            const hitDamagesToApply = shouldTriggerShock && attack.hitDamages.length > 1
              ? attack.hitDamages.slice(0, 1)
              : attack.hitDamages;
            if (avoidedByIllusion) {
              if (avoidedByPartyIllusion) {
                consumedPartyIllusion = true;
              } else {
                consumedIllusionStateIds.add(`character:${charId}`);
              }
            } else {
              for (const hitDamage of hitDamagesToApply) {
                if (isStealthActive(attack.charStats, partyHp, partyStats.hp)) {
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
                    action: buildShockAction(enemy.name, targetName),
                    note: '(感電:攻撃中断)',
                    noteTone: 'muted' as const,
                    hideInitiativeLabel: true,
                  };
                })()
              : null;

            const reflectedAttemptText = enemyResonanceLogText
              ? `${appliedHits}/${attack.totalAttempts}回, ${enemyResonanceLogText.slice(1, -1)}`
              : `${appliedHits}/${attack.totalAttempts}回`;

            triggerPartyDefeatRecovery(attack.charStats, phase, turn.roll, true);

            const enemyAttackRageBonusPercent = toRageBonusPercent(getEnemyRageAmplifier(enemy, enemyHp));
            const enemyAttackSwarmBonuses = getSwarmLogBonuses(enemy.abilities, enemyHp, enemy.hp, attack.charStats.abilities, partyHp, partyStats.hp);
            const enemyAttackAmbushMultiplier = attack.ambushMultiplier;
            if (reflectedDamage > 0 && reflect) {
              log.push({
                phase,
                initiativeRoll: turn.roll,
                actor: 'enemy',
                action: phase === 'mid'
                  ? `${enemy.name} が${attackName}を唱えたが反射された！ (${reflectedAttemptText})`
                  : `${enemy.name} の${reflect.summary}攻撃は反射された！ (${reflectedAttemptText})`,
                damage: appliedDamage,
                reflectedDamage,
                reflectedSourceDamage,
                reflectTarget: 'enemy',
                hits: appliedHits,
                totalAttempts: attack.totalAttempts,
                wasNegated: appliedHits === 0 && (avoidedByIllusion || avoidedByStealth) ? true : undefined,
                rageBonusPercent: phase === 'mid' ? undefined : (enemyAttackRageBonusPercent > 0 ? enemyAttackRageBonusPercent : undefined),
                ambushMultiplier: enemyAttackAmbushMultiplier > 1.0 ? enemyAttackAmbushMultiplier : undefined,
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
                ambushMultiplier: enemyAttackAmbushMultiplier > 1.0 ? enemyAttackAmbushMultiplier : undefined,
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
                ambushMultiplier: enemyAttackAmbushMultiplier > 1.0 ? enemyAttackAmbushMultiplier : undefined,
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
                  : `${targetName} に${attackName}！${enemyResonanceLogText}`,
                damage: appliedDamage > 0 ? appliedDamage : undefined,
                hits: appliedHits,
                totalAttempts: attack.totalAttempts,
                wasNegated: appliedHits === 0 && (avoidedByIllusion || avoidedByStealth) ? true : undefined,
                rageBonusPercent: phase === 'mid' ? undefined : (enemyAttackRageBonusPercent > 0 ? enemyAttackRageBonusPercent : undefined),
                ambushMultiplier: enemyAttackAmbushMultiplier > 1.0 ? enemyAttackAmbushMultiplier : undefined,
                ...enemyAttackSwarmBonuses,
                isReAttack: isReAttack || undefined,
                isEnemyTargetHit: phase === 'mid' ? true : undefined,
                elementalOffense: enemy.elementalOffense,
              });
            }

            if (shockEffectLog) {
              log.push(shockEffectLog);
            }

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

            if (
              phase === 'mid'
              && appliedDamage > 0
              && getMagicalCounterNoAMultiplier(attack.charStats) > 0
              && getEnemyAbilityLevel(enemy, 'null_counter') <= 0
            ) {
              magicalCounterCandidates.set(charId, attack.charStats);
            }

            const deferEnemyCloseReactiveAbilities = phase === 'close'
              && partyHp > 0
              && enemyHp > 0
              && appliedDamage > 0
              && hasCounter(attack.charStats, phase);
            if (phase === 'close' && !deferEnemyCloseReactiveAbilities) {
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
              getCounterNoAMultiplier(attack.charStats) * (phase === 'close' ? partyFlyingNoAMultiplier : 1.0),
              phase === 'close' ? (temporaryAccuracyBonusByCharacterId.get(charId) ?? 0) : 0,
              resolveCharacterOffenseAmplifierMultiplier(charId),
            );
            if (counterResult.totalAttempts <= 0) continue;

            addEnemyHitsReceived(counterResult.hits);
            const counterDealtDamage = counterResult.damage > 0;
            if (counterDealtDamage) {
              applyEnemyDamage(counterResult.damage);
            }

            const counterType = phase === 'mid' ? '魔法反撃' : '反撃';
            const resonanceLogText = getResonanceLogText(attack.charStats.abilities, counterResult.hits, phase === 'mid' || (phase === 'long' && partyDeityKey === 'God of Resonance'));
            const characterCounterRageBonusPercent = toRageBonusPercent(getCharacterRageAmplifier(attack.charStats, partyHp, partyStats.hp));
            const characterCounterMomentumBonusPercent = toMomentumBonusPercent(getCharacterMomentumAmplifier(attack.charStats, partyHp, partyStats.hp));
            const characterCounterSwarmBonuses = getSwarmLogBonuses(attack.charStats.abilities, partyHp, partyStats.hp, enemy.abilities, enemyHp, enemy.hp);
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

            const reCounterAttempts = Math.ceil(getEnemyNoA(phase, enemy) * enemyReCounterNoAMultiplier);
            if (reCounterAttempts <= 0) {
              continue;
            }

            let reCounterDamage = 0;
            let reCounterHits = 0;
            for (let i = 1; i <= reCounterAttempts; i++) {
              const didHit = hitDetection(1.0, enemy.accuracyBonus + enemyPhaseAccuracyBonus, attack.charStats.evasionBonus, i, phase, getDeflectionLevel(attack.charStats), getEnemyFocusLevel(enemy));
              if (!didHit) continue;
              reCounterHits += 1;
              reCounterDamage += calculateSingleEnemyAttackDamage(phase, enemy, characterStats, attack.charStats, enemyHp, partyHp, partyStats.hp, environment.terrainEffect, enemyOffenseAmplifierMultiplier);
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
              applyPartyDamage(reCounterDamage);
            }

            triggerPartyDefeatRecovery(
              attack.charStats,
              phase,
              turn.roll,
              true,
            );

            const enemyReCounterRageBonusPercent = toRageBonusPercent(getEnemyRageAmplifier(enemy, enemyHp));
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
              ...enemyReCounterSwarmBonuses,
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

            if (phase === 'close' && partyHp > 0 && enemyHp > 0) {
              applyEnemyCloseReactiveAbilities(
                attack.charStats,
                targetName,
                appliedHits,
                appliedDamage,
                turn.roll,
              );
            }

            if (partyHp <= 0) break;
          }
        };

        runEnemyAttack(noA, false);
        if (enemyHasReAttack(enemy) && enemyHp > 0 && partyHp > 0) {
          runEnemyAttack(Math.ceil(baseNoA * getEnemyReAttackNoAMultiplier(enemy) * (phase === 'close' ? enemyFlyingNoAMultiplier : 1.0)), true);
        }

        if (phase === 'mid' && enemyHp > 0 && partyHp > 0 && getEnemyAbilityLevel(enemy, 'null_counter') <= 0) {
          for (const [charId, magicalCounterStats] of magicalCounterCandidates) {
            if (enemyHp <= 0 || partyHp <= 0) break;

            const magicalCounterChar = party.characters.find(c => c.id === charId);
            if (!magicalCounterChar) continue;

            const magicalCounterNoAMultiplier = getMagicalCounterNoAMultiplier(magicalCounterStats);
            if (magicalCounterNoAMultiplier <= 0) continue;

            const magicalCounterResult = calculateCharacterDamage('mid', magicalCounterStats, magicalCounterChar, enemy, enemyHp, characterStats, partyStats, partyHp, partyDeityKey, environment.terrainEffect, magicalCounterNoAMultiplier, 0, resolveCharacterOffenseAmplifierMultiplier(charId));
            if (magicalCounterResult.totalAttempts <= 0) continue;

            addEnemyHitsReceived(magicalCounterResult.hits);
            const magicalCounterDealtDamage = magicalCounterResult.damage > 0;
            if (magicalCounterDealtDamage) {
              applyEnemyDamage(magicalCounterResult.damage);
            }

            const resonanceLogText = getResonanceLogText(magicalCounterStats.abilities, magicalCounterResult.hits, true);
            const magicalCounterRageBonusPercent = toRageBonusPercent(getCharacterRageAmplifier(magicalCounterStats, partyHp, partyStats.hp));
            const magicalCounterMomentumBonusPercent = toMomentumBonusPercent(getCharacterMomentumAmplifier(magicalCounterStats, partyHp, partyStats.hp));
            const magicalCounterSwarmBonuses = getSwarmLogBonuses(magicalCounterStats.abilities, partyHp, partyStats.hp, enemy.abilities, enemyHp, enemy.hp);
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

      movedCharacterIds.add(cs.characterId);
      characterActedInBattleIds.add(cs.characterId);

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

      const baseNoA = getCharacterNoAForPhase(phase, cs);
      const howlEffect = baseNoA > 0 ? consumePendingEnemyHowlEffect() : null;
      const flyingNoAMultiplier = phase === 'close' ? partyFlyingNoAMultiplier : 1.0;
      if (hasNoOffense(cs)) continue;

      const characterPhaseAccuracyBonus = phase === 'close' ? (temporaryAccuracyBonusByCharacterId.get(cs.characterId) ?? 0) : 0;

      const runCharacterAttack = (noAMultiplier: number, isReAttack = false): CharacterAttackResult | null => {
        const isAntagonism = cs.hasAntagonism;
        const magicProfile = resolveMagicProfile({
          style: 'multi-hit',
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
            rageBonusPercent: toRageBonusPercent(getCharacterRageAmplifier(cs, partyHp, partyStats.hp)) || undefined,
            momentumBonusPercent: cs.abilities.some(a => a.id === 'momentum')
              ? toMomentumBonusPercent(getCharacterMomentumAmplifier(cs, partyHp, partyStats.hp))
              : undefined,
            ...characterMagicSealSwarmBonuses,
            isReAttack: isReAttack || undefined,
            wasNegated: true,
            elementalOffense: cs.elementalOffense,
          });

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

        if (isAntagonism) {
          const candidates = characterStats.filter(target => target.characterId !== cs.characterId);
          if (candidates.length === 0) return null;
          const { row: targetRow, newCtx } = getTargetRow(ctx, phase);
          ctx = newCtx;
          const selected = resolveEnemyTarget(targetRow, candidates, phase) ?? candidates[Math.floor(Math.random() * candidates.length)];
          antagonismTarget = selected;
          antagonismTargetName = party.characters.find(c => c.id === selected.characterId)?.name ?? '???';
          ambushMultiplier = getAmbushAmplifier(
            cs.abilities,
            characterActedInBattleIds.has(selected.characterId),
            !isReAttack,
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
            resolveCharacterOffenseAmplifierMultiplier(cs.characterId) * ambushMultiplier,
          );

          shockEffectLog = phase === 'close' && !isReAttack && isCharacterShockAvailable(selected)
            ? (() => {
                if (result.hits > 1) {
                  result.damage = getShockAdjustedDamage(result.damage, result.hits);
                  result.hits = 1;
                }
                consumeCharacterShock(selected.characterId);
                return {
                  phase,
                  initiativeRoll: turn.roll,
                  actor: 'triggered' as const,
                  characterId: selected.characterId,
                  action: buildShockAction(char.name, antagonismTargetName),
                  note: '(感電:攻撃中断)',
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
            // When a character attacks, the "opponent" for a.ambush is the enemy actor.
            enemyHasActedInBattle,
            !isReAttack,
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
            resolveCharacterOffenseAmplifierMultiplier(cs.characterId) * ambushMultiplier,
          );
          shockEffectLog = phase === 'close' && !isReAttack && isEnemyShockAvailable()
            ? (() => {
                if (result.hits > 1) {
                  result.damage = getShockAdjustedDamage(result.damage, result.hits);
                  result.hits = 1;
                }
                consumeEnemyShock();
                return {
                  phase,
                  initiativeRoll: turn.roll,
                  actor: 'triggered' as const,
                  action: buildShockAction(char.name, enemy.name),
                  note: '(感電:攻撃中断)',
                  noteTone: 'muted' as const,
                  hideInitiativeLabel: true,
                };
              })()
            : null;

          if (
            result.totalAttempts > 0
            && isIllusionActive(phase, getEnemyAbilityLevel(enemy, 'illusion') > 0, 'enemy', consumedIllusionStateIds)
          ) {
            consumedIllusionStateIds.add('enemy');
            result.damage = 0;
            result.hits = 0;
            result.wasNegatedByEnemyIllusion = true;
          }

          const defensiveReaction = getDefensiveReaction(phase, cs.elementalOffense, enemy.abilities);
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

        const resonanceLogText = getResonanceLogText(cs.abilities, result.hits, phase === 'mid' || (phase === 'long' && partyDeityKey === 'God of Resonance'));
        const characterAttackRageBonusPercent = toRageBonusPercent(getCharacterRageAmplifier(cs, partyHp, partyStats.hp));
        const characterAttackMomentumBonusPercent = toMomentumBonusPercent(getCharacterMomentumAmplifier(cs, partyHp, partyStats.hp));
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
          ? getReflectDescriptor(phase, cs.elementalOffense, enemy.abilities)
          : null;
        const absorb = !isAntagonism && result.absorbedDamage && result.absorbedDamage > 0
          ? result.absorbedBy ?? getAbsorbDescriptor(phase, cs.elementalOffense, enemy.abilities)
          : null;
        const nullify = !isAntagonism && result.nullifiedBy ? result.nullifiedBy : null;

        if (reflect) {
          log.push({
            phase,
            initiativeRoll: turn.roll,
            actor: 'character',
            characterId: cs.characterId,
            action: phase === 'mid'
              ? `${char.name} が${attackType}を唱えたが反射された！${resonanceLogText}`
              : `${char.name} の${reflect.summary}攻撃は反射された！${resonanceLogText}`,
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
            ...characterAttackSwarmBonuses,
            isReAttack: isReAttack || undefined,
            wasNegated: result.wasNegatedByEnemyIllusion || undefined,
            elementalOffense: cs.elementalOffense,
          });
        } else if (absorb) {
          log.push({
            phase,
            initiativeRoll: turn.roll,
            actor: 'character',
            characterId: cs.characterId,
            action: phase === 'mid'
              ? `${char.name} が${attackType}を唱えたが吸収された！${resonanceLogText}`
              : `${char.name} の${absorb.summary}攻撃は吸収された！${resonanceLogText}`,
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
            ...characterAttackSwarmBonuses,
            isReAttack: isReAttack || undefined,
            wasNegated: result.wasNegatedByEnemyIllusion || undefined,
            elementalOffense: cs.elementalOffense,
          });
        } else if (nullify) {
          log.push({
            phase,
            initiativeRoll: turn.roll,
            actor: 'character',
            characterId: cs.characterId,
            action: phase === 'mid'
              ? `${char.name} が${attackType}を唱えたが無効化された！${resonanceLogText}`
              : `${char.name} の${nullify.summary}攻撃は無効化された！${resonanceLogText}`,
            damage: 0,
            showZeroDamage: true,
            hits: result.hits,
            totalAttempts: result.totalAttempts,
            rageBonusPercent: characterAttackRageBonusPercent > 0 ? characterAttackRageBonusPercent : undefined,
            momentumBonusPercent: cs.abilities.some(a => a.id === 'momentum')
              ? characterAttackMomentumBonusPercent
              : undefined,
            ambushMultiplier: ambushMultiplier > 1.0 ? ambushMultiplier : undefined,
            ...characterAttackSwarmBonuses,
            isReAttack: isReAttack || undefined,
            wasNegated: result.wasNegatedByEnemyIllusion || undefined,
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
              ? `${antagonismAction ?? `${char.name} は敵対状態！${antagonismTargetName} へ${phase === 'mid' ? `${attackType}を唱えた` : attackType}！`}${resonanceLogText}`
              : phase === 'mid'
                ? `${char.name} が${attackType}を唱えた！${resonanceLogText}`
                : `${char.name} の${attackType}！${resonanceLogText}`,
            damage: result.damage,
            damageTarget: isAntagonism ? 'party' : 'enemy',
            hits: result.hits,
            totalAttempts: result.totalAttempts,
            rageBonusPercent: characterAttackRageBonusPercent > 0 ? characterAttackRageBonusPercent : undefined,
            momentumBonusPercent: cs.abilities.some(a => a.id === 'momentum')
              ? characterAttackMomentumBonusPercent
              : undefined,
            ambushMultiplier: ambushMultiplier > 1.0 ? ambushMultiplier : undefined,
            ...characterAttackSwarmBonuses,
            isReAttack: isReAttack || undefined,
            wasNegated: result.wasNegatedByEnemyIllusion || undefined,
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
            action: `${enemy.name} への攻撃はすべて幻だった！`,
          });
        }

        if (!isAntagonism && result.damage > 0) {
          triggerEnemyDefeatRecovery(phase, turn.roll);
        }

        if (!isAntagonism && enemyHp > 0 && phase === 'close') {
          triggerEnemyCounter(cs, result.damage, enemyInitiativeRoll ?? undefined);
        }

        if (!isAntagonism && phase === 'close') {
          applyCharacterCloseReactiveAbilities(cs, char.name, result, turn.roll);
        }

        return result;
      };

        const firstAttackResult = runCharacterAttack((howlEffect?.multiplier ?? 1.0) * flyingNoAMultiplier, false);
        if (firstAttackResult && enemyHp > 0 && partyHp > 0) {
          triggerCoveringFire(phase, cs, firstAttackResult.hits, turn.roll);
        }

        if (enemyHp <= 0 || partyHp <= 0) continue;

        const reAttackProfile = getReAttackProfile(cs);
        for (let i = 0; i < reAttackProfile.count && enemyHp > 0 && partyHp > 0; i++) {
          const reAttackResult = runCharacterAttack(reAttackProfile.noAMultiplier * flyingNoAMultiplier, true);
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
