import type { Character } from '../../types';

// SpecRef: 8.2.3 | Character Edit Mode (selected member) | Done (完了)
// SpecRef: 9.1.4.9 | Operation-specific completion rules | Party build and equipment
// Translates the Party editor's pending Character edits into the `commit/build/character/{characterId}/changeBuild`
// parameters. It only names the fields that actually changed; the shared build-change planner owns all validation.

const EDITABLE_KEYS = new Set<keyof Character>([
  'name', 'raceId', 'gender', 'mimorianEnemyId', 'mainClassId', 'subClassId', 'lineageId', 'predispositionId',
]);

type EditableCharacter = Pick<Character, 'name' | 'raceId' | 'gender' | 'mimorianEnemyId' | 'mainClassId' | 'subClassId' | 'lineageId' | 'predispositionId'>;

export function characterEditToChangeBuildParameters(character: EditableCharacter, edits: Partial<Character>): Record<string, unknown> {
  for (const key of Object.keys(edits) as (keyof Character)[]) {
    if (edits[key] !== undefined && !EDITABLE_KEYS.has(key)) throw new Error(`unsupported_character_edit:${key}`);
  }
  const parameters: Record<string, unknown> = {};
  const changed = (key: keyof EditableCharacter): boolean => edits[key] !== undefined && edits[key] !== character[key];

  if (changed('name')) parameters.name = edits.name;
  if (changed('raceId') || changed('gender') || changed('mimorianEnemyId')) {
    const raceId = edits.raceId ?? character.raceId;
    const gender = edits.gender ?? character.gender;
    const enemyId = edits.mimorianEnemyId ?? character.mimorianEnemyId;
    parameters.racesAndGender = raceId === 'mimorian' && enemyId != null ? `${raceId}/${gender}/${enemyId}` : `${raceId}/${gender}`;
  }
  if (changed('mainClassId')) parameters.mainClassId = edits.mainClassId;
  if (changed('subClassId')) parameters.subClassId = edits.subClassId;
  if (changed('lineageId')) parameters.lineage = edits.lineageId;
  if (changed('predispositionId')) parameters.predisposition = edits.predispositionId;
  return parameters;
}
