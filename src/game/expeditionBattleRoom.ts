import type {
  Dungeon,
  EnemyDef,
  GameBags,
  RoomType,
  TerrainEffectKey,
} from '../types/index.ts';
import {
  getEnemyById,
  getBossEnemy,
  getSortedElitesByPool,
  getSortedEnemiesByPool,
  getEnemyDropCandidates,
} from '../data/enemies.ts';
import {
  getEffectiveEnemyMultipliers,
  getEffectiveExpeditionTier,
} from '../data/dungeons.ts';
import { getGodProfileForDungeon } from '../data/dropTables.ts';
import {
  calculateEnemyAttackValues,
  executeBattle,
  type BattleExecutionOptions,
  type BattleResolution,
} from './battle.ts';
import { buildColosseumEnemy, getColosseumEnemySettings } from './colosseum.ts';
import { resolveEnemyPassiveAbilities } from './enemyPassiveAbilities.ts';
import { getEncounterEnemyWithScaling, getRoomMultiplier } from './enemyScaling.ts';
import { getExpeditionRoomTerrainEffect, type ExpeditionRunContext } from './expeditionRunContext.ts';
import { buildGodRuntimeEnemy } from './godEnemy.ts';
import { addOrcaEnemyAbilities, normalizeOrcaEnemyLevelOffset } from './runtimeGameMode.ts';

export interface ExpeditionBattleRoomDefinition {
  readonly type: RoomType;
  readonly poolId?: number;
  readonly bossId?: number;
  readonly enemyIds?: readonly number[];
}

export interface SelectExpeditionRoomEnemyInput {
  readonly room: ExpeditionBattleRoomDefinition;
  readonly floorNumber: number;
  readonly usedEnemyIdsInRange?: ReadonlySet<number>;
  readonly random: () => number;
}

export interface ResolveExpeditionBattleRoomInput {
  readonly context: ExpeditionRunContext;
  readonly dungeon: Dungeon;
  readonly floorNumber: number;
  readonly floorTerrainEffect?: TerrainEffectKey;
  readonly room: ExpeditionBattleRoomDefinition;
  readonly currentHp: number;
  readonly bags: GameBags;
  readonly usedEnemyIdsInRange?: ReadonlySet<number>;
  readonly isGodsBattle: boolean;
  readonly random: () => number;
  readonly encounterCache?: Map<string, EnemyDef>;
  readonly battleOptions?: BattleExecutionOptions;
}

export interface ExpeditionBattleRoomResult {
  readonly baseEnemyId: number;
  readonly enemy: EnemyDef;
  readonly roomMultiplier: number;
  readonly terrainEffect?: TerrainEffectKey;
  readonly battleStartBags: GameBags;
  readonly updatedBags: GameBags;
  readonly battleResult: BattleResolution;
  readonly damageDealt: number;
  readonly damageTaken: number;
  readonly enemyAttackValues: string;
  readonly revealedAbilityIds: readonly string[];
  readonly revealedItemIds: readonly number[];
}

// SpecRef: 4.2 | EXPEDITION_&_ENEMY_MASTER_DATA | Room range enemy uniqueness
export function selectExpeditionRoomEnemy(
  input: SelectExpeditionRoomEnemyInput,
): EnemyDef | null {
  const { room, floorNumber, random } = input;
  if (room.poolId === 99 || room.bossId === 9901) {
    return buildColosseumEnemy(getColosseumEnemySettings());
  }

  if (room.type === 'battle_Boss' && room.bossId) {
    return getBossEnemy(room.bossId) ?? null;
  }

  if ((room.enemyIds?.length ?? 0) > 0) {
    const explicitEnemies = room.enemyIds!
      .map((enemyId) => getEnemyById(enemyId))
      .filter((enemy): enemy is EnemyDef => enemy !== undefined)
      .sort((a, b) => a.id - b.id);
    const usedEnemyIds = input.usedEnemyIdsInRange ?? new Set<number>();
    const availableEnemies = explicitEnemies.filter((enemy) => !usedEnemyIds.has(enemy.id));
    const selectableEnemies = availableEnemies.length > 0 ? availableEnemies : explicitEnemies;
    if (selectableEnemies.length > 0) {
      const randomIndex = Math.floor(random() * selectableEnemies.length);
      return selectableEnemies[randomIndex] ?? selectableEnemies[0] ?? null;
    }
  }

  if (!room.poolId) return null;

  if (room.type === 'battle_Elite') {
    const elites = getSortedElitesByPool(room.poolId);
    if (elites.length === 0) return null;
    if (floorNumber <= elites.length) {
      return elites[floorNumber - 1] ?? null;
    }
    return elites[Math.floor(random() * elites.length)] ?? null;
  }

  const enemies = getSortedEnemiesByPool(room.poolId);
  if (enemies.length === 0) return null;

  const poolOffset = Math.max(0, Math.min(5, floorNumber - 1)) * 5;
  const floorPool = enemies.slice(poolOffset, poolOffset + 5);
  if (floorPool.length > 0) {
    return floorPool[Math.floor(random() * floorPool.length)] ?? floorPool[0] ?? null;
  }

  return enemies[Math.floor(random() * enemies.length)] ?? null;
}

function getGodShortName(displayName: string): string {
  return displayName.split(/[ ,]/)[0] ?? displayName;
}

function createGodEnemy(
  enemy: EnemyDef,
  dungeonId: number,
  dungeonName: string,
  difficultyOffset: number,
): EnemyDef {
  const godProfile = getGodProfileForDungeon(dungeonId, dungeonName);
  const godName = godProfile ? getGodShortName(godProfile.displayName) : enemy.name;

  if (!godProfile) {
    return {
      ...enemy,
      name: godName,
      hp: Math.max(1, Math.floor(enemy.hp * 2.6)),
      rangedAttack: Math.max(0, Math.floor(enemy.rangedAttack * 1.7)),
      magicalAttack: Math.max(0, Math.floor(enemy.magicalAttack * 1.7)),
      meleeAttack: Math.max(0, Math.floor(enemy.meleeAttack * 1.7)),
      rangedNoA: Math.max(1, Math.ceil(enemy.rangedNoA * 1.2)),
      magicalNoA: Math.max(1, Math.ceil(enemy.magicalNoA * 1.2)),
      meleeNoA: Math.max(1, Math.ceil(enemy.meleeNoA * 1.2)),
      rangedAttackAmplifier: enemy.rangedAttackAmplifier * 1.25,
      magicalAttackAmplifier: enemy.magicalAttackAmplifier * 1.25,
      meleeAttackAmplifier: enemy.meleeAttackAmplifier * 1.25,
      physicalDefense: Math.max(0, Math.floor(enemy.physicalDefense * 1.6)),
      magicalDefense: Math.max(0, Math.floor(enemy.magicalDefense * 1.6)),
      physicalDefenseAmplifier: enemy.physicalDefenseAmplifier * 1.15,
      magicalDefenseAmplifier: enemy.magicalDefenseAmplifier * 1.15,
      experience: Math.floor(enemy.experience * 2.2),
    };
  }

  const runtimeGodEnemy = buildGodRuntimeEnemy(godProfile, difficultyOffset);
  if (!runtimeGodEnemy) {
    return {
      ...enemy,
      name: godName,
      nameKey: undefined,
      enemyClass: godProfile.enemyClass,
      abilities: godProfile.abilities,
      itemIds: godProfile.itemIds,
      isGodEnemy: true,
    };
  }

  return {
    ...enemy,
    ...runtimeGodEnemy,
    id: godProfile.enemyId,
    type: enemy.type,
    spawnTier: enemy.spawnTier,
    spawnPool: enemy.spawnPool,
    poolId: enemy.poolId,
    itemIds: godProfile.itemIds,
    isGodEnemy: true,
  };
}

export function resolveExpeditionBattleRoom(
  input: ResolveExpeditionBattleRoomInput,
): ExpeditionBattleRoomResult | null {
  let baseEnemy = selectExpeditionRoomEnemy(input);
  if (!baseEnemy) return null;

  const difficultyOffset = input.context.difficulty.offset;
  const modeLevelOffset = input.context.gameMode === 'mode.orca' ? input.context.enemyLevelOffset : 0;
  if (baseEnemy.poolId === 99 && input.context.gameMode === 'mode.orca' && modeLevelOffset > 0) {
    const colosseumSettings = getColosseumEnemySettings();
    baseEnemy = buildColosseumEnemy({
      ...colosseumSettings,
      level: Math.min(99, colosseumSettings.level + normalizeOrcaEnemyLevelOffset(modeLevelOffset)),
    });
  }
  const roomMultiplier = getRoomMultiplier(
    input.dungeon.expLevel,
    input.floorNumber,
    input.room.type,
    false,
    difficultyOffset + modeLevelOffset,
  );
  const effectiveTier = getEffectiveExpeditionTier(input.dungeon.id, false);
  const effectiveDungeon = {
    ...input.dungeon,
    tier: effectiveTier,
    enemyMultipliers: getEffectiveEnemyMultipliers(input.dungeon, false),
  };
  const encounterCacheKey = input.encounterCache
    ? `${baseEnemy.id}:${effectiveDungeon.id}:${effectiveDungeon.expLevel}:${effectiveTier}:${input.floorNumber}:${input.room.type}:${difficultyOffset}`
    : null;
  let enemy = encounterCacheKey ? input.encounterCache!.get(encounterCacheKey) : undefined;
  if (!enemy) {
    enemy = getEncounterEnemyWithScaling(
      baseEnemy,
      effectiveDungeon,
      input.floorNumber,
      input.room.type,
      {
        isLunaMode: false,
        difficultyOffset,
        gameMode: input.context.gameMode,
        enemyLevelOffset: input.context.enemyLevelOffset,
      },
    );
    if (encounterCacheKey) input.encounterCache!.set(encounterCacheKey, enemy);
  }
  if (input.isGodsBattle && input.room.type === 'battle_Boss') {
    enemy = createGodEnemy(enemy, input.dungeon.id, input.dungeon.name, difficultyOffset + modeLevelOffset);
    if (input.context.gameMode === 'mode.orca') {
      const withModeAbilities = addOrcaEnemyAbilities(enemy);
      enemy = { ...withModeAbilities, abilities: resolveEnemyPassiveAbilities(withModeAbilities.abilities) };
    }
  }

  const terrainEffect = getExpeditionRoomTerrainEffect(input.context, input.floorTerrainEffect);
  const battleStartBags = input.bags;
  const battleResult = input.battleOptions?.outputMode === 'result-only'
    ? executeBattle(
      input.context.statusParty,
      enemy,
      input.bags,
      input.currentHp,
      { terrainEffect, partyStatus: input.context.partyStatus },
      { outputMode: 'result-only', compactResultOutput: input.battleOptions.compactResultOutput },
    )
    : executeBattle(
      input.context.statusParty,
      enemy,
      input.bags,
      input.currentHp,
      { terrainEffect, partyStatus: input.context.partyStatus },
    );

  return {
    baseEnemyId: baseEnemy.id,
    enemy,
    roomMultiplier,
    ...(terrainEffect ? { terrainEffect } : {}),
    battleStartBags,
    updatedBags: {
      ...input.bags,
      physicalThreatBag: battleResult.updatedBags.physicalThreatBag,
      magicalThreatBag: battleResult.updatedBags.magicalThreatBag,
    },
    battleResult,
    damageDealt: enemy.hp - Math.max(0, battleResult.enemyHp),
    damageTaken: Math.max(0, input.currentHp - battleResult.partyHp),
    enemyAttackValues: calculateEnemyAttackValues(enemy, input.context.partyStats),
    revealedAbilityIds: enemy.abilities.map((ability) => ability.id),
    revealedItemIds: getEnemyDropCandidates(enemy).map((item) => item.id),
  };
}
