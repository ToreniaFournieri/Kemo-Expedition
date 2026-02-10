import { Dungeon, EnemyDef, RoomType } from '../types';
import { getFloorRoomMultipliers } from '../data/dungeons';

export function getRoomMultiplier(floorNumber: number, roomType: RoomType, floorMultiplier: number): number {
  return getFloorRoomMultipliers(floorNumber, roomType).attack ?? floorMultiplier;
}

export function applyEnemyEncounterScaling(
  enemy: EnemyDef,
  dungeon: Dungeon,
  floorNumber: number,
  roomType: RoomType
): EnemyDef {
  const roomMultipliers = getFloorRoomMultipliers(floorNumber, roomType);
  const expeditionMult = dungeon.enemyMultipliers;
  const enemyTypeExperienceMultiplier = roomType === 'battle_Boss' ? 5 : roomType === 'battle_Elite' ? 2 : 1;

  return {
    ...enemy,
    hp: Math.floor(enemy.hp * expeditionMult.hp * roomMultipliers.hp),
    rangedAttack: Math.floor(enemy.rangedAttack * expeditionMult.attack * roomMultipliers.attack),
    magicalAttack: Math.floor(enemy.magicalAttack * expeditionMult.attack * roomMultipliers.attack),
    meleeAttack: Math.floor(enemy.meleeAttack * expeditionMult.attack * roomMultipliers.attack),
    rangedNoA: Math.floor(enemy.rangedNoA * expeditionMult.noa * roomMultipliers.noa),
    magicalNoA: Math.floor(enemy.magicalNoA * expeditionMult.noa * roomMultipliers.noa),
    meleeNoA: Math.floor(enemy.meleeNoA * expeditionMult.noa * roomMultipliers.noa),
    rangedAttackAmplifier: enemy.rangedAttackAmplifier * expeditionMult.attackAmplifier * roomMultipliers.attackAmplifier,
    magicalAttackAmplifier: enemy.magicalAttackAmplifier * expeditionMult.attackAmplifier * roomMultipliers.attackAmplifier,
    meleeAttackAmplifier: enemy.meleeAttackAmplifier * expeditionMult.attackAmplifier * roomMultipliers.attackAmplifier,
    physicalDefense: Math.floor(enemy.physicalDefense * expeditionMult.defense * roomMultipliers.defense),
    magicalDefense: Math.floor(enemy.magicalDefense * expeditionMult.defense * roomMultipliers.defense),
    defenseAmplifier: enemy.defenseAmplifier * expeditionMult.defenseAmplifier * roomMultipliers.defenseAmplifier,
    experience: Math.floor(enemy.experience * expeditionMult.experience * enemyTypeExperienceMultiplier),
  };
}
