import { RoomType } from '../types';

const XP_TO_NEXT_BASE = 600;
const XP_TO_NEXT_GROWTH_BASE = 1.259;

function getXpGrowthRate(level: number): number {
  const normalizedLevel = Math.max(1, Math.min(99, level));
  return XP_TO_NEXT_GROWTH_BASE
    - Math.max(0, 0.00085 * (normalizedLevel - 12))
    - Math.max(0, 0.00042 * (normalizedLevel - 24))
    - Math.max(0, 0.00018 * (normalizedLevel - 36))
    - Math.max(0, 0.00006 * (normalizedLevel - 48));
}

// SpecRef: 2.1.1.1 | Level and slots | getXpToNextLevel
export function getXpToNextLevel(level: number): number {
  const normalizedLevel = Math.max(1, Math.min(99, level));
  const growthRate = getXpGrowthRate(normalizedLevel);
  return Math.ceil(XP_TO_NEXT_BASE * (growthRate ** Math.max(0, normalizedLevel - 1)));
}

function getRankMultiplier(roomType: RoomType): number {
  if (roomType === 'battle_Boss') return 5.0;
  if (roomType === 'battle_Elite') return 3.0;
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
  const rankMultiplier = isGodsBattle ? 10.0 : getRankMultiplier(roomType);
  const overLevelPenalty = 0.5 ** Math.max(0, partyLevel - enemyLevelFinal);
  return baseExperience * enemyLevelFinal * rankMultiplier * overLevelPenalty;
}
