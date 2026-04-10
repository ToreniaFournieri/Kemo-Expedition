import { DUNGEONS, getDungeonById, getEffectiveEnemyMultipliers, getExpeditionEnemyMultipliersForTier } from '../data/dungeons';
import { getEnemiesByPool } from '../data/enemies';
import { GodEnemyProfile } from '../data/dropTables';
import { EnemyDef } from '../types';
import { applyEnemyEncounterScaling } from './enemyScaling';
import { resolveEnemyPassiveAbilities } from './enemyPassiveAbilities';

function getGodShortName(displayName: string): string {
  return displayName.split(' ')[0] ?? displayName;
}

function getBaseGodEnemy(profile: GodEnemyProfile): EnemyDef | null {
  return getEnemiesByPool(profile.tier)
    .sort((a, b) => a.id - b.id)
    .find((candidate) => candidate.enemyClass === profile.enemyClass) ?? null;
}

// SpecRef: 4.1.2 | Enemy | Gods (神魔)
// SpecRef: 8.3 | UI_EXPEDITION | Difficulty Offset (難易度)
export function buildGodRuntimeEnemy(
  profile: GodEnemyProfile,
  isLunaMode: boolean,
  difficultyOffset: number = 0,
): EnemyDef | null {
  const baseEnemy = getBaseGodEnemy(profile);
  const dungeon = DUNGEONS.find((candidate) => candidate.tier === profile.tier)
    ?? getDungeonById(profile.tier)
    ?? null;
  if (!baseEnemy || !dungeon) return null;

  const effectiveTier = profile.tier;
  const effectiveExpLevel = Math.max(1, profile.level - 10);
  const tierMultipliers = getExpeditionEnemyMultipliersForTier(profile.tier);
  const effectiveDungeon = {
    ...dungeon,
    tier: effectiveTier,
    expLevel: effectiveExpLevel,
    enemyMultipliers: getEffectiveEnemyMultipliers(
      {
        ...dungeon,
        tier: effectiveTier,
        expLevel: effectiveExpLevel,
        enemyMultipliers: tierMultipliers,
      },
      isLunaMode
    ),
  };

  const resolvedProfileAbilities = resolveEnemyPassiveAbilities(profile.abilities);
  const scaledEnemy = applyEnemyEncounterScaling({
    ...baseEnemy,
    abilities: resolvedProfileAbilities,
  }, effectiveDungeon, 6, 'battle_Boss', {
    isGodEnemy: true,
    isLunaMode,
    difficultyOffset,
  });

  return {
    ...scaledEnemy,
    name: getGodShortName(profile.displayName),
    enemyClass: profile.enemyClass,
    abilities: resolvedProfileAbilities,
  };
}
