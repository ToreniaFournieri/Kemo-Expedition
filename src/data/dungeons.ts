import { Dungeon, ExpeditionEnemyMultipliers, FloorDef, RoomType, TerrainEffectKey } from '../types';
import { MASTER_EXPEDITION_ENEMIES_PACKED } from './masterSpecData';

type CombatMultipliers = {
  hp: number;
  attack: number;
  noa: number;
  attackAmplifier: number;
  defense: number;
  defenseAmplifier: number;
};

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

  return 10;
}

export function getEnemyLevelForRoom(dungeonExpLevel: number, floorNumber: number, roomType: RoomType): number {
  return clampEnemyLevel(dungeonExpLevel + getEnemyLevelOffset(floorNumber, roomType));
}

export function getEnemyMultipliersForLevel(enemyLevel: number): CombatMultipliers {
  const n = clampEnemyLevel(enemyLevel);

  return {
    hp: round2(applyEnemyLevelGrowth(n, 1.192, 25, 0.0008, 49, 0.000195)),
    attack: round2(applyEnemyLevelGrowth(n, 1.09, 25, 0.00049, 49, 0.00007)),
    attackAmplifier: round2(applyEnemyLevelGrowth(n, 1.03, 25, 0.000151, 49, 0.000052)),
    noa: round2(applyEnemyLevelGrowth(n, 1.05, 25, 0.00028, 49, 0.00002)),
    defense: round2(applyEnemyLevelGrowth(n, 1.11, 25, 0.00048, 49, 0.00006)),
    defenseAmplifier: 1.0,
  };
}


function buildExpeditionEnemyMultipliers(maxTier: number): ExpeditionEnemyMultipliers[] {
  const multipliers: ExpeditionEnemyMultipliers[] = [
    { hp: 1, attack: 1, noa: 1, attackAmplifier: 1, defense: 1, physicalDefenseAmplifier: 1, magicalDefenseAmplifier: 1, experience: 1 },
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
      physicalDefenseAmplifier: round2(Math.pow(0.9, tier - 1) + 0.01 * Math.max(0, tier - 6)),
      magicalDefenseAmplifier: round2(Math.pow(0.9, tier - 1) + 0.01 * Math.max(0, tier - 6)),
      experience: round2(prev.experience * hpMultiplier),
    });
  }

  return multipliers;
}

// Expedition enemy multipliers (Specification 2.3.1)
const EXPEDITION_ENEMY_MULTIPLIERS: ExpeditionEnemyMultipliers[] = [
  ...buildExpeditionEnemyMultipliers(8),
];

const EXPEDITION_FLOOR_CONCEPTS: Record<number, string[]> = {
  1: ['風渡る草原', '捕食者の縄張り', '群生の巣盆地', '見張り台', '埋没遺跡原野', 'ケイナイアンの廃都'],
  2: ['雪の森', '腐木の小径', '食肉植物群生地', '氷柱迷宮', '水晶洞窟', '水晶宮殿跡'],
  3: ['陽だまりの浜辺', '静穏の海', '難破船', '海蝕門', '打ち捨てられた漁村', 'ヴルピニアン長老会の聖廷'],
  4: ['砂漠の静夜', '岩石台地', '石灰洞窟', '夜盗の待ち伏せ', '失われた宝石の追跡', '豊穣の神殿'],
  5: ['迷いの森', '険しき山道', 'ウルサンの戦陣', '竜の尾根', '火山火口', '要塞'],
  6: ['蒸気仕掛けの地下穴', 'K9星間宇宙船の残骸', '禁断の研究施設', '心なき機械', '主なき艦橋', '共鳴の祭壇'],
  7: ['巨大残骸環', '転送装置区画', '光の領域', '闇の領域', '深淵', '月宮殿'],
  8: ['虚痕の峡谷門', '亜世界', 'もう一つの人々', 'ゲヘナ', 'セルヴィン文書保管街区', '千里眼の聖域'],
};

const EXPEDITION_FLOOR_TERRAIN_EFFECTS: Record<number, TerrainEffectKey[]> = {
  1: ['terrain.rejuvenation', 'terrain.predation', 'terrain.fog', 'terrain.exposure', 'terrain.thunderstorm', 'terrain.tailwind'],
  2: ['terrain.chill', 'terrain.rotwood', 'terrain.vine-snare', 'terrain.chill', 'terrain.crystal-zone', 'terrain.floor-domain'],
  3: ['terrain.sunny-beach', 'terrain.silence-field', 'terrain.rough-waves', 'terrain.rough-waves', 'terrain.conduction', 'terrain.sacred-judgement'],
  4: ['terrain.dry', 'terrain.heavy-wind', 'terrain.limestone-cave', 'terrain.frenzy', 'terrain.dry', 'terrain.abundant'],
  5: ['terrain.looping-path', 'terrain.enemy-high-ground', 'terrain.ash-haze', 'terrain.heatwave', 'terrain.heatwave', 'terrain.fortified'],
  6: ['terrain.burrow', 'terrain.leakage', 'terrain.deletion', 'terrain.machine-logic', 'terrain.cap-domain', 'terrain.echo-domain'],
  7: ['terrain.decay', 'terrain.chain-lightning', 'terrain.light-field', 'terrain.dark-field', 'terrain.dark-field', 'terrain.low-gravity'],
  8: ['terrain.mana-burn', 'terrain.gravity', 'terrain.transcendence', 'terrain.gehenna', 'terrain.suppression', 'terrain.sanctuary'],
};

export function getExpeditionFloorConcept(expeditionId: number, floorNumber: number): string | null {
  const concepts = EXPEDITION_FLOOR_CONCEPTS[expeditionId];
  if (!concepts || floorNumber < 1 || floorNumber > concepts.length) {
    return null;
  }

  return concepts[floorNumber - 1] ?? null;
}

type RoomIdKey = `${number}-${number}`;

function buildMasterRoomEnemyIdLookup(poolId: number): Record<RoomIdKey, number[]> {
  const lookup: Record<RoomIdKey, number[]> = {};
  const rows = MASTER_EXPEDITION_ENEMIES_PACKED[poolId] ?? [];
  const append = (floorNumber: number, roomNumber: number, enemyId: number): void => {
    const key: RoomIdKey = `${floorNumber}-${roomNumber}`;
    if (!lookup[key]) {
      lookup[key] = [];
    }
    lookup[key].push(enemyId);
  };

  rows.forEach((row, rowIndex) => {
    const [floorNumber, roomCode] = row;
    // SpecRef: 4.2.2 | Enemy | Enemy_ID
    const enemyId = 100 + (poolId - 1) * 36 + rowIndex;
    const roomNumbers = roomCode === '1-2' ? [1, 2] : [Number(roomCode)];
    roomNumbers.forEach((roomNumber) => append(floorNumber, roomNumber, enemyId));
  });

  return lookup;
}

const MASTER_ROOM_ENEMY_ID_LOOKUP: Record<number, Record<RoomIdKey, number[]>> = Object.fromEntries(
  Array.from({ length: 8 }, (_, index) => {
    const poolId = index + 1;
    return [poolId, buildMasterRoomEnemyIdLookup(poolId)];
  })
);

function getMasterRoomEnemyIds(poolId: number, floorNumber: number, roomNumber: number): number[] {
  const key: RoomIdKey = `${floorNumber}-${roomNumber}`;
  const ids = MASTER_ROOM_ENEMY_ID_LOOKUP[poolId]?.[key] ?? [];
  return ids.slice().sort((a, b) => a - b);
}

// Create floor structure for a dungeon
// Each floor has 4 rooms: 3 Normal + 1 Elite (or Boss on last floor)
function createFloors(poolId: number, bossId: number): FloorDef[] {
  return Array.from({ length: 6 }, (_, index) => {
    const floorNumber = index + 1;
    const isLastFloor = floorNumber === 6;
    return {
      floorNumber,
      multiplier: 1,
      terrainEffect: EXPEDITION_FLOOR_TERRAIN_EFFECTS[poolId]?.[index],
      rooms: [
        { type: 'battle_Normal' as const, poolId, enemyIds: getMasterRoomEnemyIds(poolId, floorNumber, 1) },
        { type: 'battle_Normal' as const, poolId, enemyIds: getMasterRoomEnemyIds(poolId, floorNumber, 2) },
        { type: 'battle_Normal' as const, poolId, enemyIds: getMasterRoomEnemyIds(poolId, floorNumber, 3) },
        isLastFloor
          ? { type: 'battle_Boss' as const, bossId, enemyIds: getMasterRoomEnemyIds(poolId, floorNumber, 4) }
          : { type: 'battle_Elite' as const, poolId, enemyIds: getMasterRoomEnemyIds(poolId, floorNumber, 4) },
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
    bossId: 135,
    enemyMultipliers: EXPEDITION_ENEMY_MULTIPLIERS[0],
    floors: createFloors(1, 135),
  },

  // Tier 2: ルピニアンの亜寒帯 (Lupinian Taiga)
  {
    id: 2,
    tier: 2,
    expLevel: 10,
    name: 'ルピニアンの亜寒帯',
    enemyPoolIds: [2],
    bossId: 171,
    enemyMultipliers: EXPEDITION_ENEMY_MULTIPLIERS[1],
    floors: createFloors(2, 171),
  },

  // Tier 3: ヴァルンの海洋 (Vulpinian Ocean)
  {
    id: 3,
    tier: 3,
    expLevel: 17,
    name: 'ヴァルンの海洋',
    enemyPoolIds: [3],
    bossId: 207,
    enemyMultipliers: EXPEDITION_ENEMY_MULTIPLIERS[2],
    floors: createFloors(3, 207),
  },

  // Tier 4: フェリディ砂漠 (Felidian Desert)
  {
    id: 4,
    tier: 4,
    expLevel: 24,
    name: 'フェリディ砂漠',
    enemyPoolIds: [4],
    bossId: 243,
    enemyMultipliers: EXPEDITION_ENEMY_MULTIPLIERS[3],
    floors: createFloors(4, 243),
  },

  // Tier 5: ウルサンの炎嶺 (Ursan Pyrepeak)
  {
    id: 5,
    tier: 5,
    expLevel: 27,
    name: 'ウルサンの炎嶺',
    enemyPoolIds: [5],
    bossId: 279,
    enemyMultipliers: EXPEDITION_ENEMY_MULTIPLIERS[4],
    floors: createFloors(5, 279),
  },

  // Tier 6: プロキオン巣穴 (Procyonian Burrow)
  {
    id: 6,
    tier: 6,
    expLevel: 33,
    name: 'プロキオン巣穴',
    enemyPoolIds: [6],
    bossId: 315,
    enemyMultipliers: EXPEDITION_ENEMY_MULTIPLIERS[5],
    floors: createFloors(6, 315),
  },

  // Tier 7: レポリアンの月宮 (Leporian Moon Palace)
  {
    id: 7,
    tier: 7,
    expLevel: 37,
    name: 'レポリアンの月宮',
    enemyPoolIds: [7],
    bossId: 351,
    enemyMultipliers: EXPEDITION_ENEMY_MULTIPLIERS[6],
    floors: createFloors(7, 351),
  },

  // Tier 8: セルヴィンの谷 (Cervin Vale)
  {
    id: 8,
    tier: 8,
    expLevel: 41,
    name: 'セルヴィンの谷',
    enemyPoolIds: [8],
    bossId: 387,
    enemyMultipliers: EXPEDITION_ENEMY_MULTIPLIERS[7],
    floors: createFloors(8, 387),
  },

  {
    id: 99,
    tier: 1,
    expLevel: 1,
    name: '闘技場',
    enemyPoolIds: [99],
    bossId: 9901,
    enemyMultipliers: EXPEDITION_ENEMY_MULTIPLIERS[0],
    floors: [
      {
        floorNumber: 1,
        multiplier: 1,
        rooms: [{ type: 'battle_Boss', poolId: 99, bossId: 9901, enemyIds: [9901] }],
      },
    ],
  },
];

export const getDungeonById = (id: number): Dungeon | undefined =>
  DUNGEONS.find(d => d.id === id);


// Get expedition tier (1-8) from dungeon id
function getExpeditionTier(dungeonId: number): number {
  return getDungeonById(dungeonId)?.tier ?? 1;
}

export const LUNA_MODE_ENEMY_LEVEL_BONUS = 0;

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
  difficultyOffset: number = 0,
): number {
  const roomEnemyLevel = getEnemyLevelForRoom(dungeonExpLevel, floorNumber, roomType);
  return clampEnemyLevel(roomEnemyLevel + (isLunaMode ? LUNA_MODE_ENEMY_LEVEL_BONUS : 0) + difficultyOffset);
}

export function getExpeditionEnemyMultipliersForTier(tier: number): ExpeditionEnemyMultipliers {
  return EXPEDITION_ENEMY_MULTIPLIERS[tier - 1] ?? EXPEDITION_ENEMY_MULTIPLIERS[0];
}
