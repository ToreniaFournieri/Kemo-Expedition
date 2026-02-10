import { Dungeon, EnemyDef, RoomType } from '../types';

const ELITE_ROOM_MULTIPLIERS: Record<number, number> = {
  1: 1.3,
  2: 1.56,
  3: 1.82,
  4: 2.25,
  5: 2.69,
};

export function getRoomMultiplier(floorNumber: number, roomType: RoomType, floorMultiplier: number): number {
  if (roomType === 'battle_Elite') {
    return ELITE_ROOM_MULTIPLIERS[floorNumber] ?? floorMultiplier;
  }

  if (roomType === 'battle_Boss') {
    return 5.0;
  }

  return floorMultiplier;
}

export function applyEnemyEncounterScaling(
  enemy: EnemyDef,
  dungeon: Dungeon,
  floorNumber: number,
  roomType: RoomType
): EnemyDef {
  const floorMultiplier = dungeon.floors?.find(floor => floor.floorNumber === floorNumber)?.multiplier ?? 1;
  const roomMultiplier = getRoomMultiplier(floorNumber, roomType, floorMultiplier);
  const expeditionMult = dungeon.enemyMultipliers;

  return {
    ...enemy,
    hp: Math.floor(enemy.hp * expeditionMult.hp * roomMultiplier),
    rangedAttack: Math.floor(enemy.rangedAttack * expeditionMult.attack * roomMultiplier),
    magicalAttack: Math.floor(enemy.magicalAttack * expeditionMult.attack * roomMultiplier),
    meleeAttack: Math.floor(enemy.meleeAttack * expeditionMult.attack * roomMultiplier),
    rangedNoA: Math.floor(enemy.rangedNoA * expeditionMult.noa * roomMultiplier),
    magicalNoA: Math.floor(enemy.magicalNoA * expeditionMult.noa * roomMultiplier),
    meleeNoA: Math.floor(enemy.meleeNoA * expeditionMult.noa * roomMultiplier),
    rangedAttackAmplifier: enemy.rangedAttackAmplifier * expeditionMult.attackAmplifier,
    magicalAttackAmplifier: enemy.magicalAttackAmplifier * expeditionMult.attackAmplifier,
    meleeAttackAmplifier: enemy.meleeAttackAmplifier * expeditionMult.attackAmplifier,
    physicalDefense: Math.floor(enemy.physicalDefense * expeditionMult.defense * roomMultiplier),
    magicalDefense: Math.floor(enemy.magicalDefense * expeditionMult.defense * roomMultiplier),
    experience: Math.floor(enemy.experience * expeditionMult.experience * roomMultiplier),
  };
}
