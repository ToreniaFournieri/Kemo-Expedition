import { Dungeon, EnemyDef, RoomType } from '../types';
import { getFloorRoomMultipliers } from '../data/dungeons';

const GOD_ENEMY_MULTIPLIERS = {
  hp: 2.0,
  attack: 1.5,
  noa: 2.0,
  attackAmplifier: 1.6,
  defense: 1.5,
  defenseAmplifier: 0.8,
} as const;

type EnemyScalingOptions = {
  isGodEnemy?: boolean;
};

export function getRoomMultiplier(floorNumber: number, roomType: RoomType, floorMultiplier: number): number {
  return getFloorRoomMultipliers(floorNumber, roomType).attack ?? floorMultiplier;
}

export function applyEnemyEncounterScaling(
  enemy: EnemyDef,
  dungeon: Dungeon,
  floorNumber: number,
  roomType: RoomType,
  options: EnemyScalingOptions = {}
): EnemyDef {
  const roomMultipliers = getFloorRoomMultipliers(floorNumber, roomType);
  const expeditionMult = dungeon.enemyMultipliers;
  const godMult = options.isGodEnemy
    ? GOD_ENEMY_MULTIPLIERS
    : {
      hp: 1,
      attack: 1,
      noa: 1,
      attackAmplifier: 1,
      defense: 1,
      defenseAmplifier: 1,
    };

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
