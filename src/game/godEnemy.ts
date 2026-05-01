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
  const candidates = getEnemiesByPool(profile.tier).slice().sort((a, b) => a.id - b.id);

  const exactClass = candidates.find((candidate) => candidate.enemyClass === profile.enemyClass);
  if (exactClass) return exactClass;

  // SpecRef: 8.6 | UI_DIVINE_BUREAU | Bestiary (敵キャラクター図鑑)
  // Some god profiles use display-only classes (e.g. rogue/fighter) that are not present
  // in encounter pools. Fall back to representative enemy type so status remains resolvable.
  return candidates.find((candidate) => candidate.enemyType === profile.representFor) ?? null;
}

// SpecRef: 4.1.2 | Enemy | Gods (神魔)
// SpecRef: 8.3 | UI_EXPEDITION | Difficulty Offset (難易度)
export function buildGodRuntimeEnemy(
  profile: GodEnemyProfile,
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
      false
    ),
  };

  const resolvedProfileAbilities = resolveEnemyPassiveAbilities(profile.abilities);
  const scaledEnemy = applyEnemyEncounterScaling({
    ...baseEnemy,
    abilities: resolvedProfileAbilities,
  }, effectiveDungeon, 6, 'battle_Boss', {
    isGodEnemy: true,
    isLunaMode: false,
    difficultyOffset,
  });

  return {
    ...scaledEnemy,
    name: getGodShortName(profile.displayName),
    enemyClass: profile.enemyClass,
    abilities: resolvedProfileAbilities,
  };
}
