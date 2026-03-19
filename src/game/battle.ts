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
} from '../types';
import { computePartyStats } from './partyComputation';
import { getBaseMultiplier } from './baseMultiplier';
import { drawFromBag, createPhysicalThreatBag, createMagicalThreatBag, getBagTicketTotal } from './bags';
import { getDeityKey } from './deity';
import { resolveMagicProfile } from './magic';
import { getAbilityDescription, getAbilityName } from './characterComputation';

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

const CONFUSION_SUCCESS_LOGS = [
  'は target に何かを囁き、仲間を疑い始めた！',
  'の甘い策略に target は引き込まれた！',
  'の影響で target は錯乱した！',
  'が睨みつけ、target の精神は錯乱した！',
  'の精神干渉により target は正常な判断ができなくなった！',
  'は target に幻術をかけ、仲間を敵と誤認した！',
  'の幻惑により target の視界は歪んだ！',
  'の術で target は敵味方の区別を失った！',
  'が植え付けた疑念によって target は見境なく牙を剥いた！',
  'が囁いた禁断の言葉により、target は狂気に囚われた！',
] as const;

const CONFUSION_FAILURE_LOGS = [
  'の策略を target は打ち破った！',
  'の効果は target に通じなかった！',
  'の悪だくみは target によって防がれた！',
  'の混乱は target に効かなかった！',
  'の精神干渉を target は振り払った！',
  'の囁きに対し target は理性を保った！',
  'の幻術を target は見破った！',
  'の術は target に打ち消された！',
  'の見せた幻は target に通用しない！',
  'が語り掛けた誘惑を target は聞きそびれた！',
] as const;

const CONFUSION_NO_TARGET_LOGS = [
  'は策略を巡らせたが、声は風に流され誰にも届かなかった',
  'は幻惑を仕掛けたが、誰も影響を受けなかった',
  'は不和をもたらそうとしたが、誰も近くにいなかった',
  'は策略を巡らせたが、声は誰にも届かなかった',
  'は何かを囁いたが、誰の心にも届かなかった',
  'は混乱を誘おうとしたが、場は静まり返ったままだった',
  'は幻を見せたが、誰もそれを認識しなかった',
  'の幻術は空を切り、誰にも届かなかった',
  'は視界を歪めようとしたが、影響を受ける者はいなかった',
  'の干渉は誰の意識にも届かなかった',
  'は心を乱そうとしたが、影響を与える相手がいなかった',
  'の試みは空振りに終わった',
  'は狂気を広めようとしたが、誰も囚われなかった',
] as const;

const ANTAGONISM_LOGS = {
  long: [
    '{actor} は {target} を敵と誤認し、遠距離攻撃を放った！',
    '{actor} は錯乱し、{target} に矢を放ってしまった！',
    '{actor} は疑念に囚われ、{target} を狙い撃った！',
    '{actor} は味方を敵と見なし、遠距離攻撃を仕掛けた！',
    '{actor} の視界は歪み、{target} を撃ち抜いた！',
    '{actor} は混乱し、{target} に向けて攻撃を放った！',
    '{actor} は仲間を敵と誤認し、遠距離攻撃を行った！',
    '{actor} は理性を失い、{target} を射抜いた！',
    '{actor} は錯乱し、{target} に攻撃を加えた！',
    '{actor} は敵味方の区別を失い、{target} を狙った！',
  ],
  mid: [
    '{actor} は混乱し、{target} に {spell} を放ってしまった！',
    '{actor} は {target} を敵と誤認し、{spell}を発動した！',
    '{actor} の魔力は暴走し、{target} に向けて放たれた！',
    '{actor} は錯乱し、{target} に{spell}を叩き込んだ！',
    '{actor} は理性を失い、{target} に{spell}を放った！',
    '{actor} は仲間を敵と誤認し、魔法攻撃を行った！',
    '{actor} の幻惑は深まり、{target} に魔法を向けた！',
    '{actor} は敵味方の区別を失い、{target} に{spell}を放った！',
    '{actor} は混乱し、{target} に{spell}を発動した！',
    '{actor} の制御を失った魔力が {target} を襲った！',
  ],
  close: [
    '{actor} は敵対状態！ {target} へ攻撃！',
    '{actor} は錯乱している！ {target} へ攻撃してしまった！',
    '{actor} は混乱し、{target} に斬りかかった！',
    '{actor} は {target} を敵と誤認し、攻撃を仕掛けた！',
    '{actor} は理性を失い、{target} に襲いかかった！',
    '{actor} は仲間を敵と見なし、{target} に攻撃した！',
    '{actor} は見境なく、{target} に牙を剥いた！',
    '{actor} は敵味方の区別を失い、{target} に攻撃した！',
    '{actor} は錯乱し、{target} に一撃を加えた！',
    '{actor} は暴走し、{target} に襲いかかった！',
  ],
} as const satisfies Record<BattleActionPhase, readonly string[]>;

const UNSTABLE_CORE_LOGS = {
  long: [
    '{actor} は暴れだし、自らを傷つけた！',
    '{actor} は制御を失い、自身を引き裂いた！',
    '{actor} は錯乱し、自らに攻撃を加えた！',
    '{actor} は苦しみもがき、自傷した！',
    '{actor} は狂乱し、己の身を傷つけた！',
  ],
  mid: [
    '{actor} は錯乱し、自らを傷つけた！',
    '{actor} は暴走し、自身を切り裂いた！',
    '{actor} は理性を失い、自らに攻撃を加えた！',
    '{actor} はもがき苦しみ、自傷した！',
    '{actor} は狂気に呑まれ、自身を傷つけた！',
  ],
} as const satisfies Record<Exclude<BattleActionPhase, 'close'>, readonly string[]>;

const SOUL_REAP_LOGS = [
  '{actor} は {target} に終止符を打った！',
  '{actor} は {target} の魂を刈り取った！',
  '{actor} は {target} の命を摘み取った！',
  '{actor} は {target} に死の刻印を刻んだ！',
  '{actor} は {target} の存在を断ち切った！',
  '{actor} は {target} を無慈悲に葬り去った！',
  '{actor} は {target} の魂を引き剥がした！',
  '{actor} は {target} に逃れられぬ終焉を与えた！',
  '{actor} は {target} をこの世から消し去った！',
  '{actor} は {target} の命脈を断ち切った！',
] as const;

const REGENERATION_LOGS = [
  '{actor} の傷がふさがり始めた！',
  '{actor} の肉体が再生した！',
  '{actor} の傷がみるみる癒えていく！',
  '{actor} は失った力を取り戻した！',
  '{actor} の体が再び動き出した！',
  '{actor} の損傷が回復した！',
  '{actor} の肉が再び繋がった！',
  '{actor} の傷跡が消えていく！',
  '{actor} は再生し、持ち直した！',
  '{actor} の生命力が傷を癒した！',
] as const;

const SELF_DESTRUCT_LOGS = [
  '{actor} は自爆した！',
  '{actor} は体を爆発させた！',
  '{actor} は捨て身の爆発を起こした！',
  '{actor} は己を犠牲に爆ぜた！',
  '{actor} は最期の力を解き放ち、爆発した！',
  '{actor} は崩壊し、周囲を巻き込んだ！',
  '{actor} は全てを投げ打ち、爆発した！',
  '{actor} は暴発し、辺りを吹き飛ばした！',
  '{actor} は断末魔と共に爆ぜた！',
  '{actor} は破裂し、周囲を巻き込んだ！',
] as const;
const DECOMPOSE_LOGS = [
  '{actor} は {target} の防御を崩した！',
  '{actor} は {target} の装備を劣化させた！',
  '{actor} は {target} の体を蝕んだ！',
  '{actor} は {target} の防御を侵食した！',
  '{actor} は {target} の体を弱体化させた！',
  '{actor} は {target} の守りを削り取った！',
  '{actor} は {target} の体制を崩した！',
  '{actor} は {target} の耐久を低下させた！',
  '{actor} は {target} の防御を溶かした！',
  '{actor} は {target} の身体を分解した！',
] as const;

const FREE_LOGS = [
  '{actor} は戦場から離脱した！',
  '{actor} は素早く逃走した！',
  '{actor} は隙を突いて逃げ出した！',
  '{actor} は姿をくらまし、戦闘を離れた！',
  '{actor} は戦いを放棄し、撤退した！',
  '{actor} は煙のように消え去った！',
  '{actor} は機を見て撤退した！',
  '{actor} は一瞬の隙に逃げ去った！',
  '{actor} は戦場から姿を消した！',
  '{actor} は追撃を振り切り、離脱した！',
] as const;

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

  const partyDefenseAbilityAmplifier = getPartyDefenseAbilityAmplifier(phase, characterStats, targetCharStats.row);
  const rageAmplifier = getEnemyRageAmplifier(enemy, enemyHp);
  const mutualAmplifier = getMutualAmplifier(phase, enemy.abilities, targetCharStats.abilities);
  const rawDamage = (attack - defense) * amplifier * elementalMultiplier * defenseAmplifier * partyDefenseAbilityAmplifier * rageAmplifier * mutualAmplifier;
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
  noAMultiplier: number = 1.0,
  temporaryAccuracyBonus: number = 0,
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

  const partyOffenseAmplifier = getPartyOffenseAbilityAmplifier(phase, characterStats, attacker.row);
  const basePerHitDamage = Math.max(1, Math.floor(
    (attack - effectiveDefense)
      * offenseAmplifier
      * attacker.elementalOffenseValue
      * elementalMultiplier
      * defenseAmplifier
      * partyOffenseAmplifier
      * rageAmplifier
      * momentumAmplifier
      * mutualAmplifier
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
  characterStats: ComputedCharacterStats[],
  partyStats: ComputedPartyStats,
  partyHp: number,
  partyDeityKey: string | null,
  noAMultiplier: number = 1.0, // For counter/re-attack, use 0.5
  temporaryAccuracyBonus: number = 0,
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

  const partyOffenseAmplifier = getPartyOffenseAbilityAmplifier(phase, characterStats, charStats.row);
  const basePerHitDamage = Math.max(1, Math.floor(
    (attack - effectiveDefense) * offenseAmplifier * charStats.elementalOffenseValue *
    elementalMultiplier * defenseAmplifier * partyOffenseAmplifier * rageAmplifier * momentumAmplifier * mutualAmplifier
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

function getRegenerationNote(healAmount: number): string {
  return `(✚ ${healAmount})`;
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

function formatDecomposeDefenseValue(value: number): string {
  return `${roundDecomposeDefenseValue(value)}`;
}

function getDecomposeNote(targetName: string, previousDefense: number, nextDefense: number): string {
  return `(${targetName} の 防御力 ${formatDecomposeDefenseValue(previousDefense)} → ${formatDecomposeDefenseValue(nextDefense)})`;
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

function pickRandomEntry<T>(entries: readonly T[]): T {
  return entries[Math.floor(Math.random() * entries.length)];
}

function buildConfusionAction(
  actorName: string,
  targetName: string,
  success: boolean,
): string {
  const template = pickRandomEntry(success ? CONFUSION_SUCCESS_LOGS : CONFUSION_FAILURE_LOGS);
  return `${actorName}${template.split('target').join(targetName)}`;
}

function buildAntagonismAction(
  phase: BattleActionPhase,
  actorName: string,
  targetName: string,
  spellName: string | null,
): string {
  const template = pickRandomEntry(ANTAGONISM_LOGS[phase]);
  return template
    .replace(/\{actor\}/g, actorName)
    .replace(/\{target\}/g, targetName)
    .replace(/\{spell\}/g, spellName ?? '魔法');
}

function buildUnstableCoreAction(
  phase: Exclude<BattleActionPhase, 'close'>,
  actorName: string,
): string {
  return pickRandomEntry(UNSTABLE_CORE_LOGS[phase]).replace(/\{actor\}/g, actorName);
}

function getUnstableCoreNote(level: number): string {
  return `(残HP ${getUnstableCoreDamagePercent(level)}%の自傷ダメージ)`;
}

function buildSoulReapAction(actorName: string, targetName: string): string {
  return pickRandomEntry(SOUL_REAP_LOGS)
    .replace(/\{actor\}/g, actorName)
    .replace(/\{target\}/g, targetName);
}

function buildRegenerationAction(actorName: string): string {
  return pickRandomEntry(REGENERATION_LOGS).replace(/\{actor\}/g, actorName);
}

function buildSelfDestructAction(actorName: string): string {
  return pickRandomEntry(SELF_DESTRUCT_LOGS).replace(/\{actor\}/g, actorName);
}

function buildDecomposeAction(actorName: string, targetName: string): string {
  return pickRandomEntry(DECOMPOSE_LOGS)
    .replace(/\{actor\}/g, actorName)
    .replace(/\{target\}/g, targetName);
}

function buildFreeAction(actorName: string): string {
  return pickRandomEntry(FREE_LOGS).replace(/\{actor\}/g, actorName);
}

function getRandomPartyMemberName(party: Party): string {
  if (party.characters.length === 0) return party.name;
  return pickRandomEntry(party.characters).name;
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

function getConfusionNoTargetLog(
  _phase: BattleActionPhase,
  actorName: string,
): Pick<BattleLogEntry, 'action' | 'note'> {
  const action = pickRandomEntry(CONFUSION_NO_TARGET_LOGS);
  return {
    action: `${actorName}${action}`,
    note: '(混乱-対象なし)',
  };
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
}

// SpecRef: 6.1.1.1 | START phase | actor.a.oblivion
// SpecRef: 6.1.1.1 | START phase | actor.a.mimic
// SpecRef: 6.1.1.2 | LONG, MID, CLOSE phase | Speed & Turn Order (Rolling Dice Rule)
// SpecRef: 6.1.1.3 | END phase | Goddess of Restoration effect
// SpecRef: 6.1.1.3 | END phase | God of Attrition effect
// SpecRef: 6.1.1.3 | END phase | c.unlock, reward log
// SpecRef: 6.1.3.1 | Actor action | f.NoA
// SpecRef: 6.1.3.1 | Actor action | f.targeting
// SpecRef: 6.1.3.1 | Actor action | f.hit_detection
// SpecRef: 6.1.3.1 | Actor action | f.damage_calculation
// SpecRef: 6.1.3.2 | Chain move trigger | Counter
// SpecRef: 6.1.3.2 | Chain move trigger | Re-counter
// SpecRef: 6.1.3.2 | Chain move trigger | Re-attack
// SpecRef: 6.1.3.2 | Chain move trigger | Magical counter
// SpecRef: 6.1.3.2 | Chain move trigger | Covering fire
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
  let partyDamageTakenInBattle = 0;
  let enemyDamageTakenInBattle = 0;
  let enemyHasAntagonism = false;
  const log: BattleLogEntry[] = [];

  const partyDeityKey = getDeityKey(party.deity.name);

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

  for (const owner of oblivionOwners) {
    const enemyValidAbilities = enemy.abilities.filter((ability) => ability.level > 0);
    if (enemyValidAbilities.length === 0) {
      continue;
    }

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

  const mimicOwners = characterStats
    .filter((stats) => getAbilityLevel(stats, 'mimic') >= 1)
    .map((stats) => ({
      name: party.characters.find((char) => char.id === stats.characterId)?.name ?? '味方',
      stats,
    }));
  const enemyHasMimic = getEnemyAbilityLevel(enemy, 'mimic') >= 1;

  for (const owner of mimicOwners) {
    const enemyValidAbilities = enemy.abilities.filter(
      (ability) => ability.level > 0 && ability.id !== 'mimic' && ability.id !== 'oblivion',
    );
    if (enemyValidAbilities.length === 0) {
      continue;
    }

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

  const remainingNullCounterByCharacterId = createNullCounterPool(characterStats);
  const consumedResurrectCharacterIds = new Set<number>();
  let consumedEnemyResurrect = false;
  const consumedIllusionStateIds = new Set<string>();
  let consumedPartyIllusion = false;
  const activeMagicSealQueue = createMagicSealQueue(party, characterStats, enemy);
  let pendingEnemyHowlEffect: PendingHowlEffect | null = null;
  let pendingPartyHowlEffect: PendingHowlEffect | null = null;
  let enemyTemporaryAccuracyBonus = 0;
  const temporaryAccuracyBonusByCharacterId = new Map<number, number>();
  let forcedOutcome: BattleOutcome | null = null;
  let forcedOutcomePhase: BattleActionPhase = 'close';

  for (const ownerName of activeMagicSealQueue) {
    log.push(getMagicSealStartLog(ownerName));
  }

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
  });

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

  const triggerEnemyResurrect = (phase: BattleActionPhase, initiativeRoll?: number): void => {
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

  for (const partyEffect of partyEffects) {
    if (partyEffect) {
      log.push(partyEffect);
    }
  }

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

    const singleDamage = calculateSingleEnemyAttackDamage('close', enemy, characterStats, targetCharStats, enemyHp);
    const enemyCloseAccuracyBonus = enemyTemporaryAccuracyBonus;
    const attempts = Math.ceil(getEnemyNoA('close', enemy) * counterNoAMultiplier);
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

    const reCounterResult = calculateCharacterDamage('close', targetCharStats, targetChar, enemy, characterStats, partyStats, partyHp, partyDeityKey, reCounterNoAMultiplier, temporaryAccuracyBonusByCharacterId.get(targetCharStats.characterId) ?? 0);
    if (reCounterResult.totalAttempts <= 0) {
      return;
    }

    const reCounterDealtDamage = reCounterResult.damage > 0;
    if (reCounterDealtDamage) {
      applyEnemyDamage(reCounterResult.damage);
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

      const coveringFireResult = calculateCharacterDamage('long', coverCharStats, coverChar, enemy, characterStats, partyStats, partyHp, partyDeityKey, coveringFireNoAMultiplier);
      if (coveringFireResult.totalAttempts <= 0) continue;

      if (isIllusionActive('long', getEnemyAbilityLevel(enemy, 'illusion') > 0, 'enemy', consumedIllusionStateIds)) {
        consumedIllusionStateIds.add('enemy');
        coveringFireResult.damage = 0;
        coveringFireResult.hits = 0;
        coveringFireResult.wasNegatedByEnemyIllusion = true;
      }

      const coveringFireDealtDamage = coveringFireResult.damage > 0;
      if (coveringFireDealtDamage) {
        applyEnemyDamage(coveringFireResult.damage);
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
            note: getRegenerationNote(healAmount),
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
          note: getRegenerationNote(healAmount),
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
            note: getDecomposeNote(targetName, previousDefense, nextDefense),
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
          note: getDecomposeNote(enemy.name, previousDefense, nextDefense),
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
          const noTargetLog = getConfusionNoTargetLog(phase, enemy.name);
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
          const noTargetLog = getConfusionNoTargetLog(phase, entry.ownerName);
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
          action: buildSelfDestructAction(enemy.name),
          damage: damage > 0 ? damage : undefined,
          damageTarget: 'party',
        });
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
          enemy.defenseAmplifier,
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
          action: buildSelfDestructAction(entry.ownerName),
          damage: damage > 0 ? damage : undefined,
          damageTarget: 'enemy',
        });
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

    for (const turn of turnOrder) {
      if (enemyHp <= 0 || partyHp <= 0) break;
      if (phase === 'long' && turn.roll <= 2) {
        triggerLongPhaseHowl();
      }
      if (turn.roll <= 9) {
        triggerRegenerationAtTiming(9);
        triggerPredatorSenseAtTiming(9);
        if (forcedOutcome) {
          return buildBattleResult(forcedOutcomePhase, forcedOutcome);
        }
      }
      if (turn.roll <= 3) {
        if (triggerFreeAtTiming(phase, 3)) {
          return buildBattleResult(forcedOutcomePhase, forcedOutcome!);
        }
      }
      if (turn.roll <= 2) {
        if (triggerFreeAtTiming(phase, 2)) {
          return buildBattleResult(forcedOutcomePhase, forcedOutcome!);
        }
        triggerDecomposeAtTiming(2);
        triggerConfusionAtTiming(2);
        if (forcedOutcome) {
          return buildBattleResult(forcedOutcomePhase, forcedOutcome);
        }
        triggerSelfDestructAtTiming(2);
        if (partyHp <= 0 || enemyHp <= 0) {
          break;
        }
      }
      if (turn.roll <= 1) {
        if (triggerFreeAtTiming(phase, 1)) {
          return buildBattleResult(forcedOutcomePhase, forcedOutcome!);
        }
        triggerConfusionAtTiming(1);
        if (forcedOutcome) {
          return buildBattleResult(forcedOutcomePhase, forcedOutcome);
        }
      }

      if (turn.kind === 'enemy') {
        enemyHasMovedInPhase = true;

        const baseNoA = getEnemyNoA(phase, enemy);
        const enemyPhaseAccuracyBonus = phase === 'close' ? enemyTemporaryAccuracyBonus : 0;
        const howlEffect = baseNoA > 0 ? consumePendingPartyHowlEffect() : null;
        const noA = Math.ceil(baseNoA * (howlEffect?.multiplier ?? 1.0));
        if (noA <= 0) continue;
        if (enemyHasAntagonism) continue;

        const magicalCounterCandidates = new Map<number, ComputedCharacterStats>();

        const runEnemyAttack = (attempts: number, isReAttack = false): void => {
          if (attempts <= 0 || partyHp <= 0 || enemyHp <= 0) return;

          const attacksByTarget = new Map<number, { hitDamages: number[]; totalAttempts: number; charStats: ComputedCharacterStats }>();
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
            };
            targetAttack.totalAttempts += 1;

            if (didHit) {
              enemySuccessfulHits += 1;
              const resonanceAmplifier = phase === 'mid'
                ? getResonanceAmplifier(enemyResonanceLevel, enemySuccessfulHits)
                : 1.0;
              const singleDamage = calculateSingleEnemyAttackDamage(phase, enemy, characterStats, targetCharStats, enemyHp);
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
              triggerEnemyResurrect(phase, turn.roll);
            }

            const reflectedAttemptText = enemyResonanceLogText
              ? `${appliedHits}/${attack.totalAttempts}回, ${enemyResonanceLogText.slice(1, -1)}`
              : `${appliedHits}/${attack.totalAttempts}回`;

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
                isReAttack: isReAttack || undefined,
                isEnemyTargetHit: phase === 'mid' ? true : undefined,
                elementalOffense: enemy.elementalOffense,
              });
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
              characterStats,
              partyStats,
              partyHp,
              partyDeityKey,
              getCounterNoAMultiplier(attack.charStats),
              phase === 'close' ? (temporaryAccuracyBonusByCharacterId.get(charId) ?? 0) : 0,
            );
            if (counterResult.totalAttempts <= 0) continue;

            const counterDealtDamage = counterResult.damage > 0;
            if (counterDealtDamage) {
              applyEnemyDamage(counterResult.damage);
            }

            const counterType = phase === 'mid' ? '魔法反撃' : '反撃';
            const resonanceLogText = getResonanceLogText(attack.charStats.abilities, counterResult.hits, phase === 'mid' || (phase === 'long' && partyDeityKey === 'God of Resonance'));
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
              const didHit = hitDetection(1.0, enemy.accuracyBonus + enemyPhaseAccuracyBonus, attack.charStats.evasionBonus, i, phase, getDeflectionLevel(attack.charStats), getEnemyFocusLevel(enemy));
              if (!didHit) continue;
              reCounterHits += 1;
              reCounterDamage += calculateSingleEnemyAttackDamage(phase, enemy, characterStats, attack.charStats, enemyHp);
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
          runEnemyAttack(Math.ceil(baseNoA * getEnemyReAttackNoAMultiplier(enemy)), true);
        }

        if (phase === 'mid' && enemyHp > 0 && partyHp > 0 && getEnemyAbilityLevel(enemy, 'null_counter') <= 0) {
          for (const [charId, magicalCounterStats] of magicalCounterCandidates) {
            if (enemyHp <= 0 || partyHp <= 0) break;

            const magicalCounterChar = party.characters.find(c => c.id === charId);
            if (!magicalCounterChar) continue;

            const magicalCounterNoAMultiplier = getMagicalCounterNoAMultiplier(magicalCounterStats);
            if (magicalCounterNoAMultiplier <= 0) continue;

            const magicalCounterResult = calculateCharacterDamage('mid', magicalCounterStats, magicalCounterChar, enemy, characterStats, partyStats, partyHp, partyDeityKey, magicalCounterNoAMultiplier);
            if (magicalCounterResult.totalAttempts <= 0) continue;

            const magicalCounterDealtDamage = magicalCounterResult.damage > 0;
            if (magicalCounterDealtDamage) {
              applyEnemyDamage(magicalCounterResult.damage);
            }

            const resonanceLogText = getResonanceLogText(magicalCounterStats.abilities, magicalCounterResult.hits, true);
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

      const cs = characterStats.find((stats) => stats.characterId === turn.stats.characterId) ?? turn.stats;
      const char = party.characters.find(c => c.id === cs.characterId);
      if (!char) continue;

      movedCharacterIds.add(cs.characterId);

      const baseNoA = getCharacterNoAForPhase(phase, cs);
      const howlEffect = baseNoA > 0 ? consumePendingEnemyHowlEffect() : null;

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

        if (isAntagonism) {
          const candidates = characterStats.filter(target => target.characterId !== cs.characterId);
          if (candidates.length === 0) return null;
          const { row: targetRow, newCtx } = getTargetRow(ctx, phase);
          ctx = newCtx;
          const selected = resolveEnemyTarget(targetRow, candidates, phase) ?? candidates[Math.floor(Math.random() * candidates.length)];
          antagonismTarget = selected;
          result = calculateCharacterFriendlyFireDamage(phase, cs, selected, characterStats, partyStats, partyHp, partyDeityKey, noAMultiplier, characterPhaseAccuracyBonus);
          if (result.damage > 0) {
            applyPartyDamage(result.damage);

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
          result = calculateCharacterDamage(phase, cs, char, enemy, characterStats, partyStats, partyHp, partyDeityKey, noAMultiplier, characterPhaseAccuracyBonus);
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

          if (result.damage > 0) {
            applyEnemyDamage(result.damage);
          }

          const selfReflectedResurrect = (
            (result.reflectedDamage ?? 0) > 0
            && partyHp <= 0
            && hasResurrect(cs)
            && !consumedResurrectCharacterIds.has(cs.characterId)
          );
          if (selfReflectedResurrect) {
            const resurrectLevel = getResurrectLevel(cs);
            partyHp = resurrectLevel >= 2
              ? Math.max(1, Math.ceil(partyStats.hp * 0.01))
              : 1;
            consumedResurrectCharacterIds.add(cs.characterId);
            log.push({
              phase,
              actor: 'character',
              characterId: cs.characterId,
              action: `${char.name} は致命ダメージを食いしばって耐えた！`,
            });
          }
        }

        if (result.totalAttempts <= 0) return null;

        const resonanceLogText = getResonanceLogText(cs.abilities, result.hits, phase === 'mid' || (phase === 'long' && partyDeityKey === 'God of Resonance'));
        const characterAttackRageBonusPercent = toRageBonusPercent(getCharacterRageAmplifier(cs, partyHp, partyStats.hp));
        const characterAttackMomentumBonusPercent = toMomentumBonusPercent(getCharacterMomentumAmplifier(cs, partyHp, partyStats.hp));
        const antagonismTargetName = antagonismTarget
          ? (party.characters.find(c => c.id === antagonismTarget.characterId)?.name ?? '???')
          : null;
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
            isReAttack: isReAttack || undefined,
            wasNegated: result.wasNegatedByEnemyIllusion || undefined,
            elementalOffense: cs.elementalOffense,
          });
        }

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
          triggerEnemyCounter(cs, result.damage, enemyInitiativeRoll ?? undefined);
        }

        return result;
      };

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

    if (phase === 'long') {
      triggerLongPhaseHowl();
    }
    triggerRegenerationAtTiming(9);
    triggerPredatorSenseAtTiming(9);
    if (forcedOutcome) {
      return buildBattleResult(forcedOutcomePhase, forcedOutcome);
    }
    if (triggerFreeAtTiming(phase, 3)) {
      return buildBattleResult(forcedOutcomePhase, forcedOutcome!);
    }
    if (triggerFreeAtTiming(phase, 2)) {
      return buildBattleResult(forcedOutcomePhase, forcedOutcome!);
    }
    triggerDecomposeAtTiming(2);
    triggerConfusionAtTiming(2);
    if (forcedOutcome) {
      return buildBattleResult(forcedOutcomePhase, forcedOutcome);
    }
    triggerSelfDestructAtTiming(2);
    if (partyHp <= 0 || enemyHp <= 0) {
      return buildBattleResult(phase, partyHp <= 0 ? 'defeat' : 'victory');
    }
    if (triggerFreeAtTiming(phase, 1)) {
      return buildBattleResult(forcedOutcomePhase, forcedOutcome!);
    }
    triggerConfusionAtTiming(1);
    triggerUnstableCoreAtEnd();
    triggerSoulReapAtEnd();
    if (forcedOutcome) {
      return buildBattleResult(forcedOutcomePhase, forcedOutcome);
    }

    if (partyHp <= 0) {
      return buildBattleResult(phase, 'defeat');
    }

    if (enemyHp <= 0) {
      return buildBattleResult(phase, 'victory');
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
