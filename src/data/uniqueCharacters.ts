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
}

export const UNIQUE_CHARACTERS: readonly UniqueCharacterDef[] = [
  { id: 'kemo', nameKey: 'n1', gender: 'male', raceId: 'kemoria', lineageId: 'unascertained' },
  { id: 'laika', nameKey: 'n2', gender: 'female', raceId: 'caninian', lineageId: 'pioneer' },
  { id: 'leonard', nameKey: 'n3', gender: 'male', raceId: 'vulpinian', lineageId: 'meddlesome_fox' },
  { id: 'orca', nameKey: 'n4', gender: 'female', raceId: 'orcinian', lineageId: 'rowdy_orca_girl' },
  { id: 'nox', nameKey: 'n5', gender: 'male', raceId: 'murid', lineageId: 'phantom_thief' },
  { id: 'luna', nameKey: 'n6', gender: 'female', raceId: 'felidian', lineageId: 'crescent_jade' },
  { id: 'mishka', nameKey: 'n7', gender: 'male', raceId: 'ursan', lineageId: 'apostate' },
  { id: 'ptitsa', nameKey: 'n8', gender: 'male', raceId: 'avian', lineageId: 'flamebound_grove' },
  { id: 'hagakure', nameKey: 'n9', gender: 'male', raceId: 'procyonian', lineageId: 'hidden_grail' },
  { id: 'sougaha', nameKey: 'n10', gender: 'male', raceId: 'lupinian', lineageId: 'almighty' },
  { id: 'finn', nameKey: 'n11', gender: 'male', raceId: 'leporian', lineageId: 'unexpected_prince(ss)' },
  { id: 'merle', nameKey: 'n12', gender: 'female', raceId: 'cervin', lineageId: 'incarnation' },
];

export function getUniqueCharacterDef(id: unknown): UniqueCharacterDef | undefined {
  return UNIQUE_CHARACTERS.find((entry) => entry.id === id);
}

export function getUniqueCharacterDefByLineage(lineageId: LineageId | undefined): UniqueCharacterDef | undefined {
  return UNIQUE_CHARACTERS.find((entry) => entry.lineageId === lineageId);
}
