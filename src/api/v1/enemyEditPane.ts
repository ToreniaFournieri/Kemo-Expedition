import { ABILITY_BASE_NAME_KEYS } from '../../data/abilityNames.ts';
import { ENEMIES } from '../../data/enemies.ts';
import { TERRAIN_EFFECT_GLOSSARY_SECTION } from '../../data/glossary.ts';
import { COLOSSEUM_ENEMY_CLASS_OPTIONS, getDefaultColosseumEnemySettings, normalizeColosseumEnemySettings, type ColosseumEnemySettings } from '../../game/colosseum.ts';
import type { AbilityId } from '../../types/index.ts';

// SpecRef: 9.1.3 | Read 2-6-1 / Commit 3-6-3 enemyEditPane
// SpecRef: 8.6 | UI_SETTING | Enemy Edit Pane
// The Enemy Edit pane defines the Colosseum enemy. For the ordinary player the API reads and changes the pane's real
// settings (stored on the device, like the Debug settings), so the pane and the API always agree. An API account has its
// own settings, kept with the account and in force while it holds control.

export interface ApiV1EnemyEditPaneCurrent {
  enemyLevel: number;
  enemyName: string;
  terrainEffect: string;
  enemyType: string;
  mainClass: string;
  subClass: string;
  addedAbilities: Array<{ abilityId: string; level: number }>;
}

const MAXIMUM_ADDED_ABILITIES = 5;
const toApiAbilityId = (id: string) => `a.${id.replace(/_/g, '-')}`;
const fromApiAbilityId = (id: string) => id.slice('a.'.length).replace(/-/g, '_');

function terrainEffectOptions(): string[] {
  return ['none', ...(TERRAIN_EFFECT_GLOSSARY_SECTION?.entries.map((entry) => entry.key) ?? [])];
}
function enemyTypeOptions(): string[] {
  return [...new Set(ENEMIES.map((enemy) => enemy.enemyType))];
}
function abilityOptions(): string[] {
  return Object.keys(ABILITY_BASE_NAME_KEYS).map(toApiAbilityId);
}

/** The pane's settings in the API's vocabulary. */
export function describeEnemyEditPane(settings: ColosseumEnemySettings): ApiV1EnemyEditPaneCurrent {
  return {
    enemyLevel: settings.level,
    enemyName: settings.name,
    terrainEffect: settings.terrainEffect,
    enemyType: settings.enemyType,
    mainClass: settings.enemyMainClass,
    subClass: settings.enemySubClass,
    addedAbilities: settings.abilities.map((ability) => ({ abilityId: toApiAbilityId(ability.id), level: ability.level })),
  };
}

export function enemyEditPaneValidOptions() {
  return {
    enemyLevel: { min: 1, max: 99, step: 1 },
    terrainEffect: terrainEffectOptions(),
    enemyType: enemyTypeOptions(),
    mainClass: [...COLOSSEUM_ENEMY_CLASS_OPTIONS],
    subClass: ['none', ...COLOSSEUM_ENEMY_CLASS_OPTIONS],
    addedAbilities: { maximumEntries: MAXIMUM_ADDED_ABILITIES, abilityId: abilityOptions(), level: { min: 1, max: 5 } },
  };
}

/**
 * Validates a partial `commit/setting/enemyEditPane` request against the valid options and returns the complete new
 * settings. Omitted fields keep their values; `addedAbilities` replaces the whole list. Any invalid field rejects all.
 */
export function planEnemyEditPaneWrite(parameters: Record<string, unknown>, current: ColosseumEnemySettings): ColosseumEnemySettings {
  const invalid = (field: string): never => { throw new Error(`invalid_request:${field}`); };
  const next: ColosseumEnemySettings = { ...current, abilities: [...current.abilities] };
  if (parameters.enemyLevel !== undefined) {
    const level = parameters.enemyLevel;
    if (typeof level !== 'number' || !Number.isInteger(level) || level < 1 || level > 99) invalid('enemyLevel');
    next.level = level as number;
  }
  if (parameters.enemyName !== undefined) {
    const name = parameters.enemyName;
    if (typeof name !== 'string' || name.trim().length === 0 || name.length > 100) invalid('enemyName');
    next.name = (name as string).trim();
  }
  if (parameters.terrainEffect !== undefined) {
    if (!terrainEffectOptions().includes(String(parameters.terrainEffect))) invalid('terrainEffect');
    next.terrainEffect = parameters.terrainEffect as ColosseumEnemySettings['terrainEffect'];
  }
  if (parameters.enemyType !== undefined) {
    if (!enemyTypeOptions().includes(String(parameters.enemyType))) invalid('enemyType');
    next.enemyType = String(parameters.enemyType);
  }
  if (parameters.mainClass !== undefined) {
    if (!(COLOSSEUM_ENEMY_CLASS_OPTIONS as readonly string[]).includes(String(parameters.mainClass))) invalid('mainClass');
    next.enemyMainClass = parameters.mainClass as ColosseumEnemySettings['enemyMainClass'];
  }
  if (parameters.subClass !== undefined) {
    if (parameters.subClass !== 'none' && !(COLOSSEUM_ENEMY_CLASS_OPTIONS as readonly string[]).includes(String(parameters.subClass))) invalid('subClass');
    next.enemySubClass = parameters.subClass as ColosseumEnemySettings['enemySubClass'];
  }
  if (parameters.addedAbilities !== undefined) {
    const entries = parameters.addedAbilities;
    if (!Array.isArray(entries) || entries.length > MAXIMUM_ADDED_ABILITIES) invalid('addedAbilities');
    const valid = new Set(abilityOptions());
    const abilities = (entries as unknown[]).map((entry) => {
      const { abilityId, level } = (entry ?? {}) as { abilityId?: unknown; level?: unknown };
      if (typeof abilityId !== 'string' || !valid.has(abilityId)) invalid('addedAbilities');
      if (typeof level !== 'number' || !Number.isInteger(level) || level < 1 || level > 5) invalid('addedAbilities');
      return { id: fromApiAbilityId(abilityId as string) as AbilityId, level: level as number };
    });
    if (new Set(abilities.map((ability) => ability.id)).size !== abilities.length) invalid('addedAbilities');
    next.abilities = abilities;
  }
  return normalizeColosseumEnemySettings(next);
}

/** An API account's Enemy Edit pane from its control settings (stored in the API vocabulary); defaults where unset. */
export function accountEnemyEditSettingsOf(settings: Record<string, unknown> | undefined): ColosseumEnemySettings {
  const stored = settings?.enemyEditPane;
  const defaults = getDefaultColosseumEnemySettings();
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return defaults;
  try {
    return planEnemyEditPaneWrite(stored as Record<string, unknown>, defaults);
  } catch {
    return defaults;
  }
}
