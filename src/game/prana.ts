import { EnemyDef, Item } from '../types';
import { getEnemyIndividualAbilities, getEnemyIndividualBonuses } from '../data/enemies';

export const MAX_ALTAR_LEVEL = 20;

// SpecRef: 8.4.5 | Altar (祭壇) | Prana
export function getSuperRareItemPrana(item: Item): number {
  if (item.superRare < 1) return 0;
  const rarityCode = item.id % 1000;
  if (rarityCode >= 500) return 50;
  if (rarityCode >= 400) return 10;
  if (rarityCode >= 300) return 5;
  return 1;
}

// SpecRef: 8.4.5 | Altar (祭壇) | Unlock Costs
export function getEnemyFormPranaCost(enemy: EnemyDef): number {
  if (enemy.type === 'boss') return 100;
  if (enemy.type === 'elite') return 50;
  return 10;
}

// SpecRef: 8.4.5 | Altar (祭壇) | Alter level
export function getAltarVictoriesForEnemyType(
  enemyType: string,
  altarVictoriesByEnemyType: Record<string, number> = {},
): number {
  return Math.max(0, Math.floor(altarVictoriesByEnemyType[enemyType] ?? 0));
}

// SpecRef: 8.4.5 | Altar (祭壇) | Alter level
export function getRequiredAltarVictories(level: number): number {
  const normalizedLevel = Math.min(MAX_ALTAR_LEVEL, Math.max(0, Math.floor(level)));
  return 50 * normalizedLevel * (normalizedLevel + 2);
}

// SpecRef: 8.4.5 | Altar (祭壇) | Alter level
export function getAltarLevel(totalVictories: number): number {
  const victories = Math.max(0, Math.floor(totalVictories));
  let level = 0;
  while (level < MAX_ALTAR_LEVEL && victories >= getRequiredAltarVictories(level + 1)) level += 1;
  return level;
}

// SpecRef: 8.4.5 | Altar (祭壇) | Required Alter Level
export function getEnemyRequiredAltarLevel(enemy: EnemyDef): number {
  const tierBase = enemy.type === 'boss' ? 10 : enemy.type === 'elite' ? 5 : 1;
  const additionalCount = getEnemyIndividualAbilities(enemy.id).length
    + getEnemyIndividualBonuses(enemy.id).length;
  return Math.min(MAX_ALTAR_LEVEL, tierBase + additionalCount);
}
