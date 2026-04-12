import { RoomType } from '../types';

const XP_TO_NEXT_BASE = 1000;
const XP_TO_NEXT_GROWTH_BASE = 1.259;

function getXpGrowthRate(level: number): number {
  const normalizedLevel = Math.max(1, Math.min(99, level));
  return XP_TO_NEXT_GROWTH_BASE
    - Math.max(0, 0.00070 * (normalizedLevel - 7))
    - Math.max(0, 0.00035 * (normalizedLevel - 14))
    - Math.max(0, 0.00018 * (normalizedLevel - 21))
    - Math.max(0, 0.00008 * (normalizedLevel - 28))
    - Math.max(0, 0.00004 * (normalizedLevel - 35))
    - Math.max(0, 0.00002 * (normalizedLevel - 42))
    - Math.max(0, 0.00001 * (normalizedLevel - 49));
}

// SpecRef: 2.1.1.1 | Level and slots | f.XP_to_next
export function getXpToNextLevel(level: number): number {
  const normalizedLevel = Math.max(1, Math.min(99, level));
  const growthRate = getXpGrowthRate(normalizedLevel);
  return Math.ceil(XP_TO_NEXT_BASE * (growthRate ** Math.max(0, normalizedLevel - 1)));
}

function getEnemyTypeExperienceMultiplier(roomType: RoomType, isGodsBattle: boolean): number {
  if (isGodsBattle) return 3.0;
  if (roomType === 'battle_Boss') return 1.5;
  if (roomType === 'battle_Elite') return 1.25;
  return 1.0;
}

// SpecRef: 2.1.1.1 | Level and slots | calculateExperience
export function calculateExperience(
  baseExperience: number,
  roomType: RoomType,
  partyLevel: number,
  enemyLevelFinal: number,
  isGodsBattle = false,
): number {
  // SpecRef: 2.1.1.1 | Level and slots | f.experience
  const enemyTypeExpMultiplier = getEnemyTypeExperienceMultiplier(roomType, isGodsBattle);
  const experiencePenalty = 0.5 ** Math.max(0, partyLevel - enemyLevelFinal);
  return baseExperience * enemyLevelFinal * enemyTypeExpMultiplier * experiencePenalty;
}
