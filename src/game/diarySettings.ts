import type {
  DiaryDefeatNotificationMode,
  DiarySettings,
} from '../types/index.ts';

export const DEFAULT_DIARY_SETTINGS: Readonly<DiarySettings> = {
  superRareThreshold: 'all',
  epicThreshold: 'all',
  mythicThreshold: 'all',
  rareThreshold: 5,
  sideQuestThreshold: 'all',
  notifyGodsBattle: true,
  defeatNotificationMode: 'defeatOnly',
  notifyCyclePopup: true,
  notifyItemDropPopup: true,
  notifyAutoEquipmentPopup: true,
  notifySideQuestPopup: true,
};

export function normalizeDiaryDefeatNotificationMode(
  value: unknown,
  legacyNotifyDefeat: unknown,
): DiaryDefeatNotificationMode {
  if (value === 'defeatOnly'
    || value === 'defeatAndDraw'
    || value === 'defeatDrawRetreat'
    || value === 'all'
    || value === 'none') return value;
  if (legacyNotifyDefeat === false) return 'none';
  return 'defeatOnly';
}

// SpecRef: 8.5 | UI_DIARY | Setting (エピックレア通知)
// Saves written before the item rarity rename store the Epic notification threshold as `bossThreshold`.
// A current `epicThreshold` wins over the legacy key.
export function upgradeLegacyDiarySettings<T extends object>(value: T): T {
  if (!('bossThreshold' in value)) return value;
  const { bossThreshold, ...current } = value as T & { bossThreshold?: unknown };
  return ('epicThreshold' in current ? current : { ...current, epicThreshold: bossThreshold }) as T;
}

// SpecRef: 8.5 | UI_DIARY | Setting.
export function getDiarySettingsWithDefaults(
  value: Partial<DiarySettings> | undefined,
): DiarySettings {
  const upgraded = value ? upgradeLegacyDiarySettings(value) : value;
  const raw = upgraded as (Partial<DiarySettings> & { notifyDefeat?: unknown }) | undefined;
  return {
    ...DEFAULT_DIARY_SETTINGS,
    ...(upgraded ?? {}),
    defeatNotificationMode: normalizeDiaryDefeatNotificationMode(
      raw?.defeatNotificationMode,
      raw?.notifyDefeat,
    ),
    notifyCyclePopup: typeof raw?.notifyCyclePopup === 'boolean' ? raw.notifyCyclePopup : true,
    notifyItemDropPopup: typeof raw?.notifyItemDropPopup === 'boolean'
      ? raw.notifyItemDropPopup
      : true,
    notifyAutoEquipmentPopup: typeof raw?.notifyAutoEquipmentPopup === 'boolean'
      ? raw.notifyAutoEquipmentPopup
      : true,
    notifySideQuestPopup: typeof raw?.notifySideQuestPopup === 'boolean'
      ? raw.notifySideQuestPopup
      : true,
  };
}
