import { getDeityNameFromId } from '../../game/deity';
import type { Character, CharacterGender, ClassId, LineageId, PredispositionId, RaceId } from '../../types';
import type { CalculatedStatus } from './contracts';
import { parseEquipmentEntry } from './itemFormat';

// SpecRef: 8.2 | UI_PARTY | Party pane, member list, and deity pane
// Rebuilds what the Party tab displays from the `read/observation/party` projection. Members are display objects made
// from projected identity facts and equipment entries resolved against master data; nothing here reads the game state.

export interface PartyProjection {
  effectiveSelection: { partyNumber: number; characterId: number | null };
  party: {
    partyNumber: number; name: string; level: number; experience: number; experienceToNext: number; maxHp: number; deityId: string; deityRank: number; condition: number; order: number[];
    characters: {
      characterId: number; name: string; raceId: string; gender: string; mainClassId: string; subClassId: string; lineageId: string | null; predispositionId: string | null;
      isUnique: boolean; mimorianEnemyId: number | null; equipment: string[]; autoEquipmentMode: 'FULL' | 'SEMI' | 'OFF'; calculatedStatus: CalculatedStatus;
    }[];
  };
  /** The Mimorian enemy forms unlocked at the Altar (the character editor's form choices). */
  unlockedMimorianEnemyIds: number[];
  parties: { partyNumber: number; deityId: string; characters: { characterId: number; name: string; raceId: string; gender: 'male' | 'female'; isUnique: boolean; mimorianEnemyId: number | null }[] }[];
}

export interface PartyView {
  id: number;
  name: string;
  level: number;
  experience: number;
  /** Experience needed for the next level; 0 at the maximum level. */
  experienceToNext: number;
  maxHp: number;
  deity: { name: string };
  characters: Character[];
  /** The calculated status of each member, aligned with `characters`. */
  characterStatus: CalculatedStatus[];
}

/** The other parties as the selector, the deity assignment rule, and the naming and Mimorian rules see them. */
export interface PartySummary {
  id: number;
  deity: { name: string };
  characters: Pick<Character, 'id' | 'name' | 'raceId' | 'mimorianEnemyId'>[];
}

export function buildPartyView(projection: PartyProjection): PartyView {
  const { party } = projection;
  return {
    id: party.partyNumber,
    name: party.name,
    level: party.level,
    experience: party.experience,
    experienceToNext: party.experienceToNext,
    maxHp: party.maxHp,
    deity: { name: getDeityNameFromId(party.deityId) ?? 'None' },
    characterStatus: party.characters.map((character) => character.calculatedStatus),
    characters: party.characters.map((character): Character => ({
      id: character.characterId,
      name: character.name,
      gender: character.gender as CharacterGender,
      isUnique: character.isUnique,
      autoEquipmentMode: character.autoEquipmentMode === 'FULL' ? 2 : character.autoEquipmentMode === 'SEMI' ? 1 : 0,
      raceId: character.raceId as RaceId,
      mainClassId: character.mainClassId as ClassId,
      subClassId: character.subClassId as ClassId,
      lineageId: (character.lineageId ?? 'unascertained') as LineageId,
      predispositionId: (character.predispositionId ?? 'none') as PredispositionId,
      ...(character.mimorianEnemyId !== null ? { mimorianEnemyId: character.mimorianEnemyId } : {}),
      equipment: character.equipment.map((entry) => parseEquipmentEntry(entry)?.item ?? null),
    })),
  };
}

export function buildPartySummaries(projection: PartyProjection): PartySummary[] {
  return projection.parties.map((party) => ({
    id: party.partyNumber,
    deity: { name: getDeityNameFromId(party.deityId) ?? 'None' },
    characters: party.characters.map((character) => ({ id: character.characterId, name: character.name, raceId: character.raceId as RaceId, mimorianEnemyId: character.mimorianEnemyId ?? undefined })),
  }));
}
