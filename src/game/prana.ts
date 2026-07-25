import { EnemyDef, Item } from '../types';

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
