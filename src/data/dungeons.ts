import { Dungeon, ExpeditionEnemyMultipliers, FloorDef, RoomType } from '../types';

type CombatMultipliers = NonNullable<FloorDef['multipliers']>;

const FLOOR_ROOM_MULTIPLIERS: Record<number, Record<RoomType, CombatMultipliers>> = {
  1: {
    battle_Normal: { hp: 1.0, attack: 1.0, noa: 1.0, attackAmplifier: 1.0, defense: 1.0, defenseAmplifier: 1.0 },
    battle_Elite: { hp: 1.50, attack: 1.50, noa: 1.0, attackAmplifier: 1.0, defense: 1.50, defenseAmplifier: 1.0 },
    battle_Boss: { hp: 6.10, attack: 5.00, noa: 1.0, attackAmplifier: 1.0, defense: 5.00, defenseAmplifier: 0.86 },
  },
  2: {
    battle_Normal: { hp: 1.25, attack: 1.20, noa: 1.0, attackAmplifier: 1.0, defense: 1.20, defenseAmplifier: 0.97 },
    battle_Elite: { hp: 1.85, attack: 1.80, noa: 1.0, attackAmplifier: 1.0, defense: 1.80, defenseAmplifier: 0.97 },
    battle_Boss: { hp: 6.10, attack: 5.00, noa: 1.0, attackAmplifier: 1.0, defense: 5.00, defenseAmplifier: 0.86 },
  },
  3: {
    battle_Normal: { hp: 1.56, attack: 1.44, noa: 1.0, attackAmplifier: 1.0, defense: 1.44, defenseAmplifier: 0.94 },
    battle_Elite: { hp: 2.34, attack: 2.16, noa: 1.0, attackAmplifier: 1.0, defense: 2.16, defenseAmplifier: 0.94 },
    battle_Boss: { hp: 6.10, attack: 5.00, noa: 1.0, attackAmplifier: 1.0, defense: 5.00, defenseAmplifier: 0.86 },
  },
  4: {
    battle_Normal: { hp: 2.95, attack: 1.72, noa: 1.0, attackAmplifier: 1.0, defense: 1.72, defenseAmplifier: 0.92 },
    battle_Elite: { hp: 4.43, attack: 2.58, noa: 1.0, attackAmplifier: 1.0, defense: 2.58, defenseAmplifier: 0.92 },
    battle_Boss: { hp: 6.10, attack: 5.00, noa: 1.0, attackAmplifier: 1.0, defense: 5.00, defenseAmplifier: 0.86 },
  },
  5: {
    battle_Normal: { hp: 2.44, attack: 2.07, noa: 1.0, attackAmplifier: 1.0, defense: 2.07, defenseAmplifier: 0.89 },
    battle_Elite: { hp: 4.04, attack: 3.11, noa: 1.0, attackAmplifier: 1.0, defense: 3.11, defenseAmplifier: 0.89 },
    battle_Boss: { hp: 6.10, attack: 5.00, noa: 1.0, attackAmplifier: 1.0, defense: 5.00, defenseAmplifier: 0.86 },
  },
  6: {
    battle_Normal: { hp: 3.05, attack: 2.49, noa: 1.0, attackAmplifier: 1.0, defense: 2.49, defenseAmplifier: 0.86 },
    battle_Elite: { hp: 3.05, attack: 2.49, noa: 1.0, attackAmplifier: 1.0, defense: 2.49, defenseAmplifier: 0.86 },
    battle_Boss: { hp: 6.10, attack: 5.00, noa: 1.0, attackAmplifier: 1.0, defense: 5.00, defenseAmplifier: 0.86 },
  },
};

// Expedition enemy multipliers (Specification 2.3.1)
export const EXPEDITION_ENEMY_MULTIPLIERS: ExpeditionEnemyMultipliers[] = [
  { hp: 1, attack: 1, noa: 1, attackAmplifier: 1, defense: 1, defenseAmplifier: 1, experience: 1 },
  { hp: 4, attack: 3, noa: 2, attackAmplifier: 2, defense: 3, defenseAmplifier: 0.8, experience: 4 },
  { hp: 16, attack: 9, noa: 3, attackAmplifier: 3, defense: 9, defenseAmplifier: 0.64, experience: 16 },
  { hp: 64, attack: 27, noa: 4, attackAmplifier: 4, defense: 27, defenseAmplifier: 0.51, experience: 64 },
  { hp: 256, attack: 81, noa: 5, attackAmplifier: 5, defense: 81, defenseAmplifier: 0.41, experience: 256 },
  { hp: 1024, attack: 243, noa: 6, attackAmplifier: 6, defense: 243, defenseAmplifier: 0.33, experience: 1024 },
  { hp: 4096, attack: 729, noa: 7, attackAmplifier: 7, defense: 729, defenseAmplifier: 0.26, experience: 4096 },
  { hp: 16384, attack: 2187, noa: 8, attackAmplifier: 8, defense: 729, defenseAmplifier: 0.21, experience: 16384 },
];

// Create floor structure for a dungeon
// Each floor has 4 rooms: 3 Normal + 1 Elite (or Boss on last floor)
function createFloors(poolId: number, bossId: number): FloorDef[] {
  return Array.from({ length: 6 }, (_, index) => {
    const floorNumber = index + 1;
    const isLastFloor = floorNumber === 6;
    const normalMultipliers = FLOOR_ROOM_MULTIPLIERS[floorNumber]?.battle_Normal;

    return {
      floorNumber,
      multiplier: normalMultipliers?.attack ?? 1,
      multipliers: normalMultipliers,
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

// Expedition definitions with lore
// 8 expeditions following the world progression
export const DUNGEONS: Dungeon[] = [
  // Tier 1: ケイナイアン平原 (Caninian Plains)
  {
    id: 1,
    name: 'ケイナイアン平原',
    numberOfRooms: 24,
    enemyPoolIds: [1],
    bossId: 101,
    enemyMultipliers: EXPEDITION_ENEMY_MULTIPLIERS[0],
    floors: createFloors(1, 101),
  },

  // Tier 2: ルピニアンの断崖 (Lupinian Crag)
  {
    id: 2,
    name: 'ルピニアンの断崖',
    numberOfRooms: 24,
    enemyPoolIds: [2],
    bossId: 201,
    enemyMultipliers: EXPEDITION_ENEMY_MULTIPLIERS[1],
    floors: createFloors(2, 201),
  },

  // Tier 3: ヴァルピニアンの樹林帯 (Vulpinian Taiga)
  {
    id: 3,
    name: 'ヴァルピニアンの樹林帯',
    numberOfRooms: 24,
    enemyPoolIds: [3],
    bossId: 301,
    enemyMultipliers: EXPEDITION_ENEMY_MULTIPLIERS[2],
    floors: createFloors(3, 301),
  },

  // Tier 4: ウルサンの霊峰 (Ursan Peaks)
  {
    id: 4,
    name: 'ウルサンの霊峰',
    numberOfRooms: 24,
    enemyPoolIds: [4],
    bossId: 401,
    enemyMultipliers: EXPEDITION_ENEMY_MULTIPLIERS[3],
    floors: createFloors(4, 401),
  },

  // Tier 5: フェリディアンの茂み (Felidian Grove)
  {
    id: 5,
    name: 'フェリディアンの茂み',
    numberOfRooms: 24,
    enemyPoolIds: [5],
    bossId: 501,
    enemyMultipliers: EXPEDITION_ENEMY_MULTIPLIERS[4],
    floors: createFloors(5, 501),
  },

  // Tier 6: マステリドの巣穴 (Mustelid Burrow)
  {
    id: 6,
    name: 'マステリドの巣穴',
    numberOfRooms: 24,
    enemyPoolIds: [6],
    bossId: 601,
    enemyMultipliers: EXPEDITION_ENEMY_MULTIPLIERS[5],
    floors: createFloors(6, 601),
  },

  // Tier 7: レポリアンの庭園 (Leporian Garden)
  {
    id: 7,
    name: 'レポリアンの庭園',
    numberOfRooms: 24,
    enemyPoolIds: [7],
    bossId: 701,
    enemyMultipliers: EXPEDITION_ENEMY_MULTIPLIERS[6],
    floors: createFloors(7, 701),
  },

  // Tier 8: セルヴィンの谷 (Cervin Vale)
  {
    id: 8,
    name: 'セルヴィンの谷',
    numberOfRooms: 24,
    enemyPoolIds: [8],
    bossId: 801,
    enemyMultipliers: EXPEDITION_ENEMY_MULTIPLIERS[7],
    floors: createFloors(8, 801),
  },
];

export const getDungeonById = (id: number): Dungeon | undefined =>
  DUNGEONS.find(d => d.id === id);

const DEFAULT_MULTIPLIERS: CombatMultipliers = {
  hp: 1,
  attack: 1,
  noa: 1,
  attackAmplifier: 1,
  defense: 1,
  defenseAmplifier: 1,
};

export function getFloorRoomMultipliers(floorNumber: number, roomType: RoomType): CombatMultipliers {
  return FLOOR_ROOM_MULTIPLIERS[floorNumber]?.[roomType] ?? DEFAULT_MULTIPLIERS;
}

// Get expedition tier (1-8) from dungeon id
export function getExpeditionTier(dungeonId: number): number {
  return dungeonId; // dungeon id corresponds to tier
}

// Get expedition multiplier for enemy stat scaling
export function getExpeditionEnemyMultipliers(dungeonId: number): ExpeditionEnemyMultipliers {
  const tier = getExpeditionTier(dungeonId);
  return EXPEDITION_ENEMY_MULTIPLIERS[tier - 1] ?? EXPEDITION_ENEMY_MULTIPLIERS[0];
}
