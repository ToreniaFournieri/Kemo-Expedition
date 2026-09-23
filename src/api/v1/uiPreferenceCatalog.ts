import type { GameState } from '../../types';

// SpecRef: 9.1.4.17 | UI state ownership | uiPreferences closed catalog
// The closed catalog of explicitly persisted UI preferences (Spec 9.1.4.17). A preference is stored per save in
// `GameState.global.uiPreferences`, changes only through `commit/setting/uiPreferences`, and is published with its type
// and valid options in `read/observation/setting`. A key that is not covered here is rejected; each screen adds its
// entries when it migrates.

export type UiPreferenceValue = string | number | boolean;

/**
 * What a key is scoped to: `<family>.<characterId>`, `<family>.<settingPanel>`, `<family>.<partyNumber>`, or the bare
 * `<family>` for a single preference (`none`).
 */
export type UiPreferenceSubject = 'characterId' | 'settingPanel' | 'partyNumber' | 'none';

export interface UiPreferenceDescriptor {
  /** Key prefix; the full key is `<family>.<subject>`, or just `<family>` when `subject` is `none`. */
  family: string;
  subject: UiPreferenceSubject;
  /** The closed list of subjects for a `settingPanel` family; empty when the save decides (characters, parties). */
  subjectOptions: readonly string[];
  type: 'string' | 'number' | 'boolean';
  options: readonly string[];
  /** The value used while no preference is stored. */
  defaultValue: UiPreferenceValue;
}

/** The equipment categories the Party inventory can list (Spec 8.2.4). */
export const PARTY_EQUIPMENT_CATEGORIES = ['armor', 'robe', 'shield', 'sword', 'katana', 'gauntlet', 'arrow', 'bolt', 'archery', 'wand', 'grimoire', 'catalyst'] as const;

// SpecRef: 8.2.4 | Equipment management | Inventory item category tabs (previously selected category of each character)
export const PARTY_EQUIP_CATEGORY_FAMILY = 'party.equipCategory';

// SpecRef: 8.6 | UI_SETTING | All panes are collapsed by default; the expanded/collapsed state is persisted and saved.
export const SETTING_PANEL_EXPANDED_FAMILY = 'setting.panelExpanded';
export const SETTING_PANELS = ['news', 'modeSelect', 'donation', 'clairvoyance', 'glossary', 'itemCompendium', 'characterRoster', 'bestiary', 'superRare', 'feedback', 'gameSetting', 'debug', 'enemyEdit'] as const;
export type SettingPanel = typeof SETTING_PANELS[number];

// SpecRef: 8.6 | UI_SETTING | Clairvoyance: the expand/collapse state is preserved per party.
export const SETTING_CLAIRVOYANCE_EXPANDED_FAMILY = 'setting.clairvoyanceExpanded';

// SpecRef: 8.6 | UI_SETTING | Glossary tabs: the default applies only until the player picks a tab; the last tab is kept.
export const SETTING_GLOSSARY_TAB_FAMILY = 'setting.glossaryTab';
export const GLOSSARY_TABS = ['能', '基', '固', '増', '機', '信', '魔', '地', '求'] as const;
export type GlossaryTab = typeof GLOSSARY_TABS[number];

export const UI_PREFERENCE_CATALOG: readonly UiPreferenceDescriptor[] = [
  { family: PARTY_EQUIP_CATEGORY_FAMILY, subject: 'characterId', subjectOptions: [], type: 'string', options: PARTY_EQUIPMENT_CATEGORIES, defaultValue: 'armor' },
  { family: SETTING_PANEL_EXPANDED_FAMILY, subject: 'settingPanel', subjectOptions: SETTING_PANELS, type: 'boolean', options: [], defaultValue: false },
  { family: SETTING_CLAIRVOYANCE_EXPANDED_FAMILY, subject: 'partyNumber', subjectOptions: [], type: 'boolean', options: [], defaultValue: false },
  { family: SETTING_GLOSSARY_TAB_FAMILY, subject: 'none', subjectOptions: [], type: 'string', options: GLOSSARY_TABS, defaultValue: '能' },
];

export function partyEquipCategoryKey(characterId: number): string {
  return `${PARTY_EQUIP_CATEGORY_FAMILY}.${characterId}`;
}
export function settingPanelExpandedKey(panel: SettingPanel): string {
  return `${SETTING_PANEL_EXPANDED_FAMILY}.${panel}`;
}
export function clairvoyanceExpandedKey(partyNumber: number): string {
  return `${SETTING_CLAIRVOYANCE_EXPANDED_FAMILY}.${partyNumber}`;
}

function findDescriptor(key: string): { descriptor: UiPreferenceDescriptor; subject: string | null } | null {
  for (const descriptor of UI_PREFERENCE_CATALOG) {
    if (descriptor.subject === 'none') {
      if (key === descriptor.family) return { descriptor, subject: null };
    } else if (key.startsWith(`${descriptor.family}.`)) {
      return { descriptor, subject: key.slice(descriptor.family.length + 1) };
    }
  }
  return null;
}

function isKnownSubject(state: GameState, descriptor: UiPreferenceDescriptor, subject: string | null): boolean {
  switch (descriptor.subject) {
    case 'none': return subject === null;
    case 'settingPanel': return subject !== null && descriptor.subjectOptions.includes(subject);
    case 'partyNumber': return subject !== null && /^[1-9][0-9]?$/.test(subject) && Number(subject) <= state.parties.length;
    case 'characterId': return subject !== null && /^[1-9][0-9]{0,9}$/.test(subject)
      && state.parties.some((party) => party.characters.some((character) => character.id === Number(subject)));
  }
}

/** Validates one change against the catalog and the current save; a violation is `invalid_request` for the whole update. */
export function validateUiPreference(state: GameState, key: unknown, value: unknown): void {
  if (typeof key !== 'string') throw new Error('invalid_request:key');
  const found = findDescriptor(key);
  if (!found || !isKnownSubject(state, found.descriptor, found.subject)) throw new Error('invalid_request:key');
  const { descriptor } = found;
  if (typeof value !== descriptor.type) throw new Error('invalid_request:value');
  if (descriptor.options.length > 0 && !descriptor.options.includes(value as string)) throw new Error('invalid_request:value');
}

export function listUiPreferences(preferences: Readonly<Record<string, UiPreferenceValue>> | undefined): Array<{ key: string; value: UiPreferenceValue }> {
  return Object.entries(preferences ?? {}).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => ({ key, value }));
}

export function describeUiPreferenceCatalog(): Array<{ family: string; subject: string; subjectOptions: string[]; type: string; options: string[]; defaultValue: UiPreferenceValue }> {
  return UI_PREFERENCE_CATALOG.map((entry) => ({ family: entry.family, subject: entry.subject, subjectOptions: [...entry.subjectOptions], type: entry.type, options: [...entry.options], defaultValue: entry.defaultValue }));
}

/** The Setting tab's retained preferences, rebuilt from `settingInfo.uiPreferences`. */
export interface SettingTabPreferences {
  panelExpanded: Partial<Record<SettingPanel, boolean>>;
  /** Keyed by party number (1-based). */
  clairvoyanceExpanded: Record<number, boolean>;
  /** `null` until the player has picked a tab; the default (`能`) applies only then. */
  glossaryTab: GlossaryTab | null;
}

export function buildSettingTabPreferences(preferences: ReadonlyArray<{ key: string; value: UiPreferenceValue }>): SettingTabPreferences {
  const result: SettingTabPreferences = { panelExpanded: {}, clairvoyanceExpanded: {}, glossaryTab: null };
  for (const { key, value } of preferences) {
    if (key.startsWith(`${SETTING_PANEL_EXPANDED_FAMILY}.`) && typeof value === 'boolean') {
      result.panelExpanded[key.slice(SETTING_PANEL_EXPANDED_FAMILY.length + 1) as SettingPanel] = value;
    } else if (key.startsWith(`${SETTING_CLAIRVOYANCE_EXPANDED_FAMILY}.`) && typeof value === 'boolean') {
      result.clairvoyanceExpanded[Number(key.slice(SETTING_CLAIRVOYANCE_EXPANDED_FAMILY.length + 1))] = value;
    } else if (key === SETTING_GLOSSARY_TAB_FAMILY && typeof value === 'string' && (GLOSSARY_TABS as readonly string[]).includes(value)) {
      result.glossaryTab = value as GlossaryTab;
    }
  }
  return result;
}
