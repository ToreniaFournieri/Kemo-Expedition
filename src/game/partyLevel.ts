import { RoomType } from '../types';

const XP_TO_NEXT_BASE = 100;
const XP_TO_NEXT_GROWTH = 1.259;

export function getXpToNextLevel(level: number): number {
  return XP_TO_NEXT_BASE * (XP_TO_NEXT_GROWTH ** Math.max(0, level - 1));
}

function getRankMultiplier(roomType: RoomType): number {
  if (roomType === 'battle_Boss') return 3.0;
  if (roomType === 'battle_Elite') return 1.5;
  return 1.0;
}

export function calculateExperience(
  baseExperience: number,
  roomType: RoomType,
  tier: number,
  partyLevel: number,
  enemyLevelFinal: number
): number {
  const rankMultiplier = getRankMultiplier(roomType);
  const tierMultiplier = 3 ** Math.max(0, tier - 1);
  const overLevelPenalty = 0.5 ** Math.max(0, partyLevel - enemyLevelFinal);
  return baseExperience * rankMultiplier * tierMultiplier * overLevelPenalty;
}
