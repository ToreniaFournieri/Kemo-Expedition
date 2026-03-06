import { Dungeon, EnemyDef, RoomType } from '../types';
import { getFloorRoomMultipliers } from '../data/dungeons';
import { getEnvironmentId } from './environment';

type GodEnemyMultipliers = {
  hp: number;
  attack: number;
  noa: number;
  attackAmplifier: number;
  defense: number;
  defenseAmplifier: number;
};

const NORMAL_GOD_ENEMY_MULTIPLIERS: GodEnemyMultipliers = {
  hp: 2.0,
  attack: 1.5,
  noa: 2.0,
  attackAmplifier: 1.6,
  defense: 1.5,
  defenseAmplifier: 0.8,
};

const DEV_GOD_ENEMY_MULTIPLIERS: GodEnemyMultipliers = {
  hp: 0.3,
  attack: 0.3,
  noa: 0.5,
  attackAmplifier: 0.4,
  defense: 0.3,
  defenseAmplifier: 1.0,
};

const DEFAULT_MULTIPLIERS: GodEnemyMultipliers = {
  hp: 1,
  attack: 1,
  noa: 1,
  attackAmplifier: 1,
  defense: 1,
  defenseAmplifier: 1,
};

// SpecRef: 6.1 | Encounter Rules | getGodEnemyMultipliers
export function getGodEnemyMultipliers(): GodEnemyMultipliers {
  return getEnvironmentId() === 'dev'
    ? DEV_GOD_ENEMY_MULTIPLIERS
    : NORMAL_GOD_ENEMY_MULTIPLIERS;
}

type EnemyScalingOptions = {
  isGodEnemy?: boolean;
};

// SpecRef: 6.1 | Encounter Rules | getRoomMultiplier
export function getRoomMultiplier(floorNumber: number, roomType: RoomType, floorMultiplier: number): number {
  return getFloorRoomMultipliers(floorNumber, roomType).attack ?? floorMultiplier;
}

// SpecRef: 6.1 | Encounter Rules | applyEnemyEncounterScaling
export function applyEnemyEncounterScaling(
  enemy: EnemyDef,
  dungeon: Dungeon,
  floorNumber: number,
  roomType: RoomType,
  options: EnemyScalingOptions = {}
): EnemyDef {
  const roomMultipliers = getFloorRoomMultipliers(floorNumber, roomType);
  const expeditionMult = dungeon.enemyMultipliers;
  const godMult = options.isGodEnemy ? getGodEnemyMultipliers() : DEFAULT_MULTIPLIERS;

  const finalMultipliers = {
    hp: expeditionMult.hp * roomMultipliers.hp * godMult.hp,
    attack: expeditionMult.attack * roomMultipliers.attack * godMult.attack,
    noa: expeditionMult.noa * roomMultipliers.noa * godMult.noa,
    attackAmplifier: expeditionMult.attackAmplifier * roomMultipliers.attackAmplifier * godMult.attackAmplifier,
    defense: expeditionMult.defense * roomMultipliers.defense * godMult.defense,
    defenseAmplifier: expeditionMult.defenseAmplifier * roomMultipliers.defenseAmplifier * godMult.defenseAmplifier,
  };

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
    physicalDefense: Math.floor(enemy.physicalDefense * finalMultipliers.defense),
    magicalDefense: Math.floor(enemy.magicalDefense * finalMultipliers.defense),
    defenseAmplifier: 1.0 * finalMultipliers.defenseAmplifier,
    experience: enemy.experience,
  };
}
