import { DUNGEONS, getDungeonById, getEffectiveEnemyMultipliers, getExpeditionEnemyMultipliersForTier } from '../data/dungeons';
import { getEnemiesByPool } from '../data/enemies';
import { GodEnemyProfile } from '../data/dropTables';
import { EnemyDef } from '../types';
import { applyEnemyEncounterScaling } from './enemyScaling';

function getGodShortName(displayName: string): string {
  return displayName.split(' ')[0] ?? displayName;
}

function getBaseGodEnemy(profile: GodEnemyProfile): EnemyDef | null {
  return getEnemiesByPool(profile.tier)
    .sort((a, b) => a.id - b.id)
    .find((candidate) => candidate.enemyClass === profile.enemyClass) ?? null;
}

export function buildGodRuntimeEnemy(profile: GodEnemyProfile, isLunaMode: boolean): EnemyDef | null {
  const baseEnemy = getBaseGodEnemy(profile);
  const dungeon = getDungeonById(profile.expId)
    ?? DUNGEONS.find((candidate) => candidate.tier === profile.tier)
    ?? null;
  if (!baseEnemy || !dungeon) return null;

  const effectiveTier = profile.tier;
  const tierMultipliers = getExpeditionEnemyMultipliersForTier(profile.tier);
  const effectiveDungeon = {
    ...dungeon,
    tier: effectiveTier,
    enemyMultipliers: getEffectiveEnemyMultipliers(
      {
        ...dungeon,
        tier: effectiveTier,
        enemyMultipliers: tierMultipliers,
      },
      isLunaMode
    ),
  };

  const scaledEnemy = applyEnemyEncounterScaling(baseEnemy, effectiveDungeon, 6, 'battle_Boss', {
    isGodEnemy: true
  });

  return {
    ...scaledEnemy,
    name: getGodShortName(profile.displayName),
    enemyClass: profile.enemyClass,
    abilities: profile.abilities,
  };
}
