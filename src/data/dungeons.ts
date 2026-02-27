import { Dungeon, ExpeditionEnemyMultipliers, FloorDef, RoomType } from '../types';

type CombatMultipliers = NonNullable<FloorDef['multipliers']>;

const round2 = (value: number): number => Number(value.toFixed(2));

function buildFloorRoomMultipliers(maxFloor: number): Record<number, Record<RoomType, CombatMultipliers>> {
  const roomTypeMultipliers: Record<RoomType, CombatMultipliers> = {
    battle_Normal: { hp: 1.0, attack: 1.0, noa: 1.0, attackAmplifier: 1.0, defense: 1.0, defenseAmplifier: 1.0 },
    battle_Elite: { hp: 1.5, attack: 1.2, noa: 1.0, attackAmplifier: 1.02, defense: 1.2, defenseAmplifier: 1.0 },
    battle_Boss: { hp: 2.0, attack: 1.5, noa: 1.0, attackAmplifier: 1.05, defense: 1.5, defenseAmplifier: 1.0 },
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
    multipliers.push({
      hp: round2(prev.hp * (4 - 0.3 * (tier - 2))),
      attack: round2(prev.attack * (2 - 0.1 * (tier - 2))),
      noa: round2(prev.noa + (1 - 0.1 * (tier - 2))),
      attackAmplifier: round2(prev.attackAmplifier * (1.4 - 0.04 * (tier - 2))),
      defense: round2(prev.defense * (2 - 0.1 * (tier - 2))),
      defenseAmplifier: round2(Math.pow(0.9, tier - 1)),
      experience: round2(prev.experience * (4 - 0.3 * (tier - 2))),
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
    expLevel: 8,
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
    expLevel: 16,
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
    expLevel: 24,
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
    expLevel: 32,
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
    expLevel: 40,
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
    expLevel: 48,
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
    expLevel: 56,
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

export const LUNA_MODE_MULTIPLIERS = {
  hp: 4,
  attack: 1.6,
  noa: 1.3,
  attackAmplifier: 1.6,
  defense: 1.4,
  defenseAmplifier: 0.9,
  enemyLevel: 2,
} as const;

export function getEffectiveExpeditionTier(dungeonId: number, _isLunaMode: boolean): number {
  return getExpeditionTier(dungeonId);
}

export function getEffectiveEnemyMultipliers(dungeon: Dungeon, isLunaMode: boolean): ExpeditionEnemyMultipliers {
  if (!isLunaMode) return dungeon.enemyMultipliers;

  return {
    ...dungeon.enemyMultipliers,
    hp: dungeon.enemyMultipliers.hp * LUNA_MODE_MULTIPLIERS.hp,
    attack: dungeon.enemyMultipliers.attack * LUNA_MODE_MULTIPLIERS.attack,
    noa: dungeon.enemyMultipliers.noa * LUNA_MODE_MULTIPLIERS.noa,
    attackAmplifier: dungeon.enemyMultipliers.attackAmplifier * LUNA_MODE_MULTIPLIERS.attackAmplifier,
    defense: dungeon.enemyMultipliers.defense * LUNA_MODE_MULTIPLIERS.defense,
    defenseAmplifier: dungeon.enemyMultipliers.defenseAmplifier * LUNA_MODE_MULTIPLIERS.defenseAmplifier,
  };
}

export function getEffectiveEnemyLevel(dungeonExpLevel: number, floorNumber: number, isLunaMode: boolean): number {
  return dungeonExpLevel + (floorNumber - 1) + (isLunaMode ? LUNA_MODE_MULTIPLIERS.enemyLevel : 0);
}

// Get expedition multiplier for enemy stat scaling
export function getExpeditionEnemyMultipliers(dungeonId: number): ExpeditionEnemyMultipliers {
  const tier = getExpeditionTier(dungeonId);
  return EXPEDITION_ENEMY_MULTIPLIERS[tier - 1] ?? EXPEDITION_ENEMY_MULTIPLIERS[0];
}

export function getExpeditionEnemyMultipliersForTier(tier: number): ExpeditionEnemyMultipliers {
  return EXPEDITION_ENEMY_MULTIPLIERS[tier - 1] ?? EXPEDITION_ENEMY_MULTIPLIERS[0];
}
