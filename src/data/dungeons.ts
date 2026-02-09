import { Dungeon, FloorDef } from '../types';

// Floor multipliers: x1.0, x1.5, x2.0, x3.0, x4.0, x5.0
const FLOOR_MULTIPLIERS = [1.0, 1.5, 2.0, 3.0, 4.0, 5.0];

// Create floor structure for a dungeon
// Each floor has 4 rooms: 3 Normal + 1 Elite (or Boss on last floor)
function createFloors(poolId: number, bossId: number): FloorDef[] {
  return FLOOR_MULTIPLIERS.map((multiplier, index) => {
    const floorNumber = index + 1;
    const isLastFloor = floorNumber === 6;

    return {
      floorNumber,
      multiplier,
      rooms: [
        { type: 'battle_Normal' as const, poolId },
        { type: 'battle_Normal' as const, poolId },
        { type: 'battle_Normal' as const, poolId },
        isLastFloor
          ? { type: 'battle_Boss' as const, bossId }
          : { type: 'battle_Elite' as const, poolId },
      ],
    };
  });
}

export const DUNGEONS: Dungeon[] = [
  {
    id: 1,
    name: '草原の遺跡',
    numberOfRooms: 24, // 6 floors x 4 rooms
    enemyPoolIds: [1],
    bossId: 6,
    floors: createFloors(1, 6),
  },
  {
    id: 2,
    name: '古代の洞窟',
    numberOfRooms: 24,
    enemyPoolIds: [2],
    bossId: 15,
    floors: createFloors(2, 15),
  },
  {
    id: 3,
    name: '呪われた森',
    numberOfRooms: 24,
    enemyPoolIds: [3],
    bossId: 25,
    floors: createFloors(3, 25),
  },
  {
    id: 4,
    name: '炎の火山',
    numberOfRooms: 24,
    enemyPoolIds: [4],
    bossId: 35,
    floors: createFloors(4, 35),
  },
  {
    id: 5,
    name: '雷鳴の塔',
    numberOfRooms: 24,
    enemyPoolIds: [5],
    bossId: 45,
    floors: createFloors(5, 45),
  },
];

export const getDungeonById = (id: number): Dungeon | undefined =>
  DUNGEONS.find(d => d.id === id);
