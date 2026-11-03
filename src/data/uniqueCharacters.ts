import type { CharacterGender, LineageId, RaceId } from '../types';

// SpecRef: 2.1.4.2 | Initial setup | Unique character
export type UniqueCharacterId =
  | 'kemo' | 'laika' | 'leonard' | 'orca' | 'nox' | 'luna'
  | 'mishka' | 'ptitsa' | 'hagakure' | 'sougaha' | 'finn' | 'merle';

export interface UniqueCharacterDef {
  id: UniqueCharacterId;
  /** i18n key suffix of `character.default.*`. */
  nameKey: string;
  gender: CharacterGender;
  raceId: RaceId;
  lineageId: LineageId;
  /** Party number (PT) whose unlock makes this unique character selectable (Spec 2.1.4.2 "Available At"). */
  availableAtParty: number;
}

export const UNIQUE_CHARACTERS: readonly UniqueCharacterDef[] = [
  { id: 'kemo', nameKey: 'n1', gender: 'male', raceId: 'kemoria', lineageId: 'unascertained', availableAtParty: 1 },
  { id: 'laika', nameKey: 'n2', gender: 'female', raceId: 'caninian', lineageId: 'pioneer', availableAtParty: 1 },
  { id: 'leonard', nameKey: 'n3', gender: 'male', raceId: 'vulpinian', lineageId: 'meddlesome_fox', availableAtParty: 2 },
  { id: 'orca', nameKey: 'n4', gender: 'female', raceId: 'orcinian', lineageId: 'rowdy_orca_girl', availableAtParty: 2 },
  { id: 'nox', nameKey: 'n5', gender: 'male', raceId: 'murid', lineageId: 'phantom_thief', availableAtParty: 3 },
  { id: 'luna', nameKey: 'n6', gender: 'female', raceId: 'felidian', lineageId: 'crescent_jade', availableAtParty: 3 },
  { id: 'mishka', nameKey: 'n7', gender: 'male', raceId: 'ursan', lineageId: 'apostate', availableAtParty: 4 },
  { id: 'ptitsa', nameKey: 'n8', gender: 'male', raceId: 'avian', lineageId: 'flamebound_grove', availableAtParty: 4 },
  { id: 'hagakure', nameKey: 'n9', gender: 'male', raceId: 'procyonian', lineageId: 'hidden_grail', availableAtParty: 5 },
  { id: 'sougaha', nameKey: 'n10', gender: 'male', raceId: 'lupinian', lineageId: 'almighty', availableAtParty: 5 },
  { id: 'finn', nameKey: 'n11', gender: 'male', raceId: 'leporian', lineageId: 'unexpected_prince(ss)', availableAtParty: 6 },
  { id: 'merle', nameKey: 'n12', gender: 'female', raceId: 'cervin', lineageId: 'incarnation', availableAtParty: 6 },
];

export function getUniqueCharacterDef(id: unknown): UniqueCharacterDef | undefined {
  return UNIQUE_CHARACTERS.find((entry) => entry.id === id);
}

export function getUniqueCharacterDefByLineage(lineageId: LineageId | undefined): UniqueCharacterDef | undefined {
  return UNIQUE_CHARACTERS.find((entry) => entry.lineageId === lineageId);
}

// SpecRef: 2.1.4.2 | Initial setup | Unique character `Available At`
export function isUniqueCharacterAvailable(def: UniqueCharacterDef, unlockedPartyCount: number): boolean {
  return def.availableAtParty <= unlockedPartyCount;
}
