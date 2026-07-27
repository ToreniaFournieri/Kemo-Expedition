import { createEnvironmentStorageKey, isDebugModeEnabled } from './environment';

type DebugTimeSpeed = 'realtime' | 'x1_2' | 'x5' | 'x20' | 'x100' | 'unlimited';
type DebugGodsBattleCondition = 'normal' | 'simple1';
type DebugGodStrength = 'normal' | 'debug';

export interface DebugSettings {
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

function enforceEnvironmentDebugPolicy(settings: DebugSettings): DebugSettings {
  // SpecRef: 9 | Environment | / Debug mode OFF
  if (!isDebugModeEnabled()) {
    // SpecRef: 8.1.2 | Header | Speed of Time
    // Keep the production Debug pane locked OFF, but preserve the legitimate
    // Speed of Time report reward while its separate duration record is valid.
    const prodTimeSpeed: DebugTimeSpeed = settings.timeSpeed === 'x1_2' ? 'x1_2' : 'realtime';
    return {
      ...DEFAULT_DEBUG_SETTINGS,
      timeSpeed: prodTimeSpeed,
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
  if (!canUseStorage()) return enforceEnvironmentDebugPolicy(DEFAULT_DEBUG_SETTINGS);
  try {
    const saved = window.localStorage.getItem(DEBUG_SETTINGS_STORAGE_KEY);
    if (!saved) return enforceEnvironmentDebugPolicy(DEFAULT_DEBUG_SETTINGS);
    return normalizeDebugSettings(JSON.parse(saved));
  } catch {
    return enforceEnvironmentDebugPolicy(DEFAULT_DEBUG_SETTINGS);
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

export function getTimeSpeedScale(settings: DebugSettings): number {
  // SpecRef: 5.1 | PROGRESS | Debug Scaling
  if (settings.timeSpeed === 'realtime') return 1;
  if (settings.timeSpeed === 'x1_2') return 1 / 1.2;
  if (settings.timeSpeed === 'x20') return 0.05;
  if (settings.timeSpeed === 'x100') return 0.01;
  if (settings.timeSpeed === 'unlimited') return 0;
  return 0.2;
}

export function isUnlimitedTimeSpeed(settings: DebugSettings): boolean {
  return settings.timeSpeed === 'unlimited';
}
