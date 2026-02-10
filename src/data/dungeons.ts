import { Dungeon, FloorDef } from '../types';

// Floor multipliers for normal rooms (spec): x1.0, x1.2, x1.44, x1.73, x2.07, x2.49
const FLOOR_MULTIPLIERS = [1.0, 1.2, 1.44, 1.73, 2.07, 2.49];

// Tier multipliers for expedition difficulty scaling
// These multiply base enemy stats for each expedition tier
export const TIER_MULTIPLIERS = [1, 2, 4, 8, 16, 32, 64, 128];

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

// Expedition definitions with lore
// 8 expeditions following the world progression
export const DUNGEONS: Dungeon[] = [
  // Tier 1: 草原の遺跡 (Grassland Ruins)
  // The first expedition - ancient ruins where kemonomimi adventurers test their mettle
  {
    id: 1,
    name: '草原の遺跡',
    numberOfRooms: 24,
    enemyPoolIds: [1],
    bossId: 101,
    floors: createFloors(1, 101),
  },

  // Tier 2: 古代の洞窟 (Ancient Cave)
  // Deep caverns where ancient creatures dwell in eternal darkness
  {
    id: 2,
    name: '古代の洞窟',
    numberOfRooms: 24,
    enemyPoolIds: [2],
    bossId: 201,
    floors: createFloors(2, 201),
  },

  // Tier 3: 呪われた森 (Cursed Forest)
  // A forest corrupted by dark magic, where twisted beasts roam
  {
    id: 3,
    name: '呪われた森',
    numberOfRooms: 24,
    enemyPoolIds: [3],
    bossId: 301,
    floors: createFloors(3, 301),
  },

  // Tier 4: 炎の火山 (Flame Volcano)
  // The volcanic mountains where fire elementals and dragons reside
  {
    id: 4,
    name: '炎の火山',
    numberOfRooms: 24,
    enemyPoolIds: [4],
    bossId: 401,
    floors: createFloors(4, 401),
  },

  // Tier 5: 氷結の峡谷 (Frozen Canyon)
  // The frozen wastelands where ice creatures guard ancient treasures
  {
    id: 5,
    name: '氷結の峡谷',
    numberOfRooms: 24,
    enemyPoolIds: [5],
    bossId: 501,
    floors: createFloors(5, 501),
  },

  // Tier 6: 雷鳴の塔 (Tower of Thunder)
  // A tower struck by eternal lightning, home to storm beings
  {
    id: 6,
    name: '雷鳴の塔',
    numberOfRooms: 24,
    enemyPoolIds: [6],
    bossId: 601,
    floors: createFloors(6, 601),
  },

  // Tier 7: 冥界の門 (Gate of the Underworld)
  // The boundary between worlds, guarded by spirits and demons
  {
    id: 7,
    name: '冥界の門',
    numberOfRooms: 24,
    enemyPoolIds: [7],
    bossId: 701,
    floors: createFloors(7, 701),
  },

  // Tier 8: 天空の神殿 (Celestial Temple)
  // The final expedition - a temple floating in the heavens where gods dwell
  {
    id: 8,
    name: '天空の神殿',
    numberOfRooms: 24,
    enemyPoolIds: [8],
    bossId: 801,
    floors: createFloors(8, 801),
  },
];

export const getDungeonById = (id: number): Dungeon | undefined =>
  DUNGEONS.find(d => d.id === id);

// Get expedition tier (1-8) from dungeon id
export function getExpeditionTier(dungeonId: number): number {
  return dungeonId; // dungeon id corresponds to tier
}

// Get tier multiplier for enemy stat scaling
export function getTierMultiplier(dungeonId: number): number {
  const tier = getExpeditionTier(dungeonId);
  return TIER_MULTIPLIERS[tier - 1] || 1;
}
