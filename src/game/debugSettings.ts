import { createEnvironmentStorageKey, isDebugModeEnabled } from './environment.ts';

type DebugTimeSpeed = 'realtime' | 'x1_2' | 'x5' | 'x20' | 'x100' | 'unlimited';
type DebugGodsBattleCondition = 'normal' | 'simple1';
type DebugGodStrength = 'normal' | 'debug';

export interface DebugSettings {
  runtimeDiagnosticsEnabled: boolean;
  clairvoyanceEnabled: boolean;
  timeSpeed: DebugTimeSpeed;
  godsBattleCondition: DebugGodsBattleCondition;
  godStrength: DebugGodStrength;
  jewelShopOpen: boolean;
  displayCondition: boolean;
  displayAfkDuration: boolean;
  colosseumEnabled: boolean;
  displayAllBestiary: boolean;
  displayAllCompendium: boolean;
  displayAllGlossary: boolean;
}

// SpecRef: 9 | Environment | Save Data Isolation
const DEBUG_SETTINGS_STORAGE_KEY = createEnvironmentStorageKey('kemo-expedition.debug-settings');

const DEFAULT_DEBUG_SETTINGS: DebugSettings = {
  runtimeDiagnosticsEnabled: false,
  clairvoyanceEnabled: false,
  timeSpeed: 'realtime',
  godsBattleCondition: 'normal',
  godStrength: 'normal',
  jewelShopOpen: false,
  displayCondition: false,
  displayAfkDuration: false,
  colosseumEnabled: false,
  displayAllBestiary: false,
  displayAllCompendium: false,
  displayAllGlossary: false,
};

const RUNTIME_DIAGNOSTICS_STARTUP_ENABLED = typeof __RUNTIME_DIAGNOSTICS_DEFAULT_ENABLED__ !== 'undefined'
  && __RUNTIME_DIAGNOSTICS_DEFAULT_ENABLED__;

function enforceEnvironmentDebugPolicy(settings: DebugSettings): DebugSettings {
  // SpecRef: 9 | Environment | / Debug mode OFF
  if (!isDebugModeEnabled()) {
    // SpecRef: 8.6 | UI_SETTING | Speed of Time
    // The report reward is tracked separately from the Debug-pane base speed.
    return {
      ...DEFAULT_DEBUG_SETTINGS,
      timeSpeed: 'realtime',
      godsBattleCondition: 'normal',
      godStrength: 'normal',
    };
  }
  return settings;
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function normalizeDebugSettings(raw: unknown): DebugSettings {
  const parsed = (raw && typeof raw === 'object') ? raw as Partial<DebugSettings> & { displayMotivation?: boolean } : {};
  return enforceEnvironmentDebugPolicy({
    // SpecRef: 8.6 | UI_SETTING | Runtime Diagnostics OFF/ON
    runtimeDiagnosticsEnabled: parsed.runtimeDiagnosticsEnabled === true || RUNTIME_DIAGNOSTICS_STARTUP_ENABLED,
    clairvoyanceEnabled: parsed.clairvoyanceEnabled === true,
    timeSpeed: parsed.timeSpeed === 'realtime' || parsed.timeSpeed === 'x1_2' || parsed.timeSpeed === 'x20' || parsed.timeSpeed === 'x100' || parsed.timeSpeed === 'x5' || parsed.timeSpeed === 'unlimited' ? parsed.timeSpeed : 'realtime',
    godsBattleCondition: parsed.godsBattleCondition === 'simple1' ? 'simple1' : 'normal',
    godStrength: parsed.godStrength === 'debug' ? 'debug' : 'normal',
    jewelShopOpen: parsed.jewelShopOpen === true,
    // SpecRef: 8.6 | UI_SETTING | Display `condition` OFF/ON
    displayCondition: parsed.displayCondition === true || parsed.displayMotivation === true,
    displayAfkDuration: parsed.displayAfkDuration === true,
    colosseumEnabled: parsed.colosseumEnabled === true,
    // SpecRef: 8.6 | UI_SETTING | Debug pane (デバッグ)
    displayAllBestiary: parsed.displayAllBestiary === true,
    displayAllCompendium: parsed.displayAllCompendium === true,
    displayAllGlossary: parsed.displayAllGlossary === true,
  });
}

export function getDebugSettings(): DebugSettings {
  if (!canUseStorage()) return normalizeDebugSettings(DEFAULT_DEBUG_SETTINGS);
  try {
    const saved = window.localStorage.getItem(DEBUG_SETTINGS_STORAGE_KEY);
    if (!saved) return normalizeDebugSettings(DEFAULT_DEBUG_SETTINGS);
    return normalizeDebugSettings(JSON.parse(saved));
  } catch {
    return normalizeDebugSettings(DEFAULT_DEBUG_SETTINGS);
  }
}

export function saveDebugSettings(settings: DebugSettings): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(DEBUG_SETTINGS_STORAGE_KEY, JSON.stringify(enforceEnvironmentDebugPolicy(settings)));
  } catch {
    // noop
  }
}

export function getTimeSpeedScale(settings: DebugSettings, hasProgressReportBonus = false): number {
  // SpecRef: 5.1 | PROGRESS | Debug Scaling
  // SpecRef: 8.6 | UI_SETTING | Progress Report multiplies the current speed by x1.2
  const baseScale = settings.timeSpeed === 'realtime'
    ? 1
    : settings.timeSpeed === 'x1_2'
      ? 1 / 1.2
      : settings.timeSpeed === 'x20'
        ? 0.05
        : settings.timeSpeed === 'x100'
          ? 0.01
          : settings.timeSpeed === 'unlimited'
            ? 0
            : 0.2;
  if (!hasProgressReportBonus || baseScale === 0) return baseScale;
  return baseScale / 1.2;
}

export function isUnlimitedTimeSpeed(settings: DebugSettings): boolean {
  return settings.timeSpeed === 'unlimited';
}
