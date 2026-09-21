import type { GameState } from '../../types';

// SpecRef: 9.1.4.17 | UI state ownership | uiPreferences closed catalog
// The closed catalog of explicitly persisted UI preferences (Spec 9.1.4.17). A preference is stored per save in
// `GameState.global.uiPreferences`, changes only through `commit/setting/uiPreferences`, and is published with its type
// and valid options in `read/observation/setting`. A key that is not covered here is rejected; each screen adds its
// entries when it migrates.

export type UiPreferenceValue = string | number | boolean;

export interface UiPreferenceDescriptor {
  /** Key prefix; the full key is `<family>.<subject>` where the subject is described by `subject`. */
  family: string;
  subject: 'characterId';
  type: 'string' | 'number' | 'boolean';
  options: readonly string[];
  /** The value used while no preference is stored. */
  defaultValue: UiPreferenceValue;
}

/** The equipment categories the Party inventory can list (Spec 8.2.4). */
export const PARTY_EQUIPMENT_CATEGORIES = ['armor', 'robe', 'shield', 'sword', 'katana', 'gauntlet', 'arrow', 'bolt', 'archery', 'wand', 'grimoire', 'catalyst'] as const;

// SpecRef: 8.2.4 | Equipment management | Inventory item category tabs (previously selected category of each character)
export const PARTY_EQUIP_CATEGORY_FAMILY = 'party.equipCategory';

export const UI_PREFERENCE_CATALOG: readonly UiPreferenceDescriptor[] = [
  { family: PARTY_EQUIP_CATEGORY_FAMILY, subject: 'characterId', type: 'string', options: PARTY_EQUIPMENT_CATEGORIES, defaultValue: 'armor' },
];

export function partyEquipCategoryKey(characterId: number): string {
  return `${PARTY_EQUIP_CATEGORY_FAMILY}.${characterId}`;
}

/** Validates one change against the catalog and the current save; a violation is `invalid_request` for the whole update. */
export function validateUiPreference(state: GameState, key: unknown, value: unknown): void {
  if (typeof key !== 'string') throw new Error('invalid_request:key');
  const descriptor = UI_PREFERENCE_CATALOG.find((entry) => key.startsWith(`${entry.family}.`));
  if (!descriptor) throw new Error('invalid_request:key');
  const subject = key.slice(descriptor.family.length + 1);
  if (!/^[1-9][0-9]{0,9}$/.test(subject) || !state.parties.some((party) => party.characters.some((character) => character.id === Number(subject)))) {
    throw new Error('invalid_request:key');
  }
  if (typeof value !== descriptor.type) throw new Error('invalid_request:value');
  if (descriptor.options.length > 0 && !descriptor.options.includes(value as string)) throw new Error('invalid_request:value');
}

export function listUiPreferences(preferences: Readonly<Record<string, UiPreferenceValue>> | undefined): Array<{ key: string; value: UiPreferenceValue }> {
  return Object.entries(preferences ?? {}).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => ({ key, value }));
}

export function describeUiPreferenceCatalog(): Array<{ family: string; subject: string; type: string; options: string[]; defaultValue: UiPreferenceValue }> {
  return UI_PREFERENCE_CATALOG.map((entry) => ({ family: entry.family, subject: entry.subject, type: entry.type, options: [...entry.options], defaultValue: entry.defaultValue }));
}
