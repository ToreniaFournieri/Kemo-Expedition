import { ENEMIES } from '../data/enemies';
import type { EnemyDef } from '../types';
import { getAltarLevel, getAltarVictoriesForEnemyType, getEnemyFormPranaCost, getEnemyRequiredAltarLevel, getRequiredAltarVictories, MAX_ALTAR_LEVEL } from './prana';

// SpecRef: 8.4.5 | Altar (祭壇) | Alter level, Enemy Form List, Unlock Costs
// What the Altar pane shows and the Application API publishes and validates about enemy forms, from one place, so a form the
// pane offers is one the API accepts and the reason a form is locked is the same on both.

export interface AltarGlobalFacts {
  prana: number;
  altarVictoriesByEnemyType: Record<string, number> | undefined;
  unlockedMimorianEnemyIds: readonly number[];
}

export type EnemyFormUnavailableReason = 'already_unlocked' | 'altar_level_too_low' | 'insufficient_prana';

export interface AltarCategoryFacts {
  enemyType: string;
  altarLevel: number;
  victories: number;
  /** Total victories that reach the next Alter level; the current level's own requirement at the maximum level. */
  nextLevelVictories: number;
  maximumLevel: boolean;
  formCount: number;
  unlockedFormCount: number;
}

export interface EnemyFormFacts {
  enemyId: number;
  unlocked: boolean;
  unlockCost: number;
  requiredAltarLevel: number;
  currentAltarLevel: number;
  unavailableReason: EnemyFormUnavailableReason | null;
}

/** The enemy categories (types) in master-data order. */
export function getAltarEnemyTypes(): string[] {
  return Array.from(new Set(ENEMIES.map((enemy) => enemy.enemyType)));
}

export function getAltarCategoryFacts(global: AltarGlobalFacts, enemyType: string): AltarCategoryFacts {
  const victories = getAltarVictoriesForEnemyType(enemyType, global.altarVictoriesByEnemyType);
  const altarLevel = getAltarLevel(victories);
  const forms = ENEMIES.filter((enemy) => enemy.enemyType === enemyType);
  return {
    enemyType,
    altarLevel,
    victories,
    nextLevelVictories: getRequiredAltarVictories(Math.min(MAX_ALTAR_LEVEL, altarLevel + 1)),
    maximumLevel: altarLevel >= MAX_ALTAR_LEVEL,
    formCount: forms.length,
    unlockedFormCount: forms.filter((enemy) => global.unlockedMimorianEnemyIds.includes(enemy.id)).length,
  };
}

export function getEnemyFormFacts(global: AltarGlobalFacts, enemy: EnemyDef): EnemyFormFacts {
  const unlocked = global.unlockedMimorianEnemyIds.includes(enemy.id);
  const unlockCost = getEnemyFormPranaCost(enemy);
  const requiredAltarLevel = getEnemyRequiredAltarLevel(enemy);
  const currentAltarLevel = getAltarLevel(getAltarVictoriesForEnemyType(enemy.enemyType, global.altarVictoriesByEnemyType));
  return {
    enemyId: enemy.id,
    unlocked,
    unlockCost,
    requiredAltarLevel,
    currentAltarLevel,
    unavailableReason: unlocked ? 'already_unlocked' : currentAltarLevel < requiredAltarLevel ? 'altar_level_too_low' : global.prana < unlockCost ? 'insufficient_prana' : null,
  };
}
