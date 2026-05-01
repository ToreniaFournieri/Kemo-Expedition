import { DUNGEONS, getDungeonById, getEffectiveEnemyMultipliers, getExpeditionEnemyMultipliersForTier } from '../data/dungeons';
import { getEnemiesByPool } from '../data/enemies';
import { GodEnemyProfile } from '../data/dropTables';

import { getEnemyTypeAbilities } from '../data/enemies';
import { EnemyAbility, EnemyDef } from '../types';
import { applyEnemyEncounterScaling } from './enemyScaling';
import { resolveEnemyPassiveAbilities } from './enemyPassiveAbilities';


const REPRESENT_FOR_TO_ENEMY_TYPE: Record<string, string> = {
  Caninian: 'Caninian',
  Lupinian: 'Lupinian',
  Vulpinian: 'Vulpinian',
  Ursan: 'Ursan',
  Felidian: 'Felidian',
  Mustelid: 'Mustelid',
  Leporian: 'Leporian',
  Cervin: 'Cervin',
  Murid: 'Murid',
  Procyonian: 'Procyonian',
};

function mergeUniqueAbilities(...groups: EnemyAbility[][]): EnemyAbility[] {
  const merged = new Map<string, EnemyAbility>();
  groups.flat().forEach((ability) => {
    const key = `${ability.id}:${ability.level}`;
    merged.set(key, ability);
  });
  return Array.from(merged.values());
}

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

  const representForEnemyType = REPRESENT_FOR_TO_ENEMY_TYPE[profile.representFor] ?? null;
  const representForAbilities = representForEnemyType ? getEnemyTypeAbilities(representForEnemyType, profile.level) : [];
  const jinmaAbilities = getEnemyTypeAbilities('Jinma', profile.level);
  const resolvedProfileAbilities = resolveEnemyPassiveAbilities(
    mergeUniqueAbilities(baseEnemy.abilities, profile.abilities, representForAbilities, jinmaAbilities),
  );
  const scaledEnemy = applyEnemyEncounterScaling({
    ...baseEnemy,
    enemyType: 'Jinma',
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
    enemyType: 'Jinma',
    abilities: resolvedProfileAbilities,
  };
}
