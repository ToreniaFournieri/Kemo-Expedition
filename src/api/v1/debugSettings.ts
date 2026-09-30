import { getDefaultDebugSettings, getTimeSpeedScale, normalizeDebugSettingsValue, type DebugSettings } from '../../game/debugSettings.ts';

// SpecRef: 9.1.3 | Read | 2-6-3 debug; Commit | 3-6-4 debug
// SpecRef: 8.6 | UI_SETTING | Debug
// The ordinary player's Debug settings live in the runtime (device storage), not in the save. For that player the API
// reports and changes the real settings through runtime ports, so the Debug pane and the API always agree. An API
// account has no Debug pane; its debug settings are its own values kept in the account's control settings.

export interface ApiV1DebugCurrent {
  runtimeDiagnostics: boolean;
  clairvoyance: boolean;
  speedOfTime: 'real' | 'x1.2' | 'x5' | 'x20' | 'x100' | 'unlimited';
  godsBattleCondition: 'normal' | 'simple';
  godsStrength: 'normal' | 'veryWeak';
  debugStoreOpen: boolean;
  displayFlavorCondition: boolean;
  displayAfkDuration: boolean;
  displayAllBestiary: boolean;
  displayAllCompendium: boolean;
  displayAllGlossary: boolean;
  colosseumMode: boolean;
}

const SPEED_TO_API: Record<DebugSettings['timeSpeed'], ApiV1DebugCurrent['speedOfTime']> = {
  realtime: 'real', x1_2: 'x1.2', x5: 'x5', x20: 'x20', x100: 'x100', unlimited: 'unlimited',
};
const SPEED_FROM_API = Object.fromEntries(Object.entries(SPEED_TO_API).map(([runtime, api]) => [api, runtime])) as Record<ApiV1DebugCurrent['speedOfTime'], DebugSettings['timeSpeed']>;

/** The runtime's Debug settings in the API's vocabulary. */
export function describeDebugSettings(settings: DebugSettings): ApiV1DebugCurrent {
  return {
    runtimeDiagnostics: settings.runtimeDiagnosticsEnabled,
    clairvoyance: settings.clairvoyanceEnabled,
    speedOfTime: SPEED_TO_API[settings.timeSpeed],
    godsBattleCondition: settings.godsBattleCondition === 'simple1' ? 'simple' : 'normal',
    godsStrength: settings.godStrength === 'debug' ? 'veryWeak' : 'normal',
    debugStoreOpen: settings.jewelShopOpen,
    displayFlavorCondition: settings.displayCondition,
    displayAfkDuration: settings.displayAfkDuration,
    displayAllBestiary: settings.displayAllBestiary,
    displayAllCompendium: settings.displayAllCompendium,
    displayAllGlossary: settings.displayAllGlossary,
    colosseumMode: settings.colosseumEnabled,
  };
}

/** Translates the fields of a `commit/setting/debug` request that differ from the runtime into a runtime update. */
export function planDebugSettingWrite(parameters: Record<string, unknown>, settings: DebugSettings): Partial<DebugSettings> {
  const current = describeDebugSettings(settings);
  const write: Partial<DebugSettings> = {};
  const changed = <K extends keyof ApiV1DebugCurrent>(key: K) => parameters[key] !== undefined && parameters[key] !== current[key];
  if (changed('runtimeDiagnostics')) write.runtimeDiagnosticsEnabled = parameters.runtimeDiagnostics === true;
  if (changed('clairvoyance')) write.clairvoyanceEnabled = parameters.clairvoyance === true;
  if (changed('speedOfTime')) write.timeSpeed = SPEED_FROM_API[parameters.speedOfTime as ApiV1DebugCurrent['speedOfTime']];
  if (changed('godsBattleCondition')) write.godsBattleCondition = parameters.godsBattleCondition === 'simple' ? 'simple1' : 'normal';
  if (changed('godsStrength')) write.godStrength = parameters.godsStrength === 'veryWeak' ? 'debug' : 'normal';
  if (changed('debugStoreOpen')) write.jewelShopOpen = parameters.debugStoreOpen === true;
  if (changed('displayFlavorCondition')) write.displayCondition = parameters.displayFlavorCondition === true;
  if (changed('displayAfkDuration')) write.displayAfkDuration = parameters.displayAfkDuration === true;
  if (changed('displayAllBestiary')) write.displayAllBestiary = parameters.displayAllBestiary === true;
  if (changed('displayAllCompendium')) write.displayAllCompendium = parameters.displayAllCompendium === true;
  if (changed('displayAllGlossary')) write.displayAllGlossary = parameters.displayAllGlossary === true;
  if (changed('colosseumMode')) write.colosseumEnabled = parameters.colosseumMode === true;
  return write;
}

/**
 * An API account's own debug settings (stored in its control settings in the API's vocabulary) as runtime Debug settings:
 * every field not stored yet takes its default, and the environment's Debug policy applies (Spec 9.1.4.14, `debug`).
 */
export function accountDebugSettings(stored: unknown): DebugSettings {
  const defaults = getDefaultDebugSettings();
  const parameters = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored as Record<string, unknown> : {};
  return normalizeDebugSettingsValue({ ...defaults, ...planDebugSettingWrite(parameters, defaults) });
}

/** The account's debug settings from its control settings bag (`control.settings.debug`). */
export function accountDebugSettingsOf(settings: Record<string, unknown> | undefined): DebugSettings {
  return accountDebugSettings(settings?.debug);
}

/**
 * The cycle and Instant Expedition charge clock scale of an API account: its own debug Speed of Time. The progress-report
 * bonus belongs to the ordinary player's runtime and never applies to an account.
 */
export function accountTimeScale(settings: Record<string, unknown> | undefined): number {
  return Math.max(0.001, getTimeSpeedScale(accountDebugSettingsOf(settings)));
}
