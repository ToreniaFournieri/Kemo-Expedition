import { LINEAGES } from '../data/lineages';
import { PREDISPOSITIONS } from '../data/predispositions';
import type { Character, LineageId, PredispositionId, RaceId } from '../types';

// SpecRef: 8.2.3 | Character Edit Mode (selected member) | Unique selection: "固有" | Changing a unique character to `false`
/** Selectable non-unique races in Spec 2.1 race-table entry order (Mimorian needs an enemy form and is never an automatic fallback). */
export const NON_UNIQUE_RACE_ORDER: readonly RaceId[] = [
  'lupinian', 'vulpinian', 'felidian', 'caninian', 'ursan', 'procyonian', 'leporian', 'cervin', 'murid',
];

export interface ReleasedUniqueBuild {
  raceId: RaceId;
  lineageId: LineageId;
  predispositionId: PredispositionId;
}

/**
 * The race, lineage and predisposition a unique character takes when changed to `false`.
 * Gender and classes are preserved by the caller. `otherMembers` are the rest of the party.
 */
export function resolveReleasedUniqueBuild(
  character: Pick<Character, 'raceId' | 'gender'>,
  otherMembers: readonly Pick<Character, 'raceId' | 'gender' | 'isUnique'>[],
): ReleasedUniqueBuild {
  const blocked = (raceId: RaceId) => otherMembers.some((member) =>
    member.isUnique !== true && member.raceId === raceId && member.gender === character.gender);
  const available = (raceId: RaceId) => NON_UNIQUE_RACE_ORDER.includes(raceId) && !blocked(raceId);
  const raceId = available(character.raceId)
    ? character.raceId
    : NON_UNIQUE_RACE_ORDER.find(available) ?? character.raceId;
  return {
    raceId,
    lineageId: LINEAGES.find((entry) => entry.selectable === true)!.id,
    predispositionId: PREDISPOSITIONS.find((entry) => entry.selectable === true)!.id,
  };
}
