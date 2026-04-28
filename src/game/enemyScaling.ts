import { BonusType, Dungeon, EnemyAbility, EnemyDef, RoomType } from '../types';
import { getEnemyTypeAbilities } from '../data/enemies';
import { LUNA_MODE_ENEMY_LEVEL_BONUS, getEnemyLevelForRoom, getEnemyMultipliersForLevel } from '../data/dungeons';
import { getDebugSettings } from './debugSettings';
import { applyEnemyMeleeConversionAttack, resolveEnemyPassiveAbilities } from './enemyPassiveAbilities';

type GodEnemyMultipliers = {
  hp: number;
  attack: number;
  noa: number;
  attackAmplifier: number;
  defense: number;
  physicalDefenseAmplifier: number;
  magicalDefenseAmplifier: number;
};

const NORMAL_GOD_ENEMY_MULTIPLIERS: GodEnemyMultipliers = {
  hp: 1.5,
  attack: 1.1,
  noa: 1.3,
  attackAmplifier: 1.2,
  defense: 1.1,
  physicalDefenseAmplifier: 1.0,
  magicalDefenseAmplifier: 1.0,
};

const DEFAULT_MULTIPLIERS: GodEnemyMultipliers = {
  hp: 1,
  attack: 1,
  noa: 1,
  attackAmplifier: 1,
  defense: 1,
  physicalDefenseAmplifier: 1,
  magicalDefenseAmplifier: 1,
};

// SpecRef: 4.1.2 | Enemy | x.god_*_mult
const DEBUG_GOD_ENEMY_MULTIPLIERS: GodEnemyMultipliers = {
  hp: 0.3,
  attack: 0.3,
  noa: 0.5,
  attackAmplifier: 0.4,
  defense: 0.3,
  physicalDefenseAmplifier: 1.0,
  magicalDefenseAmplifier: 1.0,
};

function getGodEnemyMultipliers(): GodEnemyMultipliers {
  return getDebugSettings().godStrength === 'debug'
    ? DEBUG_GOD_ENEMY_MULTIPLIERS
    : NORMAL_GOD_ENEMY_MULTIPLIERS;
}

type EnemyScalingOptions = {
  isGodEnemy?: boolean;
  isLunaMode?: boolean;
  difficultyOffset?: number;
};

const ENEMY_TYPE_C_BONUS_TYPES = new Set<BonusType>([
  'growth_xV',
  'grit',
  'caster',
  'pursuit',
  'evasion',
  'physical_defense_multiplier_xV',
  'magical_defense_multiplier_xV',
  'fire_defense_multiplier_xV',
  'ice_defense_multiplier_xV',
  'thunder_defense_multiplier_xV',
]);

function formatCBonusValue(value: number): string {
  return (Math.round(value * 1000000) / 1000000).toString();
}

export function isEnemyTypeCBonusType(type: BonusType): boolean {
  return ENEMY_TYPE_C_BONUS_TYPES.has(type);
}

export function applyEnemyTypeCBonuses(enemy: EnemyDef): EnemyDef {
  let hp = enemy.hp;
  let rangedNoA = enemy.rangedNoA;
  let magicalNoA = enemy.magicalNoA;
  let meleeNoA = enemy.meleeNoA;
  let evasionBonus = enemy.evasionBonus;
  let physicalDefenseAmplifier = enemy.physicalDefenseAmplifier;
  let magicalDefenseAmplifier = enemy.magicalDefenseAmplifier;
  const elementalResistance = { ...enemy.elementalResistance };
  const appliedBonusNames = new Set<string>();

  for (const bonus of enemy.bonuses ?? []) {
    if (!isEnemyTypeCBonusType(bonus.type)) continue;

    const bonusName = `c.${bonus.type}+${formatCBonusValue(bonus.value)}`;
    if (appliedBonusNames.has(bonusName)) continue;
    appliedBonusNames.add(bonusName);

    switch (bonus.type) {
      case 'growth_xV':
        hp = Math.max(1, Math.floor(hp * bonus.value));
        break;
      case 'grit':
        meleeNoA = Math.max(0, meleeNoA + bonus.value);
        break;
      case 'caster':
        magicalNoA = Math.max(0, magicalNoA + bonus.value);
        break;
      case 'pursuit':
        rangedNoA = Math.max(0, rangedNoA + bonus.value);
        break;
      case 'evasion':
        evasionBonus += bonus.value;
        break;
      case 'physical_defense_multiplier_xV':
        physicalDefenseAmplifier = Math.max(0.01, physicalDefenseAmplifier * bonus.value);
        break;
      case 'magical_defense_multiplier_xV':
        magicalDefenseAmplifier = Math.max(0.01, magicalDefenseAmplifier * bonus.value);
        break;
      case 'fire_defense_multiplier_xV':
        elementalResistance.fire = Math.max(0.01, elementalResistance.fire * bonus.value);
        break;
      case 'ice_defense_multiplier_xV':
        elementalResistance.ice = Math.max(0.01, elementalResistance.ice * bonus.value);
        break;
      case 'thunder_defense_multiplier_xV':
        elementalResistance.thunder = Math.max(0.01, elementalResistance.thunder * bonus.value);
        break;
    }
  }

  return {
    ...enemy,
    hp,
    rangedNoA,
    magicalNoA,
    meleeNoA,
    evasionBonus,
    physicalDefenseAmplifier,
    magicalDefenseAmplifier,
    elementalResistance,
  };
}

function mergeEnemyAbilities(existingAbilities: EnemyAbility[], levelBasedAbilities: EnemyAbility[]): EnemyAbility[] {
  const merged = new Map(existingAbilities.map((ability) => [ability.id, { ...ability }]));
  for (const ability of levelBasedAbilities) {
    const current = merged.get(ability.id);
    if (!current || current.level < ability.level) {
      merged.set(ability.id, { ...ability });
    }
  }

  return Array.from(merged.values());
}

// SpecRef: 4.1.2 | Enemy | Strength of enemy by its level
export function getRoomMultiplier(
  dungeonExpLevel: number,
  floorNumber: number,
  roomType: RoomType,
  isLunaMode: boolean = false,
  difficultyOffset: number = 0,
): number {
  const enemyLevel = getEnemyLevelForRoom(dungeonExpLevel, floorNumber, roomType);
  const effectiveEnemyLevel = enemyLevel + (isLunaMode ? LUNA_MODE_ENEMY_LEVEL_BONUS : 0) + difficultyOffset;
  return getEnemyMultipliersForLevel(effectiveEnemyLevel).attack;
}

// SpecRef: 4.1.2 | Enemy | Enemy status mutipliers
export function applyEnemyEncounterScaling(
  enemy: EnemyDef,
  dungeon: Dungeon,
  floorNumber: number,
  roomType: RoomType,
  options: EnemyScalingOptions = {}
): EnemyDef {
  const roomEnemyLevel = getEnemyLevelForRoom(dungeon.expLevel, floorNumber, roomType);
  const effectiveEnemyLevel = roomEnemyLevel
    + (options.isLunaMode ? LUNA_MODE_ENEMY_LEVEL_BONUS : 0)
    + (options.difficultyOffset ?? 0);
  const expeditionMult = getEnemyMultipliersForLevel(effectiveEnemyLevel);
  const godMult = options.isGodEnemy ? getGodEnemyMultipliers() : DEFAULT_MULTIPLIERS;
  const enemyTypeAbilitiesForLevel = getEnemyTypeAbilities(enemy.enemyType, effectiveEnemyLevel);
  // SpecRef: 4.1.2 | Enemy | x.level and x.ability
  const scaledAbilities = resolveEnemyPassiveAbilities(mergeEnemyAbilities(enemy.abilities, enemyTypeAbilitiesForLevel));

  const finalMultipliers = {
    hp: expeditionMult.hp * godMult.hp,
    attack: expeditionMult.attack * godMult.attack,
    noa: expeditionMult.noa * godMult.noa,
    attackAmplifier: expeditionMult.attackAmplifier * godMult.attackAmplifier,
    defense: expeditionMult.defense * godMult.defense,
    physicalDefenseAmplifier: expeditionMult.defenseAmplifier * godMult.physicalDefenseAmplifier,
    magicalDefenseAmplifier: expeditionMult.defenseAmplifier * godMult.magicalDefenseAmplifier,
  };

  const hasColossal = scaledAbilities.some((ability) => ability.id === 'colossal');
  const meleeConversionLevel = scaledAbilities.find((ability) => ability.id === 'melee_conversion')?.level ?? 0;
  const scaledRangedAttack = Math.floor(enemy.rangedAttack * finalMultipliers.attack);
  const scaledMagicalAttack = Math.floor(enemy.magicalAttack * finalMultipliers.attack);
  const scaledMeleeAttack = Math.floor(enemy.meleeAttack * finalMultipliers.attack);

  return applyEnemyTypeCBonuses({
    ...enemy,
    abilities: scaledAbilities,
    hp: Math.floor(enemy.hp * finalMultipliers.hp),
    rangedAttack: scaledRangedAttack,
    magicalAttack: scaledMagicalAttack,
    meleeAttack: applyEnemyMeleeConversionAttack(
      scaledMeleeAttack,
      scaledRangedAttack,
      scaledMagicalAttack,
      meleeConversionLevel,
    ),
    rangedNoA: Math.floor(enemy.rangedNoA * finalMultipliers.noa),
    magicalNoA: Math.floor(enemy.magicalNoA * finalMultipliers.noa),
    meleeNoA: Math.floor(enemy.meleeNoA * finalMultipliers.noa),
    rangedAttackAmplifier: enemy.rangedAttackAmplifier * finalMultipliers.attackAmplifier,
    magicalAttackAmplifier: enemy.magicalAttackAmplifier * finalMultipliers.attackAmplifier,
    meleeAttackAmplifier: enemy.meleeAttackAmplifier * finalMultipliers.attackAmplifier,
    physicalDefense: Math.floor(enemy.physicalDefense * finalMultipliers.defense * (hasColossal ? 2 : 1)),
    magicalDefense: Math.floor(enemy.magicalDefense * finalMultipliers.defense),
    physicalDefenseAmplifier: 1.0 * finalMultipliers.physicalDefenseAmplifier * (hasColossal ? 2 : 1),
    magicalDefenseAmplifier: 1.0 * finalMultipliers.magicalDefenseAmplifier,
    experience: enemy.experience,
  });
}

function isPreScaledEncounterEnemy(enemy: EnemyDef): boolean {
  return enemy.poolId === 99 || enemy.id === 9901;
}

export function getEncounterEnemyWithScaling(
  enemy: EnemyDef,
  dungeon: Dungeon,
  floorNumber: number,
  roomType: RoomType,
  options: EnemyScalingOptions = {},
): EnemyDef {
  if (isPreScaledEncounterEnemy(enemy)) {
    return enemy;
  }

  return applyEnemyEncounterScaling(enemy, dungeon, floorNumber, roomType, options);
}
