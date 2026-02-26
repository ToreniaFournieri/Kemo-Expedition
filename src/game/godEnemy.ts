import { DUNGEONS, getDungeonById, getEffectiveEnemyMultipliers, getEffectiveExpeditionTier } from '../data/dungeons';
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

  const effectiveTier = getEffectiveExpeditionTier(dungeon.id, isLunaMode);
  const effectiveDungeon = {
    ...dungeon,
    tier: effectiveTier,
    enemyMultipliers: getEffectiveEnemyMultipliers(dungeon, isLunaMode),
  };

  const scaledEnemy = applyEnemyEncounterScaling(baseEnemy, effectiveDungeon, 6, 'battle_Boss');

  return {
    ...scaledEnemy,
    name: `神魔 ${getGodShortName(profile.displayName)}`,
    enemyClass: profile.enemyClass,
    abilities: profile.abilities.map((ability) => ability.id),
  };
}
