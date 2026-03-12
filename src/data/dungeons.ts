import { Dungeon, ExpeditionEnemyMultipliers, FloorDef, RoomType } from '../types';

type CombatMultipliers = NonNullable<FloorDef['multipliers']>;

const round2 = (value: number): number => Number(value.toFixed(2));

const MIN_ENEMY_LEVEL = 1;
const MAX_ENEMY_LEVEL = 99;

const clampEnemyLevel = (enemyLevel: number): number =>
  Math.max(MIN_ENEMY_LEVEL, Math.min(MAX_ENEMY_LEVEL, enemyLevel));

const applyEnemyLevelGrowth = (
  enemyLevel: number,
  base: number,
  firstSoftCapStart: number,
  firstSoftCapPenalty: number,
  secondSoftCapStart: number,
  secondSoftCapPenalty: number,
): number => {
  const n = clampEnemyLevel(enemyLevel);
  const growth = base
    - Math.max(0, firstSoftCapPenalty * (n - firstSoftCapStart))
    - Math.max(0, secondSoftCapPenalty * (n - secondSoftCapStart));
  return Math.pow(growth, n);
};

function getEnemyLevelOffset(floorNumber: number, roomType: RoomType): number {
  if (roomType === 'battle_Normal') {
    return Math.max(0, floorNumber - 1);
  }

  if (roomType === 'battle_Elite') {
    return floorNumber + 2;
  }

  return 12;
}

export function getEnemyLevelForRoom(dungeonExpLevel: number, floorNumber: number, roomType: RoomType): number {
  return clampEnemyLevel(dungeonExpLevel + getEnemyLevelOffset(floorNumber, roomType));
}

export function getEnemyMultipliersForLevel(enemyLevel: number): CombatMultipliers {
  const n = clampEnemyLevel(enemyLevel);

  return {
    hp: round2(applyEnemyLevelGrowth(n, 1.16, 25, 0.0012, 49, 0.00006)),
    attack: round2(applyEnemyLevelGrowth(n, 1.09, 25, 0.00055, 49, 0.00003)),
    attackAmplifier: round2(applyEnemyLevelGrowth(n, 1.04, 25, 0.00022, 49, 0.000024)),
    noa: round2(applyEnemyLevelGrowth(n, 1.05, 25, 0.00028, 49, 0.00002)),
    defense: round2(applyEnemyLevelGrowth(n, 1.11, 25, 0.00058, 49, 0.00004)),
    defenseAmplifier: 1.0,
  };
}

function buildFloorRoomMultipliers(maxFloor: number): Record<number, Record<RoomType, CombatMultipliers>> {
  const roomTypeMultipliers: Record<RoomType, CombatMultipliers> = {
    battle_Normal: { hp: 1.0, attack: 1.0, noa: 1.0, attackAmplifier: 1.0, defense: 1.0, defenseAmplifier: 1.0 },
    battle_Elite: { hp: 1.3, attack: 1.2, noa: 1.0, attackAmplifier: 1.02, defense: 1.2, defenseAmplifier: 1.0 },
    battle_Boss: { hp: 1.69, attack: 1.45, noa: 1.0, attackAmplifier: 1.05, defense: 1.45, defenseAmplifier: 1.0 },
  };

  return Array.from({ length: maxFloor }, (_, index) => {
    const floorNumber = index + 1;
    const base = {
      hp: Math.pow(1.149, floorNumber - 1),
      attack: Math.pow(1.0845, floorNumber - 1),
      noa: Math.pow(1.05, floorNumber - 1),
      attackAmplifier: Math.pow(1.03, floorNumber - 1),
      defense: Math.pow(1.0845, floorNumber - 1),
      defenseAmplifier: Math.pow(0.97, floorNumber - 1),
    };

    const roomMultipliers = Object.fromEntries(
      (Object.entries(roomTypeMultipliers) as [RoomType, CombatMultipliers][]).map(([roomType, roomMult]) => [
        roomType,
        {
          hp: round2(base.hp * roomMult.hp),
          attack: round2(base.attack * roomMult.attack),
          noa: round2(base.noa * roomMult.noa),
          attackAmplifier: round2(base.attackAmplifier * roomMult.attackAmplifier),
          defense: round2(base.defense * roomMult.defense),
          defenseAmplifier: round2(base.defenseAmplifier * roomMult.defenseAmplifier),
        },
      ])
    ) as Record<RoomType, CombatMultipliers>;

    return [floorNumber, roomMultipliers] as const;
  }).reduce<Record<number, Record<RoomType, CombatMultipliers>>>((acc, [floorNumber, multipliers]) => {
    acc[floorNumber] = multipliers;
    return acc;
  }, {});
}

const FLOOR_ROOM_MULTIPLIERS = buildFloorRoomMultipliers(6);

function buildExpeditionEnemyMultipliers(maxTier: number): ExpeditionEnemyMultipliers[] {
  const multipliers: ExpeditionEnemyMultipliers[] = [
    { hp: 1, attack: 1, noa: 1, attackAmplifier: 1, defense: 1, defenseAmplifier: 1, experience: 1 },
  ];

  for (let tier = 2; tier <= maxTier; tier += 1) {
    const prev = multipliers[tier - 2];
    const hpMultiplier = 3 - 0.13 * (tier - 2);
    const attackMultiplier = 1.8 - 0.047 * (tier - 2) - Math.max(0, 0.021 * (tier - 6));
    const attackAmplifierMultiplier = 1.3 - 0.015 * (tier - 2) - Math.max(0, 0.008 * (tier - 6));
    const noaIncrease = Math.max(0.1, 1 - 0.1 * (tier - 2));
    const defenseMultiplier = 2 - 0.072 * (tier - 2) - Math.max(0, 0.007 * (tier - 6));
    multipliers.push({
      hp: round2(prev.hp * hpMultiplier),
      attack: round2(prev.attack * attackMultiplier),
      noa: round2(prev.noa + noaIncrease),
      attackAmplifier: round2(prev.attackAmplifier * attackAmplifierMultiplier),
      defense: round2(prev.defense * defenseMultiplier),
      defenseAmplifier: round2(Math.pow(0.9, tier - 1) + 0.01 * Math.max(0, tier - 6)),
      experience: round2(prev.experience * hpMultiplier),
    });
  }

  return multipliers;
}

// Expedition enemy multipliers (Specification 2.3.1)
export const EXPEDITION_ENEMY_MULTIPLIERS: ExpeditionEnemyMultipliers[] = [
  ...buildExpeditionEnemyMultipliers(8),
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
    tier: 1,
    expLevel: 1,
    name: 'ケイナイアン平原',
    enemyPoolIds: [1],
    bossId: 101,
    enemyMultipliers: EXPEDITION_ENEMY_MULTIPLIERS[0],
    floors: createFloors(1, 101),
  },

  // Tier 2: ルピニアンの断崖 (Lupinian Crag)
  {
    id: 2,
    tier: 2,
    expLevel: 7,
    name: 'ルピニアンの断崖',
    enemyPoolIds: [2],
    bossId: 201,
    enemyMultipliers: EXPEDITION_ENEMY_MULTIPLIERS[1],
    floors: createFloors(2, 201),
  },

  // Tier 3: ヴァルンの樹林帯 (Vulpinian Taiga)
  {
    id: 3,
    tier: 3,
    expLevel: 14,
    name: 'ヴァルンの樹林帯',
    enemyPoolIds: [3],
    bossId: 301,
    enemyMultipliers: EXPEDITION_ENEMY_MULTIPLIERS[2],
    floors: createFloors(3, 301),
  },

  // Tier 4: ウルサンの霊峰 (Ursan Peaks)
  {
    id: 4,
    tier: 4,
    expLevel: 21,
    name: 'ウルサンの霊峰',
    enemyPoolIds: [4],
    bossId: 401,
    enemyMultipliers: EXPEDITION_ENEMY_MULTIPLIERS[3],
    floors: createFloors(4, 401),
  },

  // Tier 5: フェリディの茂み (Felidian Grove)
  {
    id: 5,
    tier: 5,
    expLevel: 28,
    name: 'フェリディの茂み',
    enemyPoolIds: [5],
    bossId: 501,
    enemyMultipliers: EXPEDITION_ENEMY_MULTIPLIERS[4],
    floors: createFloors(5, 501),
  },

  // Tier 6: マステリドの巣穴 (Mustelid Burrow)
  {
    id: 6,
    tier: 6,
    expLevel: 35,
    name: 'マステリドの巣穴',
    enemyPoolIds: [6],
    bossId: 601,
    enemyMultipliers: EXPEDITION_ENEMY_MULTIPLIERS[5],
    floors: createFloors(6, 601),
  },

  // Tier 7: レポリアンの庭園 (Leporian Garden)
  {
    id: 7,
    tier: 7,
    expLevel: 42,
    name: 'レポリアンの庭園',
    enemyPoolIds: [7],
    bossId: 701,
    enemyMultipliers: EXPEDITION_ENEMY_MULTIPLIERS[6],
    floors: createFloors(7, 701),
  },

  // Tier 8: セルヴィンの谷 (Cervin Vale)
  {
    id: 8,
    tier: 8,
    expLevel: 49,
    name: 'セルヴィンの谷',
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
  return getDungeonById(dungeonId)?.tier ?? 1;
}

export const LUNA_MODE_ENEMY_LEVEL_BONUS = 5;

export function getEffectiveExpeditionTier(dungeonId: number, _isLunaMode: boolean): number {
  return getExpeditionTier(dungeonId);
}

export function getEffectiveEnemyMultipliers(dungeon: Dungeon, isLunaMode: boolean): ExpeditionEnemyMultipliers {
  return isLunaMode ? { ...dungeon.enemyMultipliers } : dungeon.enemyMultipliers;
}

export function getEffectiveEnemyLevel(
  dungeonExpLevel: number,
  floorNumber: number,
  roomType: RoomType,
  isLunaMode: boolean,
): number {
  const roomEnemyLevel = getEnemyLevelForRoom(dungeonExpLevel, floorNumber, roomType);
  return clampEnemyLevel(roomEnemyLevel + (isLunaMode ? LUNA_MODE_ENEMY_LEVEL_BONUS : 0));
}

// Get expedition multiplier for enemy stat scaling
export function getExpeditionEnemyMultipliers(dungeonId: number): ExpeditionEnemyMultipliers {
  const tier = getExpeditionTier(dungeonId);
  return EXPEDITION_ENEMY_MULTIPLIERS[tier - 1] ?? EXPEDITION_ENEMY_MULTIPLIERS[0];
}

export function getExpeditionEnemyMultipliersForTier(tier: number): ExpeditionEnemyMultipliers {
  return EXPEDITION_ENEMY_MULTIPLIERS[tier - 1] ?? EXPEDITION_ENEMY_MULTIPLIERS[0];
}
