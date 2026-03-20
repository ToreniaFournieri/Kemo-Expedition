import { Dungeon, EnemyDef, RoomType } from '../types';
import { LUNA_MODE_ENEMY_LEVEL_BONUS, getEnemyLevelForRoom, getEnemyMultipliersForLevel } from '../data/dungeons';
import { getDebugSettings } from './debugSettings';

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

export function getGodEnemyMultipliers(): GodEnemyMultipliers {
  return getDebugSettings().godStrength === 'debug'
    ? DEBUG_GOD_ENEMY_MULTIPLIERS
    : NORMAL_GOD_ENEMY_MULTIPLIERS;
}

type EnemyScalingOptions = {
  isGodEnemy?: boolean;
  isLunaMode?: boolean;
};

// SpecRef: 4.1.2 | Enemy | Strength of enemy by its level
export function getRoomMultiplier(
  dungeonExpLevel: number,
  floorNumber: number,
  roomType: RoomType,
  isLunaMode: boolean = false,
): number {
  const enemyLevel = getEnemyLevelForRoom(dungeonExpLevel, floorNumber, roomType);
  const effectiveEnemyLevel = enemyLevel + (isLunaMode ? LUNA_MODE_ENEMY_LEVEL_BONUS : 0);
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
  const effectiveEnemyLevel = roomEnemyLevel + (options.isLunaMode ? LUNA_MODE_ENEMY_LEVEL_BONUS : 0);
  const expeditionMult = getEnemyMultipliersForLevel(effectiveEnemyLevel);
  const godMult = options.isGodEnemy ? getGodEnemyMultipliers() : DEFAULT_MULTIPLIERS;

  const finalMultipliers = {
    hp: expeditionMult.hp * godMult.hp,
    attack: expeditionMult.attack * godMult.attack,
    noa: expeditionMult.noa * godMult.noa,
    attackAmplifier: expeditionMult.attackAmplifier * godMult.attackAmplifier,
    defense: expeditionMult.defense * godMult.defense,
    physicalDefenseAmplifier: expeditionMult.defenseAmplifier * godMult.physicalDefenseAmplifier,
    magicalDefenseAmplifier: expeditionMult.defenseAmplifier * godMult.magicalDefenseAmplifier,
  };

  const hasColossal = enemy.abilities.some((ability) => ability.id === 'colossal');

  return {
    ...enemy,
    hp: Math.floor(enemy.hp * finalMultipliers.hp),
    rangedAttack: Math.floor(enemy.rangedAttack * finalMultipliers.attack),
    magicalAttack: Math.floor(enemy.magicalAttack * finalMultipliers.attack),
    meleeAttack: Math.floor(enemy.meleeAttack * finalMultipliers.attack),
    rangedNoA: Math.floor(enemy.rangedNoA * finalMultipliers.noa),
    magicalNoA: Math.floor(enemy.magicalNoA * finalMultipliers.noa),
    meleeNoA: Math.floor(enemy.meleeNoA * finalMultipliers.noa),
    rangedAttackAmplifier: enemy.rangedAttackAmplifier * finalMultipliers.attackAmplifier,
    magicalAttackAmplifier: enemy.magicalAttackAmplifier * finalMultipliers.attackAmplifier,
    meleeAttackAmplifier: enemy.meleeAttackAmplifier * finalMultipliers.attackAmplifier,
    physicalDefense: Math.floor(enemy.physicalDefense * finalMultipliers.defense * (hasColossal ? 2 : 1)),
    magicalDefense: Math.floor(enemy.magicalDefense * finalMultipliers.defense * (hasColossal ? 2 : 1)),
    physicalDefenseAmplifier: 1.0 * finalMultipliers.physicalDefenseAmplifier * (hasColossal ? 2 : 1),
    magicalDefenseAmplifier: 1.0 * finalMultipliers.magicalDefenseAmplifier,
    experience: enemy.experience,
  };
}
