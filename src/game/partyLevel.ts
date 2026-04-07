import { RoomType } from '../types';

const XP_TO_NEXT_BASE = 100;
const XP_TO_NEXT_GROWTH = 1.259;

// SpecRef: 2.1.1.1 | Level and slots | getXpToNextLevel
export function getXpToNextLevel(level: number): number {
  return XP_TO_NEXT_BASE * (XP_TO_NEXT_GROWTH ** Math.max(0, level - 1));
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
