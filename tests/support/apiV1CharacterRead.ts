import { buildApiV1ReadData, type ApiV1ReadContext } from '../../src/api/v1/readModels.ts';
import type { GameState } from '../../src/types/index.ts';

type CharacterReadKind = 'status' | 'equipment' | 'equipmentSet' | 'equipmentEvaluation';

/** One character's entry of a `read/build/character/<kind>` read (the response lists `characters`), without its `characterId`. */
export async function readCharacterBuild(kind: CharacterReadKind, characterId: number, state: GameState, parameters: Record<string, unknown>, context: ApiV1ReadContext) {
  const data = await buildApiV1ReadData(`read/build/character/${kind}`, state, { ...parameters, characterId }, context) as { characters: { characterId: number }[] };
  const { characterId: _characterId, ...rest } = data.characters[0];
  return rest;
}
