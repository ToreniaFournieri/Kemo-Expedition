import { AbilityId, ElementalResistance, EnemyClassId, EnemyDef } from '../types';
import { getEnemyTypeAbilities, getEnemyTypeBonuses } from '../data/enemies';
import { applyEnemyMeleeConversionAttack, getEnemyCyborgizationAdjustment, resolveEnemyPassiveAbilities } from './enemyPassiveAbilities';
import { applyEnemyTypeCBonuses } from './enemyScaling';
import { getEnemyMultipliersForLevel } from '../data/dungeons';
import { createEnvironmentStorageKey } from './environment';
import { buildEnemyClassMasterStats } from '../data/enemyClasses';

// SpecRef: 9 | Environment | Save Data Isolation
const COLOSSEUM_STORAGE_KEY = createEnvironmentStorageKey('kemo-expedition.colosseum-enemy-settings');

export type ColosseumTerrainEffect = 'none' | `terrain.${string}`;

export interface ColosseumEnemySettings {
  name: string;
  terrainEffect: ColosseumTerrainEffect;
  enemyType: string;
  enemyMainClass: EnemyClassId;
  enemySubClass: EnemyClassId | 'none';
  level: number;
  abilities: Array<{ id: AbilityId; level: number }>;
}

export const DEFAULT_COLOSSEUM_ENEMY_SETTINGS: ColosseumEnemySettings = {
  name: 'ミーティア',
  terrainEffect: 'none',
  enemyType: 'Jinma',
  enemyMainClass: 'duelist',
  enemySubClass: 'none',
  level: 10,
  abilities: [],
};

const isEnemyClassId = (value: unknown): value is EnemyClassId => typeof value === 'string' && [
  'guardian', 'duelist', 'samurai', 'sword-saint',
  'ranger', 'striker', 'ninja',
  'wizard', 'sage', 'alchemist',
  'pilgrim', 'lord',
  'fighter', 'rogue',
].includes(value);

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

// SpecRef: 8.6 | UI_DIVINE_BUREAU | Enemy Edit Pane
export function normalizeColosseumEnemySettings(raw: unknown): ColosseumEnemySettings {
  const parsed = (raw && typeof raw === 'object') ? raw as Partial<ColosseumEnemySettings> & { enemyClass?: string } : {};
  const normalizedAbilities = Array.isArray(parsed.abilities)
    ? parsed.abilities
      .map((entry) => {
        if (typeof entry === 'string') {
          return { id: entry as AbilityId, level: 1 };
        }
        if (!entry || typeof entry !== 'object') return null;
        const id = 'id' in entry && typeof entry.id === 'string' ? entry.id as AbilityId : null;
        if (!id) return null;
        const rawLevel = 'level' in entry && Number.isFinite(entry.level) ? Number(entry.level) : 1;
        return {
          id,
          level: Math.max(1, Math.min(5, Math.floor(rawLevel))),
        };
      })
      .filter((entry): entry is { id: AbilityId; level: number } => entry !== null)
      .slice(0, 5)
    : [];

  const level = Number.isFinite(parsed.level) ? Math.floor(parsed.level as number) : DEFAULT_COLOSSEUM_ENEMY_SETTINGS.level;
  const terrainEffect = typeof parsed.terrainEffect === 'string'
    && (parsed.terrainEffect === 'none' || parsed.terrainEffect.startsWith('terrain.'))
      ? parsed.terrainEffect as ColosseumTerrainEffect
      : DEFAULT_COLOSSEUM_ENEMY_SETTINGS.terrainEffect;

  const legacyEnemyClass = isEnemyClassId(parsed.enemyClass) ? parsed.enemyClass : null;
  const enemyMainClass = isEnemyClassId(parsed.enemyMainClass)
    ? parsed.enemyMainClass
    : (legacyEnemyClass ?? DEFAULT_COLOSSEUM_ENEMY_SETTINGS.enemyMainClass);

  return {
    name: typeof parsed.name === 'string' && parsed.name.trim().length > 0 ? parsed.name.trim() : DEFAULT_COLOSSEUM_ENEMY_SETTINGS.name,
    terrainEffect,
    enemyType: typeof parsed.enemyType === 'string' && parsed.enemyType.trim().length > 0 ? parsed.enemyType.trim() : DEFAULT_COLOSSEUM_ENEMY_SETTINGS.enemyType,
    enemyMainClass,
    enemySubClass: isEnemyClassId(parsed.enemySubClass)
      ? parsed.enemySubClass
      : DEFAULT_COLOSSEUM_ENEMY_SETTINGS.enemySubClass,
    level: Math.max(1, Math.min(99, level)),
    abilities: normalizedAbilities,
  };
}

export function getColosseumEnemySettings(): ColosseumEnemySettings {
  if (!canUseStorage()) return DEFAULT_COLOSSEUM_ENEMY_SETTINGS;
  try {
    const saved = window.localStorage.getItem(COLOSSEUM_STORAGE_KEY);
    if (!saved) return DEFAULT_COLOSSEUM_ENEMY_SETTINGS;
    return normalizeColosseumEnemySettings(JSON.parse(saved));
  } catch {
    return DEFAULT_COLOSSEUM_ENEMY_SETTINGS;
  }
}

export function saveColosseumEnemySettings(settings: ColosseumEnemySettings): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(COLOSSEUM_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // noop
  }
}

export function buildColosseumEnemy(settings: ColosseumEnemySettings): EnemyDef {
  const normalized = normalizeColosseumEnemySettings(settings);
  const classBase = buildEnemyClassMasterStats(normalized.enemyMainClass, normalized.enemySubClass);
  const enemyLevel = normalized.level;
  const multipliers = getEnemyMultipliersForLevel(enemyLevel);
  const classAbilities = new Map(classBase.abilities.map((ability) => [ability.id, ability]));
  getEnemyTypeAbilities(normalized.enemyType, enemyLevel).forEach((ability) => {
    classAbilities.set(ability.id, { ...ability });
  });
  normalized.abilities.forEach((ability) => {
    classAbilities.set(ability.id, { id: ability.id, level: ability.level });
  });
  const abilities = resolveEnemyPassiveAbilities(Array.from(classAbilities.values()));
  const hasColossal = abilities.some((ability) => ability.id === 'colossal');
  const meleeConversionLevel = abilities.find((ability) => ability.id === 'melee_conversion')?.level ?? 0;
  const cyborgizationAdjustment = getEnemyCyborgizationAdjustment(
    abilities.find((ability) => ability.id === 'cyborgization')?.level ?? 0,
  );
  const enemyTypeBonuses = getEnemyTypeBonuses(normalized.enemyType);
  const elementalOffenseTotals = enemyTypeBonuses.reduce(
    (acc, bonus) => {
      if (bonus.type === 'fire_offense') acc.fire += bonus.value > 1 ? bonus.value / 100 : bonus.value;
      if (bonus.type === 'ice_offense') acc.ice += bonus.value > 1 ? bonus.value / 100 : bonus.value;
      if (bonus.type === 'thunder_offense') acc.thunder += bonus.value > 1 ? bonus.value / 100 : bonus.value;
      return acc;
    },
    { fire: 0, ice: 0, thunder: 0 },
  );
  const elementalPriority: Array<'thunder' | 'ice' | 'fire'> = ['thunder', 'ice', 'fire'];
  let elementalOffense: 'none' | 'fire' | 'ice' | 'thunder' = 'none';
  let elementalOffenseBonus = 0;
  for (const element of elementalPriority) {
    if (elementalOffenseTotals[element] > elementalOffenseBonus) {
      elementalOffense = element;
      elementalOffenseBonus = elementalOffenseTotals[element];
    }
  }

  const elementalResistance: Record<ElementalResistance, number> = {
    fire: 1,
    thunder: 1,
    ice: 1,
  };
  const rangedAttack = Math.max(0, Math.floor(classBase.rangedAttack * multipliers.attack));
  const magicalAttack = Math.max(0, Math.floor(classBase.magicalAttack * multipliers.attack));
  const meleeAttack = Math.max(0, Math.floor(classBase.meleeAttack * multipliers.attack));

  return applyEnemyTypeCBonuses({
    id: 9901,
    type: 'boss',
    enemyType: normalized.enemyType,
    spawnTier: 0,
    spawnPool: 99,
    poolId: 99,
    name: normalized.name,
    enemyClass: normalized.enemyMainClass,
    enemySubClass: normalized.enemySubClass,
    abilities,
    bonuses: enemyTypeBonuses,
    accuracyBonus: classBase.accuracyBonus + cyborgizationAdjustment.accuracyBonus,
    evasionBonus: classBase.evasionBonus + cyborgizationAdjustment.evasionBonus,
    hp: Math.max(1, Math.floor(classBase.hp * multipliers.hp)),
    rangedAttack,
    rangedNoA: Math.max(0, Math.floor(classBase.rangedNoA * multipliers.noa)),
    magicalAttack,
    magicalNoA: Math.max(0, Math.floor(classBase.magicalNoA * multipliers.noa)),
    meleeAttack: applyEnemyMeleeConversionAttack(meleeAttack, rangedAttack, magicalAttack, meleeConversionLevel),
    meleeNoA: Math.max(0, Math.floor(classBase.meleeNoA * multipliers.noa)),
    rangedAttackAmplifier: classBase.rangedAttackAmplifier * multipliers.attackAmplifier,
    magicalAttackAmplifier: classBase.magicalAttackAmplifier * multipliers.attackAmplifier,
    meleeAttackAmplifier: classBase.meleeAttackAmplifier * multipliers.attackAmplifier,
    physicalDefense: Math.max(0, Math.floor(classBase.physicalDefense * multipliers.defense * (hasColossal ? 2 : 1))),
    magicalDefense: Math.max(0, Math.floor(classBase.magicalDefense * multipliers.defense)),
    elementalOffense,
    elementalOffenseValue: 1 + elementalOffenseBonus,
    elementalResistance,
    physicalDefenseAmplifier: multipliers.defenseAmplifier * (hasColossal ? 2 : 1),
    magicalDefenseAmplifier: multipliers.defenseAmplifier,
    experience: 0,
    dropItemId: null,
  });
}
