import { createEnvironmentStorageKey } from './environment';

export type NativeNotificationMode = 'hiddenOnly' | 'always';

export interface DesktopPreferences {
  nativeNotificationsEnabled: boolean;
  nativeNotificationMode: NativeNotificationMode;
}

const PREFERENCES_KEY = createEnvironmentStorageKey('bokemo-desktop-notification-preferences');
export const PROCESSED_DIARY_IDS_KEY = createEnvironmentStorageKey('bokemo-desktop-processed-diary-ids');
export const DESKTOP_PREFERENCES_CHANGED_EVENT = 'bokemo-desktop-preferences-changed';

const DEFAULT_PREFERENCES: DesktopPreferences = {
  nativeNotificationsEnabled: false,
  nativeNotificationMode: 'hiddenOnly',
};

// SpecRef: 9.1.1 | macOS background lifecycle and native notifications | Native notification preferences
export function getDesktopPreferences(): DesktopPreferences {
  try {
    const parsed = JSON.parse(localStorage.getItem(PREFERENCES_KEY) ?? '{}') as Partial<DesktopPreferences>;
    return {
      nativeNotificationsEnabled: parsed.nativeNotificationsEnabled === true,
      nativeNotificationMode: parsed.nativeNotificationMode === 'always' ? 'always' : 'hiddenOnly',
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function saveDesktopPreferences(preferences: DesktopPreferences): void {
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  window.dispatchEvent(new Event(DESKTOP_PREFERENCES_CHANGED_EVENT));
}

export function getProcessedDiaryIds(): Set<string> | null {
  try {
    const raw = localStorage.getItem(PROCESSED_DIARY_IDS_KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : []);
  } catch {
    return new Set();
  }
}

export function saveProcessedDiaryIds(ids: Iterable<string>): void {
  localStorage.setItem(PROCESSED_DIARY_IDS_KEY, JSON.stringify(Array.from(ids).slice(-300)));
}
