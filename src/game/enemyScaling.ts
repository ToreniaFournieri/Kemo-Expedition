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
  const godMult = options.isGodEnemy ? GOD_ENEMY_MULTIPLIERS : undefined;

  return {
    ...enemy,
    hp: Math.floor(enemy.hp * expeditionMult.hp * roomMultipliers.hp * (godMult?.hp ?? 1)),
    rangedAttack: Math.floor(enemy.rangedAttack * expeditionMult.attack * roomMultipliers.attack * (godMult?.attack ?? 1)),
    magicalAttack: Math.floor(enemy.magicalAttack * expeditionMult.attack * roomMultipliers.attack * (godMult?.attack ?? 1)),
    meleeAttack: Math.floor(enemy.meleeAttack * expeditionMult.attack * roomMultipliers.attack * (godMult?.attack ?? 1)),
    rangedNoA: Math.floor(enemy.rangedNoA * expeditionMult.noa * roomMultipliers.noa * (godMult?.noa ?? 1)),
    magicalNoA: Math.floor(enemy.magicalNoA * expeditionMult.noa * roomMultipliers.noa * (godMult?.noa ?? 1)),
    meleeNoA: Math.floor(enemy.meleeNoA * expeditionMult.noa * roomMultipliers.noa * (godMult?.noa ?? 1)),
    rangedAttackAmplifier: enemy.rangedAttackAmplifier * expeditionMult.attackAmplifier * roomMultipliers.attackAmplifier * (godMult?.attackAmplifier ?? 1),
    magicalAttackAmplifier: enemy.magicalAttackAmplifier * expeditionMult.attackAmplifier * roomMultipliers.attackAmplifier * (godMult?.attackAmplifier ?? 1),
    meleeAttackAmplifier: enemy.meleeAttackAmplifier * expeditionMult.attackAmplifier * roomMultipliers.attackAmplifier * (godMult?.attackAmplifier ?? 1),
    physicalDefense: Math.floor(enemy.physicalDefense * expeditionMult.defense * roomMultipliers.defense * (godMult?.defense ?? 1)),
    magicalDefense: Math.floor(enemy.magicalDefense * expeditionMult.defense * roomMultipliers.defense * (godMult?.defense ?? 1)),
    defenseAmplifier: 1.0 * expeditionMult.defenseAmplifier * roomMultipliers.defenseAmplifier * (godMult?.defenseAmplifier ?? 1),
    experience: enemy.experience,
  };
}
