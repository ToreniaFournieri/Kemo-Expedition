import { AbilityId, ElementalResistance, EnemyAbility, EnemyClassId, EnemyDef } from '../types';
import { LUNA_MODE_ENEMY_LEVEL_BONUS, getEnemyMultipliersForLevel } from '../data/dungeons';

const COLOSSEUM_STORAGE_KEY = 'kemo-expedition.colosseum-enemy-settings';

export interface ColosseumEnemySettings {
  name: string;
  enemyType: string;
  enemyClass: EnemyClassId;
  level: number;
  abilities: AbilityId[];
}

export const DEFAULT_COLOSSEUM_ENEMY_SETTINGS: ColosseumEnemySettings = {
  name: 'ミーティア',
  enemyType: 'Jinma',
  enemyClass: 'fighter',
  level: 10,
  abilities: [],
};

type EnemyClassBase = {
  hp: number;
  abilities: EnemyAbility[];
  accuracyBonus: number;
  evasionBonus: number;
  rangedAttack: number;
  rangedNoA: number;
  magicalAttack: number;
  magicalNoA: number;
  meleeAttack: number;
  meleeNoA: number;
  rangedAttackAmplifier: number;
  magicalAttackAmplifier: number;
  meleeAttackAmplifier: number;
  physicalDefense: number;
  magicalDefense: number;
};

function levelOneAbilities(abilityIds: AbilityId[]): EnemyAbility[] {
  return abilityIds.map((id) => ({ id, level: 1 }));
}

const ENEMY_CLASS_BASES: Record<EnemyClassId, EnemyClassBase> = {
  fighter: { hp: 126, abilities: levelOneAbilities([]), accuracyBonus: 0.0, evasionBonus: 0.02, rangedAttack: 0, rangedNoA: 0, magicalAttack: 0, magicalNoA: 0, meleeAttack: 41, meleeNoA: 2, rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.0, meleeAttackAmplifier: 1.0, physicalDefense: 23, magicalDefense: 10 },
  duelist: { hp: 100, abilities: levelOneAbilities(['counter']), accuracyBonus: 0.01, evasionBonus: 0.01, rangedAttack: 0, rangedNoA: 0, magicalAttack: 0, magicalNoA: 0, meleeAttack: 52, meleeNoA: 4, rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.0, meleeAttackAmplifier: 1.2, physicalDefense: 13, magicalDefense: 13 },
  ninja: { hp: 92, abilities: levelOneAbilities(['re_attack']), accuracyBonus: 0.0, evasionBonus: 0.04, rangedAttack: 0, rangedNoA: 0, magicalAttack: 0, magicalNoA: 0, meleeAttack: 59, meleeNoA: 4, rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.0, meleeAttackAmplifier: 1.2, physicalDefense: 12, magicalDefense: 10 },
  samurai: { hp: 80, abilities: levelOneAbilities(['iaigiri']), accuracyBonus: -0.05, evasionBonus: -0.01, rangedAttack: 0, rangedNoA: 0, magicalAttack: 0, magicalNoA: 0, meleeAttack: 93, meleeNoA: 1, rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.0, meleeAttackAmplifier: 1.3, physicalDefense: 11, magicalDefense: 11 },
  lord: { hp: 116, abilities: levelOneAbilities([]), accuracyBonus: 0.0, evasionBonus: 0.0, rangedAttack: 0, rangedNoA: 0, magicalAttack: 0, magicalNoA: 0, meleeAttack: 41, meleeNoA: 4, rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.0, meleeAttackAmplifier: 1.1, physicalDefense: 15, magicalDefense: 15 },
  ranger: { hp: 88, abilities: levelOneAbilities([]), accuracyBonus: 0.03, evasionBonus: 0.01, rangedAttack: 35, rangedNoA: 4, magicalAttack: 0, magicalNoA: 0, meleeAttack: 0, meleeNoA: 0, rangedAttackAmplifier: 1.2, magicalAttackAmplifier: 1.0, meleeAttackAmplifier: 1.0, physicalDefense: 12, magicalDefense: 10 },
  wizard: { hp: 54, abilities: levelOneAbilities(['resonance']), accuracyBonus: 0.0, evasionBonus: -0.015, rangedAttack: 0, rangedNoA: 0, magicalAttack: 48, magicalNoA: 2, meleeAttack: 0, meleeNoA: 0, rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.2, meleeAttackAmplifier: 1.0, physicalDefense: 5, magicalDefense: 15 },
  sage: { hp: 94, abilities: levelOneAbilities([]), accuracyBonus: 0.0, evasionBonus: 0.0, rangedAttack: 0, rangedNoA: 0, magicalAttack: 26, magicalNoA: 4, meleeAttack: 0, meleeNoA: 0, rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.2, meleeAttackAmplifier: 1.0, physicalDefense: 12, magicalDefense: 17 },
  rogue: { hp: 80, abilities: levelOneAbilities(['deflection', 'first_strike']), accuracyBonus: 0.06, evasionBonus: 0.06, rangedAttack: 26, rangedNoA: 4, magicalAttack: 0, magicalNoA: 0, meleeAttack: 26, meleeNoA: 4, rangedAttackAmplifier: 1.2, magicalAttackAmplifier: 1.0, meleeAttackAmplifier: 1.0, physicalDefense: 10, magicalDefense: 10 },
  pilgrim: { hp: 124, abilities: levelOneAbilities(['null_counter']), accuracyBonus: 0.0, evasionBonus: 0.02, rangedAttack: 0, rangedNoA: 0, magicalAttack: 26, magicalNoA: 2, meleeAttack: 41, meleeNoA: 2, rangedAttackAmplifier: 1.0, magicalAttackAmplifier: 1.2, meleeAttackAmplifier: 1.2, physicalDefense: 14, magicalDefense: 14 },
};

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function normalizeColosseumEnemySettings(raw: unknown): ColosseumEnemySettings {
  const parsed = (raw && typeof raw === 'object') ? raw as Partial<ColosseumEnemySettings> : {};
  const normalizedAbilities = Array.isArray(parsed.abilities)
    ? parsed.abilities.filter((id): id is AbilityId => typeof id === 'string').slice(0, 5)
    : [];

  const level = Number.isFinite(parsed.level) ? Math.floor(parsed.level as number) : DEFAULT_COLOSSEUM_ENEMY_SETTINGS.level;
  return {
    name: typeof parsed.name === 'string' && parsed.name.trim().length > 0 ? parsed.name.trim() : DEFAULT_COLOSSEUM_ENEMY_SETTINGS.name,
    enemyType: typeof parsed.enemyType === 'string' && parsed.enemyType.trim().length > 0 ? parsed.enemyType.trim() : DEFAULT_COLOSSEUM_ENEMY_SETTINGS.enemyType,
    enemyClass: (typeof parsed.enemyClass === 'string' && parsed.enemyClass in ENEMY_CLASS_BASES
      ? parsed.enemyClass
      : DEFAULT_COLOSSEUM_ENEMY_SETTINGS.enemyClass) as EnemyClassId,
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

export function buildColosseumEnemy(settings: ColosseumEnemySettings, isLunaMode: boolean): EnemyDef {
  const normalized = normalizeColosseumEnemySettings(settings);
  const classBase = ENEMY_CLASS_BASES[normalized.enemyClass];
  const enemyLevel = normalized.level + (isLunaMode ? LUNA_MODE_ENEMY_LEVEL_BONUS : 0);
  const multipliers = getEnemyMultipliersForLevel(enemyLevel);
  const classAbilities = new Map(classBase.abilities.map((ability) => [ability.id, ability]));
  normalized.abilities.forEach((abilityId) => {
    classAbilities.set(abilityId, { id: abilityId, level: 1 });
  });

  const elementalResistance: Record<ElementalResistance, number> = {
    fire: 1,
    thunder: 1,
    ice: 1,
  };

  return {
    id: 9901,
    type: 'boss',
    enemyType: normalized.enemyType,
    spawnTier: 0,
    spawnPool: 99,
    poolId: 99,
    name: normalized.name,
    enemyClass: normalized.enemyClass,
    abilities: Array.from(classAbilities.values()),
    accuracyBonus: classBase.accuracyBonus,
    evasionBonus: classBase.evasionBonus,
    hp: Math.max(1, Math.floor(classBase.hp * multipliers.hp)),
    rangedAttack: Math.max(0, Math.floor(classBase.rangedAttack * multipliers.attack)),
    rangedNoA: Math.max(0, Math.floor(classBase.rangedNoA * multipliers.noa)),
    magicalAttack: Math.max(0, Math.floor(classBase.magicalAttack * multipliers.attack)),
    magicalNoA: Math.max(0, Math.floor(classBase.magicalNoA * multipliers.noa)),
    meleeAttack: Math.max(0, Math.floor(classBase.meleeAttack * multipliers.attack)),
    meleeNoA: Math.max(0, Math.floor(classBase.meleeNoA * multipliers.noa)),
    rangedAttackAmplifier: classBase.rangedAttackAmplifier * multipliers.attackAmplifier,
    magicalAttackAmplifier: classBase.magicalAttackAmplifier * multipliers.attackAmplifier,
    meleeAttackAmplifier: classBase.meleeAttackAmplifier * multipliers.attackAmplifier,
    physicalDefense: Math.max(0, Math.floor(classBase.physicalDefense * multipliers.defense)),
    magicalDefense: Math.max(0, Math.floor(classBase.magicalDefense * multipliers.defense)),
    elementalOffense: 'none',
    elementalResistance,
    defenseAmplifier: multipliers.defenseAmplifier,
    experience: 0,
    dropItemId: null,
  };
}
