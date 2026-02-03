import { Dungeon } from '../types';

export const DUNGEONS: Dungeon[] = [
  {
    id: 1,
    name: '草原の遺跡',
    numberOfRooms: 3,
    enemyPoolIds: [1],
    bossId: 6,
  },
  {
    id: 2,
    name: '古代の洞窟',
    numberOfRooms: 4,
    enemyPoolIds: [2],
    bossId: 15,
  },
  {
    id: 3,
    name: '呪われた森',
    numberOfRooms: 5,
    enemyPoolIds: [3],
    bossId: 25,
  },
  {
    id: 4,
    name: '炎の火山',
    numberOfRooms: 5,
    enemyPoolIds: [4],
    bossId: 35,
  },
  {
    id: 5,
    name: '雷鳴の塔',
    numberOfRooms: 6,
    enemyPoolIds: [5],
    bossId: 45,
  },
];

export const getDungeonById = (id: number): Dungeon | undefined =>
  DUNGEONS.find(d => d.id === id);
