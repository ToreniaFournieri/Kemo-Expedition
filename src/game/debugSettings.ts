import { createEnvironmentStorageKey } from './environment';

export type DebugTimeSpeed = 'realtime' | 'x5' | 'x20' | 'x100' | 'x10000';
export type DebugGodsBattleCondition = 'normal' | 'simple1';
export type DebugGodStrength = 'normal' | 'debug';

export interface DebugSettings {
  clairvoyanceEnabled: boolean;
  timeSpeed: DebugTimeSpeed;
  godsBattleCondition: DebugGodsBattleCondition;
  godStrength: DebugGodStrength;
  jewelShopOpen: boolean;
  displayCondition: boolean;
  displayFlavorCondition: boolean;
  displayAfkDuration: boolean;
  colosseumEnabled: boolean;
}

// SpecRef: 9 | Environment | Save Data Isolation
const DEBUG_SETTINGS_STORAGE_KEY = createEnvironmentStorageKey('kemo-expedition.debug-settings');

export const DEFAULT_DEBUG_SETTINGS: DebugSettings = {
  clairvoyanceEnabled: false,
  timeSpeed: 'x5',
  godsBattleCondition: 'normal',
  godStrength: 'normal',
  jewelShopOpen: false,
  displayCondition: false,
  displayFlavorCondition: false,
  displayAfkDuration: false,
  colosseumEnabled: false,
};

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function normalizeDebugSettings(raw: unknown): DebugSettings {
  const parsed = (raw && typeof raw === 'object') ? raw as Partial<DebugSettings> & { displayMotivation?: boolean } : {};
  return {
    clairvoyanceEnabled: parsed.clairvoyanceEnabled === true,
    timeSpeed: parsed.timeSpeed === 'realtime' || parsed.timeSpeed === 'x20' || parsed.timeSpeed === 'x100' || parsed.timeSpeed === 'x10000' || parsed.timeSpeed === 'x5' ? parsed.timeSpeed : 'x5',
    godsBattleCondition: parsed.godsBattleCondition === 'simple1' ? 'simple1' : 'normal',
    godStrength: parsed.godStrength === 'debug' ? 'debug' : 'normal',
    jewelShopOpen: parsed.jewelShopOpen === true,
    // SpecRef: 8.6 | UI_DIVINE_BUREAU | Display `condition` OFF/ON
    displayCondition: parsed.displayCondition === true || parsed.displayMotivation === true,
    displayFlavorCondition: parsed.displayFlavorCondition === true,
    displayAfkDuration: parsed.displayAfkDuration === true,
    colosseumEnabled: parsed.colosseumEnabled === true,
  };
}

export function getDebugSettings(): DebugSettings {
  if (!canUseStorage()) return DEFAULT_DEBUG_SETTINGS;
  try {
    const saved = window.localStorage.getItem(DEBUG_SETTINGS_STORAGE_KEY);
    if (!saved) return DEFAULT_DEBUG_SETTINGS;
    return normalizeDebugSettings(JSON.parse(saved));
  } catch {
    return DEFAULT_DEBUG_SETTINGS;
  }
}

export function saveDebugSettings(settings: DebugSettings): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(DEBUG_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // noop
  }
}

export function getTimeSpeedScale(settings: DebugSettings): number {
  // SpecRef: 5.1 | PROGRESS | Debug Scaling
  if (settings.timeSpeed === 'realtime') return 1;
  if (settings.timeSpeed === 'x20') return 0.05;
  if (settings.timeSpeed === 'x100') return 0.01;
  if (settings.timeSpeed === 'x10000') return 0.0001;
  return 0.2;
}
